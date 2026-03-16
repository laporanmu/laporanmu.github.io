import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTrash, faSpinner
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function BulkDeleteModal({
    isOpen,
    onClose,
    selectedStudentIds,
    handleBulkDelete,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Hapus Siswa Terpilih?"
            size="sm"
        >
            <div className="space-y-6">
                <div className="p-4 bg-red-500/10 rounded-[1.5rem] flex items-center gap-4 text-red-500 border border-red-500/20">
                    <div className="w-12 h-12 rounded-[1rem] bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30">
                        <FontAwesomeIcon icon={faTrash} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Hapus {selectedStudentIds.length} Siswa?</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Riwayat laporan & poin terhapus permanen.</p>
                    </div>
                </div>
                <div className="px-1">
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                        Tindakan ini akan menghapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedStudentIds.length} siswa</span> beserta seluruh riwayat perilaku mereka. Tindakan ini tidak dapat dibatalkan.
                    </p>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                        BATAL
                    </button>
                    <button type="button" onClick={handleBulkDelete} disabled={submitting} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
