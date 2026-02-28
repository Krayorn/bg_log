import { apiGet, apiPost, apiPut, apiDelete } from '../hooks/useApi'
import type { SavedQuery, StatsResult } from '../types'

export const getSavedQueries = (gameId: string, playerId: string) =>
    apiGet<SavedQuery[]>(`/statisticsQueries?gameId=${gameId}&playerId=${playerId}`)

export const createSavedQuery = (body: Record<string, unknown>) =>
    apiPost<SavedQuery>('/statisticsQueries', body)

export const updateSavedQuery = (id: string, body: Omit<SavedQuery, 'id'>) =>
    apiPut<SavedQuery>(`/statisticsQueries/${id}`, body)

export const deleteSavedQuery = (id: string) =>
    apiDelete(`/statisticsQueries/${id}`)

export const executeStatsQuery = (params: URLSearchParams) =>
    apiGet<StatsResult>(`/statisticsQueries/execute?${params.toString()}`)
