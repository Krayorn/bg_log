<?php

namespace App\Tests\Game;

use App\Game\Action\CreateGameHandler;
use App\Game\Exception\DuplicateGameNameException;
use App\Game\Game;
use App\Game\GameRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CreateGameHandlerTest extends TestCase
{
    private GameRepository&MockObject $gameRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CreateGameHandler $handler;

    protected function setUp(): void
    {
        $this->gameRepository = $this->createMock(GameRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CreateGameHandler($this->gameRepository, $this->entityManager);
    }

    public function testCreateGameSucceeds(): void
    {
        $this->gameRepository->method('findOneBy')->willReturn(null);

        $game = $this->handler->handle('Chess');

        $this->assertSame('Chess', $game->getName());
    }

    public function testDuplicateGameNameThrows(): void
    {
        $existing = new Game('Chess');
        $this->gameRepository->method('findOneBy')->willReturn($existing);

        $this->expectException(DuplicateGameNameException::class);
        $this->handler->handle('Chess');
    }
}
