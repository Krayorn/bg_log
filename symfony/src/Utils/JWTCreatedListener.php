<?php

namespace App\Utils;

use App\Player\Player;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;

class JWTCreatedListener
{
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $payload = $event->getData();

        /** @var Player $user */
        $user = $event->getUser();
        $payload['id'] = $user->getId();

        $event->setData($payload);
    }
}
