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

    public function testFromRequestHandlesInvalidJson(): void
    {
        $request = new Request([], [], [], [], [], [], 'not-json');
        $payload = JsonPayload::fromRequest($request);

        $this->assertSame('default', $payload->getOptionalString('any', 'default'));
    }
}
