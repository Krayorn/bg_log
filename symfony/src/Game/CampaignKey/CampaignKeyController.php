<?php

namespace App\Game\CampaignKey;

use App\Game\Game;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class CampaignKeyController extends AbstractController
{
    #[Route('api/game/{game}/campaignKeys', methods: 'POST')]
    public function create(Request $request, Game $game, EntityManagerInterface $entityManager): Response
    {
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

        $campaignKey = new CampaignKey($game, trim((string) $name), $type, (bool) $global, $scopedToCustomField);

        $entityManager->persist($campaignKey);
        $entityManager->flush();

        return new JsonResponse($game->view(), Response::HTTP_OK);
    }

    #[Route('api/campaignKeys/{campaignKey}', methods: 'DELETE')]
    public function delete(CampaignKey $campaignKey, EntityManagerInterface $entityManager): Response
    {
        $entityManager->remove($campaignKey);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }
}
