<?php

namespace App\Game\CustomField;

use App\Game\Game;
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
    private readonly CustomFieldKind $kind;
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
        $this->kind = CustomFieldKind::tryFrom($kind);
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'name' => $this->name,
            'global' => $this->global,
        ];
    }
}