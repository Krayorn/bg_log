import { useState, useEffect, useCallback } from 'react'
import { apiGet } from './useApi'

interface QueryResult<T> {
    data: T | null
    loading: boolean
    error: string | null
    refetch: () => void
}

export function useQuery<T>(uri: string | null): QueryResult<T> {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [tick, setTick] = useState(0)

    const refetch = useCallback(() => setTick(t => t + 1), [])

    useEffect(() => {
        if (!uri) return

        let ignore = false
        setLoading(true)

        apiGet<T>(uri).then(res => {
            if (ignore) return
            if (res.ok) {
                setData(res.data)
                setError(null)
            } else {
                setError(res.error)
            }
            setLoading(false)
        })

        return () => { ignore = true }
    }, [uri, tick])

    return { data, loading, error, refetch }
}
