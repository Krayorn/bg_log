<?php

namespace App\Game\CampaignKey;

use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class CampaignKeyController extends AbstractController
{
    #[Route('api/game/{game}/campaignKeys', methods: 'POST')]
    public function create(Request $request, Game $game, EntityManagerInterface $entityManager): Response
    {
        /** @var Player $player */
        $player = $this->getUser();

        $body = json_decode($request->getContent(), true);

        $name = $body['name'] ?? '';
        $type = $body['type'] ?? '';
        $global = $body['global'] ?? true;

        $errors = [];

        if (trim((string) $name) === '') {
            $errors[] = 'Name is required';
        }

        $typeEnum = CampaignKeyType::tryFrom($type);
        if (! $typeEnum instanceof CampaignKeyType) {
            $errors[] = 'Invalid type';
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        $scopedToCustomFieldId = $body['scopedToCustomField'] ?? null;
        $scopedToCustomField = null;
        if ($scopedToCustomFieldId !== null) {
            $scopedToCustomField = $game->getCustomField($scopedToCustomFieldId);
            if (! $scopedToCustomField->isGlobal()) {
                $global = false;
            }
        }

        $campaignKey = new CampaignKey($game, trim((string) $name), $type, (bool) $global, $scopedToCustomField, $player);

        $entityManager->persist($campaignKey);
        $entityManager->flush();

        return new JsonResponse($campaignKey->view(), Response::HTTP_CREATED);
    }

    #[Route('api/campaignKeys/{campaignKey}', methods: 'DELETE')]
    public function delete(CampaignKey $campaignKey, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(CampaignKeyVoter::CAMPAIGN_KEY_DELETE, $campaignKey);

        $entityManager->remove($campaignKey);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('api/campaignKeys/{campaignKey}', methods: 'PATCH')]
    public function toggleShareable(CampaignKey $campaignKey, Request $request, EntityManagerInterface $entityManager): Response
    {
        $body = json_decode($request->getContent(), true);

        if (isset($body['shareable'])) {
            $this->denyAccessUnlessGranted(CampaignKeyVoter::CAMPAIGN_KEY_TOGGLE_SHAREABLE, $campaignKey);
            $campaignKey->setShareable((bool) $body['shareable']);
        }

        $entityManager->flush();

        return new JsonResponse($campaignKey->view(), Response::HTTP_OK);
    }

    #[Route('api/campaignKeys/{campaignKey}/copy', methods: 'POST')]
    public function copy(CampaignKey $campaignKey, EntityManagerInterface $entityManager, CampaignKeyRepository $campaignKeyRepository, CustomFieldRepository $customFieldRepository): Response
    {
        /** @var Player $player */
        $player = $this->getUser();

        if (! $campaignKey->isShareable()) {
            throw new BadRequestException('This campaign key is not shareable');
        }

        $alreadyExist = $campaignKeyRepository->findOneBy([
            'game' => $campaignKey->getGame(),
            'name' => $campaignKey->getName(),
            'player' => $player,
        ]);

        if ($alreadyExist !== null) {
            throw new \Exception('You already have a campaign key with this name for this game');
        }

        $scopedToCustomField = $campaignKey->getScopedToCustomField();
        $copiedCustomField = null;

        if ($scopedToCustomField instanceof CustomField) {
            // Check if the player already has a copy of this custom field
            $existingCopy = $customFieldRepository->findOneBy([
                'game' => $campaignKey->getGame(),
                'originCustomField' => $scopedToCustomField,
                'player' => $player,
            ]);

            if ($existingCopy !== null) {
                $copiedCustomField = $existingCopy;
            } else {
                // Also check if the player owns the original custom field
                if ($scopedToCustomField->getPlayer() instanceof Player
                    && $scopedToCustomField->getPlayer()->getId()->equals($player->getId())) {
                    $copiedCustomField = $scopedToCustomField;
                } else {
                    $copiedCustomField = new CustomField(
                        $scopedToCustomField->getGame(),
                        $scopedToCustomField->getName(),
                        $scopedToCustomField->getKind()->value,
                        $scopedToCustomField->isGlobal(),
                        $scopedToCustomField->isMultiple(),
                        $player,
                        false,
                        $scopedToCustomField,
                    );

                    $entityManager->persist($copiedCustomField);

                    $originalView = $scopedToCustomField->view();
                    if ($originalView['enumValues'] !== []) {
                        $enumValues = array_map(fn ($v) => $v['value'], $originalView['enumValues']);
                        $copiedCustomField->syncEnumValues($enumValues, $entityManager, true);
                    }
                }
            }
        }

        $copy = new CampaignKey(
            $campaignKey->getGame(),
            $campaignKey->getName(),
            $campaignKey->getType()->value,
            $campaignKey->isGlobal(),
            $copiedCustomField,
            $player,
            false,
            $campaignKey,
        );

        $entityManager->persist($copy);
        $entityManager->flush();

        return new JsonResponse($copy->view(), Response::HTTP_CREATED);
    }

    #[Route('api/game/{game}/campaignKeys', methods: 'GET')]
    public function getCampaignKeys(Game $game, CampaignKeyRepository $campaignKeyRepository): Response
    {
        /** @var Player $player */
        $player = $this->getUser();

        $myKeys = $campaignKeyRepository->findBy([
            'game' => $game,
            'player' => $player,
        ]);
        $shareableKeys = $campaignKeyRepository->findShareableForGame($game, $player);

        return new JsonResponse([
            'myKeys' => array_values(array_map(fn ($ck) => $ck->view(), $myKeys)),
            'shareableKeys' => array_values(array_map(fn ($ck) => $ck->view(), $shareableKeys)),
        ], Response::HTTP_OK);
    }
}
