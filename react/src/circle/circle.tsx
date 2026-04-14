import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import { useIsOwner } from '../hooks/useIsOwner'
import { createPlayer, synchronizePlayer, setNickname, removeNickname } from '../api/players'
import PlayerSearchSelect from '../components/PlayerSearchSelect'
import { MetricCard } from '../components/SciFi'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3-force'

import { UserPlus, User, Users, Gamepad2, Trophy, Network, ZoomIn, ZoomOut } from 'lucide-react'
import { CirclePlayer, CircleGraphData } from '../types'
import { useCircle } from '../contexts/CircleContext'

interface NetworkNode extends SimulationNodeDatum {
    id: string
    name: string
    nickname: string | null
    isGuest: boolean
    isCurrentPlayer: boolean
    gamesPlayed: number
    wins: number
    losses: number
}

interface NetworkLink extends SimulationLinkDatum<NetworkNode> {
    weight: number
    isCrossLink: boolean
}

const CARD_W = 140
const CARD_H = 82
const CENTER_W = 170
const CENTER_H = 100
const VIEW_W = 1000
const VIEW_H = 600

function CircleNetwork({
    playerId,
    players,
    isOwner,
    registeredPlayers,
    syncingGuestId,
    onStartSync,
    onCancelSync,
    onSyncComplete,
    onSyncError,
    onNicknameUpdate,
}: {
    playerId: string
    players: CirclePlayer[]
    isOwner: boolean
    registeredPlayers: { id: string; name: string; isGuest?: boolean }[]
    syncingGuestId: string | null
    onStartSync: (id: string) => void
    onCancelSync: () => void
    onSyncComplete: (id: string) => void
    onSyncError: (msg: string) => void
    onNicknameUpdate: (id: string, nickname: string | null) => void
}) {
    const navigate = useNavigate()
    const svgRef = useRef<SVGSVGElement>(null)
    const simRef = useRef<ReturnType<typeof forceSimulation<NetworkNode>> | null>(null)

    const [nodes, setNodes] = useState<NetworkNode[]>([])
    const [links, setLinks] = useState<NetworkLink[]>([])
    const [showFullNetwork, setShowFullNetwork] = useState(false)

    const { data: graphData, loading: graphLoading } = useQuery<CircleGraphData>(showFullNetwork ? `/players/${playerId}/circle/graph` : null)

    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
    const panRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
    const didDragRef = useRef(false)

    const maxGames = useMemo(() => Math.max(1, ...players.map((p) => p.gamesPlayed)), [players])
    const totalGames = useMemo(() => players.reduce((s, p) => s + p.gamesPlayed, 0), [players])
    const totalWins = useMemo(() => players.reduce((s, p) => s + p.wins, 0), [players])
    const totalLosses = useMemo(() => players.reduce((s, p) => s + p.losses, 0), [players])

    useEffect(() => {
        if (players.length === 0) return

        const centerNode: NetworkNode = {
            id: playerId,
            name: 'YOU',
            nickname: null,
            isGuest: false,
            isCurrentPlayer: true,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            fx: VIEW_W / 2,
            fy: VIEW_H / 2,
        }

        const playerNodes: NetworkNode[] = players.map((p) => ({
            id: p.id,
            name: p.name,
            nickname: p.nickname,
            isGuest: p.isGuest ?? false,
            isCurrentPlayer: false,
            gamesPlayed: p.gamesPlayed,
            wins: p.wins,
            losses: p.losses,
        }))

        const allNodes = [centerNode, ...playerNodes]

        const starLinks: NetworkLink[] = players.map((p) => ({
            source: playerId,
            target: p.id,
            weight: p.gamesPlayed,
            isCrossLink: false,
        }))

        const crossLinks: NetworkLink[] = graphData
            ? graphData.edges
                  .filter((e) => e.source !== playerId && e.target !== playerId)
                  .map((e) => ({ source: e.source, target: e.target, weight: e.weight, isCrossLink: true }))
            : []

        const allLinks = [...starLinks, ...crossLinks]
        const maxWeight = Math.max(1, ...allLinks.map((l) => l.weight))

        const sim = forceSimulation(allNodes)
            .force(
                'link',
                forceLink<NetworkNode, NetworkLink>(allLinks)
                    .id((d) => d.id)
                    .distance((d) => {
                        if (d.isCrossLink) return 180 - (d.weight / maxWeight) * 60
                        const ratio = d.weight / maxWeight
                        return 120 + (1 - ratio) * 300
                    })
                    .strength((d) => {
                        if (d.isCrossLink) return 0.3 + (d.weight / maxWeight) * 0.4
                        return 0.3 + (d.weight / maxWeight) * 0.5
                    }),
            )
            .force(
                'charge',
                forceManyBody<NetworkNode>().strength((d) => (d.isCurrentPlayer ? 0 : -400)),
            )
            .force('center', forceCenter(VIEW_W / 2, VIEW_H / 2).strength(0.03))
            .force(
                'collide',
                forceCollide<NetworkNode>((d) => (d.isCurrentPlayer ? Math.max(CENTER_W, CENTER_H) / 2 + 20 : CARD_W / 2 + 20)).strength(1),
            )
            .on('tick', () => {
                setNodes([...allNodes])
                setLinks([...allLinks])
            })

        simRef.current = sim
        setTransform({ x: 0, y: 0, scale: 1 })

        return () => {
            sim.stop()
        }
    }, [players, playerId, graphData, maxGames])

    const handleZoom = useCallback((direction: 'in' | 'out') => {
        setTransform((prev) => {
            const factor = direction === 'in' ? 1.3 : 1 / 1.3
            const newScale = Math.max(0.3, Math.min(5, prev.scale * factor))
            const ratio = newScale / prev.scale
            const cx = VIEW_W / 2
            const cy = VIEW_H / 2
            return { x: cx - ratio * (cx - prev.x), y: cy - ratio * (cy - prev.y), scale: newScale }
        })
    }, [])

    const handlePointerDown = useCallback(
        (e: React.PointerEvent) => {
            if (e.button !== 0) return
            const target = e.target as HTMLElement
            if (target.closest('button, input, [data-interactive]')) return
            const svg = svgRef.current
            if (!svg) return
            const rect = svg.getBoundingClientRect()
            panRef.current = {
                startX: ((e.clientX - rect.left) / rect.width) * VIEW_W,
                startY: ((e.clientY - rect.top) / rect.height) * VIEW_H,
                originX: transform.x,
                originY: transform.y,
            }
            didDragRef.current = false
        },
        [transform.x, transform.y],
    )

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!panRef.current) return
        const svg = svgRef.current
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const curX = ((e.clientX - rect.left) / rect.width) * VIEW_W
        const curY = ((e.clientY - rect.top) / rect.height) * VIEW_H
        const dx = curX - panRef.current.startX
        const dy = curY - panRef.current.startY
        const { originX, originY } = panRef.current
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDragRef.current = true
        setTransform((prev) => ({ ...prev, x: originX + dx, y: originY + dy }))
    }, [])

    const handlePointerUp = useCallback(() => {
        panRef.current = null
    }, [])

    const linkMaxWeight = useMemo(() => Math.max(1, ...links.filter((l) => !l.isCrossLink).map((l) => l.weight)), [links])
    const crossLinkMaxWeight = useMemo(() => Math.max(1, ...links.filter((l) => l.isCrossLink).map((l) => l.weight)), [links])

    if (nodes.length === 0) return null

    return (
        <div className="relative">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                width="100%"
                className="block cursor-grab active:cursor-grabbing"
                style={{ minHeight: 400 }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                <defs>
                    <filter id="glow-center" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
                    {links.map((link, i) => {
                        const s = link.source as NetworkNode
                        const t = link.target as NetworkNode
                        const strength = link.isCrossLink ? link.weight / crossLinkMaxWeight : link.weight / linkMaxWeight
                        return (
                            <line
                                key={i}
                                x1={s.x}
                                y1={s.y}
                                x2={t.x}
                                y2={t.y}
                                stroke={link.isCrossLink ? '#64748b' : '#22d3ee'}
                                strokeWidth={link.isCrossLink ? 1 + strength * 2 : 1 + strength * 3}
                                strokeOpacity={link.isCrossLink ? 0.25 + strength * 0.5 : 0.15 + strength * 0.5}
                            />
                        )
                    })}

                    {nodes
                        .filter((n) => n.isCurrentPlayer)
                        .map((node) => (
                            <foreignObject
                                key={node.id}
                                x={(node.x ?? 0) - CENTER_W / 2}
                                y={(node.y ?? 0) - CENTER_H / 2}
                                width={CENTER_W}
                                height={CENTER_H}
                            >
                                <div
                                    className="w-full h-full rounded-lg p-3 flex flex-col items-center justify-center"
                                    style={{
                                        background: 'rgba(15,23,42,0.95)',
                                        border: '2px solid rgba(34,211,238,0.5)',
                                        boxShadow: '0 0 20px rgba(34,211,238,0.15), inset 0 0 15px rgba(34,211,238,0.05)',
                                    }}
                                >
                                    <div className="font-bold font-mono tracking-widest mb-1.5" style={{ fontSize: 13, color: '#22d3ee' }}>
                                        YOU
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <div className="font-bold font-mono leading-none" style={{ fontSize: 15, color: '#22d3ee' }}>
                                                {totalGames}
                                            </div>
                                            <div style={{ fontSize: 7, color: '#64748b' }}>GAMES</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold font-mono leading-none" style={{ fontSize: 15, color: '#34d399' }}>
                                                {totalWins}
                                            </div>
                                            <div style={{ fontSize: 7, color: '#64748b' }}>W</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="font-bold font-mono leading-none" style={{ fontSize: 15, color: '#f87171' }}>
                                                {totalLosses}
                                            </div>
                                            <div style={{ fontSize: 7, color: '#64748b' }}>L</div>
                                        </div>
                                    </div>
                                    <div className="mt-1" style={{ fontSize: 8, color: '#64748b' }}>
                                        {players.length} CONTACTS
                                    </div>
                                </div>
                            </foreignObject>
                        ))}

                    {nodes
                        .filter((n) => !n.isCurrentPlayer)
                        .map((node) => {
                            const bondPct = Math.max((node.gamesPlayed / maxGames) * 100, 3)
                            const borderColor = node.isGuest ? '#f59e0b' : '#22d3ee'
                            const isSyncing = syncingGuestId === node.id
                            const cardH = isSyncing ? CARD_H + 35 : CARD_H
                            return (
                                <foreignObject
                                    key={node.id}
                                    x={(node.x ?? 0) - CARD_W / 2}
                                    y={(node.y ?? 0) - CARD_H / 2}
                                    width={CARD_W}
                                    height={cardH}
                                    className="cursor-pointer overflow-visible"
                                >
                                    <div
                                        className="rounded-md p-2 flex flex-col"
                                        style={{
                                            width: CARD_W,
                                            background: 'rgba(15,23,42,0.92)',
                                            border: `1px solid ${borderColor}40`,
                                            boxShadow: `0 0 8px ${borderColor}15`,
                                        }}
                                        onClick={() => {
                                            if (!didDragRef.current && !isSyncing) navigate(`/players/${node.id}`)
                                        }}
                                    >
                                        <div className="flex items-center gap-1 min-w-0">
                                            <span className="text-[10px] font-medium text-white truncate flex-1 leading-tight">{node.name}</span>
                                            {node.isGuest ? (
                                                <span
                                                    className="shrink-0 text-[7px] leading-none px-1 py-0.5 rounded"
                                                    style={{
                                                        background: 'rgba(245,158,11,0.2)',
                                                        color: '#f59e0b',
                                                        border: '1px solid rgba(245,158,11,0.3)',
                                                    }}
                                                >
                                                    G
                                                </span>
                                            ) : (
                                                <span
                                                    className="shrink-0 text-[7px] leading-none px-1 py-0.5 rounded"
                                                    style={{
                                                        background: 'rgba(52,211,153,0.2)',
                                                        color: '#34d399',
                                                        border: '1px solid rgba(52,211,153,0.3)',
                                                    }}
                                                >
                                                    R
                                                </span>
                                            )}
                                        </div>

                                        {node.nickname && (
                                            <div className="truncate" style={{ fontSize: 8, color: '#94a3b8', marginBottom: 2 }}>
                                                aka &quot;{node.nickname}&quot;
                                            </div>
                                        )}

                                        {isOwner && (
                                            <div className="mb-1" onClick={(e) => e.stopPropagation()}>
                                                <NicknameEditor
                                                    playerId={node.id}
                                                    currentNickname={node.nickname}
                                                    onUpdate={(nickname) => onNicknameUpdate(node.id, nickname)}
                                                />
                                            </div>
                                        )}

                                        <div className="flex justify-between mb-1.5 px-1">
                                            <div className="text-center">
                                                <div className="font-bold font-mono leading-none" style={{ fontSize: 13, color: '#22d3ee' }}>
                                                    {node.gamesPlayed}
                                                </div>
                                                <div style={{ fontSize: 7, color: '#64748b' }}>GAMES</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold font-mono leading-none" style={{ fontSize: 13, color: '#34d399' }}>
                                                    {node.wins}
                                                </div>
                                                <div style={{ fontSize: 7, color: '#64748b' }}>W</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="font-bold font-mono leading-none" style={{ fontSize: 13, color: '#f87171' }}>
                                                    {node.losses}
                                                </div>
                                                <div style={{ fontSize: 7, color: '#64748b' }}>L</div>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(30,41,59,0.8)' }}>
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${bondPct}%`,
                                                        background: `linear-gradient(to right, ${borderColor}cc, ${borderColor}99)`,
                                                        boxShadow: `0 0 4px ${borderColor}50`,
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {isOwner && node.isGuest && !isSyncing && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onStartSync(node.id)
                                                }}
                                                className="mt-1.5 w-full rounded font-mono"
                                                style={{
                                                    fontSize: 7,
                                                    padding: '2px 0',
                                                    background: 'rgba(34,211,238,0.1)',
                                                    color: '#22d3ee',
                                                    border: '1px solid rgba(34,211,238,0.3)',
                                                }}
                                            >
                                                SYNC
                                            </button>
                                        )}

                                        {isOwner && isSyncing && (
                                            <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                                                <PlayerSearchSelect
                                                    players={registeredPlayers}
                                                    onSelect={async (p) => {
                                                        const { ok, error: apiError } = await synchronizePlayer(node.id, p.id)
                                                        if (ok) {
                                                            onSyncComplete(node.id)
                                                        } else {
                                                            onSyncError(apiError ?? 'Synchronization failed')
                                                        }
                                                    }}
                                                    placeholder="Search..."
                                                />
                                                <button
                                                    onClick={onCancelSync}
                                                    className="mt-1 w-full rounded"
                                                    style={{
                                                        fontSize: 7,
                                                        padding: '2px 0',
                                                        background: 'rgba(100,116,139,0.2)',
                                                        color: '#94a3b8',
                                                        border: '1px solid rgba(100,116,139,0.3)',
                                                    }}
                                                >
                                                    CANCEL
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </foreignObject>
                            )
                        })}
                </g>
            </svg>

            <div className="absolute top-3 right-3">
                <button
                    onClick={() => setShowFullNetwork((v) => !v)}
                    disabled={graphLoading}
                    className={`flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded border transition-colors ${
                        showFullNetwork
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50'
                            : 'bg-slate-800/80 text-slate-400 border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30'
                    }`}
                >
                    <Network className="w-3.5 h-3.5" />
                    {graphLoading ? 'LOADING...' : showFullNetwork ? 'STAR VIEW' : 'FULL NETWORK'}
                </button>
            </div>

            <div className="absolute bottom-2 left-3 flex items-center gap-2">
                <button
                    onClick={() => handleZoom('in')}
                    className="flex items-center justify-center w-7 h-7 rounded bg-slate-800/80 text-slate-400 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30 transition-colors"
                >
                    <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => handleZoom('out')}
                    className="flex items-center justify-center w-7 h-7 rounded bg-slate-800/80 text-slate-400 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30 transition-colors"
                >
                    <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[9px] font-mono text-slate-600">drag to pan</span>
            </div>
        </div>
    )
}

export default function Circle() {
    const { playerId } = useParams() as { playerId: string }
    const isOwner = useIsOwner()
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

            {isOwner && (
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
            )}

            {circlePlayers.length === 0 ? (
                <div className="text-slate-500 text-sm font-mono">No players in your circle yet</div>
            ) : (
                <CircleNetwork
                    playerId={playerId}
                    players={circlePlayers}
                    isOwner={isOwner}
                    registeredPlayers={registeredPlayers}
                    syncingGuestId={syncingGuestId}
                    onStartSync={(id) => {
                        setSyncingGuestId(id)
                        setError(null)
                    }}
                    onCancelSync={() => {
                        setSyncingGuestId(null)
                        setError(null)
                    }}
                    onSyncComplete={(id) => {
                        setCirclePlayers((prev) => prev.filter((cp) => cp.id !== id))
                        setSyncingGuestId(null)
                    }}
                    onSyncError={(msg) => setError(msg)}
                    onNicknameUpdate={(id, nickname) => {
                        setCirclePlayers((prev) => prev.map((p) => (p.id === id ? { ...p, nickname } : p)))
                    }}
                />
            )}
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
                style={{ fontSize: 8, color: '#64748b', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
                {currentNickname ? `aka "${currentNickname}"` : '+ nickname'}
            </button>
        )
    }

    return (
        <input
            autoFocus
            style={{
                fontSize: 9,
                padding: '1px 4px',
                borderRadius: 3,
                background: 'rgba(51,65,85,0.8)',
                color: 'white',
                border: '1px solid rgba(100,116,139,0.5)',
                width: '100%',
                outline: 'none',
            }}
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
