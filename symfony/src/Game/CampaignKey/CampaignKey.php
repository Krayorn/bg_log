<?php

namespace App\Game\CampaignKey;

use App\Game\CustomField\CustomField;
use App\Game\Game;
use App\Player\Player;
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
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id', nullable: true)]
        private readonly ?Player $player = null,
        #[ORM\Column(type: 'boolean', options: [
            'default' => false,
        ])]
        private bool $shareable = false,
        #[ORM\ManyToOne(targetEntity: self::class)]
        #[ORM\JoinColumn(name: 'origin_campaign_key_id', referencedColumnName: 'id', nullable: true, onDelete: 'SET NULL')]
        private readonly ?self $originCampaignKey = null,
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
        if ($this->originCampaignKey instanceof self) {
            throw new \DomainException('A copied campaign key cannot be made shareable');
        }

        $this->shareable = $shareable;
    }

    public function getOriginCampaignKey(): ?self
    {
        return $this->originCampaignKey;
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
            'player' => $this->player?->getId(),
            'shareable' => $this->shareable,
            'originCampaignKey' => $this->originCampaignKey?->getId(),
        ];
    }
}
