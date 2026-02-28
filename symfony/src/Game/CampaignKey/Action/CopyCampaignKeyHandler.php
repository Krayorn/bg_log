<?php

namespace App\Game\CampaignKey\Action;

use App\Game\CampaignKey\CampaignKey;
use App\Game\CampaignKey\CampaignKeyRepository;
use App\Game\CampaignKey\Exception\DuplicateCampaignKeyException;
use App\Game\CampaignKey\Exception\NotShareableCampaignKeyException;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldRepository;
use App\Player\Player;
use Doctrine\ORM\EntityManagerInterface;

class CopyCampaignKeyHandler
{
    public function __construct(
        private readonly CampaignKeyRepository $campaignKeyRepository,
        private readonly CustomFieldRepository $customFieldRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function handle(CampaignKey $campaignKey, Player $player): CampaignKey
    {
        if (! $campaignKey->isShareable()) {
            throw new NotShareableCampaignKeyException();
        }

        $alreadyExist = $this->campaignKeyRepository->findOneBy([
            'game' => $campaignKey->getGame(),
            'name' => $campaignKey->getName(),
            'player' => $player,
        ]);

        if ($alreadyExist !== null) {
            throw new DuplicateCampaignKeyException();
        }

        $scopedToCustomField = $campaignKey->getScopedToCustomField();
        $copiedCustomField = null;

        if ($scopedToCustomField instanceof CustomField) {
            $existingCopy = $this->customFieldRepository->findOneBy([
                'game' => $campaignKey->getGame(),
                'originCustomField' => $scopedToCustomField,
                'player' => $player,
            ]);

            if ($existingCopy !== null) {
                $copiedCustomField = $existingCopy;
            } elseif ($scopedToCustomField->getPlayer() instanceof Player
                && $scopedToCustomField->getPlayer()->getId()->equals($player->getId())) {
                $copiedCustomField = $scopedToCustomField;
            } else {
                $copiedCustomField = new CustomField(
                    $scopedToCustomField->getGame(),
                    $scopedToCustomField->getName(),
                    $scopedToCustomField->getKind()->value,
                    $scopedToCustomField->getScope(),
                    $scopedToCustomField->isMultiple(),
                    $player,
                    false,
                    $scopedToCustomField,
                );

                $this->entityManager->persist($copiedCustomField);

                $originalView = $scopedToCustomField->view();
                if ($originalView['enumValues'] !== []) {
                    $enumValues = array_map(fn ($v) => $v['value'], $originalView['enumValues']);
                    $copiedCustomField->syncEnumValues($enumValues, $this->entityManager, true);
                }
            }
        }

        $copy = new CampaignKey(
            $campaignKey->getGame(),
            $campaignKey->getName(),
            $campaignKey->getType()->value,
            $campaignKey->getScope(),
            $copiedCustomField,
            $player,
            false,
            $campaignKey,
        );

        $this->entityManager->persist($copy);
        $this->entityManager->flush();

        return $copy;
    }
}
