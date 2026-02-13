import { useState, useRef, useEffect } from "react"

type MultiEnumSelectProps = {
    options: string[]
    selected: string[]
    onChange: (selected: string[]) => void
    placeholder?: string
}

export default function MultiEnumSelect({
    options,
    selected,
    onChange,
    placeholder = "Select...",
}: MultiEnumSelectProps) {
    const [query, setQuery] = useState("")
    const [open, setOpen] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const filtered = query
        ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        : options

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

    const handleToggle = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option))
        } else {
            onChange([...selected, option])
        }
    }

    const handleRemove = (option: string) => {
        onChange(selected.filter(s => s !== option))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!open && e.key !== 'Escape') {
            setOpen(true)
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlightIndex(i => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            if (highlightIndex >= 0 && highlightIndex < filtered.length) {
                handleToggle(filtered[highlightIndex])
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value)
        setOpen(true)
    }

    return (
        <div ref={containerRef} className="relative">
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                    {selected.map(s => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-400/30"
                        >
                            {s}
                            <button
                                type="button"
                                onClick={() => handleRemove(s)}
                                className="hover:text-cyan-200 transition-colors"
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full p-2 rounded bg-slate-700 text-white border border-slate-500 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-400/50"
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded bg-slate-800 border border-slate-600 shadow-lg">
                    {filtered.map((option, i) => {
                        const isSelected = selected.includes(option)
                        return (
                            <button
                                key={option}
                                type="button"
                                className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                                    i === highlightIndex
                                        ? 'bg-cyan-500/20 text-cyan-400'
                                        : 'text-white hover:bg-slate-700'
                                }`}
                                onMouseEnter={() => setHighlightIndex(i)}
                                onClick={() => handleToggle(option)}
                            >
                                <span
                                    className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                                        isSelected ? 'bg-cyan-400' : 'bg-slate-600'
                                    }`}
                                />
                                {option}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
