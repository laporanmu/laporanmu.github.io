import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faXmark, faEdit, faTrash, faCheck
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../../../../components/ui/Modal'

export function TagModal({
    isOpen,
    onClose,
    studentForTags,
    newTagInput,
    setNewTagInput,
    handleAddCustomTag,
    handleToggleTag,
    getTagColor,
    AvailableTags,
    allUsedTags,
    tagToEdit,
    setTagToEdit,
    renameInput,
    setRenameInput,
    handleGlobalRenameTag,
    handleGlobalDeleteTag
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Kelola Label — ${studentForTags?.name || ''}`}
            size="sm"
        >
            <div className="space-y-4">
                <p className="text-[10px] text-[var(--color-text-muted)] font-bold opacity-70">
                    Atur label siswa untuk segmentasi & filter
                </p>
                {studentForTags && (
                    <div className="space-y-6">
                        {/* Input Section */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tambah Label Baru</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={newTagInput}
                                    onChange={e => setNewTagInput(e.target.value)}
                                    onKeyDown={handleAddCustomTag}
                                    placeholder="Ketik lalu Tekan Enter..."
                                    className="w-full h-11 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 text-sm font-bold focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all outline-none"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-focus-within:block">
                                    <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded border border-white/20 text-[var(--color-text-muted)]">ENTER ↵</span>
                                </div>
                            </div>
                        </div>

                        {/* Active Tags Pool */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Label Saat Ini</label>
                                <span className="text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                                    {(studentForTags.tags || []).length} AKTIF
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-2xl bg-[var(--color-surface-alt)]/30 border border-dashed border-[var(--color-border)]">
                                {(studentForTags.tags || []).length === 0 ? (
                                    <p className="text-[10px] text-[var(--color-text-muted)] italic opacity-60 m-auto">Belum ada label terpilih</p>
                                ) : (
                                    (studentForTags.tags || []).map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => handleToggleTag(studentForTags, tag)}
                                            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${getTagColor(tag)}`}
                                        >
                                            {tag}
                                            <FontAwesomeIcon icon={faXmark} className="text-[9px] opacity-40 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Suggested Pool */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih dari Database / Edit Global</label>
                            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                                {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(tag => {
                                    const isActive = (studentForTags.tags || []).includes(tag);
                                    const isEditing = tagToEdit === tag;

                                    return (
                                        <div key={tag} className={`relative flex items-center transition-all ${isEditing ? 'w-full' : ''}`}>
                                            {isEditing ? (
                                                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={renameInput}
                                                        onChange={e => setRenameInput(e.target.value)}
                                                        className="flex-1 h-8 bg-white border border-[var(--color-primary)] rounded-lg px-3 text-xs font-bold outline-none shadow-lg shadow-[var(--color-primary)]/10"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleGlobalRenameTag(tag, renameInput)
                                                            if (e.key === 'Escape') setTagToEdit(null)
                                                        }}
                                                    />
                                                    <button onClick={() => handleGlobalRenameTag(tag, renameInput)} className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white text-[10px] shrink-0">
                                                        <FontAwesomeIcon icon={faCheck} />
                                                    </button>
                                                    <button onClick={() => setTagToEdit(null)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 text-[10px] shrink-0">
                                                        <FontAwesomeIcon icon={faXmark} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="group flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)]/30 transition-all">
                                                    <button
                                                        onClick={() => handleToggleTag(studentForTags, tag)}
                                                        className={`px-3 py-1.5 text-xs font-bold transition-all rounded-l-lg ${isActive
                                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        {tag}
                                                        {isActive && <FontAwesomeIcon icon={faCheck} className="ml-2 text-[10px]" />}
                                                    </button>

                                                    {/* Manage Actions on Hover */}
                                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity border-l border-[var(--color-border)] bg-white/50 backdrop-blur-sm rounded-r-lg">
                                                        <button
                                                            onClick={() => { setTagToEdit(tag); setRenameInput(tag) }}
                                                            className="w-7 h-7 flex items-center justify-center text-[10px] text-blue-500 hover:bg-blue-500/10"
                                                            title="Ganti Nama Global"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleGlobalDeleteTag(tag)}
                                                            className="w-7 h-7 flex items-center justify-center text-[10px] text-red-500 hover:bg-red-500/10"
                                                            title="Hapus Global"
                                                        >
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            <p className="text-[8px] text-[var(--color-text-muted)] mt-2 italic px-1">
                                * Gunakan ikon <FontAwesomeIcon icon={faEdit} className="text-blue-500 mx-0.5" /> dan <FontAwesomeIcon icon={faTrash} className="text-red-500 mx-0.5" /> untuk merubah nama atau menghapus label dari SEMUA siswa sekaligus.
                            </p>
                        </div>
                    </div>
                )}
                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="h-10 px-6 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all active:scale-95"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </Modal>
    )
}
