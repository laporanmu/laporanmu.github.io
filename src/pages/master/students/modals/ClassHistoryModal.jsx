import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faClockRotateLeft, faSpinner, faArrowRightArrowLeft
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function ClassHistoryModal({
    isOpen,
    onClose,
    selectedStudent,
    classHistory,
    loadingClassHistory,
    formatRelativeDate
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Riwayat Kelas — ${selectedStudent?.name || ''}`}
            size="md"
        >
            <div className="space-y-4">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center gap-3">
                    <FontAwesomeIcon icon={faClockRotateLeft} className="text-purple-500 text-lg shrink-0" />
                    <div>
                        <p className="text-xs font-black text-purple-600 dark:text-purple-400">Tracking perpindahan kelas</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Tercatat setiap kali siswa berpindah kelas.</p>
                    </div>
                </div>

                {loadingClassHistory ? (
                    <div className="text-center py-6 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" /> Memuat...
                    </div>
                ) : classHistory.length === 0 ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-3xl opacity-20 mb-2 block" />
                        <p className="text-sm font-bold">Belum ada riwayat perpindahan kelas</p>
                        <p className="text-[11px] mt-1 opacity-60">Siswa ini belum pernah berpindah kelas sejak terdaftar.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-72 overflow-auto scrollbar-none">
                        {classHistory.map((h, idx) => (
                            <div key={h.id || idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[11px]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <span className="text-[var(--color-text-muted)]">{h.from_class?.name || 'Tidak diketahui'}</span>
                                        <span className="text-[var(--color-text-muted)] opacity-50">→</span>
                                        <span className="text-[var(--color-text)]">{h.to_class?.name || 'Tidak diketahui'}</span>
                                    </div>
                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{h.note || '-'} · {formatRelativeDate(h.changed_at)}</p>
                                </div>
                                <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{new Date(h.changed_at).toLocaleDateString('id-ID')}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex justify-end pt-2">
                    <button onClick={onClose} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        Tutup
                    </button>
                </div>
            </div>
        </Modal>
    )
}
