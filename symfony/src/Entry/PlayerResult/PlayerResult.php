<?php

namespace App\Entry\PlayerResult;

use App\Entry\Entry;
use App\Player\Player;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Table(name: 'player_result')]
#[ORM\Entity()]
class PlayerResult
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity:Entry::class)]
        #[ORM\JoinColumn(name: 'entry_id', referencedColumnName: 'id')]
        private readonly Entry   $entry,
        #[ORM\ManyToOne(targetEntity:Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id')]
        private readonly Player   $player,
        #[ORM\Column(type:'text')]
        private string $note = '',
        #[ORM\Column(type: 'boolean', nullable: true)]
        private ?bool $won = null,
    )
    {
        $this->id = Uuid::uuid4();
    }



    /**
     * @return array{id: UuidInterface, player: array<string, mixed>, note: string, won: bool|null}
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'player' => $this->player->view(),
            'note' => $this->note,
            'won' => $this->won,
        ];
    }
}