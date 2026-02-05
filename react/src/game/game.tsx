import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react";
import { useRequest } from '../hooks/useRequest'
import Layout from '../Layout'
import { StatisticsPanel } from './statistics'
import { EntryListItem, EntryDetailPanel } from './entryPanel'
import { GameDetailPanel } from './gameDetailPanel'

type CustomField = {
    kind: string
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

export default function Game() {
    const { gameId } = useParams() as { gameId: string }
    const navigate = useNavigate()
    const [game, setGame] = useState<Game | null>(null)
    const [gameStats, setGameStats] = useState<GameStats | null>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
    const [showStatistics, setShowStatistics] = useState(false)
    const [playersList, setPlayersList] = useState<{ id: string, name: string }[]>([])

    const [searchParams] = useSearchParams();

    const playerId = searchParams.get('playerId')
    const entryIdFromUrl = searchParams.get('entryId')

    const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) ?? null : null

    const selectEntry = (entry: Entry | null) => {
        setSelectedEntryId(entry?.id ?? null)
        setShowStatistics(false)
        const params = new URLSearchParams(searchParams)
        if (entry) {
            params.set('entryId', entry.id)
        } else {
            params.delete('entryId')
        }
        navigate(`/games/${gameId}?${params.toString()}`, { replace: true })
    }

    const toggleStatistics = () => {
        selectEntry(null)
        setShowStatistics(true)
    }

    useEffect(() => {
        setSelectedEntryId(null)
        setEntries([])
        setGame(null)
        setGameStats(null)
    }, [gameId])

    useEffect(() => {
        if (entryIdFromUrl && entries.length > 0 && !selectedEntryId) {
            setSelectedEntryId(entryIdFromUrl)
        }
    }, [entryIdFromUrl, entries, selectedEntryId])

    const onEntryCreated = (newEntry: Entry) => {
        setEntries([...entries, newEntry])
    }

    const onEntryUpdated = (id: string, newEntry: Entry) => {
        setEntries(entries.map(e => e.id === id ? newEntry : e))
    }

    useRequest(`/games/${gameId}`, [gameId], setGame)
    useRequest(`/entries?game=${gameId}&player=${playerId}`, [gameId, playerId], setEntries)
    useRequest(`/games/${gameId}/stats?player=${playerId}`, [gameId, playerId], setGameStats)
    useRequest(`/players`, [], setPlayersList)

    if (game === null) {
        return (
            <div>loading</div>
        )
    }

    return (
        <Layout>
            <div className='flex text-white h-full gap-4'>
                <section className="w-80 shrink-0 flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-lg border border-slate-600/30 overflow-hidden">
                    <div className="shrink-0 border-b border-slate-600/30">
                        <div
                            onClick={() => selectEntry(null)}
                            className={`p-4 flex items-center justify-center cursor-pointer transition-all ${!selectedEntry && !showStatistics
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'hover:bg-slate-800/50'
                                }`}
                        >
                            <h1 className="text-lg font-semibold">{game.name}</h1>
                        </div>
                        {game.customFields.length > 0 && (
                            <button
                                onClick={toggleStatistics}
                                className={`w-full flex items-center justify-center gap-2 py-2 text-sm transition-colors ${showStatistics
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                </svg>
                                Statistics
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-12 h-12 text-slate-600 mb-3">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                                </svg>
                                <span className="text-slate-500 text-sm">No entries yet</span>
                                <span className="text-slate-600 text-xs mt-1">Add your first game session</span>
                            </div>
                        ) : (
                            entries.map(entry => (
                                <EntryListItem
                                    key={entry.id}
                                    isCurrent={selectedEntry?.id === entry.id}
                                    onClick={() => selectEntry(entry)}
                                    entry={entry}
                                    playerId={playerId}
                                />
                            ))
                        )}
                    </div>
                </section>
                <section className="flex-1 overflow-y-auto">
                    {showStatistics ? (
                        <StatisticsPanel gameId={gameId} playerId={playerId} customFields={game.customFields} />
                    ) : selectedEntry ? (
                        <EntryDetailPanel key={selectedEntry.id} game={game} entry={selectedEntry} onEntryUpdated={onEntryUpdated} allPlayers={playersList} />
                    ) : (
                        <GameDetailPanel game={game} gameStats={gameStats} playerId={playerId} onEntryCreated={onEntryCreated} onGameUpdated={setGame} />
                    )}
                </section>
            </div>
        </Layout>
    )
}
