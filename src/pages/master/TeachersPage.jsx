import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faTimes, faSpinner,
    faBoxArchive, faRotateLeft, faVenus, faMars, faCheckCircle,
    faDownload, faXmark, faUserTie, faTriangleExclamation,
    faChalkboardTeacher, faEye, faEyeSlash, faThumbtack,
    faUpload, faTableList, faKeyboard, faPhone,
    faEnvelope, faCalendar, faMapMarkerAlt, faNoteSticky,
    faChartBar, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    active: { label: 'Aktif', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20', dot: 'bg-emerald-500' },
    inactive: { label: 'Nonaktif', color: 'bg-red-500/10 text-red-600 border-red-500/20', dot: 'bg-red-500' },
    cuti: { label: 'Cuti', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', dot: 'bg-amber-500' },
}
const EMPTY_FORM = { name: '', nbm: '', subject: '', gender: 'L', phone: '', email: '', status: 'active', join_date: '', address: '', notes: '', class_id: '' }
const LS_FILTERS = 'teachers_filters'
const LS_COLS = 'teachers_columns'

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
    <div className="glass rounded-2xl p-4 border border-[var(--color-border)] flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 ${color}`}>
            <FontAwesomeIcon icon={icon} />
        </div>
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{label}</p>
            <p className="text-xl font-black text-[var(--color-text)] leading-tight">{value}</p>
        </div>
    </div>
)

const maskInfo = (str, vis = 4) => {
    if (!str) return '—'
    if (str.length <= vis) return str[0] + '*'.repeat(str.length - 1)
    return str.substring(0, vis) + '***'
}

export default function TeachersPage() {

    // ── Core data ──────────────────────────────────────────────────────────────
    const [teachers, setTeachers] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)
    const [subjectsList, setSubjectsList] = useState([])
    const [classesList, setClassesList] = useState([])
    const [stats, setStats] = useState({ total: 0, active: 0, male: 0, female: 0 })
    const [realtimeOk, setRealtimeOk] = useState(false)

    // ── Filters ────────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterSubject, setFilterSubject] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [filterStatus, setFilterStatus] = useState('active')
    const [filterMissing, setFilterMissing] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    const [page, setPage] = useState(1)
    const pageSize = 25

    // ── Column visibility ──────────────────────────────────────────────────────
    const [visibleCols, setVisibleCols] = useState({ nbm: true, subject: true, gender: true, contact: true, status: true, join: true })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const colMenuRef = useRef(null)

    // ── UI toggles ─────────────────────────────────────────────────────────────
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)

    // ── Modals ─────────────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isBulkWAOpen, setIsBulkWAOpen] = useState(false)

    // ── Form ───────────────────────────────────────────────────────────────────
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState(EMPTY_FORM)
    const [formError, setFormError] = useState('')
    const [teacherToAction, setTeacherToAction] = useState(null)

    // ── Profile ────────────────────────────────────────────────────────────────
    const [profileTeacher, setProfileTeacher] = useState(null)
    const [profileStats, setProfileStats] = useState(null)
    const [loadingProfile, setLoadingProfile] = useState(false)

    // ── Archived ───────────────────────────────────────────────────────────────
    const [archivedTeachers, setArchivedTeachers] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)

    // ── Bulk ───────────────────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState([])
    const [bulkWAIndex, setBulkWAIndex] = useState(-1)
    const [bulkWAResults, setBulkWAResults] = useState({})

    // ── Quick Status ───────────────────────────────────────────────────────────
    const [quickStatusId, setQuickStatusId] = useState(null)

    // ── Import ─────────────────────────────────────────────────────────────────
    const [importTab, setImportTab] = useState('panduan')
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importDupes, setImportDupes] = useState([])
    const [importSkip, setImportSkip] = useState(true)
    const [importDrag, setImportDrag] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })

    // ── Refs ───────────────────────────────────────────────────────────────────
    const exportMenuRef = useRef(null)
    const searchInputRef = useRef(null)
    const importFileRef = useRef(null)
    const { addToast } = useToast()

    // ══════════════════════════════════════════════════════════════════════════
    // PERSIST FILTERS & COLUMNS
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        try {
            const f = JSON.parse(localStorage.getItem(LS_FILTERS) || '{}')
            if (f.filterGender) setFilterGender(f.filterGender)
            if (f.filterStatus !== undefined) setFilterStatus(f.filterStatus)
            if (f.filterSubject) setFilterSubject(f.filterSubject)
            if (f.sortBy) setSortBy(f.sortBy)
        } catch { /* ignore */ }
        try {
            const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}')
            if (Object.keys(c).length) setVisibleCols(c)
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        try { localStorage.setItem(LS_FILTERS, JSON.stringify({ filterGender, filterStatus, filterSubject, sortBy })) }
        catch { /* ignore */ }
    }, [filterGender, filterStatus, filterSubject, sortBy])

    useEffect(() => {
        try { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) }
        catch { /* ignore */ }
    }, [visibleCols])

    // ══════════════════════════════════════════════════════════════════════════
    // DEBOUNCE
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    // ══════════════════════════════════════════════════════════════════════════
    // OUTSIDE CLICK
    // ══════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        const h = e => { if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) setShowExportMenu(false) }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
    }, [])
    useEffect(() => {
        const h = e => { if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false) }
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
    }, [])
    useEffect(() => {
        if (!quickStatusId) return
        const h = () => setQuickStatusId(null)
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
    }, [quickStatusId])

    // ══════════════════════════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ══════════════════════════════════════════════════════════════════════════
    const hasActiveFilters = !!(searchQuery || filterSubject || filterGender || filterMissing || filterStatus !== 'active')
    const clearFilters = () => { setSearchQuery(''); setFilterSubject(''); setFilterGender(''); setFilterMissing(''); setFilterStatus('active'); setPage(1) }

    useEffect(() => {
        const handler = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            const ctrl = e.ctrlKey || e.metaKey
            const anyModal = isModalOpen || isDeleteModalOpen || isArchiveModalOpen || isArchivedOpen ||
                isProfileOpen || isImportModalOpen || isBulkModalOpen || isBulkDeleteOpen || isBulkWAOpen || isShortcutOpen

            if (e.key === 'Escape') {
                if (isShortcutOpen) { setIsShortcutOpen(false); return }
                if (anyModal) return
                if (searchQuery) { setSearchQuery(''); return }
                if (selectedIds.length) { setSelectedIds([]); return }
                if (hasActiveFilters) { clearFilters(); return }
            }
            if (ctrl && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); searchInputRef.current?.select(); return }
            if (ctrl && e.key === 'n' && !isTyping) { e.preventDefault(); handleAdd(); return }
            if (ctrl && e.key === 'p' && !isTyping) { e.preventDefault(); setIsPrivacyMode(v => !v); return }
            if (e.key === '?' && !isTyping) { setIsShortcutOpen(v => !v); return }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isModalOpen, isDeleteModalOpen, isArchiveModalOpen, isArchivedOpen, isProfileOpen,
        isImportModalOpen, isBulkModalOpen, isBulkDeleteOpen, isBulkWAOpen, isShortcutOpen,
        searchQuery, selectedIds, hasActiveFilters])

    // ══════════════════════════════════════════════════════════════════════════
    // FETCH
    // ══════════════════════════════════════════════════════════════════════════
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            const sortMap = {
                name_asc: { col: 'name', asc: true },
                name_desc: { col: 'name', asc: false },
                subject_asc: { col: 'subject', asc: true },
                join_asc: { col: 'join_date', asc: true },
                join_desc: { col: 'join_date', asc: false },
            }
            const { col, asc } = sortMap[sortBy] || sortMap.name_asc

            let q = supabase.from('teachers').select('*', { count: 'exact' })
                .is('deleted_at', null).order(col, { ascending: asc }).range(from, to)

            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterSubject) q = q.eq('subject', filterSubject)
            if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,nbm.ilike.%${s}%,email.ilike.%${s}%,subject.ilike.%${s}%`)
            }

            const { data, error, count } = await q
            if (error) throw error

            // Pinned first
            const sorted = [...(data || [])].sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            setTeachers(sorted)
            setTotalRows(count ?? 0)

            const { data: allSubj } = await supabase.from('teachers').select('subject').is('deleted_at', null).not('subject', 'is', null)
            if (allSubj) setSubjectsList([...new Set(allSubj.map(r => r.subject).filter(Boolean))].sort())

            const { data: cls } = await supabase.from('classes').select('id, name').order('name')
            if (cls) setClassesList(cls)

        } catch (err) {
            console.error('fetchData:', err)
            addToast('Gagal memuat data guru', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, sortBy, filterStatus, filterGender, filterSubject, filterMissing, debouncedSearch, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('teachers').select('id, gender, status').is('deleted_at', null)
            if (!data) return
            setStats({ total: data.length, active: data.filter(t => t.status === 'active').length, male: data.filter(t => t.gender === 'L').length, female: data.filter(t => t.gender === 'P').length })
        } catch (err) { console.error('fetchStats:', err) }
    }, [])

    // ── Realtime ───────────────────────────────────────────────────────────────
    const fetchDataRef = useRef(fetchData)
    const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])

    useEffect(() => {
        const ch = supabase.channel('teachers-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers' }, () => {
                fetchDataRef.current(); fetchStatsRef.current()
            })
            .subscribe(s => setRealtimeOk(s === 'SUBSCRIBED'))
        return () => supabase.removeChannel(ch)
    }, [])

    useEffect(() => { fetchStats() }, [])
    useEffect(() => { fetchData() }, [page, sortBy, filterStatus, filterGender, filterSubject, filterMissing, debouncedSearch])

    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    // ══════════════════════════════════════════════════════════════════════════
    // CRUD
    // ══════════════════════════════════════════════════════════════════════════
    const handleAdd = () => { setSelectedItem(null); setFormData(EMPTY_FORM); setFormError(''); setIsModalOpen(true) }
    const handleEdit = item => {
        setSelectedItem(item); setFormError('')
        setFormData({
            name: item.name || '', nbm: item.nbm || '', subject: item.subject || '', gender: item.gender || 'L',
            phone: item.phone || '', email: item.email || '', status: item.status || 'active',
            join_date: item.join_date || '', address: item.address || '', notes: item.notes || '', class_id: item.class_id || ''
        })
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        const name = (formData.name || '').trim()
        if (!name) { setFormError('Nama lengkap wajib diisi.'); return }
        setFormError(''); setSubmitting(true)
        try {
            const payload = {
                name, nbm: (formData.nbm || '').trim() || null, subject: (formData.subject || '').trim() || null,
                gender: formData.gender || null, phone: (formData.phone || '').trim() || null,
                email: (formData.email || '').trim() || null, status: formData.status || 'active',
                join_date: formData.join_date || null, address: (formData.address || '').trim() || null,
                notes: (formData.notes || '').trim() || null, class_id: formData.class_id || null,
            }
            if (selectedItem) {
                const { error } = await supabase.from('teachers').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast('Data guru berhasil diupdate', 'success')
            } else {
                const { error } = await supabase.from('teachers').insert([payload])
                if (error) throw error
                addToast('Guru baru berhasil ditambahkan', 'success')
            }
            setIsModalOpen(false); fetchData(); fetchStats()
        } catch (err) {
            if (err.code === '23505') setFormError('NBM sudah terdaftar untuk guru lain.')
            else setFormError('Gagal menyimpan data. Coba lagi.')
        } finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!teacherToAction) return; setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers').delete().eq('id', teacherToAction.id)
            if (error) throw error
            addToast(`"${teacherToAction.name}" berhasil dihapus`, 'success')
            setIsDeleteModalOpen(false); setTeacherToAction(null); fetchData(); fetchStats()
        } catch { addToast('Gagal menghapus', 'error') } finally { setSubmitting(false) }
    }

    const handleArchive = async () => {
        if (!teacherToAction) return; setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).eq('id', teacherToAction.id)
            if (error) throw error
            addToast(`"${teacherToAction.name}" diarsipkan`, 'success')
            setIsArchiveModalOpen(false); setTeacherToAction(null); fetchData(); fetchStats()
        } catch { addToast('Gagal mengarsipkan', 'error') } finally { setSubmitting(false) }
    }

    const handleRestore = async teacher => {
        try {
            const { error } = await supabase.from('teachers').update({ deleted_at: null }).eq('id', teacher.id)
            if (error) throw error
            addToast(`"${teacher.name}" dipulihkan`, 'success')
            setArchivedTeachers(prev => prev.filter(t => t.id !== teacher.id)); fetchData(); fetchStats()
        } catch { addToast('Gagal memulihkan', 'error') }
    }

    const fetchArchived = async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase.from('teachers').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false })
            if (error) throw error; setArchivedTeachers(data || [])
        } catch { addToast('Gagal memuat arsip', 'error') } finally { setLoadingArchived(false) }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PIN
    // ══════════════════════════════════════════════════════════════════════════
    const handleTogglePin = async teacher => {
        try {
            const { error } = await supabase.from('teachers').update({ is_pinned: !teacher.is_pinned }).eq('id', teacher.id)
            if (error) throw error
            addToast(teacher.is_pinned ? 'Sematkan dilepas' : `"${teacher.name}" disematkan`, 'success'); fetchData()
        } catch { addToast('Gagal menyematkan', 'error') }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // QUICK STATUS
    // ══════════════════════════════════════════════════════════════════════════
    const handleQuickStatus = async (teacher, newStatus) => {
        try {
            const { error } = await supabase.from('teachers').update({ status: newStatus }).eq('id', teacher.id)
            if (error) throw error
            addToast(`Status ${teacher.name} → ${STATUS_CONFIG[newStatus].label}`, 'success')
            setQuickStatusId(null); fetchData(); fetchStats()
        } catch { addToast('Gagal update status', 'error') }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PROFILE
    // ══════════════════════════════════════════════════════════════════════════
    const openProfile = async teacher => {
        setProfileTeacher(teacher); setProfileStats(null); setLoadingProfile(true); setIsProfileOpen(true)
        try {
            const { data: reports } = await supabase.from('reports')
                .select('id, created_at, points').eq('teacher_name', teacher.name).order('created_at', { ascending: false })
            if (reports) {
                const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0)
                setProfileStats({
                    total: reports.length,
                    monthly: reports.filter(r => new Date(r.created_at) >= thisMonth).length,
                    totalPts: reports.reduce((a, r) => a + (r.points || 0), 0),
                    posCount: reports.filter(r => (r.points || 0) > 0).length,
                    negCount: reports.filter(r => (r.points || 0) < 0).length,
                })
            }
        } catch (err) { console.error('profileStats:', err) } finally { setLoadingProfile(false) }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // BULK
    // ══════════════════════════════════════════════════════════════════════════
    const allPageIds = teachers.map(t => t.id)
    const allSelected = allPageIds.length > 0 && allPageIds.every(id => selectedIds.includes(id))
    const someSelected = selectedIds.length > 0 && !allSelected

    const toggleSelectAll = () => {
        if (allSelected) setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id)))
        else setSelectedIds(prev => [...new Set([...prev, ...allPageIds])])
    }
    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

    const handleBulkArchive = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers').update({ deleted_at: new Date().toISOString() }).in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} guru diarsipkan`, 'success')
            setSelectedIds([]); setIsBulkModalOpen(false); fetchData(); fetchStats()
        } catch { addToast('Gagal arsip massal', 'error') } finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers').delete().in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} guru dihapus`, 'success')
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData(); fetchStats()
        } catch { addToast('Gagal hapus massal', 'error') } finally { setSubmitting(false) }
    }

    const bulkWATeachers = useMemo(() => teachers.filter(t => selectedIds.includes(t.id) && t.phone), [teachers, selectedIds])
    const startBulkWA = () => {
        if (!bulkWATeachers.length) { addToast('Tidak ada guru terpilih dengan nomor WA', 'warning'); return }
        setBulkWAIndex(0); setBulkWAResults({}); setIsBulkWAOpen(true)
    }
    const sendNextWA = () => {
        const t = bulkWATeachers[bulkWAIndex]; if (!t) return
        window.open(`https://wa.me/${t.phone.replace(/^0/, '62')}?text=${encodeURIComponent(`Assalamu'alaikum, *${t.name}*.\nBerikut informasi akun Anda di sistem Laporanmu.`)}`, '_blank')
        setBulkWAResults(prev => ({ ...prev, [t.id]: 'sent' }))
        setBulkWAIndex(bulkWAIndex + 1 < bulkWATeachers.length ? bulkWAIndex + 1 : -1)
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IMPORT
    // ══════════════════════════════════════════════════════════════════════════
    const parseImportFile = file => {
        if (!file) return; setImportFileName(file.name)
        const ext = file.name.split('.').pop().toLowerCase()
        if (ext === 'csv') {
            Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => processImportRows(r.data) })
        } else if (['xlsx', 'xls'].includes(ext)) {
            const reader = new FileReader()
            reader.onload = e => { const wb = XLSX.read(e.target.result, { type: 'array' }); processImportRows(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' })) }
            reader.readAsArrayBuffer(file)
        } else { addToast('Format tidak didukung. Gunakan CSV atau Excel.', 'error') }
    }

    const processImportRows = rows => {
        const issues = []; const dupes = []
        const preview = rows.map((row, i) => {
            const name = (row['Nama'] || row['name'] || '').toString().trim()
            const nbm = (row['NBM'] || row['nbm'] || '').toString().trim()
            const subject = (row['Mata Pelajaran'] || row['subject'] || '').toString().trim()
            const gender = (row['Gender'] || row['gender'] || '').toString().trim().toUpperCase()
            const phone = (row['No. HP/WA'] || row['phone'] || '').toString().trim()
            const email = (row['Email'] || row['email'] || '').toString().trim()
            const status = (row['Status'] || row['status'] || 'active').toString().toLowerCase()
            if (!name) issues.push(`Baris ${i + 2}: Nama kosong`)
            const genderNorm = ['L', 'LAKI-LAKI'].includes(gender) ? 'L' : ['P', 'PEREMPUAN'].includes(gender) ? 'P' : ''
            const statusNorm = ['active', 'inactive', 'cuti'].includes(status) ? status : 'active'
            return { _row: i, name, nbm, subject, gender: genderNorm, phone, email, status: statusNorm }
        })
        preview.forEach((row, i) => { if (row.nbm && preview.slice(0, i).some(p => p.nbm === row.nbm)) dupes.push(i) })
        setImportPreview(preview); setImportIssues(issues); setImportDupes(dupes)
        setImportTab(issues.length ? 'validasi' : 'preview')
    }

    const commitImport = async () => {
        const rows = importSkip ? importPreview.filter((_, i) => !importDupes.includes(i)) : importPreview
        const valid = rows.filter(r => r.name)
        if (!valid.length) { addToast('Tidak ada data valid', 'warning'); return }
        setImporting(true); setImportProgress({ done: 0, total: valid.length })
        let done = 0
        for (const r of valid) {
            await supabase.from('teachers').insert([{ name: r.name, nbm: r.nbm || null, subject: r.subject || null, gender: r.gender || null, phone: r.phone || null, email: r.email || null, status: r.status }])
            done++; setImportProgress({ done, total: valid.length })
        }
        setImporting(false); addToast(`${done} guru berhasil diimport`, 'success')
        setIsImportModalOpen(false); setImportPreview([]); setImportFileName(''); fetchData(); fetchStats()
    }

    // ══════════════════════════════════════════════════════════════════════════
    // EXPORT
    // ══════════════════════════════════════════════════════════════════════════
    const exportData = async format => {
        setShowExportMenu(false)
        try {
            const { data, error } = await supabase.from('teachers').select('name,nbm,subject,gender,phone,email,status,join_date,address').is('deleted_at', null).order('name')
            if (error) throw error
            const rows = (data || []).map(t => ({ 'Nama': t.name, 'NBM': t.nbm || '-', 'Mata Pelajaran': t.subject || '-', 'Gender': t.gender === 'L' ? 'Laki-laki' : t.gender === 'P' ? 'Perempuan' : '-', 'No. HP/WA': t.phone || '-', 'Email': t.email || '-', 'Status': STATUS_CONFIG[t.status]?.label || t.status, 'Tgl Bergabung': t.join_date || '-', 'Alamat': t.address || '-' }))
            if (format === 'csv') {
                const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([Papa.unparse(rows)], { type: 'text/csv;charset=utf-8;' })); a.download = 'data-guru.csv'; a.click()
            } else {
                const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Guru'); XLSX.writeFile(wb, 'data-guru.xlsx')
            }
            addToast(`Export ${format.toUpperCase()} berhasil`, 'success')
        } catch { addToast('Gagal export', 'error') }
    }

    const disp = val => isPrivacyMode ? maskInfo(val) : (val || '—')

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout title="Data Guru">

            {/* Privacy Banner */}
            {isPrivacyMode && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor</div>
                    <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline">Matikan</button>
                </div>
            )}

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm font-black text-[var(--color-primary)]">{selectedIds.length} guru dipilih</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={startBulkWA} className="h-8 px-3 rounded-xl bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-wide hover:bg-green-500 hover:text-white transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faWhatsapp} /> WA Massal
                        </button>
                        <button onClick={() => setIsBulkModalOpen(true)} className="h-8 px-3 rounded-xl bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-wide hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faBoxArchive} /> Arsip
                        </button>
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-3 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faTrash} /> Hapus
                        </button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faXmark} /> Batal
                        </button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Data Guru</h1>
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${realtimeOk ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)]'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${realtimeOk ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                            {realtimeOk ? 'Live' : 'Offline'}
                        </div>
                    </div>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola data guru dan staff pengajar · {totalRows} guru terdaftar</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setIsPrivacyMode(v => !v)} title="Privacy Mode (Ctrl+P)"
                        className={`h-11 w-11 rounded-full border flex items-center justify-center text-sm transition-all ${isPrivacyMode ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                        <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} />
                    </button>
                    <button onClick={() => setIsShortcutOpen(true)} title="Keyboard Shortcuts (?)"
                        className="h-11 w-11 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all text-sm flex items-center justify-center">
                        <FontAwesomeIcon icon={faKeyboard} />
                    </button>
                    <button onClick={() => { setImportTab('panduan'); setImportPreview([]); setImportFileName(''); setIsImportModalOpen(true) }}
                        className="h-11 px-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all text-xs font-bold flex items-center gap-2">
                        <FontAwesomeIcon icon={faUpload} /><span className="hidden sm:inline uppercase tracking-widest">Import</span>
                    </button>
                    <div className="relative" ref={exportMenuRef}>
                        <button onClick={() => setShowExportMenu(v => !v)}
                            className="h-11 px-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all text-xs font-bold flex items-center gap-2">
                            <FontAwesomeIcon icon={faDownload} /><span className="hidden sm:inline uppercase tracking-widest">Export</span>
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-12 z-50 w-40 glass rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden">
                                <button onClick={() => exportData('csv')} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--color-surface-alt)]">Export CSV</button>
                                <button onClick={() => exportData('xlsx')} className="w-full px-4 py-3 text-left text-xs font-bold hover:bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">Export Excel</button>
                            </div>
                        )}
                    </div>
                    <button onClick={() => { setIsArchivedOpen(true); fetchArchived() }}
                        className="h-11 px-4 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all text-xs font-bold flex items-center gap-2">
                        <FontAwesomeIcon icon={faBoxArchive} /><span className="hidden sm:inline uppercase tracking-widest">Arsip</span>
                    </button>
                    <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                        <FontAwesomeIcon icon={faPlus} /><span className="ml-2 uppercase tracking-widest">Tambah Guru</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard icon={faChalkboardTeacher} label="Total Guru" value={stats.total} color="bg-[var(--color-primary)]/10 text-[var(--color-primary)]" />
                <StatCard icon={faCheckCircle} label="Aktif" value={stats.active} color="bg-emerald-500/10 text-emerald-600" />
                <StatCard icon={faMars} label="Laki-laki" value={stats.male} color="bg-blue-500/10 text-blue-600" />
                <StatCard icon={faVenus} label="Perempuan" value={stats.female} color="bg-pink-500/10 text-pink-600" />
            </div>

            {/* Filter Bar */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="flex flex-col md:flex-row gap-3 flex-wrap">
                    <div className="flex-1 relative group min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                            <FontAwesomeIcon icon={faSearch} className="text-sm" />
                        </div>
                        <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, NBM, mapel, email… (Ctrl+K)" className="input-field w-full h-11 pl-10 pr-10 text-sm" />
                        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faTimes} className="text-xs" /></button>}
                    </div>
                    <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1) }} className="input-field h-11 text-sm font-medium min-w-[150px]">
                        <option value="">Semua Mapel</option>
                        {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1) }} className="input-field h-11 text-sm font-medium min-w-[130px]">
                        <option value="">Semua Gender</option>
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                    </select>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className="input-field h-11 text-sm font-medium min-w-[130px]">
                        <option value="">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                        <option value="cuti">Cuti</option>
                    </select>
                    <button onClick={() => { setFilterMissing(filterMissing === 'wa' ? '' : 'wa'); setPage(1) }}
                        className={`h-11 px-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 whitespace-nowrap ${filterMissing === 'wa' ? 'bg-orange-500 text-white border-orange-500' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-orange-400 hover:text-orange-500'}`}>
                        <FontAwesomeIcon icon={faPhone} /> Tanpa WA
                    </button>
                    <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }} className="input-field h-11 text-sm font-medium min-w-[160px]">
                        <option value="name_asc">Nama A–Z</option>
                        <option value="name_desc">Nama Z–A</option>
                        <option value="subject_asc">Mapel A–Z</option>
                        <option value="join_desc">Bergabung Terbaru</option>
                        <option value="join_asc">Bergabung Terlama</option>
                    </select>
                    {/* Column Toggle */}
                    <div className="relative" ref={colMenuRef}>
                        <button onClick={() => setIsColMenuOpen(v => !v)} className="h-11 px-4 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-xs font-bold flex items-center gap-2 transition-all">
                            <FontAwesomeIcon icon={faTableList} /><span className="hidden sm:inline">Kolom</span>
                        </button>
                        {isColMenuOpen && (
                            <div className="absolute right-0 top-12 z-50 w-48 glass rounded-2xl border border-[var(--color-border)] shadow-xl p-3 space-y-1">
                                {[['nbm', 'NBM'], ['subject', 'Mata Pelajaran'], ['gender', 'Gender'], ['contact', 'Kontak'], ['status', 'Status'], ['join', 'Bergabung']].map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-alt)] cursor-pointer text-xs font-bold">
                                        <input type="checkbox" checked={visibleCols[key]} onChange={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="accent-[var(--color-primary)]" />{label}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    {hasActiveFilters && (
                        <button onClick={clearFilters} className="h-11 px-4 rounded-xl text-xs font-bold text-red-500 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-2 whitespace-nowrap">
                            <FontAwesomeIcon icon={faXmark} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 gap-3 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-xl" /><span className="text-sm font-bold">Memuat data...</span>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faUserTie} className="text-4xl opacity-20" />
                        <p className="text-sm font-bold">Tidak ada data guru</p>
                        {hasActiveFilters && <button onClick={clearFilters} className="text-xs text-[var(--color-primary)] font-bold hover:underline">Reset filter</button>}
                    </div>
                ) : (
                    <>
                        {/* Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                        <th className="px-4 py-3 w-10">
                                            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="accent-[var(--color-primary)] w-4 h-4 cursor-pointer" />
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama</th>
                                        {visibleCols.nbm && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">NBM</th>}
                                        {visibleCols.subject && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Mata Pelajaran</th>}
                                        {visibleCols.contact && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kontak</th>}
                                        {visibleCols.status && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Status</th>}
                                        {visibleCols.join && <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bergabung</th>}
                                        <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {teachers.map(teacher => (
                                        <tr key={teacher.id} className={`hover:bg-[var(--color-surface-alt)]/50 transition-colors ${selectedIds.includes(teacher.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                            <td className="px-4 py-4 w-10">
                                                <input type="checkbox" checked={selectedIds.includes(teacher.id)} onChange={() => toggleSelect(teacher.id)} className="accent-[var(--color-primary)] w-4 h-4 cursor-pointer" />
                                            </td>
                                            {/* Nama */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative shrink-0">
                                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black">{teacher.name.charAt(0)}</div>
                                                        {teacher.is_pinned && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"><FontAwesomeIcon icon={faThumbtack} className="text-white text-[7px]" /></div>}
                                                    </div>
                                                    <div>
                                                        <button onClick={() => openProfile(teacher)} className="text-sm font-bold text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left">{teacher.name}</button>
                                                        <p className="text-[10px] text-[var(--color-text-muted)]">{teacher.gender === 'L' ? 'Laki-laki' : teacher.gender === 'P' ? 'Perempuan' : '—'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {visibleCols.nbm && <td className="px-4 py-4 text-xs text-[var(--color-text-muted)] font-mono">{disp(teacher.nbm)}</td>}
                                            {visibleCols.subject && (
                                                <td className="px-4 py-4">
                                                    {teacher.subject ? <span className="px-2.5 py-1 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase">{teacher.subject}</span> : <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                                                </td>
                                            )}
                                            {visibleCols.contact && (
                                                <td className="px-4 py-4 space-y-1">
                                                    {teacher.phone && <a href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-bold w-fit"><FontAwesomeIcon icon={faWhatsapp} className="text-sm" />{disp(teacher.phone)}</a>}
                                                    {teacher.email && <p className="text-xs text-[var(--color-text-muted)] italic truncate max-w-[180px]">{disp(teacher.email)}</p>}
                                                    {!teacher.phone && !teacher.email && <span className="text-xs text-[var(--color-text-muted)]">—</span>}
                                                </td>
                                            )}
                                            {/* Status — inline quick edit */}
                                            {visibleCols.status && (
                                                <td className="px-4 py-4">
                                                    <div className="relative">
                                                        <button onClick={() => setQuickStatusId(quickStatusId === teacher.id ? null : teacher.id)}
                                                            className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase cursor-pointer hover:opacity-80 transition-all ${STATUS_CONFIG[teacher.status]?.color}`}>
                                                            {STATUS_CONFIG[teacher.status]?.label}
                                                        </button>
                                                        {quickStatusId === teacher.id && (
                                                            <div className="absolute top-8 left-0 z-30 w-36 glass rounded-xl border border-[var(--color-border)] shadow-xl overflow-hidden">
                                                                {Object.entries(STATUS_CONFIG).filter(([k]) => k !== teacher.status).map(([k, v]) => (
                                                                    <button key={k} onClick={() => handleQuickStatus(teacher, k)}
                                                                        className={`w-full px-3 py-2 text-left text-[10px] font-black uppercase hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2 ${v.color.split(' ')[1]}`}>
                                                                        <span className={`w-2 h-2 rounded-full ${v.dot}`} />{v.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleCols.join && <td className="px-4 py-4 text-xs text-[var(--color-text-muted)]">{teacher.join_date ? new Date(teacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => handleTogglePin(teacher)} title={teacher.is_pinned ? 'Lepas Sematkan' : 'Sematkan'}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all text-sm ${teacher.is_pinned ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10'}`}>
                                                        <FontAwesomeIcon icon={faThumbtack} />
                                                    </button>
                                                    <button onClick={() => openProfile(teacher)} title="Profil"
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm">
                                                        <FontAwesomeIcon icon={faEye} />
                                                    </button>
                                                    <button onClick={() => handleEdit(teacher)} title="Edit"
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button onClick={() => { setTeacherToAction(teacher); setIsArchiveModalOpen(true) }} title="Arsipkan"
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 transition-all text-sm">
                                                        <FontAwesomeIcon icon={faBoxArchive} />
                                                    </button>
                                                    <button onClick={() => { setTeacherToAction(teacher); setIsDeleteModalOpen(true) }} title="Hapus"
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-[var(--color-border)]">
                            {teachers.map(teacher => (
                                <div key={teacher.id} className={`p-4 ${selectedIds.includes(teacher.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <input type="checkbox" checked={selectedIds.includes(teacher.id)} onChange={() => toggleSelect(teacher.id)} className="accent-[var(--color-primary)] w-4 h-4 mt-1 cursor-pointer shrink-0" />
                                        <div className="relative shrink-0">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-sm font-black">{teacher.name.charAt(0)}</div>
                                            {teacher.is_pinned && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"><FontAwesomeIcon icon={faThumbtack} className="text-white text-[7px]" /></div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <button onClick={() => openProfile(teacher)} className="font-bold text-sm text-[var(--color-text)] hover:text-[var(--color-primary)]">{teacher.name}</button>
                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                        {teacher.subject && <span className="px-2 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black uppercase">{teacher.subject}</span>}
                                                        <span className={`px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${STATUS_CONFIG[teacher.status]?.color}`}>{STATUS_CONFIG[teacher.status]?.label}</span>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <button onClick={() => handleTogglePin(teacher)} className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-all ${teacher.is_pinned ? 'text-amber-500 bg-amber-500/10' : 'text-[var(--color-text-muted)] hover:text-amber-500'}`}><FontAwesomeIcon icon={faThumbtack} /></button>
                                                    <button onClick={() => handleEdit(teacher)} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 text-xs transition-all"><FontAwesomeIcon icon={faEdit} /></button>
                                                    <button onClick={() => { setTeacherToAction(teacher); setIsArchiveModalOpen(true) }} className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-amber-500 hover:bg-amber-500/10 text-xs transition-all"><FontAwesomeIcon icon={faBoxArchive} /></button>
                                                </div>
                                            </div>
                                            <div className="mt-2 space-y-1 text-xs text-[var(--color-text-muted)]">
                                                {teacher.nbm && <p className="font-mono">NBM: {disp(teacher.nbm)}</p>}
                                                {teacher.phone && <a href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-green-600 font-bold w-fit"><FontAwesomeIcon icon={faWhatsapp} />{disp(teacher.phone)}</a>}
                                                {teacher.email && <p className="italic truncate">{disp(teacher.email)}</p>}
                                                {teacher.join_date && <p>Bergabung: {new Date(teacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Pagination */}
                {!loading && totalRows > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{fromRow}–{toRow} dari {totalRows} guru</p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-3 rounded-lg text-xs font-bold border border-[var(--color-border)] disabled:opacity-30 hover:bg-[var(--color-surface)] transition-all">← Prev</button>
                            <span className="h-8 px-3 rounded-lg text-xs font-bold bg-[var(--color-primary)] text-white flex items-center">{page}/{totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8 px-3 rounded-lg text-xs font-bold border border-[var(--color-border)] disabled:opacity-30 hover:bg-[var(--color-surface)] transition-all">Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ════ MODAL Tambah/Edit ════ */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Update Data Guru' : 'Tambah Guru Baru'} size="md">
                <div className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Nama Lengkap <span className="text-red-500">*</span></label><input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap dengan gelar" className="input-field w-full h-11 font-bold text-sm" /></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">NBM</label><input type="text" value={formData.nbm} onChange={e => setFormData(p => ({ ...p, nbm: e.target.value }))} placeholder="Nomor Baku Muhammadiyah" className="input-field w-full h-11 font-mono text-sm" /></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Mata Pelajaran</label><input type="text" value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="e.g. Matematika" className="input-field w-full h-11 font-bold text-sm" list="subj-suggest" /><datalist id="subj-suggest">{subjectsList.map(s => <option key={s} value={s} />)}</datalist></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Gender</label><select value={formData.gender} onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))} className="input-field w-full h-11 text-sm"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Status</label><select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="input-field w-full h-11 text-sm"><option value="active">Aktif</option><option value="inactive">Nonaktif</option><option value="cuti">Cuti</option></select></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">No. HP / WA</label><input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx" className="input-field w-full h-11 text-sm" /></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Email Sekolah</label><input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@sekolah.id" className="input-field w-full h-11 text-sm" /></div>
                        <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Tanggal Bergabung</label><input type="date" value={formData.join_date} onChange={e => setFormData(p => ({ ...p, join_date: e.target.value }))} className="input-field w-full h-11 text-sm" /></div>
                        {classesList.length > 0 && (
                            <div><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Penugasan Kelas</label><select value={formData.class_id} onChange={e => setFormData(p => ({ ...p, class_id: e.target.value }))} className="input-field w-full h-11 text-sm"><option value="">Tidak ditugaskan</option>{classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        )}
                        <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Alamat</label><input type="text" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Alamat lengkap" className="input-field w-full h-11 text-sm" /></div>
                        <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Catatan Internal</label><textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Catatan privat, tidak tampil ke publik..." rows={2} className="input-field w-full text-sm resize-none py-2.5" /></div>
                    </div>
                    {formError && <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" /><p className="text-xs font-bold text-red-600">{formError}</p></div>}
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary h-11 px-6 text-xs font-black uppercase tracking-widest rounded-xl">Batal</button>
                        <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary h-11 px-8 text-xs font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : selectedItem ? 'Update' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Profil ════ */}
            <Modal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} title="Profil Guru" size="md">
                {profileTeacher && (
                    <div className="space-y-5">
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
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: faChalkboardTeacher, label: 'NBM', val: profileTeacher.nbm },
                                { icon: faMars, label: 'Gender', val: profileTeacher.gender === 'L' ? 'Laki-laki' : profileTeacher.gender === 'P' ? 'Perempuan' : null },
                                { icon: faPhone, label: 'No. HP/WA', val: profileTeacher.phone },
                                { icon: faEnvelope, label: 'Email', val: profileTeacher.email },
                                { icon: faCalendar, label: 'Bergabung', val: profileTeacher.join_date ? new Date(profileTeacher.join_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : null },
                                { icon: faMapMarkerAlt, label: 'Alamat', val: profileTeacher.address, wide: true },
                                { icon: faNoteSticky, label: 'Catatan', val: profileTeacher.notes, wide: true },
                            ].filter(i => i.val).map((item, i) => (
                                <div key={i} className={`p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] ${item.wide ? 'col-span-2' : ''}`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={item.icon} className="text-[var(--color-primary)]" /> {item.label}</p>
                                    <p className="text-xs font-bold text-[var(--color-text)] break-words">{disp(item.val)}</p>
                                </div>
                            ))}
                        </div>
                        {/* Statistik Laporan */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Statistik Laporan yang Dibuat</p>
                            {loadingProfile ? (
                                <div className="flex items-center gap-2 text-[var(--color-text-muted)] text-sm py-4 justify-center"><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Memuat statistik...</div>
                            ) : profileStats ? (
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { label: 'Total', val: profileStats.total, color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' },
                                        { label: 'Bulan Ini', val: profileStats.monthly, color: 'bg-indigo-500/10 text-indigo-600' },
                                        { label: 'Positif', val: profileStats.posCount, color: 'bg-emerald-500/10 text-emerald-600' },
                                        { label: 'Negatif', val: profileStats.negCount, color: 'bg-red-500/10 text-red-600' },
                                        { label: 'Total Poin', val: profileStats.totalPts >= 0 ? `+${profileStats.totalPts}` : profileStats.totalPts, color: profileStats.totalPts >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600' },
                                    ].map((s, i) => (
                                        <div key={i} className={`p-3 rounded-xl text-center ${s.color}`}><p className="text-xl font-black">{s.val}</p><p className="text-[9px] font-black uppercase tracking-wide mt-0.5 opacity-70">{s.label}</p></div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--color-text-muted)] italic text-center py-3">Belum ada laporan tercatat</p>
                            )}
                        </div>
                        {profileTeacher.phone && (
                            <a href={`https://wa.me/${profileTeacher.phone.replace(/^0/, '62')}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-green-500 text-white text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all">
                                <FontAwesomeIcon icon={faWhatsapp} /> Hubungi via WhatsApp
                            </a>
                        )}
                    </div>
                )}
            </Modal>

            {/* ════ MODAL Import ════ */}
            <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Import Data Guru" size="lg">
                <div className="space-y-5">
                    <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] gap-1">
                        {[['panduan', 'Panduan'], ['preview', 'Preview'], ['validasi', 'Validasi']].map(([t, label]) => (
                            <button key={t} onClick={() => setImportTab(t)} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importTab === t ? 'bg-[var(--color-primary)] text-white shadow' : 'text-[var(--color-text-muted)]'}`}>
                                {label}{t === 'validasi' && importIssues.length > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[8px]">{importIssues.length}</span>}
                            </button>
                        ))}
                    </div>

                    {importTab === 'panduan' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20">
                                <p className="text-xs font-bold mb-2">Kolom yang didukung:</p>
                                <div className="grid grid-cols-2 gap-1 text-[10px] font-mono text-[var(--color-text-muted)]">
                                    {['Nama *', 'NBM', 'Mata Pelajaran', 'Gender (L/P)', 'No. HP/WA', 'Email', 'Status'].map(col => <span key={col} className="px-2 py-1 bg-[var(--color-surface)] rounded border border-[var(--color-border)]">{col}</span>)}
                                </div>
                            </div>
                            <div onDragOver={e => { e.preventDefault(); setImportDrag(true) }} onDragLeave={() => setImportDrag(false)}
                                onDrop={e => { e.preventDefault(); setImportDrag(false); parseImportFile(e.dataTransfer.files[0]) }}
                                onClick={() => importFileRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${importDrag ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}>
                                <FontAwesomeIcon icon={faUpload} className="text-3xl text-[var(--color-text-muted)] mb-3" />
                                <p className="text-sm font-bold">Drag & drop atau klik untuk pilih file</p>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">CSV atau Excel (.xlsx, .xls)</p>
                                {importFileName && <p className="text-xs font-bold text-[var(--color-primary)] mt-2">📎 {importFileName}</p>}
                                <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => parseImportFile(e.target.files[0])} />
                            </div>
                        </div>
                    )}

                    {importTab === 'preview' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-bold">{importPreview.length} baris terdeteksi</p>
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer"><input type="checkbox" checked={importSkip} onChange={e => setImportSkip(e.target.checked)} className="accent-[var(--color-primary)]" />Skip duplikat ({importDupes.length})</label>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] max-h-64">
                                <table className="w-full text-xs">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                        <tr>{['Nama', 'NBM', 'Mapel', 'Gender', 'HP/WA', 'Status'].map(h => <th key={h} className="px-3 py-2 text-left text-[9px] font-black uppercase text-[var(--color-text-muted)]">{h}</th>)}</tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {importPreview.map((row, i) => (
                                            <tr key={i} className={importDupes.includes(i) ? 'bg-amber-500/10' : ''}>
                                                <td className="px-3 py-2 font-bold">{row.name || <span className="text-red-500">kosong</span>}</td>
                                                <td className="px-3 py-2 font-mono text-[var(--color-text-muted)]">{row.nbm || '—'}</td>
                                                <td className="px-3 py-2">{row.subject || '—'}</td>
                                                <td className="px-3 py-2">{row.gender || '—'}</td>
                                                <td className="px-3 py-2">{row.phone || '—'}</td>
                                                <td className="px-3 py-2">{STATUS_CONFIG[row.status]?.label || row.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {importTab === 'validasi' && (
                        <div className="space-y-3">
                            {importIssues.length === 0 ? (
                                <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 text-xl" /><p className="text-sm font-bold text-emerald-600">Semua data valid!</p></div>
                            ) : (
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {importIssues.map((issue, i) => (
                                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10"><FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 text-xs mt-0.5 shrink-0" /><p className="text-xs text-red-600 font-medium">{issue}</p></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {importing && (
                        <div className="space-y-2">
                            <div className="h-2 bg-[var(--color-surface-alt)] rounded-full overflow-hidden"><div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} /></div>
                            <p className="text-[10px] text-center text-[var(--color-text-muted)] font-bold">{importProgress.done}/{importProgress.total} guru diimport...</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button onClick={() => setIsImportModalOpen(false)} className="h-11 px-6 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Batal</button>
                        <button onClick={commitImport} disabled={importing || !importPreview.filter(r => r.name).length}
                            className="h-11 px-8 rounded-xl bg-[var(--color-primary)] text-white text-xs font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-[var(--color-primary)]/20">
                            {importing ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : `Import ${importPreview.filter(r => r.name).length} Guru`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Archive ════ */}
            <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Arsipkan Guru" size="sm">
                <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start"><FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5" /><p className="text-sm font-medium leading-relaxed">Guru <strong>{teacherToAction?.name}</strong> akan diarsipkan. Data dapat dipulihkan kapan saja.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsArchiveModalOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Batal</button>
                        <button onClick={handleArchive} disabled={submitting} className="flex-1 h-11 rounded-xl bg-amber-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Arsipkan'}</button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Delete ════ */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Permanen" size="sm">
                <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex gap-3 items-start"><FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 mt-0.5" /><p className="text-sm font-medium">Hapus <strong>{teacherToAction?.name}</strong> secara permanen? Tidak dapat dibatalkan.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Batal</button>
                        <button onClick={handleDeleteConfirm} disabled={submitting} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Hapus Permanen'}</button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Bulk Archive ════ */}
            <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title={`Arsip Massal — ${selectedIds.length} Guru`} size="sm">
                <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3 items-start"><FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5" /><p className="text-sm font-medium">{selectedIds.length} guru akan diarsipkan. Data dapat dipulihkan kapan saja.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Batal</button>
                        <button onClick={handleBulkArchive} disabled={submitting} className="flex-1 h-11 rounded-xl bg-amber-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Arsipkan Semua'}</button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Bulk Delete ════ */}
            <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title={`Hapus Massal — ${selectedIds.length} Guru`} size="sm">
                <div className="space-y-5">
                    <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex gap-3 items-start"><FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 mt-0.5" /><p className="text-sm font-medium">{selectedIds.length} guru akan dihapus permanen. Tidak dapat dibatalkan.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsBulkDeleteOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Batal</button>
                        <button onClick={handleBulkDelete} disabled={submitting} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Hapus Permanen'}</button>
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL WA Massal ════ */}
            <Modal isOpen={isBulkWAOpen} onClose={() => setIsBulkWAOpen(false)} title="WA Massal Guru" size="sm">
                <div className="space-y-4">
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
                                <FontAwesomeIcon icon={faWhatsapp} /> Kirim ke {bulkWATeachers[bulkWAIndex]?.name.split(' ')[0]}
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            {/* ════ MODAL Arsip List ════ */}
            <Modal isOpen={isArchivedOpen} onClose={() => setIsArchivedOpen(false)} title="Arsip Guru" size="lg">
                <div className="space-y-4">
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
                                    <button onClick={() => handleRestore(t)} className="shrink-0 h-8 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faRotateLeft} /> Pulihkan</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* ════ MODAL Shortcuts ════ */}
            <Modal isOpen={isShortcutOpen} onClose={() => setIsShortcutOpen(false)} title="Keyboard Shortcuts" size="sm">
                <div className="space-y-2">
                    {[['Ctrl + K', 'Fokus ke Search'], ['Ctrl + N', 'Tambah Guru Baru'], ['Ctrl + P', 'Toggle Privacy Mode'], ['Escape', 'Tutup modal / Reset filter'], ['?', 'Buka Shortcuts ini']].map(([key, desc]) => (
                        <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <span className="text-xs font-medium text-[var(--color-text-muted)]">{desc}</span>
                            <kbd className="px-2.5 py-1 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black font-mono">{key}</kbd>
                        </div>
                    ))}
                </div>
            </Modal>

        </DashboardLayout>
    )
}