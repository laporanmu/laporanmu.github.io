import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCountUp } from '../../hooks/useCountUp'

export function StatCard({ 
    icon, 
    label, 
    value, 
    subValue,
    trend, 
    trendUp, 
    loading = false,
    borderColor = 'border-t-[var(--color-primary)]',
    iconBg = 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
    className = '',
    valueClassName = 'text-2xl text-[var(--color-text)]',
    onClick,
    title
}) {
    const animatedValue = useCountUp(value, 1500, loading)
    const displayValue = typeof value === 'number' || !isNaN(parseFloat(value)) ? animatedValue : value

    return (
        <div 
            onClick={onClick} 
            title={title} 
            className={`shrink-0 snap-center w-[220px] xs:w-[240px] sm:w-auto glass group relative overflow-hidden rounded-[2rem] p-5 border border-[var(--color-border)] flex items-center gap-4 hover:border-[var(--color-primary)]/30 hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 transition-all duration-300 min-h-[90px] ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
        >
            {/* Neural Pulse Indicator (Top Right) */}
            <div className="absolute top-4 right-4">
                <div className={`w-1.5 h-1.5 rounded-full ${borderColor.replace('border-t-', 'bg-').replace('border-', 'bg-')} opacity-60 animate-pulse shadow-[0_0_8px_currentColor]`} />
            </div>

            <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-lg flex-shrink-0 shadow-sm ${iconBg} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <FontAwesomeIcon icon={icon} />
            </div>
            
            <div className="min-w-0 relative z-10 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] opacity-50 mb-1 truncate">{label}</p>
                <div className="flex items-baseline gap-2.5">
                    <h3 className={`font-black font-heading leading-tight tabular-nums tracking-tighter ${valueClassName}`}>
                        {loading ? <span className="inline-block w-8 h-6 rounded bg-[var(--color-border)] animate-pulse" /> : displayValue}
                    </h3>
                    {trend && (
                        <p className={`text-[9px] font-black flex items-center gap-1 ${trendUp ? 'text-emerald-500' : 'text-rose-500'} bg-current/5 px-1.5 py-0.5 rounded-md`}>
                            {trend}
                        </p>
                    )}
                </div>
                {subValue && (
                    <p className="text-[8px] font-bold text-[var(--color-text-muted)] mt-0.5 opacity-60 uppercase tracking-wider">{subValue}</p>
                )}
            </div>
        </div>
    )
}

export function DataTable({ columns, data, onRowClick, loading, emptyMessage = 'Tidak ada data' }) {
    if (loading) {
        return (
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            {columns.map((col, i) => (
                                <th key={i}>{col.header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                {columns.map((_, j) => (
                                    <td key={j}>
                                        <div className="skeleton h-4 w-full" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )
    }

    if (!data || data.length === 0) {
        return (
            <div className="glass text-center py-16 rounded-2xl">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                    <span className="text-2xl">👀</span>
                </div>
                <p className="text-[var(--color-text-muted)] font-medium text-sm">{emptyMessage}</p>
            </div>
        )
    }

    return (
        <div className="table-container">
            <table>
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={i}>{col.header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIdx) => (
                        <tr
                            key={row.id || rowIdx}
                            onClick={() => onRowClick?.(row)}
                            className={onRowClick ? 'cursor-pointer' : ''}
                        >
                            {columns.map((col, colIdx) => (
                                <td key={colIdx}>
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function EmptyState({ icon, title, description, action, variant = 'glass', color = 'indigo' }) {
    const isPlain = variant === 'plain'
    
    // Exact colors matching Dashboard widgets (RecentReports = slate/default, PointsConfig = indigo, Gate = emerald/slate)
    const colorMap = {
        indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/10',
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10',
        slate: 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] shadow-black/5',
    }[color] || 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] shadow-black/5'

    return (
        <div className={`${isPlain ? 'flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity' : 'glass rounded-[2rem] py-16 text-center px-6 relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95'}`}>
            {/* Ambient Background Glow for Empty State */}
            {!isPlain && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />
            )}

            <div className={`relative z-10 ${isPlain ? '' : 'flex flex-col items-center'}`}>
                {icon && (
                    <div className={`${isPlain ? `w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl mb-4 shadow-lg mx-auto ${colorMap}` : 'w-20 h-20 mb-6 rounded-3xl mx-auto flex items-center justify-center bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-sm group-hover:scale-110 transition-transform duration-500'}`}>
                        <FontAwesomeIcon icon={icon} className={isPlain ? '' : 'text-3xl'} />
                    </div>
                )}
                <h3 className={`${isPlain ? 'text-[13px] font-black mb-1' : 'text-lg font-black font-heading uppercase tracking-widest mb-1.5'} text-[var(--color-text)]`}>
                    {title}
                </h3>
                <p className={`${isPlain ? 'text-[10px] max-w-xs px-4' : 'text-[10px] max-w-[240px] mx-auto opacity-60 font-bold mb-8'} text-[var(--color-text-muted)] leading-relaxed`}>
                    {description}
                </p>
                {action && <div className={`${isPlain ? 'mt-4' : 'mt-6'}`}>{action}</div>}
            </div>
        </div>
    )
}
