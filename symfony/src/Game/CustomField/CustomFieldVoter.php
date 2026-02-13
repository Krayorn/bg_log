<?php

namespace App\Game\CustomField;

use App\Player\Player;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class CustomFieldVoter extends Voter
{
    final public const CUSTOM_FIELD_EDIT = 'CUSTOM_FIELD_EDIT';

    final public const CUSTOM_FIELD_DELETE = 'CUSTOM_FIELD_DELETE';

    final public const CUSTOM_FIELD_TOGGLE_SHAREABLE = 'CUSTOM_FIELD_TOGGLE_SHAREABLE';

    #[\Override]
    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::CUSTOM_FIELD_EDIT, self::CUSTOM_FIELD_DELETE, self::CUSTOM_FIELD_TOGGLE_SHAREABLE], true)
            && $subject instanceof CustomField;
    }

    #[\Override]
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return false;
        }

        /** @var CustomField $subject */
        return match ($attribute) {
            self::CUSTOM_FIELD_TOGGLE_SHAREABLE => in_array('ROLE_ADMIN', $user->getRoles(), true),
            self::CUSTOM_FIELD_EDIT, self::CUSTOM_FIELD_DELETE => $subject->getPlayer() instanceof Player
                && $subject->getPlayer()->getId()->equals($user->getId()),
            default => false,
        };
    }
}
