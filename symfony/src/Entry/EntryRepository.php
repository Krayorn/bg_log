<?php

namespace App\Entry;

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

    public function query(?string $gameId)
    {
        $qb = $this->createQueryBuilder('e');

        if ($gameId !== null) {
            $qb->andWhere('e.game = :gameId')
            ->setParameter('gameId', $gameId);;
        }

        $qb->orderBy('e.playedAt', 'DESC');

        return $qb->getQuery()->getResult();
    }
}