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

        $customFieldStats = $conn->executeQuery("
            SELECT
                COUNT(*) as total_custom_fields,
                COUNT(CASE WHEN scope = 'entry' THEN 1 END) as entry_scope,
                COUNT(CASE WHEN scope = 'playerResult' THEN 1 END) as player_scope,
                COUNT(CASE WHEN shareable = true THEN 1 END) as shareable_count,
                COUNT(CASE WHEN origin_custom_field_id IS NOT NULL THEN 1 END) as copied_count
            FROM custom_fields
        ")->fetchAssociative();

        $avgCustomFieldsPerGame = $conn->executeQuery('
            SELECT ROUND(AVG(cf_count)::numeric, 1) as avg_custom_fields_per_game
            FROM (
                SELECT game_id, COUNT(*) as cf_count
                FROM custom_fields
                GROUP BY game_id
            ) sub
        ')->fetchAssociative();

        $statisticsQueryStats = $conn->executeQuery('
            SELECT
                COUNT(*) as total_queries,
                COUNT(DISTINCT player_id) as users_with_queries
            FROM statistics_query
        ')->fetchAssociative();

        $avgQueriesPerUser = $conn->executeQuery('
            SELECT ROUND(AVG(query_count)::numeric, 1) as avg_queries_per_user
            FROM (
                SELECT player_id, COUNT(*) as query_count
                FROM statistics_query
                GROUP BY player_id
            ) sub
        ')->fetchAssociative();

        $campaignDetailStats = $conn->executeQuery('
            SELECT
                ROUND(AVG(entry_count)::numeric, 1) as avg_entries_per_campaign
            FROM (
                SELECT campaign_id, COUNT(*) as entry_count
                FROM entry
                WHERE campaign_id IS NOT NULL
                GROUP BY campaign_id
            ) sub
        ')->fetchAssociative();

        $campaignEventStats = $conn->executeQuery('
            SELECT COUNT(*) as total_campaign_events FROM campaign_event
        ')->fetchAssociative();

        $campaignKeyStats = $conn->executeQuery("
            SELECT
                COUNT(*) as total_campaign_keys,
                COUNT(CASE WHEN type = 'string' THEN 1 END) as string_keys,
                COUNT(CASE WHEN type = 'number' THEN 1 END) as number_keys,
                COUNT(CASE WHEN type = 'list' THEN 1 END) as list_keys,
                COUNT(CASE WHEN type = 'counted_list' THEN 1 END) as counted_list_keys
            FROM campaign_key
        ")->fetchAssociative();

        $totalCustomFieldValues = $conn->executeQuery('
            SELECT COUNT(*) as total FROM custom_fields_values
        ')->fetchAssociative();

        $entriesInCampaign = $conn->executeQuery('
            SELECT COUNT(*) as total FROM entry WHERE campaign_id IS NOT NULL
        ')->fetchAssociative();

        $avgGamesOwnedPerUser = $conn->executeQuery('
            SELECT ROUND(AVG(owned_count)::numeric, 1) as avg_games_owned_per_user
            FROM (
                SELECT player_id, COUNT(*) as owned_count
                FROM game_owned
                GROUP BY player_id
            ) sub
        ')->fetchAssociative();

        $gamesWithCampaignKeys = $conn->executeQuery('
            SELECT COUNT(DISTINCT game_id) as total FROM campaign_key
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
        assert($customFieldStats !== false);
        assert($statisticsQueryStats !== false);
        assert($campaignEventStats !== false);
        assert($campaignKeyStats !== false);
        assert($totalCustomFieldValues !== false);
        assert($entriesInCampaign !== false);

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
            'totalCustomFields' => (int) $customFieldStats['total_custom_fields'],
            'customFieldsByScope' => [
                'entry' => (int) $customFieldStats['entry_scope'],
                'playerResult' => (int) $customFieldStats['player_scope'],
            ],
            'shareableCustomFields' => (int) $customFieldStats['shareable_count'],
            'copiedCustomFields' => (int) $customFieldStats['copied_count'],
            'avgCustomFieldsPerGame' => (float) ($avgCustomFieldsPerGame !== false ? ($avgCustomFieldsPerGame['avg_custom_fields_per_game'] ?? 0) : 0),
            'totalStatisticsQueries' => (int) $statisticsQueryStats['total_queries'],
            'usersWithSavedQueries' => (int) $statisticsQueryStats['users_with_queries'],
            'avgQueriesPerUser' => (float) ($avgQueriesPerUser !== false ? ($avgQueriesPerUser['avg_queries_per_user'] ?? 0) : 0),
            'avgEntriesPerCampaign' => (float) ($campaignDetailStats !== false ? ($campaignDetailStats['avg_entries_per_campaign'] ?? 0) : 0),
            'totalCampaignEvents' => (int) $campaignEventStats['total_campaign_events'],
            'totalCampaignKeys' => (int) $campaignKeyStats['total_campaign_keys'],
            'campaignKeysByType' => [
                'string' => (int) $campaignKeyStats['string_keys'],
                'number' => (int) $campaignKeyStats['number_keys'],
                'list' => (int) $campaignKeyStats['list_keys'],
                'counted_list' => (int) $campaignKeyStats['counted_list_keys'],
            ],
            'totalCustomFieldValues' => (int) $totalCustomFieldValues['total'],
            'entriesInCampaign' => (int) $entriesInCampaign['total'],
            'avgGamesOwnedPerUser' => (float) ($avgGamesOwnedPerUser !== false ? ($avgGamesOwnedPerUser['avg_games_owned_per_user'] ?? 0) : 0),
            'gamesWithCampaignKeys' => (int) ($gamesWithCampaignKeys !== false ? ($gamesWithCampaignKeys['total'] ?? 0) : 0),
            'recentEntries' => $recentEntries,
            'topPlayers' => $topPlayers,
        ];
    }
}
