import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    Plus, Search, Loader2, ArrowUp, ArrowDown, AlertTriangle,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CheckCircle2,
    Calendar, ClipboardList, Table, LayoutList, Upload, Download, FileSpreadsheet, FileText,
    Keyboard, Eye, EyeOff, Archive, RotateCcw, Sliders, Trash2, Edit2, X, AlertCircle, FileEdit
} from 'lucide-react'
import { useBehaviorImportExport } from '@features/behavior/hooks/useBehaviorImportExport'

const LazyBehaviorExportModal = React.lazy(() => import('@features/behavior/components/BehaviorExportModal'))
const LazyBehaviorImportModal = React.lazy(() => import('@features/behavior/components/BehaviorImportModal'))
import DashboardLayout from '@core/layouts/DashboardLayout'
import StatsCarousel from '@shared/components/StatsCarousel'
import Breadcrumb from '@shared/components/Breadcrumb'
import PageHeader from '@shared/components/PageHeader'
import { StatCard, EmptyState } from '@shared/components/DataDisplay'
import Modal from '@shared/components/Modal'
import BehaviorFormModal from '@features/behavior/components/BehaviorFormModal'
import BehaviorDetailModal from '@features/behavior/components/BehaviorDetailModal'
import RichSelect from '@shared/components/RichSelect'
import { TableSkeleton } from '@shared/components/Skeleton'
import { useToast } from '@context/ToastContext'
import { useAuth } from '@context/AuthContext'
import { useFlag } from '@context/FeatureFlagsContext'
import { useLanguage } from '@context/LanguageContext'
import Pagination from '@shared/components/Pagination'
import BulkActionsBar from '@shared/components/BulkActionsBar'
import { supabase } from '@lib/supabase'
import { logAudit, logAuditBatch } from '@utils/auditLogger'

import Papa from 'papaparse'


const DB_TRANSLATIONS = {
    en: {
        "Berbicara Di Dalam Kelas": "Talking in Class",
        "Makan di Dalam Kelas": "Eating in Class",
        "Terlambat Masuk Kelas": "Late to Class",
        "Juara Lomba Tahfidz": "Tahfidz Competition Winner",
        "Tidak Membawa Buku": "Not Bringing Books",
        "Membuang Sampah Sembarangan": "Littering",
        "Membantu Teman": "Helping Friends",
        "Membaca Al-Qur'an": "Reading Al-Qur'an",
        "Melanggar Aturan Asrama": "Violating Dorm Rules",
        "Berpakaian Rapi": "Dressed Neatly",
        "Membantu Membersihkan Masjid": "Helping Clean the Mosque",
        "Merusak Fasilitas Sekolah": "Damaging School Facilities",
        "Selesai Hafalan Juz 30": "Completed Memorization of Juz 30",
        
        // Students
        "Budi Santoso": "John Smith",
        "Siti Maryam": "Jane Doe",
        "Muhammad Ali": "Muhammad Ali",
        "Fatima Zahra": "Fatima Zahra",
        "Ahmad Faiz": "Ahmad Faiz",
        
        // Teachers
        "Ustadz Ahmad": "Mr. Ahmad",
        "Ustadz Faisal": "Mr. Faisal",
        
        // Notes
        "Terlambat 15 menit": "15 minutes late",
        "Membersihkan teras depan": "Cleaning the front terrace",
        "Memecahkan kaca jendela kelas": "Breaking the classroom window glass"
    },
    ar: {
        "Berbicara Di Dalam Kelas": "التحدث في الفصل",
        "Makan di Dalam Kelas": "الأكل في الفصل",
        "Terlambat Masuk Kelas": "التأخر عن الفصل",
        "Juara Lomba Tahfidz": "الفائز في مسابقة التحفيظ",
        "Tidak Membawa Buku": "عدم إحضار الكتب",
        "Membuang Sampah Sembarangan": "رمي النفايات في غير مكانها",
        "Membantu Teman": "مساعدة الأصدقاء",
        "Membaca Al-Qur'an": "قراءة القرآن",
        "Melanggar Aturan Asrama": "مخالفة قوانين السكن",
        "Berpakaian Rapi": "حسن المظهر",
        "Membantu Membersihkan Masjid": "المساعدة في تنظيف المسجد",
        "Merusak Fasilitas Sekolah": "إتلاف مرافق المدرسة",
        "Selesai Hafalan Juz 30": "إتمام حفظ جزء ٣٠",
        
        // Students
        "Budi Santoso": "أحمد محمد",
        "Siti Maryam": "مريم علي",
        "Muhammad Ali": "محمد علي",
        "Fatima Zahra": "فاطمة الزهراء",
        "Ahmad Faiz": "أحمد فايز",
        
        // Teachers
        "Ustadz Ahmad": "الأستاذ أحمد",
        "Ustadz Faisal": "الأستاذ فيصل",
        
        // Notes
        "Terlambat 15 menit": "متأخر ١٥ دقيقة",
        "Membersihkan teras depan": "تنظيف الفناء الأمامي للمسجد",
        "Memecahkan kaca jendela kelas": "كسر زجاج نافذة الفصل"
    }
}

const PAGE_SIZE = 10
const LS_VIEW = 'reports_view'
const LS_COLS = 'reports_columns'
const LS_PAGE_SIZE = 'reports_page_size'

function getPortalContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}


export default function BehaviorPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()
    const { language, t, tNum, dir } = useLanguage()
    const tp = useCallback((key) => t(`behavior.${key}`), [t])
    const tDb = useCallback((text) => {
        if (!text) return text
        return DB_TRANSLATIONS[language]?.[text] || text
    }, [language])

    // access.teacher_poin flag — kalau off, guru tidak bisa tambah/edit/hapus poin
    const { enabled: teacherPoinEnabled } = useFlag('access.teacher_poin')
    const { enabled: canViolation } = useFlag('module.pelanggaran')
    const { enabled: canAchievement } = useFlag('module.prestasi')
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
    const [jumpPage, setJumpPage] = useState('')
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [viewMode, setViewMode] = useState(() => {
        try { return localStorage.getItem(LS_VIEW) || 'timeline' } catch { return 'timeline' }
    })

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [detailItem, setDetailItem] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [classesList, setClassesList] = useState([]) // fetched directly from classes table
    const searchInputRef = useRef(null)
    const colMenuRef = useRef(null)
    const importFileInputRef = useRef(null)
    const shortcutRef = useRef(null)
    const pressTimerRef = useRef(null)
    const [pressingId, setPressingId] = useState(null)

    // columns
    const [visibleCols, setVisibleCols] = useState({ type: true, points: true, time: true, teacher: true })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

    // ── Export/Import & UX States ───────────────────────────────────────────
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const [shortcutMounted, setShortcutMounted] = useState(false)

    useEffect(() => {
        if (isHeaderMenuOpen) {
            setHeaderMenuMounted(true)
        } else {
            const t = setTimeout(() => setHeaderMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isHeaderMenuOpen])

    useEffect(() => {
        if (isShortcutOpen) {
            setShortcutMounted(true)
        } else {
            const t = setTimeout(() => setShortcutMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isShortcutOpen])

    useEffect(() => {
        if (!isHeaderMenuOpen && !isShortcutOpen) return
        const update = () => {
            if (isHeaderMenuOpen && headerMenuBtnRef.current) setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect())
            if (isShortcutOpen && shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('resize', update)
        return () => { window.removeEventListener('resize', update) }
    }, [isHeaderMenuOpen, isShortcutOpen])



    // ── Derived ───────────────────────────────────────────────────────────────
    const totalPages = Math.ceil(totalRows / pageSize)
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    const getTypeName = (id) => {
        const name = violationTypes.find(vt => vt.id === id)?.name ?? '—'
        return tDb(name)
    }

    const activeFilters = useMemo(() => {
        const chips = []
        if (filterType === 'positive') chips.push({ label: `${tp('positive')} (+)`, clear: () => setFilterType('') })
        if (filterType === 'negative') chips.push({ label: `${tp('negative')} (−)`, clear: () => setFilterType('') })
        if (filterClass) chips.push({ label: `${tp('classLabel')}: ${filterClass}`, clear: () => setFilterClass('') })
        if (sortBy !== 'newest') chips.push({ label: `${tp('sortLabel')}: ${tp('oldest')}`, clear: () => setSortBy('newest') })
        return chips
    }, [filterType, filterClass, sortBy, tp])

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
    const fmtLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
    const fmtTime = (d) => d ? new Date(d).toLocaleTimeString(fmtLocale, { hour: '2-digit', minute: '2-digit' }) : ''
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString(fmtLocale, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
    const fmtDayLabel = (d) => {
        const today = new Date().toISOString().slice(0, 10)
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
        const ds = d.slice(0, 10)
        if (ds === today) return tp('today')
        if (ds === yesterday) return tp('yesterday')
        const loc = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
        return new Date(d).toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
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



    useEffect(() => {
        const h = e => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.key === 'n' && !e.ctrlKey && !isTyping) { e.preventDefault(); setIsModalOpen(true) }
            if (e.key === 'Escape') {
                setSearchQuery(''); setSelectedIds([]);
                setIsModalOpen(false); setIsExportModalOpen(false); setIsImportModalOpen(false)
                setIsShortcutOpen(false); setIsDeleteModalOpen(false); setIsBulkDeleteOpen(false)
                setIsDetailOpen(false); setDetailItem(null);
            }
            if (e.key === '?' && !isTyping) setIsShortcutOpen(v => !v)

            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
                setIsColMenuOpen(false)
            }
        }
        const handleGlobalClick = (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
            if (headerMenuBtnRef.current && !headerMenuBtnRef.current.contains(e.target) && !e.target.closest('#portal-header-menu')) {
                setIsHeaderMenuOpen(false)
            }
            if (shortcutBtnRef.current && !shortcutBtnRef.current.contains(e.target) && !e.target.closest('#portal-shortcut-menu')) {
                setIsShortcutOpen(false)
            }
        }
        document.addEventListener('keydown', h)
        document.addEventListener('mousedown', handleGlobalClick)
        return () => {
            document.removeEventListener('keydown', h)
            document.removeEventListener('mousedown', handleGlobalClick)
        }
    }, [])

    // ── Fetchers ──────────────────────────────────────────────────────────────
    const fetchMetadata = useCallback(async () => {
        try {
            // students has class_id FK → classes table. No class_name column.
            const [studRes, vtRes, classRes] = await Promise.all([
                supabase.from('students').select('id,name,class_id,total_points,classes(id,name)').order('name'),
                supabase.from('point_rules').select('id,name,points').order('name'),
                supabase.from('classes').select('id,name').order('name'),
            ])
            if (studRes.data) {
                setStudents(studRes.data.map(s => ({
                    id: s.id,
                    name: s.name,
                    class_id: s.class_id,
                    class_name: s.classes?.name || '',
                    total_points: s.total_points || 0,
                })))
            }
            if (vtRes.data) {
                const filteredVTs = vtRes.data.filter(vt => {
                    if (vt.points > 0) return canAchievement
                    if (vt.points < 0) return canViolation
                    return true
                })
                setViolationTypes(filteredVTs)
            }
            if (classRes.data) setClassesList(classRes.data.map(c => c.name).filter(Boolean).sort())
        } catch { addToast(tp('toastLoadMetaError'), 'error') }
    }, [addToast, canAchievement, canViolation])

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

            // Granular Module Enforcement
            if (!canViolation) q = q.gt('points', -1) // Hide all negatives
            if (!canAchievement) q = q.lt('points', 1) // Hide all positives

            if (debouncedSearch) {
                const [matchedS, matchedT] = await Promise.all([
                    supabase.from('students').select('id').ilike('name', `%${debouncedSearch}%`),
                    supabase.from('point_rules').select('id').ilike('name', `%${debouncedSearch}%`),
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
        } catch { addToast(tp('toastLoadReportError'), 'error') }
        finally { setLoading(false) }
    }, [page, pageSize, debouncedSearch, filterType, filterClass, sortBy, students, canViolation, canAchievement, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data } = await supabase.from('reports').select('id,points,reported_at')
            if (data) {
                const todayStr = new Date().toISOString().slice(0, 10)
                const filtered = data.filter(r => {
                    if (r.points > 0) return canAchievement
                    if (r.points < 0) return canViolation
                    return true
                })
                setStats({
                    total: filtered.length,
                    positive: filtered.filter(r => (r.points ?? 0) > 0).length,
                    negative: filtered.filter(r => (r.points ?? 0) < 0).length,
                    today: filtered.filter(r => r.reported_at?.startsWith(todayStr)).length,
                })
            }
        } catch { }
    }, [canAchievement, canViolation])

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


    // Hook integration
    const importExport = useBehaviorImportExport({
        reports,
        students,
        violationTypes,
        classesList,
        fetchReports,
        fetchStats,
        addToast,
        closeModal: () => { },
        importFileInputRef,
        filterType,
        filterClass,
        debouncedSearch,
        sortBy,
        selectedIds,
        profile
    })

    const {
        isImportModalOpen, setIsImportModalOpen,
        isExportModalOpen, setIsExportModalOpen,
        exportScope, setExportScope,
        exportColumns, setExportColumns,
        importFileName, setImportFileName,
        importPreview, setImportPreview,
        importIssues, setImportIssues,
        importing, setImporting,
        importProgress, setImportProgress,
        importStep, setImportStep,
        importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders,
        importColumnMapping, setImportColumnMapping,
        importDragOver, setImportDragOver,
        importValidationOpen, setImportValidationOpen,
        importLoading, setImportLoading,
        importEditCell, setImportEditCell,
        importReadyRows,
        hasImportBlockingErrors,
        SYSTEM_COLS,
        ALL_EXPORT_COLUMNS,

        processImportFile,
        handleImportClick,
        handleCommitImport,
        handleBulkFix,
        handleDownloadTemplate,
        handleExportCSV,
        handleExportExcel,
        handleExportPDF,
        buildImportPreview,
        handleImportCellEdit,
        handleRemoveImportRow
    } = importExport

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await processImportFile(file)
        e.target.value = ''
    }


    // ── CRUD ──────────────────────────────────────────────────────────────────
    const handleAdd = () => {
        setSelectedItem(null)
        setIsModalOpen(true)
    }
    const handleOpenDetail = (r) => {
        setDetailItem(r)
        setIsDetailOpen(true)
    }
    const handleEdit = (r) => {
        setSelectedItem(r)
        setIsModalOpen(true)
    }
    const handleSubmit = async (modalFormData) => {
        setSubmitting(true)
        try {
            const vt = violationTypes.find(v => v.id === modalFormData.violation_type_id)
            const payload = {
                student_id: modalFormData.student_id,
                violation_type_id: modalFormData.violation_type_id,
                reporter_id: profile?.id ?? null,
                teacher_name: profile?.name ?? tp('unknown'),
                points: vt?.points ?? 0,
                notes: modalFormData.notes || null,
                reported_at: modalFormData.reported_at
                    ? new Date(modalFormData.reported_at).toISOString()
                    : (selectedItem ? selectedItem.reported_at : new Date().toISOString()),
            }
            if (selectedItem) {
                const { error } = await supabase.from('reports').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast(tp('toastUpdateSuccess'), 'success')
                await logAudit({
                    action: 'UPDATE', source: 'OPERATIONAL', tableName: 'reports', recordId: selectedItem.id,
                    oldData: selectedItem,
                    newData: { ...selectedItem, ...payload }
                })
            } else {
                const { data: insData, error } = await supabase.from('reports').insert([payload]).select().single()
                if (error) throw error
                addToast(tp('toastCreateSuccess'), 'success')
                await logAudit({
                    action: 'INSERT', source: 'OPERATIONAL', tableName: 'reports', recordId: insData?.id,
                    newData: insData || payload
                })
            }
            setIsModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || tp('toastSaveError'), 'error') }
        finally { setSubmitting(false) }
    }
    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('reports').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast(tp('toastDeleteSuccess'), 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'reports', recordId: itemToDelete.id,
                oldData: itemToDelete
            })
            setIsDeleteModalOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || tp('toastDeleteError'), 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }
    const handleBulkDelete = async () => {
        if (!selectedIds.length) return
        setSubmitting(true)
        const idsSnap = [...selectedIds]
        try {
            const { error } = await supabase.from('reports').delete().in('id', idsSnap)
            if (error) throw error
            addToast(`${tNum(idsSnap.length)} ${tp('toastBulkDeleteSuccess')}`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'reports', recordId: null,
                oldData: { bulk: true, count: idsSnap.length, ids: idsSnap }
            })
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchReports(); fetchStats()
        } catch (err) { addToast(err.message || tp('toastBulkDeleteError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleCardPressStart = useCallback((e, id) => {
        // Only trigger behavior on mobile
        if (window.innerWidth >= 640) return;
        // Ignore buttons, checkboxes, input elements
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;

        if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
        setPressingId(id);
        pressTimerRef.current = setTimeout(() => {
            setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            setPressingId(null);
        }, 800);
    }, []);

    const handleCardPressEnd = useCallback((e, id, report) => {
        if (window.innerWidth >= 640) return;
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;

        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        if (pressingId === id) {
            // It was a short tap
            setSelectedIds(prev => {
                if (prev.length > 0) {
                    return prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
                } else {
                    handleOpenDetail(report);
                    return prev;
                }
            });
        }
        setPressingId(null);
    }, [pressingId, handleOpenDetail]);

    const handleCardPressCancel = useCallback(() => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
        setPressingId(null);
    }, []);

    return (
        <DashboardLayout title={tp('title')}>
            <style>{`
                @keyframes longpress-progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            `}</style>
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">


                {/* Read-only Banner — access.teacher_poin flag off */}
                {!canInput && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <EyeOff className="text-rose-500 shrink-0 w-4 h-4" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">{tp('readOnlyBanner')}</p>
                    </div>
                )}

                <React.Suspense fallback={null}>
                    <LazyBehaviorExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        exportScope={exportScope}
                        setExportScope={setExportScope}
                        exportColumns={exportColumns}
                        setExportColumns={setExportColumns}
                        handleExportCSV={handleExportCSV}
                        handleExportExcel={handleExportExcel}
                        handleExportPDF={handleExportPDF}
                        selectedCount={selectedIds.length}
                        allCount={totalRows}
                    />
                    <LazyBehaviorImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        importing={importing}
                        importStep={importStep}
                        setImportStep={setImportStep}
                        importPreview={importPreview}
                        importFileName={importFileName}
                        importFileInputRef={importFileInputRef}
                        importDragOver={importDragOver}
                        setImportDragOver={setImportDragOver}
                        processImportFile={processImportFile}
                        students={students}
                        violationTypes={violationTypes}
                        handleDownloadTemplate={handleDownloadTemplate}
                        importFileHeaders={importFileHeaders}
                        SYSTEM_COLS={SYSTEM_COLS}
                        importColumnMapping={importColumnMapping}
                        setImportColumnMapping={setImportColumnMapping}
                        importRawData={importRawData}
                        importLoading={importLoading}
                        setImportLoading={setImportLoading}
                        buildImportPreview={buildImportPreview}
                        importIssues={importIssues}
                        importValidationOpen={importValidationOpen}
                        setImportValidationOpen={setImportValidationOpen}
                        importProgress={importProgress}
                        handleCommitImport={handleCommitImport}
                        handleImportClick={handleImportClick}
                        hasImportBlockingErrors={hasImportBlockingErrors}
                        importReadyRows={importReadyRows}
                        handleImportCellEdit={handleImportCellEdit}
                        importEditCell={importEditCell}
                        setImportEditCell={setImportEditCell}
                        handleRemoveImportRow={handleRemoveImportRow}
                        handleBulkFix={handleBulkFix}
                    />
                    <input
                        type="file"
                        ref={importFileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    />
                </React.Suspense>

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    badge="boarding"
                    breadcrumbs={[tp('analytics')]}
                    title={tp('title')}
                    subtitle={tp('subtitle')}
                    actions={
                        <>

                            {/* Tombol opsi dropdown */}
                            <div className="relative">
                                <button
                                    ref={headerMenuBtnRef}
                                    onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                    title={tp('reportOptions')}
                                >
                                    <Sliders className="w-4 h-4" />
                                </button>

                                {/* Portaled Header Menu Dropdown */}
                                {headerMenuMounted && headerMenuRect && createPortal(
                                    <>
                                        <div
                                            className={`fixed inset-0 z-[9990] bg-black/[0.08] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                            onClick={() => setIsHeaderMenuOpen(false)}
                                        />
                                        <div
                                            className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-[opacity,transform] duration-200 ease-out origin-top-right
                                            ${isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                            style={{
                                                top: headerMenuRect.bottom + 8,
                                                left: Math.max(10, headerMenuRect.right - 224)
                                            }}
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{tp('reportOptions')}</p>
                                            <button onClick={() => { setIsImportModalOpen(true); setIsHeaderMenuOpen(false) }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Upload className="w-4 h-4 text-xs" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">{tp('importData')}</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                                </div>
                                            </button>
                                            <button onClick={() => { setIsExportModalOpen(true); setIsHeaderMenuOpen(false) }}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left">
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Download className="w-4 h-4 text-xs" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">{tp('exportData')}</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>,
                                    getPortalContainer('portal-header-menu')
                                )}
                            </div>

                            {/* Keyboard Shortcuts Button Standalone */}
                            <div className="relative hidden sm:block">
                                <button
                                    ref={shortcutBtnRef}
                                    onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    title={tp('shortcutTitle')}
                                >
                                    <Keyboard className="w-4 h-4 text-sm" />
                                </button>

                                {/* Portaled Keyboard Shortcuts Dropdown */}
                                {shortcutMounted && shortcutRect && createPortal(
                                    <>
                                        <div className="fixed inset-0 z-[9990] bg-black/[0.08]" onClick={() => setIsShortcutOpen(false)} />
                                        <div
                                            className={`fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200
                                            ${isShortcutOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                            style={{
                                                top: shortcutRect.bottom + 8,
                                                left: Math.max(10, shortcutRect.right - 288)
                                            }}
                                        >
                                            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">{tp('shortcuts')}</p>
                                                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{tp('shortcutToggle')}</span>
                                            </div>
                                            <div className="p-3 space-y-0.5">
                                                {[
                                                    { section: tp('nav') },
                                                    { keys: ['Ctrl', 'K'], label: tp('shortcutSearch') },
                                                    { keys: ['Esc'], label: tp('shortcutEsc') },
                                                    { section: tp('actions') },
                                                    { keys: ['N'], label: tp('shortcutAdd') },
                                                    { keys: ['Ctrl', 'E'], label: tp('shortcutExport') },
                                                    { keys: ['Ctrl', 'I'], label: tp('shortcutImport') },
                                                    { section: tp('views') },
                                                    { keys: ['P'], label: tp('shortcutPrivacy') },
                                                    { keys: ['R'], label: tp('shortcutRefresh') },
                                                    { keys: ['X'], label: tp('shortcutReset') },
                                                    { keys: ['?'], label: tp('shortcutShow') },
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
                                    </>,
                                    getPortalContainer('portal-shortcut-menu')
                                )}
                            </div>

                            {/* Privasi Button Standalone */}
                            <button
                                onClick={() => {
                                    const next = !isPrivacyMode
                                    setIsPrivacyMode(next)
                                    addToast(next ? 'Mode privasi diaktifkan — Data sensitif disembunyikan' : 'Mode privasi dinonaktifkan', next ? 'info' : 'success')
                                }}
                                className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                                title={isPrivacyMode ? tp('disablePrivacy') : tp('enablePrivacy')}
                            >
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                    {tp('privacy')}
                                </span>
                            </button>

                            {/* Primary Add Button */}
                            <button onClick={handleAdd} disabled={!canInput}
                                className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest">{canInput ? tp('createReport') : tp('readOnly')}</span>
                            </button>
                        </>
                    }
                />

                {/* ── STATS ── */}
                <StatsCarousel count={4} cols={4}>
                    <StatCard key="total" icon={ClipboardList} label={tp('total')} value={stats.total} color="primary" />
                    <StatCard key="positive" icon={CheckCircle2} label={tp('positive')} value={stats.positive} color="emerald"
                        onClick={() => setFilterType(prev => prev === 'positive' ? '' : 'positive')}
                        className={filterType === 'positive' ? 'ring-2 ring-[var(--color-primary)]/30' : ''} />
                    <StatCard key="negative" icon={AlertCircle} label={tp('negative')} value={stats.negative} color="rose"
                        onClick={() => setFilterType(prev => prev === 'negative' ? '' : 'negative')}
                        className={filterType === 'negative' ? 'ring-2 ring-[var(--color-primary)]/30' : ''} />
                    <StatCard key="today" icon={Calendar} label={tp('today')} value={stats.today} color="amber" />
                </StatsCarousel>

                {/* ── SEARCH + FILTER ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    {/* Row 1: Search + Quick Filters + Action Buttons */}
                    <div className="flex items-center gap-1.5 p-2 xs:gap-2 xs:p-2.5 lg:p-3">
                        {/* Search Bar - Dynamic & Responsive */}
                        <div className="flex-1 min-w-[80px] sm:min-w-[140px] transition-all duration-300">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm group-focus-within:text-[var(--color-primary)] transition-colors">
                                    <Search className="w-4 h-4" />
                                </div>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={tp('searchPlaceholder')}
                                    className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Quick Filter Chips - Desktop Only */}
                        <div className="hidden lg:flex flex-initial items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 min-w-0 h-full">
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1" />

                            {/* Group 1: Kategori */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[
                                    { id: '', label: tp('all'), icon: ClipboardList, activeCls: 'bg-[var(--color-primary)] border-[var(--color-primary)]' },
                                    { id: 'positive', label: tp('positive'), icon: CheckCircle2, activeCls: 'bg-emerald-500 border-emerald-500' },
                                    { id: 'negative', label: tp('negative'), icon: AlertCircle, activeCls: 'bg-rose-500 border-rose-500' },
                                ].map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={() => { setFilterType(s.id); setPage(1); }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterType === s.id
                                            ? `${s.activeCls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                            }`}
                                    >
                                        <s.icon className={`w-3.5 h-3.5 ${filterType === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>

                            {/* Separator */}
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />

                            {/* Group 2: Quick Sort */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => { setSortBy(sortBy === 'newest' ? 'oldest' : 'newest'); setPage(1); }}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${sortBy === 'oldest'
                                        ? 'bg-amber-500 border-amber-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-amber-500/30 hover:bg-amber-500/5 hover:text-amber-600'
                                        }`}
                                >
                                    {sortBy === 'newest' ? <ArrowDown className="w-3.5 h-3.5 opacity-30" /> : <ArrowUp className="w-3.5 h-3.5" />}
                                    {sortBy === 'newest' ? tp('newest') : tp('oldest')}
                                </button>
                            </div>
                        </div>

                        {/* Dedicated Divider for Enterprise Look */}
                        <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end gap-1.5 xs:gap-2 shrink-0 lg:ml-auto">
                            {/* View Mode Switcher */}
                            <div className="bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] flex gap-0.5">
                                <button onClick={() => setViewMode('timeline')}
                                    title={tp('timeline')}
                                    className={`h-7 px-2 xs:px-2.5 sm:px-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${viewMode === 'timeline' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                    <LayoutList className="w-3.5 h-3.5" />
                                    <span className="hidden xl:inline">{tp('timeline')}</span>
                                </button>
                                <button onClick={() => setViewMode('table')}
                                    title={tp('tableView')}
                                    className={`h-7 px-2 xs:px-2.5 sm:px-3 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                    <Table className="w-3.5 h-3.5" />
                                    <span className="hidden xl:inline">{tp('tableView')}</span>
                                </button>
                            </div>

                            {/* Pilih Semua / Batal */}
                            <button
                                onClick={() => setSelectedIds(allSelected ? [] : reports.map(r => r.id))}
                                className={`h-9 px-2.5 xs:px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                                title={tp('selectAll')}
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{selectedIds.length > 0 ? tp('selected') : tp('selectAll')}</span>
                                {selectedIds.length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                        {tNum(selectedIds.length)}
                                    </span>
                                )}
                            </button>

                            {/* Advanced Filter Sliders */}
                            <button onClick={() => setShowAdvFilter(v => !v)}
                                className={`h-9 px-2.5 xs:px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilters.length > 0
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                <Sliders className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{tp('filterShort')}</span>
                                {activeFilters.length > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                        {tNum(activeFilters.length)}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Active Filter Chips */}
                    {activeFilters.length > 0 && (
                        <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2">
                            {activeFilters.map((f, i) => (
                                <button key={i} type="button" onClick={f.clear}
                                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title={tp('deleteFilter')}>
                                    {f.label}
                                    <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </span>
                                </button>
                            ))}
                            <button type="button" onClick={resetAllFilters}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600" title={tp('resetAllFilters')}>
                                <RotateCcw className="w-3.5 h-3.5" />
                                {tp('resetAllFilters')}
                            </button>
                        </div>
                    )}

                    {/* Row 2: Advanced Filter Panel */}
                    {showAdvFilter && (
                        <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                            {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                            <div className="flex items-center justify-between mb-3.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-3.5 bg-[var(--color-primary)] rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] flex items-center gap-2">
                                        <Sliders className="w-3 h-3 opacity-60" />
                                        <span className="sm:hidden">{tp('filterShort')}</span>
                                        <span className="hidden sm:inline">{tp('advancedFilter')}</span>
                                    </span>
                                </div>
                                <button
                                    onClick={resetAllFilters}
                                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-500/10"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span className="sm:hidden">{tp('resetShort')}</span>
                                    <span className="hidden sm:inline">{tp('resetAllFilters')}</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('filterCategory')}</label>
                                    <RichSelect
                                        value={filterType}
                                        onChange={(val) => { setFilterType(val); setPage(1) }}
                                        options={[
                                            { id: '', name: tp('allBehaviors') },
                                            { id: 'positive', name: `${tp('positive')} (+)` },
                                            { id: 'negative', name: `${tp('negative')} (−)` },
                                        ]}
                                        placeholder={tp('allBehaviors')}
                                        small
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('classLabel')}</label>
                                    <RichSelect
                                        value={filterClass}
                                        onChange={(val) => { setFilterClass(val); setPage(1) }}
                                        options={[
                                            { id: '', name: tp('allClasses') },
                                            ...classesList.map(c => ({ id: c, name: c }))
                                        ]}
                                        placeholder={tp('allClasses')}
                                        small
                                        searchable
                                        maxHeight={200}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">{tp('sortLabel')}</label>
                                    <RichSelect
                                        value={sortBy}
                                        onChange={(val) => { setSortBy(val); setPage(1) }}
                                        options={[
                                            { id: 'newest', name: `↓ ${tp('newest')}` },
                                            { id: 'oldest', name: `↑ ${tp('oldest')}` },
                                        ]}
                                        small
                                    />
                                </div>
                                <div className="flex items-end justify-end">
                                    <button onClick={() => setShowAdvFilter(false)}
                                        className="h-9 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                        {tp('closePanel')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── CONTENT ── */}
                {loading && reports.length === 0 ? (
                    viewMode === 'table' ? (
                        <TableSkeleton rows={10} cols={6} />
                    ) : (
                        <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-pulse">
                            <div className="p-4 sm:p-5">
                                <div className="relative pl-[28px] sm:pl-[64px]">
                                    {/* Vertical timeline line skeleton */}
                                    <div className="absolute top-0 bottom-0 pointer-events-none left-[14px] sm:left-[48px] w-[2px] bg-gradient-to-b from-[var(--color-border)]/40 via-[var(--color-border)]/20 to-transparent z-0" />
                                    
                                    {/* Group date skeleton */}
                                    {[1, 2].map((gi) => (
                                        <div key={gi} className={gi < 2 ? 'mb-7' : ''}>
                                            {/* Date Header skeleton */}
                                            <div className="relative mb-3.5 -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px] flex items-center">
                                                <div className="absolute pointer-events-none left-[9px] sm:left-[43px] w-4 h-4 rounded-full bg-[var(--color-border)]" />
                                                <div className="h-6 w-32 bg-[var(--color-border)] rounded-2xl" />
                                            </div>

                                            {/* Timeline Item skeletons */}
                                            <div className="space-y-2">
                                                {[1, 2].map((idx) => (
                                                    <div key={idx} className="relative -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">
                                                        <div className="absolute pointer-events-none left-[10px] sm:left-[44px] w-2.5 h-2.5 rounded-full bg-[var(--color-border)]" />
                                                        <div className="rounded-2xl border border-[var(--color-border)]/60 bg-[var(--color-surface)]/60 px-4 py-3.5 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[var(--color-border)] shrink-0" />
                                                            <div className="flex-1 space-y-2">
                                                                <div className="h-4 bg-[var(--color-border)] rounded-md w-1/3" />
                                                                <div className="h-3 bg-[var(--color-border)]/60 rounded w-2/3" />
                                                            </div>
                                                            <div className="w-12 h-6 bg-[var(--color-border)]/50 rounded-lg shrink-0" />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )
                ) : totalRows === 0 && !debouncedSearch && !filterType && !filterClass ? (
                    <div className="glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <div className="p-4 sm:p-5">
                            <EmptyState
                                variant="plain"
                                color="slate"
                                icon={ClipboardList}
                                title={tp('noReports')}
                                description={tp('noReportsDesc')}
                                action={
                                    <button onClick={handleAdd} disabled={!canInput} className="btn btn-primary h-10 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed">
                                        {canInput ? tp('createNow') : tp('readOnly')}
                                    </button>
                                }
                            />
                        </div>
                    </div>
                ) : viewMode === 'timeline' ? (

                    <div className={`glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-300 transition-all duration-300 relative ${loading ? 'opacity-65 pointer-events-none select-none blur-[0.5px]' : ''}`}>
                        {loading && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]/10 z-50 overflow-hidden">
                                <div className="h-full bg-[var(--color-primary)] animate-pulse w-full" />
                            </div>
                        )}
                        <div className="p-4 sm:p-5">
                            {reports.length === 0 ? (
                                <EmptyState
                                    variant="plain"
                                    color="slate"
                                    icon={Search}
                                    title={tp('noSearchResult')}
                                    description={tp('noSearchResultDesc')}
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            {tp('resetAllFilters')}
                                        </button>
                                    }
                                />
                            ) : (
                                /* Timeline container — mobile smaller padding left, desktop 64px */
                                <div className="relative pl-[28px] sm:pl-[64px]">

                                {/* Vertical line at x=14px on mobile, x=48px on desktop */}
                                <div className="absolute top-0 bottom-0 pointer-events-none left-[14px] sm:left-[48px] w-[2px] bg-gradient-to-b from-[var(--color-primary)]/30 via-[var(--color-border)] to-transparent z-0" />

                                {groupedReports.map(([date, items], gi) => (
                                    <div key={date} className={gi < groupedReports.length - 1 ? 'mb-7' : ''}>

                                        {/* ── Date header ── */}
                                        <div className="relative mb-3.5 -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">
                                            {/* Large double-ring dot on the line */}
                                            <div className="absolute pointer-events-none left-[9px] sm:left-[43px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center z-10 shadow-[0_0_8px_rgba(79,70,229,0.3)]">
                                                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] ring-2 ring-[var(--color-surface)]" />
                                            </div>
                                            <div className="flex items-center gap-3 bg-[var(--color-surface)]/95 backdrop-blur-md pl-4 pr-5 py-1.5 rounded-2xl border border-[var(--color-border)] w-fit shadow-md shadow-black/[0.02]">
                                                <span className="text-[11px] font-black uppercase text-[var(--color-text)] tracking-wider leading-none">{fmtDayLabel(date)}</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] opacity-40 animate-pulse" />
                                                <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-extrabold leading-none">{tNum(items.length)} {tp('reportCount')}</span>
                                            </div>
                                        </div>

                                        {/* ── Timeline items ── */}
                                        <div className="space-y-2">
                                            {items.map(r => {
                                                const isPos = (r.points ?? 0) > 0
                                                const stud = students.find(x => x.id === r.student_id)
                                                return (
                                                    <div key={r.id} className="relative group/item -ml-[28px] pl-[28px] sm:-ml-[64px] sm:pl-[64px]">

                                                        {/* Time — right-aligned in 0→36px zone. Hidden on mobile. */}
                                                        <div className="absolute pointer-events-none hidden sm:flex items-center justify-end left-0 top-1/2 -translate-y-1/2 w-[36px] z-[1]">
                                                            <span className="text-[10px] font-black uppercase tracking-wider tabular-nums leading-none text-[var(--color-text-muted)] opacity-40 group-hover/item:opacity-75 transition-opacity">
                                                                {fmtTime(r.reported_at)}
                                                            </span>
                                                        </div>

                                                        {/* Small colored dot — centered at line on desktop/mobile */}
                                                        <div className="absolute pointer-events-none left-[10px] sm:left-[44px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-[1] border-2 border-[var(--color-surface)] shadow-[0_0_8px_currentColor] transition-transform duration-200 group-hover/item:scale-125"
                                                            style={{
                                                                background: isPos ? '#10b981' : '#ef4444',
                                                                color: isPos ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)',
                                                            }} />

                                                        {/* Card — z=2 so it renders over the line/dot visually */}
                                                        <div style={{ position: 'relative', zIndex: 2 }}
                                                            onTouchStart={(e) => handleCardPressStart(e, r.id)}
                                                            onTouchEnd={(e) => handleCardPressEnd(e, r.id, r)}
                                                            onTouchMove={handleCardPressCancel}
                                                            onMouseDown={(e) => handleCardPressStart(e, r.id)}
                                                            onMouseUp={(e) => handleCardPressEnd(e, r.id, r)}
                                                            onMouseLeave={handleCardPressCancel}
                                                            onContextMenu={(e) => { if (window.innerWidth < 640) e.preventDefault(); }}
                                                            className={`rounded-2xl border px-4 py-3.5 transition-all duration-200 select-none sm:select-text ${
                                                                pressingId === r.id ? 'scale-[0.98]' : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.015]'
                                                            } ${selectedIds.includes(r.id)
                                                                ? 'bg-[var(--color-primary)]/[0.03] border-[var(--color-primary)]/40 ring-2 ring-[var(--color-primary)]/10 shadow-sm shadow-[var(--color-primary)]/5'
                                                                : isPos
                                                                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-emerald-500/30 hover:bg-emerald-500/[0.01]'
                                                                    : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-rose-500/30 hover:bg-rose-500/[0.01]'
                                                                }`}>

                                                            {/* ── DESKTOP layout ─────────────────────── */}
                                                            {pressingId === r.id && (
                                                                <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-primary)]/10 overflow-hidden rounded-t-2xl z-[10]">
                                                                    <div className="h-full bg-gradient-to-r from-[var(--color-primary)]/60 to-[var(--color-primary)]"
                                                                        style={{
                                                                            animation: 'longpress-progress 800ms linear forwards'
                                                                        }} />
                                                                </div>
                                                            )}

                                                            <div className="hidden sm:flex items-center gap-3">
                                                                {/* Checkbox */}
                                                                <input type="checkbox"
                                                                    checked={selectedIds.includes(r.id)}
                                                                    onChange={() => toggleSelect(r.id)}
                                                                    className="w-4 h-4 flex-shrink-0 rounded-md border-[var(--color-border)]/80 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 cursor-pointer transition-all hover:scale-105" />
                                                                {/* Avatar */}
                                                                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs shadow-inner ${isPos ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-2 ring-emerald-500/10' : 'bg-gradient-to-br from-rose-500/20 to-rose-500/5 text-rose-600 ring-2 ring-rose-500/10'}`}>
                                                                    {(tDb(stud?.name) || '?')[0].toUpperCase()}
                                                                </div>
                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="text-sm font-black text-[var(--color-text)] tracking-tight leading-none group-hover/item:text-[var(--color-primary)] transition-colors">
                                                                            {mask(tDb(stud?.name) || '—')}
                                                                        </span>
                                                                        {stud?.class_name && (
                                                                            <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest flex-shrink-0 shadow-sm">
                                                                                {stud.class_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[11px] font-bold text-[var(--color-text)] mt-1.5 flex items-center gap-2 leading-none">
                                                                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-rose-500 shadow-[0_0_4px_#f43f5e]'}`} />
                                                                        {getTypeName(r.violation_type_id)}
                                                                    </p>
                                                                    {r.notes && (
                                                                        <div className={`mt-2 py-1 px-3 border-l-2 ${isPos ? 'border-emerald-500/40 bg-emerald-500/[0.02]' : 'border-rose-500/40 bg-rose-500/[0.02]'} rounded-r-xl max-w-xl shadow-inner`}>
                                                                            <p className="text-[10px] italic font-semibold text-[var(--color-text-muted)] opacity-85 leading-relaxed break-words">
                                                                                "{mask(tDb(r.notes))}"
                                                                            </p>
                                                                        </div>
                                                                    )}

                                                                </div>
                                                                {/* Points + Actions */}
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <div className={`flex items-center justify-center min-w-[46px] h-6 rounded-full text-[11px] font-black tracking-tight border ${isPos
                                                                        ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/20 text-emerald-600 border-emerald-500/30 shadow-sm shadow-emerald-500/5'
                                                                        : 'bg-gradient-to-r from-rose-500/10 to-rose-500/20 text-rose-600 border-rose-500/30 shadow-sm shadow-rose-500/5'}`}>
                                                                        {isPos ? '+' : ''}{tNum(r.points)}
                                                                    </div>
                                                                    <button onClick={() => handleOpenDetail(r)} className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:scale-105 active:scale-95 transition-all">
                                                                        <Eye className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => handleEdit(r)} className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 hover:scale-105 active:scale-95 transition-all">
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => { setItemToDelete(r); setIsDeleteModalOpen(true) }} className="w-8 h-8 flex items-center justify-center rounded-xl text-[var(--color-text-muted)] hover:text-rose-600 hover:bg-rose-600/10 hover:scale-105 active:scale-95 transition-all">
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* ── MOBILE layout ──────────────────────── */}
                                                            <div className="flex sm:hidden flex-col gap-3">
                                                                {/* Top: Avatar + Name/Class + Points */}
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs transition-all duration-200 ${selectedIds.includes(r.id) ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 rotate-0 scale-100' : isPos ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-2 ring-emerald-500/10' : 'bg-gradient-to-br from-rose-500/20 to-rose-500/5 text-rose-600 ring-2 ring-rose-500/10'}`}>
                                                                            {selectedIds.includes(r.id) ? (
                                                                                <CheckCircle2 className="w-4 h-4 animate-in zoom-in-50 duration-200" />
                                                                            ) : (
                                                                                (tDb(stud?.name) || '?')[0].toUpperCase()
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <span className="block text-[13px] font-black text-[var(--color-text)] tracking-tight leading-tight truncate">
                                                                                {mask(tDb(stud?.name) || '—')}
                                                                            </span>
                                                                            {stud?.class_name && (
                                                                                <span className="block text-[10px] text-[var(--color-text-muted)] mt-0.5 font-medium truncate">
                                                                                    {stud.class_name}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className={`shrink-0 flex items-center justify-center min-w-[34px] h-5 rounded-full text-[10px] font-black border ${isPos
                                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                                        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                                                        {isPos ? '+' : ''}{tNum(r.points)}
                                                                    </div>
                                                                </div>

                                                                {/* Type */}
                                                                <div className="pl-[42px]">
                                                                    <p className="text-[11px] font-bold text-[var(--color-text)] flex items-center gap-1.5 leading-snug">
                                                                        <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${isPos ? 'bg-emerald-500 shadow-[0_0_4px_#10b981]' : 'bg-rose-500 shadow-[0_0_4px_#f43f5e]'}`} />
                                                                        {getTypeName(r.violation_type_id)}
                                                                    </p>
                                                                </div>

                                                                {/* Notes */}
                                                                {r.notes && (
                                                                    <div className="ml-[42px] py-1 px-2.5 border-l-2 border-[var(--color-border)] bg-[var(--color-surface-alt)]/35 rounded-r-lg">
                                                                        <p className="text-[10px] italic font-semibold text-[var(--color-text-muted)] opacity-85 leading-relaxed break-words">
                                                                            "{mask(tDb(r.notes))}"
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* Footer: Date/Reporter & Actions */}
                                                                <div className="flex items-center justify-between gap-2 mt-1 pt-2.5 border-t border-[var(--color-border)]/40 pl-[42px]">
                                                                    <div className="text-[10px] text-[var(--color-text-muted)] font-medium truncate leading-none">
                                                                        {fmtTime(r.reported_at)}
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                                        <button onClick={() => handleOpenDetail(r)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 active:scale-95 transition-all">
                                                                            <Eye className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button onClick={() => handleEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 active:scale-95 transition-all">
                                                                            <Edit2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                        <button onClick={() => { setItemToDelete(r); setIsDeleteModalOpen(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-rose-600 hover:border-rose-500/40 active:scale-95 transition-all">
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
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
                            )}
                        </div>
                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label={tp('reportCount')}
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    </div>

                ) : (
                    /* ═══════════════════════════════════════════════════════════
                       TABLE VIEW — pagination inside the same card
                    ═══════════════════════════════════════════════════════════ */
                    <div className={`glass rounded-2xl border border-[var(--color-border)] overflow-hidden animate-in fade-in duration-300 transition-all duration-300 relative ${loading ? 'opacity-65 pointer-events-none select-none blur-[0.5px]' : ''}`}>
                        {loading && (
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]/10 z-50 overflow-hidden">
                                <div className="h-full bg-[var(--color-primary)] animate-pulse w-full" />
                            </div>
                        )}
                        {reports.length === 0 ? (
                            <div className="p-4 sm:p-5">
                                <EmptyState
                                    variant="plain"
                                    color="slate"
                                    icon={Search}
                                    title={tp('noSearchResult')}
                                    description={tp('noSearchResultDesc')}
                                    action={
                                        <button
                                            type="button"
                                            onClick={resetAllFilters}
                                            className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all"
                                        >
                                            {tp('resetAllFilters')}
                                        </button>
                                    }
                                />
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[750px]">
                                        <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                            <tr>
                                                <th className="px-4 py-3.5 w-10 text-center">
                                                    <input type="checkbox" checked={allSelected}
                                                        onChange={() => setSelectedIds(allSelected ? [] : reports.map(r => r.id))}
                                                        className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer" />
                                                </th>
                                                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[25%]">{tp('studentCol')}</th>
                                                {visibleCols.type && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[35%]">{tp('reportType')}</th>}
                                                {visibleCols.points && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[10%]">{tp('points')}</th>}
                                                {visibleCols.time && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[15%]">{tp('time')}</th>}
                                                {visibleCols.teacher && <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[15%]">{tp('recordedBy')}</th>}
                                                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28 relative">
                                                    <span>{tp('actions')}</span>
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
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{tp('manageColumns')}</p>
                                                                {[
                                                                    { key: 'type', label: tp('reportType') },
                                                                    { key: 'points', label: tp('points') },
                                                                    { key: 'time', label: tp('time') },
                                                                    { key: 'teacher', label: tp('recordedBy') }
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
                                                                    {(tDb(s?.name) || '?')[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-[var(--color-text)] leading-tight truncate max-w-[200px]">{mask(tDb(s?.name) || '—')}</p>
                                                                    {s?.class_name && <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider opacity-50">{s.class_name}</p>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        {visibleCols.type && (
                                                            <td className="px-4 py-3">
                                                                <p className="text-xs font-bold text-[var(--color-text)]">{getTypeName(r.violation_type_id)}</p>
                                                                {r.notes && <p className="text-[10px] text-[var(--color-text-muted)] opacity-60 truncate max-w-[280px]">{mask(tDb(r.notes))}</p>}
                                                            </td>
                                                        )}
                                                        {visibleCols.points && (
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-0.5 rounded-full text-[11px] font-black border ${isP ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                                    {r.points > 0 ? '+' : ''}{tNum(r.points)}
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
                                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide opacity-50 truncate max-w-[140px]">{mask(r.teacher_name || '—')}</p>
                                                            </td>
                                                        )}
                                                        <td className="px-4 py-3 text-center relative">
                                                            <div className="flex items-center justify-center gap-1 transition-opacity duration-150">
                                                                <button onClick={() => handleOpenDetail(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all" title="Lihat detail">
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => handleEdit(r)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => { setItemToDelete(r); setIsDeleteModalOpen(true) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination
                                    totalRows={totalRows}
                                    page={page}
                                    pageSize={pageSize}
                                    setPage={setPage}
                                    setPageSize={setPageSize}
                                    label={tp('reportCount')}
                                    jumpPage={jumpPage}
                                    setJumpPage={setJumpPage}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* ── FLOATING BULK ACTION BAR ── */}
                <BulkActionsBar
                    selectedCount={selectedIds.length}
                    onClear={() => setSelectedIds([])}
                    title={tp('selected')}
                    subtitle={tp('bulkActions')}
                >
                    {/* Action 1: Export Selected */}
                    <button
                        onClick={() => {
                            setExportScope('selected');
                            setIsExportModalOpen(true);
                        }}
                        className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white justify-center shadow-lg shadow-emerald-500/5"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>{tp('exportData')}</span>
                    </button>

                    {/* Action 2: Delete Selected (Only for roles with input capability) */}
                    {canInput && (
                        <button
                            onClick={() => setIsBulkDeleteOpen(true)}
                            className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white justify-center shadow-lg shadow-red-500/5"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{tp('delete')}</span>
                        </button>
                    )}
                </BulkActionsBar>

                {/* ── WIZARD FORM MODAL ── */}
                <BehaviorFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedItem={selectedItem}
                    students={students}
                    violationTypes={violationTypes}
                    classesList={classesList}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                />

                {/* ── DELETE MODAL ── */}
                <Modal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    title={tp('deleteReport')}
                    description={tp('deleteReportDesc')}
                    icon={Trash2}
                    iconBg="bg-red-500/10"
                    iconColor="text-red-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                {tp('cancel')}
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                )}
                                {tp('yesDelete')}
                            </button>
                        </div>
                    }
                >
                    <div className="px-1">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            {(() => {
                                const deleteConfirmText = tp('deleteConfirmTemplate')
                                    .replace('{student}', '___STUDENT___')
                                    .replace('{points}', '___POINTS___');
                                const parts = deleteConfirmText.split(/(___STUDENT___|___POINTS___)/);
                                return parts.map((part, i) => {
                                    if (part === '___STUDENT___') {
                                        return (
                                            <span key={i} className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                                {mask(students.find(s => s.id === itemToDelete?.student_id)?.name || '')}
                                            </span>
                                        );
                                    }
                                    if (part === '___POINTS___') {
                                        return (
                                            <span key={i} className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">
                                                {itemToDelete?.points > 0 ? `+${tNum(itemToDelete.points)}` : tNum(itemToDelete?.points)}
                                            </span>
                                        );
                                    }
                                    return part;
                                });
                            })()}
                        </p>
                    </div>
                </Modal>

                {/* ── BULK DELETE MODAL ── */}
                <Modal
                    isOpen={isBulkDeleteOpen}
                    onClose={() => setIsBulkDeleteOpen(false)}
                    title={tp('bulkDelete')}
                    description={tp('bulkDeleteDesc')}
                    icon={Trash2}
                    iconBg="bg-red-500/10"
                    iconColor="text-red-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => setIsBulkDeleteOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                {tp('cancel')}
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleBulkDelete}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                )}
                                {tp('yesDelete')} {tNum(selectedIds.length)} {tp('reportCount')}
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        {/* Warning text */}
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            {tp('bulkDeleteWarning1')} <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{tNum(selectedIds.length)} {tp('reportCount')}</span> {tp('bulkDeleteWarning2')}
                        </p>

                        {/* Preview list of reports to be deleted */}
                        <div className={`rounded-xl border border-red-500/10 bg-red-500/[0.03] overflow-hidden ${selectedIds.length > 4 ? 'max-h-[200px] overflow-y-auto' : ''}`}>
                            {selectedIds.map((id, idx) => {
                                const r = reports.find(x => x.id === id)
                                if (!r) return null
                                const s = students.find(x => x.id === r.student_id)
                                const isPos = (r.points ?? 0) > 0
                                return (
                                    <div key={id} className={`flex items-center gap-2.5 px-3 py-2 ${idx < selectedIds.length - 1 ? 'border-b border-red-500/10' : ''}`}>
                                        {/* Avatar */}
                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${isPos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                                            {(s?.name || '?')[0].toUpperCase()}
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-black text-[var(--color-text)] truncate">{isPrivacyMode ? mask(s?.name || '—') : (s?.name || '—')}</p>
                                            <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 truncate">{getTypeName(r.violation_type_id)}</p>
                                        </div>
                                        {/* Points badge */}
                                        <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-lg border ${isPos ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                            {isPos ? '+' : ''}{tNum(r.points)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </Modal>

                {/* ── DETAIL MODAL ── */}
                <BehaviorDetailModal
                    isOpen={isDetailOpen}
                    onClose={() => { setIsDetailOpen(false); setDetailItem(null); }}
                    detailItem={detailItem}
                    students={students}
                    violationTypes={violationTypes}
                    isPrivacyMode={isPrivacyMode}
                    canInput={canInput}
                    onEdit={(r) => { setSelectedItem(r); setIsModalOpen(true) }}
                    onDelete={(r) => { setItemToDelete(r); setIsDeleteModalOpen(true) }}
                />

            </div>
        </DashboardLayout >
    )
}