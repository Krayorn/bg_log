<?php

namespace App\Campaign\Action;

use App\Campaign\Campaign;
use App\Game\Exception\GameNotFoundException;
use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class CreateCampaignHandler
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(string $name, string $gameId, Player $player): Campaign
    {
        $game = $this->gameRepository->find($gameId);
        if ($game === null) {
            throw new GameNotFoundException('Game not found');
        }

        $campaign = new Campaign($game, $name, $player);

        $this->entityManager->persist($campaign);
        $this->entityManager->flush();

        return $campaign;
    }
}
