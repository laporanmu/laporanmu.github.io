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
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { useDebounce } from '../../hooks/useDebounce'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

// Library for Export/Import
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

// Components
import { ClassRow, ClassMobileCard } from '../../components/classes/ClassRow'
import ClassFormModal from '../../components/classes/ClassFormModal'
import Pagination from '../../components/ui/Pagination'


const LEVELS = ['7', '8', '9', '10', '11', '12']
const PROGRAMS = ['Boarding', 'Reguler']
const LS_COLS = 'classes_columns'
const LS_PAGE_SIZE = 'classes_page_size'



export default function ClassesPage() {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const { enabled: canEdit } = useFlag('access.teacher_classes')
    const [classes, setClasses] = useState([])
    const [archivedClasses, setArchivedClasses] = useState([])
    const [teachersList, setTeachersList] = useState([])
    const [academicYearsList, setAcademicYearsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Stats
    const [stats, setStats] = useState({ total: 0, boarding: 0, reguler: 0, totalStudents: 0 })

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 4

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

    // Privasi Mode
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

    // Import
    const [importTab, setImportTab] = useState('guideline') // 'guideline' | 'preview'
    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importDupes, setImportDupes] = useState([])
    const [importSkip, setImportSkip] = useState(true)
    const [importDrag, setImportDrag] = useState(false)
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })

    // Header & Columns
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
    const [isSlidersOpen, setIsSlidersOpen] = useState(false)
    const headerMenuRef = useRef(null)
    const colMenuRef = useRef(null)
    const slidersRef = useRef(null)
    const importFileRef = useRef(null)
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
            addToast('Kelas berhasil dipulihkan', 'success'); await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'classes', recordId: id, oldData: { id, restored: false }, newData: { deleted_at: null, restored: true } }); fetchArchived(); fetchData()
        } catch { addToast('Gagal memulihkan kelas', 'error') }
    }

    const handlePermanentDelete = async (id) => {
        if (!confirm('Hapus permanen kelas ini? Data tidak bisa dikembalikan.')) return
        try {
            const { error } = await supabase.from('classes').delete().eq('id', id)
            if (error) throw error
            addToast('Kelas dihapus permanen', 'success'); await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'classes', recordId: id, oldData: { permanent_delete: true } }); fetchArchived()
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
    }, [classes, debouncedSearch, filterLevel, filterProgram, filterNoTeacher, filterCrowded, sortBy])

    const totalRows = filteredClasses.length

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
            if (selectedItem) { const { error } = await supabase.from('classes').update(payload).eq('id', selectedItem.id); if (error) throw error; addToast('Data kelas berhasil diupdate', 'success'); await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'classes', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } }) }
            else { const { data: insData, error } = await supabase.from('classes').insert(payload).select().single(); if (error) throw error; addToast('Kelas baru berhasil ditambahkan', 'success'); await logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'classes', recordId: insData?.id, newData: payload }) }
            setIsModalOpen(false); fetchData()
        } catch (err) { addToast(err.message || 'Gagal menyimpan data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return; setSubmitting(true)
        try {
            const { error } = await supabase.from('classes').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast('Kelas berhasil dihapus', 'success'); await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'classes', recordId: itemToDelete.id, oldData: itemToDelete }); setIsDeleteModalOpen(false); fetchData()
        } catch { addToast('Gagal mengarsipkan kelas', 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('classes').delete().in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} kelas berhasil dihapus`, 'success'); await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'classes', newData: { bulk: true, count: selectedIds.length, ids: selectedIds } }); setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData()
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
            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'classes',
                newData: {
                    format: 'csv',
                    scope: exportScope,
                    count: data.length
                }
            })
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
            await logAudit({
                action: 'EXPORT',
                source: 'MASTER',
                tableName: 'classes',
                newData: {
                    format: 'xlsx',
                    scope: exportScope,
                    count: data.length
                }
            })
        } catch { addToast('Gagal export Excel', 'error') }
        finally { setExporting(false); setIsExportModalOpen(false) }
    }

    // ── Import Logic ──────────────────────────────────────────────────────────
    const handleDownloadTemplate = async () => {
        const templateData = [
            { 'Nama Kelas': 'VII A', 'Tingkat': '7', 'Program': 'Reguler', 'Tipe Gender': 'Putra', 'Wali Kelas': '', 'Tahun Ajaran': '' },
            { 'Nama Kelas': 'VIII Boarding A', 'Tingkat': '8', 'Program': 'Boarding', 'Tipe Gender': 'Putri', 'Wali Kelas': '', 'Tahun Ajaran': '' },
        ]
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 20 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template Import Kelas')
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'Template_Import_Kelas.xlsx'
        link.click()
        setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    }

    const processImportFile = async (file) => {
        if (!file) return
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportDupes([])
        setImportTab('preview')

        try {
            let rows = []
            if (ext.endsWith('.csv')) {
                rows = await new Promise(res =>
                    Papa.parse(file, { header: true, skipEmptyLines: true, complete: r => res(r.data) })
                )
            } else {
                rows = await new Promise(res => {
                    const reader = new FileReader()
                    reader.onload = e => {
                        const wb = XLSX.read(e.target.result, { type: 'array' })
                        res(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }))
                    }
                    reader.readAsArrayBuffer(file)
                })
            }

            if (!rows.length) { addToast('File kosong atau tidak terbaca', 'error'); return }

            // Fetch latest metadata for matching
            const { t: tMap, y: yMap } = await loadMetadata()
            const teacherByName = Object.fromEntries(
                teachersList.map(t => [t.name.toLowerCase().trim(), t.id])
            )
            const yearByLabel = Object.fromEntries(
                academicYearsList.map(y => [y.label.toLowerCase().trim(), y.id])
            )

            const issues = [], dupes = []
            const preview = rows.map((row, i) => {
                const name = (row['Nama Kelas'] || row['nama_kelas'] || row['name'] || '').toString().trim()
                const grade = (row['Tingkat'] || row['grade'] || row['level'] || '').toString().trim()
                const program = (row['Program'] || row['program'] || '').toString().trim()
                const genderType = (row['Tipe Gender'] || row['tipe_gender'] || row['gender_type'] || '').toString().trim()
                const teacherRaw = (row['Wali Kelas'] || row['wali_kelas'] || row['teacher'] || '').toString().trim()
                const yearRaw = (row['Tahun Ajaran'] || row['tahun_ajaran'] || row['year'] || '').toString().trim()

                const rowIssues = []
                if (!name) rowIssues.push({ level: 'error', msg: 'Nama Kelas tidak boleh kosong' })
                if (!grade) rowIssues.push({ level: 'error', msg: 'Tingkat tidak boleh kosong' })
                else if (!LEVELS.includes(grade)) rowIssues.push({ level: 'error', msg: `Tingkat "${grade}" tidak valid. Gunakan: ${LEVELS.join(', ')}` })

                if (program && !PROGRAMS.includes(program))
                    rowIssues.push({ level: 'warn', msg: `Program "${program}" tidak dikenali, akan digunakan apa adanya` })

                // Resolve teacher ID
                const homeroom_teacher_id = teacherRaw
                    ? (teacherByName[teacherRaw.toLowerCase()] || null)
                    : null
                if (teacherRaw && !homeroom_teacher_id)
                    rowIssues.push({ level: 'warn', msg: `Wali kelas "${teacherRaw}" tidak ditemukan, akan dikosongkan` })

                // Resolve academic year ID
                const academic_year_id = yearRaw
                    ? (yearByLabel[yearRaw.toLowerCase()] || null)
                    : null
                if (yearRaw && !academic_year_id)
                    rowIssues.push({ level: 'warn', msg: `Tahun ajaran "${yearRaw}" tidak ditemukan, akan dikosongkan` })

                if (rowIssues.length)
                    issues.push({ row: i + 2, level: rowIssues[0].level, messages: rowIssues.map(x => x.msg) })

                // Compose major from program + genderType
                const major = [program, genderType].filter(Boolean).join(' ') || null

                return {
                    _row: i,
                    name,
                    grade,
                    major,
                    homeroom_teacher_id,
                    academic_year_id,
                    _teacherRaw: teacherRaw,
                    _yearRaw: yearRaw,
                    _hasError: rowIssues.some(x => x.level === 'error'),
                }
            })

            // Detect duplicate names in file
            preview.forEach((row, i) => {
                if (row.name && preview.slice(0, i).some(p => p.name.toLowerCase() === row.name.toLowerCase())) {
                    dupes.push(i)
                    issues.push({ row: i + 2, level: 'dupe', messages: [`Nama kelas "${row.name}" duplikat dalam file`] })
                }
            })

            setImportPreview(preview)
            setImportIssues(issues)
            setImportDupes(dupes)
        } catch {
            addToast('Gagal membaca file import', 'error')
        }
    }

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    const handleCommitImport = async () => {
        if (!importPreview.length) { addToast('Tidak ada data untuk diimport', 'error'); return }
        if (hasImportBlockingErrors) { addToast('Masih ada ERROR. Perbaiki file dulu.', 'error'); return }

        const dupeSet = new Set(importDupes)
        const errRows = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        const validRows = importPreview.filter((_, i) => !errRows.has(i) && !(importSkip && dupeSet.has(i)))

        if (!validRows.length) { addToast('Tidak ada baris valid untuk diimport', 'warning'); return }

        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })

        try {
            const CHUNK = 50
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({
                    name: r.name,
                    grade: r.grade,
                    major: r.major || null,
                    homeroom_teacher_id: r.homeroom_teacher_id || null,
                    academic_year_id: r.academic_year_id || null,
                }))
                const { error } = await supabase.from('classes').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }

            addToast(`Berhasil import ${validRows.length} kelas`, 'success')
            await logAudit({
                action: 'INSERT',
                source: 'SYSTEM',
                tableName: 'classes',
                newData: { bulk_import: true, count: validRows.length }
            })

            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportDupes([])
            setImportFileName('')
            setImportTab('guideline')
            fetchData()
        } catch {
            addToast('Gagal import (cek constraint DB / duplikat / koneksi)', 'error')
        } finally {
            setImporting(false)
        }
    }

    const activeFilterCountVal = activeFilterCount
    // remove resetAllFilters from here as it's defined above

    const hasAnyActiveFilter = Boolean(
        searchQuery ||
        filterLevel ||
        filterProgram ||
        filterNoTeacher ||
        filterCrowded
    )

    return (
        <DashboardLayout title="Data Kelas" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>{isAnyModalOpen ? ` .top-nav, .sidebar, .floating-dock { display: none !important; } main { padding-top: 0 !important; } ` : ''}</style>
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
                {/* Privasi Banner */}
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
                        <Breadcrumb badge="Master Data" items={['Class Management']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Kelas</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola {stats.total} data kelas aktif dalam sistem laporan.</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold opacity-60">
                            Gunakan import Excel untuk input massal dan filter di atas tabel untuk fokus ke tingkat tertentu.
                        </p>
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
                                    <p className="px-3 py-2 text-[10px] text-[var(--color-text-muted)]">Fitur arsip tidak tersedia untuk tabel ini.</p>
                                </div>
                            )}
                        </div>

                        {/* Shortcut toggle */}
                        <div className="relative" ref={shortcutRef}>
                            <button onClick={() => setIsShortcutOpen(!isShortcutOpen)}
                                className={`hidden sm:flex h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
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

                        <button onClick={handleAdd} disabled={!canEdit} className="h-9 px-3 sm:px-5 rounded-lg btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100">
                            <FontAwesomeIcon icon={faPlus} />
                            <span className="hidden sm:inline">{canEdit ? 'Tambah' : 'Read-only'}</span>
                        </button>
                    </div>
                </div>


                {/* Stats Overview */}
                <div className="relative mb-6 -mx-3 sm:mx-0 group/scroll">
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
                            { icon: faSchool, label: 'Total Kelas', value: stats.total, top: 'border-t-[var(--color-primary)]', ibg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', hover: 'hover:bg-[var(--color-primary)]/5' },
                            { icon: faBed, label: 'Boarding', value: stats.boarding, top: 'border-t-amber-500', ibg: 'bg-amber-500/10 text-amber-500', hover: 'hover:bg-amber-500/5' },
                            { icon: faBuilding, label: 'Reguler', value: stats.reguler, top: 'border-t-emerald-500', ibg: 'bg-emerald-500/10 text-emerald-500', hover: 'hover:bg-emerald-500/5' },
                            { icon: faUsers, label: 'Total Siswa', value: stats.totalStudents, top: 'border-t-pink-500', ibg: 'bg-pink-500/10 text-pink-500', hover: 'hover:bg-pink-500/5' },
                        ].map((s, i) => (
                            <div key={i} className={`w-[200px] xs:w-[220px] sm:w-auto shrink-0 snap-center glass rounded-[1.5rem] p-4 border-t-[3px] ${s.top} flex items-center gap-3 group ${s.hover} transition-all`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0 ${s.ibg}`}><FontAwesomeIcon icon={s.icon} /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5 whitespace-nowrap">{s.label}</p>
                                    <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{s.value}</h3>
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
                                className={`rounded-full transition-all duration-300 ${activeStatIdx === i
                                    ? 'w-5 h-1.5 bg-[var(--color-primary)]'
                                    : 'w-1.5 h-1.5 bg-[var(--color-text-muted)]/30 hover:bg-[var(--color-text-muted)]/50'
                                    }`}
                            />
                        ))}
                    </div>
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
                <div className="bg-[var(--color-surface)] rounded-2xl mb-6 border border-[var(--color-border)] overflow-hidden shadow-sm" ref={filterRef}>
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

                    {/* Active Filter Chips */}
                    {hasAnyActiveFilter && (
                        <div className="px-3 pb-3 -mt-1">
                            <div className="flex flex-wrap gap-2">
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]"
                                        title="Hapus pencarian"
                                    >
                                        <FontAwesomeIcon icon={faSearch} className="text-[10px] opacity-60" />
                                        <span className="max-w-[220px] truncate">“{searchQuery}”</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterLevel && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterLevel('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]"
                                        title="Hapus filter tingkat"
                                    >
                                        <span className="opacity-70">Kelas</span> {filterLevel}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] group-hover:opacity-100 opacity-70 transition-opacity">
                                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterProgram && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterProgram('')}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]"
                                        title="Hapus filter program"
                                    >
                                        {filterProgram}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterNoTeacher && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterNoTeacher(false)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600"
                                        title="Hapus filter tanpa wali"
                                    >
                                        Tanpa Wali
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                {filterCrowded && (
                                    <button
                                        type="button"
                                        onClick={() => setFilterCrowded(false)}
                                        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-[10px] font-black text-blue-600"
                                        title="Hapus filter kelas padat"
                                    >
                                        Kelas Padat
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-blue-500/20 flex items-center justify-center text-blue-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                            <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                        </span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600"
                                    title="Reset semua filter"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
                                    Reset semua
                                </button>
                            </div>
                        </div>
                    )}

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
                                        {totalRows === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-28 text-center align-middle">
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-center mx-auto animate-in fade-in zoom-in-95 duration-700">
                                                        <div className="relative mb-6">
                                                            <div className="absolute inset-0 bg-[var(--color-primary)]/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                                <FontAwesomeIcon icon={faSearch} className="text-4xl text-[var(--color-primary)]/30" />
                                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                                    <FontAwesomeIcon icon={faXmark} className="text-red-500 text-sm" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-base font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-sm leading-relaxed mb-6">
                                                            Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.
                                                        </p>
                                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                                                            {hasAnyActiveFilter ? (
                                                                <button
                                                                    onClick={resetAllFilters}
                                                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                                >
                                                                    Reset Semua Filter
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={handleAdd}
                                                                    disabled={!canEdit}
                                                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                >
                                                                    <FontAwesomeIcon icon={faPlus} />
                                                                    Tambah Kelas Pertama
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : pagedClasses.map(cls => (
                                            <ClassRow key={cls.id} cls={cls} selectedIds={selectedIds} toggleSelect={toggleSelect} visibleCols={visibleCols} handleEdit={canEdit ? handleEdit : null} setItemToDelete={canEdit ? setItemToDelete : null} setIsDeleteModalOpen={canEdit ? setIsDeleteModalOpen : null} isPrivacyMode={isPrivacyMode} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="md:hidden divide-y divide-[var(--color-border)]">
                                {totalRows === 0 ? (
                                    <div className="py-24 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-[var(--color-primary)]/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faSearch} className="text-4xl text-[var(--color-primary)]/30" />
                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                    <FontAwesomeIcon icon={faXmark} className="text-red-500 text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-6">
                                            Tidak ditemukan kelas yang cocok dengan filter atau database masih kosong.
                                        </p>
                                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
                                            {hasAnyActiveFilter ? (
                                                <button
                                                    onClick={resetAllFilters}
                                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                                >
                                                    Reset Semua Filter
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleAdd}
                                                    disabled={!canEdit}
                                                    className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <FontAwesomeIcon icon={faPlus} />
                                                    Tambah Kelas Pertama
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : pagedClasses.map(cls => (
                                    <ClassMobileCard key={cls.id} cls={cls} selectedIds={selectedIds} toggleSelect={toggleSelect} handleEdit={canEdit ? handleEdit : null} setItemToDelete={canEdit ? setItemToDelete : null} setIsDeleteModalOpen={canEdit ? setIsDeleteModalOpen : null} />
                                ))}
                            </div>
                            <Pagination
                                totalRows={totalRows}
                                page={page}
                                pageSize={pageSize}
                                setPage={setPage}
                                setPageSize={setPageSize}
                                label="kelas"
                                jumpPage={jumpPage}
                                setJumpPage={setJumpPage}
                            />

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
                            <div className="min-w-0"><h3 className="text-sm font-black uppercase tracking-wider">Konfirmasi Hapus</h3><p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest">Penghapusan tidak dapat dibatalkan.</p></div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold px-1">Yakin menghapus kelas <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{itemToDelete?.name}</span>? <span className="text-[10px] text-[var(--color-text-muted)] mt-2 block opacity-60">Siswa yang terdaftar akan kehilangan referensi kelas.</span></p>
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
                {/* ── Import Modal ── */}
                <Modal isOpen={isImportModalOpen} onClose={() => { setIsImportModalOpen(false); setImportTab('guideline'); setImportPreview([]); setImportIssues([]); setImportDupes([]); setImportFileName('') }} title="Import Data Kelas" size="lg">
                    <div className="space-y-4">

                        {/* Tab Switch */}
                        <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                            {[{ id: 'guideline', label: 'Panduan' }, { id: 'preview', label: `Preview${importPreview.length ? ` (${importPreview.length})` : ''}` }].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setImportTab(t.id)}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${importTab === t.id ? 'bg-[var(--color-primary)] text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                >{t.label}</button>
                            ))}
                        </div>

                        {/* ── TAB: PANDUAN ── */}
                        {importTab === 'guideline' && (
                            <div className="space-y-4">
                                {/* Format info */}
                                <div className="p-4 rounded-2xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">Format Kolom yang Didukung</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { col: 'Nama Kelas', req: true, desc: 'Wajib diisi' },
                                            { col: 'Tingkat', req: true, desc: '7 – 12' },
                                            { col: 'Program', req: false, desc: 'Boarding / Reguler' },
                                            { col: 'Tipe Gender', req: false, desc: 'Putra / Putri' },
                                            { col: 'Wali Kelas', req: false, desc: 'Nama guru (opsional)' },
                                            { col: 'Tahun Ajaran', req: false, desc: 'Nama tahun ajaran (opsional)' },
                                        ].map(({ col, req, desc }) => (
                                            <div key={col} className="flex items-start gap-2 p-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                <span className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${req ? 'bg-red-500' : 'bg-[var(--color-border)]'}`} />
                                                <div>
                                                    <p className="text-[10px] font-black text-[var(--color-text)]">{col}</p>
                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-medium">{desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />= Wajib diisi</p>
                                </div>

                                {/* Download template */}
                                <button
                                    onClick={handleDownloadTemplate}
                                    className="w-full h-11 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[var(--color-border)] transition-all"
                                >
                                    <FontAwesomeIcon icon={faDownload} /> Download Template Excel
                                </button>

                                {/* Drag & Drop Upload */}
                                <div
                                    onDragOver={e => { e.preventDefault(); setImportDrag(true) }}
                                    onDragLeave={() => setImportDrag(false)}
                                    onDrop={e => { e.preventDefault(); setImportDrag(false); const file = e.dataTransfer.files?.[0]; if (file) processImportFile(file) }}
                                    onClick={() => importFileRef.current?.click()}
                                    className={`relative cursor-pointer flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed transition-all ${importDrag ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-surface-alt)]/50'}`}
                                >
                                    <input ref={importFileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processImportFile(f); e.target.value = '' }} />
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center text-xl">
                                        <FontAwesomeIcon icon={faUpload} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-[var(--color-text)]">Klik atau seret file di sini</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold mt-1 uppercase tracking-widest">CSV atau XLSX • Maks 5MB</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── TAB: PREVIEW ── */}
                        {importTab === 'preview' && (
                            <div className="space-y-4">
                                {/* File info */}
                                {importFileName && (
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                        <FontAwesomeIcon icon={faFileImport} className="text-[var(--color-primary)] shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-[var(--color-text)] truncate">{importFileName}</p>
                                            <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">{importPreview.length} baris terbaca</p>
                                        </div>
                                        <button onClick={() => importFileRef.current?.click()} className="shrink-0 text-[10px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest">Ganti File</button>
                                        <input ref={importFileRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processImportFile(f); e.target.value = '' }} />
                                    </div>
                                )}

                                {/* Issue summary */}
                                {importIssues.length > 0 && (
                                    <div className="space-y-1.5">
                                        {importIssues.filter(x => x.level === 'error').length > 0 && (
                                            <div className="px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                                                <FontAwesomeIcon icon={faXmark} className="text-red-500 shrink-0 mt-0.5 text-xs" />
                                                <div>
                                                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">{importIssues.filter(x => x.level === 'error').length} Error — Wajib diperbaiki</p>
                                                    <ul className="mt-1 space-y-0.5">
                                                        {importIssues.filter(x => x.level === 'error').map((iss, i) => (
                                                            <li key={i} className="text-[9px] text-red-600 font-bold">Baris {iss.row}: {iss.messages.join(', ')}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                        {importIssues.filter(x => x.level === 'warn').length > 0 && (
                                            <div className="px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                                                <FontAwesomeIcon icon={faCheck} className="text-amber-500 shrink-0 mt-0.5 text-xs" />
                                                <div>
                                                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{importIssues.filter(x => x.level === 'warn').length} Peringatan</p>
                                                    <ul className="mt-1 space-y-0.5">
                                                        {importIssues.filter(x => x.level === 'warn').map((iss, i) => (
                                                            <li key={i} className="text-[9px] text-amber-600 font-bold">Baris {iss.row}: {iss.messages.join(', ')}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                        {importDupes.length > 0 && (
                                            <div className="px-3 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                                                <FontAwesomeIcon icon={faLink} className="text-blue-500 shrink-0 text-xs" />
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{importDupes.length} Duplikat dalam file</p>
                                                </div>
                                                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Skip duplikat</span>
                                                    <div
                                                        onClick={() => setImportSkip(v => !v)}
                                                        className={`w-8 h-4 rounded-full transition-all flex items-center px-0.5 cursor-pointer ${importSkip ? 'bg-blue-500' : 'bg-[var(--color-border)]'}`}
                                                    >
                                                        <div className={`w-3 h-3 rounded-full bg-white shadow transition-all ${importSkip ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Preview table */}
                                {importPreview.length > 0 && (
                                    <div className="overflow-auto max-h-64 rounded-xl border border-[var(--color-border)]">
                                        <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                                            <thead className="sticky top-0 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                                <tr>
                                                    {['#', 'Nama Kelas', 'Tingkat', 'Major', 'Wali Kelas', 'Status'].map(h => (
                                                        <th key={h} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--color-border)]">
                                                {importPreview.map((row, i) => {
                                                    const isDupe = importDupes.includes(i)
                                                    const isSkipped = isDupe && importSkip
                                                    const issue = importIssues.find(x => x.row === i + 2)
                                                    return (
                                                        <tr key={i} className={`transition-colors ${isSkipped ? 'opacity-40' : row._hasError ? 'bg-red-500/5' : isDupe ? 'bg-blue-500/5' : 'hover:bg-[var(--color-surface-alt)]/50'}`}>
                                                            <td className="px-3 py-2 text-[var(--color-text-muted)] font-bold">{i + 2}</td>
                                                            <td className="px-3 py-2 font-bold text-[var(--color-text)]">{row.name || <span className="text-red-500">kosong</span>}</td>
                                                            <td className="px-3 py-2 font-bold text-[var(--color-text)]">{row.grade || '—'}</td>
                                                            <td className="px-3 py-2 text-[var(--color-text-muted)]">{row.major || '—'}</td>
                                                            <td className="px-3 py-2 text-[var(--color-text-muted)]">{row._teacherRaw ? (row.homeroom_teacher_id ? row._teacherRaw : <span className="text-amber-500">{row._teacherRaw} (?)</span>) : '—'}</td>
                                                            <td className="px-3 py-2">
                                                                {isSkipped ? (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[9px] font-black text-[var(--color-text-muted)] uppercase">Skip</span>
                                                                ) : row._hasError ? (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-red-500/10 text-[9px] font-black text-red-500 uppercase">Error</span>
                                                                ) : isDupe ? (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-[9px] font-black text-blue-500 uppercase">Duplikat</span>
                                                                ) : (
                                                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-black text-emerald-600 uppercase">OK</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Progress bar saat importing */}
                                {importing && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                            <span>Mengimport...</span>
                                            <span>{importProgress.done} / {importProgress.total}</span>
                                        </div>
                                        <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
                                                style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Summary & CTA */}
                                {importPreview.length > 0 && !importing && (
                                    <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
                                        <p className="text-xs font-bold text-[var(--color-text-muted)]">
                                            <span className="text-[var(--color-primary)] font-black">
                                                {importPreview.filter((_, i) => {
                                                    const dupeSet = new Set(importDupes)
                                                    const errRows = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
                                                    return !errRows.has(i) && !(importSkip && dupeSet.has(i))
                                                }).length}
                                            </span>{' '}kelas siap diimport
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setIsImportModalOpen(false); setImportTab('guideline'); setImportPreview([]); setImportIssues([]); setImportDupes([]); setImportFileName('') }}
                                                className="h-10 px-5 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-all"
                                            >Batal</button>
                                            <button
                                                onClick={handleCommitImport}
                                                disabled={hasImportBlockingErrors || importing}
                                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                            >
                                                {importing
                                                    ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengimport...</>
                                                    : <><FontAwesomeIcon icon={faCheck} /> Import Sekarang</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Empty state */}
                                {!importPreview.length && !importing && (
                                    <div className="py-10 flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faFileImport} className="text-3xl opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest opacity-40">Belum ada file yang diupload</p>
                                        <button onClick={() => setImportTab('guideline')} className="text-[10px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest">← Kembali ke Panduan</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>

            </div>
        </DashboardLayout>
    )
}