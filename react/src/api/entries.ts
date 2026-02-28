import { apiPost, apiPatch, apiDelete } from '../hooks/useApi'
import type { Entry } from '../types'

export const createEntry = (payload: Record<string, unknown>) =>
    apiPost<Entry>('/entries', payload)

export const patchEntry = (entryId: string, payload: Record<string, unknown>) =>
    apiPatch<Entry>(`/entries/${entryId}`, payload)

export const deleteEntry = (entryId: string) =>
    apiDelete(`/entries/${entryId}`)
