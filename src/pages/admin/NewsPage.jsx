import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faNewspaper, faCalendar,
    faUser, faTag, faChevronDown, faPen,
    faTrash, faEye, faEyeSlash, faSpinner,
    faXmark, faCheck, faTriangleExclamation,
    faClock, faGlobe, faCloudArrowUp, faRobot
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

/* ───────────────────────────── Confirm Delete Modal ───────────────────────────── */
const ConfirmDeleteModal = memo(({ isOpen, onClose, onConfirm, title, isDeleting }) => {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] shadow-2xl p-6 overflow-hidden animate-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-2xl animate-bounce-subtle">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-[var(--color-text)] leading-tight">Hapus Berita?</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 font-medium leading-relaxed">
                            "{title}" akan dihapus permanen dari sistem dan tidak bisa dikembalikan.
                        </p>
                    </div>
                    <div className="flex w-full gap-3 pt-4">
                        <button
                            onClick={onClose}
                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-all"
                        >
                            Batal
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                        >
                            {isDeleting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
                            Hapus
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
})
ConfirmDeleteModal.displayName = 'ConfirmDeleteModal'

// ── Isolated Search Input (Pattern from StudentsPage) ─────────────────────────
const DebouncedSearchInput = memo(({ searchQuery, onSearch }) => {
    const [value, setValue] = useState(searchQuery)

    useEffect(() => {
        const t = setTimeout(() => onSearch(value), 350)
        return () => clearTimeout(t)
    }, [value])

    useEffect(() => {
        if (searchQuery === '' && value !== '') setValue('')
    }, [searchQuery])

    return (
        <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                <FontAwesomeIcon icon={faSearch} />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Cari judul berita atau kategori..."
                className="input-field pl-10 w-full h-10 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-2xl"
            />
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

/* ───────────────────────────── Modal Berita ───────────────────────────── */
import Modal from '../../components/ui/Modal'

const NewsModal = function NewsModal({ isOpen, onClose, news, onSave, isSaving }) {
    // Initialize form directly from news prop
    // This works perfectly combined with the 'key' prop on the component
    const [form, setForm] = useState({
        title: news?.title || '',
        content: news?.content || '',
        tag: news?.tag || 'Berita',
        image_url: news?.image_url || '',
        is_published: news?.is_published ?? true,
        scheduled_at: news?.scheduled_at ? new Date(news.scheduled_at).toISOString().slice(0, 16) : '',
        meta_title: news?.meta_title || '',
        meta_description: news?.meta_description || ''
    })

    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(news?.image_url || null)
    const fileInputRef = useRef(null)

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            setImageFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result)
            reader.readAsDataURL(file)
        }
    }

    // Reset form only when modal opens/closes to handle 'Add New' case
    // but the 'key' prop in parent actually handles most of the reset logic

    const handleSubmit = async (e) => {
        e.preventDefault()
        onSave(form, imageFile)
    }

    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={news ? 'Edit Berita' : 'Tambah Berita Baru'}
            size="xl"
        >
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[90vh] sm:max-h-[660px] overflow-hidden relative">
                <style>{`
                    .quill-modern .ql-toolbar.ql-snow {
                        border: 1px solid var(--color-border) !important;
                        border-top-left-radius: 20px;
                        border-top-right-radius: 20px;
                        background: var(--color-surface-alt);
                        padding: 10px 14px;
                        border-bottom: none !important;
                    }
                    .quill-modern .ql-container.ql-snow {
                        border: 1px solid var(--color-border) !important;
                        border-bottom-left-radius: 20px;
                        border-bottom-right-radius: 20px;
                        font-family: inherit;
                        background: rgba(var(--color-surface-alt-rgb), 0.05);
                        min-height: 160px;
                        max-height: 240px;
                        overflow-y: auto;
                    }
                    .quill-modern .ql-editor {
                        font-size: 14px;
                        font-weight: 500;
                        color: var(--color-text);
                        padding: 16px 20px;
                        line-height: 1.8;
                    }
                    .quill-modern .ql-editor.ql-blank::before {
                        color: var(--color-text-muted);
                        font-style: normal;
                        opacity: 0.4;
                        font-size: 13px;
                        left: 20px;
                    }
                    .quill-modern .ql-stroke {
                        stroke: var(--color-text-muted) !important;
                    }
                    .quill-modern .ql-fill {
                        fill: var(--color-text-muted) !important;
                    }
                    .quill-modern .ql-picker {
                        color: var(--color-text-muted) !important;
                    }
                    .quill-modern .ql-active .ql-stroke,
                    .quill-modern .ql-active .ql-fill,
                    .quill-modern .ql-active .ql-picker {
                        stroke: var(--color-primary) !important;
                        color: var(--color-primary) !important;
                    }
                    .input-premium {
                        background: var(--color-surface-alt);
                        border: 1px solid var(--color-border);
                        border-radius: 16px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .input-premium:focus {
                        background: var(--color-surface);
                        border-color: var(--color-primary);
                        box-shadow: 0 0 0 4px rgba(var(--color-primary-rgb), 0.1);
                    }
                `}</style>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-1 -mr-1 custom-scrollbar pb-2 px-1">
                    <div className="space-y-6 py-2">
                        {/* ── Main Content Section ── */}
                        <div className="space-y-6">
                            {/* Judul Berita */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 opacity-60 group-focus-within:text-[var(--color-primary)] group-focus-within:opacity-100 transition-all">
                                    <FontAwesomeIcon icon={faNewspaper} className="text-[8px]" />
                                    Judul Berita <span className="text-red-500 font-bold">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    placeholder="Tulis judul berita yang menarik..."
                                    className="w-full px-5 h-12 input-premium text-sm font-bold placeholder:font-medium placeholder:opacity-30"
                                />
                            </div>

                            {/* Kategori Berita */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 opacity-60 group-focus-within:text-[var(--color-primary)] group-focus-within:opacity-100 transition-all">
                                    <FontAwesomeIcon icon={faTag} className="text-[8px]" />
                                    Kategori
                                </label>
                                <div className="relative max-w-sm">
                                    <select
                                        value={form.tag}
                                        onChange={e => setForm({ ...form, tag: e.target.value })}
                                        className="w-full px-4 h-11 input-premium text-xs font-bold appearance-none cursor-pointer pr-10"
                                    >
                                        <option value="Berita">Berita Umum</option>
                                        <option value="Kegiatan">Kegiatan Siswa</option>
                                        <option value="Prestasi">Prestasi</option>
                                        <option value="Pengumuman">Pengumuman</option>
                                    </select>
                                    <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] opacity-30 pointer-events-none" />
                                </div>
                            </div>

                            {/* Rich Text Editor */}
                            <div className="group">
                                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] mb-2 ml-1 opacity-60 group-focus-within:text-[var(--color-primary)] group-focus-within:opacity-100 transition-all">
                                    <FontAwesomeIcon icon={faPen} className="text-[8px]" />
                                    Isi Berita Lengkap <span className="text-red-500 font-bold">*</span>
                                </label>
                                <div className="quill-modern transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-[var(--color-primary)]/5 rounded-[20px]">
                                    <ReactQuill
                                        theme="snow"
                                        value={form.content}
                                        onChange={val => setForm({ ...form, content: val })}
                                        placeholder="Ceritakan detail berita secara lengkap di sini..."
                                        style={{ height: '280px', marginBottom: '10px' }}
                                        modules={{
                                            toolbar: [
                                                ['bold', 'italic', 'underline'],
                                                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                ['link', 'clean']
                                            ],
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Settings Grid Section (Bottom) ── */}
                        <div className="pt-2 border-t border-[var(--color-border)]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 opacity-40">Pengaturan Tambahan</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Thumbnail Column */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                                        <FontAwesomeIcon icon={faCloudArrowUp} /> Thumbnail Utama
                                    </label>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="relative h-36 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden group/upload cursor-pointer hover:border-[var(--color-primary)]/50 transition-all"
                                    >
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <span className="px-3 py-1.5 rounded-lg bg-white text-black text-[8px] font-black uppercase">Ganti</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)] opacity-40 group-hover/upload:opacity-100 group-hover/upload:text-[var(--color-primary)] transition-all">
                                                <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Upload Foto</span>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleImageChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                </div>

                                {/* SEO Column */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                                        <FontAwesomeIcon icon={faGlobe} /> SEO Metadata
                                    </label>
                                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 space-y-3">
                                        <input
                                            type="text"
                                            value={form.meta_title}
                                            onChange={e => setForm({ ...form, meta_title: e.target.value })}
                                            placeholder="Meta Title"
                                            className="w-full px-3 h-8 bg-white border border-[var(--color-border)] rounded-lg text-[10px] font-bold focus:border-[var(--color-primary)] outline-none"
                                        />
                                        <textarea
                                            value={form.meta_description}
                                            onChange={e => setForm({ ...form, meta_description: e.target.value })}
                                            placeholder="Meta Description..."
                                            className="w-full px-3 py-2 min-h-[60px] bg-white border border-[var(--color-border)] rounded-lg text-[10px] focus:border-[var(--color-primary)] outline-none resize-none leading-normal"
                                        />
                                    </div>
                                </div>

                                {/* Publishing Column */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60">
                                        <FontAwesomeIcon icon={faClock} /> Status & Jadwal
                                    </label>
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                            <input
                                                type="datetime-local"
                                                value={form.scheduled_at}
                                                onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                                                className="w-full bg-transparent text-[10px] font-black text-[var(--color-text)] outline-none cursor-pointer uppercase"
                                            />
                                        </div>
                                        <label className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] cursor-pointer group hover:border-[var(--color-primary)]/50 transition-all">
                                            <input
                                                type="checkbox"
                                                checked={form.is_published}
                                                onChange={e => setForm({ ...form, is_published: e.target.checked })}
                                                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] transition-all cursor-pointer"
                                            />
                                            <div className="flex-1">
                                                <p className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-wider">Publish Berita</p>
                                                <p className="text-[8px] text-[var(--color-text-muted)] opacity-60">Tampilkan ke publik sekarang.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-5 shrink-0 border-t border-[var(--color-border)] mt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-12 px-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] text-[11px] font-black uppercase tracking-[0.15em] active:scale-95 transition-all outline-none"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving || !form.title.trim() || !form.content.trim()}
                        className="h-12 px-12 rounded-2xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-[0.15em] hover:brightness-110 hover:shadow-xl hover:shadow-[var(--color-primary)]/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                        {news ? 'Simpan Perubahan' : 'Terbitkan Berita'}
                    </button>
                </div>
            </form>
        </Modal>
    )
}

/* ───────────────────────────── News Management Page ───────────────────────────── */
export default function AdminNewsPage() {
    const { addToast } = useToast()
    const [newsList, setNewsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [modalData, setModalData] = useState({ isOpen: false, current: null })
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, data: null, isDeleting: false })

    const fetchNews = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) addToast('Gagal memuat berita: ' + error.message, 'error')
        else setNewsList(data || [])
        setLoading(false)
    }, [addToast])

    useEffect(() => { fetchNews() }, [fetchNews])

    const handleSave = async (form, file) => {
        setIsSaving(true)
        const user = (await supabase.auth.getUser()).data.user

        let imageUrl = form.image_url

        // Handle Image Upload to Supabase Storage
        if (file) {
            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `thumbnails/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('news')
                .upload(filePath, file)

            if (uploadError) {
                addToast('Upload gagal: ' + uploadError.message, 'error')
                setIsSaving(false)
                return
            }

            const { data: { publicUrl } } = supabase.storage
                .from('news')
                .getPublicUrl(filePath)

            imageUrl = publicUrl
        }

        const payload = {
            title: form.title,
            content: form.content,
            tag: form.tag,
            image_url: imageUrl,
            is_published: form.is_published,
            scheduled_at: form.scheduled_at || null,
            meta_title: form.meta_title,
            meta_description: form.meta_description,
            author: user?.email || 'Admin',
            updated_at: new Date().toISOString()
        }

        let error, data
        if (modalData.current) {
            const { data: updatedData, error: err } = await supabase
                .from('news')
                .update(payload)
                .eq('id', modalData.current.id)
                .select() // Tambahin .select() biar tau apa aja yang sukses
            error = err
            data = updatedData
        } else {
            const { data: insertedData, error: err } = await supabase
                .from('news')
                .insert([payload])
                .select()
            error = err
            data = insertedData
        }

        setIsSaving(false)
        if (error) {
            console.error('Supabase Error:', error)
            addToast('Error: ' + error.message, 'error')
        } else if (!data || data.length === 0) {
            // Jika data kosong tapi tak ada error, biasanya RLS yang nge-block
            console.warn('Update successful but NO ROWS AFFECTED. Check RLS Policies!')
            addToast('Gagal menyimpan (Cek RLS Database)', 'error')
        } else {
            console.log('Save Success:', data[0])
            addToast(modalData.current ? 'Berita diperbarui' : 'Berita ditambahkan', 'success')
            setModalData({ isOpen: false, current: null })
            await fetchNews()
        }
    }

    const handleDelete = async () => {
        if (!deleteModal.data) return
        setDeleteModal(p => ({ ...p, isDeleting: true }))

        const { error } = await supabase.from('news').delete().eq('id', deleteModal.data.id)

        setDeleteModal(p => ({ ...p, isDeleting: false, isOpen: false, data: null }))

        if (error) {
            addToast('Gagal hapus: ' + error.message, 'error')
        } else {
            addToast('Berita telah dihapus', 'success')
            fetchNews()
        }
    }

    const handleToggleStatus = async (item) => {
        const { data, error } = await supabase
            .from('news')
            .update({ is_published: !item.is_published })
            .eq('id', item.id)
            .select()

        if (error) {
            addToast('Gagal update status: ' + error.message, 'error')
        } else if (!data || data.length === 0) {
            addToast('Gagal update status (Cek RLS)', 'error')
        } else {
            addToast(`Berita ${!item.is_published ? 'dipublikasikan' : 'diarsipkan'}`, 'success')
            fetchNews()
        }
    }

    const filteredNews = newsList.filter(n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.tag.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <DashboardLayout title="News Management">
            <div className="p-4 md:p-6 space-y-6 max-w-[1200px] mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['CMS Management']} className="mb-2" />
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">
                                Manajemen Berita
                            </h1>
                        </div>
                        <p className="text-[12px] text-[var(--color-text-muted)] font-medium">
                            Kelola konten berita dan pengumuman untuk Landing Page.
                        </p>
                    </div>
                    <button
                        onClick={() => setModalData({ isOpen: true, current: null })}
                        className="h-11 px-6 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Tambah Berita
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <DebouncedSearchInput
                        searchQuery={search}
                        onSearch={setSearch}
                    />
                    <div className="hidden sm:flex items-center gap-2 px-4 h-10 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faNewspaper} className="text-[10px]" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {filteredNews.length} Berita
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-64 rounded-3xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                        ))}
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-[3rem] py-20 flex flex-col items-center text-center px-4">
                        <div className="w-20 h-20 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center mb-6">
                            <FontAwesomeIcon icon={faNewspaper} className="text-3xl text-[var(--color-text-muted)]" />
                        </div>
                        <h3 className="text-lg font-black text-[var(--color-text)]">Belum ada berita</h3>
                        <p className="text-[12px] text-[var(--color-text-muted)] mt-1 max-w-xs">
                            {search ? 'Tidak ada berita yang cocok dengan pencarian Anda.' : 'Mulai tulis berita pertama untuk memberikan informasi kepada sekolah.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNews.map((news) => (
                            <div key={news.id} className="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2.5rem] overflow-hidden hover:shadow-2xl hover:shadow-[var(--color-primary)]/5 transition-all duration-300">
                                {/* Thumbnail Area */}
                                <div className="h-44 bg-[var(--color-surface-alt)] relative overflow-hidden">
                                    {news.image_url ? (
                                        <img src={news.image_url} alt={news.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-20">
                                            <FontAwesomeIcon icon={faNewspaper} className="text-5xl" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] shadow-sm">
                                            {news.tag}
                                        </span>
                                    </div>
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                        <button
                                            onClick={() => handleToggleStatus(news)}
                                            className={`w-9 h-9 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg transition-all border duration-300 ${news.is_published
                                                ? 'bg-white/90 border-emerald-500/20 text-emerald-600 hover:bg-emerald-50'
                                                : 'bg-white/60 border-rose-500/10 text-rose-400 hover:bg-rose-50'
                                                }`}
                                            title={news.is_published ? 'Klik untuk Arsipkan' : 'Klik untuk Publikasikan'}
                                        >
                                            <FontAwesomeIcon icon={news.is_published ? faEye : faEyeSlash} className="text-xs" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest mb-4">
                                        <span className="flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faCalendar} className="text-[var(--color-primary)]" />
                                            {new Date(news.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faUser} className="text-[var(--color-primary)]" />
                                            {news.author?.split('@')[0]}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-[var(--color-text)] leading-tight mb-4 line-clamp-2">
                                        {news.title}
                                    </h3>

                                    <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border)]">
                                        <button
                                            onClick={() => setModalData({ isOpen: true, current: news })}
                                            className="flex-1 h-10 rounded-xl bg-[var(--color-surface-alt)] font-bold text-xs hover:bg-[var(--color-primary)] hover:text-white transition-all"
                                        >
                                            <FontAwesomeIcon icon={faPen} className="mr-2" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => setDeleteModal({ isOpen: true, data: news, isDeleting: false })}
                                            className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <NewsModal
                    key={modalData.current?.id || (modalData.isOpen ? 'new' : 'none')}
                    isOpen={modalData.isOpen}
                    onClose={() => setModalData({ isOpen: false, current: null })}
                    news={modalData.current}
                    onSave={handleSave}
                    isSaving={isSaving}
                />
                <ConfirmDeleteModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, data: null, isDeleting: false })}
                    onConfirm={handleDelete}
                    title={deleteModal.data?.title}
                    isDeleting={deleteModal.isDeleting}
                />
            </div>
        </DashboardLayout>
    )
}
