<?php

namespace App\Tests\Game;

use App\Game\CustomField\Action\CopyCustomFieldHandler;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\CustomFieldScope;
use App\Game\CustomField\Exception\DuplicateCustomFieldException;
use App\Game\CustomField\Exception\NotShareableCustomFieldException;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CopyCustomFieldHandlerTest extends TestCase
{
    private CustomFieldRepository&MockObject $customFieldRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CopyCustomFieldHandler $handler;

    protected function setUp(): void
    {
        $this->customFieldRepository = $this->createMock(CustomFieldRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CopyCustomFieldHandler($this->customFieldRepository, $this->entityManager);
    }

    public function testNotShareableThrows(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $customField = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $owner);

        $player = new Player('Alice', 1);

        $this->expectException(NotShareableCustomFieldException::class);
        $this->handler->handle($customField, $player);
    }

    public function testDuplicateThrows(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $customField = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $owner, true);

        $player = new Player('Alice', 1);
        $existing = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $player);

        $this->customFieldRepository->method('findOneBy')->willReturn($existing);

        $this->expectException(DuplicateCustomFieldException::class);
        $this->handler->handle($customField, $player);
    }

    public function testCopySucceeds(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $customField = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $owner, true);

        $player = new Player('Alice', 1);

        $this->customFieldRepository->method('findOneBy')->willReturn(null);

        $copy = $this->handler->handle($customField, $player);

        $this->assertSame('Difficulty', $copy->getName());
        $this->assertSame($game, $copy->getGame());
        $this->assertSame($player, $copy->getPlayer());
        $this->assertSame($customField, $copy->getOriginCustomField());
        $this->assertFalse($copy->isShareable());
    }

    public function testCopyWithEnumValues(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $customField = new CustomField($game, 'Level', 'enum', CustomFieldScope::ENTRY, false, $owner, true);
        $customField->syncEnumValues(['Easy', 'Medium', 'Hard'], $this->entityManager, false);

        $player = new Player('Alice', 1);

        $this->customFieldRepository->method('findOneBy')->willReturn(null);

        $copy = $this->handler->handle($customField, $player);

        $this->assertSame('Level', $copy->getName());
        $copyView = $copy->view();
        $copiedValues = array_map(fn ($v) => $v['value'], $copyView['enumValues']);
        $this->assertSame(['Easy', 'Medium', 'Hard'], $copiedValues);
    }
}
