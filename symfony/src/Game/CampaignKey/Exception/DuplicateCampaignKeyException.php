<?php

namespace App\Game\CampaignKey\Exception;

class DuplicateCampaignKeyException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('You already have a campaign key with this name for this game');
    }
}
