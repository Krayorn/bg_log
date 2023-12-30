<?php

namespace App\Game;

use App\Player\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Game>
 */
class GameRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Game::class);
    }

    /**
     * @return array<array<string, mixed>>
     */
    public function getStats(Player $player): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT g.name, g.id, (CASE WHEN go.player_id IS NOT NULL THEN TRUE ELSE FALSE END) in_library, count(e) 
            FROM entry e 
            JOIN game g ON e.game_id = g.id
            JOIN player_result pr ON pr.entry_id = e.id
            LEFT JOIN game_owned go ON go.game_id = g.id AND go.player_id = :playerId
            WHERE pr.player_id = :playerId
            GROUP BY g.name, g.id, go.player_id ORDER BY count DESC;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql, [
            'playerId' => $player->getId(),
        ]);

        return $result->fetchAllAssociative();
    }
}
