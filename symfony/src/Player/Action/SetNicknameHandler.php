<?php

namespace App\Player\Action;

use App\Player\Player;
use App\Player\PlayerNickname;
use App\Player\PlayerNicknameRepository;
use Doctrine\ORM\EntityManagerInterface;

class SetNicknameHandler
{
    public function __construct(
        private readonly PlayerNicknameRepository $nicknameRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(Player $owner, Player $targetPlayer, string $nickname): PlayerNickname
    {
        $existing = $this->nicknameRepository->findByOwnerAndTarget($owner, $targetPlayer);

        if ($existing instanceof \App\Player\PlayerNickname) {
            $existing->setNickname($nickname);
        } else {
            $existing = new PlayerNickname($owner, $targetPlayer, $nickname);
            $this->entityManager->persist($existing);
        }

        $this->entityManager->flush();

        return $existing;
    }
}
