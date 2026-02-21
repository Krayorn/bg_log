<?php

namespace App\StatisticsQuery\Action;

use App\Game\GameRepository;
use App\Player\PlayerRepository;
use App\StatisticsQuery\StatisticsQuery;
use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\UuidInterface;

class CreateStatisticsQueryHandler
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly PlayerRepository $playerRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(
        string $gameId,
        string $playerId,
        string $name,
        ?UuidInterface $customFieldId,
        ?UuidInterface $groupByFieldId,
        bool $groupByPlayer,
        ?string $aggregation,
        ?string $metric,
    ): StatisticsQuery {
        $game = $this->gameRepository->find($gameId);
        $player = $this->playerRepository->find($playerId);

        if ($game === null || $player === null) {
            throw new \InvalidArgumentException('Game or player not found');
        }

        $query = new StatisticsQuery(
            $player,
            $game,
            $name,
            $customFieldId,
            $groupByFieldId,
            $groupByPlayer,
            $aggregation,
            $metric,
        );

        $this->entityManager->persist($query);
        $this->entityManager->flush();

        return $query;
    }
}
