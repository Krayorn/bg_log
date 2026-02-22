<?php

namespace App\Game;

use App\Game\Action\AddGameToCollectionHandler;
use App\Game\Action\CreateGameHandler;
use App\Game\Action\UpdatePlayerGameHandler;
use App\Game\CustomField\Action\CreateCustomFieldHandler;
use App\Game\CustomField\Action\UpdateCustomFieldHandler;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\CustomFieldVoter;
use App\Game\CustomField\Exception\DuplicateCustomFieldException;
use App\Game\CustomField\Exception\InvalidKindConversionException;
use App\Game\Exception\DuplicateGameNameException;
use App\Game\Exception\GameAlreadyOwnedException;
use App\Game\Exception\GameNotFoundException;
use App\Player\Player;
use App\Player\PlayerRepository;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends BaseController
{
    #[Route('api/players/{player}/games', methods: 'GET')]
    public function getPlayerGames(Player $player, GameRepository $gameRepository): Response
    {
        return new JsonResponse($gameRepository->getStats($player), Response::HTTP_OK);
    }

    #[Route('api/players/{player}/games', methods: 'POST')]
    public function addToCollection(Player $player, Request $request, EntityManagerInterface $entityManager, AddGameToCollectionHandler $handler): Response
    {
        $this->denyAccessUnlessGranted(GameOwnedVoter::GAME_OWNED_ADD, $player);

        $payload = JsonPayload::fromRequest($request);

        try {
            $gameOwned = $handler->handle(
                $payload->getString('gameId'),
                $player,
                $payload->getOptionalInt('price'),
            );
        } catch (GameNotFoundException | GameAlreadyOwnedException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        $conn = $entityManager->getConnection();
        $playCount = (int) $conn->executeQuery(
            'SELECT COUNT(DISTINCT e.id) FROM entry e JOIN player_result pr ON pr.entry_id = e.id WHERE e.game_id = :gameId AND pr.player_id = :playerId',
            [
                'gameId' => $gameOwned->getGame()->getId(),
                'playerId' => $player->getId(),
            ]
        )->fetchOne();

        return new JsonResponse([
            'game_id' => $gameOwned->getGame()->getId(),
            'game_name' => $gameOwned->getGame()->getName(),
            'game_owned_id' => $gameOwned->getId(),
            'price' => $gameOwned->getPrice(),
            'play_count' => $playCount,
        ], Response::HTTP_CREATED);
    }

    #[Route('api/players/{player}/games/{gameOwned}', methods: 'PATCH')]
    public function updatePlayerGame(Player $player, GameOwned $gameOwned, Request $request, EntityManagerInterface $entityManager, UpdatePlayerGameHandler $handler): Response
    {
        $this->denyAccessUnlessGranted(GameOwnedVoter::GAME_OWNED_EDIT, $gameOwned);

        $payload = JsonPayload::fromRequest($request);

        try {
            $handler->handle(
                $gameOwned,
                $payload->getOptionalNonEmptyString('name'),
                $payload->has('price'),
                $payload->has('price') ? $payload->getOptionalInt('price') : null,
            );
        } catch (DuplicateGameNameException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        $conn = $entityManager->getConnection();
        $playCount = (int) $conn->executeQuery(
            'SELECT COUNT(DISTINCT e.id) FROM entry e JOIN player_result pr ON pr.entry_id = e.id WHERE e.game_id = :gameId AND pr.player_id = :playerId',
            [
                'gameId' => $gameOwned->getGame()->getId(),
                'playerId' => $player->getId(),
            ]
        )->fetchOne();

        return new JsonResponse([
            'game_id' => $gameOwned->getGame()->getId(),
            'game_name' => $gameOwned->getGame()->getName(),
            'game_owned_id' => $gameOwned->getId(),
            'price' => $gameOwned->getPrice(),
            'play_count' => $playCount,
        ], Response::HTTP_OK);
    }

    #[Route('api/games', methods: 'POST')]
    public function create(Request $request, CreateGameHandler $handler): Response
    {
        $payload = JsonPayload::fromRequest($request);

        try {
            $game = $handler->handle($payload->getNonEmptyString('name'));
        } catch (DuplicateGameNameException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

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
        if ($playerId === null) {
            throw new BadRequestException('player id is required');
        }
        $stats = $gameRepository->getGameStats((string) $game->getId(), $playerId);

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

    #[Route('api/game/{game}/customFields', methods: 'POST')]
    public function addCustomField(Request $request, Game $game, CreateCustomFieldHandler $handler): Response
    {
        $player = $this->getPlayer();

        $payload = JsonPayload::fromRequest($request);

        try {
            $customField = $handler->handle(
                $game,
                $payload->getString('name'),
                $payload->getString('kind'),
                $payload->getBool('global'),
                $payload->getOptionalBool('multiple'),
                $player,
            );
        } catch (DuplicateCustomFieldException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($customField->view(), Response::HTTP_CREATED);
    }

    #[Route('api/customFields/{customField}', methods: 'PATCH')]
    public function updateCustomField(CustomField $customField, Request $request, EntityManagerInterface $entityManager, UpdateCustomFieldHandler $handler): Response
    {
        $this->denyAccessUnlessGranted(CustomFieldVoter::CUSTOM_FIELD_EDIT, $customField);

        $payload = JsonPayload::fromRequest($request);

        try {
            $handler->handle(
                $customField,
                $payload->getOptionalString('kind'),
                $payload->getOptionalArray('enumValues'),
            );
        } catch (InvalidKindConversionException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        if ($payload->has('shareable')) {
            $this->denyAccessUnlessGranted(CustomFieldVoter::CUSTOM_FIELD_TOGGLE_SHAREABLE, $customField);
            $customField->setShareable($payload->getBool('shareable'));
        }

        $entityManager->flush();

        return new JsonResponse($customField->view(), Response::HTTP_OK);
    }

    #[Route('api/customFields/{customField}', methods: 'DELETE')]
    public function deleteCustomField(CustomField $customField, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(CustomFieldVoter::CUSTOM_FIELD_DELETE, $customField);

        $entityManager->createQuery('DELETE FROM App\Entry\CustomFieldValue cfv WHERE cfv.customField = :cf')
            ->setParameter('cf', $customField->getId(), 'uuid')
            ->execute();

        $entityManager->remove($customField);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('api/customFields/{customField}/copy', methods: 'POST')]
    public function copyCustomField(CustomField $customField, EntityManagerInterface $entityManager, CustomFieldRepository $customFieldRepository): Response
    {
        $player = $this->getPlayer();

        if (! $customField->isShareable()) {
            throw new BadRequestException('This custom field is not shareable');
        }

        $alreadyExist = $customFieldRepository->findOneBy([
            'game' => $customField->getGame(),
            'name' => $customField->getName(),
            'player' => $player,
        ]);

        if ($alreadyExist !== null) {
            throw new \Exception('You already have a custom field with this name for this game');
        }

        $copy = new CustomField(
            $customField->getGame(),
            $customField->getName(),
            $customField->getKind()->value,
            $customField->isGlobal(),
            $customField->isMultiple(),
            $player,
            false,
            $customField,
        );

        $entityManager->persist($copy);
        $entityManager->flush();

        // Sync enum values if the original has any
        // We need to read enum values from the original and set them on the copy
        $originalView = $customField->view();
        if ($originalView['enumValues'] !== []) {
            $enumValues = array_map(fn ($v) => $v['value'], $originalView['enumValues']);
            $copy->syncEnumValues($enumValues, $entityManager, true);
            $entityManager->flush();
        }

        return new JsonResponse($copy->view(), Response::HTTP_CREATED);
    }

    #[Route('api/game/{game}/customFields', methods: 'GET')]
    public function getCustomFields(Game $game, CustomFieldRepository $customFieldRepository): Response
    {
        $player = $this->getPlayer();

        $myFields = $customFieldRepository->findBy([
            'game' => $game,
            'player' => $player,
        ]);
        $shareableFields = $customFieldRepository->findShareableForGame($game, $player);

        return new JsonResponse([
            'myFields' => array_values(array_map(fn ($cf) => $cf->view(), $myFields)),
            'shareableFields' => array_values(array_map(fn ($cf) => $cf->view(), $shareableFields)),
        ], Response::HTTP_OK);
    }
}
