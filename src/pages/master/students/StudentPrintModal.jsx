import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCheckCircle,
    faChevronDown,
    faDownload,
    faFileLines,
    faGraduationCap,
    faImage,
    faLink,
    faPrint,
    faRotateLeft,
    faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import Modal from '../../../components/ui/Modal'

const LazyQRCodeCanvas = React.lazy(() =>
    import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas }))
)

export default function StudentPrintModal({
    isOpen,
    onClose,
    selectedStudent,
    newlyCreatedStudent,
    isPrivacyMode,
    maskInfo,
    addToast,
    cardCaptureRef,
    waTemplate,
    buildWAMessage,
    openWAForStudent,
    handleResetPin,
    resettingPin,
    generatingPdf,
    handlePrintSingle,
    handleSavePNG,
    handlePrintThermal,
}) {
    const [showExportMenu, setShowExportMenu] = useState(false)

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { setShowExportMenu(false); onClose?.() }}
            title={newlyCreatedStudent ? "Registrasi Berhasil!" : "Akses & Kartu"}
            size="lg"
        >
            {selectedStudent && (
                <div className="space-y-4 py-1">
                    {newlyCreatedStudent && (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600">
                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-[10px]">
                                <FontAwesomeIcon icon={faCheckCircle} />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest">Registrasi Berhasil! Data akses & kartu tersedia di bawah.</p>
                        </div>
                    )}

                    <div
                        id="card-capture-target"
                        ref={cardCaptureRef}
                        className="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
                        style={{ background: 'transparent' }}
                    >
                        <div className="w-[300px] h-[188px] bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl text-white relative shadow-xl overflow-hidden shadow-indigo-500/20 shrink-0 scale-95 sm:scale-100 origin-center transition-transform">
                            <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full blur-2xl" />
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <span className="font-black text-[9px]">L</span>
                                </div>
                                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Laporanmu</span>
                            </div>
                            <div className="absolute top-9 left-4 right-4 bottom-7 flex gap-3 z-10">
                                <div className="w-[62px] h-[78px] rounded-lg bg-white/10 border border-white/20 p-1.5 shrink-0 shadow-lg overflow-hidden">
                                    {selectedStudent.photo_url ? (
                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover rounded-md" />
                                    ) : (
                                        <div className="w-full h-full rounded-md bg-white/5 flex items-center justify-center border border-white/10">
                                            <span className="text-2xl font-black opacity-30">{isPrivacyMode ? '*' : selectedStudent.name.charAt(0)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                    <div>
                                        <h3 className="text-[11px] font-black leading-[1.2] uppercase mb-0.5 drop-shadow-sm line-clamp-2">
                                            {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                                        </h3>
                                        <div className="space-y-0.5">
                                            <p className="text-[8px] font-black text-white/90 uppercase tracking-tight leading-tight">{selectedStudent.className}</p>
                                            <p className="text-[6px] font-bold text-white/40 uppercase tracking-widest leading-none">MUHAMMADIYAH BOARDING SCHOOL TANGGUL</p>
                                        </div>
                                    </div>
                                    <div className="pt-1.5 border-t border-white/10">
                                        <p className="text-[5px] font-bold opacity-30 uppercase tracking-widest mb-0.5 leading-none">NOMOR REGISTRASI</p>
                                        <p className="text-[9px] font-mono font-bold tracking-wider text-indigo-100 leading-tight">
                                            {isPrivacyMode ? maskInfo(selectedStudent.code, 3) : selectedStudent.code}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between opacity-20">
                                <div className="flex items-center gap-1 text-white">
                                    <FontAwesomeIcon icon={faGraduationCap} className="text-[7px]" />
                                    <span className="text-[6px] font-black uppercase tracking-[0.3em]">KARTU PELAJAR</span>
                                </div>
                                <span className="text-[5px] font-black uppercase tracking-[0.2em] text-white">2026/2027</span>
                            </div>
                        </div>

                        <div className="w-[300px] h-[188px] bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 relative shadow-lg flex flex-col items-center justify-center text-center shrink-0 p-4 scale-95 sm:scale-100 origin-center transition-transform">
                            <div className={`p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm mb-2 ${isPrivacyMode ? 'blur-md grayscale opacity-50' : ''}`}>
                                <React.Suspense
                                    fallback={<div className="w-[65px] h-[65px] rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)]" />}
                                >
                                    <LazyQRCodeCanvas
                                        value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                        size={65}
                                        level="M"
                                    />
                                </React.Suspense>
                            </div>
                            <h4 className="text-[8px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em] mb-1 leading-tight">AKSES PORTAL ORANG TUA</h4>
                            <p className="text-[6px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[180px]">
                                Silakan scan kode di atas untuk<br />mengecek perkembangan siswa
                            </p>
                            <div className="absolute bottom-3 w-full left-0 px-5 flex justify-between items-center opacity-20">
                                <span className="text-[5px] font-black uppercase tracking-[0.25em]">TAHUN 2026/2027</span>
                                <span className="text-[5px] font-black uppercase tracking-[0.25em]">MBS TANGGUL</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl p-3 space-y-3 no-print">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                    <label className="block text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">ID REG</label>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-black text-[var(--color-primary)] font-mono">
                                            {isPrivacyMode ? maskInfo(selectedStudent.code, 2) : selectedStudent.code}
                                        </span>
                                        <button onClick={() => {
                                            if (isPrivacyMode) return addToast?.('Mode Privasi aktif', 'warning')
                                            navigator.clipboard.writeText(selectedStudent.code);
                                            addToast?.('Kode dicopy', 'success')
                                        }} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"><FontAwesomeIcon icon={faLink} /></button>
                                    </div>
                                </div>
                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                    <label className="block text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">PIN</label>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-black text-emerald-500 font-mono tracking-wider">
                                            {isPrivacyMode ? '****' : selectedStudent.pin}
                                        </span>
                                        <button onClick={() => {
                                            if (isPrivacyMode) return addToast?.('Mode Privasi aktif', 'warning')
                                            navigator.clipboard.writeText(selectedStudent.pin);
                                            addToast?.('PIN dicopy', 'success')
                                        }} className="text-[10px] text-[var(--color-text-muted)] hover:text-emerald-500"><FontAwesomeIcon icon={faLink} /></button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => openWAForStudent?.(selectedStudent, buildWAMessage?.(selectedStudent, waTemplate))}
                                className="h-10 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 px-4 w-full"
                            >
                                <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                                BAGIKAN KE WALI MURID
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/50">
                            <button
                                onClick={() => {
                                    if (isPrivacyMode) return addToast?.('Mode Privasi aktif', 'warning');
                                    handleResetPin?.(selectedStudent);
                                }}
                                disabled={resettingPin}
                                className="h-9 px-3 rounded-lg border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                            >
                                <FontAwesomeIcon icon={resettingPin ? faSpinner : faRotateLeft} className={resettingPin ? 'fa-spin' : ''} />
                                Reset PIN Akses
                            </button>

                            <div className="flex gap-2 items-center">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowExportMenu(v => !v)}
                                        disabled={generatingPdf}
                                        className="h-9 px-3 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {generatingPdf
                                            ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Menyiapkan...</>
                                            : <><FontAwesomeIcon icon={faDownload} /> Ekspor <FontAwesomeIcon icon={faChevronDown} className="text-[8px] opacity-70" /></>
                                        }
                                    </button>
                                    {showExportMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                            <div className="absolute bottom-full mb-1.5 right-0 z-20 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 pt-2.5 pb-1">Pilih Format</p>
                                                <button
                                                    onClick={() => { handlePrintSingle?.(selectedStudent); setShowExportMenu(false); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors text-left"
                                                >
                                                    <FontAwesomeIcon icon={faFileLines} className="w-5 text-center text-[11px] text-[var(--color-primary)]" /> Surat Akses PDF
                                                </button>
                                                <button
                                                    onClick={() => { handleSavePNG?.(selectedStudent); setShowExportMenu(false); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-left"
                                                >
                                                    <FontAwesomeIcon icon={faImage} className="w-5 text-center text-[11px] text-emerald-500" /> Simpan PNG
                                                </button>
                                                <button
                                                    onClick={() => { handlePrintThermal?.(selectedStudent); setShowExportMenu(false); }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-orange-500/10 hover:text-orange-600 transition-colors text-left mb-1"
                                                >
                                                    <FontAwesomeIcon icon={faPrint} className="w-5 text-center text-[11px] text-orange-500" /> Struk Thermal 58mm
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    )
}
