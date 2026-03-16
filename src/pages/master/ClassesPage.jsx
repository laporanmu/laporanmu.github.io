import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faTimes, faSpinner, faBuilding, faSchool, faBed,
    faUsers, faFilter, faSliders, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faTrash, faEye, faEyeSlash, faXmark, faDownload, faUpload, faBoxArchive, faRotateLeft,
    faKeyboard, faLink, faCheck, faChevronDown,
    faFileImport, faFileExport
} from '@fortawesome/free-solid-svg-icons'

import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import { useDebounce } from '../../hooks/useDebounce'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

// Library for Export/Import
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Components
import { ClassRow, ClassMobileCard } from '../../components/classes/ClassRow'
import ClassFormModal from '../../components/classes/ClassFormModal'

const LEVELS = ['7', '8', '9', '10', '11', '12']
const PROGRAMS = ['Boarding', 'Reguler']
const LS_COLS = 'classes_columns'
const LS_PAGE_SIZE = 'classes_page_size'

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function ClassesPage() {
    const { addToast } = useToast()
    const { enabled: canEdit } = useFlag('access.teacher_classes')
    const [classes, setClasses] = useState([])
    const [archivedClasses, setArchivedClasses] = useState([])
    const [teachersList, setTeachersList] = useState([])
    const [academicYearsList, setAcademicYearsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Stats
    const [stats, setStats] = useState({ total: 0, boarding: 0, reguler: 0, totalStudents: 0 })

    // UI states
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 350)
    const [filterLevel, setFilterLevel] = useState('')
    const [filterProgram, setFilterProgram] = useState('')
    const [sortBy, setSortBy] = useState('name')
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [filterNoTeacher, setFilterNoTeacher] = useState(false)
    const [filterCrowded, setFilterCrowded] = useState(false)
    const filterRef = useRef(null)

    // Privacy Mode
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const shortcutRef = useRef(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [jumpPage, setJumpPage] = useState('')

    // Refs
    const searchInputRef = useRef(null)

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')

    // Header & Columns
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
    const [isSlidersOpen, setIsSlidersOpen] = useState(false)
    const headerMenuRef = useRef(null)
    const colMenuRef = useRef(null)
    const slidersRef = useRef(null)
    const defaultCols = { level: true, program: true, gender: true, teacher: true, students: true, year: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })

    // ── DATA FETCHING ──────────────────────────────────────────────
    const loadMetadata = useCallback(async () => {
        if (!supabase) return { t: {}, y: {} }
        try {
            const [tRes, yRes] = await Promise.all([
                // Hapus filter status — tampilkan semua guru yang belum di-soft-delete
                // Filter .eq('status','active') menyebabkan FK error jika nilai status di DB berbeda
                supabase.from('teachers').select('id, name').order('name'),
                supabase.from('academic_years').select('id, name, semester').order('name', { ascending: false })
            ])
            const tList = tRes.data || []
            const yList = (yRes.data || []).map(y => ({ ...y, label: [y.name, y.semester].filter(Boolean).join(' ') || '—' }))
            setTeachersList(tList); setAcademicYearsList(yList)
            return { t: Object.fromEntries(tList.map(t => [t.id, t.name || '—'])), y: Object.fromEntries(yList.map(y => [y.id, y.label])) }
        } catch { return { t: {}, y: {} } }
    }, [])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { t: tMap, y: yMap } = await loadMetadata()
            let q = supabase.from('classes').select('id, name, grade, major, homeroom_teacher_id, academic_year_id, created_at, students(count)').order('name')
            const { data, error } = await q
            if (!error && data) {
                const mapped = data.map(row => ({
                    ...row,
                    teacherName: row.homeroom_teacher_id ? (tMap[row.homeroom_teacher_id] || '—') : '—',
                    academicYearName: row.academic_year_id ? (yMap[row.academic_year_id] || '—') : '—',
                    students: row.students?.[0]?.count ?? 0,
                }))
                setClasses(mapped)
                const s = { total: mapped.length, boarding: 0, reguler: 0, totalStudents: 0 }
                mapped.forEach(c => { if (c.major?.includes('Boarding')) s.boarding++; else s.reguler++; s.totalStudents += (c.students || 0) })
                setStats(s)
            }
        } catch (err) { console.error(err) }
        finally { setLoading(false) }
    }, [loadMetadata])

    const fetchArchived = useCallback(async () => {
        // Soft delete not supported by schema
        setArchivedClasses([])
    }, [])

    const handleRestore = async (id) => {
        try {
            const { error } = await supabase.from('classes').update({ deleted_at: null }).eq('id', id)
            if (error) throw error
            addToast('Kelas berhasil dipulihkan', 'success'); fetchArchived(); fetchData()
        } catch { addToast('Gagal memulihkan kelas', 'error') }
    }

    const handlePermanentDelete = async (id) => {
        if (!confirm('Hapus permanen kelas ini? Data tidak bisa dikembalikan.')) return
        try {
            const { error } = await supabase.from('classes').delete().eq('id', id)
            if (error) throw error
            addToast('Kelas dihapus permanen', 'success'); fetchArchived()
        } catch { addToast('Gagal menghapus permanen', 'error') }
    }

    const fetchDataRef = useRef(fetchData)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])
    useEffect(() => { fetchData() }, [fetchData])

    useEffect(() => {
        if (isArchivedModalOpen) fetchArchived()
    }, [isArchivedModalOpen, fetchArchived])

    // ── UI EFFECTS ─────────────────────────────────────────────────
    useEffect(() => { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) }, [visibleCols])
    useEffect(() => { localStorage.setItem(LS_PAGE_SIZE, pageSize) }, [pageSize])

    const isAnyModalOpen = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen || isImportModalOpen || isArchivedModalOpen

    // Active Filter Count
    const activeFilterCount = (filterLevel ? 1 : 0) + (filterProgram ? 1 : 0) + (filterNoTeacher ? 1 : 0) + (filterCrowded ? 1 : 0)
    const resetAllFilters = () => { setSearchQuery(''); setFilterLevel(''); setFilterProgram(''); setFilterNoTeacher(false); setFilterCrowded(false) }

    // Click Outside
    useEffect(() => {
        const handler = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false)
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false)
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
            if (slidersRef.current && !slidersRef.current.contains(e.target)) setIsSlidersOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isAnyModalOpen) return
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.key === '?') { e.preventDefault(); setIsShortcutOpen(v => !v) }
            if (e.key === 'n') { e.preventDefault(); handleAdd() }
            if (e.key === 'p') { e.preventDefault(); setIsPrivacyMode(v => !v) }
            if (e.key === 'r') { e.preventDefault(); fetchData() }
            if (e.key === 'x') { e.preventDefault(); resetAllFilters() }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isAnyModalOpen, fetchData])

    // Realtime
    useEffect(() => {
        const ch = supabase.channel('classes-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => fetchDataRef.current?.()).subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    // Filter & Sort Logic
    const filteredClasses = useMemo(() => {
        let result = classes.filter(c => {
            const q = debouncedSearch.toLowerCase()
            const matchSearch = !q || c.name.toLowerCase().includes(q) || (c.major || '').toLowerCase().includes(q) || (c.teacherName || '').toLowerCase().includes(q)
            const matchLevel = !filterLevel || c.grade === filterLevel
            const matchProg = !filterProgram || (c.major || '').includes(filterProgram)
            const matchNoTeacher = !filterNoTeacher || !c.homeroom_teacher_id
            const matchCrowded = !filterCrowded || c.students > 35
            return matchSearch && matchLevel && matchProg && matchNoTeacher && matchCrowded
        })
        if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
        else if (sortBy === 'level') result.sort((a, b) => (a.grade || '').localeCompare(b.grade || '') || a.name.localeCompare(b.name))
        else if (sortBy === 'students') result.sort((a, b) => (b.students || 0) - (a.students || 0))
        return result
    }, [classes, debouncedSearch, filterLevel, filterProgram, sortBy])

    const totalRows = filteredClasses.length
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)
    const pagedClasses = filteredClasses.slice((page - 1) * pageSize, page * pageSize)

    useEffect(() => { setPage(1) }, [debouncedSearch, filterLevel, filterProgram, sortBy, filterNoTeacher, filterCrowded])

    // Insights
    const insights = useMemo(() => {
        const results = []
        const noTeacher = classes.filter(c => !c.homeroom_teacher_id)
        if (noTeacher.length > 0) results.push({
            id: 'noTeacher',
            label: `${noTeacher.length} Kelas Tanpa Wali`,
            desc: 'Wali kelas belum ditentukan',
            icon: faUsers,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            onClick: () => { setFilterNoTeacher(v => !v); setFilterCrowded(false); setIsFilterOpen(true) },
            active: filterNoTeacher
        })

        const crowded = classes.filter(c => c.students > 35)
        if (crowded.length > 0) results.push({
            id: 'crowded',
            label: `${crowded.length} Kelas Padat`,
            desc: 'Populasi siswa > 35 anak',
            icon: faSchool,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            onClick: () => { setFilterCrowded(v => !v); setFilterNoTeacher(false); setIsFilterOpen(true) },
            active: filterCrowded
        })

        return results
    }, [classes, filterNoTeacher, filterCrowded])

    // Handlers
    const handleSubmit = async (formData) => {
        setSubmitting(true)
        const finalMajor = [formData.program, formData.gender_type].filter(Boolean).join(' ')
        const payload = { name: formData.name, grade: formData.level, major: finalMajor, homeroom_teacher_id: formData.homeroom_teacher_id || null, academic_year_id: formData.academic_year_id || null }
        try {
            if (selectedItem) { const { error } = await supabase.from('classes').update(payload).eq('id', selectedItem.id); if (error) throw error; addToast('Data kelas berhasil diupdate', 'success') }
            else { const { error } = await supabase.from('classes').insert(payload); if (error) throw error; addToast('Kelas baru berhasil ditambahkan', 'success') }
            setIsModalOpen(false); fetchData()
        } catch (err) { addToast(err.message || 'Gagal menyimpan data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return; setSubmitting(true)
        try {
            const { error } = await supabase.from('classes').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast('Kelas berhasil dihapus', 'success'); setIsDeleteModalOpen(false); fetchData()
        } catch { addToast('Gagal mengarsipkan kelas', 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('classes').delete().in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} kelas berhasil dihapus`, 'success'); setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData()
        } catch { addToast('Gagal menghapus kelas', 'error') }
        finally { setSubmitting(false) }
    }

    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => {
        const ids = pagedClasses.map(c => c.id)
        setSelectedIds(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
    }
    const allSelected = pagedClasses.length > 0 && pagedClasses.every(c => selectedIds.includes(c.id))

    const toggleColumn = (key) => setVisibleCols(prev => ({ ...prev, [key]: !prev[key] }))

    // Export Logic
    const getExportData = async () => {
        let q = supabase.from('classes').select('name, grade, major, homeroom_teacher_id, academic_year_id, students(count)').order('name')
        if (exportScope === 'filtered') {
            if (filterLevel) q = q.eq('grade', filterLevel)
            if (filterProgram) q = q.ilike('major', `%${filterProgram}%`)
        } else if (exportScope === 'selected') {
            q = q.in('id', selectedIds)
        }
        const { data, error } = await q; if (error) throw error
        const { t: tMap, y: yMap } = await loadMetadata()
        return (data || []).map(c => ({
            'Nama Kelas': c.name || '-',
            'Tingkat': c.grade || '-',
            'Program/Major': c.major || '-',
            'Wali Kelas': c.homeroom_teacher_id ? (tMap[c.homeroom_teacher_id] || '-') : '-',
            'Tahun Ajaran': c.academic_year_id ? (yMap[c.academic_year_id] || '-') : '-',
            'Jumlah Siswa': c.students?.[0]?.count || 0
        }))
    }

    const handleExportCSV = async () => {
        setExporting(true)
        try {
            const data = await getExportData(); if (!data.length) return addToast('Tidak ada data', 'warning')
            const blob = new Blob([Papa.unparse(data)], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `data_kelas_${new Date().toISOString().slice(0, 10)}.csv`); link.click()
            addToast(`Export CSV berhasil (${data.length} kelas)`, 'success')
        } catch { addToast('Gagal export CSV', 'error') }
        finally { setExporting(false); setIsExportModalOpen(false) }
    }

    const handleExportExcel = async () => {
        setExporting(true)
        try {
            const data = await getExportData(); if (!data.length) return addToast('Tidak ada data', 'warning')
            const ws = XLSX.utils.json_to_sheet(data); ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Kelas')
            XLSX.writeFile(wb, `data_kelas_${new Date().toISOString().slice(0, 10)}.xlsx`)
            addToast(`Export Excel berhasil (${data.length} kelas)`, 'success')
        } catch { addToast('Gagal export Excel', 'error') }
        finally { setExporting(false); setIsExportModalOpen(false) }
    }

    const activeFilterCountVal = activeFilterCount
    // remove resetAllFilters from here as it's defined above

    return (
        <DashboardLayout title="Data Kelas" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>{isAnyModalOpen ? ` .top-nav, .sidebar, .floating-dock { display: none !important; } main { padding-top: 0 !important; } ` : ''}</style>
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
                {/* Privacy Banner */}
                {isPrivacyMode && (
                    <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                            <FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor
                        </div>
                        <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                    </div>
                )}

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit data kelas dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Kelas</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola {stats.total} data kelas aktif dalam sistem laporan.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Sliders dropdown (Opsi) */}
                        <div className="relative" ref={headerMenuRef}>
                            <button
                                onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Opsi Lanjutan"><FontAwesomeIcon icon={faSliders} /></button>
                            {isHeaderMenuOpen && (
                                <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-[calc(100%+8px)] -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[320px] sm:w-56 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsImportModalOpen(true) }}
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
                                    <p className="px-3 py-2 text-[10px] text-[var(--color-text-muted)] italic">Fitur arsip tidak tersedia untuk tabel ini.</p>
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
                        {/* Shortcut toggle */}
                        <div className="relative" ref={shortcutRef}>
                            <button onClick={() => setIsShortcutOpen(!isShortcutOpen)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                title="Keyboard Shortcuts (?)"><FontAwesomeIcon icon={faKeyboard} className="text-sm" /></button>
                            {isShortcutOpen && (
                                <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-11 -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[340px] sm:w-72 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Shortcuts</p>
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                    </div>
                                    <div className="p-3 space-y-0.5">
                                        {[{ section: 'Navigasi' }, { keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { keys: ['Esc'], label: 'Tutup / deselect' }, { section: 'Aksi' }, { keys: ['N'], label: 'Tambah kelas baru' }, { keys: ['P'], label: 'Toggle privacy mode' }, { keys: ['X'], label: 'Reset semua filter' }].map((item, i) => item.section ? (
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
                        <button onClick={handleAdd} disabled={!canEdit} className="h-9 px-4 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                            <FontAwesomeIcon icon={faPlus} /> {canEdit ? 'Tambah' : 'Read-only'}
                        </button>
                    </div>
                </div>


                {/* Stats Overview */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                        { icon: faSchool, label: 'Total Kelas', value: stats.total, top: 'border-t-[var(--color-primary)]', ibg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', hover: 'hover:bg-[var(--color-primary)]/5' },
                        { icon: faBed, label: 'Boarding', value: stats.boarding, top: 'border-t-amber-500', ibg: 'bg-amber-500/10 text-amber-500', hover: 'hover:bg-amber-500/5' },
                        { icon: faBuilding, label: 'Reguler', value: stats.reguler, top: 'border-t-emerald-500', ibg: 'bg-emerald-500/10 text-emerald-500', hover: 'hover:bg-emerald-500/5' },
                        { icon: faUsers, label: 'Total Siswa', value: stats.totalStudents, top: 'border-t-pink-500', ibg: 'bg-pink-500/10 text-pink-500', hover: 'hover:bg-pink-500/5' },
                    ].map((s, i) => (
                        <div key={i} className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.top} flex items-center gap-3 group ${s.hover} transition-all`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0 ${s.ibg}`}><FontAwesomeIcon icon={s.icon} /></div>
                            <div>
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">{s.label}</p>
                                <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{s.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Insights Row — Repositioned below stats */}
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

                {/* Filters & Actions */}
                <div className="bg-[var(--color-surface)] rounded-2xl mb-6 border border-[var(--color-border)] overflow-hidden shadow-sm">
                    {/* Row 1: Search + Main Actions */}
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
                                placeholder="Cari nama kelas atau wali kelas... (Ctrl+K)"
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                    <FontAwesomeIcon icon={faTimes} className="text-xs" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isFilterOpen || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Expandable Filter Panel */}
                    {isFilterOpen && (
                        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 animate-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Tingkat / Grade</label>
                                    <select
                                        value={filterLevel}
                                        onChange={e => setFilterLevel(e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] transition-all appearance-none"
                                    >
                                        <option value="">Semua Tingkat</option>
                                        {LEVELS.map(l => <option key={l} value={l}>Kelas {l}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Program</label>
                                    <select
                                        value={filterProgram}
                                        onChange={e => setFilterProgram(e.target.value)}
                                        className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] transition-all appearance-none"
                                    >
                                        <option value="">Semua Program</option>
                                        {PROGRAMS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Urutan</label>
                                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] transition-all appearance-none">
                                        <option value="name">Nama (A-Z)</option>
                                        <option value="level">Tingkat</option>
                                        <option value="students">Populasi Siswa</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-end gap-2 mt-4">
                                <button
                                    onClick={resetAllFilters}
                                    className="flex-1 h-9 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center justify-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} />
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                        <p className="text-sm font-black text-[var(--color-primary)] tracking-tight">{selectedIds.length} kelas dipilih</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"><FontAwesomeIcon icon={faTrash} /> Hapus</button>
                            <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-text)] transition-all"><FontAwesomeIcon icon={faXmark} /> Batal</button>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="p-6 space-y-4"><div className="hidden md:block"><TableSkeleton rows={8} cols={7} /></div><div className="md:hidden"><CardSkeleton count={4} /></div></div>
                    ) : totalRows === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                            <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] opacity-40"><FontAwesomeIcon icon={faSchool} className="text-2xl" /></div>
                            <h3 className="text-base font-black text-[var(--color-text)] mb-2 uppercase tracking-wide">Data Tidak Ditemukan</h3>
                            <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs leading-relaxed font-bold uppercase tracking-widest opacity-60">Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.</p>
                            <button onClick={() => { setSearchQuery(''); setFilterLevel(''); setFilterProgram('') }} className="mt-6 h-9 px-5 rounded-xl border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all">Clear Filter</button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto whitespace-nowrap hidden md:block">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                                        <tr>
                                            <th className="px-6 py-4 w-16 text-center"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer" /></th>
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Identitas Kelas</th>
                                            {visibleCols.level && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Level</th>}
                                            {visibleCols.program && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Program</th>}
                                            {visibleCols.gender && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Gender</th>}
                                            {visibleCols.teacher && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Wali Kelas</th>}
                                            {visibleCols.students && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Siswa</th>}
                                            {visibleCols.year && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center">Akademik</th>}
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span>Aksi</span>
                                                    <div className="relative">
                                                        <button onClick={(e) => {
                                                            const rect = e.currentTarget.getBoundingClientRect()
                                                            const menuHeight = 280
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
                                                                {[{ key: 'level', label: 'Tingkat' }, { key: 'program', label: 'Program Studi' }, { key: 'gender', label: 'Gender / Tipe' }, { key: 'teacher', label: 'Wali Kelas' }, { key: 'students', label: 'Jumlah Siswa' }, { key: 'year', label: 'Tahun Akademik' }].map(({ key, label }) => (
                                                                    <button key={key} onClick={() => toggleColumn(key)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
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
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedClasses.map(cls => (
                                            <ClassRow key={cls.id} cls={cls} selectedIds={selectedIds} toggleSelect={toggleSelect} visibleCols={visibleCols} handleEdit={handleEdit} setItemToDelete={setItemToDelete} setIsDeleteModalOpen={setIsDeleteModalOpen} isPrivacyMode={isPrivacyMode} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden divide-y divide-[var(--color-border)]">
                                {pagedClasses.map(cls => (
                                    <ClassMobileCard key={cls.id} cls={cls} selectedIds={selectedIds} toggleSelect={toggleSelect} handleEdit={handleEdit} setItemToDelete={setItemToDelete} setIsDeleteModalOpen={setIsDeleteModalOpen} />
                                ))}
                            </div>
                            {/* Compact Pagination */}
                            <div className="px-6 py-5 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}–{toRow} dari {totalRows} kelas</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 mr-2 pr-3 border-r border-[var(--color-border)]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] whitespace-nowrap">Baris:</span>
                                        <select
                                            value={pageSize}
                                            onChange={e => {
                                                const val = Number(e.target.value)
                                                setPageSize(val)
                                                setPage(1)
                                            }}
                                            className="bg-transparent text-[10px] font-black text-[var(--color-text)] outline-none cursor-pointer hover:text-[var(--color-primary)] transition-all"
                                        >
                                            {[10, 25, 50, 100].map(v => (
                                                <option key={v} value={v} className="bg-[var(--color-surface)] text-[var(--color-text)]">{v}</option>
                                            ))}
                                        </select>
                                    </div>
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
                        </>
                    )}
                </div>

                {/* Modals */}
                <ClassFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} selectedItem={selectedItem} teachersList={teachersList} academicYearsList={academicYearsList} onSubmit={handleSubmit} submitting={submitting} />

                {/* Delete Modal */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Kelas" size="sm">
                    <div className="space-y-6">
                        <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-4 text-red-500 border border-red-500/20 shadow-inner">
                            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><FontAwesomeIcon icon={faTrash} /></div>
                            <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider italic">Konfirmasi Hapus</h3><p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">Penghapusan tidak dapat dibatalkan.</p></div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Yakin menghapus kelas <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20 italic">{itemToDelete?.name}</span>? <span className="text-[10px] text-[var(--color-text-muted)] mt-2 block opacity-60">Siswa yang terdaftar akan kehilangan referensi kelas.</span></p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest transition-all">BATAL</button>
                            <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">{submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}</button>
                        </div>
                    </div>
                </Modal>

                {/* Export Modal */}
                <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Data Kelas" size="sm">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Rentang Data</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setExportScope('filtered')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${exportScope === 'filtered' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>Filter Aktif</button>
                                <button onClick={() => setExportScope('all')} className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${exportScope === 'all' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>Semua Data</button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button onClick={handleExportExcel} disabled={exporting} className="w-full h-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.15em] shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                                {exporting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faDownload} /> EXPORT EXCEL (.XLSX)</>}
                            </button>
                            <button onClick={handleExportCSV} disabled={exporting} className="w-full h-12 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
                                <FontAwesomeIcon icon={faDownload} /> EXPORT CSV (.CSV)
                            </button>
                        </div>
                    </div>
                </Modal>


                {/* Arsip Kelas Modal */}
                <Modal isOpen={isArchivedModalOpen} onClose={() => setIsArchivedModalOpen(false)} title="Arsip Kelas" size="lg">
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-relaxed">
                                Kelas di bawah ini telah diarsipkan. Anda dapat memulihkan kembali ke daftar aktif atau menghapusnya secara permanen.
                            </p>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {archivedClasses.length === 0 ? (
                                <div className="py-12 text-center opacity-40">
                                    <FontAwesomeIcon icon={faBoxArchive} className="text-4xl mb-3" />
                                    <p className="text-xs font-black uppercase tracking-widest">Tidak ada arsip</p>
                                </div>
                            ) : archivedClasses.map(ac => (
                                <div key={ac.id} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between group">
                                    <div>
                                        <h4 className="text-sm font-black text-[var(--color-text)]">{ac.name}</h4>
                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">
                                            Level {ac.grade} • {ac.major} • Diarsipkan {new Date(ac.deleted_at).toLocaleDateString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleRestore(ac.id)} title="Pulihkan" className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all">
                                            <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
                                        </button>
                                        <button onClick={() => handlePermanentDelete(ac.id)} title="Hapus Permanen" className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all">
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setIsArchivedModalOpen(false)} className="w-full h-11 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">TUTUP</button>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    )
}