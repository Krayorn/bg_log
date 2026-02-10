<?php

namespace App\Campaign;

use App\Player\Player;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class CampaignVoter extends Voter
{
    final public const CAMPAIGN_EDIT = 'CAMPAIGN_EDIT';

    final public const CAMPAIGN_VIEW = 'CAMPAIGN_VIEW';

    #[\Override]
    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::CAMPAIGN_EDIT, self::CAMPAIGN_VIEW], true)
            && $subject instanceof Campaign;
    }

    #[\Override]
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return false;
        }

        assert($subject instanceof Campaign);

        $creator = $subject->getCreatedBy();

        if ($creator->getId()->equals($user->getId())) {
            return true;
        }
        return $creator->getInPartyOf() instanceof Player
            && $creator->getInPartyOf()->getId()->equals($user->getId());
    }
}
