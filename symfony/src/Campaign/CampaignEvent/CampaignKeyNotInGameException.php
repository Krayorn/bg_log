<?php

namespace App\Campaign\CampaignEvent;

class CampaignKeyNotInGameException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
