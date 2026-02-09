import { useState, useRef, useEffect } from "react"

type EnumSelectProps = {
    options: string[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export default function EnumSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
}: EnumSelectProps) {
    const [query, setQuery] = useState(value)
    const [open, setOpen] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(-1)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setQuery(value)
    }, [value])

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

    const handleSelect = (option: string) => {
        setQuery(option)
        setOpen(false)
        onChange(option)
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
                handleSelect(filtered[highlightIndex])
            }
        } else if (e.key === 'Escape') {
            setOpen(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value
        setQuery(v)
        setOpen(true)
        if (v === '') {
            onChange('')
        }
    }

    return (
        <div ref={containerRef} className="relative">
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
                    {filtered.map((option, i) => (
                        <button
                            key={option}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                i === highlightIndex
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-white hover:bg-slate-700'
                            }`}
                            onMouseEnter={() => setHighlightIndex(i)}
                            onClick={() => handleSelect(option)}
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
