<?php

namespace App\Game\CustomField;

use App\Game\Game;
use App\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<CustomField>
 */
class CustomFieldRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, CustomField::class);
    }

    /**
     * @return array<CustomField>
     */
    public function findShareableForGame(Game $game, Player $player): array
    {
        return $this->createQueryBuilder('cf')
            ->where('cf.game = :game')
            ->andWhere('cf.shareable = true')
            ->andWhere('cf.player != :player OR cf.player IS NULL')
            ->setParameter('game', $game)
            ->setParameter('player', $player)
            ->getQuery()
            ->getResult();
    }
}
