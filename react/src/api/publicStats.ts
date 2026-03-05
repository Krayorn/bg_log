import { apiGet } from '../hooks/useApi'
import type { PublicStats } from '../types'

export const getPublicStats = () =>
    apiGet<PublicStats>('/public/stats')
