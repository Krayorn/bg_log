<?php

namespace App\Game\CampaignKey;

use App\Game\CampaignKey\Action\CopyCampaignKeyHandler;
use App\Game\CampaignKey\Action\CreateCampaignKeyHandler;
use App\Game\CampaignKey\Exception\DuplicateCampaignKeyException;
use App\Game\CampaignKey\Exception\NotShareableCampaignKeyException;
use App\Game\CustomField\CustomFieldScope;
use App\Game\Game;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class CampaignKeyController extends BaseController
{
    #[Route('api/game/{game}/campaignKeys', methods: 'POST')]
    public function create(Request $request, Game $game, CreateCampaignKeyHandler $handler): Response
    {
        $player = $this->getPlayer();
        $payload = JsonPayload::fromRequest($request);

        $scope = CustomFieldScope::tryFrom($payload->getOptionalString('scope') ?? 'entry') ?? CustomFieldScope::ENTRY;

        try {
            $campaignKey = $handler->handle(
                $game,
                $payload->getNonEmptyString('name'),
                $payload->getString('type'),
                $scope,
                $payload->getOptionalString('scopedToCustomField'),
                $player,
            );
        } catch (\InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

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
        $payload = JsonPayload::fromRequest($request);

        if ($payload->has('shareable')) {
            $this->denyAccessUnlessGranted(CampaignKeyVoter::CAMPAIGN_KEY_TOGGLE_SHAREABLE, $campaignKey);
            $campaignKey->setShareable($payload->getBool('shareable'));
        }

        $entityManager->flush();

        return new JsonResponse($campaignKey->view(), Response::HTTP_OK);
    }

    #[Route('api/campaignKeys/{campaignKey}/copy', methods: 'POST')]
    public function copy(CampaignKey $campaignKey, CopyCampaignKeyHandler $handler): Response
    {
        $player = $this->getPlayer();

        try {
            $copy = $handler->handle($campaignKey, $player);
        } catch (NotShareableCampaignKeyException|DuplicateCampaignKeyException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($copy->view(), Response::HTTP_CREATED);
    }

    #[Route('api/game/{game}/campaignKeys', methods: 'GET')]
    public function getCampaignKeys(Game $game, CampaignKeyRepository $campaignKeyRepository): Response
    {
        $player = $this->getPlayer();

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
