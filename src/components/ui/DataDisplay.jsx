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
            className={`shrink-0 snap-center w-[200px] xs:w-[220px] sm:w-auto glass group relative overflow-hidden rounded-[1.8rem] p-5 border-t-4 ${borderColor} flex items-center gap-4 hover:shadow-2xl hover:shadow-[var(--color-primary)]/10 transition-all duration-300 min-h-[108px] ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
        >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-base flex-shrink-0 shadow-sm ${iconBg} transform group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                <FontAwesomeIcon icon={icon} />
            </div>
            <div className="min-w-0 relative z-10 flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 truncate">{label}</p>
                <div className="flex items-center gap-3">
                    <h3 className={`font-black font-heading leading-tight tabular-nums tracking-tight ${valueClassName}`}>
                        {loading ? <span className="inline-block w-8 h-6 rounded bg-[var(--color-border)] animate-pulse" /> : displayValue}
                    </h3>
                    {trend && (
                        <p className={`text-[10px] font-black flex items-center gap-1 ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                            <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-current/10">
                                <span className="text-[7px]">{trendUp ? '↑' : '↓'}</span>
                            </span>
                            {trend}
                        </p>
                    )}
                </div>
                {subValue && (
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] mt-0.5 whitespace-nowrap">{subValue}</p>
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

export function EmptyState({ icon, title, description, action }) {
    return (
        <div className="glass rounded-[2rem] text-center py-16 px-6 relative overflow-hidden">
            {/* Ambient Background Glow for Empty State */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[var(--color-primary)]/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10">
                {icon && (
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/5">
                        <FontAwesomeIcon icon={icon} className="text-3xl" />
                    </div>
                )}
                <h3 className="text-xl font-bold font-heading text-[var(--color-text)] mb-2">{title}</h3>
                <p className="text-sm text-[var(--color-text-muted)] mb-8 max-w-sm mx-auto">{description}</p>
                {action}
            </div>
        </div>
    )
}
