import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPen, faFilter, faGlobe, faEye, faImage, faTags, faUserPen,
    faHashtag, faClock, faCheck, faXmark, faSpinner, faPlus,
    faArrowUpRightFromSquare, faMagicWandSparkles, faChevronLeft,
    faCloudArrowUp, faTriangleExclamation, faTrash, faAlignLeft,
    faBookOpen, faNewspaper, faFloppyDisk, faUser, faChevronDown,
    faEyeSlash
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import Breadcrumb from '../../../components/ui/Breadcrumb'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLogger'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)
const getReadTime = (html) => {
    if (!html) return 1
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    const words = text.match(/\S+/g)
    const wordCount = words ? words.length : 0
    return Math.max(1, Math.ceil(wordCount / 180))
}
const decodeEntities = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const getExcerpt = (html, maxLen = 160) => { const text = decodeEntities(html); return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text }

export default function NewsEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const isEdit = Boolean(id)

    const [form, setForm] = useState({
        title: '',
        excerpt: '',
        content: '',
        tag: 'Informasi',
        image_url: '',
        image_alt: '',
        is_published: false,
        is_featured: false,
        scheduled_at: '',
        meta_title: '',
        meta_description: '',
        slug: '',
        display_name: '',
    })

    const [isLoading, setIsLoading] = useState(isEdit)
    const [isSaving, setIsSaving] = useState(false)
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [imageError, setImageError] = useState('')
    const [activeTab, setActiveTab] = useState('content') // content | settings | seo
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false)
    const [isSidePreview, setIsSidePreview] = useState(window.innerWidth > 1024)
    const fileInputRef = useRef(null)
    const quillRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)
    const [hasDraft, setHasDraft] = useState(false)
    const [isDraftDismissed, setIsDraftDismissed] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)

    // ── Auto-save to LocalStorage (Create Mode Only) ──
    useEffect(() => {
        if (isEdit) return
        const draft = localStorage.getItem('news_draft')
        if (draft && !isDraftDismissed) {
            const parsed = JSON.parse(draft)
            // Only show if current form is empty and draft has something
            if ((parsed.title || parsed.content) && !form.title && !form.content) {
                setHasDraft(true)
            }
        }
    }, [isEdit, isDraftDismissed, form.title, form.content])

    useEffect(() => {
        if (isEdit || isSaving) return
        const timer = setTimeout(() => {
            if (form.title || form.content) {
                localStorage.setItem('news_draft', JSON.stringify(form))
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [form, isEdit, isSaving])

    const recoverDraft = () => {
        const draft = localStorage.getItem('news_draft')
        if (draft) {
            setForm(JSON.parse(draft))
            addToast('Draft berhasil dipulihkan', 'success')
        }
        setHasDraft(false)
    }

    const discardDraft = () => {
        localStorage.removeItem('news_draft')
        setHasDraft(false)
        setIsDraftDismissed(true)
        addToast('Draft dihapus dari memori', 'info')
    }

    // ── Editor Handlers ──
    const imageHandler = useCallback(() => {
        const input = document.createElement('input')
        input.setAttribute('type', 'file')
        input.setAttribute('accept', 'image/*')
        input.click()
        input.onchange = async () => {
            const file = input.files[0]
            if (file) {
                // simple size check
                if (file.size > 5 * 1024 * 1024) {
                    addToast('Gagal: Ukuran gambar melebihi 5MB', 'error')
                    return
                }
                const ext = file.name.split('.').pop()
                const fileName = `content-${Date.now()}-${crypto.randomUUID()}.${ext}`
                const { error } = await supabase.storage.from('news').upload(`content/${fileName}`, file)

                if (!error) {
                    const { data: { publicUrl } } = supabase.storage.from('news').getPublicUrl(`content/${fileName}`)
                    const quill = quillRef.current.getEditor()
                    const range = quill.getSelection(true) // Get cursor position
                    quill.insertEmbed(range.index, 'image', publicUrl)
                    quill.setSelection(range.index + 1) // Move cursor after image
                } else {
                    addToast('Gagal upload gambar: ' + error.message, 'error')
                }
            }
        }
    }, [addToast])

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ header: [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ color: [] }, { background: [] }],
                [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }, { align: [] }],
                ['blockquote', 'code-block', 'link', 'image', 'video', 'clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), [imageHandler])

    // ── Fetch Profile for default display_name ──
    useEffect(() => {
        if (!isEdit) {
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    supabase.from('profiles').select('full_name').eq('id', user.id).single()
                        .then(({ data }) => { if (data?.full_name) setForm(f => ({ ...f, display_name: data.full_name })) })
                }
            })
        }
    }, [isEdit])

    // ── Inject Quill Tooltips ──
    useEffect(() => {
        const timer = setTimeout(() => {
            const tooltips = {
                '.ql-bold': 'Tebal',
                '.ql-italic': 'Miring',
                '.ql-underline': 'Garis Bawah',
                '.ql-strike': 'Coret',
                '.ql-list[value="ordered"]': 'List Angka',
                '.ql-list[value="bullet"]': 'List Titik',
                '.ql-indent[value="-1"]': 'Kurangi Indentasi',
                '.ql-indent[value="+1"]': 'Tambah Indentasi',
                '.ql-link': 'Sisipkan Tautan',
                '.ql-image': 'Unggah Gambar ke Supabase',
                '.ql-video': 'Sisipkan Video Youtube',
                '.ql-blockquote': 'Kutipan',
                '.ql-code-block': 'Blok Kode',
                '.ql-clean': 'Hapus Format (Clean)',
                '.ql-align': 'Perataan Teks',
                '.ql-color': 'Warna Teks',
                '.ql-background': 'Warna Latar',
                '.ql-header': 'Ukuran Judul / Heading'
            }

            const toolbar = document.querySelector('.ql-toolbar')
            if (toolbar) {
                Object.entries(tooltips).forEach(([selector, text]) => {
                    toolbar.querySelectorAll(selector).forEach(el => el.setAttribute('title', text))
                })
            }
        }, 1000)
        return () => clearTimeout(timer)
    }, [])

    // ── Fetch Data for Edit ──
    useEffect(() => {
        if (!isEdit) return
        const fetchNews = async () => {
            const { data, error } = await supabase.from('news').select('*').eq('id', id).single()
            if (error) {
                addToast('Gagal memuat data berita', 'error')
                navigate('/admin/news')
            } else if (data) {
                setForm({
                    title: data.title || '',
                    excerpt: data.excerpt || '',
                    content: data.content || '',
                    tag: data.tag || 'Informasi',
                    image_url: data.image_url || '',
                    image_alt: data.image_alt || '',
                    is_published: data.is_published ?? false,
                    is_featured: data.is_featured ?? false,
                    scheduled_at: data.scheduled_at ? new Date(data.scheduled_at).toISOString().slice(0, 16) : '',
                    meta_title: data.meta_title || '',
                    meta_description: data.meta_description || '',
                    slug: data.slug || '',
                    display_name: data.display_name || '',
                })
                setImagePreview(data.image_url || null)
            }
            setIsLoading(false)
        }
        fetchNews()
    }, [id, isEdit, addToast, navigate])

    const calculatedReadTime = useMemo(() => getReadTime(form.content), [form.content])

    // ── Window unsaved changes warning ──
    useEffect(() => {
        const hasChanges = form.title || form.content
        const handleBeforeUnload = (e) => {
            if (hasChanges && !isSaving) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [form.title, form.content, isSaving])

    const handleGoBack = () => {
        const hasChanges = form.title || form.content
        if (hasChanges && !isEdit) {
            setShowExitModal(true)
        } else {
            navigate('/admin/news')
        }
    }

    // ── Keyboard Shortcuts (Ctrl+S / Ctrl+Enter) ──
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'Enter')) {
                e.preventDefault()
                e.stopPropagation()
                // Directly call handleSave logic if title/content exists
                if (form.title.trim() && form.content.trim() && !isSaving) {
                    handleSave()
                }
            }
        }
        document.addEventListener('keydown', handler, true) // Use capture to bypass editor intercept
        return () => document.removeEventListener('keydown', handler, true)
    }, [form.title, form.content, isSaving]) // Simplified dependencies since handleSave is defined inside

    // ── AI Helpers ──
    const generateAiSeo = () => {
        if (!form.content || isGeneratingSeo) return
        setIsGeneratingSeo(true)

        // Artificial delay for "Premium AI Experience"
        setTimeout(() => {
            const text = decodeEntities(form.content)
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
            slug: (f.slug && isEdit) ? f.slug : slugify(val),
            meta_title: f.meta_title || val.slice(0, 60),
        }))
    }

    // ── Handlers ──
    const handleContentChange = (content) => {
        setForm(f => ({
            ...f,
            content
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

    const handleSave = async (e) => {
        e?.preventDefault()
        setIsSaving(true)

        if (!form.title.trim()) { addToast('Judul tidak boleh kosong', 'warning'); setIsSaving(false); return }
        if (form.title.length > 60) { addToast('Judul terlalu panjang (Maks 60)', 'warning'); setIsSaving(false); return }
        if (!form.content.trim() || form.content === '<p><br></p>') { addToast('Konten informasi belum diisi', 'warning'); setIsSaving(false); return }
        if (!imagePreview) { addToast('Harap pilih thumbnail utama', 'warning'); setIsSaving(false); return }

        try {
            const user = (await supabase.auth.getUser()).data.user
            let imageUrl = form.image_url

            if (imageFile) {
                if (form.image_url) {
                    const oldPath = form.image_url.split('/storage/v1/object/public/news/')[1]
                    if (oldPath) await supabase.storage.from('news').remove([oldPath])
                }
                const ext = imageFile.name.split('.').pop()
                const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`
                const { error: uploadError } = await supabase.storage.from('news').upload(`thumbnails/${fileName}`, imageFile)
                if (uploadError) {
                    addToast('Upload gagal: ' + uploadError.message, 'error')
                    setIsSaving(false)
                    return
                }
                const { data: { publicUrl } } = supabase.storage.from('news').getPublicUrl(`thumbnails/${fileName}`)
                imageUrl = publicUrl
            }

            const finalSlug = (form.slug.trim() || slugify(form.title)).toLowerCase().replace(/\s+/g, '-')
            const finalExcerpt = form.excerpt.trim() || getExcerpt(form.content)

            const slugQuery = supabase.from('news').select('id').eq('slug', finalSlug)
            if (isEdit) slugQuery.neq('id', id)
            const { data: existingSlug } = await slugQuery
            if (existingSlug?.length > 0) {
                addToast('Slug URL sudah digunakan. Ubah slug terlebih dahulu.', 'error')
                setIsSaving(false)
                return
            }

            const payload = {
                title: form.title,
                slug: finalSlug,
                excerpt: finalExcerpt,
                content: form.content,
                tag: form.tag,
                image_url: imageUrl,
                image_alt: form.image_alt || form.title,
                is_published: form.is_published,
                is_featured: form.is_featured,
                scheduled_at: form.scheduled_at || null,
                meta_title: form.meta_title || form.title,
                meta_description: form.meta_description || finalExcerpt,
                read_time: calculatedReadTime,
                display_name: form.display_name || null,
                author: user?.email || 'Admin',
                updated_at: new Date().toISOString()
            }

            let error, data
            if (isEdit) {
                const result = await supabase.from('news').update(payload).eq('id', id).select()
                error = result.error; data = result.data
            } else {
                const result = await supabase.from('news').insert([payload]).select()
                error = result.error; data = result.data
            }

            if (error) { addToast('Error: ' + error.message, 'error'); return }
            if (!data?.length) { addToast('Gagal menyimpan — cek RLS policy', 'error'); return }

            addToast(isEdit ? 'Informasi diperbarui' : 'Informasi ditambahkan', 'success')
            // Clear draft after success
            if (!isEdit) localStorage.removeItem('news_draft')

            await logAudit({
                action: isEdit ? 'UPDATE' : 'INSERT',
                source: user?.id || 'SYSTEM',
                tableName: 'news',
                recordId: data[0].id,
                newData: data[0]
            })

            navigate('/admin/news')
        } catch (error) {
            addToast('Terjadi kesalahan: ' + error.message, 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const ConfirmExitModal = ({ isOpen, onClose, onConfirm }) => {
        if (!isOpen) return null
        return createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[4px] animate-in fade-in duration-300" onClick={onClose} />
                <div className="relative w-full max-w-md bg-[var(--color-surface)] rounded-[3rem] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="p-8 md:p-10 text-center">
                        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 text-3xl mx-auto mb-8">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                        </div>
                        <h3 className="text-2xl font-black text-[var(--color-text)] mb-4 tracking-tight">Batalkan Penulisan?</h3>
                        <p className="text-sm font-medium text-[var(--color-text-muted)] leading-relaxed px-6">
                            Ada perubahan yang belum disimpan. Jika keluar sekarang, konten yang baru saja kamu tulis akan hilang secara permanen.
                        </p>
                    </div>
                    <div className="flex gap-3 p-8 md:p-10 pt-0">
                        <button onClick={onClose} 
                            className="flex-1 h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] active:scale-95 transition-all">
                            Batal
                        </button>
                        <button onClick={onConfirm} 
                            className="flex-1 h-12 rounded-2xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-95 transition-all">
                            Ya, Buang Perubahan
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )
    }

    if (isLoading) {
        return (
            <DashboardLayout title="Loading Editor...">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="h-32 bg-[var(--color-surface-alt)] animate-pulse rounded-[2rem]" />
                    <div className="flex gap-6">
                        <div className="flex-1 space-y-6">
                            <div className="h-12 w-64 bg-[var(--color-surface-alt)] animate-pulse rounded-xl" />
                            <div className="h-[500px] bg-[var(--color-surface-alt)] animate-pulse rounded-[2rem]" />
                        </div>
                        <div className="hidden xl:block w-[400px] h-[700px] bg-[var(--color-surface-alt)] animate-pulse rounded-[2rem]" />
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title={isEdit ? 'Edit Informasi' : 'Buat Informasi Baru'}>
            <div className="w-full mx-auto space-y-5">

                {/* ── Draft Recovery Alert ── */}
                {(hasDraft && !isDraftDismissed) && (
                    <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-4 px-2">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600">
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">Draft Ditemukan!</p>
                                <p className="text-[9px] font-bold text-amber-600/80">Kamu punya tulisan yang belum diselesaikan sebelumnya.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={discardDraft} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/5 rounded-xl transition-all">Abaikan</button>
                            <button onClick={recoverDraft} className="px-6 py-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all">Pulihkan Konten</button>
                        </div>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-surface)] p-5 md:p-6 rounded-[1.5rem] border border-[var(--color-border)] shadow-sm">
                    <div>
                        <Breadcrumb items={[
                            'Admin',
                            'Informasi',
                            isEdit ? 'Edit' : 'Create'
                        ]} />
                        <div className="flex items-center gap-4 mt-2">
                            <button onClick={handleGoBack} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                            </button>
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">
                                {isEdit ? 'Edit Informasi' : 'Tulis Informasi Baru'}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={handleGoBack}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all">
                            Batal
                        </button>
                        <button type="button" onClick={handleSave} disabled={isSaving || !form.title.trim() || !form.content.trim()}
                            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[var(--color-primary)]/20">
                            {isSaving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faFloppyDisk} />}
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>

                {/* Quill global styles scoped */}
                <style>{`
                    .ql-toolbar.ql-snow { 
                        border: 1px solid var(--color-border) !important; 
                        border-radius: 1rem 1rem 0 0; 
                        background: var(--color-surface-alt); 
                        padding: 6px 8px;
                        display: flex;
                        flex-wrap: nowrap;
                        gap: 2px;
                        align-items: center;
                        position: relative;
                        z-index: 20;
                        overflow: visible !important;
                    }
                    /* On Tablet/Mobile allow wrap so dropdowns don't clip and tools stay accessible */
                    @media (max-width: 1024px) {
                        .ql-toolbar.ql-snow { flex-wrap: wrap; gap: 6px; }
                    }
                    .ql-toolbar.ql-snow .ql-formats { 
                        margin-right: 4px !important; 
                        display: flex;
                        align-items: center;
                        gap: 2px;
                    }
                    .ql-snow .ql-picker.ql-header { width: 85px !important; }
                    .ql-snow .ql-picker-options {
                        border-radius: 8px !important;
                        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important;
                        z-index: 100 !important;
                    }
                    .ql-container.ql-snow { border: 1px solid var(--color-border) !important; border-top: none !important; border-radius: 0 0 1rem 1rem; background: var(--color-surface); min-height: 300px; font-family: inherit; }
                    .ql-editor { font-size: 14px; font-weight: 500; color: var(--color-text); padding: 16px; line-height: 1.6; min-height: 300px; }
                    .ql-editor.ql-blank::before { color: var(--color-text-muted); font-style: normal; opacity: 0.5; }
                    .ql-stroke { stroke: var(--color-text-muted) !important; }
                    .ql-fill { fill: var(--color-text-muted) !important; }
                    .ql-picker { color: var(--color-text-muted) !important; }
                    .ql-active .ql-stroke { stroke: var(--color-primary) !important; }
                    .ql-active .ql-fill { fill: var(--color-primary) !important; }
                    .preview-content { overflow-wrap: anywhere; word-break: break-word; white-space: normal; }
                    .preview-content img { max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; }
                    .preview-content pre, .preview-content code { white-space: pre-wrap; word-break: break-all; }
                `}</style>

                <form id="news-form" onSubmit={handleSave} className="flex flex-col xl:flex-row gap-6">
                    {/* ── Main Column ── */}
                    <div className="flex-1 space-y-6">

                        {/* Tab Nav */}
                        <div className="flex items-center gap-2 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl w-fit shadow-sm">
                            {[
                                { id: 'content', label: 'Konten', icon: faPen },
                                { id: 'settings', label: 'Pengaturan', icon: faFilter },
                                { id: 'seo', label: 'SEO', icon: faGlobe },
                                ...(!isSidePreview ? [{ id: 'preview', label: 'Preview', icon: faEye }] : []),
                            ].map(t => (
                                <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === t.id ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] active' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={t.icon} className="text-sm" />
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Contains Content / Settings / SEO / Preview depending on active tab */}
                        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[1.5rem] p-5 md:p-6 shadow-sm">

                            {/* ── KONTEN TAB ── */}
                            {activeTab === 'content' && (
                                <div className="space-y-5 animate-in fade-in duration-300">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80">
                                                <FontAwesomeIcon icon={faNewspaper} className="mr-2" />Judul Informasi <span className="text-rose-500">*</span>
                                            </label>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${(form.title?.length || 0) > 60 ? 'bg-rose-500/10 text-rose-500' : (form.title?.length || 0) >= 50 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                {form.title?.length || 0}/60
                                            </span>
                                        </div>
                                        <input required type="text" value={form.title}
                                            onChange={e => handleTitleChange(e.target.value)}
                                            placeholder="Judul Berita/Pengumuman..."
                                            className="w-full px-4 h-11 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-base font-bold placeholder:font-medium placeholder:text-sm placeholder:text-[var(--color-text-muted)] outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80">
                                                <FontAwesomeIcon icon={faAlignLeft} className="mr-2" />Ringkasan Singkat
                                            </label>
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${(form.excerpt?.length || 0) > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                {form.excerpt?.length || 0}/160
                                            </span>
                                        </div>
                                        <input type="text" value={form.excerpt}
                                            onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                                            placeholder="Ringkasan singkat (opsional)..."
                                            className="w-full px-4 h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-medium placeholder:font-medium placeholder:text-sm placeholder:text-[var(--color-text-muted)] outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between mt-6 mb-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-80">
                                                <FontAwesomeIcon icon={faBookOpen} className="mr-2" />Isi Informasi <span className="text-rose-500">*</span>
                                            </label>
                                            {/* Preview toggle desktop */}
                                            <div className="flex items-center gap-2">
                                                <div className="hidden xl:flex items-center px-3 h-8 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-bold text-[var(--color-text-muted)]">
                                                    ~{calculatedReadTime} menit baca
                                                </div>
                                                <button type="button" onClick={() => setIsSidePreview(p => !p)}
                                                    className={`hidden xl:flex items-center gap-2 h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${isSidePreview ? 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]' : 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20 hover:brightness-110'}`}>
                                                    <FontAwesomeIcon icon={isSidePreview ? faEyeSlash : faEye} />
                                                    {isSidePreview ? 'Tutup Preview' : 'Live Preview'}
                                                </button>
                                            </div>
                                        </div>
                                        <ReactQuill theme="snow" value={form.content} ref={quillRef}
                                            onChange={handleContentChange}
                                            placeholder="Ceritakan detail informasi secara lengkap..."
                                            modules={modules}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* ── SETTINGS TAB ── */}
                            {activeTab === 'settings' && (
                                <div className="space-y-8 animate-in fade-in duration-300 max-w-3xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kategori</label>
                                            <div className="relative group">
                                                <select value={form.tag}
                                                    onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
                                                    className="w-full h-10 px-4 pr-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold appearance-none cursor-pointer outline-none transition-all">
                                                    <option value="Umum">Informasi Umum</option>
                                                    <option value="Akademik">Akademik</option>
                                                    <option value="Event">Kegiatan & Event</option>
                                                    <option value="Prestasi">Prestasi</option>
                                                </select>
                                                <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Penulis</label>
                                            <input type="text" value={form.display_name}
                                                onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                                                placeholder="Tulis nama penulis..."
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Slug */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Slug URL</label>
                                            <div className="flex group">
                                                <div className="h-10 px-4 flex items-center bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] rounded-l-xl text-xs font-black text-[var(--color-text-muted)] opacity-60">/news/</div>
                                                <input type="text" value={form.slug}
                                                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                                    className="flex-1 h-10 px-4 rounded-r-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        {/* Jadwal */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Jadwal Tayang</label>
                                            <input type="datetime-local" value={form.scheduled_at}
                                                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Thumbnail Upload */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Thumbnail Utama</label>
                                        <div onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImageChange({ target: { files: [f] } }) }}
                                            className={`h-40 relative group cursor-pointer overflow-hidden rounded-[1.5rem] border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 bg-[var(--color-surface-alt)]/50'}`}>
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Thumbnail" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <span className="px-6 py-3 bg-white text-black text-sm font-black rounded-2xl shadow-xl transform scale-90 group-hover:scale-100 transition-transform">Ganti Gambar</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                                    <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-4 group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/30 transition-all shadow-sm">
                                                        <FontAwesomeIcon icon={faCloudArrowUp} className="text-2xl" />
                                                    </div>
                                                    <p className="text-sm font-black text-[var(--color-text)] uppercase tracking-widest mb-1.5">{isDragging ? 'Lepas Gambar' : 'Klik atau Seret Gambar'}</p>
                                                    <p className="text-xs font-bold text-[var(--color-text-muted)] opacity-60">Format JPG, PNG atau WEBP (Maksimal 5MB)</p>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

                                        <div className="flex items-center justify-between mt-2">
                                            {imageError ? (
                                                <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} /> {imageError}
                                                </p>
                                            ) : <div />}

                                            {imagePreview && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setForm(f => ({ ...f, image_url: '' })) }}
                                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faTrash} /> Hapus Gambar
                                                </button>
                                            )}
                                        </div>

                                        {/* Image Alt Text */}
                                        <div className="space-y-2 pt-4 border-t border-[var(--color-border)]">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Alt Text Gambar</label>
                                            <input type="text" value={form.image_alt}
                                                onChange={e => setForm(f => ({ ...f, image_alt: e.target.value }))}
                                                placeholder="Deskripsi gambar untuk aksesibilitas netra & SEO..."
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Publish & Featured Toggles */}
                                    <div className="flex flex-wrap gap-6 p-6 rounded-3xl bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)]">
                                        <label className="flex items-center gap-4 cursor-pointer">
                                            <button type="button" onClick={() => setForm(f => ({ ...f, is_published: !f.is_published }))}
                                                className={`w-12 h-[26px] rounded-full transition-all duration-300 relative ${form.is_published ? 'bg-emerald-500 shadow-md shadow-emerald-500/30' : 'bg-[var(--color-border)]'}`}>
                                                <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${form.is_published ? 'left-[25px]' : 'left-[3px]'}`} />
                                            </button>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] mb-0.5">Visibilitas</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{form.is_published ? 'Publik' : 'Disembunyikan / Draft'}</p>
                                            </div>
                                        </label>
                                        <div className="w-px h-8 bg-[var(--color-border)] hidden sm:block" />
                                        <label className="flex items-center gap-4 cursor-pointer">
                                            <button type="button" onClick={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
                                                className={`w-12 h-[26px] rounded-full transition-all duration-300 relative ${form.is_featured ? 'bg-amber-500 shadow-md shadow-amber-500/30' : 'bg-[var(--color-border)]'}`}>
                                                <div className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300 ${form.is_featured ? 'left-[25px]' : 'left-[3px]'}`} />
                                            </button>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest text-[var(--color-text)] mb-0.5">Hot News</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{form.is_featured ? 'Berita Unggulan (Top)' : 'Berita Standar'}</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* ── SEO TAB ── */}
                            {activeTab === 'seo' && (
                                <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
                                    <div className="p-4 rounded-3xl bg-[var(--color-primary)]/[0.03] border border-[var(--color-primary)]/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            {(() => {
                                                const seoChecks = [form.title?.length >= 15, form.excerpt?.length >= 80, !!form.slug && form.slug.length > 5, form.meta_title?.length >= 50 && form.meta_title?.length <= 60, form.meta_description?.length >= 150 && form.meta_description?.length <= 160, !!imagePreview]
                                                const seoScore = Math.round((seoChecks.filter(Boolean).length / seoChecks.length) * 100)
                                                const scoreColor = seoScore >= 80 ? 'text-emerald-500 bg-emerald-500/10' : seoScore >= 50 ? 'text-amber-500 bg-amber-500/10' : 'text-rose-500 bg-rose-500/10'
                                                return (
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black ${scoreColor}`}>
                                                        {seoScore}
                                                    </div>
                                                )
                                            })()}
                                            <div>
                                                <p className="text-sm font-black uppercase tracking-widest text-[var(--color-text)]">SEO Score</p>
                                                <p className="text-xs font-bold text-[var(--color-text-muted)] leading-relaxed mt-0.5 max-w-sm">
                                                    Skor dihitung berdasarkan panjang title, meta, gambar dan kelengkapan slug url secara real-time.
                                                </p>
                                            </div>
                                        </div>
                                        <button type="button" onClick={generateAiSeo} disabled={isGeneratingSeo || !form.content}
                                            className="px-6 h-11 shrink-0 rounded-2xl bg-[var(--color-primary)] text-white text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-[var(--color-primary)]/30 disabled:opacity-50 flex items-center justify-center gap-2">
                                            {isGeneratingSeo ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faMagicWandSparkles} />}
                                            {isGeneratingSeo ? 'Generating AI...' : 'Auto Generate By AI'}
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Meta Title */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Meta Title (SEO)</label>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${form.meta_title?.length > 60 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    {form.meta_title?.length || 0}/60
                                                </span>
                                            </div>
                                            <input type="text" value={form.meta_title}
                                                onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                                                placeholder="Judul SEO untuk Google (Otomatis dari judul jika kosong)..."
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>

                                        {/* Meta Description */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Meta Description</label>
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${form.meta_description?.length > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                    {form.meta_description?.length || 0}/160
                                                </span>
                                            </div>
                                            <textarea value={form.meta_description}
                                                onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                                                placeholder="Deskripsi untuk pengoptimalan hasil pencarian Google..."
                                                className="w-full px-4 py-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-medium min-h-[100px] outline-none transition-all resize-y leading-relaxed"
                                            />
                                        </div>
                                    </div>

                                    {/* Google Search Preview Card */}
                                    <div className="mt-8">
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-3">
                                            <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="mr-2" />Google Search Preview
                                        </label>
                                        <div className="p-6 rounded-3xl bg-white dark:bg-[#1f1f33] border border-[var(--color-border)] shadow-sm">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center">
                                                    {/* Globe/Favicon placeholder */}
                                                    <FontAwesomeIcon icon={faGlobe} className="text-gray-400 dark:text-gray-500" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-[#202124] dark:text-[#dadce0] leading-tight">Mutiara Harapan Islamic School</span>
                                                    <span className="text-xs text-[#4d5156] dark:text-[#bdc1c6] truncate max-w-sm">yoursite.com › news › {form.slug || 'contoh-slug-berita'}</span>
                                                </div>
                                            </div>
                                            <h3 className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] font-normal hover:underline cursor-pointer mb-2 line-clamp-1 group">
                                                {form.meta_title || form.title || 'Judul Halaman Informasi akan tampil disini'}
                                            </h3>
                                            <p className="text-sm text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">
                                                {form.scheduled_at ? <span className="font-bold text-gray-500 mr-2">{new Date(form.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} —</span> : null}
                                                {form.meta_description || form.excerpt || 'Deskripsi yang menarik dan representatif dari informasi yang dibagikan untuk meningkatkan rasio klik-tayang pengunjung...'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── MOBILE PREVIEW TAB ── */}
                            {activeTab === 'preview' && (
                                <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl mx-auto">
                                    {imagePreview && <img src={imagePreview} className="w-full h-64 md:h-80 object-cover rounded-[2rem] shadow-xl border border-[var(--color-border)]" alt="Preview" />}
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="px-4 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black uppercase tracking-widest">{form.tag}</span>
                                        <span className="text-[var(--color-text-muted)] text-sm font-bold flex items-center gap-2">
                                            <FontAwesomeIcon icon={faClock} className="opacity-50" /> {calculatedReadTime} menit baca
                                        </span>
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-black font-heading leading-tight text-[var(--color-text)]">
                                        {form.title || 'Judul Utama Informasi Akan Ditampilkan Dengan Gaya Tipografi Heading'}
                                    </h2>
                                    <div className="flex items-center gap-4 py-6 border-y border-[var(--color-border)]">
                                        <div className="w-12 h-12 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-xl text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faUser} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-[var(--color-text)]">{form.display_name || 'Admin Platform'}</span>
                                            <span className="text-xs font-medium text-[var(--color-text-muted)]">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="preview-content text-base md:text-lg text-[var(--color-text)] leading-relaxed prose prose-lg dark:prose-invert prose-headings:font-black prose-a:text-[var(--color-primary)] max-w-none"
                                        dangerouslySetInnerHTML={{ __html: form.content || '<p class="opacity-30 italic">Tulis konten untuk melihat preview aslinya di sini...</p>' }} />
                                </div>
                            )}

                        </div>
                    </div>

                    {/* ── Desktop Live Preview Sidebar ── */}
                    {isSidePreview && (
                        <div className="hidden xl:flex flex-col w-[450px] border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 rounded-[2rem] overflow-hidden sticky top-[120px] h-[calc(100vh-140px)] animate-in slide-in-from-right-8 duration-500 shadow-xl">

                            {/* Browser/Device Header */}
                            <div className="h-12 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-5 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm" />
                                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
                                </div>
                                <span className="text-[10px] font-black tracking-widest uppercase text-[var(--color-primary)] flex items-center gap-2 bg-[var(--color-primary)]/10 px-3 py-1 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                    Live Preview
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[var(--color-surface)] m-4 rounded-[1.5rem] border border-[var(--color-border)] shadow-sm">
                                <div className="space-y-6">
                                    {imagePreview && (
                                        <img src={imagePreview} className="w-full aspect-[4/3] object-cover rounded-[1.5rem] shadow-md border border-[var(--color-border)]" alt="Preview Thumbnail" />
                                    )}
                                    <div className="flex items-center gap-2 flex-wrap pb-2">
                                        <span className="px-3 py-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-sm shadow-[var(--color-primary)]/30">{form.tag}</span>
                                        <span className="text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-widest"><FontAwesomeIcon icon={faClock} className="mr-1" /> {calculatedReadTime} mnt</span>
                                    </div>
                                    <h2 className="text-2xl font-black font-heading leading-snug text-[var(--color-text)]">
                                        {form.title || 'Judul Simulasi UI'}
                                    </h2>
                                    <div className="flex items-center gap-3 border-b border-[var(--color-border)] pb-5 pt-2 mt-4">
                                        <div className="w-10 h-10 rounded-[1rem] bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faUser} className="text-sm" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-[var(--color-text)] leading-none mb-1">{form.display_name || 'Admin'}</span>
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">{new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                                        </div>
                                    </div>
                                    <div className="preview-content mt-4 max-w-none prose prose-sm dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-a:text-[var(--color-primary)] prose-img:rounded-xl text-[var(--color-text)] opacity-90"
                                        dangerouslySetInnerHTML={{ __html: form.content || '<p class="opacity-30 italic">Tulis di editor untuk melihat simulasi hasil akhir...</p>' }} />
                                </div>
                            </div>
                        </div>
                    )}
                </form>
                <ConfirmExitModal
                    isOpen={showExitModal}
                    onClose={() => setShowExitModal(false)}
                    onConfirm={() => {
                        setShowExitModal(false)
                        navigate('/admin/news')
                    }}
                />
            </div>
        </DashboardLayout>
    )
}
