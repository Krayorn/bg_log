<?php

namespace App\Player\Action;

use App\Player\Exception\DuplicatePlayerNameException;
use App\Player\Exception\InvalidEmailException;
use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class RegisterPlayerHandler
{
    public function __construct(
        private readonly PlayerRepository $playerRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
    }

    public function handle(string $name, string $password, ?string $email): Player
    {
        if ($email !== null && $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidEmailException('Invalid email format');
        }

        $existingPlayer = $this->playerRepository->findOneBy([
            'name' => $name,
        ]);
        if ($existingPlayer !== null) {
            throw new DuplicatePlayerNameException('Username already taken');
        }

        $player = new Player($name, $this->playerRepository->findNextNumber(), $email);

        $hashedPassword = $this->passwordHasher->hashPassword($player, $password);
        $player->register($hashedPassword);

        $this->entityManager->persist($player);
        $this->entityManager->flush();

        return $player;
    }
}
