<?php

namespace App\Game\CustomField\Action;

use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\CustomFieldScope;
use App\Game\CustomField\Exception\DuplicateCustomFieldException;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class CreateCustomFieldHandler
{
    public function __construct(
        private readonly CustomFieldRepository $customFieldRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(Game $game, string $name, string $kind, CustomFieldScope $scope, bool $multiple, Player $player): CustomField
    {
        $existing = $this->customFieldRepository->findOneBy([
            'game' => $game,
            'name' => $name,
            'player' => $player,
        ]);
        if ($existing !== null) {
            throw new DuplicateCustomFieldException('custom field with this name already exist on this game');
        }

        $customField = new CustomField($game, $name, $kind, $scope, $multiple, $player);

        $this->entityManager->persist($customField);
        $this->entityManager->flush();

        return $customField;
    }
}
