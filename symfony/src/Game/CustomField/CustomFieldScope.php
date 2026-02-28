<?php

namespace App\Game\CustomField;

enum CustomFieldScope: string
{
    case ENTRY = 'entry';

    case PLAYER_RESULT = 'playerResult';
}
