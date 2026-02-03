<?php

namespace App\Entry;

use App\Entry\PlayerResult\PlayerResult;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldKind;
use Doctrine\ORM\Mapping as ORM;
use Exception;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'custom_fields_values')]
#[ORM\Entity()]
class CustomFieldValue
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: Entry::class)]
        #[ORM\JoinColumn(name: 'entry_id', referencedColumnName: 'id', nullable: true)]
        private readonly ?Entry $entry,
        #[ORM\ManyToOne(targetEntity: PlayerResult::class)]
        #[ORM\JoinColumn(name: 'player_result_id', referencedColumnName: 'id', nullable: true)]
        private readonly ?PlayerResult $playerResult,
        #[ORM\ManyToOne(targetEntity: CustomField::class)]
        #[ORM\JoinColumn(name: 'custom_field_id', referencedColumnName: 'id')]
        private readonly CustomField $customField,
        #[ORM\Column(type: 'text', nullable: true)]
        private ?string $valueString,
        #[ORM\Column(type: 'integer', nullable: true)]
        private ?int $valueNumber,
    ) {
        if (! $this->entry instanceof \App\Entry\Entry && ! $this->playerResult instanceof \App\Entry\PlayerResult\PlayerResult) {
            throw new Exception('wtf');
        }

        if ($this->valueString === null && $this->valueNumber === null) {
            throw new Exception('wtf 2');
        }

        $this->id = Uuid::uuid4();
    }

    public function updateStringValue(string $value): void
    {
        $this->valueString = $value;
    }

    public function updateNumberValue(int $value): void
    {
        $this->valueNumber = $value;
    }

    public function getCustomField(): CustomField
    {
        return $this->customField;
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'value' => $this->getValue(),
            'customField' => $this->customField->view(),
        ];
    }

    private function getValue(): int|string|null
    {
        if ($this->customField->getKind() === CustomFieldKind::STRING) {
            return $this->valueString;
        }
        return $this->valueNumber;
    }
}
