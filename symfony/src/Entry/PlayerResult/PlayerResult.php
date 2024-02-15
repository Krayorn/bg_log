<?php

namespace App\Entry\PlayerResult;

use App\Entry\CustomFieldValue;
use App\Entry\Entry;
use App\Game\CustomField\CustomField;
use App\Player\Player;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;

#[ORM\Table(name: 'player_result')]
#[ORM\Entity()]
class PlayerResult
{
    #[ORM\Id]
    #[ORM\Column(type: 'uuid', unique: true)]
    public UuidInterface $id;

    /**
     * @var Collection<int, CustomFieldValue>
     */
    #[ORM\OneToMany(mappedBy: 'playerResult', indexBy: 'id', targetEntity: CustomFieldValue::class, cascade: ['persist'])]
    private Collection   $customFields;
    public function __construct(
        #[ORM\ManyToOne(targetEntity: Entry::class)]
        #[ORM\JoinColumn(name: 'entry_id', referencedColumnName: 'id')]
        private readonly Entry   $entry,
        #[ORM\ManyToOne(targetEntity: Player::class)]
        #[ORM\JoinColumn(name: 'player_id', referencedColumnName: 'id')]
        private readonly Player   $player,
        #[ORM\Column(type: 'text')]
        private string $note = '',
        #[ORM\Column(type: 'boolean', nullable: true)]
        private ?bool $won = null,
    ) {
        $this->id = Uuid::uuid4();

        $this->customFields = new ArrayCollection();
    }

    public function addCustomFieldValue(CustomField $customField, string $value): void
    {
        $customFieldValue = new CustomFieldValue(null, $this, $customField, $value, null );

        $this->customFields->add($customFieldValue);
    }

    public function updateCustomFieldValue(string $id, string $value): void
    {
        $customFieldValue = $this->customFields->get($id);

        $customFieldValue->updateStringValue($value);
    }

    public function updateNote(string $note): void
    {
        $this->note = $note;
    }

    /**
     * @return array{id: UuidInterface, player: array<string, mixed>, note: string, won: bool|null}
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'player' => $this->player->view(),
            'note' => $this->note,
            'won' => $this->won,
            'customFields' => array_values(array_map(fn ($customField) => $customField->view(), $this->customFields->toArray())),
        ];
    }
}
