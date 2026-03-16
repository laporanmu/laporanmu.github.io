import React from 'react'

export default function Breadcrumb({ items = [], badge = null, className = '' }) {
    const safeItems = (items || []).filter(Boolean)
    if (safeItems.length === 0 && !badge) return null

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
            {badge ? (
                <span className="px-2 py-1 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                    {badge}
                </span>
            ) : null}

            {safeItems.length > 0 ? (
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                    {safeItems.map((it, idx) => (
                        <span key={`${it}-${idx}`}>
                            {idx > 0 ? <span className="opacity-30 mx-1">›</span> : null}
                            {it}
                        </span>
                    ))}
                </span>
            ) : null}
        </div>
    )
}

