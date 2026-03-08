<?php

namespace App\Campaign\CampaignEvent;

class EntryNotInCampaignException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
