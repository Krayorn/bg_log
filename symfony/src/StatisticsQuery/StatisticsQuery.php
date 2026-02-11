<?php

namespace App\StatisticsQuery;

use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'statistics_query')]
#[ORM\Entity(repositoryClass: StatisticsQueryRepository::class)]
class StatisticsQuery
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id')]
        private readonly Player $player,
        #[ORM\ManyToOne(targetEntity: Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id')]
        private readonly Game $game,
        #[ORM\Column(type: 'string')]
        private string $name,
        #[ORM\Column(type: 'uuid', nullable: true)]
        private ?UuidInterface $customFieldId,
        #[ORM\Column(type: 'uuid', nullable: true)]
        private ?UuidInterface $groupByFieldId,
        #[ORM\Column(type: 'boolean')]
        private bool $groupByPlayer,
        #[ORM\Column(type: 'string', nullable: true)]
        private ?string $aggregation,
        #[ORM\Column(type: 'string', nullable: true)]
        private ?string $metric = null,
    ) {
        $this->id = Uuid::uuid4();
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getGame(): Game
    {
        return $this->game;
    }

    public function update(
        string $name,
        ?UuidInterface $customFieldId,
        ?UuidInterface $groupByFieldId,
        bool $groupByPlayer,
        ?string $aggregation,
        ?string $metric = null,
    ): void {
        $this->name = $name;
        $this->customFieldId = $customFieldId;
        $this->groupByFieldId = $groupByFieldId;
        $this->groupByPlayer = $groupByPlayer;
        $this->aggregation = $aggregation;
        $this->metric = $metric;
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'customFieldId' => $this->customFieldId,
            'groupByFieldId' => $this->groupByFieldId,
            'groupByPlayer' => $this->groupByPlayer,
            'aggregation' => $this->aggregation,
            'metric' => $this->metric,
        ];
    }
}
