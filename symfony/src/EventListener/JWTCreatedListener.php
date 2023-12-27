<?php

namespace App\EventListener;

use App\Player\Player;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Symfony\Component\HttpFoundation\RequestStack;

class JWTCreatedListener {
    /**
     * @param JWTCreatedEvent $event
     *
     * @return void
     */
    public function onJWTCreated(JWTCreatedEvent $event): void
    {
        $payload       = $event->getData();

        /** @var Player $user */
        $user = $event->getUser();
        $payload['id'] = $user->getId();

        $event->setData($payload);
    }
}

