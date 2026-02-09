<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260209001723 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE statistics_query (id UUID NOT NULL, player_id UUID DEFAULT NULL, game_id UUID DEFAULT NULL, name VARCHAR(255) NOT NULL, custom_field_id UUID NOT NULL, group_by_field_id UUID DEFAULT NULL, group_by_player BOOLEAN NOT NULL, aggregation VARCHAR(255) DEFAULT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_BC506E7099E6F5DF ON statistics_query (player_id)');
        $this->addSql('CREATE INDEX IDX_BC506E70E48FD905 ON statistics_query (game_id)');
        $this->addSql('COMMENT ON COLUMN statistics_query.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN statistics_query.player_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN statistics_query.game_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN statistics_query.custom_field_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN statistics_query.group_by_field_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE statistics_query ADD CONSTRAINT FK_BC506E7099E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE statistics_query ADD CONSTRAINT FK_BC506E70E48FD905 FOREIGN KEY (game_id) REFERENCES game (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE statistics_query DROP CONSTRAINT FK_BC506E7099E6F5DF');
        $this->addSql('ALTER TABLE statistics_query DROP CONSTRAINT FK_BC506E70E48FD905');
        $this->addSql('DROP TABLE statistics_query');
    }
}
