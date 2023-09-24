<?php

namespace App\Player;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

class PlayerController extends AbstractController
{

    #[Route('/players/{player}/register', name: 'register')]
    public function register(Player                      $player,
                             Request                     $request,
                             EntityManagerInterface $entityManager,
                             UserPasswordHasherInterface $passwordHasher): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $pwd = $body['password'];

        $hashedPassword = $passwordHasher->hashPassword(
            $player,
            $pwd
        );
        $player->setPassword($hashedPassword);

        $entityManager->persist($player);
        $entityManager->flush();

        return new Response(null);
    }
    #[Route('/api/login', name: 'api_login')]
    public function login(Request $request, #[CurrentUser] ?UserInterface $user): Response
    {
        $player = $user;

        if (null === $player) {
            return $this->json([
                    'message' => 'missing credentials',
                ], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'player' => $player->view(),
            'token' => "??",
        ]);
    }

    #[Route('/players/{player}', name: 'get_player', methods: 'GET')]
    public function player(Player $player): Response
    {
        return new JsonResponse(
            $player->view()
            , Response::HTTP_OK);
    }

    #[Route('/players/{player}/stats', name: 'stats_player', methods: 'GET')]
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
            ]
            , Response::HTTP_OK);
    }

    #[Route('/players/{player}/friends/stats', name: 'stats_friends_player', methods: 'GET')]
    public function friendsStats(Player $player, PlayerRepository $playerRepository): Response
    {
        $stats = $playerRepository->getFriendsStats($player);
        return new JsonResponse(
            $stats
            , Response::HTTP_OK);
    }
}