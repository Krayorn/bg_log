<?php

namespace App\Player;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

class PlayerController extends AbstractController
{
    #[Route('api/register', name: 'register', methods: 'POST')]
    public function register(
        Request $request,
        PlayerRepository $playerRepository,
        EntityManagerInterface $entityManager,
        UserPasswordHasherInterface $passwordHasher
    ): Response {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['username'] ?? '';
        $password = $body['password'] ?? '';

        if ($name === '') {
            return new JsonResponse([
                'error' => 'Username cannot be empty',
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($password === '') {
            return new JsonResponse([
                'error' => 'Password cannot be empty',
            ], Response::HTTP_BAD_REQUEST);
        }

        $existingPlayer = $playerRepository->findOneBy([
            'name' => $name,
        ]);
        if ($existingPlayer !== null) {
            return new JsonResponse([
                'error' => 'Username already taken',
            ], Response::HTTP_BAD_REQUEST);
        }

        $player = new Player($name, $playerRepository->findNextNumber());

        $hashedPassword = $passwordHasher->hashPassword($player, $password);
        $player->register($hashedPassword);

        $entityManager->persist($player);
        $entityManager->flush();

        return new JsonResponse($player->view(), Response::HTTP_CREATED);
    }

    #[Route('api/players', name: 'get_players', methods: 'GET')]
    public function players(PlayerRepository $playerRepository): Response
    {
        $players = $playerRepository->findAll();

        return new JsonResponse(
            array_map(fn ($player): array => $player->view(), $players),
            Response::HTTP_OK
        );
    }

    #[Route('api/players', methods: 'POST')]
    public function createPlayer(Request $request, PlayerRepository $playerRepository, EntityManagerInterface $entityManager): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'] ?? '';
        if ($name === '') {
            return new JsonResponse([
                'errors' => ['Player Name cannot be empty'],
            ], Response::HTTP_BAD_REQUEST);
        }

        $errors = [];

        $playerWithSameName = $playerRepository->findOneBy([
            'name' => $name,
        ]);
        if ($playerWithSameName !== null) {
            $errors[] = 'Already a player with the same name';
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        $player = new Player($name, $playerRepository->findNextNumber());

        $entityManager->persist($player);
        $entityManager->flush();

        return new JsonResponse($player->view(), Response::HTTP_OK);
    }

    #[Route('api/players/{player}', name: 'get_player', methods: 'GET')]
    public function player(Player $player): Response
    {
        return new JsonResponse(
            $player->view(),
            Response::HTTP_OK
        );
    }

    #[Route('api/players/{player}/stats', name: 'stats_player', methods: 'GET')]
    public function playerStats(Player $player, PlayerRepository $playerRepository): Response
    {
        $stats = $playerRepository->getGeneralStats($player);
        return new JsonResponse(
            [
                'gamesOwned' => $stats['games_owned'],
                'entriesPlayed' => $stats['entries_played'],
                'gamePartners' => $stats['game_partners'],
                'globalWinrate' => $stats['global_winrate'],
                'lastGameDate' => $stats['last_game_date'],
            ],
            Response::HTTP_OK
        );
    }

    #[Route('api/players/{player}/friends/stats', name: 'stats_friends_player', methods: 'GET')]
    public function friendsStats(Player $player, PlayerRepository $playerRepository): Response
    {
        $stats = $playerRepository->getFriendsStats($player);
        return new JsonResponse(
            $stats,
            Response::HTTP_OK
        );
    }
}
