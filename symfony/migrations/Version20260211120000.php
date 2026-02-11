<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260211120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add scoped_to_custom_field_id to campaign_key and custom_field_value_id to campaign_event';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE campaign_key ADD scoped_to_custom_field_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE campaign_key ADD CONSTRAINT FK_campaign_key_scoped_cf FOREIGN KEY (scoped_to_custom_field_id) REFERENCES custom_fields (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');

        $this->addSql('ALTER TABLE campaign_event ADD custom_field_value_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE campaign_event ADD CONSTRAINT FK_campaign_event_cfv FOREIGN KEY (custom_field_value_id) REFERENCES custom_fields_values (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE campaign_key DROP CONSTRAINT FK_campaign_key_scoped_cf');
        $this->addSql('ALTER TABLE campaign_key DROP scoped_to_custom_field_id');

        $this->addSql('ALTER TABLE campaign_event DROP CONSTRAINT FK_campaign_event_cfv');
        $this->addSql('ALTER TABLE campaign_event DROP custom_field_value_id');
    }
}
