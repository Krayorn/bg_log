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
    private UuidInterface $id;

    #[ORM\Column(type: 'datetimetz_immutable', nullable: true)]
    private ?DateTimeImmutable $registeredOn = null;

    #[ORM\Column(type: 'string', nullable: true)]
    private ?string $password = null;

    /**
     * @var array<string>
     */
    #[ORM\Column(type: 'json')]
    private array $roles = [];

    #[ORM\ManyToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(name: 'in_party_of_id', referencedColumnName: 'id', onDelete: 'SET NULL', nullable: true)]
    private ?Player $inPartyOf = null;

    public function __construct(
        #[ORM\Column(type: 'string', unique: true)]
        private readonly string $name,
        #[ORM\Column(type: 'integer', unique: true)]
        private readonly int $number,
        #[ORM\Column(type: 'string', nullable: true)]
        private ?string $email = null,
    ) {
        $this->id = Uuid::uuid4();
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

    /**
     * @return array{id: UuidInterface, name: string, number: int, registeredOn: DateTimeImmutable|null, isGuest: bool, inPartyOf: array{id: UuidInterface, name: string}|null, email?: string|null}
     */
    public function view(bool $includeSensitive = false): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'number' => $this->number,
            'registeredOn' => $this->registeredOn,
            'isGuest' => ! $this->registeredOn instanceof \DateTimeImmutable,
            'inPartyOf' => $this->inPartyOf instanceof self ? [
                'id' => $this->inPartyOf->getId(),
                'name' => $this->inPartyOf->getName(),
            ] : null,
            'roles' => $this->roles,
        ];

        if ($includeSensitive) {
            $data['email'] = $this->email;
        }

        return $data;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(?string $email): void
    {
        $this->email = $email;
    }

    public function getRoles(): array
    {
        return $this->roles;
    }

    public function getUserIdentifier(): string
    {
        return $this->getName();
    }

    public function eraseCredentials(): void
    {
        // $this->password = null; never called ?
    }

    public function getRegisteredOn(): ?DateTimeImmutable
    {
        return $this->registeredOn;
    }

    public function getInPartyOf(): ?self
    {
        return $this->inPartyOf;
    }

    public function setInPartyOf(?self $player): void
    {
        $this->inPartyOf = $player;
    }

    public function register(string $hashedPassword): void
    {
        $this->password = $hashedPassword;
        $this->registeredOn = new DateTimeImmutable();
    }
}
