<?php

namespace App\Entry\Action;

use App\Campaign\CampaignRepository;
use App\Entry\CustomFieldEvent;
use App\Entry\Entry;
use App\Entry\PlayerResult\PlayerEvent;
use App\Game\GameOwnedRepository;
use App\Player\PlayerRepository;
use App\Utils\Event;
use Doctrine\ORM\EntityManagerInterface;

class UpdateEntryHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly GameOwnedRepository $gameOwnedRepository,
        private readonly PlayerRepository $playerRepository,
        private readonly CampaignRepository $campaignRepository,
    ) {
    }

    /**
     * @param array<CustomFieldEvent> $customFieldEvents
     * @param array<PlayerEvent> $playerEvents
     */
    public function handle(Entry $entry, ?string $note, ?string $gameUsed, ?string $playedAt, array $customFieldEvents, array $playerEvents, ?string $campaign = null): Entry
    {
        if ($note !== null) {
            $entry->updateNote($note);
        }

        if ($gameUsed !== null) {
            if ($gameUsed === 'null' || $gameUsed === '') {
                $entry->updateGameUsed(null);
            } else {
                $gameOwned = $this->gameOwnedRepository->find($gameUsed);
                $entry->updateGameUsed($gameOwned);
            }
        }

        if ($playedAt !== null) {
            $entry->updatePlayedAt(new \DateTimeImmutable($playedAt));
        }

        if ($campaign !== null) {
            if ($campaign === 'null' || $campaign === '') {
                $entry->setCampaign(null);
            } else {
                $campaignEntity = $this->campaignRepository->find($campaign);
                $entry->setCampaign($campaignEntity);
            }
        }

        foreach ($customFieldEvents as $customFieldEvent) {
            $customFieldId = $customFieldEvent->getCustomFieldId();
            $customFieldValue = $customFieldEvent->getCustomFieldValue();
            $eventId = $customFieldEvent->getId();

            switch ($customFieldEvent->getKind()) {
                case Event::ADD:
                    if ($customFieldId !== null && $customFieldValue !== null) {
                        $entry->addCustomFieldValue($customFieldId, $customFieldValue);
                    }
                    break;
                case Event::UPDATE:
                    if ($eventId !== null && $customFieldValue !== null) {
                        $entry->updateCustomFieldValue($eventId, $customFieldValue);
                    }
                    break;
                case Event::REMOVE:
                    if ($eventId !== null) {
                        $entry->removeCustomFieldValue($eventId);
                    }
                    break;
            }
        }

        foreach ($playerEvents as $playerEvent) {
            $eventId = $playerEvent->getId();
            $playerId = $playerEvent->getPlayerId();

            switch ($playerEvent->getKind()) {
                case Event::ADD:
                    if ($playerId !== null) {
                        $player = $this->playerRepository->find($playerId);
                        if ($player !== null) {
                            $entry->addPlayer($player, $playerEvent->getNote() ?? '', $playerEvent->getWon(), $playerEvent->getCustomFields());
                        }
                    }
                    break;
                case Event::REMOVE:
                    if ($eventId !== null) {
                        $entry->removePlayer($eventId);
                    }
                    break;
                case Event::UPDATE:
                    if ($eventId !== null) {
                        $entry->updatePlayerResult($eventId, $playerEvent->getNote(), $playerEvent->getWon(), $playerEvent->isWonKeyPresent(), $this->mapCustomFieldEvents($playerEvent->getCustomFields()));
                    }
                    break;
            }
        }

        $this->entityManager->flush();

        return $entry;
    }

    /**
     * @param array<array{id: string, value: string}> $customFields
     * @return array<CustomFieldEvent>
     */
    private function mapCustomFieldEvents(array $customFields): array
    {
        return array_map(fn ($cf) => new CustomFieldEvent($cf), $customFields);
    }
}
