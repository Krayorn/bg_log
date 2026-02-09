import { useState, useEffect, useCallback } from "react"
import { apiGet, apiPost, apiPut, apiDelete } from '../hooks/useApi'
import { X, BarChart3, PieChart as PieChartIcon, User, Save, Trash2, Pencil, Plus, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Legend, Rectangle, Sector } from 'recharts'
import type { BarShapeProps, PieSectorShapeProps } from 'recharts'

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

type SavedQuery = {
    id: string
    name: string
    customFieldId: string
    groupByFieldId: string | null
    groupByPlayer: boolean
    aggregation: string | null
}

const CHART_COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#84cc16', '#f97316']

const ColoredBar = (props: BarShapeProps) => (
    <Rectangle {...props} fill={CHART_COLORS[props.index % CHART_COLORS.length]} />
)

const ColoredSector = (props: PieSectorShapeProps) => (
    <Sector {...props} fill={CHART_COLORS[props.index % CHART_COLORS.length]} />
)

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
        const { data, ok } = await apiGet<SavedQuery[]>(`/statisticsQueries?gameId=${gameId}&playerId=${playerId}`)
        if (ok && data) {
            setSavedQueries(data)
        }
    }, [gameId, playerId])

    useEffect(() => {
        loadSavedQueries()
    }, [loadSavedQueries])

    const handleSave = async (query: Omit<SavedQuery, 'id'>) => {
        if (!playerId) return
        const { data, ok } = await apiPost<SavedQuery>(`/statisticsQueries`, { ...query, gameId, playerId })
        if (ok && data) {
            setSavedQueries(prev => [...prev, data])
        }
    }

    const handleUpdate = async (id: string, query: Omit<SavedQuery, 'id'>) => {
        const { data, ok } = await apiPut<SavedQuery>(`/statisticsQueries/${id}`, query)
        if (ok && data) {
            setSavedQueries(prev => prev.map(q => q.id === id ? data : q))
        }
    }

    const handleDelete = async (id: string) => {
        const { ok } = await apiDelete(`/statisticsQueries/${id}`)
        if (ok) {
            setSavedQueries(prev => prev.filter(q => q.id !== id))
        }
    }

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

            <button
                onClick={() => setShowExplorer(!showExplorer)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
            >
                {showExplorer ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {showExplorer ? 'Hide Explorer' : 'New Query'}
            </button>

            {showExplorer && (
                <QueryExplorer
                    playerId={playerId}
                    customFields={customFields}
                    onSave={handleSave}
                />
            )}

            {savedQueries.map(sq => (
                <SavedQueryCard
                    key={sq.id}
                    savedQuery={sq}
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
    playerId,
    customFields,
    onUpdate,
    onDelete,
}: {
    savedQuery: SavedQuery
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
    const hasChartData = statsResult && (statsResult.type === 'breakdown' || statsResult.type === 'grouped')
    const isStackedChart = statsResult?.type === 'stacked' || statsResult?.type === 'crosstab'

    const fetchStats = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams({ customFieldId: savedQuery.customFieldId })
        if (playerId) params.set('playerId', playerId)
        if (savedQuery.groupByFieldId) params.set('groupByFieldId', savedQuery.groupByFieldId)
        if (savedQuery.groupByPlayer) params.set('groupByPlayer', 'true')
        if (savedQuery.aggregation) params.set('aggregation', savedQuery.aggregation)

        const { data, ok } = await apiGet<StatsResult>(`/statisticsQueries/execute?${params.toString()}`)
        if (ok && data) setStatsResult(data)
        setLoading(false)
    }, [playerId, savedQuery])

    useEffect(() => { fetchStats() }, [fetchStats])

    const handleSaveEdit = async () => {
        await onUpdate(savedQuery.id, {
            name: editName,
            customFieldId: savedQuery.customFieldId,
            groupByFieldId: savedQuery.groupByFieldId,
            groupByPlayer: savedQuery.groupByPlayer,
            aggregation: savedQuery.aggregation,
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
        <div className="border border-slate-600 rounded-lg p-6 bg-slate-900/30 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
                {editing ? (
                    <div className="flex items-center gap-2">
                        <input
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-sm"
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit() }}
                        />
                        <button onClick={handleSaveEdit} className="text-emerald-400 hover:text-emerald-300 text-sm">Save</button>
                        <button onClick={() => { setEditing(false); setEditName(savedQuery.name) }} className="text-slate-400 hover:text-white text-sm">Cancel</button>
                    </div>
                ) : (
                    <h3 className="text-white font-medium">{savedQuery.name}</h3>
                )}
                <div className="flex items-center gap-2">
                    {hasChartData && (
                        <>
                            <button
                                onClick={() => setChartType('bar')}
                                className={`p-1.5 rounded transition-colors ${chartType === 'bar' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                            >
                                <BarChart3 className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setChartType('pie')}
                                className={`p-1.5 rounded transition-colors ${chartType === 'pie' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                            >
                                <PieChartIcon className="w-4 h-4" />
                            </button>
                            <div className="w-px h-5 bg-slate-600 mx-1" />
                        </>
                    )}
                    <button onClick={() => setEditing(true)} className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-slate-500 text-center py-8">Loading...</p>
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
                <p className="text-slate-500 text-center py-8">No data available</p>
            )}
        </div>
    )
}

function QueryExplorer({
    playerId,
    customFields,
    onSave,
}: {
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
        setShowSaveInput(false)
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
        
        const { data, ok } = await apiGet<StatsResult>(`/statisticsQueries/execute?${params.toString()}`)
        
        if (ok && data) {
            setStatsResult(data)
        }
        setLoading(false)
    }

    const handleSave = async () => {
        if (!selectedFieldId || !saveName.trim()) return
        await onSave({
            name: saveName.trim(),
            customFieldId: selectedFieldId,
            groupByFieldId: groupByFieldId,
            groupByPlayer: groupByPlayer,
            aggregation: isNumberField ? aggregation : null,
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

    const entryFields = customFields.filter(cf => cf.global)
    const playerFields = customFields.filter(cf => !cf.global)

    return (
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
                            <X className="w-4 h-4" />
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
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={fetchStats}
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
                        >
                            {loading ? 'Loading...' : 'Get Graph'}
                        </button>
                        {statsResult && !showSaveInput && (
                            <button
                                onClick={() => setShowSaveInput(true)}
                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors flex items-center gap-2"
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
                                className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-white text-sm flex-1"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
                            />
                            <button
                                onClick={handleSave}
                                disabled={!saveName.trim()}
                                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => { setShowSaveInput(false); setSaveName('') }}
                                className="px-3 py-2 rounded-lg text-slate-400 hover:text-white text-sm transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
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
                                <BarChart3 className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setChartType('pie')}
                                className={`p-2 rounded transition-colors ${chartType === 'pie' ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                                title="Pie Chart"
                            >
                                <PieChartIcon className="w-5 h-5" />
                            </button>
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
                                    <Bar dataKey="total" radius={[0, 4, 4, 0]} shape={ColoredBar} />
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
                                        shape={ColoredSector}
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
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} shape={ColoredBar} />
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
                                        shape={ColoredSector}
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
