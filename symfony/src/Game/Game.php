<?php

namespace App\Game;

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
        #[ORM\Column(type:"string", unque: true)]
        private readonly string $name,
    )
    {
        $this->id = Uuid::uuid4();
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}