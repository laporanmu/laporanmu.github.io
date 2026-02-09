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
        <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl p-3.5 flex items-start gap-3.5 shadow-sm group hover:shadow-md transition-all">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorClasses[color]} 
        flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0`}>
                <FontAwesomeIcon icon={icon} className="text-base" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5 truncate">{label}</p>
                <p className="text-xl font-black text-gray-900 dark:text-white leading-tight">{value}</p>
                {trend && (
                    <p className={`text-[10px] font-bold mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
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
        <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl text-center py-12 px-6 shadow-sm">
            {icon && (
                <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800
          flex items-center justify-center text-gray-400">
                    <FontAwesomeIcon icon={icon} className="text-xl" />
                </div>
            )}
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1.5">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto font-medium">{description}</p>
            {action}
        </div>
    )
}
