import { apiPost } from '../hooks/useApi'

export const login = (credentials: Record<string, FormDataEntryValue>) =>
    apiPost<{ token: string }>('/login_check', credentials)

export const register = (body: { username: FormDataEntryValue; password: FormDataEntryValue }) =>
    apiPost('/register', body)
