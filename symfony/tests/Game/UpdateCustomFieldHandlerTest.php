<?php

namespace App\Tests\Game;

use App\Game\CustomField\Action\UpdateCustomFieldHandler;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldKind;
use App\Game\CustomField\Exception\InvalidKindConversionException;
use App\Game\Game;
use App\Player\Player;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Result;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class UpdateCustomFieldHandlerTest extends TestCase
{
    private EntityManagerInterface&MockObject $entityManager;
    private UpdateCustomFieldHandler $handler;

    protected function setUp(): void
    {
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new UpdateCustomFieldHandler($this->entityManager);

        $connection = $this->createMock(Connection::class);
        $this->entityManager->method('getConnection')->willReturn($connection);

        $result = $this->createMock(Result::class);
        $connection->method('executeQuery')->willReturn($result);
        $result->method('fetchFirstColumn')->willReturn([]);
    }

    public function testInvalidKindThrows(): void
    {
        $cf = new CustomField(new Game('Chess'), 'field', 'string', true, false, new Player('Alice', 1));

        $this->expectException(\InvalidArgumentException::class);
        $this->handler->handle($cf, 'invalid', null);
    }

    public function testDisallowedConversionThrows(): void
    {
        $cf = new CustomField(new Game('Chess'), 'field', 'number', true, false, new Player('Alice', 1));

        $this->expectException(InvalidKindConversionException::class);
        $this->handler->handle($cf, 'string', null);
    }

    public function testStringToEnumConversion(): void
    {
        $cf = new CustomField(new Game('Chess'), 'field', 'string', true, false, new Player('Alice', 1));

        $this->handler->handle($cf, 'enum', null);

        $this->assertSame(CustomFieldKind::ENUM, $cf->getKind());
    }

    public function testEnumToStringConversion(): void
    {
        $cf = new CustomField(new Game('Chess'), 'field', 'enum', true, false, new Player('Alice', 1));

        $this->handler->handle($cf, 'string', null);

        $this->assertSame(CustomFieldKind::STRING, $cf->getKind());
    }

    public function testNumberToEnumDisallowed(): void
    {
        $cf = new CustomField(new Game('Chess'), 'field', 'number', true, false, new Player('Alice', 1));

        $this->expectException(InvalidKindConversionException::class);
        $this->handler->handle($cf, 'enum', null);
    }
}
