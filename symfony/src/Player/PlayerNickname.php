<?php

namespace App\Player;

use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'player_nickname')]
#[ORM\UniqueConstraint(name: 'unique_owner_target', columns: ['owner_id', 'target_player_id'])]
#[ORM\Entity()]
class PlayerNickname
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'owner_id', referencedColumnName: 'id', onDelete: 'CASCADE', nullable: false)]
        private Player $owner,
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'target_player_id', referencedColumnName: 'id', onDelete: 'CASCADE', nullable: false)]
        private Player $targetPlayer,
        #[ORM\Column(type: 'string')]
        private string $nickname
    ) {
        $this->id = Uuid::uuid4();
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function getOwner(): Player
    {
        return $this->owner;
    }

    public function getTargetPlayer(): Player
    {
        return $this->targetPlayer;
    }

    public function getNickname(): string
    {
        return $this->nickname;
    }

    public function setNickname(string $nickname): void
    {
        $this->nickname = $nickname;
    }
}
