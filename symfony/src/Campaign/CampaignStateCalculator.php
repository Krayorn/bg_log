<?php

namespace App\Campaign;

use App\Campaign\CampaignEvent\CampaignEvent;
use App\Campaign\CampaignEvent\CampaignEventVerb;
use App\Entry\Entry;

class CampaignStateCalculator
{
    /**
     * Computes the campaign state snapshot after each entry.
     *
     * @param Entry[]          $sortedEntries entries sorted chronologically
     * @param CampaignEvent[]  $events        all campaign events
     *
     * @return array<string, list<array{label: string, playerId: string|null, entries: array<string, mixed>, scoped: list<array{label: string, entries: array<string, mixed>}>}>>
     */
    public function computeEntryStates(array $sortedEntries, array $events): array
    {
        $internal = [
            'global' => [],
            'players' => [],
        ];

        $result = [];

        foreach ($sortedEntries as $entry) {
            $entryEvents = array_filter($events, fn (CampaignEvent $e) => $e->getEntry()->id->equals($entry->id));
            usort($entryEvents, fn (CampaignEvent $a, CampaignEvent $b) => $a->getCreatedAt() <=> $b->getCreatedAt());

            foreach ($entryEvents as $event) {
                $this->applyEvent($internal, $event);
            }

            $result[(string) $entry->id] = $this->toSections($internal);
        }

        return $result;
    }

    /**
     * @param array{global: array<string, mixed>, players: array<string, array{name: string, entries: array<string, mixed>, scoped: array<string, array<string, mixed>>}>} $state
     */
    private function applyEvent(array &$state, CampaignEvent $event): void
    {
        $playerResult = $event->getPlayerResult();

        if ($playerResult instanceof \App\Entry\PlayerResult\PlayerResult) {
            $playerId = (string) $playerResult->getPlayer()->getId();
            if (! isset($state['players'][$playerId])) {
                $state['players'][$playerId] = [
                    'name' => $playerResult->getPlayer()->getName(),
                    'entries' => [],
                    'scoped' => [],
                ];
            }

            $customFieldValue = $event->getCustomFieldValue();
            if ($customFieldValue instanceof \App\Entry\CustomFieldValue) {
                $scopeLabel = (string) $customFieldValue->getDisplayValue();
                if (! isset($state['players'][$playerId]['scoped'][$scopeLabel])) {
                    $state['players'][$playerId]['scoped'][$scopeLabel] = [];
                }
                $target = &$state['players'][$playerId]['scoped'][$scopeLabel];
            } else {
                $target = &$state['players'][$playerId]['entries'];
            }
        } else {
            $target = &$state['global'];
        }

        $payload = $event->getPayload();
        $verb = CampaignEventVerb::tryFrom($payload['verb'] ?? '');

        if ($verb instanceof CampaignEventVerb) {
            $verb->apply($event->getCampaignKey()->getType(), $target, $event->getCampaignKey()->getName(), $payload);
        }
    }

    /**
     * @param array{global: array<string, mixed>, players: array<string, array{name: string, entries: array<string, mixed>, scoped: array<string, array<string, mixed>>}>} $state
     *
     * @return list<array{label: string, playerId: string|null, entries: array<string, mixed>, scoped: list<array{label: string, entries: array<string, mixed>}>}>
     */
    private function toSections(array $state): array
    {
        $sections = [];

        if ($state['global'] !== []) {
            $sections[] = [
                'label' => 'Global',
                'playerId' => null,
                'entries' => $state['global'],
                'scoped' => [],
            ];
        }

        foreach ($state['players'] as $playerId => $playerData) {
            $scoped = [];
            foreach ($playerData['scoped'] as $scopeLabel => $entries) {
                if ($entries !== []) {
                    $scoped[] = [
                        'label' => $scopeLabel,
                        'entries' => $entries,
                    ];
                }
            }

            if ($playerData['entries'] !== [] || $scoped !== []) {
                $sections[] = [
                    'label' => $playerData['name'],
                    'playerId' => $playerId,
                    'entries' => $playerData['entries'],
                    'scoped' => $scoped,
                ];
            }
        }

        return $sections;
    }
}
