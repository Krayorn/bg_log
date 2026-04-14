import { useParams } from 'react-router-dom'
import { parseJwt } from './useLocalStorage'

export function useIsOwner(): boolean {
    const { playerId } = useParams() as { playerId?: string }
    if (!playerId) return true

    try {
        const token = window.localStorage.getItem('jwt')
        if (!token) return false
        const decoded = parseJwt(JSON.parse(token))
        return decoded.id === playerId
    } catch {
        return false
    }
}
