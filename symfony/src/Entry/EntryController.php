<?php

namespace App\Entry;

use App\Entry\PlayerResult\PlayerResult;
use App\Game\Game;
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
    #[Route('/entries', name: 'list_entries', methods: 'GET')]
    public function list(
        Request $request,
        EntryRepository $entryRepository,
    ): Response
    {
        $gameId = $request->query->getAlnum('gameId');

        $entries = $entryRepository->query($gameId === '' ? null : $gameId);

        return new JsonResponse(array_map(fn($entry) => $entry->view(), $entries), Response::HTTP_OK);
    }

    #[Route('/entries', name: 'create_entry', methods: 'POST')]
    public function create(Request                $request,
                           EntityManagerInterface $entityManager,
                           GameRepository         $gameRepository,
                           PlayerRepository       $playerRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $gameName = $body['game'];
        $note = $body['note'];
        $playedAt = $body['playedAt'];
        $playersData = $body['players'] ?? [];

        /** @var ?Game $game */
        $game = $gameRepository->findOneBy(['name' => $gameName]);

        if ($game === null) {
            return new JsonResponse(['errors' => ['No game exists with this name']], Response::HTTP_BAD_REQUEST);
        }

        $players = [];

        foreach ($playersData as $key => $playerData) {
            $playerName = $playerData['name'] ?? '';
            $playerNote = $playerData['note'] ?? '';
            $playerWon = $playerData['won'] ?? null;

            $player = $playerRepository->findOneBy(['name' => $playerName]);

            if ($player === null) {
                $player = new Player($playerName, $playerRepository->findNextNumber() + $key);
                $entityManager->persist($player);
            }

            $players[] = ['player' => $player, 'note' => $playerNote, 'won' => $playerWon];
        }

        $entry = new Entry(
            $game,
            $note,
            DateTimeImmutable::createFromFormat(DateTimeInterface::ATOM, $playedAt),
            $players,
        );

        $entityManager->persist($entry);
        $entityManager->flush();

        return new JsonResponse($entry->view(), Response::HTTP_CREATED);
    }


    #[Route('/entries/{entry}', name: 'patch_entry', methods: 'PATCH')]
    public function update(Request                $request,
                           Entry $entry,
                           EntityManagerInterface $entityManager,
                           PlayerRepository       $playerRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $note = $body['note'] ?? null;
        if ($note !== null) {
            $entry->updateNote($note);
        }

        $playersEvents = $body['playersEvents'] ?? [];
        foreach ($playersEvents as $playerEvent) {
            $playerName = $playerEvent['name'] ?? null;
            $playerNote = $playerEvent['note'] ?? null;
            $playerWon = $playerEvent['won'] ?? null;

            if ($playerEvent['event'] === 'add') {
                $player = $playerRepository->findOneBy(['name' => $playerName]);

                if ($player === null) {
                    $player = new Player($playerName, $playerRepository->findNextNumber());
                    $entityManager->persist($player);
                }

                $entry->addPlayerResult(new PlayerResult($entry, $player, $playerNote, $playerWon));
                continue;
            }

            if ($playerEvent['event'] === 'update') {
                $entry->updatePlayerResult($playerName, $playerNote, $playerWon);
            }
        }



        $entityManager->persist($entry);
        $entityManager->flush();

        return new JsonResponse($entry->view(), Response::HTTP_CREATED);
    }
}