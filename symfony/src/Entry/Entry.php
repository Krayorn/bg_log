<?php

namespace App\Entry;

use App\Campaign\Campaign;
use App\Entry\PlayerResult\PlayerResult;
use App\Event;
use App\Game\CustomField\CustomFieldKind;
use App\Game\Game;
use App\Game\GameOwned;
use App\Player\Player;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;

#[ORM\Table(name: 'entry')]
#[ORM\Entity(repositoryClass: EntryRepository::class)]
class Entry
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    /**
     * @var Collection<int, PlayerResult>
     */
    #[ORM\OneToMany(mappedBy: 'entry', targetEntity: PlayerResult::class, cascade: ['persist', 'remove'], orphanRemoval: true, indexBy: 'id')]
    private Collection   $playerResults;

    /**
     * @var Collection<int, CustomFieldValue>
     */
    #[ORM\OneToMany(mappedBy: 'entry', targetEntity: CustomFieldValue::class, cascade: ['persist', 'remove'], orphanRemoval: true, indexBy: 'id')]
    private Collection   $customFields;

    #[ORM\ManyToOne(targetEntity: Campaign::class, inversedBy: 'entries')]
    #[ORM\JoinColumn(name: 'campaign_id', referencedColumnName: 'id', nullable: true)]
    private ?Campaign $campaign = null;

    #[ORM\Column(type: 'datetimetz_immutable')]
    private DateTimeImmutable $createdAt;

    /**
     * @param array<array{player: Player, note: string, won: bool|null, customFields?: array<array{id: string, value: string|array<string>}>}> $players
     */
    public function __construct(
        #[ORM\ManyToOne(targetEntity: Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id')]
        private readonly Game              $game,
        #[ORM\Column(type: 'text')]
        private string            $note,
        #[ORM\Column(type: 'datetimetz_immutable')]
        private DateTimeImmutable $playedAt,
        array                              $players,
        #[ORM\ManyToOne(targetEntity: GameOwned::class)]
        #[ORM\JoinColumn(name: 'game_owned_id', referencedColumnName: 'id', nullable: true)]
        private ?GameOwned        $gameUsed,
    ) {
        $this->id = Uuid::uuid4();
        $this->createdAt = new DateTimeImmutable();

        $this->customFields = new ArrayCollection();
        $this->playerResults = new ArrayCollection();
        foreach ($players as $player) {
            $playerResult = new PlayerResult($this, $player['player'], $player['note'], $player['won']);

            $playerCustomFields = $player['customFields'] ?? [];
            foreach ($playerCustomFields as $customFieldData) {
                $customField = $this->game->getCustomField($customFieldData['id']);
                $value = $customFieldData['value'];
                if (is_array($value)) {
                    foreach ($value as $singleValue) {
                        $playerResult->addCustomFieldValue($customField, $singleValue);
                    }
                } else {
                    $playerResult->addCustomFieldValue($customField, $value);
                }
            }

            $this->playerResults->add($playerResult);
        }
    }

    /**
     * @return array{id: UuidInterface, game: array<string, mixed>, note: string, playedAt: DateTimeImmutable, players: mixed, gameUsed: array<string, mixed>|null}
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'game' => $this->game->view(),
            'note' => $this->note,
            'playedAt' => $this->playedAt,
            'createdAt' => $this->createdAt,
            'players' => array_values(array_map(fn ($playerResult) => $playerResult->view(), $this->playerResults->toArray())),
            'gameUsed' => $this->gameUsed?->view(),
            'customFields' => array_values(array_map(fn ($customField) => $customField->view(), $this->customFields->toArray())),
            'campaign' => $this->campaign?->viewSummary(),
        ];
    }

    public function updateNote(string $note): void
    {
        $this->note = $note;
    }

    public function updatePlayedAt(DateTimeImmutable $playedAt): void
    {
        $this->playedAt = $playedAt;
    }

    /**
     * @param array<CustomFieldEvent> $customFields
     */
    public function updatePlayerResult(string $playerResultId, ?string $note, ?bool $won, bool $updateWon, array $customFields): void
    {
        $playerResult = null;
        foreach ($this->playerResults as $pr) {
            if ((string) $pr->id === $playerResultId) {
                $playerResult = $pr;
                break;
            }
        }

        if ($playerResult === null) {
            throw new BadRequestException();
        }

        if ($note !== null) {
            $playerResult->updateNote($note);
        }

        if ($updateWon) {
            $playerResult->updateWon($won);
        }

        foreach ($customFields as $event) {
            $customFieldId = $event->getCustomFieldId();
            $eventId = $event->getId();
            switch ($event->getKind()) {
                case Event::ADD:
                    if ($customFieldId !== null) {
                        $playerResult->addCustomFieldValue($this->game->getCustomField($customFieldId), $event->getCustomFieldValue() ?? '');
                    }
                    break;
                case Event::UPDATE:
                    if ($eventId !== null) {
                        $playerResult->updateCustomFieldValue($eventId, $event->getCustomFieldValue() ?? '');
                    }
                    break;
                case Event::REMOVE:
                    if ($eventId !== null) {
                        $playerResult->removeCustomFieldValue($eventId);
                    }
                    break;
            }
        }
    }

    public function addCustomFieldValue(string $customFieldId, string $value): void
    {
        $customField = $this->game->getCustomField($customFieldId);

        if (! $customField->isMultiple()) {
            foreach ($this->customFields as $existingCustomFieldValue) {
                if ($existingCustomFieldValue->getCustomField()->getId() === $customField->getId()) {
                    throw new \DomainException('There is already a value for this custom field on this entry');
                }
            }
        }

        $valueString = null;
        $valueNumber = null;

        if ($customField->getKind() === CustomFieldKind::STRING || $customField->getKind() === CustomFieldKind::ENUM) {
            $valueString = $value;
        } elseif ($customField->getKind() === CustomFieldKind::NUMBER) {
            $valueNumber = (int) $value;
        }

        $customFieldValue = new CustomFieldValue($this, null, $customField, $valueString, $valueNumber);

        $this->customFields->add($customFieldValue);
    }

    public function updateCustomFieldValue(string $id, string $value): void
    {
        $customFieldValue = null;
        foreach ($this->customFields as $cfv) {
            if ((string) $cfv->id === $id) {
                $customFieldValue = $cfv;
                break;
            }
        }

        if ($customFieldValue === null) {
            throw new BadRequestException("Custom field value not found: {$id}");
        }

        if ($customFieldValue->getCustomField()->getKind() === CustomFieldKind::STRING || $customFieldValue->getCustomField()->getKind() === CustomFieldKind::ENUM) {
            $customFieldValue->updateStringValue($value);
        } elseif ($customFieldValue->getCustomField()->getKind() === CustomFieldKind::NUMBER) {
            $customFieldValue->updateNumberValue((int) $value);
        }
    }

    public function removeCustomFieldValue(string $id): void
    {
        foreach ($this->customFields as $key => $cfv) {
            if ((string) $cfv->id === $id) {
                $this->customFields->remove($key);
                return;
            }
        }

        throw new BadRequestException("Custom field value not found: {$id}");
    }

    public function updateGameUsed(?GameOwned $gameUsed): void
    {
        $this->gameUsed = $gameUsed;
    }

    /**
     * @return Collection<int, PlayerResult>
     */
    public function getPlayerResults(): Collection
    {
        return $this->playerResults;
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    /**
     * @param array<array{id: string, value: string|array<string>}> $customFields
     */
    public function addPlayer(Player $player, string $note, ?bool $won, array $customFields): void
    {
        $playerResult = new PlayerResult($this, $player, $note, $won);

        foreach ($customFields as $customFieldData) {
            $customField = $this->game->getCustomField($customFieldData['id']);
            $value = $customFieldData['value'];
            if (is_array($value)) {
                foreach ($value as $singleValue) {
                    $playerResult->addCustomFieldValue($customField, $singleValue);
                }
            } else {
                $playerResult->addCustomFieldValue($customField, $value);
            }
        }

        $this->playerResults->add($playerResult);
    }

    public function removePlayer(string $playerResultId): void
    {
        foreach ($this->playerResults as $key => $pr) {
            if ((string) $pr->id === $playerResultId) {
                $this->playerResults->remove($key);
                return;
            }
        }

        throw new BadRequestException("Player result not found: {$playerResultId}");
    }

    public function getCampaign(): ?Campaign
    {
        return $this->campaign;
    }

    public function setCampaign(?Campaign $campaign): void
    {
        $this->campaign = $campaign;
    }

    public function getPlayedAt(): DateTimeImmutable
    {
        return $this->playedAt;
    }

    public function getCreatedAt(): DateTimeImmutable
    {
        return $this->createdAt;
    }
}
