// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck — recharts types are incompatible with React 19's stricter JSX types
import { useState, useEffect, useCallback } from "react"
import { getSavedQueries, createSavedQuery, updateSavedQuery, deleteSavedQuery, executeStatsQuery } from '../api/statistics'
import { X, BarChart3, PieChart as PieChartIcon, User, Save, Trash2, Pencil, Plus, ChevronUp, Trophy } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import type { CustomField, StatsResult, ChartType, AggregationType, SavedQuery } from '../types'
import { ScanLine, CornerBrackets } from '../components/SciFi'

const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316']

const HUD_TOOLTIP_STYLE = {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(34, 211, 238, 0.3)',
    borderRadius: '8px',
    color: '#e2e8f0',
    boxShadow: '0 0 15px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(34, 211, 238, 0.1)',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '12px',
}

function HudTooltipContent({ active, payload, label }: { active?: boolean; label?: string; payload?: { name: string; value: number; color: string; payload: { fill?: string } }[] }) {
    if (!active || !payload?.length) return null
    return (
        <div style={{ ...HUD_TOOLTIP_STYLE, padding: '8px 12px' }}>
            {label && <div style={{ color: '#22d3ee', fontWeight: 'bold', marginBottom: 4 }}>{label}</div>}
            {payload.map((entry, i) => {
                const color = entry.payload?.fill ?? entry.color ?? '#e2e8f0'
                return (
                    <div key={i} style={{ color }}>
                        {entry.name} : {entry.value}
                    </div>
                )
            })}
        </div>
    )
}

function WinrateTooltipContent({ active, payload, label }: { active?: boolean; label?: string; payload?: { value: number; payload: { fill?: string; wins: number; total: number; rate: number } }[] }) {
    if (!active || !payload?.length) return null
    const entry = payload[0]
    const color = entry.payload?.fill ?? '#e2e8f0'
    return (
        <div style={{ ...HUD_TOOLTIP_STYLE, padding: '8px 12px' }}>
            {label && <div style={{ color: '#22d3ee', fontWeight: 'bold', marginBottom: 4 }}>{label}</div>}
            <div style={{ color }}>
                {entry.payload.wins} wins / {entry.payload.total} total ({entry.payload.rate.toFixed(1)}%)
            </div>
        </div>
    )
}

const HUD_AXIS = {
    x: { stroke: '#334155', tick: { fill: '#64748b', fontSize: 11, fontFamily: 'ui-monospace, monospace' } },
    y: { stroke: '#334155', tick: { fill: '#94a3b8', fontSize: 11, fontFamily: 'ui-monospace, monospace' } },
}

type StatisticsPanelProps = {
    gameId: string
    playerId: string | null
    customFields: CustomField[]
}

export function StatisticsPanel({ gameId, playerId, customFields }: StatisticsPanelProps) {
    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
    const [showExplorer, setShowExplorer] = useState(false)

    const loadSavedQueries = useCallback(async () => {
        if (!playerId) return
        const { data, ok } = await getSavedQueries(gameId, playerId)
        if (ok && data) {
            setSavedQueries(data)
        }
    }, [gameId, playerId])

    useEffect(() => {
        loadSavedQueries()
    }, [loadSavedQueries])

    const handleSave = async (query: Omit<SavedQuery, 'id'>) => {
        if (!playerId) return
        const { data, ok } = await createSavedQuery({ ...query, gameId, playerId })
        if (ok && data) {
            setSavedQueries(prev => [...prev, data])
        }
    }

    const handleUpdate = async (id: string, query: Omit<SavedQuery, 'id'>) => {
        const { data, ok } = await updateSavedQuery(id, query)
        if (ok && data) {
            setSavedQueries(prev => prev.map(q => q.id === id ? data : q))
        }
    }

    const handleDelete = async (id: string) => {
        const { ok } = await deleteSavedQuery(id)
        if (ok) {
            setSavedQueries(prev => prev.filter(q => q.id !== id))
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-white">Statistics</h2>

            <button
                onClick={() => setShowExplorer(!showExplorer)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-purple-400/30 text-slate-400 hover:text-purple-400 hover:border-purple-400/60 hover:bg-purple-500/5 hover:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all duration-300 font-mono text-sm"
            >
                {showExplorer ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showExplorer ? 'Hide Explorer' : 'New Query'}
            </button>

            {showExplorer && (
                <QueryExplorer
                    gameId={gameId}
                    playerId={playerId}
                    customFields={customFields}
                    onSave={handleSave}
                />
            )}

            {savedQueries.map(sq => (
                <SavedQueryCard
                    key={sq.id}
                    savedQuery={sq}
                    gameId={gameId}
                    playerId={playerId}
                    customFields={customFields}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                />
            ))}
        </div>
    )
}

function SavedQueryCard({
    savedQuery,
    gameId,
    playerId,
    customFields,
    onUpdate,
    onDelete,
}: {
    savedQuery: SavedQuery
    gameId: string
    playerId: string | null
    customFields: CustomField[]
    onUpdate: (id: string, query: Omit<SavedQuery, 'id'>) => Promise<void>
    onDelete: (id: string) => Promise<void>
}) {
    const [statsResult, setStatsResult] = useState<StatsResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [chartType, setChartType] = useState<ChartType>('bar')
    const [editing, setEditing] = useState(false)
    const [editName, setEditName] = useState(savedQuery.name)
    const [deleting, setDeleting] = useState(false)

    const selectedField = customFields.find(cf => cf.id === savedQuery.customFieldId)
    const groupByField = savedQuery.groupByFieldId ? customFields.find(cf => cf.id === savedQuery.groupByFieldId) : null
    const hasChartData = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped' || (statsResult.type === 'winrate' && 'data' in statsResult) || statsResult.type === 'winrate_by_player')
    const hasPieOption = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped')
    const isStackedChart = statsResult?.type === 'stacked' || statsResult?.type === 'crosstab'

    const fetchStats = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (savedQuery.metric) {
            params.set('metric', savedQuery.metric)
            params.set('gameId', gameId)
        } else {
            params.set('customFieldId', savedQuery.customFieldId)
        }
        if (playerId) params.set('playerId', playerId)
        if (savedQuery.groupByFieldId) params.set('groupByFieldId', savedQuery.groupByFieldId)
        if (savedQuery.groupByPlayer) params.set('groupByPlayer', 'true')
        if (savedQuery.aggregation) params.set('aggregation', savedQuery.aggregation)

        const { data, ok } = await executeStatsQuery(params)
        if (ok && data) setStatsResult(data)
        setLoading(false)
    }, [gameId, playerId, savedQuery])

    useEffect(() => { fetchStats() }, [fetchStats])

    const handleSaveEdit = async () => {
        await onUpdate(savedQuery.id, {
            name: editName,
            customFieldId: savedQuery.customFieldId,
            groupByFieldId: savedQuery.groupByFieldId,
            groupByPlayer: savedQuery.groupByPlayer,
            aggregation: savedQuery.aggregation,
            metric: savedQuery.metric,
        })
        setEditing(false)
    }

    const handleDelete = async () => {
        setDeleting(true)
        await onDelete(savedQuery.id)
    }

    const getStackedChartData = () => {
        if (statsResult?.type !== 'stacked' && statsResult?.type !== 'crosstab') return []
        return statsResult.data.map(item => ({ group: item.group, ...item.values }))
    }

    return (
        <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-lg border border-cyan-400/20 hover:border-cyan-400/40 transition-all duration-300 overflow-hidden p-6">
            <ScanLine accent="cyan" delay={1} />
            <CornerBrackets color="cyan" />
            <div className="relative flex items-center justify-between mb-4">
                {editing ? (
                    <div className="flex items-center gap-2">
                        <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="bg-slate-800/80 border border-cyan-400/30 rounded px-2 py-1 text-white text-sm font-mono focus:border-cyan-400/60 focus:outline-none"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit() }}
                        />
                        <button onClick={handleSaveEdit} className="text-emerald-400 hover:text-emerald-300 text-sm font-mono">Save</button>
                        <button onClick={() => { setEditing(false); setEditName(savedQuery.name) }} className="text-slate-400 hover:text-white text-sm font-mono">Cancel</button>
                    </div>
                ) : (
                    <h3 className="text-white font-medium tracking-wide">{savedQuery.name}</h3>
                )}
                <div className="flex items-center gap-2">
                    {hasChartData && (
                        <>
                            <button
                                onClick={() => setChartType('bar')}
                                className={`p-1.5 rounded transition-all duration-200 ${chartType === 'bar' ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-800/50 text-slate-500 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30'}`}
                            >
                                <BarChart3 className="w-4 h-4" />
                            </button>
                            {hasPieOption && (
                                <button
                                    onClick={() => setChartType('pie')}
                                    className={`p-1.5 rounded transition-all duration-200 ${chartType === 'pie' ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-800/50 text-slate-500 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30'}`}
                                >
                                    <PieChartIcon className="w-4 h-4" />
                                </button>
                            )}
                            <div className="w-px h-5 bg-cyan-400/20 mx-1" />
                        </>
                    )}
                    <button onClick={() => setEditing(true)} className="p-1.5 rounded text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all duration-200">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="relative">
                {loading ? (
                    <p className="text-slate-500 text-center py-8 font-mono text-sm animate-pulse">Loading...</p>
                ) : statsResult ? (
                    <StatsResultDisplay
                        statsResult={statsResult}
                        chartType={chartType}
                        selectedField={selectedField}
                        groupByField={groupByField}
                        groupByPlayer={savedQuery.groupByPlayer}
                        isStackedChart={!!isStackedChart}
                        getStackedChartData={getStackedChartData}
                    />
                ) : (
                    <p className="text-slate-500 text-center py-8 font-mono text-sm">No data available</p>
                )}
            </div>
        </div>
    )
}

function QueryExplorer({
    gameId,
    playerId,
    customFields,
    onSave,
}: {
    gameId: string
    playerId: string | null
    customFields: CustomField[]
    onSave: (query: Omit<SavedQuery, 'id'>) => Promise<void>
}) {
    const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
    const [groupByFieldId, setGroupByFieldId] = useState<string | null>(null)
    const [groupByPlayer, setGroupByPlayer] = useState(false)
    const [chartType, setChartType] = useState<ChartType>('bar')
    const [aggregation, setAggregation] = useState<AggregationType>('sum')
    const [statsResult, setStatsResult] = useState<StatsResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [saveName, setSaveName] = useState('')
    const [showSaveInput, setShowSaveInput] = useState(false)
    const [metric, setMetric] = useState<string | null>(null)

    const selectedField = customFields.find(cf => cf.id === selectedFieldId)
    const groupByField = customFields.find(cf => cf.id === groupByFieldId)
    const isNumberField = selectedField?.kind === 'number'
    const hasChartData = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped' || (statsResult.type === 'winrate' && 'data' in statsResult) || statsResult.type === 'winrate_by_player')
    const hasPieOption = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped')
    const isStackedChart = statsResult?.type === 'stacked' || statsResult?.type === 'crosstab'

    const canQuery = selectedFieldId !== null || metric !== null

    const handleFieldClick = (fieldId: string) => {
        if (metric !== null) {
            if (groupByFieldId === fieldId) {
                setGroupByFieldId(null)
            } else {
                setGroupByFieldId(fieldId)
            }
            setStatsResult(null)
            return
        }
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
        if (selectedFieldId === null && metric === null) return
        
        if (groupByPlayer) {
            setGroupByPlayer(false)
        } else {
            setGroupByPlayer(true)
            if (!metric) {
                setGroupByFieldId(null)
            }
        }
        setStatsResult(null)
    }

    const isFieldCompatibleForGroupBy = (fieldId: string): boolean => {
        if (selectedFieldId === null && metric === null) return true
        if (fieldId === selectedFieldId) return false
        return true
    }

    const getFieldState = (fieldId: string): 'selected-aggregate' | 'selected-groupby' | 'compatible' | 'incompatible' | 'idle' => {
        if (selectedFieldId === fieldId) return 'selected-aggregate'
        if (groupByFieldId === fieldId) return 'selected-groupby'
        if (metric !== null) return isFieldCompatibleForGroupBy(fieldId) ? 'compatible' : 'incompatible'
        if (selectedFieldId === null) return 'idle'
        return isFieldCompatibleForGroupBy(fieldId) ? 'compatible' : 'incompatible'
    }

    const getPlayerState = (): 'selected-groupby' | 'compatible' | 'idle' => {
        if (groupByPlayer) return 'selected-groupby'
        if (selectedFieldId === null && metric === null) return 'idle'
        return 'compatible'
    }

    const clearSelection = () => {
        setSelectedFieldId(null)
        setGroupByFieldId(null)
        setGroupByPlayer(false)
        setStatsResult(null)
        setShowSaveInput(false)
        setMetric(null)
    }

    const fetchStats = async () => {
        if (!selectedFieldId && !metric) return
        
        setLoading(true)
        setStatsResult(null)
        
        const params = new URLSearchParams()
        if (metric) {
            params.set('metric', metric)
            params.set('gameId', gameId)
        } else if (selectedFieldId) {
            params.set('customFieldId', selectedFieldId)
        }
        if (playerId) {
            params.set('playerId', playerId)
        }
        if (groupByFieldId) {
            params.set('groupByFieldId', groupByFieldId)
        }
        if (groupByPlayer) {
            params.set('groupByPlayer', 'true')
        }
        if (!metric && isNumberField) {
            params.set('aggregation', aggregation)
        }
        
        const { data, ok } = await executeStatsQuery(params)
        
        if (ok && data) {
            setStatsResult(data)
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if ((!selectedFieldId && !metric) || !saveName.trim()) return
        await onSave({
            name: saveName.trim(),
            customFieldId: metric ? '' : selectedFieldId!,
            groupByFieldId: groupByFieldId,
            groupByPlayer: groupByPlayer,
            aggregation: metric ? null : (isNumberField ? aggregation : null),
            metric: metric,
        })
        setSaveName('')
        setShowSaveInput(false)
        clearSelection()
    }

    const getStackedChartData = () => {
        if (statsResult?.type !== 'stacked' && statsResult?.type !== 'crosstab') return []
        return statsResult.data.map(item => ({
            group: item.group,
            ...item.values
        }))
    }

    const entryFields = customFields.filter(cf => cf.scope === 'entry')
    const playerFields = customFields.filter(cf => cf.scope === 'playerResult')

    return (
        <div className="relative bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-400/20 hover:border-purple-400/40 transition-all duration-300 overflow-hidden p-6">
            <ScanLine accent="purple" delay={0.5} />
            <CornerBrackets color="purple" />
            <div className="relative mb-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-slate-400 text-sm font-mono">
                        {metric !== null
                            ? (groupByFieldId || groupByPlayer ? 'Selection complete' : 'Optionally select a field or player to group by')
                            : selectedFieldId === null 
                                ? 'Select a metric or field to aggregate'
                                : groupByFieldId || groupByPlayer 
                                    ? 'Selection complete' 
                                    : 'Optionally select a field or player to group by'
                        }
                    </p>
                    {(selectedFieldId || metric) && (
                        <button
                            onClick={clearSelection}
                            className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <p className="text-xs text-amber-400 mb-2 font-medium">Metrics</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                if (metric === 'winrate') {
                                    setMetric(null)
                                    setGroupByFieldId(null)
                                    setGroupByPlayer(false)
                                    setStatsResult(null)
                                } else {
                                    setMetric('winrate')
                                    setSelectedFieldId(null)
                                    setStatsResult(null)
                                }
                            }}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                metric === 'winrate'
                                    ? 'bg-amber-500/30 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-400/50'
                                    : 'bg-slate-800 border border-amber-500/50 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10'
                            }`}
                        >
                            <Trophy className="w-4 h-4" />
                            Win Rate
                        </button>
                    </div>
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
                            disabled={selectedFieldId === null && metric === null}
                        />
                    </div>
                </div>
            </div>

            {isNumberField && !metric && (
                <div className="relative flex items-center gap-3 mb-4 pb-4 border-b border-slate-600/50">
                    <span className="text-slate-500 text-[10px] uppercase tracking-[0.15em] font-mono">Aggregation:</span>
                    {(['sum', 'avg', 'min', 'max'] as AggregationType[]).map(agg => (
                        <button
                            key={agg}
                            onClick={() => { setAggregation(agg); setStatsResult(null); }}
                            className={`px-3 py-1 rounded text-sm font-mono transition-all duration-200 ${
                                aggregation === agg
                                    ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                                    : 'bg-slate-800/50 text-slate-500 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30'
                            }`}
                        >
                            {agg.charAt(0).toUpperCase() + agg.slice(1)}
                        </button>
                    ))}
                </div>
            )}

            {canQuery && (
                <div className="relative mb-6">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchStats}
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/30 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] disabled:bg-slate-800/50 disabled:border-slate-600/50 disabled:text-slate-500 disabled:cursor-not-allowed text-cyan-400 font-medium font-mono transition-all duration-200"
                        >
                            {loading ? 'Loading...' : 'Get Graph'}
                        </button>
                        {statsResult && !showSaveInput && (
                            <button
                                onClick={() => {
                                    const primary = metric === 'winrate' ? 'Win Rate' : selectedField?.name ?? ''
                                    const groupBy = groupByPlayer ? 'Player' : groupByField?.name
                                    setSaveName(groupBy ? `${primary} by ${groupBy}` : primary)
                                    setShowSaveInput(true)
                                }}
                                className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)] text-emerald-400 font-medium font-mono transition-all duration-200 flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" />
                                Save
                            </button>
                        )}
                    </div>
                    {showSaveInput && (
                        <div className="flex items-center gap-2 mt-3">
                            <input
                                value={saveName}
                                onChange={e => setSaveName(e.target.value)}
                                placeholder="Query name..."
                                className="bg-slate-800/80 border border-cyan-400/30 rounded px-3 py-2 text-white text-sm font-mono flex-1 focus:border-cyan-400/60 focus:outline-none"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                            />
                            <button
                                onClick={handleSave}
                                disabled={!saveName.trim()}
                                className="px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-400/50 hover:bg-emerald-500/30 disabled:bg-slate-800/50 disabled:border-slate-600/50 disabled:text-slate-500 disabled:cursor-not-allowed text-emerald-400 text-sm font-medium font-mono transition-all duration-200"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setShowSaveInput(false); setSaveName('') }}
                                className="px-3 py-2 rounded-lg text-slate-500 hover:text-white text-sm font-mono transition-all duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    <span className="ml-3 text-slate-500 text-xs font-mono">
                        {metric ? 'Win Rate' : selectedField?.name}
                        {groupByFieldId && ` → grouped by ${groupByField?.name}`}
                        {groupByPlayer && ` → grouped by Player`}
                    </span>
                </div>
            )}

            {statsResult && (
                <div className="relative border-t border-cyan-400/10 pt-6">
                    {hasChartData && (
                        <div className="flex justify-center gap-2 mb-4">
                            <button
                                onClick={() => setChartType('bar')}
                                className={`p-2 rounded transition-all duration-200 ${chartType === 'bar' ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-800/50 text-slate-500 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30'}`}
                                title="Bar Chart"
                            >
                                <BarChart3 className="w-5 h-5" />
                            </button>
                            {hasPieOption && (
                                <button
                                    onClick={() => setChartType('pie')}
                                    className={`p-2 rounded transition-all duration-200 ${chartType === 'pie' ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'bg-slate-800/50 text-slate-500 border border-slate-600/50 hover:text-cyan-400 hover:border-cyan-400/30'}`}
                                    title="Pie Chart"
                                >
                                    <PieChartIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}

                    <StatsResultDisplay
                        statsResult={statsResult}
                        chartType={chartType}
                        selectedField={selectedField}
                        groupByField={groupByField}
                        groupByPlayer={groupByPlayer}
                        isStackedChart={!!isStackedChart}
                        getStackedChartData={getStackedChartData}
                    />
                </div>
            )}
        </div>
    )
}

function chartHeight(dataLength: number): number {
    return Math.max(320, dataLength * 40)
}

function StatsResultDisplay({
    statsResult,
    chartType,
    selectedField,
    groupByField,
    groupByPlayer,
    isStackedChart,
    getStackedChartData,
}: {
    statsResult: StatsResult
    chartType: ChartType
    selectedField?: CustomField
    groupByField?: CustomField | null
    groupByPlayer: boolean
    isStackedChart: boolean
    getStackedChartData: () => Record<string, unknown>[]
}) {
    return (
        <>
            {['sum', 'avg', 'min', 'max'].includes(statsResult.type) && 'total' in statsResult && (
                <div className="relative text-center py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.06),transparent_70%)]" />
                    <p className="relative text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-3">
                        {statsResult.type === 'sum' && `Total sum for "${selectedField?.name}"`}
                        {statsResult.type === 'avg' && `Average for "${selectedField?.name}"`}
                        {statsResult.type === 'min' && `Minimum for "${selectedField?.name}"`}
                        {statsResult.type === 'max' && `Maximum for "${selectedField?.name}"`}
                    </p>
                    <p className="relative text-5xl font-bold font-mono text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                        {statsResult.type === 'avg' ? statsResult.total.toFixed(2) : statsResult.total}
                    </p>
                </div>
            )}
            
            {statsResult.type === 'grouped' && (
                <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-mono mb-4 text-center">
                        "{selectedField?.name}" grouped by "{groupByPlayer ? 'Player' : groupByField?.name}"
                    </p>
                    {statsResult.data.length === 0 ? (
                        <p className="text-slate-500 text-center font-mono text-sm">No data available</p>
                    ) : chartType === 'bar' ? (
                        <div style={{ height: chartHeight(statsResult.data.length) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsResult.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <XAxis type="number" {...HUD_AXIS.x} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="label" 
                                        width={150}
                                        {...HUD_AXIS.y}
                                    />
                                    <Tooltip content={<HudTooltipContent />} />
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                        {statsResult.data.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
                                        label={({ x, y, index, label, percent, textAnchor }) => (
                                            <text x={x} y={y} textAnchor={textAnchor} fill={CHART_COLORS[index % CHART_COLORS.length]} fontSize={12} fontFamily="ui-monospace, monospace">
                                                {`${label} (${(percent * 100).toFixed(0)}%)`}
                                            </text>
                                        )}
                                        labelLine={{ stroke: '#475569' }}
                                    >
                                        {statsResult.data.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<HudTooltipContent />} />
                                    <Legend wrapperStyle={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
            
            {statsResult.type === 'breakdown' && (
                <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-mono mb-4 text-center">
                        Value distribution for "{selectedField?.name}"
                    </p>
                    {statsResult.data.length === 0 ? (
                        <p className="text-slate-500 text-center font-mono text-sm">No data available</p>
                    ) : chartType === 'bar' ? (
                        <div style={{ height: chartHeight(statsResult.data.length) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsResult.data} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <XAxis type="number" {...HUD_AXIS.x} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="value" 
                                        width={150}
                                        {...HUD_AXIS.y}
                                    />
                                    <Tooltip content={<HudTooltipContent />} />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                        {statsResult.data.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
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
                                        label={({ x, y, index, value, percent, textAnchor }) => (
                                            <text x={x} y={y} textAnchor={textAnchor} fill={CHART_COLORS[index % CHART_COLORS.length]} fontSize={12} fontFamily="ui-monospace, monospace">
                                                {`${value} (${(percent * 100).toFixed(0)}%)`}
                                            </text>
                                        )}
                                        labelLine={{ stroke: '#475569' }}
                                    >
                                        {statsResult.data.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<HudTooltipContent />} />
                                    <Legend wrapperStyle={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {isStackedChart && (statsResult.type === 'stacked' || statsResult.type === 'crosstab') && (
                <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-mono mb-4 text-center">
                        "{selectedField?.name}" by {statsResult.type === 'stacked' ? 'player' : `"${groupByField?.name}"`}
                    </p>
                    {statsResult.data.length === 0 ? (
                        <p className="text-slate-500 text-center font-mono text-sm">No data available</p>
                    ) : (
                        <div style={{ height: chartHeight(statsResult.data.length) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={getStackedChartData()} layout="vertical" margin={{ left: 20, right: 20 }}>
                                    <XAxis type="number" {...HUD_AXIS.x} />
                                    <YAxis 
                                        type="category" 
                                        dataKey="group" 
                                        width={120}
                                        {...HUD_AXIS.y}
                                    />
                                    <Tooltip content={<HudTooltipContent />} />
                                    <Legend wrapperStyle={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }} />
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

            {statsResult.type === 'winrate' && !('data' in statsResult) && (
                <div className="relative text-center py-4">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.06),transparent_70%)]" />
                    <p className="relative text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-3">Win Rate</p>
                    <p className="relative text-5xl font-bold font-mono text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                        {(statsResult.rate * 100).toFixed(1)}%
                    </p>
                    <p className="relative text-slate-500 text-xs font-mono mt-3">
                        {statsResult.wins} wins / {statsResult.total} total
                    </p>
                </div>
            )}

            {statsResult.type === 'winrate' && 'data' in statsResult && Array.isArray((statsResult as { data: unknown }).data) && (
                <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-mono mb-4 text-center">Win Rate by group</p>
                    {(statsResult as { type: 'winrate'; data: { label: string; wins: number; total: number; rate: number }[] }).data.length === 0 ? (
                        <p className="text-slate-500 text-center font-mono text-sm">No data available</p>
                    ) : (
                        <div style={{ height: chartHeight((statsResult as { type: 'winrate'; data: { label: string; wins: number; total: number; rate: number }[] }).data.length) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={(statsResult as { type: 'winrate'; data: { label: string; wins: number; total: number; rate: number }[] }).data.map(d => ({ ...d, rate: d.rate * 100 }))}
                                    layout="vertical"
                                    margin={{ left: 20, right: 20 }}
                                >
                                    <XAxis type="number" domain={[0, 100]} unit="%" {...HUD_AXIS.x} />
                                    <YAxis
                                        type="category"
                                        dataKey="label"
                                        width={150}
                                        {...HUD_AXIS.y}
                                    />
                                    <Tooltip content={<WinrateTooltipContent />} />
                                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                                        {(statsResult as { data: { label: string }[] }).data.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}

            {statsResult.type === 'winrate_by_player' && (
                <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500 font-mono mb-4 text-center">Win Rate by group and player</p>
                    {statsResult.data.length === 0 ? (
                        <p className="text-slate-500 text-center font-mono text-sm">No data available</p>
                    ) : (
                        <div style={{ height: chartHeight(statsResult.data.length) }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={statsResult.data.map(d => ({ ...d, rate: d.rate * 100, displayLabel: `${d.label} — ${d.player}` }))}
                                    layout="vertical"
                                    margin={{ left: 20, right: 20 }}
                                >
                                    <XAxis type="number" domain={[0, 100]} unit="%" {...HUD_AXIS.x} />
                                    <YAxis
                                        type="category"
                                        dataKey="displayLabel"
                                        width={200}
                                        {...HUD_AXIS.y}
                                    />
                                    <Tooltip content={<WinrateTooltipContent />} />
                                    <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                                        {statsResult.data.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            )}
        </>
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
            <User className="w-4 h-4 inline-block mr-1" />
            Player
        </button>
    )
}
