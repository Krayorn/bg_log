<?php

namespace App\Player\Action;

use App\Player\Exception\PlayerNotFoundException;
use App\Player\Exception\PlayerNotGuestException;
use App\Player\Exception\PlayerNotRegisteredException;
use App\Player\Exception\SynchronizationFailedException;
use App\Player\Player;
use App\Player\PlayerNickname;
use App\Player\PlayerNicknameRepository;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class SynchronizeGuestPlayerHandler
{
    public function __construct(
        private readonly PlayerRepository $playerRepository,
        private readonly PlayerNicknameRepository $nicknameRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly LoggerInterface $logger,
    ) {
    }

    public function handle(Player $guestPlayer, string $registeredPlayerId): void
    {
        if ($guestPlayer->getRegisteredOn() instanceof \DateTimeImmutable) {
            throw new PlayerNotGuestException('This player is not a guest');
        }

        $registeredPlayer = $this->playerRepository->find($registeredPlayerId);
        if ($registeredPlayer === null) {
            throw new PlayerNotFoundException('Registered player not found');
        }

        if ($registeredPlayer->getRegisteredOn() === null) {
            throw new PlayerNotRegisteredException('Target player is not registered');
        }

        $guestName = $guestPlayer->getName();
        $guestOwner = $guestPlayer->getInPartyOf();

        $conn = $this->entityManager->getConnection();
        $conn->beginTransaction();

        try {
            $movedCount = $conn->executeStatement(
                'UPDATE player_result SET player_id = :registeredId WHERE player_id = :guestId',
                [
                    'registeredId' => $registeredPlayer->getId(),
                    'guestId' => $guestPlayer->getId(),
                ]
            );

            $this->entityManager->remove($guestPlayer);
            $this->entityManager->flush();
            $conn->commit();
        } catch (\Exception $e) {
            $conn->rollBack();
            $this->logger->error('Synchronization failed', [
                'guestPlayerId' => $guestPlayer->getId(),
                'registeredPlayerId' => $registeredPlayerId,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw new SynchronizationFailedException('Synchronization failed', $e);
        }

        if ($guestOwner instanceof Player && $guestName !== $registeredPlayer->getName()) {
            $existingNickname = $this->nicknameRepository->findByOwnerAndTarget($guestOwner, $registeredPlayer);
            if (! $existingNickname instanceof PlayerNickname) {
                $nickname = new PlayerNickname($guestOwner, $registeredPlayer, $guestName);
                $this->entityManager->persist($nickname);
                $this->entityManager->flush();
            }
        }
    }
}
