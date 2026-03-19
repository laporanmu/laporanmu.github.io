import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight, faChevronDown 
} from '@fortawesome/free-solid-svg-icons'

/**
 * Standard Pagination component based on StudentsPage style.
 */
function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function Pagination({
    totalRows,
    page,
    pageSize,
    setPage,
    setPageSize,
    label = 'Baris',
    jumpPage,
    setJumpPage,
}) {
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    if (totalRows === 0) return null

    return (
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 rounded-b-2xl">
            {/* ── MOBILE COMPACT PAGINATION (< md) ── */}
            <div className="flex md:hidden items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] whitespace-nowrap">{totalRows} {label}</span>
                    <div className="relative">
                        <select
                            value={pageSize}
                            onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                            className="h-10 pl-3 pr-7 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black outline-none focus:border-[var(--color-primary)] transition-all appearance-none cursor-pointer hover:bg-[var(--color-surface-alt)]"
                        >
                            {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} / hal</option>)}
                        </select>
                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-[var(--color-text-muted)] pointer-events-none" />
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-25 active:scale-90"
                    >
                        <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                    </button>
                    <span className="text-[11px] font-black text-[var(--color-text)] px-2 min-w-[52px] text-center">
                        {page} / {totalPages}
                    </span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-25 active:scale-90"
                    >
                        <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                    </button>
                </div>
            </div>

            {/* ── DESKTOP FULL PAGINATION (md+) ── */}
            <div className="hidden md:flex md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex flex-col items-center sm:items-start text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 leading-none mb-1">Status {label}</p>
                        <p className="text-[11px] font-bold text-[var(--color-text)] whitespace-nowrap">
                            Menampilkan <span className="text-[var(--color-primary)]">{fromRow}—{toRow}</span> dari <span className="text-[var(--color-primary)]">{totalRows}</span> {label}
                        </p>
                    </div>
                    <div className="h-8 w-px bg-[var(--color-border)] hidden sm:block mx-1 opacity-50" />
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Baris:</span>
                        <div className="relative">
                            <select
                                value={pageSize}
                                onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                                className="h-9 pl-3 pr-7 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black outline-none focus:border-[var(--color-primary)] transition-all appearance-none cursor-pointer hover:bg-[var(--color-surface-alt)]"
                            >
                                {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <FontAwesomeIcon icon={faChevronDown} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[8px] text-[var(--color-text-muted)] pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    <div className="flex items-center gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(1)}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" />
                        </button>
                        <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 px-1">
                        {getPageItems(page, totalPages).map((it, idx) => (
                            it === '...' ? (
                                <span key={`sep-${idx}`} className="w-6 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30 text-xs">...</span>
                            ) : (
                                <button key={`pg-${it}`} onClick={() => setPage(it)}
                                    className={`h-9 min-w-[36px] px-2.5 rounded-xl font-black text-[10px] transition-all active:scale-95
                                    ${it === page
                                            ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                            : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}
                                >
                                    {it}
                                </button>
                            )
                        ))}
                    </div>

                    <div className="flex items-center gap-1">
                        <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                        </button>
                        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-20 active:scale-90"
                        >
                            <FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" />
                        </button>
                    </div>

                    <div className="md:ml-2 relative flex items-center group">
                        <input
                            value={jumpPage}
                            onChange={e => setJumpPage(e.target.value.replace(/[^\d]/g, ''))}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const n = Number(jumpPage);
                                    if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage('') }
                                }
                            }}
                            placeholder="Tuju"
                            className="w-16 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[10px] font-black focus:border-[var(--color-primary)] transition-all outline-none"
                        />
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Jump ke hal...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
