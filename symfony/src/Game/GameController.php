<?php

namespace App\Game;

use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
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