import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export function StatCard({ icon, label, value, trend, trendUp, color = 'indigo' }) {
    const colorClasses = {
        indigo: 'from-indigo-500 to-purple-600',
        green: 'from-emerald-500 to-teal-600',
        amber: 'from-amber-500 to-orange-600',
        red: 'from-red-500 to-rose-600',
        blue: 'from-blue-500 to-cyan-600',
    }

    return (
        <div className="card flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} 
        flex items-center justify-center text-white shadow-lg`}>
                <FontAwesomeIcon icon={icon} className="text-lg" />
            </div>
            <div className="flex-1">
                <p className="text-[var(--color-text-muted)] text-sm mb-1">{label}</p>
                <p className="text-2xl font-bold">{value}</p>
                {trend && (
                    <p className={`text-xs mt-1 ${trendUp ? 'text-emerald-500' : 'text-red-500'}`}>
                        {trendUp ? '↑' : '↓'} {trend}
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
            <div className="card text-center py-12">
                <p className="text-[var(--color-text-muted)]">{emptyMessage}</p>
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
        <div className="card text-center py-16">
            {icon && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-surface-alt)] 
          flex items-center justify-center text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={icon} className="text-2xl" />
                </div>
            )}
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-[var(--color-text-muted)] mb-6 max-w-md mx-auto">{description}</p>
            {action}
        </div>
    )
}
