import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTags, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function BulkTagModal({
    isOpen,
    onClose,
    selectedStudentIds,
    bulkTagAction,
    setBulkTagAction,
    allUsedTags,
    getTagColor,
    handleToggleBulkTag
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Aksi Label Massal — ${selectedStudentIds.length} Siswa`}
            size="sm"
        >
            <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-500 text-xl">
                        <FontAwesomeIcon icon={faTags} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60">Pengaturan Label</p>
                        <p className="text-xs font-bold text-[var(--color-text)]">Kelola label untuk banyak siswa sekaligus.</p>
                    </div>
                </div>

                <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                    <button
                        onClick={() => setBulkTagAction('add')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${bulkTagAction === 'add' ? 'bg-white text-indigo-600 shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        Tambah Label
                    </button>
                    <button
                        onClick={() => setBulkTagAction('remove')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${bulkTagAction === 'remove' ? 'bg-white text-red-600 shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        Hapus Label
                    </button>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Pilih Label</label>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-auto p-1 scrollbar-none">
                        {allUsedTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => handleToggleBulkTag(tag)}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500 transition-all active:scale-95"
                            >
                                <span className="text-[11px] font-bold flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${getTagColor(tag).split(' ')[0]}`} />
                                    {tag}
                                </span>
                                <FontAwesomeIcon
                                    icon={bulkTagAction === 'add' ? faPlus : faTrash}
                                    className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ${bulkTagAction === 'add' ? 'text-indigo-500' : 'text-red-500'}`}
                                />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
                        {bulkTagAction === 'add'
                            ? `* Memilih label akan MENAMBAHKAN label tersebut ke SEMUA (${selectedStudentIds.length}) siswa yang Anda pilih.`
                            : `* Memilih label akan MENGHAPUS label tersebut dari SEMUA (${selectedStudentIds.length}) siswa yang memiliki label itu.`}
                    </p>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--color-border)] transition-all"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </Modal>
    )
}
