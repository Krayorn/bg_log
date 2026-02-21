<?php

namespace App\Game\Action;

use App\Game\Exception\DuplicateGameNameException;
use App\Game\Game;
use App\Game\GameRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateGameHandler
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(string $name): Game
    {
        $existing = $this->gameRepository->findOneBy([
            'name' => $name,
        ]);
        if ($existing !== null) {
            throw new DuplicateGameNameException('Already a game with the same name');
        }

        $game = new Game($name);

        $this->entityManager->persist($game);
        $this->entityManager->flush();

        return $game;
    }
}
