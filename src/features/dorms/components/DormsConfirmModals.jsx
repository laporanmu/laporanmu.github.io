import React from 'react'
import Modal from '@shared/components/Modal'
import { UserMinus, Trash2 } from 'lucide-react'

export function ConfirmEvictModal({
    isOpen,
    onClose,
    studentToEvict,
    onConfirm,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Keluarkan dari Kamar"
            description="Plotting kamar santri akan dikosongkan"
            icon={UserMinus}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <UserMinus className="w-3.5 h-3.5 opacity-70" />
                        )}
                        Ya, Keluarkan
                    </button>
                </div>
            }
        >
            <div className="px-1">
                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                    Santri <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{studentToEvict?.name}</span> akan dikeluarkan dari kamar {studentToEvict?.metadata?.kamar || 'Kamar'}. Tindakan ini akan mengosongkan plotting kamar santri tersebut.
                </p>
            </div>
        </Modal>
    )
}

export function ConfirmDeleteDormModal({
    isOpen,
    onClose,
    dormToDelete,
    students,
    onConfirm,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Hapus Kamar"
            description="Kamar asrama akan dihapus secara permanen"
            icon={Trash2}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                        )}
                        Ya, Hapus
                    </button>
                </div>
            }
        >
            <div className="px-1">
                {dormToDelete && (() => {
                    const occupants = students.filter(s => s.metadata?.kamar === dormToDelete.id)
                    if (occupants.length > 0) {
                        return (
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                Ada {occupants.length} santri yang saat ini menempati kamar <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{dormToDelete.id}</span>. Apakah Anda yakin ingin mengeluarkan mereka dari kamar secara otomatis dan menghapus kamar ini?
                            </p>
                        )
                    }
                    return (
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Apakah Anda yakin ingin menghapus kamar <span className="text-[var(--color-text)] font-black">{dormToDelete.id}</span>? Tindakan ini akan menghapus data kamar secara permanen dan tidak dapat dibatalkan.
                        </p>
                    )
                })()}
            </div>
        </Modal>
    )
}

export function ConfirmDeleteAuditModal({
    isOpen,
    onClose,
    auditToDelete,
    onConfirm,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Hapus Laporan Kebersihan"
            description="Laporan pemeriksaan akan dihapus secara permanen"
            icon={Trash2}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={submitting}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Trash2 className="w-3.5 h-3.5 opacity-70" />
                        )}
                        Ya, Hapus
                    </button>
                </div>
            }
        >
            <div className="px-1">
                {auditToDelete && (
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                        Apakah Anda yakin ingin menghapus laporan kebersihan kamar <span className="text-[var(--color-text)] font-black">{auditToDelete.room}</span> tanggal <span className="text-[var(--color-text)] font-black">{auditToDelete.date}</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                )}
            </div>
        </Modal>
    )
}

export function ConfirmDeleteInventoryModal({
    isOpen,
    onClose,
    inventoryToDelete,
    onConfirm
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Hapus Item Inventaris"
            description="Item akan dihapus secara permanen"
            icon={Trash2}
            iconBg="bg-red-500/10"
            iconColor="text-red-500"
            size="sm"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                    >
                        Batal
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                    >
                        <Trash2 className="w-3.5 h-3.5 opacity-70" /> Ya, Hapus
                    </button>
                </div>
            }
        >
            <div className="px-1">
                {inventoryToDelete && (
                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                        Apakah Anda yakin ingin menghapus item <span className="text-[var(--color-text)] font-black">{inventoryToDelete.item_name}</span>? Tindakan ini tidak dapat dibatalkan.
                    </p>
                )}
            </div>
        </Modal>
    )
}
