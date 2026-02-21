<?php

namespace App\Game\CustomField\Exception;

class InvalidKindConversionException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
