<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260224200000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Rename global boolean to scope enum on custom_fields and campaign_key';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE custom_fields ADD scope VARCHAR(255)');
        $this->addSql("UPDATE custom_fields SET scope = CASE WHEN \"global\" = true THEN 'entry' ELSE 'playerResult' END");
        $this->addSql('ALTER TABLE custom_fields ALTER scope SET NOT NULL');
        $this->addSql('ALTER TABLE custom_fields DROP COLUMN "global"');

        $this->addSql('ALTER TABLE campaign_key ADD scope VARCHAR(255)');
        $this->addSql("UPDATE campaign_key SET scope = CASE WHEN \"global\" = true THEN 'entry' ELSE 'playerResult' END");
        $this->addSql('ALTER TABLE campaign_key ALTER scope SET NOT NULL');
        $this->addSql('ALTER TABLE campaign_key DROP COLUMN "global"');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE custom_fields ADD "global" BOOLEAN');
        $this->addSql("UPDATE custom_fields SET \"global\" = CASE WHEN scope = 'entry' THEN true ELSE false END");
        $this->addSql('ALTER TABLE custom_fields ALTER "global" SET NOT NULL');
        $this->addSql('ALTER TABLE custom_fields DROP COLUMN scope');

        $this->addSql('ALTER TABLE campaign_key ADD "global" BOOLEAN');
        $this->addSql("UPDATE campaign_key SET \"global\" = CASE WHEN scope = 'entry' THEN true ELSE false END");
        $this->addSql('ALTER TABLE campaign_key ALTER "global" SET NOT NULL');
        $this->addSql('ALTER TABLE campaign_key DROP COLUMN scope');
    }
}
