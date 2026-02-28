import { apiPost, apiPatch, apiPut, apiDelete, apiGet } from '../hooks/useApi'
import type { Player } from '../types'

type PlayerOption = { id: string; name: string; nickname?: string | null }

export const createPlayer = (name: string) =>
    apiPost<Player>('/players', { name })

export const createPlayerOption = (name: string) =>
    apiPost<PlayerOption>('/players', { name })

export const synchronizePlayer = (guestId: string, registeredPlayerId: string) =>
    apiPost(`/players/${guestId}/synchronize`, { registeredPlayerId })

export const updatePlayerEmail = (playerId: string, email: string) =>
    apiPatch<Player>(`/players/${playerId}`, { email })

export const setNickname = (targetPlayerId: string, nickname: string) =>
    apiPut<{ nickname: string }>(`/players/${targetPlayerId}/nickname`, { nickname })

export const removeNickname = (targetPlayerId: string) =>
    apiDelete(`/players/${targetPlayerId}/nickname`)

export const searchPlayers = (query: string) =>
    apiGet<PlayerOption[]>(`/players?q=${encodeURIComponent(query)}`)
