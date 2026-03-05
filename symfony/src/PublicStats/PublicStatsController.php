<?php

namespace App\PublicStats;

use App\PublicStats\Action\GetPublicStatsHandler;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class PublicStatsController extends AbstractController
{
    #[Route('api/public/stats', methods: 'GET')]
    public function stats(GetPublicStatsHandler $handler): Response
    {
        return new JsonResponse($handler->handle(), Response::HTTP_OK);
    }
}
