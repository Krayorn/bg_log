<?php

namespace App\Game\Action;

use App\Game\Exception\DuplicateGameNameException;
use App\Game\GameOwned;
use App\Game\GameRepository;
use Doctrine\ORM\EntityManagerInterface;

class UpdatePlayerGameHandler
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(
        GameOwned $gameOwned,
        ?string $newName,
        bool $updatePrice,
        ?int $newPrice,
    ): void {
        if ($newName !== null) {
            $trimmed = trim($newName);
            if ($trimmed === '') {
                throw new \InvalidArgumentException('Name can\'t be empty');
            }

            $existing = $this->gameRepository->findOneBy([
                'name' => $trimmed,
            ]);
            if ($existing !== null && ! $existing->getId()->equals($gameOwned->getGame()->getId())) {
                throw new DuplicateGameNameException('Already a game with the same name');
            }

            $gameOwned->getGame()->setName($trimmed);
        }

        if ($updatePrice) {
            $gameOwned->setPrice($newPrice);
        }

        $this->entityManager->flush();
    }
}
