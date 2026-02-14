import { useState, useEffect } from "react"
import { useRequest } from '../hooks/useRequest'
import { apiPost, apiDelete, apiPatch, apiGet } from '../hooks/useApi'
import { v4 as uuidv4 } from 'uuid'
import PlayerSearchSelect from '../components/PlayerSearchSelect'
import EnumSelect from '../components/EnumSelect'
import MultiEnumSelect from "../components/MultiEnumSelect"
import { X, UserPlus, Trash2, RotateCcw } from 'lucide-react'

enum CustomFieldType {
    string = "string",
    number = 'number',
    enum = 'enum',
}

type CustomField = {
    kind: CustomFieldType
    name: string
    global: boolean
    id: string
    multiple: boolean
    enumValues: { id: string; value: string }[]
    player: string | null
    shareable: boolean
    originCustomField: string | null
}

type CustomFieldValue = {
    id: string
    value: string | number | boolean
    customField: CustomField
}

type PlayerResult = {
    id: string
    note: string
    won: boolean | null
    player: {
        name: string
        id: string
    }
    customFields: CustomFieldValue[]
}

type Entry = {
    id: string
    note: string
    players: PlayerResult[]
    playedAt: {
        date: string
    }
    createdAt: {
        date: string
    }
    customFields: CustomFieldValue[]
}

type Game = {
    name: string
    id: string
}

type GameStats = {
    entriesCount: number
    owned: boolean
    winrate: string
}

type GameOwner = {
    id: string
    player: {
        id: string
        name: string
    }
}

type PlayerEntry = {
    genId: string
    id: string
    note: string
    won: boolean
    customFields: { [key: string]: string | string[] }
}

type Campaign = {
    id: string
    name: string
}

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

    const [playersList, setPlayersList] = useState<{ id: string, name: string }[]>([])
    const [gameOwners, setGameOwners] = useState<GameOwner[]>([])

    const [entryNote, setEntryNote] = useState("")
    const [entryPlayedAt, setEntryPlayedAt] = useState("")
    const [entryGameUsed, setEntryGameUsed] = useState("")
    const [entryCustomFields, setEntryCustomFields] = useState<{ [key: string]: string | string[] }>({})
    const [entryPlayers, setEntryPlayers] = useState<PlayerEntry[]>([])
    const [entryErrors, setEntryErrors] = useState<string[]>([])
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [entryCampaign, setEntryCampaign] = useState("")

    useRequest(`/players?forPlayer=${playerId}`, [playerId], setPlayersList, !!playerId)
    useRequest(`/games/${game.id}/owners`, [game.id], setGameOwners)
    useRequest(`/campaigns?game=${game.id}`, [game.id], setCampaigns)

    const [initialPlayerSet, setInitialPlayerSet] = useState(false)
    useEffect(() => {
        if (playerId && playersList.length > 0 && !initialPlayerSet) {
            const currentPlayer = playersList.find(p => p.id === playerId)
            if (currentPlayer) {
                setEntryPlayers([{ genId: uuidv4(), id: currentPlayer.id, note: "", won: false, customFields: {} }])
            }
            setInitialPlayerSet(true)
        }
    }, [playersList, playerId, initialPlayerSet])

    const currentPlayerOwnership = gameOwners.find(go => go.player.id === playerId)
    const defaultGameUsed = currentPlayerOwnership?.id || ""

    const addCustomField = async (e: React.FormEvent) => {
        e.preventDefault()

        if (customFieldType === "") {
            setErrors(['Type must be set.']);
            return
        }

        const { data, error, ok } = await apiPost<CustomField>(`/game/${game.id}/customFields`, {
            name: customFieldName,
            kind: customFieldType,
            global: entrySpecific,
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
        const { ok } = await apiDelete(`/customFields/${customFieldId}`)
        if (ok) {
            onCustomFieldsChanged(customFields.filter(cf => cf.id !== customFieldId), shareableFields)

            setEntryCustomFields(prev => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [customFieldId]: _removed, ...rest } = prev
                return rest
            })
            setEntryPlayers(prev => prev.map(p => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [customFieldId]: _removed, ...rest } = p.customFields
                return { ...p, customFields: rest }
            }))
        }
    }

    const addEnumValue = async (customField: CustomField) => {
        const val = (newEnumValues[customField.id] || '').trim()
        if (!val) return
        const newValues = [...customField.enumValues.map(v => v.value), val]
        const { data, ok } = await apiPatch<CustomField>(`/customFields/${customField.id}`, { enumValues: newValues })
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
            setNewEnumValues(prev => ({ ...prev, [customField.id]: '' }))
        }
    }

    const removeEnumValue = async (customField: CustomField, enumValueId: string) => {
        const newValues = customField.enumValues.filter(v => v.id !== enumValueId).map(v => v.value)
        const { data, ok } = await apiPatch<CustomField>(`/customFields/${customField.id}`, { enumValues: newValues })
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
        }
    }

    const convertCustomFieldKind = async (customField: CustomField, newKind: 'string' | 'enum') => {
        const { data, ok } = await apiPatch<CustomField>(`/customFields/${customField.id}`, { kind: newKind })
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
        }
    }

    const copyCustomField = async (customFieldId: string) => {
        const { data, ok } = await apiPost<CustomField>(`/customFields/${customFieldId}/copy`)
        if (ok && data) {
            onCustomFieldsChanged([...customFields, data], shareableFields)
        }
    }

    const toggleShareable = async (customField: CustomField) => {
        const { data, ok } = await apiPatch<CustomField>(`/customFields/${customField.id}`, { shareable: !customField.shareable })
        if (ok && data) {
            onCustomFieldsChanged(customFields.map(cf => cf.id === data.id ? data : cf), shareableFields)
        }
    }

    const addPlayerToEntry = (e: React.MouseEvent) => {
        e.preventDefault()
        setEntryPlayers([...entryPlayers, { genId: uuidv4(), id: "", note: "", won: false, customFields: {} }])
    }

    const removePlayerFromEntry = (genId: string) => {
        setEntryPlayers(entryPlayers.filter(p => p.genId !== genId))
    }

    const updatePlayer = (genId: string, field: string, value: string | boolean) => {
        setEntryPlayers(entryPlayers.map(p => {
            if (p.genId !== genId) return p
            return { ...p, [field]: value }
        }))
    }

    const updatePlayerCustomField = (genId: string, customFieldId: string, value: string | string[]) => {
        setEntryPlayers(entryPlayers.map(p => {
            if (p.genId !== genId) return p
            return { ...p, customFields: { ...p.customFields, [customFieldId]: value } }
        }))
    }

    const updateEntryCustomField = (customFieldId: string, value: string | string[]) => {
        setEntryCustomFields({ ...entryCustomFields, [customFieldId]: value })
    }

    const loadFromLastGame = async () => {
        if (!entryCampaign) return
        const { data, ok } = await apiGet<Entry>(`/campaigns/${entryCampaign}/last-entry`)
        if (!ok || !data) return

        const newPlayers: PlayerEntry[] = data.players.map(p => ({
            genId: uuidv4(),
            id: p.player.id,
            note: "",
            won: false,
            customFields: (() => {
                const grouped: { [key: string]: string | string[] } = {}
                for (const cf of p.customFields) {
                    const id = cf.customField.id
                    if (cf.customField.multiple) {
                        if (!grouped[id]) grouped[id] = []
                        ;(grouped[id] as string[]).push(String(cf.value))
                    } else {
                        grouped[id] = String(cf.value)
                    }
                }
                return grouped
            })()
        }))
        setEntryPlayers(newPlayers)

        setEntryCustomFields((() => {
            const grouped: { [key: string]: string | string[] } = {}
            for (const cf of data.customFields) {
                const id = cf.customField.id
                if (cf.customField.multiple) {
                    if (!grouped[id]) grouped[id] = []
                    ;(grouped[id] as string[]).push(String(cf.value))
                } else {
                    grouped[id] = String(cf.value)
                }
            }
            return grouped
        })())

        const existingIds = new Set(playersList.map(p => p.id))
        const missingPlayers = data.players
            .filter(p => !existingIds.has(p.player.id))
            .map(p => ({ id: p.player.id, name: p.player.name }))
        if (missingPlayers.length > 0) {
            setPlayersList(prev => [...prev, ...missingPlayers])
        }
    }

    const submitEntry = async (e: React.FormEvent) => {
        e.preventDefault()
        setEntryErrors([])

        if (!entryPlayedAt) {
            setEntryErrors(['Please set a date.'])
            return
        }

        if (entryPlayers.length === 0) {
            setEntryErrors(['Please add at least one player.'])
            return
        }

        for (const p of entryPlayers) {
            if (!p.id) {
                setEntryErrors(['All players must be selected.'])
                return
            }
        }

        const payload = {
            game: game.id,
            note: entryNote,
            playedAt: entryPlayedAt + 'T12:00:00+02:00',
            gameUsed: entryGameUsed || defaultGameUsed || null,
            campaign: entryCampaign || null,
            customFields: Object.entries(entryCustomFields)
                .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value !== '')
                .map(([id, value]) => ({ id, value })),
            players: entryPlayers.map(p => ({
                id: p.id,
                note: p.note,
                won: p.won,
                customFields: Object.entries(p.customFields)
                    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value !== '')
                    .map(([id, value]) => ({ id, value }))
            }))
        }

        const { data, error, ok } = await apiPost<Entry>('/entries', payload)

        if (!ok || !data) {
            setEntryErrors([error ?? 'Failed to create entry.'])
        } else {
            setEntryNote("")
            setEntryPlayedAt("")
            setEntryGameUsed("")
            setEntryCustomFields({})
            setEntryCampaign("")
            const currentPlayer = playerId ? playersList.find(p => p.id === playerId) : null
            if (currentPlayer) {
                setEntryPlayers([{ genId: uuidv4(), id: currentPlayer.id, note: "", won: false, customFields: {} }])
            } else {
                setEntryPlayers([])
            }
            onEntryCreated(data)
        }
    }

    if (gameStats === null) {
        return <div>Loading stylé</div>
    }

    const sortedCustomFields = [...customFields].sort((a, b) => a.name.localeCompare(b.name))
    const globalCustomFields = sortedCustomFields.filter(c => c.global)
    const playerCustomFields = sortedCustomFields.filter(c => !c.global)

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
                <form className="flex flex-col" onSubmit={submitEntry} >
                    <div className="flex flex-col gap-4 mb-6">
                        <div className="flex flex-col gap-1">
                            <label className="text-white text-sm font-medium">Date Played</label>
                            <input
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                                type="date"
                                value={entryPlayedAt}
                                onChange={e => setEntryPlayedAt(e.target.value)}
                            />
                        </div>
                        {gameOwners.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-white text-sm font-medium">Game Copy Used</label>
                                <select
                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                                    value={entryGameUsed || defaultGameUsed}
                                    onChange={e => setEntryGameUsed(e.target.value)}
                                >
                                    <option value="">No specific copy used</option>
                                    {gameOwners.map(go => (
                                        <option key={go.id} value={go.id}>
                                            {go.player.name}'s copy {go.player.id === playerId ? '(yours)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {campaigns.length > 0 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-white text-sm font-medium">Campaign</label>
                                <div className="flex gap-2">
                                    <select
                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 flex-1"
                                        value={entryCampaign}
                                        onChange={e => setEntryCampaign(e.target.value)}
                                    >
                                        <option value="">No campaign</option>
                                        {campaigns.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    {entryCampaign && (
                                        <button
                                            type="button"
                                            onClick={loadFromLastGame}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white text-sm transition-colors whitespace-nowrap"
                                            title="Prefill players and custom fields from the last entry in this campaign"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Load from last game
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <label className="text-white text-sm font-medium">Session Notes</label>
                            <textarea
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                value={entryNote}
                                onChange={e => setEntryNote(e.target.value)}
                                placeholder="Notes about the game session..."
                                rows={3}
                            />
                        </div>
                        {globalCustomFields.length > 0 && (
                            <div className="border border-slate-500 p-4 rounded-lg bg-slate-800/50">
                                <h3 className="text-white font-medium mb-3">Entry Custom Fields</h3>
                                <div className="flex flex-wrap gap-3">
                                    {globalCustomFields.map(cf => (
                                        <div key={cf.id} className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                            <label className="text-slate-300 text-xs">{cf.name}</label>
                                            {cf.multiple ? (
                                                cf.kind === 'enum' ? (
                                                    <MultiEnumSelect
                                                        options={cf.enumValues.map(v => v.value)}
                                                        selected={Array.isArray(entryCustomFields[cf.id]) ? (entryCustomFields[cf.id] as string[]) : []}
                                                        onChange={values => updateEntryCustomField(cf.id, values)}
                                                        placeholder={`Select ${cf.name.toLowerCase()}...`}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {(Array.isArray(entryCustomFields[cf.id])
                                                            ? (entryCustomFields[cf.id] as string[])
                                                            : entryCustomFields[cf.id] ? [entryCustomFields[cf.id] as string] : ['']
                                                        ).map((val, idx) => (
                                                            <div key={idx} className="flex gap-1">
                                                                <input
                                                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 flex-1"
                                                                    type={cf.kind === 'number' ? 'number' : 'text'}
                                                                    placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                                    value={val}
                                                                    onChange={e => {
                                                                        const current = Array.isArray(entryCustomFields[cf.id])
                                                                            ? [...(entryCustomFields[cf.id] as string[])]
                                                                            : entryCustomFields[cf.id] ? [entryCustomFields[cf.id] as string] : ['']
                                                                        current[idx] = e.target.value
                                                                        updateEntryCustomField(cf.id, current)
                                                                    }}
                                                                />
                                                                {idx > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const current = Array.isArray(entryCustomFields[cf.id])
                                                                                ? [...(entryCustomFields[cf.id] as string[])]
                                                                                : [entryCustomFields[cf.id] as string]
                                                                            current.splice(idx, 1)
                                                                            updateEntryCustomField(cf.id, current)
                                                                        }}
                                                                        className="text-slate-400 hover:text-red-400"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const current = Array.isArray(entryCustomFields[cf.id])
                                                                    ? [...(entryCustomFields[cf.id] as string[])]
                                                                    : entryCustomFields[cf.id] ? [entryCustomFields[cf.id] as string] : ['']
                                                                updateEntryCustomField(cf.id, [...current, ''])
                                                            }}
                                                            className="text-cyan-400 hover:text-cyan-300 text-xs self-start"
                                                        >
                                                            + Add another
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                cf.kind === 'enum' ? (
                                                    <EnumSelect
                                                        options={cf.enumValues.map(v => v.value)}
                                                        value={entryCustomFields[cf.id] as string || ''}
                                                        onChange={v => updateEntryCustomField(cf.id, v)}
                                                        placeholder={`Select ${cf.name.toLowerCase()}...`}
                                                    />
                                                ) : (
                                                    <input
                                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                                        type={cf.kind === 'number' ? 'number' : 'text'}
                                                        placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                        value={entryCustomFields[cf.id] as string || ''}
                                                        onChange={e => updateEntryCustomField(cf.id, e.target.value)}
                                                    />
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <h2 className="text-white font-medium mb-3">Players</h2>
                        <div className="flex flex-wrap gap-3">
                            {entryPlayers.map(player => (
                                <div key={player.genId} className="border border-slate-500 rounded-lg p-3 w-[220px] flex flex-col gap-2 bg-slate-800/50">
                                    <button
                                        type="button"
                                        className="self-end text-slate-400 hover:text-white"
                                        onClick={() => removePlayerFromEntry(player.genId)}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-300 text-xs">Player</label>
                                        {player.id ? (
                                            <div className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm">
                                                {playersList.find(p => p.id === player.id)?.name ?? player.id}
                                            </div>
                                        ) : (
                                            <PlayerSearchSelect
                                                players={playersList}
                                                excludeIds={entryPlayers.filter(p => p.id).map(p => p.id)}
                                                onSelect={p => updatePlayer(player.genId, 'id', p.id)}
                                                onPlayerCreated={p => setPlayersList(prev => [...prev, { id: p.id, name: p.name }])}
                                                allowCreate
                                                placeholder="Search player..."
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-300 text-xs">Notes</label>
                                        <textarea
                                            className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                            placeholder="Player notes..."
                                            value={player.note}
                                            onChange={e => updatePlayer(player.genId, 'note', e.target.value)}
                                            rows={2}
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 text-white">
                                        <input
                                            type="checkbox"
                                            checked={player.won}
                                            onChange={e => updatePlayer(player.genId, 'won', e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Won</span>
                                    </label>
                                    {playerCustomFields.length > 0 && (
                                        <div className="border-t border-slate-600 pt-2 mt-1">
                                            <span className="text-slate-400 text-xs">Custom Fields</span>
                                            {playerCustomFields.map(cf => (
                                                <div key={cf.id} className="flex flex-col gap-1 mt-2">
                                                    <label className="text-slate-300 text-xs">{cf.name}</label>
                                                    {cf.multiple ? (
                                                        cf.kind === 'enum' ? (
                                                            <MultiEnumSelect
                                                                options={cf.enumValues.map(v => v.value)}
                                                                selected={Array.isArray(player.customFields[cf.id]) ? (player.customFields[cf.id] as string[]) : []}
                                                                onChange={values => updatePlayerCustomField(player.genId, cf.id, values)}
                                                                placeholder={`Select ${cf.name.toLowerCase()}...`}
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                {(Array.isArray(player.customFields[cf.id])
                                                                    ? (player.customFields[cf.id] as string[])
                                                                    : player.customFields[cf.id] ? [player.customFields[cf.id] as string] : ['']
                                                                ).map((val, idx) => (
                                                                    <div key={idx} className="flex gap-1">
                                                                        <input
                                                                            className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400 flex-1"
                                                                            type={cf.kind === 'number' ? 'number' : 'text'}
                                                                            placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                                            value={val}
                                                                            onChange={e => {
                                                                                const current = Array.isArray(player.customFields[cf.id])
                                                                                    ? [...(player.customFields[cf.id] as string[])]
                                                                                    : player.customFields[cf.id] ? [player.customFields[cf.id] as string] : ['']
                                                                                current[idx] = e.target.value
                                                                                updatePlayerCustomField(player.genId, cf.id, current)
                                                                            }}
                                                                        />
                                                                        {idx > 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const current = Array.isArray(player.customFields[cf.id])
                                                                                        ? [...(player.customFields[cf.id] as string[])]
                                                                                        : [player.customFields[cf.id] as string]
                                                                                    current.splice(idx, 1)
                                                                                    updatePlayerCustomField(player.genId, cf.id, current)
                                                                                }}
                                                                                className="text-slate-400 hover:text-red-400"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = Array.isArray(player.customFields[cf.id])
                                                                            ? [...(player.customFields[cf.id] as string[])]
                                                                            : player.customFields[cf.id] ? [player.customFields[cf.id] as string] : ['']
                                                                        updatePlayerCustomField(player.genId, cf.id, [...current, ''])
                                                                    }}
                                                                    className="text-cyan-400 hover:text-cyan-300 text-xs self-start"
                                                                >
                                                                    + Add another
                                                                </button>
                                                            </div>
                                                        )
                                                    ) : (
                                                        cf.kind === 'enum' ? (
                                                            <EnumSelect
                                                                options={cf.enumValues.map(v => v.value)}
                                                                value={player.customFields[cf.id] as string || ''}
                                                                onChange={v => updatePlayerCustomField(player.genId, cf.id, v)}
                                                                placeholder={`Select ${cf.name.toLowerCase()}...`}
                                                            />
                                                        ) : (
                                                            <input
                                                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                                                type={cf.kind === 'number' ? 'number' : 'text'}
                                                                placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                                value={player.customFields[cf.id] as string || ''}
                                                                onChange={e => updatePlayerCustomField(player.genId, cf.id, e.target.value)}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                className="border border-dashed border-slate-500 rounded-lg p-4 w-[220px] flex items-center justify-center flex-col text-slate-400 hover:text-white hover:border-white transition-colors"
                                onClick={addPlayerToEntry}
                            >
                                <UserPlus className="w-8 h-8" />
                                <span className="text-sm mt-1">Add player</span>
                            </button>
                        </div>
                    </div>

                    {entryErrors.length > 0 && (
                        <div className="text-red-400 mb-4 text-center">
                            {entryErrors.map((err, i) => <div key={i}>{err}</div>)}
                        </div>
                    )}

                    <button className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium self-center transition-colors" type="submit">
                        Create Entry
                    </button>
                </form>
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
                                    {Object.values(CustomFieldType).map(opt => <option key={opt}>{opt}</option>)}
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
                                        <span className={`px-2 py-0.5 rounded ${customField.global ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                                            {customField.global ? 'Entry' : 'Player'}
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
                                            onClick={() => copyCustomField(customField.id)}
                                            className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{customField.kind}</span>
                                        <span className={`px-2 py-0.5 rounded ${customField.global ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                                            {customField.global ? 'Entry' : 'Player'}
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
