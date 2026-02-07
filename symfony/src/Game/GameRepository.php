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
            SELECT
                g.id   AS game_id,
                g.name AS game_name,
                go.id   AS game_owned_id,
                go.price AS price,
                COUNT(DISTINCT e.id) AS play_count
            FROM entry e
            JOIN game g ON e.game_id = g.id
            JOIN player_result pr ON pr.entry_id = e.id
            LEFT JOIN game_owned go
                ON go.game_id = g.id AND go.player_id = :playerId
            WHERE pr.player_id = :playerId
            GROUP BY g.id, g.name, go.id, go.price

            UNION ALL

            SELECT
                g.id   AS game_id,
                g.name AS game_name,
                go.id   AS game_owned_id,
                go.price AS price,
                0       AS play_count
            FROM game_owned go
            JOIN game g ON go.game_id = g.id
            WHERE go.player_id = :playerId
              AND NOT EXISTS (
                  SELECT 1 FROM entry e
                  JOIN player_result pr ON pr.entry_id = e.id
                  WHERE e.game_id = g.id AND pr.player_id = :playerId
              )

            ORDER BY play_count DESC;
        ';

        $result = $conn->executeQuery($sql, [
            'playerId' => $player->getId(),
        ]);

        return $result->fetchAllAssociative();
    }

    /**
     * @return array<string, mixed>
     */
    public function getGameStats(string $gameId, string $playerId): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT 
                count(e) number_of_games, 
                (ROUND (100.0 * (SUM(CASE WHEN pr.won = true THEN 1 ELSE 0 END)) / COUNT(*), 1)) winrate, 
                (CASE WHEN go.player_id IS NOT NULL THEN TRUE ELSE FALSE END) in_library 
            FROM entry e 
            JOIN player_result pr ON pr.entry_id = e.id
            LEFT JOIN game_owned go ON go.game_id = :gameId AND go.player_id = :playerId
            WHERE pr.player_id = :playerId AND e.game_id = :gameId
            GROUP BY go.player_id;';

        $conn->prepare($sql);
        $query = $conn->executeQuery($sql, [
            'playerId' => $playerId,
            'gameId' => $gameId,
        ]);

        $result = $query->fetchAssociative();

        if ($result === false) {
            return [
                'in_library' => false,
                'winrate' => 'NA',
                'number_of_games' => 0,
            ];
        }

        return $result;
    }

    /**
     * @return array<Game>
     */
    public function search(?string $query): array
    {
        $qb = $this->createQueryBuilder('g');

        if ($query !== null) {
            $qb
                ->andWhere('Lower(g.name) like Lower(:query)')
                ->setParameter('query', '%' . $query . '%');
        }

        $qb->orderBy('g.name', 'DESC');
        return $qb->getQuery()
            ->getResult();
    }
}
