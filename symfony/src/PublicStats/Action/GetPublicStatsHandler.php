<?php

namespace App\PublicStats\Action;

use Doctrine\ORM\EntityManagerInterface;

class GetPublicStatsHandler
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

        $entries = $conn->executeQuery('
            SELECT COUNT(*) as total FROM entry
        ')->fetchAssociative();

        $games = $conn->executeQuery('
            SELECT COUNT(*) as total FROM game
        ')->fetchAssociative();

        $players = $conn->executeQuery('
            SELECT COUNT(*) as total FROM player
        ')->fetchAssociative();

        $campaigns = $conn->executeQuery('
            SELECT COUNT(*) as total FROM campaign
        ')->fetchAssociative();

        $customFields = $conn->executeQuery('
            SELECT COUNT(*) as total FROM custom_fields
        ')->fetchAssociative();

        $customFieldValues = $conn->executeQuery('
            SELECT COUNT(*) as total FROM custom_fields_values
        ')->fetchAssociative();

        $campaignEvents = $conn->executeQuery('
            SELECT COUNT(*) as total FROM campaign_event
        ')->fetchAssociative();

        $avgPlayersPerEntry = $conn->executeQuery('
            SELECT ROUND(AVG(player_count)::numeric, 1) as avg
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

        $topGames = $conn->executeQuery('
            SELECT g.name, COUNT(e.id) as play_count
            FROM entry e
            JOIN game g ON e.game_id = g.id
            GROUP BY g.id, g.name
            ORDER BY play_count DESC
            LIMIT 5
        ')->fetchAllAssociative();

        $entriesPerMonth = $conn->executeQuery("
            SELECT to_char(played_at, 'YYYY-MM') as month, COUNT(*) as count
            FROM entry
            WHERE played_at >= NOW() - INTERVAL '12 months'
            GROUP BY month
            ORDER BY month ASC
        ")->fetchAllAssociative();

        assert($entries !== false);
        assert($games !== false);
        assert($players !== false);
        assert($campaigns !== false);
        assert($customFields !== false);
        assert($customFieldValues !== false);
        assert($campaignEvents !== false);

        return [
            'totalEntries' => (int) $entries['total'],
            'totalGames' => (int) $games['total'],
            'totalPlayers' => (int) $players['total'],
            'totalCampaigns' => (int) $campaigns['total'],
            'totalCustomFields' => (int) $customFields['total'],
            'totalCustomFieldValues' => (int) $customFieldValues['total'],
            'totalCampaignEvents' => (int) $campaignEvents['total'],
            'avgPlayersPerEntry' => (float) ($avgPlayersPerEntry !== false ? ($avgPlayersPerEntry['avg'] ?? 0) : 0),
            'mostPlayedGame' => $mostPlayedGame !== false ? $mostPlayedGame : null,
            'topGames' => $topGames,
            'entriesPerMonth' => $entriesPerMonth,
        ];
    }
}
