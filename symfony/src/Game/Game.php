<?php

namespace App\Game;

use App\Game\CampaignKey\CampaignKey;
use App\Game\CustomField\CustomField;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;

#[ORM\Table(name: 'game')]
#[ORM\Entity(repositoryClass: GameRepository::class)]
class Game
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidInterface $id;

    /**
     * @var Collection<int, CustomField>
     */
    #[ORM\OneToMany(mappedBy: 'game', targetEntity: CustomField::class, indexBy: 'id', cascade: ['persist'])]
    private Collection $customFields;

    /**
     * @var Collection<int, CampaignKey>
     */
    #[ORM\OneToMany(mappedBy: 'game', targetEntity: CampaignKey::class, indexBy: 'id', cascade: ['persist'])]
    private Collection $campaignKeys;

    public function __construct(
        #[ORM\Column(type: 'string', unique: true)]
        private string $name
    ) {
        $this->id = Uuid::uuid4();
        $this->customFields = new ArrayCollection();
        $this->campaignKeys = new ArrayCollection();
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
            'customFields' => array_values(array_map(fn ($customField) => $customField->view(), $this->customFields->toArray())),
            'campaignKeys' => array_values(array_map(fn ($campaignKey) => $campaignKey->view(), $this->campaignKeys->toArray())),
        ];
    }

    public function setName(string $name): void
    {
        $this->name = $name;
    }

    public function getCustomField(string $customFieldId): CustomField
    {
        foreach ($this->customFields as $cf) {
            if ((string) $cf->id === $customFieldId) {
                return $cf;
            }
        }

        throw new BadRequestException("Custom field not found: {$customFieldId}");
    }

    public function getCampaignKey(string $campaignKeyId): CampaignKey
    {
        foreach ($this->campaignKeys as $ck) {
            if ((string) $ck->id === $campaignKeyId) {
                return $ck;
            }
        }

        throw new BadRequestException("Campaign key not found: {$campaignKeyId}");
    }
}
