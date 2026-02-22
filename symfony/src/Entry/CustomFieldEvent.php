<?php

namespace App\Entry;

use App\Utils\Event;

class CustomFieldEvent extends Event
{
    private readonly ?string $customFieldId;

    private readonly ?string $customFieldValue;

    /**
     * @param array<string, mixed> $customFieldEvent
     */
    public function __construct(array $customFieldEvent)
    {
        parent::__construct($customFieldEvent);

        if (! in_array($this->getKind(), [self::ADD, self::UPDATE], true)) {
            $this->customFieldId = null;
            $this->customFieldValue = null;
            return;
        }

        $this->customFieldId = $customFieldEvent['payload']['id'] ?? null;
        $this->customFieldValue = $customFieldEvent['payload']['value'] ?? null;
    }

    public function getCustomFieldId(): ?string
    {
        return $this->customFieldId;
    }

    public function getCustomFieldValue(): ?string
    {
        return $this->customFieldValue;
    }
}
