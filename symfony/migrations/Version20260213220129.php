<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260213220129 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT fk_campaign_event_cfv');
        $this->addSql('ALTER TABLE campaign_event ALTER payload DROP DEFAULT');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC85FD09B5 FOREIGN KEY (custom_field_value_id) REFERENCES custom_fields_values (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_key DROP CONSTRAINT fk_campaign_key_scoped_cf');
        $this->addSql('ALTER TABLE campaign_key ADD CONSTRAINT FK_B6DA4FE8403F0C49 FOREIGN KEY (scoped_to_custom_field_id) REFERENCES custom_fields (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE entry ALTER created_at DROP DEFAULT');
        $this->addSql('ALTER TABLE player ALTER roles DROP DEFAULT');
        $this->addSql('UPDATE custom_fields SET player_id = (SELECT id FROM player WHERE email = \'me@krayorn.com\') WHERE player_id IS NULL');
        $this->addSql('ALTER TABLE custom_fields ALTER player_id SET NOT NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE campaign_key DROP CONSTRAINT FK_B6DA4FE8403F0C49');
        $this->addSql('ALTER TABLE campaign_key ADD CONSTRAINT fk_campaign_key_scoped_cf FOREIGN KEY (scoped_to_custom_field_id) REFERENCES custom_fields (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE entry ALTER created_at SET DEFAULT \'now()\'');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC85FD09B5');
        $this->addSql('ALTER TABLE campaign_event ALTER payload SET DEFAULT \'{}\'');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT fk_campaign_event_cfv FOREIGN KEY (custom_field_value_id) REFERENCES custom_fields_values (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE player ALTER roles SET DEFAULT \'[]\'');
    }
}
