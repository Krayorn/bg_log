<?php

namespace App\StatisticsQuery;

use App\Player\Player;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class StatisticsQueryVoter extends Voter
{
    final public const STATISTICS_QUERY_EDIT = 'STATISTICS_QUERY_EDIT';

    #[\Override]
    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::STATISTICS_QUERY_EDIT && $subject instanceof StatisticsQuery;
    }

    #[\Override]
    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (! $user instanceof Player) {
            return false;
        }

        assert($subject instanceof StatisticsQuery);

        return $subject->getPlayer()->getId()->equals($user->getId());
    }
}
