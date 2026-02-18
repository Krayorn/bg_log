<?php

namespace App\Player\Exception;

class InvalidEmailException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
