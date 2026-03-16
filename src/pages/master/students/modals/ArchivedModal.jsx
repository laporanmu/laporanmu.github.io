import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faBoxArchive, faSpinner, faRotateLeft, faTrash, faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function ArchivedModal({
    isOpen,
    onClose,
    archivedStudents,
    loadingArchived,
    archivePage,
    setArchivePage,
    archivePageSize,
    formatRelativeDate,
    handleRestoreStudent,
    handlePermanentDelete
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Arsip Siswa"
            size="lg"
        >
            <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                    <FontAwesomeIcon icon={faBoxArchive} className="text-amber-600 text-lg shrink-0" />
                    <div>
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400">{archivedStudents.length} siswa di arsip</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Pulihkan untuk mengembalikan ke daftar aktif, atau hapus permanen.</p>
                    </div>
                </div>

                {loadingArchived ? (
                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" /> Memuat arsip...
                    </div>
                ) : archivedStudents.length === 0 ? (
                    <div className="text-center py-10 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faBoxArchive} className="text-3xl opacity-20 mb-2 block" />
                        <p className="text-sm font-bold">Arsip kosong</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="px-4 py-3">Siswa</th>
                                        <th className="px-4 py-3 text-center">Kelas</th>
                                        <th className="px-4 py-3 text-center">Diarsipkan</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {archivedStudents.slice((archivePage - 1) * archivePageSize, archivePage * archivePageSize).map(s => (
                                        <tr key={s.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40">
                                            <td className="px-4 py-3">
                                                <p className="font-bold text-[var(--color-text)]">{s.name}</p>
                                                <p className="text-[10px] font-mono text-[var(--color-text-muted)]">{s.registration_code}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20">{s.className}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
                                                {formatRelativeDate(s.deleted_at)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleRestoreStudent(s)}
                                                        className="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                    >
                                                        <FontAwesomeIcon icon={faRotateLeft} />
                                                        Pulihkan
                                                    </button>
                                                    <button
                                                        onClick={() => handlePermanentDelete(s)}
                                                        className="h-8 px-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Arsip */}
                        {archivedStudents.length > archivePageSize && (
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                    Halaman {archivePage} dari {Math.ceil(archivedStudents.length / archivePageSize)}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        disabled={archivePage === 1}
                                        onClick={() => setArchivePage(p => p - 1)}
                                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                    </button>
                                    <button
                                        disabled={archivePage >= Math.ceil(archivedStudents.length / archivePageSize)}
                                        onClick={() => setArchivePage(p => p + 1)}
                                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end">
                    <button onClick={onClose} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                        Tutup
                    </button>
                </div>
            </div>
        </Modal>
    )
}
