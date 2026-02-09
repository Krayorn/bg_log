<?php

namespace App\Game\CustomField;

enum CustomFieldKind: string
{
    // case SELECT = 'select';

    case STRING = 'string';

    case NUMBER = 'number';

    case ENUM = 'enum';

    // case ARRAY = 'array';
}
