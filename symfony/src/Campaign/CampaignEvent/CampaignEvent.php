<?php

namespace App\Campaign\CampaignEvent;

use App\Campaign\Campaign;
use App\Entry\Entry;
use App\Entry\PlayerResult\PlayerResult;
use App\Game\CampaignKey\CampaignKey;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'campaign_event')]
#[ORM\Entity()]
class CampaignEvent
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    #[ORM\Column(type: 'datetimetz_immutable')]
    private DateTimeImmutable $createdAt;

    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        #[ORM\ManyToOne(targetEntity: Campaign::class)]
        #[ORM\JoinColumn(name: 'campaign_id', referencedColumnName: 'id')]
        private readonly Campaign $campaign,
        #[ORM\ManyToOne(targetEntity: Entry::class)]
        #[ORM\JoinColumn(name: 'entry_id', referencedColumnName: 'id')]
        private readonly Entry $entry,
        #[ORM\ManyToOne(targetEntity: PlayerResult::class)]
        #[ORM\JoinColumn(name: 'player_result_id', referencedColumnName: 'id', nullable: true)]
        private readonly ?PlayerResult $playerResult,
        #[ORM\ManyToOne(targetEntity: CampaignKey::class)]
        #[ORM\JoinColumn(name: 'campaign_key_id', referencedColumnName: 'id')]
        private readonly CampaignKey $campaignKey,
        #[ORM\Column(type: 'json')]
        private readonly array $payload,
    ) {
        $this->id = Uuid::uuid4();
        $this->createdAt = new DateTimeImmutable();
    }

    public function getEntry(): Entry
    {
        return $this->entry;
    }

    public function getPlayerResult(): ?PlayerResult
    {
        return $this->playerResult;
    }

    public function getCampaignKey(): CampaignKey
    {
        return $this->campaignKey;
    }

    /**
     * @return array<string, mixed>
     */
    public function getPayload(): array
    {
        return $this->payload;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getCampaign(): Campaign
    {
        return $this->campaign;
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'entry' => $this->entry->id,
            'playerResult' => $this->playerResult?->id,
            'campaignKey' => $this->campaignKey->view(),
            'payload' => $this->payload,
            'createdAt' => $this->createdAt,
        ];
    }
}
