import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faSpinner, faCalendar,
    faCheckCircle, faXmark, faSliders, faBoxArchive, faRotateLeft,
    faKeyboard, faChevronLeft, faChevronRight, faGrip,
    faAnglesLeft, faAnglesRight, faDownload, faCopy,
    faGraduationCap, faLayerGroup, faCircleCheck, faCheck,
    faClock, faCalendarDay, faTableList, faHistory,
    faFingerprint, faTimeline, faTimes, faFileExport, faEye, faEyeSlash
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { useDebounce } from '../../hooks/useDebounce'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Pagination from '../../components/ui/Pagination'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'
import AcademicYearFormModal from '../../components/academic-years/AcademicYearFormModal'
import { ArchiveModal, DeactivateModal } from '../../components/academic-years/AcademicYearActionModals'
import { AuditTimeline } from '../admin/LogsPage'
import StatsCarousel from '../../components/StatsCarousel'
import { StatCard } from '../../components/ui/DataDisplay'


const LS_COLS = 'academic_years_columns'
const LS_PAGE_SIZE = 'academic_years_page_size'

// Singleton portal manager — same pattern as StudentsPage
const _portalContainers = {}
function getPortalContainer(id) {
    if (typeof document === 'undefined') return null
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
}

function TimelineView({ years, onEdit, onHistory, onSetActive, onDuplicate, onDelete, onToggleLock, canEdit }) {
    if (years.length === 0) {
        return (
            <div className="relative w-full overflow-hidden bg-[var(--color-surface-alt)]/10 flex flex-col items-center justify-center py-20 opacity-40 group/empty">
                <div className="w-14 h-14 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-xl mb-3 group-hover/empty:scale-110 transition-transform">
                    <FontAwesomeIcon icon={faSearch} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Tidak Ada Data Ditemukan</p>
                <p className="text-[9px] font-bold mt-1.5 opacity-60">Sesuaikan filter atau kata kunci pencarian Anda</p>
            </div>
        )
    }

    const sorted = [...years].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

    return (
        <div className="relative w-full overflow-hidden bg-[var(--color-surface-alt)]/10">
            {/* ── Premium Ambient Background ── */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/4 w-[200px] h-[200px] bg-[var(--color-primary)]/10 blur-[80px] rounded-full animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-[200px] h-[200px] bg-indigo-500/10 blur-[80px] rounded-full" />
            </div>

            <div className="relative overflow-x-auto pb-8 pt-12 no-scrollbar select-none flex justify-start lg:justify-center" style={{ minHeight: '400px' }}>
                
                {/* ── Premium Ambient Background ── */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] dark:opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-text) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] md:text-[16rem] font-black font-heading tracking-widest text-[var(--color-text)] opacity-5 dark:opacity-10 pointer-events-none whitespace-nowrap select-none flex items-center justify-center">
                    TIMELINE
                </div>

                <div className="flex items-start px-8 md:px-32 relative mx-auto z-10" style={{ minWidth: 'max-content' }}>
                    {/* ── Global Timeline Path (Infinite) ── */}
                    <div className="absolute top-[72px] left-[-2000px] right-[-2000px] h-[3px] bg-gradient-to-r from-transparent via-[var(--color-border)] to-transparent opacity-60 pointer-events-none" />

                    {/* Active Gradient Path (Card Width) */}
                    <div className="absolute top-[72px] left-16 right-16 md:left-32 md:right-32 h-[3px] bg-gradient-to-r from-transparent via-[var(--color-primary)]/80 to-transparent shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)] pointer-events-none" />

                    {sorted.map((year, idx) => {
                        const isActive = year.is_active
                        const isGanjil = year.semester === 'Ganjil'

                        return (
                            <div key={year.id} className="relative flex flex-col items-center group/item shrink-0" style={{ width: '260px' }}>
                                {/* ── Interactive Node Anchor ── */}
                                <div className="relative z-10 flex items-center justify-center w-14 h-14 mb-8">
                                    {/* Pulse Aura for Active */}
                                    {isActive && (
                                        <>
                                            <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-full animate-ping duration-[3000ms]" />
                                            <div className="absolute inset-2 bg-[var(--color-primary)]/30 rounded-full animate-pulse duration-[2000ms]" />
                                        </>
                                    )}

                                    {/* Multi-layered Premium Node */}
                                    <div className={`relative flex items-center justify-center w-10 h-10 rounded-full border-[4px] border-[var(--color-surface)] transition-all duration-700 group-hover/item:scale-125 shadow-xl ${isActive ? 'bg-[var(--color-primary)] border-[var(--color-surface)] shadow-[0_0_25px_rgba(var(--color-primary-rgb),0.5)] scale-110' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] group-hover/item:border-[var(--color-primary)]'}`}>
                                        <div className={`w-3 h-3 rounded-full transition-all duration-500 ${isActive ? 'bg-white scale-110 shadow-[0_0_10px_white]' : 'bg-[var(--color-border)] group-hover/item:bg-[var(--color-primary)] shadow-none'}`} />
                                    </div>
                                </div>

                                {/* ── Visual Stalk (Connection) ── */}
                                <div className="relative w-[3px] h-12 -mt-8 mb-4 overflow-hidden rounded-full">
                                    <div className={`absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/80 to-transparent transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-0 group-hover/item:opacity-100'}`} />
                                    <div className={`absolute inset-0 bg-gradient-to-b from-[var(--color-border)] to-transparent transition-opacity duration-700 ${isActive ? 'opacity-0' : 'opacity-100 group-hover/item:opacity-0'}`} />
                                    {/* Micro-node anchor on path */}
                                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-sm ${isActive ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                                </div>

                                {/* ── Premium Card (Centered Layout) ── */}
                                <div className={`px-4 w-full transition-all duration-700 ${isActive ? 'opacity-100' : 'opacity-70 grayscale-[30%] group-hover/item:opacity-100 group-hover/item:grayscale-0'}`}>
                                    <div className={`relative group/card glass rounded-[1.5rem] p-5 border-2 transition-all duration-700 hover:-translate-y-2 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col items-center text-center ${isActive ? 'border-[var(--color-primary)]/50 shadow-xl shadow-[var(--color-primary)]/10 ring-4 ring-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 shadow-lg shadow-black/[0.02]'}`}>
                                        {/* Dynamic Glow Layer */}
                                        <div className={`absolute -inset-3 rounded-[2.5rem] opacity-0 group-hover/card:opacity-10 dark:group-hover/card:opacity-20 transition-opacity duration-1000 pointer-events-none blur-xl ${isActive ? 'bg-[var(--color-primary)]' : 'bg-indigo-500'}`} />

                                        {/* Card Header & Badges (Centered) */}
                                        <div className="flex items-center justify-center gap-1.5 mb-3 flex-wrap">
                                            <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0 ${isGanjil ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/10' : 'bg-purple-500/10 text-purple-600 border border-purple-500/10'}`}>
                                                {year.semester}
                                            </div>
                                            {isActive && (
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black shadow-sm border border-emerald-500/20">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                                                    AKTIF
                                                </div>
                                            )}
                                            {year.is_locked && (
                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                                                    <FontAwesomeIcon icon={faBoxArchive} className="text-[7px]" />
                                                    TUTUP
                                                </span>
                                            )}
                                        </div>

                                        {/* Content Block (Centered) */}
                                        <div className="relative space-y-1.5 w-full">
                                            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] opacity-50 leading-none">Periode Akademik</p>
                                            <h4 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)] leading-none group-hover/card:text-[var(--color-primary)] transition-colors duration-500">
                                                {year.name}
                                            </h4>

                                            {/* Curriculum */}
                                            <div className="flex justify-center pt-1.5 pb-0.5">
                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${year.curriculum === 'Merdeka' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                                                    Kurikulum {year.curriculum || 'Merdeka'}
                                                </span>
                                            </div>

                                            {/* Duration */}
                                            <div className="flex items-center justify-center gap-2 pt-3 mt-3 border-t border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-bold">
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] group-hover/card:border-[var(--color-primary)]/30 group-hover/card:text-[var(--color-primary)] transition-all`}>
                                                    <FontAwesomeIcon icon={faCalendarDay} className="text-[9px]" />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[7px] font-black uppercase tracking-widest opacity-50 leading-none mb-0.5">Masa Berlaku</span>
                                                    <span className="leading-tight text-[9px] text-[var(--color-text)]">{new Date(year.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(year.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Abstract Decorative SVG (Watermark) */}
                                        <div className="absolute right-4 bottom-4 opacity-[0.03] pointer-events-none group-hover/card:scale-150 group-hover/card:opacity-10 transition-all duration-1000 grayscale flex items-center justify-center">
                                            <FontAwesomeIcon icon={faTimeline} className="text-6xl" />
                                        </div>

                                        {/* Premium Action Layer */}
                                        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex flex-col gap-2.5 opacity-0 group-hover/card:opacity-100 translate-y-3 group-hover/card:translate-y-0 transition-all duration-500 w-full">
                                            {/* Primary Action (Full Width) */}
                                            {canEdit && !isActive && !year.is_locked && (
                                                <button onClick={() => onSetActive(year)} className="w-full h-8 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-[0.1em] hover:shadow-[0_10px_20px_-5px_rgba(var(--color-primary-rgb),0.4)] hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2">
                                                    Aktifkan Periode
                                                </button>
                                            )}
                                            
                                            {/* Secondary Actions (Icon Row) */}
                                            <div className="flex items-center justify-center gap-2 w-full">
                                                {canEdit && (
                                                    <button onClick={() => onEdit(year)} className="w-8 h-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                                                    </button>
                                                )}
                                                <button onClick={() => onHistory(year)} className="w-8 h-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-500 hover:border-indigo-500 transition-all flex items-center justify-center">
                                                    <FontAwesomeIcon icon={faHistory} className="text-[10px]" />
                                                </button>
                                                {canEdit && (
                                                    <button onClick={() => onDuplicate(year)} title="Duplikat" className="w-8 h-8 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-emerald-500 hover:border-emerald-500 transition-all flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faCopy} className="text-[10px]" />
                                                    </button>
                                                )}
                                                {canEdit && !isActive && (
                                                    <button onClick={() => onToggleLock(year)} title={year.is_locked ? "Buka Buku" : "Tutup Buku"} className={`w-8 h-8 rounded-xl transition-all flex items-center justify-center ${year.is_locked ? 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-500 hover:border-rose-500'}`}>
                                                        <FontAwesomeIcon icon={year.is_locked ? faRotateLeft : faBoxArchive} className="text-[10px]" />
                                                    </button>
                                                )}
                                                {canEdit && isActive && (
                                                    <button onClick={() => onDelete(year)} className="w-8 h-8 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faBoxArchive} className="text-[10px]" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}




export default function AcademicYearsPage() {
    const { addToast, addUndoToast } = useToast()
    const { profile } = useAuth()
    const { enabled: canEdit } = useFlag('access.teacher_academic')

    const [years, setYears] = useState([])
    const [archivedYears, setArchivedYears] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0, ganjil: 0, genap: 0 })

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 4

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 350)
    const [filterSemester, setFilterSemester] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterCurriculum, setFilterCurriculum] = useState('')
    const [filterLock, setFilterLock] = useState('')
    const [filterTimeStatus, setFilterTimeStatus] = useState('') // 'Akan Datang' | 'Sedang Berjalan' | 'Sudah Selesai'
    const [sortBy, setSortBy] = useState('name_desc')
    const [isFilterOpen, setIsFilterOpen] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Columns
    const defaultCols = { period: true, semester: true, curriculum: true, duration: true, status: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [colMenuPos, setColMenuPos] = useState({ top: 0, right: 0, showUp: false })
    const colMenuRef = useRef(null)
    const colMenuPortalRef = useRef(null)

    // UI
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [mobileView, setMobileView] = useState(() => {
        try { return localStorage.getItem('ay_mobile_view') || 'card' } catch { return 'card' }
    }) // 'card' | 'list'
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    // Deferred unmount: keeps portal in DOM for 200ms after close so exit animation can play
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const searchInputRef = useRef(null)

    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem('ay_view_mode') || 'table' } catch { return 'table' }
    }) // 'table' | 'timeline' | 'card'

    // Selection & Data state
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [itemToDeactivate, setItemToDeactivate] = useState(null)
    const [itemToPermanentDelete, setItemToPermanentDelete] = useState(null)
    const [readOnlyDetailItem, setReadOnlyDetailItem] = useState(null)
    const [historyItem, setHistoryItem] = useState(null)

    // Modal Visibility
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isPermanentDeleteOpen, setIsPermanentDeleteOpen] = useState(false)
    const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false)
    const [isReadOnlyDetailOpen, setIsReadOnlyDetailOpen] = useState(false)
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!supabase) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('academic_years')
                .select('id,name,semester,start_date,end_date,is_active,deleted_at,created_at,curriculum,is_locked')
                .order('name', { ascending: false })
            if (error) throw error
            const active = (data || []).filter(y => y.deleted_at === undefined || y.deleted_at === null)
            setYears(active)
            setStats({
                total: active.length,
                active: active.filter(y => y.is_active).length,
                ganjil: active.filter(y => y.semester === 'Ganjil').length,
                genap: active.filter(y => y.semester === 'Genap').length,
            })
        } catch { addToast('Gagal memuat data tahun pelajaran', 'error') }
        finally { setLoading(false) }
    }, [addToast])

    const fetchArchived = useCallback(async () => {
        if (!supabase) return
        try {
            const { data } = await supabase
                .from('academic_years')
                .select('id,name,semester,start_date,end_date,is_active,deleted_at,created_at,curriculum,is_locked')
                .not('deleted_at', 'is', null)
                .order('created_at', { ascending: false })
            setArchivedYears(data || [])
        } catch { }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        const handler = (e) => {
            if (!isColMenuOpen) return
            const inBtn = colMenuRef.current?.contains(e.target)
            const inMenu = colMenuPortalRef.current?.contains(e.target)
            if (!inBtn && !inMenu) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isColMenuOpen])

    // Deferred unmount effect for header menu
    useEffect(() => {
        if (isHeaderMenuOpen) {
            setHeaderMenuMounted(true)
        } else {
            const t = setTimeout(() => setHeaderMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isHeaderMenuOpen])

    // Sticky positioning - keep portaled dropdowns anchored on scroll/resize
    useEffect(() => {
        if (!isHeaderMenuOpen && !isShortcutOpen) return
        const update = () => {
            if (isHeaderMenuOpen && headerMenuBtnRef.current) setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect())
            if (isShortcutOpen && shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
    }, [isHeaderMenuOpen, isShortcutOpen])

    useEffect(() => {
        const handler = (e) => {
            if (isModalOpen || isDeleteModalOpen) return
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)

            if (e.key === 'Escape') {
                if (isTyping) { document.activeElement.blur() }
                else { setIsColMenuOpen(false); setIsHeaderMenuOpen(false); setIsShortcutOpen(false); setSearchQuery(''); setSelectedIds([]) }
                return
            }

            if (isTyping) return

            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            else if (e.key === 'n') { e.preventDefault(); handleAdd() }
            else if (e.key === 'e' || e.key === 'E') { if (selectedIds.length === 1) { const item = years.find(y => y.id === selectedIds[0]); if (item) handleEdit(item) } }
            else if (e.key === 'x' || e.key === 'X') { resetAllFilters() }
            else if (e.key === '?') { setIsShortcutOpen(v => !v) }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isModalOpen, isDeleteModalOpen, selectedIds, years])

    useEffect(() => {
        localStorage.setItem(LS_COLS, JSON.stringify(visibleCols))
    }, [visibleCols])
    useEffect(() => {
        localStorage.setItem(LS_PAGE_SIZE, pageSize)
    }, [pageSize])
    useEffect(() => {
        localStorage.setItem('ay_view_mode', viewMode)
    }, [viewMode])

    const handleAdd = () => {
        let nextSuggested = null
        if (years.length > 0) {
            const latest = [...years].sort((a, b) => {
                if (a.name !== b.name) return b.name.localeCompare(a.name)
                return b.semester === 'Genap' ? 1 : -1
            })[0]

            if (latest.semester === 'Ganjil') {
                nextSuggested = { ...latest, id: undefined, semester: 'Genap', is_active: false }
            } else {
                const match = latest.name.match(/(\d{4})\/(\d{4})/)
                if (match) {
                    const nextStart = parseInt(match[1]) + 1
                    const nextEnd = parseInt(match[2]) + 1
                    nextSuggested = { ...latest, id: undefined, name: `${nextStart}/${nextEnd}`, semester: 'Ganjil', is_active: false }
                }
            }
        }
        setSelectedItem(nextSuggested)
        setIsModalOpen(true)
    }
    const handleEdit = (item) => {
        setSelectedItem(item)
        setIsModalOpen(true)
    }

    const handleOpenReadOnlyDetail = (item) => {
        setReadOnlyDetailItem(item)
        setIsReadOnlyDetailOpen(true)
    }

    const handleOpenHistory = (item) => {
        setHistoryItem(item)
        setIsHistoryOpen(true)
    }

    const handleSubmit = async (formData, setFormErrors) => {
        if (!supabase || submitting) return
        setSubmitting(true)

        const errors = {}
        if (!formData.name.trim()) errors.name = 'Nama tahun pelajaran wajib diisi'
        if (!formData.startDate) errors.startDate = 'Tanggal mulai wajib diisi'
        if (!formData.endDate) errors.endDate = 'Tanggal selesai wajib diisi'
        if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) errors.endDate = 'Tanggal selesai harus setelah tanggal mulai'

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors)
            setSubmitting(false)
            return
        }

        try {
            const overlap = years.some(y => {
                if (selectedItem && y.id === selectedItem.id) return false
                const s = new Date(y.start_date)
                const e = new Date(y.end_date)
                const targetS = new Date(formData.startDate)
                const targetE = new Date(formData.endDate)
                return (targetS >= s && targetS <= e) || (targetE >= s && targetE <= e) || (targetS <= s && targetE >= e)
            })

            if (overlap) {
                const dupe = years.find(y => {
                    const s = new Date(y.start_date); const e = new Date(y.end_date)
                    const targetS = new Date(formData.startDate); const targetE = new Date(formData.endDate)
                    return (targetS >= s && targetS <= e) || (targetE >= s && targetE <= e) || (targetS <= s && targetE >= e)
                })
                setFormErrors({ endDate: `Periode tumpang tindih dengan ${dupe.name} ${dupe.semester}` })
                setSubmitting(false)
                return
            }

            const payload = {
                name: formData.name.trim(),
                semester: formData.semester,
                start_date: formData.startDate,
                end_date: formData.endDate,
                curriculum: formData.curriculum || 'Merdeka'
            }

            if (selectedItem?.id) {
                const { data, error } = await supabase.from('academic_years').update(payload).eq('id', selectedItem.id).select()
                if (error) throw error
                if (!data || data.length === 0) throw new Error('Gagal mengupdate data')

                if (formData.makeActive && !selectedItem.is_active) {
                    await supabase.from('academic_years').update({ is_active: false }).neq('id', selectedItem.id)
                    await supabase.from('academic_years').update({ is_active: true }).eq('id', selectedItem.id)
                } else if (!formData.makeActive && selectedItem.is_active) {
                    await supabase.from('academic_years').update({ is_active: false }).eq('id', selectedItem.id)
                }

                addToast('Tahun pelajaran berhasil diupdate', 'success')
                await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data, error } = await supabase.from('academic_years').insert({ ...payload, is_active: false }).select()
                if (error) throw error
                if (!data || data.length === 0) throw new Error('Gagal menambahkan data')

                if (formData.makeActive && data[0]?.id) {
                    await supabase.from('academic_years').update({ is_active: false }).neq('id', data[0].id)
                    await supabase.from('academic_years').update({ is_active: true }).eq('id', data[0].id)
                }

                addToast('Tahun pelajaran berhasil ditambahkan', 'success')
                await logAudit({ action: 'INSERT', source: 'MASTER', tableName: 'academic_years', recordId: data?.[0]?.id, newData: { ...payload, is_active: formData.makeActive } })
            }
            setIsModalOpen(false)
            setSelectedItem(null)
            fetchData()
        } catch (err) {
            if (err?.code === '23505') {
                addToast('Tidak bisa menyimpan: sudah ada tahun pelajaran lain yang aktif.', 'error')
            } else if (err?.code === '23514') {
                addToast('Tidak bisa menyimpan: pastikan tanggal mulai lebih kecil dari tanggal selesai.', 'error')
            } else if (err?.code === '23P01') {
                const clash = findOverlappingYear({
                    semester: formData.semester,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    excludeId: selectedItem?.id || null,
                })
                if (clash) {
                    setFormErrors?.({ endDate: `Periode bentrok dengan ${clash.name} (${clash.semester}) · ${formatDate(clash.start_date)}–${formatDate(clash.end_date)}` })
                } else {
                    addToast('Tidak bisa menyimpan: periode bertabrakan dengan data lain.', 'error')
                }
            } else { addToast(err?.message || 'Gagal menyimpan data', 'error') }
        }
        finally { setSubmitting(false) }
    }

    const handleSetActive = async (item) => {
        if (submitting) return
        setSubmitting(true)
        try {
            const { error: e1 } = await supabase.from('academic_years').update({ is_active: false }).neq('id', item.id).select()
            if (e1) throw e1
            const { data, error: e2 } = await supabase.from('academic_years').update({ is_active: true }).eq('id', item.id).select()
            if (e2) throw e2
            addToast(`${item.name} ${item.semester} diaktifkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item, newData: { ...item, is_active: true } })
            fetchData()
        } catch (err) { addToast(err?.message || 'Gagal mengaktifkan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleToggleLock = async (item) => {
        if (submitting) return
        setSubmitting(true)
        try {
            const newStatus = !item.is_locked
            const { error } = await supabase.from('academic_years').update({ is_locked: newStatus }).eq('id', item.id)
            if (error) throw error
            addToast(`Tahun pelajaran berhasil di${newStatus ? 'tutup' : 'buka'}`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item, newData: { ...item, is_locked: newStatus } })
            fetchData()
        } catch (err) { addToast(err?.message || 'Gagal mengubah status', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeactivate = (item) => {
        setItemToDeactivate(item)
        setIsDeactivateConfirmOpen(true)
    }

    const handleDeactivateConfirm = async () => {
        if (!itemToDeactivate || submitting) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('academic_years').update({ is_active: false }).eq('id', itemToDeactivate.id).select()
            if (error) throw error
            addToast(`${itemToDeactivate.name} ${itemToDeactivate.semester} dinonaktifkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: itemToDeactivate.id, oldData: itemToDeactivate, newData: { ...itemToDeactivate, is_active: false } })
            setIsDeactivateConfirmOpen(false)
            setItemToDeactivate(null)
            fetchData()
        } catch (err) { addToast(err.message || 'Gagal menonaktifkan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDuplicate = (item) => {
        setSelectedItem({ ...item, id: undefined, name: `${item.name} (Salinan)` })
        setIsModalOpen(true)
    }

    const getTimeStatus = (start, end) => {
        if (!start || !end) return null
        const now = new Date(); const s = new Date(start); const e = new Date(end)
        if (now < s) return { label: 'Akan Datang', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' }
        if (now > e) return { label: 'Sudah Selesai', cls: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
        return { label: 'Sedang Berjalan', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' }
    }

    const findOverlappingYear = ({ semester, startDate, endDate, excludeId = null }) => {
        if (!semester || !startDate || !endDate) return null
        const targetS = new Date(startDate); const targetE = new Date(endDate)
        return years.find(y => {
            if (excludeId && y.id === excludeId) return false
            if (y.semester !== semester) return false
            const s = new Date(y.start_date); const e = new Date(y.end_date)
            return (targetS >= s && targetS <= e) || (targetE >= s && targetE <= e) || (targetS <= s && targetE >= e)
        }) || null
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        const archived = itemToDelete
        try {
            await supabase.from('academic_years').update({ deleted_at: new Date().toISOString() }).eq('id', archived.id)
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: archived.id, newData: { deleted_at: new Date().toISOString() } })
            setIsDeleteModalOpen(false); fetchData()
            addUndoToast(`${archived.name} diarsipkan.`, async () => {
                await supabase.from('academic_years').update({ deleted_at: null }).eq('id', archived.id)
                fetchData()
            }, 6000)
        } catch { addToast('Gagal mengarsipkan', 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }

    const handleRestore = async (item) => {
        try {
            await supabase.from('academic_years').update({ deleted_at: null }).eq('id', item.id)
            addToast('Berhasil dipulihkan', 'success')
            fetchArchived(); fetchData()
        } catch { addToast('Gagal memulihkan', 'error') }
    }

    const handlePermanentDelete = async (item) => {
        try {
            await supabase.from('academic_years').delete().eq('id', item.id)
            addToast('Data dihapus permanen', 'success')
            setIsPermanentDeleteOpen(false); fetchArchived()
        } catch { addToast('Gagal menghapus permanen', 'error') }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            await supabase.from('academic_years').update({ deleted_at: new Date().toISOString() }).in('id', selectedIds)
            addToast(`${selectedIds.length} data diarsipkan`, 'success')
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData()
        } catch { addToast('Gagal menghapus massal', 'error') }
        finally { setSubmitting(false) }
    }



    // Helper formatting
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
    const getDuration = (s, e) => {
        if (!s || !e) return '-'
        const diff = Math.ceil(Math.abs(new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24 * 30))
        return `${diff} Bulan`
    }

    // Count active filters
    const activeFilterCount = (filterSemester ? 1 : 0) + (filterTimeStatus ? 1 : 0) + (searchQuery ? 1 : 0)
    const handleExportCSV = () => {
        const header = ['Name', 'Semester', 'Start', 'End', 'Status']
        const rows = filtered.map(y => [y.name, y.semester, y.start_date, y.end_date, y.is_active ? 'Active' : 'Inactive'])
        const csv = [header, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = 'academic-years.csv'; a.click()
    }

    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterSemester('')
        setFilterStatus('')
        setFilterCurriculum('')
        setFilterLock('')
        setFilterTimeStatus('')
        setPage(1)
        setSelectedIds([])
    }

    // filtering logic (Updated to use debouncedSearch)
    const filtered = useMemo(() => {
        return years.filter(y => {
            const matchesSearch = !debouncedSearch || y.name.toLowerCase().includes(debouncedSearch.toLowerCase())
            const matchesSemester = !filterSemester || y.semester === filterSemester
            const matchesStatus = !filterStatus || (filterStatus === 'active' ? y.is_active : !y.is_active)
            const matchesCurriculum = !filterCurriculum || y.curriculum === filterCurriculum
            const matchesLock = !filterLock || (filterLock === 'locked' ? y.is_locked : !y.is_locked)
            if (filterTimeStatus) {
                const ts = getTimeStatus(y.start_date, y.end_date)
                if (ts?.label !== filterTimeStatus) return false
            }
            return matchesSearch && matchesSemester && matchesStatus && matchesCurriculum && matchesLock
        }).sort((a, b) => {
            // Selalu letakkan yang aktif di paling atas (Pinned)
            if (a.is_active && !b.is_active) return -1
            if (!a.is_active && b.is_active) return 1

            if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
            if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
            if (sortBy === 'start_asc') return new Date(a.start_date) - new Date(b.start_date)
            return new Date(b.start_date) - new Date(a.start_date)
        })
    }, [years, debouncedSearch, filterSemester, filterStatus, filterCurriculum, filterLock, filterTimeStatus, sortBy])

    const totalRows = filtered.length
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize)
    const isTrulyEmpty = years.length === 0
    const isEmpty = filtered.length === 0

    const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => setSelectedIds(selectedIds.length === paged.length ? [] : paged.map(y => y.id))

    return (
        <DashboardLayout title="Tahun Pelajaran">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
                {/* Privasi Banner */}
                {isPrivacyMode && (
                    <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                            <FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Nilai sensitif disensor
                        </div>
                        <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                    </div>
                )}

                {/* Selection Action Bar ── */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-xl animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-gray-900 text-white rounded-[2.5rem] p-2 pr-6 shadow-2xl flex items-center gap-4 border border-white/10 backdrop-blur-xl">
                            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center font-black text-sm shadow-lg shadow-[var(--color-primary)]/20 animate-bounce">
                                {selectedIds.length}
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-black uppercase tracking-widest text-white/90">Data Terpilih</p>
                                <p className="text-[9px] font-bold text-white/50 tracking-tight">Lakukan aksi massal pada data ini</p>
                            </div>
                            <div className="h-8 w-px bg-white/10" />
                            <button onClick={() => setSelectedIds([])} className="h-10 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all">Batal</button>
                            <button onClick={() => setIsBulkDeleteOpen(true)} className="h-10 px-5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 active:scale-95">
                                <FontAwesomeIcon icon={faBoxArchive} className="text-[9px]" />
                                Arsipkan
                            </button>
                        </div>
                    </div>
                )}

                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit tahun pelajaran dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── Header Row ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Master Data" items={['Academic Cycle']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Tahun Pelajaran</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola {stats.total} periode akademik dalam ekosistem.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Header Menu Button */}
                        <button
                            ref={headerMenuBtnRef}
                            onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Aksi lainnya"
                        >
                            <FontAwesomeIcon icon={faSliders} />
                        </button>

                        {/* Portaled Header Menu Dropdown */}
                        {headerMenuMounted && headerMenuRect && createPortal(
                            <>
                                <div
                                    className={`fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                    onClick={() => setIsHeaderMenuOpen(false)}
                                />
                                <div
                                    className={`fixed z-[9991] w-60 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-all duration-200 ease-out origin-top-right
                                        ${isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                    style={{
                                        top: headerMenuRect.bottom + 8,
                                        left: Math.max(10, headerMenuRect.right - 240)
                                    }}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Manajemen</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedOpen(true) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Periode</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); handleExportCSV() }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faDownload} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Export CSV</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">{totalRows} data terpilih</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-academic-header-menu')
                        )}

                        {/* Keyboard Shortcuts Button - hidden on mobile */}
                        <button onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                            ref={shortcutBtnRef}
                            className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-all active:scale-95
                                ${isShortcutOpen
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            title="Keyboard Shortcuts (?)">
                            <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                        </button>

                        {/* Portaled Keyboard Shortcuts Dropdown */}
                        {isShortcutOpen && shortcutRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsShortcutOpen(false)} />
                                <div className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200"
                                    style={{
                                        top: shortcutRect.bottom + 8,
                                        left: Math.max(10, shortcutRect.right - 288)
                                    }}>
                                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                    </div>
                                    <div className="p-3 space-y-0.5">
                                        {[{ section: 'Navigasi' }, { keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { section: 'Aksi' }, { keys: ['N'], label: 'Tambah periode baru' }, { keys: ['X'], label: 'Reset semua filter' }, { keys: ['?'], label: 'Tampilkan shortcut ini' }].map((item, i) => item.section ? (
                                            <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                        ) : (
                                            <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                                <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                                <div className="flex items-center gap-1">{item.keys.map((k, ki) => <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>,
                            getPortalContainer('portal-academic-shortcut-menu')
                        )}

                        {/* Privasi toggle */}
                        <button onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                            className={`h-9 w-9 sm:w-auto sm:px-3 rounded-lg border flex items-center justify-center sm:justify-start gap-2 transition-all active:scale-95 ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                            title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}>
                            <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Privasi</span>
                        </button>

                        {/* Add button */}
                        {canEdit && (
                            <button onClick={handleAdd} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10">
                                <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                                <span>Tambah Periode</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Stats ── */}
                <StatsCarousel count={STAT_CARD_COUNT} cols={4}>
                    {[
                        { icon: faLayerGroup, label: 'Total Periode', value: stats.total, borderColor: 'border-t-blue-500', iconBg: 'bg-blue-500/10 text-blue-500' },
                        { icon: faCircleCheck, label: 'Status Aktif', value: stats.active, borderColor: 'border-t-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-500' },
                        { icon: faGraduationCap, label: 'Smt. Ganjil', value: stats.ganjil, borderColor: 'border-t-indigo-500', iconBg: 'bg-indigo-500/10 text-indigo-500' },
                        { icon: faGraduationCap, label: 'Smt. Genap', value: stats.genap, borderColor: 'border-t-purple-500', iconBg: 'bg-purple-500/10 text-purple-500' },
                    ].map((s, i) => (
                        <StatCard
                            key={i}
                            icon={s.icon}
                            label={s.label}
                            value={s.value}
                            borderColor={s.borderColor}
                            iconBg={s.iconBg}
                        />
                    ))}
                </StatsCarousel>

                {/* ── Filter Bar ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-row items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                                <FontAwesomeIcon icon={faSearch} />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari nama tahun pelajaran (contoh: 2024/2025)... (Ctrl+K)"
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                    <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="hidden md:flex items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 p-1 shadow-none">
                                <button onClick={() => setViewMode('table')} className={`h-7 px-3 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-wider transition-all ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={faTableList} className="text-[9px]" />
                                    <span>Tabel</span>
                                </button>
                                <button onClick={() => setViewMode('timeline')} className={`h-7 px-3 rounded-lg flex items-center gap-2 text-[9px] font-black uppercase tracking-wider transition-all ${viewMode === 'timeline' ? 'bg-[var(--color-primary)] text-white shadow-md' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                    <FontAwesomeIcon icon={faTimeline} className="text-[9px]" />
                                    <span>Linimasa</span>
                                </button>
                            </div>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isFilterOpen || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                            {activeFilterCount > 0 && <button onClick={resetAllFilters} className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} /><span className="hidden sm:inline">Reset</span></button>}
                        </div>
                    </div>

                    {/* Active Chips */}
                    {(searchQuery || filterSemester || filterTimeStatus) && (
                        <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                    <FontAwesomeIcon icon={faSearch} className="opacity-40" />
                                    <span>"{(debouncedSearch || searchQuery).slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"</span>
                                    <FontAwesomeIcon icon={faTimes} className="text-[8px] opacity-40 group-hover:text-red-500 transition-colors" />
                                </button>
                            )}
                            {filterSemester && (
                                <button type="button" onClick={() => setFilterSemester('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                    <span>{filterSemester}</span>
                                    <FontAwesomeIcon icon={faTimes} className="text-[8px] opacity-40 group-hover:text-red-500 transition-colors" />
                                </button>
                            )}
                            {filterTimeStatus && (
                                <button type="button" onClick={() => setFilterTimeStatus('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600">
                                    Status: {filterTimeStatus}
                                    <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                    </span>
                                </button>
                            )}
                            <button onClick={resetAllFilters} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black text-red-500 hover:bg-red-500/5 transition-all">
                                <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                Hapus Semua
                            </button>
                        </div>
                    )}

                    {isFilterOpen && (
                        <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                            {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faSliders} className="text-[9px] opacity-60" />
                                        Filter Lanjutan
                                    </span>
                                </div>
                                <button
                                    onClick={resetAllFilters}
                                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                    Reset Semua
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
                                {/* Primary Grid: Selects */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Semester</label>
                                        <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Semester</option>
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Status</label>
                                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Status</option>
                                            <option value="active">Aktif</option>
                                            <option value="inactive">Tidak Aktif</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kurikulum</label>
                                        <select value={filterCurriculum} onChange={e => setFilterCurriculum(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua Kurikulum</option>
                                            <option value="Merdeka">Kurikulum Merdeka</option>
                                            <option value="K13">Kurikulum 2013</option>
                                            <option value="KTSP">KTSP</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kunci Data</label>
                                        <select value={filterLock} onChange={e => setFilterLock(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="">Semua</option>
                                            <option value="open">Bisa Diedit</option>
                                            <option value="locked">Terkunci (Read-only)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutan</label>
                                        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                            <option value="name_desc">Terupate</option>
                                            <option value="name_asc">Terlama</option>
                                            <option value="start_asc">Terdekat</option>
                                        </select>
                                    </div>
                                </div>
                                
                                {/* Secondary Grid: Actions */}
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 opacity-0 hidden xl:block">Aksi</label>
                                    <div className="flex items-center gap-2 mt-auto h-9">
                                        <button onClick={toggleSelectAll} className="h-full px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">
                                            {selectedIds.length === paged.length && paged.length > 0 ? 'Batal Pilih' : 'Pilih Semua'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>



                {/* ── Main Data View ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    {loading ? (
                        <div className="p-12 space-y-4">
                            <div className="flex gap-4">
                                <TableSkeleton rows={5} cols={4} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {viewMode === 'timeline' ? (
                                <TimelineView
                                    years={filtered}
                                    onEdit={handleEdit}
                                    onSetActive={handleSetActive}
                                    onDuplicate={handleDuplicate}
                                    onDelete={(y) => { setItemToDelete(y); setIsDeleteModalOpen(true) }}
                                    onToggleLock={handleToggleLock}
                                    onHistory={handleOpenHistory}
                                    canEdit={canEdit}
                                    submitting={submitting}
                                />
                            ) : (
                                <>
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                    <th className="px-6 py-4 text-center w-12">
                                                        <input type="checkbox" checked={selectedIds.length === paged.length && paged.length > 0} onChange={toggleSelectAll} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                                    </th>
                                                    {visibleCols.period && <th className="px-6 py-4 text-left">Tahun Pelajaran</th>}
                                                    {visibleCols.semester && <th className="px-6 py-4 text-left">Semester</th>}
                                                    {visibleCols.curriculum && <th className="px-6 py-4 text-left">Kurikulum</th>}
                                                    {visibleCols.duration && <th className="px-6 py-4 text-left">Pelaksanaan</th>}
                                                    {visibleCols.status && <th className="px-6 py-4 text-left">Status</th>}
                                                    <th className="px-6 py-4 text-center pr-6 w-32 relative">
                                                        <div className="flex items-center justify-center">
                                                            <span>Aksi</span>
                                                        </div>
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <button ref={colMenuRef} onClick={(e) => {
                                                                const rect = e.currentTarget.getBoundingClientRect()
                                                                const menuHeight = 220
                                                                const spaceBelow = window.innerHeight - rect.bottom
                                                                const showUp = spaceBelow < menuHeight && rect.top > menuHeight
                                                                setColMenuPos({
                                                                    top: showUp ? (rect.top + window.scrollY - menuHeight - 8) : (rect.bottom + window.scrollY + 8),
                                                                    right: window.innerWidth - rect.right - window.scrollX,
                                                                    showUp
                                                                })
                                                                setIsColMenuOpen(p => !p)
                                                            }} title="Atur tampilan kolom"
                                                                className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                                                <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                            </button>
                                                            {isColMenuOpen && createPortal(
                                                                <div ref={colMenuPortalRef} className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${colMenuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                                    style={{ top: colMenuPos.top, right: colMenuPos.right }}>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                                    {[{ key: 'period', label: 'Tahun Pelajaran' }, { key: 'semester', label: 'Semester' }, { key: 'curriculum', label: 'Kurikulum' }, { key: 'duration', label: 'Pelaksanaan' }, { key: 'status', label: 'Status' }].map(({ key, label }) => (
                                                                        <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                            <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                                                            <div className={`w-8 h-4.5 rounded-full transition-all flex items-center px-0.5 ${visibleCols[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${visibleCols[key] ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                                                            </div>
                                                                        </button>
                                                                    ))}
                                                                </div>,
                                                                document.body
                                                            )}
                                                        </div>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {isEmpty ? (
                                                    <tr><td colSpan="5" className="py-24 text-center opacity-40"><FontAwesomeIcon icon={faSearch} className="text-4xl mb-4" /><p className="text-xs font-black uppercase tracking-widest">Tidak ada data ditemukan</p></td></tr>
                                                ) : paged.map(year => {
                                                    const isSelected = selectedIds.includes(year.id);
                                                    const ts = getTimeStatus(year.start_date, year.end_date)
                                                    return (
                                                        <tr key={year.id} className={`border-t border-[var(--color-border)] transition-colors group/row ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/40'}`}>
                                                            <td className="px-6 py-4"><input type="checkbox" checked={selectedIds.includes(year.id)} onChange={() => toggleSelect(year.id)} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" /></td>
                                                            {visibleCols.period && (
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-start gap-3">
                                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm relative transition-transform hover:scale-110 shrink-0 ${year.is_active ? 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                                            <span className="relative z-10">{year.name?.slice(2, 4) || '??'}</span>
                                                                        </div>
                                                                        <div className="flex flex-col min-w-0 flex-1">
                                                                            <span className="font-extrabold text-sm text-[var(--color-text)] leading-snug truncate">
                                                                                {year.name}
                                                                            </span>
                                                                            <p className="text-[10px] text-[var(--color-text-muted)] font-mono opacity-60 uppercase tracking-wider mt-1">ID: {year.id.slice(0, 8)}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {visibleCols.semester && (
                                                                <td className="px-6 py-4">
                                                                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border ${year.semester === 'Ganjil' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}`}>
                                                                        {year.semester}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleCols.curriculum && (
                                                                <td className="px-6 py-4">
                                                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
                                                                        {year.curriculum || 'Merdeka'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {visibleCols.duration && (
                                                                <td className="px-6 py-4">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[11px] font-bold text-[var(--color-text)] whitespace-nowrap">{formatDate(year.start_date)} — {formatDate(year.end_date)}</span>
                                                                        <span className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{getDuration(year.start_date, year.end_date)}</span>
                                                                    </div>
                                                                </td>
                                                            )}
                                                            {visibleCols.status && (
                                                                <td className="px-6 py-4 text-left">
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {year.is_active ? (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-lg">Aktif</span>
                                                                        ) : (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-lg">Tidak Aktif</span>
                                                                        )}
                                                                        {year.is_locked && (
                                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg flex items-center gap-1">
                                                                                <FontAwesomeIcon icon={faBoxArchive} className="text-[8px]"/> Tutup
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            )}
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center justify-center gap-1">
                                                                    {canEdit && (
                                                                        <button onClick={() => handleEdit(year)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all text-sm"><FontAwesomeIcon icon={faEdit} /></button>
                                                                    )}
                                                                    <button onClick={() => handleOpenHistory(year)} title="Riwayat" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-purple-500 hover:bg-purple-500/10 transition-all text-sm"><FontAwesomeIcon icon={faHistory} /></button>
                                                                    {canEdit && (
                                                                        <button onClick={() => { setItemToDelete(year); setIsDeleteModalOpen(true) }} title="Hapus" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"><FontAwesomeIcon icon={faTrash} /></button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="md:hidden divide-y divide-[var(--color-border)]">
                                        {paged.map(year => {
                                            const isSelected = selectedIds.includes(year.id);
                                            return (
                                                <div key={year.id} className={`p-4 transition-colors group/mob ${isSelected ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                                    <div className="flex items-start gap-3">
                                                        <div className="flex flex-col items-center gap-3 pt-1">
                                                            <input type="checkbox" checked={selectedIds.includes(year.id)} onChange={() => toggleSelect(year.id)} className="accent-[var(--color-primary)] w-4 h-4 cursor-pointer shrink-0" />
                                                        </div>
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shadow-sm relative transition-transform shrink-0 ${year.is_active ? 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                                            <span className="relative z-10">{year.name?.slice(2, 4) || '??'}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0 flex-1" onClick={() => handleOpenReadOnlyDetail(year)}>
                                                                    <button className="font-extrabold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)] text-left truncate block w-full">{year.name}</button>
                                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border ${year.semester === 'Ganjil' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-purple-500/10 text-purple-600 border-purple-500/20'}`}>{year.semester}</span>
                                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{formatDate(year.start_date)} — {formatDate(year.end_date)}</span>
                                                                    </div>
                                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-mono mt-1 opacity-60 uppercase tracking-widest">ID: {year.id.slice(0, 8)}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {canEdit && <button onClick={() => handleEdit(year)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]"><FontAwesomeIcon icon={faEdit} className="text-xs" /></button>}
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex items-center gap-2">
                                                                {year.is_active ? (
                                                                    <div className="flex-1 h-9 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Aktif</div>
                                                                ) : (
                                                                    <div className="flex-1 h-9 rounded-xl flex items-center justify-center text-[10px] font-black uppercase tracking-widest bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">Tidak Aktif</div>
                                                                )}
                                                                <button onClick={() => handleOpenHistory(year)} className="flex-1 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"><FontAwesomeIcon icon={faHistory} className="text-xs" /> Riwayat</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                    <Pagination totalRows={totalRows} page={page} pageSize={pageSize} setPage={setPage} setPageSize={setPageSize} label="data" jumpPage={jumpPage} setJumpPage={setJumpPage} />
                </div>

                {/* ── Modals ── */}
                <AcademicYearFormModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedItem(null); }} selectedItem={selectedItem} years={years} onSubmit={handleSubmit} submitting={submitting} />
                <ArchiveModal isOpen={isDeleteModalOpen} onClose={() => { setIsDeleteModalOpen(false); setItemToDelete(null); }} selectedItem={itemToDelete} onConfirm={handleDeleteConfirm} submitting={submitting} />
                <DeactivateModal isOpen={isDeactivateConfirmOpen} onClose={() => { setIsDeactivateConfirmOpen(false); setItemToDeactivate(null); }} selectedItem={itemToDeactivate} onConfirm={handleDeactivateConfirm} submitting={submitting} />

                <Modal isOpen={isReadOnlyDetailOpen} onClose={() => { setIsReadOnlyDetailOpen(false); setReadOnlyDetailItem(null) }} title="Detail Tahun Pelajaran" size="full" mobileVariant="bottom-sheet">
                    {readOnlyDetailItem && (() => {
                        const ts = getTimeStatus(readOnlyDetailItem.start_date, readOnlyDetailItem.end_date)
                        return (
                            <div className="space-y-4 pb-2">
                                <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun Pelajaran</p>
                                        <h4 className="text-lg font-black text-[var(--color-text)] leading-tight truncate">{readOnlyDetailItem.name}</h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${readOnlyDetailItem.semester === 'Ganjil' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'}`}>Semester {readOnlyDetailItem.semester}</span>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${readOnlyDetailItem.is_active ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>{readOnlyDetailItem.name?.slice(2, 4) || '??'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Periode</p>
                                        <div className="text-xs font-bold">{formatDate(readOnlyDetailItem.start_date)} — {formatDate(readOnlyDetailItem.end_date)}</div>
                                    </div>
                                    <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Durasi</p>
                                        <div className="text-xs font-black">{getDuration(readOnlyDetailItem.start_date, readOnlyDetailItem.end_date)}</div>
                                    </div>
                                </div>
                                <button onClick={() => { setIsReadOnlyDetailOpen(false); handleOpenHistory(readOnlyDetailItem) }} className="w-full h-12 rounded-xl bg-indigo-500/10 text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-indigo-500/20"><FontAwesomeIcon icon={faHistory} />Riwayat Perubahan</button>
                                <button onClick={() => { setIsReadOnlyDetailOpen(false); setReadOnlyDetailItem(null) }} className="w-full h-12 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Tutup</button>
                            </div>
                        )
                    })()}
                </Modal>

                <Modal isOpen={isHistoryOpen} onClose={() => { setIsHistoryOpen(false); setHistoryItem(null) }} title={`Riwayat · ${historyItem?.name || ''}`} description="Audit log untuk rekaman ini." icon={faFingerprint} iconBg="bg-orange-500/10" iconColor="text-orange-500" size="lg">
                    {historyItem && <div className="h-[60vh] overflow-hidden"><AuditTimeline tableName="academic_years" recordId={historyItem.id} limit={30} /></div>}
                </Modal>

                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Arsipkan Massal" description={`Pindahkan ${selectedIds.length} data ke arsip.`} icon={faBoxArchive} iconBg="bg-red-500/10" iconColor="text-red-500" size="sm" footer={<div className="flex gap-3"><button onClick={() => setIsBulkDeleteOpen(false)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] transition-all">Batal</button><div className="flex-1" /><button onClick={handleBulkDelete} disabled={submitting} className="h-9 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] transition-all flex items-center gap-2">Arsipkan Sekarang</button></div>}>
                    <p className="text-[11px] font-bold text-red-700/70 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">Anda akan mengarsipkan <span className="font-black text-red-600">{selectedIds.length} tahun pelajaran</span> secara bersamaan.</p>
                </Modal>

                <Modal isOpen={isArchivedOpen} onClose={() => setIsArchivedOpen(false)} title="Manajemen Arsip" description="Data yang telah dinonaktifkan." icon={faBoxArchive} iconBg="bg-amber-500/10" iconColor="text-amber-600" size="lg">
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                        {archivedYears.length === 0 ? <div className="py-12 text-center opacity-40"><p className="text-xs font-black uppercase tracking-widest">Tidak ada arsip</p></div> : archivedYears.map(y => (
                            <div key={y.id} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
                                <div><h4 className="text-sm font-black">{y.name} — {y.semester}</h4><p className="text-[10px] font-bold text-[var(--color-text-muted)] truncate">Diarsipkan {new Date(y.deleted_at).toLocaleDateString()}</p></div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleRestore(y)} className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center"><FontAwesomeIcon icon={faRotateLeft} /></button>
                                    <button onClick={() => { setItemToPermanentDelete(y); setIsPermanentDeleteOpen(true) }} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"><FontAwesomeIcon icon={faTrash} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal>

                <Modal isOpen={isPermanentDeleteOpen} onClose={() => { setIsPermanentDeleteOpen(false); setItemToPermanentDelete(null) }} title="Hapus Permanen" description="Tindakan ini tidak dapat dibatalkan." icon={faTrash} iconBg="bg-red-500/10" iconColor="text-red-500" size="sm" footer={<div className="flex gap-3"><button onClick={() => { setIsPermanentDeleteOpen(false); setItemToPermanentDelete(null) }} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] transition-all">Batal</button><div className="flex-1" /><button onClick={() => handlePermanentDelete(itemToPermanentDelete)} disabled={submitting} className="h-9 px-6 rounded-xl bg-red-500 text-white font-black text-[10px] transition-all">Hapus Sekarang</button></div>}>
                    <p className="text-[11px] font-bold text-red-700/70 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">Yakin menghapus permanen <span className="text-red-600 font-black">{itemToPermanentDelete?.name}</span>? Data akan hilang selamanya.</p>
                </Modal>
            </div>
        </DashboardLayout>
    )
}