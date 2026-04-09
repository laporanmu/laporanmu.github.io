import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faNewspaper, faCalendar,
    faUser, faChevronDown, faPen,
    faTrash, faEye, faEyeSlash, faSpinner,
    faXmark, faCheck, faTriangleExclamation,
    faClock, faGlobe, faCloudArrowUp, faCopy,
    faStar, faFilter, faChevronLeft,
    faChevronRight, faCheckSquare, faSquare,
    faBookOpen, faHashtag, faAlignLeft, faImage,
    faArrowUpRightFromSquare, faArchive, faRotateLeft,
    faTags, faUserPen, faMagicWandSparkles, faSliders
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../../components/layout/DashboardLayout'
import Breadcrumb from '../../../components/ui/Breadcrumb'
import { useToast } from '../../../context/ToastContext'
import { supabase } from '../../../lib/supabase'
import { logAudit } from '../../../lib/auditLogger'

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


const PAGE_SIZE = 12

// ─── Confirm Delete Modal ────────────────────────────────────────────────────────

const ConfirmDeleteModal = memo(({ isOpen, onClose, onConfirm, title, isDeleting }) => {
    if (!isOpen) return null
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
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
        </div>,
        document.body
    )
})
ConfirmDeleteModal.displayName = 'ConfirmDeleteModal'

const ConfirmDuplicateModal = memo(({ isOpen, onClose, onConfirm, title, isDuplicating }) => {
    if (!isOpen) return null
    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[2rem] shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 text-2xl">
                        <FontAwesomeIcon icon={faCopy} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-[var(--color-text)]">Duplikat Informasi?</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1.5 font-medium leading-relaxed">
                            Bikin salinan draf untuk "<span className="font-black">{title}</span>".
                        </p>
                    </div>
                    <div className="flex w-full gap-3 pt-2">
                        <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-colors">
                            Batal
                        </button>
                        <button onClick={onConfirm} disabled={isDuplicating} className="flex-1 h-11 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                            {isDuplicating ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCopy} />}
                            Duplikat
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
})
ConfirmDuplicateModal.displayName = 'ConfirmDuplicateModal'


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
        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--color-primary)] rounded-2xl shadow-lg shadow-[var(--color-primary)]/30 animate-in slide-in-from-bottom-4 duration-200 overflow-x-auto scrollbar-hide relative max-w-full">
            <span className="text-white text-[11px] font-black shrink-0 whitespace-nowrap">{count} dipilih</span>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <button onClick={onPublish} className="shrink-0 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5">
                <FontAwesomeIcon icon={faEye} className="text-[9px]" /> Publikasikan
            </button>
            <button onClick={onArchive} className="shrink-0 text-white text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-opacity flex items-center gap-1.5">
                <FontAwesomeIcon icon={faArchive} className="text-[9px]" /> Arsipkan
            </button>
            <button onClick={onDelete} className="shrink-0 text-rose-200 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5">
                <FontAwesomeIcon icon={faTrash} className="text-[9px]" /> Hapus
            </button>
            <div className="sticky right-0 ml-auto bg-[var(--color-primary)] pl-4 flex items-center shrink-0">
                <div className="absolute left-0 top-0 bottom-0 w-8 -ml-8 bg-gradient-to-r from-transparent to-[var(--color-primary)] pointer-events-none" />
                <button onClick={onClear} className="w-6 h-6 flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors">
                    <FontAwesomeIcon icon={faXmark} className="text-sm" />
                </button>
            </div>
        </div>
    )
})
BulkActionBar.displayName = 'BulkActionBar'

// ─── Main Page ───────────────────────────────────────────────────────────────────

export default function NewsListPage() {
    const navigate = useNavigate()
    const { addToast } = useToast()
    const [newsList, setNewsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [searchInput, setSearchInput] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const [sortBy, setSortBy] = useState('newest')
    const [page, setPage] = useState(0)
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, data: null, isDeleting: false })
    const [duplicateModal, setDuplicateModal] = useState({ isOpen: false, data: null, isDuplicating: false })
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [currentUserName, setCurrentUserName] = useState('')
    const [showFilter, setShowFilter] = useState(false)

    // ── Debounced search ──
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(0) }, 300)
        return () => clearTimeout(t)
    }, [searchInput])

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
                !decodeEntities(n.content || '').toLowerCase().includes(q) &&
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
        else if (sortBy === 'views') list = [...list].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
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



    // ── Delete ──────────────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!deleteModal.data) return
        const itemToDelete = deleteModal.data
        setDeleteModal(p => ({ ...p, isDeleting: true }))
        const { error } = await supabase.from('news').delete().eq('id', itemToDelete.id)
        setDeleteModal({ isOpen: false, data: null, isDeleting: false })
        if (error) { addToast('Gagal hapus: ' + error.message, 'error'); return }
        setNewsList(prev => prev.filter(n => n.id !== itemToDelete.id))
        await logAudit({
            action: 'DELETE',
            source: 'SYSTEM',
            tableName: 'news',
            recordId: itemToDelete.id,
            oldData: itemToDelete
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

    const handleDuplicate = useCallback(async () => {
        if (!duplicateModal.data) return
        const item = duplicateModal.data
        setDuplicateModal(p => ({ ...p, isDuplicating: true }))

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
        
        setDuplicateModal({ isOpen: false, data: null, isDuplicating: false })
        
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
    }, [duplicateModal.data, addToast])

    const openDuplicateModal = useCallback((item) => {
        setDuplicateModal({ isOpen: true, data: item, isDuplicating: false })
    }, [])

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
                        <button onClick={() => navigate('/admin/news/create')}
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
                <div className="bg-[var(--color-surface)] rounded-[1.5rem] border border-[var(--color-border)] shadow-sm overflow-hidden">

                    {/* Row 1: Search + action buttons — always one row */}
                    <div className="flex flex-row items-center gap-2 p-3">
                        {/* Search */}
                        <div className="relative flex-1 min-w-0">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                            <input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Cari judul, kategori, konten, atau penulis..."
                                className="w-full h-9 pl-8 pr-8 rounded-xl border border-[var(--color-border)] bg-transparent text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                            />
                            {searchInput && (
                                <button onClick={() => { setSearchInput(''); setSearch('') }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                    <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                </button>
                            )}
                        </div>

                        {/* Compact action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            {/* Select All */}
                            {filteredNews.length > 0 && (
                                <button onClick={() => selectedIds.size === paginatedNews.length ? clearSelection() : selectAll()}
                                    className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedIds.size > 0 ? 'bg-indigo-500 border-indigo-500 text-white shadow-md' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={selectedIds.size > 0 ? faCheckSquare : faSquare} className="text-[9px]" />
                                    <span className="hidden xs:inline">{selectedIds.size > 0 ? 'Terpilih' : 'Pilih'}</span>
                                    {selectedIds.size > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                            {selectedIds.size}
                                        </span>
                                    )}
                                </button>
                            )}

                            {/* Filter toggle */}
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${showFilter || filterStatus !== 'all' || sortBy !== 'newest' ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {(filterStatus !== 'all' || sortBy !== 'newest') && (
                                    <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                        {(filterStatus !== 'all' ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0)}
                                    </span>
                                )}
                            </button>

                            {/* Reset filters */}
                            {(filterStatus !== 'all' || sortBy !== 'newest' || search) && (
                                <button
                                    onClick={() => { setSearchInput(''); setSearch(''); setFilterStatus('all'); setSortBy('newest') }}
                                    className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 active:scale-95 flex items-center gap-1.5"
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                    <span className="hidden sm:inline">Reset</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Collapsible filter panel */}
                    {showFilter && (
                        <div className="px-3 pb-3 -mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-2 animate-in slide-in-from-top-2 fade-in duration-300">
                            {/* Filter status tabs - Wraps on mobile so all are visible without scrolling */}
                            <div className="flex gap-1.5 flex-wrap flex-1 w-full sm:w-auto pb-1 sm:pb-0">
                                {[{k:'all',l:'Semua'},{k:'published',l:'Terpublikasi'},{k:'draft',l:'Draf'},{k:'scheduled',l:'Terjadwal'},{k:'featured',l:'Unggulan'}].map(({k:s,l}) => (
                                    <button key={s} onClick={() => { setFilterStatus(s); setPage(0) }}
                                        className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === s ? 'bg-[var(--color-primary)] text-white shadow-md' : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        {l}
                                        <span className="ml-1.5 opacity-50 px-1.5 py-0.5 rounded-lg bg-black/5">{statusCounts[s] || 0}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Result count + Sort — pushed right */}
                            <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-50 whitespace-nowrap hidden sm:inline">
                                    {filteredNews.length} dari {newsList.length} artikel
                                </span>
                                <div className="w-px h-6 bg-[var(--color-border)] hidden sm:block" />
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                                    className="h-8 pl-3 pr-8 w-full sm:w-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-all appearance-none cursor-pointer">
                                    <option value="newest">Terbaru</option>
                                    <option value="oldest">Terlama</option>
                                    <option value="views">Paling Banyak Dilihat</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Active filter chips */}
                    {(search || filterStatus !== 'all' || sortBy !== 'newest') && (
                        <div className="px-3 pb-3 -mt-1">
                            <div className="flex flex-wrap items-center gap-2">
                                {search && (
                                    <button type="button" onClick={() => { setSearchInput(''); setSearch('') }}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus pencarian">
                                        <FontAwesomeIcon icon={faSearch} className="text-[10px] opacity-60" />
                                        <span className="max-w-[140px] truncate">"{search}"</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterStatus !== 'all' && (
                                    <button type="button" onClick={() => setFilterStatus('all')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-[10px] font-black text-indigo-600" title="Hapus filter status">
                                        Status: {{published:'Terpublikasi',draft:'Draf',scheduled:'Terjadwal',featured:'Unggulan'}[filterStatus] || filterStatus}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-indigo-500/20 flex items-center justify-center text-indigo-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                <span className="ml-auto text-[9px] font-black text-[var(--color-text-muted)] opacity-40 uppercase tracking-widest">
                                    {filteredNews.length} hasil
                                </span>
                            </div>
                        </div>
                    )}
                </div>

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
                        {Array.from({ length: Math.min(PAGE_SIZE, newsList.length || PAGE_SIZE) }).map((_, i) => <NewsSkeleton key={i} />)}
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
                                <button onClick={() => { setSearchInput(''); setSearch(''); setFilterStatus('all') }}
                                    className="h-11 px-8 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[8px]" />
                                    Reset semua filter
                                </button>
                            ) : (
                                <button onClick={() => navigate('/admin/news/create')}
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
                                    onEdit={n => navigate(`/admin/news/edit/${n.id}`)}
                                    onDelete={n => setDeleteModal({ isOpen: true, data: n, isDeleting: false })}
                                    onToggleStatus={handleToggleStatus}
                                    onDuplicate={openDuplicateModal}
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
                                {Array.from({ length: totalPages }, (_, i) => i).filter(i => {
                                    if (totalPages <= 7) return true
                                    if (i === 0 || i === totalPages - 1) return true
                                    if (Math.abs(i - page) <= 1) return true
                                    return false
                                }).reduce((acc, i, idx, arr) => {
                                    if (idx > 0 && arr[idx - 1] !== i - 1) acc.push('...' + i)
                                    acc.push(i)
                                    return acc
                                }, []).map((item) => {
                                    if (typeof item === 'string') return (
                                        <span key={item} className="w-10 h-10 flex items-center justify-center text-[11px] font-black text-[var(--color-text-muted)] select-none">…</span>
                                    )
                                    return (
                                        <button key={item} onClick={() => setPage(item)}
                                            className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all ${item === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                            {item + 1}
                                        </button>
                                    )
                                })}
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

                <ConfirmDeleteModal
                    isOpen={deleteModal.isOpen}
                    onClose={() => setDeleteModal({ isOpen: false, data: null, isDeleting: false })}
                    onConfirm={handleDelete}
                    title={deleteModal.data?.title}
                    isDeleting={deleteModal.isDeleting}
                />
                <ConfirmDuplicateModal
                    isOpen={duplicateModal.isOpen}
                    onClose={() => setDuplicateModal({ isOpen: false, data: null, isDuplicating: false })}
                    onConfirm={handleDuplicate}
                    title={duplicateModal.data?.title}
                    isDuplicating={duplicateModal.isDuplicating}
                />
            </div>
        </DashboardLayout>
    )
}