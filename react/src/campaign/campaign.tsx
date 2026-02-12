import { useState } from "react"
import { useParams, useSearchParams, Link } from "react-router-dom"
import { useRequest } from '../hooks/useRequest'
import { apiPatch, apiPost, apiDelete } from '../hooks/useApi'
import Layout from '../Layout'
import { ArrowLeft, Pencil, Check, X, Scroll, Plus, Trash2, Settings, Eye } from 'lucide-react'

type CustomField = {
    kind: string
    name: string
    global: boolean
    id: string
    multiple: boolean
}

type CustomFieldValue = {
    id: string
    value: string | number | boolean
    customField: CustomField
}

type PlayerResult = {
    id: string
    note: string
    won: boolean | null
    player: {
        name: string
        id: string
    }
    customFields: CustomFieldValue[]
}

type CampaignKey = {
    id: string
    name: string
    type: 'string' | 'number' | 'list' | 'counted_list'
    global: boolean
    scopedToCustomField: CustomField | null
}

type CampaignEvent = {
    id: string
    entry: string
    playerResult: string | null
    campaignKey: CampaignKey
    payload: Record<string, unknown>
    customFieldValue: CustomFieldValue | null
    createdAt: { date: string }
}

type StateValue = string | number | string[] | Record<string, number>

type ScopedState = Record<string, Record<string, StateValue>>

type CampaignState = {
    campaign: Record<string, StateValue>
    players: Record<string, {
        player: { id: string; name: string }
        state: Record<string, StateValue>
        scoped?: ScopedState
    }>
}

type Entry = {
    id: string
    note: string
    players: PlayerResult[]
    playedAt: { date: string }
    events: CampaignEvent[]
    stateAfter: CampaignState
    customFields: CustomFieldValue[]
}

type Campaign = {
    id: string
    name: string
    game: { id: string; name: string; campaignKeys: CampaignKey[]; customFields: CustomField[] }
    createdBy: { id: string; name: string }
    createdAt: { date: string }
    entries: Entry[]
}

const VERBS_BY_TYPE: Record<CampaignKey['type'], string[]> = {
    string: ['replace'],
    number: ['increase', 'decrease', 'replace'],
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
            return `${campaignKey.name}: -${payload.value}`
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

    useRequest(`/campaigns/${campaignId}`, [campaignId], setCampaign)

    const handleStartEdit = () => {
        if (!campaign) return
        setNameInput(campaign.name)
        setEditingName(true)
    }

    const handleSaveName = async () => {
        if (!campaign || !nameInput.trim()) return
        const { data, ok } = await apiPatch<Campaign>(`/campaigns/${campaignId}`, { name: nameInput })
        if (ok && data) {
            setCampaign(data)
        }
        setEditingName(false)
    }

    const handleAddEvent = async (entryId: string, campaignKeyId: string, playerResultId: string | null, payloads: Record<string, unknown>[], customFieldValueId: string | null = null) => {
        let lastResult: { data: Campaign | null; ok: boolean } = { data: null, ok: false }
        for (const payload of payloads) {
            lastResult = await apiPost<Campaign>(`/campaigns/${campaignId}/events`, {
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
        setAddingEventFor(null)
    }

    const handleDeleteEvent = async (eventId: string) => {
        const { data, ok } = await apiDelete<Campaign>(`/campaigns/${campaignId}/events/${eventId}`)
        if (ok && data) {
            setCampaign(data)
        }
    }

    const handleAddKey = async (name: string, type: string, global: boolean, scopedToCustomField?: string) => {
        if (!campaign) return
        const body: Record<string, unknown> = { name, type, global }
        if (scopedToCustomField) body.scopedToCustomField = scopedToCustomField
        const { data, ok } = await apiPost<Campaign['game']>(`/game/${campaign.game.id}/campaignKeys`, body)
        if (ok && data) {
            setCampaign(prev => prev ? { ...prev, game: { ...prev.game, campaignKeys: data.campaignKeys } } : prev)
        }
    }

    const handleDeleteKey = async (keyId: string) => {
        const { ok } = await apiDelete(`/campaignKeys/${keyId}`)
        if (ok) {
            setCampaign(prev => prev ? {
                ...prev,
                game: { ...prev.game, campaignKeys: prev.game.campaignKeys.filter(k => k.id !== keyId) },
            } : prev)
        }
    }

    if (!campaign) {
        return <Layout><div className="text-white">Loading...</div></Layout>
    }

    const sortedEntries = [...campaign.entries].sort((a, b) =>
        new Date(a.playedAt.date).getTime() - new Date(b.playedAt.date).getTime()
    )

    const lastEntry = sortedEntries.length > 0 ? sortedEntries[sortedEntries.length - 1] : null
    const currentState: CampaignState = lastEntry?.stateAfter ?? { campaign: {}, players: {} }
    const campaignKeys = campaign.game.campaignKeys ?? []

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
                                        {k.scopedToCustomField ? k.scopedToCustomField.name : k.global ? 'entry' : 'player'}
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
                            customFields={campaign.game.customFields}
                            onAdd={handleAddKey}
                            onDelete={handleDeleteKey}
                        />
                    )}
                </div>

                <div className="flex gap-6">
                    <section className="flex-1">
                        <h2 className="text-lg font-semibold mb-4">Sessions</h2>
                        {sortedEntries.length === 0 ? (
                            <div className="border border-slate-600 rounded-lg p-8 bg-slate-900/30 text-center">
                                <p className="text-slate-400">No sessions yet.</p>
                                <p className="text-slate-500 text-sm mt-1">
                                    Link entries to this campaign from the{' '}
                                    <Link to={gameUrl} className="text-cyan-400 hover:underline">game page</Link>.
                                </p>
                            </div>
                        ) : (
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
                                            {entry.players.map(pr => (
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
                                                        {pr.player.name}
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

                    <aside className="w-72 shrink-0">
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

function KeyManager({ keys, customFields, onAdd, onDelete }: {
    keys: CampaignKey[]
    customFields: CustomField[]
    onAdd: (name: string, type: string, global: boolean, scopedToCustomField?: string) => void
    onDelete: (keyId: string) => void
}) {
    const [name, setName] = useState('')
    const [type, setType] = useState<string>('number')
    const [scope, setScope] = useState<string>('entry')

    const handleSubmit = () => {
        if (!name.trim()) return
        const isGlobal = scope === 'entry'
        const scopedTo = scope !== 'entry' && scope !== 'player' ? scope : undefined
        onAdd(name.trim(), type, isGlobal, scopedTo)
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
                            : k.global ? 'Entry' : 'Player'
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
                                </div>
                                <button
                                    onClick={() => onDelete(k.id)}
                                    className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )
                    })}
                </div>
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
                                <option key={cf.id} value={cf.id}>{cf.name} (Custom field scoped by {cf.global ? 'Entry' : 'Player'})</option>
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
    entry: Entry
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
    const [listRemoveValue, setListRemoveValue] = useState('')
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
            case 'list':
                if (verb === 'add') {
                    const values = listItems.map(v => v.trim()).filter(v => v !== '')
                    if (values.length === 0) return []
                    return [{ verb: 'add', values }]
                } else {
                    if (!listRemoveValue.trim()) return []
                    return [{ verb: 'remove', value: listRemoveValue.trim() }]
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
        const prId = selectedKey && !selectedKey.global ? playerResultId : null
        const cfvId = selectedKey?.scopedToCustomField?.multiple ? (customFieldValueId || null) : null
        onSubmit(selectedKeyId, prId, payloads, cfvId)
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

            {selectedKey && !selectedKey.global && (
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
                        {entry.players.map(pr => {
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

            {selectedKey?.type === 'list' && verb === 'add' && (
                <div className="flex flex-col gap-1">
                    {listItems.map((item, i) => (
                        <input
                            key={i}
                            autoFocus={i === 0}
                            placeholder={i === 0 ? "Item" : "Another item..."}
                            value={item}
                            onChange={e => updateListItem(i, e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && i === listItems.length - 1) handleSubmit() }}
                            className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                        />
                    ))}
                </div>
            )}

            {selectedKey?.type === 'list' && verb === 'remove' && (
                <input
                    autoFocus
                    placeholder="Value to remove"
                    value={listRemoveValue}
                    onChange={e => setListRemoveValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                    className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                />
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
