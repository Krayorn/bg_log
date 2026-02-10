<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260209124504 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE campaign (id UUID NOT NULL, game_id UUID DEFAULT NULL, created_by_id UUID DEFAULT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_1F1512DDE48FD905 ON campaign (game_id)');
        $this->addSql('CREATE INDEX IDX_1F1512DDB03A8386 ON campaign (created_by_id)');
        $this->addSql('COMMENT ON COLUMN campaign.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign.game_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign.created_by_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign.created_at IS \'(DC2Type:datetimetz_immutable)\'');
        $this->addSql('ALTER TABLE campaign ADD CONSTRAINT FK_1F1512DDE48FD905 FOREIGN KEY (game_id) REFERENCES game (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign ADD CONSTRAINT FK_1F1512DDB03A8386 FOREIGN KEY (created_by_id) REFERENCES player (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE entry ADD campaign_id UUID DEFAULT NULL');
        $this->addSql('COMMENT ON COLUMN entry.campaign_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE entry ADD CONSTRAINT FK_2B219D70F639F774 FOREIGN KEY (campaign_id) REFERENCES campaign (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_2B219D70F639F774 ON entry (campaign_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE entry DROP CONSTRAINT FK_2B219D70F639F774');
        $this->addSql('ALTER TABLE campaign DROP CONSTRAINT FK_1F1512DDE48FD905');
        $this->addSql('ALTER TABLE campaign DROP CONSTRAINT FK_1F1512DDB03A8386');
        $this->addSql('DROP TABLE campaign');
        $this->addSql('DROP INDEX IDX_2B219D70F639F774');
        $this->addSql('ALTER TABLE entry DROP campaign_id');
    }
}
