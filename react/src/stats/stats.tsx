import { Link } from 'react-router-dom'
import { useQuery } from '../hooks/useQuery'
import Layout from '../Layout'
import { Activity, Gamepad2, Users, Trophy, Settings, Layers, Sparkles, Crown, ArrowLeft, BookOpen } from 'lucide-react'
import type { PublicStats } from '../types'
import { SciFiPanel } from '../components/SciFi'
import { ScanLine, CornerBrackets } from '../components/SciFi'

export default function StatsPage() {
    const { data: stats } = useQuery<PublicStats>('/public/stats')

    return (
        <Layout noNav>
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-full border-2 border-cyan-400/50 p-2 bg-cyan-500/10">
                            <Activity className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-wide">Platform Stats</h1>
                            <p className="text-xs text-slate-500 font-mono">LIVE DATA FEED</p>
                        </div>
                    </div>
                    <Link to="/" className="text-slate-400 text-sm hover:text-slate-200 transition-colors flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" />
                        back
                    </Link>
                </div>

                {stats === null ? (
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-lg border border-slate-700/50 bg-slate-900/30 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <HeroStat value={stats.totalEntries} />

                        <div className="grid grid-cols-3 gap-4">
                            <GlowCard icon={<Gamepad2 className="w-5 h-5" />} label="Unique Games" value={stats.totalGames} accent="cyan" />
                            <GlowCard icon={<Users className="w-5 h-5" />} label="Players" value={stats.totalPlayers} accent="purple" />
                            <GlowCard icon={<Trophy className="w-5 h-5" />} label="Campaigns" value={stats.totalCampaigns} accent="cyan" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SciFiPanel title="Most Played Games">
                                {stats.topGames.length === 0 ? (
                                    <div className="text-slate-500 text-sm">No data yet</div>
                                ) : (
                                    <TopGamesList games={stats.topGames} />
                                )}
                            </SciFiPanel>

                            <div className="flex flex-col gap-4">
                                {stats.mostPlayedGame && (
                                    <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-lg border border-cyan-400/20 p-6 overflow-hidden flex-1">
                                        <ScanLine accent="cyan" delay={1.5} />
                                        <CornerBrackets color="cyan" />
                                        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3">Crown Champion</div>
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-full p-3 bg-cyan-500/10 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.15)]">
                                                <Crown className="w-6 h-6 text-cyan-400" />
                                            </div>
                                            <div>
                                                <div className="text-lg font-bold text-white">{stats.mostPlayedGame.name}</div>
                                                <div className="text-sm text-slate-400">
                                                    <span className="text-cyan-400 font-mono font-bold">{stats.mostPlayedGame.play_count}</span> plays
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <RingStat value={stats.avgPlayersPerEntry} label="Avg Players / Session" />
                            </div>
                        </div>

                        <SciFiPanel title="Monthly Activity">
                            {stats.entriesPerMonth.length === 0 ? (
                                <div className="text-slate-500 text-sm">No activity recorded yet</div>
                            ) : (
                                <MonthlyChart data={stats.entriesPerMonth} />
                            )}
                        </SciFiPanel>

                        <div className="grid grid-cols-3 gap-4">
                            <DataPointCard icon={<Settings className="w-5 h-5" />} label="Custom Fields" value={stats.totalCustomFields} />
                            <DataPointCard icon={<Layers className="w-5 h-5" />} label="Data Points" value={stats.totalCustomFieldValues} />
                            <DataPointCard icon={<BookOpen className="w-5 h-5" />} label="Campaign Events" value={stats.totalCampaignEvents} />
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

function HeroStat({ value }: { value: number }) {
    return (
        <div className="relative rounded-xl border border-cyan-400/20 bg-gradient-to-b from-cyan-950/30 via-slate-900/50 to-slate-900/30 overflow-hidden">
            <ScanLine accent="cyan" delay={0} />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_70%)]" />
            <div className="relative py-12 flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/60 mb-2 font-mono">Total Play Sessions Logged</div>
                <div className="text-6xl font-bold font-mono text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">{value.toLocaleString()}</div>
                <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
                    <Sparkles className="w-3 h-3 text-cyan-400/50" />
                    <span className="font-mono">and counting</span>
                    <Sparkles className="w-3 h-3 text-cyan-400/50" />
                </div>
            </div>
        </div>
    )
}

function GlowCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: 'cyan' | 'purple' }) {
    const isCyan = accent === 'cyan'
    return (
        <div
            className={`relative group rounded-lg border overflow-hidden transition-all duration-300 ${
                isCyan
                    ? 'border-cyan-400/20 hover:border-cyan-400/50 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]'
                    : 'border-purple-400/20 hover:border-purple-400/50 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)]'
            }`}
        >
            <div
                className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                    isCyan
                        ? 'bg-[radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.08),transparent_70%)]'
                        : 'bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.08),transparent_70%)]'
                }`}
            />
            <CornerBrackets color={accent} />
            <div className="relative p-5 text-center">
                <div className={`inline-flex p-2 rounded-lg mb-3 ${isCyan ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {icon}
                </div>
                <div className={`text-3xl font-bold font-mono ${isCyan ? 'text-cyan-400' : 'text-purple-400'}`}>{value.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-1">{label}</div>
            </div>
        </div>
    )
}

function RingStat({ value, label }: { value: number; label: string }) {
    const percentage = Math.min((value / 10) * 100, 100)
    const circumference = 2 * Math.PI * 36
    const offset = circumference - (percentage / 100) * circumference

    return (
        <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/50 rounded-lg border border-purple-400/20 p-4 overflow-hidden flex items-center gap-4 flex-1">
            <CornerBrackets color="purple" />
            <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgb(51,65,85)" strokeWidth="4" />
                    <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="rgb(168,85,247)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        className="drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold font-mono text-purple-400">{value}</span>
                </div>
            </div>
            <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className="text-xs text-slate-400 mt-1">per game session</div>
            </div>
        </div>
    )
}

function TopGamesList({ games }: { games: { name: string; play_count: number }[] }) {
    const max = games[0]?.play_count ?? 1

    return (
        <div className="space-y-3">
            {games.map((game, idx) => (
                <div key={game.name} className="flex items-center gap-3">
                    <span
                        className={`text-xs font-mono w-5 text-right shrink-0 ${
                            idx === 0 ? 'text-cyan-400' : idx === 1 ? 'text-slate-300' : 'text-slate-500'
                        }`}
                    >
                        #{idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm truncate ${idx === 0 ? 'text-white font-semibold' : 'text-slate-300'}`}>{game.name}</span>
                            <span className="text-xs font-mono text-cyan-400 ml-2 shrink-0">{game.play_count}</span>
                        </div>
                        <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.3)]"
                                style={{ width: `${(game.play_count / max) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

function MonthlyChart({ data }: { data: { month: string; count: number }[] }) {
    const max = Math.max(...data.map((d) => Number(d.count)), 1)

    return (
        <div className="space-y-2">
            {data.map((item) => {
                const pct = (Number(item.count) / max) * 100
                const [year, month] = item.month.split('-')
                const label = new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

                return (
                    <div key={item.month} className="flex items-center gap-3 group">
                        <span className="text-xs font-mono text-slate-500 w-16 text-right shrink-0">{label}</span>
                        <div className="flex-1 h-5 bg-slate-800/50 rounded overflow-hidden">
                            <div
                                className="h-full rounded bg-gradient-to-r from-cyan-600/80 to-cyan-400/60 group-hover:from-cyan-500 group-hover:to-cyan-300/80 transition-all duration-300 flex items-center justify-end pr-2"
                                style={{ width: `${Math.max(pct, 2)}%` }}
                            >
                                {pct > 15 && <span className="text-[10px] font-mono text-white/80">{item.count}</span>}
                            </div>
                        </div>
                        {pct <= 15 && <span className="text-[10px] font-mono text-slate-500">{item.count}</span>}
                    </div>
                )
            })}
        </div>
    )
}

function DataPointCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/30 rounded-lg border border-slate-500/20 hover:border-purple-400/30 transition-all duration-300 overflow-hidden group">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.06),transparent_70%)]" />
            <div className="relative p-4 text-center">
                <div className="text-purple-400/60 flex justify-center mb-2">{icon}</div>
                <div className="text-2xl font-bold font-mono text-white">{value.toLocaleString()}</div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-slate-500 mt-1">{label}</div>
            </div>
        </div>
    )
}
