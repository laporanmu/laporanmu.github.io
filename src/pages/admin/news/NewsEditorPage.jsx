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
    faEyeSlash, faShareNodes, faRotateLeft, faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import Breadcrumb from '../../../components/ui/Breadcrumb'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLogger'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import { useSchoolSettings } from '../../../context/SchoolSettingsContext'
import MediaLibraryModal from './MediaLibraryModal'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const slugify = (text) => text.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)
const getReadTime = (html) => {
    if (!html) return 1
    const text = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
    const words = text.split(/\s+/).filter(Boolean).length
    const images = (html.match(/<img/g) || []).length

    // Standard: 200 words per minute
    // Plus 12 seconds for first image, 11 for second, ..., 3 for tenth+
    const imageTime = Array.from({ length: images }, (_, i) => Math.max(3, 12 - i))
        .reduce((acc, curr) => acc + curr, 0) / 60

    const wordTime = words / 200
    return Math.max(1, Math.ceil(wordTime + imageTime))
}
const decodeEntities = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()
const getExcerpt = (html, maxLen = 160) => { const text = decodeEntities(html); return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text }
const isFormEmpty = (form) => {
    const cleanTitle = (form.title || '').trim()
    const cleanContent = (form.content || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
    return !cleanTitle && !cleanContent
}

export default function NewsEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
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
        focus_keyword: '',
        seo_score: 0,
    })

    const [isLoading, setIsLoading] = useState(isEdit)
    const [isSaving, setIsSaving] = useState(false)
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(null)
    const [imageError, setImageError] = useState('')
    const [activeTab, setActiveTab] = useState('content') // content | settings | seo
    const [isGeneratingSeo, setIsGeneratingSeo] = useState(false)
    const [isSidePreview, setIsSidePreview] = useState(window.innerWidth > 1024)
    const [seoView, setSeoView] = useState('search') // search | social
    const fileInputRef = useRef(null)
    const quillRef = useRef(null)
    const [isDragging, setIsDragging] = useState(false)
    const [lastSaved, setLastSaved] = useState(null)
    const [hasDraft, setHasDraft] = useState(false)
    const [isDraftDismissed, setIsDraftDismissed] = useState(false)
    const [showExitModal, setShowExitModal] = useState(false)
    const [isMediaModalOpen, setIsMediaModalOpen] = useState(false)
    const [isZenMode, setIsZenMode] = useState(false)
    const [existingTags, setExistingTags] = useState([])
    const [showTagSuggestions, setShowTagSuggestions] = useState(false)
    const [seoAnalysis, setSeoAnalysis] = useState([])

    // ── Auto-save to LocalStorage (Create Mode Only) ──
    useEffect(() => {
        if (isEdit) return
        const draft = localStorage.getItem('news_draft')
        if (draft && !isDraftDismissed) {
            const parsed = JSON.parse(draft)
            // Only show if draft has meaningful content and current form is effectively empty
            if (!isFormEmpty(parsed) && isFormEmpty(form)) {
                setHasDraft(true)
            }
        }
    }, [isEdit, isDraftDismissed, form.title, form.content])

    useEffect(() => {
        if (isEdit || isSaving) return
        const timer = setTimeout(() => {
            if (!isFormEmpty(form)) {
                localStorage.setItem('news_draft', JSON.stringify(form))
            } else {
                // If form becomes empty (e.g. user deleted everything), clean up potential ghost draft
                localStorage.removeItem('news_draft')
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

    // ── Fetch Profile & Existing Tags ──
    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Fetch Profile
                if (!isEdit) {
                    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
                    if (data?.full_name) setForm(f => ({ ...f, display_name: data.full_name }))
                }
                // Fetch Tags for suggestion
                const { data: tags } = await supabase.from('news').select('tag')
                if (tags) {
                    const uniqueTags = [...new Set(tags.map(t => t.tag))].filter(Boolean)
                    setExistingTags(uniqueTags)
                }
            }
        }
        fetchData()
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
                    focus_keyword: data.focus_keyword || '',
                    seo_score: data.seo_score || 0,
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

    // ── SEO Logic ──
    const analyzeSeo = useCallback(() => {
        const text = decodeEntities(form.content)
        const wordCount = text.split(/\s+/).filter(Boolean).length
        const kw = form.focus_keyword.toLowerCase()
        const metaDesc = form.meta_description.toLowerCase()
        const title = form.title.toLowerCase()
        const slug = form.slug.toLowerCase()

        let score = 0
        const checks = []

        // Title Checks
        if (form.title.length >= 50 && form.title.length <= 60) { score += 15; checks.push({ label: 'Panjang Judul Ideal', st: 'success' }) }
        else { checks.push({ label: 'Judul sebaiknya 50-60 karakter', st: 'warning' }) }

        // Meta Checks
        if (form.meta_description.length >= 120 && form.meta_description.length <= 160) { score += 15; checks.push({ label: 'Panjang Meta Deskripsi Ideal', st: 'success' }) }
        else { checks.push({ label: 'Meta deskripsi sebaiknya 120-160 karakter', st: 'warning' }) }

        // Keyword Checks
        if (kw) {
            if (title.includes(kw)) { score += 20; checks.push({ label: 'Keyword ada di Judul', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ditemukan di Judul', st: 'error' }) }

            if (slug.includes(kw)) { score += 15; checks.push({ label: 'Keyword ada di Slug URL', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ditemukan di Slug', st: 'error' }) }

            if (metaDesc.includes(kw)) { score += 15; checks.push({ label: 'Keyword ada di Meta Deskripsi', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ditemukan di Meta', st: 'error' }) }
            
            if (text.toLowerCase().slice(0, 500).includes(kw)) { score += 10; checks.push({ label: 'Keyword ada di paragraf pembuka', st: 'success' }) }
            else { checks.push({ label: 'Keyword tidak ada di awal konten', st: 'warning' }) }
        } else {
            checks.push({ label: 'Tentukan kata kunci utama!', st: 'info' })
        }

        // Length
        if (wordCount > 300) { score += 10; checks.push({ label: 'Panjang konten memadai (>300 kata)', st: 'success' }) }
        else { checks.push({ label: 'Konten terlalu pendek untuk SEO', st: 'warning' }) }

        setSeoAnalysis(checks)
        setForm(f => ({ ...f, seo_score: score }))
    }, [form.content, form.title, form.meta_description, form.slug, form.focus_keyword])

    useEffect(() => {
        const timer = setTimeout(() => analyzeSeo(), 1000)
        return () => clearTimeout(timer)
    }, [analyzeSeo])

    const generateAiSeo = () => {
        if (!form.content || isGeneratingSeo) return
        setIsGeneratingSeo(true)

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
                slug: f.slug || slugify(f.title),
                // Try to guess keyword from title (first 2 words)
                focus_keyword: f.focus_keyword || f.title.split(' ').slice(0, 2).join(' ')
            }))

            setIsGeneratingSeo(false)
            addToast('SEO Metadata & Keyword berhasil di-generate', 'success')
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

    const refreshSlug = () => {
        if (!form.title) return
        setForm(f => ({ ...f, slug: slugify(f.title) }))
        addToast('Slug URL diperbarui dari judul', 'info')
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
                focus_keyword: form.focus_keyword || null,
                seo_score: form.seo_score || 0,
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
                <div className="relative w-full max-w-[380px] bg-[var(--color-surface)] rounded-[2.5rem] border border-[var(--color-border)] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                    <div className="p-8 text-center pb-6">
                        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 text-xl mx-auto mb-6">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                        </div>
                        <h3 className="text-xl font-black text-[var(--color-text)] mb-3 tracking-tight">Batalkan Penulisan?</h3>
                        <p className="text-[12px] font-bold text-[var(--color-text-muted)] leading-relaxed px-4 opacity-80">
                            Ada perubahan yang belum disimpan. Konten yang baru saja kamu tulis akan hilang secara permanen.
                        </p>
                    </div>
                    <div className="flex gap-3 px-8 pb-8 pt-2">
                        <button onClick={onClose}
                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] active:scale-95 transition-all">
                            Batal
                        </button>
                        <button onClick={onConfirm}
                            className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:brightness-110 active:scale-95 transition-all">
                            Ya, Buang
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
                                                <button type="button" onClick={() => setIsZenMode(true)}
                                                    className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition-all"
                                                    title="Zen Mode (Full Screen)">
                                                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                            <div className="flex-1 flex flex-col group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] overflow-hidden shadow-sm focus-within:border-[var(--color-primary)]/50 focus-within:ring-4 focus-within:ring-[var(--color-primary)]/5 transition-all duration-300">
                                                <style>{`
                                                    .ql-container.ql-snow { border: none !important; }
                                                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid var(--color-border) !important; background: var(--color-surface-alt) !important; }
                                                    .ql-editor { min-height: 400px; padding: 1.5rem !important; }
                                                `}</style>
                                                <ReactQuill theme="snow" value={form.content} ref={quillRef}
                                                    placeholder="Tulis detail informasi di sini..."
                                                    onChange={handleContentChange}
                                                    modules={modules}
                                                    className="flex-1"
                                                />
                                                {/* Premium Editor Status Bar */}
                                                <div className="flex items-center justify-between px-6 py-3 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] text-[9px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)] animate-in fade-in slide-in-from-bottom-1 duration-500">
                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2 group/stat cursor-default">
                                                            <div className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] shadow-sm">
                                                                <FontAwesomeIcon icon={faAlignLeft} className="text-[8px]" />
                                                            </div>
                                                            <span className="opacity-70 group-hover/stat:opacity-100 transition-opacity whitespace-nowrap">
                                                                {form.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').split(/\s+/).filter(Boolean).length} Kata
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 group/stat cursor-default">
                                                            <div className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-amber-500 shadow-sm">
                                                                <FontAwesomeIcon icon={faHashtag} className="text-[8px]" />
                                                            </div>
                                                            <span className="opacity-70 group-hover/stat:opacity-100 transition-opacity whitespace-nowrap">
                                                                {form.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').length} Karakter
                                                            </span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-5">
                                                        {lastSaved && (
                                                            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-emerald-500/5 text-emerald-500">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                <span className="whitespace-nowrap">Saved {new Date(lastSaved).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-2 pl-4 border-l border-[var(--color-border)]">
                                                            <div className="w-5 h-5 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20">
                                                                <FontAwesomeIcon icon={faUserPen} className="text-[8px]" />
                                                            </div>
                                                            <span className="truncate max-w-[80px] opacity-80">{form.display_name?.split(' ')[0] || 'Admin'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                    </div>
                                </div>
                            )}

                            {/* ── SETTINGS TAB ── */}
                            {activeTab === 'settings' && (
                                <div className="space-y-5 animate-in fade-in duration-300 max-w-3xl">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kategori</label>
                                            <div className="relative group">
                                                <input type="text" value={form.tag}
                                                    onChange={e => { setForm(f => ({ ...f, tag: e.target.value })); setShowTagSuggestions(true) }}
                                                    onFocus={() => setShowTagSuggestions(true)}
                                                    placeholder="Pilih atau ketik kategori..."
                                                    className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                                />
                                                <FontAwesomeIcon icon={faTags} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] opacity-40 pointer-events-none" />
                                                
                                                {showTagSuggestions && existingTags.length > 0 && (
                                                    <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-[var(--color-border)] rounded-xl shadow-xl py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="px-3 pb-2 mb-1 border-b border-[var(--color-border)]">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Saran Kategori</p>
                                                        </div>
                                                        <div className="max-h-[160px] overflow-y-auto">
                                                            {['Informasi', 'Pengumuman', 'Akademik', 'Event', 'Prestasi', ...existingTags.filter(t => !['Informasi', 'Pengumuman', 'Akademik', 'Event', 'Prestasi'].includes(t))]
                                                                .filter(t => t.toLowerCase().includes(form.tag.toLowerCase()))
                                                                .map((t, idx) => (
                                                                    <button key={idx} type="button" onClick={() => { setForm(f => ({ ...f, tag: t })); setShowTagSuggestions(false) }}
                                                                        className="w-full px-4 py-2 text-left text-xs font-bold text-[var(--color-text)] hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)] transition-colors">
                                                                        {t}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                        <div className="mx-3 mt-1 pt-2 border-t border-[var(--color-border)]">
                                                            <button type="button" onClick={() => setShowTagSuggestions(false)} className="text-[9px] font-black uppercase tracking-widest text-rose-500">Tutup</button>
                                                        </div>
                                                    </div>
                                                )}
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Slug */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Slug URL</label>
                                                <button type="button" onClick={refreshSlug} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-primary)] hover:underline flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" /> Sinkron Judul
                                                </button>
                                            </div>
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
                                    <div className="space-y-2.5">
                                        <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Thumbnail Utama</label>
                                        <div onClick={() => fileInputRef.current?.click()}
                                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                            onDragLeave={() => setIsDragging(false)}
                                            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleImageChange({ target: { files: [f] } }) }}
                                            className={`h-32 relative group cursor-pointer overflow-hidden rounded-[1.25rem] border-2 border-dashed transition-all duration-300 ${isDragging ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 bg-[var(--color-surface-alt)]/50'}`}>
                                            {imagePreview ? (
                                                <>
                                                    <img src={imagePreview} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Thumbnail" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <span className="px-6 py-3 bg-white text-black text-sm font-black rounded-2xl shadow-xl transform scale-90 group-hover:scale-100 transition-transform">Ganti Gambar</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="h-full flex items-center justify-center p-6 text-center gap-6">
                                                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:scale-110 group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)] group-hover:border-[var(--color-primary)]/30 transition-all shadow-sm">
                                                        <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-widest mb-1">{isDragging ? 'Lepas Gambar' : 'Klik atau Seret Gambar'}</p>
                                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] opacity-60">Format JPG, PNG atau WEBP (Maksimal 5MB)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />

                                        <div className="flex items-center justify-between mt-2">
                                            {imageError ? (
                                                <p className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faTriangleExclamation} /> {imageError}
                                                </p>
                                            ) : <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => setIsMediaModalOpen(true)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] bg-[var(--color-primary)]/5 hover:bg-[var(--color-primary)]/10 rounded-xl transition-colors flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faImage} /> Pilih dari Galeri
                                                </button>
                                            </div>}

                                            {imagePreview && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setImageFile(null); setForm(f => ({ ...f, image_url: '' })) }}
                                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faTrash} /> Hapus Gambar
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
                                            <label className="text-xs font-black uppercase tracking-widest text-[var(--color-text-muted)]">Alt Text Gambar</label>
                                            <input type="text" value={form.image_alt}
                                                onChange={e => setForm(f => ({ ...f, image_alt: e.target.value }))}
                                                placeholder="Deskripsi gambar untuk aksesibilitas netra & SEO..."
                                                className="w-full h-10 px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] text-sm font-bold outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Visibility Switches */}
                                    <div className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex flex-col md:flex-row gap-6 md:divide-x md:divide-[var(--color-border)]">
                                        <div className="flex items-center gap-4 pr-6 min-w-[200px]">
                                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                                                <input type="checkbox" checked={form.is_published}
                                                    onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                            </label>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Visibilitas</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">{form.is_published ? 'Publik' : 'Draft Pribadi'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 md:pl-6 min-w-[200px]">
                                            <label className="relative inline-flex items-center cursor-pointer scale-90">
                                                <input type="checkbox" checked={form.is_featured}
                                                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-500"></div>
                                            </label>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">Urutan</p>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">{form.is_featured ? 'Hot News (Top)' : 'Berita Standar'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ── SEO TAB ── */}
                            {activeTab === 'seo' && (
                                <div className="space-y-4 animate-in fade-in duration-300 max-w-5xl pb-5">
                                    <div className="flex flex-col lg:flex-row items-stretch gap-4">
                                        {/* Score Card */}
                                        <div className="lg:w-[310px] p-4 rounded-[1.5rem] bg-indigo-50 border border-indigo-100 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12" />
                                            
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-lg font-black shadow-inner ${form.seo_score >= 80 ? 'bg-emerald-500 text-white' : form.seo_score >= 50 ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                    {form.seo_score}
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-900/60 mb-0.5">Overall SEO Health</p>
                                                    <p className="text-xs font-black text-indigo-950 uppercase tracking-tight leading-tight">
                                                        {form.seo_score >= 80 ? 'Sangat Optimal' : form.seo_score >= 50 ? 'Butuh Perbaikan' : 'Buruk (Segera Perbaiki)'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-indigo-900/40">Focus Keyword</label>
                                                <input type="text" value={form.focus_keyword}
                                                    onChange={e => setForm(f => ({ ...f, focus_keyword: e.target.value }))}
                                                    placeholder="Contoh: PPDB 2024..."
                                                    className="w-full h-10 px-4 rounded-xl bg-white border border-indigo-100 focus:border-indigo-400 text-sm font-bold text-indigo-950 outline-none transition-all placeholder:text-indigo-900/20"
                                                />
                                            </div>
                                        </div>

                                        {/* Real-time Checklist */}
                                        <div className="flex-1 p-4 rounded-[1.5rem] bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] flex flex-col gap-3.5">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">SEO Analysis Checklist</h4>
                                                <button type="button" onClick={generateAiSeo} disabled={isGeneratingSeo || !form.content}
                                                    className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap">
                                                    {isGeneratingSeo ? <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[8px]" /> : <FontAwesomeIcon icon={faMagicWandSparkles} className="text-[8px]" />}
                                                    {isGeneratingSeo ? 'Gen...' : 'AI Optimizer'}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
                                                {seoAnalysis.map((item, idx) => (
                                                    <div key={idx} className="flex items-start gap-2.5 text-[9px] sm:text-[10px]">
                                                        <div className={`w-3.5 h-3.5 shrink-0 mt-0.5 rounded-full flex items-center justify-center text-[6px] ${item.st === 'success' ? 'bg-emerald-500 text-white' : item.st === 'error' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'}`}>
                                                            <FontAwesomeIcon icon={item.st === 'success' ? faCheck : item.st === 'error' ? faXmark : faTriangleExclamation} />
                                                        </div>
                                                        <span className={`font-bold leading-tight ${item.st === 'success' ? 'text-emerald-700/80' : item.st === 'error' ? 'text-rose-700/80' : 'text-amber-700/80'}`}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-4 pt-2 border-t border-[var(--color-border)]">
                                                <div className="flex items-center h-7 gap-1 p-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg w-fit">
                                                    <button type="button" onClick={() => setSeoView('search')}
                                                        className={`h-full px-3 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${seoView === 'search' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>Google</button>
                                                    <button type="button" onClick={() => setSeoView('social')}
                                                        className={`h-full px-3 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${seoView === 'social' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>Social</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">SEO Title</label>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${form.meta_title?.length > 60 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                        {form.meta_title?.length || 0}/60
                                                    </span>
                                                </div>
                                                <input type="text" value={form.meta_title}
                                                    onChange={e => setForm(f => ({ ...f, meta_title: e.target.value }))}
                                                    placeholder="Headline untuk hasil pencarian..."
                                                    className="w-full h-12 px-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-bold outline-none transition-all shadow-sm"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Meta Description</label>
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${form.meta_description?.length > 160 ? 'bg-rose-500/10 text-rose-500' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                        {form.meta_description?.length || 0}/160
                                                    </span>
                                                </div>
                                                <textarea value={form.meta_description}
                                                    onChange={e => setForm(f => ({ ...f, meta_description: e.target.value }))}
                                                    placeholder="Tulis ringkasan konten yang informatif..."
                                                    className="w-full h-32 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:bg-[var(--color-surface)] text-sm font-medium outline-none transition-all resize-none shadow-sm leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-2">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                                    <FontAwesomeIcon icon={seoView === 'search' ? faGlobe : faShareNodes} className="opacity-50" />
                                                    {seoView === 'search' ? 'Google Search Preview' : 'Social Media Card Preview'}
                                                </p>
                                                <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-tighter whitespace-nowrap">Live Simulation</span>
                                            </div>

                                            {seoView === 'search' ? (
                                                <div className="p-6 rounded-[2rem] bg-white dark:bg-[#1f1f33] border border-[var(--color-border)] shadow-xl animate-in zoom-in-95 duration-500">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                                                            {settings.logo_url ? (
                                                                <img src={settings.logo_url} className="w-full h-full object-contain p-0.5" alt="Favicon" />
                                                            ) : (
                                                                <FontAwesomeIcon icon={faGlobe} className="text-xs text-gray-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="text-[12px] font-medium text-[#202124] dark:text-[#dadce0] truncate uppercase tracking-tighter">{settings.school_name_id}</span>
                                                            <span className="text-[11px] text-[#4d5156] dark:text-[#bdc1c6] truncate">
                                                                https://{settings.app_domain} › news › {form.slug || 'slug'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <h3 className="text-xl text-[#1a0dab] dark:text-[#8ab4f8] font-normal hover:underline cursor-pointer mb-1 truncate">
                                                        {form.meta_title || form.title || 'Judul Halaman...'}
                                                    </h3>
                                                    <p className="text-[13px] text-[#4d5156] dark:text-[#bdc1c6] line-clamp-2 leading-relaxed">
                                                        <span className="text-gray-400 mr-1">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} —</span>
                                                        {form.meta_description || form.excerpt || 'Ringkasan berita akan tampil di sini saat pengunjung mencari melalui Google...'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="max-w-[380px] rounded-xl bg-white dark:bg-[#202c33] border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl animate-in zoom-in-95 duration-500">
                                                    {imagePreview ? (
                                                        <img src={imagePreview} className="w-full aspect-[2/1] object-cover" alt="Card" />
                                                    ) : (
                                                        <div className="w-full aspect-[2/1] bg-gray-100 flex items-center justify-center text-gray-300">
                                                            <FontAwesomeIcon icon={faImage} size="2x" />
                                                        </div>
                                                    )}
                                                    <div className="p-3 border-l-4 border-emerald-500 bg-[#f0f2f5] dark:bg-[#111b21]/50 space-y-0.5">
                                                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-gray-100 truncate">
                                                            {form.meta_title || form.title || 'Judul Konten'}
                                                        </h4>
                                                        <p className="text-[12px] text-gray-500 dark:text-gray-400 truncate">
                                                            {form.meta_description || form.excerpt || 'Dapatkan informasi selengkapnya...'}
                                                        </p>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                                            {settings.app_domain?.toUpperCase()}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <p className="text-[10px] text-[var(--color-text-muted)] italic font-medium leading-relaxed">
                                                * Pratinjau di atas adalah simulasi metadata OpenGraph (OG) saat link artikel dibagikan di WhatsApp, Facebook, atau LinkedIn.
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
                    onConfirm={() => navigate('/admin/news')}
                />

                {/* ── Zen Mode Editor Portal ── */}
                {isZenMode && createPortal(
                    <div className="fixed inset-0 z-[99999] bg-[var(--color-surface)] flex flex-col animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
                        <div className="sticky top-0 z-20 bg-[var(--color-surface)]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-[var(--color-border)]">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-[var(--color-text)] tracking-tight">Focus Zen Mode</h2>
                                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Editor Bebas Gangguan</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${form.seo_score >= 80 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    SEO: {form.seo_score}/100
                                </div>
                                <button onClick={() => setIsZenMode(false)}
                                    className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                    Simpan & Keluar Zen
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 flex flex-col space-y-6">
                            <input type="text" value={form.title} onChange={e => handleTitleChange(e.target.value)}
                                placeholder="Judul Informasi..."
                                className="w-full text-4xl font-black font-heading bg-transparent outline-none border-none placeholder:opacity-20 text-[var(--color-text)] mb-4"
                            />
                            <div className="flex-1 flex flex-col">
                                <ReactQuill theme="snow" value={form.content} ref={quillRef}
                                    onChange={handleContentChange}
                                    modules={modules}
                                    className="flex-1"
                                />
                                <style>{`
                                    .fixed .ql-container.ql-snow { border: none !important; min-height: 500px !important; }
                                    .fixed .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid var(--color-border) !important; border-radius: 0 !important; background: var(--color-surface) !important; margin-bottom: 1rem; position: sticky; top: 78px; z-index: 10; padding-left: 0 !important;}
                                    .fixed .ql-editor { font-size: 1.15rem; padding: 2rem 0 !important; line-height: 1.8; color: var(--color-text); }
                                `}</style>
                            </div>
                            
                            <div className="text-center pt-20 pb-10 text-[9px] font-bold text-[var(--color-text-muted)] opacity-30 uppercase tracking-[0.2em]">
                                Tekan Ctrl + S untuk menyimpan progres • Laporanmu CMS Enterprise
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                <MediaLibraryModal
                    isOpen={isMediaModalOpen}
                    onClose={() => setIsMediaModalOpen(false)}
                    currentSelection={form.image_url}
                    onSelect={(url) => {
                        setForm(f => ({ ...f, image_url: url }))
                        setImagePreview(url)
                        setImageFile(null)
                        setIsMediaModalOpen(false)
                        addToast('Gambar dari galeri dipilih', 'success')
                    }}
                />
            </div>
        </DashboardLayout>
    )
}
