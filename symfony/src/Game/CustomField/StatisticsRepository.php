<?php

namespace App\Game\CustomField;

use App\Entry\CustomFieldValue;
use App\Entry\PlayerResult\PlayerResult;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;

class StatisticsRepository
{
    /**
     * @var array<string, string>
     */
    private array $AGG_SQL = [
        'sum' => 'SUM(%s)',
        'avg' => 'AVG(%s)',
        'min' => 'MIN(%s)',
        'max' => 'MAX(%s)',
    ];

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getCustomFieldStats(
        CustomField $customField,
        Player $player,
        ?CustomField $groupByField = null,
        bool $groupByPlayer = false,
        string $aggregation = 'sum',
    ): array {
        $qb = $this->entityManager->createQueryBuilder();
        $qb->from(CustomFieldValue::class, 'cfv')
            ->where('cfv.customField = :customField')
            ->setParameter('customField', $customField);

        if ($customField->isGlobal()) {
            $qb->join('cfv.entry', 'e');
        } else {
            $qb->join('cfv.playerResult', 'pr')
                ->join('pr.entry', 'e');
        }

        $qb->andWhere(
            $qb->expr()->exists(
                $this->entityManager->createQueryBuilder()
                    ->select('1')
                    ->from(PlayerResult::class, 'prFilter')
                    ->where('prFilter.entry = e')
                    ->andWhere('prFilter.player = :filterPlayer')
                    ->getDQL()
            )
        )
            ->setParameter('filterPlayer', $player);

        if ($groupByPlayer) {
            $this->applyGroupByPlayer($qb, $customField);
        }

        if ($groupByField instanceof CustomField) {
            $this->applyGroupByField($qb, $customField, $groupByField);
        }

        if ($customField->getKind() === CustomFieldKind::NUMBER) {
            return $this->buildNumericResult($qb, $customField, $groupByField, $groupByPlayer, $aggregation);
        }

        return $this->buildStringResult($qb, $groupByPlayer, $groupByField);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildNumericResult(
        QueryBuilder $qb,
        CustomField $customField,
        ?CustomField $groupByField,
        bool $groupByPlayer,
        string $aggregation,
    ): array {
        $valueExpr = $this->valueExpr('cfv', $customField);
        $this->applyAggregation($qb, $aggregation, $valueExpr, 'total');

        if ($groupByPlayer) {
            $qb->addSelect('p.name AS label')
                ->addGroupBy('p.id, p.name')
                ->orderBy('total', 'DESC');

            return $this->formatGrouped($qb->getQuery()->getResult());
        }

        if ($groupByField instanceof CustomField) {
            $qb->addSelect($this->labelExpr('cfvGroup', $groupByField) . ' AS label')
                ->addGroupBy($this->valueExpr('cfvGroup', $groupByField))
                ->orderBy('total', 'DESC');

            return $this->formatGrouped($qb->getQuery()->getResult());
        }

        $result = $qb->getQuery()->getSingleResult();

        return [
            'type' => $aggregation,
            'total' => (int) ($result['total'] ?? 0),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function buildStringResult(
        QueryBuilder $qb,
        bool $groupByPlayer,
        ?CustomField $groupByField,
    ): array {
        $qb->addSelect('cfv.valueString AS value')
            ->addSelect('COUNT(cfv.id) AS count')
            ->addGroupBy('cfv.valueString');

        // Group by another field (e.g., monsters killed grouped by weapon)
        if ($groupByField instanceof CustomField) {
            $qb->addSelect($this->labelExpr('cfvGroup', $groupByField) . ' AS groupLabel')
                ->addGroupBy($this->valueExpr('cfvGroup', $groupByField))
                ->orderBy('groupLabel', 'ASC');

            return $this->formatCrossTab($qb->getQuery()->getResult());
        }

        // Group by player (stacked bar chart)
        if ($groupByPlayer) {
            $qb->addSelect('p.name AS player')
                ->addGroupBy('p.id, p.name')
                ->orderBy('p.name', 'ASC');

            return $this->formatStacked($qb->getQuery()->getResult(), 'player');
        }

        // Simple breakdown (pie chart / bar chart)
        $qb->orderBy('count', 'DESC');

        return $this->formatBreakdown($qb->getQuery()->getResult());
    }

    private function valueExpr(string $alias, CustomField $field): string
    {
        return $field->getKind() === CustomFieldKind::NUMBER
            ? $alias . '.valueNumber'
            : $alias . '.valueString';
    }

    private function labelExpr(string $alias, CustomField $field): string
    {
        if ($field->getKind() === CustomFieldKind::NUMBER) {
            return "CONCAT('', {$alias}.valueNumber)";
        }

        return "{$alias}.valueString";
    }

    private function applyAggregation(QueryBuilder $qb, string $aggregation, string $valueExpr, string $as): void
    {
        $template = $this->AGG_SQL[$aggregation] ?? $this->AGG_SQL['sum'];
        $qb->addSelect(sprintf($template, $valueExpr) . " AS {$as}");
    }

    private function applyGroupByPlayer(QueryBuilder $qb, CustomField $mainField): void
    {
        if ($mainField->isGlobal()) {
            $qb->join('e.playerResults', 'prPlayer')
                ->join('prPlayer.player', 'p');
        } else {
            $qb->join('pr.player', 'p');
        }
    }

    private function applyGroupByField(QueryBuilder $qb, CustomField $mainField, CustomField $groupByField): void
    {
        if ($groupByField->isGlobal()) {
            $qb->join(CustomFieldValue::class, 'cfvGroup', 'WITH', 'cfvGroup.entry = e AND cfvGroup.customField = :groupByField');
        } elseif ($mainField->isGlobal()) {
            $qb->join('e.playerResults', 'prGroup')
                ->join(CustomFieldValue::class, 'cfvGroup', 'WITH', 'cfvGroup.playerResult = prGroup AND cfvGroup.customField = :groupByField');
        } else {
            $qb->join(CustomFieldValue::class, 'cfvGroup', 'WITH', 'cfvGroup.playerResult = pr AND cfvGroup.customField = :groupByField');
        }

        $qb->setParameter('groupByField', $groupByField);
    }

    /**
     * @param array<array<string, mixed>> $rows
     * @return array{type: 'grouped', data: array<array{label: string, total: int}>}
     */
    private function formatGrouped(array $rows): array
    {
        return [
            'type' => 'grouped',
            'data' => array_map(
                fn ($r) => [
                    'label' => (string) ($r['label'] ?? 'N/A'),
                    'total' => (int) ($r['total'] ?? 0),
                ],
                $rows
            ),
        ];
    }

    /**
     * @param array<array<string, mixed>> $rows
     * @return array{type: 'breakdown', data: array<array{value: string, count: int}>}
     */
    private function formatBreakdown(array $rows): array
    {
        return [
            'type' => 'breakdown',
            'data' => array_map(
                fn ($r) => [
                    'value' => $r['value'],
                    'count' => (int) $r['count'],
                ],
                $rows
            ),
        ];
    }

    /**
     * Pivots data for stacked bar charts (string values grouped by a category).
     *
     * @param array<array<string, mixed>> $rows
     * @param string $groupKey The row key to group by ('player' or 'groupLabel')
     * @return array{type: 'stacked', data: array<array{group: string, values: array<string, int>}>, keys: array<string>}
     */
    private function formatStacked(array $rows, string $groupKey): array
    {
        /** @var array<string, array{group: string, values: array<string, int>}> $grouped */
        $grouped = [];
        /** @var array<string, true> $allKeys */
        $allKeys = [];

        foreach ($rows as $row) {
            $group = (string) $row[$groupKey];
            $value = (string) ($row['value'] ?? 'N/A');
            $count = (int) $row['count'];

            if (! isset($grouped[$group])) {
                $grouped[$group] = [
                    'group' => $group,
                    'values' => [],
                ];
            }
            $grouped[$group]['values'][$value] = $count;
            $allKeys[$value] = true;
        }

        return [
            'type' => 'stacked',
            'data' => array_values($grouped),
            'keys' => array_keys($allKeys),
        ];
    }

    /**
     * Pivots data for cross-tabulation (value counts grouped by another field).
     * E.g., "monsters killed" grouped by "weapon used".
     *
     * @param array<array<string, mixed>> $rows
     * @return array{type: 'crosstab', data: array<array{group: string, values: array<string, int>}>, keys: array<string>}
     */
    private function formatCrossTab(array $rows): array
    {
        $stacked = $this->formatStacked($rows, 'groupLabel');

        return [
            'type' => 'crosstab',
            'data' => $stacked['data'],
            'keys' => $stacked['keys'],
        ];
    }
}
