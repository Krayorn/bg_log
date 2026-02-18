<?php

namespace App\Player\Exception;

class PlayerNotRegisteredException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
