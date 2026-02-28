import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useRequest } from '../hooks/useRequest'
import { useLocalStorage, parseJwt } from '../hooks/useLocalStorage'
import Layout from '../Layout'
import {
    Activity, Users, Gamepad2, Trophy, TrendingUp,
    Calendar, Shield, Database, ArrowLeft, LayoutDashboard,
    Crown, Zap
} from 'lucide-react'
import type { AdminStats } from '../types'
import type { ReactNode } from 'react'

function AdminLayout({ children }: { children: ReactNode }) {
    const location = useLocation()
    const [token] = useLocalStorage('jwt', null)
    const playerId = token ? parseJwt(token).id : null

    const isActive = (path: string) => location.pathname === path

    return (
        <Layout noNav>
            <div className="flex min-h-[calc(100vh-3rem)] -m-6">
                <aside className="w-56 shrink-0 border-r border-cyan-400/20 bg-slate-950/60 backdrop-blur-md flex flex-col">
                    <div className="p-5 border-b border-cyan-400/20">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-cyan-400" />
                            <span className="text-sm font-bold tracking-[0.3em] text-cyan-400 uppercase">Admin</span>
                            <span className="relative flex h-2 w-2 ml-auto">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">SYSTEM STATUS: ONLINE</div>
                    </div>

                    <nav className="flex-1 p-3 space-y-1">
                        <Link
                            to="/admin"
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                                isActive('/admin')
                                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <LayoutDashboard className="w-4 h-4" />
                            Dashboard
                        </Link>
                        <Link
                            to="/admin/users"
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-all duration-200 ${
                                isActive('/admin/users')
                                    ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }`}
                        >
                            <Users className="w-4 h-4" />
                            Users
                        </Link>
                    </nav>

                    <div className="p-3 border-t border-cyan-400/20">
                        {playerId && (
                            <Link
                                to={`/players/${playerId}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-500 hover:text-cyan-400 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to App
                            </Link>
                        )}
                    </div>
                </aside>

                <div className="flex-1 p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </Layout>
    )
}

export { AdminLayout }

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    useRequest<AdminStats>('/admin/stats', [], setStats)

    return (
        <AdminLayout>
            <DashboardHeader />
            {stats === null ? (
                <div className="text-slate-500 mt-8">Loading system data...</div>
            ) : (
                <DashboardContent stats={stats} />
            )}
        </AdminLayout>
    )
}

function DashboardHeader() {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    return (
        <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-white tracking-wide">SYSTEM OVERVIEW</h1>
                <div className="h-px flex-1 bg-gradient-to-r from-cyan-400/40 to-transparent"></div>
            </div>
            <div className="text-xs text-slate-500 font-mono">{dateStr} — {timeStr}</div>
        </div>
    )
}

function DashboardContent({ stats }: { stats: AdminStats }) {
    return (
        <div className="space-y-4">
            {/* Row 1: Core Metrics */}
            <div className="grid grid-cols-4 gap-4">
                <MetricCard
                    icon={<Users className="w-5 h-5" />}
                    label="USERS"
                    value={stats.registeredPlayers}
                    accent="cyan"
                />
                <MetricCard
                    icon={<Activity className="w-5 h-5" />}
                    label="TOTAL ENTRIES"
                    value={stats.totalEntries}
                    accent="cyan"
                />
                <MetricCard
                    icon={<Gamepad2 className="w-5 h-5" />}
                    label="TOTAL GAMES"
                    value={stats.totalGames}
                    accent="purple"
                />
                <MetricCard
                    icon={<Trophy className="w-5 h-5" />}
                    label="CAMPAIGNS"
                    value={stats.totalCampaigns}
                    accent="purple"
                />
            </div>

            {/* Row 2: User Breakdown + Activity */}
            <div className="grid grid-cols-2 gap-4">
                <Panel title="USER BREAKDOWN">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Registered</span>
                            <span className="text-cyan-400 font-mono font-bold">{stats.registeredPlayers}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]"
                                style={{ width: `${stats.totalPlayers > 0 ? (stats.registeredPlayers / stats.totalPlayers) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">Guests</span>
                            <span className="text-purple-400 font-mono font-bold">{stats.guestPlayers}</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.4)]"
                                style={{ width: `${stats.totalPlayers > 0 ? (stats.guestPlayers / stats.totalPlayers) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/50">
                            <span>Total</span>
                            <span className="font-mono">{stats.totalPlayers}</span>
                        </div>
                    </div>
                </Panel>

                <Panel title="ACTIVITY METRICS">
                    <div className="grid grid-cols-2 gap-4">
                        <MiniStat icon={<Calendar className="w-4 h-4" />} label="Entries this month" value={stats.entriesThisMonth} />
                        <MiniStat icon={<Users className="w-4 h-4" />} label="New users (month)" value={stats.newUsersThisMonth} />
                        <MiniStat icon={<TrendingUp className="w-4 h-4" />} label="Avg entries/user" value={stats.avgEntriesPerUser} />
                        <MiniStat icon={<Activity className="w-4 h-4" />} label="Avg players/entry" value={stats.avgPlayersPerEntry} />
                    </div>
                </Panel>
            </div>

            {/* Row 3: Most Played + Top Players */}
            <div className="grid grid-cols-2 gap-4">
                <Panel title="MOST PLAYED GAME">
                    {stats.mostPlayedGame ? (
                        <div className="flex flex-col items-center justify-center h-full py-4">
                            <div className="rounded-full p-4 bg-cyan-500/10 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.2)] mb-3">
                                <Crown className="w-8 h-8 text-cyan-400" />
                            </div>
                            <span className="text-lg font-bold text-white">{stats.mostPlayedGame.name}</span>
                            <span className="text-sm text-slate-400 mt-1">
                                <span className="text-cyan-400 font-mono font-bold">{stats.mostPlayedGame.play_count}</span> plays
                            </span>
                        </div>
                    ) : (
                        <div className="text-slate-500 text-sm">No games played yet</div>
                    )}
                </Panel>

                <Panel title="TOP PLAYERS">
                    <div className="space-y-2">
                        {stats.topPlayers.map((player, idx) => (
                            <div key={player.name} className="flex items-center gap-3">
                                <span className={`text-xs font-mono w-5 text-right ${
                                    idx === 0 ? 'text-cyan-400' : idx === 1 ? 'text-slate-300' : 'text-slate-500'
                                }`}>
                                    #{idx + 1}
                                </span>
                                <div className="flex-1 flex items-center justify-between">
                                    <span className={`text-sm ${idx === 0 ? 'text-white font-semibold' : 'text-slate-300'}`}>
                                        {player.name}
                                    </span>
                                    <span className="text-xs font-mono text-cyan-400">{player.entries_count} plays</span>
                                </div>
                            </div>
                        ))}
                        {stats.topPlayers.length === 0 && (
                            <div className="text-slate-500 text-sm">No data available</div>
                        )}
                    </div>
                </Panel>
            </div>

            {/* Row 4: Recent Activity + Stats Footer */}
            <div className="grid grid-cols-2 gap-4">
                <Panel title="RECENT ACTIVITY">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {stats.recentEntries.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                <Zap className="w-3 h-3 text-cyan-400 shrink-0" />
                                <span className="text-slate-400 font-mono text-xs shrink-0">
                                    {new Date(entry.played_at).toLocaleDateString('fr-FR')}
                                </span>
                                <span className="text-slate-300 truncate">{entry.game_name}</span>
                            </div>
                        ))}
                        {stats.recentEntries.length === 0 && (
                            <div className="text-slate-500 text-sm">No recent activity</div>
                        )}
                    </div>
                </Panel>

                <Panel title="SYSTEM STATS">
                    <div className="grid grid-cols-2 gap-4">
                        <MiniStat icon={<Database className="w-4 h-4" />} label="Games owned" value={stats.totalGamesOwned} />
                        <MiniStat icon={<Gamepad2 className="w-4 h-4" />} label="Unique games" value={stats.totalGames} />
                    </div>
                </Panel>
            </div>
        </div>
    )
}

function MetricCard({ icon, label, value, accent }: {
    icon: ReactNode
    label: string
    value: number
    accent: 'cyan' | 'purple'
}) {
    const isCyan = accent === 'cyan'
    return (
        <div className={`relative group bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-lg border transition-all duration-300 overflow-hidden ${
            isCyan
                ? 'border-cyan-400/30 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                : 'border-purple-400/30 hover:border-purple-400/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
        }`}>
            {/* Scan line effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className={`absolute left-0 right-0 h-px animate-scan ${
                    isCyan ? 'bg-cyan-400/20' : 'bg-purple-400/20'
                }`} />
            </div>

            <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-3">
                    <div className={isCyan ? 'text-cyan-400' : 'text-purple-400'}>{icon}</div>
                    <span className="text-[10px] tracking-[0.2em] text-slate-500 uppercase">{label}</span>
                </div>
                <div className={`text-3xl font-bold font-mono ${isCyan ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {value.toLocaleString()}
                </div>
            </div>
        </div>
    )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 overflow-hidden hover:border-cyan-400/40 transition-colors duration-300">
            <header className="border-b border-slate-500/50 px-4 py-2 bg-slate-800/70 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"></div>
                <span className="uppercase text-[10px] font-medium text-slate-400 tracking-[0.2em]">{title}</span>
            </header>
            <div className="p-4 text-white">
                {children}
            </div>
        </section>
    )
}

function MiniStat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-500">
                {icon}
                <span className="text-[10px] uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-xl font-bold font-mono text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        </div>
    )
}
