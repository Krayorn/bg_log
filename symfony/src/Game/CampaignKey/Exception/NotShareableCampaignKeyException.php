<?php

namespace App\Game\CampaignKey\Exception;

class NotShareableCampaignKeyException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('This campaign key is not shareable');
    }
}
