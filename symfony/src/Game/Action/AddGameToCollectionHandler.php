<?php

namespace App\Game\Action;

use App\Game\Exception\GameAlreadyOwnedException;
use App\Game\Exception\GameNotFoundException;
use App\Game\GameOwned;
use App\Game\GameOwnedRepository;
use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class AddGameToCollectionHandler
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly GameOwnedRepository $gameOwnedRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(string $gameId, Player $player, ?int $price): GameOwned
    {
        $game = $this->gameRepository->find($gameId);
        if ($game === null) {
            throw new GameNotFoundException('No game found with this ID');
        }

        $existing = $this->gameOwnedRepository->findOneBy([
            'player' => $player,
            'game' => $game,
        ]);
        if ($existing !== null) {
            throw new GameAlreadyOwnedException('Game is already in your library');
        }

        $gameOwned = new GameOwned($player, $game, $price);

        $this->entityManager->persist($gameOwned);
        $this->entityManager->flush();

        return $gameOwned;
    }
}
