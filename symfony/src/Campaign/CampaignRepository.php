<?php

namespace App\Campaign;

use App\Game\Game;
use App\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Campaign>
 */
class CampaignRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Campaign::class);
    }

    /**
     * @return array<Campaign>
     */
    public function listByGame(Game $game, Player $player): array
    {
        return $this->createQueryBuilder('c')
            ->where('c.game = :game')
            ->andWhere('c.createdBy = :player')
            ->setParameter('game', $game)
            ->setParameter('player', $player)
            ->orderBy('c.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
