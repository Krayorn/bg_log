<?php

namespace App\Game\CustomField\Action;

use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldKind;
use App\Game\CustomField\Exception\InvalidKindConversionException;
use Doctrine\ORM\EntityManagerInterface;

class UpdateCustomFieldHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @param string[]|null $enumValues
     */
    public function handle(
        CustomField $customField,
        ?string $newKind,
        ?array $enumValues,
    ): void {
        if ($newKind !== null) {
            $newKindEnum = CustomFieldKind::tryFrom($newKind);
            if (! $newKindEnum instanceof CustomFieldKind) {
                throw new \InvalidArgumentException("Invalid custom field kind: {$newKind}");
            }

            $allowed = [
                CustomFieldKind::STRING->value => [CustomFieldKind::ENUM],
                CustomFieldKind::ENUM->value => [CustomFieldKind::STRING],
            ];

            $currentKind = $customField->getKind();
            if (! isset($allowed[$currentKind->value]) || ! in_array($newKindEnum, $allowed[$currentKind->value], true)) {
                throw new InvalidKindConversionException("Cannot convert from {$currentKind->value} to {$newKindEnum->value}");
            }

            $customField->setKind($newKindEnum);

            if ($newKindEnum === CustomFieldKind::ENUM) {
                $existingValues = $this->entityManager->getConnection()->executeQuery(
                    'SELECT DISTINCT value_string FROM custom_fields_values WHERE custom_field_id = :id AND value_string IS NOT NULL',
                    [
                        'id' => (string) $customField->getId(),
                    ]
                )->fetchFirstColumn();

                $customField->syncEnumValues($existingValues, $this->entityManager);
            }

            if ($newKindEnum === CustomFieldKind::STRING) {
                $customField->syncEnumValues([], $this->entityManager);
            }
        }

        if ($enumValues !== null) {
            $customField->syncEnumValues($enumValues, $this->entityManager);
        }
    }
}
