<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260223120000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Create player_nickname table';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE player_nickname (
            id UUID NOT NULL,
            owner_id UUID NOT NULL,
            target_player_id UUID NOT NULL,
            nickname VARCHAR(255) NOT NULL,
            PRIMARY KEY(id),
            CONSTRAINT fk_nickname_owner FOREIGN KEY (owner_id) REFERENCES player(id) ON DELETE CASCADE,
            CONSTRAINT fk_nickname_target FOREIGN KEY (target_player_id) REFERENCES player(id) ON DELETE CASCADE,
            CONSTRAINT unique_owner_target UNIQUE (owner_id, target_player_id)
        )');
        $this->addSql('COMMENT ON COLUMN player_nickname.id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN player_nickname.owner_id IS \'(DC2Type:uuid)\'');
        $this->addSql('COMMENT ON COLUMN player_nickname.target_player_id IS \'(DC2Type:uuid)\'');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE player_nickname');
    }
}
