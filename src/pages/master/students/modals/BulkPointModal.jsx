import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBolt, faSpinner, faCircleExclamation } from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function BulkPointModal({
    isOpen,
    onClose,
    selectedStudentIds,
    bulkPointValue,
    setBulkPointValue,
    bulkPointLabel,
    setBulkPointLabel,
    handleBulkPointUpdate,
    submitting
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Aksi Poin Massal — ${selectedStudentIds.length} Siswa`}
            size="sm"
        >
            <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 text-xl">
                        <FontAwesomeIcon icon={faBolt} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/60">Input Poin Massal</p>
                        <p className="text-xs font-bold text-[var(--color-text)]">Berikan poin positif atau negatif ke seluruh siswa terpilih.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Jumlah Poin</label>
                        <div className="relative">
                            <input
                                type="number"
                                value={bulkPointValue}
                                onChange={e => setBulkPointValue(Number(e.target.value))}
                                placeholder="Contoh: 10 atau -10"
                                className="input-field w-full h-12 px-4 pr-24 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-lg font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                <button onClick={() => setBulkPointValue(10)} className="h-7 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[9px] font-black">+10</button>
                                <button onClick={() => setBulkPointValue(-10)} className="h-7 px-2 rounded-lg bg-red-500/10 text-red-600 text-[9px] font-black">-10</button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Alasan / Keterangan</label>
                        <input
                            type="text"
                            value={bulkPointLabel}
                            onChange={e => setBulkPointLabel(e.target.value)}
                            placeholder="Contoh: Hadiah Lomba Kebersihan"
                            className="input-field w-full h-11 px-4 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold"
                        />
                    </div>
                </div>

                <div className="flex p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 gap-3 items-start">
                    <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                        Poin akan ditambahkan ke total poin masing-masing siswa. Pastikan jumlah dan alasan sudah benar sebelum memproses.
                    </p>
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        onClick={onClose}
                        className="h-12 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-all"
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleBulkPointUpdate}
                        disabled={submitting || !bulkPointValue}
                        className="h-12 flex-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                    >
                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Proses Poin Massal'}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
