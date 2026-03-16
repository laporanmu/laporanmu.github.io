import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faCamera, faSpinner, faCheck
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function BulkPhotoModal({
    isOpen,
    onClose,
    matchingPhotos,
    handleBulkPhotoMatch,
    bulkPhotoMatches,
    uploadingBulkPhotos,
    handleBulkPhotoUpload
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sultan Bulk Photo Matcher"
            size="lg"
        >
            <div className="space-y-6">
                <div className="p-8 rounded-3xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col items-center justify-center text-center group hover:border-[var(--color-primary)] transition-all">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faCamera} />
                    </div>
                    <h4 className="text-sm font-black text-[var(--color-text)] mb-1">Upload Koleksi Foto</h4>
                    <p className="text-[10px] text-[var(--color-text-muted)] font-bold max-w-xs mb-6">Sistem akan mencocokkan nama file dengan Nama, NISN, atau ID Siswa secara otomatis.</p>
                    
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleBulkPhotoMatch(e.target.files)}
                        className="hidden"
                        id="bulk-photo-input"
                    />
                    <label
                        htmlFor="bulk-photo-input"
                        className="h-11 px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all cursor-pointer flex items-center gap-2"
                    >
                        {matchingPhotos ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : "Pilih File Foto"}
                    </label>
                </div>

                {bulkPhotoMatches.length > 0 && (
                    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <div className="max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-none">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                    <tr className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                        <th className="p-3">Preview</th>
                                        <th className="p-3">File Name</th>
                                        <th className="p-3">Student Match</th>
                                        <th className="p-3 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bulkPhotoMatches.map((item, idx) => (
                                        <tr key={idx} className="border-b border-[var(--color-border)] bg-[var(--color-surface)]/50">
                                            <td className="p-3">
                                                <img src={item.preview} className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shadow-sm" alt="" />
                                            </td>
                                            <td className="p-3 font-medium opacity-70">{item.file.name}</td>
                                            <td className="p-3 font-bold text-[var(--color-text)]">{item.studentName}</td>
                                            <td className="p-3 text-right">
                                                {item.status === 'matched' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black uppercase text-[8px]">Matched</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-black uppercase text-[8px]">Skipped</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-3 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between">
                            <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                Ditemukan <span className="text-emerald-600 font-black">{bulkPhotoMatches.filter(m => m.status === 'matched').length}</span> foto cocok.
                            </p>
                            <button
                                onClick={handleBulkPhotoUpload}
                                disabled={uploadingBulkPhotos || bulkPhotoMatches.filter(m => m.status === 'matched').length === 0}
                                className="h-9 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {uploadingBulkPhotos ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengupload...</> : <><FontAwesomeIcon icon={faCheck} /> Simpan Semua Foto</>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
