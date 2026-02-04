import { useState } from "react";
import { useParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { apiPatch } from '../hooks/useApi'
import Layout from '../Layout'

function Home() {
    const { playerId } = useParams() as { playerId: string }

    return (
        <Layout> 
            <header className="border-b border-slate-500/50 pb-4 flex justify-between mb-8">
                <div className="flex">
                    <div className="border-b border-slate-600">
                        <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-cyan-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                            </svg>
                        </div>
                    </div>
                    <div className="ml-4 text-white flex-col border-b border-slate-600">
                        <h1 className="text-xl font-semibold">Game Log</h1>
                        <h2 className="text-sm text-slate-400">
                            Welcome to your personalized game log network
                        </h2>
                    </div>
                </div>
                <div className="text-slate-600 flex flex-col text-right text-sm">
                    <span>version {import.meta.env.VITE_APP_VERSION}</span>
                    <span>released {import.meta.env.VITE_RELEASE_DATE}</span>
                </div>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <Box title="Personal details">
                    <PlayerBox playerId={playerId} />
                </Box>
                <Box title="General Statistics">
                    <GeneralStatistics playerId={playerId}/>
                </Box>
                <Box title="Games Statistics">
                    <GameStatistics playerId={playerId}/>
                </Box>
                <Box title="Players Statistics">
                    <PlayerStatistics playerId={playerId}/>
                </Box>
            </div>
        </Layout>
  )
}

export default Home


function Box({ title, children }: {title: string, children: JSX.Element | JSX.Element[]}) {
    return (
        <section className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 overflow-hidden">
            <header className="border-b border-slate-500/50 px-4 py-2 bg-slate-800/70">
                <span className="uppercase text-xs font-medium text-slate-300 tracking-wider">{title}</span>
            </header>
            <div className="p-4 text-white min-h-[180px]">
                {children}
            </div>
        </section>
    )
}

interface Player {
    name: string
    number: number
    registeredOn: {
        date: string
    }|null
    email?: string|null
}

function PlayerBox({ playerId }: {playerId: string}) {
    const [playerInfos, setPlayerInfos] = useState<Player|null>(null)
    const [isEditingEmail, setIsEditingEmail] = useState(false)
    const [emailInput, setEmailInput] = useState('')
    const [emailError, setEmailError] = useState<string|null>(null)
    
    useRequest(`/players/${playerId}`, [playerId], setPlayerInfos)
    
    if (playerInfos === null) {
        return <div className="text-slate-500">Loading...</div>
    }

    const handleEditEmail = () => {
        setEmailInput(playerInfos.email ?? '')
        setEmailError(null)
        setIsEditingEmail(true)
    }

    const handleSaveEmail = async () => {
        const { data, error, ok } = await apiPatch<Player>(`/players/${playerId}`, { email: emailInput })
        if (!ok) {
            setEmailError(error ?? 'Failed to update email')
            return
        }
        setPlayerInfos(data)
        setIsEditingEmail(false)
        setEmailError(null)
    }

    const handleCancelEmail = () => {
        setIsEditingEmail(false)
        setEmailError(null)
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center pb-4 border-b border-slate-600/30">    
                <div className="rounded-lg border border-slate-600/50 p-2 bg-slate-800/50 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                </div>
                <div>
                    <div className="text-lg font-semibold">{playerInfos.name}</div>
                    <div className="text-sm text-slate-500">User #{playerInfos.number.toString().padStart(4, '0')}</div>
                </div>
            </div>
            <div className="flex flex-col mt-4 text-sm text-slate-300 gap-2">
                {playerInfos.registeredOn === null 
                    ? <span className="text-slate-500">Guest user</span>
                    : <span>Registered on {(new Date(playerInfos.registeredOn.date)).toLocaleDateString('fr-FR')}</span>
                }
                {'email' in playerInfos && (
                    <div className="flex items-center gap-2">
                        {isEditingEmail ? (
                            <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="email"
                                        value={emailInput}
                                        onChange={(e) => setEmailInput(e.target.value)}
                                        placeholder="Enter email"
                                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm flex-1"
                                    />
                                    <button onClick={handleSaveEmail} className="text-cyan-400 hover:text-cyan-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    </button>
                                    <button onClick={handleCancelEmail} className="text-slate-400 hover:text-slate-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {emailError && <span className="text-red-400 text-xs">{emailError}</span>}
                            </div>
                        ) : (
                            <>
                                <span className={playerInfos.email ? '' : 'text-slate-500'}>
                                    {playerInfos.email ?? 'No email set'}
                                </span>
                                <button onClick={handleEditEmail} className="text-slate-400 hover:text-cyan-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

interface GeneralStatistics {
    gamesOwned: number
    entriesPlayed: number
    gamePartners: number
    globalWinrate: number
    lastGameDate: Date
}

function GeneralStatistics({ playerId }: {playerId: string}) {
    const [generalStats, setGeneralStats] = useState<GeneralStatistics|null>(null)
    
    useRequest(`/players/${playerId}/stats`, [playerId], setGeneralStats)

    if (generalStats === null) {
        return <div className="text-slate-500">Loading...</div>
    }

    let daysSinceLastGame: number | string = '—'
    if (generalStats.lastGameDate) {
        const dateNow = new Date()
        const lastGameDate = new Date(generalStats.lastGameDate)
        daysSinceLastGame = Math.ceil(Math.abs(dateNow.getTime() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <StatItem value={generalStats.gamesOwned} label="Games owned" />
            <StatItem value={generalStats.entriesPlayed} label="Total plays" />
            <StatItem value={generalStats.gamePartners} label="Play partners" />
            <StatItem value={`${generalStats.globalWinrate ?? 0}%`} label="Win rate" highlight />
            <StatItem value={daysSinceLastGame} label="Days since last game" className="col-span-2" />
        </div>
    )
}

function StatItem({ value, label, highlight, className }: { value: string | number, label: string, highlight?: boolean, className?: string }) {
    return (
        <div className={`flex flex-col ${className || ''}`}>
            <span className={`text-2xl font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</span>
            <span className="text-xs text-slate-500">{label}</span>
        </div>
    )
}

interface GameStats {
    id: string
    count: number
    name: string
    in_library: boolean
}

function GameStatistics({ playerId }: {playerId: string}) {
    const [gameStats, setGameStats] = useState<GameStats[]|null>(null)
    
    useRequest(`/players/${playerId}/games/stats`, [playerId], setGameStats)

    if (gameStats === null) {
        return <div className="text-slate-500">Loading...</div>
    }

    if (gameStats.length === 0) {
        return <div className="text-slate-500">No games played yet</div>
    }

    const mostPlayed = [...gameStats].sort((a, b) => b.count - a.count).slice(0, 4)
    const leastPlayed = [...gameStats].sort((a, b) => a.count - b.count).filter(a => a.in_library).slice(0, 4)

    return (
        <div className="flex gap-6">
            <div className="flex-1">
                <h3 className="text-xs uppercase text-slate-500 mb-2 font-medium">Most played</h3>
                <div className="space-y-1">
                    {mostPlayed.map(game => (
                        <div key={game.id} className="flex justify-between text-sm">
                            <span className="truncate text-slate-300">{game.name}</span>
                            <span className="text-cyan-400 font-medium ml-2">{game.count}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1">
                <h3 className="text-xs uppercase text-slate-500 mb-2 font-medium">Least played</h3>
                <div className="space-y-1">
                    {leastPlayed.map(game => (
                        <div key={game.id} className="flex justify-between text-sm">
                            <span className="truncate text-slate-300">{game.name}</span>
                            <span className="text-slate-500 font-medium ml-2">{game.count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

interface PlayerStats {
    id: string
    count: number
    name: string
    losses: number
    wins: number
}

function PlayerStatistics({ playerId }: {playerId: string}) {
    const [playerStats, setPlayerStats] = useState<PlayerStats[]|null>(null)

    useRequest(`/players/${playerId}/friends/stats`, [playerId], setPlayerStats)

    if (playerStats === null) {
        return <div className="text-slate-500">Loading...</div>
    }

    if (playerStats.length === 0) {
        return <div className="text-slate-500">No games with other players yet</div>
    }

    const sortedByCount = [...playerStats].sort((a, b) => b.count - a.count)
    const wins = [...playerStats].sort((a, b) => b.wins - a.wins)
    const losses = [...playerStats].sort((a, b) => b.losses - a.losses)

    return (
        <div className="flex gap-6">
            <div className="flex-1">
                <h3 className="text-xs uppercase text-slate-500 mb-2 font-medium">Most played with</h3>
                <div className="space-y-1 max-h-28 overflow-y-auto">
                    {sortedByCount.slice(0, 5).map(player => (
                        <div key={player.id} className="flex justify-between items-center text-sm group">
                            <span className="truncate text-slate-300">{player.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-cyan-400 font-medium">{player.count}</span>
                                <Link to={`/players/${player.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-500 hover:text-cyan-400">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1 flex flex-col gap-3">
                <div>
                    <h3 className="text-xs uppercase text-slate-500 mb-1 font-medium">Best record against</h3>
                    <div className="text-sm">
                        <span className="text-emerald-400">{wins[0]?.name}</span>
                        <span className="text-slate-500 ml-2">({wins[0]?.wins} wins)</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-xs uppercase text-slate-500 mb-1 font-medium">Worst record against</h3>
                    <div className="text-sm">
                        <span className="text-red-400">{losses[0]?.name}</span>
                        <span className="text-slate-500 ml-2">({losses[0]?.losses} losses)</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
