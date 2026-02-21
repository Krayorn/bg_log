<?php

namespace App\Tests\Entry;

use App\Campaign\CampaignRepository;
use App\Entry\Action\CreateEntryHandler;
use App\Game\Exception\GameNotFoundException;
use App\Game\Game;
use App\Game\GameOwnedRepository;
use App\Game\GameRepository;
use App\Player\Exception\PlayerNotFoundException;
use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CreateEntryHandlerTest extends TestCase
{
    private GameRepository&MockObject $gameRepository;
    private GameOwnedRepository&MockObject $gameOwnedRepository;
    private PlayerRepository&MockObject $playerRepository;
    private CampaignRepository&MockObject $campaignRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CreateEntryHandler $handler;

    protected function setUp(): void
    {
        $this->gameRepository = $this->createMock(GameRepository::class);
        $this->gameOwnedRepository = $this->createMock(GameOwnedRepository::class);
        $this->playerRepository = $this->createMock(PlayerRepository::class);
        $this->campaignRepository = $this->createMock(CampaignRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CreateEntryHandler(
            $this->gameRepository,
            $this->gameOwnedRepository,
            $this->playerRepository,
            $this->campaignRepository,
            $this->entityManager,
        );
    }

    public function testCreateEntrySucceeds(): void
    {
        $game = new Game('Chess');
        $player = new Player('Alice', 1);

        $this->gameRepository->method('find')->willReturn($game);
        $this->playerRepository->method('find')->willReturn($player);

        $entry = $this->handler->handle(
            'game-id',
            null,
            'Good game',
            '2026-01-15T10:00:00+00:00',
            [['id' => 'player-id', 'note' => 'Nice play', 'won' => true]],
            [],
            null,
        );

        $view = $entry->view();
        $this->assertSame('Good game', $view['note']);
        $this->assertCount(1, $view['players']);
    }

    public function testGameNotFoundThrows(): void
    {
        $this->gameRepository->method('find')->willReturn(null);

        $this->expectException(GameNotFoundException::class);
        $this->handler->handle('bad-id', null, 'note', '2026-01-15T10:00:00+00:00', [], [], null);
    }

    public function testPlayerNotFoundThrows(): void
    {
        $game = new Game('Chess');
        $this->gameRepository->method('find')->willReturn($game);
        $this->playerRepository->method('find')->willReturn(null);

        $this->expectException(PlayerNotFoundException::class);
        $this->handler->handle('game-id', null, 'note', '2026-01-15T10:00:00+00:00', [['id' => 'bad-id']], [], null);
    }

    public function testInvalidDateThrows(): void
    {
        $game = new Game('Chess');
        $this->gameRepository->method('find')->willReturn($game);

        $this->expectException(\InvalidArgumentException::class);
        $this->handler->handle('game-id', null, 'note', 'not-a-date', [], [], null);
    }
}
