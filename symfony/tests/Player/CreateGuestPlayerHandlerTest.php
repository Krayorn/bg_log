<?php

namespace App\Tests\Player;

use App\Player\Action\CreateGuestPlayerHandler;
use App\Player\Exception\DuplicateGuestPlayerException;
use App\Player\Player;
use App\Player\PlayerRepository;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CreateGuestPlayerHandlerTest extends TestCase
{
    private PlayerRepository&MockObject $playerRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CreateGuestPlayerHandler $handler;

    protected function setUp(): void
    {
        $this->playerRepository = $this->createMock(PlayerRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CreateGuestPlayerHandler($this->playerRepository, $this->entityManager);
    }

    public function testCreateGuestPlayerSucceeds(): void
    {
        $owner = new Player('Alice', 1);

        $this->playerRepository->method('findOneBy')->willReturn(null);
        $this->playerRepository->method('findNextNumber')->willReturn(42);
        $this->entityManager->expects($this->once())->method('persist');
        $this->entityManager->expects($this->once())->method('flush');

        $guest = $this->handler->handle('Sam', $owner);

        $this->assertSame('Sam', $guest->getName());
        $this->assertSame($owner, $guest->getInPartyOf());
    }

    public function testDifferentOwnersCanHaveGuestsWithSameName(): void
    {
        $alice = new Player('Alice', 1);
        $bob = new Player('Bob', 2);

        $this->playerRepository->method('findOneBy')->willReturn(null);
        $this->playerRepository->method('findNextNumber')->willReturnOnConsecutiveCalls(42, 43);

        $guest1 = $this->handler->handle('Sam', $alice);
        $guest2 = $this->handler->handle('Sam', $bob);

        $this->assertSame('Sam', $guest1->getName());
        $this->assertSame('Sam', $guest2->getName());
        $this->assertSame($alice, $guest1->getInPartyOf());
        $this->assertSame($bob, $guest2->getInPartyOf());
    }

    public function testDuplicateGuestNameInSamePartyThrows(): void
    {
        $owner = new Player('Alice', 1);
        $existingGuest = new Player('Sam', 10);

        $this->playerRepository->method('findOneBy')->willReturn($existingGuest);

        $this->expectException(DuplicateGuestPlayerException::class);
        $this->handler->handle('Sam', $owner);
    }


}
