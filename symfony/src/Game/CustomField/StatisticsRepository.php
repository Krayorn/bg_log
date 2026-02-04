<?php

namespace App\Game\CustomField;

use App\Entry\CustomFieldValue;
use App\Entry\PlayerResult\PlayerResult;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\QueryBuilder;

class StatisticsRepository
{
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
    ): array {
        if ($customField->getKind() === CustomFieldKind::NUMBER) {
            if ($groupByField instanceof CustomField) {
                return $this->getSumGroupedByField($customField, $groupByField, $player);
            }
            if ($groupByPlayer) {
                return $this->getSumByPlayer($customField, $player);
            }

            $qb = $this->createBaseQuery($customField, $player);
            $qb->select('SUM(cfv.valueNumber) as total');
    
            $result = $qb->getQuery()->getSingleResult();
    
            return [
                'type' => 'sum',
                'total' => (int) ($result['total'] ?? 0),
            ];
        }

        // String field
        if ($groupByPlayer) {
            return $this->getBreakdownByPlayer($customField, $player);
        }

        return $this->getBreakdownStats($customField, $player);
    }

    /**
     * @return array{type: 'grouped', data: array<array{label: string, total: int}>}
     */
    private function getSumByPlayer(CustomField $customField, Player $player): array
    {
        $qb = $this->createBaseQuery($customField, $player);

        if ($customField->isGlobal()) {
            // Entry-level field: join to player results to get player
            $qb->join('e.playerResults', 'prPlayer')
                ->join('prPlayer.player', 'p')
                ->select('p.name as label, SUM(cfv.valueNumber) as total')
                ->groupBy('p.id, p.name')
                ->orderBy('total', 'DESC');
        } else {
            // Player-level field: already have pr, just join player
            $qb->join('pr.player', 'p')
                ->select('p.name as label, SUM(cfv.valueNumber) as total')
                ->groupBy('p.id, p.name')
                ->orderBy('total', 'DESC');
        }

        $results = $qb->getQuery()->getResult();

        return [
            'type' => 'grouped',
            'data' => array_map(
                fn ($r) => [
                    'label' => (string) ($r['label'] ?? 'N/A'),
                    'total' => (int) ($r['total'] ?? 0),
                ],
                $results
            ),
        ];
    }

    /**
     * @return array{type: 'grouped', data: array<array{label: string, total: int}>}
     */
    private function getSumGroupedByField(CustomField $customField, CustomField $groupByField, Player $player): array
    {
        $qb = $this->createBaseQuery($customField, $player);

        // Determine how to join the groupBy field based on its scope
        if ($groupByField->isGlobal()) {
            // Group by an entry-level field
            $qb->join(CustomFieldValue::class, 'cfvGroup', 'WITH', 'cfvGroup.entry = e AND cfvGroup.customField = :groupByField');
        } elseif ($customField->isGlobal()) {
            // Main field is entry-level, need to join player results first
            $qb->join('e.playerResults', 'prGroup')
                ->join(CustomFieldValue::class, 'cfvGroup', 'WITH', 'cfvGroup.playerResult = prGroup AND cfvGroup.customField = :groupByField');
        } else {
            // Both are player-level, use the same player result
            $qb->join(CustomFieldValue::class, 'cfvGroup', 'WITH', 'cfvGroup.playerResult = pr AND cfvGroup.customField = :groupByField');
        }

        $qb->setParameter('groupByField', $groupByField);

        // Select based on groupBy field type
        if ($groupByField->getKind() === CustomFieldKind::STRING) {
            $qb->select('cfvGroup.valueString as label, SUM(cfv.valueNumber) as total')
                ->groupBy('cfvGroup.valueString')
                ->orderBy('total', 'DESC');
        } else {
            $qb->select('CAST(cfvGroup.valueNumber AS string) as label, SUM(cfv.valueNumber) as total')
                ->groupBy('cfvGroup.valueNumber')
                ->orderBy('total', 'DESC');
        }

        $results = $qb->getQuery()->getResult();

        return [
            'type' => 'grouped',
            'data' => array_map(
                fn ($r) => [
                    'label' => (string) ($r['label'] ?? 'N/A'),
                    'total' => (int) ($r['total'] ?? 0),
                ],
                $results
            ),
        ];
    }

    /**
     * @return array{type: 'breakdown', data: array<array{value: string, count: int}>}
     */
    private function getBreakdownStats(CustomField $customField, ?Player $player): array
    {
        $qb = $this->createBaseQuery($customField, $player);
        $qb->select('cfv.valueString as value, COUNT(cfv.id) as count')
            ->groupBy('cfv.valueString')
            ->orderBy('count', 'DESC');

        $results = $qb->getQuery()->getResult();

        return [
            'type' => 'breakdown',
            'data' => array_map(
                fn ($r) => [
                    'value' => $r['value'],
                    'count' => (int) $r['count'],
                ],
                $results
            ),
        ];
    }

    /**
     * Returns breakdown of string field values grouped by player for stacked bar chart.
     *
     * @return array{type: 'stacked', data: array<array{player: string, values: array<string, int>}>, keys: array<string>}
     */
    private function getBreakdownByPlayer(CustomField $customField, Player $player): array
    {
        $qb = $this->createBaseQuery($customField, $player);

        // Need to get player name
        if ($customField->isGlobal()) {
            // Entry-level field: join to player results to get player
            $qb->join('e.playerResults', 'prPlayer')
                ->join('prPlayer.player', 'p')
                ->select('p.name as player, cfv.valueString as value, COUNT(cfv.id) as count')
                ->groupBy('p.id, p.name, cfv.valueString')
                ->orderBy('p.name', 'ASC');
        } else {
            // Player-level field: already have pr, just join player
            $qb->join('pr.player', 'p')
                ->select('p.name as player, cfv.valueString as value, COUNT(cfv.id) as count')
                ->groupBy('p.id, p.name, cfv.valueString')
                ->orderBy('p.name', 'ASC');
        }

        $results = $qb->getQuery()->getResult();

        // Pivot data: group by player and collect all values
        $playerData = [];
        $allKeys = [];

        foreach ($results as $row) {
            $playerName = $row['player'];
            $value = $row['value'] ?? 'N/A';
            $count = (int) $row['count'];

            if (! isset($playerData[$playerName])) {
                $playerData[$playerName] = [
                    'player' => $playerName,
                    'values' => [],
                ];
            }
            $playerData[$playerName]['values'][$value] = $count;
            $allKeys[$value] = true;
        }

        return [
            'type' => 'stacked',
            'data' => array_values($playerData),
            'keys' => array_keys($allKeys),
        ];
    }

    private function createBaseQuery(CustomField $customField, Player $player): QueryBuilder
    {
        $qb = $this->entityManager->createQueryBuilder();
        $qb->from(CustomFieldValue::class, 'cfv')
            ->where('cfv.customField = :customField')
            ->setParameter('customField', $customField);

        if ($customField->isGlobal()) {
            // Global (entry-level) custom field
            $qb->join('cfv.entry', 'e');
        } else {
            // Player-scoped custom field
            $qb->join('cfv.playerResult', 'pr')
                ->join('pr.entry', 'e');
        }

        // Filter entries where the player participated (but include ALL data from those entries)
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

        return $qb;
    }
}
