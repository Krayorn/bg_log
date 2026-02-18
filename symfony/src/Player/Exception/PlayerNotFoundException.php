<?php

namespace App\Player\Exception;

class PlayerNotFoundException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
