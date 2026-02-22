import { useState, useEffect } from "react"
import { useRequest } from '../hooks/useRequest'
import { apiPost, apiGet } from '../hooks/useApi'
import { v4 as uuidv4 } from 'uuid'
import PlayerSearchSelect from './PlayerSearchSelect'
import EnumSelect from './EnumSelect'
import MultiEnumSelect from './MultiEnumSelect'
import { X, UserPlus, RotateCcw } from 'lucide-react'
import { CustomField, Entry, GameOwner, CampaignSummary } from '../types'

type PlayerEntry = {
    genId: string
    id: string
    note: string
    won: boolean
    customFields: { [key: string]: string | string[] }
}

type AddEntryFormProps = {
    gameId: string
    playerId: string | null
    customFields: CustomField[]
    onEntryCreated: (newEntry: Entry) => void
    fixedCampaignId?: string
}

export function AddEntryForm({ gameId, playerId, customFields, onEntryCreated, fixedCampaignId }: AddEntryFormProps) {
    const [playersList, setPlayersList] = useState<{ id: string, name: string }[]>([])
    const [gameOwners, setGameOwners] = useState<GameOwner[]>([])

    const [entryNote, setEntryNote] = useState("")
    const [entryPlayedAt, setEntryPlayedAt] = useState(new Date().toISOString().split('T')[0])
    const [entryGameUsed, setEntryGameUsed] = useState("")
    const [entryCustomFields, setEntryCustomFields] = useState<{ [key: string]: string | string[] }>({})
    const [entryPlayers, setEntryPlayers] = useState<PlayerEntry[]>([])
    const [entryErrors, setEntryErrors] = useState<string[]>([])
    const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
    const [entryCampaign, setEntryCampaign] = useState(fixedCampaignId ?? "")

    useRequest(`/players?forPlayer=${playerId}`, [playerId], setPlayersList, !!playerId)
    useRequest(`/games/${gameId}/owners`, [gameId], setGameOwners)
    useRequest(`/campaigns?game=${gameId}`, [gameId], setCampaigns, !fixedCampaignId)

    const [initialPlayerSet, setInitialPlayerSet] = useState(false)
    useEffect(() => {
        if (playerId && playersList.length > 0 && !initialPlayerSet) {
            const currentPlayer = playersList.find(p => p.id === playerId)
            if (currentPlayer) {
                setEntryPlayers([{ genId: uuidv4(), id: currentPlayer.id, note: "", won: false, customFields: {} }])
            }
            setInitialPlayerSet(true)
        }
    }, [playersList, playerId, initialPlayerSet])

    useEffect(() => {
        if (fixedCampaignId) {
            loadFromLastGame(fixedCampaignId)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixedCampaignId])

    const currentPlayerOwnership = gameOwners.find(go => go.player.id === playerId)
    const defaultGameUsed = currentPlayerOwnership?.id || ""

    const sortedCustomFields = [...customFields].sort((a, b) => a.name.localeCompare(b.name))
    const globalCustomFields = sortedCustomFields.filter(c => c.global)
    const playerCustomFields = sortedCustomFields.filter(c => !c.global)

    const addPlayerToEntry = (e: React.MouseEvent) => {
        e.preventDefault()
        setEntryPlayers([...entryPlayers, { genId: uuidv4(), id: "", note: "", won: false, customFields: {} }])
    }

    const removePlayerFromEntry = (genId: string) => {
        setEntryPlayers(entryPlayers.filter(p => p.genId !== genId))
    }

    const updatePlayer = (genId: string, field: string, value: string | boolean) => {
        setEntryPlayers(entryPlayers.map(p => {
            if (p.genId !== genId) return p
            return { ...p, [field]: value }
        }))
    }

    const updatePlayerCustomField = (genId: string, customFieldId: string, value: string | string[]) => {
        setEntryPlayers(entryPlayers.map(p => {
            if (p.genId !== genId) return p
            return { ...p, customFields: { ...p.customFields, [customFieldId]: value } }
        }))
    }

    const updateEntryCustomField = (customFieldId: string, value: string | string[]) => {
        setEntryCustomFields({ ...entryCustomFields, [customFieldId]: value })
    }

    const loadFromLastGame = async (campaignId: string) => {
        if (!campaignId) return
        const { data, ok } = await apiGet<Entry>(`/campaigns/${campaignId}/last-entry`)
        if (!ok || !data) return

        const newPlayers: PlayerEntry[] = data.players.map(p => ({
            genId: uuidv4(),
            id: p.player.id,
            note: "",
            won: false,
            customFields: (() => {
                const grouped: { [key: string]: string | string[] } = {}
                for (const cf of p.customFields) {
                    const id = cf.customField.id
                    if (cf.customField.multiple) {
                        if (!grouped[id]) grouped[id] = []
                        ;(grouped[id] as string[]).push(String(cf.value))
                    } else {
                        grouped[id] = String(cf.value)
                    }
                }
                return grouped
            })()
        }))
        setEntryPlayers(newPlayers)

        setEntryCustomFields((() => {
            const grouped: { [key: string]: string | string[] } = {}
            for (const cf of data.customFields) {
                const id = cf.customField.id
                if (cf.customField.multiple) {
                    if (!grouped[id]) grouped[id] = []
                    ;(grouped[id] as string[]).push(String(cf.value))
                } else {
                    grouped[id] = String(cf.value)
                }
            }
            return grouped
        })())

        const existingIds = new Set(playersList.map(p => p.id))
        const missingPlayers = data.players
            .filter(p => !existingIds.has(p.player.id))
            .map(p => ({ id: p.player.id, name: p.player.name }))
        if (missingPlayers.length > 0) {
            setPlayersList(prev => [...prev, ...missingPlayers])
        }

        if (data.playedAt?.date) {
            setEntryPlayedAt(data.playedAt.date.substring(0, 10))
        }
    }

    const submitEntry = async (e: React.FormEvent) => {
        e.preventDefault()
        setEntryErrors([])

        if (!entryPlayedAt) {
            setEntryErrors(['Please set a date.'])
            return
        }

        if (entryPlayers.length === 0) {
            setEntryErrors(['Please add at least one player.'])
            return
        }

        for (const p of entryPlayers) {
            if (!p.id) {
                setEntryErrors(['All players must be selected.'])
                return
            }
        }

        const campaignId = fixedCampaignId ?? entryCampaign

        const payload = {
            game: gameId,
            note: entryNote,
            playedAt: entryPlayedAt + 'T12:00:00+02:00',
            gameUsed: entryGameUsed || defaultGameUsed || null,
            campaign: campaignId || null,
            customFields: Object.entries(entryCustomFields)
                .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value !== '')
                .map(([id, value]) => ({ id, value })),
            players: entryPlayers.map(p => ({
                id: p.id,
                note: p.note,
                won: p.won,
                customFields: Object.entries(p.customFields)
                    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value !== '')
                    .map(([id, value]) => ({ id, value }))
            }))
        }

        const { data, error, ok } = await apiPost<Entry>('/entries', payload)

        if (!ok || !data) {
            setEntryErrors([error ?? 'Failed to create entry.'])
        } else {
            setEntryNote("")
            setEntryPlayedAt("")
            setEntryGameUsed("")
            setEntryCustomFields({})
            setEntryCampaign(fixedCampaignId ?? "")
            const currentPlayer = playerId ? playersList.find(p => p.id === playerId) : null
            if (currentPlayer) {
                setEntryPlayers([{ genId: uuidv4(), id: currentPlayer.id, note: "", won: false, customFields: {} }])
            } else {
                setEntryPlayers([])
            }
            onEntryCreated(data)
        }
    }

    const activeCampaignId = fixedCampaignId ?? entryCampaign

    return (
        <form className="flex flex-col" onSubmit={submitEntry}>
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">Date Played</label>
                    <input
                        className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                        type="date"
                        value={entryPlayedAt}
                        onChange={e => setEntryPlayedAt(e.target.value)}
                    />
                </div>
                {gameOwners.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <label className="text-white text-sm font-medium">Game Copy Used</label>
                        <select
                            className="p-2 rounded bg-slate-700 text-white border border-slate-500"
                            value={entryGameUsed || defaultGameUsed}
                            onChange={e => setEntryGameUsed(e.target.value)}
                        >
                            <option value="">No specific copy used</option>
                            {gameOwners.map(go => (
                                <option key={go.id} value={go.id}>
                                    {go.player.name}'s copy {go.player.id === playerId ? '(yours)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                {!fixedCampaignId && campaigns.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <label className="text-white text-sm font-medium">Campaign</label>
                        <div className="flex gap-2">
                            <select
                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 flex-1"
                                value={entryCampaign}
                                onChange={e => setEntryCampaign(e.target.value)}
                            >
                                <option value="">No campaign</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {entryCampaign && (
                                <button
                                    type="button"
                                    onClick={() => loadFromLastGame(entryCampaign)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white text-sm transition-colors whitespace-nowrap"
                                    title="Prefill players and custom fields from the last entry in this campaign"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Load from last game
                                </button>
                            )}
                        </div>
                    </div>
                )}
                <div className="flex flex-col gap-1">
                    <label className="text-white text-sm font-medium">Session Notes</label>
                    <textarea
                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                        value={entryNote}
                        onChange={e => setEntryNote(e.target.value)}
                        placeholder="Notes about the game session..."
                        rows={3}
                    />
                </div>
                {globalCustomFields.length > 0 && (
                    <div className="border border-slate-500 p-4 rounded-lg bg-slate-800/50">
                        <h3 className="text-white font-medium mb-3">Entry Custom Fields</h3>
                        <div className="flex flex-wrap gap-3">
                            {globalCustomFields.map(cf => (
                                <div key={cf.id} className="flex flex-col gap-1 flex-1 min-w-[150px]">
                                    <label className="text-slate-300 text-xs">{cf.name}</label>
                                    {cf.multiple ? (
                                        cf.kind === 'enum' ? (
                                            <MultiEnumSelect
                                                options={cf.enumValues.map(v => v.value)}
                                                selected={Array.isArray(entryCustomFields[cf.id]) ? (entryCustomFields[cf.id] as string[]) : []}
                                                onChange={values => updateEntryCustomField(cf.id, values)}
                                                placeholder={`Select ${cf.name.toLowerCase()}...`}
                                            />
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                {(Array.isArray(entryCustomFields[cf.id])
                                                    ? (entryCustomFields[cf.id] as string[])
                                                    : entryCustomFields[cf.id] ? [entryCustomFields[cf.id] as string] : ['']
                                                ).map((val, idx) => (
                                                    <div key={idx} className="flex gap-1">
                                                        <input
                                                            className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400 flex-1"
                                                            type={cf.kind === 'number' ? 'number' : 'text'}
                                                            placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                            value={val}
                                                            onChange={e => {
                                                                const current = Array.isArray(entryCustomFields[cf.id])
                                                                    ? [...(entryCustomFields[cf.id] as string[])]
                                                                    : entryCustomFields[cf.id] ? [entryCustomFields[cf.id] as string] : ['']
                                                                current[idx] = e.target.value
                                                                updateEntryCustomField(cf.id, current)
                                                            }}
                                                        />
                                                        {idx > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = Array.isArray(entryCustomFields[cf.id])
                                                                        ? [...(entryCustomFields[cf.id] as string[])]
                                                                        : [entryCustomFields[cf.id] as string]
                                                                    current.splice(idx, 1)
                                                                    updateEntryCustomField(cf.id, current)
                                                                }}
                                                                className="text-slate-400 hover:text-red-400"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const current = Array.isArray(entryCustomFields[cf.id])
                                                            ? [...(entryCustomFields[cf.id] as string[])]
                                                            : entryCustomFields[cf.id] ? [entryCustomFields[cf.id] as string] : ['']
                                                        updateEntryCustomField(cf.id, [...current, ''])
                                                    }}
                                                    className="text-cyan-400 hover:text-cyan-300 text-xs self-start"
                                                >
                                                    + Add another
                                                </button>
                                            </div>
                                        )
                                    ) : (
                                        cf.kind === 'enum' ? (
                                            <EnumSelect
                                                options={cf.enumValues.map(v => v.value)}
                                                value={entryCustomFields[cf.id] as string || ''}
                                                onChange={v => updateEntryCustomField(cf.id, v)}
                                                placeholder={`Select ${cf.name.toLowerCase()}...`}
                                            />
                                        ) : (
                                            <input
                                                className="p-2 rounded bg-slate-700 text-white border border-slate-500 placeholder-slate-400"
                                                type={cf.kind === 'number' ? 'number' : 'text'}
                                                placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                value={entryCustomFields[cf.id] as string || ''}
                                                onChange={e => updateEntryCustomField(cf.id, e.target.value)}
                                            />
                                        )
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-white font-medium mb-3">Players</h2>
                <div className="flex flex-wrap gap-3">
                    {entryPlayers.map(player => (
                        <div key={player.genId} className="border border-slate-500 rounded-lg p-3 w-[220px] flex flex-col gap-2 bg-slate-800/50">
                            <button
                                type="button"
                                className="self-end text-slate-400 hover:text-white"
                                onClick={() => removePlayerFromEntry(player.genId)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-300 text-xs">Player</label>
                                {player.id ? (
                                    <div className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm">
                                        {playersList.find(p => p.id === player.id)?.name ?? player.id}
                                    </div>
                                ) : (
                                    <PlayerSearchSelect
                                        players={playersList}
                                        excludeIds={entryPlayers.filter(p => p.id).map(p => p.id)}
                                        onSelect={p => updatePlayer(player.genId, 'id', p.id)}
                                        onPlayerCreated={p => setPlayersList(prev => [...prev, { id: p.id, name: p.name }])}
                                        allowCreate
                                        placeholder="Search player..."
                                    />
                                )}
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-slate-300 text-xs">Notes</label>
                                <textarea
                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                    placeholder="Player notes..."
                                    value={player.note}
                                    onChange={e => updatePlayer(player.genId, 'note', e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <label className="flex items-center gap-2 text-white">
                                <input
                                    type="checkbox"
                                    checked={player.won}
                                    onChange={e => updatePlayer(player.genId, 'won', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <span className="text-sm">Won</span>
                            </label>
                            {playerCustomFields.length > 0 && (
                                <div className="border-t border-slate-600 pt-2 mt-1">
                                    <span className="text-slate-400 text-xs">Custom Fields</span>
                                    {playerCustomFields.map(cf => (
                                        <div key={cf.id} className="flex flex-col gap-1 mt-2">
                                            <label className="text-slate-300 text-xs">{cf.name}</label>
                                            {cf.multiple ? (
                                                cf.kind === 'enum' ? (
                                                    <MultiEnumSelect
                                                        options={cf.enumValues.map(v => v.value)}
                                                        selected={Array.isArray(player.customFields[cf.id]) ? (player.customFields[cf.id] as string[]) : []}
                                                        onChange={values => updatePlayerCustomField(player.genId, cf.id, values)}
                                                        placeholder={`Select ${cf.name.toLowerCase()}...`}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col gap-1">
                                                        {(Array.isArray(player.customFields[cf.id])
                                                            ? (player.customFields[cf.id] as string[])
                                                            : player.customFields[cf.id] ? [player.customFields[cf.id] as string] : ['']
                                                        ).map((val, idx) => (
                                                            <div key={idx} className="flex gap-1">
                                                                <input
                                                                    className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400 flex-1"
                                                                    type={cf.kind === 'number' ? 'number' : 'text'}
                                                                    placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                                    value={val}
                                                                    onChange={e => {
                                                                        const current = Array.isArray(player.customFields[cf.id])
                                                                            ? [...(player.customFields[cf.id] as string[])]
                                                                            : player.customFields[cf.id] ? [player.customFields[cf.id] as string] : ['']
                                                                        current[idx] = e.target.value
                                                                        updatePlayerCustomField(player.genId, cf.id, current)
                                                                    }}
                                                                />
                                                                {idx > 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const current = Array.isArray(player.customFields[cf.id])
                                                                                ? [...(player.customFields[cf.id] as string[])]
                                                                                : [player.customFields[cf.id] as string]
                                                                            current.splice(idx, 1)
                                                                            updatePlayerCustomField(player.genId, cf.id, current)
                                                                        }}
                                                                        className="text-slate-400 hover:text-red-400"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const current = Array.isArray(player.customFields[cf.id])
                                                                    ? [...(player.customFields[cf.id] as string[])]
                                                                    : player.customFields[cf.id] ? [player.customFields[cf.id] as string] : ['']
                                                                updatePlayerCustomField(player.genId, cf.id, [...current, ''])
                                                            }}
                                                            className="text-cyan-400 hover:text-cyan-300 text-xs self-start"
                                                        >
                                                            + Add another
                                                        </button>
                                                    </div>
                                                )
                                            ) : (
                                                cf.kind === 'enum' ? (
                                                    <EnumSelect
                                                        options={cf.enumValues.map(v => v.value)}
                                                        value={player.customFields[cf.id] as string || ''}
                                                        onChange={v => updatePlayerCustomField(player.genId, cf.id, v)}
                                                        placeholder={`Select ${cf.name.toLowerCase()}...`}
                                                    />
                                                ) : (
                                                    <input
                                                        className="p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400"
                                                        type={cf.kind === 'number' ? 'number' : 'text'}
                                                        placeholder={`Enter ${cf.name.toLowerCase()}...`}
                                                        value={player.customFields[cf.id] as string || ''}
                                                        onChange={e => updatePlayerCustomField(player.genId, cf.id, e.target.value)}
                                                    />
                                                )
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        className="border border-dashed border-slate-500 rounded-lg p-4 w-[220px] flex items-center justify-center flex-col text-slate-400 hover:text-white hover:border-white transition-colors"
                        onClick={addPlayerToEntry}
                    >
                        <UserPlus className="w-8 h-8" />
                        <span className="text-sm mt-1">Add player</span>
                    </button>
                </div>
            </div>

            {activeCampaignId && (
                <div className="mb-4 flex justify-end">
                    <button
                        type="button"
                        onClick={() => loadFromLastGame(activeCampaignId)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-600 hover:bg-slate-500 text-slate-300 hover:text-white text-sm transition-colors whitespace-nowrap"
                        title="Prefill players and custom fields from the last entry in this campaign"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Load from last game
                    </button>
                </div>
            )}

            {entryErrors.length > 0 && (
                <div className="text-red-400 mb-4 text-center">
                    {entryErrors.map((err, i) => <div key={i}>{err}</div>)}
                </div>
            )}

            <button className="px-6 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium self-center transition-colors" type="submit">
                Create Entry
            </button>
        </form>
    )
}
