import { apiGet, apiPost, apiPatch, apiDelete } from '../hooks/useApi'
import type { CustomField, CustomFieldScope, CustomFieldType } from '../types'

export const getGameCustomFields = (gameId: string) =>
    apiGet<{ myFields: CustomField[]; shareableFields: CustomField[] }>(`/game/${gameId}/customFields`)

export const createCustomField = (gameId: string, body: { name: string; kind: CustomFieldType; scope: CustomFieldScope; multiple: boolean }) =>
    apiPost<CustomField>(`/game/${gameId}/customFields`, body)

export const deleteCustomField = (customFieldId: string) =>
    apiDelete(`/customFields/${customFieldId}`)

export const updateCustomFieldEnumValues = (customFieldId: string, enumValues: string[]) =>
    apiPatch<CustomField>(`/customFields/${customFieldId}`, { enumValues })

export const updateCustomFieldKind = (customFieldId: string, kind: 'string' | 'enum') =>
    apiPatch<CustomField>(`/customFields/${customFieldId}`, { kind })

export const copyCustomField = (customFieldId: string) =>
    apiPost<CustomField>(`/customFields/${customFieldId}/copy`)

export const toggleCustomFieldShareable = (customField: CustomField) =>
    apiPatch<CustomField>(`/customFields/${customField.id}`, { shareable: !customField.shareable })
