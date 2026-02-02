<?php

namespace App\Game;

use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
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
    #[Route('api/players/{player}/games', methods: 'GET')]
    public function getPlayerGames(Player $player, GameOwnedRepository $gameOwnedRepository): Response
    {
        $games = $gameOwnedRepository->findBy(['player' => $player]);

        return new JsonResponse(array_map(fn ($gameOwned): array => $gameOwned->view(), $games), Response::HTTP_OK);
    }

    #[Route('api/players/{player}/games', methods: 'POST')]
    public function addToCollection(Player $player, Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository, GameOwnedRepository $gameOwnedRepository): Response
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

        $gameOwned = $gameOwnedRepository->findOneBy([
            'player' => $player,
            'game' => $game,
        ]);
        if ($gameOwned !== null) {
            $errors[] = 'Game is already in your library';
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
    public function getGames(Request $request, GameRepository $gameRepository, PlayerRepository $playerRepository): Response
    {
        $query = $request->query->get('query');

        $games = $gameRepository->search($query);

        return new JsonResponse(array_map(fn ($game): array => $game->view(), $games), Response::HTTP_OK);
    }

    #[Route('api/games/{game}', methods: 'GET')]
    public function getGame(Game $game): Response
    {
        return new JsonResponse($game->view(), Response::HTTP_OK);
    }

    #[Route('api/games/{game}/stats', methods: 'GET')]
    public function getGameStats(Request $request, Game $game, GameRepository $gameRepository): Response
    {
        $playerId = $request->query->get('player');
        $stats = $gameRepository->getGameStats($game->getId(), $playerId);

        return new JsonResponse([
            'owned' => $stats['in_library'],
            'winrate' => $stats['winrate'],
            'entriesCount' => $stats['number_of_games'],
        ], Response::HTTP_OK);
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

    #[Route('api/game/{game}/customFields', methods: 'POST')]
    public function addCustomField(Request $request, Game $game, EntityManagerInterface $entityManager, CustomFieldRepository $customFieldRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'];
        $kind = $body['kind'];
        $global = $body['global'];

        $alreadyExist = $customFieldRepository->findOneBy([
            'game' => $game,
            'name' => $name,
        ]);

        if ($alreadyExist !== null) {
            throw new \Exception('custom field with this name already exist on this game');
        }

        $customField = new CustomField($game, $name, $kind, $global);

        $entityManager->persist($customField);
        $entityManager->flush();

        return new JsonResponse($game->view(), Response::HTTP_OK);
    }

    #[Route('api/customFields/{customField}', methods: 'DELETE')]
    public function deleteCustomField(CustomField $customField, EntityManagerInterface $entityManager): Response
    {
        $entityManager->remove($customField);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
