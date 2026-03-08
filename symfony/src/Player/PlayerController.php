<?php

namespace App\Player;

use App\Player\Action\CreateGuestPlayerHandler;
use App\Player\Action\RegisterPlayerHandler;
use App\Player\Action\SetNicknameHandler;
use App\Player\Action\SynchronizeGuestPlayerHandler;
use App\Player\Exception\DuplicateGuestPlayerException;
use App\Player\Exception\DuplicatePlayerNameException;
use App\Player\Exception\InvalidEmailException;
use App\Player\Exception\PlayerNotFoundException;
use App\Player\Exception\PlayerNotGuestException;
use App\Player\Exception\PlayerNotRegisteredException;
use App\Player\Exception\SynchronizationFailedException;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class PlayerController extends BaseController
{
    #[Route('api/register', methods: 'POST')]
    public function register(Request $request, RegisterPlayerHandler $handler): Response
    {
        $payload = JsonPayload::fromRequest($request);

        try {
            $player = $handler->handle(
                $payload->getNonEmptyString('username'),
                $payload->getNonEmptyString('password'),
                $payload->getOptionalString('email'),
            );
        } catch (DuplicatePlayerNameException | InvalidEmailException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($player->view(), Response::HTTP_CREATED);
    }

    #[Route('api/players', methods: 'GET')]
    public function players(Request $request, PlayerRepository $playerRepository): Response
    {
        $query = $request->query->get('q');
        $players = $playerRepository->searchAll($this->getPlayer(), $query);

        return new JsonResponse(array_map(fn (PlayerSearchResult $p): array => $p->view(), $players), Response::HTTP_OK);
    }

    #[Route('api/players', methods: 'POST')]
    public function createPlayer(Request $request, CreateGuestPlayerHandler $handler): Response
    {
        $payload = JsonPayload::fromRequest($request);

        try {
            $player = $handler->handle($payload->getNonEmptyString('name'), $this->getPlayer());
        } catch (DuplicateGuestPlayerException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($player->view(), Response::HTTP_OK);
    }

    #[Route('api/players/{player}', methods: 'GET')]
    public function player(Player $player): Response
    {
        $currentPlayer = $this->getPlayer();
        $isOwner = $currentPlayer->getId()->equals($player->getId());

        return new JsonResponse(
            $player->view($isOwner),
            Response::HTTP_OK
        );
    }

    #[Route('api/players/{player}', methods: 'PATCH')]
    public function updatePlayer(
        Player $player,
        Request $request,
        EntityManagerInterface $entityManager
    ): Response {
        $this->denyAccessUnlessGranted(PlayerRightVoter::PLAYER_EDIT, $player);

        $payload = JsonPayload::fromRequest($request);
        $email = $payload->getOptionalString('email');

        if ($email !== null) {
            try {
                $player->setEmail($email);
            } catch (InvalidEmailException $e) {
                return new JsonResponse([
                    'errors' => [$e->getMessage()],
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        $entityManager->flush();

        return new JsonResponse($player->view(true), Response::HTTP_OK);
    }

    #[Route('api/players/{player}/stats', methods: 'GET')]
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

    #[Route('api/players/{player}/usage', methods: 'GET')]
    public function playerUsage(Player $player, PlayerRepository $playerRepository): Response
    {
        $usage = $playerRepository->getUsageStats($player);
        $recentActivity = $playerRepository->getRecentActivity($player);

        return new JsonResponse([
            'customFieldsCreated' => (int) $usage['custom_fields_created'],
            'campaignsCreated' => (int) $usage['campaigns_created'],
            'savedQueries' => (int) $usage['saved_queries'],
            'guestPlayersCreated' => (int) $usage['guest_players_created'],
            'entriesInCampaigns' => (int) $usage['entries_in_campaigns'],
            'entriesThisMonth' => (int) $usage['entries_this_month'],
            'recentActivity' => $recentActivity,
        ], Response::HTTP_OK);
    }

    #[Route('api/players/{player}/circle', methods: 'GET')]
    public function circle(Player $player, Request $request, PlayerRepository $playerRepository): Response
    {
        $includeSelf = $request->query->getBoolean('includeSelf', false);
        $circle = $playerRepository->getCircle($player, $includeSelf);

        return new JsonResponse(array_map(fn (CirclePlayer $p): array => $p->view(), $circle), Response::HTTP_OK);
    }

    #[Route('api/players/{guestPlayer}/synchronize', methods: 'POST')]
    public function synchronize(
        Player $guestPlayer,
        Request $request,
        SynchronizeGuestPlayerHandler $handler
    ): Response {
        $this->denyAccessUnlessGranted(PlayerRightVoter::GUEST_MANAGE, $guestPlayer);

        $payload = JsonPayload::fromRequest($request);

        try {
            $handler->handle($guestPlayer, $payload->getNonEmptyString('registeredPlayerId'));
        } catch (PlayerNotGuestException | PlayerNotFoundException | PlayerNotRegisteredException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        } catch (SynchronizationFailedException) {
            return new JsonResponse([
                'errors' => ['Synchronization failed'],
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('api/players/{targetPlayer}/nickname', methods: 'PUT')]
    public function setNickname(
        Player $targetPlayer,
        Request $request,
        SetNicknameHandler $handler
    ): Response {
        $payload = JsonPayload::fromRequest($request);
        $nickname = $handler->handle(
            $this->getPlayer(),
            $targetPlayer,
            $payload->getNonEmptyString('nickname'),
        );

        return new JsonResponse([
            'nickname' => $nickname->getNickname(),
        ], Response::HTTP_OK);
    }

    #[Route('api/players/{targetPlayer}/nickname', methods: 'DELETE')]
    public function removeNickname(
        Player $targetPlayer,
        PlayerNicknameRepository $nicknameRepository,
        EntityManagerInterface $entityManager
    ): Response {
        $nickname = $nicknameRepository->findByOwnerAndTarget($this->getPlayer(), $targetPlayer);

        if ($nickname instanceof \App\Player\PlayerNickname) {
            $entityManager->remove($nickname);
            $entityManager->flush();
        }

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
