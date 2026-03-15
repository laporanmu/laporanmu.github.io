import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faSpinner,
    faArrowUp, faArrowDown, faXmark, faSliders,
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faCheckCircle, faCircleExclamation,
    faCalendarDay, faClipboardList, faTableList, faTable,
    faTriangleExclamation, faFilePen, faArrowRight, faArrowLeft,
    faUpload, faDownload, faFileExport, faFileImport, faFileExcel, faFileCsv,
    faKeyboard, faEye, faEyeSlash, faBoxArchive, faRotateLeft,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/ui/Modal'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useFlag } from '../context/FeatureFlagsContext'
import { supabase } from '../lib/supabase'

import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const PAGE_SIZE = 10
const LS_VIEW = 'reports_view'
const LS_COLS = 'reports_columns'
const LS_PAGE_SIZE = 'reports_page_size'

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

// ── Shared Pagination strip (renders inside any card) ────────────────────────
function PaginationStrip({ page, totalPages, totalRows, fromRow, toRow, pageSize, onPage, onPageSize }) {
    if (!totalRows) return null
    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
            <div className="flex items-center gap-4">
                <p className="text-[10px] font-black uppercase text-[var(--color-text-muted)] tracking-[0.08em] tabular-nums">
                    Menampilkan{' '}
                    <span className="text-[var(--color-text)]">{fromRow}–{toRow}</span>
                    <span className="opacity-40 font-medium"> dari </span>
                    <span className="text-[var(--color-text)]">{totalRows}</span>
                    {' '}laporan
                </p>
                <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-[var(--color-border)]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Baris:</span>
                    <select
                        value={pageSize}
                        onChange={e => onPageSize(Number(e.target.value))}
                        className="bg-transparent text-[10px] font-black text-[var(--color-text)] outline-none cursor-pointer hover:text-[var(--color-primary)] transition-all"
                    >
                        {[10, 25, 50, 100].map(v => (
                            <option key={v} value={v} className="bg-[var(--color-surface)] text-[var(--color-text)]">{v}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-1">
                {[
                    { icon: faAnglesLeft, action: () => onPage(1), disabled: page === 1 },
                    { icon: faChevronLeft, action: () => onPage(page - 1), disabled: page === 1 },
                ].map((b, i) => (
                    <button key={i} disabled={b.disabled} onClick={b.action}
                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-xs disabled:opacity-20 hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center">
                        <FontAwesomeIcon icon={b.icon} className="text-[10px]" />
                    </button>
                ))}
                <div className="flex gap-0.5 mx-1">
                    {getPageItems(page, totalPages).map((it, idx) =>
                        it === '...'
                            ? <span key={idx} className="w-8 h-8 flex items-center justify-center opacity-30 text-xs">···</span>
                            : <button key={it} onClick={() => onPage(it)}
                                className={`w-8 h-8 rounded-lg font-black text-[10px] transition-all ${it === page
                                    ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30'
                                    : 'border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
                                {it}
                            </button>
                    )}
                </div>
                {[
                    { icon: faChevronRight, action: () => onPage(page + 1), disabled: page >= totalPages },
                    { icon: faAnglesRight, action: () => onPage(totalPages), disabled: page >= totalPages },
                ].map((b, i) => (
                    <button key={i} disabled={b.disabled} onClick={b.action}
                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] text-xs disabled:opacity-20 hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center">
                        <FontAwesomeIcon icon={b.icon} className="text-[10px]" />
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function PoinPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()

    // access.teacher_poin flag — kalau off, guru tidak bisa tambah/edit/hapus poin
    const { enabled: teacherPoinEnabled } = useFlag('access.teacher_poin')
    const canInput = profile?.role === 'guru' ? teacherPoinEnabled : true

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
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem(LS_VIEW) || 'timeline' } catch { return 'timeline' }
    })

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentStep, setCurrentStep] = useState(1)
    const [modalSearch, setModalSearch] = useState('')
    const [modalClassFilter, setModalClassFilter] = useState('')
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ student_id: '', violation_type_id: '', notes: '' })
    const [formErrors, setFormErrors] = useState({})
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [classesList, setClassesList] = useState([]) // fetched directly from classes table
    const searchInputRef = useRef(null)
    const colMenuRef = useRef(null)
    const importFileInputRef = useRef(null)
    const shortcutRef = useRef(null)

    // columns
    const [visibleCols, setVisibleCols] = useState({ type: true, points: true, time: true, teacher: true })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

    // ── Export/Import & UX States ───────────────────────────────────────────
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuRef = useRef(null)

    const [exportScope, setExportScope] = useState('filtered')
    const [exportFormat, setExportFormat] = useState('xlsx')
    const [exportColumns, setExportColumns] = useState({
        date: true,
        student: true,
        class: true,
        type: true,
        points: true,
        notes: true,
        teacher: true
    })

    const [importStep, setImportStep] = useState(1)
    const [importFile, setImportFile] = useState(null)
    const [importPreview, setImportPreview] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })

    // ── Derived ───────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(totalRows / pageSize)
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    const filteredStudentsForModal = useMemo(() => {
        let list = students
        if (modalClassFilter) list = list.filter(s => s.class_name === modalClassFilter)
        if (modalSearch) list = list.filter(s => s.name.toLowerCase().includes(modalSearch.toLowerCase()))
        return list
    }, [students, modalClassFilter, modalSearch])

    const getTypeName = (id) => violationTypes.find(vt => vt.id === id)?.name ?? '—'
    const selectedVT = violationTypes.find(vt => vt.id === formData.violation_type_id)

    const activeFilters = useMemo(() => {
        const chips = []
        if (filterType === 'positive') chips.push({ label: 'Positif (+)', clear: () => setFilterType('') })
        if (filterType === 'negative') chips.push({ label: 'Negatif (−)', clear: () => setFilterType('') })
        if (filterClass) chips.push({ label: `Kelas: ${filterClass}`, clear: () => setFilterClass('') })
        if (sortBy !== 'newest') chips.push({ label: 'Urutan: Terlama', clear: () => setSortBy('newest') })
        return chips
    }, [filterType, filterClass, sortBy])

    const groupedReports = useMemo(() => {
        const groups = {}
        reports.forEach(r => {
            const key = (r.reported_at || '').slice(0, 10)
            if (!groups[key]) groups[key] = []
            groups[key].push(r)
        })
        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
    }, [reports])

    const toggleSelect = (id) => setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
    const allSelected = reports.length > 0 && reports.every(r => selectedIds.includes(r.id))

    // ── Formatters ────────────────────────────────────────────────────────────
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    const fmtDayLabel = (d) => {
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const ds = d.slice(0, 10)
        if (ds === today) return 'Hari Ini'
        if (ds === yesterday) return 'Kemarin'
        return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    }

    const mask = (str, visibleLen = 3) => {
        if (!isPrivacyMode || !str) return str
        if (str.length <= visibleLen) return str[0] + '*'.repeat(Math.max(0, str.length - 1))
        return str.substring(0, visibleLen) + '***'
    }

    const resetAllFilters = () => {
        setSearchQuery(''); setFilterType(''); setFilterClass(''); setSortBy('newest'); setPage(1)
    }

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    useEffect(() => { localStorage.setItem(LS_VIEW, viewMode) }, [viewMode])

    // Load/Save columns
    useEffect(() => {
        try {
            const c = JSON.parse(localStorage.getItem(LS_COLS) || '{}')
            if (Object.keys(c).length) setVisibleCols(c)
        } catch { }
    }, [])
    useEffect(() => {
        localStorage.setItem(LS_COLS, JSON.stringify(visibleCols))
    }, [visibleCols])
    useEffect(() => {
        localStorage.setItem(LS_PAGE_SIZE, pageSize)
    }, [pageSize])


    // ── Export Logic Moved to Below ──

    // ── Import Logic ────────────────────────────────────────────────────────
    const parseCSVFile = (file) => new Promise((res, rej) => {
        Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data), error: e => rej(e) })
    })

    const parseExcelFile = async (file) => {
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]])
    }

    const processImportFile = async (file) => {
        if (!file) return
        setLoading(true)
        try {
            const ext = file.name.split('.').pop().toLowerCase()
            const rows = ext === 'xlsx' ? await parseExcelFile(file) : await parseCSVFile(file)

            if (!rows.length) { addToast('File kosong', 'error'); return }

            const preview = rows.map(r => {
                const studentName = r.nama_siswa || r.student || r.name
                const vtName = r.jenis || r.type || r.violation
                const student = students.find(s => s.name.toLowerCase() === (studentName || '').toLowerCase())
                const vt = violationTypes.find(v => v.name.toLowerCase() === (vtName || '').toLowerCase())

                return {
                    nama_siswa: studentName,
                    jenis: vtName,
                    poin: r.poin || r.points || vt?.points || 0,
                    notes: r.catatan || r.notes || '',
                    date: r.tanggal || r.date || new Date().toISOString(),
                    student_id: student?.id,
                    violation_type_id: vt?.id,
                    error: !student ? 'Siswa tidak ditemukan' : !vt ? 'Jenis pelanggaran tidak ditemukan' : null
                }
            })
            setImportPreview(preview)
            setImportStep(2)
        } catch { addToast('Gagal membaca file', 'error') }
        finally { setLoading(false) }
    }

    const handleCommitImport = async () => {
        const validRows = importPreview.filter(r => !r.error)
        if (!validRows.length) { addToast('Tidak ada data valid untuk diimpor', 'error'); return }

        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })
        try {
            for (let i = 0; i < validRows.length; i++) {
                const row = validRows[i]
                await supabase.from('reports').insert([{
                    student_id: row.student_id,
                    violation_type_id: row.violation_type_id,
                    points: row.poin,
                    notes: row.notes,
                    reported_at: new Date(row.date).toISOString(),
                    teacher_name: profile?.full_name || 'Sistem'
                }])
                setImportProgress(p => ({ ...p, done: i + 1 }))
            }
            addToast(`Berhasil mengimpor ${validRows.length} laporan`, 'success')
            setIsImportModalOpen(false)
            fetchReports()
        } catch { addToast('Gagal mengimpor data', 'error') }
        finally { setImporting(false) }
    }

    useEffect(() => {
        const h = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.key === 'n' && !e.ctrlKey && !isTyping) { e.preventDefault(); setIsModalOpen(true) }
            if (e.key === 'Escape') {
                setSearchQuery(''); setSelectedIds([]);
                setIsModalOpen(false); setIsExportModalOpen(false); setIsImportModalOpen(false)
                setIsShortcutOpen(false); setIsDeleteModalOpen(false); setIsBulkDeleteOpen(false)
            }
            if (e.key === '?' && !isTyping) setIsShortcutOpen(v => !v)

            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
                setIsColMenuOpen(false)
            }
        }
        document.addEventListener('keydown', h)
        document.addEventListener('mousedown', (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false)
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
        })
        return () => {
            document.removeEventListener('keydown', h)
            document.removeEventListener('mousedown', h)
        }
    }, [])

    // ── Fetchers ──────────────────────────────────────────────────────────────
    const fetchMetadata = useCallback(async () => {
        try {
            // students has class_id FK → classes table. No class_name column.
            const [studRes, vtRes, classRes] = await Promise.all([
                supabase.from('students').select('id,name,class_id,classes(id,name)').order('name'),
                supabase.from('violation_types').select('id,name,points').order('name'),
                supabase.from('classes').select('id,name').order('name'),
            ])
            if (studRes.data) {
                setStudents(studRes.data.map(s => ({
                    id: s.id,
                    name: s.name,
                    class_id: s.class_id,
                    class_name: s.classes?.name || '',
                })))
            }
            if (vtRes.data) setViolationTypes(vtRes.data)
            if (classRes.data) setClassesList(classRes.data.map(c => c.name).filter(Boolean).sort())
        } catch { addToast('Gagal memuat metadata', 'error') }
    }, [addToast])

    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            let q = supabase
                .from('reports')
                .select('id,student_id,violation_type_id,points,notes,reported_at,teacher_name', { count: 'exact' })
                .order('reported_at', { ascending: sortBy === 'oldest' })
                .range(from, to)

            if (filterType === 'positive') q = q.gt('points', 0)
            if (filterType === 'negative') q = q.lt('points', 0)

            if (debouncedSearch) {
                const [matchedS, matchedT] = await Promise.all([
                    supabase.from('students').select('id').ilike('name', `%${debouncedSearch}%`),
                    supabase.from('violation_types').select('id').ilike('name', `%${debouncedSearch}%`),
                ])
                const sIds = (matchedS.data || []).map(s => s.id)
                const tIds = (matchedT.data || []).map(t => t.id)
                if (!sIds.length && !tIds.length) { setReports([]); setTotalRows(0); setLoading(false); return }
                const ors = []
                if (sIds.length) ors.push(`student_id.in.(${sIds.join(',')})`)
                if (tIds.length) ors.push(`violation_type_id.in.(${tIds.join(',')})`)
                q = q.or(ors.join(','))
            }

            const { data, error, count } = await q
            if (error) throw error

            let filtered = data || []
            if (filterClass) {
                filtered = filtered.filter(r => students.find(st => st.id === r.student_id)?.class_name === filterClass)
            }
            setReports(filtered)
            setTotalRows(count ?? 0)
        } catch { addToast('Gagal memuat laporan', 'error') }
        finally { setLoading(false) }
    }, [page, pageSize, debouncedSearch, filterType, filterClass, sortBy, students, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('reports').select('id,points,reported_at')
            if (data) {
                const todayStr = new Date().toISOString().slice(0, 10)
                setStats({
                    total: data.length,
                    positive: data.filter(r => (r.points ?? 0) > 0).length,
                    negative: data.filter(r => (r.points ?? 0) < 0).length,
                    today: data.filter(r => r.reported_at?.startsWith(todayStr)).length,
                })
            }
        } catch { }
    }, [])

    const fetchRef = useRef(fetchReports)
    const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchRef.current = fetchReports }, [fetchReports])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])
    useEffect(() => { fetchMetadata() }, [fetchMetadata])
    useEffect(() => { fetchReports() }, [fetchReports])
    useEffect(() => { fetchStats() }, [fetchStats])
    useEffect(() => {
        const ch = supabase.channel('reports-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
                fetchRef.current(); fetchStatsRef.current()
            }).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({ student_id: '', violation_type_id: '', notes: '' })
        setFormErrors({}); setCurrentStep(1); setModalSearch(''); setModalClassFilter('')
        setIsModalOpen(true)
    }
    const handleEdit = (r) => {
        setSelectedItem(r)
        setFormData({ student_id: r.student_id, violation_type_id: r.violation_type_id, notes: r.notes || '' })
        setFormErrors({}); setCurrentStep(2)
        setIsModalOpen(true)
    }
    const handleSubmit = async () => {
        const errors = {}
        if (!formData.student_id) errors.student_id = 'Siswa wajib dipilih'
        if (!formData.violation_type_id) errors.violation_type_id = 'Jenis laporan wajib dipilih'
        if (Object.keys(errors).length) { setFormErrors(errors); return }
        setFormErrors({})
        setSubmitting(true)
        try {
            const vt = violationTypes.find(v => v.id === formData.violation_type_id)
            const payload = {
                student_id: formData.student_id,
                violation_type_id: formData.violation_type_id,
                reporter_id: profile?.id ?? null,
                teacher_name: profile?.name ?? 'Unknown',
                points: vt?.points ?? 0,
                notes: formData.notes || null,
                reported_at: selectedItem ? selectedItem.reported_at : new Date().toISOString(),
            }
            if (selectedItem) {
                const { error } = await supabase.from('reports').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast('Laporan diupdate', 'success')
            } else {
                const { error } = await supabase.from('reports').insert([payload])
                if (error) throw error
                addToast('Laporan berhasil dibuat', 'success')
            }
            setIsModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || 'Gagal menyimpan', 'error') }
        finally { setSubmitting(false) }
    }
    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('reports').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast('Laporan dihapus', 'success')
            setIsDeleteModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || 'Gagal menghapus', 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }
    const handleBulkDelete = async () => {
        if (!selectedIds.length) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('reports').delete().in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} laporan dihapus`, 'success')
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || 'Gagal hapus massal', 'error') }
        finally { setSubmitting(false) }
    }
    const nextStep = (studentId) => {
        const id = studentId ?? formData.student_id
        if (!id) { addToast('Pilih siswa terlebih dahulu', 'warning'); return }
        setFormData(prev => ({ ...prev, student_id: id }))
        setCurrentStep(2)
    }

    // ── Export Logic ──
    const getExportData = async () => {
        let q = supabase
            .from('reports')
            .select('*, students(name, class_id, classes(name)), violation_types(name)')
            .order('reported_at', { ascending: false })

        if (exportScope === 'filtered') {
            if (filterType === 'positive') q = q.gt('points', 0)
            if (filterType === 'negative') q = q.lt('points', 0)
        } else if (exportScope === 'selected') {
            q = q.in('id', selectedIds)
        }

        const { data, error } = await q
        if (error) throw error

        let filtered = data || []
        if (exportScope === 'filtered') {
            if (filterClass) {
                filtered = filtered.filter(r => r.students?.classes?.name === filterClass)
            }
            if (debouncedSearch) {
                const s = debouncedSearch.toLowerCase()
                filtered = filtered.filter(r =>
                    (r.students?.name || '').toLowerCase().includes(s) ||
                    (r.violation_types?.name || '').toLowerCase().includes(s)
                )
            }
        }

        return filtered.map(r => {
            const row = {}
            if (exportColumns.date) row['Tanggal'] = fmtDate(r.reported_at)
            if (exportColumns.student) row['Siswa'] = r.students?.name || '-'
            if (exportColumns.class) row['Kelas'] = r.students?.classes?.name || '-'
            if (exportColumns.type) row['Jenis'] = r.violation_types?.name || '-'
            if (exportColumns.points) row['Poin'] = r.points
            if (exportColumns.notes) row['Catatan'] = r.notes || '-'
            if (exportColumns.teacher) row['Pelapor'] = r.teacher_name || '-'
            return row
        })
    }

    const handleExportData = async (format) => {
        setLoading(true)
        try {
            const data = await getExportData()
            if (!data.length) return addToast('Tidak ada data yang cocok untuk diekspor', 'warning')

            const filename = `Laporan_Perilaku_${new Date().toISOString().slice(0, 10)}`

            if (format === 'csv') {
                const csv = Papa.unparse(data)
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                link.setAttribute('download', `${filename}.csv`)
                link.click()
            } else {
                const ws = XLSX.utils.json_to_sheet(data)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Laporan')
                XLSX.writeFile(wb, `${filename}.xlsx`)
            }
            addToast(`Ekspor ${format.toUpperCase()} berhasil`, 'success')
            setIsExportModalOpen(false)
        } catch (err) {
            console.error(err)
            addToast('Gagal mengekspor data', 'error')
        } finally {
            setLoading(false)
        }
    }

    // ── Export Modal Component ───────────────────────────────────────────────
    const ExportModal = () => (
        <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Data Laporan">
            <div className="p-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">1. Pilih Cakupan Data</label>
                            <div className="grid grid-cols-1 gap-2">
                                {[
                                    { id: 'filtered', label: 'Data Terfilter', desc: 'Sesuai pencarian & filter saat ini', icon: faSliders },
                                    { id: 'selected', label: 'Data Terpilih', desc: `${selectedIds.length} baris yang Anda centang`, icon: faCheckCircle, disabled: selectedIds.length === 0 },
                                    { id: 'all', label: 'Semua Data', desc: 'Seluruh catatan di database', icon: faClipboardList },
                                ].map(opt => (
                                    <button key={opt.id} disabled={opt.disabled} onClick={() => setExportScope(opt.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${exportScope === opt.id ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] opacity-60 hover:opacity-100 disabled:opacity-20'}`}>
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${exportScope === opt.id ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                            <FontAwesomeIcon icon={opt.icon} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-tight leading-tight">{opt.label}</p>
                                            <p className="text-[10px] opacity-60 font-medium">{opt.desc}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">2. Format File</label>
                            <div className="flex gap-2">
                                {[
                                    { id: 'xlsx', label: 'Excel (.xlsx)', icon: faFileExcel, color: 'text-emerald-500' },
                                    { id: 'csv', label: 'CSV (.csv)', icon: faFileCsv, color: 'text-amber-500' },
                                ].map(fmt => (
                                    <button key={fmt.id} onClick={() => setExportFormat(fmt.id)}
                                        className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${exportFormat === fmt.id ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'}`}>
                                        <FontAwesomeIcon icon={fmt.icon} className={`text-lg ${fmt.color}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{fmt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-[var(--color-surface-alt)]/30 rounded-2xl border border-[var(--color-border)] p-4">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-4">3. Pilih Kolom</label>
                        <div className="space-y-1.5">
                            {Object.entries(exportColumns).map(([key, val]) => (
                                <button key={key} onClick={() => setExportColumns(prev => ({ ...prev, [key]: !val }))}
                                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white transition-all group">
                                    <span className="text-[11px] font-bold text-[var(--color-text-muted)] group-hover:text-[var(--color-text)] capitalize">{key.replace('type', 'Jenis Perilaku').replace('points', 'Poin').replace('date', 'Tanggal').replace('student', 'Nama Siswa').replace('class', 'Kelas').replace('notes', 'Catatan').replace('teacher', 'Dicatat Oleh')}</span>
                                    <div className={`w-8 h-4.5 rounded-full flex items-center px-0.5 transition-all ${val ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`}>
                                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${val ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="mt-8 flex gap-3">
                    <button onClick={() => setIsExportModalOpen(false)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                    <button onClick={() => handleExportData(exportFormat)} className="flex-[2] h-12 rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                        <FontAwesomeIcon icon={faDownload} />
                        Download {exportFormat.toUpperCase()}
                    </button>
                </div>
            </div>
        </Modal>
    )

    // ── Import Modal Component ───────────────────────────────────────────────
    const ImportModal = () => (
        <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setImportStep(1) }} title="Import Data Laporan">
            <div className="p-1">
                {/* Stepper Header */}
                <div className="flex items-center justify-center gap-4 mb-8">
                    {[1, 2, 3].map(s => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${importStep >= s ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{s}</div>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${importStep >= s ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>{s === 1 ? 'Upload' : s === 2 ? 'Preview' : 'Selesai'}</span>
                            {s < 3 && <div className="w-8 h-px bg-[var(--color-border)]" />}
                        </div>
                    ))}
                </div>

                {importStep === 1 ? (
                    <div className="space-y-6">
                        <div className="text-center p-12 rounded-3xl border-2 border-dashed border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 relative group hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all">
                            <input type="file" accept=".csv, .xlsx" onChange={e => processImportFile(e.target.files[0])}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl shadow-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4 text-[var(--color-primary)] group-hover:scale-110 transition-transform">
                                <FontAwesomeIcon icon={faUpload} className="text-2xl" />
                            </div>
                            <h3 className="text-sm font-black text-[var(--color-text)] mb-1">Upload File CSV/Excel</h3>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Klik atau seret file ke sini</p>
                        </div>
                        <div className="bg-[var(--color-surface-alt)]/50 rounded-2xl p-4 border border-[var(--color-border)]">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)] mb-2 flex items-center gap-2">
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                                Panduan Format
                            </h4>
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed mb-3">Pastikan file Anda memiliki kolom-kolom berikut:</p>
                            <div className="flex flex-wrap gap-2">
                                {['Nama Siswa', 'Jenis Perilaku', 'Catatan', 'Tanggal'].map(h => (
                                    <span key={h} className="px-2 py-1 rounded bg-white border border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text)]">{h}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : importStep === 2 ? (
                    <div className="space-y-6">
                        <div className="max-h-[350px] overflow-y-auto rounded-2xl border border-[var(--color-border)]">
                            <table className="w-full text-left text-[11px]">
                                <thead className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase text-[var(--color-text-muted)]">Siswa</th>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase text-[var(--color-text-muted)]">Perilaku</th>
                                        <th className="px-3 py-2 text-[9px] font-black uppercase text-[var(--color-text-muted)] text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)] bg-white">
                                    {importPreview.map((row, i) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2 font-bold">{row['Nama Siswa'] || row.nama_siswa || '—'}</td>
                                            <td className="px-3 py-2">{row['Jenis Perilaku'] || row.jenis || '—'}</td>
                                            <td className="px-3 py-2 text-center">
                                                {row.error === null || row._status === 'valid'
                                                    ? <span className="text-emerald-500"><FontAwesomeIcon icon={faCheckCircle} /></span>
                                                    : <span className="text-red-500" title={row.error || "Siswa atau Jenis Perilaku tidak ditemukan"}><FontAwesomeIcon icon={faCircleExclamation} /></span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setImportStep(1)} className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all">Kembali</button>
                            <button onClick={handleCommitImport} disabled={importing}
                                className="flex-[2] h-12 rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3">
                                {importing ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                        Memproses ({importProgress.done}/{importProgress.total})
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faFileImport} />
                                        Commit Import
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </Modal>
    )



    return (
        <DashboardLayout title="Laporan Perilaku">
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Privacy Banner */}
                {isPrivacyMode && (
                    <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor</div>
                        <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                    </div>
                )}

                {/* Read-only Banner — access.teacher_poin flag off */}
                {!canInput && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">Mode Read-only — Input poin dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                <ExportModal />
                <ImportModal />

                {/* ── PAGE HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Laporan Perilaku</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium italic opacity-70">
                            Rekam dan pantau perkembangan karakter siswa.
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* View Mode Togglers */}
                        <div className="bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] flex gap-0.5 hidden md:flex">
                            <button onClick={() => setViewMode('timeline')}
                                className={`h-7 px-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${viewMode === 'timeline' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={faTableList} />
                                {viewMode === 'timeline' && <span className="hidden sm:inline">Timeline</span>}
                            </button>
                            <button onClick={() => setViewMode('table')}
                                className={`h-7 px-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={faTable} />
                                {viewMode === 'table' && <span className="hidden sm:inline">Tabel</span>}
                            </button>
                        </div>

                        {/* Tombol aksi sekunder — Dropdown */}
                        <div className="relative" ref={headerMenuRef}>
                            <button onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Opsi Laporan"
                            >
                                <FontAwesomeIcon icon={faSliders} />
                            </button>

                            {/* Dropdown menu - Retaining original colorful icons as requested */}
                            {isHeaderMenuOpen && (
                                <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-[calc(100%+8px)] -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[320px] sm:w-56 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Opsi & Aksi</p>
                                    <button onClick={() => { setIsImportModalOpen(true); setIsHeaderMenuOpen(false) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import Data</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsExportModalOpen(true); setIsHeaderMenuOpen(false) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Export Data</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Privacy Button Standalone */}
                        <button
                            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                            className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                            title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}
                        >
                            <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                {isPrivacyMode ? 'Privacy On' : 'Privacy Off'}
                            </span>
                        </button>

                        {/* Keyboard Shortcuts Button Standalone */}
                        <div className="relative" ref={shortcutRef}>
                            <button
                                onClick={() => setIsShortcutOpen(v => !v)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                title="Keyboard Shortcuts (?)"
                            >
                                <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                            </button>

                            {isShortcutOpen && (
                                <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-11 -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[340px] sm:w-72 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                    </div>
                                    <div className="p-3 space-y-0.5">
                                        {[
                                            { section: 'Navigasi' },
                                            { keys: ['Ctrl', 'K'], label: 'Cari laporan' },
                                            { keys: ['Esc'], label: 'Tutup modal / reset search' },
                                            { section: 'Aksi' },
                                            { keys: ['N'], label: 'Tambah laporan baru' },
                                            { keys: ['Ctrl', 'E'], label: 'Buka menu export' },
                                            { keys: ['Ctrl', 'I'], label: 'Buka menu import' },
                                            { section: 'Tampilan' },
                                            { keys: ['P'], label: 'Toggle privacy mode' },
                                            { keys: ['R'], label: 'Refresh data' },
                                            { keys: ['X'], label: 'Reset filter' },
                                            { keys: ['?'], label: 'Tampilkan shortcut ini' },
                                        ].map((item, i) => item.section ? (
                                            <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                        ) : (
                                            <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                                <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                                <div className="flex items-center gap-1">
                                                    {item.keys.map((k, ki) => (
                                                        <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Primary Add Button */}
                        <button onClick={handleAdd} disabled={!canInput}
                            className="btn btn-primary h-9 px-4 lg:px-5 shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                            <FontAwesomeIcon icon={faPlus} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{canInput ? 'Buat Laporan' : 'Read-only'}</span>
                        </button>
                    </div>
                </div>

                {/* ── STATS ── */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Total', value: stats.total, icon: faClipboardList, bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', border: 'border-t-[var(--color-primary)]', key: '' },
                        { label: 'Positif', value: stats.positive, icon: faCheckCircle, bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-t-emerald-500', key: 'positive' },
                        { label: 'Negatif', value: stats.negative, icon: faCircleExclamation, bg: 'bg-red-500/10 text-red-500', border: 'border-t-red-500', key: 'negative' },
                        { label: 'Hari Ini', value: stats.today, icon: faCalendarDay, bg: 'bg-amber-500/10 text-amber-500', border: 'border-t-amber-500', key: '' },
                    ].map(s => (
                        <div key={s.label}
                            onClick={() => s.key && setFilterType(prev => prev === s.key ? '' : s.key)}
                            className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.border} flex items-center gap-3 hover:border-t-4 transition-all ${s.key ? 'cursor-pointer' : ''} ${s.key && filterType === s.key ? 'ring-2 ring-[var(--color-primary)]/30' : ''}`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${s.bg}`}>
                                <FontAwesomeIcon icon={s.icon} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-none mb-1">{s.label}</p>
                                <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)] tabular-nums">{s.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── SEARCH + FILTER ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-row items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                                <FontAwesomeIcon icon={faSearch} />
                            </div>
                            <input ref={searchInputRef} type="text" value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Cari nama siswa atau jenis perilaku... (Ctrl+K)"
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all">
                                    <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setShowAdvFilter(v => !v)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilters.length > 0
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilters.length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                        {activeFilters.length}
                                    </span>
                                )}
                            </button>
                            {activeFilters.length > 0 && (
                                <button onClick={resetAllFilters}
                                    className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faXmark} />
                                    <span className="hidden sm:inline">Reset</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {showAdvFilter && (
                        <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kategori</label>
                                    <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold">
                                        <option value="">Semua Perilaku</option>
                                        <option value="positive">Positif (+)</option>
                                        <option value="negative">Negatif (−)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kelas</label>
                                    <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold">
                                        <option value="">Semua Kelas</option>
                                        {classesList.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutan</label>
                                    <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold">
                                        <option value="newest">↓ Terbaru</option>
                                        <option value="oldest">↑ Terlama</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={resetAllFilters}
                                        className="w-full h-9 rounded-xl border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all">
                                        Reset Semua
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── FILTER CHIPS ── */}
                {activeFilters.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Filter:</span>
                        {activeFilters.map((f, i) => (
                            <div key={i} className="h-7 pl-3 pr-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase text-[var(--color-text)] flex items-center gap-1.5">
                                {f.label}
                                <button onClick={f.clear}
                                    className="w-4 h-4 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center">
                                    <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── CONTENT ── */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Memuat data...</p>
                    </div>
                ) : totalRows === 0 && !debouncedSearch && !filterType && !filterClass ? (
                    <div className="text-center py-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                        <div className="w-14 h-14 bg-[var(--color-surface-alt)] rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-30 text-2xl">
                            <FontAwesomeIcon icon={faClipboardList} />
                        </div>
                        <h3 className="text-lg font-black text-[var(--color-text)] mb-2">Belum Ada Laporan</h3>
                        <p className="text-sm text-[var(--color-text-muted)] max-w-xs mx-auto mb-6 opacity-70">
                            Gunakan tombol "Buat Laporan" untuk mulai mendata perilaku siswa.
                        </p>
                        <button onClick={handleAdd} disabled={!canInput} className="btn btn-primary h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed">
                            {canInput ? 'Buat Sekarang' : 'Read-only'}
                        </button>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/20">
                        <div className="w-14 h-14 bg-[var(--color-surface-alt)] rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-30 text-2xl">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <h3 className="text-base font-black text-[var(--color-text)] mb-3">Tidak Ditemukan</h3>
                        <button onClick={resetAllFilters}
                            className="h-9 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                            Reset Filter
                        </button>
                    </div>

                ) : viewMode === 'timeline' ? (

                    /* ═══════════════════════════════════════════════════════════
                       TIMELINE VIEW
                       
                       Left rail breakdown (all measured from container left-edge):
                       ┌─────────────────────────────────────────────────────────┐
                       │  0px ← time text (w=44px, right-aligned) → 44px        │
                       │  44px ← 10px gap                                        │
                       │  54px ← dot center (8px dot: 50px→58px)                │
                       │  58px ← 14px gap                                        │
                       │  72px ← card starts                                     │
                       └─────────────────────────────────────────────────────────┘
                       Vertical line runs at x=54px (dot center).
                    ═══════════════════════════════════════════════════════════ */
                    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-300">
                        <div className="p-4 sm:p-5">

                            {/* Timeline container — mobile smaller padding left, desktop 64px (was 72px) */}
                            <div className="relative pl-[28px] sm:pl-[64px]">

                                {/* Vertical line at x=14px on mobile, x=48px on desktop (was 54px) */}
                                <div className="absolute top-0 bottom-0 pointer-events-none left-[14px] sm:left-[48px] w-px bg-gradient-to-b from-[var(--color-border)] via-[var(--color-border)] to-transparent z-0" />

                                {groupedReports.map(([date, items], gi) => (
                                    <div key={date} className={gi < groupedReports.length - 1 ? 'mb-7' : ''}>

                                        {/* ── Date header ── */}
                                        {/* Pull back to container edge, then re-pad to align badge */}
                                        <div className="relative mb-2.5 -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">
                                            {/* Large dot on the line */}
                                            <div className="absolute pointer-events-none left-[8px] sm:left-[42px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[var(--color-primary)] shadow-[0_0_0_4px_var(--color-background)] z-10" />
                                            <div className="flex items-center gap-3 bg-[var(--color-surface-alt)]/80 backdrop-blur-sm pl-4 pr-5 py-2 rounded-xl border border-[var(--color-border)] w-fit">
                                                <span className="text-[11px] font-black uppercase text-[var(--color-text)] tracking-wider">{fmtDayLabel(date)}</span>
                                                <span className="w-1 h-1 rounded-full bg-current opacity-20" />
                                                <span className="text-[9px] opacity-40 italic lowercase font-bold">{items.length} catatan</span>
                                            </div>
                                        </div>

                                        {/* ── Timeline items ── */}
                                        <div className="space-y-1.5">
                                            {items.map(r => {
                                                const isPos = (r.points ?? 0) > 0
                                                const stud = students.find(x => x.id === r.student_id)
                                                return (
                                                    <div key={r.id} className="relative group/item -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">

                                                        {/* Time — right-aligned in 0→36px zone. Hidden on mobile. */}
                                                        <div className="absolute pointer-events-none hidden sm:flex items-center justify-end left-0 top-1/2 -translate-y-1/2 w-[36px] z-[1]">
                                                            <span className="text-[9px] font-black tabular-nums leading-none text-[var(--color-text-muted)] opacity-40">
                                                                {fmtTime(r.reported_at)}
                                                            </span>
                                                        </div>

                                                        {/* Small colored dot — centered at line on desktop/mobile */}
                                                        <div className="absolute pointer-events-none left-[10px] sm:left-[44px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-[1]"
                                                            style={{
                                                                background: isPos ? '#10b981' : '#ef4444',
                                                                boxShadow: isPos ? '0 0 6px rgba(16,185,129,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                                                            }} />

                                                        {/* Card — z=2 so it renders over the line/dot visually */}
                                                        <div style={{ position: 'relative', zIndex: 2 }}
                                                            className={`rounded-xl border px-3 py-2.5 transition-all duration-150 ${selectedIds.includes(r.id)
                                                                ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/40 ring-1 ring-[var(--color-primary)]/20'
                                                                : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface-alt)]/50'
                                                                }`}>

                                                            <div className="flex items-center gap-2.5">
                                                                {/* Checkbox */}
                                                                <input type="checkbox"
                                                                    checked={selectedIds.includes(r.id)}
                                                                    onChange={() => toggleSelect(r.id)}
                                                                    className="w-3.5 h-3.5 flex-shrink-0 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />

                                                                {/* Avatar */}
                                                                <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-[10px] ${isPos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                                                    {(stud?.name || '?')[0].toUpperCase()}
                                                                </div>

                                                                {/* Body */}
                                                                <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-xs font-black text-[var(--color-text)] leading-tight">{mask(stud?.name || '—')}</span>
                                                                            {stud?.class_name && (
                                                                                <span className="px-1.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider flex-shrink-0 leading-[16px]">
                                                                                    {stud.class_name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-0.5">{getTypeName(r.violation_type_id)}</p>
                                                                        {r.notes && <p className="text-[10px] italic opacity-50 text-[var(--color-text-muted)] truncate">{mask(r.notes)}</p>}
                                                                        <div className="flex items-center gap-1 mt-1">
                                                                            <FontAwesomeIcon icon={faFilePen} className="text-[8px] opacity-25 text-[var(--color-text-muted)]" />
                                                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-30 text-[var(--color-text-muted)]">
                                                                                {mask(r.teacher_name || 'Unknown')}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    <span className={`min-w-[40px] text-center px-2 py-0.5 rounded-full text-[11px] font-black border ${isPos ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                                        {r.points > 0 ? '+' : ''}{r.points}
                                                                    </span>
                                                                </div>

                                                                {/* Action Menu for Mobile/Timeline */}
                                                                <div className="flex items-center gap-1 ml-auto">
                                                                    <button onClick={() => handleEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all">
                                                                        <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                                                                    </button>
                                                                    <button onClick={() => { setItemToDelete(r); setIsDeleteModalOpen(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all">
                                                                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Pagination INSIDE the timeline card */}
                        <PaginationStrip page={page} totalPages={totalPages} totalRows={totalRows}
                            fromRow={fromRow} toRow={toRow} pageSize={pageSize} onPage={setPage}
                            onPageSize={(val) => { setPageSize(val); setPage(1) }} />
                    </div>

                ) : (
                    /* ═══════════════════════════════════════════════════════════
                       TABLE VIEW — pagination inside the same card
                    ═══════════════════════════════════════════════════════════ */
                    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-300">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                    <tr>
                                        <th className="px-4 py-3.5 w-10 text-center">
                                            <input type="checkbox" checked={allSelected}
                                                onChange={() => setSelectedIds(allSelected ? [] : reports.map(r => r.id))}
                                                className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer" />
                                        </th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Siswa</th>
                                        {visibleCols.type && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Jenis Laporan</th>}
                                        {visibleCols.points && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Poin</th>}
                                        {visibleCols.time && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Waktu</th>}
                                        {visibleCols.teacher && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Dicatat Oleh</th>}
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-20 relative">
                                            <span>Aksi</span>
                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        setMenuPos({ top: rect.bottom + window.scrollY + 8, right: window.innerWidth - rect.right - window.scrollX })
                                                        setIsColMenuOpen(p => !p)
                                                    }}
                                                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}
                                                >
                                                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                </button>
                                                {isColMenuOpen && createPortal(
                                                    <div ref={colMenuRef} className="fixed z-[9999] w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 space-y-0.5 animate-in fade-in zoom-in-95 slide-in-from-top-2"
                                                        style={{ top: menuPos.top, right: menuPos.right }}>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                        {[
                                                            { key: 'type', label: 'Jenis Laporan' },
                                                            { key: 'points', label: 'Poin' },
                                                            { key: 'time', label: 'Waktu' },
                                                            { key: 'teacher', label: 'Dicatat Oleh' }
                                                        ].map(({ key, label }) => (
                                                            <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                <span className="text-[10px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)]">{label}</span>
                                                                <div className={`w-7 h-4 rounded-full transition-all flex items-center px-0.5 ${visibleCols[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                    <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-all ${visibleCols[key] ? 'translate-x-[12px]' : 'translate-x-0'}`} />
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
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {reports.map(r => {
                                        const isP = (r.points ?? 0) > 0
                                        const s = students.find(x => x.id === r.student_id)
                                        return (
                                            <tr key={r.id} className={`transition-colors group/row ${selectedIds.includes(r.id) ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/40'}`}>
                                                <td className="px-4 py-3 text-center">
                                                    <input type="checkbox" checked={selectedIds.includes(r.id)}
                                                        onChange={() => toggleSelect(r.id)}
                                                        className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer" />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] flex-shrink-0 ${isP ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                                            {(s?.name || '?')[0].toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-[var(--color-text)] leading-tight truncate max-w-[150px]">{mask(s?.name || '—')}</p>
                                                            {s?.class_name && <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider opacity-50">{s.class_name}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                {visibleCols.type && (
                                                    <td className="px-4 py-3">
                                                        <p className="text-xs font-bold text-[var(--color-text)]">{getTypeName(r.violation_type_id)}</p>
                                                        {r.notes && <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 italic truncate max-w-[180px]">{mask(r.notes)}</p>}
                                                    </td>
                                                )}
                                                {visibleCols.points && (
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded-full text-[11px] font-black border ${isP ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                            {r.points > 0 ? '+' : ''}{r.points}
                                                        </span>
                                                    </td>
                                                )}
                                                {visibleCols.time && (
                                                    <td className="px-4 py-3">
                                                        <p className="text-xs font-bold text-[var(--color-text)]">{fmtDate(r.reported_at)}</p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)] opacity-50 tabular-nums">{fmtTime(r.reported_at)}</p>
                                                    </td>
                                                )}
                                                {visibleCols.teacher && (
                                                    <td className="px-4 py-3">
                                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide opacity-50 truncate max-w-[100px]">{mask(r.teacher_name || '—')}</p>
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 text-center relative">
                                                    <div className="flex items-center justify-center gap-1 transition-opacity duration-150">
                                                        <button onClick={() => handleEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all">
                                                            <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                                                        </button>
                                                        <button onClick={() => { setItemToDelete(r); setIsDeleteModalOpen(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all">
                                                            <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination INSIDE the table card */}
                        <PaginationStrip page={page} totalPages={totalPages} totalRows={totalRows}
                            fromRow={fromRow} toRow={toRow} pageSize={pageSize} onPage={setPage}
                            onPageSize={(val) => { setPageSize(val); setPage(1) }} />
                    </div>
                )}

                {/* ── FLOATING BULK ACTION BAR ── */}
                {
                    selectedIds.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl px-3 py-2.5 flex items-center justify-between gap-3 text-white">
                                <div className="flex items-center gap-2.5 pl-1">
                                    <div className="w-8 h-8 rounded-xl bg-red-500 flex items-center justify-center font-black text-sm shadow-lg shadow-red-500/30 flex-shrink-0">
                                        {selectedIds.length}
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-none">Terpilih</p>
                                        <p className="text-[11px] font-bold leading-tight">Aksi Massal</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button onClick={() => setIsBulkDeleteOpen(true)}
                                        className="h-8 px-4 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        Hapus
                                    </button>
                                    <div className="w-px h-5 bg-white/10 mx-0.5" />
                                    <button onClick={() => setSelectedIds([])}
                                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/50 hover:text-white">
                                        <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* ── WIZARD MODAL ── */}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
                    title={selectedItem ? 'Edit Laporan' : 'Tambah Laporan Baru'} size="sm">
                    <div className="space-y-4 py-1">
                        {!selectedItem && (
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--color-surface-alt)]">
                                    <div className={`h-full bg-[var(--color-primary)] transition-all duration-500 ${currentStep === 1 ? 'w-1/2' : 'w-full'}`} />
                                </div>
                                <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest whitespace-nowrap">
                                    {currentStep} / 2
                                </span>
                            </div>
                        )}

                        {currentStep === 1 ? (
                            <div className="space-y-3 animate-in fade-in">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    Pilih siswa yang akan dilaporkan
                                </p>
                                <div className="grid grid-cols-[130px_1fr] gap-2">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1.5">Kelas</label>
                                        <select value={modalClassFilter} onChange={e => setModalClassFilter(e.target.value)}
                                            className="select-field w-full h-10 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold focus:border-[var(--color-primary)] transition-all">
                                            <option value="">Semua</option>
                                            {classesList.length === 0
                                                ? <option disabled>Memuat...</option>
                                                : classesList.map(c => <option key={c} value={c}>{c}</option>)
                                            }
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block mb-1.5">Cari Nama</label>
                                        <div className="relative">
                                            <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs pointer-events-none" />
                                            <input type="text" value={modalSearch} onChange={e => setModalSearch(e.target.value)}
                                                placeholder="Nama siswa..."
                                                className="input-field w-full h-10 pl-9 rounded-xl border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold focus:border-[var(--color-primary)] transition-all" />
                                        </div>
                                    </div>
                                </div>
                                <div className="max-h-[240px] overflow-y-auto space-y-1">
                                    {filteredStudentsForModal.length === 0 ? (
                                        <div className="py-10 text-center opacity-40">
                                            <FontAwesomeIcon icon={faSearch} className="text-xl mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">
                                                {students.length === 0 ? 'Memuat data...' : 'Tidak ditemukan'}
                                            </p>
                                        </div>
                                    ) : filteredStudentsForModal.map(s => (
                                        <button key={s.id}
                                            onClick={() => nextStep(s.id)}
                                            className={`w-full px-3 py-2.5 rounded-xl border transition-all text-left flex items-center justify-between group active:scale-[0.99] ${formData.student_id === s.id
                                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                : 'bg-[var(--color-surface-alt)]/60 border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0 ${formData.student_id === s.id ? 'bg-white/20 text-white' : 'bg-[var(--color-surface)] text-[var(--color-primary)]'}`}>
                                                    {s.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black leading-tight">{s.name}</p>
                                                    {s.class_name && (
                                                        <p className={`text-[9px] font-bold uppercase tracking-widest opacity-60 ${formData.student_id === s.id ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                                                            {s.class_name}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <FontAwesomeIcon icon={faChevronRight}
                                                className={`text-xs ${formData.student_id === s.id ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="p-3 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black flex-shrink-0">
                                        {(students.find(s => s.id === formData.student_id)?.name || '?')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest leading-none mb-0.5">Penerima Laporan</p>
                                        <p className="text-sm font-black text-[var(--color-text)] truncate">{students.find(s => s.id === formData.student_id)?.name}</p>
                                        {students.find(s => s.id === formData.student_id)?.class_name && (
                                            <p className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wide opacity-80">
                                                {students.find(s => s.id === formData.student_id)?.class_name}
                                            </p>
                                        )}
                                    </div>
                                    {!selectedItem && (
                                        <button onClick={() => setCurrentStep(1)}
                                            className="w-8 h-8 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex-shrink-0">
                                            <FontAwesomeIcon icon={faArrowLeft} className="text-xs" />
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block">
                                        Jenis Perilaku / Laporan
                                    </label>
                                    <select value={formData.violation_type_id}
                                        onChange={e => { setFormData({ ...formData, violation_type_id: e.target.value }); setFormErrors(p => ({ ...p, violation_type_id: '' })) }}
                                        className={`select-field w-full h-11 rounded-xl text-sm font-bold border-[var(--color-border)] bg-[var(--color-surface-alt)] focus:border-[var(--color-primary)] transition-all ${formErrors.violation_type_id ? 'border-red-500' : ''}`}>
                                        <option value="">Pilih kategori perilaku...</option>
                                        {violationTypes.map(vt => (
                                            <option key={vt.id} value={vt.id}>
                                                {vt.name} ({vt.points > 0 ? '+' : ''}{vt.points} Poin)
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.violation_type_id && (
                                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1">
                                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs" />
                                            {formErrors.violation_type_id}
                                        </p>
                                    )}
                                    {selectedVT && (
                                        <div className={`px-3 py-2 rounded-xl border flex items-center gap-2 animate-in zoom-in-95 ${selectedVT.points > 0 ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : 'bg-red-500/5 text-red-600 border-red-500/20'}`}>
                                            <FontAwesomeIcon icon={selectedVT.points > 0 ? faArrowUp : faArrowDown} className="text-xs" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">
                                                {selectedVT.points > 0 ? '+' : ''}{selectedVT.points} poin akan ditambahkan
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-widest block">
                                        Catatan <span className="normal-case font-medium opacity-50">(opsional)</span>
                                    </label>
                                    <textarea value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Detail kronologi jika diperlukan..."
                                        className="w-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl p-3 text-sm font-medium text-[var(--color-text)] outline-none min-h-[72px] focus:ring-2 ring-[var(--color-primary)]/20 transition-all resize-none" />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                            <button type="button" onClick={() => setIsModalOpen(false)}
                                className="h-10 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-colors text-[var(--color-text-muted)]">
                                Batal
                            </button>
                            {currentStep === 1 ? (
                                <button type="button" onClick={nextStep} disabled={!formData.student_id}
                                    className="h-10 flex-[2] rounded-xl bg-[var(--color-primary)] text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 transition-all flex items-center justify-center gap-2 hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20">
                                    Lanjut <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
                                </button>
                            ) : (
                                <button type="button" onClick={handleSubmit} disabled={submitting || !formData.violation_type_id}
                                    className="h-10 flex-[2] rounded-xl bg-[var(--color-primary)] text-white font-black text-[10px] uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-[var(--color-primary)]/20">
                                    {submitting
                                        ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                        : <><FontAwesomeIcon icon={selectedItem ? faEdit : faPlus} className="text-xs" />{selectedItem ? 'Update' : 'Simpan'}</>
                                    }
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>

                {/* ── DELETE MODAL ── */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Laporan">
                    <div className="space-y-4 py-2 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-[var(--color-text)] mb-1">Konfirmasi Hapus</h4>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium max-w-[240px] mx-auto leading-relaxed">
                                Apakah Anda yakin ingin menghapus laporan ini? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] font-black text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">Batal</button>
                            <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[2] rounded-xl bg-red-500 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* ── BULK DELETE MODAL ── */}
                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Hapus Massal">
                    <div className="space-y-4 py-2 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto text-2xl animate-bounce">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-[var(--color-text)] mb-1">Hapus {selectedIds.length} Laporan</h4>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium max-w-[240px] mx-auto leading-relaxed">
                                Anda akan menghapus {selectedIds.length} data secara permanen. Lanjutkan?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] font-black text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">Batal</button>
                            <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-[2] rounded-xl bg-red-500 text-white font-black text-[11px] uppercase tracking-widest shadow-lg shadow-red-500/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Hapus Sekarang'}
                            </button>
                        </div>
                    </div>
                </Modal>

            </div>
        </DashboardLayout >
    )
}