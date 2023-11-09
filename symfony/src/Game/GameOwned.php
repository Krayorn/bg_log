<?php

namespace App\Game;

use App\Player\Player;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'game_owned')]
#[ORM\Entity()]
class GameOwned
{
    #[ORM\Id]
    #[ORM\Column(type:"uuid", unique: true)]
    private UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity:Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id', nullable: false)]
        private readonly Player $player,
        #[ORM\ManyToOne(targetEntity:Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id', nullable: false)]
        private readonly Game $game,
        #[ORM\Column(type:"integer", nullable: true)]
        private readonly ?int $price = null,
    )
    {
        $this->id = Uuid::uuid4();
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'game' => $this->game->view(),
            'price' => $this->price,
        ];
    }

    public function getPricePerGame(int $count): ?int
    {
        if ($this->price === null || $count < 1) {
            return null;
        }

        return $this->price/$count;
    }
}