<?php

namespace App\Entry\PlayerResult;

use App\Utils\Event;

class PlayerEvent extends Event
{
    private readonly ?string $playerId;

    private readonly ?string $note;

    private readonly ?bool $won;

    private readonly bool $wonKeyPresent;

    /**
     * @var array<array{id: string, value: string}>
     */
    private readonly array $customFields;

    /**
     * @param array<string, mixed> $playerEvent
     */
    public function __construct(array $playerEvent)
    {
        parent::__construct($playerEvent);

        if (! in_array($this->getKind(), [self::ADD, self::UPDATE], true)) {
            $this->playerId = null;
            $this->note = null;
            $this->won = null;
            $this->wonKeyPresent = false;
            $this->customFields = [];
            return;
        }

        $this->playerId = $playerEvent['payload']['playerId'] ?? null;
        $this->note = $playerEvent['payload']['note'] ?? null;
        $this->won = $playerEvent['payload']['won'] ?? null;
        $this->wonKeyPresent = array_key_exists('won', $playerEvent['payload'] ?? []);

        $this->customFields = $playerEvent['payload']['customFields'] ?? [];
    }

    public function getPlayerId(): ?string
    {
        return $this->playerId;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function getWon(): ?bool
    {
        return $this->won;
    }

    public function isWonKeyPresent(): bool
    {
        return $this->wonKeyPresent;
    }

    /**
     * @return array<array{id: string, value: string}>
     */
    public function getCustomFields(): array
    {
        return $this->customFields;
    }
}
