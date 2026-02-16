<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260216172608 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE campaign_key ADD player_id UUID DEFAULT NULL');
        $this->addSql('UPDATE campaign_key SET player_id = (SELECT id FROM player WHERE email = \'me@krayorn.com\') WHERE player_id IS NULL');
        $this->addSql('ALTER TABLE campaign_key ALTER player_id SET NOT NULL');
        $this->addSql('ALTER TABLE campaign_key ADD origin_campaign_key_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE campaign_key ADD shareable BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('COMMENT ON COLUMN campaign_key.player_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN campaign_key.origin_campaign_key_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE campaign_key ADD CONSTRAINT FK_B6DA4FE899E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_key ADD CONSTRAINT FK_B6DA4FE8605F9080 FOREIGN KEY (origin_campaign_key_id) REFERENCES campaign_key (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_B6DA4FE899E6F5DF ON campaign_key (player_id)');
        $this->addSql('CREATE INDEX IDX_B6DA4FE8605F9080 ON campaign_key (origin_campaign_key_id)');
        $this->addSql('ALTER TABLE custom_fields ALTER player_id DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE custom_fields ALTER player_id SET NOT NULL');
        $this->addSql('ALTER TABLE campaign_key DROP CONSTRAINT FK_B6DA4FE899E6F5DF');
        $this->addSql('ALTER TABLE campaign_key DROP CONSTRAINT FK_B6DA4FE8605F9080');
        $this->addSql('DROP INDEX IDX_B6DA4FE899E6F5DF');
        $this->addSql('DROP INDEX IDX_B6DA4FE8605F9080');
        $this->addSql('ALTER TABLE campaign_key DROP player_id');
        $this->addSql('ALTER TABLE campaign_key DROP origin_campaign_key_id');
        $this->addSql('ALTER TABLE campaign_key DROP shareable');
    }
}
