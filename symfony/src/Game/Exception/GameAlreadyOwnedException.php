<?php

namespace App\Game\Exception;

class GameAlreadyOwnedException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
