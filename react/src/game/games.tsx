import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { apiPost, apiPatch } from '../hooks/useApi'
import Layout from '../Layout'
import { Puzzle, ExternalLink } from 'lucide-react'

interface PlayerGame {
    id: string
    game: {
        id: string
        name: string
    }
    price: number | null
}

interface Game {
    name: string
    id: string
}

export default function Games() {
    const { playerId } = useParams() as { playerId: string }
    const navigate = useNavigate()
    const [playerGames, setPlayerGames] = useState<PlayerGame[]>([])
    const [query, setQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Game[]>([])
    const [selected, setSelected] = useState<Game | null>(null)
    const [price, setPrice] = useState("")
    const [message, setMessage] = useState("")
    const [editingField, setEditingField] = useState<{ id: string; field: 'name' | 'price' } | null>(null)
    const [editValue, setEditValue] = useState("")

    useRequest(`/players/${playerId}/games`, [playerId], setPlayerGames)

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

        const { data, error, ok } = await apiPost<PlayerGame>(`/players/${playerId}/games`, body)

        if (ok && data) {
            setPlayerGames([...playerGames, data])
            setMessage("Game added to your collection")
            setQuery("")
            setPrice("")
            setSelected(null)
        } else {
            setMessage(error || "Error adding game")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

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

    const startEditing = (pg: PlayerGame, field: 'name' | 'price') => {
        setEditingField({ id: pg.id, field })
        setEditValue(field === 'name' ? pg.game.name : (pg.price !== null ? String(pg.price) : ""))
    }

    const saveField = async (pg: PlayerGame) => {
        if (!editingField) return
        const { field } = editingField
        const body: { name?: string; price?: number | null } = {}

        if (field === 'name' && editValue !== pg.game.name) {
            body.name = editValue
        } else if (field === 'price') {
            const newPrice = editValue === "" ? null : parseInt(editValue)
            if (newPrice !== pg.price) {
                body.price = newPrice
            }
        }

        setEditingField(null)
        setEditValue("")

        if (Object.keys(body).length === 0) return

        const { data, ok, error } = await apiPatch<PlayerGame>(`/players/${playerId}/games/${pg.id}`, body)
        if (ok && data) {
            setPlayerGames(playerGames.map(g => g.id === pg.id ? data : g))
        } else {
            setMessage(error || "Error updating game")
        }
    }

    return (
        <Layout>
            <div className="text-white">
                <header className="border-b border-slate-500/50 pb-4 flex items-center mb-8">
                    <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mr-4">
                        <Puzzle className="w-8 h-8 text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold">My Games</h1>
                        <span className="text-sm text-slate-400">{playerGames.length} games in collection</span>
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

                        {message && (
                            <div className="p-2 rounded bg-slate-800 border border-slate-500">
                                <span className="text-sm">{message}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="self-start px-4 py-2 rounded bg-slate-600 hover:bg-slate-500 border border-slate-500"
                        >
                            Add to library
                        </button>
                    </form>
                </section>

                <section>
                    {playerGames.map(pg => (
                        <div key={pg.id} className="flex items-center justify-between border-b border-slate-600 py-3">
                            <div className="flex items-center gap-4 flex-1 mr-4">
                                {editingField?.id === pg.id && editingField.field === 'name' ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => saveField(pg)}
                                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                        className="p-1 rounded bg-slate-700 text-white border border-slate-500 focus:outline-none"
                                    />
                                ) : (
                                    <span
                                        onClick={() => startEditing(pg, 'name')}
                                        className="cursor-pointer hover:text-cyan-400 transition-colors"
                                    >{pg.game.name}</span>
                                )}
                                {editingField?.id === pg.id && editingField.field === 'price' ? (
                                    <input
                                        autoFocus
                                        type="number"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => saveField(pg)}
                                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                                        placeholder="Price (cents)"
                                        className="w-32 p-1 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 focus:outline-none"
                                    />
                                ) : (
                                    <span
                                        onClick={() => startEditing(pg, 'price')}
                                        className="text-gray-500 cursor-pointer hover:text-slate-300 transition-colors"
                                    >{pg.price !== null ? `${(pg.price / 100).toFixed(2)}€` : '—'}</span>
                                )}
                            </div>
                            <button
                                onClick={() => navigate(`/games/${pg.game.id}?playerId=${playerId}`)}
                                className="text-slate-400 hover:text-cyan-400 transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </section>
            </div>
        </Layout>
    )
}
