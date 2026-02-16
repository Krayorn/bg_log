<?php

namespace App\Game\CampaignKey;

use App\Game\Game;
use App\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CampaignKey>
 */
class CampaignKeyRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CampaignKey::class);
    }

    /**
     * @return array<CampaignKey>
     */
    public function findShareableForGame(Game $game, Player $player): array
    {
        return $this->createQueryBuilder('ck')
            ->where('ck.game = :game')
            ->andWhere('ck.shareable = true')
            ->andWhere('ck.player != :player OR ck.player IS NULL')
            ->setParameter('game', $game)
            ->setParameter('player', $player)
            ->getQuery()
            ->getResult();
    }
}
