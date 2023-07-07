<?php

namespace App\Game;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class GameController extends AbstractController
{
    #[Route('/games', name: 'create_game', methods: 'POST')]
    public function create(Request $request, EntityManagerInterface $entityManager): Response
    {
        $content = $request->getContent();
        $body = json_decode($content, true);

        $name = $body['name'];

        $game = new Game($name);

        $entityManager->persist($game);
        $entityManager->flush();

        return new JsonResponse($game->view(), Response::HTTP_CREATED);
    }
}