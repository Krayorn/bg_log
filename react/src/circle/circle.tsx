import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import { createPlayer, synchronizePlayer, setNickname, removeNickname } from '../api/players'
import PlayerSearchSelect from '../components/PlayerSearchSelect'
import { SciFiPanel, MetricCard, CornerBrackets } from '../components/SciFi'
import { motion } from 'framer-motion'

import { UserPlus, User, Users, Gamepad2, Trophy } from 'lucide-react'
import { CirclePlayer } from '../types'
import { useCircle } from '../contexts/CircleContext'

function CircleGraph({ players }: { players: CirclePlayer[] }) {
    const cx = 250
    const cy = 250
    const radius = 180
    const centerR = 24
    const nodeR = 16
    const maxGames = Math.max(1, ...players.map((p) => p.gamesPlayed))

    const nodes = useMemo(
        () =>
            players.map((p, i) => {
                const angle = (2 * Math.PI * i) / players.length - Math.PI / 2
                return {
                    ...p,
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle),
                }
            }),
        [players],
    )

    return (
        <SciFiPanel title="NETWORK MAP" className="!p-0">
            <svg viewBox="0 0 500 500" width="100%" className="block">
                <defs>
                    <filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="glow-amber" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <radialGradient id="center-glow">
                        <stop offset="0%" stopColor="rgba(34,211,238,0.3)" />
                        <stop offset="100%" stopColor="rgba(34,211,238,0)" />
                    </radialGradient>
                </defs>

                <circle cx={cx} cy={cy} r={60} fill="url(#center-glow)" />

                {nodes.map((node) => {
                    const strength = node.gamesPlayed / maxGames
                    return (
                        <motion.line
                            key={`edge-${node.id}`}
                            x1={cx}
                            y1={cy}
                            x2={node.x}
                            y2={node.y}
                            stroke={node.isGuest ? '#f59e0b' : '#22d3ee'}
                            strokeWidth={1 + strength * 2}
                            strokeOpacity={0.15 + strength * 0.4}
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        />
                    )
                })}

                <motion.circle
                    cx={cx}
                    cy={cy}
                    r={centerR}
                    fill="rgba(15,23,42,0.8)"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    filter="url(#glow-cyan)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                />
                <text x={cx} y={cy + 4} textAnchor="middle" fill="#22d3ee" fontSize="10" fontFamily="monospace">
                    YOU
                </text>

                {nodes.map((node, i) => (
                    <motion.g
                        key={node.id}
                        initial={{ opacity: 0, x: cx - node.x, y: cy - node.y }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 + i * 0.05 }}
                    >
                        <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeR}
                            fill="rgba(15,23,42,0.8)"
                            stroke={node.isGuest ? '#f59e0b' : '#22d3ee'}
                            strokeWidth={1.5}
                            filter={node.isGuest ? 'url(#glow-amber)' : 'url(#glow-cyan)'}
                        />
                        <text x={node.x} y={node.y + nodeR + 14} textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                            {node.nickname ?? node.name}
                        </text>
                    </motion.g>
                ))}
            </svg>
        </SciFiPanel>
    )
}

export default function Circle() {
    const { playerId } = useParams() as { playerId: string }
    const { data: fetchedCirclePlayers } = useQuery<CirclePlayer[]>(`/players/${playerId}/circle`)
    const [circlePlayers, setCirclePlayers] = useState<CirclePlayer[]>([])
    const { players: contextPlayers } = useCircle()
    const [syncingGuestId, setSyncingGuestId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [newGuestName, setNewGuestName] = useState('')
    const [showCreateGuest, setShowCreateGuest] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)

    useEffect(() => {
        if (fetchedCirclePlayers) setCirclePlayers(fetchedCirclePlayers)
    }, [fetchedCirclePlayers])

    const registeredPlayers = contextPlayers.filter((p) => !p.isGuest)

    const handleCreateGuest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newGuestName.trim()) return
        setCreateError(null)

        const { data, ok, error: apiError } = await createPlayer(newGuestName.trim())

        if (ok && data) {
            setNewGuestName('')
            setShowCreateGuest(false)
        } else {
            setCreateError(apiError ?? 'Failed to create guest player')
        }
    }

    const guests = circlePlayers.filter((p) => p.isGuest)
    const registered = circlePlayers.filter((p) => !p.isGuest)

    const totalGames = circlePlayers.reduce((sum, p) => sum + p.gamesPlayed, 0)
    const bestWinRate = useMemo(() => {
        const withGames = circlePlayers.filter((p) => p.gamesPlayed > 0)
        if (withGames.length === 0) return '—'
        const best = withGames.reduce((a, b) => (a.wins / a.gamesPlayed > b.wins / b.gamesPlayed ? a : b))
        return best.nickname ?? best.name
    }, [circlePlayers])

    return (
        <>
            <header className="border-b border-slate-500/50 pb-4 flex items-center mb-8">
                <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mr-4">
                    <User className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-white">Your Circle</h1>
                    <span className="text-sm text-slate-500 font-mono">{circlePlayers.length} players</span>
                </div>
            </header>

            {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <MetricCard icon={<Users className="w-5 h-5" />} label="Total Players" value={circlePlayers.length} accent="cyan" />
                <MetricCard icon={<Gamepad2 className="w-5 h-5" />} label="Total Games Together" value={totalGames} accent="purple" delay={0.5} />
                <MetricCard icon={<Trophy className="w-5 h-5" />} label="Best Win Rate" value={bestWinRate} accent="cyan" delay={1} />
            </div>

            {circlePlayers.length > 0 && (
                <div className="mb-8">
                    <CircleGraph players={circlePlayers} />
                </div>
            )}

            <section className="mb-6">
                {showCreateGuest ? (
                    <form
                        onSubmit={handleCreateGuest}
                        className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4 flex items-end gap-3 flex-wrap"
                    >
                        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                            <label className="text-white text-sm font-medium">Guest Player Name</label>
                            <input
                                autoFocus
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                placeholder="Enter name..."
                                value={newGuestName}
                                onChange={(e) => setNewGuestName(e.target.value)}
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
                            onClick={() => {
                                setShowCreateGuest(false)
                                setNewGuestName('')
                                setCreateError(null)
                            }}
                            className="px-4 py-2 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        {createError && <div className="w-full text-red-400 text-sm">{createError}</div>}
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
                <div className="mb-6">
                    <SciFiPanel title="GUEST PLAYERS">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {guests.map((player) => (
                                <div
                                    key={player.id}
                                    className={`relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4 hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all duration-300 ${syncingGuestId === player.id ? 'z-10' : ''}`}
                                >
                                    <CornerBrackets color="cyan" />
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-lg border border-slate-600/50 p-2 bg-slate-800/50">
                                                <User className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <div>
                                                <Link
                                                    to={`/players/${player.id}`}
                                                    className="text-white font-medium hover:text-cyan-400 transition-colors"
                                                >
                                                    {player.name}
                                                </Link>
                                                <div className="text-xs text-slate-500">#{player.number.toString().padStart(4, '0')}</div>
                                                <NicknameEditor
                                                    playerId={player.id}
                                                    currentNickname={player.nickname}
                                                    onUpdate={(nickname) => {
                                                        setCirclePlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, nickname } : p)))
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                Guest
                                            </span>
                                            {syncingGuestId !== player.id && (
                                                <button
                                                    onClick={() => {
                                                        setSyncingGuestId(player.id)
                                                        setError(null)
                                                    }}
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
                                                        const { ok, error: apiError } = await synchronizePlayer(player.id, p.id)
                                                        if (ok) {
                                                            setCirclePlayers((prev) => prev.filter((cp) => cp.id !== player.id))
                                                            setSyncingGuestId(null)
                                                        } else {
                                                            setError(apiError ?? 'Synchronization failed')
                                                        }
                                                    }}
                                                    placeholder="Search registered player..."
                                                />
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSyncingGuestId(null)
                                                    setError(null)
                                                }}
                                                className="text-xs px-3 py-2 rounded bg-slate-700/50 text-slate-400 border border-slate-600/50 hover:bg-slate-600/50 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </SciFiPanel>
                </div>
            )}

            <SciFiPanel title="REGISTERED PLAYERS">
                {registered.length === 0 ? (
                    <div className="text-slate-500 text-sm">No registered players in your circle yet</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {registered.map((player) => (
                            <div
                                key={player.id}
                                className="relative overflow-hidden bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all duration-300"
                            >
                                <CornerBrackets color="cyan" />
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-lg border border-slate-600/50 p-2 bg-slate-800/50">
                                            <User className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <Link
                                                to={`/players/${player.id}`}
                                                className="text-white font-medium hover:text-cyan-400 transition-colors"
                                            >
                                                {player.name}
                                            </Link>
                                            <div className="text-xs text-slate-500">#{player.number.toString().padStart(4, '0')}</div>
                                            <NicknameEditor
                                                playerId={player.id}
                                                currentNickname={player.nickname}
                                                onUpdate={(nickname) => {
                                                    setCirclePlayers((prev) => prev.map((p) => (p.id === player.id ? { ...p, nickname } : p)))
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                        Registered
                                    </span>
                                </div>
                                <PlayerStats player={player} />
                            </div>
                        ))}
                    </div>
                )}
            </SciFiPanel>
        </>
    )
}

function NicknameEditor({
    playerId,
    currentNickname,
    onUpdate,
}: {
    playerId: string
    currentNickname: string | null
    onUpdate: (nickname: string | null) => void
}) {
    const [editing, setEditing] = useState(false)
    const [value, setValue] = useState(currentNickname ?? '')

    const save = async () => {
        const trimmed = value.trim()
        if (trimmed === '') {
            if (currentNickname) {
                await removeNickname(playerId)
                onUpdate(null)
            }
        } else if (trimmed !== currentNickname) {
            await setNickname(playerId, trimmed)
            onUpdate(trimmed)
        }
        setEditing(false)
    }

    if (!editing) {
        return (
            <button
                onClick={() => {
                    setValue(currentNickname ?? '')
                    setEditing(true)
                }}
                className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
            >
                {currentNickname ? `aka "${currentNickname}"` : '+ Add nickname'}
            </button>
        )
    }

    return (
        <input
            autoFocus
            className="text-xs p-1 rounded bg-slate-700 text-white border border-slate-500 w-24"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') setEditing(false)
            }}
            placeholder="Nickname..."
        />
    )
}

function PlayerStats({ player }: { player: CirclePlayer }) {
    return (
        <div className="mt-3 pt-3 border-t border-slate-600/30">
            <span className="text-xs text-slate-500 mb-2 block">Together</span>
            <div className="flex gap-4 text-sm">
                <div className="flex flex-col">
                    <span className="text-white font-medium font-mono">{player.gamesPlayed}</span>
                    <span className="text-xs text-slate-500">Games</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-emerald-400 font-medium font-mono">{player.wins}</span>
                    <span className="text-xs text-slate-500">Your wins</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-red-400 font-medium font-mono">{player.losses}</span>
                    <span className="text-xs text-slate-500">Their wins</span>
                </div>
            </div>
        </div>
    )
}
