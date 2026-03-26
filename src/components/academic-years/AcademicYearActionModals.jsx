import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTriangleExclamation,
    faBoxArchive,
    faCircleExclamation,
    faTrash,
    faSpinner
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export const ArchiveModal = memo(function ArchiveModal({
    isOpen,
    onClose,
    selectedItem,
    onConfirm,
    submitting
}) {
    if (!selectedItem) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konfirmasi Arsip"
            size="sm"
        >
            <div className="space-y-5">
                {/* Visual Header */}
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faBoxArchive} className="text-amber-600 text-lg" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-widest leading-none mb-1">Pindahkan ke Arsip?</h4>
                        <p className="text-[9px] font-bold text-amber-700/70 leading-tight">Dapat dipulihkan dari menu arsip.</p>
                    </div>
                </div>

                <div className="px-1 text-[11px] font-bold text-[var(--color-text-muted)] leading-relaxed">
                    Tahun Pelajaran <span className="px-2 py-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black mx-1 whitespace-nowrap">{selectedItem.name} {selectedItem.semester}</span> akan diarsipkan. Laporan terkait tetap tersimpan dengan aman.
                </div>

                <div className="flex gap-2.5 pt-1">
                    <button type="button" onClick={onClose}
                        className="h-10 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">
                        Batal
                    </button>
                    <button type="button" onClick={onConfirm} disabled={submitting}
                        className="h-10 flex-[1.5] rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faBoxArchive} />}
                        {submitting ? 'Mengarsipkan...' : 'Arsipkan Sekarang'}
                    </button>
                </div>
            </div>
        </Modal>
    )
})

export const DeactivateModal = memo(function DeactivateModal({
    isOpen,
    onClose,
    selectedItem,
    onConfirm,
    submitting
}) {
    if (!selectedItem) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Nonaktifkan Periode"
            size="sm"
        >
            <div className="space-y-5">
                {/* Visual Header */}
                <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-orange-600 text-lg" />
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-orange-800 uppercase tracking-widest leading-none mb-1">Konfirmasi Nonaktifkan</h4>
                        <p className="text-[9px] font-bold text-orange-700/70 leading-tight">Sistem akan berjalan tanpa periode acuan aktif.</p>
                    </div>
                </div>

                <div className="px-1 text-[11px] font-bold text-[var(--color-text-muted)] leading-relaxed">
                    Nonaktifkan <span className="px-2 py-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black mx-1 whitespace-nowrap">{selectedItem.name} {selectedItem.semester}</span>? Seluruh sistem tidak akan memiliki tahun aktif sampai Anda mengaktifkan yang lain.
                </div>

                <div className="flex gap-2.5 pt-1">
                    <button type="button" onClick={onClose}
                        className="h-10 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">
                        Batal
                    </button>
                    <button type="button" onClick={onConfirm} disabled={submitting}
                        className="h-10 flex-[1.5] rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faCircleExclamation} />}
                        {submitting ? 'Memproses...' : 'Nonaktifkan Sekarang'}
                    </button>
                </div>
            </div>
        </Modal>
    )
})
