<?php

namespace App\Player;

use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PlayerNickname>
 */
class PlayerNicknameRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PlayerNickname::class);
    }

    public function findByOwnerAndTarget(Player $owner, Player $targetPlayer): ?PlayerNickname
    {
        return $this->findOneBy([
            'owner' => $owner,
            'targetPlayer' => $targetPlayer,
        ]);
    }
}
