<?php

namespace App\StatisticsQuery;

use App\Game\CustomField\CustomFieldRepository;
use App\Game\GameRepository;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\Uuid;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class StatisticsQueryController extends AbstractController
{
    #[Route('api/statisticsQueries', methods: 'GET')]
    public function list(Request $request, StatisticsQueryRepository $repository, GameRepository $gameRepository, PlayerRepository $playerRepository): Response
    {
        $gameId = $request->query->get('gameId');
        $playerId = $request->query->get('playerId');

        if ($gameId === null || $playerId === null) {
            return new JsonResponse([
                'error' => 'gameId and playerId are required',
            ], Response::HTTP_BAD_REQUEST);
        }

        $game = $gameRepository->find($gameId);
        $player = $playerRepository->find($playerId);

        if ($game === null || $player === null) {
            return new JsonResponse([
                'error' => 'Game or player not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $queries = $repository->findByGameAndPlayer($game, $player);

        return new JsonResponse(
            array_map(fn (StatisticsQuery $q) => $q->view(), $queries),
            Response::HTTP_OK
        );
    }

    #[Route('api/statisticsQueries', methods: 'POST')]
    public function create(Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository, PlayerRepository $playerRepository): Response
    {
        $body = json_decode($request->getContent(), true);

        $game = $gameRepository->find($body['gameId']);
        $player = $playerRepository->find($body['playerId']);

        if ($game === null || $player === null) {
            return new JsonResponse([
                'error' => 'Game or player not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $query = new StatisticsQuery(
            $player,
            $game,
            $body['name'],
            isset($body['customFieldId']) ? Uuid::fromString($body['customFieldId']) : null,
            isset($body['groupByFieldId']) ? Uuid::fromString($body['groupByFieldId']) : null,
            $body['groupByPlayer'] ?? false,
            $body['aggregation'] ?? null,
            $body['metric'] ?? null,
        );

        $entityManager->persist($query);
        $entityManager->flush();

        return new JsonResponse($query->view(), Response::HTTP_CREATED);
    }

    #[Route('api/statisticsQueries/execute', methods: 'GET', priority: 1)]
    public function execute(
        Request $request,
        CustomFieldRepository $customFieldRepository,
        PlayerRepository $playerRepository,
        GameRepository $gameRepository,
        StatisticsQueryExecutor $statisticsQueryExecutor,
    ): Response {
        $customFieldId = $request->query->get('customFieldId');
        $playerId = $request->query->get('playerId');
        $groupByFieldId = $request->query->get('groupByFieldId');
        $groupByPlayer = $request->query->getBoolean('groupByPlayer', false);
        $aggregation = $request->query->get('aggregation', 'sum');
        $metric = $request->query->get('metric');
        $gameId = $request->query->get('gameId');

        $player = null;
        if ($playerId !== null) {
            $player = $playerRepository->find($playerId);
        }

        if ($player === null) {
            return new JsonResponse([
                'error' => 'Player not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $groupByField = null;
        if ($groupByFieldId !== null) {
            $groupByField = $customFieldRepository->find($groupByFieldId);
        }

        if ($metric === 'winrate') {
            $game = $gameId !== null ? $gameRepository->find($gameId) : null;
            if ($game === null) {
                return new JsonResponse([
                    'error' => 'gameId is required for winrate queries',
                ], Response::HTTP_BAD_REQUEST);
            }

            $stats = $statisticsQueryExecutor->getWinRateStats($player, $game, $groupByField, $groupByPlayer);

            return new JsonResponse($stats, Response::HTTP_OK);
        }

        if ($customFieldId === null) {
            return new JsonResponse([
                'error' => 'customFieldId is required',
            ], Response::HTTP_BAD_REQUEST);
        }

        $customField = $customFieldRepository->find($customFieldId);
        if ($customField === null) {
            return new JsonResponse([
                'error' => 'Custom field not found',
            ], Response::HTTP_NOT_FOUND);
        }

        $stats = $statisticsQueryExecutor->getCustomFieldStats($customField, $player, $groupByField, $groupByPlayer, $aggregation);

        return new JsonResponse($stats, Response::HTTP_OK);
    }

    #[Route('api/statisticsQueries/{statisticsQuery}', methods: 'PUT')]
    public function update(StatisticsQuery $statisticsQuery, Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(StatisticsQueryVoter::STATISTICS_QUERY_EDIT, $statisticsQuery);

        $body = json_decode($request->getContent(), true);

        $statisticsQuery->update(
            $body['name'],
            isset($body['customFieldId']) ? Uuid::fromString($body['customFieldId']) : null,
            isset($body['groupByFieldId']) ? Uuid::fromString($body['groupByFieldId']) : null,
            $body['groupByPlayer'] ?? false,
            $body['aggregation'] ?? null,
            $body['metric'] ?? null,
        );

        $entityManager->flush();

        return new JsonResponse($statisticsQuery->view(), Response::HTTP_OK);
    }

    #[Route('api/statisticsQueries/{statisticsQuery}', methods: 'DELETE')]
    public function delete(StatisticsQuery $statisticsQuery, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(StatisticsQueryVoter::STATISTICS_QUERY_EDIT, $statisticsQuery);

        $entityManager->remove($statisticsQuery);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
