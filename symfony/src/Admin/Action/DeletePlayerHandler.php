<?php

namespace App\Admin\Action;

use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class DeletePlayerHandler
{
    public function __construct(
        private readonly EntityManagerInterface $em
    ) {
    }

    public function handle(Player $player): void
    {
        $conn = $this->em->getConnection();
        $playerId = $player->getId()->toString();

        $conn->beginTransaction();
        try {
            // Remove campaign events linked to this player's results
            $conn->executeStatement(
                'DELETE FROM campaign_event WHERE player_result_id IN (SELECT id FROM player_result WHERE player_id = :id)',
                [
                    'id' => $playerId,
                ]
            );

            // Remove custom field values on player results
            $conn->executeStatement(
                'DELETE FROM custom_fields_values WHERE player_result_id IN (SELECT id FROM player_result WHERE player_id = :id)',
                [
                    'id' => $playerId,
                ]
            );

            // Remove player results
            $conn->executeStatement(
                'DELETE FROM player_result WHERE player_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Nullify game_used on entries referencing this player's game_owned
            $conn->executeStatement(
                'UPDATE entry SET game_owned_id = NULL WHERE game_owned_id IN (SELECT id FROM game_owned WHERE player_id = :id)',
                [
                    'id' => $playerId,
                ]
            );

            // Remove game_owned
            $conn->executeStatement(
                'DELETE FROM game_owned WHERE player_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Remove statistics queries
            $conn->executeStatement(
                'DELETE FROM statistics_query WHERE player_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Remove custom fields owned by this player (and their values first)
            $conn->executeStatement(
                'DELETE FROM custom_fields_values WHERE custom_field_id IN (SELECT id FROM custom_fields WHERE player_id = :id)',
                [
                    'id' => $playerId,
                ]
            );
            // Remove enum values for custom fields owned by this player
            $conn->executeStatement(
                'DELETE FROM custom_field_enum_values WHERE custom_field_id IN (SELECT id FROM custom_fields WHERE player_id = :id)',
                [
                    'id' => $playerId,
                ]
            );
            $conn->executeStatement(
                'DELETE FROM custom_fields WHERE player_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Remove campaign keys owned by this player
            // First remove campaign events referencing these keys
            $conn->executeStatement(
                'DELETE FROM campaign_event WHERE campaign_key_id IN (SELECT id FROM campaign_key WHERE player_id = :id)',
                [
                    'id' => $playerId,
                ]
            );
            $conn->executeStatement(
                'DELETE FROM campaign_key WHERE player_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Handle campaigns created by this player
            // First remove entries from those campaigns, and their campaign events
            $conn->executeStatement(
                'DELETE FROM campaign_event WHERE campaign_id IN (SELECT id FROM campaign WHERE created_by_id = :id)',
                [
                    'id' => $playerId,
                ]
            );
            $conn->executeStatement(
                'UPDATE entry SET campaign_id = NULL WHERE campaign_id IN (SELECT id FROM campaign WHERE created_by_id = :id)',
                [
                    'id' => $playerId,
                ]
            );
            $conn->executeStatement(
                'DELETE FROM campaign WHERE created_by_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Update guests referencing this player as their party owner
            $conn->executeStatement(
                'UPDATE player SET in_party_of_id = NULL WHERE in_party_of_id = :id',
                [
                    'id' => $playerId,
                ]
            );

            // Delete the player
            $conn->executeStatement(
                'DELETE FROM player WHERE id = :id',
                [
                    'id' => $playerId,
                ]
            );

            $conn->commit();
        } catch (\Throwable $e) {
            $conn->rollBack();
            throw $e;
        }

        // Clear the entity manager to avoid stale references
        $this->em->clear();
    }
}
