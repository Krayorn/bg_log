<?php

namespace App\Utils;

class Event
{
    public const ADD = 'add';

    public const REMOVE = 'remove';

    public const UPDATE = 'update';

    private readonly string $kind;

    private readonly ?string $id;

    /**
     * @param array<string, mixed> $rawEvent
     */
    public function __construct(array $rawEvent)
    {
        $this->kind = $rawEvent['kind'];
        $this->id = $rawEvent['id'] ?? null;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function getId(): ?string
    {
        return $this->id;
    }
}
