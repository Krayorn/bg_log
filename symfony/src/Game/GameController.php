<?php

namespace App\Game;

use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends AbstractController
{
    #[Route('api/players/{player}/games', methods: 'POST')]
    public function addToCollection(Player $player, Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $gameId = $body['gameId'];
        $price = $body['price'] ?? null;

        $errors = [];

        $game = $gameRepository->find($gameId);
        if ($game === null) {
            $errors[] = 'No game found with this ID';
        }

        if ($price !== null) {
            if (! is_numeric($price)) {
                $errors[] = 'Price must be a correct int or must not be provided';
            }
            $price = (int) $price;
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }
        /** @var Game $game */
        $gameOwned = new GameOwned($player, $game, $price);

        $entityManager->persist($gameOwned);
        $entityManager->flush();

        return new JsonResponse($gameOwned->view(), Response::HTTP_CREATED);
    }

    #[Route('api/games', methods: 'POST')]
    public function create(Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'];

        $errors = [];

        if ($name === '') {
            $errors[] = 'Name can\'t be empty';
        }

        $gameWithSameName = $gameRepository->findOneBy([
            'name' => $name,
        ]);
        if ($gameWithSameName !== null) {
            $errors[] = 'Already a game with the same name';
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        $game = new Game($name);

        $entityManager->persist($game);
        $entityManager->flush();

        return new JsonResponse($game->view(), Response::HTTP_CREATED);
    }

    #[Route('api/games', methods: 'GET')]
    public function getGames(GameRepository $gameRepository, PlayerRepository $playerRepository): Response
    {
        $games = $gameRepository->findAll();

        return new JsonResponse(array_map(fn ($game): array => $game->view(), $games), Response::HTTP_OK);
    }

    #[Route('api/games/{game}', methods: 'GET')]
    public function getGame(Game $game): Response
    {
        return new JsonResponse($game->view(), Response::HTTP_OK);
    }

    #[Route('api/games/{game}/owners', methods: 'GET')]
    public function getGamesOwners(Game $game, GameOwnedRepository $gameOwnedRepository): Response
    {
        /** @var array<GameOwned> $games */
        $games = $gameOwnedRepository->findBy([
            'game' => $game,
        ]);

        return new JsonResponse(array_map(fn ($gameOwned): array => $gameOwned->view(), $games), Response::HTTP_CREATED);
    }

    #[Route('api/players/{player}/games/stats', methods: 'GET')]
    public function gamesStats(Player $player, GameRepository $gameRepository): Response
    {
        return new JsonResponse($gameRepository->getStats($player), Response::HTTP_OK);
    }
}
