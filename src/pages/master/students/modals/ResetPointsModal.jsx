import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faRotateLeft, faSpinner
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function ResetPointsModal({
    isOpen,
    onClose,
    resetPointsClassId,
    setResetPointsClassId,
    classesList,
    handleBatchResetPoints,
    resettingPoints
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Reset Poin Semester Baru"
            size="sm"
        >
            <div className="space-y-5">
                <div className="p-4 bg-orange-500/10 rounded-[1.5rem] border border-orange-500/20">
                    <FontAwesomeIcon icon={faRotateLeft} className="text-orange-500 text-2xl mb-2" />
                    <p className="text-sm font-bold text-[var(--color-text)]">Set semua poin ke 0 untuk semester/tahun ajaran baru.</p>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Pilih Kelas (kosongkan untuk semua kelas)</label>
                    <select
                        value={resetPointsClassId}
                        onChange={e => setResetPointsClassId(e.target.value)}
                        className="select-field text-sm py-2.5 w-full rounded-xl border-[var(--color-border)] bg-transparent font-bold"
                    >
                        <option value="">Semua Kelas</option>
                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[11px] text-red-600 font-bold">
                    ⚠ Tindakan ini tidak bisa dibatalkan. Semua poin akan direset ke 0.
                </div>
                <div className="flex gap-3">
                    <button onClick={onClose} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl">Batal</button>
                    <button onClick={handleBatchResetPoints} disabled={resettingPoints}
                        className="btn bg-orange-500 hover:bg-orange-600 text-white flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                        {resettingPoints ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Reset Poin'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
