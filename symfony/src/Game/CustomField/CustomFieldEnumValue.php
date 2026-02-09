<?php

namespace App\Game\CustomField;

use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'custom_field_enum_values')]
#[ORM\Entity()]
class CustomFieldEnumValue
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    public function __construct(
        #[ORM\ManyToOne(targetEntity: CustomField::class)]
        #[ORM\JoinColumn(name: 'custom_field_id', referencedColumnName: 'id')]
        private readonly CustomField $customField,
        #[ORM\Column(type: 'text')]
        private readonly string $value,
    ) {
        $this->id = Uuid::uuid4();
    }

    public function getValue(): string
    {
        return $this->value;
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'value' => $this->value,
        ];
    }
}
