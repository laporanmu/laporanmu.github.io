import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export function StatCard({ icon, label, value, trend, trendUp, color = 'indigo' }) {
    const colorClasses = {
        indigo: 'from-[var(--color-primary)] to-[var(--color-accent)]',
        green: 'from-emerald-500 to-teal-500',
        amber: 'from-amber-500 to-orange-500',
        red: 'from-red-500 to-rose-500',
        blue: 'from-[var(--color-secondary)] to-cyan-500',
    }

    return (
        <div className="glass rounded-[1.5rem] p-5 flex items-start gap-4 group hover:border-[var(--color-primary)]/30 transition-all">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white shadow-lg shadow-indigo-500/10 group-hover:scale-105 transition-transform shrink-0`}>
                <FontAwesomeIcon icon={icon} className="text-xl" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest mb-1 truncate">{label}</p>
                <p className="text-2xl font-bold font-heading text-[var(--color-text)] leading-none mb-2">{value}</p>
                {trend && (
                    <p className={`text-[10px] font-bold inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ${trendUp ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                        <span>{trendUp ? '↑' : '↓'}</span> {trend}
                    </p>
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
