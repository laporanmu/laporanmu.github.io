import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTableList } from '@fortawesome/free-solid-svg-icons'

export function EmptyStateDesktop({ resetAllFilters }) {
    return (
        <tr>
            <td colSpan={6} className="px-6 py-14 ">
                <div className="flex flex-col items-center text-center gap-2">
                    <FontAwesomeIcon icon={faTableList} className="text-3xl text-[var(--color-text-muted)] opacity-30 mb-2" />
                    <div className="text-sm font-extrabold text-[var(--color-text)]">Data tidak ditemukan</div>
                    <div className="text-xs font-bold text-[var(--color-text-muted)]">Coba ganti filter / kata kunci pencarian.</div>
                    <button
                        type="button"
                        onClick={resetAllFilters}
                        className="mt-3 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4"
                    >
                        Reset Semua Filter
                    </button>
                </div>
            </td>
        </tr>
    )
}

export function EmptyStateMobile({ resetAllFilters }) {
    return (
        <div className="py-16 flex flex-col items-center text-center gap-3">
            <FontAwesomeIcon icon={faTableList} className="text-4xl text-[var(--color-text-muted)] opacity-20" />
            <div className="text-sm font-extrabold text-[var(--color-text)]">Tidak ada data ditemukan</div>
            <button onClick={resetAllFilters} className="mt-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)]">Reset Filter</button>
        </div>
    )
}
