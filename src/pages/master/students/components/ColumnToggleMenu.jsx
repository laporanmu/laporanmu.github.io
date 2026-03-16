import { createPortal } from 'react-dom'

const COLUMN_OPTIONS = [
    { key: 'gender', label: 'Gender' },
    { key: 'kelas', label: 'Kelas' },
    { key: 'poin', label: 'Poin' },
    { key: 'aksi', label: 'Aksi' },
]

export function ColumnToggleMenu({
    isColMenuOpen,
    setIsColMenuOpen,
    colMenuPos,
    setColMenuPos,
    colMenuRef,
    visibleColumns,
    toggleColumn,
}) {
    const handleToggleClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const menuHeight = 220
        const spaceBelow = window.innerHeight - rect.bottom
        const showUp = spaceBelow < menuHeight && rect.top > menuHeight
        setColMenuPos({
            top: showUp ? (rect.top + window.scrollY - menuHeight - 8) : (rect.bottom + window.scrollY + 8),
            right: window.innerWidth - rect.right - window.scrollX,
            showUp
        })
        setIsColMenuOpen(p => !p)
    }

    return (
        <th className="px-6 py-4 text-center pr-6 relative">
            <div className="flex items-center justify-center">
                {visibleColumns.aksi && <span>Aksi</span>}
            </div>

            {/* Toggle Button — absolute kanan, seperti checkbox di kiri */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2" ref={colMenuRef}>
                <button
                    onClick={handleToggleClick}
                    title="Atur kolom"
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
                        ${isColMenuOpen
                            ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                        }`}
                >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                        <rect x="0" y="0" width="5" height="5" rx="1" />
                        <rect x="7" y="0" width="5" height="5" rx="1" />
                        <rect x="0" y="7" width="5" height="5" rx="1" />
                        <rect x="7" y="7" width="5" height="5" rx="1" />
                    </svg>
                </button>

                {/* Dropdown Menu — Portal agar tidak ter-clip oleh overflow tabel */}
                {isColMenuOpen && createPortal(
                    <div
                        className={`absolute z-[9999] w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${colMenuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                        style={{ top: colMenuPos.top, right: colMenuPos.right }}
                    >
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">
                            Tampilkan Kolom
                        </p>
                        {COLUMN_OPTIONS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => toggleColumn(key)}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left"
                            >
                                <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                <div className={`w-8 h-4.5 rounded-full transition-all flex items-center px-0.5 ${visibleColumns[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${visibleColumns[key] ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
            </div>
        </th>
    )
}
