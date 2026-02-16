<?php

namespace App\Game\CampaignKey;

use App\Player\Player;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class CampaignKeyVoter extends Voter
{
    final public const CAMPAIGN_KEY_DELETE = 'CAMPAIGN_KEY_DELETE';

    final public const CAMPAIGN_KEY_TOGGLE_SHAREABLE = 'CAMPAIGN_KEY_TOGGLE_SHAREABLE';

    #[\Override]
    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::CAMPAIGN_KEY_DELETE, self::CAMPAIGN_KEY_TOGGLE_SHAREABLE], true)
            && $subject instanceof CampaignKey;
    }

    #[\Override]
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return false;
        }

        /** @var CampaignKey $subject */
        return match ($attribute) {
            self::CAMPAIGN_KEY_TOGGLE_SHAREABLE => in_array('ROLE_ADMIN', $user->getRoles(), true),
            self::CAMPAIGN_KEY_DELETE => $subject->getPlayer() instanceof Player
                && $subject->getPlayer()->getId()->equals($user->getId()),
            default => false,
        };
    }
}
