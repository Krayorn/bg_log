<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260213120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add createdAt column to entry table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE entry ADD created_at TIMESTAMP(0) WITH TIME ZONE NOT NULL DEFAULT NOW()');
        $this->addSql("COMMENT ON COLUMN entry.created_at IS '(DC2Type:datetimetz_immutable)'");
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE entry DROP created_at');
    }
}
