<?php

namespace App\Game\CustomField;

use App\Game\Game;
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
        #[ORM\Column(type: 'boolean')]
        private readonly bool $global,
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

    public function isGlobal(): bool
    {
        return $this->global;
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
            'global' => $this->global,
            'enumValues' => array_values(array_map(fn ($v) => $v->view(), $this->enumValues->toArray())),
        ];
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    public function setKind(CustomFieldKind $kind): void
    {
        $this->kind = $kind;
    }

    /**
     * @param array<string> $values
     */
    public function syncEnumValues(array $values, EntityManagerInterface $em): void
    {
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
