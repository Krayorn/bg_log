import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useLocalStorage, parseJwt } from '../hooks/useLocalStorage'
import { useRequest } from '../hooks/useRequest'
import { getDisplayName } from '../utils/displayName'

type CirclePlayer = { id: string; name: string; nickname?: string | null; isGuest?: boolean }

type CircleContextType = {
    players: CirclePlayer[]
    displayName: (id: string, fallbackName?: string) => string
    addPlayer: (player: CirclePlayer) => void
    refreshPlayers: () => void
}

const CircleContext = createContext<CircleContextType>({
    players: [],
    displayName: (_, fallback) => fallback ?? '',
    addPlayer: () => {},
    refreshPlayers: () => {},
})

export function CircleProvider({ children }: { children: ReactNode }) {
    const [token] = useLocalStorage('jwt', null)
    const playerId = token ? parseJwt(token).id : null
    const [players, setPlayers] = useState<CirclePlayer[]>([])
    const [refreshKey, setRefreshKey] = useState(0)

    useRequest(`/players/${playerId}/circle?includeSelf=true`, [playerId, refreshKey], setPlayers, !!playerId)

    const displayName = useCallback((id: string, fallbackName?: string) => {
        const found = players.find(p => p.id === id)
        if (!found) return fallbackName ?? id
        return getDisplayName(found.name, found.nickname)
    }, [players])

    const addPlayer = useCallback((player: CirclePlayer) => {
        setPlayers(prev => {
            if (prev.some(p => p.id === player.id)) return prev
            return [...prev, player]
        })
    }, [])

    const refreshPlayers = useCallback(() => {
        setRefreshKey(k => k + 1)
    }, [])

    return (
        <CircleContext.Provider value={{ players, displayName, addPlayer, refreshPlayers }}>
            {children}
        </CircleContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCircle = () => useContext(CircleContext)
