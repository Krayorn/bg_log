<?php

namespace App\Game;

use App\Player\Player;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'game')]
#[ORM\Entity(repositoryClass: GameRepository::class)]
class Game
{
    #[ORM\Id]
    #[ORM\Column(type:"uuid", unique: true)]
    public UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity:Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id', nullable: false)]
        private readonly Player $player,
        #[ORM\Column(type:"string", unique: true)]
        private readonly string $name,
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
            'name' => $this->name,
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