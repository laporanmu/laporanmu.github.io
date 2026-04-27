import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCountUp } from '../../hooks/useCountUp'

export function StatCard({ 
    icon, 
    label, 
    value, 
    subValue,
    suffix,
    trend, 
    trendUp, 
    loading = false,
    borderColor, 
    iconBg, 
    color = 'primary',
    className = '',
    valueClassName = 'text-2xl text-[var(--color-text)]',
    onClick,
    title
}) {
    // If color is provided, map it to specific styles
    const colorMap = {
        primary: { border: 'border-t-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' },
        indigo: { border: 'border-indigo-500', bg: 'bg-indigo-500/10 text-indigo-500' },
        emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/10 text-emerald-500' },
        amber: { border: 'border-amber-500', bg: 'bg-amber-500/10 text-amber-500' },
        rose: { border: 'border-rose-500', bg: 'bg-rose-500/10 text-rose-500' },
        sky: { border: 'border-sky-500', bg: 'bg-sky-500/10 text-sky-500' },
    }

    const finalBorder = borderColor || colorMap[color]?.border || colorMap.primary.border
    const finalBg = iconBg || colorMap[color]?.bg || colorMap.primary.bg

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
                <div className={`w-1.5 h-1.5 rounded-full ${finalBorder.replace('border-t-', 'bg-').replace('border-', 'bg-')} opacity-60 animate-pulse shadow-[0_0_8px_currentColor]`} />
            </div>

            <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-lg flex-shrink-0 shadow-sm ${finalBg} transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                <FontAwesomeIcon icon={icon} />
            </div>
            
            <div className="min-w-0 relative z-10 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] opacity-50 mb-1 truncate">{label}</p>
                <div className="flex items-center gap-2.5">
                    <h3 className={`font-black font-heading leading-none tabular-nums tracking-tighter ${valueClassName}`}>
                        {loading ? <span className="inline-block w-8 h-6 rounded bg-[var(--color-border)] animate-pulse" /> : <>{displayValue}{suffix}</>}
                    </h3>
                    {trend && (
                        <p className={`text-[9px] font-black flex items-center gap-1 ${trendUp === true ? 'text-emerald-500 bg-emerald-500/10' : trendUp === false ? 'text-rose-500 bg-rose-500/10' : 'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]'} px-1.5 py-0.5 rounded-md`}>
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
    const isDashed = variant === 'dashed'
    const isMinimal = isPlain || isDashed
    
    // Exact colors matching Dashboard widgets
    const colorMap = {
        indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 shadow-indigo-500/10',
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10',
        slate: 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] shadow-black/5',
    }[color] || 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)] shadow-black/5'
 
    const containerClasses = isPlain 
        ? 'flex-1 flex flex-col items-center justify-center py-16 text-center opacity-70 hover:opacity-100 transition-opacity' 
        : isDashed
            ? 'flex-1 flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-[var(--color-border)] rounded-[2.5rem] bg-[var(--color-surface-alt)]/20 transition-all hover:bg-[var(--color-surface-alt)]/40'
            : 'glass rounded-[2rem] py-16 text-center px-6 relative overflow-hidden transition-all duration-500 animate-in fade-in zoom-in-95'

    return (
        <div className={containerClasses}>
            {/* Ambient Background Glow for Empty State */}
            {variant === 'glass' && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />
            )}
 
            <div className={`relative z-10 ${isMinimal ? '' : 'flex flex-col items-center'}`}>
                {icon && (
                    <div className={`${isMinimal ? `w-16 h-16 rounded-2xl border flex items-center justify-center text-3xl mb-4 shadow-lg mx-auto transform rotate-3 ${colorMap}` : 'w-20 h-20 mb-6 rounded-3xl mx-auto flex items-center justify-center bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-primary)] shadow-sm group-hover:scale-110 transition-transform duration-500'}`}>
                        <FontAwesomeIcon icon={icon} className={isMinimal ? '' : 'text-3xl'} />
                    </div>
                )}
                <h3 className={`${isMinimal ? 'text-[15px] font-black mb-1' : 'text-lg font-black font-heading uppercase tracking-widest mb-1.5'} text-[var(--color-text)]`}>
                    {title}
                </h3>
                <p className={`${isMinimal ? 'text-[11px] max-w-xs px-4 opacity-60 font-medium' : 'text-[10px] max-w-[240px] mx-auto opacity-60 font-bold mb-8'} text-[var(--color-text-muted)] leading-relaxed`}>
                    {description}
                </p>
                {action && <div className={`${isMinimal ? 'mt-4' : 'mt-6'}`}>{action}</div>}
            </div>
        </div>
    )
}
