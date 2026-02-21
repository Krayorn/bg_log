<?php

namespace App\Tests\Campaign;

use App\Campaign\Action\CreateCampaignHandler;
use App\Game\Exception\GameNotFoundException;
use App\Game\Game;
use App\Game\GameRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CreateCampaignHandlerTest extends TestCase
{
    private GameRepository&MockObject $gameRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CreateCampaignHandler $handler;

    protected function setUp(): void
    {
        $this->gameRepository = $this->createMock(GameRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CreateCampaignHandler($this->gameRepository, $this->entityManager);
    }

    public function testCreateCampaignSucceeds(): void
    {
        $game = new Game('Chess');
        $player = new Player('Alice', 1);

        $this->gameRepository->method('find')->willReturn($game);

        $campaign = $this->handler->handle('My Campaign', 'game-id', $player);

        $this->assertSame('My Campaign', $campaign->getName());
    }

    public function testGameNotFoundThrows(): void
    {
        $player = new Player('Alice', 1);
        $this->gameRepository->method('find')->willReturn(null);

        $this->expectException(GameNotFoundException::class);
        $this->handler->handle('Campaign', 'bad-id', $player);
    }
}
