<?php

namespace App\Tests\Campaign;

use App\Campaign\Action\CreateCampaignEventHandler;
use App\Campaign\Campaign;
use App\Campaign\CampaignEvent\CampaignEvent;
use App\Campaign\CampaignEvent\CampaignKeyNotFoundException;
use App\Campaign\CampaignEvent\CampaignKeyNotInGameException;
use App\Campaign\CampaignEvent\EntryNotInCampaignException;
use App\Campaign\CampaignEvent\EntryNotFoundException;
use App\Campaign\CampaignEvent\InvalidVerbException;
use App\Campaign\CampaignEvent\PlayerResultRequiredException;
use App\Entry\Entry;
use App\Entry\EntryRepository;
use App\Game\CampaignKey\CampaignKey;
use App\Game\CampaignKey\CampaignKeyType;
use App\Game\CustomField\CustomFieldScope;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\EntityRepository;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

class CreateCampaignEventHandlerTest extends TestCase
{
    private EntryRepository&MockObject $entryRepository;
    private EntityManagerInterface&MockObject $entityManager;
    private EntityRepository&MockObject $campaignKeyRepository;
    private CreateCampaignEventHandler $handler;

    protected function setUp(): void
    {
        $this->entryRepository = $this->createMock(EntryRepository::class);
        $this->entityManager = $this->createMock(EntityManagerInterface::class);
        $this->campaignKeyRepository = $this->createMock(EntityRepository::class);

        $campaignEventRepository = $this->createMock(EntityRepository::class);
        $campaignEventRepository->method('findBy')->willReturn([]);

        $this->entityManager->method('getRepository')
            ->willReturnMap([
                [CampaignKey::class, $this->campaignKeyRepository],
                [CampaignEvent::class, $campaignEventRepository],
            ]);

        $this->handler = new CreateCampaignEventHandler($this->entryRepository, $this->entityManager);
    }

    public function testEntryNotFoundThrows(): void
    {
        $campaign = $this->createCampaign();

        $this->entryRepository->method('find')->willReturn(null);

        $this->expectException(EntryNotFoundException::class);
        $this->handler->handle($campaign, 'bad-entry-id', 'key-id', ['verb' => 'replace', 'value' => 'x']);
    }

    public function testEntryNotInCampaignThrows(): void
    {
        $game = new Game('Chess');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $otherCampaign = new Campaign($game, 'Campaign B', new Player('Bob', 2));

        $entry = $this->createEntryForCampaign($game, $otherCampaign);

        $this->entryRepository->method('find')->willReturn($entry);

        $this->expectException(EntryNotInCampaignException::class);
        $this->handler->handle($campaign, 'entry-id', 'key-id', ['verb' => 'replace', 'value' => 'x']);
    }

    public function testCampaignKeyNotFoundThrows(): void
    {
        $game = new Game('Chess');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $entry = $this->createEntryForCampaign($game, $campaign);

        $this->entryRepository->method('find')->willReturn($entry);
        $this->campaignKeyRepository->method('find')->willReturn(null);

        $this->expectException(CampaignKeyNotFoundException::class);
        $this->handler->handle($campaign, 'entry-id', 'bad-key-id', ['verb' => 'replace', 'value' => 'x']);
    }

    public function testCampaignKeyNotInGameThrows(): void
    {
        $game = new Game('Chess');
        $otherGame = new Game('Go');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $entry = $this->createEntryForCampaign($game, $campaign);
        $campaignKey = new CampaignKey($otherGame, 'Score', CampaignKeyType::STRING, CustomFieldScope::ENTRY);

        $this->entryRepository->method('find')->willReturn($entry);
        $this->campaignKeyRepository->method('find')->willReturn($campaignKey);

        $this->expectException(CampaignKeyNotInGameException::class);
        $this->handler->handle($campaign, 'entry-id', 'key-id', ['verb' => 'replace', 'value' => 'x']);
    }

    public function testInvalidVerbThrows(): void
    {
        $game = new Game('Chess');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $entry = $this->createEntryForCampaign($game, $campaign);
        $campaignKey = new CampaignKey($game, 'Score', CampaignKeyType::STRING, CustomFieldScope::ENTRY);

        $this->entryRepository->method('find')->willReturn($entry);
        $this->campaignKeyRepository->method('find')->willReturn($campaignKey);

        $this->expectException(InvalidVerbException::class);
        $this->handler->handle($campaign, 'entry-id', 'key-id', ['verb' => 'invalid_verb']);
    }

    public function testMissingVerbThrows(): void
    {
        $game = new Game('Chess');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $entry = $this->createEntryForCampaign($game, $campaign);
        $campaignKey = new CampaignKey($game, 'Score', CampaignKeyType::STRING, CustomFieldScope::ENTRY);

        $this->entryRepository->method('find')->willReturn($entry);
        $this->campaignKeyRepository->method('find')->willReturn($campaignKey);

        $this->expectException(InvalidVerbException::class);
        $this->handler->handle($campaign, 'entry-id', 'key-id', []);
    }

    public function testPlayerResultRequiredForPlayerScopedKey(): void
    {
        $game = new Game('Chess');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $entry = $this->createEntryForCampaign($game, $campaign);
        $campaignKey = new CampaignKey($game, 'Score', CampaignKeyType::STRING, CustomFieldScope::PLAYER_RESULT);

        $this->entryRepository->method('find')->willReturn($entry);
        $this->campaignKeyRepository->method('find')->willReturn($campaignKey);

        $this->expectException(PlayerResultRequiredException::class);
        $this->handler->handle($campaign, 'entry-id', 'key-id', ['verb' => 'replace', 'value' => 'x']);
    }

    public function testSuccessForEntryScopedStringKey(): void
    {
        $game = new Game('Chess');
        $campaign = new Campaign($game, 'Campaign A', new Player('Alice', 1));
        $entry = $this->createEntryForCampaign($game, $campaign);
        $campaignKey = new CampaignKey($game, 'Title', CampaignKeyType::STRING, CustomFieldScope::ENTRY);

        $this->entryRepository->method('find')->willReturn($entry);
        $this->campaignKeyRepository->method('find')->willReturn($campaignKey);

        $payload = ['verb' => 'replace', 'value' => 'hello'];
        $event = $this->handler->handle($campaign, 'entry-id', 'key-id', $payload);

        $this->assertSame($entry, $event->getEntry());
        $this->assertSame($campaignKey, $event->getCampaignKey());
        $this->assertSame($payload, $event->getPayload());
        $this->assertNull($event->getPlayerResult());
        $this->assertNull($event->getCustomFieldValue());
    }

    private function createCampaign(): Campaign
    {
        $game = new Game('Chess');

        return new Campaign($game, 'Test Campaign', new Player('Alice', 1));
    }

    private function createEntryForCampaign(Game $game, Campaign $campaign): Entry
    {
        $player = new Player('Bob', 2);
        $entry = new Entry(
            $game,
            '',
            new \DateTimeImmutable(),
            [['player' => $player, 'note' => '', 'won' => null]],
            null,
        );
        $entry->setCampaign($campaign);

        return $entry;
    }
}
