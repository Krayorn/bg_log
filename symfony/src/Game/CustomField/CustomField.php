<?php

namespace App\Game\CustomField;

use App\Game\Game;
use App\Player\Player;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'custom_fields')]
#[ORM\Entity()]
class CustomField
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    #[ORM\Column(enumType: CustomFieldKind::class)]
    private CustomFieldKind $kind;

    /**
     * @var Collection<int, CustomFieldEnumValue>
     */
    #[ORM\OneToMany(mappedBy: 'customField', targetEntity: CustomFieldEnumValue::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $enumValues;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id')]
        private readonly Game $game,
        #[ORM\Column(type: 'text')]
        private readonly string $name,
        string $kind,
        #[ORM\Column(enumType: CustomFieldScope::class)]
        private readonly CustomFieldScope $scope,
        #[ORM\Column(type: 'boolean', options: [
            'default' => false,
        ])]
        private readonly bool $multiple = false,
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id', nullable: true)]
        private readonly ?Player $player = null,
        #[ORM\Column(type: 'boolean', options: [
            'default' => false,
        ])]
        private bool $shareable = false,
        #[ORM\ManyToOne(targetEntity: self::class)]
        #[ORM\JoinColumn(name: 'origin_custom_field_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
        private readonly ?self $originCustomField = null,
    ) {
        $this->id = Uuid::uuid4();
        $this->enumValues = new ArrayCollection();
        $kindEnum = CustomFieldKind::tryFrom($kind);
        if (! $kindEnum instanceof \App\Game\CustomField\CustomFieldKind) {
            throw new \InvalidArgumentException("Invalid custom field kind: {$kind}");
        }
        $this->kind = $kindEnum;
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function getKind(): CustomFieldKind
    {
        return $this->kind;
    }

    public function getScope(): CustomFieldScope
    {
        return $this->scope;
    }

    public function isMultiple(): bool
    {
        return $this->multiple;
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'name' => $this->name,
            'scope' => $this->scope->value,
            'multiple' => $this->multiple,
            'enumValues' => array_values(array_map(fn ($v) => $v->view(), $this->enumValues->toArray())),
            'player' => $this->player?->getId(),
            'shareable' => $this->shareable,
            'originCustomField' => $this->originCustomField?->getId(),
        ];
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    public function getPlayer(): ?Player
    {
        return $this->player;
    }

    public function isShareable(): bool
    {
        return $this->shareable;
    }

    public function setShareable(bool $shareable): void
    {
        if ($this->originCustomField instanceof self) {
            throw new \DomainException('A copied custom field cannot be made shareable');
        }

        $this->shareable = $shareable;
    }

    public function getOriginCustomField(): ?self
    {
        return $this->originCustomField;
    }

    public function setKind(CustomFieldKind $kind): void
    {
        if ($this->originCustomField instanceof self) {
            throw new \DomainException('A copied custom field cannot be modified');
        }

        $this->kind = $kind;
    }

    /**
     * @param array<string> $values
     */
    public function syncEnumValues(array $values, EntityManagerInterface $em, bool $fromCopy = false): void
    {
        if (! $fromCopy && $this->originCustomField instanceof self) {
            throw new \DomainException('A copied custom field cannot be modified');
        }

        foreach ($this->enumValues as $existing) {
            if (! in_array($existing->getValue(), $values, true)) {
                $this->enumValues->removeElement($existing);
                $em->remove($existing);
            }
        }

        $currentValues = array_map(fn ($v) => $v->getValue(), $this->enumValues->toArray());
        foreach ($values as $value) {
            if (! in_array($value, $currentValues, true)) {
                $this->enumValues->add(new CustomFieldEnumValue($this, $value));
            }
        }
    }
}
