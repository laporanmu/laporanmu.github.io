export function TableLoadingSkeleton() {
    return (
        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-[var(--color-surface-alt)]">
                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                            <th className="px-6 py-4 w-10"></th>
                            <th className="px-6 py-4">Siswa</th>
                            <th className="px-6 py-4 text-center">Gender</th>
                            <th className="px-6 py-4 text-center">Kelas</th>
                            <th className="px-6 py-4 text-center">Poin</th>
                            <th className="px-6 py-4 text-center">Lap. Terakhir</th>
                            <th className="px-6 py-4 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="border-t border-[var(--color-border)]">
                                <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[var(--color-border)] animate-pulse shrink-0" />
                                        <div className="space-y-2">
                                            <div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" />
                                            <div className="h-2 w-24 rounded bg-[var(--color-border)] animate-pulse opacity-60" />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4"><div className="w-8 h-8 rounded-lg bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                <td className="px-6 py-4"><div className="h-5 w-20 rounded-md bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-10 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
