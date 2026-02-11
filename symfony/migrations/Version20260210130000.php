<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260210130000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add multiple column to custom_fields';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE custom_fields ADD multiple BOOLEAN NOT NULL DEFAULT false');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE custom_fields DROP multiple');
    }
}
