<?php

namespace App\Player\Action;

use App\Player\Exception\DuplicateGuestPlayerException;
use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;

class CreateGuestPlayerHandler
{
    public function __construct(
        private readonly PlayerRepository $playerRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(string $name, Player $owner): Player
    {
        $existingGuest = $this->playerRepository->findOneBy([
            'name' => $name,
            'inPartyOf' => $owner,
        ]);
        if ($existingGuest !== null) {
            throw new DuplicateGuestPlayerException('Already a player with the same name in your circle');
        }

        $player = Player::newGuest($name, $this->playerRepository->findNextNumber(), $owner);

        $this->entityManager->persist($player);
        $this->entityManager->flush();

        return $player;
    }
}
