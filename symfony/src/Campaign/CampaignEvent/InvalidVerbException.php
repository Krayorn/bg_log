<?php

namespace App\Campaign\CampaignEvent;

class InvalidVerbException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
