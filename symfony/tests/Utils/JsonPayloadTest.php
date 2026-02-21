<?php

namespace App\Tests\Utils;

use App\Utils\JsonPayload;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

class JsonPayloadTest extends TestCase
{
    private function makePayload(array $data): JsonPayload
    {
        $request = new Request([], [], [], [], [], [], json_encode($data));

        return JsonPayload::fromRequest($request);
    }

    public function testGetStringReturnsValue(): void
    {
        $payload = $this->makePayload(['name' => 'Alice']);

        $this->assertSame('Alice', $payload->getString('name'));
    }

    public function testGetStringThrowsOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getString('name');
    }

    public function testGetStringThrowsOnNonStringValue(): void
    {
        $payload = $this->makePayload(['count' => 42]);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getString('count');
    }

    public function testGetNonEmptyStringReturnsTrimedValue(): void
    {
        $payload = $this->makePayload(['name' => '  Alice  ']);

        $this->assertSame('Alice', $payload->getNonEmptyString('name'));
    }

    public function testGetNonEmptyStringThrowsOnEmpty(): void
    {
        $payload = $this->makePayload(['name' => '']);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getNonEmptyString('name');
    }

    public function testGetNonEmptyStringThrowsOnWhitespaceOnly(): void
    {
        $payload = $this->makePayload(['name' => '   ']);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getNonEmptyString('name');
    }

    public function testGetOptionalStringReturnsValue(): void
    {
        $payload = $this->makePayload(['email' => 'a@b.com']);

        $this->assertSame('a@b.com', $payload->getOptionalString('email'));
    }

    public function testGetOptionalStringReturnsDefaultOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->assertNull($payload->getOptionalString('email'));
    }

    public function testGetOptionalStringReturnsCustomDefault(): void
    {
        $payload = $this->makePayload([]);

        $this->assertSame('fallback', $payload->getOptionalString('email', 'fallback'));
    }

    public function testGetOptionalStringReturnsDefaultOnNonStringValue(): void
    {
        $payload = $this->makePayload(['flag' => true]);

        $this->assertNull($payload->getOptionalString('flag'));
    }

    public function testGetOptionalArrayReturnsArray(): void
    {
        $payload = $this->makePayload(['items' => [1, 2, 3]]);

        $this->assertSame([1, 2, 3], $payload->getOptionalArray('items'));
    }

    public function testGetOptionalArrayReturnsNullOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->assertNull($payload->getOptionalArray('items'));
    }

    public function testGetOptionalArrayReturnsNullOnNonArrayValue(): void
    {
        $payload = $this->makePayload(['items' => 'not-an-array']);

        $this->assertNull($payload->getOptionalArray('items'));
    }

    public function testGetUuidReturnsUuid(): void
    {
        $payload = $this->makePayload(['id' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890']);

        $uuid = $payload->getUuid('id');
        $this->assertSame('a1b2c3d4-e5f6-7890-abcd-ef1234567890', $uuid->toString());
    }

    public function testGetUuidThrowsOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getUuid('id');
    }

    public function testGetUuidThrowsOnInvalidUuid(): void
    {
        $payload = $this->makePayload(['id' => 'not-a-uuid']);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getUuid('id');
    }

    public function testGetOptionalUuidReturnsUuid(): void
    {
        $payload = $this->makePayload(['id' => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890']);

        $uuid = $payload->getOptionalUuid('id');
        $this->assertNotNull($uuid);
        $this->assertSame('a1b2c3d4-e5f6-7890-abcd-ef1234567890', $uuid->toString());
    }

    public function testGetOptionalUuidReturnsNullOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->assertNull($payload->getOptionalUuid('id'));
    }

    public function testGetOptionalUuidThrowsOnInvalidUuid(): void
    {
        $payload = $this->makePayload(['id' => 'not-a-uuid']);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getOptionalUuid('id');
    }

    public function testGetBoolReturnsTrue(): void
    {
        $payload = $this->makePayload(['active' => true]);

        $this->assertTrue($payload->getBool('active'));
    }

    public function testGetBoolReturnsFalse(): void
    {
        $payload = $this->makePayload(['active' => false]);

        $this->assertFalse($payload->getBool('active'));
    }

    public function testGetBoolThrowsOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getBool('active');
    }

    public function testGetBoolThrowsOnNonBoolValue(): void
    {
        $payload = $this->makePayload(['active' => 'true']);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getBool('active');
    }

    public function testGetOptionalIntReturnsInt(): void
    {
        $payload = $this->makePayload(['price' => 42]);

        $this->assertSame(42, $payload->getOptionalInt('price'));
    }

    public function testGetOptionalIntReturnsNullOnMissingKey(): void
    {
        $payload = $this->makePayload([]);

        $this->assertNull($payload->getOptionalInt('price'));
    }

    public function testGetOptionalIntCastsNumericString(): void
    {
        $payload = $this->makePayload(['price' => '42']);

        $this->assertSame(42, $payload->getOptionalInt('price'));
    }

    public function testGetOptionalIntThrowsOnNonNumericValue(): void
    {
        $payload = $this->makePayload(['price' => 'abc']);

        $this->expectException(\InvalidArgumentException::class);
        $payload->getOptionalInt('price');
    }

    public function testHasReturnsTrueWhenKeyExists(): void
    {
        $payload = $this->makePayload(['price' => 42]);

        $this->assertTrue($payload->has('price'));
    }

    public function testHasReturnsFalseWhenKeyMissing(): void
    {
        $payload = $this->makePayload([]);

        $this->assertFalse($payload->has('price'));
    }

    public function testHasReturnsTrueWhenValueIsNull(): void
    {
        $payload = $this->makePayload(['price' => null]);

        $this->assertTrue($payload->has('price'));
    }

    public function testFromRequestHandlesInvalidJson(): void
    {
        $request = new Request([], [], [], [], [], [], 'not-json');
        $payload = JsonPayload::fromRequest($request);

        $this->assertSame('default', $payload->getOptionalString('any', 'default'));
    }
}
