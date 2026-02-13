<?php

namespace App\Game;

use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldKind;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\CustomFieldVoter;
use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends AbstractController
{
    #[Route('api/players/{player}/games', methods: 'GET')]
    public function getPlayerGames(Player $player, GameRepository $gameRepository): Response
    {
        return new JsonResponse($gameRepository->getStats($player), Response::HTTP_OK);
    }

    #[Route('api/players/{player}/games', methods: 'POST')]
    public function addToCollection(Player $player, Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository, GameOwnedRepository $gameOwnedRepository): Response
    {
        $this->denyAccessUnlessGranted(GameOwnedVoter::GAME_OWNED_ADD, $player);

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

        $conn = $entityManager->getConnection();
        $playCount = (int) $conn->executeQuery(
            'SELECT COUNT(DISTINCT e.id) FROM entry e JOIN player_result pr ON pr.entry_id = e.id WHERE e.game_id = :gameId AND pr.player_id = :playerId',
            [
                'gameId' => $game->getId(),
                'playerId' => $player->getId(),
            ]
        )->fetchOne();

        return new JsonResponse([
            'game_id' => $game->getId(),
            'game_name' => $game->view()['name'],
            'game_owned_id' => $gameOwned->getId(),
            'price' => $gameOwned->view()['price'],
            'play_count' => $playCount,
        ], Response::HTTP_CREATED);
    }

    #[Route('api/players/{player}/games/{gameOwned}', methods: 'PATCH')]
    public function updatePlayerGame(Player $player, GameOwned $gameOwned, Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository): Response
    {
        $this->denyAccessUnlessGranted(GameOwnedVoter::GAME_OWNED_EDIT, $gameOwned);

        $content = $request->getContent();
        $body = json_decode($content, true);

        $errors = [];

        if (isset($body['name'])) {
            $name = trim((string) $body['name']);
            if ($name === '') {
                $errors[] = 'Name can\'t be empty';
            } else {
                $existing = $gameRepository->findOneBy([
                    'name' => $name,
                ]);
                if ($existing !== null && (string) $existing->getId() !== (string) $gameOwned->getGame()->getId()) {
                    $errors[] = 'Already a game with the same name';
                } else {
                    $gameOwned->getGame()->setName($name);
                }
            }
        }

        if (array_key_exists('price', $body)) {
            $price = $body['price'];
            if ($price !== null) {
                if (! is_numeric($price)) {
                    $errors[] = 'Price must be a correct int or must not be provided';
                } else {
                    $gameOwned->setPrice((int) $price);
                }
            } else {
                $gameOwned->setPrice(null);
            }
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        $entityManager->flush();

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
            'game_name' => $gameOwned->getGame()->view()['name'],
            'game_owned_id' => $gameOwned->getId(),
            'price' => $gameOwned->view()['price'],
            'play_count' => $playCount,
        ], Response::HTTP_OK);
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
    public function addCustomField(Request $request, Game $game, EntityManagerInterface $entityManager, CustomFieldRepository $customFieldRepository): Response
    {
        /** @var Player $player */
        $player = $this->getUser();

        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'];
        $kind = $body['kind'];
        $global = $body['global'];
        $multiple = $body['multiple'] ?? false;

        $alreadyExist = $customFieldRepository->findOneBy([
            'game' => $game,
            'name' => $name,
            'player' => $player,
        ]);

        if ($alreadyExist !== null) {
            throw new \Exception('custom field with this name already exist on this game');
        }

        $customField = new CustomField($game, $name, $kind, $global, $multiple, $player);

        $entityManager->persist($customField);
        $entityManager->flush();

        return new JsonResponse($customField->view(), Response::HTTP_CREATED);
    }

    #[Route('api/customFields/{customField}', methods: 'PATCH')]
    public function updateCustomField(CustomField $customField, Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(CustomFieldVoter::CUSTOM_FIELD_EDIT, $customField);

        $content = $request->getContent();
        $body = json_decode($content, true);

        if (isset($body['kind'])) {
            $newKind = CustomFieldKind::tryFrom($body['kind']);
            if (! $newKind instanceof CustomFieldKind) {
                throw new BadRequestException("Invalid custom field kind: {$body['kind']}");
            }

            $allowed = [
                CustomFieldKind::STRING->value => [CustomFieldKind::ENUM],
                CustomFieldKind::ENUM->value => [CustomFieldKind::STRING],
            ];

            $currentKind = $customField->getKind();
            if (! isset($allowed[$currentKind->value]) || ! in_array($newKind, $allowed[$currentKind->value], true)) {
                throw new BadRequestException("Cannot convert from {$currentKind->value} to {$newKind->value}");
            }

            $customField->setKind($newKind);

            if ($newKind === CustomFieldKind::ENUM) {
                $existingValues = $entityManager->getConnection()->executeQuery(
                    'SELECT DISTINCT value_string FROM custom_fields_values WHERE custom_field_id = :id AND value_string IS NOT NULL',
                    [
                        'id' => (string) $customField->getId(),
                    ]
                )->fetchFirstColumn();

                $customField->syncEnumValues($existingValues, $entityManager);
            }

            if ($newKind === CustomFieldKind::STRING) {
                $customField->syncEnumValues([], $entityManager);
            }
        }

        if (isset($body['enumValues'])) {
            $customField->syncEnumValues($body['enumValues'], $entityManager);
        }

        if (isset($body['shareable'])) {
            $this->denyAccessUnlessGranted(CustomFieldVoter::CUSTOM_FIELD_TOGGLE_SHAREABLE, $customField);
            $customField->setShareable((bool) $body['shareable']);
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
        /** @var Player $player */
        $player = $this->getUser();

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
        /** @var Player $player */
        $player = $this->getUser();

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
