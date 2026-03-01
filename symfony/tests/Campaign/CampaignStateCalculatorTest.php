<?php

namespace App\Tests\Campaign;

use App\Campaign\Campaign;
use App\Campaign\CampaignEvent\CampaignEvent;
use App\Campaign\CampaignStateCalculator;
use App\Entry\CustomFieldValue;
use App\Entry\Entry;
use App\Game\CampaignKey\CampaignKey;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldScope;
use App\Game\Game;
use App\Player\Player;
use PHPUnit\Framework\TestCase;

class CampaignStateCalculatorTest extends TestCase
{
    private CampaignStateCalculator $calculator;
    private Game $game;
    private Player $alice;
    private Player $bob;
    private Campaign $campaign;

    protected function setUp(): void
    {
        $this->calculator = new CampaignStateCalculator();
        $this->game = new Game('Gloomhaven');
        $this->alice = new Player('Alice', 1);
        $this->bob = new Player('Bob', 2);
        $this->campaign = new Campaign($this->game, 'Season 1', $this->alice);
    }

    public function testNoEventsReturnsEmptySections(): void
    {
        $entry = $this->createEntry([$this->alice]);

        $result = $this->calculator->computeEntryStates([$entry], []);

        $this->assertSame([], $result[(string) $entry->id]);
    }

    public function testGlobalReplaceString(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Location', 'string', CustomFieldScope::ENTRY);
        $event = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'replace', 'value' => 'Gloomhaven City']);

        $result = $this->calculator->computeEntryStates([$entry], [$event]);
        $sections = $result[(string) $entry->id];

        $this->assertCount(1, $sections);
        $this->assertSame('Global', $sections[0]['label']);
        $this->assertNull($sections[0]['playerId']);
        $this->assertSame('Gloomhaven City', $sections[0]['entries']['Location']);
        $this->assertSame([], $sections[0]['scoped']);
    }

    public function testGlobalReplaceNumber(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Reputation', 'number', CustomFieldScope::ENTRY);
        $event = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'replace', 'amount' => 5]);

        $result = $this->calculator->computeEntryStates([$entry], [$event]);

        $this->assertSame(5, $result[(string) $entry->id][0]['entries']['Reputation']);
    }

    public function testGlobalIncreaseAndDecrease(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Gold', 'number', CustomFieldScope::ENTRY);
        $e1 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'increase', 'amount' => 100]);
        $e2 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'decrease', 'amount' => 30]);

        $result = $this->calculator->computeEntryStates([$entry], [$e1, $e2]);

        $this->assertSame(70, $result[(string) $entry->id][0]['entries']['Gold']);
    }

    public function testGlobalListAddAndRemove(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Achievements', 'list', CustomFieldScope::ENTRY);
        $e1 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'add', 'values' => ['First Blood', 'Town Guard']]);
        $e2 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'remove', 'values' => ['First Blood']]);

        $result = $this->calculator->computeEntryStates([$entry], [$e1, $e2]);

        $this->assertSame(['Town Guard'], $result[(string) $entry->id][0]['entries']['Achievements']);
    }

    public function testGlobalCountedListAddAndRemove(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Inventory', 'counted_list', CustomFieldScope::ENTRY);
        $e1 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'add', 'items' => [
            ['item' => 'Sword', 'quantity' => 2],
            ['item' => 'Shield', 'quantity' => 1],
        ]]);
        $e2 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'remove', 'items' => [
            ['item' => 'Sword', 'quantity' => 1],
        ]]);

        $result = $this->calculator->computeEntryStates([$entry], [$e1, $e2]);

        $this->assertSame(['Sword' => 1, 'Shield' => 1], $result[(string) $entry->id][0]['entries']['Inventory']);
    }

    public function testCountedListRemoveToZeroRemovesItem(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Items', 'counted_list', CustomFieldScope::ENTRY);
        $e1 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'add', 'items' => [
            ['item' => 'Potion', 'quantity' => 1],
        ]]);
        $e2 = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'remove', 'items' => [
            ['item' => 'Potion', 'quantity' => 1],
        ]]);

        $result = $this->calculator->computeEntryStates([$entry], [$e1, $e2]);
        $sections = $result[(string) $entry->id];

        $this->assertCount(1, $sections);
        $this->assertSame([], $sections[0]['entries']['Items']);
    }

    public function testPlayerScopedEvent(): void
    {
        $entry = $this->createEntry([$this->alice, $this->bob]);
        $key = new CampaignKey($this->game, 'HP', 'number', CustomFieldScope::PLAYER_RESULT);
        $aliceResult = $this->findPlayerResult($entry, $this->alice);
        $bobResult = $this->findPlayerResult($entry, $this->bob);

        $e1 = new CampaignEvent($this->campaign, $entry, $aliceResult, $key, ['verb' => 'replace', 'amount' => 50]);
        $e2 = new CampaignEvent($this->campaign, $entry, $bobResult, $key, ['verb' => 'replace', 'amount' => 40]);

        $result = $this->calculator->computeEntryStates([$entry], [$e1, $e2]);
        $sections = $result[(string) $entry->id];

        $this->assertCount(2, $sections);

        $aliceSection = $this->findSection($sections, 'Alice');
        $bobSection = $this->findSection($sections, 'Bob');

        $this->assertNotNull($aliceSection);
        $this->assertNotNull($bobSection);
        $this->assertSame(50, $aliceSection['entries']['HP']);
        $this->assertSame(40, $bobSection['entries']['HP']);
        $this->assertSame((string) $this->alice->getId(), $aliceSection['playerId']);
    }

    public function testCustomFieldScopedEvent(): void
    {
        $customField = new CustomField($this->game, 'Character', 'string', CustomFieldScope::PLAYER_RESULT);
        $entry = $this->createEntry([$this->alice]);
        $aliceResult = $this->findPlayerResult($entry, $this->alice);
        $aliceResult->addCustomFieldValue($customField, 'Brute');

        $cfv = $aliceResult->getCustomFieldValues()->first();
        $this->assertInstanceOf(CustomFieldValue::class, $cfv);

        $key = new CampaignKey($this->game, 'XP', 'number', CustomFieldScope::PLAYER_RESULT, $customField);
        $event = new CampaignEvent($this->campaign, $entry, $aliceResult, $key, ['verb' => 'increase', 'amount' => 10], $cfv);

        $result = $this->calculator->computeEntryStates([$entry], [$event]);
        $sections = $result[(string) $entry->id];

        $aliceSection = $this->findSection($sections, 'Alice');
        $this->assertNotNull($aliceSection);
        $this->assertSame([], $aliceSection['entries']);
        $this->assertCount(1, $aliceSection['scoped']);
        $this->assertSame('Brute', $aliceSection['scoped'][0]['label']);
        $this->assertSame(10, $aliceSection['scoped'][0]['entries']['XP']);
    }

    public function testStateAccumulatesAcrossEntries(): void
    {
        $entry1 = $this->createEntry([$this->alice]);
        $entry2 = $this->createEntry([$this->alice]);

        $key = new CampaignKey($this->game, 'Gold', 'number', CustomFieldScope::ENTRY);
        $e1 = new CampaignEvent($this->campaign, $entry1, null, $key, ['verb' => 'increase', 'amount' => 50]);
        $e2 = new CampaignEvent($this->campaign, $entry2, null, $key, ['verb' => 'increase', 'amount' => 30]);

        $result = $this->calculator->computeEntryStates([$entry1, $entry2], [$e1, $e2]);

        $this->assertSame(50, $result[(string) $entry1->id][0]['entries']['Gold']);
        $this->assertSame(80, $result[(string) $entry2->id][0]['entries']['Gold']);
    }

    public function testMixedGlobalAndPlayerState(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $globalKey = new CampaignKey($this->game, 'Scenario', 'string', CustomFieldScope::ENTRY);
        $playerKey = new CampaignKey($this->game, 'Level', 'number', CustomFieldScope::PLAYER_RESULT);
        $aliceResult = $this->findPlayerResult($entry, $this->alice);

        $e1 = new CampaignEvent($this->campaign, $entry, null, $globalKey, ['verb' => 'replace', 'value' => 'Black Barrow']);
        $e2 = new CampaignEvent($this->campaign, $entry, $aliceResult, $playerKey, ['verb' => 'replace', 'amount' => 3]);

        $result = $this->calculator->computeEntryStates([$entry], [$e1, $e2]);
        $sections = $result[(string) $entry->id];

        $this->assertCount(2, $sections);
        $this->assertSame('Global', $sections[0]['label']);
        $this->assertSame('Black Barrow', $sections[0]['entries']['Scenario']);
        $this->assertSame('Alice', $sections[1]['label']);
        $this->assertSame(3, $sections[1]['entries']['Level']);
    }

    public function testStateSnapshotsAreIndependentPerEntry(): void
    {
        $entry1 = $this->createEntry([$this->alice]);
        $entry2 = $this->createEntry([$this->alice]);

        $key = new CampaignKey($this->game, 'Status', 'string', CustomFieldScope::ENTRY);
        $e1 = new CampaignEvent($this->campaign, $entry1, null, $key, ['verb' => 'replace', 'value' => 'Active']);
        $e2 = new CampaignEvent($this->campaign, $entry2, null, $key, ['verb' => 'replace', 'value' => 'Retired']);

        $result = $this->calculator->computeEntryStates([$entry1, $entry2], [$e1, $e2]);

        $this->assertSame('Active', $result[(string) $entry1->id][0]['entries']['Status']);
        $this->assertSame('Retired', $result[(string) $entry2->id][0]['entries']['Status']);
    }

    public function testInvalidVerbIsIgnored(): void
    {
        $entry = $this->createEntry([$this->alice]);
        $key = new CampaignKey($this->game, 'Gold', 'number', CustomFieldScope::ENTRY);
        $event = new CampaignEvent($this->campaign, $entry, null, $key, ['verb' => 'invalid_verb', 'amount' => 10]);

        $result = $this->calculator->computeEntryStates([$entry], [$event]);

        $this->assertSame([], $result[(string) $entry->id]);
    }

    /**
     * @param Player[] $players
     */
    private function createEntry(array $players): Entry
    {
        $playerData = array_map(fn (Player $p) => [
            'player' => $p,
            'note' => '',
            'won' => null,
        ], $players);

        return new Entry($this->game, '', new \DateTimeImmutable(), $playerData, null);
    }

    private function findPlayerResult(Entry $entry, Player $player): \App\Entry\PlayerResult\PlayerResult
    {
        foreach ($entry->getPlayerResults() as $pr) {
            if ((string) $pr->getPlayer()->getId() === (string) $player->getId()) {
                return $pr;
            }
        }

        throw new \RuntimeException("Player result not found for {$player->getName()}");
    }

    /**
     * @param array<int, array<string, mixed>> $sections
     *
     * @return array<string, mixed>|null
     */
    private function findSection(array $sections, string $label): ?array
    {
        foreach ($sections as $section) {
            if ($section['label'] === $label) {
                return $section;
            }
        }

        return null;
    }
}
