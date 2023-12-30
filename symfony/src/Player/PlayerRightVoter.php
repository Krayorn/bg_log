<?php

namespace App\Player;

use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\VoterInterface;

class PlayerRightVoter implements VoterInterface
{
    public function vote(TokenInterface $token, $subject, array $attributes): int
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return self::ACCESS_DENIED;
        }

        if (! $subject instanceof Player) {
            return self::ACCESS_ABSTAIN;
        }

        if ($subject->getId() === $user->getId()) {
            return self::ACCESS_GRANTED;
        }

        return self::ACCESS_DENIED;
    }
}
