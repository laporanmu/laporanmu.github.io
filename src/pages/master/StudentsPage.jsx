import React from 'react'
import { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react'
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
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'
import mbsLogo from '../../assets/mbs.png'

// Library untuk Export dan Import 
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

const SortOptions = [
    { value: 'name_asc', label: 'Nama A–Z' },
    { value: 'name_desc', label: 'Nama Z–A' },
    { value: 'class_asc', label: 'Kelas A–Z' },
    { value: 'points_desc', label: 'Poin tertinggi' },
    { value: 'points_asc', label: 'Poin terendah' },
]

// FIX BOTTOM NAV Z-INDEX:
// Di DashboardLayout atau komponen BottomNav, pastikan z-index bottom nav
// lebih tinggi dari backdrop modal (z-[60]). Contoh:
//   <nav className="fixed bottom-0 z-[80] ...">
// Ini mencegah backdrop modal mencover bottom nav sehingga tap nav tetap berfungsi.

const RiskThreshold = -30
const AvailableTags = ['Beasiswa', 'Berprestasi']

const getTagColor = (tag) => {
    const colors = [
        'bg-blue-500/10 text-blue-500 border-blue-500/20',
        'bg-purple-500/10 text-purple-500 border-purple-500/20',
        'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        'bg-amber-500/10 text-amber-500 border-amber-500/20',
        'bg-pink-500/10 text-pink-500 border-pink-500/20',
        'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
        'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
    ];
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
        hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// Helper to calculate data completeness percentage
const calculateCompleteness = (s) => {
    if (!s) return 0;
    let score = 40; // Base score for Name, Gender, Class
    if (s.photo_url || s.photo) score += 20;
    if (s.phone) score += 15;
    if (s.nisn) score += 15;
    if (s.metadata && Object.keys(s.metadata).length > 0) score += 10;
    return score;
};

const maskInfo = (str, visibleLen = 3) => {
    if (!str) return '---'
    if (str.length <= visibleLen) return str[0] + '*'.repeat(str.length - 1)
    return str.substring(0, visibleLen) + '***'
};

import StudentFormModal from '../../components/students/StudentFormModal'
import { StudentRow, StudentMobileCard } from '../../components/students/StudentRow'

// ── BehaviorHeatmap — outside StudentsPage to prevent re-creation on every render ──
const BehaviorHeatmap = memo(({ history }) => {
    const today = new Date()
    const startDate = new Date()
    startDate.setMonth(today.getMonth() - 3)
    startDate.setDate(1)
    const days = []
    let curr = new Date(startDate)
    while (curr <= today) { days.push(new Date(curr)); curr.setDate(curr.getDate() + 1) }
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
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [studentToDelete, setStudentToDelete] = useState(null)
    // formData dikelola di StudentFormModal (terpisah) agar tidak trigger re-render parent saat mengetik
    // Di parent hanya perlu formData untuk handleSubmit dan handleEdit (pass via ref)
    const [submitting, setSubmitting] = useState(false)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null)
    const [behaviorHistory, setBehaviorHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedStudentIds, setSelectedStudentIds] = useState([])
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
    const [isBulkWAModalOpen, setIsBulkWAModalOpen] = useState(false)
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
    // Raport Bulanan → navigate ke /raport
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
    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
    const [archivedStudents, setArchivedStudents] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [archivePage, setArchivePage] = useState(1)
    const archivePageSize = 10

    // NEW: Riwayat Kelas
    const [isClassHistoryModalOpen, setIsClassHistoryModalOpen] = useState(false)
    const [classHistory, setClassHistory] = useState([])
    const [loadingClassHistory, setLoadingClassHistory] = useState(false)

    // NEW: Quick Inline Add
    const [isInlineAddOpen, setIsInlineAddOpen] = useState(false)
    const [inlineForm, setInlineForm] = useState({ name: '', gender: 'L', class_id: '', phone: '' })
    const [submittingInline, setSubmittingInline] = useState(false)

    // NEW: Photo Storage upload progress
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // NEW: Class Breakdown Modal (Fitur 1)
    const [isClassBreakdownOpen, setIsClassBreakdownOpen] = useState(false)
    const [classBreakdownData, setClassBreakdownData] = useState(null)
    const [loadingBreakdown, setLoadingBreakdown] = useState(false)

    // NEW: Batch Reset Poin (Fitur 2)
    const [isResetPointsModalOpen, setIsResetPointsModalOpen] = useState(false)
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
    const [isTagModalOpen, setIsTagModalOpen] = useState(false)
    const [studentForTags, setStudentForTags] = useState(null)
    const [filterTag, setFilterTag] = useState('')
    const [allUsedTags, setAllUsedTags] = useState([]) // Array of unique strings
    const [newTagInput, setNewTagInput] = useState('')
    const [tagToEdit, setTagToEdit] = useState(null)
    const [renameInput, setRenameInput] = useState('')

    // Bulk Tagging Setup
    const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false)
    const [bulkTagAction, setBulkTagAction] = useState('add') // 'add' or 'remove'
    const [tagStats, setTagStats] = useState({}) // { tag: count }

    // Privacy Mode (SaaS Security)
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [timelineFilter, setTimelineFilter] = useState('all')
    const [timelineVisible, setTimelineVisible] = useState(8)
    const [profileTab, setProfileTab] = useState('info') // 'info' | 'statistik' | 'laporan' | 'raport'
    // ── Monthly raport history state
    const [raportHistory, setRaportHistory] = useState([])
    const [loadingRaport, setLoadingRaport] = useState(false)

    // Bulk Point Update (Fitur 14)
    const [isBulkPointModalOpen, setIsBulkPointModalOpen] = useState(false)
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
    const [isBulkPhotoModalOpen, setIsBulkPhotoModalOpen] = useState(false)
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
    const [waTemplate, setWaTemplate] = useState(`Assalamu'alaikum Wr. Wb.\n\nYth. Bapak/Ibu wali dari ananda {nama}. Kami sampaikan informasi terkini dari sistem *Laporanmu* — MBS Tanggul.\n\n*Data Akademik Ananda:*\n• Kelas : {kelas}\n• ID Reg : {kode}\n• Poin Perilaku : {poin} poin\n\n*Akses Portal Orang Tua:*\nPortal  : [URL]\nPIN     : {pin}\n\nGunakan ID Reg & PIN untuk memantau perkembangan putera/puteri Bapak/Ibu secara real-time.\n\nWassalamu'alaikum Wr. Wb.\n_MBS Tanggul · Sistem Laporanmu_`)

    // NEW: Import Google Sheets (Fitur 12)
    const [gSheetsUrl, setGSheetsUrl] = useState('')
    const [fetchingGSheets, setFetchingGSheets] = useState(false)
    const [isGSheetsModalOpen, setIsGSheetsModalOpen] = useState(false)

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

    // access.teacher_students — kalau off, guru hanya bisa lihat (read-only)
    const { enabled: teacherStudentsEnabled } = useFlag('access.teacher_students')
    const canEdit = teacherStudentsEnabled

    // =========================================
    // Pagination + Filter + Sort
    // =========================================
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [jumpPage, setJumpPage] = useState('')

    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [searchQuery])

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

    // FIX #5: Realtime — auto-refresh jika ada siswa ditambah/diubah/dihapus
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
    }, [totalPages])

    useEffect(() => {
        const handleKey = (e) => {
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
            const ctrl = e.ctrlKey || e.metaKey
            const anyModal = !!(isModalOpen || isArchivedModalOpen || isClassHistoryModalOpen || isBulkModalOpen ||
                isBulkDeleteModalOpen || isResetPointsModalOpen || isTagModalOpen || isGSheetsModalOpen ||
                isImportModalOpen || isExportModalOpen || isPrintModalOpen || isProfileModalOpen ||
                isBulkWAModalOpen || isClassBreakdownOpen || photoZoom)

            // ── Escape: priority cascade ───────────────────────────────────
            if (e.key === 'Escape') {
                if (isShortcutOpen) { setIsShortcutOpen(false); return }
                if (anyModal) return // biarkan modal handle sendiri
                if (showAdvancedFilter) { setShowAdvancedFilter(false); return }
                if (searchQuery) { setSearchQuery(''); return }
                if (selectedStudentIds.length > 0) { setSelectedStudentIds([]); return }
            }

            // ── Ctrl/Cmd shortcuts ─────────────────────────────────────────
            if (ctrl && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
                searchInputRef.current?.select()
                return
            }
            if (ctrl && e.key === 'a' && !isTyping) {
                e.preventDefault()
                if (selectedStudentIds.length === students.length && students.length > 0) {
                    setSelectedStudentIds([])
                } else {
                    setSelectedStudentIds(students.map(s => s.id))
                }
                return
            }
            if (ctrl && e.key === 'e' && !anyModal) {
                e.preventDefault()
                setIsExportModalOpen(true)
                return
            }
            if (ctrl && e.key === 'f') {
                e.preventDefault()
                setShowAdvancedFilter(v => !v)
                return
            }

            // ── Single-key shortcuts — hanya kalau tidak sedang ngetik ─────
            if (isTyping || anyModal) return

            if (e.key === 'n') { e.preventDefault(); handleAdd(); return }
            if (e.key === 'p') { e.preventDefault(); setIsPrivacyMode(v => !v); return }
            if (e.key === 'r') { e.preventDefault(); fetchData(); fetchStats(); return }
            if (e.key === 'x') { e.preventDefault(); resetAllFilters(); return }
            if (e.key === '?') { e.preventDefault(); setIsShortcutOpen(v => !v); return }
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [searchQuery, isModalOpen, isArchivedModalOpen, isClassHistoryModalOpen, isBulkModalOpen,
        isBulkDeleteModalOpen, isResetPointsModalOpen, isTagModalOpen, isGSheetsModalOpen,
        isImportModalOpen, isExportModalOpen, isPrintModalOpen, isProfileModalOpen,
        isBulkWAModalOpen, isClassBreakdownOpen, photoZoom,
        showAdvancedFilter, selectedStudentIds, students, isShortcutOpen])

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
        setIsDeleteModalOpen(true)
    }

    const executeDelete = useCallback(async () => {
        if (!studentToDelete) return
        setIsDeleteModalOpen(false)
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
            setIsBulkModalOpen(false)
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
            setIsBulkDeleteModalOpen(false)
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
        setIsClassHistoryModalOpen(true)
    }

    // NEW: Fitur 1 - Class Breakdown
    const handleClassBreakdown = async (classId, className) => {
        setLoadingBreakdown(true)
        setIsClassBreakdownOpen(true)
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
            setIsResetPointsModalOpen(false)
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
            addToast(`PIN baru: ${newPin} — berhasil diperbarui`, 'success')
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
                setIsBulkTagModalOpen(false)
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
            setIsBulkPointModalOpen(false)
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

    // ── Export Wizard: ambil data sesuai scope & kolom yang dipilih ──────────
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
            sourceData = students.filter(s => selectedStudentIds.includes(s.id))
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
            if (!res.ok) throw new Error('Gagal fetch sheet — pastikan sheet bersifat publik')
            const text = await res.text()
            const rows = await parseCSVFile(new Blob([text], { type: 'text/csv' }))
            if (!rows.length) throw new Error('Sheet kosong')
            await buildImportPreview(rows)
            setImportTab('preview')
            setIsGSheetsModalOpen(false)
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

    // ── Inline Edit Handler ────────────────────────────────────────────────
    const handleInlineUpdate = async (studentId, field, value, studentData) => {
        try {
            let payload = {}
            let toastMsg = ''

            if (field === 'name') {
                if (!value) return addToast('Nama tidak boleh kosong', 'error')
                payload = { name: value }
                toastMsg = `Nama diperbarui → "${value}"`
            } else if (field === 'gender') {
                payload = { gender: value }
                toastMsg = `Gender diperbarui → ${value === 'L' ? 'Putra' : 'Putri'}`
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

    // ── Pin Handler ────────────────────────────────────────────────────────
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

    // NEW: Upload foto ke Supabase Storage — return URL agar bisa dipakai oleh StudentFormModal
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
        setIsProfileModalOpen(true)
        // fetch AFTER modal opens — skeleton shows instantly
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

    // NEW: Bulk WA — kirim notifikasi ke semua wali terpilih
    const handleBulkWA = () => {
        const targets = students.filter(s => selectedStudentIds.includes(s.id) && s.phone)
        if (!targets.length) {
            addToast('Tidak ada siswa terpilih yang memiliki nomor WA', 'warning')
            return
        }
        setBroadcastResults({})
        setBroadcastIndex(-1)
        setIsBulkWAModalOpen(true)
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

    const handleBulkPrint = () => {
        const targets = students.filter(s => selectedStudentIds.includes(s.id))
        if (!targets.length) { addToast('Pilih siswa terlebih dahulu', 'warning'); return }
        generateStudentPDF(targets)
    }

    const handlePrintSingle = (student) => {
        if (!student) return
        generateStudentPDF([student], cardCaptureRef)
    }

    // ======================================================
    // Cetak Thermal 58mm — COMPACT, tanpa foto, hanya QR
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
        setIsBulkPhotoModalOpen(false)
        setBulkPhotoMatches([])
        setUploadingBulkPhotos(false)
        fetchStudents()
    }

    const handlePrintThermal = async (student) => {
        if (!student) return;
        setGeneratingPdf(true);
        addToast('Menyiapkan struk thermal...', 'info');
        try {
            const qrValue = `${window.location.origin}/check?code=${student.code}&pin=${student.pin}`;
            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            document.body.appendChild(qrContainer);
            const qrRoot = createRoot(qrContainer);
            await new Promise(resolve => {
                qrRoot.render(React.createElement(QRCodeCanvas, { value: qrValue, size: 220, level: 'H' }));
                setTimeout(resolve, 200);
            });
            const qrCanvas = qrContainer.querySelector('canvas');
            const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;
            qrRoot.unmount();
            document.body.removeChild(qrContainer);

            const dateStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
            const thermalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>KARTU_${student.name.toUpperCase().replace(/\s+/g, '_')}</title>
<style>
  @page { size: 58mm auto; margin: 2mm 2mm 4mm 2mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 54mm; font-family: 'Courier New', monospace; font-size: 7.5pt; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hdr { text-align: center; padding: 1.5mm 0; }
  .hdr .t { font-size: 10pt; font-weight: 900; letter-spacing: 0.4mm; }
  .hdr .s { font-size: 6pt; opacity: 0.6; margin-top: 0.5mm; }
  .div { border: none; border-top: 1px dashed #333; margin: 2mm 0; }
  .name { font-size: 9pt; font-weight: 900; text-align: center; text-transform: uppercase; letter-spacing: 0.3mm; word-break: break-word; padding: 1mm 0 0.3mm; }
  .kls { font-size: 7pt; text-align: center; text-transform: uppercase; opacity: 0.7; }
  .qr { text-align: center; padding: 2mm 0 1mm; }
  .qr img { width: 48mm; height: 48mm; display: block; margin: 0 auto; }
  .cap { font-size: 6pt; text-align: center; opacity: 0.5; margin-top: 1mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0.5mm 0.5mm; font-size: 7.5pt; vertical-align: top; }
  td.l { font-weight: bold; white-space: nowrap; width: 14mm; }
  td.s { width: 3mm; text-align: center; }
  .ftr { font-size: 5.5pt; text-align: center; opacity: 0.5; padding-top: 1mm; line-height: 1.6; }
</style></head><body>
  <div class="hdr"><div class="t">KARTU PELAJAR</div><div class="s">MBS TANGGUL &bull; LAPORANMU &bull; T.A. 2026/2027</div></div>
  <hr class="div">
  <div class="name">${student.name}</div>
  <div class="kls">${student.className || '-'}</div>
  <hr class="div">
  <div class="qr">
    ${qrDataUrl ? `<img src="${qrDataUrl}" />` : '<p style="opacity:0.4;font-size:6pt;">QR tidak tersedia</p>'}
    <div class="cap">Scan untuk akses portal orang tua</div>
  </div>
  <hr class="div">
  <table>
    <tr><td class="l">ID Reg</td><td class="s">:</td><td><b>${student.code || '-'}</b></td></tr>
    <tr><td class="l">PIN</td><td class="s">:</td><td><b>${student.pin || '-'}</b></td></tr>
    <tr><td class="l">NISN</td><td class="s">:</td><td>${student.nisn || '-'}</td></tr>
    <tr><td class="l">No. WA</td><td class="s">:</td><td>${student.phone || '-'}</td></tr>
  </table>
  <hr class="div">
  <div class="ftr">Diterbitkan: ${dateStr}<br>Laporanmu &bull; MBS Tanggul</div>
</body></html>`;

            const printWin = window.open('', '_blank', 'width=280,height=600,toolbar=0,menubar=0,scrollbars=1');
            if (!printWin) { addToast('Pop-up diblokir. Izinkan pop-up browser untuk fitur ini.', 'warning'); return; }
            printWin.document.open();
            printWin.document.write(thermalHtml);
            printWin.document.close();
            printWin.onload = () => setTimeout(() => { printWin.focus(); printWin.print(); }, 400);
            setTimeout(() => { if (printWin && !printWin.closed) { printWin.focus(); printWin.print(); } }, 900);
            addToast('Struk siap dicetak!', 'success');
        } catch (e) {
            console.error('Thermal print error:', e);
            addToast('Gagal menyiapkan cetak thermal', 'error');
        } finally { setGeneratingPdf(false); }
    }

    // ======================================================
    // Simpan kartu sebagai PNG (html2canvas offscreen)
    // ======================================================
    const handleSavePNG = async (student) => {
        if (!student) return;
        setGeneratingPdf(true);
        addToast('Menyiapkan gambar kartu...', 'info');
        try {
            let photoDataUrl = null;
            if (student.photo_url) photoDataUrl = await getBase64Image(student.photo_url);

            const qrValue = `${window.location.origin}/check?code=${student.code}&pin=${student.pin}`;
            const qrContainer = document.createElement('div');
            qrContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
            document.body.appendChild(qrContainer);
            const qrRoot = createRoot(qrContainer);
            await new Promise(resolve => {
                qrRoot.render(React.createElement(QRCodeCanvas, { value: qrValue, size: 200, level: 'H' }));
                setTimeout(resolve, 200);
            });
            const qrCanvas = qrContainer.querySelector('canvas');
            const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;
            qrRoot.unmount();
            document.body.removeChild(qrContainer);

            // Build offscreen kartu (sama seperti PDF tapi ukuran lebih besar)
            const offscreen = document.createElement('div');
            offscreen.style.cssText = 'position:fixed;top:-9999px;left:-9999px;display:flex;flex-direction:row;gap:10px;align-items:center;padding:8px;background:transparent;';
            const isFemale = student.gender === 'P' || (student.className || '').toLowerCase().includes('putri');
            const grad = isFemale ? 'linear-gradient(135deg,#b43c8c 0%,#7c1a5e 100%)' : 'linear-gradient(135deg,#4f46e5 0%,#3730a3 100%)';
            const frontCard = document.createElement('div');
            frontCard.style.cssText = `width:340px;height:213px;background:${grad};border-radius:18px;position:relative;overflow:hidden;box-shadow:0 20px 40px rgba(79,70,229,0.35);flex-shrink:0;font-family:system-ui,-apple-system,sans-serif;`;
            frontCard.innerHTML = `
              <div style="position:absolute;top:-40px;right:-40px;width:176px;height:176px;background:rgba(255,255,255,0.06);border-radius:50%;filter:blur(20px);"></div>
              <div style="position:absolute;top:12px;right:12px;display:flex;align-items:center;gap:6px;z-index:10;">
                <div style="width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.2);"><span style="font-weight:900;font-size:10px;color:white;">L</span></div>
                <span style="font-size:8px;font-weight:900;letter-spacing:0.2em;color:rgba(255,255,255,0.85);text-transform:uppercase;">LAPORANMU</span>
              </div>
              <div style="position:absolute;top:38px;left:16px;right:16px;bottom:28px;display:flex;gap:12px;z-index:10;">
                <div style="width:72px;height:90px;border-radius:10px;background:rgba(255,255,255,0.12);border:1.5px solid rgba(255,255,255,0.25);overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
                  ${photoDataUrl ? `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;"/>` : `<span style="font-size:30px;font-weight:900;color:rgba(255,255,255,0.4);">${(student.name || '?').charAt(0)}</span>`}
                </div>
                <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;padding:2px 0;">
                  <div>
                    <div style="font-size:13px;font-weight:900;color:white;text-transform:uppercase;line-height:1.2;margin-bottom:4px;word-break:break-word;">${student.name}</div>
                    <div style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:0.05em;">${student.className || '-'}</div>
                    <div style="font-size:6px;font-weight:700;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.18em;margin-top:2px;">MUHAMMADIYAH BOARDING SCHOOL</div>
                  </div>
                  <div style="padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
                    <div style="font-size:5px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.2em;margin-bottom:3px;">NOMOR REGISTRASI</div>
                    <div style="font-size:11px;font-weight:700;color:#c7d2fe;font-family:monospace;letter-spacing:0.08em;">${student.code || '-'}</div>
                  </div>
                </div>
              </div>
              <div style="position:absolute;bottom:8px;left:16px;right:16px;display:flex;justify-content:space-between;align-items:center;opacity:0.22;">
                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.3em;">KARTU PELAJAR</span>
                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.2em;">2026/2027</span>
              </div>`;
            const backCard = document.createElement('div');
            backCard.style.cssText = 'width:340px;height:213px;background:white;border-radius:18px;border:1px solid #e5e7eb;box-shadow:0 4px 20px rgba(0,0,0,0.08);display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;flex-shrink:0;font-family:system-ui,-apple-system,sans-serif;';
            backCard.innerHTML = `
              <div style="padding:8px;background:white;border-radius:10px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:10px;">
                ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:80px;height:80px;display:block;"/>` : '<div style="width:80px;height:80px;background:#f3f4f6;border-radius:4px;"></div>'}
              </div>
              <div style="font-size:8px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;text-align:center;">AKSES PORTAL ORANG TUA</div>
              <div style="font-size:6px;font-weight:600;color:#9ca3af;text-align:center;line-height:1.5;max-width:180px;">Silakan scan kode di atas untuk<br/>mengecek perkembangan siswa</div>
              <div style="position:absolute;bottom:10px;left:0;right:0;display:flex;justify-content:space-between;padding:0 16px;opacity:0.2;">
                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">TAHUN 2026/2027</span>
                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">MBS TANGGUL</span>
              </div>`;
            offscreen.appendChild(frontCard);
            offscreen.appendChild(backCard);
            document.body.appendChild(offscreen);

            const canvas = await html2canvas(offscreen, { scale: 3, useCORS: true, allowTaint: false, backgroundColor: null, logging: false });
            document.body.removeChild(offscreen);

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `KARTU_${student.name.toUpperCase().replace(/\s+/g, '_')}.png`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                addToast('Kartu berhasil disimpan sebagai PNG!', 'success');
            }, 'image/png');
        } catch (e) {
            console.error('PNG export error:', e);
            addToast('Gagal menyimpan kartu sebagai gambar', 'error');
        } finally { setGeneratingPdf(false); }
    }


    const getBase64Image = (url) => {
        return new Promise((resolve) => {
            if (!url) return resolve(null);
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });
    };

    /**
     * Capture elemen kartu dari DOM menggunakan html2canvas,
     * lalu embed hasilnya ke PDF — kartu di PDF identik dengan preview modal.
     *
     * @param {Array}  targets     - array siswa yang akan dicetak
     * @param {Object} captureRef  - React ref ke elemen #card-capture-target di modal
     */
    const generateStudentPDF = async (targets, captureRef = null) => {
        setGeneratingPdf(true);
        addToast('Menyiapkan dokumen resmi...', 'info');
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

            // (tidak ada kop surat)

            const pageWidth = 210;
            const margin = 20;

            for (let i = 0; i < targets.length; i++) {
                const s = targets[i];
                if (i > 0) doc.addPage();

                // ════════════════════════════════════════════
                // WARNA AKSEN — berdasarkan gender siswa
                // Putra/L = biru indigo | Putri/P = mauve/rose
                // ════════════════════════════════════════════
                const isFemale = s.gender === 'P' || s.gender === 'Perempuan' ||
                    (s.className || '').toLowerCase().includes('putri');
                const accentR = isFemale ? 180 : 67;
                const accentG = isFemale ? 60 : 56;
                const accentB = isFemale ? 140 : 202;
                // helper set accent color
                const setAccent = () => doc.setTextColor(accentR, accentG, accentB);
                const setAccentDraw = () => doc.setDrawColor(accentR, accentG, accentB);
                const setAccentFill = () => doc.setFillColor(accentR, accentG, accentB);

                // ════════════════════════════════════════════
                // WATERMARK — teks diagonal samar di tengah halaman
                // ════════════════════════════════════════════
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.045 }));
                doc.setFontSize(38);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(accentR, accentG, accentB);
                // Rotasi 45° dari tengah halaman
                const wmCX = pageWidth / 2;
                const wmCY = 148; // tengah A4
                for (let wy = 60; wy < 260; wy += 55) {
                    for (let wx = 30; wx < 200; wx += 80) {
                        doc.text('RESMI', wx, wy, { angle: 45 });
                    }
                }
                doc.restoreGraphicsState();

                // ════════════════════════════════════════════
                // 1. JUDUL & TEKS PENGANTAR
                // ════════════════════════════════════════════
                const kopCenterX = pageWidth / 2;
                const garisBawahY = 0;
                const judulY = 16;

                doc.setTextColor(0, 0, 0);
                doc.setFontSize(13);
                doc.setFont('times', 'bold');
                doc.text('INFORMASI AKSES DIGITAL & KARTU PELAJAR', kopCenterX, judulY, { align: 'center' });

                // Garis dekoratif bawah judul — pakai warna aksen gender
                setAccentDraw();
                doc.setLineWidth(0.6);
                doc.line(kopCenterX - 52, judulY + 2.5, kopCenterX + 52, judulY + 2.5);

                // Teks pengantar — 2 kalimat ringkas
                doc.setFontSize(9);
                doc.setFont('times', 'normal');
                doc.setTextColor(50, 50, 50);
                const introText = `Yth. Orang Tua/Wali dari Ananda ${s.name}, dengan hormat kami sampaikan informasi akses digital dan kartu pelajar resmi yang diterbitkan oleh sistem Laporanmu. Dokumen ini memuat data akses portal pemantauan perkembangan akademik serta perilaku putera/puteri Bapak/Ibu — harap simpan dengan baik dan segera hubungi sekolah apabila terdapat kendala.`;
                const splitIntro = doc.splitTextToSize(introText, pageWidth - margin * 2);
                doc.text(splitIntro, margin, judulY + 12);

                // ════════════════════════════════════════════
                // 2. INFO SISWA — strip biru tipis di bawah intro
                // ════════════════════════════════════════════
                const infoY = judulY + 12 + (splitIntro.length * 4.5) + 5;

                doc.setFillColor(245, 246, 255);
                doc.setDrawColor(210, 214, 245);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, infoY, pageWidth - margin * 2, 18, 3, 3, 'FD');

                // Garis aksen kiri — warna gender
                setAccentFill();
                doc.rect(margin, infoY, 2.5, 18, 'F');

                const infoColW = (pageWidth - margin * 2 - 2.5) / 3;
                const infoCols = [
                    { label: 'NAMA SISWA', val: s.name },
                    { label: 'KELAS', val: s.className || '-' },
                    { label: 'NISN', val: s.nisn || '-' },
                ];
                infoCols.forEach(({ label, val }, idx) => {
                    const cx = margin + 2.5 + infoColW * idx + infoColW / 2;
                    doc.setFontSize(6);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(120, 120, 140);
                    doc.text(label, cx, infoY + 6, { align: 'center' });
                    doc.setFontSize(8.5);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(20, 20, 50);
                    doc.text(String(val), cx, infoY + 13, { align: 'center' });
                });

                // ════════════════════════════════════════════
                // 3. KARTU DIGITAL
                // ════════════════════════════════════════════
                const cardAreaY = infoY + 20;
                let cardAreaH = 55;

                if (targets.length === 1) {
                    try {
                        // Ambil foto siswa sebagai dataURL dulu (agar tidak CORS issue saat render)
                        let photoDataUrl = null;
                        if (s.photo_url) {
                            photoDataUrl = await getBase64Image(s.photo_url);
                        }

                        const qrValue = `${window.location.origin}/check?code=${s.code}&pin=${s.pin}`;

                        // ── Buat kontainer offscreen (di luar viewport) ──────────────
                        const offscreen = document.createElement('div');
                        offscreen.style.cssText = `
                            position: fixed;
                            top: -9999px; left: -9999px;
                            display: flex; flex-direction: row; gap: 10px;
                            align-items: center;
                            background: transparent;
                            padding: 8px;
                        `;

                        // ── FRONT CARD (inline styles, no Tailwind) ──────────────────
                        const frontCard = document.createElement('div');
                        frontCard.style.cssText = `
                            width: 300px; height: 188px;
                            background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
                            border-radius: 16px;
                            position: relative;
                            overflow: hidden;
                            box-shadow: 0 20px 40px rgba(79,70,229,0.35);
                            flex-shrink: 0;
                            font-family: system-ui, -apple-system, sans-serif;
                        `;
                        frontCard.innerHTML = `
                            <!-- dekorasi lingkaran blur -->
                            <div style="
                                position:absolute; top:-40px; right:-40px;
                                width:176px; height:176px;
                                background:rgba(255,255,255,0.06);
                                border-radius:50%; filter:blur(20px);
                            "></div>
                            <!-- badge LAPORANMU -->
                            <div style="
                                position:absolute; top:12px; right:12px;
                                display:flex; align-items:center; gap:6px; z-index:10;
                            ">
                                <div style="
                                    width:22px; height:22px; border-radius:6px;
                                    background:rgba(255,255,255,0.15);
                                    display:flex; align-items:center; justify-content:center;
                                    border:1px solid rgba(255,255,255,0.2);
                                ">
                                    <span style="font-weight:900; font-size:9px; color:white;">L</span>
                                </div>
                                <span style="font-size:8px; font-weight:900; letter-spacing:0.2em; color:rgba(255,255,255,0.85); text-transform:uppercase;">LAPORANMU</span>
                            </div>
                            <!-- isi kartu -->
                            <div style="
                                position:absolute; top:36px; left:16px; right:16px; bottom:28px;
                                display:flex; gap:12px; z-index:10;
                            ">
                                <!-- foto -->
                                <div style="
                                    width:66px; height:82px; border-radius:10px;
                                    background:rgba(255,255,255,0.12);
                                    border:1.5px solid rgba(255,255,255,0.25);
                                    overflow:hidden; flex-shrink:0;
                                    display:flex; align-items:center; justify-content:center;
                                ">
                                    ${photoDataUrl
                                ? `<img src="${photoDataUrl}" style="width:100%;height:100%;object-fit:cover;" />`
                                : `<span style="font-size:28px;font-weight:900;color:rgba(255,255,255,0.4);">${(s.name || '?').charAt(0)}</span>`
                            }
                                </div>
                                <!-- teks -->
                                <div style="flex:1; min-width:0; display:flex; flex-direction:column; justify-content:space-between; padding:2px 0;">
                                    <div>
                                        <div style="font-size:12px; font-weight:900; color:white; text-transform:uppercase; line-height:1.2; margin-bottom:4px; word-break:break-word;">
                                            ${s.name}
                                        </div>
                                        <div style="font-size:8px; font-weight:700; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:0.05em;">
                                            ${s.className || '-'}
                                        </div>
                                        <div style="font-size:6px; font-weight:700; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.18em; margin-top:2px;">
                                            MUHAMMADIYAH BOARDING SCHOOL
                                        </div>
                                    </div>
                                    <div style="padding-top:8px; border-top:1px solid rgba(255,255,255,0.12);">
                                        <div style="font-size:5px; font-weight:700; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.2em; margin-bottom:3px;">
                                            NOMOR REGISTRASI
                                        </div>
                                        <div style="font-size:10px; font-weight:700; color:#c7d2fe; font-family:monospace; letter-spacing:0.08em;">
                                            ${s.code || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <!-- footer -->
                            <div style="
                                position:absolute; bottom:8px; left:16px; right:16px;
                                display:flex; justify-content:space-between; align-items:center;
                                opacity:0.22;
                            ">
                                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.3em;">KARTU PELAJAR</span>
                                <span style="font-size:6px;font-weight:900;color:white;text-transform:uppercase;letter-spacing:0.2em;">2026/2027</span>
                            </div>
                        `;

                        // ── BACK CARD (QR) ───────────────────────────────────────────
                        const backCard = document.createElement('div');
                        backCard.style.cssText = `
                            width: 300px; height: 188px;
                            background: white;
                            border-radius: 16px;
                            border: 1px solid #e5e7eb;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                            display: flex; flex-direction: column;
                            align-items: center; justify-content: center;
                            position: relative;
                            flex-shrink: 0;
                            font-family: system-ui, -apple-system, sans-serif;
                        `;

                        // Render QR ke canvas dulu, lalu embed sebagai <img>
                        const qrContainer = document.createElement('div');
                        qrContainer.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
                        document.body.appendChild(qrContainer);

                        // Pakai QRCodeCanvas yang sudah ter-import
                        const qrRoot = createRoot(qrContainer);
                        await new Promise(resolve => {
                            qrRoot.render(
                                <QRCodeCanvas
                                    value={qrValue}
                                    size={200}
                                    level="H"
                                    id="__qr_offscreen__"
                                />
                            );
                            setTimeout(resolve, 150); // tunggu render selesai
                        });
                        const qrCanvas = qrContainer.querySelector('canvas');
                        const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;
                        qrRoot.unmount();
                        document.body.removeChild(qrContainer);

                        backCard.innerHTML = `
                            <div style="
                                padding:8px; background:white;
                                border-radius:10px; border:1px solid #e5e7eb;
                                box-shadow:0 2px 8px rgba(0,0,0,0.06); margin-bottom:10px;
                            ">
                                ${qrDataUrl
                                ? `<img src="${qrDataUrl}" style="width:70px;height:70px;display:block;" />`
                                : `<div style="width:70px;height:70px;background:#f3f4f6;border-radius:4px;"></div>`
                            }
                            </div>
                            <div style="font-size:8px;font-weight:900;color:#1e1b4b;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:4px;text-align:center;">
                                AKSES PORTAL ORANG TUA
                            </div>
                            <div style="font-size:6px;font-weight:600;color:#9ca3af;text-align:center;line-height:1.5;max-width:180px;">
                                Silakan scan kode di atas untuk<br/>mengecek perkembangan siswa
                            </div>
                            <div style="
                                position:absolute; bottom:10px; left:0; right:0;
                                display:flex; justify-content:space-between;
                                padding:0 16px; opacity:0.2;
                            ">
                                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">TAHUN 2026/2027</span>
                                <span style="font-size:5px;font-weight:900;text-transform:uppercase;letter-spacing:0.25em;">MBS TANGGUL</span>
                            </div>
                        `;

                        offscreen.appendChild(frontCard);
                        offscreen.appendChild(backCard);
                        document.body.appendChild(offscreen);

                        // ── Capture dengan html2canvas ───────────────────────────────
                        const canvas = await html2canvas(offscreen, {
                            scale: 3,
                            useCORS: true,
                            allowTaint: false,
                            backgroundColor: null,
                            logging: false,
                        });

                        document.body.removeChild(offscreen);

                        const imgData = canvas.toDataURL('image/png');
                        const maxCardW = pageWidth - margin * 2;
                        const ratio = canvas.height / canvas.width;
                        const cardImgW = maxCardW;
                        const cardImgH = maxCardW * ratio;
                        const cardImgX = (pageWidth - cardImgW) / 2;

                        doc.addImage(imgData, 'PNG', cardImgX, cardAreaY, cardImgW, cardImgH);
                        cardAreaH = cardImgH;
                    } catch (captureErr) {
                        console.warn('Capture kartu gagal, fallback ke jsPDF manual:', captureErr);
                        cardAreaH = await drawCardsFallback(doc, s, margin, pageWidth, cardAreaY);
                    }
                } else {
                    // Bulk print → pakai fallback
                    cardAreaH = await drawCardsFallback(doc, s, margin, pageWidth, cardAreaY);
                }

                // ════════════════════════════════════════════
                // 4. KOTAK DETAIL AKSES + INFO TAMBAHAN
                // ════════════════════════════════════════════
                const detailY = cardAreaY + cardAreaH + 5;
                const detailH = 58;

                doc.setFillColor(248, 249, 252);
                doc.setDrawColor(220, 225, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, detailY, pageWidth - margin * 2, detailH, 4, 4, 'FD');

                // Header kiri: DETAIL DATA AKSES
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text('DETAIL DATA AKSES', margin + 6, detailY + 10);

                // Header kanan: PETUNJUK — geser ke tengah kotak
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text('PETUNJUK', margin + 90, detailY + 10);

                // Garis pemisah internal
                doc.setDrawColor(215, 220, 240);
                doc.setLineWidth(0.3);
                doc.line(margin + 6, detailY + 13, pageWidth - margin - 6, detailY + 13);
                // Garis vertikal pemisah — di tengah kotak (170mm / 2 = 85mm)
                doc.line(margin + 85, detailY + 13, margin + 85, detailY + detailH - 6);

                // Data kiri — 5 baris
                const rows = [
                    ['ID Registrasi', s.code || '-'],
                    ['PIN Akses', s.pin || '-'],
                    ['Tahun Ajaran', s.academic_year || '2026/2027'],
                    ['Status', s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Aktif'],
                    ['Portal', `${window.location.origin}/check`],
                ];
                rows.forEach(([label, val], idx) => {
                    const rowY = detailY + 20 + idx * 8;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(130, 130, 150);
                    doc.text(label, margin + 6, rowY);

                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(label === 'Portal' ? 7 : 8.5);
                    doc.setTextColor(20, 20, 50);
                    doc.text(String(val), margin + 38, rowY);
                });

                // Petunjuk kanan — 4 tips (mulai dari center divider + padding)
                const tips = [
                    '1. Simpan dokumen ini dengan baik.',
                    '2. Akses portal melalui URL di kolom kiri.',
                    '3. Masukkan PIN apabila diminta sistem.',
                    '4. Hubungi sekolah jika ada kendala akses.',
                ];
                tips.forEach((tip, idx) => {
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7.5);
                    doc.setTextColor(70, 70, 90);
                    doc.text(tip, margin + 90, detailY + 20 + idx * 8);
                });

                // ════════════════════════════════════════════
                // 5. INFO WALI MURID (selalu tampil)
                // ════════════════════════════════════════════
                const waliY = detailY + detailH + 4;
                const waliBoxH = 26;

                doc.setFillColor(250, 250, 255);
                doc.setDrawColor(220, 225, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(margin, waliY, pageWidth - margin * 2, waliBoxH, 3, 3, 'FD');

                // Judul section
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                setAccent();
                doc.text('DATA WALI MURID', margin + 6, waliY + 8);

                // Garis bawah judul
                doc.setDrawColor(215, 220, 240);
                doc.setLineWidth(0.3);
                doc.line(margin + 6, waliY + 11, pageWidth - margin - 6, waliY + 11);

                // 3 kolom rata tengah: Nama Wali | Hubungan | No. Handphone
                const waliCols = [
                    { label: 'Nama Wali', val: s.guardian_name || '-' },
                    { label: 'Hubungan', val: s.guardian_relation || '-' },
                    { label: 'No. Handphone', val: s.phone || '-' },
                ];
                const waliColW = (pageWidth - margin * 2) / 3;
                waliCols.forEach(({ label, val }, idx) => {
                    const wx = margin + waliColW * idx + waliColW / 2;
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(130, 130, 150);
                    doc.text(label, wx, waliY + 17, { align: 'center' });
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(20, 20, 50);
                    doc.text(String(val), wx, waliY + 23, { align: 'center' });
                });

                // ════════════════════════════════════════════
                // 6. FOOTER & TANDA TANGAN
                // ════════════════════════════════════════════
                const signBaseY = waliY + waliBoxH + 6;
                const signY = Math.max(signBaseY, 225);

                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(40, 40, 40);
                const dateStr = 'Jember, ' + new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date());
                doc.text(dateStr, pageWidth - margin - 55, signY);
                doc.text('Admin Laporanmu', pageWidth - margin - 55, signY + 22);

                // Garis tanda tangan
                doc.setDrawColor(100, 100, 100);
                doc.setLineWidth(0.3);
                doc.line(pageWidth - margin - 55, signY + 18, pageWidth - margin, signY + 18);

                // Catatan kecil di kiri (sejajar ttd)
                doc.setFontSize(7);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(150, 150, 150);
                doc.text('* Dokumen ini diterbitkan secara digital oleh sistem Laporanmu.', margin, signY + 5);
                doc.text('  Harap simpan dokumen ini dengan baik dan jangan disebarluaskan.', margin, signY + 10);

                // Footer bawah halaman
                doc.setDrawColor(220, 220, 230);
                doc.setLineWidth(0.2);
                doc.line(margin, 283, pageWidth - margin, 283);

                doc.setFontSize(6.5);
                doc.setTextColor(180, 180, 180);
                const docSerial = `DOC-${s.code}-${Date.now().toString(36).toUpperCase()}`;
                doc.text(`No. Seri: ${docSerial}`, margin, 287);
                doc.text('Dokumen Digital Otomatis · MBS Tanggul · Laporanmu', pageWidth / 2, 287, { align: 'center' });
            }

            doc.save(`SURAT_AKSES_${targets.length > 1 ? 'BULK' : targets[0].name.toUpperCase().replace(/\s+/g, '_')}.pdf`);
            addToast('Dokumen berhasil dibuat!', 'success');
        } catch (e) {
            console.error(e);
            addToast('Gagal membuat dokumen PDF', 'error');
        } finally {
            setGeneratingPdf(false);
        }
    };

    /**
     * Fallback: gambar kartu manual dengan jsPDF (dipakai saat bulk print
     * atau ketika elemen DOM tidak tersedia / html2canvas gagal).
     * Mengembalikan tinggi area kartu (mm) agar layout di bawahnya bisa menyesuaikan.
     */
    const drawCardsFallback = async (doc, s, margin, pageWidth, cardY) => {
        const cardW = 82;
        const cardH = 52;
        const cardGap = 6;
        const startX = (pageWidth - (cardW * 2 + cardGap)) / 2;

        // ── Front Card ────────────────────────────────────────────────
        // Gradient simulasi: dua rect warna indigo bertumpuk
        doc.setFillColor(67, 56, 202);
        doc.roundedRect(startX, cardY, cardW, cardH, 3, 3, 'F');
        doc.setFillColor(55, 48, 163);
        doc.roundedRect(startX, cardY + cardH * 0.55, cardW, cardH * 0.45, 0, 3, 'F');

        // Dekorasi lingkaran blur (simulasi)
        doc.setFillColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.04 }));
        doc.circle(startX + cardW - 5, cardY + 5, 22, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));

        // Badge "LAPORANMU" kanan atas
        doc.setFillColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.12 }));
        doc.roundedRect(startX + cardW - 30, cardY + 3, 28, 7, 1.5, 1.5, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'bold');
        doc.text('LAPORANMU', startX + cardW - 16, cardY + 7.8, { align: 'center' });

        // Foto siswa
        doc.setFillColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.15 }));
        doc.roundedRect(startX + 5, cardY + 10, 18, 22, 2, 2, 'F');
        doc.setGState(doc.GState({ opacity: 1 }));

        if (s.photo_url) {
            try {
                const sPhoto = await getBase64Image(s.photo_url);
                if (sPhoto) doc.addImage(sPhoto, 'JPEG', startX + 6, cardY + 11, 16, 20);
            } catch (_) { }
        } else {
            // Placeholder inisial
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text((s.name || '?').charAt(0), startX + 14, cardY + 24, { align: 'center' });
        }

        // Nama & kelas
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        const nameLines = doc.splitTextToSize(s.name.toUpperCase(), 50);
        doc.text(nameLines, startX + 28, cardY + 16);

        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(s.className || '-', startX + 28, cardY + 16 + nameLines.length * 4.5);

        doc.setFontSize(5);
        doc.setTextColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.5 }));
        doc.text('MUHAMMADIYAH BOARDING SCHOOL', startX + 28, cardY + 16 + nameLines.length * 4.5 + 4);
        doc.setGState(doc.GState({ opacity: 1 }));

        // Garis pemisah
        doc.setDrawColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.15 }));
        doc.setLineWidth(0.2);
        doc.line(startX + 28, cardY + 34, startX + cardW - 4, cardY + 34);
        doc.setGState(doc.GState({ opacity: 1 }));

        // Nomor registrasi
        doc.setTextColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.5 }));
        doc.setFontSize(4);
        doc.setFont('helvetica', 'normal');
        doc.text('NOMOR REGISTRASI', startX + 28, cardY + 38);
        doc.setGState(doc.GState({ opacity: 1 }));

        doc.setFontSize(8.5);
        doc.setFont('courier', 'bold');
        doc.setTextColor(199, 210, 254);
        doc.text(s.code || '-', startX + 28, cardY + 43);

        // Footer kartu depan
        doc.setFontSize(4.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.setGState(doc.GState({ opacity: 0.25 }));
        doc.text('KARTU PELAJAR', startX + 5, cardY + cardH - 3);
        doc.text('2026/2027', startX + cardW - 5, cardY + cardH - 3, { align: 'right' });
        doc.setGState(doc.GState({ opacity: 1 }));

        // ── Back Card ─────────────────────────────────────────────────
        const backX = startX + cardW + cardGap;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(230, 230, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(backX, cardY, cardW, cardH, 3, 3, 'FD');

        // Fetch QR dari API eksternal (fallback, pakai URL)
        const qrVal = `${window.location.origin}/check?code=${s.code}&pin=${s.pin}`;
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=2&data=${encodeURIComponent(qrVal)}`;
        try {
            const qrImg = await getBase64Image(qrSrc);
            if (qrImg) {
                // Frame putih QR
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(230, 230, 230);
                doc.roundedRect(backX + cardW / 2 - 14, cardY + 7, 28, 28, 1.5, 1.5, 'FD');
                doc.addImage(qrImg, 'PNG', backX + cardW / 2 - 13, cardY + 8, 26, 26);
            }
        } catch (_) { }

        doc.setTextColor(55, 48, 163);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('AKSES PORTAL ORANG TUA', backX + cardW / 2, cardY + 40, { align: 'center' });

        doc.setTextColor(160, 160, 160);
        doc.setFontSize(5);
        doc.setFont('helvetica', 'normal');
        doc.text('Scan kode di atas untuk memantau perkembangan siswa', backX + cardW / 2, cardY + 44.5, { align: 'center' });

        doc.setFontSize(4.5);
        doc.setTextColor(200, 200, 210);
        doc.text('TAHUN 2026/2027', backX + 5, cardY + cardH - 3);
        doc.text('MBS TANGGUL', backX + cardW - 5, cardY + cardH - 3, { align: 'right' });

        return cardH; // kembalikan tinggi kartu
    };

    // NEW: Download template import xlsx
    const handleDownloadTemplate = () => {
        const templateData = [
            { name: 'Contoh: Ahmad Rizki', gender: 'L', phone: '081234567890', class_name: 'XII IPA 1', nisn: '1234567890', guardian_name: 'Budi Rizki' },
            { name: 'Contoh: Siti Aminah', gender: 'P', phone: '081234567891', class_name: 'XI IPS 2', nisn: '0987654321', guardian_name: 'Aminah' },
        ]
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

    // Helper: format relative date
    const formatRelativeDate = (isoString) => {
        if (!isoString) return null
        const d = new Date(isoString)
        const now = new Date()
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Hari ini'
        if (diffDays === 1) return 'Kemarin'
        if (diffDays < 7) return `${diffDays} hari lalu`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} bln lalu`
        return `${Math.floor(diffDays / 365)} thn lalu`
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
        localStorage.removeItem('students_filters') // ← tambahkan ini
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
            // Already open (e.g. "Ganti File" button inside modal) — open picker directly
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

    const isAnyModalOpen = useMemo(() => !!(
        isModalOpen || isArchivedModalOpen || isClassHistoryModalOpen || isBulkModalOpen ||
        isBulkDeleteModalOpen || isResetPointsModalOpen || isTagModalOpen || isGSheetsModalOpen ||
        isImportModalOpen || isExportModalOpen || isPrintModalOpen || isProfileModalOpen ||
        isBulkWAModalOpen || isClassBreakdownOpen || photoZoom
    ), [isModalOpen, isArchivedModalOpen, isClassHistoryModalOpen, isBulkModalOpen,
        isBulkDeleteModalOpen, isResetPointsModalOpen, isTagModalOpen, isGSheetsModalOpen,
        isImportModalOpen, isExportModalOpen, isPrintModalOpen, isProfileModalOpen,
        isBulkWAModalOpen, isClassBreakdownOpen, photoZoom])

    // Memoized timeline computation — only recalculate when data or filter changes
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
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor</div>
                        <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                    </div>
                )}

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit data siswa dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                            Kelola {globalStats.total} data siswa aktif dalam sistem laporan.
                        </p>
                    </div>

                    <div className="flex gap-2 items-center">
                        {/* Tombol aksi sekunder — bottom sheet di mobile, dropdown di desktop */}
                        <div className="relative" ref={headerMenuRef}>
                            <button
                                onClick={() => setIsHeaderMenuOpen(v => !v)}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${(isHeaderMenuOpen) ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Aksi lainnya"
                            >
                                <FontAwesomeIcon icon={faSliders} />
                            </button>

                            {/* Dropdown — desktop only */}
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
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsGSheetsModalOpen(true) }}
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
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsBulkPhotoModalOpen(true) }}
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
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">نتيجة الشخصية</p>
                                        </div>
                                    </button>

                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>

                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchivedStudents(); setIsArchivedModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Siswa</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">arsip</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setResetPointsClassId(''); setIsResetPointsModalOpen(true) }}
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

                {/* ── INSIGHT ROW ─────────────────────────────────────────────── */}
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
                                        Tren {globalStats.avgPointsLastWeek >= 0 ? '▲' : '▼'} {globalStats.avgPointsLastWeek > 0 ? '+' : ''}{globalStats.avgPointsLastWeek} / siswa
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
                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Top Performer · +{globalStats.topPerformer.points}</p>
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
                {/* ── END INSIGHT ROW ──────────────────────────────────────────── */}

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

                                            {/* COLUMN TOGGLE BUTTON — di dalam header Aksi */}
                                            <th className="px-6 py-4 text-center pr-6 relative">
                                                <div className="flex items-center justify-center">
                                                    {visibleColumns.aksi && <span>Aksi</span>}
                                                </div>

                                                {/* Toggle Button — absolute kanan, seperti checkbox di kiri */}
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

                                                    {/* Dropdown Menu — Portal agar tidak ter-clip oleh overflow tabel */}
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
                                                selectedIds={selectedStudentIds}
                                                lastReportMap={lastReportMap}
                                                isPrivacyMode={isPrivacyMode}
                                                onEdit={handleEdit}
                                                onViewProfile={handleViewProfile}
                                                onViewQR={handleViewQR}
                                                onViewPrint={handleViewPrint}
                                                onViewTags={(s) => { setStudentForTags(s); setIsTagModalOpen(true) }}
                                                onViewClassHistory={handleViewClassHistory}
                                                onConfirmDelete={confirmDelete}
                                                onClassBreakdown={handleClassBreakdown}
                                                onPhotoZoom={setPhotoZoom}
                                                onToggleSelect={toggleSelectStudent}
                                                x={handleQuickPoint}
                                                onInlineUpdate={handleInlineUpdate}
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
                            <div className="md:hidden divide-y divide-[var(--color-border)]">
                                {students.length === 0 ? (
                                    <div className="py-20 flex flex-col items-center text-center gap-3">
                                        <FontAwesomeIcon icon={faTableList} className="text-4xl text-[var(--color-text-muted)] opacity-20" />
                                        <div className="text-sm font-extrabold text-[var(--color-text)]">Tidak ada data ditemukan</div>
                                        <button onClick={resetAllFilters} className="mt-2 h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)]">Reset Filter</button>
                                    </div>
                                ) : (
                                    students.map(student => (
                                        <StudentMobileCard
                                            key={student.id}
                                            student={student}
                                            selectedIds={selectedStudentIds}
                                            onToggleSelect={toggleSelectStudent}
                                            onViewProfile={handleViewProfile}
                                            onEdit={handleEdit}
                                            onConfirmDelete={confirmDelete}
                                            onTogglePin={handleTogglePin}
                                            onQuickPoint={handleQuickPoint}
                                            isPrivacyMode={isPrivacyMode}
                                            RiskThreshold={RiskThreshold}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Quick Add trigger */}
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
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}–{toRow} dari {totalRows} siswa</p>
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
                            )}
                        </div>
                    </>
                )}

                {/* ===================== */}
                {/* IMPORT MODAL */}
                {/* ===================== */}
                {isImportModalOpen && (
                    <Modal
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
                        title="Import Siswa"
                        size="md"
                    >
                        {/* ── STATUS BAR — hanya muncul setelah file dipilih & di Step 2 ── */}
                        {importStep === 2 && importPreview.length > 0 && (
                            <div className="flex items-center gap-2 -mt-1 mb-4 flex-wrap">
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-600 dark:text-indigo-400 truncate max-w-[200px]">
                                    <FontAwesomeIcon icon={faFileLines} className="text-[10px] shrink-0" />
                                    {importFileName}
                                </span>
                                <span className="px-2.5 py-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)]">
                                    {importPreview.length} baris
                                </span>
                                {importDuplicates.length > 0 && (
                                    <span className="px-2.5 py-1 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[10px] font-black text-violet-600">
                                        {importDuplicates.length} duplikat
                                    </span>
                                )}
                                <button
                                    onClick={() => importFileInputRef.current?.click()}
                                    className="ml-auto shrink-0 px-2.5 py-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-border)]/50 hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <FontAwesomeIcon icon={faArrowRightArrowLeft} className="text-[8px]" />
                                    Ganti File
                                </button>
                            </div>
                        )}

                        {/* ── STEPPER HEADER ── */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            {[
                                { step: 1, label: 'Upload', icon: faUpload, desc: 'Pilih File' },
                                { step: 2, label: 'Mapping', icon: faArrowRightArrowLeft, desc: 'Atur Kolom' },
                                { step: 3, label: 'Review', icon: faTableList, desc: 'Validasi' },
                            ].map(s => (
                                <React.Fragment key={s.step}>
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black transition-all ${importStep >= s.step ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]'}`}>
                                            {importStep > s.step ? <FontAwesomeIcon icon={faCheck} /> : s.step}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${importStep >= s.step ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] opacity-50'}`}>{s.label}</span>
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-40 uppercase tracking-tighter mt-0.5">{s.desc}</span>
                                        </div>
                                    </div>
                                    {s.step < 3 && <div className={`w-8 h-0.5 rounded-full transition-all ${importStep > s.step ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)] opacity-30'}`} />}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* ── STEP 1: PANDUAN & UPLOAD ── */}
                        {importStep === 1 && (
                            <div className="space-y-2.5">
                                {/* Drop zone */}
                                <div
                                    onDragOver={e => { e.preventDefault(); setImportDragOver(true) }}
                                    onDragLeave={() => setImportDragOver(false)}
                                    onDrop={async e => {
                                        e.preventDefault()
                                        setImportDragOver(false)
                                        const file = e.dataTransfer.files?.[0]
                                        if (file) await processImportFile(file)
                                    }}
                                    onClick={() => importFileInputRef.current?.click()}
                                    className={`w-full h-16 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-3 transition-all
                                    ${importDragOver
                                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 scale-[1.01]'
                                            : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/4 hover:border-[var(--color-primary)]/60 hover:bg-[var(--color-primary)]/8'}`}
                                >
                                    <FontAwesomeIcon icon={faUpload} className={`text-base transition-all ${importDragOver ? 'text-[var(--color-primary)] scale-110' : 'text-[var(--color-primary)]/60'}`} />
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-[var(--color-primary)] uppercase tracking-widest leading-none">
                                            {importDragOver ? 'Lepaskan file di sini' : 'Drag & Drop atau Klik untuk Pilih File'}
                                        </p>
                                        <p className="text-[8px] text-[var(--color-text-muted)] font-bold mt-0.5">Mendukung .csv dan .xlsx</p>
                                    </div>
                                </div>

                                {/* Info row: kelas valid */}
                                <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faTags} className="text-emerald-500/70" /> Daftar Kelas Valid
                                        </span>
                                        <button
                                            onClick={handleDownloadTemplate}
                                            className="shrink-0 h-7 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:bg-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all shadow-sm"
                                        >
                                            <FontAwesomeIcon icon={faDownload} className="text-[8px]" /> Template
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 max-h-[72px] overflow-y-auto pr-1 pb-2 custom-scrollbar">
                                        {classesList.length > 0 ? classesList.map(c => (
                                            <span key={c.id} className="px-2 py-1 rounded-md bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text)] shrink-0 hover:border-emerald-500/30 transition-colors">
                                                {c.name}
                                            </span>
                                        )) : (
                                            <span className="text-[9px] text-[var(--color-text-muted)] italic">Belum ada kelas yang terdaftar.</span>
                                        )}
                                    </div>
                                </div>

                                {/* Kolom — compact 2 kolom grid */}
                                <div className="rounded-xl border border-[var(--color-border)] overflow-hidden">
                                    <div className="px-3 py-1.5 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kolom yang Dikenali</span>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-[var(--color-border)]">
                                        <div className="divide-y divide-[var(--color-border)]">
                                            {[
                                                { col: 'name / nama', req: true, note: 'Nama siswa' },
                                                { col: 'class_name / kelas', req: true, note: 'Harus cocok dengan kelas di atas' },
                                                { col: 'gender / jk', req: false, note: 'L / P — default L' },
                                            ].map((r, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                                                    <code className="text-[8px] font-black text-[var(--color-primary)] shrink-0">{r.col}</code>
                                                    {r.req && <span className="text-[7px] font-black text-red-500 shrink-0">*</span>}
                                                    <span className="text-[8px] text-[var(--color-text-muted)] font-medium truncate">{r.note}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="divide-y divide-[var(--color-border)]">
                                            {[
                                                { col: 'phone / no_hp', req: false, note: '08xx atau +62xx' },
                                                { col: 'nisn', req: false, note: 'Untuk deteksi duplikat' },
                                                { col: 'guardian_name', req: false, note: 'Nama wali' },
                                            ].map((r, i) => (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5">
                                                    <code className="text-[8px] font-black text-[var(--color-primary)] shrink-0">{r.col}</code>
                                                    <span className="text-[8px] text-[var(--color-text-muted)] font-medium truncate">{r.note}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 2: COLUMN MAPPING ── */}
                        {importStep === 2 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Cocokkan Kolom File</span>
                                    <span className="text-[9px] font-bold py-1 px-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                        {importFileHeaders.length} kolom ditemukan
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2.5 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                                    {SYSTEM_COLS.map(sys => {
                                        const mapped = importColumnMapping[sys.key]
                                        return (
                                            <div key={sys.key} className={`p-3 rounded-xl border transition-all ${mapped ? 'bg-emerald-500/4 border-emerald-500/20' : 'bg-[var(--color-surface-alt)]/50 border-[var(--color-border)]'}`}>
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-black text-[var(--color-text)] flex items-center gap-1.5">
                                                            {sys.label}
                                                            {['name', 'class_name'].includes(sys.key) && <span className="text-red-500">*</span>}
                                                        </span>
                                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-60 truncate">Data sistem</span>
                                                    </div>

                                                    <div className="flex-1 flex items-center gap-2 group">
                                                        <div className="h-px bg-[var(--color-border)] flex-1 opacity-50" />
                                                        <FontAwesomeIcon icon={faArrowRight} className={`text-[9px] transition-colors ${mapped ? 'text-emerald-500' : 'text-[var(--color-text-muted)] opacity-30'}`} />
                                                        <div className="h-px bg-[var(--color-border)] flex-1 opacity-50" />
                                                    </div>

                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <select
                                                            value={mapped || ''}
                                                            onChange={(e) => setImportColumnMapping(v => ({ ...v, [sys.key]: e.target.value }))}
                                                            className={`h-9 px-3 rounded-xl text-[10px] font-black border transition-all outline-none appearance-none cursor-pointer
                                                            ${mapped
                                                                    ? 'border-emerald-500/40 bg-[var(--color-surface)] text-emerald-600'
                                                                    : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/50'}`}
                                                        >
                                                            <option value="">-- Lewati Kolom --</option>
                                                            {importFileHeaders.map(h => (
                                                                <option key={h} value={h}>{h}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-2.5">
                                    <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 text-amber-500 text-[10px]" />
                                    <p className="text-[9px] font-bold text-amber-600/80 leading-relaxed">
                                        Pastikan kolom <span className="font-black">Nama</span> dan <span className="font-black">Kelas</span> telah dipilih agar data bisa diproses.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3: PREVIEW & VALIDASI ── */}
                        {importStep === 3 && (
                            <div className="space-y-3">
                                {/* Loading state during file parsing */}
                                {importLoading && (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl text-[var(--color-primary)]" />
                                        <p className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Membaca file & memeriksa duplikat...</p>
                                    </div>
                                )}
                                {/* Summary Cards */}
                                {!importLoading && <><div className="grid grid-cols-3 gap-2">
                                    <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                        <p className="text-[14px] font-black text-emerald-600 leading-none">{importReadyRows.length}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600/70 mt-1">Siap Import</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10">
                                        <p className="text-[14px] font-black text-red-600 leading-none">{importIssues.filter(x => x.level === 'error').length}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-red-600/70 mt-1">Error</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-violet-500/5 border border-violet-500/10">
                                        <p className="text-[14px] font-black text-violet-600 leading-none">{importDuplicates.length}</p>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-violet-600/70 mt-1">Duplikat</p>
                                    </div>
                                    <div className="col-span-3 flex flex-col justify-between items-start gap-4 mt-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-full sm:w-auto">Aksi Massal:</span>
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleBulkFix('gender', e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black uppercase hover:border-[var(--color-primary)] outline-none cursor-pointer"
                                            >
                                                <option value="">Set Semua Gender...</option>
                                                <option value="L">Semua L (Laki-laki)</option>
                                                <option value="P">Semua P (Perempuan)</option>
                                            </select>
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleBulkFix('class_id', e.target.value);
                                                        e.target.value = '';
                                                    }
                                                }}
                                                className="px-2 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[8px] font-black uppercase hover:border-[var(--color-primary)] outline-none cursor-pointer"
                                            >
                                                <option value="">Set Semua Kelas...</option>
                                                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-row items-center justify-between w-full gap-3 bg-[var(--color-surface-alt)] p-2.5 rounded-xl border border-[var(--color-border)]">
                                            <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-80 uppercase tracking-widest flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faCircleInfo} className="text-[var(--color-primary)]" /> Klik sel tabel untuk edit
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setIsRevalidating(true)
                                                    validateImportPreview(importPreview)
                                                    setTimeout(() => setIsRevalidating(false), 800)
                                                }}
                                                className="text-[9px] font-black uppercase tracking-widest text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 transition-colors px-3 py-1.5 rounded-lg shrink-0"
                                            >
                                                <FontAwesomeIcon icon={faSync} className={`mr-1.5 transition-transform ${isRevalidating ? 'animate-spin' : ''}`} /> Re-validasi
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                    <div className="space-y-3">
                                        {importDuplicates.length > 0 && (
                                            <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-violet-500/5 border border-violet-500/15">
                                                <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400">
                                                    <span className="font-black">{importDuplicates.length} duplikat</span> — nama/NISN sudah ada di DB atau dalam file
                                                </p>
                                                <button
                                                    onClick={() => setImportSkipDupes(v => !v)}
                                                    className={`shrink-0 h-7 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${importSkipDupes ? 'bg-violet-500 border-violet-500 text-white' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                                                >
                                                    {importSkipDupes ? 'Skip Duplikat ✓' : 'Import Semua'}
                                                </button>
                                            </div>
                                        )}

                                        <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                                            <div className="max-h-[28vh] overflow-auto custom-scrollbar">
                                                <table className="w-full text-[10px] whitespace-nowrap">
                                                    <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                                        <tr className="text-left shadow-sm">
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest w-8">#</th>
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest min-w-[180px]">Nama</th>
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest min-w-[80px]">Gender</th>
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest min-w-[100px]">No. HP</th>
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest min-w-[120px]">Kelas</th>
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest min-w-[100px]">NISN</th>
                                                            <th className="px-3 py-2 font-black text-[var(--color-text-muted)] uppercase tracking-widest px-4">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {importPreview.slice(0, 300).map((r, i) => {
                                                            const isError = r._hasError
                                                            const isDupe = r._isDupe
                                                            const isWarn = r._hasWarn && !isError && !isDupe
                                                            const rowBg = isError ? 'bg-red-500/5 border-l-2 border-l-red-500'
                                                                : isDupe ? 'bg-violet-500/5 border-l-2 border-l-violet-500'
                                                                    : isWarn ? 'bg-amber-500/5 border-l-2 border-l-amber-400' : ''
                                                            return (
                                                                <tr key={i} className={`border-t border-[var(--color-border)] group/row ${rowBg}`}>
                                                                    <td className="px-3 py-1.5 text-[var(--color-text-muted)] font-bold">{i + 1}</td>

                                                                    {/* NAMA */}
                                                                    <td
                                                                        onClick={() => setImportEditCell({ idx: i, key: 'name' })}
                                                                        className={`px-3 py-1.5 font-black text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-primary)]/5 group/cell ${importEditCell?.idx === i && importEditCell?.key === 'name' ? 'bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary)]' : ''}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            {importEditCell?.idx === i && importEditCell?.key === 'name' ? (
                                                                                <input
                                                                                    autoFocus
                                                                                    defaultValue={r.name}
                                                                                    onBlur={(e) => {
                                                                                        const val = e.target.value.trim()
                                                                                        if (val !== r.name) {
                                                                                            const newPrev = [...importPreview]
                                                                                            newPrev[i].name = val
                                                                                            setImportPreview(newPrev)
                                                                                        }
                                                                                        setImportEditCell(null)
                                                                                    }}
                                                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                                                                    className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-black"
                                                                                />
                                                                            ) : (
                                                                                <>
                                                                                    <span>{r.name || <span className="text-red-500 italic text-[8px]">kosong</span>}</span>
                                                                                    <FontAwesomeIcon icon={faEdit} className="text-[8px] text-[var(--color-primary)] opacity-0 group-hover/cell:opacity-40 transition-opacity" />
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    {/* GENDER */}
                                                                    <td
                                                                        onClick={() => setImportEditCell({ idx: i, key: 'gender' })}
                                                                        className={`px-3 py-1.5 text-[var(--color-text-muted)] cursor-pointer hover:bg-[var(--color-primary)]/5 group/cell ${importEditCell?.idx === i && importEditCell?.key === 'gender' ? 'bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary)]' : ''}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-1">
                                                                            {importEditCell?.idx === i && importEditCell?.key === 'gender' ? (
                                                                                <select
                                                                                    autoFocus
                                                                                    defaultValue={r.gender}
                                                                                    onChange={(e) => {
                                                                                        const newPrev = [...importPreview]
                                                                                        newPrev[i].gender = e.target.value
                                                                                        setImportPreview(newPrev)
                                                                                        setImportEditCell(null)
                                                                                    }}
                                                                                    onBlur={() => setImportEditCell(null)}
                                                                                    className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-bold appearance-none cursor-pointer"
                                                                                >
                                                                                    <option value="L">L</option>
                                                                                    <option value="P">P</option>
                                                                                </select>
                                                                            ) : (
                                                                                <>
                                                                                    <span>{r.gender || '-'}</span>
                                                                                    <FontAwesomeIcon icon={faEdit} className="text-[7px] text-[var(--color-primary)] opacity-0 group-hover/cell:opacity-40 transition-opacity" />
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    {/* PHONE */}
                                                                    <td
                                                                        onClick={() => setImportEditCell({ idx: i, key: 'phone' })}
                                                                        className={`px-3 py-1.5 font-mono text-[var(--color-text-muted)] cursor-pointer hover:bg-[var(--color-primary)]/5 group/cell ${importEditCell?.idx === i && importEditCell?.key === 'phone' ? 'bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary)]' : ''}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            {importEditCell?.idx === i && importEditCell?.key === 'phone' ? (
                                                                                <input
                                                                                    autoFocus
                                                                                    defaultValue={r.phone}
                                                                                    onBlur={(e) => {
                                                                                        const val = normalizePhone(e.target.value)
                                                                                        if (val !== r.phone) {
                                                                                            const newPrev = [...importPreview]
                                                                                            newPrev[i].phone = val
                                                                                            setImportPreview(newPrev)
                                                                                        }
                                                                                        setImportEditCell(null)
                                                                                    }}
                                                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                                                                    className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-mono"
                                                                                />
                                                                            ) : (
                                                                                <>
                                                                                    <span>{r.phone || '-'}</span>
                                                                                    <FontAwesomeIcon icon={faEdit} className="text-[8px] text-[var(--color-primary)] opacity-0 group-hover/cell:opacity-40 transition-opacity" />
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    {/* KELAS */}
                                                                    <td
                                                                        onClick={() => setImportEditCell({ idx: i, key: 'class_name' })}
                                                                        className={`px-3 py-1.5 font-bold text-[var(--color-text)] cursor-pointer hover:bg-[var(--color-primary)]/5 group/cell ${importEditCell?.idx === i && importEditCell?.key === 'class_name' ? 'bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary)]' : ''}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            {importEditCell?.idx === i && importEditCell?.key === 'class_name' ? (
                                                                                <select
                                                                                    autoFocus
                                                                                    defaultValue={r.class_id}
                                                                                    onChange={(e) => {
                                                                                        const cid = e.target.value
                                                                                        const cname = classesList.find(x => x.id === cid)?.name
                                                                                        const newPrev = [...importPreview]
                                                                                        newPrev[i].class_id = cid
                                                                                        newPrev[i]._className = cname
                                                                                        setImportPreview(newPrev)
                                                                                        setImportEditCell(null)
                                                                                    }}
                                                                                    onBlur={() => setImportEditCell(null)}
                                                                                    className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-bold appearance-none cursor-pointer"
                                                                                >
                                                                                    <option value="">-- Pilih --</option>
                                                                                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                                                </select>
                                                                            ) : (
                                                                                <>
                                                                                    <span>{classesList.find(c => c.id === r.class_id)?.name || <span className="text-red-500 italic text-[9px]">{r._className || '?'}</span>}</span>
                                                                                    <FontAwesomeIcon icon={faEdit} className="text-[8px] text-[var(--color-primary)] opacity-0 group-hover/cell:opacity-40 transition-opacity" />
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    {/* NISN */}
                                                                    <td
                                                                        onClick={() => setImportEditCell({ idx: i, key: 'nisn' })}
                                                                        className={`px-3 py-1.5 font-mono text-[var(--color-text-muted)] cursor-pointer hover:bg-[var(--color-primary)]/5 group/cell ${importEditCell?.idx === i && importEditCell?.key === 'nisn' ? 'bg-[var(--color-surface)] ring-1 ring-inset ring-[var(--color-primary)]' : ''}`}
                                                                    >
                                                                        <div className="flex items-center justify-between gap-2">
                                                                            {importEditCell?.idx === i && importEditCell?.key === 'nisn' ? (
                                                                                <input
                                                                                    autoFocus
                                                                                    defaultValue={r.nisn}
                                                                                    onBlur={(e) => {
                                                                                        const val = e.target.value.trim()
                                                                                        if (val !== r.nisn) {
                                                                                            const newPrev = [...importPreview]
                                                                                            newPrev[i].nisn = val
                                                                                            setImportPreview(newPrev)
                                                                                        }
                                                                                        setImportEditCell(null)
                                                                                    }}
                                                                                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                                                                                    className="w-full bg-transparent border-none outline-none p-0 text-[10px] font-mono"
                                                                                />
                                                                            ) : (
                                                                                <>
                                                                                    <span>{r.nisn || '-'}</span>
                                                                                    <FontAwesomeIcon icon={faEdit} className="text-[8px] text-[var(--color-primary)] opacity-0 group-hover/cell:opacity-40 transition-opacity" />
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </td>

                                                                    <td className="px-3 py-1.5">
                                                                        {isError ? <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-600 text-[8px] font-black">ERROR</span>
                                                                            : isDupe ? <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-600 text-[8px] font-black">DUPLIKAT</span>
                                                                                : isWarn ? <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 text-[8px] font-black">WARN</span>
                                                                                    : <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 text-[8px] font-black">OK</span>}
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {importPreview.length > 300 && (
                                                <div className="px-3 py-2 text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-t border-[var(--color-border)]">
                                                    Menampilkan 300 dari {importPreview.length} baris.
                                                </div>
                                            )}
                                        </div>

                                        {/* Issue List if Any */}
                                        {importIssues.length > 0 && (
                                            <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]/20">
                                                <button
                                                    type="button"
                                                    onClick={() => setImportValidationOpen(v => !v)}
                                                    className="w-full px-3 py-2 bg-[var(--color-surface-alt)] border-b border-[var(--color-border)] flex items-center justify-between hover:bg-[var(--color-border)]/30 transition-colors cursor-pointer"
                                                >
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                        <FontAwesomeIcon icon={faChevronDown} className={`text-[7px] transition-transform ${importValidationOpen ? '' : '-rotate-90'}`} />
                                                        Catatan Validasi
                                                    </span>
                                                    <span className="text-[8px] font-bold text-[var(--color-text-muted)] opacity-50">{importIssues.length} isu</span>
                                                </button>
                                                {importValidationOpen && <div className="max-h-[140px] overflow-auto divide-y divide-[var(--color-border)]">
                                                    {importIssues.map((issue, idx) => {
                                                        const levelStyle = issue.level === 'error'
                                                            ? { pill: 'bg-red-500/15 text-red-600', row: 'border-l-2 border-l-red-500 bg-red-500/3' }
                                                            : issue.level === 'dupe'
                                                                ? { pill: 'bg-violet-500/15 text-violet-600', row: 'border-l-2 border-l-violet-500 bg-violet-500/3' }
                                                                : { pill: 'bg-amber-500/15 text-amber-600', row: 'border-l-2 border-l-amber-400 bg-amber-500/3' }
                                                        return (
                                                            <div key={idx} className={`flex items-start gap-3 px-3 py-2 ${levelStyle.row}`}>
                                                                <span className={`mt-0.5 shrink-0 px-1.5 py-0.5 rounded text-[8px] font-black ${levelStyle.pill}`}>
                                                                    {issue.level === 'dupe' ? 'DUPLIKAT' : issue.level.toUpperCase()}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] mb-0.5">Baris {issue.row}</p>
                                                                    {issue.messages.map((msg, mi) => (
                                                                        <p key={mi} className="text-[10px] font-bold text-[var(--color-text)] leading-snug">{msg}</p>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>}
                                            </div>
                                        )}
                                    </div>
                                </>}
                            </div>
                        )}

                        {/* ── FOOTER ── */}
                        <div className="flex items-center justify-between gap-3 pt-4 mt-2 border-t border-[var(--color-border)]">
                            {importStep > 1 && (
                                <button
                                    onClick={() => setImportStep(v => v - 1)}
                                    disabled={importing}
                                    className="h-10 px-6 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[11px] font-black uppercase tracking-widest disabled:opacity-50 hover:bg-[var(--color-border)] transition-all flex items-center gap-2"
                                >
                                    <FontAwesomeIcon icon={faArrowLeft} />
                                    Kembali
                                </button>
                            )}

                            <div className="flex items-center gap-3">
                                {importing && (
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] flex items-center gap-2">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-primary)]" />
                                        {importProgress.done}/{importProgress.total}
                                    </span>
                                )}

                                {importStep === 1 ? (
                                    <button
                                        onClick={() => importRawData.length > 0 ? setImportStep(2) : importFileInputRef.current?.click()}
                                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                                    >
                                        {importRawData.length > 0 ? (
                                            <>Lanjutkan <FontAwesomeIcon icon={faArrowRight} /></>
                                        ) : (
                                            <>Pilih File <FontAwesomeIcon icon={faUpload} /></>
                                        )}
                                    </button>
                                ) : importStep === 2 ? (
                                    <button
                                        onClick={async () => {
                                            setImportStep(3)
                                            setImportLoading(true)
                                            await buildImportPreview(importRawData, importColumnMapping)
                                            setImportLoading(false)
                                        }}
                                        disabled={!importColumnMapping.name || !importColumnMapping.class_name}
                                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                                    >
                                        Review Data <FontAwesomeIcon icon={faArrowRight} />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCommitImport}
                                        disabled={importing || hasImportBlockingErrors || importReadyRows.length === 0}
                                        className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[11px] font-black uppercase tracking-widest disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2"
                                    >
                                        {importing
                                            ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Mengimport...</>
                                            : <><FontAwesomeIcon icon={faCheck} /> Selesaikan Import</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </Modal>
                )
                }

                {/* ===================== */}
                {/* BULK PHOTO MATCHER MODAL */}
                {/* ===================== */}
                {
                    isBulkPhotoModalOpen && (
                        <Modal
                            isOpen={isBulkPhotoModalOpen}
                            onClose={() => { if (!uploadingBulkPhotos) setIsBulkPhotoModalOpen(false) }}
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
                    isBulkWAModalOpen && (
                        <Modal
                            isOpen={isBulkWAModalOpen}
                            onClose={() => setIsBulkWAModalOpen(false)}
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
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Antrean Siaran ({students.filter(s => selectedStudentIds.includes(s.id) && s.phone).length} Wali)</h5>
                                            {broadcastIndex >= 0 && (
                                                <div className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 text-[9px] font-black animate-pulse">SIARAN BERJALAN...</div>
                                            )}
                                        </div>

                                        <div className="flex-1 overflow-auto p-4 space-y-3 max-h-[350px] scrollbar-none">
                                            {students.filter(s => selectedStudentIds.includes(s.id) && s.phone).map((s, idx) => (
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
                                                    <span>{broadcastIndex + 1} / {students.filter(s => selectedStudentIds.includes(s.id) && s.phone).length}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-[var(--color-surface-alt)] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[var(--color-primary)] transition-all duration-500"
                                                        style={{ width: `${((broadcastIndex + 1) / students.filter(s => selectedStudentIds.includes(s.id) && s.phone).length) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const targets = students.filter(s => selectedStudentIds.includes(s.id) && s.phone);
                                                    targets.forEach((s, i) => {
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
                {/* EXPORT MODAL */}
                {/* ===================== */}
                {
                    isExportModalOpen && (
                        <Modal
                            isOpen={isExportModalOpen}
                            onClose={() => { if (exporting) return; setIsExportModalOpen(false) }}
                            title="Export Data Siswa"
                            size="lg"
                        >
                            <div className="space-y-6">

                                {/* ── Step 1: Scope ─────────────────────────────── */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">1 — Siswa yang Diekspor</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { val: 'filtered', label: 'Filter Aktif', desc: `${students.length} siswa`, icon: faSliders },
                                            { val: 'selected', label: 'Dipilih', desc: `${selectedStudentIds.length} siswa`, icon: faCheckCircle, disabled: selectedStudentIds.length === 0 },
                                            { val: 'all', label: 'Semua', desc: 'Tanpa filter', icon: faUsers },
                                        ].map(({ val, label, desc, icon, disabled }) => (
                                            <button
                                                key={val}
                                                onClick={() => !disabled && setExportScope(val)}
                                                disabled={disabled}
                                                className={`p-3 rounded-2xl border-2 text-left transition-all
                                                ${exportScope === val
                                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                                                        : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40'}
                                                ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                                            `}
                                            >
                                                <FontAwesomeIcon icon={icon} className={`text-base mb-1 ${exportScope === val ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} />
                                                <div className="text-xs font-black text-[var(--color-text)]">{label}</div>
                                                <div className="text-[10px] font-bold text-[var(--color-text-muted)]">{desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Step 2: Kolom ─────────────────────────────── */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">2 — Kolom yang Disertakan</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => setExportColumns(prev => Object.fromEntries(Object.keys(prev).map(k => [k, true])))} className="text-[9px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest">Semua</button>
                                            <span className="text-[var(--color-border)]">·</span>
                                            <button onClick={() => setExportColumns({ id: false, kode: false, nisn: false, nama: true, gender: false, kelas: false, poin: false, phone: false, status: false, tags: false, kelengkapan: false })} className="text-[9px] font-black text-[var(--color-text-muted)] hover:underline uppercase tracking-widest">Reset</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                        {[
                                            { key: 'id', label: 'ID' },
                                            { key: 'kode', label: 'Kode Registrasi' },
                                            { key: 'nisn', label: 'NISN' },
                                            { key: 'nama', label: 'Nama' },
                                            { key: 'gender', label: 'Gender' },
                                            { key: 'kelas', label: 'Kelas' },
                                            { key: 'poin', label: 'Poin' },
                                            { key: 'phone', label: 'Phone/WA' },
                                            { key: 'status', label: 'Status' },
                                            { key: 'tags', label: 'Label/Tag' },
                                            { key: 'kelengkapan', label: 'Kelengkapan Data' },
                                        ].map(({ key, label }) => (
                                            <button
                                                key={key}
                                                onClick={() => setExportColumns(prev => ({ ...prev, [key]: !prev[key] }))}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-xs font-bold
                                                ${exportColumns[key]
                                                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                                                        : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/40'}
                                            `}
                                            >
                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-all ${exportColumns[key] ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-[var(--color-border)]'}`}>
                                                    {exportColumns[key] && <svg width="8" height="8" viewBox="0 0 8 8" fill="white"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>}
                                                </div>
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Step 3: Format ────────────────────────────── */}
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">3 — Pilih Format Export</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {[
                                            { label: 'CSV', icon: faFileLines, desc: 'Universal', onClick: handleExportCSV, color: 'bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]', iconColor: 'text-[var(--color-text-muted)]' },
                                            { label: 'Excel', icon: faTableList, desc: '.xlsx', onClick: handleExportExcel, color: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border border-emerald-500/20', iconColor: 'text-emerald-500' },
                                            { label: 'PDF', icon: faFileLines, desc: 'Tabel', onClick: handleExportPDF, color: 'bg-[var(--color-primary)] hover:brightness-110 text-white border border-[var(--color-primary)]', iconColor: 'text-white' },
                                            {
                                                label: 'PDF Kartu', icon: faIdCard, desc: 'Dengan foto',
                                                onClick: async () => {
                                                    setIsExportModalOpen(false)
                                                    // Ambil targets sesuai scope
                                                    let targets = []
                                                    if (exportScope === 'selected' && selectedStudentIds.length > 0) {
                                                        targets = students.filter(s => selectedStudentIds.includes(s.id))
                                                    } else if (exportScope === 'all') {
                                                        targets = students
                                                    } else {
                                                        targets = students // filtered = tampilan saat ini
                                                    }
                                                    if (!targets.length) return addToast('Tidak ada siswa untuk dicetak', 'warning')
                                                    generateStudentPDF(targets)
                                                },
                                                color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20', iconColor: 'text-orange-500'
                                            },
                                        ].map(({ label, icon, desc, onClick, color, iconColor }) => (
                                            <button
                                                key={label}
                                                onClick={onClick}
                                                disabled={exporting || Object.values(exportColumns).every(v => !v)}
                                                className={`${color} h-20 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all disabled:opacity-40 font-black`}
                                            >
                                                <FontAwesomeIcon icon={icon} className={`text-lg ${iconColor}`} />
                                                <span className="text-[10px] uppercase tracking-widest">{label}</span>
                                                <span className="text-[9px] font-bold opacity-60">{desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Warning jika tidak ada kolom dipilih */}
                                {Object.values(exportColumns).every(v => !v) && (
                                    <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
                                        <div className="flex items-center gap-2">
                                            <FontAwesomeIcon icon={faTriangleExclamation} />
                                            Pilih minimal satu kolom untuk export
                                        </div>
                                    </div>
                                )}

                                {exporting && (
                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-bold">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                        Menyiapkan file export...
                                    </div>
                                )}
                            </div>
                        </Modal>
                    )
                }


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


                {/* Modal Cetak Kartu & Akses Siswa */}
                {
                    isPrintModalOpen && (
                        <Modal
                            isOpen={isPrintModalOpen}
                            onClose={() => {
                                setIsPrintModalOpen(false);
                                if (newlyCreatedStudent) setNewlyCreatedStudent(null);
                            }}
                            title={newlyCreatedStudent ? "Registrasi Berhasil!" : "Akses & Kartu"}
                            size="lg"
                        >
                            {selectedStudent && (
                                <div className="space-y-4 py-1">
                                    {newlyCreatedStudent && (
                                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600">
                                            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-[10px]">
                                                <FontAwesomeIcon icon={faCheckCircle} />
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-widest">Registrasi Berhasil! Data akses & kartu tersedia di bawah.</p>
                                        </div>
                                    )}

                                    {/* Card Previews - Compact size */}
                                    <div
                                        id="card-capture-target"
                                        ref={cardCaptureRef}
                                        className="flex flex-col sm:flex-row gap-2.5 justify-center items-center"
                                        style={{ background: 'transparent' }}
                                    >
                                        {/* Front Card */}
                                        <div className="w-[300px] h-[188px] bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl text-white relative shadow-xl overflow-hidden shadow-indigo-500/20 shrink-0 scale-95 sm:scale-100 origin-center transition-transform">
                                            <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full blur-2xl" />
                                            <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                                                <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                                    <span className="font-black text-[9px]">L</span>
                                                </div>
                                                <span className="text-[7px] font-black uppercase tracking-[0.2em] opacity-80 text-white">Laporanmu</span>
                                            </div>
                                            <div className="absolute top-9 left-4 right-4 bottom-7 flex gap-3 z-10">
                                                <div className="w-[62px] h-[78px] rounded-lg bg-white/10 border border-white/20 p-1.5 shrink-0 shadow-lg overflow-hidden">
                                                    {selectedStudent.photo_url ? (
                                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover rounded-md" />
                                                    ) : (
                                                        <div className="w-full h-full rounded-md bg-white/5 flex items-center justify-center border border-white/10">
                                                            <span className="text-2xl font-black opacity-30">{isPrivacyMode ? '*' : selectedStudent.name.charAt(0)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                                    <div>
                                                        <h3 className="text-[11px] font-black leading-[1.2] uppercase mb-0.5 drop-shadow-sm line-clamp-2">
                                                            {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                                                        </h3>
                                                        <div className="space-y-0.5">
                                                            <p className="text-[8px] font-black text-white/90 uppercase tracking-tight leading-tight">{selectedStudent.className}</p>
                                                            <p className="text-[6px] font-bold text-white/40 uppercase tracking-widest leading-none">MUHAMMADIYAH BOARDING SCHOOL TANGGUL</p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-1.5 border-t border-white/10">
                                                        <p className="text-[5px] font-bold opacity-30 uppercase tracking-widest mb-0.5 leading-none">NOMOR REGISTRASI</p>
                                                        <p className="text-[9px] font-mono font-bold tracking-wider text-indigo-100 leading-tight">
                                                            {isPrivacyMode ? maskInfo(selectedStudent.code, 3) : selectedStudent.code}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between opacity-20">
                                                <div className="flex items-center gap-1 text-white">
                                                    <FontAwesomeIcon icon={faGraduationCap} className="text-[7px]" />
                                                    <span className="text-[6px] font-black uppercase tracking-[0.3em]">KARTU PELAJAR</span>
                                                </div>
                                                <span className="text-[5px] font-black uppercase tracking-[0.2em] text-white">2026/2027</span>
                                            </div>
                                        </div>

                                        {/* Back Card */}
                                        <div className="w-[300px] h-[188px] bg-white dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 relative shadow-lg flex flex-col items-center justify-center text-center shrink-0 p-4 scale-95 sm:scale-100 origin-center transition-transform">
                                            <div className={`p-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm mb-2 ${isPrivacyMode ? 'blur-md grayscale opacity-50' : ''}`}>
                                                <QRCodeCanvas
                                                    value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                                    size={65}
                                                    level="M"
                                                />
                                            </div>
                                            <h4 className="text-[8px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em] mb-1 leading-tight">AKSES PORTAL ORANG TUA</h4>
                                            <p className="text-[6px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[180px]">
                                                Silakan scan kode di atas untuk<br />mengecek perkembangan siswa
                                            </p>
                                            <div className="absolute bottom-3 w-full left-0 px-5 flex justify-between items-center opacity-20">
                                                <span className="text-[5px] font-black uppercase tracking-[0.25em]">TAHUN 2026/2027</span>
                                                <span className="text-[5px] font-black uppercase tracking-[0.25em]">MBS TANGGUL</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Access Info & Actions Bar */}
                                    <div className="bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl p-3 space-y-3 no-print">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Info Info */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                    <label className="block text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">ID REG</label>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12px] font-black text-[var(--color-primary)] font-mono">
                                                            {isPrivacyMode ? maskInfo(selectedStudent.code, 2) : selectedStudent.code}
                                                        </span>
                                                        <button onClick={() => {
                                                            if (isPrivacyMode) return addToast('Mode Privasi aktif', 'warning')
                                                            navigator.clipboard.writeText(selectedStudent.code);
                                                            addToast('Kode dicopy', 'success')
                                                        }} className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"><FontAwesomeIcon icon={faLink} /></button>
                                                    </div>
                                                </div>
                                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                                                    <label className="block text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-0.5 opacity-60">PIN</label>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[12px] font-black text-emerald-500 font-mono tracking-wider">
                                                            {isPrivacyMode ? '****' : selectedStudent.pin}
                                                        </span>
                                                        <button onClick={() => {
                                                            if (isPrivacyMode) return addToast('Mode Privasi aktif', 'warning')
                                                            navigator.clipboard.writeText(selectedStudent.pin);
                                                            addToast('PIN dicopy', 'success')
                                                        }} className="text-[10px] text-[var(--color-text-muted)] hover:text-emerald-500"><FontAwesomeIcon icon={faLink} /></button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Main WA Action */}
                                            <button
                                                onClick={() => openWAForStudent(selectedStudent, buildWAMessage(selectedStudent, waTemplate))}
                                                className="h-10 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 px-4 w-full"
                                            >
                                                <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
                                                BAGIKAN KE WALI MURID
                                            </button>
                                        </div>

                                        {/* Tools Bar */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]/50">
                                            <button
                                                onClick={() => {
                                                    if (isPrivacyMode) return addToast('Mode Privasi aktif', 'warning');
                                                    handleResetPin(selectedStudent);
                                                }}
                                                disabled={resettingPin}
                                                className="h-9 px-3 rounded-lg border border-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                                            >
                                                <FontAwesomeIcon icon={resettingPin ? faSpinner : faRotateLeft} className={resettingPin ? 'fa-spin' : ''} />
                                                Reset PIN Akses
                                            </button>

                                            <div className="flex gap-2 items-center">
                                                {/* Satu tombol dropdown: PDF / PNG / Thermal */}
                                                <div className="relative">
                                                    <button
                                                        onClick={() => setShowExportMenu(v => !v)}
                                                        disabled={generatingPdf}
                                                        className="h-9 px-3 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                                    >
                                                        {generatingPdf
                                                            ? <><FontAwesomeIcon icon={faSpinner} className="fa-spin" /> Menyiapkan...</>
                                                            : <><FontAwesomeIcon icon={faDownload} /> Ekspor <FontAwesomeIcon icon={faChevronDown} className="text-[8px] opacity-70" /></>
                                                        }
                                                    </button>
                                                    {showExportMenu && (
                                                        <>
                                                            {/* Backdrop klik-luar tutup menu */}
                                                            <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                                                            <div className="absolute bottom-full mb-1.5 right-0 z-20 w-44 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                                                <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 pt-2.5 pb-1">Pilih Format</p>
                                                                <button
                                                                    onClick={() => { handlePrintSingle(selectedStudent); setShowExportMenu(false); }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] transition-colors text-left"
                                                                >
                                                                    <FontAwesomeIcon icon={faFileLines} className="w-5 text-center text-[11px] text-[var(--color-primary)]" /> Surat Akses PDF
                                                                </button>
                                                                <button
                                                                    onClick={() => { handleSavePNG(selectedStudent); setShowExportMenu(false); }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors text-left"
                                                                >
                                                                    <FontAwesomeIcon icon={faImage} className="w-5 text-center text-[11px] text-emerald-500" /> Simpan PNG
                                                                </button>
                                                                <button
                                                                    onClick={() => { handlePrintThermal(selectedStudent); setShowExportMenu(false); }}
                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-bold text-[var(--color-text)] hover:bg-orange-500/10 hover:text-orange-600 transition-colors text-left mb-1"
                                                                >
                                                                    <FontAwesomeIcon icon={faPrint} className="w-5 text-center text-[11px] text-orange-500" /> Struk Thermal 58mm
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    )
                }
                {/* Modal Detail Profil Siswa - Premium Mini Dashboard */}
                {
                    isProfileModalOpen && (
                        <Modal
                            isOpen={isProfileModalOpen}
                            onClose={() => setIsProfileModalOpen(false)}
                            title="Profil Siswa"
                            size="lg"
                        >
                            {selectedStudent && (
                                <div className="space-y-4 -mt-2">
                                    {/* Compact Slim Header */}
                                    <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-xl">
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-violet-600 to-purple-800"></div>
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>

                                        <div className="relative p-3.5 flex items-center gap-5 text-white">
                                            {/* Slim Avatar */}
                                            <div className="relative shrink-0">
                                                <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center text-2xl font-black shadow-xl overflow-hidden z-10 relative">
                                                    {selectedStudent.photo_url && !isPrivacyMode ? (
                                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>{isPrivacyMode ? '*' : selectedStudent.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border border-white/30 shadow-lg z-20 ${selectedStudent.status === 'aktif' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                                    {selectedStudent.status}
                                                </div>
                                            </div>

                                            {/* Name & Quick Stats */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h2 className="text-base font-black text-white truncate drop-shadow-sm">
                                                        {isPrivacyMode ? maskInfo(selectedStudent.name, 4) : selectedStudent.name}
                                                    </h2>
                                                    {(() => {
                                                        const completeness = calculateCompleteness(selectedStudent);
                                                        return (
                                                            <span className={`text-[7px] px-2 py-0.5 rounded-md font-black uppercase tracking-widest border ${completeness === 100 ? 'bg-emerald-400/20 text-emerald-100 border-emerald-400/30' : 'bg-white/10 text-white/90 border-white/20'}`}>
                                                                {completeness}% READY
                                                            </span>
                                                        )
                                                    })()}
                                                </div>

                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-white/70">
                                                        <FontAwesomeIcon icon={faIdCard} className="text-[9px]" />
                                                        <span className="text-[10px] font-bold tracking-wider">{isPrivacyMode ? maskInfo(selectedStudent.registration_code || selectedStudent.code, 3) : (selectedStudent.registration_code || selectedStudent.code)}</span>
                                                    </div>
                                                    <div className="flex-1 max-w-[140px]">
                                                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-white transition-all duration-700"
                                                                style={{ width: `${calculateCompleteness(selectedStudent)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quick Actions (Copy ID) */}
                                            <button
                                                onClick={() => {
                                                    if (isPrivacyMode) return addToast('Mode Privasi aktif', 'warning');
                                                    navigator.clipboard.writeText(selectedStudent.registration_code || selectedStudent.code);
                                                    addToast('ID disalin', 'success');
                                                }}
                                                className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-[9px] font-black uppercase transition-all"
                                            >
                                                SALIN ID
                                            </button>
                                        </div>
                                    </div>

                                    {/* ── COMPACT ALERT PILLS ── */}
                                    {(() => {
                                        const now = new Date()
                                        const alerts = []

                                        if (behaviorHistory.length > 0) {
                                            const lastDate = new Date(behaviorHistory[0].created_at)
                                            const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
                                            if (daysSince >= 14) alerts.push({ id: 'stale', color: 'amber', icon: faClockRotateLeft, text: `Tidak ada laporan ${daysSince} hari` })
                                        } else if (!loadingHistory) {
                                            alerts.push({ id: 'empty', color: 'amber', icon: faClockRotateLeft, text: 'Belum ada laporan' })
                                        }
                                        if ((selectedStudent.points ?? selectedStudent.total_points ?? 0) < RiskThreshold)
                                            alerts.push({ id: 'risk', color: 'red', icon: faTriangleExclamation, text: `Poin risiko (${RiskThreshold})` })
                                        if (!selectedStudent.phone)
                                            alerts.push({ id: 'no_wa', color: 'blue', icon: faCircleExclamation, text: 'No. WA belum diisi', action: true })
                                        const completeness = calculateCompleteness(selectedStudent)
                                        if (completeness < 70)
                                            alerts.push({ id: 'incomplete', color: 'violet', icon: faCircleExclamation, text: `Data ${completeness}% terisi` })

                                        if (alerts.length === 0) return null

                                        const colorMap = {
                                            red: 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400',
                                            amber: 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400',
                                            blue: 'bg-blue-500/10 border-blue-500/25 text-blue-600 dark:text-blue-400',
                                            violet: 'bg-violet-500/10 border-violet-500/25 text-violet-600 dark:text-violet-400',
                                        }

                                        return (
                                            <div className="flex flex-wrap gap-1.5">
                                                {alerts.map(a => (
                                                    <span
                                                        key={a.id}
                                                        onClick={a.action ? () => { setIsProfileModalOpen(false); handleEdit(selectedStudent) } : undefined}
                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-bold ${colorMap[a.color]} ${a.action ? 'cursor-pointer hover:brightness-110' : ''}`}
                                                    >
                                                        <FontAwesomeIcon icon={a.icon} className="text-[8px]" />
                                                        {a.text}
                                                        {a.action && <span className="opacity-60 font-black ml-0.5">→</span>}
                                                    </span>
                                                ))}
                                            </div>
                                        )
                                    })()}

                                    {/* ── TAB BAR ── */}
                                    <div className="flex gap-0.5 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                        {[
                                            { key: 'info', label: 'Info', icon: faIdCard },
                                            { key: 'statistik', label: 'Statistik', icon: faArrowTrendUp },
                                            {
                                                key: 'laporan', label: 'Laporan', icon: faHistory,
                                                badge: !loadingHistory && behaviorHistory.length > 0 ? behaviorHistory.length : null
                                            },
                                            {
                                                key: 'raport', label: 'Raport', icon: faTableList,
                                                badge: !loadingRaport && raportHistory.length > 0 ? raportHistory.length : null
                                            },
                                        ].map(tab => (
                                            <button
                                                key={tab.key}
                                                onClick={() => setProfileTab(tab.key)}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                                                ${profileTab === tab.key
                                                        ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                            >
                                                <FontAwesomeIcon icon={tab.icon} className="text-[9px]" />
                                                {tab.label}
                                                {tab.badge && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/15 text-[var(--color-primary)] text-[8px] font-black leading-none">
                                                        {tab.badge}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ── TAB: INFO ── */}
                                    {profileTab === 'info' && (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            {/* Academic Box */}
                                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                                                <h4 className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faIdCard} className="opacity-50" /> Data Akademik
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-[var(--color-text-muted)] font-bold">Kelas</span>
                                                        <span className="font-black text-[var(--color-text)]">{selectedStudent.className}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-[var(--color-text-muted)] font-bold">Gender</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <FontAwesomeIcon icon={selectedStudent.gender === 'L' ? faMars : faVenus} className={selectedStudent.gender === 'L' ? 'text-blue-500' : 'text-pink-500'} />
                                                            <span className="font-black text-[var(--color-text)] uppercase">{selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center text-[10px]">
                                                        <span className="text-[var(--color-text-muted)] font-bold">NISN</span>
                                                        <span className="font-mono font-black text-[var(--color-primary)]">{isPrivacyMode ? maskInfo(selectedStudent.nisn, 3) : (selectedStudent.nisn || '---')}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Box */}
                                            <div className="p-3 rounded-xl bg-[var(--color-surface-alt)]/20 border border-[var(--color-border)]">
                                                <h4 className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faWhatsapp} className="opacity-50" /> Kontak Wali
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center group">
                                                        <span className="text-[8px] text-[var(--color-text-muted)] font-black uppercase">WhatsApp</span>
                                                        {selectedStudent.phone && (
                                                            <a href={isPrivacyMode ? '#' : `https://wa.me/${selectedStudent.phone.replace(/\D/g, '').replace(/^0/, '62')}`} target="_blank" rel="noreferrer"
                                                                className="text-emerald-500 hover:text-emerald-600 transition-colors text-[9px] font-black uppercase flex items-center gap-1">
                                                                Chat <FontAwesomeIcon icon={faBolt} className="text-[7px]" />
                                                            </a>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] font-black text-[var(--color-text)] tracking-wider">{isPrivacyMode ? maskInfo(selectedStudent.phone, 3) : (selectedStudent.phone || '---')}</p>
                                                    <div className="pt-1.5 border-t border-[var(--color-border)]/30">
                                                        <p className="text-[8px] text-[var(--color-text-muted)] font-bold mb-0.5">Wali: <span className="text-[var(--color-text)] font-black">{isPrivacyMode ? maskInfo(selectedStudent.guardian_name, 4) : (selectedStudent.guardian_name || '---')}</span></p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Metadata / Special Info Box */}
                                            <div className="p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10">
                                                <h4 className="text-[8px] font-black text-violet-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                                                    <FontAwesomeIcon icon={faTrophy} className="opacity-50" /> Informasi Khusus
                                                </h4>
                                                <div className="max-h-[60px] overflow-auto pr-1 space-y-2 scrollbar-none">
                                                    {selectedStudent.metadata && Object.keys(selectedStudent.metadata).length > 0 ? (
                                                        Object.entries(selectedStudent.metadata).map(([key, val]) => (
                                                            <div key={key} className="flex flex-col">
                                                                <span className="text-[7px] font-black text-violet-400 uppercase tracking-tighter">{key}</span>
                                                                <span className="text-[9px] font-bold text-[var(--color-text)] line-clamp-1">{val}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold opacity-50 italic py-2">Tidak ada catatan data khusus</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ── TAB: STATISTIK ── */}
                                    {profileTab === 'statistik' && (
                                        <div className="space-y-4">
                                            {/* Bar Chart — poin 4 bulan terakhir */}
                                            <div className="flex flex-col gap-2">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-1 flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faArrowTrendUp} className="text-indigo-500 text-[8px]" />
                                                    Tren 4 Bulan Terakhir
                                                </h3>
                                                {loadingHistory ? (
                                                    <div className="flex gap-2 items-end h-[88px] px-1">
                                                        {[60, 80, 45, 70].map((h, i) => (
                                                            <div key={i} className="flex-1 rounded-t-lg bg-[var(--color-surface-alt)] animate-pulse" style={{ height: `${h}%` }} />
                                                        ))}
                                                    </div>
                                                ) : (() => {
                                                    const months = []
                                                    for (let i = 3; i >= 0; i--) {
                                                        const d = new Date()
                                                        d.setMonth(d.getMonth() - i)
                                                        months.push({ label: d.toLocaleDateString('id-ID', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), pos: 0, neg: 0 })
                                                    }
                                                    behaviorHistory.forEach(item => {
                                                        const d = new Date(item.created_at)
                                                        const bucket = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear())
                                                        if (!bucket) return
                                                        const pts = item.points ?? 0
                                                        if (pts > 0) bucket.pos += pts
                                                        else bucket.neg += Math.abs(pts)
                                                    })
                                                    const maxVal = Math.max(...months.map(m => Math.max(m.pos, m.neg)), 1)
                                                    return (
                                                        <div className="flex gap-2 items-end h-[88px] px-1">
                                                            {months.map((m, i) => (
                                                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                                                                    <div className="w-full flex flex-col gap-0.5 items-stretch justify-end" style={{ height: '72px' }}>
                                                                        {m.pos > 0 && <div title={`+${m.pos} poin positif`} className="w-full rounded-t-[3px] bg-emerald-500/70 hover:bg-emerald-500 transition-colors cursor-help" style={{ height: `${Math.max((m.pos / maxVal) * 100, 8)}%` }} />}
                                                                        {m.neg > 0 && <div title={`-${m.neg} poin negatif`} className="w-full rounded-b-[3px] bg-red-400/70 hover:bg-red-400 transition-colors cursor-help" style={{ height: `${Math.max((m.neg / maxVal) * 100, 8)}%` }} />}
                                                                        {m.pos === 0 && m.neg === 0 && <div className="w-full rounded-[3px] bg-[var(--color-surface-alt)] opacity-40" style={{ height: '12%' }} />}
                                                                    </div>
                                                                    <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase">{m.label}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                })()}
                                                <div className="flex gap-3 px-1">
                                                    <span className="flex items-center gap-1 text-[7px] font-black text-[var(--color-text-muted)] opacity-60"><div className="w-2 h-2 rounded-sm bg-emerald-500/70" />Positif</span>
                                                    <span className="flex items-center gap-1 text-[7px] font-black text-[var(--color-text-muted)] opacity-60"><div className="w-2 h-2 rounded-sm bg-red-400/70" />Negatif</span>
                                                </div>
                                            </div>

                                            {/* Stats tiles */}
                                            {loadingHistory ? (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[1, 2, 3, 4].map(i => <div key={i} className="h-14 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />)}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { label: 'Total Laporan', value: behaviorHistory.length, color: 'text-[var(--color-text)]', bg: 'bg-[var(--color-surface-alt)]/60 border-[var(--color-border)]' },
                                                        { label: 'Total Poin', value: `${(selectedStudent.points ?? selectedStudent.total_points ?? 0) >= 0 ? '+' : ''}${selectedStudent.points ?? selectedStudent.total_points ?? 0}`, color: (selectedStudent.points ?? selectedStudent.total_points ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500', bg: 'bg-[var(--color-surface-alt)]/60 border-[var(--color-border)]' },
                                                        { label: `Positif (${timelineStats.pos}×)`, value: `+${timelineStats.totalPos}`, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                                                        { label: `Negatif (${timelineStats.neg}×)`, value: timelineStats.totalNeg || 0, color: 'text-red-500', bg: 'bg-red-500/5 border-red-500/15' },
                                                    ].map(s => (
                                                        <div key={s.label} className={`${s.bg} border rounded-xl px-3 py-2.5`}>
                                                            <p className={`text-sm font-black leading-none ${s.color}`}>{s.value}</p>
                                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] mt-1 leading-tight">{s.label}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ── TAB: LAPORAN ── */}
                                    {profileTab === 'laporan' && (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between px-1">
                                                <h3 className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                                    <FontAwesomeIcon icon={faHistory} className="text-[8px]" />
                                                    Riwayat Laporan
                                                    {!loadingHistory && behaviorHistory.length > 0 && (
                                                        <span className="text-[7px] font-bold opacity-50">({behaviorHistory.length} total)</span>
                                                    )}
                                                </h3>
                                                <div className="flex gap-0.5 bg-[var(--color-surface-alt)] rounded-lg p-0.5 border border-[var(--color-border)]">
                                                    {[{ key: 'all', label: 'Semua' }, { key: 'pos', label: '▲ Pos' }, { key: 'neg', label: '▼ Neg' }].map(tab => (
                                                        <button key={tab.key} onClick={() => { setTimelineFilter(tab.key); setTimelineVisible(8) }}
                                                            className={`px-2 py-0.5 rounded-md text-[8px] font-black transition-all
                                                            ${timelineFilter === tab.key ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                                            {tab.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/10 overflow-hidden">
                                                {loadingHistory ? (
                                                    <div className="p-3 space-y-2">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="flex gap-2.5 items-start">
                                                                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-surface-alt)] animate-pulse mt-1 shrink-0" />
                                                                <div className="flex-1 space-y-1.5">
                                                                    <div className="h-3 w-3/4 bg-[var(--color-surface-alt)] rounded animate-pulse" />
                                                                    <div className="h-2.5 w-1/2 bg-[var(--color-surface-alt)] rounded animate-pulse opacity-60" />
                                                                </div>
                                                                <div className="h-5 w-10 bg-[var(--color-surface-alt)] rounded-lg animate-pulse shrink-0" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : timelineFiltered.length === 0 ? (
                                                    <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-1.5">
                                                        <FontAwesomeIcon icon={faHistory} className="text-base" />
                                                        <p className="text-[8px] font-black uppercase">Tidak ada laporan</p>
                                                    </div>
                                                ) : (
                                                    <div className="p-3 space-y-1">
                                                        {timelineFiltered.slice(0, timelineVisible).map((item) => {
                                                            const isPos = (item.points ?? 0) >= 0
                                                            const displayDate = new Date(item.reported_at || item.created_at)
                                                            const time = displayDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                                            const dateLabel = displayDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            const reporter = item.teacher_name || null
                                                            return (
                                                                <div key={item.id} className="relative flex items-start gap-2.5 py-2 border-b border-[var(--color-border)]/40 last:border-0">
                                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${isPos ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.45)]' : 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.45)]'}`} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-[10px] font-black text-[var(--color-text)] leading-tight truncate">
                                                                            {(item.description || item.notes || 'Laporan').split('\n')[0].slice(0, 50)}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                            <span className="text-[7px] text-[var(--color-text-muted)] font-bold">{dateLabel} · {time}</span>
                                                                            {reporter && (
                                                                                <span className="text-[7px] font-black text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                                                                                    {reporter}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg
                                                                    ${isPos ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                                        {(item.points ?? 0) > 0 ? '+' : ''}{item.points ?? 0}
                                                                    </span>
                                                                </div>
                                                            )
                                                        })}
                                                        {timelineFiltered.length > timelineVisible && (
                                                            <button
                                                                onClick={() => setTimelineVisible(v => v + 10)}
                                                                className="w-full mt-1 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 rounded-lg transition-all border border-dashed border-[var(--color-border)]"
                                                            >
                                                                Lihat {Math.min(10, timelineFiltered.length - timelineVisible)} laporan lagi
                                                                <span className="opacity-50 ml-1">({timelineFiltered.length - timelineVisible} tersisa)</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── TAB: RAPORT BULANAN ── */}
                                    {profileTab === 'raport' && (() => {
                                        const BULAN_STR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
                                        const KRITERIA = [
                                            { key: 'nilai_akhlak', label: 'Akhlak', color: '#f59e0b' },
                                            { key: 'nilai_ibadah', label: 'Ibadah', color: '#6366f1' },
                                            { key: 'nilai_kebersihan', label: 'Kebersihan', color: '#06b6d4' },
                                            { key: 'nilai_quran', label: "Al-Qur'an", color: '#10b981' },
                                            { key: 'nilai_bahasa', label: 'Bahasa', color: '#8b5cf6' },
                                        ]
                                        const calcAvg = (r) => {
                                            const vals = KRITERIA.map(k => r[k.key]).filter(v => v !== null && v !== undefined && v !== '')
                                            if (!vals.length) return null
                                            return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
                                        }
                                        const gradeColor = (n) => {
                                            const v = Number(n)
                                            if (v >= 9) return '#10b981'
                                            if (v >= 8) return '#3b82f6'
                                            if (v >= 6) return '#6366f1'
                                            if (v >= 4) return '#f59e0b'
                                            return '#ef4444'
                                        }
                                        const gradeLabel = (n) => {
                                            const v = Number(n)
                                            if (v >= 9) return 'Istimewa'
                                            if (v >= 8) return 'Sangat Baik'
                                            if (v >= 6) return 'Baik'
                                            if (v >= 4) return 'Cukup'
                                            return 'Kurang'
                                        }

                                        return (
                                            <div className="space-y-3">
                                                {loadingRaport ? (
                                                    <div className="space-y-2">
                                                        {[1, 2, 3].map(i => (
                                                            <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse" />
                                                        ))}
                                                    </div>
                                                ) : raportHistory.length === 0 ? (
                                                    <div className="py-10 flex flex-col items-center justify-center opacity-30 gap-2">
                                                        <FontAwesomeIcon icon={faTableList} className="text-2xl" />
                                                        <p className="text-[9px] font-black uppercase tracking-widest">Belum ada raport bulanan</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* ── Mini trend chart (avg per bulan) ── */}
                                                        {raportHistory.length >= 2 && (() => {
                                                            const sorted = [...raportHistory].reverse() // oldest first
                                                            const avgs = sorted.map(r => Number(calcAvg(r) ?? 0))
                                                            const maxV = Math.max(...avgs, 1)
                                                            return (
                                                                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                                                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center gap-1.5">
                                                                        <FontAwesomeIcon icon={faArrowTrendUp} className="text-emerald-500" />
                                                                        Tren Rata-rata Nilai
                                                                    </p>
                                                                    <div className="flex items-end gap-1 h-14">
                                                                        {sorted.map((r, i) => {
                                                                            const avg = Number(calcAvg(r) ?? 0)
                                                                            const pct = maxV > 0 ? Math.max((avg / maxV) * 100, 8) : 8
                                                                            return (
                                                                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end" title={`${BULAN_STR[r.month]} ${r.year}: ${avg}`}>
                                                                                    <div className="w-full rounded-t-[3px] transition-all hover:brightness-110 cursor-help"
                                                                                        style={{ height: `${pct}%`, background: gradeColor(avg) + 'aa' }} />
                                                                                    <span className="text-[7px] font-black text-[var(--color-text-muted)]">{BULAN_STR[r.month]}</span>
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })()}

                                                        {/* ── Raport cards per bulan ── */}
                                                        <div className="space-y-2">
                                                            {raportHistory.map((r) => {
                                                                const avg = calcAvg(r)
                                                                const color = avg ? gradeColor(avg) : 'var(--color-text-muted)'
                                                                const totalAbsen = (r.hari_sakit || 0) + (r.hari_izin || 0) + (r.hari_alpa || 0)
                                                                return (
                                                                    <details key={r.id} className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 overflow-hidden">
                                                                        <summary className="flex items-center gap-3 p-3 cursor-pointer select-none hover:bg-[var(--color-surface-alt)]/40 transition-colors list-none">
                                                                            {/* Bulan badge */}
                                                                            <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 font-black border"
                                                                                style={{ background: color + '15', borderColor: color + '30', color }}>
                                                                                <span className="text-[9px] leading-none">{BULAN_STR[r.month]}</span>
                                                                                <span className="text-[8px] leading-none opacity-70">{r.year}</span>
                                                                            </div>
                                                                            {/* Nilai bars mini */}
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex gap-0.5 h-2 mb-1">
                                                                                    {KRITERIA.map(k => {
                                                                                        const v = r[k.key]
                                                                                        const pct = v !== null && v !== undefined && v !== '' ? (Number(v) / 9) * 100 : 0
                                                                                        return (
                                                                                            <div key={k.key} className="flex-1 rounded-full bg-[var(--color-border)] overflow-hidden" title={`${k.label}: ${v ?? '—'}`}>
                                                                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: k.color }} />
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold truncate">
                                                                                    {r.musyrif_name || 'Musyrif tidak dicatat'}
                                                                                    {totalAbsen > 0 && <span className="ml-2 text-amber-500">· {totalAbsen} hari absen</span>}
                                                                                </p>
                                                                            </div>
                                                                            {/* Avg badge */}
                                                                            <div className="shrink-0 text-right">
                                                                                {avg ? (
                                                                                    <>
                                                                                        <p className="text-sm font-black leading-none" style={{ color }}>{avg}</p>
                                                                                        <p className="text-[7px] font-bold" style={{ color }}>{gradeLabel(avg)}</p>
                                                                                    </>
                                                                                ) : (
                                                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold">—</p>
                                                                                )}
                                                                            </div>
                                                                            <FontAwesomeIcon icon={faChevronDown} className="text-[9px] text-[var(--color-text-muted)] group-open:rotate-180 transition-transform shrink-0" />
                                                                        </summary>

                                                                        {/* Expanded detail */}
                                                                        <div className="px-3 pb-3 pt-1 border-t border-[var(--color-border)]/50">
                                                                            <div className="grid grid-cols-5 gap-2 mb-3">
                                                                                {KRITERIA.map(k => {
                                                                                    const v = r[k.key]
                                                                                    const hasVal = v !== null && v !== undefined && v !== ''
                                                                                    return (
                                                                                        <div key={k.key} className="flex flex-col items-center gap-1 p-2 rounded-lg border"
                                                                                            style={{ background: hasVal ? k.color + '10' : 'transparent', borderColor: hasVal ? k.color + '30' : 'var(--color-border)' }}>
                                                                                            <span className="text-base font-black leading-none" style={{ color: hasVal ? k.color : 'var(--color-text-muted)' }}>
                                                                                                {hasVal ? v : '—'}
                                                                                            </span>
                                                                                            <span className="text-[7px] font-black text-center leading-tight" style={{ color: hasVal ? k.color : 'var(--color-text-muted)' }}>
                                                                                                {k.label}
                                                                                            </span>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                            </div>
                                                                            {/* Absensi & fisik */}
                                                                            <div className="grid grid-cols-4 gap-2 text-center">
                                                                                {[
                                                                                    { label: 'Sakit', val: r.hari_sakit, color: 'text-red-400' },
                                                                                    { label: 'Izin', val: r.hari_izin, color: 'text-amber-400' },
                                                                                    { label: 'Alpa', val: r.hari_alpa, color: 'text-red-600' },
                                                                                    { label: 'Pulang', val: r.hari_pulang, color: 'text-blue-400' },
                                                                                ].map(item => (
                                                                                    <div key={item.label} className="p-1.5 rounded-lg bg-[var(--color-surface-alt)]/60 border border-[var(--color-border)]">
                                                                                        <p className={`text-sm font-black ${item.color}`}>{item.val ?? 0}</p>
                                                                                        <p className="text-[7px] text-[var(--color-text-muted)] font-bold uppercase">{item.label}</p>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            {/* BB/TB & catatan */}
                                                                            {(r.berat_badan || r.tinggi_badan || r.catatan) && (
                                                                                <div className="mt-2 flex flex-wrap gap-2">
                                                                                    {r.berat_badan && <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg border border-[var(--color-border)]">⚖ {r.berat_badan} kg</span>}
                                                                                    {r.tinggi_badan && <span className="text-[9px] font-bold text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-2 py-1 rounded-lg border border-[var(--color-border)]">📏 {r.tinggi_badan} cm</span>}
                                                                                    {r.catatan && <span className="text-[9px] font-medium text-[var(--color-text-muted)] italic">"{r.catatan}"</span>}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </details>
                                                                )
                                                            })}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* Footer Actions */}
                                    <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-[var(--color-border)]">
                                        <button
                                            onClick={() => {
                                                setStudentForTags(selectedStudent)
                                                setIsTagModalOpen(true)
                                            }}
                                            className="h-8 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                        >
                                            <FontAwesomeIcon icon={faTags} /> Label
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsProfileModalOpen(false)
                                                handleEdit(selectedStudent)
                                            }}
                                            className="h-8 px-3 rounded-lg border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"
                                        >
                                            <FontAwesomeIcon icon={faEdit} /> Edit
                                        </button>
                                        <button
                                            onClick={() => setIsProfileModalOpen(false)}
                                            className="h-8 px-4 rounded-lg bg-gray-900 text-white text-[9px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    )
                }



                {/* Bulk Promote Modal */}
                {
                    isBulkModalOpen && (
                        <Modal
                            isOpen={isBulkModalOpen}
                            onClose={() => setIsBulkModalOpen(false)}
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
                                    <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black h-11 text-[10px] uppercase tracking-widest rounded-[1rem] transition-all">
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
                        </Modal >
                    )
                }

                {/* Delete (Arsip) Modal */}
                {
                    isDeleteModalOpen && (
                        <Modal
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
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
                                    <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                                        BATAL
                                    </button>
                                    <button type="button" onClick={executeDelete} className="btn bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-lg shadow-amber-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                                        ARSIPKAN
                                    </button>
                                </div>
                            </div>
                        </Modal >
                    )
                }
                {
                    isBulkWAModalOpen && (
                        <Modal
                            isOpen={isBulkWAModalOpen}
                            onClose={() => setIsBulkWAModalOpen(false)}
                            title="Kirim WA ke Wali Murid"
                            size="md"
                        >
                            {(() => {
                                const targets = students.filter(s => selectedStudentIds.includes(s.id))
                                const withPhone = targets.filter(s => s.phone)
                                const noPhone = targets.filter(s => !s.phone)
                                return (
                                    <div className="space-y-4">
                                        <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-3">
                                            <FontAwesomeIcon icon={faWhatsapp} className="text-green-600 text-xl shrink-0" />
                                            <div>
                                                <p className="text-xs font-black text-green-700 dark:text-green-400">{withPhone.length} siswa siap dikirim</p>
                                                {noPhone.length > 0 && <p className="text-[10px] text-[var(--color-text-muted)]">{noPhone.length} siswa tidak punya nomor WA</p>}
                                            </div>
                                        </div>

                                        {/* Fitur 11 - Template WA customizable */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">
                                                Template Pesan <span className="normal-case font-normal opacity-60">({'{nama}'} {'{kelas}'} {'{poin}'} {'{kode}'} {'{pin}'})</span>
                                            </label>
                                            <textarea
                                                value={waTemplate}
                                                onChange={e => setWaTemplate(e.target.value)}
                                                rows={3}
                                                className="input-field w-full text-xs rounded-xl border-[var(--color-border)] bg-transparent resize-none p-3"
                                                placeholder="Template pesan WA..."
                                            />
                                            {withPhone.length > 0 && (
                                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 italic">
                                                    Preview: {buildWAMessage(withPhone[0], waTemplate).slice(0, 80)}...
                                                </p>
                                            )}
                                        </div>

                                        <div className="max-h-40 overflow-auto space-y-1 border border-[var(--color-border)] rounded-xl p-3">
                                            {withPhone.map(s => (
                                                <div key={s.id} className="flex items-center justify-between py-1 text-xs">
                                                    <span className="font-bold text-[var(--color-text)]">{s.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[var(--color-text-muted)]">{s.phone}</span>
                                                        <button
                                                            onClick={() => openWAForStudent(s, buildWAMessage(s, waTemplate))}
                                                            className="h-6 px-2 rounded-md bg-green-500/10 text-green-600 text-[10px] font-black hover:bg-green-500/20 transition"
                                                        >
                                                            Kirim
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {noPhone.map(s => (
                                                <div key={s.id} className="flex items-center justify-between py-1 text-xs opacity-40">
                                                    <span className="font-bold">{s.name}</span>
                                                    <span className="text-[10px]">Tidak ada nomor</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => {
                                                    withPhone.forEach((s, i) => {
                                                        setTimeout(() => openWAForStudent(s, buildWAMessage(s, waTemplate)), i * 800)
                                                    })
                                                    addToast(`Membuka ${withPhone.length} chat WA...`, 'success')
                                                }}
                                                disabled={!withPhone.length}
                                                className="btn bg-green-500 hover:bg-green-600 text-white flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-40"
                                            >
                                                <FontAwesomeIcon icon={faBullhorn} className="mr-2" />
                                                Kirim Semua ({withPhone.length})
                                            </button>
                                            <button onClick={() => setIsBulkWAModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-10 px-5 text-[10px] font-black uppercase rounded-xl">
                                                Tutup
                                            </button>
                                        </div>
                                    </div>
                                )
                            })()}
                        </Modal>
                    )
                }

                {/* Bulk Delete Modal */}
                {
                    isBulkDeleteModalOpen && (
                        <Modal
                            isOpen={isBulkDeleteModalOpen}
                            onClose={() => setIsBulkDeleteModalOpen(false)}
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
                                    <button type="button" onClick={() => setIsBulkDeleteModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
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
                    isArchivedModalOpen && (
                        <Modal
                            isOpen={isArchivedModalOpen}
                            onClose={() => setIsArchivedModalOpen(false)}
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
                                    <button onClick={() => setIsArchivedModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Modal Riwayat Kelas */}
                {
                    isClassHistoryModalOpen && (
                        <Modal
                            isOpen={isClassHistoryModalOpen}
                            onClose={() => setIsClassHistoryModalOpen(false)}
                            title={`Riwayat Kelas — ${selectedStudent?.name || ''}`}
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
                                                        <span className="text-[var(--color-text-muted)] opacity-50">→</span>
                                                        <span className="text-[var(--color-text)]">{h.to_class?.name || 'Tidak diketahui'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{h.note || '-'} · {formatRelativeDate(h.changed_at)}</p>
                                                </div>
                                                <span className="text-[10px] text-[var(--color-text-muted)] shrink-0">{new Date(h.changed_at).toLocaleDateString('id-ID')}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button onClick={() => setIsClassHistoryModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    )
                }

                {/* Fitur 1 - Class Breakdown Modal */}
                {
                    isClassBreakdownOpen && (
                        <Modal
                            isOpen={isClassBreakdownOpen}
                            onClose={() => setIsClassBreakdownOpen(false)}
                            title={`Statistik Kelas — ${classBreakdownData?.className || ''}`}
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
                                            <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Siswa Risiko (≤ {RiskThreshold})</p>
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
                                        <button onClick={() => { setIsClassBreakdownOpen(false); setFilterClass(''); const cls = classesList.find(c => c.name === classBreakdownData.className); if (cls) setFilterClass(cls.id) }}
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
                    isResetPointsModalOpen && (
                        <Modal
                            isOpen={isResetPointsModalOpen}
                            onClose={() => setIsResetPointsModalOpen(false)}
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
                                    ⚠ Tindakan ini tidak bisa dibatalkan. Semua poin akan direset ke 0.
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsResetPointsModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl">Batal</button>
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
                    isTagModalOpen && (
                        <Modal
                            isOpen={isTagModalOpen}
                            onClose={() => setIsTagModalOpen(false)}
                            title={`Kelola Label — ${studentForTags?.name || ''}`}
                            size="sm"
                        >
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
                                                <span className="text-[9px] font-black bg-white/10 px-2 py-1 rounded border border-white/20 text-[var(--color-text-muted)]">ENTER ↵</span>
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

                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={() => setIsTagModalOpen(false)}
                                            className="h-10 px-6 bg-gray-900 dark:bg-gray-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-90 transition-all active:scale-95"
                                        >
                                            Selesai
                                        </button>
                                    </div>
                                </div>
                            )}
                        </Modal>
                    )
                }

                {/* Fitur 12 - Google Sheets Import Modal */}
                {
                    isGSheetsModalOpen && (
                        <Modal
                            isOpen={isGSheetsModalOpen}
                            onClose={() => setIsGSheetsModalOpen(false)}
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
                                    <button onClick={() => setIsGSheetsModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-xs font-bold rounded-xl text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors">Batal</button>
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
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[95%] max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-500">
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
                                        onClick={() => setIsBulkTagModalOpen(true)}
                                        className="h-10 px-4 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faTags} className="text-base" />
                                        <span className="hidden md:inline">Beri Label</span>
                                    </button>

                                    <button
                                        onClick={() => setIsBulkModalOpen(true)}
                                        className="h-10 px-4 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-300 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                    >
                                        <FontAwesomeIcon icon={faGraduationCap} className="text-base" />
                                        <span className="hidden md:inline">Naik Kelas</span>
                                    </button>

                                    <button
                                        onClick={() => setIsBulkPointModalOpen(true)}
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
                    isBulkTagModalOpen && (
                        <Modal
                            isOpen={isBulkTagModalOpen}
                            onClose={() => setIsBulkTagModalOpen(false)}
                            title={`Aksi Label Massal — ${selectedStudentIds.length} Siswa`}
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
                                        onClick={() => setIsBulkTagModalOpen(false)}
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
                    isBulkPointModalOpen && (
                        <Modal
                            isOpen={isBulkPointModalOpen}
                            onClose={() => setIsBulkPointModalOpen(false)}
                            title={`Aksi Poin Massal — ${selectedStudentIds.length} Siswa`}
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
                                        onClick={() => setIsBulkPointModalOpen(false)}
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