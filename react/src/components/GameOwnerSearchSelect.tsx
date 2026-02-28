import { useState, useRef, useEffect } from "react"
import { addGameToLibrary } from '../api/games'
import { searchPlayers } from '../api/players'
import { Package, Plus, Search, ArrowLeft } from 'lucide-react'
import type { GameOwner } from '../types'
import { useCircle } from '../contexts/CircleContext'
import { useRequest } from '../hooks/useRequest'

type PlayerOption = { id: string; name: string; nickname?: string | null }

type GameOwnerSearchSelectProps = {
    gameId: string
    playerId: string | null
    value: string
    onChange: (gameOwnerId: string) => void
    autoSelectOwner?: boolean
    initialOwnerPlayerName?: string
    placeholder?: string
}

export default function GameOwnerSearchSelect({
    gameId,
    playerId,
    value,
    onChange,
    autoSelectOwner = false,
    initialOwnerPlayerName,
    placeholder = "Search player...",
}: GameOwnerSearchSelectProps) {
    const { players: circlePlayers } = useCircle()
    const [gameOwners, setGameOwners] = useState<GameOwner[]>([])
    const [scope, setScope] = useState<'circle' | 'all'>('circle')
    const [allResults, setAllResults] = useState<PlayerOption[]>([])
    const [searching, setSearching] = useState(false)
    const [activated, setActivated] = useState(autoSelectOwner)

    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [editing, setEditing] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const [adding, setAdding] = useState<string | null>(null)
    const [addError, setAddError] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout>>()

    useRequest(`/games/${gameId}/owners`, [gameId, activated], setGameOwners, activated)

    const playersList = scope === 'all' ? allResults : circlePlayers

    useEffect(() => {
        if (scope !== 'all') return
        if (!query.trim()) {
            setAllResults([])
            setSearching(false)
            return
        }

        setSearching(true)
        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            const { data, ok } = await searchPlayers(query.trim())
            if (ok && data) {
                setAllResults(data)
            }
            setSearching(false)
        }, 300)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query, scope])

    useEffect(() => {
        if (autoSelectOwner && !value && gameOwners.length > 0) {
            const currentPlayerOwnership = gameOwners.find(go => go.player.id === playerId)
            if (currentPlayerOwnership) {
                onChange(currentPlayerOwnership.id)
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSelectOwner, value, gameOwners, playerId])

    const selectedOwner = gameOwners.find(go => go.id === value)
    const ownersByPlayerId = new Map(gameOwners.map(go => [go.player.id, go]))

    const isSearching = query.trim() !== ""

    const filtered = (() => {
        if (isSearching) {
            const map = new Map<string, PlayerOption>()
            for (const go of gameOwners) {
                map.set(go.player.id, { id: go.player.id, name: go.player.name })
            }
            for (const p of playersList) {
                map.set(p.id, p)
            }
            const all = [...map.values()]
            const q = query.toLowerCase()
            return all
                .filter(p => p.name.toLowerCase().includes(q))
                .sort((a, b) => {
                    const aOwns = ownersByPlayerId.has(a.id) ? 0 : 1
                    const bOwns = ownersByPlayerId.has(b.id) ? 0 : 1
                    if (aOwns !== bOwns) return aOwns - bOwns
                    return a.name.localeCompare(b.name)
                })
        }
        return gameOwners
            .map(go => ({ id: go.player.id, name: go.player.name }))
            .sort((a, b) => a.name.localeCompare(b.name))
    })()

    const showScopeAction = isSearching
    const totalItems = filtered.length + (showScopeAction ? 1 : 0)

    useEffect(() => {
        setHighlightIndex(-1)
        setAddError(null)
    }, [query])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
                setEditing(false)
                setQuery("")
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const startEditing = () => {
        setActivated(true)
        setEditing(true)
        setOpen(true)
        setQuery("")
        setTimeout(() => inputRef.current?.focus(), 0)
    }

    const handleSelectOwner = (gameOwnerId: string) => {
        onChange(gameOwnerId)
        setQuery("")
        setOpen(false)
        setEditing(false)
        setScope('circle')
        setAllResults([])
    }

    const handleAddToCollection = async (player: PlayerOption) => {
        if (adding) return
        setAdding(player.id)
        setAddError(null)

        const { data, ok, error } = await addGameToLibrary(player.id, { gameId })

        setAdding(null)
        if (ok && data && data.game_owned_id) {
            const newOwner: GameOwner = {
                id: data.game_owned_id,
                game: { id: gameId, name: data.game_name, customFields: [], campaignKeys: [] },
                price: data.price,
                player: { id: player.id, name: player.name },
            }
            setGameOwners(prev => [...prev, newOwner])
            onChange(data.game_owned_id)
            setQuery("")
            setOpen(false)
            setEditing(false)
            setScope('circle')
            setAllResults([])
        } else {
            setAddError(error ?? 'Failed to add game to collection')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open && e.key !== 'Escape') {
            setOpen(true)
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(i => Math.min(i + 1, totalItems - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlightIndex >= 0 && highlightIndex < filtered.length) {
                const player = filtered[highlightIndex]
                const owner = ownersByPlayerId.get(player.id)
                if (owner) {
                    handleSelectOwner(owner.id)
                } else {
                    handleAddToCollection(player)
                }
            } else if (showScopeAction && highlightIndex === totalItems - 1) {
                if (scope === 'circle') {
                    setScope('all')
                    setHighlightIndex(-1)
                } else {
                    setScope('circle')
                    setAllResults([])
                    setHighlightIndex(-1)
                }
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
            setEditing(false)
            setQuery("")
        }
    }

    const ownerLabel = selectedOwner
        ? `${selectedOwner.player.name}'s copy${selectedOwner.player.id === playerId ? ' (yours)' : ''}`
        : initialOwnerPlayerName
            ? `${initialOwnerPlayerName}'s copy`
            : null
    const showInput = editing || !value || !ownerLabel

    return (
        <div ref={containerRef} className="relative">
            {showInput ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setOpen(true); setAddError(null) }}
                    onFocus={() => { setActivated(true); setOpen(true) }}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-400/50"
                />
            ) : (
                <button
                    type="button"
                    onClick={startEditing}
                    className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm text-left hover:border-cyan-400/50 transition-colors cursor-pointer"
                >
                    {ownerLabel}
                </button>
            )}
            {open && (totalItems > 0 || !isSearching) && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded bg-slate-800 border border-slate-600 shadow-lg">
                    {!isSearching && (
                        <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-600/50">
                            Type a name to select an existing owner or add the game to their collection
                        </div>
                    )}
                    {scope === 'all' && searching && (
                        <div className="px-3 py-2 text-xs text-slate-400">Searching...</div>
                    )}
                    {scope === 'all' && !searching && isSearching && filtered.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400">No players found</div>
                    )}
                    {filtered.map((player, i) => {
                        const owner = ownersByPlayerId.get(player.id)
                        const isAdding = adding === player.id
                        return (
                            <button
                                key={player.id}
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                    i === highlightIndex
                                        ? 'bg-cyan-500/20 text-cyan-400'
                                        : 'text-white hover:bg-slate-700'
                                }`}
                                onMouseEnter={() => setHighlightIndex(i)}
                                onClick={() => {
                                    if (owner) {
                                        handleSelectOwner(owner.id)
                                    } else {
                                        handleAddToCollection(player)
                                    }
                                }}
                                disabled={isAdding}
                            >
                                {owner ? (
                                    <>
                                        <Package className="w-4 h-4 text-cyan-400 shrink-0" />
                                        {player.name}'s copy{player.id === playerId ? ' (yours)' : ''}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 shrink-0" />
                                        {isAdding ? 'Adding...' : `Add to ${player.name}'s collection`}
                                    </>
                                )}
                            </button>
                        )
                    })}
                    {showScopeAction && (
                        <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-slate-600 transition-colors ${
                                highlightIndex === totalItems - 1
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-300 hover:bg-slate-700'
                            }`}
                            onMouseEnter={() => setHighlightIndex(totalItems - 1)}
                            onClick={() => {
                                if (scope === 'circle') {
                                    setScope('all')
                                    setHighlightIndex(-1)
                                } else {
                                    setScope('circle')
                                    setAllResults([])
                                    setHighlightIndex(-1)
                                }
                            }}
                        >
                            {scope === 'circle' ? (
                                <><Search className="w-4 h-4" /> Search all users</>
                            ) : (
                                <><ArrowLeft className="w-4 h-4" /> Back to circle</>
                            )}
                        </button>
                    )}
                </div>
            )}
            {addError && (
                <p className="text-red-400 text-xs mt-1">{addError}</p>
            )}
        </div>
    )
}
