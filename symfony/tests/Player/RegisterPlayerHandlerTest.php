<?php

namespace App\Tests\Player;

use App\Player\Action\RegisterPlayerHandler;
use App\Player\Exception\DuplicatePlayerNameException;
use App\Player\Exception\InvalidEmailException;
use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class RegisterPlayerHandlerTest extends TestCase
{
    private PlayerRepository&MockObject $playerRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private UserPasswordHasherInterface&MockObject $passwordHasher;
    private RegisterPlayerHandler $handler;

    protected function setUp(): void
    {
        $this->playerRepository = $this->createMock(PlayerRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->passwordHasher = $this->createMock(UserPasswordHasherInterface::class);
        $this->handler = new RegisterPlayerHandler($this->playerRepository, $this->entityManager, $this->passwordHasher);
    }

    public function testRegisterSucceeds(): void
    {
        $this->playerRepository->method('findOneBy')->willReturn(null);
        $this->playerRepository->method('findNextNumber')->willReturn(42);
        $this->passwordHasher->method('hashPassword')->willReturn('hashed_pw');

        $player = $this->handler->handle('Alice', 'secret123', 'alice@example.com');

        $this->assertSame('Alice', $player->getName());
        $this->assertSame('alice@example.com', $player->getEmail());
        $this->assertNotNull($player->getRegisteredOn());
    }

    public function testRegisterWithNullEmailSucceeds(): void
    {
        $this->playerRepository->method('findOneBy')->willReturn(null);
        $this->playerRepository->method('findNextNumber')->willReturn(42);
        $this->passwordHasher->method('hashPassword')->willReturn('hashed_pw');

        $player = $this->handler->handle('Alice', 'secret123', null);

        $this->assertSame('Alice', $player->getName());
        $this->assertNull($player->getEmail());
    }

    public function testInvalidEmailThrows(): void
    {
        $this->expectException(InvalidEmailException::class);
        $this->handler->handle('Alice', 'secret123', 'not-an-email');
    }

    public function testDuplicateUsernameThrows(): void
    {
        $existingPlayer = new Player('Alice', 1);
        $this->playerRepository->method('findOneBy')->willReturn($existingPlayer);

        $this->expectException(DuplicatePlayerNameException::class);
        $this->handler->handle('Alice', 'secret123', null);
    }
}
