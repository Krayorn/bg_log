import { useState } from "react"
import { createCustomField, deleteCustomField as apiDeleteCustomField, updateCustomFieldEnumValues, updateCustomFieldKind, copyCustomField, toggleCustomFieldShareable } from '../api/customFields'
import { X, Trash2 } from 'lucide-react'
import { AddEntryForm } from '../components/AddEntryForm'
import type { CustomField, CustomFieldType, Entry, Game, GameStats } from '../types'

const CUSTOM_FIELD_TYPES: CustomFieldType[] = ['string', 'number', 'enum']

type GameDetailPanelProps = {
    game: Game
    gameStats: GameStats | null
    playerId: string | null
    onEntryCreated: (newEntry: Entry) => void
    onGameUpdated: (game: Game) => void
    customFields: CustomField[]
    shareableFields: CustomField[]
    onCustomFieldsChanged: (myFields: CustomField[], shareableFields: CustomField[]) => void
    isAdmin: boolean
}

export function GameDetailPanel({ game, gameStats, playerId, onEntryCreated, customFields, shareableFields, onCustomFieldsChanged, isAdmin }: GameDetailPanelProps) {
    const [customFieldName, setCustomFieldName] = useState<string>("")
    const [customFieldType, setCustomFieldType] = useState<CustomFieldType | string>("")
    const [entrySpecific, setEntrySpecific] = useState<boolean>(false)
    const [customFieldMultiple, setCustomFieldMultiple] = useState<boolean>(false)
    const [errors, setErrors] = useState<string[]>([])
    const [newEnumValues, setNewEnumValues] = useState<{ [key: string]: string }>({})

    const addCustomField = async (e: React.FormEvent) => {
        e.preventDefault()

        if (customFieldType === "") {
            setErrors(['Type must be set.']);
            return
        }

        const { data, error, ok } = await createCustomField(game.id, {
            name: customFieldName,
            kind: customFieldType as CustomFieldType,
            scope: entrySpecific ? 'entry' : 'playerResult',
            multiple: customFieldMultiple
        })

        if (!ok || !data) {
            setErrors([error ?? 'Failed to add custom field']);
        } else {
            setCustomFieldName("")
            setCustomFieldType("")
            setCustomFieldMultiple(false)
            onCustomFieldsChanged([...customFields, data], shareableFields)
        }
    }

    const deleteCustomField = async (customFieldId: string) => {
        const { ok } = await apiDeleteCustomField(customFieldId)
        if (ok) {
            onCustomFieldsChanged(customFields.filter(cf => cf.id !== customFieldId), shareableFields)
        }
    }

    const addEnumValue = async (customField: CustomField) => {
        const val = (newEnumValues[customField.id] || '').trim()
        if (!val) return
        const newValues = [...customField.enumValues.map(v => v.value), val]
        const { data, ok } = await updateCustomFieldEnumValues(customField.id, newValues)
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
            setNewEnumValues(prev => ({ ...prev, [customField.id]: '' }))
        }
    }

    const removeEnumValue = async (customField: CustomField, enumValueId: string) => {
        const newValues = customField.enumValues.filter(v => v.id !== enumValueId).map(v => v.value)
        const { data, ok } = await updateCustomFieldEnumValues(customField.id, newValues)
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
        }
    }

    const convertCustomFieldKind = async (customField: CustomField, newKind: 'string' | 'enum') => {
        const { data, ok } = await updateCustomFieldKind(customField.id, newKind)
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
        }
    }

    const copyCustomFieldAction = async (customFieldId: string) => {
        const { data, ok } = await copyCustomField(customFieldId)
        if (ok && data) {
            onCustomFieldsChanged([...customFields, data], shareableFields)
        }
    }

    const toggleShareable = async (customField: CustomField) => {
        const { data, ok } = await toggleCustomFieldShareable(customField)
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
        }
    }

    if (gameStats === null) {
        return <div>Loading stylé</div>
    }

    return (
        <div className="flex flex-col">
            <section className="flex gap-6 mb-6 p-4 bg-slate-900/30 backdrop-blur-sm rounded-lg border border-slate-600/30">
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-cyan-400">{gameStats.entriesCount}</span>
                    <span className="text-xs text-slate-400">Games played</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-2xl font-bold text-cyan-400">{gameStats.winrate}%</span>
                    <span className="text-xs text-slate-400">Winrate</span>
                </div>
                {gameStats.owned && (
                    <div className="flex items-center">
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">In Library</span>
                    </div>
                )}
            </section>

            <section className="flex flex-col border border-slate-600/30 rounded-lg p-4 bg-slate-900/30 backdrop-blur-sm">
                <h1 className="text-center text-xl font-semibold mb-6 text-white" >Add New Entry</h1>
                <AddEntryForm
                    gameId={game.id}
                    playerId={playerId}
                    customFields={customFields}
                    onEntryCreated={onEntryCreated}
                />
            </section>

            <section className="flex flex-col mt-6 border border-slate-600 rounded-lg p-4" >
                <h1 className="text-center text-xl font-semibold mb-6 text-white" >Custom Fields</h1>

                <form className="flex flex-col mb-6" onSubmit={addCustomField} >
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                <label className="text-white text-sm font-medium">Field Name</label>
                                <input
                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                    placeholder="Enter field name..."
                                    name="name"
                                    onChange={e => setCustomFieldName(e.target.value)}
                                    value={customFieldName}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-white text-sm font-medium">Scope</label>
                                <div className="flex rounded overflow-hidden border border-slate-500">
                                    <button
                                        type="button"
                                        onClick={() => setEntrySpecific(true)}
                                        className={`px-4 py-2 text-sm transition-colors ${entrySpecific ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                    >
                                        Entry
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEntrySpecific(false)}
                                        className={`px-4 py-2 text-sm transition-colors ${!entrySpecific ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                    >
                                        Player
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                            <div className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                <label className="text-white text-sm font-medium">Field Type</label>
                                <select
                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                                    name="type"
                                    value={customFieldType}
                                    onChange={e => setCustomFieldType(e.target.value)}
                                >
                                    <option value="" disabled>Select type...</option>
                                    {CUSTOM_FIELD_TYPES.map(opt => <option key={opt}>{opt}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-white text-sm font-medium">Multiple values</label>
                                <div className="flex items-center h-[42px]">
                                    <button
                                        type="button"
                                        onClick={() => setCustomFieldMultiple(!customFieldMultiple)}
                                        className={`relative w-11 h-6 rounded-full transition-colors ${customFieldMultiple ? 'bg-cyan-500/40 border-cyan-400/60' : 'bg-slate-700 border-slate-500'} border`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all ${customFieldMultiple ? 'translate-x-5 bg-cyan-400 shadow-[0_0_6px_rgba(0,200,255,0.5)]' : 'bg-slate-400'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                        {errors.length > 0 && (
                            <div className="text-red-400 text-center">
                                {errors.map(err => (<span key={err}>{err}</span>))}
                            </div>
                        )}
                        <button
                            className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium self-center transition-colors"
                            type="submit"
                        >
                            Add Custom Field
                        </button>
                    </div>
                </form>

                {customFields.length > 0 && (
                    <>
                        <hr className="border-slate-600 mb-4" />
                        <h2 className="text-white font-medium mb-3">Existing Fields</h2>
                        <div className="flex flex-wrap gap-3">
                            {customFields.map(customField => (
                                <div key={customField.id} className="border border-slate-500 rounded-lg p-3 bg-slate-800/50 flex flex-col gap-1 min-w-[180px]">
                                    <div className="flex justify-between items-start">
                                        <span className="text-white font-medium">{customField.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteCustomField(customField.id)}
                                            className="text-slate-400 hover:text-red-400 transition-colors"
                                            title="Delete custom field"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{customField.kind}</span>
                                        <span className={`px-2 py-0.5 rounded ${customField.scope === 'entry' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                                            {customField.scope === 'entry' ? 'Entry' : 'Player'}
                                        </span>
                                        {customField.multiple && (
                                            <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">list</span>
                                        )}
                                        {customField.originCustomField && (
                                            <span className="px-2 py-0.5 rounded bg-cyan-900/50 text-cyan-300">copied</span>
                                        )}
                                        {!customField.originCustomField && customField.kind === 'string' && (
                                            <button
                                                type="button"
                                                onClick={() => convertCustomFieldKind(customField, 'enum')}
                                                className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 transition-colors"
                                            >
                                                → enum
                                            </button>
                                        )}
                                        {!customField.originCustomField && customField.kind === 'enum' && (
                                            <button
                                                type="button"
                                                onClick={() => convertCustomFieldKind(customField, 'string')}
                                                className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 transition-colors"
                                            >
                                                → string
                                            </button>
                                        )}
                                    </div>
                                    {isAdmin && !customField.originCustomField && (
                                        <button
                                            type="button"
                                            onClick={() => toggleShareable(customField)}
                                            className={`mt-1 px-2 py-0.5 rounded text-xs transition-colors self-start ${customField.shareable ? 'bg-emerald-900/50 text-emerald-300 hover:bg-red-900/50 hover:text-red-300' : 'bg-slate-700 text-slate-400 hover:bg-emerald-900/50 hover:text-emerald-300'}`}
                                        >
                                            {customField.shareable ? 'Shared ✓' : 'Make shareable'}
                                        </button>
                                    )}
                                    {customField.kind === 'enum' && (
                                        <div className="mt-2 border-t border-slate-600 pt-2">
                                            <span className="text-slate-400 text-xs">Allowed Values</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {customField.enumValues.map(ev => (
                                                    <span key={ev.id} className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                                                        {ev.value}
                                                        {!customField.originCustomField && (
                                                            <button onClick={() => removeEnumValue(customField, ev.id)} className="text-slate-500 hover:text-red-400">
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                            {!customField.originCustomField && (
                                                <div className="flex gap-1 mt-2">
                                                    <input
                                                        className="p-1 rounded bg-slate-700 text-white border border-slate-500 text-xs placeholder-slate-400 flex-1"
                                                        placeholder="New value..."
                                                        value={newEnumValues[customField.id] || ''}
                                                        onChange={e => setNewEnumValues(prev => ({ ...prev, [customField.id]: e.target.value }))}
                                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEnumValue(customField) } }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => addEnumValue(customField)}
                                                        className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-white text-xs transition-colors"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {shareableFields.length > 0 && (
                    <>
                        <hr className="border-slate-600 my-4" />
                        <h2 className="text-white font-medium mb-3">Available Shared Fields</h2>
                        <div className="flex flex-wrap gap-3">
                            {shareableFields.map(customField => (
                                <div key={customField.id} className="border border-cyan-500/30 rounded-lg p-3 bg-cyan-900/10 flex flex-col gap-1 min-w-[180px]">
                                    <div className="flex justify-between items-start">
                                        <span className="text-white font-medium">{customField.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => copyCustomFieldAction(customField.id)}
                                            className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{customField.kind}</span>
                                        <span className={`px-2 py-0.5 rounded ${customField.scope === 'entry' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                                            {customField.scope === 'entry' ? 'Entry' : 'Player'}
                                        </span>
                                        {customField.multiple && (
                                            <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-300">list</span>
                                        )}
                                    </div>
                                    {customField.kind === 'enum' && customField.enumValues.length > 0 && (
                                        <div className="mt-2 border-t border-cyan-500/20 pt-2">
                                            <span className="text-slate-400 text-xs">Values</span>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {customField.enumValues.map(ev => (
                                                    <span key={ev.id} className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs">
                                                        {ev.value}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
