<?php

namespace App\Tests\Game;

use App\Game\Action\UpdatePlayerGameHandler;
use App\Game\Exception\DuplicateGameNameException;
use App\Game\Game;
use App\Game\GameOwned;
use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UpdatePlayerGameHandlerTest extends TestCase
{
    private GameRepository&MockObject $gameRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private UpdatePlayerGameHandler $handler;

    protected function setUp(): void
    {
        $this->gameRepository = $this->createMock(GameRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new UpdatePlayerGameHandler($this->gameRepository, $this->entityManager);
    }

    public function testUpdateNameSucceeds(): void
    {
        $gameOwned = new GameOwned(new Player('Alice', 1), new Game('Chess'));

        $this->gameRepository->method('findOneBy')->willReturn(null);

        $this->handler->handle($gameOwned, 'Checkers', false, null);

        $this->assertSame('Checkers', $gameOwned->getGame()->getName());
    }

    public function testEmptyNameThrows(): void
    {
        $gameOwned = new GameOwned(new Player('Alice', 1), new Game('Chess'));

        $this->expectException(\InvalidArgumentException::class);
        $this->handler->handle($gameOwned, '   ', false, null);
    }

    public function testDuplicateNameAgainstOtherGameThrows(): void
    {
        $gameOwned = new GameOwned(new Player('Alice', 1), new Game('Chess'));
        $otherGame = new Game('Checkers');

        $this->gameRepository->method('findOneBy')->willReturn($otherGame);

        $this->expectException(DuplicateGameNameException::class);
        $this->handler->handle($gameOwned, 'Checkers', false, null);
    }

    public function testSameGameNameIsAllowed(): void
    {
        $game = new Game('Chess');
        $gameOwned = new GameOwned(new Player('Alice', 1), $game);

        $this->gameRepository->method('findOneBy')->willReturn($game);

        $this->handler->handle($gameOwned, 'Chess', false, null);

        $this->assertSame('Chess', $gameOwned->getGame()->getName());
    }

    public function testUpdatePrice(): void
    {
        $gameOwned = new GameOwned(new Player('Alice', 1), new Game('Chess'));

        $this->handler->handle($gameOwned, null, true, 42);

        $this->assertSame(42, $gameOwned->getPrice());
    }

    public function testClearPrice(): void
    {
        $gameOwned = new GameOwned(new Player('Alice', 1), new Game('Chess'), 50);

        $this->handler->handle($gameOwned, null, true, null);

        $this->assertNull($gameOwned->getPrice());
    }

    public function testNoChangesWhenNothingProvided(): void
    {
        $gameOwned = new GameOwned(new Player('Alice', 1), new Game('Chess'), 30);

        $this->handler->handle($gameOwned, null, false, null);

        $this->assertSame('Chess', $gameOwned->getGame()->getName());
        $this->assertSame(30, $gameOwned->getPrice());
    }
}
