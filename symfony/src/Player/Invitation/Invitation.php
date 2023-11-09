<?php

namespace App\Player\Invitation;

use App\Player\Player;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'invitation')]
#[ORM\Entity()]
class Invitation
{
    #[ORM\Id]
    #[ORM\Column(type:"uuid", unique: true)]
    private UuidInterface $id;

    #[ORM\Column(type: 'boolean', nullable: false)]
    private bool $used;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Player::class,)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id', nullable: false)]
        private readonly Player $player
    )
    {
        $this->id = Uuid::uuid4();
        $this->used = false;
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function useInvitation(): void {
        $this->used = true;
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'player' => $this->player->view(),
        ];
    }
}