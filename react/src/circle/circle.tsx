import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { apiPost } from '../hooks/useApi'
import PlayerSearchSelect from '../components/PlayerSearchSelect'
import Layout from '../Layout'
import { UserPlus, User } from 'lucide-react'

interface CirclePlayer {
    id: string
    name: string
    number: number
    registeredOn: string | null
    isGuest: boolean
    inPartyOf: { id: string; name: string } | null
    gamesPlayed: number
    wins: number
    losses: number
}

interface Player {
    id: string
    name: string
    registeredOn: { date: string } | null
    isGuest: boolean
}

export default function Circle() {
    const { playerId } = useParams() as { playerId: string }
    const [circlePlayers, setCirclePlayers] = useState<CirclePlayer[]>([])
    const [allPlayers, setAllPlayers] = useState<Player[]>([])
    const [syncingGuestId, setSyncingGuestId] = useState<string | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [newGuestName, setNewGuestName] = useState("")
    const [showCreateGuest, setShowCreateGuest] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    useRequest(`/players/${playerId}/circle`, [playerId, refreshKey], setCirclePlayers)
    useRequest(`/players?forPlayer=${playerId}`, [playerId, refreshKey], setAllPlayers)

    const registeredPlayers = allPlayers.filter(p => !p.isGuest)

    const handleCreateGuest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGuestName.trim()) return
        setCreateError(null)

        const { ok, error: apiError } = await apiPost('/players', { name: newGuestName.trim() })

        if (ok) {
            setNewGuestName("")
            setShowCreateGuest(false)
            setRefreshKey(k => k + 1)
        } else {
            setCreateError(apiError ?? 'Failed to create guest player')
        }
    }

    const guests = circlePlayers.filter(p => p.isGuest)
    const registered = circlePlayers.filter(p => !p.isGuest)

    return (
        <Layout>
            <header className="border-b border-slate-500/50 pb-4 mb-8">
                <h1 className="text-xl font-semibold text-white">Your Circle</h1>
                <p className="text-sm text-slate-400">All players you've played with</p>
            </header>

            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {error}
                </div>
            )}

            <section className="mb-6">
                {showCreateGuest ? (
                    <form onSubmit={handleCreateGuest} className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4 flex items-end gap-3 flex-wrap">
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                            <label className="text-white text-sm font-medium">Guest Player Name</label>
                            <input
                                autoFocus
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                placeholder="Enter name..."
                                value={newGuestName}
                                onChange={e => setNewGuestName(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!newGuestName.trim()}
                            className="px-4 py-2 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-400/50 hover:bg-cyan-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => { setShowCreateGuest(false); setNewGuestName(""); setCreateError(null) }}
                            className="px-4 py-2 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        {createError && (
                            <div className="w-full text-red-400 text-sm">{createError}</div>
                        )}
                    </form>
                ) : (
                    <button
                        onClick={() => setShowCreateGuest(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-slate-500 text-slate-400 hover:text-white hover:border-white transition-colors"
                    >
                        <UserPlus className="w-5 h-5" />
                        <span className="text-sm">Add Guest Player</span>
                    </button>
                )}
            </section>

            {guests.length > 0 && (
                <section className="mb-6">
                    <h2 className="text-xs uppercase text-slate-500 font-medium tracking-wider mb-3">Guest Players</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {guests.map(player => (
                            <div key={player.id} className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg border border-slate-600/50 p-2 bg-slate-800/50">
                                            <User className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <Link to={`/players/${player.id}`} className="text-white font-medium hover:text-cyan-400 transition-colors">{player.name}</Link>
                                            <div className="text-xs text-slate-500">#{player.number.toString().padStart(4, '0')}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Guest</span>
                                        {syncingGuestId !== player.id && (
                                            <button
                                                onClick={() => { setSyncingGuestId(player.id); setError(null) }}
                                                className="text-xs px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-400/50 hover:bg-cyan-500/30 transition-colors"
                                            >
                                                Synchronize
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <PlayerStats player={player} />
                                {syncingGuestId === player.id && (
                                    <div className="mt-3 pt-3 border-t border-slate-600/30 flex items-center gap-2 flex-wrap">
                                        <div className="flex-1 min-w-[150px]">
                                            <PlayerSearchSelect
                                                players={registeredPlayers}
                                                onSelect={async (p) => {
                                                    setError(null)
                                                    const { ok, error: apiError } = await apiPost(`/players/${player.id}/synchronize`, {
                                                        registeredPlayerId: p.id,
                                                    })
                                                    if (ok) {
                                                        setSyncingGuestId(null)
                                                        setRefreshKey(k => k + 1)
                                                    } else {
                                                        setError(apiError ?? 'Synchronization failed')
                                                    }
                                                }}
                                                placeholder="Search registered player..."
                                            />
                                        </div>
                                        <button
                                            onClick={() => { setSyncingGuestId(null); setError(null) }}
                                            className="text-xs px-3 py-2 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section>
                <h2 className="text-xs uppercase text-slate-500 font-medium tracking-wider mb-3">Registered Players</h2>
                {registered.length === 0 ? (
                    <div className="text-slate-500 text-sm">No registered players in your circle yet</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {registered.map(player => (
                            <div key={player.id} className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg border border-slate-600/50 p-2 bg-slate-800/50">
                                            <User className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <Link to={`/players/${player.id}`} className="text-white font-medium hover:text-cyan-400 transition-colors">{player.name}</Link>
                                            <div className="text-xs text-slate-500">#{player.number.toString().padStart(4, '0')}</div>
                                        </div>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Registered</span>
                                </div>
                                <PlayerStats player={player} />
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </Layout>
    )
}

function PlayerStats({ player }: { player: CirclePlayer }) {
    return (
        <div className="mt-3 pt-3 border-t border-slate-600/30">
            <span className="text-xs text-slate-500 mb-2 block">Together</span>
            <div className="flex gap-4 text-sm">
                <div className="flex flex-col">
                    <span className="text-white font-medium">{player.gamesPlayed}</span>
                    <span className="text-xs text-slate-500">Games</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-emerald-400 font-medium">{player.wins}</span>
                    <span className="text-xs text-slate-500">Your wins</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-red-400 font-medium">{player.losses}</span>
                    <span className="text-xs text-slate-500">Their wins</span>
                </div>
            </div>
        </div>
    )
}
