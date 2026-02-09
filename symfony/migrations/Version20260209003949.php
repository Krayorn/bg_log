<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260209003949 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE custom_field_enum_values (id UUID NOT NULL, custom_field_id UUID DEFAULT NULL, value TEXT NOT NULL, PRIMARY KEY(id))');
        $this->addSql('CREATE INDEX IDX_1DF02FE4A1E5E0D4 ON custom_field_enum_values (custom_field_id)');
        $this->addSql('COMMENT ON COLUMN custom_field_enum_values.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN custom_field_enum_values.custom_field_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE custom_field_enum_values ADD CONSTRAINT FK_1DF02FE4A1E5E0D4 FOREIGN KEY (custom_field_id) REFERENCES custom_fields (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE SCHEMA public');
        $this->addSql('ALTER TABLE custom_field_enum_values DROP CONSTRAINT FK_1DF02FE4A1E5E0D4');
        $this->addSql('DROP TABLE custom_field_enum_values');
    }
}
