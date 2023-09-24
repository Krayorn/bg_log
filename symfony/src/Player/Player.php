<?php

namespace App\Player;

use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Table(name: 'player')]
#[ORM\Entity()]
class Player implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    #[ORM\Column(type: 'datetimetz_immutable', nullable: true)]
    public ?DateTimeImmutable $registeredOn;

    #[ORM\Column(type: "string", nullable: true)]
    public ?string $password;

    public function __construct(
        #[ORM\Column(type: "string", unique: true)]
        private readonly string $name,
        #[ORM\Column(type: 'integer', unique: true)]
        private readonly int $number,
    )
    {
        $this->id = Uuid::uuid4();
        $this->registeredOn = null;
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function getPassword(): ?string
    {
        return $this->password;
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
            'number' => $this->number,
            'registeredOn' => $this->registeredOn,
        ];
    }

    public function getRoles(): array
    {
        return [];
    }

    public function getUserIdentifier(): string
    {
        return ".";
    }

    public function eraseCredentials()
    {
    }

    public function setPassword($hashedPassword): void
    {
        $this->password = $hashedPassword;
    }
}