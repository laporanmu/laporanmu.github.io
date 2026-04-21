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
    const categories = [
        {
            title: 'Navigasi Sel (Excel-like)',
            items: [
                { keys: ['Tab', 'Enter'], desc: 'Pindah ke cell berikutnya' },
                { keys: ['↑', '↓'], desc: 'Naik / turun baris' },
                { keys: ['←', '→'], desc: 'Pindah kolom kriteria' },
                { keys: ['Esc'], desc: 'Tutup modal / panel' },
            ]
        },
        {
            title: 'Aksi & Pengeditan',
            items: [
                { keys: ['Ctrl', 'S'], desc: 'Simpan semua nilai' },
                { keys: ['Ctrl', 'Z'], desc: 'Undo nilai (Ctrl+Y untuk Redo)' },
                { keys: ['/'], desc: 'Fokus ke pencarian santri' },
                { keys: ['?'], desc: 'Buka panel shortcut ini' },
            ]
        }
    ]

    return (
        <div className="space-y-6">
            {categories.map((cat, i) => (
                <div key={i}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">{cat.title}</p>
                    <div className="space-y-1.5">
                        {cat.items.map((item, j) => (
                            <div key={j} className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] hover:border-indigo-500/20 transition-all">
                                <span className="text-[12px] text-[var(--color-text-muted)] font-medium">{item.desc}</span>
                                <div className="flex items-center gap-1">
                                    {item.keys.map((k, kIdx) => (
                                        <div key={kIdx} className="flex items-center gap-1">
                                            <kbd className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border-b-2 border-[var(--color-border)] text-[10px] font-black">{k}</kbd>
                                            {kIdx < item.keys.length - 1 && <span className="text-[10px] opacity-40">+</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <FontAwesomeIcon icon={faCircleInfo} className="text-amber-500 text-sm" />
                </div>
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400 leading-relaxed">
                    <strong>Pro Tip:</strong> Gunakan navigasi keyboard untuk mengisi nilai puluhan santri dalam hitungan menit tanpa menyentuh mouse.
                </p>
            </div>
        </div>
    )
})

// ─── Tutorial Modal Content ──────────────────────────────────────────────────

export const TutorialModalContent = memo(({ step, setStep, totalSteps, slides, onZoomImg, onFinish }) => {
    const slide = slides[step]
    const isLast = step === totalSteps - 1
    const isFirst = step === 0

    return (
        <div className="flex flex-col h-full -m-6 h-[calc(100vh-250px)] max-h-[600px]">
            {/* Dot Navigator - Fixed at Top */}
            <div className="flex items-center justify-center gap-1.5 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
                {slides.map((_, i) => (
                    <button 
                        key={i} 
                        onClick={() => setStep(i)}
                        className={`rounded-full transition-all ${i === step ? 'w-5 h-2 bg-amber-500' : 'w-2 h-2 bg-[var(--color-border)] hover:bg-amber-500/40'}`}
                        aria-label={`Slide ${i + 1}`}
                    />
                ))}
                <span className="ml-2 text-[9px] text-[var(--color-text-muted)] font-bold">{step + 1}/{totalSteps}</span>
            </div>

            {/* Scrollable Body area */}
            <div className="px-6 py-5 flex-1 overflow-y-auto custom-scrollbar">
                {slide.img ? (
                    <div className="relative group mb-5 cursor-zoom-in" onClick={() => onZoomImg(slide.img)}>
                        <img src={slide.img} alt={slide.title}
                            className="w-full rounded-2xl border border-[var(--color-border)] object-contain max-h-64 transition-all group-hover:brightness-95" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                            <div className="bg-black/60 text-white text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px]" /> Klik untuk zoom
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] mb-5 flex items-center justify-center h-48 animate-pulse text-[var(--color-text-muted)] opacity-30">
                         <div className="text-center">
                            <FontAwesomeIcon icon={slide.icon} className="text-2xl mb-2" />
                            <p className="text-[9px] font-black uppercase tracking-widest">Screenshot Slide {step + 1}</p>
                         </div>
                    </div>
                )}
                
                <div className="mb-6">
                    {slide.body}
                </div>

                {/* Tips Box inside scroll area */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3 mb-2">
                    <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 text-xs mt-0.5 shrink-0" />
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-normal">{slide.tips}</p>
                </div>
            </div>

            {/* Fixed Footer Navigation */}
            <div className="flex items-center gap-3 px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                <button 
                    onClick={() => setStep(v => Math.max(0, v - 1))} 
                    disabled={isFirst}
                    className="h-10 px-4 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> Sebelumnya
                </button>
                <div className="flex-1" />
                {isLast ? (
                    <button 
                        onClick={onFinish}
                        className="h-10 px-6 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                        <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> Selesai
                    </button>
                ) : (
                    <button 
                        onClick={() => setStep(v => Math.min(totalSteps - 1, v + 1))}
                        className="h-10 px-6 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                        Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                    </button>
                )}
            </div>
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
