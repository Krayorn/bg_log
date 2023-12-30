<?php

namespace App\Player;

use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Player>
 */
class PlayerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Player::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function getGeneralStats(Player $player): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            WITH games AS (
                SELECT count(*) totalGames
                FROM game_owned
                WHERE player_id = :playerId
            ), playerStats AS (
                SELECT *
                FROM player_result pr
                WHERE pr.player_id = :playerId
            ), friends AS (
                SELECT count(DISTINCT p.name) from playerStats ps
                JOIN player_result pr on pr.entry_id = ps.entry_id 
                JOIN player p ON pr.player_id = p.id
                where p.id != :playerId
            ), lastGame as (
                SELECT e.played_at date from entry e JOIN playerStats ps on ps.entry_id = e.id
                order by e.played_at DESC
                LIMIT 1
            )
            SELECT 
                g.totalGames games_owned, 
                count(ps) entries_played,
                ROUND (100.0 * (SUM(CASE WHEN ps.won = true THEN 1 ELSE 0 END)) / COUNT(*), 1) global_winrate,
                friends.count game_partners,
                lastGame.date last_game_date
            from games g, playerStats ps, friends, lastGame
            group by g.totalGames, friends.count, lastGame.date;        
            ;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql, [
            'playerId' => $player->getId(),
        ]);

        return $result->fetchAllAssociative()[0];
    }

    /**
     * @return array<array<string, mixed>>
     */
    public function getFriendsStats(Player $player): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT 
            p.id,
            p.name, 
            count(p), 
            SUM(CASE WHEN opr.won = true and pr.won = false THEN 1 ELSE 0 END) losses, 
            SUM(CASE WHEN opr.won = false and pr.won = true THEN 1 ELSE 0 END) wins 
            from player_result pr
            JOIN player_result opr on opr.entry_id = pr.entry_id
            JOIN player p on opr.player_id = p.id
            WHERE pr.player_id = :playerId and opr.player_id != :playerId
            group by p.id, p.name  
            ;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql, [
            'playerId' => $player->getId(),
        ]);

        return $result->fetchAllAssociative();
    }

    public function findNextNumber(): int
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT max(number) from player; 
          ;';

        $conn->prepare($sql);
        $result = $conn->executeQuery($sql);

        return $result->fetchOne() + 1;
    }
}
