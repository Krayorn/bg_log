const host = import.meta.env.VITE_API_HOST

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface ApiResponse<T> {
    data: T | null
    error: string | null
    ok: boolean
}

function getToken(): string | null {
    const stored = localStorage.getItem('jwt')
    if (!stored) return null
    try {
        return JSON.parse(stored)
    } catch {
        return null
    }
}

export async function api<T = unknown>(
    uri: string,
    method: HttpMethod = 'GET',
    body?: unknown
): Promise<ApiResponse<T>> {
    const token = getToken()
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    try {
        const response = await fetch(`${host}${uri}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        })

        if (response.status === 204) {
            return { data: null, error: null, ok: true }
        }

        const data = await response.json()

        if (!response.ok) {
            const errorMsg = data.error
                ?? (Array.isArray(data.errors) ? data.errors.join(', ') : null)
                ?? data.message
                ?? 'Request failed'

            return {
                data: null,
                error: errorMsg,
                ok: false,
            }
        }

        return { data, error: null, ok: true }
    } catch {
        return { data: null, error: 'Network error', ok: false }
    }
}

export const apiGet = <T = unknown>(uri: string) => api<T>(uri, 'GET')
export const apiPost = <T = unknown>(uri: string, body?: unknown) => api<T>(uri, 'POST', body)
export const apiPut = <T = unknown>(uri: string, body?: unknown) => api<T>(uri, 'PUT', body)
export const apiPatch = <T = unknown>(uri: string, body?: unknown) => api<T>(uri, 'PATCH', body)
export const apiDelete = <T = unknown>(uri: string) => api<T>(uri, 'DELETE')
