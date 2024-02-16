<?php

namespace App\Entry;

use App\Event;

class CustomFieldEvent extends Event
{
    private readonly ?string $customFieldId;

    private readonly string $customFieldValue;

    public function __construct(array $customFieldEvent)
    {
        parent::__construct($customFieldEvent);

        if (! in_array($this->getKind(), [self::ADD, self::UPDATE])) {
            return;
        }

        $this->customFieldId = $customFieldEvent['payload']['id'] ?? null;
        $this->customFieldValue = $customFieldEvent['payload']['value'];
    }

    public function getCustomFieldId(): string
    {
        return $this->customFieldId;
    }

    public function getCustomFieldValue(): string
    {
        return $this->customFieldValue;
    }
}
