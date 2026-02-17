<?php

namespace App\Player;

use App\Player\Action\CreateGuestPlayerHandler;
use App\Player\Exception\DuplicateGuestPlayerException;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Annotation\Route;

class PlayerController extends BaseController
{
    #[Route('api/register', methods: 'POST')]
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
        $email = $body['email'] ?? null;

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

        if ($email !== null && $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            return new JsonResponse([
                'error' => 'Invalid email format',
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

        $player = new Player($name, $playerRepository->findNextNumber(), $email);

        $hashedPassword = $passwordHasher->hashPassword($player, $password);
        $player->register($hashedPassword);

        $entityManager->persist($player);
        $entityManager->flush();

        return new JsonResponse($player->view(), Response::HTTP_CREATED);
    }

    #[Route('api/players', methods: 'GET')]
    public function players(Request $request, PlayerRepository $playerRepository): Response
    {
        $forPlayerId = $request->query->get('forPlayer');
        $forPlayer = null;

        if ($forPlayerId !== null) {
            $forPlayer = $playerRepository->find($forPlayerId);
            if ($forPlayer === null) {
                return new JsonResponse([
                    'error' => 'Player not found',
                ], Response::HTTP_BAD_REQUEST);
            }
        }

        $players = $playerRepository->findVisibleFor($forPlayer);

        return new JsonResponse(
            array_map(fn ($player): array => $player->view(), $players),
            Response::HTTP_OK
        );
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

        $content = $request->getContent();
        $body = json_decode($content, true);
        $email = $body['email'] ?? null;

        if ($email !== null) {
            if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                return new JsonResponse([
                    'error' => 'Invalid email format',
                ], Response::HTTP_BAD_REQUEST);
            }
            $player->setEmail($email);
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

    #[Route('api/players/{player}/circle', methods: 'GET')]
    public function circle(Player $player, PlayerRepository $playerRepository): Response
    {
        $rows = $playerRepository->getCircle($player);

        $circle = array_map(fn (array $row): array => [
            'id' => $row['id'],
            'name' => $row['name'],
            'number' => $row['number'],
            'registeredOn' => $row['registered_on'],
            'isGuest' => $row['registered_on'] === null,
            'inPartyOf' => $row['in_party_of_id'] !== null ? [
                'id' => $row['in_party_of_id'],
            ] : null,
            'gamesPlayed' => (int) $row['games_played'],
            'wins' => (int) $row['wins'],
            'losses' => (int) $row['losses'],
        ], $rows);

        return new JsonResponse($circle, Response::HTTP_OK);
    }

    #[Route('api/players/{guestPlayer}/synchronize', methods: 'POST')]
    public function synchronize(
        Player $guestPlayer,
        Request $request,
        EntityManagerInterface $entityManager,
        PlayerRepository $playerRepository,
        LoggerInterface $logger
    ): Response {
        $this->denyAccessUnlessGranted(PlayerRightVoter::GUEST_MANAGE, $guestPlayer);

        if ($guestPlayer->getRegisteredOn() instanceof \DateTimeImmutable) {
            return new JsonResponse([
                'error' => 'This player is not a guest',
            ], Response::HTTP_BAD_REQUEST);
        }

        $content = $request->getContent();
        $body = json_decode($content, true);
        $registeredPlayerId = $body['registeredPlayerId'] ?? null;

        if ($registeredPlayerId === null) {
            return new JsonResponse([
                'error' => 'registeredPlayerId is required',
            ], Response::HTTP_BAD_REQUEST);
        }

        $registeredPlayer = $playerRepository->find($registeredPlayerId);
        if ($registeredPlayer === null) {
            return new JsonResponse([
                'error' => 'Registered player not found',
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($registeredPlayer->getRegisteredOn() === null) {
            return new JsonResponse([
                'error' => 'Target player is not registered',
            ], Response::HTTP_BAD_REQUEST);
        }

        $conn = $entityManager->getConnection();
        $conn->beginTransaction();

        try {
            $movedCount = $conn->executeStatement(
                'UPDATE player_result SET player_id = :registeredId WHERE player_id = :guestId',
                [
                    'registeredId' => $registeredPlayer->getId(),
                    'guestId' => $guestPlayer->getId(),
                ]
            );

            $entityManager->remove($guestPlayer);
            $entityManager->flush();
            $conn->commit();
        } catch (\Exception $e) {
            $conn->rollBack();
            $logger->error('Synchronization failed', [
                'guestPlayerId' => $guestPlayer->getId(),
                'registeredPlayerId' => $registeredPlayerId,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return new JsonResponse([
                'error' => 'Synchronization failed',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        return new JsonResponse([
            'movedResults' => $movedCount,
            'registeredPlayer' => $registeredPlayer->view(),
        ], Response::HTTP_OK);
    }
}
