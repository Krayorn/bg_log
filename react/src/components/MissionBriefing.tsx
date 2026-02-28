import { Link } from 'react-router-dom'
import { ChevronRight, Check, X } from 'lucide-react'
import { GeneralStatistics } from '../types'

type Props = {
    playerId: string
    stats: GeneralStatistics
    onDismiss: () => void
}

export function MissionBriefing({ playerId, stats, onDismiss }: Props) {
    const objectives = [
        {
            id: 1,
            label: 'Add a game to your library',
            description: 'Navigate to My Games and search for a board game you own.',
            completed: stats.gamesOwned > 0,
            link: `/players/${playerId}/games`,
        },
        {
            id: 2,
            label: 'Log your first play session',
            description: 'Open a game and create an entry with players and results.',
            completed: stats.entriesPlayed > 0,
            link: null,
        },
        {
            id: 3,
            label: 'Expand your circle',
            description: 'Add other players when logging a session to track your rivalries.',
            completed: stats.gamePartners > 0,
            link: null,
        },
    ]

    const completedCount = objectives.filter(o => o.completed).length
    const allComplete = completedCount === objectives.length

    return (
        <section className="col-span-2 bg-slate-900/50 backdrop-blur-sm rounded-lg border border-cyan-400/20 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute left-0 right-0 h-px bg-cyan-400/30 animate-scan" />
            </div>

            <header className="border-b border-cyan-400/20 px-6 py-3 bg-slate-800/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="uppercase text-xs font-mono font-medium text-cyan-400 tracking-[0.3em]">
                        System Initialization
                    </span>
                </div>
                <button
                    onClick={onDismiss}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                    title="Dismiss tutorial"
                >
                    <X className="w-4 h-4" />
                </button>
            </header>

            <div className="p-6">
                <p className="text-slate-400 font-mono text-sm mb-6 leading-relaxed">
                    Welcome, Agent. Your game log is empty.
                    <br />
                    Complete these objectives to initialize your system:
                </p>

                <div className="space-y-3 mb-8">
                    {objectives.map((obj) => (
                        <div
                            key={obj.id}
                            className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                                obj.completed
                                    ? 'border-emerald-500/30 bg-emerald-500/5'
                                    : 'border-slate-600/30 bg-slate-800/30'
                            }`}
                        >
                            <div className={`shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center mt-0.5 ${
                                obj.completed
                                    ? 'border-emerald-400 bg-emerald-500/20'
                                    : 'border-slate-500'
                            }`}>
                                {obj.completed && <Check className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500 font-mono text-xs">
                                        {String(obj.id).padStart(2, '0')}
                                    </span>
                                    <span className={`font-mono text-sm ${
                                        obj.completed ? 'text-emerald-400 line-through' : 'text-white'
                                    }`}>
                                        {obj.label}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs mt-1 font-mono">
                                    {obj.description}
                                </p>
                            </div>
                            {obj.link && !obj.completed && (
                                <Link
                                    to={obj.link}
                                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 text-xs font-mono hover:bg-cyan-500/20 transition-colors"
                                >
                                    Go
                                    <ChevronRight className="w-3 h-3" />
                                </Link>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-slate-500 font-mono text-xs uppercase tracking-wider shrink-0">
                        Init Progress
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                            style={{ width: `${(completedCount / objectives.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-cyan-400 font-mono text-xs shrink-0">
                        {completedCount}/{objectives.length}
                    </span>
                </div>

                {allComplete && (
                    <div className="mt-6 text-center">
                        <p className="text-emerald-400 font-mono text-sm mb-3">
                            ▸ System initialized. All objectives complete.
                        </p>
                        <button
                            onClick={onDismiss}
                            className="px-4 py-2 rounded border border-cyan-400/30 bg-cyan-500/10 text-cyan-400 text-sm font-mono hover:bg-cyan-500/20 transition-colors"
                        >
                            Launch Dashboard
                        </button>
                    </div>
                )}
            </div>
        </section>
    )
}
