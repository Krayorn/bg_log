import { useState, useEffect, memo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import { useDebounce } from '../hooks/useDebounce'
import { useIsOwner } from '../hooks/useIsOwner'
import { createGame, addGameToLibrary, updateOwnedGame } from '../api/games'

import { Puzzle, ExternalLink, Gamepad2, TrendingDown, Search } from 'lucide-react'
import { PlayerGameStats, Game } from '../types'
import { SciFiPanel, MetricCard, CircuitTitle } from '../components/SciFi'

export default function Games() {
    const { playerId } = useParams() as { playerId: string }
    const navigate = useNavigate()
    const isOwner = useIsOwner()
    const [query, setQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Game[]>([])
    const [selected, setSelected] = useState<Game | null>(null)
    const [price, setPrice] = useState('')
    const [message, setMessage] = useState('')
    const [editingField, setEditingField] = useState<{ id: string; field: 'name' | 'price' } | null>(null)
    const [editValue, setEditValue] = useState('')
    const [addToCollection, setAddToCollection] = useState(true)
    const debouncedQuery = useDebounce(query, 300)

    const { data: fetchedGames } = useQuery<PlayerGameStats[]>(`/players/${playerId}/games`)
    const [games, setGames] = useState<PlayerGameStats[]>([])

    useEffect(() => {
        if (fetchedGames) setGames(fetchedGames)
    }, [fetchedGames])

    const { data: searchData } = useQuery<Game[]>(debouncedQuery ? `/games?query=${debouncedQuery}` : null)

    useEffect(() => {
        if (searchData) {
            setSearchResults(searchData)
            setSelected(null)
        }
    }, [searchData])

    useEffect(() => {
        if (debouncedQuery === '' && searchResults.length > 0) {
            setSearchResults([])
            setSelected(null)
        }
    }, [debouncedQuery, searchResults.length])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (selected === null && searchResults.length > 0) {
                    setSelected(searchResults[0])
                } else if (selected) {
                    const idx = searchResults.findIndex((r) => r.id === selected.id)
                    if (searchResults.length > idx + 1) {
                        setSelected(searchResults[idx + 1])
                    }
                }
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault()
                if (selected !== null) {
                    const idx = searchResults.findIndex((r) => r.id === selected.id)
                    if (idx - 1 >= 0) {
                        setSelected(searchResults[idx - 1])
                    }
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [selected, searchResults])

    const addGame = async (gameId: string) => {
        const body: { gameId: string; price?: number } = { gameId }
        if (price !== '') {
            body.price = parseInt(price)
        }

        const { data, error, ok } = await addGameToLibrary(playerId, body)

        if (ok && data) {
            setGames((prev) => {
                const idx = prev.findIndex((g) => g.game_id === data.game_id)
                return idx >= 0 ? prev.map((g) => (g.game_id === data.game_id ? data : g)) : [...prev, data]
            })
            setMessage('Game added to your collection')
            setQuery('')
            setPrice('')
            setSelected(null)
        } else {
            setMessage(error || 'Error adding game')
        }
    }

    const createGameOnly = async () => {
        if (selected) {
            setMessage('Game already exists in the database')
            setQuery('')
            setSelected(null)
            return
        }

        if (query.trim() === '') return

        const { error, ok } = await createGame(query.trim())
        if (ok) {
            setMessage('Game created in the database')
            setQuery('')
        } else {
            setMessage(error || 'Error creating game')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!addToCollection) {
            await createGameOnly()
            return
        }

        if (selected) {
            await addGame(selected.id)
        } else if (query.trim() !== '') {
            const { data: newGame, error, ok } = await createGame(query.trim())

            if (ok && newGame) {
                await addGame(newGame.id)
            } else {
                setMessage(error || 'Error creating game')
            }
        }
    }

    const startEditing = useCallback((game: PlayerGameStats, field: 'name' | 'price') => {
        if (!game.game_owned_id) return
        setEditingField({ id: game.game_owned_id, field })
        setEditValue(field === 'name' ? game.game_name : game.price !== null ? String(game.price) : '')
    }, [])

    const saveField = useCallback(
        async (game: PlayerGameStats) => {
            setEditingField((currentEditingField) => {
                if (!currentEditingField || !game.game_owned_id) return null

                const { field } = currentEditingField
                const body: { name?: string; price?: number | null } = {}

                setEditValue((currentEditValue) => {
                    if (field === 'name' && currentEditValue !== game.game_name) {
                        body.name = currentEditValue
                    } else if (field === 'price') {
                        const newPrice = currentEditValue === '' ? null : parseInt(currentEditValue)
                        if (newPrice !== game.price) {
                            body.price = newPrice
                        }
                    }

                    if (Object.keys(body).length > 0) {
                        updateOwnedGame(playerId, game.game_owned_id!, body).then(({ data, ok, error }) => {
                            if (ok && data) {
                                setGames((prev) => prev.map((g) => (g.game_id === data.game_id ? data : g)))
                            } else {
                                setMessage(error || 'Error updating game')
                            }
                        })
                    }

                    return ''
                })

                return null
            })
        },
        [playerId],
    )

    const [shelfFilter, setShelfFilter] = useState('')

    const owned = games.filter((g) => g.game_owned_id !== null)
    const played = games.filter((g) => g.game_owned_id === null)

    const sortedGames = [...games].sort((a, b) => a.game_name.localeCompare(b.game_name))
    const filteredGames = shelfFilter ? sortedGames.filter((g) => g.game_name.toLowerCase().includes(shelfFilter.toLowerCase())) : sortedGames

    const focusedGameId = shelfFilter && filteredGames.length === 1 ? filteredGames[0].game_id : null

    const totalPlays = games.reduce((sum, g) => sum + g.play_count, 0)
    const maxPlays = Math.max(1, ...games.map((g) => g.play_count))
    const ownedWithPrice = owned.filter((g) => g.price !== null && g.play_count > 0)
    const avgCostPerPlay =
        ownedWithPrice.length > 0
            ? (ownedWithPrice.reduce((sum, g) => sum + g.price! / g.play_count, 0) / ownedWithPrice.length / 100).toFixed(2)
            : null

    return (
        <>
            <div className="text-white">
                <header className="border-b border-slate-500/50 pb-4 flex items-center mb-8">
                    <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mr-4">
                        <Puzzle className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">My Games</h1>
                        <span className="text-sm text-slate-500 font-mono">
                            {owned.length} owned · {played.length} played
                        </span>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <MetricCard icon={<Puzzle className="w-5 h-5" />} label="Games Owned" value={owned.length} accent="cyan" />
                    <MetricCard icon={<Gamepad2 className="w-5 h-5" />} label="Total Plays" value={totalPlays} accent="purple" delay={0.5} />
                    {avgCostPerPlay !== null && (
                        <MetricCard
                            icon={<TrendingDown className="w-5 h-5" />}
                            label="Avg Cost / Play"
                            value={`${avgCostPerPlay}€`}
                            accent="cyan"
                            delay={1}
                        />
                    )}
                </div>

                <div className="mb-8">
                    {/* Shelf header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <CircuitTitle>Game Archive</CircuitTitle>
                            <span className="text-[10px] font-mono text-slate-600">
                                {owned.length} OWNED · {played.length} PLAYED
                            </span>
                        </div>
                        {games.length > 0 && (
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                                <input
                                    type="text"
                                    value={shelfFilter}
                                    onChange={(e) => setShelfFilter(e.target.value)}
                                    placeholder="Filter..."
                                    className="pl-7 pr-2 py-1 text-xs rounded bg-slate-800/60 text-white border border-slate-600/50 placeholder-slate-600 focus:outline-none focus:border-cyan-400/40 w-40 font-mono"
                                />
                            </div>
                        )}
                    </div>

                    {/* Shelf */}
                    {games.length === 0 ? (
                        <div className="border border-dashed border-cyan-400/20 rounded-lg p-4 bg-slate-900/30">
                            <p className="text-slate-400 font-mono text-sm">
                                <span className="text-cyan-400/60 mr-2">▸</span>
                                No games yet. Use the acquisition terminal below to add your first board game.
                            </p>
                        </div>
                    ) : (
                        <div className="flex gap-1 overflow-x-auto pt-10 pb-8 pl-8 items-end" style={{ scrollbarWidth: 'thin' }}>
                            {filteredGames.map((game) => (
                                <GameSpine
                                    key={game.game_id}
                                    game={game}
                                    playerId={playerId}
                                    isOwner={isOwner}
                                    editingField={editingField}
                                    editValue={editValue}
                                    setEditValue={setEditValue}
                                    startEditing={startEditing}
                                    saveField={saveField}
                                    navigate={navigate}
                                    maxPlays={maxPlays}
                                    focused={game.game_id === focusedGameId}
                                />
                            ))}
                            {shelfFilter && filteredGames.length === 0 && (
                                <p className="text-slate-500 font-mono text-xs py-8 px-4">No games match "{shelfFilter}"</p>
                            )}
                        </div>
                    )}
                </div>

                {isOwner && (
                    <div className="mt-6">
                        <SciFiPanel title="ACQUISITION TERMINAL">
                            <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-medium">Game Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search for a game..."
                                            className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 focus:outline-none"
                                        />
                                        {searchResults.length > 0 && (
                                            <div className="absolute w-full bg-slate-700 mt-1 rounded max-h-48 overflow-y-auto z-10 border border-slate-500">
                                                {searchResults.map((game) => (
                                                    <div
                                                        key={game.id}
                                                        onClick={() => {
                                                            setSelected(game)
                                                            setQuery(game.name)
                                                            setSearchResults([])
                                                        }}
                                                        className={`p-2 cursor-pointer hover:bg-slate-600 ${selected?.id === game.id ? 'bg-slate-600' : ''}`}
                                                    >
                                                        {game.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {query && !selected && (
                                        <span className="text-slate-400 text-xs">Game not found? It will be created automatically.</span>
                                    )}
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={addToCollection}
                                        onChange={(e) => setAddToCollection(e.target.checked)}
                                        className="accent-cyan-400"
                                    />
                                    Add to my collection
                                </label>

                                {addToCollection && (
                                    <div className="flex flex-col gap-1">
                                        <label className="text-sm font-medium">Price in cents (optional)</label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="e.g. 4999 for 49.99€"
                                            className="w-1/3 p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 focus:outline-none"
                                        />
                                    </div>
                                )}

                                {message && (
                                    <div className="p-2 rounded bg-slate-800 border border-slate-500">
                                        <span className="text-sm">{message}</span>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="self-start px-4 py-2 rounded bg-slate-600 hover:bg-slate-500 border border-slate-500"
                                >
                                    {addToCollection ? 'Add to library' : 'Create game'}
                                </button>
                            </form>
                        </SciFiPanel>
                    </div>
                )}
            </div>
        </>
    )
}

interface GameSpineProps {
    game: PlayerGameStats
    playerId: string
    isOwner: boolean
    editingField: { id: string; field: 'name' | 'price' } | null
    editValue: string
    setEditValue: (v: string) => void
    startEditing: (game: PlayerGameStats, field: 'name' | 'price') => void
    saveField: (game: PlayerGameStats) => void
    navigate: ReturnType<typeof useNavigate>
    maxPlays: number
    focused: boolean
}

const GameSpine = memo(function GameSpine({
    game,
    playerId,
    isOwner,
    editingField,
    editValue,
    setEditValue,
    startEditing,
    saveField,
    navigate,
    focused,
}: GameSpineProps) {
    const [hovered, setHovered] = useState(false)
    const isEditing = editingField?.id === game.game_owned_id
    const isEditingName = isEditing && editingField?.field === 'name'
    const isEditingPrice = isEditing && editingField?.field === 'price'
    const isOwned = game.game_owned_id !== null
    const expanded = hovered || isEditing || focused

    return (
        <div
            className={`relative shrink-0 rounded-sm border flex overflow-hidden cursor-pointer transition-[width,border-color,box-shadow] duration-300 ${
                isOwned
                    ? 'bg-gradient-to-b from-cyan-950/40 to-slate-900/80 border-cyan-400/20 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.2)]'
                    : 'bg-gradient-to-b from-slate-800/40 to-slate-900/80 border-slate-500/30 hover:border-slate-400/50'
            }`}
            style={{
                width: expanded ? 170 : 42,
                height: 360,
                transform: 'rotate(-5deg)',
                transformOrigin: 'bottom center',
                willChange: 'width',
                contain: 'layout style paint',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => {
                if (!isEditing) setHovered(false)
            }}
        >
            {/* HUD corner brackets */}
            <div className={`absolute top-0 left-0 w-3 h-3 border-t border-l ${isOwned ? 'border-cyan-400/40' : 'border-slate-500/30'}`} />
            <div className={`absolute top-0 right-0 w-3 h-3 border-t border-r ${isOwned ? 'border-cyan-400/40' : 'border-slate-500/30'}`} />
            <div className={`absolute bottom-0 left-0 w-3 h-3 border-b border-l ${isOwned ? 'border-cyan-400/40' : 'border-slate-500/30'}`} />
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r ${isOwned ? 'border-cyan-400/40' : 'border-slate-500/30'}`} />

            {/* HUD scan line */}
            {isOwned && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute left-0 right-0 h-px bg-cyan-400/15 animate-scan" />
                </div>
            )}

            {/* Top HUD tick mark */}
            <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-4 h-px ${isOwned ? 'bg-cyan-400/30' : 'bg-slate-600/30'}`} />

            {/* Collapsed: rotated title */}
            <div
                className={`absolute inset-0 flex flex-col items-center justify-start pt-4 gap-2 transition-opacity duration-200 ${expanded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                {/* Owned indicator dot */}
                {isOwned && <div className="w-1 h-1 rounded-full bg-cyan-400/50" />}
                <span
                    className={`text-[11px] font-mono uppercase tracking-[0.25em] whitespace-nowrap ${isOwned ? 'text-cyan-400/90' : 'text-slate-400'}`}
                    style={{ writingMode: 'vertical-rl' }}
                >
                    {game.game_name}
                </span>
                {/* Play count pip */}
                {game.play_count > 0 && (
                    <span className={`text-[8px] font-mono ${isOwned ? 'text-cyan-400/60' : 'text-slate-500/60'}`}>{game.play_count}</span>
                )}
            </div>

            {/* Expanded: full detail */}
            <div
                className={`flex flex-col w-full h-full transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Name */}
                <div className="flex-1 p-3 flex flex-col justify-center">
                    {isEditingName ? (
                        <input
                            autoFocus
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveField(game)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur()
                            }}
                            className="p-1 rounded bg-slate-700 text-white border border-slate-500 focus:outline-none text-xs w-full rotate-[5deg]"
                        />
                    ) : (
                        <span
                            onClick={() => (isOwner && isOwned ? startEditing(game, 'name') : null)}
                            className={`text-xs text-white font-medium leading-tight rotate-[5deg] ${isOwner && isOwned ? 'cursor-pointer hover:text-cyan-400' : ''} transition-colors`}
                        >
                            {game.game_name}
                        </span>
                    )}
                    {isOwned && <span className="text-[9px] text-cyan-400/50 mt-1 font-mono uppercase tracking-widest rotate-[5deg]">Owned</span>}
                </div>

                {/* Decorative separator */}
                <div className="px-3">
                    <div
                        className={`h-px ${isOwned ? 'bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent' : 'bg-gradient-to-r from-transparent via-slate-500/20 to-transparent'}`}
                    />
                </div>

                {/* Stats */}
                <div className="p-3 bg-slate-950/40">
                    <div className="flex items-baseline gap-1 rotate-[5deg]">
                        <span className="text-2xl font-bold font-mono text-cyan-400 leading-none">{game.play_count}</span>
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider">plays</span>
                    </div>
                    {isOwned &&
                        (isOwner && isEditingPrice ? (
                            <input
                                autoFocus
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveField(game)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') e.currentTarget.blur()
                                }}
                                placeholder="Price (cents)"
                                className="w-full p-1 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 focus:outline-none mt-1.5 text-[10px] rotate-[5deg]"
                            />
                        ) : isOwner ? (
                            <span
                                onClick={() => startEditing(game, 'price')}
                                className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors block mt-1.5 rotate-[5deg]"
                            >
                                {game.price !== null ? `${(game.price / 100).toFixed(2)}€` : '+ price'}
                            </span>
                        ) : game.price !== null ? (
                            <span className="text-[10px] text-slate-500 block mt-1.5 rotate-[5deg]">{(game.price / 100).toFixed(2)}€</span>
                        ) : null)}
                    {game.price !== null && game.play_count > 0 && (
                        <div className="text-[10px] text-cyan-400/60 font-mono mt-0.5 rotate-[5deg]">
                            {(game.price / game.play_count / 100).toFixed(2)}€/play
                        </div>
                    )}
                </div>

                {/* Navigate */}
                <button
                    onClick={() => navigate(`/games/${game.game_id}?playerId=${playerId}`)}
                    className={`border-t py-2 flex items-center justify-center gap-1 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors ${isOwned ? 'border-cyan-400/10' : 'border-slate-600/20'}`}
                >
                    <span className="rotate-[5deg] flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        <span className="text-[9px] font-mono uppercase tracking-wider">Open</span>
                    </span>
                </button>
            </div>
        </div>
    )
})
