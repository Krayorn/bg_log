<?php

namespace App\Admin;

use App\Admin\Action\DeletePlayerHandler;
use App\Admin\Action\GetAdminStatsHandler;
use App\Player\Player;
use App\Player\PlayerRepository;
use App\Utils\BaseController;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class AdminController extends BaseController
{
    #[Route('api/admin/stats', methods: 'GET')]
    public function stats(GetAdminStatsHandler $handler): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        return new JsonResponse($handler->handle(), Response::HTTP_OK);
    }

    #[Route('api/admin/users', methods: 'GET')]
    public function users(PlayerRepository $playerRepository): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $players = $playerRepository->findRegistered();

        return new JsonResponse(
            array_map(fn (Player $p) => [
                ...$p->view(true),
                'isAdmin' => $p->isAdmin(),
            ], $players),
            Response::HTTP_OK
        );
    }

    #[Route('api/admin/users/{player}', methods: 'DELETE')]
    public function deleteUser(Player $player, DeletePlayerHandler $handler): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $currentPlayer = $this->getPlayer();
        if ($currentPlayer->getId()->equals($player->getId())) {
            return new JsonResponse(
                [
                    'errors' => ['Cannot delete yourself'],
                ],
                Response::HTTP_BAD_REQUEST
            );
        }

        $handler->handle($player);

        return new JsonResponse(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('api/admin/users/{player}/toggle-admin', methods: 'POST')]
    public function toggleAdmin(Player $player, EntityManagerInterface $em): Response
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $currentPlayer = $this->getPlayer();
        if ($currentPlayer->getId()->equals($player->getId())) {
            return new JsonResponse(
                [
                    'errors' => ['Cannot change your own admin status'],
                ],
                Response::HTTP_BAD_REQUEST
            );
        }

        if ($player->isAdmin()) {
            $player->removeRole('ROLE_ADMIN');
        } else {
            $player->addRole('ROLE_ADMIN');
        }

        $em->flush();

        return new JsonResponse([
            ...$player->view(true),
            'isAdmin' => $player->isAdmin(),
        ], Response::HTTP_OK);
    }
}
