import { useState, useEffect } from "react"
import { apiPatch } from '../hooks/useApi'

type CustomFieldType = 'string' | 'number'

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

type EntryListItemProps = {
    entry: Entry
    isCurrent: boolean
    onClick: () => void
    playerId: string | null
}

export function EntryListItem({ entry, isCurrent, onClick, playerId }: EntryListItemProps) {
    const playedAt = new Date(entry.playedAt.date)
    const playerResult = playerId ? entry.players.find(p => p.player.id === playerId) : null
    const won = playerResult?.won

    return (
        <div
            onClick={onClick}
            className={`p-3 cursor-pointer transition-all border-b border-slate-600/30 ${isCurrent
                ? 'bg-cyan-500/20 border-l-2 border-l-cyan-400'
                : 'hover:bg-slate-800/50'
                }`}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">
                    {playedAt.toLocaleDateString('fr-FR')}
                </span>
                {won !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${won
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                        {won ? 'Win' : 'Loss'}
                    </span>
                )}
            </div>
            <div className="text-sm text-slate-300 truncate">
                {entry.players.map(p => p.player.name).join(', ')}
            </div>
            {entry.note && (
                <div className="text-xs text-slate-500 mt-1 truncate">
                    {entry.note.split(';')[0]}
                </div>
            )}
        </div>
    )
}

function formatDateForInput(date: Date) {
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`
}

type EntryDetailPanelProps = {
    entry: Entry
    game: Game
    onEntryUpdated: (id: string, newEntry: Entry) => void
    allPlayers: { id: string; name: string }[]
}

export function EntryDetailPanel({ entry, game, onEntryUpdated, allPlayers }: EntryDetailPanelProps) {
    const [editField, setEditField] = useState<string | null>(null)
    const [note, setNote] = useState(entry.note)
    const [playedAt, setPlayedAt] = useState(new Date(entry.playedAt.date))
    const [players, setPlayers] = useState(entry.players.map(p => ({ ...p })))
    const [customFields, setCustomFields] = useState(entry.customFields.map(c => ({ ...c })))
    const [showAddPlayer, setShowAddPlayer] = useState(false)
    const [newPlayerId, setNewPlayerId] = useState('')

    useEffect(() => {
        setNote(entry.note)
        setPlayedAt(new Date(entry.playedAt.date))
        setPlayers(entry.players.map(p => ({ ...p })))
        setCustomFields(entry.customFields.map(c => ({ ...c })))
    }, [entry])

    const availablePlayers = allPlayers.filter(p => !players.some(ep => ep.player.id === p.id))

    const patchEntry = async (payload: Record<string, unknown>) => {
        const { data: updatedEntry, ok } = await apiPatch<Entry>(`/entries/${entry.id}`, payload)
        if (ok && updatedEntry) {
            onEntryUpdated(entry.id, updatedEntry)
        }
    }

    const handleNoteBlur = async () => {
        if (note !== entry.note) {
            await patchEntry({ note, customFields: [], players: [] })
        }
        setEditField(null)
    }

    const handleDateBlur = async () => {
        const originalDate = new Date(entry.playedAt.date).toDateString()
        if (playedAt.toDateString() !== originalDate) {
            await patchEntry({ playedAt: playedAt.toDateString(), customFields: [], players: [] })
        }
        setEditField(null)
    }

    const handleEntryCustomFieldBlur = async (customField: CustomField, value: string, existingValueId?: string) => {
        const originalValue = entry.customFields.find(c => c.customField.id === customField.id)

        if (originalValue === undefined && value !== '') {
            await patchEntry({
                customFields: [{ kind: "add", payload: { id: customField.id, value } }],
                players: []
            })
        } else if (originalValue && originalValue.value !== value) {
            await patchEntry({
                customFields: [{ kind: "update", id: existingValueId, payload: { value } }],
                players: []
            })
        }
        setEditField(null)
    }

    const handlePlayerNoteBlur = async (playerResultId: string, newNote: string) => {
        const originalPlayer = entry.players.find(p => p.id === playerResultId)
        if (originalPlayer && originalPlayer.note !== newNote) {
            await patchEntry({
                customFields: [],
                players: [{ kind: "update", id: playerResultId, payload: { note: newNote, customFields: [] } }]
            })
        }
        setEditField(null)
    }

    const handlePlayerCustomFieldBlur = async (playerResultId: string, customField: CustomField, value: string, existingValueId?: string) => {
        const originalPlayer = entry.players.find(p => p.id === playerResultId)
        if (!originalPlayer) return

        const originalValue = originalPlayer.customFields.find(c => c.customField.id === customField.id)

        if (originalValue === undefined && value !== '') {
            await patchEntry({
                customFields: [],
                players: [{
                    kind: "update",
                    id: playerResultId,
                    payload: {
                        customFields: [{ kind: "add", payload: { id: customField.id, value } }]
                    }
                }]
            })
        } else if (originalValue && originalValue.value !== value) {
            await patchEntry({
                customFields: [],
                players: [{
                    kind: "update",
                    id: playerResultId,
                    payload: {
                        customFields: [{ kind: "update", id: existingValueId, payload: { value } }]
                    }
                }]
            })
        }
        setEditField(null)
    }

    const handleRemoveEntryCustomField = async (customFieldValueId: string) => {
        await patchEntry({
            customFields: [{ kind: "remove", id: customFieldValueId }],
            players: []
        })
    }

    const handleRemovePlayerCustomField = async (playerResultId: string, customFieldValueId: string) => {
        await patchEntry({
            customFields: [],
            players: [{
                kind: "update",
                id: playerResultId,
                payload: {
                    customFields: [{ kind: "remove", id: customFieldValueId }]
                }
            }]
        })
    }

    const updateLocalCustomField = (customField: CustomField, value: string) => {
        const existingIndex = customFields.findIndex(cf => cf.customField.id === customField.id)
        if (existingIndex >= 0) {
            const updated = [...customFields]
            updated[existingIndex] = { ...updated[existingIndex], value }
            setCustomFields(updated)
        } else {
            setCustomFields([...customFields, { value, customField, id: '' }])
        }
    }

    const updateLocalPlayerNote = (playerResultId: string, newNote: string) => {
        setPlayers(players.map(p =>
            p.id === playerResultId ? { ...p, note: newNote } : p
        ))
    }

    const updateLocalPlayerCustomField = (playerResultId: string, customField: CustomField, value: string) => {
        setPlayers(players.map(p => {
            if (p.id !== playerResultId) return p
            const existingIndex = p.customFields.findIndex(cf => cf.customField.id === customField.id)
            if (existingIndex >= 0) {
                const updatedCf = [...p.customFields]
                updatedCf[existingIndex] = { ...updatedCf[existingIndex], value }
                return { ...p, customFields: updatedCf }
            } else {
                return { ...p, customFields: [...p.customFields, { value, customField, id: '' }] }
            }
        }))
    }

    const handleAddPlayer = async () => {
        if (!newPlayerId) return

        await patchEntry({
            customFields: [],
            players: [{
                kind: "add",
                payload: {
                    playerId: newPlayerId,
                    note: '',
                    won: null,
                    customFields: []
                }
            }]
        })

        setNewPlayerId('')
        setShowAddPlayer(false)
    }

    const handleRemovePlayer = async (playerResultId: string) => {
        await patchEntry({
            customFields: [],
            players: [{ kind: "remove", id: playerResultId }]
        })
    }

    const handleToggleWon = async (playerResultId: string, currentWon: boolean | null) => {
        const newWon = currentWon === true ? false : currentWon === false ? null : true

        await patchEntry({
            customFields: [],
            players: [{
                kind: "update",
                id: playerResultId,
                payload: { won: newWon, customFields: [] }
            }]
        })
    }

    const globalCustomFields = game.customFields.filter(c => c.global)
    const playerCustomFields = game.customFields.filter(c => !c.global)

    return (
        <div className="m-4 overflow-y-scroll h-[90vh]">
            <section className="border border-slate-600 rounded-lg p-4 mb-4">
                <h2 className="text-white font-semibold text-lg mb-4">Entry Details</h2>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-slate-300 text-xs">Date Played</label>
                        {editField === 'date' ? (
                            <input
                                type="date"
                                autoFocus
                                value={formatDateForInput(playedAt)}
                                onChange={(e) => setPlayedAt(new Date(e.target.value))}
                                onBlur={handleDateBlur}
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 w-fit"
                            />
                        ) : (
                            <div
                                onClick={() => setEditField('date')}
                                className="p-2 rounded bg-slate-800 text-white border border-slate-600 cursor-pointer hover:border-slate-400 w-fit min-w-[150px]"
                            >
                                {playedAt.toLocaleDateString('fr-FR')}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-slate-300 text-xs">Session Notes</label>
                        {editField === 'note' ? (
                            <textarea
                                autoFocus
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                onBlur={handleNoteBlur}
                                placeholder="Notes about the game session..."
                                rows={3}
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                            />
                        ) : (
                            <div
                                onClick={() => setEditField('note')}
                                className="p-2 rounded bg-slate-800 text-white border border-slate-600 cursor-pointer hover:border-slate-400 min-h-[60px]"
                            >
                                {note || <span className="text-slate-500">No notes...</span>}
                            </div>
                        )}
                    </div>

                    {globalCustomFields.length > 0 && (
                        <div className="border border-slate-500 p-4 rounded-lg bg-slate-800/50">
                            <h3 className="text-white font-medium mb-3">Entry Custom Fields</h3>
                            <div className="flex flex-wrap gap-3">
                                {globalCustomFields.map(cf => {
                                    const cfValue = customFields.find(c => c.customField.id === cf.id)
                                    const fieldKey = `cf-${cf.id}`
                                    return (
                                        <div key={cf.id} className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                            <div className="flex items-center gap-2">
                                                <label className="text-slate-300 text-xs">{cf.name}</label>
                                                {cfValue?.id && (
                                                    <button
                                                        onClick={() => handleRemoveEntryCustomField(cfValue.id)}
                                                        className="text-slate-500 hover:text-red-400 text-xs"
                                                        title="Remove value"
                                                    >
                                                        unset
                                                    </button>
                                                )}
                                            </div>
                                            {editField === fieldKey ? (
                                                <input
                                                    autoFocus
                                                    type={cf.kind === 'number' ? 'number' : 'text'}
                                                    value={cfValue?.value ?? ''}
                                                    onChange={(e) => updateLocalCustomField(cf, e.target.value)}
                                                    onBlur={(e) => handleEntryCustomFieldBlur(cf, e.target.value, cfValue?.id)}
                                                    placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                                />
                                            ) : (
                                                <div
                                                    onClick={() => setEditField(fieldKey)}
                                                    className="p-2 rounded bg-slate-800 text-white border border-slate-600 cursor-pointer hover:border-slate-400"
                                                >
                                                    {cfValue?.value || <span className="text-slate-500">Not set</span>}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="border border-slate-600 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-white font-semibold text-lg">Players</h2>
                    {availablePlayers.length > 0 && (
                        <button
                            onClick={() => setShowAddPlayer(!showAddPlayer)}
                            className="text-cyan-400 text-sm hover:text-cyan-300 flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Player
                        </button>
                    )}
                </div>

                {showAddPlayer && (
                    <div className="mb-4 p-3 border border-slate-500 rounded-lg bg-slate-800/50 flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-slate-300 text-xs block mb-1">Select Player</label>
                            <select
                                value={newPlayerId}
                                onChange={(e) => setNewPlayerId(e.target.value)}
                                className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500"
                            >
                                <option value="">Choose a player...</option>
                                {availablePlayers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={handleAddPlayer}
                            disabled={!newPlayerId}
                            className="px-3 py-2 rounded bg-cyan-500/20 border border-cyan-400/50 text-cyan-400 hover:bg-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => { setShowAddPlayer(false); setNewPlayerId(''); }}
                            className="px-3 py-2 rounded bg-slate-700 border border-slate-500 text-slate-300 hover:bg-slate-600"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap gap-3">
                    {players.sort((a, b) => a.won && !b.won ? -1 : 1).map((playerResult) => (
                        <div key={playerResult.id} className="border border-slate-500 rounded-lg p-3 w-[220px] flex flex-col gap-2 bg-slate-800/50">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-white font-medium flex-1 truncate">{playerResult.player.name}</span>
                                <button
                                    onClick={() => handleToggleWon(playerResult.id, playerResult.won)}
                                    className={`px-2 py-1 rounded text-xs border transition-all shrink-0 ${playerResult.won === true
                                        ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400'
                                        : playerResult.won === false
                                            ? 'bg-red-500/20 border-red-400/50 text-red-400'
                                            : 'bg-slate-700 border-slate-500 text-slate-400'
                                        }`}
                                    title="Click to toggle: Win → Loss → Not set"
                                >
                                    {playerResult.won === true ? 'Won' : playerResult.won === false ? 'Lost' : '—'}
                                </button>
                                <button
                                    onClick={() => handleRemovePlayer(playerResult.id)}
                                    className="text-red-400 hover:text-red-300 shrink-0"
                                    title="Remove player"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-slate-300 text-xs">Notes</label>
                                {editField === `player-${playerResult.id}-note` ? (
                                    <textarea
                                        autoFocus
                                        value={playerResult.note}
                                        onChange={(e) => updateLocalPlayerNote(playerResult.id, e.target.value)}
                                        onBlur={(e) => handlePlayerNoteBlur(playerResult.id, e.target.value)}
                                        placeholder="Player notes..."
                                        rows={2}
                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                    />
                                ) : (
                                    <div
                                        onClick={() => setEditField(`player-${playerResult.id}-note`)}
                                        className="p-2 rounded bg-slate-800 text-white border border-slate-600 cursor-pointer hover:border-slate-400 text-sm min-h-[40px]"
                                    >
                                        {playerResult.note || <span className="text-slate-500">No notes...</span>}
                                    </div>
                                )}
                            </div>

                            {playerCustomFields.length > 0 && (
                                <div className="border-t border-slate-600 pt-2 mt-1">
                                    <span className="text-slate-400 text-xs">Custom Fields</span>
                                    {playerCustomFields.map(cf => {
                                        const cfValue = playerResult.customFields.find(c => c.customField.id === cf.id)
                                        const fieldKey = `player-${playerResult.id}-cf-${cf.id}`
                                        return (
                                            <div key={cf.id} className="flex flex-col gap-1 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <label className="text-slate-300 text-xs">{cf.name}</label>
                                                    {cfValue?.id && (
                                                        <button
                                                            onClick={() => handleRemovePlayerCustomField(playerResult.id, cfValue.id)}
                                                            className="text-slate-500 hover:text-red-400 text-xs"
                                                            title="Remove value"
                                                        >
                                                            unset
                                                        </button>
                                                    )}
                                                </div>
                                                {editField === fieldKey ? (
                                                    <input
                                                        autoFocus
                                                        type={cf.kind === 'number' ? 'number' : 'text'}
                                                        value={cfValue?.value ?? ''}
                                                        onChange={(e) => updateLocalPlayerCustomField(playerResult.id, cf, e.target.value)}
                                                        onBlur={(e) => handlePlayerCustomFieldBlur(playerResult.id, cf, e.target.value, cfValue?.id)}
                                                        placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                                    />
                                                ) : (
                                                    <div
                                                        onClick={() => setEditField(fieldKey)}
                                                        className="p-2 rounded bg-slate-800 text-white border border-slate-600 cursor-pointer hover:border-slate-400 text-sm"
                                                    >
                                                        {cfValue ? cfValue.value : <span className="text-slate-500">Not set</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    )
}
