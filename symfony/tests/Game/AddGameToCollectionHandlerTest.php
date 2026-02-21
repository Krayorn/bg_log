<?php

namespace App\Tests\Game;

use App\Game\Action\AddGameToCollectionHandler;
use App\Game\Exception\GameAlreadyOwnedException;
use App\Game\Exception\GameNotFoundException;
use App\Game\Game;
use App\Game\GameOwned;
use App\Game\GameOwnedRepository;
use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class AddGameToCollectionHandlerTest extends TestCase
{
    private GameRepository&MockObject $gameRepository;
    private GameOwnedRepository&MockObject $gameOwnedRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private AddGameToCollectionHandler $handler;

    protected function setUp(): void
    {
        $this->gameRepository = $this->createMock(GameRepository::class);
        $this->gameOwnedRepository = $this->createMock(GameOwnedRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new AddGameToCollectionHandler($this->gameRepository, $this->gameOwnedRepository, $this->entityManager);
    }

    public function testAddSucceeds(): void
    {
        $game = new Game('Chess');
        $player = new Player('Alice', 1);

        $this->gameRepository->method('find')->willReturn($game);
        $this->gameOwnedRepository->method('findOneBy')->willReturn(null);

        $gameOwned = $this->handler->handle('some-id', $player, 30);

        $this->assertSame($game, $gameOwned->getGame());
        $this->assertSame($player, $gameOwned->getPlayer());
        $this->assertSame(30, $gameOwned->getPrice());
    }

    public function testGameNotFoundThrows(): void
    {
        $player = new Player('Alice', 1);
        $this->gameRepository->method('find')->willReturn(null);

        $this->expectException(GameNotFoundException::class);
        $this->handler->handle('bad-id', $player, null);
    }

    public function testAlreadyOwnedThrows(): void
    {
        $game = new Game('Chess');
        $player = new Player('Alice', 1);
        $existing = new GameOwned($player, $game);

        $this->gameRepository->method('find')->willReturn($game);
        $this->gameOwnedRepository->method('findOneBy')->willReturn($existing);

        $this->expectException(GameAlreadyOwnedException::class);
        $this->handler->handle('some-id', $player, null);
    }
}
