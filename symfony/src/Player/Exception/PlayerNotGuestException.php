<?php

namespace App\Player\Exception;

class PlayerNotGuestException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
