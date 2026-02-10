<?php

namespace App\Game\CampaignKey;

enum CampaignKeyType: string
{
    case STRING = 'string';
    case NUMBER = 'number';
    case LIST = 'list';
    case COUNTED_LIST = 'counted_list';
}
