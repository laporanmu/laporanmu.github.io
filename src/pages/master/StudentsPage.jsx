import React from 'react'
import { useState, useRef, useEffect, useCallback, memo, useMemo, useDeferredValue } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../../components/layout/DashboardLayout'
import { useToast } from '../../context/ToastContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'

// NOTE(perf): library import/export di-load on-demand via dynamic import
// NOTE(perf): jsPDF/html2canvas/qrcode/autotable di-load on-demand via dynamic import

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

import StudentsHeader from './students/StudentsHeader'

const LazyQRCodeCanvas = React.lazy(() =>
    import('qrcode.react').then((m) => ({ default: m.QRCodeCanvas }))
)

// Components
import { StatsRow } from './students/components/StatsRow'
import InsightRow from './students/components/InsightRow'
import { FilterSection } from './students/components/FilterSection'
import { BulkActionBar } from './students/components/BulkActionBar'
import ShortcutCheatsheet from './students/components/ShortcutCheatsheet'
import { StudentsTable } from './students/components/StudentsTable'
import { ModalsSection } from './students/components/ModalsSection'
import { StatusBanners } from './students/components/StatusBanners'

// ── BehaviorHeatmap — outside StudentsPage to prevent re-creation on every render ──
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

    const selectedIdSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds])
    const selectedStudents = useMemo(() => {
        if (!selectedStudentIds.length) return []
        return students.filter((s) => selectedIdSet.has(s.id))
    }, [students, selectedIdSet, selectedStudentIds.length])
    const selectedStudentsWithPhone = useMemo(() => selectedStudents.filter((s) => s.phone), [selectedStudents])

    // Mobile bottom-nav overlap guard (floating bulk bar / quick add)
    const MOBILE_BOTTOM_NAV_PX = 72
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

    const handleExportFiltered = async () => {
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
        const targets = selectedStudentsWithPhone
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
        const targets = selectedStudents
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
            const { QRCodeCanvas } = await import('qrcode.react')
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
            const [{ QRCodeCanvas }, { default: html2canvas }] = await Promise.all([
                import('qrcode.react'),
                import('html2canvas'),
            ])
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
            const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
                import('jspdf'),
                import('html2canvas'),
            ])
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

                <StatusBanners
                    isPrivacyMode={isPrivacyMode}
                    setIsPrivacyMode={setIsPrivacyMode}
                    canEdit={canEdit}
                />

                {/* Header */}
                <StudentsHeader
                    globalStats={globalStats}
                    isPrivacyMode={isPrivacyMode}
                    setIsPrivacyMode={setIsPrivacyMode}
                    isHeaderMenuOpen={isHeaderMenuOpen}
                    setIsHeaderMenuOpen={setIsHeaderMenuOpen}
                    headerMenuRef={headerMenuRef}
                    handleImportClick={handleImportClick}
                    setIsGSheetsModalOpen={setIsGSheetsModalOpen}
                    setIsExportModalOpen={setIsExportModalOpen}
                    setIsBulkPhotoModalOpen={setIsBulkPhotoModalOpen}
                    fetchArchivedStudents={fetchArchivedStudents}
                    setIsArchivedModalOpen={setIsArchivedModalOpen}
                    setResetPointsClassId={setResetPointsClassId}
                    setIsResetPointsModalOpen={setIsResetPointsModalOpen}
                    isShortcutOpen={isShortcutOpen}
                    setIsShortcutOpen={setIsShortcutOpen}
                    shortcutRef={shortcutRef}
                    handleAdd={handleAdd}
                    canEdit={canEdit}
                />

                <ShortcutCheatsheet isOpen={isShortcutOpen} />

                {/* Stats Row */}
                <StatsRow
                    globalStats={globalStats}
                    setFilterClass={setFilterClass}
                    setFilterPointMode={setFilterPointMode}
                />

                {/* Insight Row */}
                <InsightRow
                    globalStats={globalStats}
                    filterPointMode={filterPointMode}
                    setFilterPointMode={setFilterPointMode}
                    filterMissing={filterMissing}
                    setFilterMissing={setFilterMissing}
                    setShowAdvancedFilter={setShowAdvancedFilter}
                    filterClass={filterClass}
                    setFilterClass={setFilterClass}
                    setFilterClasses={setFilterClasses}
                    setPage={setPage}
                />
                {/* ── END INSIGHT ROW ──────────────────────────────────────────── */}

                {/* Filters & Sort */}
                <FilterSection
                    searchInputRef={searchInputRef}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showAdvancedFilter={showAdvancedFilter}
                    setShowAdvancedFilter={setShowAdvancedFilter}
                    activeFilterCount={activeFilterCount}
                    resetAllFilters={resetAllFilters}
                    filterClass={filterClass}
                    setFilterClass={setFilterClass}
                    setFilterClasses={setFilterClasses}
                    setPage={setPage}
                    classesList={classesList}
                    filterGender={filterGender}
                    setFilterGender={setFilterGender}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterTag={filterTag}
                    setFilterTag={setFilterTag}
                    AvailableTags={AvailableTags}
                    allUsedTags={allUsedTags}
                    tagStats={tagStats}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    SortOptions={SortOptions}
                    filterPointMin={filterPointMin}
                    setFilterPointMin={setFilterPointMin}
                    filterPointMax={filterPointMax}
                    setFilterPointMax={setFilterPointMax}
                    filterPointMode={filterPointMode}
                    setFilterPointMode={setFilterPointMode}
                    filterMissing={filterMissing}
                    setFilterMissing={setFilterMissing}
                    onExportFilter={handleExportFiltered}
                />

                {/* Students Table (loading skeleton / table / mobile cards / empty states / inline add / pagination) */}
                <StudentsTable
                    students={students}
                    loading={loading}
                    classesList={classesList}
                    lastReportMap={lastReportMap}
                    selectedStudentIds={selectedStudentIds}
                    selectedIdSet={selectedIdSet}
                    toggleSelectAll={toggleSelectAll}
                    toggleSelectStudent={toggleSelectStudent}
                    visibleColumns={visibleColumns}
                    toggleColumn={toggleColumn}
                    isColMenuOpen={isColMenuOpen}
                    setIsColMenuOpen={setIsColMenuOpen}
                    colMenuPos={colMenuPos}
                    setColMenuPos={setColMenuPos}
                    colMenuRef={colMenuRef}
                    handleEdit={handleEdit}
                    handleViewProfile={handleViewProfile}
                    handleViewQR={handleViewQR}
                    handleViewPrint={handleViewPrint}
                    handleViewClassHistory={handleViewClassHistory}
                    confirmDelete={confirmDelete}
                    handleClassBreakdown={handleClassBreakdown}
                    handleQuickPoint={handleQuickPoint}
                    handleInlineUpdate={handleInlineUpdate}
                    handleTogglePin={handleTogglePin}
                    setStudentForTags={setStudentForTags}
                    setIsTagModalOpen={setIsTagModalOpen}
                    setPhotoZoom={setPhotoZoom}
                    isInlineAddOpen={isInlineAddOpen}
                    setIsInlineAddOpen={setIsInlineAddOpen}
                    inlineForm={inlineForm}
                    setInlineForm={setInlineForm}
                    handleInlineSubmit={handleInlineSubmit}
                    submittingInline={submittingInline}
                    isPrivacyMode={isPrivacyMode}
                    resetAllFilters={resetAllFilters}
                    formatRelativeDate={formatRelativeDate}
                    RiskThreshold={RiskThreshold}
                    canEdit={canEdit}
                    page={page}
                    totalPages={totalPages}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalRows={totalRows}
                    fromRow={fromRow}
                    toRow={toRow}
                    getPageItems={getPageItems}
                />

                {/* CSS Print Styles */}
                <style dangerouslySetInnerHTML={{
                    __html: `
                @media print {
                    body > *:not(#portal-root) { position: absolute !important; left: -9999px !important; visibility: hidden !important; }
                    #portal-root { display: block !important; position: static !important; visibility: visible !important; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .modal-overlay { position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: white !important; display: block !important; visibility: visible !important; z-index: 9999999 !important; padding: 0 !important; margin: 0 !important; backdrop-filter: none !important; }
                    .modal-content { position: relative !important; top: 0 !important; left: 0 !important; width: 100% !important; max-width: none !important; height: auto !important; box-shadow: none !important; border: none !important; padding: 20mm 0 !important; margin: 0 !important; display: block !important; visibility: visible !important; background: white !important; }
                    .modal-content > div:first-child, .no-print, button { display: none !important; visibility: hidden !important; }
                    #printable-cards { display: flex !important; flex-direction: row !important; gap: 15mm !important; justify-content: center !important; align-items: center !important; visibility: visible !important; opacity: 1 !important; transform: none !important; scale: 1 !important; margin: 0 auto !important; }
                    #printable-cards * { visibility: visible !important; }
                    @page { size: landscape; margin: 0; }
                }
            `}} />

                {/* Floating Bulk Action Bar */}
                <BulkActionBar
                    selectedStudentIds={selectedStudentIds}
                    setSelectedStudentIds={setSelectedStudentIds}
                    handleBulkWA={handleBulkWA}
                    handleBulkPrint={handleBulkPrint}
                    setIsBulkTagModalOpen={setIsBulkTagModalOpen}
                    setIsBulkModalOpen={setIsBulkModalOpen}
                    setIsBulkPointModalOpen={setIsBulkPointModalOpen}
                />

                {/* All Modals */}
                <ModalsSection
                    isImportModalOpen={isImportModalOpen}
                    setIsImportModalOpen={setIsImportModalOpen}
                    importing={importing}
                    importStep={importStep}
                    setImportStep={setImportStep}
                    importPreview={importPreview}
                    importDuplicates={importDuplicates}
                    importFileName={importFileName}
                    setImportFileName={setImportFileName}
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
                    isBulkPhotoModalOpen={isBulkPhotoModalOpen}
                    setIsBulkPhotoModalOpen={setIsBulkPhotoModalOpen}
                    matchingPhotos={matchingPhotos}
                    handleBulkPhotoMatch={handleBulkPhotoMatch}
                    bulkPhotoMatches={bulkPhotoMatches}
                    uploadingBulkPhotos={uploadingBulkPhotos}
                    handleBulkPhotoUpload={handleBulkPhotoUpload}
                    isBulkWAModalOpen={isBulkWAModalOpen}
                    setIsBulkWAModalOpen={setIsBulkWAModalOpen}
                    selectedStudentsWithPhone={selectedStudentsWithPhone}
                    broadcastTemplate={broadcastTemplate}
                    setBroadcastTemplate={setBroadcastTemplate}
                    customWaMsg={customWaMsg}
                    setCustomWaMsg={setCustomWaMsg}
                    broadcastIndex={broadcastIndex}
                    setBroadcastIndex={setBroadcastIndex}
                    buildWAMessage={buildWAMessage}
                    openWAForStudent={openWAForStudent}
                    isExportModalOpen={isExportModalOpen}
                    setIsExportModalOpen={setIsExportModalOpen}
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
                    isModalOpen={isModalOpen}
                    setIsModalOpen={setIsModalOpen}
                    selectedStudent={selectedStudent}
                    handleSubmit={handleSubmit}
                    submitting={submitting}
                    handlePhotoUpload={handlePhotoUpload}
                    uploadingPhoto={uploadingPhoto}
                    isPrintModalOpen={isPrintModalOpen}
                    setIsPrintModalOpen={setIsPrintModalOpen}
                    newlyCreatedStudent={newlyCreatedStudent}
                    setNewlyCreatedStudent={setNewlyCreatedStudent}
                    isPrivacyMode={isPrivacyMode}
                    maskInfo={maskInfo}
                    cardCaptureRef={cardCaptureRef}
                    waTemplate={waTemplate}
                    handleResetPin={handleResetPin}
                    resettingPin={resettingPin}
                    generatingPdf={generatingPdf}
                    handlePrintSingle={handlePrintSingle}
                    handleSavePNG={handleSavePNG}
                    handlePrintThermal={handlePrintThermal}
                    isProfileModalOpen={isProfileModalOpen}
                    setIsProfileModalOpen={setIsProfileModalOpen}
                    calculateCompleteness={calculateCompleteness}
                    behaviorHistory={behaviorHistory}
                    loadingHistory={loadingHistory}
                    RiskThreshold={RiskThreshold}
                    canEdit={canEdit}
                    handleEdit={handleEdit}
                    handleViewQR={handleViewQR}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                    timelineStats={timelineStats}
                    timelineFilter={timelineFilter}
                    setTimelineFilter={setTimelineFilter}
                    timelineVisible={timelineVisible}
                    setTimelineVisible={setTimelineVisible}
                    timelineFiltered={timelineFiltered}
                    raportHistory={raportHistory}
                    loadingRaport={loadingRaport}
                    isBulkModalOpen={isBulkModalOpen}
                    setIsBulkModalOpen={setIsBulkModalOpen}
                    bulkClassId={bulkClassId}
                    setBulkClassId={setBulkClassId}
                    handleBulkPromote={handleBulkPromote}
                    isDeleteModalOpen={isDeleteModalOpen}
                    setIsDeleteModalOpen={setIsDeleteModalOpen}
                    studentToDelete={studentToDelete}
                    executeDelete={executeDelete}
                    isBulkDeleteModalOpen={isBulkDeleteModalOpen}
                    setIsBulkDeleteModalOpen={setIsBulkDeleteModalOpen}
                    handleBulkDelete={handleBulkDelete}
                    isArchivedModalOpen={isArchivedModalOpen}
                    setIsArchivedModalOpen={setIsArchivedModalOpen}
                    archivedStudents={archivedStudents}
                    loadingArchived={loadingArchived}
                    archivePage={archivePage}
                    setArchivePage={setArchivePage}
                    archivePageSize={archivePageSize}
                    formatRelativeDate={formatRelativeDate}
                    handleRestoreStudent={handleRestoreStudent}
                    handlePermanentDelete={handlePermanentDelete}
                    isClassHistoryModalOpen={isClassHistoryModalOpen}
                    setIsClassHistoryModalOpen={setIsClassHistoryModalOpen}
                    classHistory={classHistory}
                    loadingClassHistory={loadingClassHistory}
                    isClassBreakdownOpen={isClassBreakdownOpen}
                    setIsClassBreakdownOpen={setIsClassBreakdownOpen}
                    classBreakdownData={classBreakdownData}
                    loadingBreakdown={loadingBreakdown}
                    setFilterClass={setFilterClass}
                    isResetPointsModalOpen={isResetPointsModalOpen}
                    setIsResetPointsModalOpen={setIsResetPointsModalOpen}
                    resetPointsClassId={resetPointsClassId}
                    setResetPointsClassId={setResetPointsClassId}
                    handleBatchResetPoints={handleBatchResetPoints}
                    resettingPoints={resettingPoints}
                    isTagModalOpen={isTagModalOpen}
                    setIsTagModalOpen={setIsTagModalOpen}
                    studentForTags={studentForTags}
                    newTagInput={newTagInput}
                    setNewTagInput={setNewTagInput}
                    handleAddCustomTag={handleAddCustomTag}
                    handleToggleTag={handleToggleTag}
                    getTagColor={getTagColor}
                    AvailableTags={AvailableTags}
                    allUsedTags={allUsedTags}
                    tagToEdit={tagToEdit}
                    setTagToEdit={setTagToEdit}
                    renameInput={renameInput}
                    setRenameInput={setRenameInput}
                    handleGlobalRenameTag={handleGlobalRenameTag}
                    handleGlobalDeleteTag={handleGlobalDeleteTag}
                    isGSheetsModalOpen={isGSheetsModalOpen}
                    setIsGSheetsModalOpen={setIsGSheetsModalOpen}
                    gSheetsUrl={gSheetsUrl}
                    setGSheetsUrl={setGSheetsUrl}
                    fetchingGSheets={fetchingGSheets}
                    handleFetchGSheets={handleFetchGSheets}
                    photoZoom={photoZoom}
                    setPhotoZoom={setPhotoZoom}
                    isBulkTagModalOpen={isBulkTagModalOpen}
                    setIsBulkTagModalOpen={setIsBulkTagModalOpen}
                    bulkTagAction={bulkTagAction}
                    setBulkTagAction={setBulkTagAction}
                    handleBulkTagApply={handleBulkTagApply}
                    isBulkPointModalOpen={isBulkPointModalOpen}
                    setIsBulkPointModalOpen={setIsBulkPointModalOpen}
                    bulkPointValue={bulkPointValue}
                    setBulkPointValue={setBulkPointValue}
                    bulkPointLabel={bulkPointLabel}
                    setBulkPointLabel={setBulkPointLabel}
                    handleBulkPointUpdate={handleBulkPointUpdate}
                />
            </div>
        </DashboardLayout >
    )
}