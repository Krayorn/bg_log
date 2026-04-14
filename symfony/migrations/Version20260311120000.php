<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260311120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add position column to campaign_event for reordering';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE campaign_event ADD position INT DEFAULT 0 NOT NULL');
        $this->addSql('
            WITH ranked AS (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY entry_id ORDER BY created_at) - 1 AS pos
                FROM campaign_event
            )
            UPDATE campaign_event SET position = ranked.pos FROM ranked WHERE campaign_event.id = ranked.id
        ');
        $this->addSql('ALTER TABLE campaign_event ALTER position DROP DEFAULT');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE campaign_event DROP COLUMN position');
    }
}
