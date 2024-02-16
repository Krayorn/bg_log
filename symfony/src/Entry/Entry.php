<?php

namespace App\Entry;

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
    #[ORM\OneToMany(mappedBy: 'entry', targetEntity: PlayerResult::class, cascade: ['persist'], indexBy: 'id')]
    private Collection   $playerResults;

    /**
     * @var Collection<int, CustomFieldValue>
     */
    #[ORM\OneToMany(mappedBy: 'entry', targetEntity: CustomFieldValue::class, cascade: ['persist'], indexBy: 'id')]
    private Collection   $customFields;

    /**
     * @param array<array{player: Player, note: string, won: boolean}> $players
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
        private readonly ?GameOwned        $gameUsed,
    ) {
        $this->id = Uuid::uuid4();

        $this->customFields = new ArrayCollection();
        $this->playerResults = new ArrayCollection();
        foreach ($players as $player) {
            $this->playerResults->add(new PlayerResult($this, $player['player'], $player['note'], $player['won']));
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
            'players' => array_values(array_map(fn ($playerResult) => $playerResult->view(), $this->playerResults->toArray())),
            'gameUsed' => $this->gameUsed?->view(),
            'customFields' => array_values(array_map(fn ($customField) => $customField->view(), $this->customFields->toArray())),
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
    public function updatePlayerResult(string $playerResultId, ?string $note, ?bool $won, array $customFields): void
    {
        $playerResult = $this->playerResults->get($playerResultId);

        if ($playerResult === null) {
            throw new BadRequestException();
        }

        if ($note !== null) {
            $playerResult->updateNote($note);
        }

        foreach ($customFields as $event) {
            switch ($event->getKind()) {
                case Event::ADD:
                    $playerResult->addCustomFieldValue($this->game->getCustomField($event->getCustomFieldId()), $event->getCustomFieldValue());
                    break;
                case Event::UPDATE:
                    $playerResult->updateCustomFieldValue($event->getId(), $event->getCustomFieldValue());
                    break;
                case Event::REMOVE:
                    break;
            }
        }
    }

    public function addCustomFieldValue(string $customFieldId, string $value): void
    {
        $customField = $this->game->getCustomField($customFieldId);

        foreach ($this->customFields as $existingCustomFieldValue) {
            if ($existingCustomFieldValue->getCustomField()->getId() === $customField->getId()) {
                throw new \Exception('There is already a value for this customField on this player result');
            }
        }

        $valueString = null;
        $valueNumber = null;

        if ($customField->getKind() === CustomFieldKind::STRING) {
            $valueString = $value;
        } elseif ($customField->getKind() === CustomFieldKind::NUMBER) {
            $valueNumber = (int) $value;
        }

        $customFieldValue = new CustomFieldValue($this, null, $customField, $valueString, $valueNumber);

        $this->customFields->add($customFieldValue);
    }

    public function updateCustomFieldValue(string $id, string $value): void
    {
        $customFieldValue = $this->customFields->get($id);

        if ($customFieldValue->getCustomField()->getKind() === CustomFieldKind::STRING) {
            $customFieldValue->updateStringValue($value);
        } elseif ($customFieldValue->getCustomField()->getKind() === CustomFieldKind::NUMBER) {
            $customFieldValue->updateNumberValue((int) $value);
        }
    }
}
