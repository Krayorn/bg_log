<?php

namespace App\StatisticsQuery;

use App\Game\Game;
use App\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<StatisticsQuery>
 */
class StatisticsQueryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, StatisticsQuery::class);
    }

    /**
     * @return array<StatisticsQuery>
     */
    public function findByGameAndPlayer(Game $game, Player $player): array
    {
        return $this->findBy([
            'game' => $game,
            'player' => $player,
        ]);
    }
}
