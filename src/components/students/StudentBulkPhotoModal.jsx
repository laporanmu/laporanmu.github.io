import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCamera, faCheck, faSpinner, faTrash } from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

export default function StudentBulkPhotoModal({
    isOpen,
    onClose,
    uploadingBulkPhotos,
    bulkPhotoMatches,
    handleBulkPhotoMatch,
    handleBulkPhotoUpload,
    setBulkPhotoMatches
}) {
    if (!isOpen) return null

    const [matchMethod, setMatchMethod] = React.useState('nisn')

    // Menghapus spesifik foto dari list preview (opsional jika foto salah cocok)
    const handleRemoveMatch = (index) => {
        setBulkPhotoMatches(prev => prev.filter((_, i) => i !== index))
    }

    const methods = [
        { id: 'nisn', label: 'NISN', desc: 'Contoh: 0012345.jpg' },
        { id: 'name', label: 'Nama', desc: 'Contoh: Ahmad Muazza.png' },
        { id: 'code', label: 'ID/Reg', desc: 'Contoh: REG-ABCD.jpg' },
    ]

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => { if (!uploadingBulkPhotos) onClose() }}
            title="Bulk Match Foto Siswa"
            description="Unggah banyak foto sekaligus. Sistem akan mencocokkan nama file dengan data siswa secara otomatis."
            icon={faCamera}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-600"
            size="lg"
            mobileVariant="bottom-sheet"
            footer={
                <div className="flex items-center w-full gap-3">
                    <button 
                        onClick={() => { if (!uploadingBulkPhotos) onClose() }} 
                        disabled={uploadingBulkPhotos}
                        className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center shrink-0"
                    >
                        {bulkPhotoMatches.length > 0 ? 'Batal' : 'Tutup'}
                    </button>

                    <div className="flex-1" />

                    {bulkPhotoMatches.length > 0 && (
                        <div className="flex items-center gap-3">
                            <p className="hidden md:block text-[10px] font-bold text-[var(--color-text-muted)] animate-in fade-in duration-500">
                                Siap simpan: <span className="text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">{bulkPhotoMatches.filter(m => m.status === 'matched').length}</span>
                            </p>
                            <button
                                onClick={handleBulkPhotoUpload}
                                disabled={uploadingBulkPhotos || bulkPhotoMatches.filter(m => m.status === 'matched').length === 0}
                                className="h-10 px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10"
                            >
                                {uploadingBulkPhotos ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengupload...</> : <><FontAwesomeIcon icon={faCheck} /> Simpan Foto</>}
                            </button>
                        </div>
                    )}
                </div>
            }
        >
            <div className="space-y-5">
                <div className="space-y-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-70">Metode Pencocokan</p>
                    <div className="flex p-1 bg-[var(--color-surface-alt)]/50 rounded-xl border border-[var(--color-border)]">
                        {methods.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setMatchMethod(m.id)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                ${matchMethod === m.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]'}
                                `}
                            >
                                <span className="truncate">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-8 border-2 border-dashed border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 flex flex-col items-center text-center group hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all cursor-pointer relative rounded-2xl overflow-hidden">
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => handleBulkPhotoMatch(e.target.files, matchMethod)}
                        disabled={uploadingBulkPhotos}
                    />
                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4 group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faCamera} className="text-2xl" />
                    </div>
                    <h4 className="text-sm font-black text-[var(--color-text)] mb-1">
                        {bulkPhotoMatches.length > 0 ? 'Tambah File Foto Lain' : 'Drag & Drop atau Pilih Foto Massal'}
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted)] max-w-xs transition-all">
                        Pastikan nama file foto menggunakan <b>{methods.find(m => m.id === matchMethod).label}</b> siswa ({methods.find(m => m.id === matchMethod).desc})
                    </p>
                </div>

                {bulkPhotoMatches.length > 0 && (
                    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)] shadow-sm">
                        <div className="max-h-[50vh] overflow-auto scrollbar-none relative">
                            <table className="w-full text-[11px]">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10 border-b border-[var(--color-border)] backdrop-blur-md">
                                    <tr className="text-left font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="p-3 w-16 text-center">Preview</th>
                                        <th className="p-3">Nama File</th>
                                        <th className="p-3">Siswa Cocok</th>
                                        <th className="p-3 text-center">Status</th>
                                        <th className="p-3 w-10 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {bulkPhotoMatches.map((item, i) => (
                                        <tr key={i} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors group">
                                            <td className="p-2 text-center">
                                                <img src={item.preview} className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shadow-sm mx-auto" alt="" />
                                            </td>
                                            <td className="p-3 font-medium opacity-70 truncate max-w-[120px]">{item.file.name}</td>
                                            <td className="p-3 font-bold text-[var(--color-text)] truncate max-w-[150px]">{item.studentName}</td>
                                            <td className="p-3 text-center">
                                                {item.status === 'matched' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black uppercase tracking-wider text-[8px] inline-flex items-center gap-1 border border-emerald-500/20">
                                                        Matched
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-black uppercase tracking-wider text-[8px] inline-flex items-center gap-1 border border-red-500/20">
                                                        Skipped
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handleRemoveMatch(i)}
                                                    disabled={uploadingBulkPhotos}
                                                    className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors opacity-50 group-hover:opacity-100 disabled:opacity-20 flex items-center justify-center mx-auto"
                                                    title="Hapus"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    )
}
