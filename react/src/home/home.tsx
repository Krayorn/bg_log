import { useState } from "react";
import { useParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { updatePlayerEmail } from '../api/players'
import Layout from '../Layout'
import { Landmark, User, Check, X, Pencil, ExternalLink, Gamepad2, Activity, Users, Trophy, Calendar } from 'lucide-react'
import { Player, GeneralStatistics as GeneralStatisticsType, PlayerGameStats, CirclePlayer } from '../types'
import { MissionBriefing } from '../components/MissionBriefing'
import { SciFiPanel, MetricCard } from '../components/SciFi'
import { useLocalStorage } from '../hooks/useLocalStorage'

function Home() {
    const { playerId } = useParams() as { playerId: string }
    const [generalStats, setGeneralStats] = useState<GeneralStatisticsType | null>(null)
    const [tutorialDismissed, setTutorialDismissed] = useLocalStorage('tutorial_dismissed', false)

    useRequest(`/players/${playerId}/stats`, [playerId], setGeneralStats)

    const showTutorial = generalStats !== null && !tutorialDismissed && (
        generalStats.gamesOwned === 0 ||
        generalStats.entriesPlayed === 0 ||
        generalStats.gamePartners === 0
    )

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

            {showTutorial ? (
                <div className="grid grid-cols-2 gap-4">
                    <SciFiPanel title="Personal details" className="min-h-[180px]">
                        <PlayerBox playerId={playerId} />
                    </SciFiPanel>
                    <MissionBriefing
                        playerId={playerId}
                        stats={generalStats}
                        onDismiss={() => setTutorialDismissed(true)}
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <GeneralStatisticsPanel stats={generalStats}/>

                    <div className="grid grid-cols-2 gap-4">
                        <SciFiPanel title="Personal details" className="min-h-[180px]">
                            <PlayerBox playerId={playerId} />
                        </SciFiPanel>
                        <SciFiPanel title="Games Statistics" className="min-h-[180px]">
                            <GameStatistics playerId={playerId}/>
                        </SciFiPanel>
                        <SciFiPanel title="Players Statistics" className="min-h-[180px]">
                            <PlayerStatistics playerId={playerId}/>
                        </SciFiPanel>
                    </div>
                </div>
            )}
        </Layout>
  )
}

export default Home


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
        const { data, error, ok } = await updatePlayerEmail(playerId, emailInput)
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

function GeneralStatisticsPanel({ stats }: { stats: GeneralStatisticsType | null }) {
    if (stats === null) {
        return (
            <div className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-lg border border-slate-700/50 bg-slate-900/30 animate-pulse" />
                ))}
            </div>
        )
    }

    let daysSinceLastGame: number | string = '—'
    if (stats.lastGameDate) {
        const dateNow = new Date()
        const lastGameDate = new Date(stats.lastGameDate)
        daysSinceLastGame = Math.ceil(Math.abs(dateNow.getTime() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    return (
        <div className="grid grid-cols-5 gap-4">
            <MetricCard icon={<Gamepad2 className="w-5 h-5" />} label="Games Owned" value={stats.gamesOwned} accent="cyan" noScanLine />
            <MetricCard icon={<Activity className="w-5 h-5" />} label="Total Plays" value={stats.entriesPlayed} accent="cyan" delay={0.6} />
            <MetricCard icon={<Users className="w-5 h-5" />} label="Partners" value={stats.gamePartners} accent="purple" noScanLine />
            <MetricCard icon={<Trophy className="w-5 h-5" />} label="Win Rate" value={`${stats.globalWinrate ?? 0}%`} accent="cyan" delay={1.8} />
            <MetricCard icon={<Calendar className="w-5 h-5" />} label="Days Idle" value={daysSinceLastGame} accent="purple" noScanLine />
        </div>
    )
}

function GameStatistics({ playerId }: {playerId: string}) {
    const [gameStats, setGameStats] = useState<PlayerGameStats[]|null>(null)
    
    useRequest(`/players/${playerId}/games`, [playerId], setGameStats)

    if (gameStats === null) {
        return <div className="text-slate-500">Loading...</div>
    }

    if (gameStats.length === 0) {
        return <div className="text-slate-500">No games played yet</div>
    }

    const mostPlayed = [...gameStats].sort((a, b) => b.play_count - a.play_count).slice(0, 4)
    const leastPlayed = [...gameStats].sort((a, b) => a.play_count - b.play_count).filter(a => a.game_owned_id !== null).slice(0, 4)

    return (
        <div className="flex gap-6">
            <div className="flex-1">
                <h3 className="text-xs uppercase text-slate-500 mb-2 font-medium">Most played</h3>
                <div className="space-y-1">
                    {mostPlayed.map(game => (
                        <div key={game.game_id} className="flex justify-between text-sm">
                            <span className="truncate text-slate-300">{game.game_name}</span>
                            <span className="text-cyan-400 font-medium ml-2">{game.play_count}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex-1">
                <h3 className="text-xs uppercase text-slate-500 mb-2 font-medium">Least played</h3>
                <div className="space-y-1">
                    {leastPlayed.map(game => (
                        <div key={game.game_id} className="flex justify-between text-sm">
                            <span className="truncate text-slate-300">{game.game_name}</span>
                            <span className="text-slate-500 font-medium ml-2">{game.play_count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
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
