<?php

namespace App\Tests\Game;

use App\Game\CampaignKey\Action\CopyCampaignKeyHandler;
use App\Game\CampaignKey\CampaignKey;
use App\Game\CampaignKey\CampaignKeyRepository;
use App\Game\CampaignKey\Exception\DuplicateCampaignKeyException;
use App\Game\CampaignKey\Exception\NotShareableCampaignKeyException;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Game\CustomField\CustomFieldScope;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CopyCampaignKeyHandlerTest extends TestCase
{
    private CampaignKeyRepository&MockObject $campaignKeyRepository;
    private CustomFieldRepository&MockObject $customFieldRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private CopyCampaignKeyHandler $handler;

    protected function setUp(): void
    {
        $this->campaignKeyRepository = $this->createMock(CampaignKeyRepository::class);
        $this->customFieldRepository = $this->createMock(CustomFieldRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->handler = new CopyCampaignKeyHandler(
            $this->campaignKeyRepository,
            $this->customFieldRepository,
            $this->entityManager,
        );
    }

    public function testNotShareableThrows(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $campaignKey = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, null, $owner);

        $player = new Player('Alice', 1);

        $this->expectException(NotShareableCampaignKeyException::class);
        $this->handler->handle($campaignKey, $player);
    }

    public function testDuplicateThrows(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $campaignKey = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, null, $owner, true);

        $player = new Player('Alice', 1);
        $existing = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, null, $player);

        $this->campaignKeyRepository->method('findOneBy')->willReturn($existing);

        $this->expectException(DuplicateCampaignKeyException::class);
        $this->handler->handle($campaignKey, $player);
    }

    public function testCopySucceedsWithoutScopedField(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $campaignKey = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, null, $owner, true);

        $player = new Player('Alice', 1);

        $this->campaignKeyRepository->method('findOneBy')->willReturn(null);

        $copy = $this->handler->handle($campaignKey, $player);

        $this->assertSame('Wins', $copy->getName());
        $this->assertSame($game, $copy->getGame());
        $this->assertSame($player, $copy->getPlayer());
        $this->assertSame($campaignKey, $copy->getOriginCampaignKey());
        $this->assertNull($copy->getScopedToCustomField());
        $this->assertFalse($copy->isShareable());
    }

    public function testCopyReuseExistingCustomFieldCopy(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $scopedField = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $owner, true);
        $campaignKey = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, $scopedField, $owner, true);

        $player = new Player('Alice', 1);
        $existingCopy = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $player, false, $scopedField);

        $this->campaignKeyRepository->method('findOneBy')->willReturn(null);
        $this->customFieldRepository->method('findOneBy')->willReturn($existingCopy);

        $copy = $this->handler->handle($campaignKey, $player);

        $this->assertSame($existingCopy, $copy->getScopedToCustomField());
    }

    public function testCopyUsesOriginalWhenPlayerOwnsIt(): void
    {
        $game = new Game('Chess');
        $player = new Player('Alice', 1);
        $scopedField = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $player, true);

        $otherOwner = new Player('Bob', 2);
        $campaignKey = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, $scopedField, $otherOwner, true);

        $this->campaignKeyRepository->method('findOneBy')->willReturn(null);
        $this->customFieldRepository->method('findOneBy')->willReturn(null);

        $copy = $this->handler->handle($campaignKey, $player);

        $this->assertSame($scopedField, $copy->getScopedToCustomField());
    }

    public function testCopyCreatesNewCustomFieldCopy(): void
    {
        $game = new Game('Chess');
        $owner = new Player('Bob', 2);
        $scopedField = new CustomField($game, 'Difficulty', 'string', CustomFieldScope::ENTRY, false, $owner, true);
        $campaignKey = new CampaignKey($game, 'Wins', 'number', CustomFieldScope::ENTRY, $scopedField, $owner, true);

        $player = new Player('Alice', 1);

        $this->campaignKeyRepository->method('findOneBy')->willReturn(null);
        $this->customFieldRepository->method('findOneBy')->willReturn(null);

        $copy = $this->handler->handle($campaignKey, $player);

        $copiedField = $copy->getScopedToCustomField();
        $this->assertNotNull($copiedField);
        $this->assertNotSame($scopedField, $copiedField);
        $this->assertSame('Difficulty', $copiedField->getName());
        $this->assertSame($player, $copiedField->getPlayer());
        $this->assertSame($scopedField, $copiedField->getOriginCustomField());
    }
}
