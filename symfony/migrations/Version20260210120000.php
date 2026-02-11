<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260210120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE statistics_query ADD metric VARCHAR(255) DEFAULT NULL');
        $this->addSql('ALTER TABLE statistics_query ALTER custom_field_id DROP NOT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE statistics_query DROP metric');
        $this->addSql('ALTER TABLE statistics_query ALTER custom_field_id SET NOT NULL');
    }
}
