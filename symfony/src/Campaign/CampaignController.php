<?php

namespace App\Campaign;

use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Exception\BadRequestException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
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
}
