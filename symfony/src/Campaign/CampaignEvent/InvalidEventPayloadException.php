<?php

namespace App\Campaign\CampaignEvent;

class InvalidEventPayloadException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
