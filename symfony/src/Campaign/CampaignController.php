<?php

namespace App\Campaign;

use App\Campaign\Action\CreateCampaignEventHandler;
use App\Campaign\Action\CreateCampaignHandler;
use App\Campaign\CampaignEvent\CampaignEvent;
use App\Campaign\CampaignEvent\CampaignKeyNotFoundException;
use App\Campaign\CampaignEvent\CampaignKeyNotInGameException;
use App\Campaign\CampaignEvent\CustomFieldValueNotFoundException;
use App\Campaign\CampaignEvent\EntryNotFoundException;
use App\Campaign\CampaignEvent\EntryNotInCampaignException;
use App\Campaign\CampaignEvent\InvalidEventPayloadException;
use App\Campaign\CampaignEvent\InvalidVerbException;
use App\Campaign\CampaignEvent\PlayerResultNotFoundException;
use App\Campaign\CampaignEvent\PlayerResultRequiredException;
use App\Entry\EntryRepository;
use App\Game\Exception\GameNotFoundException;
use App\Game\GameRepository;
use App\Utils\BaseController;
use App\Utils\JsonPayload;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Annotation\Route;

class CampaignController extends BaseController
{
    public function __construct(
        private readonly CampaignStateCalculator $stateCalculator,
    ) {
    }

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

        $player = $this->getPlayer();

        $campaigns = $campaignRepository->listByGame($game, $player);

        return new JsonResponse(array_map(fn ($campaign) => $this->campaignView($campaign), $campaigns), Response::HTTP_OK);
    }

    #[Route('api/campaigns', methods: 'POST')]
    public function create(Request $request, CreateCampaignHandler $handler): Response
    {
        $payload = JsonPayload::fromRequest($request);

        try {
            $campaign = $handler->handle(
                $payload->getNonEmptyString('name'),
                $payload->getString('game'),
                $this->getPlayer(),
            );
        } catch (GameNotFoundException | \InvalidArgumentException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($this->campaignView($campaign), Response::HTTP_CREATED);
    }

    #[Route('api/campaigns/{campaign}', methods: 'GET')]
    public function get(Campaign $campaign): Response
    {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_VIEW, $campaign);

        return new JsonResponse($this->campaignView($campaign), Response::HTTP_OK);
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

        $payload = JsonPayload::fromRequest($request);

        $name = $payload->getOptionalString('name');
        if ($name !== null) {
            $trimmed = trim($name);
            if ($trimmed === '') {
                return new JsonResponse([
                    'errors' => ['Name can\'t be empty'],
                ], Response::HTTP_BAD_REQUEST);
            }
            $campaign->updateName($trimmed);
        }

        $entityManager->flush();

        return new JsonResponse($this->campaignView($campaign), Response::HTTP_OK);
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
        CreateCampaignEventHandler $handler,
    ): Response {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_EDIT, $campaign);

        $body = JsonPayload::fromRequest($request);

        $entryId = $body->getOptionalString('entry');
        $campaignKeyId = $body->getOptionalString('campaignKey');
        $eventPayload = $body->getOptionalArray('payload');

        $errors = [];

        if ($entryId === null) {
            $errors[] = 'Entry is required';
        }

        if ($campaignKeyId === null) {
            $errors[] = 'Campaign key is required';
        }

        if ($eventPayload === null) {
            $errors[] = 'Payload is required';
        }

        if ($errors !== []) {
            return new JsonResponse([
                'errors' => $errors,
            ], Response::HTTP_BAD_REQUEST);
        }

        assert(is_string($entryId));
        assert(is_string($campaignKeyId));
        assert(is_array($eventPayload));

        try {
            $handler->handle(
                $campaign,
                $entryId,
                $campaignKeyId,
                $eventPayload,
                $body->getOptionalString('playerResult'),
                $body->getOptionalString('customFieldValue'),
            );
        } catch (EntryNotFoundException | CampaignKeyNotFoundException | PlayerResultNotFoundException $e) {
            throw new NotFoundHttpException($e->getMessage(), $e);
        } catch (EntryNotInCampaignException | CampaignKeyNotInGameException $e) {
            throw new BadRequestHttpException($e->getMessage(), $e);
        } catch (InvalidVerbException | InvalidEventPayloadException | PlayerResultRequiredException | CustomFieldValueNotFoundException $e) {
            return new JsonResponse([
                'errors' => [$e->getMessage()],
            ], Response::HTTP_BAD_REQUEST);
        }

        return new JsonResponse($this->campaignView($campaign), Response::HTTP_CREATED);
    }

    #[Route('api/campaigns/{campaign}/events/{eventId}', methods: 'PATCH')]
    public function updateEvent(
        Campaign $campaign,
        string $eventId,
        Request $request,
        EntityManagerInterface $entityManager,
        CreateCampaignEventHandler $handler,
    ): Response {
        $this->denyAccessUnlessGranted(CampaignVoter::CAMPAIGN_EDIT, $campaign);

        $event = $entityManager->getRepository(CampaignEvent::class)->find($eventId);

        if ($event === null || ! $event->getCampaign()->getId()->equals($campaign->getId())) {
            throw new NotFoundHttpException('Event not found');
        }

        $body = JsonPayload::fromRequest($request);

        $newPosition = $body->getOptionalInt('position');
        $campaignKeyId = $body->getOptionalString('campaignKey');
        $eventPayload = $body->getOptionalArray('payload');

        if ($campaignKeyId !== null && $eventPayload !== null) {
            $position = $event->getPosition();
            $entryId = (string) $event->getEntry()->id;

            $entityManager->remove($event);
            $entityManager->flush();

            try {
                $newEvent = $handler->handle(
                    $campaign,
                    $entryId,
                    $campaignKeyId,
                    $eventPayload,
                    $body->getOptionalString('playerResult'),
                    $body->getOptionalString('customFieldValue'),
                );
                $newEvent->setPosition($position);
                $entityManager->flush();
            } catch (EntryNotFoundException | CampaignKeyNotFoundException | PlayerResultNotFoundException $e) {
                throw new NotFoundHttpException($e->getMessage(), $e);
            } catch (EntryNotInCampaignException | CampaignKeyNotInGameException $e) {
                throw new BadRequestHttpException($e->getMessage(), $e);
            } catch (InvalidVerbException | InvalidEventPayloadException | PlayerResultRequiredException | CustomFieldValueNotFoundException $e) {
                return new JsonResponse([
                    'errors' => [$e->getMessage()],
                ], Response::HTTP_BAD_REQUEST);
            }
        } elseif ($newPosition !== null) {
            $oldPosition = $event->getPosition();
            if ($newPosition !== $oldPosition) {
                $siblingEvents = $entityManager->getRepository(CampaignEvent::class)->findBy([
                    'campaign' => $campaign,
                    'entry' => $event->getEntry(),
                ]);

                foreach ($siblingEvents as $sibling) {
                    $pos = $sibling->getPosition();
                    if ($oldPosition < $newPosition && $pos > $oldPosition && $pos <= $newPosition) {
                        $sibling->setPosition($pos - 1);
                    } elseif ($oldPosition > $newPosition && $pos >= $newPosition && $pos < $oldPosition) {
                        $sibling->setPosition($pos + 1);
                    }
                }

                $event->setPosition($newPosition);
                $entityManager->flush();
            }
        }

        return new JsonResponse($this->campaignView($campaign), Response::HTTP_OK);
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

        return new JsonResponse($this->campaignView($campaign), Response::HTTP_OK);
    }

    /**
     * @return array<string, mixed>
     */
    private function campaignView(Campaign $campaign): array
    {
        $entryStates = $this->stateCalculator->computeEntryStates(
            $campaign->getSortedEntries(),
            $campaign->getEvents()->toArray(),
        );

        return $campaign->view($entryStates);
    }
}
