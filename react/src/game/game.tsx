import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQuery } from '../hooks/useQuery'
import { parseJwt } from '../hooks/useLocalStorage'
import Layout from '../Layout'
import { StatisticsPanel } from './statistics'
import { EntryListItem, EntryDetailPanel } from './entryPanel'
import { GameDetailPanel } from './gameDetailPanel'
import { BarChart3, FileText, Scroll } from 'lucide-react'
import { CampaignPanel } from './campaignPanel'
import { CustomField, Entry, Game as GameType, GameStats, CampaignSummary } from '../types'
import { motion } from 'framer-motion'

export default function Game() {
    const { gameId } = useParams() as { gameId: string }
    const navigate = useNavigate()
    const [game, setGame] = useState<GameType | null>(null)
    const [gameStats, setGameStats] = useState<GameStats | null>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
    const [showStatistics, setShowStatistics] = useState(false)
    const [showCampaigns, setShowCampaigns] = useState(false)
    const [customFields, setCustomFields] = useState<CustomField[]>([])
    const [shareableFields, setShareableFields] = useState<CustomField[]>([])
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])

    const [searchParams] = useSearchParams()

    const playerId = searchParams.get('playerId')
    const isOwner = (() => {
        if (!playerId) return true
        const token = localStorage.getItem('jwt')
        if (!token) return false
        try {
            const decoded = parseJwt(JSON.parse(token))
            return decoded.id === playerId
        } catch {
            return false
        }
    })()
    const isAdmin = (() => {
        const token = localStorage.getItem('jwt')
        if (!token) return false
        try {
            const decoded = parseJwt(JSON.parse(token))
            return Array.isArray(decoded.roles) && decoded.roles.includes('ROLE_ADMIN')
        } catch {
            return false
        }
    })()
    const entryIdFromUrl = searchParams.get('entryId')

    const selectedEntry = selectedEntryId ? (entries.find((e) => e.id === selectedEntryId) ?? null) : null

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
        if (entryIdFromUrl && entries.length > 0 && !selectedEntryId && entries.some((e) => e.id === entryIdFromUrl)) {
            setSelectedEntryId(entryIdFromUrl)
        }
    }, [entryIdFromUrl, entries, selectedEntryId])

    const sortEntries = (list: Entry[]) =>
        [...list].sort((a, b) => {
            const dateDiff = new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
            return dateDiff !== 0 ? dateDiff : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

    const onEntryCreated = (newEntry: Entry) => {
        setEntries(sortEntries([newEntry, ...entries]))
    }

    const onEntryUpdated = (id: string, newEntry: Entry) => {
        setEntries(sortEntries(entries.map((e) => (e.id === id ? newEntry : e))))
    }

    const onEntryDeleted = (id: string) => {
        setEntries(entries.filter((e) => e.id !== id))
        setSelectedEntryId(null)
    }

    const { data: fetchedGame } = useQuery<GameType>(`/games/${gameId}`)
    const { data: fetchedEntries } = useQuery<Entry[]>(`/entries?game=${gameId}&player=${playerId}`)
    const { data: fetchedGameStats } = useQuery<GameStats>(`/games/${gameId}/stats?player=${playerId}`)
    const { data: fetchedCustomFieldsData } = useQuery<{ myFields: CustomField[]; shareableFields: CustomField[] }>(`/game/${gameId}/customFields`)
    const { data: fetchedCampaigns } = useQuery<CampaignSummary[]>(`/campaigns?game=${gameId}`)

    useEffect(() => {
        if (fetchedGame) setGame(fetchedGame)
    }, [fetchedGame])
    useEffect(() => {
        if (fetchedEntries) setEntries(fetchedEntries)
    }, [fetchedEntries])
    useEffect(() => {
        if (fetchedGameStats) setGameStats(fetchedGameStats)
    }, [fetchedGameStats])
    useEffect(() => {
        if (fetchedCustomFieldsData) {
            setCustomFields(fetchedCustomFieldsData.myFields)
            setShareableFields(fetchedCustomFieldsData.shareableFields)
        }
    }, [fetchedCustomFieldsData])
    useEffect(() => {
        if (fetchedCampaigns) setCampaigns(fetchedCampaigns)
    }, [fetchedCampaigns])

    return (
        <Layout>
            <motion.div
                initial={{ y: '30%', opacity: 0, scale: 0.97, filter: 'blur(6px)' }}
                animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="flex text-white h-[calc(100vh-7rem)]"
            >
                {game === null ? (
                    <GameSkeleton />
                ) : (
                    <>
                        <aside className="w-80 shrink-0 flex flex-col bg-slate-950/60 backdrop-blur-md rounded-l-lg border border-cyan-400/20 border-r-0">
                            <div className="shrink-0 border-b border-cyan-400/20">
                                <div
                                    onClick={() => selectEntry(null)}
                                    className={`p-4 cursor-pointer transition-all ${
                                        !selectedEntry && !showStatistics && !showCampaigns ? 'bg-cyan-500/10' : 'hover:bg-slate-800/50'
                                    }`}
                                >
                                    <h1 className="text-sm font-bold tracking-[0.2em] text-cyan-400 uppercase text-center">{game.name}</h1>
                                    <div className="text-[10px] text-slate-500 mt-1 font-mono text-center">
                                        {entries.length} {entries.length === 1 ? 'ENTRY' : 'ENTRIES'} LOGGED
                                    </div>
                                </div>
                                <div className="flex border-t border-cyan-400/10">
                                    <button
                                        onClick={toggleStatistics}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-all ${
                                            showStatistics
                                                ? 'bg-cyan-500/15 text-cyan-400 shadow-[inset_0_-2px_0_rgba(34,211,238,0.4)]'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                                        }`}
                                    >
                                        <BarChart3 className="w-3.5 h-3.5" />
                                        <span className="text-xs tracking-wider">Statistics</span>
                                    </button>
                                    <div className="w-px bg-cyan-400/10" />
                                    <button
                                        onClick={toggleCampaigns}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm transition-all ${
                                            showCampaigns
                                                ? 'bg-cyan-500/15 text-cyan-400 shadow-[inset_0_-2px_0_rgba(34,211,238,0.4)]'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                                        }`}
                                    >
                                        <Scroll className="w-3.5 h-3.5" />
                                        <span className="text-xs tracking-wider">Campaigns</span>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {entries.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full p-6 text-center relative overflow-hidden">
                                        <div className="absolute inset-0 pointer-events-none">
                                            <div className="absolute left-0 right-0 h-px bg-cyan-400/20 animate-scan" />
                                        </div>
                                        <FileText className="w-12 h-12 text-slate-600 mb-3" strokeWidth={1} />
                                        <span className="text-slate-400 text-sm font-mono">No entries yet</span>
                                        <span className="text-slate-600 text-xs mt-2 font-mono leading-relaxed max-w-[200px]">
                                            Select the game name above to log your first play session with date, players, and results.
                                        </span>
                                    </div>
                                ) : (
                                    entries.map((entry) => (
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
                        </aside>
                        <section className="flex-1 overflow-y-auto rounded-r-lg border border-slate-600/30 border-l-cyan-400/20 p-4">
                            {showCampaigns ? (
                                <CampaignPanel gameId={gameId} isOwner={isOwner} />
                            ) : showStatistics ? (
                                <StatisticsPanel gameId={gameId} playerId={playerId} customFields={customFields} />
                            ) : selectedEntry ? (
                                <EntryDetailPanel
                                    key={selectedEntry.id}
                                    gameId={gameId}
                                    playerId={playerId}
                                    entry={selectedEntry}
                                    onEntryUpdated={onEntryUpdated}
                                    onEntryDeleted={onEntryDeleted}
                                    customFields={customFields}
                                    campaigns={campaigns}
                                    isOwner={isOwner}
                                />
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
                                    isAdmin={isAdmin}
                                    isOwner={isOwner}
                                />
                            )}
                        </section>
                    </>
                )}
            </motion.div>
        </Layout>
    )
}

function GameSkeleton() {
    return (
        <>
            <aside className="w-80 shrink-0 flex flex-col bg-slate-950/60 backdrop-blur-md rounded-l-lg border border-cyan-400/20 border-r-0">
                <div className="shrink-0 border-b border-cyan-400/20 p-4">
                    <div className="h-4 w-40 mx-auto rounded bg-slate-700/50 animate-pulse" />
                    <div className="h-3 w-24 mx-auto rounded bg-slate-800/50 animate-pulse mt-2" />
                </div>
                <div className="flex border-t border-cyan-400/10">
                    <div className="flex-1 py-3 flex justify-center">
                        <div className="h-3 w-16 rounded bg-slate-800/50 animate-pulse" />
                    </div>
                    <div className="w-px bg-cyan-400/10" />
                    <div className="flex-1 py-3 flex justify-center">
                        <div className="h-3 w-16 rounded bg-slate-800/50 animate-pulse" />
                    </div>
                </div>
                <div className="overflow-y-auto flex-1 p-2 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-14 rounded-lg border border-slate-700/30 bg-slate-900/30 animate-pulse" />
                    ))}
                </div>
            </aside>
            <section className="flex-1 rounded-r-lg border border-slate-600/30 border-l-cyan-400/20 p-4">
                <div className="space-y-4">
                    <div className="h-6 w-48 rounded bg-slate-700/50 animate-pulse" />
                    <div className="h-4 w-64 rounded bg-slate-800/50 animate-pulse" />
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 rounded-lg border border-slate-700/30 bg-slate-900/30 animate-pulse" />
                        ))}
                    </div>
                </div>
            </section>
        </>
    )
}
