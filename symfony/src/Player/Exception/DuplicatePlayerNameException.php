<?php

namespace App\Player\Exception;

class DuplicatePlayerNameException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
