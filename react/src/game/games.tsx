import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useRequest } from '../hooks/useRequest'
import Layout from '../Layout'

const host = import.meta.env.VITE_API_HOST

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
    const [token] = useLocalStorage('jwt', null)
    const [playerGames, setPlayerGames] = useState<PlayerGame[]>([])
    const [query, setQuery] = useState("")
    const [searchResults, setSearchResults] = useState<Game[]>([])
    const [selected, setSelected] = useState<Game | null>(null)
    const [price, setPrice] = useState("")
    const [message, setMessage] = useState("")

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
    }, [query])

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

        const response = await fetch(`${host}/players/${playerId}/games`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: JSON.stringify(body)
        })

        if (response.status === 201) {
            const newGame = await response.json()
            setPlayerGames([...playerGames, newGame])
            setMessage("Game added to your collection")
            setQuery("")
            setPrice("")
            setSelected(null)
        } else {
            const data = await response.json()
            setMessage(data.errors?.join(", ") || "Error adding game")
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (selected) {
            await addGameToLibrary(selected.id)
        } else if (query.trim() !== "") {
            const createResponse = await fetch(`${host}/games`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ name: query.trim() })
            })

            if (createResponse.status === 201) {
                const newGame = await createResponse.json()
                await addGameToLibrary(newGame.id)
            } else {
                const data = await createResponse.json()
                setMessage(data.errors?.join(", ") || "Error creating game")
            }
        }
    }

    return (
        <Layout>
            <div className="text-white">
                <header className="border-b border-slate-500/50 pb-4 flex items-center mb-8">
                    <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                        </svg>
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
                        <div key={pg.id} className="flex justify-between border-b border-slate-600 py-3">
                            <span>{pg.game.name}</span>
                            {pg.price !== null && (
                                <span className="text-gray-500">{(pg.price / 100).toFixed(2)}€</span>
                            )}
                        </div>
                    ))}
                </section>
            </div>
        </Layout>
    )
}
