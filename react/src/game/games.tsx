import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { apiPost, apiPatch } from '../hooks/useApi'
import Layout from '../Layout'
import { Puzzle, ExternalLink } from 'lucide-react'

interface PlayerGameStats {
    game_id: string
    game_name: string
    game_owned_id: string | null
    price: number | null
    play_count: number
}

interface Game {
    name: string
    id: string
}

export default function Games() {
    const { playerId } = useParams() as { playerId: string }
    const navigate = useNavigate()
    const [games, setGames] = useState<PlayerGameStats[]>([])
    const [query, setQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Game[]>([])
    const [selected, setSelected] = useState<Game | null>(null)
    const [price, setPrice] = useState("")
    const [message, setMessage] = useState("")
    const [editingField, setEditingField] = useState<{ id: string; field: 'name' | 'price' } | null>(null)
    const [editValue, setEditValue] = useState("")
    const [addToCollection, setAddToCollection] = useState(true)

    useRequest(`/players/${playerId}/games`, [playerId], setGames)

    const setResultsResetSelected = (results: Game[]) => {
        setSearchResults(results)
        setSelected(null)
    }

    useRequest(`/games?query=${query}`, [query], setResultsResetSelected, query !== "")

    useEffect(() => {
        if (query === "" && searchResults.length > 0) {
            setResultsResetSelected([])
        }
    }, [query, searchResults.length])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                if (selected === null && searchResults.length > 0) {
                    setSelected(searchResults[0])
                } else if (selected) {
                    const idx = searchResults.findIndex(r => r.id === selected.id)
                    if (searchResults.length > idx + 1) {
                        setSelected(searchResults[idx + 1])
                    }
                }
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault()
                if (selected !== null) {
                    const idx = searchResults.findIndex(r => r.id === selected.id)
                    if (idx - 1 >= 0) {
                        setSelected(searchResults[idx - 1])
                    }
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [selected, searchResults])

    const addGameToLibrary = async (gameId: string) => {
        const body: { gameId: string; price?: number } = { gameId }
        if (price !== "") {
            body.price = parseInt(price)
        }

        const { data, error, ok } = await apiPost<PlayerGameStats>(`/players/${playerId}/games`, body)

        if (ok && data) {
            setGames(prev => {
                const idx = prev.findIndex(g => g.game_id === data.game_id)
                return idx >= 0 ? prev.map(g => g.game_id === data.game_id ? data : g) : [...prev, data]
            })
            setMessage("Game added to your collection")
            setQuery("")
            setPrice("")
            setSelected(null)
        } else {
            setMessage(error || "Error adding game")
        }
    }

    const createGameOnly = async () => {
        if (selected) {
            setMessage("Game already exists in the database")
            setQuery("")
            setSelected(null)
            return
        }

        if (query.trim() === "") return

        const { error, ok } = await apiPost<Game>('/games', { name: query.trim() })
        if (ok) {
            setMessage("Game created in the database")
            setQuery("")
        } else {
            setMessage(error || "Error creating game")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!addToCollection) {
            await createGameOnly()
            return
        }

        if (selected) {
            await addGameToLibrary(selected.id)
        } else if (query.trim() !== "") {
            const { data: newGame, error, ok } = await apiPost<Game>('/games', { name: query.trim() })

            if (ok && newGame) {
                await addGameToLibrary(newGame.id)
            } else {
                setMessage(error || "Error creating game")
            }
        }
    }

    const startEditing = (game: PlayerGameStats, field: 'name' | 'price') => {
        if (!game.game_owned_id) return
        setEditingField({ id: game.game_owned_id, field })
        setEditValue(field === 'name' ? game.game_name : (game.price !== null ? String(game.price) : ""))
    }

    const saveField = async (game: PlayerGameStats) => {
        if (!editingField || !game.game_owned_id) return
        const { field } = editingField
        const body: { name?: string; price?: number | null } = {}

        if (field === 'name' && editValue !== game.game_name) {
            body.name = editValue
        } else if (field === 'price') {
            const newPrice = editValue === "" ? null : parseInt(editValue)
            if (newPrice !== game.price) {
                body.price = newPrice
            }
        }

        setEditingField(null)
        setEditValue("")

        if (Object.keys(body).length === 0) return

        const { data, ok, error } = await apiPatch<PlayerGameStats>(`/players/${playerId}/games/${game.game_owned_id}`, body)
        if (ok && data) {
            setGames(prev => prev.map(g => g.game_id === data.game_id ? data : g))
        } else {
            setMessage(error || "Error updating game")
        }
    }

    const owned = games.filter(g => g.game_owned_id !== null)
    const played = games.filter(g => g.game_owned_id === null)

    return (
        <Layout>
            <div className="text-white">
                <header className="border-b border-slate-500/50 pb-4 flex items-center mb-8">
                    <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mr-4">
                        <Puzzle className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">My Games</h1>
                        <span className="text-sm text-slate-400">{owned.length} owned · {played.length} played</span>
                    </div>
                </header>

                <section className="border border-slate-500/50 rounded-lg p-4 mb-6 bg-slate-900/50 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold mb-4">Add Game to Library</h2>
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">Game Name</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search for a game..."
                                    className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 focus:outline-none"
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute w-full bg-slate-700 mt-1 rounded max-h-48 overflow-y-auto z-10 border border-slate-500">
                                        {searchResults.map(game => (
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
                                <span className="text-slate-400 text-xs">
                                    Game not found? It will be created automatically.
                                </span>
                            )}
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={addToCollection}
                                onChange={e => setAddToCollection(e.target.checked)}
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
                                    onChange={e => setPrice(e.target.value)}
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
                </section>

                <section className="mb-6">
                    <h2 className="text-xs uppercase text-slate-500 font-medium tracking-wider mb-3">My Collection</h2>
                    {owned.length === 0 ? (
                        <div className="text-slate-500 text-sm">No games in your collection yet</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {owned.map(game => (
                                <GameCard
                                    key={game.game_id}
                                    game={game}
                                    playerId={playerId}
                                    editingField={editingField}
                                    editValue={editValue}
                                    setEditValue={setEditValue}
                                    startEditing={startEditing}
                                    saveField={saveField}
                                    navigate={navigate}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {played.length > 0 && (
                    <section>
                        <h2 className="text-xs uppercase text-slate-500 font-medium tracking-wider mb-3">Played</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {played.map(game => (
                                <GameCard
                                    key={game.game_id}
                                    game={game}
                                    playerId={playerId}
                                    editingField={editingField}
                                    editValue={editValue}
                                    setEditValue={setEditValue}
                                    startEditing={startEditing}
                                    saveField={saveField}
                                    navigate={navigate}
                                />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </Layout>
    )
}

interface GameCardProps {
    game: PlayerGameStats
    playerId: string
    editingField: { id: string; field: 'name' | 'price' } | null
    editValue: string
    setEditValue: (v: string) => void
    startEditing: (game: PlayerGameStats, field: 'name' | 'price') => void
    saveField: (game: PlayerGameStats) => void
    navigate: ReturnType<typeof useNavigate>
}

function GameCard({ game, playerId, editingField, editValue, setEditValue, startEditing, saveField, navigate }: GameCardProps) {
    const isEditingName = editingField?.id === game.game_owned_id && editingField?.field === 'name'
    const isEditingPrice = editingField?.id === game.game_owned_id && editingField?.field === 'price'

    return (
        <div className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="rounded-lg border border-slate-600/50 p-2 bg-slate-800/50">
                        <Puzzle className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        {isEditingName ? (
                            <input
                                autoFocus
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => saveField(game)}
                                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                className="p-1 rounded bg-slate-700 text-white border border-slate-500 focus:outline-none w-full"
                            />
                        ) : (
                            <span
                                onClick={() => game.game_owned_id ? startEditing(game, 'name') : null}
                                className={`text-white font-medium block truncate ${game.game_owned_id ? 'cursor-pointer hover:text-cyan-400 transition-colors' : ''}`}
                            >{game.game_name}</span>
                        )}
                        {game.game_owned_id && (
                            isEditingPrice ? (
                                <input
                                    autoFocus
                                    type="number"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={() => saveField(game)}
                                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                    placeholder="Price (cents)"
                                    className="w-28 p-1 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 focus:outline-none mt-1"
                                />
                            ) : (
                                <span
                                    onClick={() => startEditing(game, 'price')}
                                    className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors block"
                                >{game.price !== null ? `${(game.price / 100).toFixed(2)}€` : '—'}</span>
                            )
                        )}
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/games/${game.game_id}?playerId=${playerId}`)}
                    className="text-slate-400 hover:text-cyan-400 transition-colors ml-2"
                >
                    <ExternalLink className="w-4 h-4" />
                </button>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-600/30">
                <div className="flex gap-4 text-sm">
                    <div className="flex flex-col">
                        <span className="text-white font-medium">{game.play_count}</span>
                        <span className="text-xs text-slate-500">Plays</span>
                    </div>
                    {game.game_owned_id && game.price !== null && game.play_count > 0 && (
                        <div className="flex flex-col">
                            <span className="text-cyan-400 font-medium">{((game.price / game.play_count) / 100).toFixed(2)}€</span>
                            <span className="text-xs text-slate-500">Per play</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
