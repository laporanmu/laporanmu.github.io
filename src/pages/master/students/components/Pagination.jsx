import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faAnglesLeft, faChevronLeft, faChevronRight, faAnglesRight
} from '@fortawesome/free-solid-svg-icons'
import React, { useState } from 'react'

export function Pagination({
    page,
    totalPages,
    setPage,
    pageSize,
    setPageSize,
    totalRows,
    fromRow,
    toRow,
    getPageItems
}) {
    const [jumpPage, setJumpPage] = useState('')

    if (totalRows === 0) return null

    return (
        <div className="px-6 py-5 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}–{toRow} dari {totalRows} siswa</p>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 mr-2 pr-3 border-r border-[var(--color-border)]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] whitespace-nowrap">Baris:</span>
                    <select
                        value={pageSize}
                        onChange={e => {
                            const val = Number(e.target.value)
                            setPageSize(val)
                            setPage(1)
                        }}
                        className="bg-transparent text-[10px] font-black text-[var(--color-text)] outline-none cursor-pointer hover:text-[var(--color-primary)] transition-all"
                    >
                        {[10, 25, 50, 100].map(v => (
                            <option key={v} value={v} className="bg-[var(--color-surface)] text-[var(--color-text)]">{v}</option>
                        ))}
                    </select>
                </div>
                <button disabled={page === 1} onClick={() => setPage(1)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" /></button>
                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
                <div className="flex items-center gap-1.5 mx-1">
                    {getPageItems(page, totalPages).map((it, idx) => it === '...' ? <span key={`s${idx}`} className="w-8 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30">···</span> : (
                        <button key={it} onClick={() => setPage(it)} className={`h-9 min-w-[36px] px-2.5 rounded-xl font-black text-[10px] transition-all ${it === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}>{it}</button>
                    ))}
                </div>
                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" /></button>
                <div className="ml-2 relative flex items-center">
                    <input
                        value={jumpPage}
                        onChange={e => setJumpPage(e.target.value.replace(/[^\d]/g, ''))}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                const n = Number(jumpPage);
                                if (n >= 1 && n <= totalPages) {
                                    setPage(n);
                                    setJumpPage('')
                                }
                            }
                        }}
                        placeholder="Hal..."
                        className="w-16 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[11px] font-black focus:border-[var(--color-primary)] outline-none"
                    />
                </div>
            </div>
        </div>
    )
}
