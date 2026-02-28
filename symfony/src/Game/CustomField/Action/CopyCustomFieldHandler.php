<?php

namespace App\Game\CustomField\Action;

use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\Exception\DuplicateCustomFieldException;
use App\Game\CustomField\Exception\NotShareableCustomFieldException;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class CopyCustomFieldHandler
{
    public function __construct(
        private readonly CustomFieldRepository $customFieldRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(CustomField $customField, Player $player): CustomField
    {
        if (! $customField->isShareable()) {
            throw new NotShareableCustomFieldException();
        }

        $alreadyExist = $this->customFieldRepository->findOneBy([
            'game' => $customField->getGame(),
            'name' => $customField->getName(),
            'player' => $player,
        ]);

        if ($alreadyExist !== null) {
            throw new DuplicateCustomFieldException('You already have a custom field with this name for this game');
        }

        $copy = new CustomField(
            $customField->getGame(),
            $customField->getName(),
            $customField->getKind()->value,
            $customField->getScope(),
            $customField->isMultiple(),
            $player,
            false,
            $customField,
        );

        $this->entityManager->persist($copy);
        $this->entityManager->flush();

        $originalView = $customField->view();
        if ($originalView['enumValues'] !== []) {
            $enumValues = array_map(fn ($v) => $v['value'], $originalView['enumValues']);
            $copy->syncEnumValues($enumValues, $this->entityManager, true);
            $this->entityManager->flush();
        }

        return $copy;
    }
}
