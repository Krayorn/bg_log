<?php

namespace App\StatisticsQuery;

use App\Game\CustomField\CustomFieldRepository;
use App\Game\GameRepository;
use App\Player\PlayerRepository;
use App\StatisticsQuery\Action\CreateStatisticsQueryHandler;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class StatisticsQueryController extends BaseController
{
    #[Route('api/statisticsQueries', methods: 'GET')]
    public function list(Request $request, StatisticsQueryRepository $repository, GameRepository $gameRepository, PlayerRepository $playerRepository): Response
    {
        $gameId = $request->query->get('gameId');
        $playerId = $request->query->get('playerId');

        if ($gameId === null || $playerId === null) {
            return new JsonResponse([
                'errors' => ['gameId and playerId are required'],
            ], Response::HTTP_BAD_REQUEST);
        }

        $game = $gameRepository->find($gameId);
        $player = $playerRepository->find($playerId);

        if ($game === null || $player === null) {
            return new JsonResponse([
                'errors' => ['Game or player not found'],
            ], Response::HTTP_NOT_FOUND);
        }

        $queries = $repository->findByGameAndPlayer($game, $player);

        return new JsonResponse(
            array_map(fn (StatisticsQuery $q) => $q->view(), $queries),
            Response::HTTP_OK
        );
    }

    #[Route('api/statisticsQueries', methods: 'POST')]
    public function create(Request $request, CreateStatisticsQueryHandler $handler): Response
    {
        $payload = JsonPayload::fromRequest($request);

        try {
            $query = $handler->handle(
                $payload->getString('gameId'),
                $payload->getString('playerId'),
                $payload->getNonEmptyString('name'),
                $payload->getOptionalUuid('customFieldId'),
                $payload->getOptionalUuid('groupByFieldId'),
                $payload->getOptionalBool('groupByPlayer'),
                $payload->getOptionalString('aggregation'),
                $payload->getOptionalString('metric'),
            );
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

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
                'errors' => ['Player not found'],
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
                    'errors' => ['gameId is required for winrate queries'],
                ], Response::HTTP_BAD_REQUEST);
            }

            $stats = $statisticsQueryExecutor->getWinRateStats($player, $game, $groupByField, $groupByPlayer);

            return new JsonResponse($stats, Response::HTTP_OK);
        }

        if ($customFieldId === null) {
            return new JsonResponse([
                'errors' => ['customFieldId is required'],
            ], Response::HTTP_BAD_REQUEST);
        }

        $customField = $customFieldRepository->find($customFieldId);
        if ($customField === null) {
            return new JsonResponse([
                'errors' => ['Custom field not found'],
            ], Response::HTTP_NOT_FOUND);
        }

        $stats = $statisticsQueryExecutor->getCustomFieldStats($customField, $player, $groupByField, $groupByPlayer, $aggregation);

        return new JsonResponse($stats, Response::HTTP_OK);
    }

    #[Route('api/statisticsQueries/{statisticsQuery}', methods: 'PUT')]
    public function update(StatisticsQuery $statisticsQuery, Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(StatisticsQueryVoter::STATISTICS_QUERY_EDIT, $statisticsQuery);

        $payload = JsonPayload::fromRequest($request);

        $statisticsQuery->update(
            $payload->getNonEmptyString('name'),
            $payload->getOptionalUuid('customFieldId'),
            $payload->getOptionalUuid('groupByFieldId'),
            $payload->getOptionalBool('groupByPlayer'),
            $payload->getOptionalString('aggregation'),
            $payload->getOptionalString('metric'),
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
