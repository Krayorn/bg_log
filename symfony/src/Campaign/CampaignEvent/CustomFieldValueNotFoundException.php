<?php

namespace App\Campaign\CampaignEvent;

class CustomFieldValueNotFoundException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
