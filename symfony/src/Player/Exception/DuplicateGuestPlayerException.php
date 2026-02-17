<?php

namespace App\Player\Exception;

class DuplicateGuestPlayerException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
