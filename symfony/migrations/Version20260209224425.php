<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260209224425 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE campaign_key (id UUID NOT NULL, game_id UUID DEFAULT NULL, type VARCHAR(255) NOT NULL, name TEXT NOT NULL, global BOOLEAN NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_B6DA4FE8E48FD905 ON campaign_key (game_id)');
        $this->addSql('COMMENT ON COLUMN campaign_key.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign_key.game_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE campaign_key ADD CONSTRAINT FK_B6DA4FE8E48FD905 FOREIGN KEY (game_id) REFERENCES game (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD campaign_key_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE campaign_event ADD payload JSON NOT NULL DEFAULT \'{}\'');
        $this->addSql('ALTER TABLE campaign_event DROP verb');
        $this->addSql('ALTER TABLE campaign_event DROP key');
        $this->addSql('ALTER TABLE campaign_event DROP value');
        $this->addSql('COMMENT ON COLUMN campaign_event.campaign_key_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC8D0572C9E FOREIGN KEY (campaign_key_id) REFERENCES campaign_key (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_75AB6EC8D0572C9E ON campaign_event (campaign_key_id)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC8D0572C9E');
        $this->addSql('ALTER TABLE campaign_key DROP CONSTRAINT FK_B6DA4FE8E48FD905');
        $this->addSql('DROP TABLE campaign_key');
        $this->addSql('DROP INDEX IDX_75AB6EC8D0572C9E');
        $this->addSql('ALTER TABLE campaign_event ADD verb VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE campaign_event ADD key VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE campaign_event ADD value VARCHAR(255) NOT NULL');
        $this->addSql('ALTER TABLE campaign_event DROP campaign_key_id');
        $this->addSql('ALTER TABLE campaign_event DROP payload');
    }
}
