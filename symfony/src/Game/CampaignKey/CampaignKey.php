<?php

namespace App\Game\CampaignKey;

use App\Game\CustomField\CustomField;
use App\Game\Game;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'campaign_key')]
#[ORM\Entity()]
class CampaignKey
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    #[ORM\Column(enumType: CampaignKeyType::class)]
    private CampaignKeyType $type;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id')]
        private readonly Game $game,
        #[ORM\Column(type: 'text')]
        private readonly string $name,
        string $type,
        #[ORM\Column(type: 'boolean')]
        private readonly bool $global,
        #[ORM\ManyToOne(targetEntity: CustomField::class)]
        #[ORM\JoinColumn(name: 'scoped_to_custom_field_id', referencedColumnName: 'id', nullable: true)]
        private readonly ?CustomField $scopedToCustomField = null,
    ) {
        $this->id = Uuid::uuid4();
        $typeEnum = CampaignKeyType::tryFrom($type);
        if (! $typeEnum instanceof \App\Game\CampaignKey\CampaignKeyType) {
            throw new \InvalidArgumentException("Invalid campaign key type: {$type}");
        }
        $this->type = $typeEnum;
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function getType(): CampaignKeyType
    {
        return $this->type;
    }

    public function isGlobal(): bool
    {
        return $this->global;
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getScopedToCustomField(): ?CustomField
    {
        return $this->scopedToCustomField;
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type->value,
            'global' => $this->global,
            'scopedToCustomField' => $this->scopedToCustomField?->view(),
        ];
    }
}
