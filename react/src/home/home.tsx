import { useState } from "react";
import { useParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { apiPatch } from '../hooks/useApi'
import Layout from '../Layout'
import { Landmark, User, Check, X, Pencil, ExternalLink } from 'lucide-react'

function Home() {
    const { playerId } = useParams() as { playerId: string }

    return (
        <Layout> 
            <header className="border-b border-slate-500/50 pb-4 flex justify-between mb-8">
                <div className="flex">
                    <div className="border-b border-slate-600">
                        <div className="rounded-full border-cyan-400/50 border-2 p-2 bg-cyan-500/10 mb-2">
                            <Landmark className="w-8 h-8 text-cyan-400" />
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
                    <User className="w-8 h-8 text-slate-400" />
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
                                        <Check className="w-5 h-5" />
                                    </button>
                                    <button onClick={handleCancelEmail} className="text-slate-400 hover:text-slate-300">
                                        <X className="w-5 h-5" />
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
                                    <Pencil className="w-4 h-4" />
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

interface CirclePlayer {
    id: string
    name: string
    gamesPlayed: number
    wins: number
    losses: number
}

function PlayerStatistics({ playerId }: {playerId: string}) {
    const [playerStats, setPlayerStats] = useState<CirclePlayer[]|null>(null)

    useRequest(`/players/${playerId}/circle`, [playerId], setPlayerStats)

    if (playerStats === null) {
        return <div className="text-slate-500">Loading...</div>
    }

    if (playerStats.length === 0) {
        return <div className="text-slate-500">No games with other players yet</div>
    }

    const sortedByCount = [...playerStats].sort((a, b) => b.gamesPlayed - a.gamesPlayed)
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
                                <span className="text-cyan-400 font-medium">{player.gamesPlayed}</span>
                                <Link to={`/players/${player.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink className="w-4 h-4 text-slate-500 hover:text-cyan-400" />
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
