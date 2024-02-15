<?php

namespace App;

class Event
{
    const ADD = 'add';
    const REMOVE = 'remove';
    const UPDATE = 'update';
    private string $kind;
    private ?string $id;

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