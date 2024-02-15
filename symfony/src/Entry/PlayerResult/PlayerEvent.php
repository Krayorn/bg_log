<?php

namespace App\Entry\PlayerResult;

use App\Entry\CustomFieldEvent;
use App\Event;

class PlayerEvent extends Event
{
    private ?string $note;
    private ?bool $won;
    private array $customFields;

    public function __construct(array $playerEvent)
    {
        parent::__construct($playerEvent);

        if (!in_array($this->getKind(), [self::ADD, self::UPDATE])) {
            return;
        }

        $this->note = $playerEvent['payload']['note'] ?? null;
        $this->won = $playerEvent['payload']['won'] ?? null;

        $this->customFields = array_map(fn($customField) => new CustomFieldEvent($customField),  $playerEvent['payload']['customFields'] ?? []);
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function getWon(): ?bool
    {
        return $this->won;
    }

    /**
     * @return array<CustomFieldEvent>
     */
    public function getCustomFields(): array
    {
        return $this->customFields;
    }
}