import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faTimes, faSpinner,
    faBoxArchive, faRotateLeft, faVenus, faMars, faCheckCircle,
    faDownload, faXmark, faUserTie, faTriangleExclamation,
    faChalkboardTeacher, faEye, faEyeSlash, faThumbtack,
    faUpload, faTableList, faKeyboard, faPhone, faSliders,
    faEnvelope, faCalendar, faMapMarkerAlt, faNoteSticky,
    faCircleCheck, faUsers, faFileLines, faAnglesLeft, faAnglesRight,
    faChevronLeft, faChevronRight,
    faBullhorn, faIdCard,
    faFileImport, faFileExport
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { TeacherRow, TeacherMobileCard, STATUS_CONFIG } from '../../components/teachers/TeacherRow'
import TeacherFormModal from '../../components/teachers/TeacherFormModal'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// STATUS_CONFIG imported from TeacherRow component
const LS_FILTERS = 'teachers_filters'
const LS_COLS = 'teachers_columns'

const maskInfo = (str, vis = 4) => {
    if (!str) return '—'
    if (str.length <= vis) return str[0] + '*'.repeat(str.length - 1)
    return str.substring(0, vis) + '***'
}

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function TeachersPage() {
    // core
    const [teachers, setTeachers] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [subjectsList, setSubjectsList] = useState([])
    const [classesList, setClassesList] = useState([])
    const [stats, setStats] = useState({ total: 0, active: 0, male: 0, female: 0 })
    // filters
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterSubject, setFilterSubject] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [filterStatus, setFilterStatus] = useState('active')
    const [filterMissing, setFilterMissing] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [showAdvFilter, setShowAdvFilter] = useState(false)
    const pageSize = 25
    // columns
    const [visibleCols, setVisibleCols] = useState({ nbm: true, subject: true, gender: true, contact: true, status: true, join: true })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
    const colMenuRef = useRef(null)
    // ui
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    // modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isBulkWAOpen, setIsBulkWAOpen] = useState(false)
    // form
    const [selectedItem, setSelectedItem] = useState(null)
    const [teacherToAction, setTeacherToAction] = useState(null)
    // profile
    const [profileTeacher, setProfileTeacher] = useState(null)
    const [profileStats, setProfileStats] = useState(null)
    const [profileReports, setProfileReports] = useState([])
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [profileTab, setProfileTab] = useState('info')
    // archived
    const [archivedTeachers, setArchivedTeachers] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    // bulk
    const [selectedIds, setSelectedIds] = useState([])
    const [bulkWAIndex, setBulkWAIndex] = useState(-1)
    const [bulkWAResults, setBulkWAResults] = useState({})
    const [waTemplate, setWaTemplate] = useState('info')
    // quick status
    const [quickStatusId, setQuickStatusId] = useState(null)
    const quickStatusRef = useRef(null)
    // import
    const [importTab, setImportTab] = useState('panduan')
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importDupes, setImportDupes] = useState([])
    const [importSkip, setImportSkip] = useState(true)
    const [importDrag, setImportDrag] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    // export
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState({ nama: true, nbm: true, subject: true, gender: true, phone: true, email: true, status: true, join_date: true, address: false })
    const [exporting, setExporting] = useState(false)

    const searchInputRef = useRef(null)
    const importFileRef = useRef(null)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)
    const { addToast } = useToast()

    // ── persist ──────────────────────────────────────────────────────────────
    useEffect(() => {
        try { const f = JSON.parse(localStorage.getItem(LS_FILTERS) || '{}'); if (f.filterGender) setFilterGender(f.filterGender); if (f.filterStatus !== undefined) setFilterStatus(f.filterStatus); if (f.filterSubject) setFilterSubject(f.filterSubject); if (f.sortBy) setSortBy(f.sortBy) } catch { }
        try { const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}'); if (Object.keys(c).length) setVisibleCols(c) } catch { }
    }, [])
    useEffect(() => { try { localStorage.setItem(LS_FILTERS, JSON.stringify({ filterGender, filterStatus, filterSubject, sortBy })) } catch { } }, [filterGender, filterStatus, filterSubject, sortBy])
    useEffect(() => { try { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) } catch { } }, [visibleCols])

    // ── debounce ─────────────────────────────────────────────────────────────
    useEffect(() => { const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1) }, 350); return () => clearTimeout(t) }, [searchQuery])

    // ── outside click ─────────────────────────────────────────────────────────
    useEffect(() => {
        const h = e => {
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false)
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
            if (quickStatusRef.current && !quickStatusRef.current.contains(e.target)) setQuickStatusId(null)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // ── computed ──────────────────────────────────────────────────────────────
    const activeFilterCount = [filterGender, filterSubject, filterMissing, filterStatus !== 'active' ? filterStatus : ''].filter(Boolean).length
    const hasActiveFilters = !!(searchQuery || activeFilterCount)
    const resetAllFilters = () => { setSearchQuery(''); setFilterSubject(''); setFilterGender(''); setFilterMissing(''); setFilterStatus('active'); setPage(1) }

    // ── keyboard shortcuts ────────────────────────────────────────────────────
    useEffect(() => {
        const handler = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            const ctrl = e.ctrlKey || e.metaKey
            const anyModal = isModalOpen || isDeleteModalOpen || isArchiveModalOpen || isArchivedOpen || isProfileOpen || isImportModalOpen || isExportModalOpen || isBulkModalOpen || isBulkDeleteOpen || isBulkWAOpen
            if (e.key === 'Escape') { if (isShortcutOpen) { setIsShortcutOpen(false); return } if (anyModal) return; if (searchQuery) { setSearchQuery(''); return } if (selectedIds.length) { setSelectedIds([]); return } if (hasActiveFilters) { resetAllFilters(); return } }
            if (ctrl && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); return }
            if (ctrl && e.key === 'f' && !isTyping) { e.preventDefault(); setShowAdvFilter(v => !v); return }
            if (ctrl && e.key === 'a' && !isTyping) { e.preventDefault(); toggleSelectAll(); return }
            if (ctrl && e.key === 'e' && !isTyping) { e.preventDefault(); setIsExportModalOpen(true); return }
            if (e.key === 'n' && !isTyping) { e.preventDefault(); handleAdd(); return }
            if (e.key === 'p' && !isTyping) { e.preventDefault(); setIsPrivacyMode(v => !v); return }
            if (e.key === 'r' && !isTyping) { e.preventDefault(); fetchData(); return }
            if (e.key === 'x' && !isTyping) { e.preventDefault(); resetAllFilters(); return }
            if (e.key === '?' && !isTyping) { setIsShortcutOpen(v => !v); return }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModalOpen, isDeleteModalOpen, isArchiveModalOpen, isArchivedOpen, isProfileOpen, isImportModalOpen, isExportModalOpen, isBulkModalOpen, isBulkDeleteOpen, isBulkWAOpen, isShortcutOpen, searchQuery, selectedIds, hasActiveFilters])

    // ── fetch ─────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * pageSize, to = from + pageSize - 1
            const sortMap = { name_asc: { col: 'name', asc: true }, name_desc: { col: 'name', asc: false }, subject_asc: { col: 'subject', asc: true }, join_asc: { col: 'join_date', asc: true }, join_desc: { col: 'join_date', asc: false } }
            const { col, asc } = sortMap[sortBy] || sortMap.name_asc
            let q = supabase.from('teachers').select('*', { count: 'exact' }).is('deleted_at', null).order(col, { ascending: asc }).range(from, to)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterSubject) q = q.eq('subject', filterSubject)
            if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')
            if (debouncedSearch) { const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_'); q = q.or(`name.ilike.%${s}%,nbm.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`) }
            const { data, error, count } = await q
            if (error) throw error
            setTeachers([...(data || [])].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)))
            setTotalRows(count ?? 0)
            const { data: allSubj } = await supabase.from('teachers').select('subject').is('deleted_at', null).not('subject', 'is', null)
            if (allSubj) setSubjectsList([...new Set(allSubj.map(r => r.subject).filter(Boolean))].sort())
            const { data: cls } = await supabase.from('classes').select('id,name').order('name')
            if (cls) setClassesList(cls)
        } catch { addToast('Gagal memuat data guru', 'error') }
        finally { setLoading(false) }
    }, [page, sortBy, filterStatus, filterGender, filterSubject, filterMissing, debouncedSearch, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('teachers').select('id,gender,status').is('deleted_at', null)
            if (data) setStats({ total: data.length, active: data.filter(t => t.status === 'active').length, male: data.filter(t => t.gender === 'L').length, female: data.filter(t => t.gender === 'P').length })
        } catch { }
    }, [])

    const fetchDataRef = useRef(fetchData); const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])

    useEffect(() => {
        const ch = supabase.channel('teachers-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => { fetchDataRef.current(); fetchStatsRef.current() }).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    useEffect(() => { fetchStats() }, [])
    useEffect(() => { fetchData() }, [page, sortBy, filterStatus, filterGender, filterSubject, filterMissing, debouncedSearch])

    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    // Insights Row
    const insights = useMemo(() => {
        const res = []
        const noWARecords = teachers.filter(t => !t.phone).length
        if (noWARecords > 0) res.push({
            id: 'wa',
            label: `${noWARecords} Guru Tanpa WA`,
            desc: 'Kontak WhatsApp belum tersedia',
            icon: faWhatsapp,
            color: 'text-amber-600',
            bg: 'bg-amber-600/10',
            active: filterMissing === 'wa',
            onClick: () => { setFilterMissing(filterMissing === 'wa' ? '' : 'wa'); setPage(1); setShowAdvFilter(true) }
        })

        const inactiveCount = teachers.filter(t => t.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: `${inactiveCount} Guru Nonaktif`,
            desc: 'Status saat ini sedang dideaktifkan',
            icon: faBoxArchive,
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            active: filterStatus === 'inactive',
            onClick: () => { setFilterStatus(filterStatus === 'inactive' ? 'active' : 'inactive'); setPage(1); setShowAdvFilter(true) }
        })

        return res
    }, [teachers, filterMissing, filterStatus])

    // ── crud ──────────────────────────────────────────────────────────────────
    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }
    const handleSubmit = async (payload) => {
        setSubmitting(true)
        try {
            if (selectedItem) { const { error } = await supabase.from('teachers').update(payload).eq('id', selectedItem.id); if (error) throw error; addToast('Data guru berhasil diupdate', 'success') }
            else { const { error } = await supabase.from('teachers').insert([payload]); if (error) throw error; addToast('Guru baru berhasil ditambahkan', 'success') }
            setIsModalOpen(false); fetchData(); fetchStats()
            return null
        } catch (err) { return { error: true, code: err.code, message: 'Gagal menyimpan data.' } }
        finally { setSubmitting(false) }
    }
    const handleDeleteConfirm = async () => {
        if (!teacherToAction) return; setSubmitting(true)
        try { const { error } = await supabase.from('teachers').delete().eq('id', teacherToAction.id); if (error) throw error; addToast(`"${teacherToAction.name}" berhasil dihapus`, 'success'); setIsDeleteModalOpen(false); setTeacherToAction(null); fetchData(); fetchStats() }
        catch { addToast('Gagal menghapus', 'error') } finally { setSubmitting(false) }
    }
    const handleArchive = async () => {
        if (!teacherToAction) return; setSubmitting(true)
        try { const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).eq('id', teacherToAction.id); if (error) throw error; addToast(`"${teacherToAction.name}" diarsipkan`, 'success'); setIsArchiveModalOpen(false); setTeacherToAction(null); fetchData(); fetchStats() }
        catch { addToast('Gagal mengarsipkan', 'error') } finally { setSubmitting(false) }
    }
    const handleRestore = async teacher => {
        try { const { error } = await supabase.from('teachers').update({ deleted_at: null }).eq('id', teacher.id); if (error) throw error; addToast(`"${teacher.name}" dipulihkan`, 'success'); setArchivedTeachers(prev => prev.filter(t => t.id !== teacher.id)); fetchData(); fetchStats() }
        catch { addToast('Gagal memulihkan', 'error') }
    }
    const fetchArchived = async () => {
        setLoadingArchived(true)
        try { const { data, error } = await supabase.from('teachers').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }); if (error) throw error; setArchivedTeachers(data || []) }
        catch { addToast('Gagal memuat arsip', 'error') } finally { setLoadingArchived(false) }
    }

    // ── pin ───────────────────────────────────────────────────────────────────
    const handleTogglePin = async teacher => {
        const newPinned = !teacher.is_pinned

        // Optimistic UI Update
        setTeachers(prev => {
            const updated = prev.map(t =>
                t.id === teacher.id ? { ...t, is_pinned: newPinned } : t
            )
            // Re-sort to put pinned at top
            return updated.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
        })

        try {
            const { error } = await supabase
                .from('teachers')
                .update({ is_pinned: newPinned })
                .eq('id', teacher.id)

            if (error) throw error

            addToast(
                newPinned ? (
                    <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faThumbtack} className="text-amber-400 rotate-[-45deg] text-[10px]" />
                        "{teacher.name}" disematkan ke atas
                    </span>
                ) : (
                    `Sematkan "${teacher.name}" dilepas`
                ),
                'success'
            )
        } catch (err) {
            console.error('Pin error:', err)
            // Rollback on failure
            setTeachers(prev => {
                const rolledBack = prev.map(t =>
                    t.id === teacher.id ? { ...t, is_pinned: teacher.is_pinned } : t
                )
                return rolledBack.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            })
            addToast('Gagal menyematkan data', 'error')
        }
    }

    // ── quick status ──────────────────────────────────────────────────────────
    const handleQuickStatus = async (teacher, newStatus) => {
        try { const { error } = await supabase.from('teachers').update({ status: newStatus }).eq('id', teacher.id); if (error) throw error; addToast(`Status ${teacher.name} → ${STATUS_CONFIG[newStatus].label}`, 'success'); setQuickStatusId(null); fetchData(); fetchStats() }
        catch { addToast('Gagal update status', 'error') }
    }

    // ── profile ───────────────────────────────────────────────────────────────
    const openProfile = async teacher => {
        setProfileTeacher(teacher); setProfileStats(null); setProfileReports([]); setProfileTab('info'); setLoadingProfile(true); setIsProfileOpen(true)
        try {
            const { data: reports } = await supabase.from('reports').select('id,created_at,points,description').eq('teacher_name', teacher.name).order('created_at', { ascending: false })
            if (reports) {
                const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
                setProfileReports(reports)
                setProfileStats({ total: reports.length, monthly: reports.filter(r => new Date(r.created_at) >= thisMonth).length, totalPts: reports.reduce((a, r) => a + (r.points || 0), 0), posCount: reports.filter(r => (r.points || 0) > 0).length, negCount: reports.filter(r => (r.points || 0) < 0).length })
            }
        } catch { } finally { setLoadingProfile(false) }
    }

    // ── bulk ──────────────────────────────────────────────────────────────────
    const allPageIds = teachers.map(t => t.id)
    const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id))
    const someSelected = selectedIds.length > 0 && !allSelected
    const toggleSelectAll = () => allSelected ? setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id))) : setSelectedIds(prev => [...new Set([...prev, ...allPageIds])])
    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    const handleBulkArchive = async () => {
        setSubmitting(true)
        try { const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).in('id', selectedIds); if (error) throw error; addToast(`${selectedIds.length} guru diarsipkan`, 'success'); setSelectedIds([]); setIsBulkModalOpen(false); fetchData(); fetchStats() }
        catch { addToast('Gagal arsip massal', 'error') } finally { setSubmitting(false) }
    }
    const handleBulkDelete = async () => {
        setSubmitting(true)
        try { const { error } = await supabase.from('teachers').delete().in('id', selectedIds); if (error) throw error; addToast(`${selectedIds.length} guru dihapus`, 'success'); setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData(); fetchStats() }
        catch { addToast('Gagal hapus massal', 'error') } finally { setSubmitting(false) }
    }
    const bulkWATeachers = useMemo(() => teachers.filter(t => selectedIds.includes(t.id) && t.phone), [teachers, selectedIds])
    const startBulkWA = () => { if (!bulkWATeachers.length) { addToast('Tidak ada guru terpilih dengan nomor WA', 'warning'); return }; setBulkWAIndex(0); setBulkWAResults({}); setIsBulkWAOpen(true) }
    const sendNextWA = () => { const t = bulkWATeachers[bulkWAIndex]; if (!t) return; const msg = { info: `Assalamu'alaikum, *${t.name}*.\nBerikut informasi akun Anda di sistem.`, notif: `Assalamu'alaikum, *${t.name}*.\nAda notifikasi baru untukAnda di sistem.` }; window.open(`https://wa.me/${t.phone.replace(/^0/, '62')}?text=${encodeURIComponent(msg[waTemplate] || msg.info)}`, '_blank'); setBulkWAResults(prev => ({ ...prev, [t.id]: 'sent' })); setBulkWAIndex(bulkWAIndex + 1 < bulkWATeachers.length ? bulkWAIndex + 1 : -1) }

    // ── import ────────────────────────────────────────────────────────────────
    const processImportFile = async file => {
        if (!file) return
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) { addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error'); return }
        setImportFileName(file.name); setImportPreview([]); setImportIssues([]); setImportDupes([]); setImportTab('preview')
        try {
            let rows = []
            if (ext.endsWith('.csv')) rows = await new Promise(res => Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data) }))
            else rows = await new Promise(res => { const reader = new FileReader(); reader.onload = e => { const wb = XLSX.read(e.target.result, { type: 'array' }); res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) }; reader.readAsArrayBuffer(file) })
            if (!rows.length) { addToast('File kosong atau tidak terbaca', 'error'); return }
            const issues = [], dupes = []
            const preview = rows.map((row, i) => {
                const name = (row['Nama'] || row['name'] || '').toString().trim()
                const nbm = (row['NBM'] || row['nbm'] || '').toString().trim()
                const subject = (row['Mata Pelajaran'] || row['subject'] || '').toString().trim()
                const gender = (row['Gender'] || row['gender'] || '').toString().trim().toUpperCase()
                const phone = (row['No. HP/WA'] || row['phone'] || '').toString().trim()
                const email = (row['Email'] || row['email'] || '').toString().trim()
                const status = (row['Status'] || row['status'] || 'active').toString().toLowerCase()
                const rowIssues = []
                if (!name) rowIssues.push({ level: 'error', msg: 'Nama tidak boleh kosong' })
                if (gender && !['L', 'P', 'LAKI-LAKI', 'PEREMPUAN'].includes(gender)) rowIssues.push({ level: 'warn', msg: 'Gender tidak dikenali, default ke L' })
                if (rowIssues.length) issues.push({ row: i + 2, level: rowIssues[0].level, messages: rowIssues.map(x => x.msg) })
                const genderNorm = ['L', 'LAKI-LAKI'].includes(gender) ? 'L' : ['P', 'PEREMPUAN'].includes(gender) ? 'P' : ''
                const statusNorm = ['active', 'inactive', 'cuti'].includes(status) ? status : 'active'
                return { _row: i, name, nbm, subject, gender: genderNorm, phone, email, status: statusNorm, _hasError: rowIssues.some(x => x.level === 'error') }
            })
            preview.forEach((row, i) => { if (row.nbm && preview.slice(0, i).some(p => p.nbm === row.nbm)) { dupes.push(i); issues.push({ row: i + 2, level: 'dupe', messages: [`NBM "${row.nbm}" duplikat`] }) } })
            setImportPreview(preview); setImportIssues(issues); setImportDupes(dupes)
        } catch { addToast('Gagal membaca file import', 'error') }
    }

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')
    const handleCommitImport = async () => {
        if (!importPreview.length) { addToast('Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast('Masih ada ERROR. Perbaiki file dulu.', 'error'); return }
        const dupeSet = new Set(importDupes), errRows = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        const validRows = importPreview.filter((_, i) => !errRows.has(i) && !(importSkip && dupeSet.has(i)))
        if (!validRows.length) { addToast('Tidak ada baris valid', 'warning'); return }
        setImporting(true); setImportProgress({ done: 0, total: validRows.length })
        try {
            const CHUNK = 50
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({ name: r.name, nbm: r.nbm || null, subject: r.subject || null, gender: r.gender || null, phone: r.phone || null, email: r.email || null, status: r.status }))
                const { error } = await supabase.from('teachers').insert(chunk); if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }
            addToast(`Berhasil import ${validRows.length} guru`, 'success')
            setIsImportModalOpen(false); setImportPreview([]); setImportIssues([]); setImportDupes([]); setImportFileName(''); setImportTab('panduan')
            fetchData(); fetchStats()
        } catch { addToast('Gagal import (cek constraint DB / duplikat)', 'error') }
        finally { setImporting(false) }
    }

    // ── export ────────────────────────────────────────────────────────────────
    const getExportData = async () => {
        let q = supabase.from('teachers').select('name,nbm,subject,gender,phone,email,status,join_date,address').is('deleted_at', null).order('name')
        if (exportScope === 'filtered') { if (filterStatus) q = q.eq('status', filterStatus); if (filterGender) q = q.eq('gender', filterGender); if (filterSubject) q = q.eq('subject', filterSubject) }
        const { data, error } = await q; if (error) throw error
        const colMap = { nama: 'Nama', nbm: 'NBM', subject: 'Mata Pelajaran', gender: 'Gender', phone: 'No. HP/WA', email: 'Email', status: 'Status', join_date: 'Tgl Bergabung', address: 'Alamat' }
        return (data || []).map(t => { const row = {}; Object.entries(exportColumns).forEach(([k, v]) => { if (v) row[colMap[k] || k] = k === 'gender' ? (t.gender === 'L' ? 'Laki-laki' : t.gender === 'P' ? 'Perempuan' : '-') : (k === 'status' ? STATUS_CONFIG[t[k]]?.label || t[k] : t[k] || '-') }); return row })
    }
    const handleExportCSV = async () => {
        setExporting(true)
        try { const rows = await getExportData(); if (!rows.length) return addToast('Tidak ada data', 'warning'); const blob = new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `data-guru-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); addToast(`Export CSV berhasil (${rows.length} guru)`, 'success') }
        catch { addToast('Gagal export CSV', 'error') } finally { setExporting(false); setIsExportModalOpen(false) }
    }
    const handleExportExcel = async () => {
        setExporting(true)
        try { const rows = await getExportData(); if (!rows.length) return addToast('Tidak ada data', 'warning'); const ws = XLSX.utils.json_to_sheet(rows); ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.max(k.length, 14) })); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Guru'); XLSX.writeFile(wb, `data-guru-${new Date().toISOString().slice(0, 10)}.xlsx`); addToast(`Export Excel berhasil (${rows.length} guru)`, 'success') }
        catch { addToast('Gagal export Excel', 'error') } finally { setExporting(false); setIsExportModalOpen(false) }
    }

    const disp = val => isPrivacyMode ? maskInfo(val) : (val || '—')

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout title="Data Guru">

            {/* Privacy Banner */}
            {isPrivacyMode && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor</div>
                    <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-black text-[var(--color-primary)]">{selectedIds.length} guru dipilih</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={startBulkWA} className="h-8 px-3 rounded-xl bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-wide hover:bg-green-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faWhatsapp} />WA Massal</button>
                        <button onClick={() => setIsBulkModalOpen(true)} className="h-8 px-3 rounded-xl bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-wide hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faBoxArchive} />Arsip</button>
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-3 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faTrash} />Hapus</button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} />Batal</button>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Guru</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola {stats.total} data guru dan staff pengajar dalam sistem.</p>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Sliders dropdown */}
                    <div className="relative" ref={headerMenuRef}>
                        <button onClick={() => setIsHeaderMenuOpen(v => !v)}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Aksi lainnya"><FontAwesomeIcon icon={faSliders} /></button>
                        {isHeaderMenuOpen && (
                            <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-[calc(100%+8px)] -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[320px] sm:w-56 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                <button onClick={() => { setIsHeaderMenuOpen(false); setImportTab('panduan'); setImportPreview([]); setImportFileName(''); setIsImportModalOpen(true) }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                    </div>
                                </button>
                                <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black leading-tight">Export Data</p>
                                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                    </div>
                                </button>
                                <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>
                                <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedOpen(true) }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black leading-tight">Arsip Guru</p>
                                        <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">arsip</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Privacy toggle */}
                    <button onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                        className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}>
                        <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isPrivacyMode ? 'Privacy On' : 'Privacy Off'}</span>
                    </button>

                    {/* Keyboard shortcuts floating panel */}
                    <div className="relative" ref={shortcutRef}>
                        <button onClick={() => setIsShortcutOpen(v => !v)}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            title="Keyboard Shortcuts (?)"><FontAwesomeIcon icon={faKeyboard} className="text-sm" /></button>
                        {isShortcutOpen && (
                            <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-11 -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[340px] sm:w-72 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                </div>
                                <div className="p-3 space-y-0.5">
                                    {[{ section: 'Navigasi' }, { keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan' }, { keys: ['Esc'], label: 'Tutup / clear / deselect' }, { section: 'Aksi' }, { keys: ['N'], label: 'Tambah guru baru' }, { keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect' }, { keys: ['Ctrl', 'E'], label: 'Buka export' }, { section: 'Tampilan' }, { keys: ['P'], label: 'Toggle privacy mode' }, { keys: ['R'], label: 'Refresh data' }, { keys: ['X'], label: 'Reset semua filter' }, { keys: ['?'], label: 'Tampilkan shortcut ini' }].map((item, i) => item.section ? (
                                        <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                    ) : (
                                        <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                            <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                            <div className="flex items-center gap-1">{item.keys.map((k, ki) => <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add button */}
                    <button onClick={handleAdd} className="h-9 px-5 rounded-xl btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02]">
                        <FontAwesomeIcon icon={faPlus} />Tambah
                    </button>
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { icon: faChalkboardTeacher, label: 'Total Guru', value: stats.total, top: 'border-t-[var(--color-primary)]', ibg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', hover: 'hover:bg-[var(--color-primary)]/5' },
                    { icon: faCheckCircle, label: 'Aktif', value: stats.active, top: 'border-t-emerald-500', ibg: 'bg-emerald-500/10 text-emerald-500', hover: 'hover:bg-emerald-500/5' },
                    { icon: faMars, label: 'Laki-laki', value: stats.male, top: 'border-t-blue-500', ibg: 'bg-blue-500/10 text-blue-500', hover: 'hover:bg-blue-500/5' },
                    { icon: faVenus, label: 'Perempuan', value: stats.female, top: 'border-t-pink-500', ibg: 'bg-pink-500/10 text-pink-500', hover: 'hover:bg-pink-500/5' },
                ].map((s, i) => (
                    <div key={i} className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.top} flex items-center gap-3 group ${s.hover} hover:border-t-4 transition-all`}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0 ${s.ibg}`}><FontAwesomeIcon icon={s.icon} /></div>
                        <div>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">{s.label}</p>
                            <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{s.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Insights Hub */}
            {insights.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">
                    {insights.map((ins) => (
                        <button
                            key={ins.id}
                            onClick={ins.onClick}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${ins.active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]' : `border-current opacity-80 ${ins.bg} ${ins.color}`}`}
                        >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ins.active ? 'bg-[var(--color-primary)] text-white' : 'bg-white/20'}`}>
                                <FontAwesomeIcon icon={ins.icon} className="text-[10px]" />
                            </div>
                            <div className="text-left">
                                <p className={`text-[10px] font-black leading-none ${ins.active ? 'text-[var(--color-primary)]' : ''}`}>{ins.label}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">{ins.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Filter Bar ── */}
            <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                <div className="flex gap-2 p-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSearch} /></div>
                        <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, NBM, mapel, email... (Ctrl+K)"
                            className="input-field pl-10 w-full h-9 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faTimes} className="text-xs" /></button>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowAdvFilter(!showAdvFilter)}
                            className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showAdvFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                            <FontAwesomeIcon icon={faSliders} />Filter{activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                        </button>
                        {activeFilterCount > 0 && <button onClick={resetAllFilters} className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} />Reset</button>}
                    </div>
                </div>

                {showAdvFilter && (
                    <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Mata Pelajaran</label>
                                <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl">
                                    <option value="">Semua Mapel</option>{subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Jenis Kelamin</label>
                                <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl">
                                    <option value="">Semua Gender</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Status Guru</label>
                                <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl">
                                    <option value="">Semua Status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="cuti">Cuti</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl">
                                    <option value="name_asc">Nama A–Z</option><option value="name_desc">Nama Z–A</option><option value="subject_asc">Mapel A–Z</option><option value="join_desc">Bergabung Terbaru</option><option value="join_asc">Bergabung Terlama</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-1 mb-4">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Filter Cepat</label>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {[
                                    { label: 'Semua', icon: faUsers, active: !filterMissing && filterStatus === 'active', onClick: () => { setFilterMissing(''); setFilterStatus('active'); setSortBy('name_asc') } },
                                    { label: 'Tanpa WA', icon: faWhatsapp, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1) } },
                                    { label: 'Nonaktif', icon: faUserTie, active: filterStatus === 'inactive', onClick: () => { setFilterStatus('inactive'); setPage(1) } },
                                    { label: 'Cuti', icon: faBoxArchive, active: filterStatus === 'cuti', onClick: () => { setFilterStatus('cuti'); setPage(1) } },
                                ].map((s, i) => (
                                    <button key={i} onClick={s.onClick} className={`whitespace-nowrap h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                        <FontAwesomeIcon icon={s.icon} className="text-[10px]" /><span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-3 border-t border-[var(--color-border)]/50">
                            <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20">Reset Filter</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--color-surface-alt)]">
                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                <th className="px-6 py-4 w-10"></th><th className="px-6 py-4">Guru</th><th className="px-6 py-4">Mapel</th><th className="px-6 py-4">Kontak</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>{Array.from({ length: 8 }).map((_, i) => (
                            <tr key={i} className="border-t border-[var(--color-border)]">
                                <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[var(--color-border)] animate-pulse shrink-0" /><div className="space-y-2"><div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" /><div className="h-2 w-20 rounded bg-[var(--color-border)] animate-pulse opacity-60" /></div></div></td>
                                <td className="px-6 py-4"><div className="h-5 w-24 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-3 w-28 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-5 w-16 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                            </tr>
                        ))}</tbody>
                    </table>
                </div>
            ) : (
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)]">
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    <th className="px-6 py-4 text-center w-12">
                                        <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                    </th>
                                    <th className="px-6 py-4 text-left">Guru</th>
                                    {visibleCols.nbm && <th className="px-6 py-4 text-left">NBM</th>}
                                    {visibleCols.subject && <th className="px-6 py-4 text-left">Mata Pelajaran</th>}
                                    {visibleCols.gender && <th className="px-6 py-4 text-center">Gender</th>}
                                    {visibleCols.contact && <th className="px-6 py-4 text-left">Kontak</th>}
                                    {visibleCols.status && <th className="px-6 py-4 text-left">Status</th>}
                                    {visibleCols.join && <th className="px-6 py-4 text-left">Bergabung</th>}
                                    <th className="px-6 py-4 text-center pr-6 w-32 relative">
                                        <div className="flex items-center justify-center">
                                            <span>Aksi</span>
                                        </div>
                                        {/* Toggle Button — absolute kanan */}
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            <button onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect()
                                                const menuHeight = 280 // Max height estimate
                                                const spaceBelow = window.innerHeight - rect.bottom
                                                const showUp = spaceBelow < menuHeight && rect.top > menuHeight
                                                setMenuPos({
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
                                                <div className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${menuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                    style={{ top: menuPos.top, right: menuPos.right }}>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                    {[{ key: 'nbm', label: 'NBM' }, { key: 'subject', label: 'Mata Pelajaran' }, { key: 'gender', label: 'Jenis Kelamin' }, { key: 'contact', label: 'Kontak / HP' }, { key: 'status', label: 'Status Aktif' }, { key: 'join', label: 'Tgl Bergabung' }].map(({ key, label }) => (
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
                                {teachers.length === 0 ? (
                                    <tr><td colSpan={10} className="px-6 py-14">
                                        <div className="flex flex-col items-center text-center gap-2">
                                            <FontAwesomeIcon icon={faTableList} className="text-3xl text-[var(--color-text-muted)] opacity-30 mb-2" />
                                            <div className="text-sm font-extrabold text-[var(--color-text)]">Data tidak ditemukan</div>
                                            <div className="text-xs font-bold text-[var(--color-text-muted)]">Coba ganti filter / kata kunci pencarian.</div>
                                            <button onClick={resetAllFilters} className="mt-3 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">Reset Semua Filter</button>
                                        </div>
                                    </td></tr>
                                ) : teachers.map(teacher => (
                                    <TeacherRow
                                        key={teacher.id}
                                        teacher={teacher}
                                        selectedIds={selectedIds}
                                        toggleSelect={toggleSelect}
                                        visibleCols={visibleCols}
                                        isPrivacyMode={isPrivacyMode}
                                        disp={disp}
                                        openProfile={openProfile}
                                        handleEdit={handleEdit}
                                        handleTogglePin={handleTogglePin}
                                        handleQuickStatus={handleQuickStatus}
                                        setTeacherToAction={setTeacherToAction}
                                        setIsArchiveModalOpen={setIsArchiveModalOpen}
                                        setIsDeleteModalOpen={setIsDeleteModalOpen}
                                        quickStatusId={quickStatusId}
                                        setQuickStatusId={setQuickStatusId}
                                        quickStatusRef={quickStatusRef}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-[var(--color-border)]">
                        {teachers.length === 0 ? (
                            <div className="py-14 flex flex-col items-center text-center gap-2">
                                <FontAwesomeIcon icon={faTableList} className="text-3xl text-[var(--color-text-muted)] opacity-30 mb-2" />
                                <p className="text-sm font-extrabold text-[var(--color-text)]">Data tidak ditemukan</p>
                                <button onClick={resetAllFilters} className="mt-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition">Reset Filter</button>
                            </div>
                        ) : teachers.map(teacher => (
                            <TeacherMobileCard
                                key={teacher.id}
                                teacher={teacher}
                                selectedIds={selectedIds}
                                toggleSelect={toggleSelect}
                                isPrivacyMode={isPrivacyMode}
                                disp={disp}
                                openProfile={openProfile}
                                handleEdit={handleEdit}
                                handleTogglePin={handleTogglePin}
                                setTeacherToAction={setTeacherToAction}
                                setIsArchiveModalOpen={setIsArchiveModalOpen}
                            />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalRows > 0 && (
                        <div className="px-6 py-5 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}–{toRow} dari {totalRows} guru</p>
                            <div className="flex items-center gap-2">
                                <button disabled={page === 1} onClick={() => setPage(1)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" /></button>
                                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
                                <div className="flex items-center gap-1.5 mx-1">
                                    {getPageItems(page, totalPages).map((it, idx) => it === '...' ? <span key={`s${idx}`} className="w-8 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30">···</span> : (
                                        <button key={it} onClick={() => setPage(it)} className={`h-9 min-w-[36px] px-2.5 rounded-xl font-black text-[10px] transition-all ${it === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}>{it}</button>
                                    ))}
                                </div>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
                                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" /></button>
                                <div className="ml-2 relative flex items-center">
                                    <input value={jumpPage} onChange={e => setJumpPage(e.target.value.replace(/[^\d]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') { const n = Number(jumpPage); if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage('') } } }} placeholder="Hal..." className="w-16 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[11px] font-black focus:border-[var(--color-primary)] outline-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ════ MODAL Tambah/Edit ════ */}
            <TeacherFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                selectedItem={selectedItem}
                classesList={classesList}
                subjectsList={subjectsList}
                onSubmit={handleSubmit}
                submitting={submitting}
            />

            {/* ════ MODAL Profil ════ */}
            {isProfileOpen && (
                <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Profil Guru" size="md">
                    {profileTeacher && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-2xl font-black shrink-0">{profileTeacher.name.charAt(0)}</div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-black text-[var(--color-text)] truncate">{profileTeacher.name}</h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        {profileTeacher.subject && <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase">{profileTeacher.subject}</span>}
                                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${STATUS_CONFIG[profileTeacher.status]?.color}`}>{STATUS_CONFIG[profileTeacher.status]?.label}</span>
                                    </div>
                                </div>
                                <button onClick={() => { setIsProfileOpen(false); handleEdit(profileTeacher) }} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all shrink-0"><FontAwesomeIcon icon={faEdit} /></button>
                            </div>
                            <div className="flex gap-0.5 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                {[['info', 'Info'], ['stats', 'Statistik'], ['laporan', 'Laporan']].map(([k, label]) => (
                                    <button key={k} onClick={() => setProfileTab(k)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${profileTab === k ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>{label}</button>
                                ))}
                            </div>
                            {profileTab === 'info' && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[{ icon: faChalkboardTeacher, label: 'NBM', val: profileTeacher.nbm }, { icon: faMars, label: 'Gender', val: profileTeacher.gender === 'L' ? 'Laki-laki' : profileTeacher.gender === 'P' ? 'Perempuan' : null }, { icon: faPhone, label: 'No. HP/WA', val: profileTeacher.phone }, { icon: faEnvelope, label: 'Email', val: profileTeacher.email }, { icon: faCalendar, label: 'Bergabung', val: profileTeacher.join_date ? new Date(profileTeacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null }, { icon: faMapMarkerAlt, label: 'Alamat', val: profileTeacher.address, wide: true }, { icon: faNoteSticky, label: 'Catatan', val: profileTeacher.notes, wide: true }].filter(i => i.val).map((item, i) => (
                                        <div key={i} className={`p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] ${item.wide ? 'col-span-2' : ''}`}>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={item.icon} className="text-[var(--color-primary)]" />{item.label}</p>
                                            <p className="text-xs font-bold text-[var(--color-text)] break-words">{disp(item.val)}</p>
                                        </div>
                                    ))}
                                    {profileTeacher.phone && <a href={`https://wa.me/${profileTeacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="col-span-2 flex items-center justify-center gap-2 h-10 rounded-xl bg-green-500 text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all"><FontAwesomeIcon icon={faWhatsapp} />Hubungi via WhatsApp</a>}
                                </div>
                            )}
                            {profileTab === 'stats' && (
                                loadingProfile ? <div className="flex items-center gap-2 py-8 justify-center text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSpinner} className="fa-spin" />Memuat statistik...</div>
                                    : profileStats ? (
                                        <div className="grid grid-cols-2 gap-2">
                                            {[{ label: 'Total Laporan', val: profileStats.total, color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-[var(--color-primary)]/20' }, { label: 'Bulan Ini', val: profileStats.monthly, color: 'bg-indigo-500/8 text-indigo-600 border-indigo-500/15' }, { label: 'Positif', val: profileStats.posCount, color: 'bg-emerald-500/8 text-emerald-600 border-emerald-500/15' }, { label: 'Negatif', val: profileStats.negCount, color: 'bg-red-500/8 text-red-500 border-red-500/15' }, { label: 'Total Poin', val: profileStats.totalPts >= 0 ? `+${profileStats.totalPts}` : profileStats.totalPts, color: profileStats.totalPts >= 0 ? 'bg-emerald-500/8 text-emerald-600 border-emerald-500/15' : 'bg-red-500/8 text-red-500 border-red-500/15' }].map((s, i) => (
                                                <div key={i} className={`border rounded-xl px-3 py-2.5 ${s.color}`}><p className="text-xl font-black leading-none">{s.val}</p><p className="text-[8px] font-bold opacity-70 mt-1 uppercase tracking-wide">{s.label}</p></div>
                                            ))}
                                        </div>
                                    ) : <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">Belum ada statistik tercatat</div>
                            )}
                            {profileTab === 'laporan' && (
                                loadingProfile ? <div className="flex items-center gap-2 py-8 justify-center text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSpinner} className="fa-spin" />Memuat laporan...</div>
                                    : profileReports.length === 0 ? <div className="py-10 text-center text-xs text-[var(--color-text-muted)]">Belum ada laporan tercatat</div> : (
                                        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden max-h-64 overflow-y-auto">
                                            {profileReports.map((r, i) => {
                                                const isPos = (r.points || 0) >= 0; return (
                                                    <div key={i} className={`flex items-start gap-3 px-3 py-2 border-b border-[var(--color-border)] last:border-0 ${isPos ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-red-500'}`}>
                                                        <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black ${isPos ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>{isPos ? `+${r.points}` : r.points}</span>
                                                        <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-[var(--color-text)] leading-snug truncate">{r.description || 'Laporan'}</p><p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )
                            )}
                        </div>
                    )}
                </Modal>
            )}

            {/* ════ MODAL Import ════ */}
            {isImportModalOpen && (
                <Modal isOpen={isImportModalOpen} onClose={() => { if (importing) return; setIsImportModalOpen(false); setImportPreview([]); setImportIssues([]); setImportDupes([]); setImportFileName(''); setImportTab('panduan') }} title="Import Guru" size="md">
                    {importPreview.length > 0 && (
                        <div className="flex items-center gap-2 -mt-1 mb-3 flex-wrap">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-black text-indigo-600 truncate max-w-[160px]"><FontAwesomeIcon icon={faFileLines} className="text-[8px] shrink-0" />{importFileName}</span>
                            <span className="px-2 py-0.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)]">{importPreview.length} baris</span>
                            {importIssues.filter(x => x.level === 'error').length > 0 && <span className="px-2 py-0.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black text-red-600">{importIssues.filter(x => x.level === 'error').length} error</span>}
                            {importDupes.length > 0 && <span className="px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[9px] font-black text-violet-600">{importDupes.length} duplikat</span>}
                            <button onClick={() => importFileRef.current?.click()} className="ml-auto h-6 px-2.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Ganti File</button>
                        </div>
                    )}
                    <div className="flex gap-0.5 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] mb-3">
                        {[{ key: 'panduan', label: 'Panduan', icon: faFileLines, badge: null }, { key: 'preview', label: 'Preview', icon: faTableList, badge: importPreview.length > 0 ? importPreview.length : null }, { key: 'validasi', label: 'Validasi', icon: faTriangleExclamation, badge: importIssues.length > 0 ? importIssues.length : null, badgeColor: hasImportBlockingErrors ? 'bg-red-500/15 text-red-600' : 'bg-amber-500/15 text-amber-600' }].map(tab => (
                            <button key={tab.key} onClick={() => setImportTab(tab.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${importTab === tab.key ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={tab.icon} className="text-[9px]" />{tab.label}
                                {tab.badge != null && <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black leading-none ${tab.badgeColor || 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]'}`}>{tab.badge}</span>}
                            </button>
                        ))}
                    </div>
                    {importTab === 'panduan' && (
                        <div className="space-y-2.5">
                            <div onDragOver={e => { e.preventDefault(); setImportDrag(true) }} onDragLeave={() => setImportDrag(false)} onDrop={async e => { e.preventDefault(); setImportDrag(false); const f = e.dataTransfer.files?.[0]; if (f) await processImportFile(f) }} onClick={() => importFileRef.current?.click()}
                                className={`w-full h-16 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-3 transition-all ${importDrag ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]' : 'border-[var(--color-primary)]/30 hover:border-[var(--color-primary)]/60'}`}>
                                <FontAwesomeIcon icon={faUpload} className={`text-base ${importDrag ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-primary)]/60'}`} />
                                <div className="text-left"><p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest leading-none">{importDrag ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk Pilih File'}</p><p className="text-[8px] text-[var(--color-text-muted)] font-bold mt-0.5">Mendukung .csv dan .xlsx</p></div>
                            </div>
                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Kolom yang didukung</p>
                                <div className="grid grid-cols-2 gap-1">{['Nama *', 'NBM', 'Mata Pelajaran', 'Gender (L/P)', 'No. HP/WA', 'Email', 'Status'].map(c => <span key={c} className="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)] text-[9px] font-mono text-[var(--color-text-muted)]">{c}</span>)}</div>
                            </div>
                            <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => { processImportFile(e.target.files?.[0]); if (e.target) e.target.value = '' }} />
                        </div>
                    )}
                    {importTab === 'preview' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between"><p className="text-xs font-bold">{importPreview.length} baris terdeteksi</p><label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" checked={importSkip} onChange={e => setImportSkip(e.target.checked)} className="accent-[var(--color-primary)]" />Skip duplikat ({importDupes.length})</label></div>
                            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] max-h-[38vh]">
                                <table className="w-full text-xs">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0"><tr>{['#', 'Nama', 'NBM', 'Mapel', 'Gender', 'HP/WA', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] font-black uppercase text-[var(--color-text-muted)]">{h}</th>)}</tr></thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">{importPreview.map((row, i) => (
                                        <tr key={i} className={`${importDupes.includes(i) ? 'bg-violet-500/5 border-l-2 border-l-violet-500' : row._hasError ? 'bg-red-500/5 border-l-2 border-l-red-500' : ''}`}>
                                            <td className="px-3 py-2 text-[var(--color-text-muted)]">{i + 2}</td>
                                            <td className="px-3 py-2 font-bold">{row.name || <span className="text-red-500">kosong</span>}</td>
                                            <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">{row.nbm || '—'}</td>
                                            <td className="px-3 py-2">{row.subject || '—'}</td>
                                            <td className="px-3 py-2">{row.gender || '—'}</td>
                                            <td className="px-3 py-2">{row.phone || '—'}</td>
                                            <td className="px-3 py-2">{STATUS_CONFIG[row.status]?.label || row.status}</td>
                                        </tr>
                                    ))}</tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {importTab === 'validasi' && (
                        <div className="space-y-3">
                            {importIssues.length === 0 && importPreview.length === 0 ? (<div className="py-14 flex flex-col items-center justify-center opacity-30 gap-2"><FontAwesomeIcon icon={faTriangleExclamation} className="text-2xl" /><p className="text-[9px] font-black uppercase">Belum ada file yang dipilih</p></div>)
                                : importIssues.length === 0 ? (<div className="py-12 flex flex-col items-center justify-center gap-2"><div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center"><FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-xl" /></div><p className="text-sm font-black text-emerald-600">Semua baris valid!</p><p className="text-[9px] text-[var(--color-text-muted)] font-bold">{importPreview.length} baris siap diimport</p></div>) : (
                                    <>
                                        <div className="grid grid-cols-3 gap-2">{[{ label: 'Error', count: importIssues.filter(x => x.level === 'error').length, color: 'text-red-600', bg: 'bg-red-500/8 border-red-500/20', desc: 'Blok import' }, { label: 'Duplikat', count: importIssues.filter(x => x.level === 'dupe').length, color: 'text-violet-600', bg: 'bg-violet-500/8 border-violet-500/20', desc: 'Terdeteksi double' }, { label: 'Warning', count: importIssues.filter(x => x.level === 'warn').length, color: 'text-amber-600', bg: 'bg-amber-500/8 border-amber-500/20', desc: 'Tidak blok' }].map(s => (
                                            <div key={s.label} className={`p-3 rounded-xl border ${s.bg}`}><p className={`text-xl font-black leading-none ${s.color}`}>{s.count}</p><p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${s.color}`}>{s.label}</p><p className="text-[7px] font-bold text-[var(--color-text-muted)] mt-0.5">{s.desc}</p></div>
                                        ))}</div>
                                        <div className="rounded-xl border border-[var(--color-border)] overflow-hidden max-h-[38vh] overflow-auto">{importIssues.map((issue, idx) => {
                                            const ls = issue.level === 'error' ? { pill: 'bg-red-500/15 text-red-600', row: 'border-l-2 border-l-red-500 bg-red-500/3' } : issue.level === 'dupe' ? { pill: 'bg-violet-500/15 text-violet-600', row: 'border-l-2 border-l-violet-500 bg-violet-500/3' } : { pill: 'bg-amber-500/15 text-amber-600', row: 'border-l-2 border-l-amber-400 bg-amber-500/3' }; return (
                                                <div key={idx} className={`flex items-start gap-3 px-3 py-2 border-b border-[var(--color-border)] last:border-0 ${ls.row}`}>
                                                    <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black ${ls.pill}`}>{issue.level === 'dupe' ? 'DUPLIKAT' : issue.level.toUpperCase()}</span>
                                                    <div className="flex-1 min-w-0"><p className="text-[9px] font-black text-[var(--color-text-muted)] mb-0.5">Baris {issue.row}</p>{issue.messages.map((msg, mi) => <p key={mi} className="text-[10px] font-bold text-[var(--color-text)] leading-snug">{msg}</p>)}</div>
                                                </div>
                                            )
                                        })}</div>
                                    </>
                                )}
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-3 pt-3 mt-2 border-t border-[var(--color-border)]">
                        <button onClick={() => { setIsImportModalOpen(false); setImportPreview([]); setImportIssues([]); setImportDupes([]); setImportFileName(''); setImportTab('panduan') }} disabled={importing} className="h-9 px-5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--color-border)] transition-all">Tutup</button>
                        <div className="flex items-center gap-3">
                            {importing && <span className="text-[9px] font-bold text-[var(--color-text-muted)] flex items-center gap-1.5"><FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)]" />{importProgress.done}/{importProgress.total}...</span>}
                            {!importing && importPreview.length > 0 && <span className="text-[9px] font-bold text-[var(--color-text-muted)]">{importPreview.length - importIssues.filter(x => x.level === 'error').length - (importSkip ? importDupes.length : 0)} baris akan diimport</span>}
                            <button onClick={handleCommitImport} disabled={importing || hasImportBlockingErrors || importPreview.length === 0} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2">
                                {importing ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" />Mengimport...</> : <><FontAwesomeIcon icon={faUpload} />Import ke Database</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ════ MODAL Export ════ */}
            {isExportModalOpen && (
                <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Data Guru" size="md">
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">1 — Pilih Cakupan Data</p>
                            <div className="grid grid-cols-2 gap-2">{[{ k: 'filtered', label: 'Filter Aktif', desc: 'Sesuai filter saat ini' }, { k: 'all', label: 'Semua Guru', desc: 'Seluruh data guru aktif' }].map(({ k, label, desc }) => (
                                <button key={k} onClick={() => setExportScope(k)} className={`p-3 rounded-xl border text-left transition-all ${exportScope === k ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}>
                                    <p className="text-[10px] font-black uppercase tracking-wide">{label}</p>
                                    <p className={`text-[9px] mt-0.5 ${exportScope === k ? 'opacity-80' : 'text-[var(--color-text-muted)]'}`}>{desc}</p>
                                </button>
                            ))}</div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">2 — Pilih Kolom</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{[{ k: 'nama', l: 'Nama' }, { k: 'nbm', l: 'NBM' }, { k: 'subject', l: 'Mata Pelajaran' }, { k: 'gender', l: 'Gender' }, { k: 'phone', l: 'No. HP/WA' }, { k: 'email', l: 'Email' }, { k: 'status', l: 'Status' }, { k: 'join_date', l: 'Tgl Bergabung' }, { k: 'address', l: 'Alamat' }].map(({ k, l }) => (
                                <button key={k} onClick={() => setExportColumns(prev => ({ ...prev, [k]: !prev[k] }))} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs font-bold ${exportColumns[k] ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}`}>
                                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-all ${exportColumns[k] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>{exportColumns[k] && <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}</div>{l}
                                </button>
                            ))}</div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">3 — Pilih Format Export</p>
                            <div className="grid grid-cols-2 gap-2">{[
                                { label: 'CSV', icon: faFileLines, desc: 'Universal', onClick: handleExportCSV, color: 'bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]', iconColor: 'text-[var(--color-text-muted)]' },
                                { label: 'Excel', icon: faTableList, desc: '.xlsx', onClick: handleExportExcel, color: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20', iconColor: 'text-emerald-500' },
                            ].map(({ label, icon, desc, onClick, color, iconColor }) => (
                                <button key={label} onClick={onClick} disabled={exporting || Object.values(exportColumns).every(v => !v)} className={`${color} h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 font-black`}>
                                    <FontAwesomeIcon icon={icon} className={`text-lg ${iconColor}`} /><span className="text-[10px] uppercase tracking-widest">{label}</span><span className="text-[9px] font-bold opacity-60">{desc}</span>
                                </button>
                            ))}</div>
                        </div>
                        {Object.values(exportColumns).every(v => !v) && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-bold">
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                                Pilih minimal satu kolom untuk export
                            </div>
                        )}
                        {exporting && <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-bold"><FontAwesomeIcon icon={faSpinner} className="fa-spin" />Menyiapkan file export...</div>}
                    </div>
                </Modal>
            )}

            {/* ════ MODAL Arsipkan ════ */}
            <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Arsipkan Guru" size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-amber-500/10 rounded-[1.5rem] flex items-center gap-4 text-amber-600 border border-amber-500/20">
                        <div className="w-12 h-12 rounded-[1rem] bg-amber-500/20 flex items-center justify-center shrink-0 text-xl border border-amber-500/30"><FontAwesomeIcon icon={faBoxArchive} /></div>
                        <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider">Arsipkan Guru?</h3><p className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-widest">Data dapat dipulihkan kapan saja.</p></div>
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Guru <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{teacherToAction?.name}</span> akan dipindahkan ke arsip.</p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsArchiveModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">BATAL</button>
                        <button onClick={handleArchive} disabled={submitting} className="btn bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02] disabled:opacity-50">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'ARSIPKAN'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Hapus ════ */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Permanen" size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-[1.5rem] flex items-center gap-4 text-red-500 border border-red-500/20">
                        <div className="w-12 h-12 rounded-[1rem] bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30"><FontAwesomeIcon icon={faTrash} /></div>
                        <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider">Hapus Guru?</h3><p className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-widest">Tindakan tidak dapat dibatalkan.</p></div>
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Hapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{teacherToAction?.name}</span> secara permanen dari sistem?</p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">BATAL</button>
                        <button onClick={handleDeleteConfirm} disabled={submitting} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02] disabled:opacity-50">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Bulk Arsip ════ */}
            <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title={`Arsip Massal — ${selectedIds.length} Guru`} size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-amber-500/10 rounded-[1.5rem] flex items-center gap-4 text-amber-600 border border-amber-500/20">
                        <div className="w-12 h-12 rounded-[1rem] bg-amber-500/20 flex items-center justify-center shrink-0 text-xl border border-amber-500/30"><FontAwesomeIcon icon={faBoxArchive} /></div>
                        <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider">Arsip {selectedIds.length} Guru?</h3><p className="text-[10px] font-bold opacity-80 mt-1 uppercase tracking-widest">Data dapat dipulihkan kapan saja.</p></div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsBulkModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">BATAL</button>
                        <button onClick={handleBulkArchive} disabled={submitting} className="btn bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02] disabled:opacity-50">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'ARSIPKAN SEMUA'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Bulk Hapus ════ */}
            <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title={`Hapus Massal — ${selectedIds.length} Guru`} size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-[1.5rem] flex items-center gap-4 text-red-500 border border-red-500/20">
                        <div className="w-12 h-12 rounded-[1rem] bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30"><FontAwesomeIcon icon={faTrash} /></div>
                        <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider leading-tight">Hapus {selectedIds.length} Guru?</h3><p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Tindakan ini tidak dapat dibatalkan.</p></div>
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Tindakan ini akan menghapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedIds.length} guru</span> secara permanen dari sistem.</p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsBulkDeleteOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">BATAL</button>
                        <button onClick={handleBulkDelete} disabled={submitting} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL WA Massal ════ */}
            <Modal isOpen={isBulkWAOpen} onClose={() => setIsBulkWAOpen(false)} title="WA Massal Guru" size="sm">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Pesan</p>
                        {[{ id: 'info', label: 'Info Akun Sistem' }, { id: 'notif', label: 'Notifikasi Baru' }].map(t => (
                            <button key={t.id} onClick={() => setWaTemplate(t.id)} className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all ${waTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}>{t.label}</button>
                        ))}
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] font-medium">
                        {bulkWATeachers.length} guru dengan WA · {Object.values(bulkWAResults).filter(v => v === 'sent').length} sudah dikirim
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-2">
                        {bulkWATeachers.map((t, i) => (
                            <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${i === bulkWAIndex ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : bulkWAResults[t.id] === 'sent' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)]'}`}>
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black shrink-0">{t.name.charAt(0)}</div>
                                <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{t.name}</p><p className="text-[10px] text-[var(--color-text-muted)]">{t.phone}</p></div>
                                {bulkWAResults[t.id] === 'sent' && <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 shrink-0" />}
                                {i === bulkWAIndex && <span className="text-[9px] font-black text-[var(--color-primary)] uppercase">Berikutnya</span>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsBulkWAOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Selesai</button>
                        {bulkWAIndex >= 0 && bulkWAIndex < bulkWATeachers.length && (
                            <button onClick={sendNextWA} className="flex-1 h-11 rounded-xl bg-green-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                                <FontAwesomeIcon icon={faWhatsapp} />Kirim ke {bulkWATeachers[bulkWAIndex]?.name.split(' ')[0]}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Arsip List ════ */}
            <Modal isOpen={isArchivedOpen} onClose={() => setIsArchivedOpen(false)} title="Arsip Guru" size="lg">
                <div className="space-y-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                        <FontAwesomeIcon icon={faBoxArchive} className="text-amber-600 text-lg shrink-0" />
                        <div><p className="text-xs font-black text-amber-700">{archivedTeachers.length} guru di arsip</p><p className="text-[10px] text-[var(--color-text-muted)]">Pulihkan untuk mengembalikan ke daftar aktif.</p></div>
                    </div>
                    {loadingArchived ? (
                        <div className="flex items-center justify-center py-12 gap-3 text-[var(--color-text-muted)]"><FontAwesomeIcon icon={faSpinner} className="fa-spin text-xl" /><span className="text-sm font-bold">Memuat arsip...</span></div>
                    ) : archivedTeachers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-[var(--color-text-muted)]"><FontAwesomeIcon icon={faBoxArchive} className="text-3xl opacity-20" /><p className="text-sm font-bold">Belum ada yang diarsipkan</p></div>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {archivedTeachers.map(t => (
                                <div key={t.id} className="flex items-center gap-3 py-3">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] text-sm font-black shrink-0">{t.name.charAt(0)}</div>
                                    <div className="flex-1 min-w-0"><p className="text-sm font-bold truncate">{t.name}</p><p className="text-[10px] text-[var(--color-text-muted)]">{t.subject || '—'} · {new Date(t.deleted_at).toLocaleDateString('id-ID')}</p></div>
                                    <button onClick={() => handleRestore(t)} className="shrink-0 h-8 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faRotateLeft} />Pulihkan</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

        </DashboardLayout>
    )
}