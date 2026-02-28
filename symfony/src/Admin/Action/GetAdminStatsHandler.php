<?php

namespace App\Admin\Action;

use Doctrine\ORM\EntityManagerInterface;

class GetAdminStatsHandler
{
    public function __construct(
        private readonly EntityManagerInterface $em
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function handle(): array
    {
        $conn = $this->em->getConnection();

        $playerStats = $conn->executeQuery("
            SELECT
                COUNT(*) as total_players,
                COUNT(CASE WHEN registered_on IS NOT NULL THEN 1 END) as registered_players,
                COUNT(CASE WHEN registered_on IS NULL THEN 1 END) as guest_players,
                COUNT(CASE WHEN registered_on >= date_trunc('month', CURRENT_DATE) THEN 1 END) as new_users_this_month
            FROM player
        ")->fetchAssociative();

        $entryStats = $conn->executeQuery("
            SELECT
                COUNT(*) as total_entries,
                COUNT(CASE WHEN played_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as entries_this_month
            FROM entry
        ")->fetchAssociative();

        $gameStats = $conn->executeQuery('
            SELECT COUNT(*) as total_games FROM game
        ')->fetchAssociative();

        $campaignStats = $conn->executeQuery('
            SELECT COUNT(*) as total_campaigns FROM campaign
        ')->fetchAssociative();

        $avgEntriesPerUser = $conn->executeQuery('
            SELECT ROUND(AVG(play_count)::numeric, 1) as avg_entries_per_user
            FROM (
                SELECT pr.player_id, COUNT(DISTINCT e.id) as play_count
                FROM player_result pr
                JOIN entry e ON pr.entry_id = e.id
                JOIN player p ON pr.player_id = p.id
                WHERE p.registered_on IS NOT NULL
                GROUP BY pr.player_id
            ) sub
        ')->fetchAssociative();

        $avgPlayersPerEntry = $conn->executeQuery('
            SELECT ROUND(AVG(player_count)::numeric, 1) as avg_players_per_entry
            FROM (
                SELECT entry_id, COUNT(*) as player_count
                FROM player_result
                GROUP BY entry_id
            ) sub
        ')->fetchAssociative();

        $mostPlayedGame = $conn->executeQuery('
            SELECT g.name, COUNT(e.id) as play_count
            FROM entry e
            JOIN game g ON e.game_id = g.id
            GROUP BY g.id, g.name
            ORDER BY play_count DESC
            LIMIT 1
        ')->fetchAssociative();

        $totalGamesOwned = $conn->executeQuery('
            SELECT COUNT(*) as total FROM game_owned
        ')->fetchAssociative();

        $recentEntries = $conn->executeQuery('
            SELECT e.played_at, g.name as game_name
            FROM entry e
            JOIN game g ON e.game_id = g.id
            ORDER BY e.played_at DESC
            LIMIT 5
        ')->fetchAllAssociative();

        $topPlayers = $conn->executeQuery('
            SELECT p.name, COUNT(DISTINCT e.id) as entries_count
            FROM player_result pr
            JOIN entry e ON pr.entry_id = e.id
            JOIN player p ON pr.player_id = p.id
            WHERE p.registered_on IS NOT NULL
            GROUP BY p.id, p.name
            ORDER BY entries_count DESC
            LIMIT 5
        ')->fetchAllAssociative();

        assert($playerStats !== false);
        assert($entryStats !== false);
        assert($gameStats !== false);
        assert($campaignStats !== false);
        assert($totalGamesOwned !== false);

        return [
            'totalPlayers' => (int) $playerStats['total_players'],
            'registeredPlayers' => (int) $playerStats['registered_players'],
            'guestPlayers' => (int) $playerStats['guest_players'],
            'newUsersThisMonth' => (int) $playerStats['new_users_this_month'],
            'totalEntries' => (int) $entryStats['total_entries'],
            'entriesThisMonth' => (int) $entryStats['entries_this_month'],
            'totalGames' => (int) $gameStats['total_games'],
            'totalCampaigns' => (int) $campaignStats['total_campaigns'],
            'avgEntriesPerUser' => (float) ($avgEntriesPerUser !== false ? ($avgEntriesPerUser['avg_entries_per_user'] ?? 0) : 0),
            'avgPlayersPerEntry' => (float) ($avgPlayersPerEntry !== false ? ($avgPlayersPerEntry['avg_players_per_entry'] ?? 0) : 0),
            'mostPlayedGame' => $mostPlayedGame !== false ? $mostPlayedGame : null,
            'totalGamesOwned' => (int) $totalGamesOwned['total'],
            'recentEntries' => $recentEntries,
            'topPlayers' => $topPlayers,
        ];
    }
}
