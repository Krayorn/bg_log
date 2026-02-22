<?php

namespace App\Entry\Exception;

class CannotRemoveLastPlayerException extends \RuntimeException
{
    public function __construct()
    {
        parent::__construct('Cannot remove the last player from an entry');
    }
}
