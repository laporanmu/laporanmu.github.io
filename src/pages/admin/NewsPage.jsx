/*
 * NewsPage.jsx — Admin CMS Informasi (Enterprise Edition)
 *
 * Supabase schema additions required:
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS excerpt text;
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS slug text unique;
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS is_featured boolean default false;
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS image_alt text;
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS view_count integer default 0;
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS display_name text;
 * ALTER TABLE news ADD COLUMN IF NOT EXISTS read_time integer;
 */

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
    faArrowUpRightFromSquare, faArchive
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
    const [showPreview, setShowPreview] = useState(false)
    const fileInputRef = useRef(null)

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
        onSave(form, imageFile)
    }

    if (!isOpen) return null

    const readTime = getReadTime(form.content)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={news ? 'Edit Informasi' : 'Buat Informasi Baru'} size="xl">
            {/* Quill global styles scoped to this modal */}
            <style>{`
                .ql-toolbar.ql-snow { border: 1px solid var(--color-border) !important; border-radius: 12px 12px 0 0; background: var(--color-surface-alt); padding: 8px 12px; }
                .ql-container.ql-snow { border: 1px solid var(--color-border) !important; border-top: none !important; border-radius: 0 0 12px 12px; background: var(--color-surface); min-height: 200px; max-height: 320px; overflow-y: auto; font-family: inherit; }
                .ql-editor { font-size: 14px; font-weight: 500; color: var(--color-text); padding: 14px 16px; line-height: 1.8; }
                .ql-editor.ql-blank::before { color: var(--color-text-muted); font-style: normal; opacity: 0.4; }
                .ql-stroke { stroke: var(--color-text-muted) !important; }
                .ql-fill { fill: var(--color-text-muted) !important; }
                .ql-picker { color: var(--color-text-muted) !important; }
                .ql-active .ql-stroke { stroke: var(--color-primary) !important; }
                .ql-active .ql-fill { fill: var(--color-primary) !important; }
            `}</style>

            <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
                {/* Tab nav */}
                <div className="flex items-center gap-1 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl w-fit mb-5">
                    {[
                        { id: 'content', label: 'Konten', icon: faPen },
                        { id: 'settings', label: 'Pengaturan', icon: faFilter },
                        { id: 'seo', label: 'SEO', icon: faGlobe },
                    ].map(t => (
                        <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${activeTab === t.id ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={t.icon} className="text-[8px]" />
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1">

                    {/* ── KONTEN TAB ── */}
                    {activeTab === 'content' && (
                        <div className="space-y-5">
                            {/* Judul */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-70">
                                    <FontAwesomeIcon icon={faNewspaper} className="mr-1.5 text-[8px]" />Judul Informasi <span className="text-rose-500">*</span>
                                </label>
                                <input required type="text" value={form.title}
                                    onChange={e => handleTitleChange(e.target.value)}
                                    placeholder="Tulis judul Informasi yang menarik..."
                                    className="w-full px-4 h-12 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-bold outline-none transition-all"
                                />
                            </div>

                            {/* Excerpt */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                        <FontAwesomeIcon icon={faAlignLeft} className="mr-1.5 text-[8px]" />Ringkasan
                                    </label>
                                    <span className={`text-[8px] font-black ${(form.excerpt?.length || 0) > 160 ? 'text-rose-500' : 'text-[var(--color-text-muted)] opacity-50'}`}>
                                        {form.excerpt?.length || 0}/160
                                    </span>
                                </div>
                                <textarea value={form.excerpt}
                                    onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                                    placeholder="Ringkasan singkat artikel (ditampilkan di landing page)..."
                                    rows={2}
                                    className="w-full px-4 py-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 text-sm font-medium outline-none transition-all resize-none leading-relaxed"
                                />
                            </div>

                            {/* Editor */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">
                                        <FontAwesomeIcon icon={faBookOpen} className="mr-1.5 text-[8px]" />Isi Informasi <span className="text-rose-500">*</span>
                                    </label>
                                    {form.content && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[8px] font-black text-[var(--color-text-muted)] opacity-50">
                                                ~{readTime} menit baca
                                            </span>
                                            <button type="button" onClick={() => setShowPreview(p => !p)}
                                                className={`flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md transition-colors ${showPreview ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'}`}>
                                                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[7px]" />
                                                Preview
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {showPreview ? (
                                    <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-surface)] p-5 min-h-[220px] max-h-[320px] overflow-y-auto">
                                        <style>{`.preview-content p{margin-bottom:.75rem} .preview-content ul{list-style:disc;margin-left:1.5rem;margin-bottom:.75rem} .preview-content ol{list-style:decimal;margin-left:1.5rem;margin-bottom:.75rem} .preview-content strong{font-weight:800;color:var(--color-primary)} .preview-content a{color:var(--color-primary);text-decoration:underline} .preview-content h2{font-size:1.25rem;font-weight:900;margin-bottom:.5rem} .preview-content h3{font-size:1.1rem;font-weight:800;margin-bottom:.5rem} .preview-content blockquote{border-left:3px solid var(--color-primary);padding-left:1rem;margin-bottom:.75rem;opacity:.7}`}</style>
                                        <div className="preview-content text-sm text-[var(--color-text)] leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: form.content }} />
                                    </div>
                                ) : (
                                    <ReactQuill theme="snow" value={form.content}
                                        onChange={handleContentChange}
                                        placeholder="Ceritakan detail Informasi secara lengkap..."
                                        modules={quillModules}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── SETTINGS TAB ── */}
                    {activeTab === 'settings' && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Kategori */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-70">
                                        <FontAwesomeIcon icon={faTag} className="mr-1.5 text-[8px]" />Kategori
                                    </label>
                                    <div className="relative">
                                        <select value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                                            className="w-full px-4 h-11 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-xs font-bold appearance-none cursor-pointer pr-9 outline-none transition-all">
                                            <option value="Informasi">Informasi Umum</option>
                                            <option value="Kegiatan">Kegiatan Siswa</option>
                                            <option value="Prestasi">Prestasi</option>
                                            <option value="Pengumuman">Pengumuman</option>
                                        </select>
                                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] opacity-40 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Penulis */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-70">
                                        <FontAwesomeIcon icon={faUser} className="mr-1.5 text-[8px]" />Nama Penulis
                                    </label>
                                    <input type="text" value={form.display_name}
                                        onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                                        placeholder="Nama yang ditampilkan ke publik"
                                        className="w-full px-4 h-11 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-xs font-bold outline-none transition-all"
                                    />
                                </div>

                                {/* Slug */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-70">
                                        <FontAwesomeIcon icon={faHashtag} className="mr-1.5 text-[8px]" />Slug URL
                                    </label>
                                    <div className="flex items-center gap-0">
                                        <span className="h-11 px-3 flex items-center text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] rounded-l-2xl opacity-60 whitespace-nowrap">/informasi/</span>
                                        <input type="text" value={form.slug}
                                            onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                                            placeholder="auto-dari-judul"
                                            className="flex-1 px-3 h-11 rounded-r-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-[11px] font-mono outline-none transition-all min-w-0"
                                        />
                                    </div>
                                </div>

                                {/* Jadwal */}
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-70">
                                        <FontAwesomeIcon icon={faClock} className="mr-1.5 text-[8px]" />Jadwal Tayang
                                    </label>
                                    <input type="datetime-local" value={form.scheduled_at}
                                        onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                                        className="w-full px-4 h-11 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-xs font-bold outline-none transition-all cursor-pointer"
                                    />
                                    <p className="text-[9px] text-[var(--color-text-muted)] mt-1 opacity-50 ml-1">Kosongkan untuk langsung terbit</p>
                                </div>
                            </div>

                            {/* Thumbnail */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-70">
                                    <FontAwesomeIcon icon={faImage} className="mr-1.5 text-[8px]" />Thumbnail
                                </label>
                                <div onClick={() => fileInputRef.current?.click()}
                                    className="relative h-40 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden cursor-pointer hover:border-[var(--color-primary)]/50 transition-all group">
                                    {imagePreview ? (
                                        <>
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                <span className="px-4 py-2 rounded-xl bg-white text-black text-[9px] font-black uppercase tracking-widest">Ganti Foto</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)] opacity-40 group-hover:opacity-80 group-hover:text-[var(--color-primary)] transition-all">
                                            <FontAwesomeIcon icon={faCloudArrowUp} className="text-3xl" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Klik untuk upload</span>
                                            <span className="text-[8px] opacity-60">JPG, PNG, WebP · Max 5MB</span>
                                        </div>
                                    )}
                                    <input ref={fileInputRef} type="file" onChange={handleImageChange} className="hidden" accept="image/jpeg,image/png,image/webp,image/gif" />
                                </div>
                                {imageError && <p className="text-[9px] text-rose-500 mt-1 ml-1 font-black">{imageError}</p>}
                                {imagePreview && (
                                    <input type="text" value={form.image_alt}
                                        onChange={e => setForm(f => ({ ...f, image_alt: e.target.value }))}
                                        placeholder="Alt text untuk gambar (penting untuk SEO & aksesibilitas)"
                                        className="w-full mt-2 px-4 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-xs font-medium outline-none transition-all"
                                    />
                                )}
                            </div>

                            {/* Toggles */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {[
                                    { key: 'is_published', icon: faEye, label: 'Publikasikan', desc: 'Tampilkan ke publik', color: 'emerald' },
                                    { key: 'is_featured', icon: faStar, label: 'Featured / Hero', desc: 'Tampilkan sebagai artikel utama', color: 'amber' },
                                ].map(({ key, icon, label, desc, color }) => (
                                    <label key={key} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${form[key] ? `border-${color}-500/30 bg-${color}-500/5` : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${form[key] ? `bg-${color}-500/10 text-${color}-500` : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>
                                            <FontAwesomeIcon icon={icon} className="text-sm" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-[var(--color-text)]">{label}</p>
                                            <p className="text-[9px] text-[var(--color-text-muted)] opacity-60">{desc}</p>
                                        </div>
                                        <div onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                                            className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${form[key] ? `bg-${color}-500` : 'bg-[var(--color-border)]'}`}>
                                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── SEO TAB ── */}
                    {activeTab === 'seo' && (
                        <div className="space-y-5">
                            {/* SEO Preview */}
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-3">Tampilan di Google</p>
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-blue-600 truncate">{form.meta_title || form.title || 'Judul artikel...'}</p>
                                    <p className="text-[11px] text-green-700 font-mono">laporanmu.com/informasi/{form.slug || 'slug-artikel'}</p>
                                    <p className="text-[12px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed">{form.meta_description || form.excerpt || 'Deskripsi artikel akan muncul di sini...'}</p>
                                </div>
                            </div>

                            {/* Meta Title */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">Meta Title</label>
                                    <SeoScore value={form.meta_title} min={SEO_LIMITS.title[0]} max={SEO_LIMITS.title[1]} />
                                </div>
                                <input type="text" value={form.meta_title}
                                    onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                                    placeholder="Judul untuk mesin pencari (ideal 50–60 karakter)"
                                    maxLength={80}
                                    className="w-full px-4 h-11 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-medium outline-none transition-all"
                                />
                                <p className="text-[9px] text-[var(--color-text-muted)] mt-1 ml-1 opacity-50">Ideal: 50–60 karakter · sekarang {form.meta_title?.length || 0} karakter</p>
                            </div>

                            {/* Meta Description */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-70">Meta Description</label>
                                    <SeoScore value={form.meta_description} min={SEO_LIMITS.desc[0]} max={SEO_LIMITS.desc[1]} />
                                </div>
                                <textarea value={form.meta_description}
                                    onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                                    placeholder="Deskripsi artikel untuk mesin pencari (ideal 150–160 karakter)"
                                    rows={3} maxLength={200}
                                    className="w-full px-4 py-3 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-medium outline-none transition-all resize-none leading-relaxed"
                                />
                                <p className="text-[9px] text-[var(--color-text-muted)] mt-1 ml-1 opacity-50">Ideal: 150–160 karakter · sekarang {form.meta_description?.length || 0} karakter</p>
                            </div>

                            {/* SEO Checklist */}
                            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 mb-3">SEO Checklist</p>
                                <div className="space-y-2">
                                    {[
                                        { ok: form.title?.length >= 10, label: 'Judul cukup panjang (min 10 karakter)' },
                                        { ok: form.excerpt?.length >= 50, label: 'Ringkasan tersedia (min 50 karakter)' },
                                        { ok: !!form.slug, label: 'Slug URL sudah diisi' },
                                        { ok: form.meta_title?.length >= 50 && form.meta_title?.length <= 60, label: 'Meta title optimal (50–60 karakter)' },
                                        { ok: form.meta_description?.length >= 150 && form.meta_description?.length <= 160, label: 'Meta description optimal (150–160 karakter)' },
                                        { ok: !!imagePreview, label: 'Thumbnail sudah diupload' },
                                        { ok: !!form.image_alt, label: 'Alt text gambar terisi' },
                                    ].map(({ ok, label }, i) => (
                                        <div key={i} className={`flex items-center gap-2.5 text-[10px] font-medium ${ok ? 'text-emerald-600' : 'text-[var(--color-text-muted)] opacity-60'}`}>
                                            <FontAwesomeIcon icon={ok ? faCheck : faXmark} className={`text-[9px] shrink-0 ${ok ? 'text-emerald-500' : 'text-rose-400'}`} />
                                            {label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-5 mt-2 border-t border-[var(--color-border)] shrink-0">
                    <div className="text-[9px] text-[var(--color-text-muted)] opacity-50 font-medium">
                        {form.content && `~${readTime} menit baca`}
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose}
                            className="h-11 px-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                            Batal
                        </button>
                        <button type="submit" disabled={isSaving || !form.title.trim() || !form.content.trim()}
                            className="h-11 px-8 rounded-2xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
                            {isSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheck} />}
                            {news ? 'Simpan Perubahan' : 'Terbitkan Informasi'}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}

// ─── News Card ───────────────────────────────────────────────────────────────────

const NewsCard = memo(({ news, isSelected, onSelect, onEdit, onDelete, onToggleStatus, onDuplicate }) => {
    const readTime = news.read_time || getReadTime(news.content || '')
    return (
        <div className={`group relative bg-[var(--color-surface)] border rounded-[2rem] overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/5 ${isSelected ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/30'}`}>
            {/* Select checkbox */}
            <button onClick={() => onSelect(news.id)}
                className="absolute top-3 left-3 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all bg-white/80 backdrop-blur-sm shadow-sm border border-[var(--color-border)] opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100"
                data-selected={isSelected}>
                <FontAwesomeIcon icon={isSelected ? faCheckSquare : faSquare}
                    className={`text-sm ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
            </button>

            {/* Thumbnail */}
            <div className="h-44 bg-[var(--color-surface-alt)] relative overflow-hidden">
                {news.image_url ? (
                    <img src={news.image_url} alt={news.image_alt || news.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-15">
                        <FontAwesomeIcon icon={faNewspaper} className="text-5xl" />
                    </div>
                )}
                {/* Badges */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    {news.is_featured && (
                        <span className="w-7 h-7 rounded-xl bg-amber-400/90 backdrop-blur-sm flex items-center justify-center shadow-sm" title="Featured">
                            <FontAwesomeIcon icon={faStar} className="text-white text-[9px]" />
                        </span>
                    )}
                    <button onClick={() => onToggleStatus(news)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center backdrop-blur-md shadow-sm transition-colors border ${news.is_published
                            ? 'bg-blue-500/90 border-blue-600/20 text-white'
                            : 'bg-white/80 border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                        title={news.is_published ? 'Arsipkan' : 'Publikasikan'}>
                        <FontAwesomeIcon icon={news.is_published ? faEye : faEyeSlash} className="text-[9px]" />
                    </button>
                </div>
                <div className="absolute bottom-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] shadow-sm">
                        {news.tag}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-5">
                <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-widest mb-3 opacity-60">
                    <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faCalendar} />
                        {new Date(news.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1">
                        <FontAwesomeIcon icon={faClock} />
                        {readTime} mnt
                    </span>
                </div>
                <h3 className="text-sm font-black text-[var(--color-text)] leading-tight line-clamp-2 mb-2">{news.title}</h3>
                {news.excerpt && (
                    <p className="text-[10px] text-[var(--color-text-muted)] line-clamp-2 leading-relaxed mb-3 opacity-70">{decodeEntities(news.excerpt)}</p>
                )}
                <p className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50 mb-4">
                    <FontAwesomeIcon icon={faUser} className="mr-1" />
                    {news.display_name || news.author?.split('@')[0] || 'Admin'}
                </p>

                {/* Status badge */}
                {news.scheduled_at && !news.is_published && (
                    <div className="flex items-center gap-1.5 mb-3 text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg w-fit">
                        <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                        <span className="text-[9px] font-black">Terjadwal {new Date(news.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                    <button onClick={() => onEdit(news)}
                        className="flex-1 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black hover:bg-[var(--color-primary)] hover:text-white hover:border-[var(--color-primary)] transition-colors flex items-center justify-center gap-1.5">
                        <FontAwesomeIcon icon={faPen} className="text-[9px]" /> Edit
                    </button>
                    <button onClick={() => onDuplicate(news)} title="Duplikat sebagai draft"
                        className="w-9 h-9 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-sky-500/10 hover:text-sky-500 hover:border-sky-500/30 transition-colors flex items-center justify-center">
                        <FontAwesomeIcon icon={faCopy} className="text-[9px]" />
                    </button>
                    <button onClick={() => onDelete(news)}
                        className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center">
                        <FontAwesomeIcon icon={faTrash} className="text-[9px]" />
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

    const statusCounts = useMemo(() => ({
        all: newsList.length,
        published: newsList.filter(n => n.is_published).length,
        draft: newsList.filter(n => !n.is_published && !n.scheduled_at).length,
        scheduled: newsList.filter(n => n.scheduled_at && !n.is_published).length,
        featured: newsList.filter(n => n.is_featured).length,
    }), [newsList])

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
            action: isEdit ? 'UPDATE' : 'INSERT', source: 'SYSTEM', tableName: 'news', recordId: data[0].id,
            newData: { title: payload.title, is_published: payload.is_published, tag: payload.tag, slug: payload.slug }
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
            action: 'DELETE', source: 'SYSTEM', tableName: 'news', recordId: deleteModal.data.id,
            oldData: { title: deleteModal.data.title, is_published: deleteModal.data.is_published }
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
            action: 'UPDATE', source: 'SYSTEM', tableName: 'news', recordId: item.id,
            oldData: { title: item.title, is_published: item.is_published }, newData: { is_published: newStatus }
        })
        if (!newStatus) {
            addToast(`Informasi diarsipkan`, 'warning')
        } else {
            addToast(`Informasi dipublikasikan`, 'success')
        }
    }, [addToast])

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
            action: 'INSERT', source: 'SYSTEM', tableName: 'news', recordId: data[0].id,
            newData: { title: 'Salinan — ' + title, duplicated_from: item.id, is_published: false }
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

    // ── Bulk Actions ────────────────────────────────────────────────────────────

    const bulkUpdate = async (update, successMsg) => {
        const ids = [...selectedIds]
        const { error } = await supabase.from('news').update(update).in('id', ids)
        if (error) { addToast('Gagal: ' + error.message, 'error'); return }
        setNewsList(prev => prev.map(n => ids.includes(n.id) ? { ...n, ...update } : n))
        await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'news', newData: { bulk: true, count: ids.length, ids, ...update } })
        addToast(successMsg, 'success')
        clearSelection()
    }

    const bulkDelete = async () => {
        const ids = [...selectedIds]
        const { error } = await supabase.from('news').delete().in('id', ids)
        if (error) { addToast('Gagal hapus: ' + error.message, 'error'); return }
        setNewsList(prev => prev.filter(n => !ids.includes(n.id)))
        await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'news', newData: { bulk: true, count: ids.length, ids } })
        addToast(`${ids.length} Informasi dihapus`, 'success')
        clearSelection()
    }

    // ───────────────────────────────────────────────────────────────────────────

    return (
        <DashboardLayout title="News Management">
            <div className="p-4 md:p-6 space-y-5 max-w-[1280px] mx-auto">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['CMS Management']} />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)] mt-1.5">Manajemen Informasi</h1>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">
                            {newsList.length} total artikel · {statusCounts.published} published · {statusCounts.draft} draft
                        </p>
                    </div>
                    <button onClick={() => setModalData({ isOpen: true, current: null })}
                        className="h-11 px-6 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 shrink-0">
                        <FontAwesomeIcon icon={faPlus} /> Buat Informasi
                    </button>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { id: 'all', label: 'Semua' },
                        { id: 'published', label: 'Published' },
                        { id: 'draft', label: 'Draft' },
                        { id: 'scheduled', label: 'Terjadwal' },
                        { id: 'featured', label: 'Featured', icon: faStar },
                    ].map(f => (
                        <button key={f.id} onClick={() => { setFilterStatus(f.id); setPage(0) }}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border ${filterStatus === f.id
                                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20'
                                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}>
                            {f.icon && <FontAwesomeIcon icon={f.icon} className="text-[8px]" />}
                            {f.label}
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] ${filterStatus === f.id ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                {statusCounts[f.id]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search + Sort + Count */}
                <div className="flex items-center gap-3 flex-wrap">
                    <DebouncedSearchInput searchQuery={search} onSearch={(v) => { setSearch(v); setPage(0) }} />
                    <div className="relative">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                            className="h-10 pl-9 pr-8 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest appearance-none cursor-pointer outline-none transition-all hover:border-[var(--color-primary)]/30">
                            <option value="newest">Terbaru</option>
                            <option value="oldest">Terlama</option>
                            <option value="az">A–Z</option>
                            <option value="featured">Featured Dulu</option>
                        </select>
                        <FontAwesomeIcon icon={faSort} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs pointer-events-none" />
                        <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] opacity-40 pointer-events-none" />
                    </div>
                    {filteredNews.length > 0 && (
                        <button onClick={selectedIds.size === paginatedNews.length ? clearSelection : selectAll}
                            className="h-10 px-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 transition-colors whitespace-nowrap">
                            {selectedIds.size === paginatedNews.length ? 'Deselect All' : 'Select All'}
                        </button>
                    )}
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] opacity-50 uppercase tracking-widest whitespace-nowrap">
                        {filteredNews.length} hasil
                    </span>
                </div>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                    <BulkActionBar
                        count={selectedIds.size}
                        onPublish={() => bulkUpdate({ is_published: true }, `${selectedIds.size} Informasi dipublikasikan`)}
                        onArchive={() => bulkUpdate({ is_published: false }, `${selectedIds.size} Informasi diarsipkan`)}
                        onDelete={bulkDelete}
                        onClear={clearSelection}
                    />
                )}

                {/* Content */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="h-72 rounded-[2rem] bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                        ))}
                    </div>
                ) : filteredNews.length === 0 ? (
                    <div className="bg-[var(--color-surface)] border-2 border-dashed border-[var(--color-border)] rounded-[3rem] py-24 flex flex-col items-center text-center px-4">
                        <div className="w-20 h-20 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center mb-6">
                            <FontAwesomeIcon icon={faNewspaper} className="text-3xl text-[var(--color-text-muted)] opacity-40" />
                        </div>
                        <h3 className="text-lg font-black text-[var(--color-text)] mb-2">
                            {search ? 'Tidak ada hasil' : filterStatus !== 'all' ? `Tidak ada artikel ${filterStatus}` : 'Belum ada Informasi'}
                        </h3>
                        <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">
                            {search ? `Tidak ada Informasi yang cocok dengan "${search}".` : 'Mulai buat artikel pertama.'}
                        </p>
                        {!search && (
                            <button onClick={() => setModalData({ isOpen: true, current: null })}
                                className="mt-6 h-11 px-6 rounded-2xl bg-[var(--color-primary)] text-white font-bold text-sm flex items-center gap-2 hover:brightness-110 transition-all">
                                <FontAwesomeIcon icon={faPlus} /> Buat Informasi Pertama
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                    className="w-9 h-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-xs" />
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <button key={i} onClick={() => setPage(i)}
                                        className={`w-9 h-9 rounded-xl text-[11px] font-black transition-colors ${i === page ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                        {i + 1}
                                    </button>
                                ))}
                                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                                    className="w-9 h-9 rounded-xl border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                                    <FontAwesomeIcon icon={faChevronRight} className="text-xs" />
                                </button>
                                <span className="text-[10px] text-[var(--color-text-muted)] opacity-50 font-black ml-2">
                                    Hal {page + 1} dari {totalPages} · {filteredNews.length} artikel
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