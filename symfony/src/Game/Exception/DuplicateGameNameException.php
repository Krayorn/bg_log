<?php

namespace App\Game\Exception;

class DuplicateGameNameException extends \RuntimeException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}
