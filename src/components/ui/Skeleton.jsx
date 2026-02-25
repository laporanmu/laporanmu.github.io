/**
 * Skeleton loading untuk table
 * Digunakan untuk better UX saat loading data
 * 
 * @param {number} rows - Jumlah baris skeleton (default: 5)
 * @param {number} cols - Jumlah kolom skeleton (default: 5)
 */
export function TableSkeleton({ rows = 5, cols = 5 }) {
    return (
        <div className="glass rounded-[1.5rem] overflow-hidden border border-[var(--color-border)] shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    {/* Header Skeleton */}
                    <thead>
                        <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                            {Array.from({ length: cols }).map((_, i) => (
                                <th key={i} className="px-6 py-4">
                                    <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-20" />
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* Body Skeleton */}
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {Array.from({ length: rows }).map((_, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-[var(--color-surface-alt)]/30">
                                {Array.from({ length: cols }).map((_, colIdx) => (
                                    <td key={colIdx} className="px-6 py-4">
                                        <div
                                            className="h-4 bg-[var(--color-border)] rounded animate-pulse"
                                            style={{
                                                width: colIdx === 0 ? '180px' : colIdx === cols - 1 ? '80px' : '120px'
                                            }}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

/**
 * Skeleton loading untuk card layout (mobile)
 * 
 * @param {number} count - Jumlah card skeleton (default: 3)
 */
export function CardSkeleton({ count = 3 }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, idx) => (
                <div key={idx} className="glass rounded-2xl p-4 border border-[var(--color-border)]">
                    {/* Header skeleton */}
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-[var(--color-border)] animate-pulse" />
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-[var(--color-border)] rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-1/2" />
                        </div>
                    </div>

                    {/* Content skeleton */}
                    <div className="space-y-2 mb-3">
                        <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-full" />
                        <div className="h-3 bg-[var(--color-border)] rounded animate-pulse w-5/6" />
                    </div>

                    {/* Actions skeleton */}
                    <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                        <div className="flex-1 h-9 bg-[var(--color-border)] rounded-lg animate-pulse" />
                        <div className="flex-1 h-9 bg-[var(--color-border)] rounded-lg animate-pulse" />
                    </div>
                </div>
            ))}
        </div>
    )
}