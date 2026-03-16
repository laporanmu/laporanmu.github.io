import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSpinner
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function BulkPromoteModal({
    isOpen,
    onClose,
    selectedStudentIds,
    bulkClassId,
    setBulkClassId,
    classesList,
    handleBulkPromote,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Kenaikan Kelas Massal"
            size="sm"
        >
            <div className="space-y-6">
                <div className="p-4 glass bg-[var(--color-primary)]/10 rounded-[1.5rem] border border-[var(--color-primary)]/20">
                    <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                        Target Kenaikan
                    </p>
                    <p className="text-[11px] text-[var(--color-text)] leading-relaxed font-bold">
                        Anda akan memindahkan <span className="text-[var(--color-primary)] font-black text-[13px] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20">{selectedStudentIds.length} siswa</span> terpilih ke kelas tujuan.
                    </p>
                </div>

                <div>
                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2 ml-1">Pilih Kelas Baru</label>
                    <select
                        value={bulkClassId}
                        onChange={(e) => setBulkClassId(e.target.value)}
                        className="select-field text-sm py-3 bg-[var(--color-surface-alt)] border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-[1rem] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                    >
                        <option value="">Cari Kelas Tujuan</option>
                        {classesList.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={onClose} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black h-11 text-[10px] uppercase tracking-widest rounded-[1rem] transition-all">
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkPromote}
                        disabled={submitting}
                        className="btn btn-primary flex-1 font-black h-11 text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-[1rem] transition-all hover:scale-[1.02]"
                    >
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Proses'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
