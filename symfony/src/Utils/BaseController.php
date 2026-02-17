<?php

namespace App\Utils;

use App\Player\Player;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

abstract class BaseController extends AbstractController
{
    protected function getPlayer(): Player
    {
        $user = $this->getUser();
        if (! $user instanceof Player) {
            throw new \LogicException('Current user is not a Player');
        }

        return $user;
    }
}
