<?php

namespace App\Entry;

use App\Entry\Action\CreateEntryHandler;
use App\Entry\Action\UpdateEntryHandler;
use App\Entry\Exception\CannotRemoveLastPlayerException;
use App\Entry\PlayerResult\PlayerEvent;
use App\Game\Exception\GameNotFoundException;
use App\Game\GameRepository;
use App\Player\Exception\PlayerNotFoundException;
use App\Player\PlayerRepository;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Ramsey\Uuid\Uuid;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class EntryController extends BaseController
{
    #[Route('api/entries', name: 'list_entries', methods: 'GET')]
    public function list(
        EntryRepository $entryRepository,
        Request $request,
        GameRepository $gameRepository,
        PlayerRepository $playerRepository,
    ): Response {
        $gameId = $request->query->get('game');
        if ($gameId === null || ! Uuid::isValid($gameId)) {
            throw new BadRequestException('game id not valid');
        }

        $game = $gameRepository->find($gameId);

        if ($game === null) {
            throw new BadRequestException('Missing game');
        }

        $playerId = $request->query->get('player');
        if ($playerId === null || ! Uuid::isValid($playerId)) {
            throw new BadRequestException('player id not valid');
        }

        $player = $playerRepository->find($playerId);

        if ($player === null) {
            throw new BadRequestException('Missing player');
        }

        $entries = $entryRepository->list($game, $player);

        return new JsonResponse(array_map(fn ($entry) => $entry->view(), $entries), Response::HTTP_OK);
    }

    #[Route('api/entries', name: 'create_entry', methods: 'POST')]
    public function create(
        Request $request,
        CreateEntryHandler $handler,
    ): Response {
        $payload = JsonPayload::fromRequest($request);

        try {
            $entry = $handler->handle(
                $payload->getString('game'),
                $payload->getOptionalString('gameUsed'),
                $payload->getString('note'),
                $payload->getString('playedAt'),
                $payload->getOptionalArray('players') ?? [],
                $payload->getOptionalArray('customFields') ?? [],
                $payload->getOptionalString('campaign'),
            );
        } catch (GameNotFoundException | PlayerNotFoundException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($entry->view(), Response::HTTP_CREATED);
    }

    #[Route('api/entries/{entry}', name: 'edit_entry', methods: 'PATCH')]
    public function edit(
        Entry $entry,
        Request                $request,
        UpdateEntryHandler $updateEntry,
    ): Response {
        $this->denyAccessUnlessGranted(EntryVoter::ENTRY_EDIT, $entry);

        $payload = JsonPayload::fromRequest($request);

        $customFields = $payload->getOptionalArray('customFields') ?? [];
        $note = $payload->getOptionalString('note');
        $players = $payload->getOptionalArray('players') ?? [];
        $gameUsed = $payload->getOptionalString('gameUsed');
        $playedAt = $payload->getOptionalString('playedDate');
        $campaign = $payload->getOptionalString('campaign');

        $customFieldsEvents = array_map(fn ($customField) => new CustomFieldEvent($customField), $customFields);
        $playersEvents = array_map(fn ($player) => new PlayerEvent($player), $players);

        try {
            $entry = $updateEntry->handle($entry, $note, $gameUsed, $playedAt, $customFieldsEvents, $playersEvents, $campaign);
        } catch (CannotRemoveLastPlayerException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($entry->view(), Response::HTTP_CREATED);
    }

    #[Route('api/entries/{entry}', name: 'delete_entry', methods: 'DELETE')]
    public function delete(
        Entry $entry,
        EntityManagerInterface $entityManager,
    ): Response {
        $this->denyAccessUnlessGranted(EntryVoter::ENTRY_EDIT, $entry);

        $entityManager->remove($entry);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
