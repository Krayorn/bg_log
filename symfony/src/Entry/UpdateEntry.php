<?php

namespace App\Entry;

use App\Entry\PlayerResult\PlayerEvent;
use App\Event;
use Doctrine\ORM\EntityManagerInterface;

class UpdateEntry
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager
    ) {
    }

    /**
     * @param array<CustomFieldEvent> $customFieldEvents
     * @param array<PlayerEvent> $playerEvents
     */
    public function __invoke(Entry $entry, ?string $note, ?string $gameUsed, ?string $playedAt, array $customFieldEvents, array $playerEvents): Entry
    {
        if ($note !== null) {
            $entry->updateNote($note);
        }

        if ($gameUsed !== null) {
            $entry->updateGameUsed($gameUsed);
        }

        if ($playedAt !== null) {
            $entry->updatePlayedAt(new \DateTimeImmutable($playedAt));
        }

        foreach ($customFieldEvents as $customFieldEvent) {
            switch ($customFieldEvent->getKind()) {
                case Event::ADD:
                    $entry->addCustomFieldValue($customFieldEvent->getCustomFieldId(), $customFieldEvent->getCustomFieldValue());
                    break;
                case Event::UPDATE:
                    $entry->updateCustomFieldValue($customFieldEvent->getId(), $customFieldEvent->getCustomFieldValue());
                    break;
                case Event::REMOVE:
                    $entry->removeCustomField($customFieldEvent->getId());
                    break;
            }
        }

        foreach ($playerEvents as $playerEvent) {
            switch ($playerEvent->getKind()) {
                case Event::ADD:
                    $entry->addPlayer($playerEvent->getPlayerId(), $playerEvent->getNote(), $playerEvent->getWon(), $playerEvent->getCustomFields());
                    break;
                case Event::UPDATE:
                    $entry->updatePlayerResult($playerEvent->getId(), $playerEvent->getNote(), $playerEvent->getWon(), $playerEvent->getCustomFields());
                    break;
                case Event::REMOVE:
                    $entry->removePlayer($playerEvent->getId());
                    break;
            }
        }

        $this->entityManager->flush();

        return $entry;
    }
}
