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
    private UuidInterface $id;

    public function __construct(
        #[ORM\Column(type:"string", unique: true)]
        private readonly string $name,
    )
    {
        $this->id = Uuid::uuid4();
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }


    /**
     * @return array{id: UuidInterface, name: string}
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}