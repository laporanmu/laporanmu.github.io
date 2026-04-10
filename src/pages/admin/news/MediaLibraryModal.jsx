import { useState, useEffect, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
    faImage, faSearch, faSpinner, faXmark, 
    faCheck, faCloudArrowUp, faTrash, faFilter,
    faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../../context/ToastContext'

const MediaLibraryModal = memo(({ isOpen, onClose, onSelect, currentSelection }) => {
    const { addToast } = useToast()
    const [images, setImages] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all') // all | thumbnails | content
    const [uploading, setUploading] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, img: null, isDeleting: false })

    const fetchMedia = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch from thumbnails folder
            const { data: thumbData, error: thumbErr } = await supabase.storage.from('news').list('thumbnails', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            })
            
            // Fetch from content folder
            const { data: contentData, error: contentErr } = await supabase.storage.from('news').list('content', {
                limit: 100,
                sortBy: { column: 'created_at', order: 'desc' }
            })

            if (thumbErr || contentErr) throw new Error('Gagal memuat galeri')

            const mappedThumbs = (thumbData || []).map(f => ({
                id: f.id,
                name: f.name,
                type: 'thumbnails',
                url: supabase.storage.from('news').getPublicUrl(`thumbnails/${f.name}`).data.publicUrl,
                created_at: f.created_at
            }))

            const mappedContent = (contentData || []).map(f => ({
                id: f.id,
                name: f.name,
                type: 'content',
                url: supabase.storage.from('news').getPublicUrl(`content/${f.name}`).data.publicUrl,
                created_at: f.created_at
            }))

            setImages([...mappedThumbs, ...mappedContent].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)))
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        if (isOpen) fetchMedia()
    }, [isOpen, fetchMedia])

    const handleUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 5 * 1024 * 1024) return addToast('Maks 5MB', 'error')

        setUploading(true)
        const ext = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
        
        const { error } = await supabase.storage.from('news').upload(`thumbnails/${fileName}`, file)
        
        if (error) {
            addToast('Upload gagal: ' + error.message, 'error')
        } else {
            addToast('Gambar berhasil diunggah', 'success')
            fetchMedia()
        }
        setUploading(false)
    }

    const handleDelete = async () => {
        if (!deleteConfirm.img) return
        setDeleteConfirm(prev => ({ ...prev, isDeleting: true }))

        try {
            const filePath = `${deleteConfirm.img.type}/${deleteConfirm.img.name}`
            const { data, error } = await supabase.storage.from('news').remove([filePath])
            
            if (error) throw error
            
            // Cek apakah ada file yang benar-benar terhapus
            if (!data || data.length === 0) {
                throw new Error('Gagal menghapus: File tidak ditemukan atau Anda tidak memiliki izin (periksa RLS Policy di Supabase).')
            }

            setImages(prev => prev.filter(i => !(i.name === deleteConfirm.img.name && i.type === deleteConfirm.img.type)))
            addToast('Gambar berhasil dihapus permanen', 'success')
            setDeleteConfirm({ isOpen: false, img: null, isDeleting: false })
        } catch (err) {
            addToast(err.message, 'error')
            setDeleteConfirm(prev => ({ ...prev, isDeleting: false }))
        }
    }

    const filteredImages = images.filter(img => {
        const matchesSearch = img.name.toLowerCase().includes(search.toLowerCase())
        const matchesFilter = filter === 'all' || img.type === filter
        return matchesSearch && matchesFilter
    })

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-5xl bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between shrink-0 bg-[var(--color-surface-alt)]/30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xl">
                            <FontAwesomeIcon icon={faImage} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight">Media Library</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">Kelola & Pilih Aset Visual Informasi</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <label className={`h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--color-primary)]/20 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                            {uploading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCloudArrowUp} />}
                            {uploading ? 'Uploading...' : 'Upload Baru'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
                        </label>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-500 transition-colors">
                            <FontAwesomeIcon icon={faXmark} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-4 border-b border-[var(--color-border)] flex flex-col sm:flex-row items-center gap-4 bg-[var(--color-surface-alt)]/10 shrink-0">
                    <div className="relative flex-1 group w-full">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Cari file berdasarkan nama..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full h-11 pl-12 pr-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl shrink-0 w-full sm:w-auto">
                        {[
                            { id: 'all', label: 'Semua' },
                            { id: 'thumbnails', label: 'Thumbs' },
                            { id: 'content', label: 'Content' }
                        ].map(t => (
                            <button 
                                key={t.id}
                                onClick={() => setFilter(t.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === t.id ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-[var(--color-surface)]">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faSpinner} className="text-4xl animate-spin text-[var(--color-primary)]" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Memuat Library...</p>
                        </div>
                    ) : filteredImages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-[var(--color-text-muted)] opacity-40">
                            <FontAwesomeIcon icon={faImage} size="5x" />
                            <p className="font-bold text-center">Belum ada gambar {search ? 'yang cocok' : 'di folder ini'}.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredImages.map(img => (
                                <div 
                                    key={img.url}
                                    onClick={() => onSelect(img.url)}
                                    className={`group relative aspect-square rounded-2xl border-2 overflow-hidden cursor-pointer transition-all duration-300 ${currentSelection === img.url ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}
                                >
                                    <img src={img.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={img.name} />
                                    
                                    {/* Overlay on hover/select */}
                                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentSelection === img.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white shadow-xl transform transition-transform ${currentSelection === img.url ? 'bg-[var(--color-primary)] scale-100' : 'bg-white/20 backdrop-blur-md scale-75 group-hover:scale-100'}`}>
                                            <FontAwesomeIcon icon={faCheck} />
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setDeleteConfirm({ isOpen: true, img, isDeleting: false })
                                        }}
                                        className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg active:scale-95"
                                        title="Hapus aset dari server"
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                    </button>

                                    {/* Type Badge */}
                                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-tighter opacity-70">
                                        {img.type}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Selection Info */}
                <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between shrink-0">
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] italic">
                        * Pilih gambar untuk menjadikannya thumbnail berita.
                    </p>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="px-6 py-2.5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">Tutup</button>
                    </div>
                </div>

                {/* Custom Delete Confirmation Overlay */}
                {deleteConfirm.isOpen && (
                    <div className="absolute inset-0 z-[11000] flex items-center justify-center p-6 bg-black/10 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="w-full max-w-sm bg-[var(--color-surface)] rounded-[2rem] border border-[var(--color-border)] shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-2xl mx-auto mb-6">
                                <FontAwesomeIcon icon={faTrash} />
                            </div>
                            <h3 className="text-lg font-black text-[var(--color-text)] text-center mb-2">Hapus Aset Permanen?</h3>
                            <p className="text-xs text-[var(--color-text-muted)] text-center mb-8 leading-relaxed">
                                File <span className="text-[var(--color-text)] font-black">"{deleteConfirm.img?.name}"</span> akan dihapus selamanya dari server. Berita yang menggunakan gambar ini mungkin akan mengalami error.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setDeleteConfirm({ isOpen: false, img: null, isDeleting: false })}
                                    disabled={deleteConfirm.isDeleting}
                                    className="h-12 rounded-xl border border-[var(--color-border)] text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors disabled:opacity-50"
                                >
                                    Batal
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    disabled={deleteConfirm.isDeleting}
                                    className="h-12 rounded-xl bg-rose-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {deleteConfirm.isDeleting ? (
                                        <>
                                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                            Menghapus...
                                        </>
                                    ) : 'Ya, Hapus'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    )
})

MediaLibraryModal.displayName = 'MediaLibraryModal'
export default MediaLibraryModal
