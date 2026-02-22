<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260222120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Convert JSON columns to JSONB';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE player ALTER COLUMN roles TYPE JSONB USING roles::JSONB');
        $this->addSql('ALTER TABLE campaign_event ALTER COLUMN payload TYPE JSONB USING payload::JSONB');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE player ALTER COLUMN roles TYPE JSON USING roles::JSON');
        $this->addSql('ALTER TABLE campaign_event ALTER COLUMN payload TYPE JSON USING payload::JSON');
    }
}
