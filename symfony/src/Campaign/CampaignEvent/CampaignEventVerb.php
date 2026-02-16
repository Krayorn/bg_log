<?php

namespace App\Campaign\CampaignEvent;

use App\Game\CampaignKey\CampaignKeyType;

enum CampaignEventVerb: string
{
    case ADD = 'add';
    case REMOVE = 'remove';
    case REPLACE = 'replace';
    case INCREASE = 'increase';
    case DECREASE = 'decrease';

    /**
     * @param array<string, mixed> $payload
     */
    public function validatePayload(CampaignKeyType $type, array $payload): void
    {
        match ($this) {
            self::REPLACE => match ($type) {
                CampaignKeyType::STRING => $this->requireString($payload, 'value'),
                CampaignKeyType::NUMBER => $this->requireNumeric($payload, 'amount'),
                default => throw new InvalidEventPayloadException("Verb 'replace' is not allowed for type '{$type->value}'"),
            },
            self::INCREASE, self::DECREASE => match ($type) {
                CampaignKeyType::NUMBER => $this->requireNumeric($payload, 'amount'),
                default => throw new InvalidEventPayloadException("Verb '{$this->value}' is not allowed for type '{$type->value}'"),
            },
            self::ADD => match ($type) {
                CampaignKeyType::LIST => $this->requireStringArray($payload, 'values'),
                CampaignKeyType::COUNTED_LIST => $this->requireItemsArray($payload),
                default => throw new InvalidEventPayloadException("Verb 'add' is not allowed for type '{$type->value}'"),
            },
            self::REMOVE => match ($type) {
                CampaignKeyType::LIST => $this->requireStringArray($payload, 'values'),
                CampaignKeyType::COUNTED_LIST => $this->requireItemsArray($payload),
                default => throw new InvalidEventPayloadException("Verb 'remove' is not allowed for type '{$type->value}'"),
            },
        };
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $payload
     */
    public function apply(CampaignKeyType $type, array &$target, string $keyName, array $payload): void
    {
        match ($this) {
            self::REPLACE => match ($type) {
                CampaignKeyType::STRING => $target[$keyName] = $payload['value'],
                CampaignKeyType::NUMBER => $target[$keyName] = (int) $payload['amount'],
                default => null,
            },
            self::INCREASE => $target[$keyName] = ($target[$keyName] ?? 0) + (int) $payload['amount'],
            self::DECREASE => $target[$keyName] = ($target[$keyName] ?? 0) - (int) $payload['amount'],
            self::ADD => match ($type) {
                CampaignKeyType::LIST => $this->addToList($target, $keyName, $payload),
                CampaignKeyType::COUNTED_LIST => $this->addToCountedList($target, $keyName, $payload),
                default => null,
            },
            self::REMOVE => match ($type) {
                CampaignKeyType::LIST => $this->removeFromList($target, $keyName, $payload),
                CampaignKeyType::COUNTED_LIST => $this->removeFromCountedList($target, $keyName, $payload),
                default => null,
            },
        };
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $payload
     */
    private function addToList(array &$target, string $keyName, array $payload): void
    {
        $target[$keyName] ??= [];
        foreach ($payload['values'] as $v) {
            $target[$keyName][] = $v;
        }
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $payload
     */
    private function removeFromList(array &$target, string $keyName, array $payload): void
    {
        $target[$keyName] ??= [];
        foreach ($payload['values'] as $v) {
            $idx = array_search($v, $target[$keyName], true);
            if ($idx !== false) {
                array_splice($target[$keyName], (int) $idx, 1);
            }
        }
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $payload
     */
    private function addToCountedList(array &$target, string $keyName, array $payload): void
    {
        $target[$keyName] ??= [];
        foreach ($payload['items'] as $entry) {
            $item = $entry['item'];
            $quantity = (int) $entry['quantity'];
            $target[$keyName][$item] = ($target[$keyName][$item] ?? 0) + $quantity;
        }
    }

    /**
     * @param array<string, mixed> $target
     * @param array<string, mixed> $payload
     */
    private function removeFromCountedList(array &$target, string $keyName, array $payload): void
    {
        $target[$keyName] ??= [];
        foreach ($payload['items'] as $entry) {
            $item = $entry['item'];
            $quantity = (int) $entry['quantity'];
            $current = $target[$keyName][$item] ?? 0;
            $newVal = $current - $quantity;
            if ($newVal <= 0) {
                unset($target[$keyName][$item]);
            } else {
                $target[$keyName][$item] = $newVal;
            }
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requireString(array $payload, string $field): void
    {
        if (! isset($payload[$field]) || ! is_string($payload[$field]) || trim($payload[$field]) === '') {
            throw new InvalidEventPayloadException(ucfirst($field) . ' is required');
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requireNumeric(array $payload, string $field): void
    {
        if (! isset($payload[$field]) || ! is_numeric($payload[$field])) {
            throw new InvalidEventPayloadException(ucfirst($field) . ' is required');
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requireStringArray(array $payload, string $field): void
    {
        if (! isset($payload[$field]) || ! is_array($payload[$field]) || $payload[$field] === []) {
            throw new InvalidEventPayloadException(ucfirst($field) . ' array is required');
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function requireItemsArray(array $payload): void
    {
        if (! isset($payload['items']) || ! is_array($payload['items']) || $payload['items'] === []) {
            throw new InvalidEventPayloadException('Items array is required');
        }

        foreach ($payload['items'] as $entry) {
            if (! is_array($entry)) {
                throw new InvalidEventPayloadException('Each item must be an object with item and quantity');
            }
            if (! isset($entry['item']) || ! is_string($entry['item']) || trim($entry['item']) === '') {
                throw new InvalidEventPayloadException('Each item must have a non-empty name');
            }
            if (! isset($entry['quantity']) || ! is_numeric($entry['quantity']) || (int) $entry['quantity'] < 1) {
                throw new InvalidEventPayloadException('Each item must have a positive quantity');
            }
        }
    }
}
