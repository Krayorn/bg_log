import { apiGet, apiPost, apiDelete } from '../hooks/useApi'
import type { AdminStats, AdminUser } from '../types'

export const getAdminStats = () =>
    apiGet<AdminStats>('/admin/stats')

export const getAdminUsers = () =>
    apiGet<AdminUser[]>('/admin/users')

export const deleteAdminUser = (playerId: string) =>
    apiDelete(`/admin/users/${playerId}`)

export const toggleAdminRole = (playerId: string) =>
    apiPost<AdminUser>(`/admin/users/${playerId}/toggle-admin`)
