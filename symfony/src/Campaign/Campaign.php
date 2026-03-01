<?php

namespace App\Campaign;

use App\Campaign\CampaignEvent\CampaignEvent;
use App\Entry\Entry;
use App\Game\Game;
use App\Player\Player;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'campaign')]
#[ORM\Entity(repositoryClass: CampaignRepository::class)]
class Campaign
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    private UuidInterface $id;

    #[ORM\Column(type: 'datetimetz_immutable')]
    private DateTimeImmutable $createdAt;

    /**
     * @var Collection<int, Entry>
     */
    #[ORM\OneToMany(mappedBy: 'campaign', targetEntity: Entry::class)]
    private Collection $entries;

    /**
     * @var Collection<int, CampaignEvent>
     */
    #[ORM\OneToMany(mappedBy: 'campaign', targetEntity: CampaignEvent::class, cascade: ['remove'], orphanRemoval: true)]
    private Collection $events;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id')]
        private readonly Game $game,
        #[ORM\Column(type: 'string')]
        private string $name,
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'created_by_id', referencedColumnName: 'id')]
        private readonly Player $createdBy,
    ) {
        $this->id = Uuid::uuid4();
        $this->createdAt = new DateTimeImmutable();
        $this->entries = new ArrayCollection();
        $this->events = new ArrayCollection();
    }

    /**
     * @param array<string, list<array{label: string, playerId: string|null, entries: array<string, mixed>, scoped: list<array{label: string, entries: array<string, mixed>}>}>>|null $entryStates pre-computed states from CampaignStateCalculator
     *
     * @return array{id: UuidInterface, name: string, game: array<string, mixed>, createdBy: array<string, mixed>, createdAt: DateTimeImmutable, entries: array<int, array<string, mixed>>}
     */
    public function view(?array $entryStates = null): array
    {
        $sortedEntries = $this->getSortedEntries();
        $entriesView = [];

        foreach ($sortedEntries as $entry) {
            $entryEvents = $this->events->filter(fn (CampaignEvent $e) => $e->getEntry()->id->equals($entry->id))->toArray();
            usort($entryEvents, fn (CampaignEvent $a, CampaignEvent $b) => $a->getCreatedAt() <=> $b->getCreatedAt());

            $entryView = $entry->view();
            $entryView['events'] = array_values(array_map(fn (CampaignEvent $e) => $e->view(), $entryEvents));

            if ($entryStates !== null) {
                $entryView['stateAfter'] = $entryStates[(string) $entry->id] ?? [];
            }

            $entriesView[] = $entryView;
        }

        return [
            'id' => $this->id,
            'name' => $this->name,
            'game' => $this->game->view(),
            'createdBy' => $this->createdBy->view(),
            'createdAt' => $this->createdAt,
            'entries' => $entriesView,
        ];
    }

    /**
     * @return array{id: UuidInterface, name: string, createdAt: DateTimeImmutable}
     */
    public function viewSummary(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'createdAt' => $this->createdAt,
        ];
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function updateName(string $name): void
    {
        $this->name = $name;
    }

    public function getId(): UuidInterface
    {
        return $this->id;
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    public function getCreatedBy(): Player
    {
        return $this->createdBy;
    }

    /**
     * @return Entry[]
     */
    public function getSortedEntries(): array
    {
        $entries = $this->entries->toArray();
        usort($entries, function (Entry $a, Entry $b) {
            $playedAtCmp = $a->getPlayedAt() <=> $b->getPlayedAt();

            return $playedAtCmp !== 0 ? $playedAtCmp : $a->getCreatedAt() <=> $b->getCreatedAt();
        });

        return $entries;
    }

    /**
     * @return Collection<int, CampaignEvent>
     */
    public function getEvents(): Collection
    {
        return $this->events;
    }
}
