
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react";
import { useRequest } from '../hooks/useRequest'
import { useLocalStorage } from '../hooks/useLocalStorage'
import Layout from '../Layout'
import { v4 as uuidv4 } from 'uuid'

type Game = {
    name: string
    id: string
    customFields: CustomField[]
}

type CustomField = {
    kind: CustomFieldType
    name: string
    global: boolean
    id: string
}

type Entry = {
    id: string,
    note: string,
    players: PlayerResult[]
    playedAt: {
      date: string
    }
    customFields: CustomFieldValue[]
}

type CustomFieldValue = {
    id: string
    value: any
    customField: CustomField
}

type PlayerResult = {
    id: string
    note: string
    won: boolean|null
    player: {
        name: string
        id: string
    }
    customFields: CustomFieldValue[]
}

type GameStats = {
    entriesCount: number
    owned: boolean
    winrate: string
}

export default function Game() {
    let { gameId } = useParams() as { gameId: string }
    const navigate = useNavigate()
    const [game, setGame] = useState<Game|null>(null)
    const [gameStats, setGameStats] = useState<GameStats|null>(null)
    const [entries, setEntries] = useState<Entry[]|[]>([])
    const [selectedEntry, setSelectedEntry] = useState<Entry|null>(null)
    const [refreshKey, setRefreshKey] = useState(0)

    const [searchParams] = useSearchParams();

    const playerId = searchParams.get('playerId')
    const entryIdFromUrl = searchParams.get('entryId')

    const selectEntry = (entry: Entry | null) => {
        setSelectedEntry(entry)
        const params = new URLSearchParams(searchParams)
        if (entry) {
            params.set('entryId', entry.id)
        } else {
            params.delete('entryId')
        }
        navigate(`/games/${gameId}?${params.toString()}`, { replace: true })
    }

    useEffect(() => {
        if (entryIdFromUrl && entries.length > 0 && !selectedEntry) {
            const entry = entries.find(e => e.id === entryIdFromUrl)
            if (entry) {
                setSelectedEntry(entry)
            }
        }
    }, [entryIdFromUrl, entries])

    const onEntryCreated = () => {
        setRefreshKey(k => k + 1)
    }

    useRequest(`/games/${gameId}`, [gameId], setGame)
    useRequest(`/entries?game=${gameId}&player=${playerId}`, [gameId, playerId, refreshKey], setEntries)
    useRequest(`/games/${gameId}/stats?player=${playerId}`, [gameId, playerId, refreshKey], setGameStats)

    if (game === null) {
        return (
            <div>loading</div>
        )
    }

    return (
        <Layout>
            <div className='flex flex-col text-white h-full'>
            <section className="border-2 border-white flex h-[95vh] ">
                <section className="border-r-2 border-white w-2/6">
                    <div onClick={() => selectEntry(null)} className="border-b-2 h-[15vh] flex flex-col items-center justify-center relative cursor-pointer">
                        <Link 
                            to={`/players/${playerId}`} 
                            className="absolute top-2 left-2 p-1 hover:bg-white/10 rounded"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                        </Link>
                        {game.name}
                    </div>
                    <div className="overflow-y-scroll h-[80vh]" >
                        {
                            entries.map(entry => <Entry key={entry.id} isCurrent={selectedEntry?.id === entry.id} func={() => selectEntry(entry)} entry={entry} playerId={playerId} />)
                        }
                    </div>
                </section>
                <section className="w-4/6" >
                    {
                        selectedEntry
                        ? <EntryDetail key={selectedEntry.id} game={game} entry={selectedEntry} />
                        : <GameDetail game={game} gameStats={gameStats} playerId={playerId} onEntryCreated={onEntryCreated} />
                    }
                </section>
            </section>
            </div>
        </Layout>
    )
}

function Entry({ entry, func, isCurrent, playerId }: {entry: Entry, func: () => void, isCurrent: boolean, playerId: string}) {
    const playedAt = new Date(entry.playedAt.date)
    return (
        <div onClick={func} className={`flex justify-between border-b-2 h-[15vh] ${entry.players.find(p => p.player.id === playerId)?.won ? "bg-lime-500/[.2]" : "bg-red-900/50" }`}>
            <div className="flex items-center text-gray-500 mx-4">
                {playedAt.toLocaleDateString('fr-FR')}
            </div>
            <div className="flex flex-col overflow-y-scroll">
                {entry.note.split(';').map((e, i) => <span key={i} >{e}</span>)}
                <span>Players: {entry.players.map(p => p.player.name).join(', ')}</span>
            </div>
            <div className={`h-[15vh] w-2 ${isCurrent ? 'bg-white' : 'bg-transparent'}`} />
        </div>
    )
}

function formatDateForInput(date: Date) {
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}`
}

function EntryDetail({ entry, game }: {entry: Entry, game: Game}) {
    const [editField, setEditField] = useState<string | null>(null)
    const [note, setNote] = useState(entry.note)
    const [playedAt, setPlayedAt] = useState(new Date(entry.playedAt.date))
    const [players, setPlayers] = useState(entry.players.map(p => ({...p})))
    const [customFields, setCustomFields] = useState(entry.customFields.map(c => ({...c})))

    const [token, _] = useLocalStorage('jwt', null)

    const patchEntry = async (payload: any) => {
        await fetch(`${host}/entries/${entry.id}`, { 
            method: "PATCH", 
            headers: { "Authorization": `Bearer ${token}`},
            body: JSON.stringify(payload)
        })
    }

    const handleNoteBlur = () => {
        if (note !== entry.note) {
            patchEntry({ note, customFields: [], players: [] })
            entry.note = note
        }
        setEditField(null)
    }

    const handleDateBlur = () => {
        const originalDate = new Date(entry.playedAt.date).toDateString()
        if (playedAt.toDateString() !== originalDate) {
            patchEntry({ playedAt: playedAt.toDateString(), customFields: [], players: [] })
        }
        setEditField(null)
    }

    const handleEntryCustomFieldBlur = (customField: CustomField, value: string, existingValueId?: string) => {
        const originalValue = entry.customFields.find(c => c.customField.id === customField.id)
        
        if (originalValue === undefined && value !== '') {
            patchEntry({ 
                customFields: [{ kind: "add", payload: { id: customField.id, value } }], 
                players: [] 
            })
        } else if (originalValue && originalValue.value !== value) {
            patchEntry({ 
                customFields: [{ kind: "update", id: existingValueId, payload: { value } }], 
                players: [] 
            })
            originalValue.value = value
        }
        setEditField(null)
    }

    const handlePlayerNoteBlur = (playerResultId: string, newNote: string) => {
        const originalPlayer = entry.players.find(p => p.id === playerResultId)
        if (originalPlayer && originalPlayer.note !== newNote) {
            patchEntry({ 
                customFields: [], 
                players: [{ kind: "update", id: playerResultId, payload: { note: newNote, customFields: [] } }] 
            })
            originalPlayer.note = newNote
        }
        setEditField(null)
    }

    const handlePlayerCustomFieldBlur = (playerResultId: string, customField: CustomField, value: string, existingValueId?: string) => {
        const originalPlayer = entry.players.find(p => p.id === playerResultId)
        if (!originalPlayer) return

        const originalValue = originalPlayer.customFields.find(c => c.customField.id === customField.id)
        
        if (originalValue === undefined && value !== '') {
            patchEntry({ 
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
            patchEntry({ 
                customFields: [], 
                players: [{ 
                    kind: "update", 
                    id: playerResultId, 
                    payload: { 
                        customFields: [{ kind: "update", id: existingValueId, payload: { value } }] 
                    } 
                }] 
            })
            originalValue.value = value
        }
        setEditField(null)
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
                                            <label className="text-slate-300 text-xs">{cf.name}</label>
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
                <h2 className="text-white font-semibold text-lg mb-4">Players</h2>
                <div className="flex flex-wrap gap-3">
                    {players.sort((a, b) => a.won && !b.won ? -1 : 1).map((playerResult) => (
                        <div key={playerResult.id} className="border border-slate-500 rounded-lg p-3 w-[220px] flex flex-col gap-2 bg-slate-800/50">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-medium">{playerResult.player.name}</span>
                                {playerResult.won && (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-yellow-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                                    </svg>
                                )}
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
                                                <label className="text-slate-300 text-xs">{cf.name}</label>
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
                                                        {cfValue?.value || <span className="text-slate-500">Not set</span>}
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

enum CustomFieldType {
    string = "string",
    number = 'number',
    //arrayString = 'arrayString',
    //arrayNumber = 'arrayNumber',
  }

const host = import.meta.env.VITE_API_HOST

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

function GameDetail({ game, gameStats, playerId, onEntryCreated }: {game: Game, gameStats: GameStats|null, playerId: string|null, onEntryCreated: () => void}) {
    const [token, _] = useLocalStorage('jwt', null)

    const [customFieldName, setCustomFieldName] = useState<string>("")
    const [customFieldType, setCustomFieldType] = useState<CustomFieldType|string>("")
    const [entrySpecific, setEntrySpecific] = useState<boolean>(false)
    const [errors, setErrors] = useState<string[]>([])
    const [customFieldsList, setCustomFieldsList] = useState<CustomField[]>(game.customFields)

    const [playersList, setPlayersList] = useState<{id: string, name: string}[]>([])
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

        const response = await fetch(`${host}/game/${game.id}/customFields`, 
        { 
            method: "POST", 
            headers: { "Authorization": `Bearer ${token}`},
            body: JSON.stringify({"name": customFieldName, "kind": customFieldType, "global": entrySpecific}),
        })

        const data = await response.json()
        if (response.status === 400) {
            console.log(data.errors)
            setErrors(data.errors);
        } else {
            setCustomFieldName("")
            setCustomFieldType("")
            const newCustomField = data.customFields.pop()
            setCustomFieldsList([...customFieldsList, newCustomField])
        }
    }

    const deleteCustomField = async (customFieldId: string) => {
        const response = await fetch(`${host}/customFields/${customFieldId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` },
        })

        if (response.status === 204) {
            setCustomFieldsList(customFieldsList.filter(cf => cf.id !== customFieldId))
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
                .filter(([_, value]) => value !== '')
                .map(([id, value]) => ({ id, value })),
            players: entryPlayers.map(p => ({
                id: p.id,
                note: p.note,
                won: p.won,
                customFields: Object.entries(p.customFields)
                    .filter(([_, value]) => value !== '')
                    .map(([id, value]) => ({ id, value }))
            }))
        }

        const response = await fetch(`${host}/entries`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: JSON.stringify(payload)
        })

        const data = await response.json()
        if (response.status === 400) {
            setEntryErrors(data.errors || ['Failed to create entry.'])
        } else {
            setEntryNote("")
            setEntryPlayedAt("")
            setEntryGameUsed("")
            setEntryCustomFields({})
            setEntryPlayers([])
            onEntryCreated()
        }
    }

    if (gameStats === null) {
        return <div>Loading stylé</div>
    }

    const globalCustomFields = customFieldsList.filter(c => c.global)
    const playerCustomFields = customFieldsList.filter(c => !c.global)

    return (
        <div className="flex flex-col m-4 overflow-y-scroll h-[90vh]" >
            <section className="flex flex-col mb-2" >
                <span>Games played: {gameStats.entriesCount}</span>
                {gameStats.owned && <span>Game is in Library</span> }
                <span>Your winrate on this game is: {gameStats.winrate}%</span>
            </section>
            <hr />

            <section className="flex flex-col mt-4 border border-slate-600 rounded-lg p-4" >
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
