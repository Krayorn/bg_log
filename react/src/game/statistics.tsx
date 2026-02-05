import { useState } from "react"
import { apiGet } from '../hooks/useApi'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

type CustomField = {
    kind: string
    name: string
    global: boolean
    id: string
}

type StatsResult = 
    | { type: 'sum' | 'avg' | 'min' | 'max'; total: number }
    | { type: 'breakdown'; data: { value: string; count: number }[] }
    | { type: 'grouped'; data: { label: string; total: number }[] }
    | { type: 'stacked'; data: { group: string; values: Record<string, number> }[]; keys: string[] }
    | { type: 'crosstab'; data: { group: string; values: Record<string, number> }[]; keys: string[] }

type ChartType = 'bar' | 'pie'
type AggregationType = 'sum' | 'avg' | 'min' | 'max'

const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316']

type StatisticsPanelProps = {
    gameId: string
    playerId: string | null
    customFields: CustomField[]
}

export function StatisticsPanel({ gameId, playerId, customFields }: StatisticsPanelProps) {
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
    const [groupByFieldId, setGroupByFieldId] = useState<string | null>(null)
    const [groupByPlayer, setGroupByPlayer] = useState(false)
    const [chartType, setChartType] = useState<ChartType>('bar')
    const [aggregation, setAggregation] = useState<AggregationType>('sum')
    const [statsResult, setStatsResult] = useState<StatsResult | null>(null)
    const [loading, setLoading] = useState(false)

    const selectedField = customFields.find(cf => cf.id === selectedFieldId)
    const groupByField = customFields.find(cf => cf.id === groupByFieldId)
    const isNumberField = selectedField?.kind === 'number'
    const hasChartData = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped')
    const isStackedChart = statsResult?.type === 'stacked' || statsResult?.type === 'crosstab'

    const canQuery = selectedFieldId !== null

    const handleFieldClick = (fieldId: string) => {
        if (selectedFieldId === null) {
            setSelectedFieldId(fieldId)
            setGroupByFieldId(null)
            setGroupByPlayer(false)
            setStatsResult(null)
        } else if (selectedFieldId === fieldId) {
            setSelectedFieldId(null)
            setGroupByFieldId(null)
            setGroupByPlayer(false)
            setStatsResult(null)
        } else if (groupByFieldId === fieldId) {
            setGroupByFieldId(null)
            setStatsResult(null)
        } else {
            if (isFieldCompatibleForGroupBy(fieldId)) {
                setGroupByFieldId(fieldId)
                setGroupByPlayer(false)
                setStatsResult(null)
            }
        }
    }

    const handlePlayerClick = () => {
        if (selectedFieldId === null) return
        
        if (groupByPlayer) {
            setGroupByPlayer(false)
        } else {
            setGroupByPlayer(true)
            setGroupByFieldId(null)
        }
        setStatsResult(null)
    }

    const isFieldCompatibleForGroupBy = (fieldId: string): boolean => {
        if (selectedFieldId === null) return true
        if (fieldId === selectedFieldId) return false
        return true
    }

    const getFieldState = (fieldId: string): 'selected-aggregate' | 'selected-groupby' | 'compatible' | 'incompatible' | 'idle' => {
        if (selectedFieldId === fieldId) return 'selected-aggregate'
        if (groupByFieldId === fieldId) return 'selected-groupby'
        if (selectedFieldId === null) return 'idle'
        return isFieldCompatibleForGroupBy(fieldId) ? 'compatible' : 'incompatible'
    }

    const getPlayerState = (): 'selected-groupby' | 'compatible' | 'idle' => {
        if (groupByPlayer) return 'selected-groupby'
        if (selectedFieldId === null) return 'idle'
        return 'compatible'
    }

    const clearSelection = () => {
        setSelectedFieldId(null)
        setGroupByFieldId(null)
        setGroupByPlayer(false)
        setStatsResult(null)
    }

    const fetchStats = async () => {
        if (!selectedFieldId) return
        
        setLoading(true)
        setStatsResult(null)
        
        const params = new URLSearchParams({ customFieldId: selectedFieldId })
        if (playerId) {
            params.set('playerId', playerId)
        }
        if (groupByFieldId) {
            params.set('groupByFieldId', groupByFieldId)
        }
        if (groupByPlayer) {
            params.set('groupByPlayer', 'true')
        }
        if (isNumberField) {
            params.set('aggregation', aggregation)
        }
        
        const { data, ok } = await apiGet<StatsResult>(`/games/${gameId}/customFields/stats?${params.toString()}`)
        
        if (ok && data) {
            setStatsResult(data)
        }
        setLoading(false)
    }

    const getStackedChartData = () => {
        if (statsResult?.type !== 'stacked' && statsResult?.type !== 'crosstab') return []
        return statsResult.data.map(item => ({
            group: item.group,
            ...item.values
        }))
    }

    const entryFields = customFields.filter(cf => cf.global)
    const playerFields = customFields.filter(cf => !cf.global)

    if (customFields.length === 0) {
        return (
            <div className="border border-slate-600 rounded-lg p-8 bg-slate-900/30 text-center">
                <p className="text-slate-400">No custom fields defined for this game.</p>
                <p className="text-slate-500 text-sm mt-2">
                    Add custom fields in the game page to enable statistics.
                </p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-white">Statistics</h2>
            
            <div className="border border-slate-600 rounded-lg p-6 bg-slate-900/30 backdrop-blur-sm">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-slate-400 text-sm">
                            {selectedFieldId === null 
                                ? 'Select a field to aggregate'
                                : groupByFieldId || groupByPlayer 
                                    ? 'Selection complete' 
                                    : 'Optionally select a field or player to group by'
                            }
                        </p>
                        {selectedFieldId && (
                            <button
                                onClick={clearSelection}
                                className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Clear
                            </button>
                        )}
                    </div>

                    {entryFields.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-emerald-400 mb-2 font-medium">Entry Fields</p>
                            <div className="flex flex-wrap gap-2">
                                {entryFields.map(cf => (
                                    <FieldBox 
                                        key={cf.id}
                                        field={cf}
                                        state={getFieldState(cf.id)}
                                        onClick={() => handleFieldClick(cf.id)}
                                        colorClass="emerald"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {playerFields.length > 0 && (
                        <div className="mb-4">
                            <p className="text-xs text-violet-400 mb-2 font-medium">Player Fields</p>
                            <div className="flex flex-wrap gap-2">
                                {playerFields.map(cf => (
                                    <FieldBox 
                                        key={cf.id}
                                        field={cf}
                                        state={getFieldState(cf.id)}
                                        onClick={() => handleFieldClick(cf.id)}
                                        colorClass="violet"
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <p className="text-xs text-cyan-400 mb-2 font-medium">Group By</p>
                        <div className="flex flex-wrap gap-2">
                            <PlayerBox 
                                state={getPlayerState()}
                                onClick={handlePlayerClick}
                                disabled={selectedFieldId === null}
                            />
                        </div>
                    </div>
                </div>

                {isNumberField && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-600">
                        <span className="text-slate-400 text-sm">Aggregation:</span>
                        {(['sum', 'avg', 'min', 'max'] as AggregationType[]).map(agg => (
                            <button
                                key={agg}
                                onClick={() => { setAggregation(agg); setStatsResult(null); }}
                                className={`px-3 py-1 rounded text-sm transition-colors ${
                                    aggregation === agg
                                        ? 'bg-cyan-600 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:text-white'
                                }`}
                            >
                                {agg.charAt(0).toUpperCase() + agg.slice(1)}
                            </button>
                        ))}
                    </div>
                )}

                {canQuery && (
                    <div className="mb-6">
                        <button 
                            onClick={fetchStats}
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
                        >
                            {loading ? 'Loading...' : 'Get Graph'}
                        </button>
                        <span className="ml-3 text-slate-500 text-sm">
                            {selectedField?.name}
                            {groupByFieldId && ` → grouped by ${groupByField?.name}`}
                            {groupByPlayer && ` → grouped by Player`}
                        </span>
                    </div>
                )}

                {statsResult && (
                    <div className="border-t border-slate-600 pt-6">
                        {hasChartData && (
                            <div className="flex justify-center gap-2 mb-4">
                                <button
                                    onClick={() => setChartType('bar')}
                                    className={`p-2 rounded transition-colors ${chartType === 'bar' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                                    title="Bar Chart"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setChartType('pie')}
                                    className={`p-2 rounded transition-colors ${chartType === 'pie' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                                    title="Pie Chart"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
                                    </svg>
                                </button>
                            </div>
                        )}
                        
                        {['sum', 'avg', 'min', 'max'].includes(statsResult.type) && 'total' in statsResult && (
                            <div className="text-center">
                                <p className="text-slate-400 text-sm mb-2">
                                    {statsResult.type === 'sum' && `Total sum for "${selectedField?.name}"`}
                                    {statsResult.type === 'avg' && `Average for "${selectedField?.name}"`}
                                    {statsResult.type === 'min' && `Minimum for "${selectedField?.name}"`}
                                    {statsResult.type === 'max' && `Maximum for "${selectedField?.name}"`}
                                </p>
                                <p className="text-5xl font-bold text-cyan-400">
                                    {statsResult.type === 'avg' ? statsResult.total.toFixed(2) : statsResult.total}
                                </p>
                            </div>
                        )}
                        
                        {statsResult.type === 'grouped' && (
                            <div>
                                <p className="text-slate-400 text-sm mb-4 text-center">
                                    "{selectedField?.name}" grouped by "{groupByPlayer ? 'Player' : groupByField?.name}"
                                </p>
                                {statsResult.data.length === 0 ? (
                                    <p className="text-slate-500 text-center">No data available</p>
                                ) : chartType === 'bar' ? (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statsResult.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                                                <XAxis type="number" stroke="#94a3b8" />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="label" 
                                                    stroke="#94a3b8" 
                                                    width={150}
                                                    tick={{ fill: '#e2e8f0', fontSize: 12 }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569',
                                                        borderRadius: '8px'
                                                    }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                />
                                                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                                    {statsResult.data.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statsResult.data}
                                                    dataKey="total"
                                                    nameKey="label"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    innerRadius={50}
                                                    label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                                                    labelLine={{ stroke: '#94a3b8' }}
                                                >
                                                    {statsResult.data.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569',
                                                        borderRadius: '8px'
                                                    }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                />
                                                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {statsResult.type === 'breakdown' && (
                            <div>
                                <p className="text-slate-400 text-sm mb-4 text-center">
                                    Value distribution for "{selectedField?.name}"
                                </p>
                                {statsResult.data.length === 0 ? (
                                    <p className="text-slate-500 text-center">No data available</p>
                                ) : chartType === 'bar' ? (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statsResult.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                                                <XAxis type="number" stroke="#94a3b8" />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="value" 
                                                    stroke="#94a3b8" 
                                                    width={150}
                                                    tick={{ fill: '#e2e8f0', fontSize: 12 }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569',
                                                        borderRadius: '8px'
                                                    }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                />
                                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                                    {statsResult.data.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-80">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={statsResult.data}
                                                    dataKey="count"
                                                    nameKey="value"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={100}
                                                    innerRadius={50}
                                                    label={({ value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                                                    labelLine={{ stroke: '#94a3b8' }}
                                                >
                                                    {statsResult.data.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569',
                                                        borderRadius: '8px'
                                                    }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                />
                                                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}

                        {isStackedChart && (statsResult.type === 'stacked' || statsResult.type === 'crosstab') && (
                            <div>
                                <p className="text-slate-400 text-sm mb-4 text-center">
                                    "{selectedField?.name}" by {statsResult.type === 'stacked' ? 'player' : `"${groupByField?.name}"`}
                                </p>
                                {statsResult.data.length === 0 ? (
                                    <p className="text-slate-500 text-center">No data available</p>
                                ) : (
                                    <div className="h-96">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={getStackedChartData()} layout="vertical" margin={{ left: 20, right: 20 }}>
                                                <XAxis type="number" stroke="#94a3b8" />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="group" 
                                                    stroke="#94a3b8" 
                                                    width={120}
                                                    tick={{ fill: '#e2e8f0', fontSize: 12 }}
                                                />
                                                <Tooltip 
                                                    contentStyle={{ 
                                                        backgroundColor: '#1e293b', 
                                                        border: '1px solid #475569',
                                                        borderRadius: '8px'
                                                    }}
                                                    labelStyle={{ color: '#e2e8f0' }}
                                                />
                                                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
                                                {statsResult.keys.map((key, index) => (
                                                    <Bar 
                                                        key={key} 
                                                        dataKey={key} 
                                                        stackId="stack" 
                                                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                                                    />
                                                ))}
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

function FieldBox({ 
    field, 
    state, 
    onClick, 
    colorClass 
}: { 
    field: CustomField
    state: 'selected-aggregate' | 'selected-groupby' | 'compatible' | 'incompatible' | 'idle'
    onClick: () => void
    colorClass: 'emerald' | 'violet'
}) {
    const baseClasses = "px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
    
    const stateClasses = {
        'selected-aggregate': colorClass === 'emerald' 
            ? 'bg-emerald-500/30 border-2 border-emerald-400 text-emerald-300 ring-2 ring-emerald-400/50'
            : 'bg-violet-500/30 border-2 border-violet-400 text-violet-300 ring-2 ring-violet-400/50',
        'selected-groupby': 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/50',
        'compatible': colorClass === 'emerald'
            ? 'bg-slate-800 border border-emerald-500/50 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/10'
            : 'bg-slate-800 border border-violet-500/50 text-violet-300 hover:border-violet-400 hover:bg-violet-500/10',
        'incompatible': 'bg-slate-800/50 border border-slate-600 text-slate-500 cursor-not-allowed opacity-50',
        'idle': colorClass === 'emerald'
            ? 'bg-slate-800 border border-emerald-500/50 text-emerald-300 hover:border-emerald-400 hover:bg-emerald-500/10'
            : 'bg-slate-800 border border-violet-500/50 text-violet-300 hover:border-violet-400 hover:bg-violet-500/10',
    }

    return (
        <button
            onClick={state !== 'incompatible' ? onClick : undefined}
            className={`${baseClasses} ${stateClasses[state]}`}
            disabled={state === 'incompatible'}
        >
            {field.name}
            <span className="ml-1 text-xs opacity-60">({field.kind})</span>
        </button>
    )
}

function PlayerBox({ 
    state, 
    onClick, 
    disabled 
}: { 
    state: 'selected-groupby' | 'compatible' | 'idle'
    onClick: () => void
    disabled: boolean
}) {
    const baseClasses = "px-3 py-2 rounded-lg text-sm font-medium transition-all"
    
    const stateClasses = {
        'selected-groupby': 'bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 ring-2 ring-cyan-400/50 cursor-pointer',
        'compatible': 'bg-slate-800 border border-cyan-500/50 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/10 cursor-pointer',
        'idle': disabled 
            ? 'bg-slate-800/50 border border-slate-600 text-slate-500 cursor-not-allowed opacity-50'
            : 'bg-slate-800 border border-cyan-500/50 text-cyan-300 hover:border-cyan-400 hover:bg-cyan-500/10 cursor-pointer',
    }

    return (
        <button
            onClick={!disabled ? onClick : undefined}
            className={`${baseClasses} ${stateClasses[state]}`}
            disabled={disabled}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline-block mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Player
        </button>
    )
}
