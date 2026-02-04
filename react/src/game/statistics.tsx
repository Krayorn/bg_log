import { useParams, useSearchParams, Link } from "react-router-dom"
import { useState } from "react"
import { useRequest } from '../hooks/useRequest'
import { apiGet } from '../hooks/useApi'
import Layout from '../Layout'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'

type Game = {
    name: string
    id: string
    customFields: CustomField[]
}

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

export default function Statistics() {
    const { gameId } = useParams() as { gameId: string }
    const [searchParams] = useSearchParams()
    const playerId = searchParams.get('playerId')
    
    const [game, setGame] = useState<Game | null>(null)
    const [selectedFieldId, setSelectedFieldId] = useState<string>('')
    const [groupByFieldId, setGroupByFieldId] = useState<string>('')
    const [groupByPlayer, setGroupByPlayer] = useState(false)
    const [chartType, setChartType] = useState<ChartType>('bar')
    const [aggregation, setAggregation] = useState<AggregationType>('sum')
    const [statsResult, setStatsResult] = useState<StatsResult | null>(null)
    const [loading, setLoading] = useState(false)

    useRequest(`/games/${gameId}`, [gameId], setGame)

    const customFields = game?.customFields ?? []
    const selectedField = customFields.find(cf => cf.id === selectedFieldId)
    const groupByField = customFields.find(cf => cf.id === groupByFieldId)
    const isNumberField = selectedField?.kind === 'number'
    const hasChartData = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped')
    const isStackedChart = statsResult?.type === 'stacked' || statsResult?.type === 'crosstab'

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

    // Transform stacked/crosstab data for recharts (flatten values into the object)
    const getStackedChartData = () => {
        if (statsResult?.type !== 'stacked' && statsResult?.type !== 'crosstab') return []
        return statsResult.data.map(item => ({
            group: item.group,
            ...item.values
        }))
    }

    if (game === null) {
        return (
            <Layout>
                <div className="text-white">Loading...</div>
            </Layout>
        )
    }

    return (
        <Layout>
            <div className="flex flex-col text-white max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <Link 
                        to={`/games/${gameId}${playerId ? `?playerId=${playerId}` : ''}`}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </Link>
                    <h1 className="text-2xl font-semibold">{game.name} - Statistics</h1>
                </div>

                {customFields.length === 0 ? (
                    <div className="border border-slate-600 rounded-lg p-8 bg-slate-900/30 text-center">
                        <p className="text-slate-400">No custom fields defined for this game.</p>
                        <p className="text-slate-500 text-sm mt-2">
                            Add custom fields in the game page to enable statistics.
                        </p>
                    </div>
                ) : (
                    <div className="border border-slate-600 rounded-lg p-6 bg-slate-900/30 backdrop-blur-sm">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                    <label className="text-white text-sm font-medium">Aggregate Field</label>
                                    <select 
                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                                        value={selectedFieldId}
                                        onChange={e => {
                                            setSelectedFieldId(e.target.value)
                                            setStatsResult(null)
                                            setGroupByFieldId('')
                                            setGroupByPlayer(false)
                                        }}
                                    >
                                        <option value="">Choose a field...</option>
                                        <optgroup label="Entry Fields">
                                            {customFields.filter(cf => cf.global).map(cf => (
                                                <option key={cf.id} value={cf.id}>
                                                    {cf.name} ({cf.kind})
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Player Fields">
                                            {customFields.filter(cf => !cf.global).map(cf => (
                                                <option key={cf.id} value={cf.id}>
                                                    {cf.name} ({cf.kind})
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                
                                {isNumberField && (
                                    <div className="flex flex-col gap-1 min-w-[120px]">
                                        <label className="text-white text-sm font-medium">Aggregation</label>
                                        <select 
                                            className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                                            value={aggregation}
                                            onChange={e => {
                                                setAggregation(e.target.value as AggregationType)
                                                setStatsResult(null)
                                            }}
                                        >
                                            <option value="sum">Sum</option>
                                            <option value="avg">Average</option>
                                            <option value="min">Minimum</option>
                                            <option value="max">Maximum</option>
                                        </select>
                                    </div>
                                )}

                                {selectedFieldId && (
                                    <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
                                        <label className="text-white text-sm font-medium">Group By (optional)</label>
                                        <select 
                                            className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                                            value={groupByFieldId}
                                            onChange={e => {
                                                setGroupByFieldId(e.target.value)
                                                setGroupByPlayer(false)
                                                setStatsResult(null)
                                            }}
                                        >
                                            <option value="">{isNumberField ? `No grouping (total ${aggregation})` : 'No grouping'}</option>
                                            <optgroup label="Entry Fields">
                                                {customFields.filter(cf => cf.global && cf.id !== selectedFieldId).map(cf => (
                                                    <option key={cf.id} value={cf.id}>
                                                        {cf.name} ({cf.kind})
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <optgroup label="Player Fields">
                                                {customFields.filter(cf => !cf.global && cf.id !== selectedFieldId).map(cf => (
                                                    <option key={cf.id} value={cf.id}>
                                                        {cf.name} ({cf.kind})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                )}

                                {!groupByFieldId && (
                                    <label className="flex items-center gap-2 text-white cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={groupByPlayer}
                                            onChange={e => {
                                                setGroupByPlayer(e.target.checked)
                                                setStatsResult(null)
                                            }}
                                            className="w-4 h-4 rounded"
                                        />
                                        <span className="text-sm">Group by player</span>
                                    </label>
                                )}
                            </div>
                            
                            <button 
                                onClick={fetchStats}
                                disabled={!selectedFieldId || loading}
                                className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors self-start"
                            >
                                {loading ? 'Loading...' : 'Get Statistics'}
                            </button>
                        </div>

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
                                            "{selectedField?.name}" grouped by "{groupByField?.name}"
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
                )}
            </div>
        </Layout>
    )
}
