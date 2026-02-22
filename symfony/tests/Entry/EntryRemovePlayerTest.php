<?php

namespace App\Tests\Entry;

use App\Entry\Entry;
use App\Entry\Exception\CannotRemoveLastPlayerException;
use App\Game\Game;
use App\Player\Player;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class EntryRemovePlayerTest extends TestCase
{
    public function testRemovePlayerSucceedsWhenMultiplePlayers(): void
    {
        $entry = new Entry(
            new Game('Chess'),
            'note',
            new DateTimeImmutable(),
            [
                ['player' => new Player('Alice', 1), 'note' => '', 'won' => null],
                ['player' => new Player('Bob', 2), 'note' => '', 'won' => null],
            ],
            null,
        );

        $playerResultId = (string) $entry->getPlayerResults()->first()->id;

        $entry->removePlayer($playerResultId);

        $this->assertCount(1, $entry->getPlayerResults());
    }

    public function testRemoveLastPlayerThrows(): void
    {
        $entry = new Entry(
            new Game('Chess'),
            'note',
            new DateTimeImmutable(),
            [
                ['player' => new Player('Alice', 1), 'note' => '', 'won' => null],
            ],
            null,
        );

        $playerResultId = (string) $entry->getPlayerResults()->first()->id;

        $this->expectException(CannotRemoveLastPlayerException::class);
        $entry->removePlayer($playerResultId);
    }
}
