import { apiPost, apiPatch } from '../hooks/useApi'
import type { Game, PlayerGameStats } from '../types'

export const createGame = (name: string) =>
    apiPost<Game>('/games', { name })

export const addGameToLibrary = (playerId: string, body: { gameId: string; price?: number }) =>
    apiPost<PlayerGameStats>(`/players/${playerId}/games`, body)

export const updateOwnedGame = (playerId: string, gameOwnedId: string, body: { name?: string; price?: number | null }) =>
    apiPatch<PlayerGameStats>(`/players/${playerId}/games/${gameOwnedId}`, body)
