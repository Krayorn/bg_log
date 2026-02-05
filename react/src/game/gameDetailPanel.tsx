import { useState } from "react"
import { useRequest } from '../hooks/useRequest'
import { apiPost, apiDelete } from '../hooks/useApi'
import { v4 as uuidv4 } from 'uuid'

enum CustomFieldType {
    string = "string",
    number = 'number',
}

type CustomField = {
    kind: CustomFieldType
    name: string
    global: boolean
    id: string
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
    customFields: CustomFieldValue[]
}

type Game = {
    name: string
    id: string
    customFields: CustomField[]
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
    customFields: { [key: string]: string }
}

type GameDetailPanelProps = {
    game: Game
    gameStats: GameStats | null
    playerId: string | null
    onEntryCreated: (newEntry: Entry) => void
    onGameUpdated: (game: Game) => void
}

export function GameDetailPanel({ game, gameStats, playerId, onEntryCreated, onGameUpdated }: GameDetailPanelProps) {
    const [customFieldName, setCustomFieldName] = useState<string>("")
    const [customFieldType, setCustomFieldType] = useState<CustomFieldType | string>("")
    const [entrySpecific, setEntrySpecific] = useState<boolean>(false)
    const [errors, setErrors] = useState<string[]>([])
    const [customFieldsList, setCustomFieldsList] = useState<CustomField[]>(game.customFields)

    const [playersList, setPlayersList] = useState<{ id: string, name: string }[]>([])
    const [gameOwners, setGameOwners] = useState<GameOwner[]>([])

    const [entryNote, setEntryNote] = useState("")
    const [entryPlayedAt, setEntryPlayedAt] = useState("")
    const [entryGameUsed, setEntryGameUsed] = useState("")
    const [entryCustomFields, setEntryCustomFields] = useState<{ [key: string]: string }>({})
    const [entryPlayers, setEntryPlayers] = useState<PlayerEntry[]>([])
    const [entryErrors, setEntryErrors] = useState<string[]>([])

    useRequest(`/players`, [], setPlayersList)
    useRequest(`/games/${game.id}/owners`, [game.id], setGameOwners)

    const currentPlayerOwnership = gameOwners.find(go => go.player.id === playerId)
    const defaultGameUsed = currentPlayerOwnership?.id || ""

    const addCustomField = async (e: React.FormEvent) => {
        e.preventDefault()

        if (customFieldType === "") {
            setErrors(['Type must be set.']);
            return
        }

        const { data, error, ok } = await apiPost<Game>(`/game/${game.id}/customFields`, {
            name: customFieldName,
            kind: customFieldType,
            global: entrySpecific
        })

        if (!ok || !data) {
            setErrors([error ?? 'Failed to add custom field']);
        } else {
            setCustomFieldName("")
            setCustomFieldType("")
            onGameUpdated(data)
            setCustomFieldsList(data.customFields)
        }
    }

    const deleteCustomField = async (customFieldId: string) => {
        const { ok } = await apiDelete(`/customFields/${customFieldId}`)
        if (ok) {
            const updatedCustomFields = customFieldsList.filter(cf => cf.id !== customFieldId)
            setCustomFieldsList(updatedCustomFields)
            onGameUpdated({ ...game, customFields: updatedCustomFields })
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

    const updatePlayerCustomField = (genId: string, customFieldId: string, value: string) => {
        setEntryPlayers(entryPlayers.map(p => {
            if (p.genId !== genId) return p
            return { ...p, customFields: { ...p.customFields, [customFieldId]: value } }
        }))
    }

    const updateEntryCustomField = (customFieldId: string, value: string) => {
        setEntryCustomFields({ ...entryCustomFields, [customFieldId]: value })
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
            customFields: Object.entries(entryCustomFields)
                .filter(([, value]) => value !== '')
                .map(([id, value]) => ({ id, value })),
            players: entryPlayers.map(p => ({
                id: p.id,
                note: p.note,
                won: p.won,
                customFields: Object.entries(p.customFields)
                    .filter(([, value]) => value !== '')
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
            setEntryPlayers([])
            onEntryCreated(data)
        }
    }

    if (gameStats === null) {
        return <div>Loading stylé</div>
    }

    const globalCustomFields = customFieldsList.filter(c => c.global)
    const playerCustomFields = customFieldsList.filter(c => !c.global)

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
                        {globalCustomFields.length > 0 && (
                            <div className="border border-slate-500 p-4 rounded-lg bg-slate-800/50">
                                <h3 className="text-white font-medium mb-3">Entry Custom Fields</h3>
                                <div className="flex flex-wrap gap-3">
                                    {globalCustomFields.map(cf => (
                                        <div key={cf.id} className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                            <label className="text-slate-300 text-xs">{cf.name}</label>
                                            <input
                                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                                type={cf.kind === 'number' ? 'number' : 'text'}
                                                placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                value={entryCustomFields[cf.id] || ''}
                                                onChange={e => updateEntryCustomField(cf.id, e.target.value)}
                                            />
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
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-slate-300 text-xs">Player</label>
                                        <select
                                            className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm"
                                            value={player.id}
                                            onChange={e => updatePlayer(player.genId, 'id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select player</option>
                                            {playersList.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
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
                                                    <input
                                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                                        type={cf.kind === 'number' ? 'number' : 'text'}
                                                        placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                        value={player.customFields[cf.id] || ''}
                                                        onChange={e => updatePlayerCustomField(player.genId, cf.id, e.target.value)}
                                                    />
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
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                                </svg>
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

                {customFieldsList.length > 0 && (
                    <>
                        <hr className="border-slate-600 mb-4" />
                        <h2 className="text-white font-medium mb-3">Existing Fields</h2>
                        <div className="flex flex-wrap gap-3">
                            {customFieldsList.map(customField => (
                                <div key={customField.id} className="border border-slate-500 rounded-lg p-3 bg-slate-800/50 flex flex-col gap-1 min-w-[180px]">
                                    <div className="flex justify-between items-start">
                                        <span className="text-white font-medium">{customField.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteCustomField(customField.id)}
                                            className="text-slate-400 hover:text-red-400 transition-colors"
                                            title="Delete custom field"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300">{customField.kind}</span>
                                        <span className={`px-2 py-0.5 rounded ${customField.global ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                                            {customField.global ? 'Entry' : 'Player'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>
        </div>
    )
}
