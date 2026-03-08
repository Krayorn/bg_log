<?php

namespace App\Campaign\CampaignEvent;

class CampaignKeyNotFoundException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
