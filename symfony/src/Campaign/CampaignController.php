<?php

namespace App\Campaign;

use App\Campaign\CampaignEvent\CampaignEvent;
use App\Campaign\CampaignEvent\CampaignEventVerb;
use App\Campaign\CampaignEvent\InvalidEventPayloadException;
use App\Entry\EntryRepository;
use App\Game\CampaignKey\CampaignKey;
use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

class CampaignController extends AbstractController
{
    #[Route('api/campaigns', methods: 'GET')]
    public function list(Request $request, CampaignRepository $campaignRepository, GameRepository $gameRepository): Response
    {
        $gameId = $request->query->get('game');
        if ($gameId === null) {
            throw new BadRequestException('game id is required');
        }

        $game = $gameRepository->find($gameId);
        if ($game === null) {
            throw new BadRequestException('Game not found');
        }

        $user = $this->getUser();
        assert($user instanceof Player);

        $campaigns = $campaignRepository->listByGame($game, $user);

        return new JsonResponse(array_map(fn ($campaign) => $campaign->view(), $campaigns), Response::HTTP_OK);
    }

    #[Route('api/campaigns', methods: 'POST')]
    public function create(Request $request, EntityManagerInterface $entityManager, GameRepository $gameRepository): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'] ?? '';
        $gameId = $body['game'] ?? null;

        $errors = [];

        if ($name === '') {
            $errors[] = 'Name can\'t be empty';
        }

        if ($gameId === null) {
            $errors[] = 'Game is required';
        }

        $game = $gameId !== null ? $gameRepository->find($gameId) : null;
        if ($gameId !== null && $game === null) {
            $errors[] = 'Game not found';
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        assert($game instanceof \App\Game\Game);

        $user = $this->getUser();
        assert($user instanceof Player);

        $campaign = new Campaign($game, $name, $user);

        $entityManager->persist($campaign);
        $entityManager->flush();

        return new JsonResponse($campaign->view(), Response::HTTP_CREATED);
    }

    #[Route('api/campaigns/{campaign}', methods: 'GET')]
    public function get(Campaign $campaign): Response
    {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_VIEW, $campaign);

        return new JsonResponse($campaign->view(), Response::HTTP_OK);
    }

    #[Route('api/campaigns/{campaign}/last-entry', methods: 'GET')]
    public function lastEntry(Campaign $campaign, EntryRepository $entryRepository): Response
    {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_VIEW, $campaign);

        $entry = $entryRepository->findLastByCampaign($campaign);

        if (! $entry instanceof \App\Entry\Entry) {
            return new JsonResponse([
                'errors' => ['No entries found'],
            ], Response::HTTP_NOT_FOUND);
        }

        return new JsonResponse($entry->view(), Response::HTTP_OK);
    }

    #[Route('api/campaigns/{campaign}', methods: 'PATCH')]
    public function update(Campaign $campaign, Request $request, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_EDIT, $campaign);

        $content = $request->getContent();
        $body = json_decode($content, true);

        if (isset($body['name'])) {
            $name = trim((string) $body['name']);
            if ($name === '') {
                return new JsonResponse([
                    'errors' => ['Name can\'t be empty'],
                ], Response::HTTP_BAD_REQUEST);
            }
            $campaign->updateName($name);
        }

        $entityManager->flush();

        return new JsonResponse($campaign->view(), Response::HTTP_OK);
    }

    #[Route('api/campaigns/{campaign}', methods: 'DELETE')]
    public function delete(Campaign $campaign, EntityManagerInterface $entityManager): Response
    {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_EDIT, $campaign);

        $entityManager->remove($campaign);
        $entityManager->flush();

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('api/campaigns/{campaign}/events', methods: 'POST')]
    public function createEvent(
        Campaign $campaign,
        Request $request,
        EntityManagerInterface $entityManager,
        EntryRepository $entryRepository,
    ): Response {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_EDIT, $campaign);

        $body = json_decode($request->getContent(), true);

        $entryId = $body['entry'] ?? null;
        $campaignKeyId = $body['campaignKey'] ?? null;
        $payload = $body['payload'] ?? null;
        $customFieldValueId = $body['customFieldValue'] ?? null;

        $errors = [];

        if ($entryId === null) {
            $errors[] = 'Entry is required';
        }

        if ($campaignKeyId === null) {
            $errors[] = 'Campaign key is required';
        }

        if (! is_array($payload)) {
            $errors[] = 'Payload is required';
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        $entry = $entryRepository->find($entryId);
        if ($entry === null) {
            throw new NotFoundHttpException('Entry not found');
        }

        if ($entry->getCampaign() === null || ! $entry->getCampaign()->getId()->equals($campaign->getId())) {
            throw new BadRequestHttpException('Entry does not belong to this campaign');
        }

        $campaignKey = $entityManager->getRepository(CampaignKey::class)->find($campaignKeyId);
        if (! $campaignKey instanceof CampaignKey) {
            throw new NotFoundHttpException('Campaign key not found');
        }

        if (! $campaignKey->getGame()->getId()->equals($campaign->getGame()->getId())) {
            throw new BadRequestHttpException('Campaign key does not belong to this game');
        }

        $verbString = $payload['verb'] ?? null;
        $verb = $verbString !== null ? CampaignEventVerb::tryFrom($verbString) : null;
        if (! $verb instanceof CampaignEventVerb) {
            return new JsonResponse([
                'errors' => ['Invalid or missing verb'],
            ], Response::HTTP_BAD_REQUEST);
        }

        try {
            $verb->validatePayload($campaignKey->getType(), $payload);
        } catch (InvalidEventPayloadException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        $playerResult = null;
        if (! $campaignKey->isGlobal()) {
            $playerResultId = $body['playerResult'] ?? null;
            if ($playerResultId === null) {
                return new JsonResponse([
                    'errors' => ['Player result is required for non-global keys'],
                ], Response::HTTP_BAD_REQUEST);
            }

            foreach ($entry->getPlayerResults() as $pr) {
                if ((string) $pr->id === $playerResultId) {
                    $playerResult = $pr;
                    break;
                }
            }

            if ($playerResult === null) {
                throw new NotFoundHttpException('Player result not found in this entry');
            }
        }

        $customFieldValue = null;
        $scopedCustomField = $campaignKey->getScopedToCustomField();
        if ($scopedCustomField instanceof \App\Game\CustomField\CustomField && $playerResult !== null) {
            if ($customFieldValueId !== null) {
                foreach ($playerResult->getCustomFieldValues() as $cfv) {
                    if ((string) $cfv->getId() === (string) $customFieldValueId) {
                        if ((string) $cfv->getCustomField()->getId() !== (string) $scopedCustomField->getId()) {
                            return new JsonResponse([
                                'errors' => ['The provided custom field value does not belong to the expected custom field'],
                            ], Response::HTTP_BAD_REQUEST);
                        }
                        $customFieldValue = $cfv;
                        break;
                    }
                }
                if ($customFieldValue === null) {
                    return new JsonResponse([
                        'errors' => ['The provided custom field value was not found in the player result'],
                    ], Response::HTTP_BAD_REQUEST);
                }
            } else {
                foreach ($playerResult->getCustomFieldValues() as $cfv) {
                    if ((string) $cfv->getCustomField()->getId() === (string) $scopedCustomField->getId()) {
                        $customFieldValue = $cfv;
                        break;
                    }
                }
                if ($customFieldValue === null) {
                    return new JsonResponse([
                        'errors' => ['Player does not have a value for the scoped custom field on this entry'],
                    ], Response::HTTP_BAD_REQUEST);
                }
            }
        }

        $event = new CampaignEvent($campaign, $entry, $playerResult, $campaignKey, $payload, $customFieldValue);

        $entityManager->persist($event);
        $entityManager->flush();

        return new JsonResponse($campaign->view(), Response::HTTP_CREATED);
    }

    #[Route('api/campaigns/{campaign}/events/{eventId}', methods: 'DELETE')]
    public function deleteEvent(
        Campaign $campaign,
        string $eventId,
        EntityManagerInterface $entityManager,
    ): Response {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_EDIT, $campaign);

        $event = $entityManager->getRepository(CampaignEvent::class)->find($eventId);

        if ($event === null || ! $event->getCampaign()->getId()->equals($campaign->getId())) {
            throw new NotFoundHttpException('Event not found');
        }

        $entityManager->remove($event);
        $entityManager->flush();

        return new JsonResponse($campaign->view(), Response::HTTP_OK);
    }
}
