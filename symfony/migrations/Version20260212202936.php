<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260212202936 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE custom_fields ADD player_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE custom_fields ADD origin_custom_field_id UUID DEFAULT NULL');
        $this->addSql('ALTER TABLE custom_fields ADD shareable BOOLEAN DEFAULT false NOT NULL');
        $this->addSql('COMMENT ON COLUMN custom_fields.player_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN custom_fields.origin_custom_field_id IS \'(DC2Type:uuid)\'');
        $this->addSql('ALTER TABLE custom_fields ADD CONSTRAINT FK_4A48378C99E6F5DF FOREIGN KEY (player_id) REFERENCES player (id) NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('ALTER TABLE custom_fields ADD CONSTRAINT FK_4A48378C11ED5CCA FOREIGN KEY (origin_custom_field_id) REFERENCES custom_fields (id) ON DELETE SET NULL NOT DEFERRABLE INITIALLY IMMEDIATE');
        $this->addSql('CREATE INDEX IDX_4A48378C99E6F5DF ON custom_fields (player_id)');
        $this->addSql('CREATE INDEX IDX_4A48378C11ED5CCA ON custom_fields (origin_custom_field_id)');
        $this->addSql('ALTER TABLE player ADD roles JSON DEFAULT \'[]\' NOT NULL');
        $this->addSql('UPDATE player SET roles = \'["ROLE_ADMIN"]\' WHERE email = \'me@krayorn.com\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE custom_fields DROP CONSTRAINT FK_4A48378C99E6F5DF');
        $this->addSql('ALTER TABLE custom_fields DROP CONSTRAINT FK_4A48378C11ED5CCA');
        $this->addSql('DROP INDEX IDX_4A48378C99E6F5DF');
        $this->addSql('DROP INDEX IDX_4A48378C11ED5CCA');
        $this->addSql('ALTER TABLE custom_fields DROP player_id');
        $this->addSql('ALTER TABLE custom_fields DROP origin_custom_field_id');
        $this->addSql('ALTER TABLE custom_fields DROP shareable');
        $this->addSql('ALTER TABLE player DROP roles');
    }
}
