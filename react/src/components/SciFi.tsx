import type { ReactNode } from 'react'

/**
 * Segmented progress/charge bar — horizontal or vertical.
 * `value` is 0-1 representing fill ratio.
 */
export function SegmentBar({
    segments = 5,
    value = 0,
    activeIndex,
    onSegmentClick,
    accent = 'cyan',
    direction = 'horizontal',
    className,
}: {
    segments?: number
    value?: number
    activeIndex?: number
    onSegmentClick?: (index: number) => void
    accent?: 'cyan' | 'purple'
    direction?: 'horizontal' | 'vertical'
    className?: string
}) {
    const isCyan = accent === 'cyan'
    const activeBg = isCyan ? 'bg-cyan-400/70 shadow-[0_0_6px_rgba(34,211,238,0.5)]' : 'bg-purple-400/70 shadow-[0_0_6px_rgba(168,85,247,0.5)]'
    const inactiveBg = isCyan ? 'bg-cyan-400/10 border border-cyan-400/20' : 'bg-purple-400/10 border border-purple-400/20'
    const isVertical = direction === 'vertical'
    const isPageMode = activeIndex !== undefined

    const isActive = (i: number) => {
        if (isPageMode) return i === activeIndex
        return i < Math.round(value * segments)
    }

    return (
        <div
            className={`flex ${isVertical ? 'flex-col gap-1' : 'gap-1'} ${className ?? ''}`}
            role={isPageMode ? 'tablist' : 'meter'}
            aria-valuenow={isPageMode ? undefined : value}
            aria-valuemin={isPageMode ? undefined : 0}
            aria-valuemax={isPageMode ? undefined : 1}
        >
            {Array.from({ length: segments }, (_, i) => (
                <div
                    key={i}
                    role={isPageMode ? 'tab' : undefined}
                    aria-selected={isPageMode ? i === activeIndex : undefined}
                    onClick={onSegmentClick ? () => onSegmentClick(i) : undefined}
                    className={`${isVertical ? 'w-1.5 h-2.5' : 'h-1.5 flex-1'} rounded-[1px] transition-all duration-300 ${
                        isActive(i) ? activeBg : inactiveBg
                    } ${onSegmentClick ? 'cursor-pointer hover:opacity-80' : ''}`}
                />
            ))}
        </div>
    )
}

export function ScanLine({ accent = 'cyan', delay = 0 }: { accent?: 'cyan' | 'purple'; delay?: number }) {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div
                className={`absolute left-0 right-0 h-px animate-scan ${accent === 'cyan' ? 'bg-cyan-400/20' : 'bg-purple-400/20'}`}
                style={delay ? { animationDelay: `${delay}s` } : undefined}
            />
        </div>
    )
}

export function CornerBrackets({ color = 'cyan' }: { color?: 'cyan' | 'purple' }) {
    const borderColor = color === 'cyan' ? 'border-cyan-400/40' : 'border-purple-400/40'
    return (
        <>
            <div className={`absolute top-0 left-0 w-2 h-2 border-t border-l ${borderColor} rounded-tl-sm`} />
            <div className={`absolute top-0 right-0 w-2 h-2 border-t border-r ${borderColor} rounded-tr-sm`} />
            <div className={`absolute bottom-0 left-0 w-2 h-2 border-b border-l ${borderColor} rounded-bl-sm`} />
            <div className={`absolute bottom-0 right-0 w-2 h-2 border-b border-r ${borderColor} rounded-br-sm`} />
        </>
    )
}

export function CircuitTitle({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-end">
            <svg width="24" height="12" viewBox="0 0 24 12" className="shrink-0 -mb-px" aria-hidden="true">
                <path d="M0,1 L6,1 L14,10.5" stroke="rgba(34,211,238,0.3)" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0,6 L6,6 L14,10.5" stroke="rgba(34,211,238,0.3)" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M0,10.5 L24,10.5" stroke="rgba(34,211,238,0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />
            </svg>
            <span className="uppercase text-[10px] font-medium text-slate-400 tracking-[0.2em] border-b border-cyan-400/40 pb-0.5">{children}</span>
        </div>
    )
}

export function SciFiPanel({ title, children, actions, className }: { title: string; children: ReactNode; actions?: ReactNode; className?: string }) {
    return (
        <section className="relative bg-slate-900/50 backdrop-blur-sm rounded-lg border border-slate-500/50 overflow-hidden hover:border-cyan-400/40 transition-colors duration-300">
            <header className="px-4 py-2 bg-slate-800/70 flex items-center gap-2">
                <CircuitTitle>{title}</CircuitTitle>
                {actions && <div className="ml-auto">{actions}</div>}
            </header>
            <div className={`text-white p-4 relative ${className ?? ''}`}>{children}</div>
        </section>
    )
}

export function MetricCard({
    icon,
    label,
    value,
    accent = 'cyan',
    delay = 0,
    noScanLine,
}: {
    icon: ReactNode
    label: string
    value: string | number
    accent?: 'cyan' | 'purple'
    delay?: number
    noScanLine?: boolean
}) {
    const isCyan = accent === 'cyan'
    return (
        <div
            className={`relative group bg-gradient-to-br from-slate-900/80 to-slate-800/50 backdrop-blur-sm rounded-lg border transition-all duration-300 overflow-hidden ${
                isCyan
                    ? 'border-cyan-400/30 hover:border-cyan-400/60 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                    : 'border-purple-400/30 hover:border-purple-400/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
            }`}
        >
            {!noScanLine && <ScanLine accent={accent} delay={delay} />}
            <CornerBrackets color={accent} />

            <div className="p-4 relative">
                <div className="flex items-center gap-2 mb-3">
                    <div className={isCyan ? 'text-cyan-400' : 'text-purple-400'}>{icon}</div>
                    <span className="text-[10px] tracking-[0.2em] text-slate-500 uppercase">{label}</span>
                </div>
                <div className={`text-3xl font-bold font-mono ${isCyan ? 'text-cyan-400' : 'text-purple-400'}`}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </div>
            </div>
        </div>
    )
}
