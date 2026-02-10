<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260209221953 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE campaign_event (id UUID NOT NULL, campaign_id UUID DEFAULT NULL, entry_id UUID DEFAULT NULL, player_result_id UUID DEFAULT NULL, created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL, verb VARCHAR(255) NOT NULL, key VARCHAR(255) NOT NULL, value VARCHAR(255) NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_75AB6EC8F639F774 ON campaign_event (campaign_id)');
        $this->addSql('CREATE INDEX IDX_75AB6EC8BA364942 ON campaign_event (entry_id)');
        $this->addSql('CREATE INDEX IDX_75AB6EC8A7AB837A ON campaign_event (player_result_id)');
        $this->addSql('COMMENT ON COLUMN campaign_event.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign_event.campaign_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign_event.entry_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign_event.player_result_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign_event.created_at IS \'(DC2Type:datetimetz_immutable)\'');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC8F639F774 FOREIGN KEY (campaign_id) REFERENCES campaign (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC8BA364942 FOREIGN KEY (entry_id) REFERENCES entry (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC8A7AB837A FOREIGN KEY (player_result_id) REFERENCES player_result (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC8F639F774');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC8BA364942');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC8A7AB837A');
        $this->addSql('DROP TABLE campaign_event');
    }
}
