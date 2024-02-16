<?php

namespace App\Entry;

use App\Game\Game;
use App\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Entry>
 */
class EntryRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Entry::class);
    }

    public function list(?Game $game, ?Player $player)
    {
        $qb = $this->createQueryBuilder('e');

        if ($game instanceof \App\Game\Game) {
            $qb->where('e.game = :game')
                ->setParameter('game', $game);
        }

        if ($player instanceof \App\Player\Player) {
            $qb->innerJoin('e.playerResults', 'pr')
                ->andWhere('pr.player = :player')
                ->setParameter('player', $player);
        }

        $qb->orderBy('e.playedAt', 'DESC');

        return $qb->getQuery()
            ->getResult();
    }
}
