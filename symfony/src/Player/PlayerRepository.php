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

        $rows = $result->fetchAllAssociative();
        if ($rows === []) {
            return [
                'games_owned' => 0,
                'entries_played' => 0,
                'global_winrate' => 0,
                'game_partners' => 0,
                'last_game_date' => null,
            ];
        }

        return $rows[0];
    }

    /**
     * @return Player[]
     */
    public function findVisibleFor(?Player $forPlayer): array
    {
        $qb = $this->createQueryBuilder('p');

        if ($forPlayer instanceof \App\Player\Player) {
            $qb->where('p.registeredOn IS NOT NULL')
                ->orWhere('p.inPartyOf = :forPlayer')
                ->setParameter('forPlayer', $forPlayer);
        } else {
            $qb->where('p.registeredOn IS NOT NULL');
        }

        $qb->orderBy('p.name', 'ASC');

        return $qb->getQuery()->getResult();
    }

    /**
     * @return array<array<string, mixed>>
     */
    public function getCircle(Player $player): array
    {
        $conn = $this->getEntityManager()->getConnection();

        $sql = '
            SELECT
                p.id,
                p.name,
                p.number,
                p.registered_on,
                p.in_party_of_id,
                (p.registered_on IS NULL) as is_guest,
                COUNT(*) as games_played,
                SUM(CASE WHEN opr.won = true AND pr.won = false THEN 1 ELSE 0 END) as losses,
                SUM(CASE WHEN opr.won = false AND pr.won = true THEN 1 ELSE 0 END) as wins
            FROM player_result pr
            JOIN player_result opr ON opr.entry_id = pr.entry_id
            JOIN player p ON p.id = opr.player_id
            WHERE pr.player_id = :playerId AND opr.player_id != :playerId
            GROUP BY p.id, p.name, p.number, p.registered_on, p.in_party_of_id
            ORDER BY is_guest DESC, p.name ASC
        ';

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
