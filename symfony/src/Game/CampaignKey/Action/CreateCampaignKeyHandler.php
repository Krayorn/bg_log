<?php

namespace App\Game\CampaignKey\Action;

use App\Game\CampaignKey\CampaignKey;
use App\Game\CampaignKey\CampaignKeyType;
use App\Game\Game;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class CreateCampaignKeyHandler
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(
        Game $game,
        string $name,
        string $type,
        bool $global,
        ?string $scopedToCustomFieldId,
        Player $player,
    ): CampaignKey {
        $typeEnum = CampaignKeyType::tryFrom($type);
        if (! $typeEnum instanceof CampaignKeyType) {
            throw new \InvalidArgumentException('Invalid type');
        }

        $scopedToCustomField = null;
        if ($scopedToCustomFieldId !== null) {
            $scopedToCustomField = $game->getCustomField($scopedToCustomFieldId);
            if (! $scopedToCustomField->isGlobal()) {
                $global = false;
            }
        }

        $campaignKey = new CampaignKey($game, $name, $type, $global, $scopedToCustomField, $player);

        $this->entityManager->persist($campaignKey);
        $this->entityManager->flush();

        return $campaignKey;
    }
}
