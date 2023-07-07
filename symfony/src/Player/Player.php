<?php

namespace App\Player;

use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'player')]
#[ORM\Entity()]
class Player
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    public function __construct(
        #[ORM\Column(type: "string", unique: true)]
        private readonly string $name,
    )
    {
        $this->id = Uuid::uuid4();
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
        ];
    }
}