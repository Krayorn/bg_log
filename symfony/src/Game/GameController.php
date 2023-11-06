<?php

namespace App\Game;

use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\Uuid;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends AbstractController
{
    #[Route('api/players/{player}/games', name: 'create_game', methods: 'POST')]
    public function create(Player $player, Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'];
        $price = $body['price'] ?? null;

        $errors = [];

        if ($name === '') {
            $errors[] = 'Name can\'t be empty';
        }

        $gameWithSameName = $gameRepository->findOneBy(['name' => $name]);
        if($gameWithSameName !== null) {
            $errors[] = 'Already a game with the same name';
        }

        if ($price !== null) {
            if (!is_numeric($price)) {
                $errors[] = 'Price must be a correct int or must not be provided';
            }
            $price = intval($price);
        }

        if (count($errors) > 0) {
            return new JsonResponse(['errors' => $errors], Response::HTTP_BAD_REQUEST);
        }

        $game = new Game($player, $name, $price);

        $entityManager->persist($game);
        $entityManager->flush();

        return new JsonResponse($game->view(), Response::HTTP_CREATED);
    }


    #[Route('api/games', name: 'create_game', methods: 'GET')]
    public function getGames(Request $request, GameRepository $gameRepository, PlayerRepository $playerRepository): Response
    {
        $filters = [];

        $playerId = $request->query->getAlnum('playerId');
        if ($playerId !== '') {
            $player = $playerRepository->find(Uuid::fromString($playerId));
            $this->denyAccessUnlessGranted([], $player);

            $filters['player'] = $player;
        }


        $games = $gameRepository->findBy($filters);

        return new JsonResponse(array_map(fn($game): array => $game->view(), $games), Response::HTTP_CREATED);
    }

    #[Route('api/players/{player}/games/stats', name: 'stats_games', methods: 'GET')]
    public function gamesStats(Player $player, GameRepository $gameRepository): Response
    {
        return new JsonResponse($gameRepository->getStats($player), Response::HTTP_OK);
    }

    #[Route('api/games/{game}', name: 'game', methods: 'GET')]
    public function game(Game $game, GameRepository $gameRepository): Response
    {
        return new JsonResponse($game->view(), Response::HTTP_OK);
    }

    #[Route('api/games/{game}/stats', name: 'stats_game', methods: 'GET')]
    public function gameStats(Game $game, GameRepository $gameRepository): Response
    {
        $count = $gameRepository->getGamePlayed($game);

        return new JsonResponse([
            'playerParticipation' => $gameRepository->getPlayerParticipation($game),
            'game' => [
                'count' => $count,
                'pricePerGame' => $game->getPricePerGame($count),
            ],
        ], Response::HTTP_OK);
    }
}