<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260218203345 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT campaign_event_player_result_id_fkey');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT campaign_event_entry_id_fkey');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT campaign_event_custom_field_value_id_fkey');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC8BA364942 FOREIGN KEY (entry_id) REFERENCES entry (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC8A7AB837A FOREIGN KEY (player_result_id) REFERENCES player_result (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_75AB6EC85FD09B5 FOREIGN KEY (custom_field_value_id) REFERENCES custom_fields_values (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC8BA364942');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC8A7AB837A');
        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_75AB6EC85FD09B5');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT campaign_event_player_result_id_fkey FOREIGN KEY (player_result_id) REFERENCES player_result (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT campaign_event_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES entry (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT campaign_event_custom_field_value_id_fkey FOREIGN KEY (custom_field_value_id) REFERENCES custom_fields_values (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }
}
