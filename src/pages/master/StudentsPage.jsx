import React from 'react'
import { useState, useRef, useEffect, useCallback, memo, useMemo, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTable,
    faThumbtack,
    faPlus,
    faSearch,
    faEdit,
    faTrash,
    faMars,
    faVenus,
    faDownload,
    faShieldHalved,
    faPenNib,
    faPaperPlane,
    faUpload,
    faUsers,
    faTrophy,
    faSpinner,
    faHistory,
    faQrcode,
    faIdCard,
    faArrowTrendUp,
    faArrowTrendDown,
    faCheckCircle,
    faGraduationCap,
    faCamera,
    faChevronLeft,
    faChevronRight,
    faAnglesLeft,
    faAnglesRight,
    faTriangleExclamation,
    faPrint,
    faXmark,
    faSliders,
    faTableList,
    faSchool,
    faBullhorn,
    faArchive,
    faBoxArchive,
    faRotateLeft,
    faUserTie,
    faCrown,
    faMedal,
    faLink,
    faClockRotateLeft,
    faArrowRightArrowLeft,
    faCheck,
    faChevronDown,
    faFileLines,
    faImage,
    faBolt,
    faTags,
    faEye,
    faEyeSlash,
    faCircleExclamation,
    faKeyboard,
    faCircleInfo,
    faArrowRight,
    faArrowLeft,
    faSync,
    faRotate,
    faArrowUpFromBracket,
    faFileImport,
    faFileExport,
    faClipboardList,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import mbsLogo from '../../assets/mbs.png'
import { SortOptions, RiskThreshold, AvailableTags, getTagColor, calculateCompleteness, maskInfo, formatRelativeDate } from '../../utils/students/studentsConstants'
import { generateStudentPDF as _generateStudentPDF, handlePrintThermal as _handlePrintThermal, handleSavePNG as _handleSavePNG } from '../../utils/students/studentPdfUtils'

// NOTE(perf): library import/export di-load on-demand via dynamic import
// NOTE(perf): jsPDF/html2canvas/qrcode/autotable di-load on-demand via dynamic import

// FIX BOTTOM NAV Z-INDEX:
// Di DashboardLayout atau komponen BottomNav, pastikan z-index bottom nav
// lebih tinggi dari backdrop modal (z-[60]). Contoh:
//   <nav className="fixed bottom-0 z-[80] ...">
// Ini mencegah backdrop modal mencover bottom nav sehingga tap nav tetap berfungsi.

import StudentFormModal from '../../components/students/StudentFormModal'
import { StudentRow, StudentMobileCard } from '../../components/students/StudentRow'

const LazyQRCodeCanvas = React.lazy(() =>
    import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas }))
)

const LazyStudentPrintModal = React.lazy(() =>
    import('../../components/students/StudentPrintModal')
)
const LazyStudentProfileModal = React.lazy(() =>
    import('../../components/students/StudentProfileModal')
)
const LazyStudentExportModal = React.lazy(() =>
    import('../../components/students/StudentExportModal')
)
const LazyStudentImportModal = React.lazy(() =>
    import('../../components/students/StudentImportModal')
)

// â”€â”€ BehaviorHeatmap â€” outside StudentsPage to prevent re-creation on every render â”€â”€
const BehaviorHeatmap = memo(({ history }) => {
    const today = new Date()
    const rangeKey = `${today.getFullYear()}-${today.getMonth()}`
    const days = useMemo(() => {
        const end = new Date()
        const start = new Date(end)
        start.setMonth(end.getMonth() - 3)
        start.setDate(1)
        const out = []
        let curr = new Date(start)
        while (curr <= end) { out.push(new Date(curr)); curr.setDate(curr.getDate() + 1) }
        return out
    }, [rangeKey])
    const activityMap = useMemo(() => history.reduce((acc, item) => {
        const d = new Date(item.created_at).toDateString()
        acc[d] = (acc[d] || 0) + (item.points || 0)
        return acc
    }, {}), [history])
    const getLevel = (val) => {
        if (!val) return 'bg-[var(--color-surface-alt)] opacity-20'
        if (val > 0) {
            if (val > 10) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
            if (val > 5) return 'bg-emerald-400'
            return 'bg-emerald-300/60'
        } else {
            if (val < -10) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
            if (val < -5) return 'bg-red-400'
            return 'bg-red-300/60'
        }
    }
    return (
        <div className="flex flex-wrap gap-1">
            {days.map((d, i) => {
                const dateStr = d.toDateString()
                const val = activityMap[dateStr] || 0
                return <div key={i} title={`${dateStr}: ${val} poin`} className={`w-2.5 h-2.5 rounded-[2px] transition-all cursor-help hover:scale-125 hover:z-10 ${getLevel(val)}`} />
            })}
        </div>
    )
})


export default function StudentsPage() {
    const [students, setStudents] = useState([])
    const [classesList, setClassesList] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [sortBy, setSortBy] = useState('name_asc')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    // activeModal: satu state untuk 14 modal sekunder (hemat re-render)
    const [activeModal, setActiveModal] = useState(null)
    const closeModal = useCallback(() => setActiveModal(null), [])
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [studentToDelete, setStudentToDelete] = useState(null)
    // formData dikelola di StudentFormModal (terpisah) agar tidak trigger re-render parent saat mengetik
    // Di parent hanya perlu formData untuk handleSubmit dan handleEdit (pass via ref)
    const [submitting, setSubmitting] = useState(false)
    const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null)
    const [behaviorHistory, setBehaviorHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedStudentIds, setSelectedStudentIds] = useState([])

    const selectedIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds])
    const selectedStudents = useMemo(() => {
        if (!selectedStudentIds.length) return []
        return students.filter((s) => selectedIdSet.has(s.id))
    }, [students, selectedIdSet, selectedStudentIds.length])
    const selectedStudentsWithPhone = useMemo(() => selectedStudents.filter((s) => s.phone), [selectedStudents])

    // Mobile bottom-nav overlap guard (floating bulk bar / quick add)
    const MOBILE_BOTTOM_NAV_PX = 72
    const [bulkClassId, setBulkClassId] = useState('')
    const [globalStats, setGlobalStats] = useState({ total: 0, boys: 0, girls: 0, avgPoints: 0, risk: 0, worstClass: null, topPerformer: null, incompleteCount: 0, noPhoneCount: 0, avgPointsLastWeek: null })
    const [totalRows, setTotalRows] = useState(0)
    const [lastReportMap, setLastReportMap] = useState({})
    const [pendingArchive, setPendingArchive] = useState(null)
    // formData ref: diisi oleh StudentFormModal via onFormChange agar handleSubmit bisa akses
    const formDataRef = useRef({ name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah' })

    // =========================================
    // Advanced Import and Export System
    // =========================================
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    // Export Wizard state
    const [exportScope, setExportScope] = useState('filtered')   // 'filtered' | 'selected' | 'all'
    const [exportColumns, setExportColumns] = useState({
        id: false,
        kode: true,
        nisn: false,
        nama: true,
        gender: true,
        kelas: true,
        poin: true,
        phone: true,
        status: false,
        tags: true,
        kelengkapan: false,
    })

    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([])
    const [importIssues, setImportIssues] = useState([])
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [importStep, setImportStep] = useState(1) // 1: Upload, 2: Mapping, 3: Review
    const [importRawData, setImportRawData] = useState([]) // original rows from file
    const [importFileHeaders, setImportFileHeaders] = useState([]) // headers from file
    const [importColumnMapping, setImportColumnMapping] = useState({}) // { sys_key: user_header }
    const [importDuplicates, setImportDuplicates] = useState([]) // row indices flagged as duplicate
    const [importSkipDupes, setImportSkipDupes] = useState(true) // skip duplicates on commit
    const [importDragOver, setImportDragOver] = useState(false) // drag-drop highlight
    const [importValidationOpen, setImportValidationOpen] = useState(false) // collapsible validation notes
    const [importLoading, setImportLoading] = useState(false) // loading state during file parsing
    const [isRevalidating, setIsRevalidating] = useState(false) // spinning icon state for Re-validasi button
    const [importEditCell, setImportEditCell] = useState(null) // { idx, key }
    const [importCachedDBStudents, setImportCachedDBStudents] = useState({ names: new Set(), nisns: new Set() })
    const [exporting, setExporting] = useState(false)
    // Raport Bulanan â†’ navigate ke /raport
    const navigate = useNavigate()

    const importReadyRows = useMemo(() => {
        if (!importPreview.length) return []
        const errorSet = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        const dupeSet = new Set(importDuplicates)
        return importPreview.filter((_, i) => {
            if (errorSet.has(i)) return false
            if (importSkipDupes && dupeSet.has(i)) return false
            return true
        })
    }, [importPreview, importIssues, importDuplicates, importSkipDupes])

    // Effect to re-validate on manual preview edits (Inline Editing)
    useEffect(() => {
        if (isImportModalOpen && importStep === 3 && importPreview.length > 0) {
            // Note: we only trigger if validPreview changes, but we must avoid infinite loops
            // The validateImportPreview itself sets state, so we must be CAREFUL.
            // A better way is to only call this on Cell Blur.
        }
    }, [importSkipDupes])

    // Rentang Poin Filter
    const [filterPointMode, setFilterPointMode] = useState('')
    const [filterPointMin, setFilterPointMin] = useState('')
    const [filterPointMax, setFilterPointMax] = useState('')
    const [filterCompleteness, setFilterCompleteness] = useState('') // 'missing_photo', 'missing_phone', ''
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)

    // NEW: Soft Delete / Arsip
    const [archivedStudents, setArchivedStudents] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [archivePage, setArchivePage] = useState(1)
    const archivePageSize = 10

    // NEW: Riwayat Kelas
    const [classHistory, setClassHistory] = useState([])
    const [loadingClassHistory, setLoadingClassHistory] = useState(false)

    // NEW: Quick Inline Add
    const [isInlineAddOpen, setIsInlineAddOpen] = useState(false)
    const [inlineForm, setInlineForm] = useState({ name: '', gender: 'L', class_id: '', phone: '' })
    const [submittingInline, setSubmittingInline] = useState(false)

    // NEW: Photo Storage upload progress
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // NEW: Class Breakdown Modal (Fitur 1)
    const [classBreakdownData, setClassBreakdownData] = useState(null)
    const [loadingBreakdown, setLoadingBreakdown] = useState(false)

    // NEW: Batch Reset Poin (Fitur 2)
    const [resetPointsClassId, setResetPointsClassId] = useState('')
    const [resettingPoints, setResettingPoints] = useState(false)

    // NEW: Student Status (Fitur 4)
    const [filterStatus, setFilterStatus] = useState('')
    const [filterMissing, setFilterMissing] = useState('') // 'photo' or 'wa'

    // NEW: Reset PIN (Fitur 5)
    const [resettingPin, setResettingPin] = useState(false)

    // PDF Card Capture
    const cardCaptureRef = useRef(null)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)

    // Duplicate Detection state ada di StudentFormModal

    // NEW: Student Tags / Labels (Fitur 7)
    const [studentForTags, setStudentForTags] = useState(null)
    const [filterTag, setFilterTag] = useState('')
    const [allUsedTags, setAllUsedTags] = useState([]) // Array of unique strings
    const [newTagInput, setNewTagInput] = useState('')
    const [tagToEdit, setTagToEdit] = useState(null)
    const [renameInput, setRenameInput] = useState('')

    // Bulk Tagging Setup
    const [bulkTagAction, setBulkTagAction] = useState('add') // 'add' or 'remove'
    const [tagStats, setTagStats] = useState({}) // { tag: count }

    // Privacy Mode (SaaS Security)
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [timelineFilter, setTimelineFilter] = useState('all')
    const [timelineVisible, setTimelineVisible] = useState(8)
    const [profileTab, setProfileTab] = useState('info') // 'info' | 'statistik' | 'laporan' | 'raport'
    // â”€â”€ Monthly raport history state
    const [raportHistory, setRaportHistory] = useState([])
    const [loadingRaport, setLoadingRaport] = useState(false)

    // Bulk Point Update (Fitur 14)
    const [bulkPointValue, setBulkPointValue] = useState(0)
    const [bulkPointLabel, setBulkPointLabel] = useState('')
    const [bulkPointMode, setBulkPointMode] = useState('individual') // 'individual' or 'group'

    // =====================
    // COLUMN VISIBILITY
    // =====================
    const [visibleColumns, setVisibleColumns] = useState({
        gender: true,
        kelas: true,
        poin: true,
        aksi: true,
    })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [colMenuPos, setColMenuPos] = useState({ top: 0, right: 0, showUp: false })
    const colMenuRef = useRef(null)

    // Close dropdown saat klik luar
    useEffect(() => {
        const handler = (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) {
                setIsColMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const toggleColumn = (col) => {
        setVisibleColumns(prev => ({ ...prev, [col]: !prev[col] }))
    }

    // NEW: Multi-Filter Kelas (Fitur 8)
    const [filterClasses, setFilterClasses] = useState([]) // array of class ids

    // NEW: Audit Trail (Fitur 10)
    const [isAuditLogOpen, setIsAuditLogOpen] = useState(false)
    const [auditStudentId, setAuditStudentId] = useState(null)

    // NEW: Bulk Photo Matcher (Sultan Fitur 2)
    const [bulkPhotoFiles, setBulkPhotoFiles] = useState([])
    const [bulkPhotoMatches, setBulkPhotoMatches] = useState([])
    const [matchingPhotos, setMatchingPhotos] = useState(false)
    const [uploadingBulkPhotos, setUploadingBulkPhotos] = useState(false)

    // NEW: Guardian Broadcast Hub (Sultan Fitur 3)
    const [broadcastTemplate, setBroadcastTemplate] = useState('summary') // 'summary', 'points', 'security', 'custom'
    const [customWaMsg, setCustomWaMsg] = useState('')
    const [broadcastIndex, setBroadcastIndex] = useState(-1)
    const [broadcastResults, setBroadcastResults] = useState({}) // { studentId: 'sent'|'pending' }
    const [auditLogs, setAuditLogs] = useState([])
    const [loadingAudit, setLoadingAudit] = useState(false)

    // NEW: Template WA Customizable (Fitur 11)
    const [waTemplate, setWaTemplate] = useState(`Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu wali dari ananda {nama}. Kami sampaikan informasi terkini dari sistem *Laporanmu* â€” MBS Tanggul.\n\n*Data Akademik Ananda:*\nâ€¢ Kelas : {kelas}\nâ€¢ ID Reg : {kode}\nâ€¢ Poin Perilaku : {poin} poin\n\n*Akses Portal Orang Tua:*\nPortal  : [URL]\nPIN     : {pin}\n\nGunakan ID Reg & PIN untuk memantau perkembangan putera/puteri Bapak/Ibu secara real-time.\n\nWassalamu'alaikum Wr. Wb.\n_MBS Tanggul Â· Sistem Laporanmu_`)

    // NEW: Import Google Sheets (Fitur 12)
    const [gSheetsUrl, setGSheetsUrl] = useState('')
    const [fetchingGSheets, setFetchingGSheets] = useState(false)

    // NEW: Dropdown menu header
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)
    useEffect(() => {
        const handler = (e) => {
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false)
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // showOptionalFields dikelola di StudentFormModal

    // NEW: Photo Hover Zoom (Fitur 13)
    const [photoZoom, setPhotoZoom] = useState(null) // { url, name, x, y }

    // FIX: ref import dan ref foto dipisah (sebelumnya bentrok)
    const importFileInputRef = useRef(null)
    const photoInputRef = useRef(null)
    const searchInputRef = useRef(null)

    const { addToast, addUndoToast } = useToast()

    // access.teacher_students â€” kalau off, guru hanya bisa lihat (read-only)
    const { enabled: teacherStudentsEnabled } = useFlag('access.teacher_students')
    const canEdit = teacherStudentsEnabled

    // =========================================
    // Pagination + Filter + Sort
    // =========================================
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [jumpPage, setJumpPage] = useState('')

    const deferredSearchQuery = useDeferredValue(searchQuery)
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(deferredSearchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [deferredSearchQuery])

    useEffect(() => {
        try {
            const saved = localStorage.getItem('students_filters')
            if (saved) {
                const f = JSON.parse(saved)
                if (f.filterGender) setFilterGender(f.filterGender)
                if (f.filterStatus) setFilterStatus(f.filterStatus)
                if (f.filterTag) setFilterTag(f.filterTag)
                if (f.sortBy) setSortBy(f.sortBy)
                if (f.pageSize) setPageSize(f.pageSize)
            }
        } catch { /* ignore */ }
    }, [])

    // FIX #15: Simpan filter ke localStorage setiap kali berubah
    useEffect(() => {
        try {
            localStorage.setItem('students_filters', JSON.stringify({
                filterGender, filterStatus, filterTag, sortBy, pageSize,
            }))
        } catch { /* ignore */ }
    }, [filterGender, filterStatus, filterTag, sortBy, pageSize])

    // =========================================
    // Load Data
    // =========================================
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            // Fetch classes list for the form
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')
            if (classesError) throw classesError
            setClassesList(classesData || [])
            fetchUsedTags()

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            const sortMap = {
                name_asc: { col: 'name', asc: true },
                name_desc: { col: 'name', asc: false },
                class_asc: { col: 'class_id', asc: true },
                points_desc: { col: 'total_points', asc: false },
                total_points_desc: { col: 'total_points', asc: false },
                points_asc: { col: 'total_points', asc: true },
                created_at: { col: 'created_at', asc: false },
            }
            const orderCfg = sortMap[sortBy] || sortMap.name_asc

            let q = supabase
                .from('students')
                .select(`*, classes (id, name)`, { count: 'exact' })
                .order(orderCfg.col, { ascending: orderCfg.asc })
                .range(from, to)
                .is('deleted_at', null)

            // Filtering logic
            if (filterClasses.length === 1) q = q.eq('class_id', filterClasses[0])
            else if (filterClasses.length > 1) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])

            // NEW: filterMissing logic
            if (filterMissing === 'photo') {
                q = q.or('photo_url.is.null,photo_url.eq.""')
            } else if (filterMissing === 'wa') {
                q = q.or('phone.is.null,phone.eq.""')
            }

            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
            }
            if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }

            const { data: studentsData, error: studentsError, count } = await q
            if (studentsError) throw studentsError

            setTotalRows(count ?? 0)

            // OPTIMIZATION: Fetch ALL points for ranking across pages
            const { data: allPointsData } = await supabase
                .from('students')
                .select('id, class_id, total_points')
                .is('deleted_at', null)
                .order('total_points', { ascending: false })

            // Create rank map per class
            const globalRankMap = {}
            if (allPointsData) {
                const classBuckets = {}
                allPointsData.forEach(s => {
                    if (!classBuckets[s.class_id]) classBuckets[s.class_id] = []
                    classBuckets[s.class_id].push(s)
                })
                Object.values(classBuckets).forEach(arr => {
                    let currentRank = 0
                    let lastPoints = -999999 // fallback
                    let skip = 0

                    arr.forEach((s) => {
                        const pts = s.total_points ?? 0
                        // Fitur Ranking hanya berlaku untuk poin positif (> 0)
                        if (pts > 0) {
                            skip++
                            if (pts !== lastPoints) {
                                currentRank = skip
                                lastPoints = pts
                            }
                            globalRankMap[s.id] = currentRank
                        } else {
                            globalRankMap[s.id] = '-'
                        }
                    })
                })
            }

            // Fetch last reports with points for meaningful trend
            const ids = (studentsData || []).map(s => s.id)
            const trendMap = {}
            if (ids.length > 0) {
                const { data: reportsData } = await supabase
                    .from('reports')
                    .select('student_id, created_at, points')
                    .in('student_id', ids)
                    .order('created_at', { ascending: false })

                const map = {}
                    ; (reportsData || []).forEach(r => {
                        if (!map[r.student_id]) {
                            map[r.student_id] = r.created_at
                            // Trend reflects the nature of the latest report
                            trendMap[r.student_id] = r.points > 0 ? 'up' : r.points < 0 ? 'down' : 'neutral'
                        }
                    })
                setLastReportMap(map)
            } else {
                setLastReportMap({})
            }

            const transformed = (studentsData || []).map(s => {
                const pts = s.total_points ?? 0
                return {
                    ...s,
                    className: s.classes?.name || '-',
                    code: s.registration_code,
                    points: pts,
                    trend: trendMap[s.id] || 'neutral',
                    _rank: globalRankMap[s.id] || '-',
                    is_pinned: s.is_pinned || false,
                }
            })

            // Pinned siswa selalu di atas
            transformed.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))

            setStudents(transformed)
        } catch (err) {
            console.error('Fetch error:', err)
            addToast('Gagal memuat data dari database', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, pageSize, sortBy, filterGender, filterStatus, filterTag, filterMissing, debouncedSearch, filterClasses, filterClass, filterPointMode, filterPointMin, filterPointMax, addToast])

    const fetchStats = useCallback(async () => {
        try {
            const { data: statsData } = await supabase
                .from('students')
                .select('id, name, gender, total_points, class_id, photo_url, phone, nisn, metadata, classes(name)')
                .is('deleted_at', null)
            if (!statsData) return
            const total = statsData.length
            const boys = statsData.filter(s => s.gender === 'L').length
            const girls = statsData.filter(s => s.gender === 'P').length
            const risk = statsData.filter(s => (s.total_points || 0) < RiskThreshold).length
            const avgPoints = total > 0
                ? Math.round(statsData.reduce((acc, s) => acc + (s.total_points || 0), 0) / total)
                : 0

            // Insight: data tidak lengkap (score < 80%)
            const incompleteCount = statsData.filter(s => calculateCompleteness(s) < 80).length

            // Insight: tanpa nomor WA
            const noPhoneCount = statsData.filter(s => !s.phone).length

            // Insight: top performer
            const sorted = [...statsData].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
            const topPerformer = sorted[0] && (sorted[0].total_points || 0) > 0
                ? { name: sorted[0].name, points: sorted[0].total_points, className: sorted[0].classes?.name || '' }
                : null

            // Insight: kelas rata-rata poin terendah
            const classBuckets = {}
            statsData.forEach(s => {
                const cn = s.classes?.name || 'Tanpa Kelas'
                if (!classBuckets[cn]) classBuckets[cn] = []
                classBuckets[cn].push(s.total_points || 0)
            })
            let worstClass = null, worstAvg = 0
            Object.entries(classBuckets).forEach(([name, pts]) => {
                const avg = pts.reduce((a, b) => a + b, 0) / pts.length
                if (avg < worstAvg) { worstAvg = avg; worstClass = { name, avg: Math.round(avg), count: pts.length } }
            })

            // Insight: tren poin 7 hari terakhir
            let avgPointsLastWeek = null
            try {
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
                const { data: recentReports } = await supabase
                    .from('reports')
                    .select('points, created_at')
                    .gte('created_at', oneWeekAgo)
                if (recentReports && recentReports.length > 0) {
                    const weeklyDelta = recentReports.reduce((acc, r) => acc + (r.points || 0), 0)
                    avgPointsLastWeek = Math.round(weeklyDelta / (total || 1))
                }
            } catch { /* tabel mungkin belum ada */ }

            setGlobalStats({ total, boys, girls, avgPoints, risk, worstClass, topPerformer, incompleteCount, noPhoneCount, avgPointsLastWeek })
        } catch (err) {
            console.error('fetchStats error:', err)
        }
    }, [])

    // Ref agar realtime callback selalu pakai fetchData/fetchStats versi terbaru (hindari stale closure)
    const fetchDataRef = useRef(fetchData)
    const fetchStatsRef = useRef(fetchStats)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])
    useEffect(() => { fetchStatsRef.current = fetchStats }, [fetchStats])

    const fetchBehaviorHistory = useCallback(async (studentId) => {
        setLoadingHistory(true)
        try {
            const { data, error } = await supabase
                .from('reports')
                .select('id, description, notes, points, created_at, reported_at, teacher_name')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(100)

            if (error) {
                console.error('fetchBehaviorHistory error:', error)
                setBehaviorHistory([])
            } else {
                setBehaviorHistory(data || [])
            }
        } catch (err) {
            console.error('fetchBehaviorHistory catch:', err)
            setBehaviorHistory([])
        } finally {
            setLoadingHistory(false)
        }
    }, [])

    const fetchRaportHistory = useCallback(async (studentId) => {
        setLoadingRaport(true)
        try {
            const { data, error } = await supabase
                .from('student_monthly_reports')
                .select('id, month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, berat_badan, tinggi_badan, hari_sakit, hari_izin, hari_alpa, hari_pulang, catatan, musyrif_name')
                .eq('student_id', studentId)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
                .limit(24)
            if (error) { setRaportHistory([]) }
            else { setRaportHistory(data || []) }
        } catch { setRaportHistory([]) }
        finally { setLoadingRaport(false) }
    }, [])
    // eslint-disable-next-line react-hooks/exhaustive-deps

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, filterClass, filterClasses, filterGender, filterStatus, filterTag, filterMissing, sortBy, debouncedSearch, filterPointMode, filterPointMin, filterPointMax])

    // Initial load for stats cards (global, not paginated)
    useEffect(() => {
        fetchStats()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // FIX #5: Realtime â€” auto-refresh jika ada siswa ditambah/diubah/dihapus
    useEffect(() => {
        const channel = supabase
            .channel('students-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'students'
            }, () => {
                fetchDataRef.current()
                fetchStatsRef.current()
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    // clamp page
    useEffect(() => {
        if (page > totalPages && totalPages > 0) setPage(totalPages)
        if (page < 1) setPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, isModalOpen, activeModal, isImportModalOpen, isExportModalOpen, isPrintModalOpen,
        photoZoom, showAdvancedFilter, selectedStudentIds, students, isShortcutOpen])

    const getPageItems = (current, total) => {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

        const items = new Set([1, total, current, current - 1, current + 1])
        const cleaned = [...items]
            .filter(n => n >= 1 && n <= total)
            .sort((a, b) => a - b)

        const result = []
        for (let i = 0; i < cleaned.length; i++) {
            const n = cleaned[i]
            const prev = cleaned[i - 1]
            if (i > 0 && n - prev > 1) result.push('...')
            result.push(n)
        }
        return result
    }

    // =========================================
    // BASIC CRUD
    // =========================================
    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }

    const handleAdd = useCallback(() => {
        setSelectedStudent(null)
        formDataRef.current = { name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah', status: 'aktif', tags: [] }
        setIsModalOpen(true)
    }, [])

    const handleEdit = useCallback((student) => {
        setSelectedStudent(student)
        formDataRef.current = {
            name: student.name,
            gender: student.gender || 'L',
            class_id: student.class_id || '',
            phone: student.phone || '',
            photo_url: student.photo_url || '',
            nisn: student.nisn || '',
            guardian_name: student.guardian_name || '',
            guardian_relation: student.guardian_relation || 'Ayah',
            status: student.status || 'aktif',
            tags: student.tags || [],
        }
        setIsModalOpen(true)
    }, [])

    const confirmDelete = (student) => {
        setStudentToDelete(student)
        setActiveModal('delete')
    }

    const executeDelete = useCallback(async () => {
        if (!studentToDelete) return
        closeModal()
        const student = studentToDelete
        setStudentToDelete(null)

        // Sembunyikan dari UI dulu (optimistic)
        setStudents(prev => prev.filter(s => s.id !== student.id))

        const timerId = setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('students')
                    .update({ deleted_at: new Date().toISOString() })
                    .eq('id', student.id)
                if (error) throw error
                fetchData()
                fetchStats()
            } catch {
                addToast('Gagal mengarsipkan siswa', 'error')
                fetchData() // restore
            } finally {
                setPendingArchive(null)
            }
        }, 4000)

        setPendingArchive({ student, timerId })

        addToast(
            `${student.name} diarsipkan. Klik Undo untuk batalkan.`,
            'warning',
            {
                duration: 4000,
                action: {
                    label: 'Undo',
                    onClick: () => {
                        clearTimeout(timerId)
                        setPendingArchive(null)
                        fetchData()
                        addToast(`${student.name} dibatalkan`, 'success')
                    }
                }
            }
        )
    }, [studentToDelete, fetchData, fetchStats, addToast])

    const handleSubmit = useCallback(async (formData) => {
        if (!formData.name || formData.name.trim().length < 3 || !formData.class_id) {
            addToast('Nama (min 3 karakter) dan kelas wajib diisi', 'warning')
            return
        }

        setSubmitting(true)
        const newStudentData = {
            registration_code: generateCode(),
            pin: String(Math.floor(1000 + Math.random() * 9000)),
            total_points: 0,
            name: formData.name,
            gender: formData.gender,
            class_id: formData.class_id,
            phone: formData.phone,
            photo_url: formData.photo_url,
            nisn: formData.nisn || null,
            guardian_name: formData.guardian_name || null,
            guardian_relation: formData.guardian_relation || null,
            status: formData.status || 'aktif',
            tags: formData.tags || [],
        }

        try {
            if (selectedStudent) {
                const updatePayload = {
                    name: formData.name,
                    gender: formData.gender,
                    class_id: formData.class_id,
                    phone: formData.phone,
                    photo_url: formData.photo_url,
                    nisn: formData.nisn || null,
                    guardian_name: formData.guardian_name || null,
                    guardian_relation: formData.guardian_relation || null,
                    status: formData.status || 'aktif',
                    tags: formData.tags || [],
                }
                const { error } = await supabase
                    .from('students')
                    .update(updatePayload)
                    .eq('id', selectedStudent.id)
                if (error) throw error

                if (formData.class_id !== selectedStudent.class_id) {
                    try {
                        await supabase.from('student_class_history').insert([{
                            student_id: selectedStudent.id,
                            from_class_id: selectedStudent.class_id,
                            to_class_id: formData.class_id,
                            changed_at: new Date().toISOString(),
                            note: 'Diubah manual'
                        }])
                    } catch (e) {
                        console.error('Failed to insert history:', e)
                    }
                }
                addToast('Data siswa berhasil diperbarui', 'success')
            } else {
                const { error } = await supabase.from('students').insert([newStudentData])
                const studentToView = {
                    ...newStudentData,
                    code: newStudentData.registration_code,
                    className: classesList.find(c => c.id === newStudentData.class_id)?.name || '-'
                }
                setNewlyCreatedStudent(studentToView)
                setSelectedStudent(studentToView)
                setIsPrintModalOpen(true)
                addToast('Siswa berhasil didaftarkan', 'success')
            }
            setIsModalOpen(false)
            fetchData()
            fetchStats()
        } catch (err) {
            console.error('Submit error:', err)
            addToast('Gagal menyimpan data', 'error')
        } finally {
            setSubmitting(false)
        }
    }, [selectedStudent, fetchData, fetchStats, addToast, generateCode])



    // =========================================
    // BULK ACTIONS
    // =========================================
    const toggleSelectAll = () => {
        if (selectedStudentIds.length === students.length) {
            setSelectedStudentIds([])
        } else {
            setSelectedStudentIds(students.map(s => s.id))
        }
    }

    const toggleSelectStudent = (id) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleBulkPromote = async () => {
        if (!bulkClassId) {
            addToast('Pilih kelas tujuan terlebih dahulu', 'warning')
            return
        }
        setSubmitting(true)
        const idsToMove = [...selectedStudentIds]
        const count = idsToMove.length
        const { data: prevData } = await supabase
            .from('students').select('id, class_id').in('id', idsToMove)
        const prevClassMap = Object.fromEntries((prevData || []).map(s => [s.id, s.class_id]))
        try {
            const { error } = await supabase
                .from('students')
                .update({ class_id: bulkClassId })
                .in('id', idsToMove)
            if (error) throw error
            closeModal()
            setSelectedStudentIds([])
            fetchData()
            fetchStats()
            addUndoToast(
                `${count} siswa dipindahkan ke kelas baru`,
                async () => {
                    await Promise.all(idsToMove.map(id =>
                        supabase.from('students').update({ class_id: prevClassMap[id] }).eq('id', id)
                    ))
                    fetchData()
                    fetchStats()
                    addToast(`Pemindahan ${count} siswa dibatalkan`, 'success')
                }
            )
        } catch {
            addToast('Gagal memproses kenaikan kelas massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBulkDelete = async () => {
        if (!selectedStudentIds.length) return
        setSubmitting(true)
        const idsToDelete = [...selectedStudentIds]
        const count = idsToDelete.length
        try {
            const { error } = await supabase
                .from('students')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', idsToDelete)
            if (error) throw error
            closeModal()
            setSelectedStudentIds([])
            fetchData()
            fetchStats()
            addUndoToast(
                `${count} siswa diarsipkan`,
                async () => {
                    await supabase.from('students').update({ deleted_at: null }).in('id', idsToDelete)
                    fetchData()
                    fetchStats()
                    addToast(`${count} siswa berhasil dipulihkan`, 'success')
                }
            )
        } catch {
            addToast('Gagal mengarsipkan siswa terpilih', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // NEW: Fetch archived students
    const fetchArchivedStudents = async () => {
        setLoadingArchived(true)
        try {
            const { data, error } = await supabase
                .from('students')
                .select(`*, classes(name)`)
                .not('deleted_at', 'is', null)
                .order('deleted_at', { ascending: false })
            if (error) throw error
            setArchivedStudents((data || []).map(s => ({ ...s, className: s.classes?.name || '-' })))
        } catch {
            addToast('Gagal memuat arsip', 'error')
        } finally {
            setLoadingArchived(false)
        }
    }

    // NEW: Restore student from archive
    const handleRestoreStudent = async (student) => {
        try {
            const { error } = await supabase
                .from('students')
                .update({ deleted_at: null })
                .eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} berhasil dipulihkan`, 'success')
            fetchArchivedStudents()
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal memulihkan siswa', 'error')
        }
    }

    // NEW: Hard delete from archive
    const handlePermanentDelete = async (student) => {
        if (!window.confirm(`Hapus permanen "${student.name}"? Tidak bisa dibatalkan.`)) return
        try {
            const { error } = await supabase.from('students').delete().eq('id', student.id)
            if (error) throw error
            addToast(`${student.name} dihapus permanen`, 'success')
            fetchArchivedStudents()
        } catch {
            addToast('Gagal hapus permanen', 'error')
        }
    }

    // NEW: Fetch class history for a student
    const fetchClassHistory = async (studentId) => {
        setLoadingClassHistory(true)
        try {
            const { data, error } = await supabase
                .from('student_class_history')
                .select(`*, from_class:from_class_id(name), to_class:to_class_id(name)`)
                .eq('student_id', studentId)
                .order('changed_at', { ascending: false })
            if (error) throw error
            setClassHistory(data || [])
        } catch {
            setClassHistory([])
        } finally {
            setLoadingClassHistory(false)
        }
    }

    const handleViewClassHistory = (student) => {
        setSelectedStudent(student)
        fetchClassHistory(student.id)
        setActiveModal('classHistory')
    }

    // NEW: Fitur 1 - Class Breakdown
    const handleClassBreakdown = async (classId, className) => {
        setLoadingBreakdown(true)
        setActiveModal('classBreakdown')
        try {
            const { data } = await supabase
                .from('students')
                .select('id, name, gender, total_points, tags')
                .eq('class_id', classId)
                .is('deleted_at', null)
            if (data) {
                const boys = data.filter(s => s.gender === 'L').length
                const girls = data.filter(s => s.gender === 'P').length
                const avgPoints = data.length > 0
                    ? Math.round(data.reduce((a, s) => a + (s.total_points || 0), 0) / data.length)
                    : 0
                const riskCount = data.filter(s => (s.total_points || 0) <= RiskThreshold).length
                const sorted = [...data].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                const topStudents = sorted.slice(0, 3)
                setClassBreakdownData({ className, total: data.length, boys, girls, avgPoints, riskCount, topStudents, allStudents: sorted })
            }
        } catch { } finally {
            setLoadingBreakdown(false)
        }
    }

    // NEW: Fitur 2 - Batch Reset Poin
    const handleBatchResetPoints = async () => {
        setResettingPoints(true)
        try {
            let q = supabase.from('students').update({ total_points: 0 }).is('deleted_at', null)
            if (resetPointsClassId) q = q.eq('class_id', resetPointsClassId)
            const { error } = await q
            if (error) throw error
            addToast(resetPointsClassId ? 'Poin kelas berhasil direset' : 'Semua poin berhasil direset', 'success')
            closeModal()
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal reset poin', 'error')
        } finally {
            setResettingPoints(false)
        }
    }

    // NEW: Fitur 5 - Reset PIN
    const handleResetPin = async (student) => {
        if (!window.confirm(`Generate PIN baru untuk ${student.name}?`)) return
        setResettingPin(true)
        try {
            const newPin = String(Math.floor(1000 + Math.random() * 9000))
            const { error } = await supabase.from('students').update({ pin: newPin }).eq('id', student.id)
            if (error) throw error
            addToast(`PIN baru: ${newPin} â€” berhasil diperbarui`, 'success')
            // Auto kirim WA jika ada nomor
            if (student.phone) {
                const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
                const msg = `PIN baru Laporanmu untuk ${student.name}: *${newPin}*. Kode: ${student.code}`
                window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
            }
            fetchData()
            fetchStats()
            if (selectedStudent?.id === student.id) setSelectedStudent({ ...selectedStudent, pin: newPin })
        } catch {
            addToast('Gagal reset PIN', 'error')
        } finally {
            setResettingPin(false)
        }
    }

    // NEW: Fitur 6 - Duplicate Detection
    const checkDuplicate = async (name, classId) => {
        if (!name || name.trim().length < 3 || !classId) { setDuplicateWarning(null); return }
        setCheckingDuplicate(true)
        try {
            const { data } = await supabase
                .from('students')
                .select('id, name, registration_code')
                .ilike('name', `%${name.trim()}%`)
                .eq('class_id', classId)
                .is('deleted_at', null)
                .neq('id', selectedStudent?.id || 0)
                .limit(3)
            setDuplicateWarning(data?.length ? data : null)
        } catch { } finally {
            setCheckingDuplicate(false)
        }
    }

    // NEW: Fitur 7 - Tag management
    const fetchUsedTags = async () => {
        try {
            const { data } = await supabase.from('students').select('tags').is('deleted_at', null)
            if (data) {
                const stats = {}
                const uniqueTagsArr = []
                data.forEach(s => {
                    (s.tags || []).forEach(t => {
                        stats[t] = (stats[t] || 0) + 1
                        if (!uniqueTagsArr.includes(t)) uniqueTagsArr.push(t)
                    })
                })
                setAllUsedTags(uniqueTagsArr.sort())
                setTagStats(stats)
            }
        } catch { }
    }

    const handleBulkTagApply = async (tag) => {
        if (!tag || selectedStudentIds.length === 0) return
        setSubmitting(true)
        const idsToTag = [...selectedStudentIds]
        const count = idsToTag.length
        const action = bulkTagAction
        try {
            // Kita ambil data tags terbaru untuk tiap siswa terpilih dulu
            const { data } = await supabase.from('students').select('id, tags').in('id', idsToTag).is('deleted_at', null)
            const prevTagMap = Object.fromEntries((data || []).map(s => [s.id, s.tags || []]))
            if (data) {
                const updates = data.map(s => {
                    const current = s.tags || []
                    let next = []
                    if (action === 'add') {
                        next = Array.from(new Set([...current, tag]))
                    } else {
                        next = current.filter(t => t !== tag)
                    }
                    return supabase.from('students').update({ tags: next }).eq('id', s.id)
                })
                await Promise.all(updates)
                fetchData()
                fetchUsedTags()
                closeModal()
                setSelectedStudentIds([])
                addUndoToast(
                    `${count} siswa: label "${tag}" ${action === 'add' ? 'ditambahkan' : 'dihapus'}`,
                    async () => {
                        await Promise.all(idsToTag.map(id =>
                            supabase.from('students').update({ tags: prevTagMap[id] }).eq('id', id)
                        ))
                        fetchData()
                        fetchUsedTags()
                        addToast(`Perubahan label ${count} siswa dibatalkan`, 'success')
                    }
                )
            }
        } catch {
            addToast('Gagal update label massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBulkPointUpdate = async () => {
        if (!bulkPointValue || selectedStudentIds.length === 0) return
        setSubmitting(true)
        const idsToUpdate = [...selectedStudentIds]
        const count = idsToUpdate.length
        const pointDelta = bulkPointValue
        const { data: prevData } = await supabase
            .from('students').select('id, total_points').in('id', idsToUpdate)
        const prevPointMap = Object.fromEntries((prevData || []).map(s => [s.id, s.total_points || 0]))
        try {
            const updates = idsToUpdate.map(async (sid) => {
                // 1. Get current points
                const oldPoints = prevPointMap[sid] ?? 0
                const newPoints = oldPoints + pointDelta

                // 2. Update Student Points
                await supabase.from('students').update({ total_points: newPoints }).eq('id', sid)

                // 3. Create History Log
                return supabase.from('point_history').insert([{
                    student_id: sid,
                    points: pointDelta,
                    label: bulkPointLabel || 'Aksi Massal',
                    created_at: new Date().toISOString()
                }])
            })

            await Promise.all(updates)
            fetchData()
            closeModal()
            setBulkPointValue(0)
            setBulkPointLabel('')
            setSelectedStudentIds([])
            addUndoToast(
                `${count} siswa: poin ${pointDelta > 0 ? '+' : ''}${pointDelta}`,
                async () => {
                    await Promise.all(idsToUpdate.map(id =>
                        supabase.from('students').update({ total_points: prevPointMap[id] }).eq('id', id)
                    ))
                    fetchData()
                    fetchStats()
                    addToast(`Perubahan poin ${count} siswa dibatalkan`, 'success')
                }
            )
        } catch {
            addToast('Gagal update poin massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleTag = async (student, tag) => {
        if (!tag) return
        const currentTags = student.tags || []
        const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
        try {
            const { error } = await supabase.from('students').update({ tags: newTags }).eq('id', student.id)
            if (error) throw error
            setStudentForTags({ ...student, tags: newTags })
            addToast(`Label '${tag}' diperbarui`, 'success')
            fetchData()
            fetchUsedTags()
        } catch {
            addToast('Gagal update label', 'error')
        }
    }

    const handleAddCustomTag = (e) => {
        if (e.key === 'Enter') {
            const tag = newTagInput.trim()
            if (tag && studentForTags) {
                handleToggleTag(studentForTags, tag)
                setNewTagInput('')
            }
        }
    }

    const handleGlobalDeleteTag = async (oldTag) => {
        if (!window.confirm(`Hapus label '${oldTag}' dari SEMUA siswa? Tindakan ini tidak bisa dibatalkan.`)) return
        setSubmitting(true)
        try {
            const { data } = await supabase.from('students').select('id, tags').contains('tags', [oldTag]).is('deleted_at', null)
            if (data && data.length > 0) {
                const updates = data.map(s =>
                    supabase.from('students').update({ tags: (s.tags || []).filter(t => t !== oldTag) }).eq('id', s.id)
                )
                await Promise.all(updates)
                addToast(`Label '${oldTag}' dihapus dari ${data.length} siswa`, 'success')
                fetchData()
                fetchUsedTags()
            }
        } catch {
            addToast('Gagal menghapus label secara global', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleGlobalRenameTag = async (oldTag, newTag) => {
        if (!newTag || oldTag === newTag) { setTagToEdit(null); return }
        setSubmitting(true)
        try {
            const { data } = await supabase.from('students').select('id, tags').contains('tags', [oldTag]).is('deleted_at', null)
            if (data && data.length > 0) {
                const updates = data.map(s =>
                    supabase.from('students').update({ tags: (s.tags || []).map(t => t === oldTag ? newTag : t) }).eq('id', s.id)
                )
                await Promise.all(updates)
                addToast(`Label '${oldTag}' diubah menjadi '${newTag}'`, 'success')
                fetchData()
                fetchUsedTags()
                setTagToEdit(null)
            }
        } catch {
            addToast('Gagal mengubah label secara global', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // NEW: Fitur 9 - Export hasil filter aktif
    const fetchFilteredForExport = async () => {
        let q = supabase.from('students').select(`*, classes (name)`).is('deleted_at', null)

        // Sync with primary filters
        if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
        else if (filterClass) q = q.eq('class_id', filterClass)
        if (filterGender) q = q.eq('gender', filterGender)
        if (filterStatus) q = q.eq('status', filterStatus)
        if (filterTag) q = q.contains('tags', [filterTag])

        // filterMissing logic
        if (filterMissing === 'photo') {
            q = q.or('photo_url.is.null,photo_url.eq.""')
        } else if (filterMissing === 'wa') {
            q = q.or('phone.is.null,phone.eq.""')
        }

        if (debouncedSearch) {
            const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
            q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
        }

        // Points filters
        if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
        else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
        else if (filterPointMode === 'custom') {
            if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
            if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
        }

        // Sorting (Important for 'New Student' or 'Top Performer' presets)
        if (sortBy === 'total_points_desc') q = q.order('total_points', { ascending: false })
        else if (sortBy === 'created_at') q = q.order('created_at', { ascending: false })
        else q = q.order('name', { ascending: true })

        const { data, error } = await q
        if (error) throw error

        return (data || []).map(s => ({
            ID: s.id,
            'Kode Registrasi': s.registration_code || '',
            NISN: s.nisn || '',
            Nama: s.name || '',
            Gender: s.gender === 'L' ? 'Putra' : 'Putri',
            Kelas: s.classes?.name || '',
            Poin: s.total_points ?? 0,
            Phone: s.phone || '',
            Status: s.status || 'aktif',
            Tags: (s.tags || []).join(', '),
            'Data Lengkap': `${calculateCompleteness(s)}%`
        }))
    }

    // â”€â”€ Export Wizard: ambil data sesuai scope & kolom yang dipilih â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const ALL_EXPORT_COLUMNS = [
        { key: 'id', label: 'ID', fn: s => s.id },
        { key: 'kode', label: 'Kode Registrasi', fn: s => s.registration_code || '' },
        { key: 'nisn', label: 'NISN', fn: s => s.nisn || '' },
        { key: 'nama', label: 'Nama', fn: s => s.name || '' },
        { key: 'gender', label: 'Gender', fn: s => s.gender === 'L' ? 'Putra' : 'Putri' },
        { key: 'kelas', label: 'Kelas', fn: s => s.classes?.name || '' },
        { key: 'poin', label: 'Poin', fn: s => s.total_points ?? 0 },
        { key: 'phone', label: 'Phone/WA', fn: s => s.phone || '' },
        { key: 'status', label: 'Status', fn: s => s.status || 'aktif' },
        { key: 'tags', label: 'Label', fn: s => (s.tags || []).join(', ') },
        { key: 'kelengkapan', label: 'Kelengkapan Data', fn: s => `${calculateCompleteness(s)}%` },
    ]

    const getExportData = async () => {
        let sourceData = []

        if (exportScope === 'selected' && selectedStudentIds.length > 0) {
            // Ambil dari data yang sudah ada di state (sudah include className)
            sourceData = selectedStudents
            // Mapping manual karena struktur berbeda dengan supabase response
            return sourceData.map(s => {
                const row = {}
                ALL_EXPORT_COLUMNS.forEach(col => {
                    if (exportColumns[col.key]) {
                        // Untuk kelas, gunakan className dari state
                        if (col.key === 'kelas') row[col.label] = s.className || ''
                        else row[col.label] = col.fn(s)
                    }
                })
                return row
            })
        }

        // Untuk 'filtered' dan 'all', fetch dari Supabase
        let q = supabase.from('students').select('*, classes (name)').is('deleted_at', null)

        if (exportScope === 'filtered') {
            if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])
            if (filterMissing === 'photo') q = q.or('photo_url.is.null,photo_url.eq.""')
            else if (filterMissing === 'wa') q = q.or('phone.is.null,phone.eq.""')
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%,nisn.ilike.%${s}%`)
            }
            if (filterPointMode === 'risk') q = q.lt('total_points', RiskThreshold)
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }
        }
        // exportScope === 'all': no extra filters

        if (sortBy === 'total_points_desc') q = q.order('total_points', { ascending: false })
        else if (sortBy === 'created_at') q = q.order('created_at', { ascending: false })
        else q = q.order('name', { ascending: true })

        const { data, error } = await q
        if (error) throw error

        return (data || []).map(s => {
            const row = {}
            ALL_EXPORT_COLUMNS.forEach(col => {
                if (exportColumns[col.key]) row[col.label] = col.fn(s)
            })
            return row
        })
    }

    // NEW: Audit Log
    const fetchAuditLog = async (studentId) => {
        setLoadingAudit(true)
        try {
            const { data } = await supabase
                .from('student_audit_log')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })
                .limit(50)
            setAuditLogs(data || [])
        } catch (err) {
            console.error('fetchAuditLog catch (table mungkin belum ada):', err)
            setAuditLogs([])
        } finally {
            setLoadingAudit(false)
        }
    }

    // NEW: Fitur 12 - Import Google Sheets
    const handleFetchGSheets = async () => {
        if (!gSheetsUrl.trim()) { addToast('Masukkan URL Google Sheets terlebih dahulu', 'warning'); return }
        setFetchingGSheets(true)
        try {
            // Extract spreadsheet ID
            const match = gSheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
            if (!match) throw new Error('URL tidak valid')
            const sheetId = match[1]
            // Fetch as CSV (requires public sheet)
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
            const res = await fetch(csvUrl)
            if (!res.ok) throw new Error('Gagal fetch sheet â€” pastikan sheet bersifat publik')
            const text = await res.text()
            const rows = await parseCSVFile(new Blob([text], { type: 'text/csv' }))
            if (!rows.length) throw new Error('Sheet kosong')
            await buildImportPreview(rows)
            setImportTab('preview')
            closeModal()
            setIsImportModalOpen(true)
            addToast(`${rows.length} baris berhasil dibaca dari Google Sheets`, 'success')
        } catch (err) {
            addToast(err.message || 'Gagal mengambil data dari Google Sheets', 'error')
        } finally {
            setFetchingGSheets(false)
        }
    }

    // NEW: Lightning Action - Quick Point adjustment
    const handleQuickPoint = async (student, amount, reason) => {
        try {
            const newPoints = (student.total_points || 0) + amount
            const { error } = await supabase
                .from('students')
                .update({ total_points: newPoints })
                .eq('id', student.id)
            if (error) throw error

            addToast(`${amount > 0 ? '+' : ''}${amount} poin untuk ${student.name} (${reason})`, 'success')
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal update poin cepat', 'error')
        }
    }

    // â”€â”€ Inline Edit Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleInlineUpdate = async (studentId, field, value, studentData) => {
        try {
            let payload = {}
            let toastMsg = ''

            if (field === 'name') {
                if (!value) return addToast('Nama tidak boleh kosong', 'error')
                payload = { name: value }
                toastMsg = `Nama diperbarui â†’ "${value}"`
            } else if (field === 'gender') {
                payload = { gender: value }
                toastMsg = `Gender diperbarui â†’ ${value === 'L' ? 'Putra' : 'Putri'}`
            } else if (field === 'kelas') {
                payload = { class_id: value }
                toastMsg = `Kelas diperbarui`
                if (value !== studentData.class_id) {
                    try {
                        await supabase.from('student_class_history').insert([{
                            student_id: studentId,
                            from_class_id: studentData.class_id,
                            to_class_id: value,
                            changed_at: new Date().toISOString(),
                            note: 'Diubah via inline edit'
                        }])
                    } catch (e) {
                        console.error('Failed to log class history:', e)
                    }
                }
            } else if (field === 'poin') {
                payload = { total_points: value }
                toastMsg = `Poin diperbarui menjadi ${value > 0 ? '+' : ''}${value}`
            }

            const { error } = await supabase.from('students').update(payload).eq('id', studentId)
            if (error) throw error

            addToast(toastMsg, 'success')
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal menyimpan perubahan', 'error')
        }
    }

    // â”€â”€ Pin Handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleTogglePin = async (student) => {
        const newPinned = !student.is_pinned

        // Optimistic UI Update
        setStudents(prev => {
            const updated = prev.map(s =>
                s.id === student.id ? { ...s, is_pinned: newPinned } : s
            )
            // Re-sort: pinned first, then by current criteria (implicit in how students was loaded)
            return updated.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
        })

        try {
            const { error } = await supabase
                .from('students')
                .update({ is_pinned: newPinned })
                .eq('id', student.id)

            if (error) throw error

            addToast(
                newPinned ? (
                    <span className="flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faThumbtack} className="text-amber-400 rotate-[-45deg] text-[10px]" />
                        "{student.name}" disematkan ke atas
                    </span>
                ) : (
                    `Sematkan "${student.name}" dilepas`
                ),
                'success'
            )
        } catch (err) {
            console.error('Pin error:', err)
            // Rollback on failure
            setStudents(prev => {
                const rolledBack = prev.map(s =>
                    s.id === student.id ? { ...s, is_pinned: student.is_pinned } : s
                )
                return rolledBack.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
            })
            addToast('Gagal menyematkan data', 'error')
        }
    }

    // NEW: Upload foto ke Supabase Storage â€” return URL agar bisa dipakai oleh StudentFormModal
    const handlePhotoUpload = async (file) => {
        if (!file) return null
        setUploadingPhoto(true)
        try {
            const ext = file.name.split('.').pop()
            const fileName = `student_${Date.now()}.${ext}`
            const { error: uploadError } = await supabase.storage
                .from('student-photo')
                .upload(fileName, file, { upsert: true })
            if (uploadError) throw uploadError

            const { data: urlData } = supabase.storage
                .from('student-photo')
                .getPublicUrl(fileName)
            addToast('Foto berhasil diupload', 'success')
            return urlData.publicUrl
        } catch (err) {
            console.error('Upload error:', err)
            // Fallback ke base64 jika storage belum dikonfigurasi
            return await new Promise((resolve) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
                addToast('Storage belum aktif, foto disimpan lokal sementara', 'warning')
            })
        } finally {
            setUploadingPhoto(false)
        }
    }

    // NEW: Quick Inline Add
    const handleInlineSubmit = async () => {
        if (!inlineForm.name.trim() || !inlineForm.class_id) {
            addToast('Nama dan kelas wajib diisi', 'warning')
            return
        }
        setSubmittingInline(true)
        try {
            const { error } = await supabase.from('students').insert([{
                name: inlineForm.name.trim(),
                gender: inlineForm.gender,
                class_id: inlineForm.class_id,
                phone: inlineForm.phone || null,
                registration_code: generateCode(),
                pin: String(Math.floor(1000 + Math.random() * 9000)),
                total_points: 0,
            }])
            if (error) throw error
            addToast(`${inlineForm.name} berhasil ditambahkan`, 'success')
            setInlineForm({ name: '', gender: 'L', class_id: inlineForm.class_id, phone: '' })
            fetchData()
            fetchStats()
        } catch {
            addToast('Gagal menambahkan siswa', 'error')
        } finally {
            setSubmittingInline(false)
        }
    }
    const handleViewProfile = (student) => {
        setSelectedStudent(student)
        setBehaviorHistory([])        // clear stale data from prev student
        setRaportHistory([])          // clear raport stale data
        setTimelineFilter('all')      // reset filter
        setTimelineVisible(8)         // reset lazy render count
        setProfileTab('info')         // always open on Info tab
        setActiveModal('profile')
        // fetch AFTER modal opens â€” skeleton shows instantly
        fetchBehaviorHistory(student.id)
        fetchRaportHistory(student.id)
    }

    const handleViewQR = (student) => {
        setSelectedStudent(student)
        setIsPrintModalOpen(true)
    }

    const handleViewPrint = (student) => {
        setSelectedStudent(student)
        setIsPrintModalOpen(true)
    }

    // NEW: Bulk WA â€” kirim notifikasi ke semua wali terpilih
    const handleBulkWA = () => {
        const targets = selectedStudentsWithPhone
        if (!targets.length) {
            addToast('Tidak ada siswa terpilih yang memiliki nomor WA', 'warning')
            return
        }
        setBroadcastResults({})
        setBroadcastIndex(-1)
        setActiveModal('bulkWA')
    }

    const buildWAMessage = (student, templateId) => {
        let template = waTemplate; // Default bit string from line 268

        if (templateId === 'points') {
            template = `*Laporan Poin Perilaku Ananda {nama}*\n\nSaat ini Ananda memiliki total *{poin} poin* di sistem Laporanmu.\n\n_Terus semangatkan kedisiplinan dan prestasi ananda._\n\nWassalam.`
        } else if (templateId === 'security') {
            template = `*PEMBERITAHUAN KEAMANAN*\n\nInformasi akses Portal Orang Tua untuk ananda {nama}:\nID Reg : {kode}\nPIN    : {pin}\nPortal : [URL]\n\n_Mohon jaga kerahasiaan PIN anda._`
        } else if (templateId === 'custom') {
            template = customWaMsg || 'Halo Bapak/Ibu wali dari {nama}.'
        }

        return template
            .replace(/{nama}/g, student.name)
            .replace(/{kelas}/g, classesList.find(c => c.id === student.class_id)?.name || '-')
            .replace(/{poin}/g, String(student.points ?? student.total_points ?? 0))
            .replace(/{kode}/g, student.registration_code || student.code || '-')
            .replace(/{pin}/g, student.pin || '-')
            .replace(/\[URL\]/g, window.location.origin + '/check')
    }

    const openWAForStudent = (student, msg) => {
        const phone = (student.phone || '').replace(/\D/g, '').replace(/^0/, '62')
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        window.open(url, '_blank')
    }

    // â”€â”€ PDF/Print utilities (delegated to studentPdfUtils.js) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pdfCallbacks = { addToast, setGeneratingPdf }

    const generateStudentPDF = useCallback((targets, captureRef = null) => {
        _generateStudentPDF(targets, captureRef, pdfCallbacks)
    }, [addToast])

    const handleBulkPrint = () => {
        const targets = selectedStudents
        if (!targets.length) { addToast('Pilih siswa terlebih dahulu', 'warning'); return }
        generateStudentPDF(targets)
    }

    const handlePrintSingle = (student) => {
        if (!student) return
        generateStudentPDF([student], cardCaptureRef)
    }

    const handlePrintThermal = useCallback((student) => {
        _handlePrintThermal(student, pdfCallbacks)
    }, [addToast])

    const handleSavePNG = useCallback((student) => {
        _handleSavePNG(student, pdfCallbacks)
    }, [addToast])

    // ======================================================
    // Cetak Thermal 58mm â€” COMPACT, tanpa foto, hanya QR
    // ======================================================
    // Sultan Fitur 2: handleBulkPhotoMatch
    const handleBulkPhotoMatch = async (files) => {
        setMatchingPhotos(true)
        const fileList = Array.from(files)
        const matches = []

        for (const file of fileList) {
            const cleanName = file.name.split('.')[0].trim().toLowerCase()
            // Match against NISN first, then Name, then ID
            const student = students.find(s =>
                (s.nisn && s.nisn.trim().toLowerCase() === cleanName) ||
                (s.name && s.name.trim().toLowerCase() === cleanName) ||
                (s.id && s.id.trim().toLowerCase() === cleanName)
            )

            matches.push({
                file,
                studentId: student?.id || null,
                studentName: student?.name || 'Tidak Ditemukan',
                preview: URL.createObjectURL(file),
                status: student ? 'matched' : 'unmatched'
            })
        }

        setBulkPhotoMatches(matches)
        setMatchingPhotos(false)
    }

    const handleBulkPhotoUpload = async () => {
        const matched = bulkPhotoMatches.filter(m => m.status === 'matched')
        if (matched.length === 0) {
            addToast('Tidak ada foto yang cocok untuk dicolong (upload)!', 'warning')
            return
        }

        setUploadingBulkPhotos(true)
        let successCount = 0

        for (const item of matched) {
            try {
                const fileName = `${item.studentId}_${Date.now()}.${item.file.name.split('.').pop()}`
                const { error: uploadError } = await supabase.storage
                    .from('photos')
                    .upload(fileName, item.file)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('photos')
                    .getPublicUrl(fileName)

                const { error: updateError } = await supabase
                    .from('students')
                    .update({ photo_url: publicUrl })
                    .eq('id', item.studentId)

                if (updateError) throw updateError
                successCount++
            } catch (err) {
                console.error('Upload failed for:', item.studentName, err)
            }
        }

        addToast(`Berhasil upload ${successCount} foto siswa!`, 'success')
        closeModal()
        setBulkPhotoMatches([])
        setUploadingBulkPhotos(false)
        fetchStudents()
    }

    const handleDownloadTemplate = async () => {
        const templateData = [
            { name: 'Contoh: Ahmad Rizki', gender: 'L', phone: '081234567890', class_name: 'XII IPA 1', nisn: '1234567890', guardian_name: 'Budi Rizki' },
            { name: 'Contoh: Siti Aminah', gender: 'P', phone: '081234567891', class_name: 'XI IPS 2', nisn: '0987654321', guardian_name: 'Aminah' },
        ]
        const XLSX = await import('xlsx')
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 20 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        const blobUrl = URL.createObjectURL(blob)
        link.href = blobUrl
        link.download = 'TemplateImportSiswa.xlsx'
        link.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
        addToast('Template berhasil didownload', 'success')
    }

    // Helper: reset all filters
    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterClass('')
        setFilterClasses([])
        setFilterGender('')
        setFilterStatus('')
        setFilterTag('')
        setFilterMissing('')
        setSortBy('name_asc')
        setFilterPointMode('')
        setFilterPointMin('')
        setFilterPointMax('')
        setSelectedStudentIds([])
        localStorage.removeItem('students_filters') // â† tambahkan ini
    }

    const activeFilterCount = [filterClass, filterClasses.length > 0 ? 'multi' : '', filterGender, filterStatus, filterTag, filterPointMode, filterMissing, debouncedSearch].filter(Boolean).length

    const sanitizeText = (s) => String(s ?? '').replace(/[<>]/g, '').trim()

    const normalizePhone = (raw) => {
        const v = String(raw ?? '').trim()
        if (!v) return ''
        const cleaned = v.replace(/[\s-]/g, '')
        const keepPlus = cleaned.startsWith('+') ? '+' : ''
        const digits = cleaned.replace(/[^\d]/g, '')
        return keepPlus ? `+${digits}` : digits
    }

    const isValidPhone = (phone) => {
        if (!phone) return true
        return /^(\+?62|08)\d{8,11}$/.test(phone)
    }

    // Definition of recognized columns and their synonyms for auto-mapping
    const SYSTEM_COLS = [
        { key: 'name', label: 'Nama', synonyms: ['nama', 'name', 'nama lengkap', 'full name', 'student name', 'siswa'] },
        { key: 'class_name', label: 'Kelas', synonyms: ['kelas', 'class', 'class_name', 'rombel'] },
        { key: 'gender', label: 'Gender', synonyms: ['gender', 'jk', 'jenis kelamin', 'kelamin', 'sex'] },
        { key: 'nisn', label: 'NISN', synonyms: ['nisn', 'nomor induk siswa nasional'] },
        { key: 'phone', label: 'No. HP / WA', synonyms: ['phone', 'no_hp', 'hp', 'whatsapp', 'wa', 'telp', 'telepon', 'phone number', 'wali_phone'] },
        { key: 'guardian_name', label: 'Nama Wali', synonyms: ['guardian_name', 'nama_wali', 'wali', 'parent name', 'nama orang tua'] },
    ]

    const pick = (obj, keys) => {
        // Now 'keys' can be a specific header from user mapping
        for (const k of keys) {
            const v = obj?.[k]
            if (v !== undefined && v !== null && String(v).trim() !== '') return v
        }
        return ''
    }

    const parseCSVFile = async (file) => {
        const Papa = (await import('papaparse')).default
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => resolve(results.data || []),
                error: (err) => reject(err)
            })
        })
    }

    const parseExcelFile = async (file) => {
        const XLSX = await import('xlsx')
        const buf = await file.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const firstSheet = wb.SheetNames[0]
        const ws = wb.Sheets[firstSheet]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        return json
    }

    const buildImportPreview = async (rows, mapping) => {
        // 1. Initial Mapping & Pre-processing
        const preview = rows.map((r) => {
            const getVal = (row, sysKey) => {
                if (mapping && mapping[sysKey]) return sanitizeText(row[mapping[sysKey]])
                const colDef = SYSTEM_COLS.find(c => c.key === sysKey)
                return sanitizeText(pick(row, colDef ? colDef.synonyms : [sysKey]))
            }

            const name = getVal(r, 'name')
            const className = getVal(r, 'class_name')
            const genderRaw = getVal(r, 'gender')
            const nisn = getVal(r, 'nisn')
            const phone = normalizePhone(getVal(r, 'phone'))
            const guardianName = getVal(r, 'guardian_name')

            let gender = genderRaw
            if (genderRaw) {
                const l = genderRaw.toLowerCase()
                if (l.startsWith('l') || l === 'pria' || l === 'cowok' || l === 'laki') gender = 'L'
                else if (l.startsWith('p') || l === 'wanita' || l === 'cewek' || l === 'perempuan') gender = 'P'
                else gender = 'L'
            } else {
                gender = 'L'
            }

            const classObj = classesList.find(c => c.name.toLowerCase() === (className || '').toLowerCase())

            return {
                name,
                gender,
                phone,
                nisn,
                class_id: classObj?.id || '',
                guardian_name: guardianName || null,
                photo_url: null,
                _className: className || '',
                _isDupe: false,
                _hasError: false,
                _hasWarn: false,
            }
        })

        // 2. Initial Fetch of DB Students (Cache)
        let existingNames = new Set()
        let existingNisn = new Set()
        try {
            const { data: allStudents } = await supabase
                .from('students')
                .select('name, nisn')
                .is('deleted_at', null)
            if (allStudents) {
                existingNames = new Set(allStudents.map(s => (s.name || '').toLowerCase().trim()))
                existingNisn = new Set(allStudents.filter(s => s.nisn).map(s => String(s.nisn).trim()))
            }
        } catch (err) { console.error(err) }

        setImportCachedDBStudents({ names: existingNames, nisns: existingNisn })
        setImportPreview(preview)
        validateImportPreview(preview, existingNames, existingNisn)
    }

    const validateImportPreview = (preview, dbNames = null, dbNisns = null) => {
        const issues = []
        const dupeIndices = []

        const names = dbNames || importCachedDBStudents.names
        const nisns = dbNisns || importCachedDBStudents.nisns

        const seenNamesInFile = new Map()
        const seenNisnInFile = new Map()

        const validated = preview.map((r, idx) => {
            const rowIssues = []

            // Required checks
            if (!r.name) rowIssues.push({ level: 'error', message: 'Nama tidak boleh kosong' })
            if (!r.class_id) rowIssues.push({ level: 'error', message: 'Kelas tidak valid atau tidak ditemukan' })
            if (r.phone && !isValidPhone(r.phone)) rowIssues.push({ level: 'warn', message: 'Format No. HP mungkin salah (cek lagi jika ragu)' })

            // Dupe check
            let isDupe = false
            const lowerName = (r.name || '').toLowerCase().trim()
            const cleanNisn = String(r.nisn || '').trim()

            if (lowerName && names.has(lowerName)) isDupe = true
            if (cleanNisn && nisns.has(cleanNisn)) isDupe = true

            // Within file dupe
            if (lowerName) {
                if (seenNamesInFile.has(lowerName)) {
                    isDupe = true
                    rowIssues.push({ level: 'dupe', message: `Nama sama dengan baris ${seenNamesInFile.get(lowerName) + 1}` })
                } else seenNamesInFile.set(lowerName, idx)
            }
            if (cleanNisn) {
                if (seenNisnInFile.has(cleanNisn)) {
                    isDupe = true
                    rowIssues.push({ level: 'dupe', message: `NISN sama dengan baris ${seenNisnInFile.get(cleanNisn) + 1}` })
                } else seenNisnInFile.set(cleanNisn, idx)
            }

            if (isDupe) dupeIndices.push(idx)
            if (rowIssues.length) {
                issues.push({ row: idx + 2, level: rowIssues.some(x => x.level === 'error') ? 'error' : rowIssues.some(x => x.level === 'dupe') ? 'dupe' : 'warn', messages: rowIssues.map(x => x.message) })
            }

            return {
                ...r,
                _isDupe: isDupe,
                _hasError: rowIssues.some(x => x.level === 'error'),
                _hasWarn: rowIssues.some(x => x.level === 'warn'),
            }
        })

        setImportPreview(validated)
        setImportIssues(issues)
        setImportDuplicates(dupeIndices)
        setImportValidationOpen(issues.length > 0)
    }

    const processImportFile = async (file) => {
        const ext = file.name.toLowerCase()
        if (!ext.endsWith('.csv') && !ext.endsWith('.xlsx')) {
            addToast('Format tidak didukung. Gunakan .csv atau .xlsx', 'error')
            return
        }
        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])
        setImportDuplicates([])
        setImportLoading(true)
        try {
            const isXlsx = ext.endsWith('.xlsx') || (file.type || '').includes('sheet')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)
            if (!rows.length) { addToast('File kosong atau tidak terbaca', 'error'); return }

            setImportRawData(rows)

            // Extract headers for mapping
            const headers = Object.keys(rows[0])
            setImportFileHeaders(headers)

            // Auto-mapping
            const mapping = {}
            SYSTEM_COLS.forEach(sys => {
                // Find matching header by synonym
                const found = headers.find(h => {
                    const l = h.toLowerCase().trim()
                    return sys.synonyms.includes(l) || l === sys.key
                })
                if (found) mapping[sys.key] = found
            })
            setImportColumnMapping(mapping)

            // Go to step 2: Mapping
            setImportStep(2)
        } catch (err) {
            console.error(err)
            addToast('Gagal membaca file import', 'error')
        } finally {
            setImportLoading(false)
        }
    }

    const handleBulkFix = (sysKey, value) => {
        const newPrev = importPreview.map(r => {
            const updated = { ...r, [sysKey]: value }
            if (sysKey === 'class_id') {
                updated._className = classesList.find(x => x.id === value)?.name || ''
            }
            return updated
        })
        setImportPreview(newPrev)
        validateImportPreview(newPrev)
        addToast(`Selesai memperbarui ${newPrev.length} baris`, 'success')
    }

    const handleImportClick = () => {
        // Open the import modal on the Panduan tab first.
        // The actual file picker is triggered from inside the modal.
        if (!isImportModalOpen) {
            setImportStep(1)
            setIsImportModalOpen(true)
        } else {
            // Already open (e.g. "Ganti File" button inside modal) â€” open picker directly
            importFileInputRef.current?.click()
        }
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        await processImportFile(file)
        e.target.value = ''
    }

    const hasImportBlockingErrors = importIssues.some(x => x.level === 'error')

    const handleCommitImport = async () => {
        if (!importPreview.length) {
            addToast('Tidak ada data untuk diimport', 'error')
            return
        }
        if (hasImportBlockingErrors) {
            addToast('Masih ada ERROR. Perbaiki file dulu ya.', 'error')
            return
        }

        if (importReadyRows.length === 0) {
            addToast('Tidak ada data baru yang valid untuk diimport (semua duplikat atau error)', 'warning')
            return
        }

        setImporting(true)
        setImportProgress({ done: 0, total: importReadyRows.length })

        // FIX: batch insert (chunk 50) jauh lebih cepat dari sequential
        const CHUNK = 50
        try {
            for (let i = 0; i < importReadyRows.length; i += CHUNK) {
                const chunk = importReadyRows.slice(i, i + CHUNK).map(r => {
                    const { _className, _isDupe, _hasError, _hasWarn, ...cleanRow } = r
                    return {
                        ...cleanRow,
                        registration_code: generateCode(),
                        pin: String(Math.floor(1000 + Math.random() * 9000)),
                        total_points: 0
                    }
                })
                const { error } = await supabase.from('students').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, importReadyRows.length), total: importReadyRows.length })
            }

            if (importReadyRows.length > 0) {
                addToast(`Berhasil import ${importReadyRows.length} siswa`, 'success')
            } else {
                addToast('Tidak ada siswa yang diimport', 'info')
            }
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            setImportDuplicates([])
            setImportFileName('')
            setImportStep(1)
            await fetchData();
            fetchStats()
        } catch (err) {
            console.error(err)
            addToast('Gagal import (cek constraint DB / duplikat / koneksi)', 'error')
        } finally {
            setImporting(false)
        }
    }

    const downloadBlob = (blob, filename) => {
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        link.click()
    }

    const handleExportCSV = async () => {
        setExporting(true)
        try {
            const rows = await getExportData()
            if (!rows.length) return addToast('Tidak ada data untuk diekspor', 'warning')
            const headers = Object.keys(rows[0])
            const csvContent = [
                headers.join(','),
                ...rows.map(r => headers.map(h => {
                    const v = String(r[h] ?? '').replace(/"/g, '""')
                    return `"${v}"`
                }).join(','))
            ].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            downloadBlob(blob, `data_siswa_${new Date().toISOString().slice(0, 10)}.csv`)
            addToast(`Export CSV berhasil (${rows.length} siswa)`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export CSV', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    const handleExportExcel = async () => {
        setExporting(true)
        try {
            const XLSX = await import('xlsx')
            const data = await getExportData()
            if (!data.length) return addToast('Tidak ada data untuk diekspor', 'warning')
            const ws = XLSX.utils.json_to_sheet(data)
            // Auto column width
            const cols = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length, 14) }))
            ws['!cols'] = cols
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `data_siswa_${new Date().toISOString().slice(0, 10)}.xlsx`)
            addToast(`Export Excel berhasil (${data.length} siswa)`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export Excel', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    const handleExportPDF = async () => {
        setExporting(true)
        try {
            const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                import('jspdf'),
                import('jspdf-autotable'),
            ])
            const autoTable = autoTableMod.default || autoTableMod
            const allRows = await getExportData()
            if (!allRows.length) return addToast('Tidak ada data untuk diekspor', 'warning')
            const doc = new jsPDF({ orientation: 'landscape' })
            doc.setFontSize(13)
            doc.text('Laporan Data Siswa', 14, 12)
            doc.setFontSize(8)
            doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}  |  Total: ${allRows.length} siswa  |  Scope: ${exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'}`, 14, 18)
            const filterInfo = []
            if (filterGender) filterInfo.push(`Gender: ${filterGender}`)
            if (filterStatus) filterInfo.push(`Status: ${filterStatus}`)
            if (filterTag) filterInfo.push(`Label: ${filterTag}`)
            if (debouncedSearch) filterInfo.push(`Cari: "${debouncedSearch}"`)
            if (filterInfo.length > 0) doc.text(`Filter: ${filterInfo.join(' | ')}`, 14, 24)

            const headers = Object.keys(allRows[0])
            const rows = allRows.map(r => headers.map(h => String(r[h] ?? '')))
            autoTable(doc, {
                head: [headers],
                body: rows,
                startY: filterInfo.length ? 28 : 22,
                styles: { fontSize: 7.5 },
                headStyles: { fillColor: [79, 70, 229] },
                alternateRowStyles: { fillColor: [245, 245, 255] },
            })
            doc.save(`laporan_siswa_${new Date().toISOString().slice(0, 10)}.pdf`)
            addToast(`Export PDF berhasil (${allRows.length} siswa)`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    const isAnyModalOpen = useMemo(() => !!(isModalOpen || !!activeModal || isImportModalOpen || isExportModalOpen || isPrintModalOpen || photoZoom), [isModalOpen, activeModal, isImportModalOpen, isExportModalOpen, isPrintModalOpen, photoZoom])

    // Memoized timeline computation â€” only recalculate when data or filter changes
    const timelineFiltered = useMemo(() =>
        timelineFilter === 'pos' ? behaviorHistory.filter(i => (i.points ?? 0) > 0)
            : timelineFilter === 'neg' ? behaviorHistory.filter(i => (i.points ?? 0) < 0)
                : behaviorHistory
        , [behaviorHistory, timelineFilter])

    const timelineGroups = useMemo(() =>
        timelineFiltered.reduce((acc, item) => {
            const key = new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            if (!acc[key]) acc[key] = []
            acc[key].push(item)
            return acc
        }, {})
        , [timelineFiltered])

    const timelineStats = useMemo(() => {
        const pos = behaviorHistory.filter(i => (i.points ?? 0) > 0)
        const neg = behaviorHistory.filter(i => (i.points ?? 0) < 0)
        const totalPos = pos.reduce((a, i) => a + (i.points ?? 0), 0)
        const totalNeg = neg.reduce((a, i) => a + (i.points ?? 0), 0)
        const thisMonth = new Date()
        const thisMonthCount = behaviorHistory.filter(i => {
            const d = new Date(i.created_at)
            return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear()
        }).length
        return { pos: pos.length, neg: neg.length, totalPos, totalNeg, thisMonthCount }
    }, [behaviorHistory])

    // --- SaaS COMPONENTS ---


    return (
        <DashboardLayout title="Data Siswa" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>
                {isAnyModalOpen ? `
                    .top-nav, .sidebar, .floating-dock { display: none !important; }
                    main { padding-top: 0 !important; }
                ` : ''}
            </style>

            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Privacy Banner */}
                {isPrivacyMode && (
                    <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif â€” Data sensitif disensor</div>
                        <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                    </div>
                )}

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only â€” Edit data siswa dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Master Data" items={['Master', 'Siswa']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                            Kelola {globalStats.total} data siswa aktif dalam sistem laporan.
                        </p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold opacity-60">
                            Untuk pengisian awal, gunakan menu import (Excel / GSheets) agar lebih cepat dan minim salah ketik.
                        </p>
                    </div>

                    <div className="flex gap-2 items-center">
                        {/* Tombol aksi sekunder â€” bottom sheet di mobile, dropdown di desktop */}
                        <div className="relative" ref={headerMenuRef}>
                            <button
                                onClick={() => setIsHeaderMenuOpen(v => !v)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${(isHeaderMenuOpen) ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Aksi lainnya"
                            >
                                <FontAwesomeIcon icon={faSliders} />
                            </button>

                            {/* Dropdown â€” desktop only */}
                            {isHeaderMenuOpen && (
                                <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-[calc(100%+8px)] -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[320px] sm:w-56 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">xls, csv</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setActiveModal('gsheets') }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faLink} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import GSheets</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">online</p>
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
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setActiveModal('bulkPhoto') }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faCamera} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Bulk Foto</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">png, jpg</p>
                                        </div>
                                    </button>

                                    <button onClick={() => { setIsHeaderMenuOpen(false); navigate('/raport') }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faClipboardList} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Raport Bulanan</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">Ù†ØªÙŠØ¬Ø© Ø§Ù„Ø´Ø®ØµÙŠØ©</p>
                                        </div>
                                    </button>

                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>

                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchivedStudents(); setActiveModal('archived') }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Siswa</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">arsip</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setResetPointsClassId(''); setActiveModal('resetPoints') }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Reset Poin</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">poin</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

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


                        {/* Keyboard Shortcuts Button + Cheatsheet */}
                        <div className="relative" ref={shortcutRef}>
                            <button
                                onClick={() => setIsShortcutOpen(v => !v)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all
                                ${isShortcutOpen
                                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                    }`}
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
                                            { keys: ['Ctrl', 'K'], label: 'Fokus ke search' },
                                            { keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan' },
                                            { keys: ['Esc'], label: 'Tutup / clear / deselect' },
                                            { section: 'Aksi' },
                                            { keys: ['N'], label: 'Tambah siswa baru' },
                                            { keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect' },
                                            { keys: ['Ctrl', 'E'], label: 'Buka export' },
                                            { section: 'Tampilan' },
                                            { keys: ['P'], label: 'Toggle privacy mode' },
                                            { keys: ['R'], label: 'Refresh data' },
                                            { keys: ['X'], label: 'Reset semua filter' },
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

                        <input
                            type="file"
                            ref={importFileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".csv,.xlsx"
                        />

                        <button
                            onClick={() => navigate('/raport')}
                            className="h-9 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500/20 transition-all"
                        >
                            <FontAwesomeIcon icon={faClipboardList} />
                        </button>

                        <button
                            onClick={handleAdd}
                            disabled={!canEdit}
                            className="h-9 px-5 rounded-lg btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <FontAwesomeIcon icon={faPlus} />
                            {canEdit ? 'Tambah' : 'Read-only'}
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-[var(--color-primary)] flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-[var(--color-primary)]/5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-lg group-hover:scale-110 transition-transform shrink-0">
                            <FontAwesomeIcon icon={faUsers} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Total Siswa</p>
                            <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.total}</h3>
                        </div>
                    </div>

                    <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-blue-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-blue-500/5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                            <FontAwesomeIcon icon={faMars} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putra</p>
                            <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.boys}</h3>
                        </div>
                    </div>

                    <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-pink-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-pink-500/5">
                        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                            <FontAwesomeIcon icon={faVenus} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putri</p>
                            <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.girls}</h3>
                        </div>
                    </div>

                    <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-emerald-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-emerald-500/5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                            <FontAwesomeIcon icon={faTrophy} />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Rata-rata Poin</p>
                            <h3 className={`text-xl font-black font-heading leading-none ${globalStats.avgPoints >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'} `}>{globalStats.avgPoints}</h3>
                        </div>
                    </div>

                    {/* Kelas Bermasalah */}
                    <div
                        className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-red-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-red-500/5 cursor-pointer col-span-2 lg:col-span-1"
                        onClick={() => { if (globalStats.worstClass) { setFilterClass(''); setFilterPointMode('risk') } }}
                        title="Klik untuk filter siswa risiko"
                    >
                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                            <FontAwesomeIcon icon={faTriangleExclamation} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Kelas Bermasalah</p>
                            {globalStats.worstClass ? (
                                <>
                                    <h3 className="text-sm font-black font-heading leading-none text-red-500 truncate">{globalStats.worstClass.name}</h3>
                                    <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">avg {globalStats.worstClass.avg} poin</p>
                                </>
                            ) : (
                                <h3 className="text-sm font-black text-[var(--color-text-muted)]">-</h3>
                            )}
                        </div>
                    </div>
                </div>

                {/* â”€â”€ INSIGHT ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                {(globalStats.risk > 0 || globalStats.incompleteCount > 0 || globalStats.topPerformer || (globalStats.worstClass && globalStats.worstClass.avg < 0) || globalStats.avgPointsLastWeek !== null) && (
                    <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">

                        {/* Siswa berisiko */}
                        {globalStats.risk > 0 && (
                            <button
                                onClick={() => { setFilterPointMode(filterPointMode === 'risk' ? '' : 'risk'); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${filterPointMode === 'risk' ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500' : 'bg-red-500/[0.08] border-red-500/20 hover:bg-red-500/[0.15] text-red-600'}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterPointMode === 'risk' ? 'bg-red-500 text-white' : 'bg-red-500/15'}`}>
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black leading-none">{globalStats.risk} Siswa Berisiko</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Poin di bawah threshold</p>
                                </div>
                            </button>
                        )}

                        {/* Data tidak lengkap */}
                        {globalStats.incompleteCount > 0 && (
                            <button
                                onClick={() => { setFilterMissing(filterMissing === 'photo' ? '' : 'photo'); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${filterMissing === 'photo' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500' : 'bg-amber-500/[0.08] border-amber-500/20 hover:bg-amber-500/[0.15]'}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterMissing === 'photo' ? 'bg-amber-500 text-white' : 'bg-amber-500/15'}`}>
                                    <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 text-[10px]" />
                                </div>
                                <div className="text-left">
                                    <p className={`text-[10px] font-black leading-none ${filterMissing === 'photo' ? 'text-amber-600' : 'text-amber-600 dark:text-amber-400'}`}>{globalStats.incompleteCount} Data Belum Lengkap</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Foto/NISN/WA kosong</p>
                                </div>
                            </button>
                        )}

                        {/* Tren poin minggu ini */}
                        {globalStats.avgPointsLastWeek !== null && (
                            <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${globalStats.avgPointsLastWeek >= 0 ? 'bg-emerald-500/[0.08] border-emerald-500/20' : 'bg-red-500/[0.08] border-red-500/20'}`}>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${globalStats.avgPointsLastWeek >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                                    <FontAwesomeIcon icon={globalStats.avgPointsLastWeek >= 0 ? faArrowTrendUp : faArrowTrendDown} className={`text-[10px] ${globalStats.avgPointsLastWeek >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                                </div>
                                <div className="text-left">
                                    <p className={`text-[10px] font-black leading-none ${globalStats.avgPointsLastWeek >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                        Tren {globalStats.avgPointsLastWeek >= 0 ? 'â–²' : 'â–¼'} {globalStats.avgPointsLastWeek > 0 ? '+' : ''}{globalStats.avgPointsLastWeek} / siswa
                                    </p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Delta poin 7 hari terakhir</p>
                                </div>
                            </div>
                        )}

                        {/* Top performer */}
                        {globalStats.topPerformer && (
                            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 transition-all">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faCrown} className="text-indigo-500 text-[10px]" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-indigo-500 leading-none truncate max-w-[140px]">{globalStats.topPerformer.name}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Top Performer Â· +{globalStats.topPerformer.points}</p>
                                </div>
                            </div>
                        )}

                        {/* Kelas rata-rata terendah */}
                        {globalStats.worstClass && globalStats.worstClass.avg < 0 && (
                            <button
                                onClick={() => { setFilterClass(globalStats.worstClass.id); setFilterClasses([]); setPage(1); setShowAdvancedFilter(true) }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${filterClass === globalStats.worstClass.id ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500' : 'bg-orange-500/[0.08] border-orange-500/20 hover:bg-orange-500/[0.15]'}`}
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterClass === globalStats.worstClass.id ? 'bg-orange-500 text-white' : 'bg-orange-500/15'}`}>
                                    <FontAwesomeIcon icon={faSchool} className="text-orange-500 text-[10px]" />
                                </div>
                                <div className="text-left">
                                    <p className={`text-[10px] font-black leading-none truncate max-w-[140px] ${filterClass === globalStats.worstClass.id ? 'text-orange-600' : 'text-orange-600 dark:text-orange-400'}`}>{globalStats.worstClass.name}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Rata terendah ({globalStats.worstClass.avg})</p>
                                </div>
                            </button>
                        )}

                    </div>
                )}
                {/* â”€â”€ END INSIGHT ROW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}

                {/* Filters & Sort */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">

                    {/* Row 1: Search + action buttons */}
                    <div className="flex flex-row items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                                <FontAwesomeIcon icon={faSearch} />
                            </div>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama, kode... (Ctrl+K)"
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                            />
                        </div>

                        {/* Filter toggle button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button
                                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                            >
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>

                            {/* Reset */}
                            {activeFilterCount > 0 && (
                                <button
                                    type="button"
                                    onClick={resetAllFilters}
                                    className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                    <span className="hidden sm:inline">Reset</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Expandable filter panel */}
                    {showAdvancedFilter && (
                        <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                                {/* Kelas */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kelas</label>
                                    <select
                                        value={filterClass}
                                        onChange={(e) => { setFilterClass(e.target.value); setFilterClasses([]); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Jenis Kelamin</label>
                                    <select
                                        value={filterGender}
                                        onChange={(e) => { setFilterGender(e.target.value); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                    >
                                        <option value="">Semua Gender</option>
                                        <option value="L">Putra</option>
                                        <option value="P">Putri</option>
                                    </select>
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Status Siswa</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                    >
                                        <option value="">Semua Status</option>
                                        <option value="aktif">Aktif</option>
                                        <option value="lulus">Lulus</option>
                                        <option value="pindah">Pindah</option>
                                        <option value="keluar">Keluar</option>
                                    </select>
                                </div>

                                {/* Label/Tag */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Label</label>
                                    <select
                                        value={filterTag}
                                        onChange={(e) => { setFilterTag(e.target.value); setPage(1) }}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                    >
                                        <option value="">Semua Label</option>
                                        {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(t => (
                                            <option key={t} value={t}>{t} ({tagStats[t] || 0})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Urutkan */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="select-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] px-3 pr-8"
                                    >
                                        {SortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                    </select>
                                </div>

                                {/* Poin Min */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Min</label>
                                    <input
                                        type="number"
                                        value={filterPointMin}
                                        onChange={(e) => { setFilterPointMin(e.target.value); setFilterPointMode(e.target.value || filterPointMax ? 'custom' : ''); setPage(1) }}
                                        placeholder="0"
                                        className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                                    />
                                </div>

                                {/* Poin Max */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Max</label>
                                    <input
                                        type="number"
                                        value={filterPointMax}
                                        onChange={(e) => { setFilterPointMax(e.target.value); setFilterPointMode(filterPointMin || e.target.value ? 'custom' : ''); setPage(1) }}
                                        placeholder="Unlimited"
                                        className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                                    />
                                </div>

                                {/* Quick poin presets */}
                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Preset Poin</label>
                                    <div className="flex gap-1.5">
                                        {[
                                            { value: '', label: 'Semua', icon: null },
                                            { value: 'risk', label: 'Risiko', icon: faTriangleExclamation },
                                            { value: 'positive', label: 'Positif', icon: faCheck },
                                        ].map(opt => (
                                            <button key={opt.value} type="button"
                                                onClick={() => { setFilterPointMode(opt.value); setFilterPointMin(''); setFilterPointMax(''); setPage(1) }}
                                                className={`flex-1 h-9 rounded-xl text-[9px] font-black uppercase border transition-all flex items-center justify-center gap-2 ${filterPointMode === opt.value && opt.value !== '' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm shadow-[var(--color-primary)]/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                            >
                                                {opt.icon && <FontAwesomeIcon icon={opt.icon} className="text-[10px]" />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Full Width Section: Data Needs Presets */}
                            <div className="pt-1 mb-4">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Filter Kebutuhan Data</label>
                                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                    {[
                                        { label: 'Semua', icon: faUsers, active: !filterMissing && sortBy !== 'created_at' && sortBy !== 'total_points_desc', onClick: () => { setFilterMissing(''); setSortBy('name_asc'); } },
                                        { label: 'Foto Kosong', icon: faImage, active: filterMissing === 'photo', onClick: () => { setFilterMissing('photo'); setPage(1); } },
                                        { label: 'Belum Ada WA', icon: faWhatsapp, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1); } },
                                        { label: 'Top Performer', icon: faTrophy, active: sortBy === 'total_points_desc', onClick: () => { setSortBy('total_points_desc'); setPage(1); } },
                                        { label: 'Siswa Baru', icon: faPlus, active: sortBy === 'created_at', onClick: () => { setSortBy('created_at'); setPage(1); } },
                                    ].map((s, i) => (
                                        <button key={i} onClick={s.onClick}
                                            className={`whitespace-nowrap h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                            <FontAwesomeIcon icon={s.icon} className="text-[10px]" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Filter Panel Footer - Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]/50">
                                {activeFilterCount > 0 && (
                                    <button
                                        onClick={async () => {
                                            try {
                                                const XLSX = await import('xlsx')
                                                const rows = await fetchFilteredForExport()
                                                const ws = XLSX.utils.json_to_sheet(rows)
                                                const wb = XLSX.utils.book_new()
                                                XLSX.utils.book_append_sheet(wb, ws, 'Filter')
                                                const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
                                                const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
                                                downloadBlob(blob, `export_filter_${new Date().toISOString().slice(0, 10)}.xlsx`)
                                                addToast(`${rows.length} baris berhasil diekspor sebagai Excel`, 'success')
                                            } catch { addToast('Gagal export', 'error') }
                                        }}
                                        className="h-9 px-4 rounded-xl bg-teal-500/10 text-teal-600 hover:bg-teal-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-teal-500/20"
                                    >
                                        <FontAwesomeIcon icon={faDownload} />
                                        Export Hasil Filter
                                    </button>
                                )}
                                <button
                                    onClick={resetAllFilters}
                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        </div>
                    )}
                </div>



                {/* Removed: Smart Presets - SaaS Navigation Style */}
                {loading ? (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)]">
                                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="px-6 py-4 w-10"></th>
                                        <th className="px-6 py-4">Siswa</th>
                                        <th className="px-6 py-4 text-center">Gender</th>
                                        <th className="px-6 py-4 text-center">Kelas</th>
                                        <th className="px-6 py-4 text-center">Poin</th>
                                        <th className="px-6 py-4 text-center">Lap. Terakhir</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-t border-[var(--color-border)]">
                                            <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-[var(--color-border)] animate-pulse shrink-0" />
                                                    <div className="space-y-2">
                                                        <div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" />
                                                        <div className="h-2 w-24 rounded bg-[var(--color-border)] animate-pulse opacity-60" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><div className="w-8 h-8 rounded-lg bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-5 w-20 rounded-md bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-10 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-4 w-20 rounded bg-[var(--color-border)] animate-pulse mx-auto" /></td>
                                            <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                            <th className="px-6 py-4 text-center w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.length === students.length && students.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                                />
                                            </th>
                                            <th className="px-6 py-4 text-left">Siswa</th>

                                            {visibleColumns.gender && (
                                                <th className="px-6 py-4 text-center">Gender</th>
                                            )}
                                            {visibleColumns.kelas && (
                                                <th className="px-6 py-4 text-center">Kelas</th>
                                            )}
                                            {visibleColumns.poin && (
                                                <th className="px-6 py-4 text-center">Poin</th>
                                            )}

                                            {/* COLUMN TOGGLE BUTTON â€” di dalam header Aksi */}
                                            <th className="px-6 py-4 text-center pr-6 relative">
                                                <div className="flex items-center justify-center">
                                                    {visibleColumns.aksi && <span>Aksi</span>}
                                                </div>

                                                {/* Toggle Button â€” absolute kanan, seperti checkbox di kiri */}
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2" ref={colMenuRef}>
                                                    <button
                                                        onClick={(e) => {
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
                                                        }}
                                                        title="Atur kolom"
                                                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all
                            ${isColMenuOpen
                                                                ? 'bg-[var(--color-primary)] text-white'
                                                                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                                                            }`}
                                                    >
                                                        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                                                            <rect x="0" y="0" width="5" height="5" rx="1" />
                                                            <rect x="7" y="0" width="5" height="5" rx="1" />
                                                            <rect x="0" y="7" width="5" height="5" rx="1" />
                                                            <rect x="7" y="7" width="5" height="5" rx="1" />
                                                        </svg>
                                                    </button>

                                                    {/* Dropdown Menu â€” Portal agar tidak ter-clip oleh overflow tabel */}
                                                    {isColMenuOpen && createPortal(
                                                        <div
                                                            className={`absolute z-[9999] w-44 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${colMenuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                            style={{ top: colMenuPos.top, right: colMenuPos.right }}
                                                        >
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">
                                                                Tampilkan Kolom
                                                            </p>
                                                            {[
                                                                { key: 'gender', label: 'Gender' },
                                                                { key: 'kelas', label: 'Kelas' },
                                                                { key: 'poin', label: 'Poin' },
                                                                { key: 'aksi', label: 'Aksi' },
                                                            ].map(({ key, label }) => (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => toggleColumn(key)}
                                                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left"
                                                                >
                                                                    <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                                                    <div className={`w-8 h-4.5 rounded-full transition-all flex items-center px-0.5 ${visibleColumns[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${visibleColumns[key] ? 'translate-x-[14px]' : 'translate-x-0'}`} />
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
                                        {students.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-14 ">
                                                    <div className="flex flex-col items-center text-center gap-2">
                                                        <FontAwesomeIcon icon={faTableList} className="text-3xl text-[var(--color-text-muted)] opacity-30 mb-2" />
                                                        <div className="text-sm font-extrabold text-[var(--color-text)]">Data tidak ditemukan</div>
                                                        <div className="text-xs font-bold text-[var(--color-text-muted)]">Coba ganti filter / kata kunci pencarian.</div>
                                                        <button
                                                            type="button"
                                                            onClick={resetAllFilters}
                                                            className="mt-3 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4"
                                                        >
                                                            Reset Semua Filter
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (students.map((student) => (
                                            <StudentRow
                                                key={student.id}
                                                student={student}
                                                visibleColumns={visibleColumns}
                                                isSelected={selectedIdSet.has(student.id)}
                                                lastReportMap={lastReportMap}
                                                isPrivacyMode={isPrivacyMode}
                                                onEdit={canEdit ? handleEdit : null}
                                                onViewProfile={handleViewProfile}
                                                onViewQR={handleViewQR}
                                                onViewPrint={handleViewPrint}
                                                onViewTags={(s) => { setStudentForTags(s); setActiveModal('tag') }}
                                                onViewClassHistory={handleViewClassHistory}
                                                onConfirmDelete={canEdit ? confirmDelete : null}
                                                onClassBreakdown={handleClassBreakdown}
                                                onPhotoZoom={setPhotoZoom}
                                                onToggleSelect={toggleSelectStudent}
                                                onQuickPoint={handleQuickPoint}
                                                onInlineUpdate={canEdit ? handleInlineUpdate : null}
                                                onTogglePin={handleTogglePin}
                                                classesList={classesList}
                                                formatRelativeDate={formatRelativeDate}
                                                RiskThreshold={RiskThreshold}
                                            />
                                        )))}

                                        {/* Quick Inline Add Row */}
                                        {isInlineAddOpen && (
                                            <tr className="border-t-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.01] transition-all duration-300">
                                                {/* Column 1: Selection (Empty for add) */}
                                                <td className="px-6 py-3 text-center">
                                                    <div className="w-4 h-4 rounded border border-[var(--color-border)] opacity-20 mx-auto" />
                                                </td>

                                                {/* Column 2: Name */}
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="text"
                                                        value={inlineForm.name}
                                                        onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                                        onKeyDown={e => e.key === 'Enter' && handleInlineSubmit()}
                                                        placeholder="Nama siswa baru..."
                                                        autoFocus
                                                        className="input-field text-sm h-9 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full max-w-[240px] font-bold"
                                                    />
                                                </td>

                                                {/* Column 3: Gender */}
                                                <td className="px-6 py-3 text-center">
                                                    <div className="flex gap-1 justify-center">
                                                        {['L', 'P'].map(g => (
                                                            <button key={g} type="button" onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                                                className={`w-8 h-8 rounded-lg text-[10px] font-black border transition-all ${inlineForm.gender === g ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/20') : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                                            >{g}</button>
                                                        ))}
                                                    </div>
                                                </td>

                                                {/* Column 4: Class */}
                                                <td className="px-6 py-3 text-center">
                                                    <select
                                                        value={inlineForm.class_id}
                                                        onChange={e => setInlineForm(p => ({ ...p, class_id: e.target.value }))}
                                                        className="select-field text-xs h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] font-bold min-w-[140px] outline-none focus:border-[var(--color-primary)]"
                                                    >
                                                        <option value="">Pilih kelas</option>
                                                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </td>

                                                {/* Column 5: Phone (Mapped to Point column during add) */}
                                                <td className="px-6 py-3 text-center">
                                                    <input
                                                        type="text"
                                                        value={inlineForm.phone}
                                                        onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                                        placeholder="08xxx (WA)"
                                                        className="input-field text-xs h-9 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-28 text-center font-bold"
                                                    />
                                                </td>

                                                {/* Column 6: Actions */}
                                                <td className="px-6 py-3 text-right pr-6">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button onClick={handleInlineSubmit} disabled={submittingInline || !canEdit}
                                                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center gap-2">
                                                            {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                                                        </button>
                                                        <button onClick={() => setIsInlineAddOpen(false)}
                                                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center">
                                                            <FontAwesomeIcon icon={faXmark} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View */}
                            <div
                                className="md:hidden px-3 pb-6 space-y-3"
                                style={{
                                    paddingBottom:
                                        selectedStudentIds.length > 0
                                            ? `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom) + 88px)`
                                            : `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom) + 16px)`,
                                }}
                            >
                                {students.length === 0 ? (
                                    <div className="py-16 flex flex-col items-center text-center gap-3">
                                        <FontAwesomeIcon icon={faTableList} className="text-4xl text-[var(--color-text-muted)] opacity-20" />
                                        <div className="text-sm font-extrabold text-[var(--color-text)]">Tidak ada data ditemukan</div>
                                        <button onClick={resetAllFilters} className="mt-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)]">Reset Filter</button>
                                    </div>
                                ) : (
                                    <>
                                        {isInlineAddOpen && canEdit && (
                                            <div className="p-3 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/[0.02] shadow-sm">
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Quick Add</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsInlineAddOpen(false)}
                                                        className="h-8 w-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center"
                                                        aria-label="Tutup quick add"
                                                    >
                                                        <FontAwesomeIcon icon={faXmark} />
                                                    </button>
                                                </div>

                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault()
                                                        handleInlineSubmit()
                                                    }}
                                                    className="grid grid-cols-1 gap-2.5"
                                                >
                                                    <input
                                                        type="text"
                                                        value={inlineForm.name}
                                                        onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                                        placeholder="Nama siswa..."
                                                        enterKeyHint="done"
                                                        className="input-field text-sm h-11 px-3 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-[var(--color-surface)] w-full font-bold"
                                                    />

                                                    <div className="grid grid-cols-[1fr_112px] gap-2">
                                                        <select
                                                            value={inlineForm.class_id}
                                                            onChange={e => setInlineForm(p => ({ ...p, class_id: e.target.value }))}
                                                            className="select-field text-[11px] h-11 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] font-black outline-none focus:border-[var(--color-primary)]"
                                                        >
                                                            <option value="">Pilih kelas</option>
                                                            {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {['L', 'P'].map(g => (
                                                                <button
                                                                    key={g}
                                                                    type="button"
                                                                    onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                                                    className={`h-11 flex-1 rounded-xl text-[10px] font-black border transition-all ${inlineForm.gender === g
                                                                        ? (g === 'L' ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/15' : 'bg-pink-500 text-white border-pink-500 shadow-lg shadow-pink-500/15')
                                                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                                                >
                                                                    {g}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="tel"
                                                        inputMode="numeric"
                                                        value={inlineForm.phone}
                                                        onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                                        placeholder="No. HP/WA (opsional)"
                                                        className="input-field text-[11px] h-11 px-3 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] w-full font-bold"
                                                    />

                                                    <button
                                                        type="submit"
                                                        disabled={submittingInline || !canEdit}
                                                        className="h-11 w-full rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                                    >
                                                        {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                                                    </button>
                                                </form>
                                            </div>
                                        )}

                                        {students.map(student => (
                                            <StudentMobileCard
                                                key={student.id}
                                                student={student}
                                                isSelected={selectedIdSet.has(student.id)}
                                                onToggleSelect={toggleSelectStudent}
                                                onViewProfile={handleViewProfile}
                                                onEdit={canEdit ? handleEdit : null}
                                                onConfirmDelete={canEdit ? confirmDelete : null}
                                                onTogglePin={handleTogglePin}
                                                onQuickPoint={handleQuickPoint}
                                                isPrivacyMode={isPrivacyMode}
                                                RiskThreshold={RiskThreshold}
                                            />
                                        ))}
                                    </>
                                )}
                            </div>

                            {/* Quick Add trigger (mobile will render inline card above) */}
                            {!isInlineAddOpen && canEdit && (
                                <button
                                    onClick={() => setIsInlineAddOpen(true)}
                                    className="w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all border-t border-[var(--color-border)] border-dashed"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                                    Quick Add Siswa
                                </button>
                            )}

                            {/* Pagination Footer */}
                            {totalRows > 0 && (
                                <div className="px-6 py-5 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}â€“{toRow} dari {totalRows} siswa</p>
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
                                            {getPageItems(page, totalPages).map((it, idx) => it === '...' ? <span key={`s${idx}`} className="w-8 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30">Â·Â·Â·</span> : (
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
                    </>
                )}

                {/* IMPORT MODAL (lazy chunk) */}
                {/* ===================== */}
                <React.Suspense fallback={null}>
                    {isImportModalOpen && (
                        <LazyStudentImportModal
                            isOpen={isImportModalOpen}
                            onClose={() => {
                                if (importing) return
                                setIsImportModalOpen(false)
                                setImportPreview([])
                                setImportIssues([])
                                setImportDuplicates([])
                                setImportFileName('')
                                setImportDragOver(false)
                                setImportStep(1)
                            }}
                            importing={importing}
                            importStep={importStep}
                            setImportStep={setImportStep}
                            importPreview={importPreview}
                            importDuplicates={importDuplicates}
                            importFileName={importFileName}
                            importFileInputRef={importFileInputRef}
                            importDragOver={importDragOver}
                            setImportDragOver={setImportDragOver}
                            processImportFile={processImportFile}
                            classesList={classesList}
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
                            hasImportBlockingErrors={hasImportBlockingErrors}
                            importReadyRows={importReadyRows}
                        />
                    )}
                </React.Suspense>

                {/* (old inline Import Modal JSX removed; now lazy-loaded) */}
                {/* dead-code Import modal block deleted */}


                {/* ===================== */}
                {/* BULK PHOTO MATCHER MODAL */}
                {/* ===================== */}
                {
                    activeModal === 'bulkPhoto' && (
                        <Modal
                            isOpen={activeModal === 'bulkPhoto'}
                            onClose={() => { if (!uploadingBulkPhotos) closeModal() }}
                            title="Bulk Match Foto Siswa"
                            size="lg"
                        >
                            <div className="space-y-5">
                                <div className="p-8 border-2 border-dashed border-[var(--color-border)] rounded-2xl bg-[var(--color-surface-alt)]/30 flex flex-col items-center text-center group hover:border-[var(--color-primary)]/50 transition-all cursor-pointer relative overflow-hidden">
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={(e) => handleBulkPhotoMatch(e.target.files)}
                                    />
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] mb-4 group-hover:scale-110 transition-transform">
                                        <FontAwesomeIcon icon={faCamera} className="text-2xl" />
                                    </div>
                                    <h4 className="text-sm font-black text-[var(--color-text)] mb-1">Pilih File Foto Massal</h4>
                                    <p className="text-[11px] text-[var(--color-text-muted)] max-w-xs">Pastikan nama file foto menggunakan <b>NISN</b> atau <b>ID Siswa</b> (contoh: 12345.jpg)</p>
                                </div>

                                {bulkPhotoMatches.length > 0 && (
                                    <div className="border border-[var(--color-border)] rounded-2xl overflow-hidden bg-[var(--color-surface)]">
                                        <div className="max-h-60 overflow-auto scrollbar-none">
                                            <table className="w-full text-[11px]">
                                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10 border-b border-[var(--color-border)]">
                                                    <tr className="text-left font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        <th className="p-3 w-16">Preview</th>
                                                        <th className="p-3">Nama File</th>
                                                        <th className="p-3">Siswa Cocok</th>
                                                        <th className="p-3 text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-[var(--color-border)]">
                                                    {bulkPhotoMatches.map((item, i) => (
                                                        <tr key={i} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors">
                                                            <td className="p-2">
                                                                <img src={item.preview} className="w-10 h-10 rounded-lg object-cover border border-[var(--color-border)] shadow-sm" alt="" />
                                                            </td>
                                                            <td className="p-3 font-medium opacity-70">{item.file.name}</td>
                                                            <td className="p-3 font-bold text-[var(--color-text)]">{item.studentName}</td>
                                                            <td className="p-3 text-right">
                                                                {item.status === 'matched' ? (
                                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black uppercase text-[8px]">Matched</span>
                                                                ) : (
                                                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-black uppercase text-[8px]">Skipped</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="p-3 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                                Ditemukan <span className="text-emerald-600 font-black">{bulkPhotoMatches.filter(m => m.status === 'matched').length}</span> foto cocok.
                                            </p>
                                            <button
                                                onClick={handleBulkPhotoUpload}
                                                disabled={uploadingBulkPhotos || bulkPhotoMatches.filter(m => m.status === 'matched').length === 0}
                                                className="h-9 px-6 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center gap-2"
                                            >
                                                {uploadingBulkPhotos ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengupload...</> : <><FontAwesomeIcon icon={faCheck} /> Simpan Semua Foto</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Modal>
                    )
                }

                {/* ===================== */}
                {/* GUARDIAN BROADCAST HUB */}
                {/* ===================== */}
                {
                    activeModal === 'bulkWA' && (
                        <Modal
                            isOpen={activeModal === 'bulkWA'}
                            onClose={() => closeModal()}
                            title="Guardian Broadcast Hub"
                            size="lg"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Selector Section */}
                                <div className="lg:col-span-4 space-y-4">
                                    <div className="p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Template Pesan</label>
                                        {[
                                            { id: 'summary', label: 'Laporan Akademik Lengkap', icon: faFileLines },
                                            { id: 'points', label: 'Ringkasan Poin Perilaku', icon: faTrophy },
                                            { id: 'security', label: 'Akses Portal (ID & PIN)', icon: faShieldHalved },
                                            { id: 'custom', label: 'Pesan Kustom Sekolah', icon: faPenNib },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setBroadcastTemplate(t.id)}
                                                className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${broadcastTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${broadcastTemplate === t.id ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                    <FontAwesomeIcon icon={t.icon} className="text-xs" />
                                                </div>
                                                <span className="text-[11px] font-bold leading-tight">{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {broadcastTemplate === 'custom' && (
                                        <textarea
                                            value={customWaMsg}
                                            onChange={(e) => setCustomWaMsg(e.target.value)}
                                            placeholder="Tulis pesan kustom di sini... Gunakan {nama}, {poin}, {kelas} sebagai tag otomatis."
                                            className="w-full h-32 p-3 text-xs rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] focus:border-[var(--color-primary)] outline-none"
                                        />
                                    )}
                                </div>

                                {/* Preview & Action Section */}
                                <div className="lg:col-span-8 flex flex-col">
                                    <div className="flex-1 bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col min-h-[400px]">
                                        <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]/50 flex items-center justify-between">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Antrean Siaran ({selectedStudentsWithPhone.length} Wali)</h5>
                                            {broadcastIndex >= 0 && (
                                                <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-black animate-pulse">SIARAN BERJALAN...</div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-auto p-4 space-y-3 max-h-[350px] scrollbar-none">
                                            {selectedStudentsWithPhone.map((s, idx) => (
                                                <div key={idx} className={`p-3 rounded-xl border transition-all ${broadcastIndex === idx ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] opacity-70'}`}>
                                                    <div className="flex items-start justify-between gap-3 mb-2">
                                                        <div>
                                                            <p className="text-[11px] font-black leading-none">{s.name}</p>
                                                            <p className="text-[9px] text-[var(--color-text-muted)] mt-1 font-bold">Wali: {s.guardian_name || '---'} ({s.phone})</p>
                                                        </div>
                                                        <button
                                                            onClick={() => openWAForStudent(s, buildWAMessage(s, broadcastTemplate))}
                                                            className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center text-[10px]"
                                                        >
                                                            <FontAwesomeIcon icon={faWhatsapp} />
                                                        </button>
                                                    </div>
                                                    <div className="p-2.5 rounded-lg bg-[var(--color-surface-alt)]/50 border border-black/5 text-[10px] font-medium leading-relaxed italic line-clamp-2">
                                                        {buildWAMessage(s, broadcastTemplate)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-[var(--color-surface)] border-t border-[var(--color-border)] flex items-center justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1">
                                                    <span>Kemajuan Hub</span>
                                                    <span>{broadcastIndex + 1} / {selectedStudentsWithPhone.length}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--color-primary)] transition-all duration-500"
                                                        style={{ width: `${selectedStudentsWithPhone.length ? ((broadcastIndex + 1) / selectedStudentsWithPhone.length) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    selectedStudentsWithPhone.forEach((s, i) => {
                                                        setTimeout(() => {
                                                            setBroadcastIndex(i);
                                                            openWAForStudent(s, buildWAMessage(s, broadcastTemplate));
                                                        }, i * 1200);
                                                    });
                                                }}
                                                className="h-11 px-6 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 shrink-0"
                                            >
                                                <FontAwesomeIcon icon={faPaperPlane} />
                                                Mulai Siaran Massal
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* ===================== */}
                {/* EXPORT MODAL (lazy chunk) */}
                {/* ===================== */}
                <React.Suspense fallback={null}>
                    {isExportModalOpen && (
                        <LazyStudentExportModal
                            isOpen={isExportModalOpen}
                            onClose={() => { if (exporting) return; setIsExportModalOpen(false) }}
                            students={students}
                            selectedStudentIds={selectedStudentIds}
                            exportScope={exportScope}
                            setExportScope={setExportScope}
                            exportColumns={exportColumns}
                            setExportColumns={setExportColumns}
                            exporting={exporting}
                            handleExportCSV={handleExportCSV}
                            handleExportExcel={handleExportExcel}
                            handleExportPDF={handleExportPDF}
                            generateStudentPDF={generateStudentPDF}
                            addToast={addToast}
                        />
                    )}
                </React.Suspense>


                {
                    isModalOpen && (
                        <StudentFormModal
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            selectedStudent={selectedStudent}
                            classesList={classesList}
                            onSubmit={handleSubmit}
                            submitting={submitting}
                            onPhotoUpload={handlePhotoUpload}
                            uploadingPhoto={uploadingPhoto}
                        />
                    )
                }


                {/* Modal Cetak Kartu & Akses Siswa (lazy-loaded) */}
                <React.Suspense fallback={null}>
                    {isPrintModalOpen && (
                        <LazyStudentPrintModal
                            isOpen={isPrintModalOpen}
                            onClose={() => {
                                setIsPrintModalOpen(false);
                                if (newlyCreatedStudent) setNewlyCreatedStudent(null);
                            }}
                            selectedStudent={selectedStudent}
                            newlyCreatedStudent={newlyCreatedStudent}
                            isPrivacyMode={isPrivacyMode}
                            maskInfo={maskInfo}
                            addToast={addToast}
                            cardCaptureRef={cardCaptureRef}
                            waTemplate={waTemplate}
                            buildWAMessage={buildWAMessage}
                            openWAForStudent={openWAForStudent}
                            handleResetPin={handleResetPin}
                            resettingPin={resettingPin}
                            generatingPdf={generatingPdf}
                            handlePrintSingle={handlePrintSingle}
                            handleSavePNG={handleSavePNG}
                            handlePrintThermal={handlePrintThermal}
                        />
                    )}
                </React.Suspense>
                {/* Modal Detail Profil Siswa â€” lazy loaded */}
                {activeModal === 'profile' && selectedStudent && (
                    <React.Suspense fallback={null}>
                        <LazyStudentProfileModal
                            isOpen={activeModal === 'profile'}
                            onClose={closeModal}
                            selectedStudent={selectedStudent}
                            isPrivacyMode={isPrivacyMode}
                            maskInfo={maskInfo}
                            calculateCompleteness={calculateCompleteness}
                            behaviorHistory={behaviorHistory}
                            loadingHistory={loadingHistory}
                            RiskThreshold={RiskThreshold}
                            canEdit={canEdit}
                            handleEdit={handleEdit}
                            profileTab={profileTab}
                            setProfileTab={setProfileTab}
                            timelineStats={timelineStats}
                            timelineFilter={timelineFilter}
                            setTimelineFilter={setTimelineFilter}
                            timelineVisible={timelineVisible}
                            setTimelineVisible={setTimelineVisible}
                            timelineFiltered={timelineFiltered}
                            timelineGroups={timelineGroups}
                            raportHistory={raportHistory}
                            loadingRaport={loadingRaport}
                            addToast={addToast}
                            onOpenTagModal={() => { setStudentForTags(selectedStudent); setActiveModal('tag') }}
                        />
                    </React.Suspense>
                )}



                {/* Bulk Promote Modal */}
                {
                    activeModal === 'bulkPromote' && (
                        <Modal
                            isOpen={activeModal === 'bulkPromote'}
                            onClose={() => closeModal()}
                            title="Kenaikan Kelas Massal"
                            size="sm"
                        >
                            <div className="space-y-6">
                                <div className="p-4 glass bg-[var(--color-primary)]/10 rounded-[1.5rem] border border-[var(--color-primary)]/20">
                                    <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
                                        Target Kenaikan
                                    </p>
                                    <p className="text-[11px] text-[var(--color-text)] leading-relaxed font-bold">
                                        Anda akan memindahkan <span className="text-[var(--color-primary)] font-black text-[13px] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20">{selectedStudentIds.length} siswa</span> terpilih ke kelas tujuan.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest block mb-2 ml-1">Pilih Kelas Baru</label>
                                    <select
                                        value={bulkClassId}
                                        onChange={(e) => setBulkClassId(e.target.value)}
                                        className="select-field text-sm py-3 bg-[var(--color-surface-alt)] border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-[1rem] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                                    >
                                        <option value="">Cari Kelas Tujuan</option>
                                        {classesList.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black h-11 text-[10px] uppercase tracking-widest rounded-[1rem] transition-all">
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkPromote}
                                        disabled={submitting}
                                        className="btn btn-primary flex-1 font-black h-11 text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-[1rem] transition-all hover:scale-[1.02]"
                                    >
                                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Proses'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Delete (Arsip) Modal */}
                {
                    activeModal === 'delete' && (
                        <Modal
                            isOpen={activeModal === 'delete'}
                            onClose={() => closeModal()}
                            title="Arsipkan Siswa?"
                        >
                            <div className="space-y-6">
                                <div className="p-4 bg-amber-500/10 rounded-[1.5rem] flex items-center gap-4 text-amber-600 border border-amber-500/20">
                                    <div className="w-12 h-12 rounded-[1rem] bg-amber-500/20 flex items-center justify-center shrink-0 text-xl border border-amber-500/30">
                                        <FontAwesomeIcon icon={faBoxArchive} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Pindahkan ke Arsip?</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Data dapat dipulihkan kapan saja dari menu Arsip.</p>
                                    </div>
                                </div>

                                <div className="px-1">
                                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                                        <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{studentToDelete?.name}</span> akan dipindahkan ke arsip. Riwayat laporan & poin tetap tersimpan dan bisa dipulihkan.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                                        BATAL
                                    </button>
                                    <button type="button" onClick={executeDelete} className="btn bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                                        ARSIPKAN
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Bulk Delete Modal */}
                {
                    activeModal === 'bulkDelete' && (
                        <Modal
                            isOpen={activeModal === 'bulkDelete'}
                            onClose={() => closeModal()}
                            title="Hapus Siswa Terpilih?"
                            size="sm"
                        >
                            <div className="space-y-6">
                                <div className="p-4 bg-red-500/10 rounded-[1.5rem] flex items-center gap-4 text-red-500 border border-red-500/20">
                                    <div className="w-12 h-12 rounded-[1rem] bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Hapus {selectedStudentIds.length} Siswa?</h3>
                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Riwayat laporan & poin terhapus permanen.</p>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                                        Tindakan ini akan menghapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{selectedStudentIds.length} siswa</span> beserta seluruh riwayat perilaku mereka. Tindakan ini tidak dapat dibatalkan.
                                    </p>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                                        BATAL
                                    </button>
                                    <button type="button" onClick={handleBulkDelete} disabled={submitting} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'HAPUS PERMANEN'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }
                {/* Modal Arsip Siswa */}
                {/* Modal Arsip */}
                {
                    activeModal === 'archived' && (
                        <Modal
                            isOpen={activeModal === 'archived'}
                            onClose={() => closeModal()}
                            title="Arsip Siswa"
                            size="lg"
                        >
                            <div className="space-y-4">
                                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3">
                                    <FontAwesomeIcon icon={faBoxArchive} className="text-amber-600 text-lg shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-amber-700 dark:text-amber-400">{archivedStudents.length} siswa di arsip</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Pulihkan untuk mengembalikan ke daftar aktif, atau hapus permanen.</p>
                                    </div>
                                </div>

                                {loadingArchived ? (
                                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" /> Memuat arsip...
                                    </div>
                                ) : archivedStudents.length === 0 ? (
                                    <div className="text-center py-10 text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faBoxArchive} className="text-3xl opacity-20 mb-2 block" />
                                        <p className="text-sm font-bold">Arsip kosong</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        <th className="px-4 py-3">Siswa</th>
                                                        <th className="px-4 py-3 text-center">Kelas</th>
                                                        <th className="px-4 py-3 text-center">Diarsipkan</th>
                                                        <th className="px-4 py-3 text-center">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {archivedStudents.slice((archivePage - 1) * archivePageSize, archivePage * archivePageSize).map(s => (
                                                        <tr key={s.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40">
                                                            <td className="px-4 py-3">
                                                                <p className="font-bold text-[var(--color-text)]">{s.name}</p>
                                                                <p className="text-[10px] font-mono text-[var(--color-text-muted)]">{s.registration_code}</p>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20">{s.className}</span>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-[11px] text-[var(--color-text-muted)]">
                                                                {formatRelativeDate(s.deleted_at)}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleRestoreStudent(s)}
                                                                        className="h-8 px-3 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                                    >
                                                                        <FontAwesomeIcon icon={faRotateLeft} />
                                                                        Pulihkan
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handlePermanentDelete(s)}
                                                                        className="h-8 px-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                                                                    >
                                                                        <FontAwesomeIcon icon={faTrash} />
                                                                        Hapus
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination Arsip */}
                                        {archivedStudents.length > archivePageSize && (
                                            <div className="flex items-center justify-between px-1">
                                                <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">
                                                    Halaman {archivePage} dari {Math.ceil(archivedStudents.length / archivePageSize)}
                                                </p>
                                                <div className="flex gap-2">
                                                    <button
                                                        disabled={archivePage === 1}
                                                        onClick={() => setArchivePage(p => p - 1)}
                                                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
                                                    >
                                                        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                                    </button>
                                                    <button
                                                        disabled={archivePage >= Math.ceil(archivedStudents.length / archivePageSize)}
                                                        onClick={() => setArchivePage(p => p + 1)}
                                                        className="w-8 h-8 rounded-lg border border-[var(--color-border)] flex items-center justify-center disabled:opacity-30 hover:bg-[var(--color-surface-alt)]"
                                                    >
                                                        <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Modal Riwayat Kelas */}
                {
                    activeModal === 'classHistory' && (
                        <Modal
                            isOpen={activeModal === 'classHistory'}
                            onClose={() => closeModal()}
                            title={`Riwayat Kelas â€” ${selectedStudent?.name || ''}`}
                            size="md"
                        >
                            <div className="space-y-4">
                                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 flex items-center gap-3">
                                    <FontAwesomeIcon icon={faClockRotateLeft} className="text-purple-500 text-lg shrink-0" />
                                    <div>
                                        <p className="text-xs font-black text-purple-600 dark:text-purple-400">Tracking perpindahan kelas</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Tercatat setiap kali siswa berpindah kelas.</p>
                                    </div>
                                </div>

                                {loadingClassHistory ? (
                                    <div className="text-center py-6 text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" /> Memuat...
                                    </div>
                                ) : classHistory.length === 0 ? (
                                    <div className="text-center py-8 text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-3xl opacity-20 mb-2 block" />
                                        <p className="text-sm font-bold">Belum ada riwayat perpindahan kelas</p>
                                        <p className="text-[11px] mt-1 opacity-60">Siswa ini belum pernah berpindah kelas sejak terdaftar.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-72 overflow-auto">
                                        {classHistory.map((h, idx) => (
                                            <div key={h.id || idx} className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
                                                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[11px]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-xs font-bold">
                                                        <span className="text-[var(--color-text-muted)]">{h.from_class?.name || 'Tidak diketahui'}</span>
                                                        <span className="text-[var(--color-text-muted)] opacity-50">â†’</span>
                                                        <span className="text-[var(--color-text)]">{h.to_class?.name || 'Tidak diketahui'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{h.note || '-'} Â· {formatRelativeDate(h.changed_at)}</p>
                                                </div>
                                                <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{new Date(h.changed_at).toLocaleDateString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Fitur 1 - Class Breakdown Modal */}
                {
                    activeModal === 'classBreakdown' && (
                        <Modal
                            isOpen={activeModal === 'classBreakdown'}
                            onClose={() => closeModal()}
                            title={`Statistik Kelas â€” ${classBreakdownData?.className || ''}`}
                            size="md"
                        >
                            {loadingBreakdown ? (
                                <div className="text-center py-10 text-[var(--color-text-muted)]">
                                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl mb-2 block" />
                                    <p className="text-sm">Memuat statistik...</p>
                                </div>
                            ) : classBreakdownData && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Total Siswa', value: classBreakdownData.total, color: 'text-[var(--color-primary)]' },
                                            { label: 'Putra', value: classBreakdownData.boys, color: 'text-blue-500' },
                                            { label: 'Putri', value: classBreakdownData.girls, color: 'text-pink-500' },
                                            { label: 'Rata-rata Poin', value: classBreakdownData.avgPoints, color: classBreakdownData.avgPoints >= 0 ? 'text-emerald-500' : 'text-red-500' },
                                        ].map(item => (
                                            <div key={item.label} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-center">
                                                <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">{item.label}</p>
                                                <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-red-500 shrink-0" />
                                        <div>
                                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Siswa Risiko (â‰¤ {RiskThreshold})</p>
                                            <p className="text-lg font-black text-red-500">{classBreakdownData.riskCount} siswa</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
                                            Top 3 Poin Tertinggi
                                        </p>
                                        <div className="space-y-2">
                                            {classBreakdownData.topStudents.map((s, idx) => (
                                                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${idx === 0 ? 'bg-yellow-400/20 text-yellow-600' :
                                                        idx === 1 ? 'bg-gray-400/20 text-gray-500' :
                                                            'bg-orange-400/20 text-orange-600'
                                                        }`}>#{idx + 1}</span>
                                                    <span className="flex-1 text-sm font-bold text-[var(--color-text)] truncate">{s.name}</span>
                                                    <span className={`text-sm font-black ${s.total_points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{s.total_points}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button onClick={() => { closeModal(); setFilterClass(''); const cls = classesList.find(c => c.name === classBreakdownData.className); if (cls) setFilterClass(cls.id) }}
                                            className="btn bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-[var(--color-primary)]/20 transition">
                                            Filter Kelas Ini
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    )
                }


                {/* Fitur 2 - Batch Reset Poin Modal */}
                {
                    activeModal === 'resetPoints' && (
                        <Modal
                            isOpen={activeModal === 'resetPoints'}
                            onClose={() => closeModal()}
                            title="Reset Poin Semester Baru"
                            size="sm"
                        >
                            <div className="space-y-5">
                                <div className="p-4 bg-orange-500/10 rounded-[1.5rem] border border-orange-500/20">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-orange-500 text-2xl mb-2" />
                                    <p className="text-sm font-bold text-[var(--color-text)]">Set semua poin ke 0 untuk semester/tahun ajaran baru.</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Pilih Kelas (kosongkan untuk semua kelas)</label>
                                    <select
                                        value={resetPointsClassId}
                                        onChange={e => setResetPointsClassId(e.target.value)}
                                        className="select-field text-sm py-2.5 w-full rounded-xl border-[var(--color-border)] bg-transparent font-bold"
                                    >
                                        <option value="">Semua Kelas</option>
                                        {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-[11px] text-red-600 font-bold">
                                    âš  Tindakan ini tidak bisa dibatalkan. Semua poin akan direset ke 0.
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl">Batal</button>
                                    <button onClick={handleBatchResetPoints} disabled={resettingPoints}
                                        className="btn bg-orange-500 hover:bg-orange-600 text-white flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50">
                                        {resettingPoints ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Reset Poin'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Fitur 7 - Dynamic Tag Modal (SaaS UI) */}
                {
                    activeModal === 'tag' && (
                        <Modal
                            isOpen={activeModal === 'tag'}
                            onClose={() => closeModal()}
                            title={`Kelola Label â€” ${studentForTags?.name || ''}`}
                            size="sm"
                        >
                            <div className="space-y-4">
                                <p className="text-[10px] text-[var(--color-text-muted)] font-bold opacity-70">
                                    Atur label siswa untuk segmentasi & filter
                                </p>
                                {studentForTags && (
                                    <div className="space-y-6">
                                        {/* Input Section */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tambah Label Baru</label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    value={newTagInput}
                                                    onChange={e => setNewTagInput(e.target.value)}
                                                    onKeyDown={handleAddCustomTag}
                                                    placeholder="Ketik lalu Tekan Enter..."
                                                    className="w-full h-11 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl px-4 text-sm font-bold focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all outline-none"
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-focus-within:block">
                                                    <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded border border-white/20 text-[var(--color-text-muted)]">ENTER â†µ</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Active Tags Pool */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Label Saat Ini</label>
                                                <span className="text-[9px] font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-full">
                                                    {(studentForTags.tags || []).length} AKTIF
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 rounded-2xl bg-[var(--color-surface-alt)]/30 border border-dashed border-[var(--color-border)]">
                                                {(studentForTags.tags || []).length === 0 ? (
                                                    <p className="text-[10px] text-[var(--color-text-muted)] italic opacity-60 m-auto">Belum ada label terpilih</p>
                                                ) : (
                                                    (studentForTags.tags || []).map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => handleToggleTag(studentForTags, tag)}
                                                            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all hover:scale-105 active:scale-95 ${getTagColor(tag)}`}
                                                        >
                                                            {tag}
                                                            <FontAwesomeIcon icon={faXmark} className="text-[9px] opacity-40 group-hover:opacity-100 transition-opacity" />
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        </div>

                                        {/* Suggested Pool */}
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih dari Database / Edit Global</label>
                                            <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                                                {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(tag => {
                                                    const isActive = (studentForTags.tags || []).includes(tag);
                                                    const isEditing = tagToEdit === tag;

                                                    return (
                                                        <div key={tag} className={`relative flex items-center transition-all ${isEditing ? 'w-full' : ''}`}>
                                                            {isEditing ? (
                                                                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                                                    <input
                                                                        autoFocus
                                                                        type="text"
                                                                        value={renameInput}
                                                                        onChange={e => setRenameInput(e.target.value)}
                                                                        className="flex-1 h-8 bg-white border border-[var(--color-primary)] rounded-lg px-3 text-xs font-bold outline-none shadow-lg shadow-[var(--color-primary)]/10"
                                                                        onKeyDown={e => {
                                                                            if (e.key === 'Enter') handleGlobalRenameTag(tag, renameInput)
                                                                            if (e.key === 'Escape') setTagToEdit(null)
                                                                        }}
                                                                    />
                                                                    <button onClick={() => handleGlobalRenameTag(tag, renameInput)} className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white text-[10px] shrink-0">
                                                                        <FontAwesomeIcon icon={faCheck} />
                                                                    </button>
                                                                    <button onClick={() => setTagToEdit(null)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 text-[10px] shrink-0">
                                                                        <FontAwesomeIcon icon={faXmark} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="group flex items-center bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)]/30 transition-all">
                                                                    <button
                                                                        onClick={() => handleToggleTag(studentForTags, tag)}
                                                                        className={`px-3 py-1.5 text-xs font-bold transition-all rounded-l-lg ${isActive
                                                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-primary)]'
                                                                            }`}
                                                                    >
                                                                        {tag}
                                                                        {isActive && <FontAwesomeIcon icon={faCheck} className="ml-2 text-[10px]" />}
                                                                    </button>

                                                                    {/* Manage Actions on Hover */}
                                                                    <div className="flex opacity-0 group-hover:opacity-100 transition-opacity border-l border-[var(--color-border)] bg-white/50 backdrop-blur-sm rounded-r-lg">
                                                                        <button
                                                                            onClick={() => { setTagToEdit(tag); setRenameInput(tag) }}
                                                                            className="w-7 h-7 flex items-center justify-center text-[10px] text-blue-500 hover:bg-blue-500/10"
                                                                            title="Ganti Nama Global"
                                                                        >
                                                                            <FontAwesomeIcon icon={faEdit} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleGlobalDeleteTag(tag)}
                                                                            className="w-7 h-7 flex items-center justify-center text-[10px] text-red-500 hover:bg-red-500/10"
                                                                            title="Hapus Global"
                                                                        >
                                                                            <FontAwesomeIcon icon={faTrash} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <p className="text-[8px] text-[var(--color-text-muted)] mt-2 italic px-1">
                                                * Gunakan ikon <FontAwesomeIcon icon={faEdit} className="text-blue-500 mx-0.5" /> dan <FontAwesomeIcon icon={faTrash} className="text-red-500 mx-0.5" /> untuk merubah nama atau menghapus label dari SEMUA siswa sekaligus.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => closeModal()}
                                        className="h-10 px-6 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all active:scale-95"
                                    >
                                        Selesai
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Fitur 12 - Google Sheets Import Modal */}
                {
                    activeModal === 'gsheets' && (
                        <Modal
                            isOpen={activeModal === 'gsheets'}
                            onClose={() => closeModal()}
                            title="Import dari Google Sheets"
                            size="md"
                        >
                            <div className="space-y-4">
                                {/* Panduan Mini Sheets */}
                                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface)] shadow-inner">
                                    <div className="bg-emerald-500/10 px-3 py-2 flex items-center justify-between border-b border-[var(--color-border)]">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            Contoh Format Kolom
                                        </span>
                                        <FontAwesomeIcon icon={faTable} className="text-emerald-500/50 text-xs" />
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full text-left border-collapse min-w-[300px]">
                                            <thead>
                                                <tr className="bg-[var(--color-surface-alt)]">
                                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-[10px] font-bold text-[var(--color-text-muted)] w-8 text-center bg-[var(--color-surface-alt)]/50"></th>
                                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-center">
                                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">A</p>
                                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(name)</p>
                                                    </th>
                                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-center">
                                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">B</p>
                                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(gender)</p>
                                                    </th>
                                                    <th className="border-b border-r border-[var(--color-border)] px-2 py-1.5 text-center">
                                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">C</p>
                                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(phone)</p>
                                                    </th>
                                                    <th className="border-b border-[var(--color-border)] px-2 py-1.5 text-center">
                                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-none">D</p>
                                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">(class_name)</p>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b border-[var(--color-border)]">
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]">1</td>
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">Budi Santoso</td>
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">L</td>
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium font-mono text-emerald-600">0812...</td>
                                                    <td className="px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">10A Boarding Putra</td>
                                                </tr>
                                                <tr className="border-[var(--color-border)]">
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1.5 text-[9px] font-bold text-[var(--color-text-muted)] text-center bg-[var(--color-surface-alt)]">2</td>
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">Siti Aminah</td>
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">P</td>
                                                    <td className="border-r border-[var(--color-border)] px-2 py-1 text-[11px] text-[var(--color-text)] font-medium font-mono text-emerald-600">0857...</td>
                                                    <td className="px-2 py-1 text-[11px] text-[var(--color-text)] font-medium">10B Boarding Putri</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold flex gap-3 items-start">
                                    <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 shrink-0" />
                                    <p>Pastikan akses Google Sheets telah diubah menjadi <b>Anyone with the link</b> (Siapa saja yang memiliki tautan dapat melihat).</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">URL Google Sheets</label>
                                    <input
                                        type="url"
                                        value={gSheetsUrl}
                                        onChange={e => setGSheetsUrl(e.target.value)}
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                        className="input-field text-sm py-2.5 w-full rounded-xl border-[var(--color-border)] bg-transparent"
                                    />
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)]">Header kolom: <b>name/nama</b>, <b>gender/jk</b>, <b>phone</b>, <b>class_name/kelas</b></p>
                                <div className="flex gap-3 mt-2">
                                    <button onClick={() => closeModal()} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-xs font-bold rounded-xl text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors">Batal</button>
                                    <button onClick={handleFetchGSheets} disabled={fetchingGSheets}
                                        className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex-1 h-11 text-xs font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                                        {fetchingGSheets ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faLink} />}
                                        Ambil Data
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }


                {/* Fitur 13 - Photo Zoom Overlay */}
                {
                    photoZoom && (
                        <div
                            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-pointer backdrop-blur-sm"
                            onClick={() => setPhotoZoom(null)}
                        >
                            <div className="text-center" onClick={e => e.stopPropagation()}>
                                <img
                                    src={photoZoom.url}
                                    alt={photoZoom.name}
                                    className="max-w-[320px] max-h-[320px] w-auto h-auto rounded-2xl object-cover shadow-2xl ring-4 ring-white/10"
                                />
                                <p className="text-white font-black mt-3 text-sm drop-shadow">{photoZoom.name}</p>
                                <button onClick={() => setPhotoZoom(null)}
                                    className="mt-3 h-8 px-4 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* CSS Print Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    /* Reset everything */
                    body > *:not(#portal-root) { 
                        position: absolute !important;
                        left: -9999px !important;
                        visibility: hidden !important;
                    }
                    #portal-root { 
                        display: block !important; 
                        position: static !important; 
                        visibility: visible !important;
                    }
                    
                    /* Background Colors */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Portal Content Positioning */
                    .modal-overlay {
                        position: fixed !important;
                        top: 0 !important; left: 0 !important;
                        width: 100vw !important; height: 100vh !important;
                        background: white !important;
                        display: block !important;
                        visibility: visible !important;
                        z-index: 9999999 !important;
                        padding: 0 !important; margin: 0 !important;
                        backdrop-filter: none !important;
                    }

                    .modal-content {
                        position: relative !important;
                        top: 0 !important; left: 0 !important;
                        width: 100% !important; max-width: none !important;
                        height: auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 20mm 0 !important; margin: 0 !important;
                        display: block !important;
                        visibility: visible !important;
                        background: white !important;
                    }

                    /* Hide Non-Card Elements */
                    .modal-content > div:first-child,
                    .no-print, 
                    button {
                        display: none !important;
                        visibility: hidden !important;
                    }

                    /* Card Container for Print */
                    #printable-cards {
                        display: flex !important;
                        flex-direction: row !important;
                        gap: 15mm !important;
                        justify-content: center !important;
                        align-items: center !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        transform: none !important;
                        scale: 1 !important;
                        margin: 0 auto !important;
                    }
                    
                    #printable-cards * {
                        visibility: visible !important;
                    }

                    /* Layout Setup */
                    @page {
                        size: landscape;
                        margin: 0;
                    }
                }
            `}} />
                {/* ===================== */}
                {/* FLOATING BULK ACTION BAR - SaaS STYLE */}
                {/* ===================== */}
                {
                    selectedStudentIds.length > 0 && (
                        <div
                            className="fixed left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-500"
                            style={{ bottom: `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom) + 12px)` }}
                        >
                            <div className="glass-morphism bg-gray-900/90 dark:bg-gray-800/90 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-4 text-white">
                                <div className="flex items-center gap-3 pl-2">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-black text-sm shadow-lg shadow-indigo-500/30">
                                        {selectedStudentIds.length}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Siswa Terpilih</p>
                                        <p className="text-[11px] font-bold">Aksi Massal</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={handleBulkWA}
                                        className="h-10 px-4 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
                                        Broadcast
                                    </button>

                                    <button
                                        onClick={handleBulkPrint}
                                        className="h-10 px-4 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faPrint} className="text-base" />
                                        <span className="hidden md:inline">Cetak Kartu</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkTag')}
                                        className="h-10 px-4 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faTags} className="text-base" />
                                        <span className="hidden md:inline">Beri Label</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkPromote')}
                                        className="h-10 px-4 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faGraduationCap} className="text-base" />
                                        <span className="hidden md:inline">Naik Kelas</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkPoint')}
                                        className="h-10 px-4 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faBolt} className="text-base" />
                                        <span className="hidden md:inline">Beri Poin</span>
                                    </button>



                                    <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

                                    <button
                                        onClick={() => setSelectedStudentIds([])}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-all text-white/60 hover:text-white"
                                        title="Batal Pilih"
                                    >
                                        <FontAwesomeIcon icon={faXmark} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* ===================== */}
                {/* BULK TAG MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    activeModal === 'bulkTag' && (
                        <Modal
                            isOpen={activeModal === 'bulkTag'}
                            onClose={() => closeModal()}
                            title={`Aksi Label Massal â€” ${selectedStudentIds.length} Siswa`}
                            size="sm"
                        >
                            <div className="space-y-6">
                                {/* Mode Toggle */}
                                <div className="flex p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    <button
                                        onClick={() => setBulkTagAction('add')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${bulkTagAction === 'add' ? 'bg-indigo-500 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        Tambah Label
                                    </button>
                                    <button
                                        onClick={() => setBulkTagAction('remove')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${bulkTagAction === 'remove' ? 'bg-red-500 text-white shadow-lg' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                    >
                                        Hapus Label
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Label untuk Diaplikasikan</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Array.from(new Set([...AvailableTags, ...allUsedTags])).sort().map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleBulkTagApply(tag)}
                                                disabled={submitting}
                                                className={`p-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between group hover:scale-[1.02] active:scale-95 ${bulkTagAction === 'add'
                                                    ? 'hover:border-indigo-500 hover:bg-indigo-500/5'
                                                    : 'hover:border-red-500 hover:bg-red-500/5'
                                                    } border-[var(--color-border)] bg-[var(--color-surface)]`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${getTagColor(tag).split(' ')[0]}`} />
                                                    {tag}
                                                </span>
                                                <FontAwesomeIcon
                                                    icon={bulkTagAction === 'add' ? faPlus : faTrash}
                                                    className={`text-[9px] opacity-0 group-hover:opacity-100 transition-opacity ${bulkTagAction === 'add' ? 'text-indigo-500' : 'text-red-500'}`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold leading-relaxed">
                                        {bulkTagAction === 'add'
                                            ? `* Memilih label akan MENAMBAHKAN label tersebut ke SEMUA (${selectedStudentIds.length}) siswa yang Anda pilih.`
                                            : `* Memilih label akan MENGHAPUS label tersebut dari SEMUA (${selectedStudentIds.length}) siswa yang memiliki label itu.`}
                                    </p>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={() => closeModal()}
                                        className="h-10 px-6 bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[var(--color-border)] transition-all"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }
                {/* ===================== */}
                {/* BULK POINT MODAL - SaaS STYLE */}
                {/* ===================== */}
                {
                    activeModal === 'bulkPoint' && (
                        <Modal
                            isOpen={activeModal === 'bulkPoint'}
                            onClose={() => closeModal()}
                            title={`Aksi Poin Massal â€” ${selectedStudentIds.length} Siswa`}
                            size="sm"
                        >
                            <div className="space-y-6">
                                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-500 text-xl">
                                        <FontAwesomeIcon icon={faBolt} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-600/60">Input Poin Massal</p>
                                        <p className="text-xs font-bold text-[var(--color-text)]">Berikan poin positif atau negatif ke seluruh siswa terpilih.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Jumlah Poin</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={bulkPointValue}
                                                onChange={e => setBulkPointValue(Number(e.target.value))}
                                                placeholder="Contoh: 10 atau -10"
                                                className="input-field w-full h-12 px-4 pr-24 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-lg font-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                                <button onClick={() => setBulkPointValue(10)} className="h-7 px-2 rounded-lg bg-emerald-500/10 text-emerald-600 text-[9px] font-black">+10</button>
                                                <button onClick={() => setBulkPointValue(-10)} className="h-7 px-2 rounded-lg bg-red-500/10 text-red-600 text-[9px] font-black">-10</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Alasan / Keterangan</label>
                                        <input
                                            type="text"
                                            value={bulkPointLabel}
                                            onChange={e => setBulkPointLabel(e.target.value)}
                                            placeholder="Contoh: Hadiah Lomba Kebersihan"
                                            className="input-field w-full h-11 px-4 rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="flex p-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 gap-3 items-start">
                                    <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 mt-0.5" />
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-bold leading-relaxed">
                                        Poin akan ditambahkan ke total poin masing-masing siswa. Pastikan jumlah dan alasan sudah benar sebelum memproses.
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => closeModal()}
                                        className="h-12 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-border)] transition-all"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleBulkPointUpdate}
                                        disabled={submitting || !bulkPointValue}
                                        className="h-12 flex-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                                    >
                                        {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Proses Poin Massal'}
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }
            </div>
        </DashboardLayout >
    )
}
