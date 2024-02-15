<?php

namespace App\Entry;

use App\Entry\PlayerResult\PlayerResult;
use App\Game\CustomField\CustomField;
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
        if ($this->entry === null && $this->playerResult === null) {
            throw new Exception('wtf');
        }

        if ($this->valueString === null && $this->valueNumber === null) {
            throw new Exception('wtf 2');
        }

        $this->id = Uuid::uuid4();
    }

    private function getValue(): int|string
    {
        if ($this->valueString !== null) {
            return $this->valueString;
        }

        if ($this->valueNumber !== null) {
            return $this->valueNumber;
        }

        throw new Exception("broke");
    }

    public function updateStringValue(string $value)
    {
        $this->valueString = $value;
    }

    public function view(): array
    {
        return [
            'id' => $this->id,
            'value' => $this->getValue(),
            'customField' => $this->customField->view(),
        ];
    }
}