<?php

namespace App;

use App\Entry\EntryRepository;
use App\Game\GameOwned;
use App\Game\GameRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand('bglog:migrate:games')]
class GameToGamesOwnedCommand extends Command
{
    public function __construct(
        private readonly GameRepository $gameRepository,
        private readonly EntryRepository $entryRepository,
        private readonly EntityManagerInterface $entityManager
    )
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $games = $this->gameRepository->findAll();

        foreach ($games as $game)
        {
            $gameOwned = new GameOwned($game->getPlayer(), $game, $game->getPrice());

            $entries = $this->entryRepository->findBy(['game'=> $game]);
            foreach ($entries as $entry) {
                $entry->playedWith($gameOwned);
            }

            $this->entityManager->persist($gameOwned);
        }

        $this->entityManager->flush();

        return Command::SUCCESS;
    }
}