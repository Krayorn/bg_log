<?php

namespace App\Utils;

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

    /**
     * @return mixed[]|null
     */
    public function getOptionalArray(string $key): ?array
    {
        $value = $this->data[$key] ?? null;

        return is_array($value) ? $value : null;
    }
}
