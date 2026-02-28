import { useState, useEffect } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { useCircle } from '../contexts/CircleContext'
import { updateCampaignName, addCampaignEvent, deleteCampaignEvent, getCampaignKeys, createCampaignKey, deleteCampaignKey, toggleCampaignKeyShareable, copyCampaignKey } from '../api/campaigns'
import { getGameCustomFields } from '../api/customFields'
import { parseJwt } from '../hooks/useLocalStorage'
import Layout from '../Layout'
import { ArrowLeft, Pencil, Check, X, Scroll, Plus, Trash2, Settings, Eye } from 'lucide-react'
import { AddEntryForm } from '../components/AddEntryForm'
import { CustomField, CampaignKey, CampaignEvent, StateValue, CampaignState, CampaignEntry, Campaign } from '../types'

const VERBS_BY_TYPE: Record<CampaignKey['type'], string[]> = {
    string: ['replace'],
    number: ['replace', 'increase', 'decrease'],
    list: ['add', 'remove'],
    counted_list: ['add', 'remove'],
}

function formatEventLabel(event: CampaignEvent): string {
    const { payload, campaignKey } = event
    const verb = payload.verb as string

    switch (campaignKey.type) {
        case 'number':
            if (verb === 'increase') return `${campaignKey.name} +${payload.amount}`
            if (verb === 'decrease') return `${campaignKey.name} -${payload.amount}`
            return `${campaignKey.name} → ${payload.amount}`
        case 'string':
            return `${campaignKey.name} → ${payload.value}`
        case 'list':
            if (verb === 'add') return `${campaignKey.name}: +${(payload.values as string[]).join(', ')}`
            return `${campaignKey.name}: -${(payload.values as string[]).join(', ')}`
        case 'counted_list': {
            const items = payload.items as { item: string; quantity: number }[]
            const prefix = verb === 'add' ? '+' : '-'
            return `${campaignKey.name}: ${items.map(i => `${prefix}${i.quantity} ${i.item}`).join(', ')}`
        }
    }
}

function verbColor(verb: string): string {
    if (verb === 'increase' || verb === 'add') return 'bg-emerald-500/20 text-emerald-400'
    if (verb === 'decrease' || verb === 'remove') return 'bg-red-500/20 text-red-400'
    return 'bg-blue-500/20 text-blue-400'
}

function StateDisplay({ state }: { state: CampaignState }) {
    const hasCampaignState = Object.keys(state.campaign).length > 0
    const hasPlayerState = Object.keys(state.players).length > 0

    if (!hasCampaignState && !hasPlayerState) {
        return (
            <div className="border border-slate-600 rounded-lg p-4 bg-slate-900/30 text-center">
                <p className="text-slate-500 text-sm">No events recorded yet.</p>
                <p className="text-slate-600 text-xs mt-1">Expand a session to add events.</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {hasCampaignState && (
                <div className="border border-slate-600 rounded-lg p-3 bg-slate-900/30">
                    <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Global</p>
                    <StateEntries entries={state.campaign} />
                </div>
            )}
            {Object.entries(state.players).map(([playerId, { player, state: playerState, scoped }]) => (
                <div key={playerId} className="border border-slate-600 rounded-lg p-3 bg-slate-900/30">
                    <p className="text-xs text-cyan-400 font-semibold mb-2">{player.name}</p>
                    {Object.keys(playerState).length > 0 && (
                        <StateEntries entries={playerState} />
                    )}
                    {scoped && Object.entries(scoped).map(([scopeLabel, scopeState]) => (
                        <div key={scopeLabel} className="mt-2 ml-2 border-l-2 border-purple-500/30 pl-2">
                            <p className="text-xs text-purple-400 font-semibold mb-1">{scopeLabel}</p>
                            <StateEntries entries={scopeState} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    )
}

function StateEntries({ entries }: { entries: Record<string, StateValue> }) {
    return (
        <div className="flex flex-col gap-1">
            {Object.entries(entries).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm gap-2">
                    <span className="text-slate-400 shrink-0">{key}</span>
                    <span className="text-slate-200 text-right">
                        {renderStateValue(value)}
                    </span>
                </div>
            ))}
        </div>
    )
}

function renderStateValue(value: StateValue): string {
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'object' && value !== null) {
        return Object.entries(value).map(([item, count]) => `${item}: ${count}`).join(', ')
    }
    return String(value)
}

export default function CampaignPage() {
    const { campaignId } = useParams() as { campaignId: string }
    const [searchParams] = useSearchParams()
    const playerId = searchParams.get('playerId')

    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [editingName, setEditingName] = useState(false)
    const [nameInput, setNameInput] = useState("")
    const [addingEventFor, setAddingEventFor] = useState<string | null>(null)
    const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
    const [showKeyManager, setShowKeyManager] = useState(false)
    const [myCampaignKeys, setMyCampaignKeys] = useState<CampaignKey[]>([])
    const [shareableCampaignKeys, setShareableCampaignKeys] = useState<CampaignKey[]>([])
    const [showAddEntry, setShowAddEntry] = useState(false)
    const [gameCustomFields, setGameCustomFields] = useState<CustomField[]>([])
    const { displayName } = useCircle()

    const isAdmin = (() => {
        const token = localStorage.getItem('jwt')
        if (!token) return false
        try {
            const decoded = parseJwt(JSON.parse(token))
            return Array.isArray(decoded.roles) && decoded.roles.includes('ROLE_ADMIN')
        } catch {
            return false
        }
    })()

    useRequest(`/campaigns/${campaignId}`, [campaignId], setCampaign)

    const gameId = campaign?.game.id
    useEffect(() => {
        if (!gameId) return
        getCampaignKeys(gameId)
            .then(({ data, ok }) => {
                if (ok && data) {
                    setMyCampaignKeys(data.myKeys)
                    setShareableCampaignKeys(data.shareableKeys)
                }
            })
        getGameCustomFields(gameId)
            .then(({ data, ok }) => {
                if (ok && data) {
                    setGameCustomFields(data.myFields)
                }
            })
    }, [gameId])

    const handleStartEdit = () => {
        if (!campaign) return
        setNameInput(campaign.name)
        setEditingName(true)
    }

    const handleSaveName = async () => {
        if (!campaign || !nameInput.trim()) return
        const { data, ok } = await updateCampaignName(campaignId, nameInput)
        if (ok && data) {
            setCampaign(data)
        }
        setEditingName(false)
    }

    const handleAddEvent = async (entryId: string, campaignKeyId: string, playerResultId: string | null, payloads: Record<string, unknown>[], customFieldValueId: string | null = null) => {
        let lastResult: { data: Campaign | null; ok: boolean } = { data: null, ok: false }
        for (const payload of payloads) {
            lastResult = await addCampaignEvent(campaignId, {
                entry: entryId,
                campaignKey: campaignKeyId,
                playerResult: playerResultId,
                payload,
                ...(customFieldValueId ? { customFieldValue: customFieldValueId } : {}),
            })
        }
        if (lastResult.ok && lastResult.data) {
            setCampaign(lastResult.data)
        }
    }

    const handleDeleteEvent = async (eventId: string) => {
        const { data, ok } = await deleteCampaignEvent(campaignId, eventId)
        if (ok && data) {
            setCampaign(data)
        }
    }

    const handleAddKey = async (name: string, type: string, scope: string, scopedToCustomField?: string) => {
        if (!campaign) return
        const body: Record<string, unknown> = { name, type, scope }
        if (scopedToCustomField) body.scopedToCustomField = scopedToCustomField
        const { data, ok } = await createCampaignKey(campaign.game.id, body)
        if (ok && data) {
            setMyCampaignKeys(prev => [...prev, data])
        }
    }

    const handleDeleteKey = async (keyId: string) => {
        const { ok } = await deleteCampaignKey(keyId)
        if (ok) {
            setMyCampaignKeys(prev => prev.filter(k => k.id !== keyId))
        }
    }

    const handleToggleShareable = async (key: CampaignKey) => {
        const { data, ok } = await toggleCampaignKeyShareable(key)
        if (ok && data) {
            setMyCampaignKeys(prev => prev.map(k => k.id === data.id ? data : k))
        }
    }

    const handleCopyCampaignKey = async (keyId: string) => {
        const { data, ok } = await copyCampaignKey(keyId)
        if (ok && data) {
            setMyCampaignKeys(prev => [...prev, data])
        }
    }

    if (!campaign) {
        return <Layout><div className="text-white">Loading...</div></Layout>
    }

    const sortedEntries = [...campaign.entries].sort((a, b) => {
        const dateDiff = new Date(a.playedAt.date).getTime() - new Date(b.playedAt.date).getTime()
        if (dateDiff !== 0) return dateDiff
        return new Date(a.createdAt.date).getTime() - new Date(b.createdAt.date).getTime()
    })

    const lastEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null
    const currentState: CampaignState = lastEntry?.stateAfter ?? { campaign: {}, players: {} }
    const campaignKeys = myCampaignKeys

    const gameUrl = `/games/${campaign.game.id}?playerId=${playerId}`

    return (
        <Layout>
            <div className="text-white max-w-4xl mx-auto">
                <div className="mb-6">
                    <Link
                        to={gameUrl}
                        className="text-slate-400 hover:text-cyan-400 text-sm flex items-center gap-1 mb-4 w-fit transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {campaign.game.name}
                    </Link>

                    <div className="flex items-center gap-3">
                        <Scroll className="w-6 h-6 text-purple-400" />
                        {editingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    autoFocus
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
                                    className="bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white text-xl font-semibold"
                                />
                                <button onClick={handleSaveName} className="text-emerald-400 hover:text-emerald-300">
                                    <Check className="w-5 h-5" />
                                </button>
                                <button onClick={() => setEditingName(false)} className="text-slate-400 hover:text-slate-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-semibold">{campaign.name}</h1>
                                <button onClick={handleStartEdit} className="text-slate-500 hover:text-cyan-400 transition-colors">
                                    <Pencil className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">
                        Created {new Date(campaign.createdAt.date).toLocaleDateString('fr-FR')}
                        {' · '}
                        {campaign.entries.length} {campaign.entries.length === 1 ? 'session' : 'sessions'}
                    </p>
                </div>

                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-400">Tracked Keys</h2>
                            {campaignKeys.length > 0 && (
                                <span className="text-xs text-slate-600">{campaignKeys.length}</span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowKeyManager(!showKeyManager)}
                            className="text-slate-500 hover:text-cyan-400 transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                    {campaignKeys.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {campaignKeys.map(k => (
                                <span
                                    key={k.id}
                                    className="text-xs px-2 py-1 rounded-full border border-slate-600 bg-slate-800 text-slate-300 flex items-center gap-1.5"
                                >
                                    {k.name}
                                    <span className="text-slate-500">{k.type.replace('_', ' ')}</span>
                                    <span className={k.scopedToCustomField ? 'text-purple-400/60' : 'text-slate-500'}>
                                        {k.scopedToCustomField ? k.scopedToCustomField.name : k.scope === 'entry' ? 'entry' : 'player'}
                                    </span>
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-600 text-xs">
                            No keys defined yet. Click <Settings className="w-3 h-3 inline" /> to add keys to track.
                        </p>
                    )}
                    {showKeyManager && (
                        <KeyManager
                            keys={campaignKeys}
                            shareableKeys={shareableCampaignKeys}
                            customFields={campaign.game.customFields}
                            onAdd={handleAddKey}
                            onDelete={handleDeleteKey}
                            onToggleShareable={handleToggleShareable}
                            onCopy={handleCopyCampaignKey}
                            isAdmin={isAdmin}
                        />
                    )}
                </div>

                <div className="mb-6">
                    <button
                        onClick={() => setShowAddEntry(!showAddEntry)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showAddEntry ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'}`}
                    >
                        <Plus className="w-4 h-4" />
                        Add Session
                    </button>
                    {showAddEntry && (
                        <div className="mt-3 border border-slate-600/30 rounded-lg p-4 bg-slate-900/30 backdrop-blur-sm">
                            <AddEntryForm
                                gameId={campaign.game.id}
                                playerId={playerId}
                                customFields={gameCustomFields}
                                fixedCampaignId={campaignId}
                                onEntryCreated={(newEntry) => {
                                    setCampaign(prev => {
                                        if (!prev) return prev
                                        return {
                                            ...prev,
                                            entries: [...prev.entries, { ...newEntry, events: [], stateAfter: prev.entries.length > 0 ? prev.entries[prev.entries.length - 1].stateAfter : { campaign: {}, players: {} } }]
                                        }
                                    })
                                    setShowAddEntry(false)
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-6 items-start">
                    <section className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold mb-4">Sessions</h2>
                        {sortedEntries.length === 0 && !showAddEntry ? (
                            <div className="border border-slate-600 rounded-lg p-8 bg-slate-900/30 text-center">
                                <p className="text-slate-400">No sessions yet.</p>
                                <p className="text-slate-500 text-sm mt-1">
                                    Use the "Add Session" button above to create your first session.
                                </p>
                            </div>
                        ) : sortedEntries.length === 0 ? null : (
                            <div className="flex flex-col gap-3">
                                {sortedEntries.map((entry, index) => (
                                    <div
                                        key={entry.id}
                                        className="border rounded-lg p-4 bg-slate-900/30 backdrop-blur-sm border-slate-600"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-slate-300 text-sm">
                                                    {new Date(entry.playedAt.date).toLocaleDateString('fr-FR')}
                                                </span>
                                                {entry.events.length > 0 && (
                                                    <span className="text-xs text-purple-400">
                                                        {entry.events.length} event{entry.events.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <Link
                                                to={`/games/${campaign.game.id}?playerId=${playerId}&entryId=${entry.id}`}
                                                className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
                                            >
                                                View details
                                            </Link>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[...entry.players].sort((a, b) => a.player.name.localeCompare(b.player.name)).map(pr => (
                                                <div key={pr.id} className="flex flex-col gap-0.5">
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full border ${
                                                            pr.won === true
                                                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                                                : pr.won === false
                                                                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                                                    : 'bg-slate-700 text-slate-300 border-slate-600'
                                                        }`}
                                                    >
                                                        {displayName(pr.player.id, pr.player.name)}
                                                        {pr.won === true && ' ✓'}
                                                        {pr.won === false && ' ✗'}
                                                    </span>
                                                    {pr.customFields.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 px-1">
                                                            {pr.customFields.map(cf => (
                                                                <span key={cf.id} className="text-[10px] text-slate-500">
                                                                    {cf.customField.name}: <span className="text-slate-400">{String(cf.value)}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {entry.customFields.length > 0 && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                                {entry.customFields.map(cf => (
                                                    <span key={cf.id} className="text-xs text-slate-500">
                                                        {cf.customField.name}: <span className="text-slate-300">{String(cf.value)}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {entry.note && (
                                            <p className="text-slate-500 text-xs mt-2 break-words whitespace-pre-wrap">{entry.note}</p>
                                        )}

                                        <div className="mt-3 pt-3 border-t border-slate-700">
                                            {entry.events.length > 0 && (
                                                <div className="flex flex-col gap-1.5 mb-3">
                                                    {entry.events.map(event => {
                                                        const playerResult = event.playerResult
                                                            ? entry.players.find(pr => pr.id === event.playerResult)
                                                            : null
                                                        const verb = event.payload.verb as string
                                                        return (
                                                            <div key={event.id} className="flex items-center justify-between group">
                                                                <div className="flex items-center gap-2 text-sm">
                                                                    <span className={`text-xs px-1.5 py-0.5 rounded ${verbColor(verb)}`}>
                                                                        {verb}
                                                                    </span>
                                                                    {playerResult && (
                                                                        <span className="text-xs text-cyan-400">
                                                                            {playerResult.player.name}
                                                                            {event.customFieldValue && (
                                                                                <span className="text-purple-400"> ({String(event.customFieldValue.value)})</span>
                                                                            )}:
                                                                        </span>
                                                                    )}
                                                                    <span className="text-slate-300">
                                                                        {formatEventLabel(event)}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleDeleteEvent(event.id)}
                                                                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {campaignKeys.length === 0 ? (
                                                <p className="text-slate-600 text-xs">
                                                    No campaign keys defined for this game.
                                                </p>
                                            ) : addingEventFor === entry.id ? (
                                                <AddEventForm
                                                    entry={entry}
                                                    campaignKeys={campaignKeys}
                                                    onSubmit={(campaignKeyId, playerResultId, payloads, customFieldValueId) =>
                                                        handleAddEvent(entry.id, campaignKeyId, playerResultId, payloads, customFieldValueId)
                                                    }
                                                    onCancel={() => setAddingEventFor(null)}
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setAddingEventFor(entry.id)}
                                                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-400 transition-colors"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Create event
                                                </button>
                                            )}

                                            <button
                                                onClick={() => setSelectedEntry(entry.id)}
                                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-purple-400 transition-colors mt-2"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                See campaign state at this point
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <aside className="w-72 shrink-0 sticky top-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Campaign State</h2>
                            {selectedEntry && selectedEntry !== lastEntry?.id ? (
                                <button
                                    onClick={() => setSelectedEntry(null)}
                                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    as of #{sortedEntries.findIndex(e => e.id === selectedEntry) + 1} · See latest
                                </button>
                            ) : null}
                        </div>
                        <StateDisplay state={
                            selectedEntry
                                ? sortedEntries.find(e => e.id === selectedEntry)?.stateAfter ?? currentState
                                : currentState
                        } />
                    </aside>
                </div>
            </div>
        </Layout>
    )
}

const KEY_TYPES = ['string', 'number', 'list', 'counted_list'] as const

function KeyManager({ keys, shareableKeys, customFields, onAdd, onDelete, onToggleShareable, onCopy, isAdmin }: {
    keys: CampaignKey[]
    shareableKeys: CampaignKey[]
    customFields: CustomField[]
    onAdd: (name: string, type: string, scope: string, scopedToCustomField?: string) => void
    onDelete: (keyId: string) => void
    onToggleShareable: (key: CampaignKey) => void
    onCopy: (keyId: string) => void
    isAdmin: boolean
}) {
    const [name, setName] = useState('')
    const [type, setType] = useState<string>('number')
    const [scope, setScope] = useState<string>('entry')

    const handleSubmit = () => {
        if (!name.trim()) return
        const resolvedScope = scope === 'entry' ? 'entry' : 'playerResult'
        const scopedTo = scope !== 'entry' && scope !== 'player' ? scope : undefined
        onAdd(name.trim(), type, resolvedScope, scopedTo)
        setName('')
    }

    return (
        <div className="mt-3 border border-slate-600 rounded-lg p-4 bg-slate-900/30">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Manage Keys</h3>

            {keys.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-4">
                    {keys.map(k => {
                        const kScope = k.scopedToCustomField
                            ? k.scopedToCustomField.name
                            : k.scope === 'entry' ? 'Entry' : 'Player'
                        return (
                            <div key={k.id} className="flex items-center justify-between group">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-300">{k.name}</span>
                                    <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                        {k.type.replace('_', ' ')}
                                    </span>
                                    <span className={`text-xs ${k.scopedToCustomField ? 'text-purple-400/60' : 'text-slate-500'}`}>
                                        {kScope}
                                    </span>
                                    {k.originCampaignKey && (
                                        <span className="text-xs text-cyan-400/60">copied</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isAdmin && !k.originCampaignKey && (
                                        <button
                                            onClick={() => onToggleShareable(k)}
                                            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${k.shareable ? 'bg-emerald-900/50 text-emerald-300 hover:bg-red-900/50 hover:text-red-300' : 'bg-slate-700 text-slate-400 hover:bg-emerald-900/50 hover:text-emerald-300'}`}
                                        >
                                            {k.shareable ? 'Shared ✓' : 'Share'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDelete(k.id)}
                                        className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {shareableKeys.length > 0 && (
                <>
                    <hr className="border-slate-600 my-3" />
                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Available Shared Keys</h4>
                    <div className="flex flex-col gap-1.5 mb-4">
                        {shareableKeys.map(k => {
                            const kScope = k.scopedToCustomField
                                ? k.scopedToCustomField.name
                                : k.scope === 'entry' ? 'Entry' : 'Player'
                            return (
                                <div key={k.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="text-slate-300">{k.name}</span>
                                        <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                                            {k.type.replace('_', ' ')}
                                        </span>
                                        <span className={`text-xs ${k.scopedToCustomField ? 'text-purple-400/60' : 'text-slate-500'}`}>
                                            {kScope}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => onCopy(k.id)}
                                        className="px-2 py-0.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}

            <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                    <input
                        placeholder="Key name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1"
                    />
                    <select
                        value={type}
                        onChange={e => setType(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                    >
                        {KEY_TYPES.map(t => (
                            <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-slate-400 shrink-0">Scope</label>
                        <select
                            value={scope}
                            onChange={e => setScope(e.target.value)}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                        >
                            <option value="entry">Entry</option>
                            <option value="player">Player</option>
                            {customFields.map(cf => (
                                <option key={cf.id} value={cf.id}>{cf.name} (Custom field scoped by {cf.scope === 'entry' ? 'Entry' : 'Player'})</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim()}
                        className="text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-3 py-1 rounded transition-colors"
                    >
                        Add key
                    </button>
                </div>
            </div>
        </div>
    )
}

function AddEventForm({ entry, campaignKeys, onSubmit, onCancel }: {
    entry: CampaignEntry
    campaignKeys: CampaignKey[]
    onSubmit: (campaignKeyId: string, playerResultId: string | null, payloads: Record<string, unknown>[], customFieldValueId: string | null) => void
    onCancel: () => void
}) {
    const [selectedKeyId, setSelectedKeyId] = useState(campaignKeys[0]?.id ?? '')
    const selectedKey = campaignKeys.find(k => k.id === selectedKeyId)
    const allowedVerbs = selectedKey ? VERBS_BY_TYPE[selectedKey.type] : []
    const [verb, setVerb] = useState(allowedVerbs[0] ?? '')
    const [playerResultId, setPlayerResultId] = useState<string>(entry.players[0]?.id ?? '')
    const [customFieldValueId, setCustomFieldValueId] = useState<string>('')

    const [stringValue, setStringValue] = useState('')
    const [numberAmount, setNumberAmount] = useState('')
    const [listItems, setListItems] = useState<string[]>([''])
    const [countedItems, setCountedItems] = useState<{ item: string; quantity: string }[]>([{ item: '', quantity: '1' }])

    const handleKeyChange = (keyId: string) => {
        setSelectedKeyId(keyId)
        const key = campaignKeys.find(k => k.id === keyId)
        if (key) {
            const verbs = VERBS_BY_TYPE[key.type]
            setVerb(verbs[0] ?? '')
        }
        setListItems([''])
        setCountedItems([{ item: '', quantity: '1' }])
    }

    const updateListItem = (index: number, value: string) => {
        const updated = [...listItems]
        updated[index] = value
        if (index === updated.length - 1 && value !== '') {
            updated.push('')
        }
        setListItems(updated)
    }

    const updateCountedItem = (index: number, field: 'item' | 'quantity', value: string) => {
        const updated = [...countedItems]
        updated[index] = { ...updated[index], [field]: value }
        if (index === updated.length - 1 && field === 'item' && value !== '') {
            updated.push({ item: '', quantity: '1' })
        }
        setCountedItems(updated)
    }

    const buildPayloads = (): Record<string, unknown>[] => {
        if (!selectedKey) return []

        switch (selectedKey.type) {
            case 'string':
                if (!stringValue.trim()) return []
                return [{ verb: 'replace', value: stringValue.trim() }]
            case 'number':
                if (!numberAmount.trim() || isNaN(Number(numberAmount))) return []
                return [{ verb, amount: Number(numberAmount) }]
            case 'list': {
                const values = listItems.map(v => v.trim()).filter(v => v !== '')
                if (values.length === 0) return []
                return [{ verb, values }]
            }
            case 'counted_list': {
                const filled = countedItems.filter(c => c.item.trim() !== '')
                if (filled.length === 0) return []
                return [{ verb, items: filled.map(c => {
                    const qty = parseInt(c.quantity)
                    return { item: c.item.trim(), quantity: isNaN(qty) || qty < 1 ? 1 : qty }
                }) }]
            }
            default:
                return []
        }
    }

    const handleSubmit = () => {
        const payloads = buildPayloads()
        if (payloads.length === 0) return
        const prId = selectedKey && selectedKey.scope !== 'entry' ? playerResultId : null
        const cfvId = selectedKey?.scopedToCustomField?.multiple ? (customFieldValueId || null) : null
        onSubmit(selectedKeyId, prId, payloads, cfvId)
        setStringValue('')
        setNumberAmount('')
        setListItems([''])
        setCountedItems([{ item: '', quantity: '1' }])
    }

    return (
        <div className="flex flex-col gap-2 bg-slate-800/50 rounded p-3" onClick={e => e.stopPropagation()}>
            <div className="flex gap-2">
                <select
                    value={selectedKeyId}
                    onChange={e => handleKeyChange(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1"
                >
                    {campaignKeys.map(k => (
                        <option key={k.id} value={k.id}>{k.name} ({k.type})</option>
                    ))}
                </select>
                {selectedKey && allowedVerbs.length > 1 && (
                    <select
                        value={verb}
                        onChange={e => setVerb(e.target.value)}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                    >
                        {allowedVerbs.map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                )}
            </div>

            {selectedKey && selectedKey.scope !== 'entry' && (
                <>
                    <select
                        value={playerResultId}
                        onChange={e => {
                            setPlayerResultId(e.target.value)
                            if (selectedKey.scopedToCustomField?.multiple) {
                                const pr = entry.players.find(p => p.id === e.target.value)
                                const matchingCfvs = pr?.customFields.filter(cf => cf.customField.id === selectedKey.scopedToCustomField!.id) ?? []
                                setCustomFieldValueId(matchingCfvs[0]?.id ?? '')
                            }
                        }}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                    >
                        {[...entry.players].sort((a, b) => a.player.name.localeCompare(b.player.name)).map(pr => {
                            if (selectedKey.scopedToCustomField && !selectedKey.scopedToCustomField.multiple) {
                                const cfValue = pr.customFields.find(cf => cf.customField.id === selectedKey.scopedToCustomField!.id)?.value
                                return <option key={pr.id} value={pr.id}>{pr.player.name} ({cfValue})</option>
                            }
                            return <option key={pr.id} value={pr.id}>{pr.player.name}</option>
                        })}
                    </select>
                    {selectedKey.scopedToCustomField?.multiple && (() => {
                        const selectedPlayer = entry.players.find(p => p.id === playerResultId)
                        const matchingCfvs = selectedPlayer?.customFields.filter(cf => cf.customField.id === selectedKey.scopedToCustomField!.id) ?? []
                        return (
                            <select
                                value={customFieldValueId}
                                onChange={e => setCustomFieldValueId(e.target.value)}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                            >
                                {matchingCfvs.map(cfv => (
                                    <option key={cfv.id} value={cfv.id}>{cfv.value}</option>
                                ))}
                            </select>
                        )
                    })()}
                </>
            )}

            {selectedKey?.type === 'string' && (
                <input
                    autoFocus
                    placeholder="Value"
                    value={stringValue}
                    onChange={e => setStringValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                />
            )}

            {selectedKey?.type === 'number' && (
                <input
                    autoFocus
                    type="number"
                    placeholder="Amount"
                    value={numberAmount}
                    onChange={e => setNumberAmount(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                />
            )}

            {selectedKey?.type === 'list' && (
                <div className="flex flex-col gap-1">
                    {listItems.map((item, i) => (
                        <input
                            key={i}
                            autoFocus={i === 0}
                            placeholder={i === 0 ? (verb === 'add' ? "Item" : "Value to remove") : (verb === 'add' ? "Another item..." : "Another value to remove...")}
                            value={item}
                            onChange={e => updateListItem(i, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && i === listItems.length - 1) handleSubmit() }}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                        />
                    ))}
                </div>
            )}

            {selectedKey?.type === 'counted_list' && verb === 'add' && (
                <div className="flex flex-col gap-1">
                    {countedItems.map((ci, i) => (
                        <div key={i} className="flex gap-2">
                            <input
                                autoFocus={i === 0}
                                placeholder={i === 0 ? "Item name" : "Another item..."}
                                value={ci.item}
                                onChange={e => updateCountedItem(i, 'item', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && i === countedItems.length - 1) handleSubmit() }}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1"
                            />
                            <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={ci.quantity}
                                onChange={e => updateCountedItem(i, 'quantity', e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && i === countedItems.length - 1) handleSubmit() }}
                                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white w-16"
                            />
                        </div>
                    ))}
                </div>
            )}

            {selectedKey?.type === 'counted_list' && verb === 'remove' && (
                <div className="flex gap-2">
                    <input
                        autoFocus
                        placeholder="Item name"
                        value={countedItems[0]?.item ?? ''}
                        onChange={e => updateCountedItem(0, 'item', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white flex-1"
                    />
                    <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={countedItems[0]?.quantity ?? '1'}
                        onChange={e => updateCountedItem(0, 'quantity', e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                        className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white w-16"
                    />
                </div>
            )}

            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-300 px-2 py-1">
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded transition-colors"
                >
                    Create event
                </button>
            </div>
        </div>
    )
}
