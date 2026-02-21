import { useState, useRef, useEffect } from "react"
import { apiPost } from '../hooks/useApi'
import { Plus } from 'lucide-react'
type PlayerOption = { id: string; name: string }

type PlayerSearchSelectProps = {
    players: PlayerOption[]
    excludeIds?: string[]
    onSelect: (player: PlayerOption) => void
    onPlayerCreated?: (player: PlayerOption) => void
    allowCreate?: boolean
    placeholder?: string
}

export default function PlayerSearchSelect({
    players,
    excludeIds = [],
    onSelect,
    onPlayerCreated,
    allowCreate = false,
    placeholder = "Search player...",
}: PlayerSearchSelectProps) {
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const available = players.filter(p => !excludeIds.includes(p.id))
    const filtered = query
        ? available.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        : available

    const showCreateOption = allowCreate && query.trim() !== "" && !filtered.some(p => p.name.toLowerCase() === query.trim().toLowerCase())

    const totalItems = filtered.length + (showCreateOption ? 1 : 0)

    useEffect(() => {
        setHighlightIndex(-1)
    }, [query])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleSelect = (player: PlayerOption) => {
        onSelect(player)
        setQuery("")
        setOpen(false)
    }

    const handleCreate = async () => {
        if (creating || !query.trim()) return
        setCreating(true)
        setCreateError(null)

        const { data, error, ok } = await apiPost<PlayerOption>('/players', { name: query.trim() })

        setCreating(false)
        if (ok && data) {
            onPlayerCreated?.(data)
            onSelect(data)
            setQuery("")
            setOpen(false)
        } else {
            setCreateError(error ?? 'Failed to create player')
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open && e.key !== 'Escape') {
            setOpen(true)
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(i => Math.min(i + 1, totalItems - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlightIndex >= 0 && highlightIndex < filtered.length) {
                handleSelect(filtered[highlightIndex])
            } else if (showCreateOption && highlightIndex === filtered.length) {
                handleCreate()
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => { setQuery(e.target.value); setOpen(true); setCreateError(null) }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-400/50"
            />
            {open && totalItems > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded bg-slate-800 border border-slate-600 shadow-lg">
                    {filtered.map((player, i) => (
                        <button
                            key={player.id}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                i === highlightIndex
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-white hover:bg-slate-700'
                            }`}
                            onMouseEnter={() => setHighlightIndex(i)}
                            onClick={() => handleSelect(player)}
                        >
                            {player.name}
                        </button>
                    ))}
                    {showCreateOption && (
                        <button
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 border-t border-slate-600 transition-colors ${
                                highlightIndex === filtered.length
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-slate-300 hover:bg-slate-700'
                            }`}
                            onMouseEnter={() => setHighlightIndex(filtered.length)}
                            onClick={handleCreate}
                            disabled={creating}
                        >
                            <Plus className="w-4 h-4" />
                            {creating ? 'Creating...' : `Create "${query.trim()}" as guest`}
                        </button>
                    )}
                </div>
            )}
            {createError && (
                <p className="text-red-400 text-xs mt-1">{createError}</p>
            )}
        </div>
    )
}
