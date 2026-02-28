<?php

namespace App\Game\CustomField\Exception;

class NotShareableCustomFieldException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('This custom field is not shareable');
    }
}
