import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faNewspaper, faCalendar,
    faUser, faTag, faChevronDown, faPen,
    faTrash, faEye, faEyeSlash, faSpinner,
    faXmark, faCheck, faTriangleExclamation,
    faClock, faGlobe, faCloudArrowUp, faCopy,
    faStar, faFilter, faSort, faChevronLeft,
    faChevronRight, faCheckSquare, faSquare,
    faBookOpen, faHashtag, faAlignLeft, faImage,
    faArrowUpRightFromSquare, faArchive, faRotateLeft,
    faTags, faUserPen, faMagicWandSparkles
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

// ─── Helpers ────────────────────────────────────────────────────────────────────

const slugify = (text) =>
    text.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80)

const getReadTime = (html) => {
    const text = html.replace(/<[^>]*>/g, ' ')
    const words = text.trim().split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.ceil(words / 200))
}

const decodeEntities = (html = '') => html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const getExcerpt = (html, maxLen = 160) => {
    const text = decodeEntities(html)
    return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text
}

const SEO_LIMITS = { title: [50, 60], desc: [150, 160] }

const SeoScore = ({ value, min, max }) => {
    const len = value?.length || 0
    const ok = len >= min && len <= max
    const warn = len > 0 && (len < min * 0.7 || len > max * 1.1)
    const color = len === 0 ? 'text-[var(--color-text-muted)] opacity-40'
        : ok ? 'text-emerald-500' : warn ? 'text-amber-500' : 'text-rose-500'
    return (
        <span className={`text-[8px] font-black tabular-nums ${color}`}>
            {len}/{max}
        </span>
    )
}

const PAGE_SIZE = 12

// ─── Confirm Delete Modal ────────────────────────────────────────────────────────

const ConfirmDeleteModal = memo(({ isOpen, onClose, onConfirm, title, isDeleting }) => {
    if (!isOpen) return null
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-2xl">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-[var(--color-text)]">Hapus Informasi?</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 font-medium leading-relaxed">
                            "<span className="font-black">{title}</span>" akan dihapus permanen dan tidak bisa dikembalikan.
                        </p>
                    </div>
                    <div className="flex w-full gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-colors">
                            Batal
                        </button>
                        <button onClick={onConfirm} disabled={isDeleting} className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {isDeleting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faTrash} />}
                            Hapus Permanen
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
})
ConfirmDeleteModal.displayName = 'ConfirmDeleteModal'

// ─── Debounced Search ────────────────────────────────────────────────────────────

const DebouncedSearchInput = memo(({ searchQuery, onSearch }) => {
    const [value, setValue] = useState(searchQuery)
    useEffect(() => {
        const t = setTimeout(() => onSearch(value), 350)
        return () => clearTimeout(t)
    }, [value])
    useEffect(() => { if (searchQuery === '' && value !== '') setValue('') }, [searchQuery])
    return (
        <div className="flex-1 relative min-w-0">
            <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs pointer-events-none" />
            <input
                type="text" value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Cari judul, kategori, atau penulis..."
                className="w-full pl-10 pr-4 h-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/20 text-xs font-medium outline-none transition-all"
            />
            {value && (
                <button onClick={() => { setValue(''); onSearch('') }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                    <FontAwesomeIcon icon={faXmark} className="text-xs" />
                </button>
            )}
        </div>
    )
})
DebouncedSearchInput.displayName = 'DebouncedSearchInput'

// ─── Skeletons ──────────────────────────────────────────────────────────────────

const NewsSkeleton = () => (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] overflow-hidden animate-pulse">
        <div className="h-44 bg-[var(--color-surface-alt)]" />
        <div className="p-5 space-y-3">
            <div className="flex gap-2">
                <div className="h-3 w-16 bg-[var(--color-surface-alt)] rounded-md" />
                <div className="h-3 w-12 bg-[var(--color-surface-alt)] rounded-md" />
            </div>
            <div className="h-5 w-full bg-[var(--color-surface-alt)] rounded-lg" />
            <div className="h-3 w-3/4 bg-[var(--color-surface-alt)] rounded-md" />
            <div className="h-3 w-1/4 bg-[var(--color-surface-alt)] rounded-md pt-2" />
            <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                <div className="h-9 flex-1 bg-[var(--color-surface-alt)] rounded-xl" />
                <div className="h-9 w-9 bg-[var(--color-surface-alt)] rounded-xl" />
                <div className="h-9 w-9 bg-[var(--color-surface-alt)] rounded-xl" />
            </div>
        </div>
    </div>
)

const StatsSkeleton = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
        ))}
    </div>
)


// ─── News Modal ──────────────────────────────────────────────────────────────────

const quillModules = {
    toolbar: [
        [{ header: [2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote', 'link'],
        ['clean']
    ]
}

const NewsModal = ({ isOpen, onClose, news, onSave, isSaving, defaultDisplayName = '' }) => {
    const [form, setForm] = useState({
        title: news?.title || '',
        excerpt: news?.excerpt || '',
        content: news?.content || '',
        tag: news?.tag || 'Informasi',
        image_url: news?.image_url || '',
        image_alt: news?.image_alt || '',
        is_published: news?.is_published ?? false,
        is_featured: news?.is_featured ?? false,
        scheduled_at: news?.scheduled_at ? new Date(news.scheduled_at).toISOString().slice(0, 16) : '',
        meta_title: news?.meta_title || '',
        meta_description: news?.meta_description || '',
        slug: news?.slug || '',
        display_name: news?.display_name || defaultDisplayName,
    })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(news?.image_url || null)
    const [imageError, setImageError] = useState('')
    const [activeTab, setActiveTab] = useState('content') // content | settings | seo
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false)
    const [isSidePreview, setIsSidePreview] = useState(window.innerWidth > 1024)
    const fileInputRef = useRef(null)

    // ── Auto-save logic ──
    useEffect(() => {
        if (news) return // Don't auto-save while editing existing
        const saved = sessionStorage.getItem('news_draft')
        if (saved && !form.title && !form.content) {
            try { setForm(prev => ({ ...prev, ...JSON.parse(saved) })) } catch (e) { }
        }
    }, [])

    useEffect(() => {
        if (!news && (form.title || form.content)) {
            const t = setTimeout(() => {
                sessionStorage.setItem('news_draft', JSON.stringify(form))
            }, 1000)
            return () => clearTimeout(t)
        }
    }, [form, news])

    // ── AI Helpers ──
    const generateAiSeo = () => {
        if (!form.content || isGeneratingSeo) return
        setIsGeneratingSeo(true)

        // Artificial delay for "Premium AI Experience"
        setTimeout(() => {
            const text = decodeEntities(form.content)

            // Smarter extraction: Find first meaningful paragraph or first 2 sentences.
            const sentences = text.split(/[.!?]\s+/).filter(s => s.length > 20)
            const metaDesc = sentences.length > 0
                ? (sentences[0] + (sentences[1] ? '. ' + sentences[1] : '')).slice(0, 155).trim() + '...'
                : text.slice(0, 155).trim() + '...'

            setForm(f => ({
                ...f,
                meta_title: f.title.trim().slice(0, 60),
                meta_description: metaDesc,
                excerpt: f.excerpt || metaDesc,
                slug: f.slug || slugify(f.title)
            }))

            setIsGeneratingSeo(false)
        }, 1200)
    }

    // Auto-generate slug from title
    const handleTitleChange = (val) => {
        setForm(f => ({
            ...f,
            title: val,
            slug: f.slug || !news ? slugify(val) : f.slug,
            meta_title: f.meta_title || val.slice(0, 60),
        }))
    }

    // Auto-generate excerpt from content
    const handleContentChange = (val) => {
        setForm(f => ({
            ...f,
            content: val,
            excerpt: f.excerpt || getExcerpt(val),
        }))
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        setImageError('')
        if (!file) return
        if (!file.type.startsWith('image/')) { setImageError('File harus berupa gambar'); return }
        if (file.size > 5 * 1024 * 1024) { setImageError('Ukuran file maksimal 5MB'); return }
        setImageFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setImagePreview(reader.result)
        reader.readAsDataURL(file)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        sessionStorage.removeItem('news_draft')
        onSave(form, imageFile)
    }

    if (!isOpen) return null

    const readTime = getReadTime(form.content)

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={news ? 'Edit Informasi' : 'Buat Informasi Baru'}
            size={isSidePreview ? "full" : "xxl"}
            noPadding={true}
            footer={(
                <div className="flex items-center justify-between w-full h-10">
                    <div className="text-[9px] text-[var(--color-text-muted)] opacity-50 font-black italic uppercase tracking-tighter">
                        {form.content && `*Estimasi waktu baca: ~${readTime} mnt`}
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose}
                            className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                            Batal
                        </button>
                        <button type="submit" form="news-form" disabled={isSaving || !form.title.trim() || !form.content.trim()}
                            className="h-10 px-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                            {isSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[11px]" /> : <FontAwesomeIcon icon={news ? faCheck : faPlus} className="text-[9px]" />}
                            {news ? 'Simpan Perubahan' : 'Terbitkan Informasi'}
                        </button>
                    </div>
                </div>
            )}
        >
            {/* Quill global styles scoped to this modal */}
            <style>{`
                .ql-toolbar.ql-snow { border: 1px solid var(--color-border) !important; border-radius: 12px 12px 0 0; background: var(--color-surface-alt); padding: 4px 8px; }
                .ql-container.ql-snow { border: 1px solid var(--color-border) !important; border-top: none !important; border-radius: 0 0 12px 12px; background: var(--color-surface); min-height: 115px; max-height: 220px; overflow-y: auto; font-family: inherit; }
                .ql-editor { font-size: 13px; font-weight: 500; color: var(--color-text); padding: 10px 14px; line-height: 1.5; }
                .ql-editor.ql-blank::before { color: var(--color-text-muted); font-style: normal; opacity: 0.4; }
                .ql-stroke { stroke: var(--color-text-muted) !important; }
                .ql-fill { fill: var(--color-text-muted) !important; }
                .ql-picker { color: var(--color-text-muted) !important; }
                .ql-active .ql-stroke { stroke: var(--color-primary) !important; }
                .ql-active .ql-fill { fill: var(--color-primary) !important; }
            `}</style>

            <form id="news-form" onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden px-6 pt-3 pb-0">
                {/* Tab nav - Sticky relative to modal top */}
                <div className="flex items-center gap-1 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl w-fit mb-3 mt-2 shrink-0">
                    {[
                        { id: 'content', label: 'Konten', icon: faPen },
                        { id: 'settings', label: 'Pengaturan', icon: faFilter },
                        { id: 'seo', label: 'SEO', icon: faGlobe },
                    ].map(t => (
                        <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${activeTab === t.id ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={t.icon} className="text-[8px]" />
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className={`flex flex-col lg:flex-row gap-4 flex-1 overflow-hidden pb-1`}>
                    <div className={`flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-2 ${isSidePreview ? 'lg:max-w-xl' : ''}`}>

                        {/* ── KONTEN TAB ── */}
                        {activeTab === 'content' && (
                            <div className="space-y-4">
                                {/* Judul */}
                                <div className="animate-in slide-in-from-bottom-2 duration-300">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 opacity-70">
                                        <FontAwesomeIcon icon={faNewspaper} className="mr-2 text-[8px]" />Judul Informasi <span className="text-rose-500">*</span>
                                    </label>
                                    <input required type="text" value={form.title}
                                        onChange={e => handleTitleChange(e.target.value)}
                                        placeholder="Judul Berita/Pengumuman..."
                                        className="w-full px-4 h-11 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 text-sm font-bold outline-none transition-all shadow-sm"
                                    />
                                </div>

                                {/* Excerpt */}
                                <div className="animate-in slide-in-from-bottom-2 duration-400">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                            <FontAwesomeIcon icon={faAlignLeft} className="mr-2 text-[8px]" />Ringkasan
                                        </label>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${(form.excerpt?.length || 0) > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] opacity-50'}`}>
                                            {form.excerpt?.length || 0}/160
                                        </span>
                                    </div>
                                    <input type="text" value={form.excerpt}
                                        onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                                        placeholder="Ringkasan singkat (opsional)..."
                                        className="w-full px-4 h-11 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[13px] font-medium outline-none transition-all shadow-sm"
                                    />
                                </div>

                                {/* Editor */}
                                <div className="animate-in slide-in-from-bottom-2 duration-500">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                            <FontAwesomeIcon icon={faBookOpen} className="mr-2 text-[8px]" />Isi Informasi <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-50">
                                                ~{readTime} menit baca
                                            </span>
                                            <button type="button" onClick={() => setIsSidePreview(!isSidePreview)}
                                                className={`flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all border ${isSidePreview ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                                <FontAwesomeIcon icon={faEye} className="text-[8px]" />
                                                Live Preview
                                            </button>
                                        </div>
                                    </div>

                                    <ReactQuill theme="snow" value={form.content}
                                        onChange={handleContentChange}
                                        placeholder="Ceritakan detail Informasi secara lengkap..."
                                        modules={quillModules}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── SETTINGS TAB ── */}
                        {activeTab === 'settings' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Kategori */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                            <FontAwesomeIcon icon={faTags} className="mr-2" />Kategori
                                        </label>
                                        <div className="relative group">
                                            <select value={form.tag}
                                                onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                                                className="w-full h-11 px-4 pr-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold appearance-none cursor-pointer outline-none transition-all shadow-sm">
                                                <option value="Umum">Informasi Umum</option>
                                                <option value="Akademik">Akademik</option>
                                                <option value="Event">Kegiatan & Event</option>
                                                <option value="Prestasi">Prestasi</option>
                                            </select>
                                            <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none group-active:translate-y-scale-90 transition-all" />
                                        </div>
                                    </div>
                                    {/* Penulis */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                            <FontAwesomeIcon icon={faUserPen} className="mr-2" />Nama Penulis
                                        </label>
                                        <input type="text" value={form.display_name}
                                            onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                                            placeholder="Tulis nama penulis..."
                                            className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {/* Slug */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                            <FontAwesomeIcon icon={faHashtag} className="mr-2" />Slug URL
                                        </label>
                                        <div className="flex group">
                                            <div className="h-11 px-4 flex items-center bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] rounded-l-xl text-[10px] font-black text-[var(--color-text-muted)] opacity-50">/news/</div>
                                            <input type="text" value={form.slug}
                                                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                                className="flex-1 h-11 px-4 rounded-r-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[12px] font-bold outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    {/* Jadwal */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                            <FontAwesomeIcon icon={faClock} className="mr-2" />Jadwal Tayang
                                        </label>
                                        <input type="datetime-local" value={form.published_at}
                                            onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))}
                                            className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all shadow-sm"
                                        />
                                    </div>
                                </div>

                                {/* Thumbnail */}
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                        <FontAwesomeIcon icon={faImage} className="mr-2" />Thumbnail Utama
                                    </label>
                                    <div onClick={() => fileInputRef.current?.click()}
                                        className="h-40 relative group cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 bg-[var(--color-surface-alt)]/50 transition-all">
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Thumbnail" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                    <span className="px-5 py-2.5 bg-white text-black text-xs font-black rounded-2xl shadow-xl transform scale-90 group-hover:scale-100 transition-transform">GANTI GAMBAR</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                                                <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-3 group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/30 transition-all">
                                                    <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl" />
                                                </div>
                                                <p className="text-xs font-black text-[var(--color-text)] uppercase tracking-widest mb-1">Klik untuk Unggah</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">Format JPG, PNG atau WEBP (Maks. 5MB)</p>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                                </div>
                            </div>
                        )}

                        {/* ── SEO TAB ── */}
                        {activeTab === 'seo' && (
                            <div className="space-y-3 animate-in fade-in duration-300">
                                {/* SEO Score & AI Assistant */}
                                <div className="p-2.5 rounded-2xl bg-[var(--color-primary)]/[0.03] border border-[var(--color-primary)]/10">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-black">
                                                {form.meta_title && form.meta_description ? '92' : '45'}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] leading-none mb-1">SEO Score</p>
                                                <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-tighter italic leading-none">Konten Teroptimasi</p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={generateAiSeo} disabled={isGeneratingSeo}
                                            className="px-4 h-9 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 disabled:scale-100 flex items-center gap-2">
                                            {isGeneratingSeo ? (
                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : <FontAwesomeIcon icon={faMagicWandSparkles} />}
                                            {isGeneratingSeo ? 'Generating...' : 'AI Generate'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {/* Meta Title */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                                Meta Title
                                            </label>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${form.meta_title?.length > 60 ? 'bg-rose-500/10 text-rose-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {form.meta_title?.length || 0}/60
                                            </span>
                                        </div>
                                        <input type="text" value={form.meta_title}
                                            onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                                            placeholder="SEO title (max 60 chars)..."
                                            className="w-full h-11 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[13px] font-bold outline-none transition-all shadow-sm"
                                        />
                                    </div>

                                    {/* Meta Description */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                                Meta Description
                                            </label>
                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${form.meta_description?.length > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-green-500/10 text-green-500'}`}>
                                                {form.meta_description?.length || 0}/160
                                            </span>
                                        </div>
                                        <textarea value={form.meta_description}
                                            onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                                            placeholder="Deskripsi untuk pengoptimalan hasil pencarian..."
                                            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[12px] font-medium min-h-[60px] max-h-[80px] outline-none transition-all resize-none shadow-sm leading-relaxed"
                                        />
                                    </div>
                                </div>

                                {/* SEO Health Checklist - Compact 3-col Grid */}
                                <div className="p-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { ok: form.title?.length >= 15, label: 'Title Length' },
                                            { ok: form.excerpt?.length >= 80, label: 'Excerpt Info' },
                                            { ok: !!form.slug && form.slug.length > 5, label: 'URL Friendly' },
                                            { ok: form.meta_title?.length >= 50 && form.meta_title?.length <= 60, label: 'Meta Title' },
                                            { ok: form.meta_description?.length >= 150 && form.meta_description?.length <= 160, label: 'Meta Desc' },
                                            { ok: !!imagePreview, label: 'Main Image' },
                                        ].map(({ ok, label }, i) => (
                                            <div key={i} className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${ok ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-700' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-40'}`}>
                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 ${ok ? 'bg-emerald-500 text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    <FontAwesomeIcon icon={ok ? faCheck : faXmark} className="text-[7px]" />
                                                </div>
                                                <span className="text-[8px] font-black uppercase tracking-tight truncate">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── SIDE LIVE PREVIEW ── */}
                    {isSidePreview && (
                        <div className="hidden lg:flex flex-col flex-1 animate-in slide-in-from-right-8 duration-500 overflow-hidden">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                    <FontAwesomeIcon icon={faEye} className="mr-2" /> Live Preview
                                </label>
                                <span className="text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full uppercase">Real-time</span>
                            </div>
                            <div className="flex-1 bg-[var(--color-surface)] border-2 border-[var(--color-border)] rounded-[2.5rem] shadow-inner overflow-hidden flex flex-col">
                                <div className="h-4 pr-1">
                                    <div className="h-full bg-[var(--color-surface-alt)] w-full flex items-center px-4 gap-1.5 border-b border-[var(--color-border)]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <div className="flex-1 ml-2 mr-6 h-2 bg-[var(--color-surface)] rounded-full border border-[var(--color-border)]" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                                    {imagePreview && <img src={imagePreview} className="w-full h-36 object-cover rounded-3xl shadow-lg" alt="Preview" />}
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <span className="px-3 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-widest">{form.tag}</span>
                                            <span className="px-3 py-1 text-[var(--color-text-muted)] text-[9px] font-bold uppercase tracking-widest flex items-center gap-1"><FontAwesomeIcon icon={faClock} className="text-[7px]" /> {readTime} mnt baca</span>
                                        </div>
                                        <h2 className="text-xl font-black font-heading leading-tight text-[var(--color-text)]">
                                            {form.title || 'Judul akan muncul di sini...'}
                                        </h2>
                                        <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
                                            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-sm text-[var(--color-text-muted)]"><FontAwesomeIcon icon={faUser} /></div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-[var(--color-text)] leading-none">{form.display_name}</span>
                                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-60 leading-none mt-1">Admin Informasi</span>
                                            </div>
                                        </div>
                                        <div className="preview-content text-[13px] text-[var(--color-text)] leading-relaxed prose prose-sm prose-headings:font-black prose-p:mb-3"
                                            dangerouslySetInnerHTML={{ __html: form.content || '<p class="opacity-30 italic">Tulis konten untuk melihat visualisasi di sini...</p>' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </form>
        </Modal>
    )
}

// ─── News Card ───────────────────────────────────────────────────────────────────

const NewsCard = memo(({ news, isSelected, onSelect, onEdit, onDelete, onToggleStatus, onDuplicate }) => {
    const readTime = news.read_time || getReadTime(news.content || '')

    // Relative time helper
    const getRelativeTime = (date) => {
        const now = new Date()
        const then = new Date(date)
        const diff = Math.floor((now - then) / 1000)
        if (diff < 60) return 'Baru saja'
        if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
        if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
        if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
        return then.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    }

    return (
        <div className={`group relative bg-[var(--color-surface)] border rounded-[2rem] overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-black/5 hover:-translate-y-1 ${isSelected ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/30'}`}>
            {/* Select checkbox */}
            <button onClick={() => onSelect(news.id)}
                className="absolute top-4 left-4 z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/90 backdrop-blur-md shadow-sm border border-[var(--color-border)] opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100"
                data-selected={isSelected}>
                <FontAwesomeIcon icon={isSelected ? faCheckSquare : faSquare}
                    className={`text-sm ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {/* Thumbnail */}
            <div className="h-44 bg-[var(--color-surface-alt)] relative overflow-hidden">
                {news.image_url ? (
                    <img src={news.image_url} alt={news.image_alt || news.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-15">
                        <FontAwesomeIcon icon={faNewspaper} className="text-5xl" />
                    </div>
                )}

                {/* View count overlay */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[9px] font-black tracking-widest flex items-center gap-1.5 border border-white/10 uppercase">
                        <FontAwesomeIcon icon={faEye} className="text-[8px]" />
                        {news.view_count || 0} Views
                    </span>
                </div>

                {/* Badges */}
                <div className="absolute top-4 right-4 flex flex-col items-center gap-2">
                    {news.is_featured && (
                        <span className="w-8 h-8 rounded-xl bg-amber-400 backdrop-blur-sm flex items-center justify-center shadow-lg shadow-amber-500/20" title="Featured">
                            <FontAwesomeIcon icon={faStar} className="text-white text-[10px]" />
                        </span>
                    )}
                    <button onClick={() => onToggleStatus(news)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center backdrop-blur-md shadow-lg transition-all border ${news.is_published
                            ? 'bg-blue-500 border-blue-600/20 text-white shadow-blue-500/20'
                            : 'bg-white border-[var(--color-border)] text-[var(--color-text-muted)] shadow-black/5'}`}
                        title={news.is_published ? 'Arsipkan' : 'Publikasikan'}>
                        <FontAwesomeIcon icon={news.is_published ? faEye : faEyeSlash} className="text-[10px]" />
                    </button>
                </div>
                <div className="absolute bottom-4 left-4">
                    <span className="px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] shadow-sm border border-[var(--color-border)]">
                        {news.tag}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-6">
                <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-widest mb-3 opacity-60">
                    <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faCalendar} className="text-[8px]" />
                        {getRelativeTime(news.created_at)}
                    </span>
                    <span className="flex items-center gap-1.5 border-l border-[var(--color-border)] pl-3">
                        <FontAwesomeIcon icon={faClock} className="text-[8px]" />
                        {readTime} mnt
                    </span>
                </div>
                <h3 className="text-[15px] font-black text-[var(--color-text)] leading-tight line-clamp-2 mb-2.5 group-hover:text-[var(--color-primary)] transition-colors">{news.title}</h3>
                {news.excerpt && (
                    <p className="text-[11px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mb-4 opacity-70 font-medium">{decodeEntities(news.excerpt)}</p>
                )}

                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] border border-[var(--color-border)]">
                            <FontAwesomeIcon icon={faUser} className="text-[8px]" />
                        </div>
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">
                            {news.display_name || news.author?.split('@')[0] || 'Admin'}
                        </span>
                    </div>

                    {/* View count (Desktop constant visibility) */}
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">
                        <FontAwesomeIcon icon={faEye} />
                        {news.view_count || 0}
                    </div>
                </div>

                {/* Status badge */}
                {news.scheduled_at && !news.is_published && (
                    <div className="flex items-center gap-2 mb-4 text-amber-600 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl w-fit">
                        <FontAwesomeIcon icon={faClock} className="text-[10px] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Terjadwal: {new Date(news.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-[var(--color-border)]">
                    <button onClick={() => onEdit(news)}
                        className="flex-1 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm">
                        <FontAwesomeIcon icon={faPen} className="text-[9px]" /> Edit
                    </button>
                    <button onClick={() => onDuplicate(news)} title="Duplikat sebagai draft"
                        className="w-10 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/30 transition-all flex items-center justify-center active:scale-95">
                        <FontAwesomeIcon icon={faCopy} className="text-[10px]" />
                    </button>
                    <button onClick={() => onDelete(news)}
                        className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center active:scale-95 shadow-sm shadow-rose-500/5">
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                    </button>
                </div>
            </div>
        </div>
    )
})
NewsCard.displayName = 'NewsCard'

// ─── Bulk Action Bar ─────────────────────────────────────────────────────────────

const BulkActionBar = memo(({ count, onPublish, onArchive, onDelete, onClear }) => {
    if (count === 0) return null
    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-[var(--color-primary)] rounded-2xl shadow-lg shadow-[var(--color-primary)]/30 animate-in slide-in-from-bottom-4 duration-200">
            <span className="text-white text-[11px] font-black">{count} dipilih</span>
            <div className="h-4 w-px bg-white/20" />
            <button onClick={onPublish} className="text-white text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEye} className="text-[9px]" /> Publikasikan
            </button>
            <button onClick={onArchive} className="text-white text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5">
                <FontAwesomeIcon icon={faArchive} className="text-[9px]" /> Arsipkan
            </button>
            <button onClick={onDelete} className="text-rose-200 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTrash} className="text-[9px]" /> Hapus
            </button>
            <div className="ml-auto">
                <button onClick={onClear} className="text-white/70 hover:text-white transition-colors">
                    <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
            </div>
        </div>
    )
})
BulkActionBar.displayName = 'BulkActionBar'

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function AdminNewsPage() {
    const { addToast } = useToast()
    const [newsList, setNewsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortBy, setSortBy] = useState('newest')
    const [isSaving, setIsSaving] = useState(false)
    const [page, setPage] = useState(0)
    const [modalData, setModalData] = useState({ isOpen: false, current: null })
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, data: null, isDeleting: false })
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [currentUserName, setCurrentUserName] = useState('')

    // ── Fetch current user name from profiles ──────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data } = await supabase
                .from('profiles').select('name').eq('id', user.id).single()
            setCurrentUserName(data?.name || user.email?.split('@')[0] || 'Admin')
        }
        fetchProfile()
    }, [])

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchNews = useCallback(async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('news').select('*').order('created_at', { ascending: false })
        if (error) addToast('Gagal memuat Informasi: ' + error.message, 'error')
        else setNewsList(data || [])
        setLoading(false)
    }, [addToast])

    useEffect(() => { fetchNews() }, [fetchNews])

    // ── Filter + Sort ──────────────────────────────────────────────────────────

    const filteredNews = useMemo(() => {
        let list = newsList.filter(n => {
            const q = search.toLowerCase()
            if (q && !n.title?.toLowerCase().includes(q) &&
                !n.tag?.toLowerCase().includes(q) &&
                !(n.display_name || n.author?.split('@')[0] || '').toLowerCase().includes(q)) return false
            if (filterStatus === 'published' && !n.is_published) return false
            if (filterStatus === 'draft' && (n.is_published || n.scheduled_at)) return false
            if (filterStatus === 'scheduled' && !n.scheduled_at) return false
            if (filterStatus === 'featured' && !n.is_featured) return false
            return true
        })
        if (sortBy === 'oldest') list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        else if (sortBy === 'az') list = [...list].sort((a, b) => a.title?.localeCompare(b.title))
        else if (sortBy === 'featured') list = [...list].sort((a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0))
        return list
    }, [newsList, search, filterStatus, sortBy])

    const paginatedNews = useMemo(() => filteredNews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filteredNews, page])
    const totalPages = Math.ceil(filteredNews.length / PAGE_SIZE)

    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 4

    const statusCounts = useMemo(() => {
        const totalViews = newsList.reduce((acc, curr) => acc + (curr.view_count || 0), 0)
        const avgReadTime = newsList.length ? Math.round(newsList.reduce((acc, curr) => acc + (curr.read_time || 0), 0) / newsList.length) : 0

        return {
            all: newsList.length,
            published: newsList.filter(n => n.is_published).length,
            draft: newsList.filter(n => !n.is_published && !n.scheduled_at).length,
            scheduled: newsList.filter(n => n.scheduled_at && !n.is_published).length,
            featured: newsList.filter(n => n.is_featured).length,
            totalViews,
            avgReadTime
        }
    }, [newsList])

    // ── Save ───────────────────────────────────────────────────────────────────

    const handleSave = async (form, file) => {
        setIsSaving(true)
        const user = (await supabase.auth.getUser()).data.user
        let imageUrl = form.image_url

        if (file) {
            const ext = file.name.split('.').pop()
            const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`
            const { error: uploadError } = await supabase.storage.from('news').upload(`thumbnails/${fileName}`, file)
            if (uploadError) {
                addToast('Upload gagal: ' + uploadError.message, 'error')
                setIsSaving(false)
                return
            }
            const { data: { publicUrl } } = supabase.storage.from('news').getPublicUrl(`thumbnails/${fileName}`)
            imageUrl = publicUrl
        }

        const readTime = getReadTime(form.content)
        const excerpt = form.excerpt || getExcerpt(form.content)
        const slug = form.slug || slugify(form.title)

        const payload = {
            title: form.title,
            excerpt,
            content: form.content,
            tag: form.tag,
            image_url: imageUrl,
            image_alt: form.image_alt || form.title,
            is_published: form.is_published,
            is_featured: form.is_featured,
            scheduled_at: form.scheduled_at || null,
            meta_title: form.meta_title || form.title,
            meta_description: form.meta_description || excerpt,
            slug,
            read_time: readTime,
            display_name: form.display_name || null,
            author: user?.email || 'Admin',
            updated_at: new Date().toISOString()
        }

        const isEdit = !!modalData.current
        let error, data

        if (isEdit) {
            const result = await supabase.from('news').update(payload).eq('id', modalData.current.id).select()
            error = result.error; data = result.data
        } else {
            const result = await supabase.from('news').insert([payload]).select()
            error = result.error; data = result.data
        }

        setIsSaving(false)

        if (error) { addToast('Error: ' + error.message, 'error'); return }
        if (!data?.length) { addToast('Gagal menyimpan — cek RLS policy', 'error'); return }

        // Optimistic update
        if (isEdit) {
            setNewsList(prev => prev.map(n => n.id === modalData.current.id ? data[0] : n))
        } else {
            setNewsList(prev => [data[0], ...prev])
        }
        addToast(isEdit ? 'Informasi diperbarui' : 'Informasi ditambahkan', 'success')
        await logAudit({
            action: isEdit ? 'UPDATE' : 'INSERT',
            source: user?.id || 'SYSTEM',
            tableName: 'news',
            recordId: data[0].id,
            oldData: isEdit ? modalData.current : null,
            newData: data[0]
        })
        setModalData({ isOpen: false, current: null })
    }

    // ── Delete ──────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteModal.data) return
        setDeleteModal(p => ({ ...p, isDeleting: true }))
        const { error } = await supabase.from('news').delete().eq('id', deleteModal.data.id)
        setDeleteModal({ isOpen: false, data: null, isDeleting: false })
        if (error) { addToast('Gagal hapus: ' + error.message, 'error'); return }
        setNewsList(prev => prev.filter(n => n.id !== deleteModal.data.id))
        await logAudit({
            action: 'DELETE',
            source: 'SYSTEM',
            tableName: 'news',
            recordId: deleteModal.data.id,
            oldData: deleteModal.data
        })
        addToast('Informasi dihapus', 'success')
    }

    // ── Toggle Status ───────────────────────────────────────────────────────────

    const handleToggleStatus = useCallback(async (item) => {
        const newStatus = !item.is_published
        // Optimistic update first
        setNewsList(prev => prev.map(n => n.id === item.id ? { ...n, is_published: newStatus } : n))

        const { error } = await supabase.from('news').update({ is_published: newStatus }).eq('id', item.id)
        if (error) {
            // Revert on error
            setNewsList(prev => prev.map(n => n.id === item.id ? { ...n, is_published: item.is_published } : n))
            addToast('Gagal update status', 'error')
            return
        }

        // Show toast with undo option for unpublish
        await logAudit({
            action: 'UPDATE',
            source: 'SYSTEM',
            tableName: 'news',
            recordId: item.id,
            oldData: item,
            newData: { ...item, is_published: newStatus }
        })
        if (!newStatus) {
            addToast(`Informasi diarsipkan`, 'warning')
        } else {
            addToast(`Informasi dipublikasikan`, 'success')
        }
    }, [addToast])

    // ── Bulk Actions ────────────────────────────────────────────────────────────
    const bulkUpdate = async (update, successMsg) => {
        if (!selectedIds.size) return
        const ids = [...selectedIds]
        const { data: { user } } = await supabase.auth.getUser()

        const { error } = await supabase.from('news').update(update).in('id', ids)
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); return }

        setNewsList(prev => prev.map(n => ids.includes(n.id) ? { ...n, ...update } : n))
        setSelectedIds(new Set())
        addToast(successMsg, 'success')

        await logAudit({
            action: 'BULK_UPDATE',
            source: user?.id || 'SYSTEM',
            tableName: 'news',
            recordId: 'MULTIPLE',
            oldData: { affected_ids: ids },
            newData: { ...update }
        })
    }

    const bulkDelete = async () => {
        if (!selectedIds.size) return
        const ids = [...selectedIds]
        if (!window.confirm(`Hapus ${ids.length} informasi secara permanen?`)) return

        const { data: { user } } = await supabase.auth.getUser()
        const { error } = await supabase.from('news').delete().in('id', ids)
        if (error) { addToast(`Gagal hapus massal: ${error.message}`, 'error'); return }

        setNewsList(prev => prev.filter(n => !ids.includes(n.id)))
        setSelectedIds(new Set())
        addToast(`${ids.length} Informasi berhasil dihapus`, 'success')

        await logAudit({
            action: 'BULK_DELETE',
            source: user?.id || 'SYSTEM',
            tableName: 'news',
            recordId: 'MULTIPLE',
            oldData: { affected_ids: ids }
        })
    }

    // ── Duplicate ───────────────────────────────────────────────────────────────

    const handleDuplicate = useCallback(async (item) => {
        const user = (await supabase.auth.getUser()).data.user
        const { title, content, tag, image_url, image_alt, meta_title, meta_description, excerpt, display_name } = item
        const newSlug = slugify(title) + '-' + Date.now().toString().slice(-5)
        const { data, error } = await supabase.from('news').insert([{
            title: 'Salinan — ' + title,
            content, tag, image_url, image_alt, excerpt,
            meta_title, meta_description,
            slug: newSlug,
            is_published: false,
            is_featured: false,
            display_name,
            author: user?.email || 'Admin',
            read_time: item.read_time,
            updated_at: new Date().toISOString()
        }]).select()
        if (error) { addToast('Gagal duplikat: ' + error.message, 'error'); return }
        setNewsList(prev => [data[0], ...prev])
        await logAudit({
            action: 'INSERT',
            source: 'SYSTEM',
            tableName: 'news',
            recordId: data[0].id,
            newData: data[0]
        })
        addToast('Artikel diduplikat sebagai draft', 'success')
    }, [addToast])

    // ── Selection ───────────────────────────────────────────────────────────────

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }, [])


    const selectAll = () => setSelectedIds(new Set(paginatedNews.map(n => n.id)))
    const clearSelection = () => setSelectedIds(new Set())

    // ───────────────────────────────────────────────────────────────────────────

    // ───────────────────────────────────────────────────────────────────────────

    return (
        <DashboardLayout title="Manajemen Informasi">
            <div className="p-4 md:p-6 space-y-5 max-w-[1280px] mx-auto">

                {/* ── Header Section ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-in slide-in-from-top-4 duration-500">
                    <div>
                        <Breadcrumb badge="Admin" items={['CMS Management']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Manajemen Informasi</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 uppercase tracking-widest">Portal Berita</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium opacity-70">
                            Kelola konten berita, pengumuman, dan artikel prestasi sekolah.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchNews}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex items-center justify-center"
                            title="Refresh">
                            <FontAwesomeIcon icon={faRotateLeft} className="text-sm" />
                        </button>
                        <button onClick={() => setModalData({ isOpen: true, current: null })}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[var(--color-primary)]/20">
                            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />Buat Informasi
                        </button>
                    </div>
                </div>

                {/* ── Stats Carousel ── */}
                {loading ? (
                    <StatsSkeleton />
                ) : (
                    <div className="relative mb-6 -mx-3 sm:mx-0 group/scroll animate-in fade-in duration-700">
                        <div
                            ref={statsScrollRef}
                            onScroll={() => {
                                const el = statsScrollRef.current
                                if (!el) return
                                const cardWidth = el.scrollWidth / STAT_CARD_COUNT
                                const idx = Math.round(el.scrollLeft / cardWidth)
                                setActiveStatIdx(Math.min(idx, STAT_CARD_COUNT - 1))
                            }}
                            className="flex overflow-x-auto scrollbar-hide gap-3 pb-2 snap-x snap-mandatory px-3 sm:px-0 sm:grid sm:grid-cols-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0 lg:snap-none"
                        >
                            {[
                                { label: 'Total Artikel', val: statusCounts.all, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: faNewspaper },
                                { label: 'Total Pembaca', val: statusCounts.totalViews.toLocaleString('id-ID'), color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: faEye },
                                { label: 'Terpublikasi', val: statusCounts.published, color: 'text-indigo-500', bg: 'bg-indigo-500/10', icon: faGlobe },
                                { label: 'Rata-rata Baca', val: `${statusCounts.avgReadTime} Menit`, color: 'text-amber-500', bg: 'bg-amber-500/10', icon: faClock },
                            ].map((s, i) => (
                                <div key={i} className="w-[200px] xs:w-[220px] sm:w-auto shrink-0 snap-center glass rounded-[1.5rem] p-4 border border-[var(--color-border)] flex items-center gap-3 hover:shadow-lg transition-all cursor-default group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${s.bg} group-hover:scale-110 transition-transform`}>
                                        <FontAwesomeIcon icon={s.icon} className={s.color} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-none mb-1">{s.label}</p>
                                        <p className={`text-xl font-black font-heading leading-none tabular-nums ${s.color}`}>{loading ? '…' : s.val}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Dot Indicators - Mobile Only */}
                        <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
                            {Array.from({ length: STAT_CARD_COUNT }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        const el = statsScrollRef.current
                                        if (!el) return
                                        const cardWidth = el.scrollWidth / STAT_CARD_COUNT
                                        el.scrollTo({ left: cardWidth * i, behavior: 'smooth' })
                                    }}
                                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === activeStatIdx ? 'bg-[var(--color-primary)] w-3' : 'bg-[var(--color-border)]'}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Toolbar (Search & Filter) ── */}
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] px-4 py-3 flex items-center gap-2 flex-wrap border border-[var(--color-border)] shadow-sm">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                        <input
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0) }}
                            placeholder="Cari judul, kategori, atau penulis..."
                            className="w-full h-9 pl-8 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                            </button>
                        )}
                    </div>

                    {/* Filter Tabs Integrated */}
                    <div className="flex gap-1 flex-wrap">
                        {['all', 'published', 'draft', 'scheduled', 'featured'].map(s => (
                            <button key={s} onClick={() => { setFilterStatus(s); setPage(0) }}
                                className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-[var(--color-primary)] text-white shadow-md' : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                {s === 'all' ? 'Semua' : s}
                                <span className="ml-1.5 opacity-50 px-1.5 py-0.5 rounded-lg bg-black/5">{statusCounts[s] || 0}</span>
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-[var(--color-border)] mx-1 hidden sm:block" />

                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="h-8 pl-3 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-all appearance-none cursor-pointer">
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                        <option value="views">Paling Banyak Dilihat</option>
                    </select>
                </div>

                {/* ── Active Filter Chips ── */}
                {(search || filterStatus !== 'all' || sortBy !== 'newest') && (
                    <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-left-4 duration-300">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mr-2">Filter Aktif:</span>
                        {search && (
                            <span className="h-6 px-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[9px] font-black flex items-center gap-2">
                                Search: {search}
                                <button onClick={() => setSearch('')} className="hover:text-blue-800 transition-colors"><FontAwesomeIcon icon={faXmark} /></button>
                            </span>
                        )}
                        {filterStatus !== 'all' && (
                            <span className="h-6 px-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[9px] font-black flex items-center gap-2">
                                Status: {filterStatus}
                                <button onClick={() => setFilterStatus('all')} className="hover:text-indigo-800 transition-colors"><FontAwesomeIcon icon={faXmark} /></button>
                            </span>
                        )}
                        <button onClick={() => { setSearch(''); setFilterStatus('all'); setSortBy('newest') }}
                            className="text-[9px] font-black uppercase tracking-widest text-rose-500 hover:underline px-2 transition-all">
                            Hapus Semua
                        </button>
                        <span className="ml-auto text-[9px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">
                            {filteredNews.length} hasil ditemukan
                        </span>
                    </div>
                )}

                {/* ── Bulk Actions ── */}
                {selectedIds.size > 0 && (
                    <div className="animate-in slide-in-from-bottom-2 duration-300">
                        <BulkActionBar
                            count={selectedIds.size}
                            onPublish={() => bulkUpdate({ is_published: true }, `${selectedIds.size} Informasi dipublikasikan`)}
                            onArchive={() => bulkUpdate({ is_published: false }, `${selectedIds.size} Informasi diarsipkan`)}
                            onDelete={bulkDelete}
                            onClear={clearSelection}
                        />
                    </div>
                )}

                {/* ── Content Section ── */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => <NewsSkeleton key={i} />)}
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 glass rounded-[3rem] border border-dashed border-[var(--color-border)] animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-full bg-blue-500/5 flex items-center justify-center text-blue-500/20 text-5xl">
                                <FontAwesomeIcon icon={faSearch} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center text-rose-500 border border-[var(--color-border)]">
                                <FontAwesomeIcon icon={faXmark} className="text-sm" />
                            </div>
                        </div>
                        <h3 className="text-xl font-black text-[var(--color-text)] mb-2">Informasi Tidak Ditemukan</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] opacity-60 font-medium text-center max-w-xs mb-8 leading-relaxed">
                            {search ? `Kami tidak menemukan berita yang cocok dengan "${search}".` : 'Belum ada konten berita yang dibuat.'}
                        </p>
                        <div className="flex gap-3">
                            {(search || filterStatus !== 'all') ? (
                                <button onClick={() => { setSearch(''); setFilterStatus('all') }}
                                    className="h-11 px-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" />
                                    Reset semua filter
                                </button>
                            ) : (
                                <button onClick={() => setModalData({ isOpen: true, current: null })}
                                    className="h-11 px-8 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20">
                                    <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                                    Buat Informasi Pertama
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                            {paginatedNews.map(news => (
                                <NewsCard
                                    key={news.id}
                                    news={news}
                                    isSelected={selectedIds.has(news.id)}
                                    onSelect={toggleSelect}
                                    onEdit={n => setModalData({ isOpen: true, current: n })}
                                    onDelete={n => setDeleteModal({ isOpen: true, data: n, isDeleting: false })}
                                    onToggleStatus={handleToggleStatus}
                                    onDuplicate={handleDuplicate}
                                />
                            ))}
                        </div>

                        {/* Pagination Section */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-8">
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[var(--color-surface)]">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button key={i} onClick={() => setPage(i)}
                                        className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${i === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-[var(--color-surface)]">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                                </button>
                                <span className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest ml-4 opacity-40">
                                    Hal {page + 1} dari {totalPages}
                                </span>
                            </div>
                        )}
                    </>
                )}

                {/* Modals */}
                <NewsModal
                    key={modalData.current?.id || (modalData.isOpen ? 'new' : 'none')}
                    isOpen={modalData.isOpen}
                    onClose={() => setModalData({ isOpen: false, current: null })}
                    news={modalData.current}
                    onSave={handleSave}
                    isSaving={isSaving}
                    defaultDisplayName={currentUserName}
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