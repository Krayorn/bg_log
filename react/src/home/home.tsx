import { useState } from "react";
import { useParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import Layout from '../Layout'

function Home() {
    let { playerId } = useParams() as { playerId: string }

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
}

function PlayerBox({ playerId }: {playerId: string}) {
    const [playerInfos, setPlayerInfos] = useState<Player|null>(null)
    
    useRequest(`/players/${playerId}`, [playerId], setPlayerInfos)
    
    if (playerInfos === null) {
        return <div className="text-slate-500">Loading...</div>
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
            <div className="flex flex-col mt-4 text-sm text-slate-300">
                {playerInfos.registeredOn === null 
                    ? <span className="text-slate-500">Guest user</span>
                    : <span>Registered on {(new Date(playerInfos.registeredOn.date)).toLocaleDateString('fr-FR')}</span>
                }
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

    const dateNow = new Date()
    const lastGameDate = new Date(generalStats.lastGameDate)
    const daysSinceLastGame = Math.ceil(Math.abs(dateNow.getTime() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24))

    return (
        <div className="grid grid-cols-2 gap-4">
            <StatItem value={generalStats.gamesOwned} label="Games owned" />
            <StatItem value={generalStats.entriesPlayed} label="Total plays" />
            <StatItem value={generalStats.gamePartners} label="Play partners" />
            <StatItem value={`${generalStats.globalWinrate}%`} label="Win rate" highlight />
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
    const [gameStats, setGameStats] = useState<GameStats[]>([])
    
    useRequest(`/players/${playerId}/games/stats`, [playerId], setGameStats)

    if (gameStats.length === 0) {
        return <div className="text-slate-500">Loading...</div>
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
    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])

    useRequest(`/players/${playerId}/friends/stats`, [playerId], setPlayerStats)

    if (playerStats.length === 0) {
        return <div className="text-slate-500">Loading...</div>
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
