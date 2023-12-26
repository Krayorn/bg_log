<?php

namespace App\Entry;

use App\Entry\PlayerResult\PlayerResult;
use App\Game\Game;
use App\Game\GameOwnedRepository;
use App\Game\GameRepository;
use App\Player\Player;
use App\Player\PlayerRepository;
use DateTimeImmutable;
use DateTimeInterface;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class EntryController extends AbstractController
{
    #[Route('api/entries', name: 'list_entries', methods: 'GET')]
    public function list(
        Request $request,
        EntryRepository $entryRepository,
    ): Response
    {
        $gameId = $request->query->getAlnum('gameId');

        $entries = $entryRepository->query($gameId === '' ? null : $gameId);

        return new JsonResponse(array_map(fn($entry) => $entry->view(), $entries), Response::HTTP_OK);
    }

    #[Route('api/entries', name: 'create_entry', methods: 'POST')]
    public function create(Request                $request,
                           EntityManagerInterface $entityManager,
                           GameRepository         $gameRepository,
                           GameOwnedRepository         $gameOwnedRepository,
                           PlayerRepository       $playerRepository
    ): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $gameId = $body['game'];
        $gameUsedId = $body['gameUsed'] ?? null;
        $note = $body['note'];
        $playedAt = $body['playedAt'];
        $playersData = $body['players'] ?? [];

        /** @var ?Game $game */
        $game = $gameRepository->find($gameId);
        $gameUsed = $gameUsedId ? $gameOwnedRepository->find($gameUsedId) : null;

        if ($game === null) {
            return new JsonResponse(['errors' => ['No game exists with this name']], Response::HTTP_BAD_REQUEST);
        }

        $players = [];

        foreach ($playersData as $key => $playerData) {
            $playerId = $playerData['id'];
            $playerNote = $playerData['note'] ?? '';
            $playerWon = $playerData['won'] ?? null;

            $player = $playerRepository->find($playerId);
            $players[] = ['player' => $player, 'note' => $playerNote, 'won' => $playerWon];
        }

        $entry = new Entry(
            $game,
            $note,
            DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, $playedAt),
            $players,
            $gameUsed
        );

        $entityManager->persist($entry);
        $entityManager->flush();

        return new JsonResponse($entry->view(), Response::HTTP_CREATED);
    }
}