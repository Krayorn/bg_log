<?php

namespace App\Tests\Game;

use App\Game\CustomField\Action\CreateCustomFieldHandler;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\Exception\DuplicateCustomFieldException;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CreateCustomFieldHandlerTest extends TestCase
{
    private CustomFieldRepository&MockObject $customFieldRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CreateCustomFieldHandler $handler;

    protected function setUp(): void
    {
        $this->customFieldRepository = $this->createMock(CustomFieldRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CreateCustomFieldHandler($this->customFieldRepository, $this->entityManager);
    }

    public function testCreateSucceeds(): void
    {
        $this->customFieldRepository->method('findOneBy')->willReturn(null);

        $game = new Game('Chess');
        $player = new Player('Alice', 1);

        $customField = $this->handler->handle($game, 'Score', 'number', true, false, $player);

        $this->assertSame('Score', $customField->getName());
    }

    public function testDuplicateThrows(): void
    {
        $game = new Game('Chess');
        $player = new Player('Alice', 1);
        $existing = new CustomField($game, 'Score', 'number', true, false, $player);

        $this->customFieldRepository->method('findOneBy')->willReturn($existing);

        $this->expectException(DuplicateCustomFieldException::class);
        $this->handler->handle($game, 'Score', 'number', true, false, $player);
    }
}
