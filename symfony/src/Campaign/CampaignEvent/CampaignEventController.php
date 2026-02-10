<?php

namespace App\Campaign\CampaignEvent;

use App\Campaign\Campaign;
use App\Campaign\CampaignVoter;
use App\Entry\EntryRepository;
use App\Game\CampaignKey\CampaignKey;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

class CampaignEventController extends AbstractController
{
    #[Route('api/campaigns/{campaign}/events', methods: 'POST')]
    public function create(
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

        $event = new CampaignEvent($campaign, $entry, $playerResult, $campaignKey, $payload);

        $entityManager->persist($event);
        $entityManager->flush();

        return new JsonResponse($campaign->view(), Response::HTTP_CREATED);
    }

    #[Route('api/campaigns/{campaign}/events/{eventId}', methods: 'DELETE')]
    public function delete(
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
