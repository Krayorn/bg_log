<?php

namespace App\Entry;

use App\Player\Player;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class EntryVoter extends Voter
{
    final public const ENTRY_EDIT = 'ENTRY_EDIT';

    #[\Override]
    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::ENTRY_EDIT && $subject instanceof Entry;
    }

    #[\Override]
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return false;
        }

        assert($subject instanceof Entry);
        foreach ($subject->getPlayerResults() as $playerResult) {
            $player = $playerResult->getPlayer();

            if ($player->getId()->equals($user->getId())) {
                return true;
            }

            if ($player->getInPartyOf() instanceof Player
                && $player->getInPartyOf()->getId()->equals($user->getId())) {
                return true;
            }
        }

        return false;
    }
}
