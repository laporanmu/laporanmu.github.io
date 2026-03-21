import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faEye, faEyeSlash, faSliders, faFileImport, faLink,
    faFileExport, faCamera, faClipboardList, faBoxArchive,
    faRotateLeft, faPlus, faKeyboard
} from '@fortawesome/free-solid-svg-icons'
import Breadcrumb from '../ui/Breadcrumb'
import { useNavigate } from 'react-router-dom'

const StudentsHeader = memo(function StudentsHeader({
    globalStats,
    isPrivacyMode,
    setIsPrivacyMode,
    isHeaderMenuOpen,
    setIsHeaderMenuOpen,
    headerMenuRef,
    handleImportClick,
    setIsGSheetsModalOpen,
    setIsExportModalOpen,
    setIsBulkPhotoModalOpen,
    fetchArchivedStudents,
    setIsArchivedModalOpen,
    setResetPointsClassId,
    setIsResetPointsModalOpen,
    isShortcutOpen,
    setIsShortcutOpen,
    shortcutRef,
    handleAdd,
    canEdit
}) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
                <Breadcrumb badge="Master Data" items={['Master', 'Siswa']} className="mb-1" />
                <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h1>
                <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                    Kelola {globalStats.total} data siswa aktif dalam sistem laporan.
                </p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold opacity-60">
                    Untuk pengisian awal, gunakan menu import (Excel / GSheets) agar lebih cepat dan minim salah ketik.
                </p>
            </div>

            <div className="flex gap-2 items-center">
                {/* Keyboard Shortcuts Button */}
                <div className="relative" ref={shortcutRef}>
                    <button
                        onClick={() => setIsShortcutOpen(v => !v)}
                        className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all
                        ${isShortcutOpen
                                ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        title="Keyboard Shortcuts (?)"
                    >
                        <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                    </button>
                </div>

                {/* Sub-menu button */}
                <div className="relative" ref={headerMenuRef}>
                    <button
                        onClick={() => setIsHeaderMenuOpen(v => !v)}
                        className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                        title="Aksi lainnya"
                    >
                        <FontAwesomeIcon icon={faSliders} />
                    </button>

                    {isHeaderMenuOpen && (
                        <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-[calc(100%+8px)] -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[320px] sm:w-56 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                            <button onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Unggah data murid masal dari file Excel/CSV</p>
                                </div>
                            </button>
                            <button onClick={() => { setIsHeaderMenuOpen(false); setIsGSheetsModalOpen(true) }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faLink} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Import GSheets</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Sinkronisasi data otomatis via Google Sheets</p>
                                </div>
                            </button>
                            <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Export Data</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Cadangkan seluruh database ke format Excel</p>
                                </div>
                            </button>
                            <button onClick={() => { setIsHeaderMenuOpen(false); setIsBulkPhotoModalOpen(true) }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faCamera} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Bulk Foto</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Update foto siswa secara masal via NISN</p>
                                </div>
                            </button>

                            <button onClick={() => { setIsHeaderMenuOpen(false); navigate('/raport') }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faClipboardList} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Raport Bulanan</p>
                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">Melihat Hasil</p>
                                </div>
                            </button>

                            <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                            <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>

                            <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchivedStudents(); setIsArchivedModalOpen(true) }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Arsip Siswa</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data siswa tidak aktif</p>
                                </div>
                            </button>
                            <button onClick={() => { setIsHeaderMenuOpen(false); setResetPointsClassId(''); setIsResetPointsModalOpen(true) }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Reset Poin</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Bersihkan semua poin untuk semester baru</p>
                                </div>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                    className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                    title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}
                >
                    <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                        {isPrivacyMode ? 'Privacy On' : 'Privacy Off'}
                    </span>
                </button>

                <button
                    onClick={handleAdd}
                    disabled={!canEdit}
                    className="h-9 px-5 rounded-lg btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    {canEdit ? 'Tambah' : 'Read-only'}
                </button>
            </div>
        </div>
    )
})

export default StudentsHeader
