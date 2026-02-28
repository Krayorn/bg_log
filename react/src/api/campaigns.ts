import { apiGet, apiPost, apiPatch, apiDelete } from '../hooks/useApi'
import type { Campaign, CampaignKey, Entry } from '../types'

export const createCampaign = (body: { name: string; game: string }) =>
    apiPost<Campaign>('/campaigns', body)

export const updateCampaignName = (campaignId: string, name: string) =>
    apiPatch<Campaign>(`/campaigns/${campaignId}`, { name })

export const addCampaignEvent = (campaignId: string, body: Record<string, unknown>) =>
    apiPost<Campaign>(`/campaigns/${campaignId}/events`, body)

export const deleteCampaignEvent = (campaignId: string, eventId: string) =>
    apiDelete<Campaign>(`/campaigns/${campaignId}/events/${eventId}`)

export const getLastCampaignEntry = (campaignId: string) =>
    apiGet<Entry>(`/campaigns/${campaignId}/last-entry`)

export const getCampaignKeys = (gameId: string) =>
    apiGet<{ myKeys: CampaignKey[]; shareableKeys: CampaignKey[] }>(`/game/${gameId}/campaignKeys`)

export const createCampaignKey = (gameId: string, body: Record<string, unknown>) =>
    apiPost<CampaignKey>(`/game/${gameId}/campaignKeys`, body)

export const deleteCampaignKey = (keyId: string) =>
    apiDelete(`/campaignKeys/${keyId}`)

export const toggleCampaignKeyShareable = (key: CampaignKey) =>
    apiPatch<CampaignKey>(`/campaignKeys/${key.id}`, { shareable: !key.shareable })

export const copyCampaignKey = (keyId: string) =>
    apiPost<CampaignKey>(`/campaignKeys/${keyId}/copy`)
