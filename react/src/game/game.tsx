import { useParams, useSearchParams, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react";
import { useRequest } from '../hooks/useRequest'
import Layout from '../Layout'
import { StatisticsPanel } from './statistics'
import { EntryListItem, EntryDetailPanel } from './entryPanel'
import { GameDetailPanel } from './gameDetailPanel'
import { BarChart3, FileText, Scroll } from 'lucide-react'
import { CampaignPanel } from './campaignPanel'

type CustomField = {
    kind: string
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
    campaign?: {
        id: string
        name: string
    }
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

export default function Game() {
    const { gameId } = useParams() as { gameId: string }
    const navigate = useNavigate()
    const [game, setGame] = useState<Game | null>(null)
    const [gameStats, setGameStats] = useState<GameStats | null>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
    const [showStatistics, setShowStatistics] = useState(false)
    const [showCampaigns, setShowCampaigns] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [shareableFields, setShareableFields] = useState<CustomField[]>([])
    const [playersList, setPlayersList] = useState<{ id: string, name: string }[]>([])

    const [searchParams] = useSearchParams();

    const playerId = searchParams.get('playerId')
    const entryIdFromUrl = searchParams.get('entryId')

    const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) ?? null : null

    const selectEntry = (entry: Entry | null) => {
        setSelectedEntryId(entry?.id ?? null)
        setShowStatistics(false)
        setShowCampaigns(false)
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
        setShowCampaigns(false)
    }

    const toggleCampaigns = () => {
        selectEntry(null)
        setShowCampaigns(true)
    }

    useEffect(() => {
        setSelectedEntryId(null)
        setEntries([])
        setGame(null)
        setGameStats(null)
        setCustomFields([])
        setShareableFields([])
    }, [gameId])

    useEffect(() => {
        if (entryIdFromUrl && entries.length > 0 && !selectedEntryId) {
            setSelectedEntryId(entryIdFromUrl)
        }
    }, [entryIdFromUrl, entries, selectedEntryId])

    const onEntryCreated = (newEntry: Entry) => {
        setEntries([newEntry, ...entries])
    }

    const onEntryUpdated = (id: string, newEntry: Entry) => {
        setEntries(entries.map(e => e.id === id ? newEntry : e))
    }

    useRequest(`/games/${gameId}`, [gameId], setGame)
    useRequest(`/entries?game=${gameId}&player=${playerId}`, [gameId, playerId], setEntries)
    useRequest(`/games/${gameId}/stats?player=${playerId}`, [gameId, playerId], setGameStats)
    useRequest(`/players?forPlayer=${playerId}`, [playerId], setPlayersList, !!playerId)
    useRequest(`/game/${gameId}/customFields`, [gameId], (data: { myFields: CustomField[], shareableFields: CustomField[] }) => {
        setCustomFields(data.myFields)
        setShareableFields(data.shareableFields)
    })

    if (game === null) {
        return (
            <div>loading</div>
        )
    }

    return (
        <Layout>
            <div className='flex text-white h-[calc(100vh-7rem)] gap-4'>
                <section className="w-80 shrink-0 flex flex-col bg-slate-900/30 backdrop-blur-sm rounded-lg border border-slate-600/30 overflow-hidden">
                    <div className="shrink-0 border-b border-slate-600/30">
                        <div
                            onClick={() => selectEntry(null)}
                            className={`p-4 flex items-center justify-center cursor-pointer transition-all ${!selectedEntry && !showStatistics && !showCampaigns
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'hover:bg-slate-800/50'
                                }`}
                        >
                            <h1 className="text-lg font-semibold">{game.name}</h1>
                        </div>
                        {customFields.length > 0 && (
                            <button
                                onClick={toggleStatistics}
                                className={`w-full flex items-center justify-center gap-2 py-2 text-sm transition-colors ${showStatistics
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50'
                                    }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Statistics
                            </button>
                        )}
                        <button
                            onClick={toggleCampaigns}
                            className={`w-full flex items-center justify-center gap-2 py-2 text-sm transition-colors ${showCampaigns
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50'
                                }`}
                        >
                            <Scroll className="w-4 h-4" />
                            Campaigns
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {entries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                                <FileText className="w-12 h-12 text-slate-600 mb-3" strokeWidth={1} />
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
                    {showCampaigns ? (
                        <CampaignPanel gameId={gameId} />
                    ) : showStatistics ? (
                        <StatisticsPanel gameId={gameId} playerId={playerId} customFields={customFields} />
                    ) : selectedEntry ? (
                        <EntryDetailPanel key={selectedEntry.id} gameId={gameId} playerId={playerId} entry={selectedEntry} onEntryUpdated={onEntryUpdated} allPlayers={playersList} customFields={customFields} />
                    ) : (
                        <GameDetailPanel 
                            game={game} 
                            gameStats={gameStats} 
                            playerId={playerId} 
                            onEntryCreated={onEntryCreated} 
                            onGameUpdated={setGame}
                            customFields={customFields}
                            shareableFields={shareableFields}
                            onCustomFieldsChanged={(myFields: CustomField[], shareableFieldsUpdated: CustomField[]) => {
                                setCustomFields(myFields)
                                setShareableFields(shareableFieldsUpdated)
                            }}
                        />
                    )}
                </section>
            </div>
        </Layout>
    )
}
