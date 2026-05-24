import { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faKeyboard, faXmark, faChevronLeft, faChevronRight,
    faMagnifyingGlass, faCircleInfo, faLightbulb, faFloppyDisk,
    faTableList, faCheck, faBoxArchive, faFillDrip, faFilePdf, faClipboardList
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

// ─── Shortcut Modal Content ──────────────────────────────────────────────────

export const ShortcutModalContent = memo(() => {
    const items = [
        { section: 'Navigasi Sel (Excel-like)' },
        { keys: ['Tab', 'Enter'], label: 'Pindah ke cell berikutnya' },
        { keys: ['↑', '↓'], label: 'Naik / turun baris' },
        { keys: ['←', '→'], label: 'Pindah kolom kriteria' },
        { keys: ['Esc'], label: 'Tutup modal / panel' },
        { section: 'Aksi & Pengeditan' },
        { keys: ['Ctrl', 'S'], label: 'Simpan semua nilai' },
        { keys: ['Ctrl', 'Z'], label: 'Undo nilai' },
        { keys: ['Ctrl', 'Y'], label: 'Redo nilai' },
        { keys: ['/'], label: 'Fokus ke pencarian santri' },
        { keys: ['?'], label: 'Tampilkan shortcut ini' },
    ]

    return (
        <div className="p-3 space-y-0.5">
            {items.map((item, i) => item.section ? (
                <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-3 pb-1 px-1 first:pt-0">{item.section}</p>
            ) : (
                <div key={i} className="flex items-center justify-between px-1.5 py-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                    <span className="text-[11px] font-semibold text-[var(--color-text)] opacity-80">{item.label}</span>
                    <div className="flex items-center gap-1">
                        {item.keys.map((k, ki) => (
                            <div key={ki} className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono min-w-[20px] text-center shadow-sm">{k}</span>
                                {ki < item.keys.length - 1 && <span className="text-[9px] opacity-30">+</span>}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
})


// ─── WA Blast Confirm Content ────────────────────────────────────────────────

export const WaBlastConfirmContent = memo(({ count, onConfirm, onCancel }) => (
    <div className="space-y-6 text-center">
        <div className="p-1 inline-block">
             <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <FontAwesomeIcon icon={faWhatsapp} className="text-4xl text-green-500" />
            </div>
        </div>
        <div className="space-y-1">
            <h3 className="text-xl font-black text-[var(--color-text)] tracking-tight">WhatsApp Blast</h3>
            <p className="text-sm text-[var(--color-text-muted)] font-medium">Kirim raport ke {count} santri sekaligus</p>
        </div>

        <div className="p-5 rounded-3xl bg-amber-500/5 border border-amber-500/15 text-[13px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
            Pastikan browser mengizinkan Popup agar proses bisa berjalan lancar. Setiap pesan akan membuka tab WhatsApp baru secara otomatis.
        </div>

        <div className="flex gap-3 pt-2">
            <button onClick={onCancel} className="flex-1 h-12 rounded-2xl border border-[var(--color-border)] text-sm font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                Batal
            </button>
            <button onClick={onConfirm} className="flex-1 h-12 rounded-2xl bg-green-500 text-white text-sm font-black shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all">
                Mulai Kirim
            </button>
        </div>
    </div>
))

// ─── WA Blast Progress Content ───────────────────────────────────────────────

export const WaBlastProgressContent = memo(({ progress, total, activeName, isFailed }) => {
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0
    return (
        <div className="space-y-6 py-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pct === 100 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
                        <FontAwesomeIcon icon={pct === 100 ? faCheck : faWhatsapp} className="text-2xl" />
                    </div>
                    <div>
                        <p className="text-base font-black text-[var(--color-text)] tracking-tight">{pct === 100 ? 'Proses Selesai!' : 'Sedang Mengirim...'}</p>
                        <p className="text-xs text-[var(--color-text-muted)] font-bold">{progress} dari {total} santri terproses</p>
                    </div>
                </div>
                <span className="text-2xl font-black text-[var(--color-text)]">{pct}%</span>
            </div>

            <div className="h-4 w-full rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden p-1">
                <div className={`h-full rounded-full transition-all duration-700 shadow-sm ${pct === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
            </div>

            {pct < 100 && activeName && (
                <div className="p-5 rounded-3xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] animate-pulse">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Sekarang:</p>
                    <p className="text-base font-black text-[var(--color-text)]">{activeName}</p>
                </div>
            )}
        </div>
    )
})

// ─── ZIP Blast Progress Content ──────────────────────────────────────────────

export const ZipBlastProgressContent = memo(({ progress, total, done, failed, activeName, active, onCancel }) => {
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0
    const isFinished = pct === 100 || !active

    return (
        <div className="space-y-6 py-4">
            <style>{`
                @keyframes zipShimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .zip-shimmer-bar {
                    animation: zipShimmer 1.8s ease-in-out infinite;
                }
            `}</style>

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                        isFinished 
                            ? 'bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/5' 
                            : 'bg-teal-500/10 text-teal-500 animate-pulse'
                    }`}>
                        {isFinished ? (
                            <FontAwesomeIcon icon={faCheck} className="text-xl" />
                        ) : (
                            <div className="relative flex items-center justify-center">
                                <FontAwesomeIcon icon={faFilePdf} className="text-lg" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-500 rounded-full border-2 border-white animate-ping" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-base font-black text-[var(--color-text)] tracking-tight">
                            {isFinished ? 'Ekspor Selesai!' : 'Mengekspor ke ZIP...'}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] font-bold">
                            {progress} dari {total} raport terproses
                        </p>
                    </div>
                </div>
                <span className="text-2xl font-black text-[var(--color-text)] tracking-tight tabular-nums">
                    {pct}%
                </span>
            </div>

            {/* Progress track */}
            <div className="relative h-4 w-full rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-1 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${
                        isFinished ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                    }`} 
                    style={{ width: `${pct}%` }}
                >
                    {/* Pulsing highlight effect */}
                    {!isFinished && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent zip-shimmer-bar" />
                    )}
                </div>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">Sukses</span>
                    <span className="text-base font-black text-emerald-500 mt-0.5 tabular-nums">{done}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-rose-600 tracking-wider">Gagal</span>
                    <span className="text-base font-black text-rose-500 mt-0.5 tabular-nums">{failed}</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/10 flex flex-col items-center">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Tersisa</span>
                    <span className="text-base font-black text-slate-400 mt-0.5 tabular-nums">{Math.max(0, total - progress)}</span>
                </div>
            </div>

            {/* Active processing element */}
            {!isFinished && activeName && (
                <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">Sedang Memproses:</p>
                        <p className="text-xs font-black text-[var(--color-text)] mt-0.5 truncate">{activeName}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-teal-500/35 border-t-teal-500 animate-spin shrink-0" />
                </div>
            )}

            {/* Actions */}
            {active && (
                <div className="flex justify-end pt-1">
                    <button 
                        onClick={onCancel}
                        className="h-10 px-5 rounded-xl border border-red-500/20 bg-red-500/8 hover:bg-red-500/15 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        Batal Ekspor
                    </button>
                </div>
            )}
        </div>
    )
})
