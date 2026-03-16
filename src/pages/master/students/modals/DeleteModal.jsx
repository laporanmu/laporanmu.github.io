import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBoxArchive
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function DeleteModal({
    isOpen,
    onClose,
    studentToDelete,
    executeDelete
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsipkan Siswa?"
        >
            <div className="space-y-6">
                <div className="p-4 bg-amber-500/10 rounded-[1.5rem] flex items-center gap-4 text-amber-600 border border-amber-500/20">
                    <div className="w-12 h-12 rounded-[1rem] bg-amber-500/20 flex items-center justify-center shrink-0 text-xl border border-amber-500/30">
                        <FontAwesomeIcon icon={faBoxArchive} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Pindahkan ke Arsip?</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Data dapat dipulihkan kapan saja dari menu Arsip.</p>
                    </div>
                </div>

                <div className="px-1">
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                        <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{studentToDelete?.name}</span> akan dipindahkan ke arsip. Riwayat laporan & poin tetap tersimpan dan bisa dipulihkan.
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                        BATAL
                    </button>
                    <button type="button" onClick={executeDelete} className="btn bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                        ARSIPKAN
                    </button>
                </div>
            </div>
        </Modal>
    )
}
