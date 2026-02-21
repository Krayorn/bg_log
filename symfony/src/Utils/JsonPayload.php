<?php

namespace App\Utils;

use Ramsey\Uuid\Uuid;
use Ramsey\Uuid\UuidInterface;
use Symfony\Component\HttpFoundation\Request;

class JsonPayload
{
    /**
     * @param array<string, mixed> $data
     */
    private function __construct(
        private readonly array $data
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        /** @var array<string, mixed> $decoded */
        $decoded = json_decode($request->getContent(), true) ?? [];

        return new self($decoded);
    }

    public function getString(string $key): string
    {
        $value = $this->data[$key] ?? null;
        if (! is_string($value)) {
            throw new \InvalidArgumentException(sprintf('Missing or invalid string field "%s"', $key));
        }

        return $value;
    }

    public function getNonEmptyString(string $key): string
    {
        $value = $this->getString($key);
        if (trim($value) === '') {
            throw new \InvalidArgumentException(sprintf('Field "%s" cannot be empty', $key));
        }

        return trim($value);
    }

    public function getOptionalString(string $key, ?string $default = null): ?string
    {
        $value = $this->data[$key] ?? null;

        return is_string($value) ? $value : $default;
    }

    public function getUuid(string $key): UuidInterface
    {
        $value = $this->getString($key);
        if (! Uuid::isValid($value)) {
            throw new \InvalidArgumentException(sprintf('Field "%s" is not a valid UUID', $key));
        }

        return Uuid::fromString($value);
    }

    public function getOptionalUuid(string $key): ?UuidInterface
    {
        $value = $this->getOptionalString($key);
        if ($value === null) {
            return null;
        }
        if (! Uuid::isValid($value)) {
            throw new \InvalidArgumentException(sprintf('Field "%s" is not a valid UUID', $key));
        }

        return Uuid::fromString($value);
    }

    public function getBool(string $key): bool
    {
        $value = $this->data[$key] ?? null;
        if (! is_bool($value)) {
            throw new \InvalidArgumentException(sprintf('Missing or invalid boolean field "%s"', $key));
        }

        return $value;
    }

    public function getOptionalBool(string $key, bool $default = false): bool
    {
        $value = $this->data[$key] ?? null;

        return is_bool($value) ? $value : $default;
    }

    public function getOptionalInt(string $key, ?int $default = null): ?int
    {
        $value = $this->data[$key] ?? null;
        if ($value === null) {
            return $default;
        }
        if (! is_numeric($value)) {
            throw new \InvalidArgumentException(sprintf('Field "%s" must be a valid integer', $key));
        }

        return (int) $value;
    }

    public function has(string $key): bool
    {
        return array_key_exists($key, $this->data);
    }

    /**
     * @return mixed[]|null
     */
    public function getOptionalArray(string $key): ?array
    {
        $value = $this->data[$key] ?? null;

        return is_array($value) ? $value : null;
    }
}
