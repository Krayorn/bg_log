
import { useParams, useSearchParams } from "react-router-dom"
import { useState } from "react";
import { useRequest } from '../hooks/useRequest'
import { useLocalStorage } from '../hooks/useLocalStorage'

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
    const [game, setGame] = useState<Game|null>(null)
    const [gameStats, setGameStats] = useState<GameStats|null>(null)
    const [entries, setEntries] = useState<Entry[]|[]>([])
    const [selectedEntry, setSelectedEntry] = useState<Entry|null>(null)

    const [searchParams] = useSearchParams();

    const playerId = searchParams.get('playerId')

    useRequest(`/games/${gameId}`, [gameId], setGame)
    useRequest(`/entries?game=${gameId}&player=${playerId}`, [gameId, playerId], setEntries)
    useRequest(`/games/${gameId}/stats?player=${playerId}`, [gameId, playerId], setGameStats)

    if (game === null) {
        return (
            <div>loading</div>
        )
    }

    return (
        <div className='bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[rgba(40,69,102,1)] to-[rgba(14,21,32,1)] h-full min-h-screen p-6 flex flex-col text-white'> 
            <section className="border-2 border-white flex h-[95vh] ">
                <section className="border-r-2 border-white w-2/6">
                    <div onClick={() => setSelectedEntry(null)} className="border-b-2 h-[15vh] flex items-center justify-center">
                        {game.name}
                    </div>
                    <div className="overflow-y-scroll h-[80vh]" >
                        {
                            entries.map(entry => <Entry key={entry.id} isCurrent={selectedEntry?.id === entry.id} func={() => setSelectedEntry(entry)} entry={entry} playerId={playerId} />)
                        }
                    </div>
                </section>
                <section className="w-4/6" >
                    {
                        selectedEntry
                        ? <EntryDetail key={selectedEntry.id} game={game} entry={selectedEntry} />
                        : <GameDetail game={game} gameStats={gameStats} />
                    }
                </section>
            </section>
        </div>
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

function formatDate(date: Date) {
    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}-${('0' + date.getDate()).slice(-2)}T${('0' + date.getHours()).slice(-2)}:${('0' + date.getMinutes()).slice(-2)}`
}

function EntryDetail({ entry, game }: {entry: Entry, game: Game}) {
    const [editField, setEditField] = useState("")
    
    const [note, setNote] = useState(entry.note)
    const [playedAt, setPlayedAt] = useState(new Date(entry.playedAt.date))
    const [players, setPlayers] = useState(entry.players.map(p => ({...p})))
    const [customFields, setCustomFields] = useState(entry.customFields.map(c => ({...c})))

    const [token, _] = useLocalStorage('jwt', null)

    const updatePlayerResult = (playerResultId: string, customField: CustomField|null, customFieldValueExist: boolean|null, value: any, note: string|null) => {
        const updatedPlayersArray = players.map(playerResult => {
            if (playerResultId !== playerResult.id) {
                return {...playerResult}
            }

            let cf = playerResult.customFields.map(customFieldValue => ({...customFieldValue}))
            if (customField !== null && customFieldValueExist !== null) {
                if (customFieldValueExist) {            
                    cf = playerResult.customFields.map(customFieldValue => {
                        if (customFieldValue.customField.id !== customField.id) {
                            return {...customFieldValue}
                        }
                        return {...customFieldValue, value: value}
                    })
                } else {
                    cf.push({value, customField})
                }
            }

            if (note !== null) {
                playerResult.note = note
            }

            return {...playerResult, customFields: cf}
        })
        
        setPlayers(updatedPlayersArray)
    }

    const updateCustomField = (customField: CustomField, customFieldValueExist: boolean, value: any) => {
        const updatedCustomFields = customFields.map(customFieldValue => {
                if (customField.id !== customFieldValue.customField.id) {
                    return {...customFieldValue}
                }

                return {...customFieldValue, value: value}
        })
        if (!customFieldValueExist) {
            updatedCustomFields.push({value, customField})
        }
        
        setCustomFields(updatedCustomFields)
    }

    const save = async () => {
        
        const response = await fetch(`${host}/entries/${entry.id}`, { 
            method: "PATCH", 
            headers: { "Authorization": `Bearer ${token}`},
            body: JSON.stringify(getPayload())
        })

        const data = await response.json()
        setEditField("")
    }

    const getPayload = () => {
        let payload = {customFields: [], players: []}
        if (note !== entry.note) {
            payload.note = note
        }
        
        const originalDate = new Date(entry.playedAt.date).toDateString()
        if (originalDate !== playedAt.toDateString()) {
            payload.playedAt = playedAt.toDateString()
        }

        customFields.forEach(customFieldValue => {
            const matchingCustomFieldValue = entry.customFields.find(c => c.customField.id === customFieldValue.customField.id)
        
            if (matchingCustomFieldValue === undefined) {
                payload.customFields.push({ kind: "add", payload: { id: customFieldValue.customField.id, value: customFieldValue.value }})
            } else {
                if (matchingCustomFieldValue.value !== customFieldValue.value) {
                    payload.customFields.push({ kind: "update", id: customFieldValue.id ,payload: { value: customFieldValue.value }})
                }
            }
        })

        players.forEach(playerResult => {
            const matchingPlayerResult = entry.players.find(pr => pr.id === playerResult.id)
            if (matchingPlayerResult === undefined) {
                payload.players.push({ kind: "add", payload: { id: customFieldValue.customField.id, value: customFieldValue.value }})
            } else {
                let currentPlayerPayload = { customFields: [] }
                let change = false

                if (matchingPlayerResult.note !== playerResult.note) {
                    change = true
                    currentPlayerPayload.note = playerResult.note
                }
                
                playerResult.customFields.forEach(customFieldValue => {
                    const matchingCustomFieldValue = matchingPlayerResult.customFields.find(c => c.customField.id === customFieldValue.customField.id)
                
                    if (matchingCustomFieldValue === undefined) {
                        change = true
                        currentPlayerPayload.customFields.push({ kind: "add", payload: { id: customFieldValue.customField.id, value: customFieldValue.value }})
                    } else {
                        if (matchingCustomFieldValue.value !== customFieldValue.value) {
                            change = true
                            currentPlayerPayload.customFields.push({ kind: "update", id: customFieldValue.id ,payload: { value: customFieldValue.value }})
                        }
                    }
                })
                if (change) {
                    payload.players.push({ kind: "update", id: playerResult.id, payload: currentPlayerPayload})
                }
            }
        })

        return payload;
    }

    return (
        <div className="m-4">
            { 
            (JSON.stringify(players) !== JSON.stringify(entry.players) || JSON.stringify(customFields) !== JSON.stringify(entry.customFields) || note !== entry.note || playedAt.toDateString() !== new Date(entry.playedAt.date).toDateString()) 
             //   getPayload() !== {}
                && <h1 onClick={save} >SAVE</h1>
            }
            <header className="flex justify-end" >
                {
                    editField === "playedAt"
                    ? <input onChange={(e) => setPlayedAt(new Date(e.target.value))} value={formatDate(playedAt)} className="mb-2 text-black" name="playedAt" type="datetime-local" ></input>
                    : <span onClick={() => setEditField('playedAt')} >{playedAt.toLocaleDateString('fr-FR')}</span>
                }
            </header>
            <section className="flex flex-col" >
            {
                    editField === "note"
                    ? <textarea onChange={(e) => setNote(e.target.value)} className="mb-2 text-black" name="note" value={note} placeholder="Any note on the general game..." ></textarea>
                    : <div onClick={() => setEditField('note')}>{note === '' && 'no notes...'} {note.split(';').map((e, i) => <span key={i} className="mb-4" >{e}</span>)}</div>
            }

            {
            game.customFields.filter(c => c.global).map(customField => {
                const customFieldValue = customFields.find(customFieldFilled => customField.id === customFieldFilled.customField.id)
                return ( 
                    <div key={entry.id + customField.id}>
                    {
                        editField === 'c' + customField.id
                        ? <input className="text-black" onChange={(e) => updateCustomField(customField, customFieldValue !== undefined, e.target.value)} value={customFieldValue ? customFieldValue.value : ''} type="text" placeholder={`value of custom field ${customField.name}`} ></input>
                            : customFieldValue === undefined
                            ? <div onClick={() => setEditField('c' + customField.id)} >{customField.name}</div>
                            : <div onClick={() => setEditField('c' + customField.id)} >{customFieldValue.customField.name}: {customFieldValue.value}</div>
                    }
                    </div>
                )
            })
        } 
            </section>
            <section className="flex flex-col">
                {
                    players.sort((a, b) => a.won && !b.won ? -1 : 1).map((playerResult) =>  {
                        return (
                            <div key={playerResult.id} className="flex flex-col mt-4 border-b-2 border-slate-500" >
                                <span className="flex">
                                    {playerResult.player.name} {
                                    playerResult.won && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}                   stroke="currentColor" className="w-6 h-6 ml-4">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
                                        </svg>
                                        }
                                </span>
                                { editField === 'p' + playerResult.id + 'note'
                                    ? <textarea onChange={(e) => updatePlayerResult(playerResult.id, null, false, null, e.target.value)} className="mb-2 text-black" name="note" value={playerResult.note} placeholder="Any note on the general game..." ></textarea>
                                    : <div onClick={() => setEditField('p' + playerResult.id + 'note')} >{playerResult.note.split(';').map((e, i) => <span key={i} className="mb-2" >{e}</span>)}</div>
                                }
                                {
                                    game.customFields.filter(c => !c.global).map(customField => {
                                        const customFieldValue = playerResult.customFields.find(customFieldFilled => customField.id === customFieldFilled.customField.id)
                                        return ( 
                                            <div key={playerResult.id + customField.id}>
                                            {
                                                editField === 'p' + playerResult.id + 'c' + customField.id
                                                ? <input className="text-black" onChange={(e) => updatePlayerResult(playerResult.id, customField, customFieldValue !== undefined, e.target.value, null)} value={customFieldValue ? customFieldValue.value : ''} type={`${customField.kind === "string" ? 'text' : 'number'}`} placeholder={`value of custom field ${customField.name}`} ></input>
                                                    : customFieldValue === undefined
                                                    ? <div onClick={() => setEditField('p' + playerResult.id + 'c' + customField.id)} >{customField.name}</div>
                                                    : <div onClick={() => setEditField('p' + playerResult.id + 'c' + customField.id)} >{customFieldValue.customField.name}: {customFieldValue.value}</div>
                                            }
                                            </div>
                                        )
                                    })
                                }
                                

                            </div>
                        )
                    })    
                }
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

function GameDetail({ game, gameStats }: {game: Game, gameStats: GameStats|null}) {
    

    const [token, _] = useLocalStorage('jwt', null)

    const [customFieldName, setCustomFieldName] = useState<string>("")
    const [customFieldType, setCustomFieldType] = useState<CustomFieldType|string>("")
    const [entrySpecific, setEntrySpecific] = useState<boolean>(false)
    const [errors, setErrors] = useState([])

    const addCustomField = async (e) => {
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
            game.customFields.push(data.customFields.pop())
        }
    }

    
    if (gameStats === null) {
        return <div>Loading stylé</div>
    }

    return (
        <div className="flex flex-col m-4" >
            <section className="flex flex-col mb-2" >
                <span>Games played: {gameStats.entriesCount}</span>
                {gameStats.owned && <span>Game is in Library</span> }
                <span>Your winrate on this game is: {gameStats.winrate}%</span>
            </section>
            <hr />
            <section className="flex flex-col" >
                <h1 className="text-center text-lg my-4" >Custom Fields</h1>
                <form  className="flex flex-col items-center" onSubmit={addCustomField} >
                    <div className="text-black flex" >
                        <input className="mr-4" placeholder="Custom field name..." name="name" onChange={e => setCustomFieldName(e.target.value)}  value={customFieldName} />
                        <select className="mr-4" placeholder="Field type..." name="type" value={customFieldType} onChange={e => setCustomFieldType(e.target.value)}>
                            <option value="" disabled>Field type...</option>
                            {Object.values(CustomFieldType).map(opt => <option key={opt}>{opt}</option>)}
                        </select>

                        <label className="switch border-2 border-[#3c339a]" >
                            <input type="checkbox" name="entrySpecific" checked={entrySpecific} onChange={_ => setEntrySpecific(!entrySpecific)} ></input>
                            <span className={`relative z-10 text-center ${!entrySpecific ? 'text-black' : 'text-white'}`} >Entry</span>
                            <span className={`relative z-10 text-center ${entrySpecific ? 'text-black' : 'text-white'}`} >Player</span>
                            <span className={`${!entrySpecific ? 'active' : ''} slider`} ></span>
                        </label>
                    </div>
                    {
                        errors.length > 0 &&
                        <div className="mt-4" >
                            {
                                errors.map(err => (<span key={err} >{err}</span>))
                            }
                        </div>
                    }
                    <button className="p-2 rounded-md border-white border-2 w-fit mt-4" >Add Custom field</button>
                </form>

                <div className="flex flex-wrap" >
                {
                    game.customFields.map(customField => {
                        return (
                            <div key={customField.name} className="w-2/6 h-64 my-1 flex flex-col" >
                                <span>Name: {customField.name}</span>
                                <span>Kind: {customField.kind}</span>
                                <span>Scope: {customField.global ? 'entry' : 'player result'}</span>
                            </div>
                        )
                    })
                }
                </div>
            </section>
        </div>
    )
}
