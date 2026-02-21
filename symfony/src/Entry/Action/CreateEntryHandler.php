<?php

namespace App\Entry\Action;

use App\Campaign\CampaignRepository;
use App\Entry\Entry;
use App\Game\Exception\GameNotFoundException;
use App\Game\GameOwnedRepository;
use App\Game\GameRepository;
use App\Player\Exception\PlayerNotFoundException;
use App\Player\PlayerRepository;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;

class CreateEntryHandler
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly GameOwnedRepository $gameOwnedRepository,
        private readonly PlayerRepository $playerRepository,
        private readonly CampaignRepository $campaignRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @param array<array<string, mixed>> $playersData
     * @param array<array<string, mixed>> $customFieldsData
     */
    public function handle(
        string $gameId,
        ?string $gameUsedId,
        string $note,
        string $playedAt,
        array $playersData,
        array $customFieldsData,
        ?string $campaignId,
    ): Entry {
        $game = $this->gameRepository->find($gameId);
        if ($game === null) {
            throw new GameNotFoundException('No game exists with this name');
        }

        $gameUsed = $gameUsedId !== null ? $this->gameOwnedRepository->find($gameUsedId) : null;

        $players = [];
        foreach ($playersData as $playerData) {
            $player = $this->playerRepository->find($playerData['id']);
            if ($player === null) {
                throw new PlayerNotFoundException('Player not found');
            }

            $players[] = [
                'player' => $player,
                'note' => $playerData['note'] ?? '',
                'won' => $playerData['won'] ?? null,
                'customFields' => $playerData['customFields'] ?? [],
            ];
        }

        $date = DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, $playedAt);
        if ($date === false) {
            throw new \InvalidArgumentException('Wrong date format');
        }

        $entry = new Entry($game, $note, $date, $players, $gameUsed);

        foreach ($customFieldsData as $customFieldData) {
            $value = $customFieldData['value'];
            if (is_array($value)) {
                foreach ($value as $singleValue) {
                    $entry->addCustomFieldValue($customFieldData['id'], (string) $singleValue);
                }
            } else {
                $entry->addCustomFieldValue($customFieldData['id'], $value);
            }
        }

        if ($campaignId !== null) {
            $campaign = $this->campaignRepository->find($campaignId);
            if ($campaign !== null) {
                $entry->setCampaign($campaign);
            }
        }

        $this->entityManager->persist($entry);
        $this->entityManager->flush();

        return $entry;
    }
}
