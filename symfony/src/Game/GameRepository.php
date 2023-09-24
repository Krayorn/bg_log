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

    public function getStats(Player $player): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT g.name, g.id, g.player_id, count(e) 
            FROM entry e RIGHT JOIN game g ON e.game_id = g.id
            JOIN player_result pr ON pr.entry_id = e.id
            WHERE pr.player_id = :playerId
            GROUP BY g.name, g.id, g.player_id ORDER BY count DESC;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql, ['playerId' => $player->getId()]);

        return $result->fetchAllAssociative();
    }

    public function getPlayerParticipation(Game $game): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT p.id, p.name, count(p), 
            ROUND (100.0 * (SUM(CASE WHEN pr.won = true THEN 1 ELSE 0 END)) / COUNT(*), 1) AS winrate
            from entry e 
            JOIN player_result pr on pr.entry_id = e.id 
            JOIN player p on pr.player_id = p.id
            where e.game_id = :gameId
            group by p.id, p.name
            ;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql, ['gameId' => $game->getId()]);

        return $result->fetchAllAssociative();
    }

    public function getGamePlayed(Game $game): int
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT count(e) count from entry e 
            where e.game_id = :gameId
            ;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql, ['gameId' => $game->getId()]);

        return $result->fetchOne();
    }
}