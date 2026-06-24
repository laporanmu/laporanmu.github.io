import { memo, useState } from 'react'
import {
    Keyboard, X, ChevronLeft, ChevronRight,
    Search, Info, Lightbulb, Save,
    Table, Check, Archive, Paintbrush, FileText, ClipboardList
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'

// Simple SVG replacement for WhatsApp icon
const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={props.style} width={props.width || "1em"} height={props.height || "1em"}>
        <path d="M12.012 1c-6.067 0-11 4.934-11 11a10.957 10.957 0 001.605 5.679L1 23l5.52-1.748A10.949 10.949 0 0012.012 23c6.067 0 11-4.933 11-11s-4.933-11-11-11zm5.12 15.65c-.218.614-1.077 1.15-1.636 1.218-.557.068-1.229.098-3.003-.618-2.28-.92-3.738-3.23-3.852-3.38-.114-.15-.92-1.227-.92-2.355 0-1.127.59-1.682.802-1.912.213-.23.46-.287.613-.287.154 0 .307.003.44.01.14.007.327-.052.51.393.187.456.64 1.56.697 1.674.057.115.095.249.019.402-.077.153-.153.249-.306.42-.154.173-.326.288-.135.614.19.326.85 1.397 1.82 2.261.97.864 1.787 1.132 2.094 1.266.307.135.48.115.652-.076.173-.192.748-.864.947-1.161.2-.298.4-.249.671-.15.27.097 1.722.812 2.018.96.297.147.494.22.567.346.073.125.073.722-.145 1.336z" />
    </svg>
)

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

export const WaBlastConfirmContent = memo(({ isOpen, onClose, queue, onConfirm, onCancel, currentLang = 'id', currentPageSize = 'f4' }) => {
    const [selectedIds, setSelectedIds] = useState(new Set(queue.map(s => s.id)))
    const [selectedLang, setSelectedLang] = useState(currentLang)
    const [selectedPageSize, setSelectedPageSize] = useState(currentPageSize)

    const handleConfirm = () => {
        onConfirm(queue.filter(s => selectedIds.has(s.id)), selectedLang, selectedPageSize)
    }

    const toggleAll = () => {
        if (selectedIds.size === queue.length) setSelectedIds(new Set())
        else setSelectedIds(new Set(queue.map(s => s.id)))
    }

    const toggleOne = (id) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setSelectedIds(newSet)
    }

    const langOptions = [
        { id: 'id', name: 'Bahasa Indonesia' },
        { id: 'ar', name: 'Bahasa Arab (العربية)' }
    ]

    const pageSizeOptions = [
        { id: 'a4', name: 'A4 (210 × 297 mm)' },
        { id: 'f4', name: 'F4 / Folio (215 × 330 mm)' }
    ]

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konfirmasi WA Blast"
            description="Preview dan pilih wali santri target penerima raport"
            icon={WhatsAppIcon}
            variant="green"
            size="md"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button onClick={onCancel} className="h-10 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button onClick={handleConfirm} disabled={selectedIds.size === 0} className="h-10 px-6 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all flex items-center gap-2 disabled:opacity-50">
                        <WhatsAppIcon className="w-4 h-4" />
                        Kirim ke {selectedIds.size} Santri
                    </button>
                </div>
            }
        >
            <div className="space-y-3">
                {/* Header info */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <p className="flex-1">
                        Sistem mengirim pesan otomatis di latar belakang (Background API). Pastikan token API (Fonnte) valid dan kuota mencukupi agar proses lancar.
                    </p>
                </div>

                {/* Document Settings */}
                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] space-y-2">
                    <div className="flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text)]">Pengaturan Dokumen Raport</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-0.5 text-left">
                            <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Bahasa Raport</label>
                            <RichSelect
                                value={selectedLang}
                                onChange={setSelectedLang}
                                options={langOptions}
                                small
                            />
                        </div>
                        <div className="space-y-0.5 text-left">
                            <label className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Ukuran Kertas</label>
                            <RichSelect
                                value={selectedPageSize}
                                onChange={setSelectedPageSize}
                                options={pageSizeOptions}
                                small
                            />
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="border border-[var(--color-border)] rounded-2xl bg-[var(--color-surface)] overflow-hidden shadow-sm">
                    {/* Select All header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                        <button onClick={toggleAll} className="flex items-center gap-2 text-[10px] font-black text-[var(--color-text)] hover:text-green-600 transition-colors">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedIds.size === queue.length ? 'bg-green-500 border-green-500' : 'border-[var(--color-border)] bg-white'}`}>
                                {selectedIds.size === queue.length && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            Pilih Semua ({queue.length})
                        </button>
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-wider">Target Pengiriman</span>
                    </div>
                    {/* Scrollable list */}
                    <div className="p-2 space-y-1 max-h-[160px] overflow-y-auto custom-scrollbar bg-[var(--color-surface)]">
                        {queue.map((s, idx) => {
                            const isSelected = selectedIds.has(s.id)
                            return (
                                <button key={s.id} type="button"
                                    onClick={() => toggleOne(s.id)}
                                    className={`w-full flex items-center gap-3 py-1.5 px-2.5 rounded-lg border text-left transition-all ${isSelected ? 'bg-green-500/5 border-green-500/20' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    {/* Checkbox */}
                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-green-500 border-green-500' : 'border-[var(--color-border)] bg-white'}`}>
                                        {isSelected && <Check className="w-2 h-2 text-white" />}
                                    </div>
                                    {/* Index + Name */}
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-[9px] font-black text-[var(--color-text-muted)] w-5 shrink-0">{idx + 1}</span>
                                        <div className="min-w-0">
                                            <div className="text-[11px] font-black text-[var(--color-text)] truncate">{s.name}</div>
                                        </div>
                                    </div>
                                    {/* Phone Number */}
                                    <div className="text-[10px] font-black text-[var(--color-text-muted)] px-2">
                                        {s.phone ? (s.phone.length > 8 ? s.phone.substring(0, 4) + '****' + s.phone.slice(-4) : s.phone) : '—'}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    )
})

export const WaBlastProgressContent = memo(({ progress, total, done, failed, activeName, active, onCancel, status }) => {
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0
    const isFinished = pct === 100 || !active

    return (
        <div className="space-y-6 py-4">
            {/* Header: Icon & Title */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isFinished
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-green-500/10 text-green-500'
                        }`}>
                        {isFinished ? (
                            <Check className="w-6 h-6" />
                        ) : (
                            <div className="relative flex items-center justify-center">
                                <WhatsAppIcon className="w-6 h-6" />
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full animate-ping" />
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-base font-black text-[var(--color-text)] tracking-tight">
                            {isFinished ? 'Blast Selesai!' : 'Sedang Mengirim...'}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] font-bold">
                            {progress} dari {total} santri terproses
                        </p>
                    </div>
                </div>
                <span className={`text-3xl font-black tabular-nums tracking-tighter ${isFinished ? 'text-emerald-500' : 'text-[var(--color-text)]'}`}>
                    {pct}<span className="text-lg opacity-50">%</span>
                </span>
            </div>

            {/* Progress Bar Container */}
            <div className="h-4 w-full rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-1">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isFinished ? 'bg-emerald-500' : 'bg-green-500'
                        }`}
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-0.5">Terkirim</span>
                    <span className="text-xl font-black text-emerald-600 tabular-nums">{done || 0}</span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/15 flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-0.5">Gagal</span>
                    <span className="text-xl font-black text-rose-600 tabular-nums">{failed || 0}</span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5">Tersisa</span>
                    <span className="text-xl font-black text-[var(--color-text-muted)] tabular-nums">{Math.max(0, total - progress)}</span>
                </div>
            </div>

            {/* Active processing element */}
            {!isFinished && activeName && (
                <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-200">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                            {status === 'generating' && 'Men-generate PDF raport...'}
                            {status === 'uploading' && 'Mengunggah PDF ke Supabase...'}
                            {status === 'sending' && 'Mengirim pesan WhatsApp...'}
                            {!status && 'Sekarang Mengirim Ke:'}
                        </p>
                        <p className="text-sm font-black text-[var(--color-text)] truncate">{activeName}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-green-500/20 border-t-green-500 animate-spin shrink-0" />
                </div>
            )}

            {/* Actions */}
            {active && onCancel && (
                <div className="flex justify-end pt-2">
                    <button
                        onClick={onCancel}
                        className="h-10 px-5 rounded-xl border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
                    >
                        Batalkan Antrean
                    </button>
                </div>
            )}
        </div>
    )
})

// ─── ZIP Blast Progress Content ──────────────────────────────────────────────

export const ZipBlastProgressContent = memo(({ progress, total, done, failed, activeName, active, onCancel, status }) => {
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
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${isFinished
                        ? 'bg-emerald-500/10 text-emerald-500 shadow-lg shadow-emerald-500/5'
                        : 'bg-teal-500/10 text-teal-500 animate-pulse'
                        }`}>
                        {isFinished ? (
                            <Check className="w-5 h-5" />
                        ) : (
                            <div className="relative flex items-center justify-center">
                                <FileText className="w-5 h-5" />
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
                    className={`h-full rounded-full transition-all duration-500 relative overflow-hidden ${isFinished ? 'bg-emerald-500' : 'bg-gradient-to-r from-teal-400 to-emerald-500'
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
                        <p className="text-[9px] font-black uppercase tracking-wider text-[var(--color-text-muted)]">
                            {status === 'generating' && 'Men-generate PDF raport...'}
                            {!status && 'Sedang Memproses:'}
                        </p>
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
