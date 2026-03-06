import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faSpinner,
    faArrowUp, faArrowDown, faXmark, faSliders,
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faKeyboard, faCheckCircle, faCircleExclamation,
    faCalendarDay, faClipboardList, faTableList,
    faTriangleExclamation, faTimeline, faTable, faGripVertical,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/ui/Modal'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 25
const LS_VIEW = 'reports_view'

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function ReportsPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()

    const [reports, setReports] = useState([])
    const [students, setStudents] = useState([])
    const [violationTypes, setViolationTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [stats, setStats] = useState({ total: 0, positive: 0, negative: 0, today: 0 })

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterType, setFilterType] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [sortBy, setSortBy] = useState('newest')
    const [showAdvFilter, setShowAdvFilter] = useState(false)
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')

    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem(LS_VIEW) || 'timeline' } catch { return 'timeline' }
    })

    const [selectedIds, setSelectedIds] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [formData, setFormData] = useState({ student_id: '', violation_type_id: '', notes: '' })
    const [formErrors, setFormErrors] = useState({})
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)

    const searchInputRef = useRef(null)
    const shortcutRef = useRef(null)

    useEffect(() => { const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1) }, 350); return () => clearTimeout(t) }, [searchQuery])
    useEffect(() => { localStorage.setItem(LS_VIEW, viewMode) }, [viewMode])

    useEffect(() => {
        const h = e => { if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false) }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
    }, [])

    useEffect(() => {
        const handler = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.key === 'n' && !e.ctrlKey && !isTyping) handleAdd()
            if (e.key === 'Escape') { setSearchQuery(''); setSelectedIds([]) }
            if (e.key === '?' && !isTyping) setIsShortcutOpen(v => !v)
        }
        document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler)
    }, [])

    const fetchMetadata = useCallback(async () => {
        try {
            const [studRes, vtRes] = await Promise.all([
                supabase.from('students').select('id, name, class_name').order('name'),
                supabase.from('violation_types').select('id, name, points').order('name'),
            ])
            if (studRes.data) setStudents(studRes.data)
            if (vtRes.data) setViolationTypes(vtRes.data)
        } catch { addToast('Gagal memuat metadata', 'error') }
    }, [addToast])

    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * PAGE_SIZE, to = from + PAGE_SIZE - 1
            let q = supabase.from('reports').select('id, student_id, violation_type_id, points, notes, description, reported_at, teacher_name', { count: 'exact' })
                .order('reported_at', { ascending: sortBy === 'oldest' }).range(from, to)
            if (filterType === 'positive') q = q.gt('points', 0)
            if (filterType === 'negative') q = q.lt('points', 0)
            if (debouncedSearch) {
                const { data: ms } = await supabase.from('students').select('id').ilike('name', `%${debouncedSearch}%`)
                const { data: mt } = await supabase.from('violation_types').select('id').ilike('name', `%${debouncedSearch}%`)
                const sIds = (ms || []).map(s => s.id), tIds = (mt || []).map(t => t.id)
                if (!sIds.length && !tIds.length) { setReports([]); setTotalRows(0); setLoading(false); return }
                const f = []
                if (sIds.length) f.push(`student_id.in.(${sIds.join(',')})`)
                if (tIds.length) f.push(`violation_type_id.in.(${tIds.join(',')})`)
                q = q.or(f.join(','))
            }
            const { data, error, count } = await q
            if (error) throw error
            let filtered = data || []
            if (filterClass) filtered = filtered.filter(r => { const s = students.find(st => st.id === r.student_id); return s?.class_name === filterClass })
            setReports(filtered); setTotalRows(count ?? 0)
        } catch { addToast('Gagal memuat laporan', 'error') }
        finally { setLoading(false) }
    }, [page, debouncedSearch, filterType, filterClass, sortBy, students, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('reports').select('id, points, reported_at')
            if (data) {
                const todayStr = new Date().toISOString().slice(0, 10)
                setStats({ total: data.length, positive: data.filter(r => (r.points ?? 0) > 0).length, negative: data.filter(r => (r.points ?? 0) < 0).length, today: data.filter(r => r.reported_at?.startsWith(todayStr)).length })
            }
        } catch { }
    }, [])

    const fetchRef = useRef(fetchReports); const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchRef.current = fetchReports }, [fetchReports])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])
    useEffect(() => { fetchMetadata() }, [fetchMetadata])
    useEffect(() => { fetchReports() }, [fetchReports])
    useEffect(() => { fetchStats() }, [])
    useEffect(() => {
        const ch = supabase.channel('reports-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => { fetchRef.current(); fetchStatsRef.current() }).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    // CRUD
    const handleAdd = () => { setSelectedItem(null); setFormData({ student_id: '', violation_type_id: '', notes: '' }); setFormErrors({}); setIsModalOpen(true) }
    const handleEdit = (r) => { setSelectedItem(r); setFormData({ student_id: r.student_id, violation_type_id: r.violation_type_id, notes: r.notes || '' }); setFormErrors({}); setIsModalOpen(true) }

    const handleSubmit = async (e) => {
        e?.preventDefault?.()
        const errors = {}
        if (!formData.student_id) errors.student_id = 'Siswa wajib dipilih'
        if (!formData.violation_type_id) errors.violation_type_id = 'Jenis laporan wajib dipilih'
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
        setFormErrors({}); setSubmitting(true)
        try {
            const vt = violationTypes.find(v => v.id === formData.violation_type_id)
            const payload = { student_id: formData.student_id, violation_type_id: formData.violation_type_id, reporter_id: profile?.id ?? null, teacher_name: profile?.name ?? 'Unknown', points: vt?.points ?? 0, notes: formData.notes || null, reported_at: new Date().toISOString() }
            if (selectedItem) {
                const { data, error } = await supabase.from('reports').update(payload).eq('id', selectedItem.id).select()
                if (error) throw error; if (!data?.length) throw new Error('Gagal update: periksa RLS')
                addToast('Laporan berhasil diupdate', 'success')
            } else {
                const { data, error } = await supabase.from('reports').insert([payload]).select()
                if (error) throw error; if (!data?.length) throw new Error('Gagal simpan: periksa RLS')
                addToast('Laporan berhasil dibuat', 'success')
            }
            setIsModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || 'Gagal menyimpan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return; setSubmitting(true)
        try { const { error } = await supabase.from('reports').delete().eq('id', itemToDelete.id); if (error) throw error; addToast('Laporan dihapus', 'success'); setIsDeleteModalOpen(false); fetchReports(); fetchStats() }
        catch (err) { addToast(err.message || 'Gagal menghapus', 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try { const { error } = await supabase.from('reports').delete().in('id', selectedIds); if (error) throw error; addToast(`${selectedIds.length} laporan dihapus`, 'success'); setSelectedIds([]); setIsBulkDeleteOpen(false); fetchReports(); fetchStats() }
        catch (err) { addToast(err.message || 'Gagal hapus massal', 'error') }
        finally { setSubmitting(false) }
    }

    // Filters
    const activeFilters = useMemo(() => {
        const chips = []
        if (filterType === 'positive') chips.push({ key: 'type', label: 'Positif (+)', clear: () => setFilterType('') })
        if (filterType === 'negative') chips.push({ key: 'type', label: 'Negatif (−)', clear: () => setFilterType('') })
        if (filterClass) chips.push({ key: 'class', label: `Kelas: ${filterClass}`, clear: () => setFilterClass('') })
        return chips
    }, [filterType, filterClass])

    const resetAllFilters = () => { setSearchQuery(''); setFilterType(''); setFilterClass(''); setSortBy('newest'); setPage(1) }
    const handleStatClick = (type) => { setFilterType(prev => prev === type ? '' : type); setPage(1) }

    // Derived
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const toRow = Math.min(page * PAGE_SIZE, totalRows)
    const allSelected = reports.length > 0 && reports.every(r => selectedIds.includes(r.id))
    const someSelected = selectedIds.length > 0 && !allSelected
    const toggleSelectAll = () => allSelected ? setSelectedIds(ids => ids.filter(id => !reports.map(r => r.id).includes(id))) : setSelectedIds(ids => [...new Set([...ids, ...reports.map(r => r.id)])])
    const toggleSelect = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
    const getStudent = (id) => students.find(s => s.id === id)
    const getTypeName = (id) => violationTypes.find(vt => vt.id === id)?.name ?? '—'
    const selectedVT = violationTypes.find(vt => vt.id === formData.violation_type_id)
    const classesList = useMemo(() => [...new Set(students.map(s => s.class_name).filter(Boolean))].sort(), [students])

    const fmt = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
    const fmtDayLabel = (d) => {
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const ds = d.slice(0, 10)
        if (ds === today) return 'Hari Ini'
        if (ds === yesterday) return 'Kemarin'
        return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }

    // Group by date for timeline
    const groupedReports = useMemo(() => {
        const groups = {}
        reports.forEach(r => {
            const key = (r.reported_at || '').slice(0, 10)
            if (!groups[key]) groups[key] = []
            groups[key].push(r)
        })
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    }, [reports])

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout title="Laporan Perilaku">
            {/* Bulk Bar */}
            {selectedIds.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-black text-[var(--color-primary)]">{selectedIds.length} laporan dipilih</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-3 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faTrash} />Hapus</button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} />Batal</button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Laporan Perilaku</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Rekam dan pantau {stats.total} laporan perilaku siswa secara real-time.</p>
                </div>
                <div className="flex gap-2 items-center">
                    {/* View switcher */}
                    <div className="flex h-9 rounded-lg border border-[var(--color-border)] overflow-hidden">
                        {[{ mode: 'timeline', icon: faTimeline, tip: 'Timeline' }, { mode: 'table', icon: faTable, tip: 'Table' }].map(v => (
                            <button key={v.mode} onClick={() => setViewMode(v.mode)} title={v.tip}
                                className={`w-9 flex items-center justify-center text-sm transition-all ${viewMode === v.mode ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={v.icon} />
                            </button>
                        ))}
                    </div>
                    <div className="relative" ref={shortcutRef}>
                        <button onClick={() => setIsShortcutOpen(v => !v)} className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`} title="Keyboard Shortcuts (?)">
                            <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                        </button>
                        {isShortcutOpen && (
                            <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden">
                                <div className="px-4 py-3 border-b border-[var(--color-border)]"><p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p></div>
                                <div className="p-3 space-y-1">
                                    {[{ keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { keys: ['N'], label: 'Buat laporan baru' }, { keys: ['Esc'], label: 'Clear / deselect' }, { keys: ['?'], label: 'Toggle shortcut' }].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)]">
                                            <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                            <div className="flex items-center gap-1">{item.keys.map((k, ki) => <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleAdd} className="h-9 px-5 rounded-xl btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02]">
                        <FontAwesomeIcon icon={faPlus} />Buat Laporan
                    </button>
                </div>
            </div>

            {/* Clickable Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { icon: faClipboardList, label: 'Total Laporan', value: stats.total, top: 'border-t-[var(--color-primary)]', ibg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', filterKey: '' },
                    { icon: faCheckCircle, label: 'Positif', value: stats.positive, top: 'border-t-emerald-500', ibg: 'bg-emerald-500/10 text-emerald-500', filterKey: 'positive' },
                    { icon: faCircleExclamation, label: 'Negatif', value: stats.negative, top: 'border-t-red-500', ibg: 'bg-red-500/10 text-red-500', filterKey: 'negative' },
                    { icon: faCalendarDay, label: 'Hari Ini', value: stats.today, top: 'border-t-blue-500', ibg: 'bg-blue-500/10 text-blue-500', filterKey: '' },
                ].map((s, i) => (
                    <button key={i} onClick={() => s.filterKey && handleStatClick(s.filterKey)}
                        className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.top} flex items-center gap-3 group transition-all text-left ${s.filterKey ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : 'cursor-default'} ${filterType === s.filterKey && s.filterKey ? 'ring-2 ring-[var(--color-primary)] shadow-lg' : ''}`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0 ${s.ibg}`}><FontAwesomeIcon icon={s.icon} /></div>
                        <div>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">{s.label}</p>
                            <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{s.value}</h3>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filter Bar */}
            <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                <div className="flex gap-2 p-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSearch} /></div>
                        <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama siswa atau jenis laporan... (Ctrl+K)"
                            className="input-field pl-10 w-full h-9 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
                    </div>
                    <button onClick={() => setShowAdvFilter(!showAdvFilter)}
                        className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showAdvFilter || activeFilters.length > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                        <FontAwesomeIcon icon={faSliders} />Filter{activeFilters.length > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-[9px] font-black flex items-center justify-center">{activeFilters.length}</span>}
                    </button>
                </div>
                {showAdvFilter && (
                    <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Jenis Poin</label>
                                <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl"><option value="">Semua</option><option value="positive">Positif (+)</option><option value="negative">Negatif (−)</option></select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kelas</label>
                                <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl"><option value="">Semua Kelas</option>{classesList.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl"><option value="newest">Terbaru</option><option value="oldest">Terlama</option></select>
                            </div>
                        </div>
                        <div className="flex justify-end pt-3 mt-3 border-t border-[var(--color-border)]/50">
                            <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20">Reset Filter</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Filter Chips */}
            {activeFilters.length > 0 && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                    {activeFilters.map(f => (
                        <span key={f.key} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-[10px] font-black uppercase tracking-widest">
                            {f.label}
                            <button onClick={f.clear} className="w-4 h-4 rounded-full bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)] hover:text-white flex items-center justify-center transition-all"><FontAwesomeIcon icon={faXmark} className="text-[8px]" /></button>
                        </span>
                    ))}
                    <button onClick={resetAllFilters} className="text-[10px] font-black text-[var(--color-text-muted)] hover:text-red-500 uppercase tracking-widest transition-colors ml-1">Clear All</button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-10 flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl" />
                    <p className="text-xs font-bold uppercase tracking-widest">Memuat data...</p>
                </div>
            ) : totalRows === 0 ? (
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] py-16 flex flex-col items-center text-center px-6">
                    <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] opacity-40"><FontAwesomeIcon icon={faClipboardList} className="text-2xl" /></div>
                    <h3 className="text-base font-black text-[var(--color-text)] mb-1">Belum Ada Laporan</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-medium mb-6">Mulai dengan membuat laporan perilaku pertama.</p>
                    <button onClick={handleAdd} className="h-10 px-6 rounded-xl btn-primary text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2"><FontAwesomeIcon icon={faPlus} />Buat Laporan Pertama</button>
                </div>
            ) : viewMode === 'timeline' ? (
                /* ═══ TIMELINE VIEW ═══ */
                <div className="space-y-0">
                    {groupedReports.map(([dateKey, items], gi) => (
                        <div key={dateKey}>
                            {/* Day header */}
                            <div className="flex items-center gap-3 mb-3 mt-2">
                                <div className="h-8 px-4 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text)]">{fmtDayLabel(dateKey + 'T00:00')}</span>
                                    <span className="w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black flex items-center justify-center">{items.length}</span>
                                </div>
                                <div className="flex-1 h-px bg-[var(--color-border)]" />
                            </div>
                            {/* Timeline items */}
                            <div className="relative ml-6 pl-6 border-l-2 border-[var(--color-border)] space-y-0 mb-6">
                                {items.map((report, ri) => {
                                    const isPositive = (report.points ?? 0) > 0
                                    const pts = report.points ?? 0
                                    const student = getStudent(report.student_id)
                                    return (
                                        <div key={report.id} className="relative pb-5 group">
                                            {/* Dot */}
                                            <div className={`absolute -left-[calc(1.5rem+5px)] top-2 w-3 h-3 rounded-full border-2 border-[var(--color-surface)] ring-2 transition-transform group-hover:scale-125 ${isPositive ? 'bg-emerald-500 ring-emerald-500/30' : 'bg-red-500 ring-red-500/30'}`} />
                                            {/* Time label */}
                                            <span className="absolute -left-[4.8rem] top-1.5 text-[9px] font-black text-[var(--color-text-muted)] tabular-nums tracking-wider">{fmtTime(report.reported_at)}</span>
                                            {/* Card */}
                                            <div className={`glass rounded-2xl p-4 border transition-all hover:shadow-md hover:-translate-y-0.5 ${isPositive ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-red-500/20 hover:border-red-500/40'} ${selectedIds.includes(report.id) ? 'ring-2 ring-[var(--color-primary)]' : ''}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggleSelect(report.id)} className="mt-1 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0" />
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${isPositive ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-red-500 to-rose-600'}`}>
                                                            <FontAwesomeIcon icon={isPositive ? faArrowUp : faArrowDown} className="text-sm" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className="text-sm font-black text-[var(--color-text)] leading-tight">{student?.name ?? '—'}</h4>
                                                                {student?.class_name && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">{student.class_name}</span>}
                                                            </div>
                                                            <p className="text-[11px] font-bold text-[var(--color-text-muted)] mt-1">{getTypeName(report.violation_type_id)}</p>
                                                            {report.notes && <p className="text-[11px] text-[var(--color-text-muted)] italic mt-2 py-2 px-3 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)] opacity-80">"{report.notes}"</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isPositive ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                            {pts > 0 ? '+' : ''}{pts}
                                                        </span>
                                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEdit(report)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all"><FontAwesomeIcon icon={faEdit} className="text-[10px]" /></button>
                                                            <button onClick={() => { setItemToDelete(report); setIsDeleteModalOpen(true) }} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"><FontAwesomeIcon icon={faTrash} className="text-[10px]" /></button>
                                                        </div>
                                                    </div>
                                                </div>
                                                {report.teacher_name && <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ml-[3.25rem] ${isPositive ? 'text-emerald-500/60' : 'text-red-500/60'}`}>Oleh {report.teacher_name}</p>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* ═══ TABLE VIEW ═══ */
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    <th className="px-6 py-4 w-12 text-center"><input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" /></th>
                                    <th className="px-6 py-4">Siswa</th>
                                    <th className="px-6 py-4">Jenis Laporan</th>
                                    <th className="px-6 py-4 text-center">Poin</th>
                                    <th className="px-6 py-4">Tanggal</th>
                                    <th className="px-6 py-4">Pelapor</th>
                                    <th className="px-6 py-4 text-center w-24">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(report => {
                                    const isP = (report.points ?? 0) > 0, pts = report.points ?? 0, student = getStudent(report.student_id)
                                    return (
                                        <tr key={report.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors ${selectedIds.includes(report.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                            <td className="px-6 py-4 text-center"><input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggleSelect(report.id)} className="rounded border-[var(--color-border)] text-[var(--color-primary)]" /></td>
                                            <td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${isP ? 'bg-emerald-500' : 'bg-red-500'}`}><FontAwesomeIcon icon={isP ? faArrowUp : faArrowDown} className="text-xs" /></div><div><p className="text-sm font-black text-[var(--color-text)]">{student?.name ?? '—'}</p>{student?.class_name && <p className="text-[10px] text-[var(--color-text-muted)] font-bold">{student.class_name}</p>}</div></div></td>
                                            <td className="px-6 py-4"><p className="text-xs font-bold text-[var(--color-text)]">{getTypeName(report.violation_type_id)}</p></td>
                                            <td className="px-6 py-4 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${isP ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>{pts > 0 ? '+' : ''}{pts}</span></td>
                                            <td className="px-6 py-4"><p className="text-xs font-bold text-[var(--color-text)]">{fmt(report.reported_at)}</p><p className="text-[10px] text-[var(--color-text-muted)]">{fmtTime(report.reported_at)}</p></td>
                                            <td className="px-6 py-4 text-xs font-bold text-[var(--color-text)]">{report.teacher_name || '—'}</td>
                                            <td className="px-6 py-4"><div className="flex items-center justify-center gap-1"><button onClick={() => handleEdit(report)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all"><FontAwesomeIcon icon={faEdit} className="text-xs" /></button><button onClick={() => { setItemToDelete(report); setIsDeleteModalOpen(true) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button></div></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {totalRows > 0 && !loading && (
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 px-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}–{toRow} dari {totalRows} laporan</p>
                    <div className="flex items-center gap-2">
                        <button disabled={page === 1} onClick={() => setPage(1)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" /></button>
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
                        <div className="flex items-center gap-1.5 mx-1">
                            {getPageItems(page, totalPages).map((it, idx) => it === '...' ? <span key={`s${idx}`} className="w-8 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30">···</span> : (
                                <button key={it} onClick={() => setPage(it)} className={`h-9 min-w-[36px] px-2.5 rounded-xl font-black text-[10px] transition-all ${it === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}>{it}</button>
                            ))}
                        </div>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
                        <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" /></button>
                        <input value={jumpPage} onChange={e => setJumpPage(e.target.value.replace(/\D/g, ''))} onKeyDown={e => { if (e.key === 'Enter') { const n = +jumpPage; if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage('') } } }} placeholder="Hal..." className="ml-2 w-16 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[11px] font-black focus:border-[var(--color-primary)] outline-none" />
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Update Laporan' : 'Buat Laporan Baru'} size="md">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Siswa <span className="text-red-500">*</span></label>
                        <select value={formData.student_id} onChange={e => { setFormData({ ...formData, student_id: e.target.value }); setFormErrors(p => ({ ...p, student_id: '' })) }} className={`input-field font-bold text-sm h-11 w-full ${formErrors.student_id ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                            <option value="">Pilih siswa...</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}{s.class_name ? ` — ${s.class_name}` : ''}</option>)}
                        </select>
                        {formErrors.student_id && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />{formErrors.student_id}</p>}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Jenis Laporan <span className="text-red-500">*</span></label>
                        <select value={formData.violation_type_id} onChange={e => { setFormData({ ...formData, violation_type_id: e.target.value }); setFormErrors(p => ({ ...p, violation_type_id: '' })) }} className={`input-field font-bold text-sm h-11 w-full ${formErrors.violation_type_id ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
                            <option value="">Pilih jenis...</option>
                            {violationTypes.map(vt => <option key={vt.id} value={vt.id}>{vt.name} ({vt.points > 0 ? '+' : ''}{vt.points} poin)</option>)}
                        </select>
                        {formErrors.violation_type_id && <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-500 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />{formErrors.violation_type_id}</p>}
                        {selectedVT && (
                            <div className={`mt-2 px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${(selectedVT.points ?? 0) > 0 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                <FontAwesomeIcon icon={(selectedVT.points ?? 0) > 0 ? faArrowUp : faArrowDown} />{(selectedVT.points ?? 0) > 0 ? '+' : ''}{selectedVT.points} poin akan dicatat
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Catatan (Opsional)</label>
                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Informasi pendukung..." className="input-field font-medium text-sm w-full py-3 rounded-xl" rows={3} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="h-11 px-6 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                        <button type="submit" disabled={submitting} className="h-11 px-8 rounded-xl btn-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50 flex items-center gap-2">
                            {submitting && <FontAwesomeIcon icon={faSpinner} className="fa-spin" />}{selectedItem ? 'Update' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Laporan" size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl animate-pulse"><FontAwesomeIcon icon={faTrash} /></div>
                        <div><h3 className="text-sm font-black uppercase tracking-wider italic">Konfirmasi Hapus</h3><p className="text-[10px] font-bold opacity-70 mt-1">Tindakan ini tidak dapat dibatalkan.</p></div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">Batal</button>
                        <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 disabled:opacity-50">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Hapus'}</button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Delete Modal */}
            <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Hapus Massal" size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl"><FontAwesomeIcon icon={faTrash} /></div>
                        <div><h3 className="text-sm font-black uppercase tracking-wider">Hapus {selectedIds.length} Laporan</h3><p className="text-[10px] font-bold opacity-70 mt-1">Tindakan ini tidak dapat dibatalkan.</p></div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">Batal</button>
                        <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 disabled:opacity-50">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : `Hapus ${selectedIds.length}`}</button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}