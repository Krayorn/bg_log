<?php

namespace App\Game;

use App\Player\Player;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class GameOwnedVoter extends Voter
{
    final public const GAME_OWNED_EDIT = 'GAME_OWNED_EDIT';

    final public const GAME_OWNED_ADD = 'GAME_OWNED_ADD';

    #[\Override]
    protected function supports(string $attribute, mixed $subject): bool
    {
        return match ($attribute) {
            self::GAME_OWNED_EDIT => $subject instanceof GameOwned,
            self::GAME_OWNED_ADD => $subject instanceof Player,
            default => false,
        };
    }

    #[\Override]
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return false;
        }

        return match ($attribute) {
            self::GAME_OWNED_EDIT => $subject->getPlayer()->getId()->equals($user->getId()),
            self::GAME_OWNED_ADD => true,
            default => false,
        };
    }
}
