<?php

namespace App\Player;

class CirclePlayer
{
    public function __construct(
        public readonly string $id,
        public readonly string $name,
        public readonly int $number,
        public readonly ?string $registeredOn,
        public readonly bool $isGuest,
        public readonly ?string $inPartyOfId,
        public readonly ?string $nickname,
        public readonly int $gamesPlayed,
        public readonly int $wins,
        public readonly int $losses,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'number' => $this->number,
            'registeredOn' => $this->registeredOn,
            'isGuest' => $this->isGuest,
            'inPartyOf' => $this->inPartyOfId !== null ? [
                'id' => $this->inPartyOfId,
            ] : null,
            'nickname' => $this->nickname,
            'gamesPlayed' => $this->gamesPlayed,
            'wins' => $this->wins,
            'losses' => $this->losses,
        ];
    }
}
