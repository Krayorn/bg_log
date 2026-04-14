<?php

namespace App\Player;

class CircleGraphEdge
{
    public function __construct(
        public readonly string $source,
        public readonly string $target,
        public readonly int $weight,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function view(): array
    {
        return [
            'source' => $this->source,
            'target' => $this->target,
            'weight' => $this->weight,
        ];
    }
}
