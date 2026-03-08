<?php

namespace App\Campaign\Action;

use App\Campaign\Campaign;
use App\Campaign\CampaignEvent\CampaignEvent;
use App\Campaign\CampaignEvent\CampaignEventVerb;
use App\Campaign\CampaignEvent\CampaignKeyNotFoundException;
use App\Campaign\CampaignEvent\CampaignKeyNotInGameException;
use App\Campaign\CampaignEvent\CustomFieldValueNotFoundException;
use App\Campaign\CampaignEvent\EntryNotFoundException;
use App\Campaign\CampaignEvent\EntryNotInCampaignException;
use App\Campaign\CampaignEvent\InvalidVerbException;
use App\Campaign\CampaignEvent\PlayerResultNotFoundException;
use App\Campaign\CampaignEvent\PlayerResultRequiredException;
use App\Entry\EntryRepository;
use App\Game\CampaignKey\CampaignKey;
use App\Game\CustomField\CustomField;
use App\Game\CustomField\CustomFieldScope;
use Doctrine\ORM\EntityManagerInterface;

class CreateCampaignEventHandler
{
    public function __construct(
        private readonly EntryRepository $entryRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    /**
     * @param array<string, mixed> $payload
     */
    public function handle(
        Campaign $campaign,
        string $entryId,
        string $campaignKeyId,
        array $payload,
        ?string $playerResultId = null,
        ?string $customFieldValueId = null,
    ): CampaignEvent {
        $entry = $this->entryRepository->find($entryId);
        if ($entry === null) {
            throw new EntryNotFoundException('Entry not found');
        }

        if ($entry->getCampaign() === null || ! $entry->getCampaign()->getId()->equals($campaign->getId())) {
            throw new EntryNotInCampaignException('Entry does not belong to this campaign');
        }

        $campaignKey = $this->entityManager->getRepository(CampaignKey::class)->find($campaignKeyId);
        if (! $campaignKey instanceof CampaignKey) {
            throw new CampaignKeyNotFoundException('Campaign key not found');
        }

        if (! $campaignKey->getGame()->getId()->equals($campaign->getGame()->getId())) {
            throw new CampaignKeyNotInGameException('Campaign key does not belong to this game');
        }

        $verbString = $payload['verb'] ?? null;
        $verb = $verbString !== null ? CampaignEventVerb::tryFrom($verbString) : null;
        if (! $verb instanceof CampaignEventVerb) {
            throw new InvalidVerbException('Invalid or missing verb');
        }

        $verb->validatePayload($campaignKey->getType(), $payload);

        $playerResult = null;
        if ($campaignKey->getScope() !== CustomFieldScope::ENTRY) {
            if ($playerResultId === null) {
                throw new PlayerResultRequiredException('Player result is required for player-scoped keys');
            }

            foreach ($entry->getPlayerResults() as $pr) {
                if ((string) $pr->id === $playerResultId) {
                    $playerResult = $pr;
                    break;
                }
            }

            if ($playerResult === null) {
                throw new PlayerResultNotFoundException('Player result not found in this entry');
            }
        }

        $customFieldValue = null;
        $scopedCustomField = $campaignKey->getScopedToCustomField();
        if ($scopedCustomField instanceof CustomField && $playerResult !== null) {
            if ($customFieldValueId !== null) {
                foreach ($playerResult->getCustomFieldValues() as $cfv) {
                    if ((string) $cfv->getId() === $customFieldValueId) {
                        if ((string) $cfv->getCustomField()->getId() !== (string) $scopedCustomField->getId()) {
                            throw new CustomFieldValueNotFoundException('The provided custom field value does not belong to the expected custom field');
                        }
                        $customFieldValue = $cfv;
                        break;
                    }
                }
                if ($customFieldValue === null) {
                    throw new CustomFieldValueNotFoundException('The provided custom field value was not found in the player result');
                }
            } else {
                foreach ($playerResult->getCustomFieldValues() as $cfv) {
                    if ((string) $cfv->getCustomField()->getId() === (string) $scopedCustomField->getId()) {
                        $customFieldValue = $cfv;
                        break;
                    }
                }
                if ($customFieldValue === null) {
                    throw new CustomFieldValueNotFoundException('Player does not have a value for the scoped custom field on this entry');
                }
            }
        }

        $event = new CampaignEvent($campaign, $entry, $playerResult, $campaignKey, $payload, $customFieldValue);

        $this->entityManager->persist($event);
        $this->entityManager->flush();

        return $event;
    }
}
