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
            $existing = $this->gameRepository->findOneBy([
                'name' => $newName,
            ]);
            if ($existing !== null && ! $existing->getId()->equals($gameOwned->getGame()->getId())) {
                throw new DuplicateGameNameException('Already a game with the same name');
            }

            $gameOwned->getGame()->setName($newName);
        }

        if ($updatePrice) {
            $gameOwned->setPrice($newPrice);
        }

        $this->entityManager->flush();
    }
}
