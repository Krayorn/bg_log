<?php

namespace App\Entry;

use App\Entry\PlayerResult\PlayerResult;
use App\Game\Game;
use App\Game\GameOwned;
use App\Player\Player;
use DateTimeImmutable;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Exception;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'entry')]
#[ORM\Entity(repositoryClass: EntryRepository::class)]
class Entry
{
    #[ORM\Id]
    #[ORM\Column(type:"uuid", unique: true)]
    public UuidInterface $id;

    #[ORM\OneToMany(mappedBy: 'entry', targetEntity: PlayerResult::class, cascade: ['persist'])]
    private Collection   $playerResults;

    public function __construct(
        #[ORM\ManyToOne(targetEntity:Game::class)]
        #[ORM\JoinColumn(name: 'game_id', referencedColumnName: 'id')]
        private readonly Game   $game,
        #[ORM\Column(type:'text')]
        private string $note,
        #[ORM\Column(type:'datetimetz_immutable')]
        private readonly DateTimeImmutable $playedAt,
        array $players,
        #[ORM\ManyToOne(targetEntity:GameOwned::class)]
        #[ORM\JoinColumn(name: 'game_owned_id', referencedColumnName: 'id', nullable: true)]
        private ?GameOwned   $gameUsed,
        )
    {
        $this->id = Uuid::uuid4();

        $this->playerResults = new ArrayCollection();
        foreach ($players as $player) {
            $this->playerResults->add(new PlayerResult($this, $player['player'], $player['note'], $player['won']));
        }
    }

    public function addPlayerResult(PlayerResult $player): void
    {
        $this->playerResults->add($player);
    }

    public function playedWith(GameOwned $gameUsed): void
    {
        $this->gameUsed = $gameUsed;
    }

    public function updateNote(string $note): void
    {
        $this->note = $note;
    }

    public function updatePlayerResult(string $playerName, ?string $playerNote, ?bool $playerWon): void
    {
        foreach ($this->playerResults as $playerResult) {
            if ($playerResult->getPlayer()->getName() === $playerName) {
                if ($playerNote !== null) {
                    $playerResult->updateNote($playerNote);
                }
                if ($playerWon !== null) {
                    $playerResult->updateWon($playerWon);
                }
                return;
            }
        }

        throw new Exception(sprintf("No player with this name %s", $playerName));
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'game' => $this->game->view(),
            'note' => $this->note,
            'playedAt' => $this->playedAt,
            'players' => array_map(fn($playerResult) => $playerResult->view(), $this->playerResults->toArray()),
            'gameUsed' => $this->gameUsed->view(),
        ];
    }
}