import { Fragment, useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faLock, faCalendarAlt, faChevronLeft, faChevronRight,
    faPrint, faCheck, faSpinner, faFloppyDisk,
    faChartPie, faTableList, faMagnifyingGlass, faArrowLeft, faDownload,
    faCircleCheck, faCircleExclamation, faTriangleExclamation,
    faBolt, faXmark, faSchool, faClipboardList, faUsers,
    faMosque, faBookOpen, faBroom, faLanguage, faStar,
    faWeightScale, faRulerVertical, faBandage, faDoorOpen,
    faCloudArrowUp, faFileLines, faFilePdf, faFileZipper, faBoxArchive,
    faSearch, faSliders, faPlus, faFilter, faFillDrip, faArrowTrendUp, faArrowTrendDown, faFileExport,
    faQuestion, faCircleInfo, faSortAmountDown, faWifi, faKeyboard, faLightbulb,
    faMoon, faSun, faExpand, faCompress, faChevronDown, faFileImport
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import PageHeader from '../../components/ui/PageHeader'
import { StatCard, EmptyState } from '../../components/ui/DataDisplay'
import Modal from '../../components/ui/Modal'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import { useToast } from '../../context/ToastContext'
import { useSchoolSettings } from '../../context/SchoolSettingsContext'
import { useAuth } from '../../context/AuthContext'
import { useFlag } from '../../context/FeatureFlagsContext'

// Raport Components & Utils
import {
    MAX_SCORE, STORAGE_BUCKET, KRITERIA, GRADE, calcAvg, LABEL, toArabicNum,
    FISIK_FIELDS, HAFALAN_FIELDS, BULAN, CATATAN_TEMPLATES
} from './utils/raportConstants'
import {
    isComplete, buildWaLines, escapeCsvCell, generateAutoComment
} from './utils/raportHelpers'
import { translitToAr, translitClassToAr, loadTranslitData } from './utils/translitData'
import { RadarChart, SparklineTrend } from './components/RaportCharts'
import RaportPrintCard from './components/RaportPrintCard'
import StudentRow, { ExtraInput, ExtraTextarea } from './components/RaportRecordRow'
import BulkActionBar from './components/BulkActionBar'
import { ShortcutModalContent, TutorialModalContent, WaBlastConfirmContent, WaBlastProgressContent } from './components/RaportModals'
import StatsCarousel from '../../components/StatsCarousel'

// ─── Constants ───────────────────────────────────────────────────────────────

const ROW_HEIGHT = 188
const OVERSCAN = 5

// ─── Sub-components ──────────────────────────────────────────────────────────

const ClassCardSkeleton = () => (
    <div className="p-4 rounded-[2rem] border border-[var(--color-border)] bg-[var(--color-surface-alt)] animate-pulse">
        <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-border)]" />
            <div className="w-16 h-5 rounded-lg bg-[var(--color-border)] opacity-60" />
        </div>
        <div className="h-5 w-3/4 bg-[var(--color-border)] rounded-lg mb-2" />
        <div className="h-3 w-1/2 bg-[var(--color-border)] rounded-md opacity-40" />
    </div>
)



// ─── Main Page ────────────────────────────────────────────────────────────────

function getPortalContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}

export default function RaportPage() {
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
    const { profile } = useAuth()
    // FIX #10: now sebagai ref agar tidak berubah setiap render
    const now = useRef(new Date()).current

    const ALLOWED_ROLES = ['admin', 'guru', 'developer']
    const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

    // access.teacher_raport flag — kalau off, guru jadi read-only
    const { enabled: teacherRaportEnabled } = useFlag('access.teacher_raport')
    const canEdit = profile?.role === 'guru' ? teacherRaportEnabled : true

    // ── Page-level state
    const [classesList, setClassesList] = useState([])
    const [pageLoading, setPageLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterType, setFilterType] = useState('all') // all, boarding, regular
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [stats, setStats] = useState({ totalKelas: 0, totalSiswa: 0, totalRaport: 0, bulanIni: now.getMonth() + 1 })
    const [classProgress, setClassProgress] = useState({})
    const [showAllIncompleteBanner, setShowAllIncompleteBanner] = useState(false)

    // ── Step state (0 = daftar kelas, 1 = setup, 2 = input, 3 = preview, 4 = arsip)
    const [step, setStep] = useState(0)

    // ── Setup state
    const [selectedClassId, setSelectedClassId] = useState('')
    const [homeroomTeacherName, setHomeroomTeacherName] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [musyrif, setMusyrif] = useState('')
    const [lang, setLang] = useState('ar')

    // ── Data state
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [transliterating, setTransliterating] = useState(false)
    const [scores, setScoresRaw] = useState({})
    // ── Undo-aware wrapper — push ke history setiap kali scores berubah dari user
    // Ref mutations dijadwalkan via Promise.resolve() agar tidak ter-double di StrictMode
    const setScores = useCallback((updater) => {
        setScoresRaw(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            const hist = scoresHistoryRef.current
            const idx = scoresHistoryIdxRef.current
            // Potong redo-branch jika ada
            const newHist = hist.slice(0, idx + 1)
            newHist.push(JSON.parse(JSON.stringify(next)))
            if (newHist.length > 30) newHist.shift()
            // Jadwalkan setelah render commit — aman dari StrictMode double-invoke
            Promise.resolve().then(() => {
                scoresHistoryRef.current = newHist
                scoresHistoryIdxRef.current = newHist.length - 1
            })
            return next
        })
    }, [])
    const [extras, setExtras] = useState({})
    const [saving, setSaving] = useState({})
    const [savedIds, setSavedIds] = useState(new Set())
    const [existingReportIds, setExistingReportIds] = useState({})
    const [savingAll, setSavingAll] = useState(false)
    const [copyingLastMonth, setCopyingLastMonth] = useState(false)
    const [studentSearch, setStudentSearch] = useState('')

    // ── Archive state
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [archiveList, setArchiveList] = useState([])
    const [archiveFilter, setArchiveFilter] = useState({ classId: '', year: '', month: '' })
    const [archiveSearch, setArchiveSearch] = useState('')
    const [archiveSort, setArchiveSort] = useState('newest')
    const [archiveStatusFilter, setArchiveStatusFilter] = useState('all')
    const [archiveMinAvg, setArchiveMinAvg] = useState('')   // filter rata-rata < X
    const [archivePreview, setArchivePreview] = useState(null)
    const [studentTrend, setStudentTrend] = useState({})
    const [trendModal, setTrendModal] = useState(null) // { student, trendData }

    // ── Archive inline edit state
    const [archiveEditMode, setArchiveEditMode] = useState(false)
    const [archiveEditScores, setArchiveEditScores] = useState({})
    const [archiveEditExtras, setArchiveEditExtras] = useState({})
    const [archiveEditSaving, setArchiveEditSaving] = useState(false)

    // ── Archive tab (list | ringkasan)
    const [archiveTab, setArchiveTab] = useState('list')

    // ── Mobile card — show one at a time with swipe nav
    const [mobileActiveIdx, setMobileActiveIdx] = useState(0)
    // FIX: mobileSwipeRef dihapus (dead code) — swipe pakai _touchStartX lokal di render

    // ── Student detail drawer (full history timeline)
    const [studentDetailDrawer, setStudentDetailDrawer] = useState(null) // null | { student, history: [{month,year,scores}] }
    const [studentDetailLoading, setStudentDetailLoading] = useState(false)

    // ── Bulk ZIP export
    const [zipBlast, setZipBlast] = useState(null) // null | { queue, idx, done, failed, active }

    // ── Offline draft
    const [draftAvailable, setDraftAvailable] = useState(false)
    // FIX: guard navigator.onLine agar tidak throw di SSR / browser extension
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

    // ── Modals
    const [showShortcutModal, setShowShortcutModal] = useState(false)
    const [shortcutRect, setShortcutRect] = useState(null)
    const shortcutBtnRef = useRef(null)
    const [showTutorialModal, setShowTutorialModal] = useState(false)
    const [tutorialStep, setTutorialStep] = useState(0)
    const [tutorialZoomImg, setTutorialZoomImg] = useState(null)
    const [tutorialImgs, setTutorialImgs] = useState([null, null, null, null, null, null, null])

    useEffect(() => {
        if (!showTutorialModal) return
        Promise.all([
            import('../../assets/Tutorial_1.png'),
            import('../../assets/Tutorial_2.png'),
            import('../../assets/Tutorial_3.png'),
            import('../../assets/Tutorial_4.png'),
            import('../../assets/Tutorial_5.png'),
            import('../../assets/Tutorial_6.png'),
            import('../../assets/Tutorial_7.png'),
        ]).then(mods => setTutorialImgs(mods.map(m => m.default)))
    }, [showTutorialModal])
    // FIX #11: State konfirmasi sebelum WA Blast dimulai
    const [waBlastConfirm, setWaBlastConfirm] = useState(null) // null | { queue }
    const [waBlast, setWaBlast] = useState(null)

    // ── Banner
    const [newMonthBanner, setNewMonthBanner] = useState(null)

    // ── Preview
    const [previewStudentId, setPreviewStudentId] = useState(null)
    const [pageSize, setPageSize] = useState('a4') // 'a4' | 'f4'
    const [previewZoom, setPreviewZoom] = useState(1) // 0.8 = 80% zoom out
    const [isFullScreenPreview, setIsFullScreenPreview] = useState(false)
    const [fullScreenZoom, setFullScreenZoom] = useState(1) // zoom khusus fullscreen
    const [showFullScreenHud, setShowFullScreenHud] = useState(true)
    const [isMobileViewport, setIsMobileViewport] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
    const [showMobileStudentPicker, setShowMobileStudentPicker] = useState(false)
    const previewContainerRef = useRef(null)
    const fullScreenScrollRef = useRef(null)
    const fullScreenHudTimerRef = useRef(null)
    const fullScreenLastTapRef = useRef(0)
    const bodyLockRef = useRef({ overflow: '', overscroll: '' })
    const manualZoomRef = useRef(false)

    // ── Auto-fit zoom: gunakan ResizeObserver agar akurat saat layout selesai render
    useEffect(() => {
        if (step !== 3) return
        manualZoomRef.current = false // Reset manual zoom if step or pageSize changes
        const calcFit = (containerW) => {
            // p-3 = 12px tiap sisi (24px total), p-10 = 40px tiap sisi (80px total)
            const padding = containerW < 640 ? 24 : 80
            const availW = containerW - padding
            const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
            const fit = Math.floor((availW / docW) * 100) / 100
            if (!manualZoomRef.current) {
                setPreviewZoom(Math.min(1, Math.max(0.3, fit)))
            }
        }
        // ResizeObserver — akurat, tidak bergantung pada window.innerWidth
        let ro
        const t = setTimeout(() => {
            const el = previewContainerRef.current
            if (!el) return
            calcFit(el.clientWidth)
            ro = new ResizeObserver(entries => {
                for (const e of entries) calcFit(e.contentRect.width)
            })
            ro.observe(el)
        }, 100)
        return () => { clearTimeout(t); ro?.disconnect() }
    }, [step, pageSize])

    useEffect(() => {
        const onResize = () => setIsMobileViewport(window.innerWidth < 768)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    const getFullScreenFitZoom = useCallback((mobile = false) => {
        if (typeof window === 'undefined') return 1
        const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
        const horizontalPadding = mobile ? 28 : 120
        const availW = Math.max(320, window.innerWidth - horizontalPadding)
        return Math.min(mobile ? 1.25 : 1.3, Math.max(0.3, Math.floor((availW / docW) * 100) / 100))
    }, [pageSize])

    // ── Default zoom fullscreen: mobile fit-width, desktop 100%
    useEffect(() => {
        if (!isFullScreenPreview) return
        setFullScreenZoom(isMobileViewport ? getFullScreenFitZoom(true) : 1)
    }, [isFullScreenPreview, pageSize, isMobileViewport, getFullScreenFitZoom])

    const bumpFullScreenHud = useCallback(() => {
        setShowFullScreenHud(prev => prev ? prev : true)
        if (fullScreenHudTimerRef.current) clearTimeout(fullScreenHudTimerRef.current)
        if (!isFullScreenPreview || isMobileViewport) return
        fullScreenHudTimerRef.current = setTimeout(() => setShowFullScreenHud(false), 2000)
    }, [isFullScreenPreview, isMobileViewport])

    useEffect(() => {
        if (!isFullScreenPreview) {
            if (fullScreenHudTimerRef.current) clearTimeout(fullScreenHudTimerRef.current)
            setShowFullScreenHud(true)
            return
        }
        bumpFullScreenHud()
        return () => {
            if (fullScreenHudTimerRef.current) clearTimeout(fullScreenHudTimerRef.current)
        }
    }, [isFullScreenPreview, bumpFullScreenHud])

    // ── Lock body scroll while fullscreen modal open
    useEffect(() => {
        if (!isFullScreenPreview) return
        bodyLockRef.current = {
            overflow: document.body.style.overflow,
            overscroll: document.body.style.overscrollBehavior,
        }
        document.body.style.overflow = 'hidden'
        document.body.style.overscrollBehavior = 'none'
        return () => {
            document.body.style.overflow = bodyLockRef.current.overflow
            document.body.style.overscrollBehavior = bodyLockRef.current.overscroll
        }
    }, [isFullScreenPreview])

    // ── WA/PDF
    const [sendingWA, setSendingWA] = useState({})
    const [raportLinks, setRaportLinks] = useState({})

    // ── Confirm modals
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [confirmModal, setConfirmModal] = useState(null)
    const [saveAllConfirm, setSaveAllConfirm] = useState(null) // IMPROVISASI: konfirmasi simpan semua saat ada yg kosong

    // ── Print
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)
    const printContainerRef = useRef(null)
    const [pendingExport, setPendingExport] = useState(null)

    // ── Prev month scores for delta comparison
    const [prevMonthScores, setPrevMonthScores] = useState({})

    // ── UX extras
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
    const [showNoPhoneOnly, setShowNoPhoneOnly] = useState(false)
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkValues, setBulkValues] = useState({})
    const [bulkSelected, setBulkSelected] = useState(new Set())  // UIUX: bulk select state
    const [pendingNav, setPendingNav] = useState(null)
    const [templateOpenId, setTemplateOpenId] = useState(null) // FITUR 3: template catatan per santri
    const [catatanArabMap, setCatatanArabMap] = useState({}) // map studentId → terjemahan Arab catatan

    // FIX 6: global auto-save indicator
    const [globalSaveIndicator, setGlobalSaveIndicator] = useState(null) // null | 'saving' | 'saved'
    const globalSaveTimerRef = useRef(null)
    const [stepVisible, setStepVisible] = useState(true)
    const prevStepRef = useRef(step)
    useEffect(() => {
        if (prevStepRef.current === step) return
        prevStepRef.current = step
        setStepVisible(false)
        const t = setTimeout(() => setStepVisible(true), 80)
        return () => clearTimeout(t)
    }, [step])

    // FIX 5: '/' shortcut fokus ke search kelas di step 0
    const searchInputRef = useRef(null)
    useEffect(() => {
        const handler = (e) => {
            if (step !== 0) return
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step])

    // Close template dropdown saat klik di luar
    useEffect(() => {
        if (!templateOpenId) return
        const handler = (e) => {
            if (!e.target.closest('[data-template-anchor]')) setTemplateOpenId(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [templateOpenId])
    // FIX MAJOR: state khusus untuk dismiss floating unsaved bar
    // — agar tombol × tidak memanipulasi savedIds (yang punya fungsi berbeda)
    const [unsavedBarDismissed, setUnsavedBarDismissed] = useState(false)

    // ── Refs
    const cellRefs = useRef({})
    const autoSaveTimers = useRef({})
    // FIX MINOR: Bersihkan semua pending auto-save timer saat komponen unmount.
    useEffect(() => () => Object.values(autoSaveTimers.current).forEach(clearTimeout), [])
    const waBlastAbortRef = useRef(false) // flag abort untuk runWaBlast
    // u2500u2500 Undo history (max 30 snapshots of scores state)
    const scoresHistoryRef = useRef([])
    const scoresHistoryIdxRef = useRef(-1)
    // PERF: Virtual scroll — hanya render baris yang visible + overscan
    const tableScrollRef = useRef(null)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 })
    // ROW_HEIGHT & OVERSCAN kini module-level constants (atas file) — tidak dideklarasi ulang di sini
    const selectedClass = classesList.find(c => c.id === selectedClassId)
    const bulanObj = BULAN.find(b => b.id === selectedMonth)

    // FIX 10: tab title dinamis — harus setelah selectedClass & bulanObj dideklarasi
    useEffect(() => {
        if (step === 2 && selectedClass?.name && bulanObj?.id_str) {
            document.title = `${selectedClass.name} · ${bulanObj.id_str} ${selectedYear} | Laporanmu`
        } else {
            document.title = 'Raport Bulanan | Laporanmu'
        }
        return () => { document.title = 'Laporanmu' }
    }, [step, selectedClass, bulanObj, selectedYear])
    // FIX #3: years dengan useMemo agar referensi stabil
    const years = useMemo(() => [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1], [now])

    // FIX MINOR: filteredStudents dipecah menjadi dua useMemo agar tidak
    // recompute setiap kali guru mengetik nilai.
    const baseFiltered = useMemo(() => {
        let list = students
        if (studentSearch.trim()) list = list.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
        if (showNoPhoneOnly) list = list.filter(s => !s.phone)
        return list
    }, [students, studentSearch, showNoPhoneOnly])

    // FIX MINOR: Saat showIncompleteOnly aktif, baris santri menghilang seketika
    // begitu nilai terakhir diisi — sebelum auto-save sempat jalan, membuat guru panik.
    // Solusi: gunakan snapshot filteredStudents yang di-update dengan debounce 1.5 detik
    // (sama dengan delay auto-save) saat filter "tidak lengkap" aktif.
    const [filteredStudents, setFilteredStudents] = useState(() => students)
    const filteredDebounceRef = useRef(null)
    useEffect(() => {
        const next = showIncompleteOnly
            ? baseFiltered.filter(s => !isComplete(scores[s.id] || {}))
            : baseFiltered
        if (!showIncompleteOnly) {
            // Tanpa filter incomplete — update langsung, tidak perlu debounce
            setFilteredStudents(next)
            return
        }
        // Dengan filter incomplete — debounce agar baris tidak langsung hilang
        // saat nilai terakhir baru saja diketik
        if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current)
        filteredDebounceRef.current = setTimeout(() => setFilteredStudents(next), 1500)
        return () => { if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current) }
    }, [baseFiltered, showIncompleteOnly, scores])

    const completedCount = useMemo(() => students.filter(s => isComplete(scores[s.id] || {})).length, [students, scores])
    const progressPct = useMemo(() => {
        if (!students.length) return 0
        const totalRatio = students.reduce((acc, s) => {
            const sc = scores[s.id] || {}
            const ex = extras[s.id] || {}
            const progressFields = [
                sc.nilai_akhlak,
                sc.nilai_ibadah,
                sc.nilai_kebersihan,
                sc.nilai_quran,
                sc.nilai_bahasa,
                ex.berat_badan,
                ex.tinggi_badan,
                ex.hari_sakit,
                ex.hari_izin,
                ex.hari_alpa,
                ex.hari_pulang,
                ex.ziyadah,
                ex.murojaah,
                ex.catatan,
            ]
            const filled = progressFields.filter(v => v !== '' && v !== null && v !== undefined).length
            return acc + (filled / progressFields.length)
        }, 0)
        return Math.round((totalRatio / students.length) * 100)
    }, [students, scores, extras])
    // FIX MINOR: useMemo agar tidak dihitung ulang tiap render
    const noPhoneCount = useMemo(() => students.filter(s => !s.phone).length, [students])

    const hasUnsavedMemo = useMemo(() => students.some(s => {
        if (savedIds.has(s.id)) return false
        const sc = scores[s.id] || {}, ex = extras[s.id] || {}
        return KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
            [ex.berat_badan, ex.tinggi_badan, ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan].some(v => v !== '' && v !== null && v !== undefined)
    }), [students, scores, extras, savedIds])

    const filteredClasses = useMemo(() => {
        let list = classesList.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        if (filterType === 'boarding') {
            list = list.filter(c => (c.name || '').toLowerCase().includes('boarding') || (c.name || '').toLowerCase().includes('pondok'))
        } else if (filterType === 'regular') {
            list = list.filter(c => !((c.name || '').toLowerCase().includes('boarding') || (c.name || '').toLowerCase().includes('pondok')))
        }
        return list
    }, [classesList, searchQuery, filterType])

    const step0Stats = useMemo(() => {
        const progressRows = Object.values(classProgress || {})
        const totalTargets = progressRows.reduce((acc, row) => acc + (row.total || 0), 0)
        const totalCompleted = progressRows.reduce((acc, row) => acc + (row.done || 0), 0)
        const weightedInput = totalTargets
            ? Math.round(progressRows.reduce((acc, row) => acc + ((row.pct || 0) * (row.total || 0)), 0) / totalTargets)
            : 0
        return {
            totalKelas: stats.totalKelas,
            totalSiswa: stats.totalSiswa,
            raportLengkap: `${totalCompleted}/${totalTargets}`,
            rataInput: `${weightedInput}%`,
        }
    }, [classProgress, stats.totalKelas, stats.totalSiswa])

    // ── Fetch page data
    useEffect(() => {
        const fetchData = async () => {
            const curMonth = now.getMonth() + 1
            const curYear = now.getFullYear()
            try {
                // PERF #1: hanya fetch report bulan ini + 1 report terakhir per kelas
                // Sebelumnya fetch SEMUA history raport — mahal di DB besar
                const [classRes, studRes, curRepRes, lastRepRes] = await Promise.all([
                    supabase.from('classes').select('id, name, homeroom_teacher_id, teachers:homeroom_teacher_id(name)').order('name'),
                    supabase.from('students').select('id, class_id').is('deleted_at', null),
                    supabase.from('student_monthly_reports')
                        .select('student_id, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, berat_badan, tinggi_badan, hari_sakit, hari_izin, hari_alpa, hari_pulang, ziyadah, murojaah, catatan')
                        .eq('month', curMonth).eq('year', curYear),
                    supabase.from('student_monthly_reports')
                        .select('student_id, month, year')
                        .order('year', { ascending: false })
                        .order('month', { ascending: false })
                        .limit(5000),
                ])
                if (classRes.error) throw classRes.error
                if (studRes.error) throw studRes.error
                const classes = classRes.data || []
                const allStudents = studRes.data || []
                const curReports = curRepRes.data || []
                const lastReports = lastRepRes.data || []
                setClassesList(classes)
                setStats({
                    totalKelas: classes.length,
                    totalSiswa: allStudents.length,
                    totalRaport: lastReports.length,
                    bulanIni: curMonth,
                })
                const stuByClass = {}
                for (const s of allStudents) {
                    if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []
                    stuByClass[s.class_id].push(s.id)
                }
                const stuToClass = {}
                for (const s of allStudents) stuToClass[s.id] = s.class_id
                const curProgressByStudent = {}
                for (const r of curReports) {
                    const progressFields = [
                        r.nilai_akhlak,
                        r.nilai_ibadah,
                        r.nilai_kebersihan,
                        r.nilai_quran,
                        r.nilai_bahasa,
                        r.berat_badan,
                        r.tinggi_badan,
                        r.hari_sakit,
                        r.hari_izin,
                        r.hari_alpa,
                        r.hari_pulang,
                        r.ziyadah,
                        r.murojaah,
                        r.catatan,
                    ]
                    const filled = progressFields.filter(v => v !== '' && v !== null && v !== undefined).length
                    curProgressByStudent[r.student_id] = filled / progressFields.length
                }
                const curDoneSet = new Set(
                    curReports
                        .filter(r => ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
                            .every(k => r[k] !== '' && r[k] !== null && r[k] !== undefined))
                        .map(r => r.student_id)
                )
                const lastReportByClass = {}
                for (const r of lastReports) {
                    const cid = stuToClass[r.student_id]
                    if (!cid) continue
                    if (!lastReportByClass[cid]) {
                        lastReportByClass[cid] = { month: r.month, year: r.year }
                    }
                }
                const prog = {}
                for (const cls of classes) {
                    const ids = stuByClass[cls.id] || []
                    prog[cls.id] = {
                        total: ids.length,
                        done: ids.filter(id => curDoneSet.has(id)).length,
                        pct: ids.length ? Math.round((ids.reduce((acc, id) => acc + (curProgressByStudent[id] || 0), 0) / ids.length) * 100) : 0,
                        lastMonth: lastReportByClass[cls.id]?.month ?? null,
                        lastYear: lastReportByClass[cls.id]?.year ?? null,
                    }
                }
                setClassProgress(prog)
            } catch (e) {
                console.error('fetchData error:', e)
            } finally {
                setPageLoading(false)
            }
        }
        fetchData()
    }, [])

    // ── Auto-arsip banner
    useEffect(() => {
        if (!classesList.length) return
        const today = new Date()
        const dayOfMonth = today.getDate()
        // Banner muncul setelah tanggal 20 sampai akhir bulan
        if (dayOfMonth < 20) return
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
        const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()

        // Cek apakah banner bulan ini sudah pernah di-dismiss permanen
        const dismissKey = `banner_dismissed_${prevYear}_${prevMonth}`
        if (localStorage.getItem(dismissKey)) return

        const check = async () => {
            try {
                const classIds = classesList.map(c => c.id)
                const { data: stuData } = await supabase.from('students').select('id, class_id').in('class_id', classIds).is('deleted_at', null)
                if (!stuData?.length) return
                const allStudentIds = stuData.map(s => s.id)
                const { data: repData } = await supabase.from('student_monthly_reports').select('student_id').in('student_id', allStudentIds).eq('month', prevMonth).eq('year', prevYear)
                const archivedSet = new Set((repData || []).map(r => r.student_id))
                const stuByClass = {}
                for (const s of stuData) { if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []; stuByClass[s.class_id].push(s.id) }
                // Kelas dianggap belum lengkap kalau ADA santri yang belum punya raport bulan itu
                const missing = classesList.filter(cls => {
                    const ids = stuByClass[cls.id] || []
                    return ids.length > 0 && ids.some(id => !archivedSet.has(id))
                }).map(cls => {
                    const ids = stuByClass[cls.id] || []
                    const filledCount = ids.filter(id => archivedSet.has(id)).length
                    return { class_id: cls.id, class_name: cls.name, filled: filledCount, total: ids.length }
                })
                if (missing.length) setNewMonthBanner({ prevMonth, prevYear, prevMonthStr: BULAN.find(b => b.id === prevMonth)?.id_str || '', classesNotArchived: missing, dismissKey })
            } catch (e) { console.error('Auto-arsip banner check error:', e) }
        }
        check()
    }, [classesList])

    // ── Reset student search when class changes
    useEffect(() => { setStudentSearch(''); setMusyrif(''); setCatatanArabMap({}) }, [selectedClassId])

    // ── FITUR 1: Pin sesi terakhir — baca dari localStorage saat mount
    const [lastSession, setLastSession] = useState(() => {
        try {
            const raw = localStorage.getItem('raport_last_session')
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    })

    // ── Fetch homeroom teacher
    // FIX MINOR: dulu 2 query terpisah (N+1), sekarang 1 query dengan join
    useEffect(() => {
        if (!selectedClassId) { setHomeroomTeacherName(''); return }
        supabase
            .from('classes')
            .select('homeroom_teacher_id, teachers:homeroom_teacher_id(name)')
            .eq('id', selectedClassId)
            .single()
            .then(({ data }) => {
                const name = data?.teachers?.name || ''
                setHomeroomTeacherName(name)
                setMusyrif(prev => prev ? prev : name)
            })
    }, [selectedClassId])

    // ── Online/offline listener
    useEffect(() => {
        const onOnline = () => { setIsOnline(true); addToast('Koneksi kembali ✅', 'success') }
        const onOffline = () => { setIsOnline(false); addToast('Offline — data draft disimpan lokal', 'warning') }
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
    }, [])

    // ── Check localStorage draft when class+month+year selected
    useEffect(() => {
        if (!selectedClassId || !selectedMonth || !selectedYear) { setDraftAvailable(false); return }
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { setDraftAvailable(!!localStorage.getItem(key)) } catch { setDraftAvailable(false) }
    }, [selectedClassId, selectedMonth, selectedYear])

    // ── Auto-save draft to localStorage on score/extra changes (step 2)
    // FIX MAJOR: debounce 500ms — mencegah write tiap keystroke & QuotaExceededError di mobile
    const draftSaveTimerRef = useRef(null)
    useEffect(() => {
        if (step !== 2 || !selectedClassId || !students.length) return
        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = setTimeout(() => {
            const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
            try {
                const payload = JSON.stringify({ scores, extras, savedAt: Date.now() })
                // Guard: jangan simpan kalau >4MB agar tidak QuotaExceededError
                if (payload.length > 4 * 1024 * 1024) {
                    console.warn('Draft terlalu besar, skip localStorage save')
                    return
                }
                localStorage.setItem(key, payload)
            } catch (e) {
                console.error('Draft localStorage save error:', e)
            }
        }, 500)
        return () => { if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current) }
    }, [scores, extras, step, selectedClassId, selectedMonth, selectedYear, students.length])

    // FIX #4: Cleanup semua autoSaveTimers saat komponen unmount
    useEffect(() => {
        return () => {
            Object.values(autoSaveTimers.current).forEach(clearTimeout)
        }
    }, [])

    // ── Shortcut: "?" key opens shortcut modal
    useEffect(() => {
        const handler = (e) => {
            if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
                if (!showShortcutModal && shortcutBtnRef.current) {
                    setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
                }
                setShowShortcutModal(v => !v)
            }
            if (e.key === 'Escape') setShowShortcutModal(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [showShortcutModal])

    // Sticky positioning for portaled shortcuts dropdown
    useEffect(() => {
        if (!showShortcutModal) return
        const update = () => {
            if (shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [showShortcutModal])

    // FIX #3: Ctrl+S — gunakan ref agar tidak ada TDZ (saveAll belum tersedia saat useEffect ini dibaca)
    const saveAllRef = useRef(null)
    useEffect(() => {
        const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && step === 2) { e.preventDefault(); saveAllRef.current?.() } }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step])

    // ── Ctrl+Z Undo / Ctrl+Y Redo (scores only, step 2)
    useEffect(() => {
        const handler = (e) => {
            if (step !== 2) return
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx > 0) {
                    scoresHistoryIdxRef.current = idx - 1
                    setScoresRaw(JSON.parse(JSON.stringify(hist[idx - 1])))
                    addToast('Undo nilai', 'info')
                }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx < hist.length - 1) {
                    scoresHistoryIdxRef.current = idx + 1
                    setScoresRaw(JSON.parse(JSON.stringify(hist[idx + 1])))
                    addToast('Redo nilai', 'info')
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step, addToast])

    // ── Preload print libs
    useEffect(() => {
        const load = (src, check) => new Promise(res => { if (check()) { res(); return }; const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s) })
        load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => !!window.html2canvas)
        load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf?.jsPDF || window.jsPDF))
    }, [])

    // PERF: transliterateToArab sekarang async — lazy load kamus dari translitData.js
    // Kamus hanya di-load saat lang==='ar' pertama kali (≈ 15KB hemat parse awal)
    const transliterateToArab = useCallback(async (name) => {
        const { KATA_ARAB: KA, ASMAUL_HUSNA: AH, DIGRAPH: DG, SINGLE: SG } = await loadTranslitData()
        const latinToArab = (word) => {
            let res = '', i = 0
            while (i < word.length) {
                const two = word.slice(i, i + 2).toLowerCase()
                const di = DG.find(([k]) => k === two)
                if (di) { res += di[1]; i += 2; continue }
                res += SG[word[i].toLowerCase()] || ''
                i++
            }
            return res
        }
        const words = name.toLowerCase().trim().split(/\s+/)
        const result = []
        for (const w of words) {
            if (KA[w]) { result.push(KA[w]); continue }
            const abdulMatch = w.match(/^ab[du]u?l?[-_]?(.+)$/) || w.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suffix = abdulMatch[1]
                if (AH[suffix]) { result.push('عبد ' + AH[suffix]); continue }
                if (suffix === 'llah' || suffix === 'lah' || suffix === 'illah') { result.push('عبد الله'); continue }
            }
            if (w === 'bin' || w === 'ibn' || w === 'ibnu') { result.push('بن'); continue }
            if (w === 'binti' || w === 'bint') { result.push('بنت'); continue }
            if (w.endsWith('uddin') || w.endsWith('udin') || w.endsWith('addin') || w.endsWith('iddin')) {
                const base = w.replace(/(uddin|udin|addin|iddin)$/, '')
                if (KA[base]) { result.push(KA[base] + ' الدين'); continue }
            }
            if (w.startsWith('nur') || w.startsWith('noor')) {
                const suffix = w.replace(/^noo?r[-_]?/, '')
                const sufArab = KA[suffix] || AH[suffix]
                if (sufArab) { result.push('نور ' + sufArab.replace(/^ال/, '')); continue }
            }
            result.push(latinToArab(w))
        }
        return result.join(' ')
    }, [])

    const transliterateNames = useCallback(async (stuList) => {
        const needsTranslit = stuList.filter(s => !s.metadata?.nama_arab)
        if (!needsTranslit.length) return stuList
        const updated = [...stuList]
        const dbUpdates = []
        for (const s of needsTranslit) {
            const namaArab = await transliterateToArab(s.name)  // PERF: await async lazy-load
            const newMeta = { ...(s.metadata || {}), nama_arab: namaArab }
            dbUpdates.push(supabase.from('students').update({ metadata: newMeta }).eq('id', s.id))
            const idx = updated.findIndex(x => x.id === s.id)
            if (idx !== -1) updated[idx] = { ...updated[idx], metadata: newMeta }
        }
        await Promise.allSettled(dbUpdates)
        return updated
    }, [transliterateToArab])

    // ── Load students
    const loadStudents = useCallback(async (overrideClassId, overrideMonth, overrideYear, overrideLang) => {
        const classId = overrideClassId ?? selectedClassId
        const month = overrideMonth ?? selectedMonth
        const year = overrideYear ?? selectedYear
        const useLang = overrideLang ?? lang
        if (!classId) return
        setLoading(true)
        try {
            const { data: stuData, error: stuErr } = await supabase.from('students').select('id, name, registration_code, photo_url, gender, phone, metadata').eq('class_id', classId).is('deleted_at', null).order('name')
            if (stuErr) throw stuErr
            const ids = (stuData || []).map(s => s.id)
            const prevM = month === 1 ? 12 : month - 1
            const prevY = month === 1 ? year - 1 : year
            const [{ data: repData }, { data: prevRepData }] = await Promise.all([
                supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', month).eq('year', year),
                supabase.from('student_monthly_reports').select('student_id,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa').in('student_id', ids).eq('month', prevM).eq('year', prevY),
            ])
            // PERF #2: trend data di-fetch terpisah (non-blocking) setelah students render
            // Sebelumnya masuk ke Promise.all — blok load utama 200-500ms ekstra
            setTimeout(() => {
                const trendMonths = []
                for (let i = 5; i >= 0; i--) {
                    let m = month - i, y = year
                    if (m <= 0) { m += 12; y -= 1 }
                    trendMonths.push({ m, y })
                }
                supabase.from('student_monthly_reports')
                    .select('student_id,month,year,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa')
                    .in('student_id', ids)
                    .or(trendMonths.map(t => `and(month.eq.${t.m},year.eq.${t.y})`).join(','))
                    .order('year').order('month')
                    .then(({ data: trendData }) => {
                        const trendMap = {}
                        for (const r of (trendData || [])) {
                            if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                            trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
                        }
                        setStudentTrend(trendMap)
                    })
            }, 0)
            const prevScoreMap = {}
            for (const r of (prevRepData || [])) {
                prevScoreMap[r.student_id] = { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
            }
            setPrevMonthScores(prevScoreMap)
            const initScores = {}, initExtras = {}, initExisting = {}
            // FIX MAJOR: kumpulkan semua savedId dulu, baru panggil setSavedIds satu kali
            // — mencegah race condition akibat N setState berurutan dalam satu loop
            const initSavedIds = new Set()
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                initScores[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                initExtras[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
                if (rep) { initExisting[s.id] = rep.id; initSavedIds.add(s.id) }
            }
            let finalStudents = stuData || []
            if (useLang === 'ar') {
                const needs = finalStudents.filter(s => !s.metadata?.nama_arab)
                if (needs.length) {
                    setTransliterating(true)
                    try { finalStudents = await transliterateNames(finalStudents) }
                    finally { setTransliterating(false) }
                }
            }
            // Reset undo history + filters saat load data baru
            scoresHistoryRef.current = [JSON.parse(JSON.stringify(initScores))]
            scoresHistoryIdxRef.current = 0
            setShowNoPhoneOnly(false)
            setShowIncompleteOnly(false)
            // FIX: setScoresRaw (bukan setScores) saat init — history sudah di-reset
            // manual 3 baris di atas, setScores wrapper akan push snapshot duplikat
            setStudents(finalStudents); setScoresRaw(initScores); setExtras(initExtras); setExistingReportIds(initExisting)
            setSavedIds(initSavedIds)
            // FITUR 1: Simpan sesi terakhir ke localStorage
            try {
                const session = { classId, month, year, useLang, className: classesList.find(c => c.id === classId)?.name || '' }
                localStorage.setItem('raport_last_session', JSON.stringify(session))
                setLastSession(session)
            } catch { }
            return true
        } catch (e) { addToast('Gagal memuat siswa: ' + e.message, 'error'); console.error('loadStudents error:', e); return false }
        finally { setLoading(false) }
    }, [selectedClassId, selectedMonth, selectedYear, lang, transliterateNames, addToast])

    // ── Load offline draft
    const loadDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return
            const { scores: dScores, extras: dExtras, savedAt } = JSON.parse(raw)
            setScores(dScores)
            setExtras(dExtras)
            // FIX #5: Jangan reset savedIds sepenuhnya — hanya hapus id yang ada di draft
            // agar record yang sudah tersimpan di DB tidak kehilangan status "tersimpan"
            setSavedIds(prev => {
                const next = new Set(prev)
                Object.keys(dScores || {}).forEach(id => next.delete(id))
                return next
            })
            const mins = Math.round((Date.now() - savedAt) / 60000)
            addToast(`Draft dimuat (disimpan ${mins < 1 ? 'baru saja' : mins + ' menit lalu'})`, 'success')
        } catch (e) { addToast('Gagal memuat draft', 'error'); console.error('loadDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast, setScores, setExtras])

    const clearDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { localStorage.removeItem(key); setDraftAvailable(false); addToast('Draft dihapus', 'success') }
        catch (e) { console.error('clearDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast])

    // ── Save single
    const saveStudent = useCallback(async (studentId) => {
        const sc = scores[studentId], ex = extras[studentId] ?? {}
        if (!sc) return
        setSaving(prev => ({ ...prev, [studentId]: true }))
        try {
            const payload = { student_id: studentId, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null }
            const existingId = existingReportIds[studentId]
            let error
            if (existingId) { ; ({ error } = await supabase.from('student_monthly_reports').update(payload).eq('id', existingId)) }
            else { const { data, error: upsErr } = await supabase.from('student_monthly_reports').upsert(payload, { onConflict: 'student_id,month,year' }).select('id').single(); error = upsErr; if (!upsErr && data) setExistingReportIds(prev => ({ ...prev, [studentId]: data.id })) }
            if (error) throw error
            setSavedIds(prev => new Set([...prev, studentId]))
            await logAudit({
                action: existingId ? 'UPDATE' : 'INSERT',
                source: 'OPERATIONAL',
                tableName: 'student_monthly_reports',
                recordId: existingId || null,
                newData: payload,
            })
        } catch (e) { addToast(`Gagal menyimpan: ${e.message}`, 'error'); console.error('saveStudent error:', e) }
        finally { setSaving(prev => ({ ...prev, [studentId]: false })) }
    }, [scores, extras, selectedMonth, selectedYear, musyrif, existingReportIds, students, addToast])

    // ── Reset student — kosongkan state lokal DAN hapus dari DB jika sudah tersimpan
    const resetStudent = useCallback(async (studentId) => {
        // FIX: cancel auto-save timer terlebih dahulu — timer pending bisa tembak
        // saveStudent() setelah data dikosongkan dan menyimpan data kosong ke DB
        if (autoSaveTimers.current[studentId]) {
            clearTimeout(autoSaveTimers.current[studentId])
            delete autoSaveTimers.current[studentId]
        }
        // 1. Kosongkan state lokal dulu (UI langsung responsif)
        setScores(prev => ({ ...prev, [studentId]: { nilai_akhlak: '', nilai_ibadah: '', nilai_kebersihan: '', nilai_quran: '', nilai_bahasa: '' } }))
        setExtras(prev => ({ ...prev, [studentId]: { berat_badan: '', tinggi_badan: '', ziyadah: '', murojaah: '', hari_sakit: '', hari_izin: '', hari_alpa: '', hari_pulang: '', catatan: '' } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })

        // 2. Hapus dari DB hanya kalau record memang sudah ada
        const existingId = existingReportIds[studentId]
        if (!existingId) return
        try {
            const { error } = await supabase.from('student_monthly_reports').delete().eq('id', existingId)
            if (error) throw error
            setExistingReportIds(prev => { const n = { ...prev }; delete n[studentId]; return n })
            const studentName = students.find(s => s.id === studentId)?.name
            addToast(`Data ${studentName?.split(' ')[0] ?? ''} berhasil direset`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'student_monthly_reports', recordId: existingId,
                oldData: { student_id: studentId, student_name: studentName, month: selectedMonth, year: selectedYear }
            })
        } catch (e) {
            addToast(`Gagal hapus dari DB: ${e.message}`, 'error')
            console.error('resetStudent error:', e)
        }
    }, [existingReportIds, students, addToast, setScores])

    const savingAllRef = useRef(false)

    // ── Save all (dengan konfirmasi jika ada nilai kosong)
    const saveAll = useCallback(async () => {
        if (savingAll || savingAllRef.current) return
        savingAllRef.current = true
        // IMPROVISASI: cek apakah ada santri yang belum lengkap, tampilkan konfirmasi
        const hasAnyData = (sc, ex) =>
            KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
            ].some(v => v !== '' && v !== null && v !== undefined)

        const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
        if (!studentsToSave.length) {
            addToast('Belum ada data yang diisi untuk disimpan', 'warning')
            savingAllRef.current = false
            return
        }
        const incomplete = students.filter(s => !isComplete(scores[s.id] || {}))
        if (incomplete.length > 0) {
            setSaveAllConfirm({ completedCount: completedCount, totalCount: students.length, incompleteCount: incomplete.length })
            savingAllRef.current = false
            return
        }
        await _doSaveAll()
    }, [savingAll, students, scores, extras, completedCount]) // eslint-disable-line

    const _doSaveAll = useCallback(async () => {
        setSaveAllConfirm(null)
        setSavingAll(true)
        try {
            const hasAnyData = (sc, ex) =>
                KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                ].some(v => v !== '' && v !== null && v !== undefined)

            const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
            if (!studentsToSave.length) {
                addToast('Belum ada data yang diisi untuk disimpan', 'warning')
                return
            }

            const payloads = studentsToSave.map(s => { const sc = scores[s.id] || {}, ex = extras[s.id] || {}; return { student_id: s.id, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null } })
            // FIX: .select() agar IDs yang baru dibuat dikembalikan dan disimpan
            // ke existingReportIds — tanpa ini saveStudent() berikutnya tidak tahu
            // record sudah ada dan akan coba INSERT lagi (unique constraint error)
            const { data: upserted, error } = await supabase
                .from('student_monthly_reports')
                .upsert(payloads, { onConflict: 'student_id,month,year' })
                .select('id, student_id')
            if (error) throw error
            if (upserted?.length) {
                setExistingReportIds(prev => {
                    const next = { ...prev }
                    for (const r of upserted) next[r.student_id] = r.id
                    return next
                })
            }
            setSavedIds(prev => {
                const next = new Set(prev)
                studentsToSave.forEach(s => next.add(s.id))
                return next
            })
            const skipped = students.length - studentsToSave.length
            addToast(
                skipped > 0
                    ? `${studentsToSave.length} raport disimpan (${skipped} santri dilewati karena belum diisi)`
                    : `${studentsToSave.length} raport berhasil disimpan`,
                'success'
            )
            try { const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`; localStorage.removeItem(key); setDraftAvailable(false) } catch { }

            // Forensic Audit Log
            logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { bulk_save_all: true, count: studentsToSave.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
            })
        } catch (e) { addToast(`Gagal menyimpan semua: ${e.message}`, 'error'); console.error('_doSaveAll error:', e) }
        finally { setSavingAll(false); savingAllRef.current = false }
    }, [students, scores, extras, selectedMonth, selectedYear, musyrif, selectedClassId, addToast])

    // Sync ref setelah saveAll terdefinisi — dipakai Ctrl+S handler di atas
    useEffect(() => { saveAllRef.current = saveAll }, [saveAll])

    // Reset dismissed state setiap kali muncul perubahan baru
    useEffect(() => { if (hasUnsavedMemo) setUnsavedBarDismissed(false) }, [hasUnsavedMemo])

    // PERF-3: Virtual scroll handler — update visibleRange saat tabel di-scroll
    // Hanya aktif di step 2 dan kalau jumlah siswa > 20 (tidak perlu untuk kelas kecil)
    useEffect(() => {
        if (step !== 2) return
        const el = tableScrollRef.current
        if (!el) return
        const handleScroll = () => {
            const scrollTop = el.scrollTop
            const viewHeight = el.clientHeight
            const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
            const end = Math.min(
                filteredStudents.length,
                Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN
            )
            setVisibleRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end })
        }
        el.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // initial calculation
        return () => el.removeEventListener('scroll', handleScroll)
    }, [step, filteredStudents.length]) // ROW_HEIGHT & OVERSCAN adalah module-level constants, tidak perlu di dep array

    // Reset visible range setiap filter berubah
    useEffect(() => { setVisibleRange({ start: 0, end: 30 }) }, [filteredStudents])
    // Reset mobile card index juga saat filter/santri berubah
    useEffect(() => { setMobileActiveIdx(0) }, [filteredStudents])

    // ── Export CSV
    const exportCSV = useCallback(() => {
        const headers = ['No', 'Nama', 'Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa', 'Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan']
        const rows = students.map((s, i) => {
            const sc = scores[s.id] || {}, ex = extras[s.id] || {}
            const avg = calcAvg(sc)
            const predikat = avg ? GRADE(Number(avg)).id : ''
            return [
                i + 1, s.name,
                sc.nilai_akhlak ?? '', sc.nilai_ibadah ?? '', sc.nilai_kebersihan ?? '', sc.nilai_quran ?? '', sc.nilai_bahasa ?? '',
                avg ?? '', predikat,
                ex.berat_badan ?? '', ex.tinggi_badan ?? '', ex.ziyadah ?? '', ex.murojaah ?? '',
                ex.hari_sakit ?? '', ex.hari_izin ?? '', ex.hari_alpa ?? '', ex.hari_pulang ?? '',
                // FIX #16: Gunakan escapeCsvCell yang proper untuk handle newline & quote
                ex.catatan || '',
            ]
        })
        // FIX #16: Semua cell di-escape dengan benar
        const csv = [headers, ...rows].map(r => r.map(escapeCsvCell).join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `Raport_${selectedClass?.name || ''}_${bulanObj?.id_str || ''}_${selectedYear}.csv`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        addToast(`CSV berhasil diexport (${students.length} santri)`, 'success')

        // Forensic Audit Log
        logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
            newData: { format: 'CSV', count: students.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
        })
    }, [students, scores, extras, selectedClass, bulanObj, selectedYear, addToast, selectedMonth, profile])

    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const headerMenuBtnRef = useRef(null)

    // ── Export XLS (XLSX via SheetJS — lazy load dari CDN)
    const exportXLS = useCallback(async () => {
        if (!window.XLSX) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                s.onload = res; s.onerror = () => rej(new Error('Gagal memuat library XLSX'))
                document.head.appendChild(s)
            })
        }
        const headers = ['No', 'Nama', 'Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa', 'Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan']
        const rows = students.map((s, i) => {
            const sc = scores[s.id] || {}, ex = extras[s.id] || {}
            const avg = calcAvg(sc)
            const predikat = avg ? GRADE(Number(avg)).id : ''
            return [
                i + 1, s.name,
                sc.nilai_akhlak !== '' ? Number(sc.nilai_akhlak) : '',
                sc.nilai_ibadah !== '' ? Number(sc.nilai_ibadah) : '',
                sc.nilai_kebersihan !== '' ? Number(sc.nilai_kebersihan) : '',
                sc.nilai_quran !== '' ? Number(sc.nilai_quran) : '',
                sc.nilai_bahasa !== '' ? Number(sc.nilai_bahasa) : '',
                avg ? Number(avg) : '', predikat,
                ex.berat_badan !== '' ? Number(ex.berat_badan) : '',
                ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : '',
                ex.ziyadah ?? '', ex.murojaah ?? '',
                ex.hari_sakit !== '' ? Number(ex.hari_sakit) : '',
                ex.hari_izin !== '' ? Number(ex.hari_izin) : '',
                ex.hari_alpa !== '' ? Number(ex.hari_alpa) : '',
                ex.hari_pulang !== '' ? Number(ex.hari_pulang) : '',
                ex.catatan || '',
            ]
        })
        const XLSX = window.XLSX
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        // Styling lebar kolom
        ws['!cols'] = [
            { wch: 4 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
            { wch: 10 }, { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 12 },
            { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 30 }
        ]
        const wb = XLSX.utils.book_new()
        const sheetName = `${bulanObj?.id_str || ''} ${selectedYear}`.trim().slice(0, 31)
        XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Raport')
        XLSX.writeFile(wb, `Raport_${selectedClass?.name || ''}_${bulanObj?.id_str || ''}_${selectedYear}.xlsx`)
        addToast(`XLS berhasil diexport (${students.length} santri)`, 'success')

        // Forensic Audit Log
        logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
            newData: { format: 'XLSX', count: students.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
        })
    }, [students, scores, extras, selectedClass, bulanObj, selectedYear, addToast, selectedMonth, profile])

    // ── Export ALL Classes XLS
    const exportAllClassesXLS = useCallback(async () => {
        if (!window.XLSX) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                s.onload = res; s.onerror = () => rej(new Error('Gagal memuat library XLSX'))
                document.head.appendChild(s)
            })
        }

        setLoading(true) // Re-use global loading state
        try {
            // 1. Ambil semua kelas yang ada
            const { data: allCls, error: clsErr } = await supabase.from('classes').select('id, name')
            if (clsErr) throw clsErr

            // 2. Ambil semua siswa aktif
            const { data: allStu, error: stuErr } = await supabase.from('students').select('id, name, class_id').is('deleted_at', null).order('name')
            if (stuErr) throw stuErr

            // 3. Ambil seluruh raport di bulan dan tahun yang aktif saat ini
            const { data: allRep, error: repErr } = await supabase.from('student_monthly_reports').select('*').eq('month', selectedMonth).eq('year', selectedYear)
            if (repErr) throw repErr

            const XLSX = window.XLSX
            const wb = XLSX.utils.book_new()
            const headers = ['No', 'Nama', 'Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa', 'Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan']

            let sheetAdded = 0

            for (const cls of allCls) {
                const classStudents = allStu.filter(s => s.class_id === cls.id)
                if (classStudents.length === 0) continue

                const rows = classStudents.map((s, i) => {
                    const rep = allRep.find(r => r.student_id === s.id) || {}
                    // Format object for calcAvg
                    const sc = { nilai_akhlak: rep.nilai_akhlak, nilai_ibadah: rep.nilai_ibadah, nilai_kebersihan: rep.nilai_kebersihan, nilai_quran: rep.nilai_quran, nilai_bahasa: rep.nilai_bahasa }
                    const avg = calcAvg(sc)
                    const predikat = avg ? GRADE(Number(avg)).id : ''

                    return [
                        i + 1, s.name,
                        rep.nilai_akhlak !== null && rep.nilai_akhlak !== undefined ? Number(rep.nilai_akhlak) : '',
                        rep.nilai_ibadah !== null && rep.nilai_ibadah !== undefined ? Number(rep.nilai_ibadah) : '',
                        rep.nilai_kebersihan !== null && rep.nilai_kebersihan !== undefined ? Number(rep.nilai_kebersihan) : '',
                        rep.nilai_quran !== null && rep.nilai_quran !== undefined ? Number(rep.nilai_quran) : '',
                        rep.nilai_bahasa !== null && rep.nilai_bahasa !== undefined ? Number(rep.nilai_bahasa) : '',
                        avg ? Number(avg) : '', predikat,
                        rep.berat_badan !== null && rep.berat_badan !== undefined ? Number(rep.berat_badan) : '',
                        rep.tinggi_badan !== null && rep.tinggi_badan !== undefined ? Number(rep.tinggi_badan) : '',
                        rep.ziyadah ?? '', rep.murojaah ?? '',
                        rep.hari_sakit !== null && rep.hari_sakit !== undefined ? Number(rep.hari_sakit) : '',
                        rep.hari_izin !== null && rep.hari_izin !== undefined ? Number(rep.hari_izin) : '',
                        rep.hari_alpa !== null && rep.hari_alpa !== undefined ? Number(rep.hari_alpa) : '',
                        rep.hari_pulang !== null && rep.hari_pulang !== undefined ? Number(rep.hari_pulang) : '',
                        rep.catatan || '',
                    ]
                })

                const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
                ws['!cols'] = [
                    { wch: 4 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
                    { wch: 10 }, { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 12 },
                    { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 30 }
                ]

                const sheetName = (cls.name || 'Kelas').replace(/[\\/?*\[\]]/g, '').substring(0, 31)
                XLSX.utils.book_append_sheet(wb, ws, sheetName)
                sheetAdded++
            }

            if (sheetAdded === 0) {
                addToast('Tidak ada data siswa untuk diexport', 'warning')
                return
            }

            XLSX.writeFile(wb, `Raport_Semua_Kelas_${bulanObj?.id_str || ''}_${selectedYear}.xlsx`)
            addToast(`Berhasil export semua kelas (${sheetAdded} sheet)`, 'success')

            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'XLSX_ALL_CLASSES', month: selectedMonth, year: selectedYear }
            })

        } catch (err) {
            addToast('Gagal memproses export massal: ' + err.message, 'error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [selectedMonth, selectedYear, bulanObj, addToast, profile])

    // ── Import XLS
    const fileInputRef = useRef(null)
    // Update rect on scroll to keep dropdowns attached
    useEffect(() => {
        if (isHeaderMenuOpen || showShortcutModal) {
            const handleScroll = () => {
                if (isHeaderMenuOpen && headerMenuBtnRef.current) {
                    setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect());
                }
                if (showShortcutModal && shortcutBtnRef.current) {
                    setShortcutRect(shortcutBtnRef.current.getBoundingClientRect());
                }
            };
            window.addEventListener('scroll', handleScroll, { passive: true });
            return () => window.removeEventListener('scroll', handleScroll);
        }
    }, [isHeaderMenuOpen, showShortcutModal]);

    const importXLS = useCallback(async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Reset input agar bisa pilih file yang sama lagi
        e.target.value = ''

        if (!window.XLSX) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                s.onload = res; s.onerror = () => rej(new Error('Gagal memuat library XLSX'))
                document.head.appendChild(s)
            })
        }

        setLoading(true)
        try {
            const reader = new FileReader()
            const data = await new Promise((resolve, reject) => {
                reader.onload = (evt) => resolve(evt.target.result)
                reader.onerror = reject
                reader.readAsArrayBuffer(file)
            })

            const XLSX = window.XLSX
            const wb = XLSX.read(data, { type: 'array' })

            // 1. Ambil data master untuk mapping
            const { data: allCls } = await supabase.from('classes').select('id, name')
            const { data: allStu } = await supabase.from('students').select('id, name, class_id').is('deleted_at', null)

            const classMap = {} // name -> id
            allCls?.forEach(c => { classMap[c.name.toLowerCase().trim()] = c.id })

            const payloads = []
            let totalProcessed = 0
            let notFound = []

            // 2. Proses tiap Sheet
            for (const sheetName of wb.SheetNames) {
                const ws = wb.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1 }) // Ambil raw rows

                if (jsonData.length < 2) continue // Skip sheet kosong/hanya header

                // Cari class_id berdasarkan nama sheet
                const clsId = classMap[sheetName.toLowerCase().trim()]

                // Iterasi baris data (skip header di index 0)
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    const sName = String(row[1] || '').trim() // Nama di kolom B (index 1)
                    if (!sName) continue

                    // Cari student_id berdasarkan nama + class_id (jika sheet name valid)
                    const student = allStu?.find(s =>
                        s.name.toLowerCase().trim() === sName.toLowerCase() &&
                        (!clsId || s.class_id === clsId)
                    )

                    if (!student) {
                        notFound.push(`${sName} (${sheetName})`)
                        continue
                    }

                    // Map values (pastikan index sesuai dengan exporter)
                    // Index: 2=Akhlak, 3=Ibadah, 4=Kebersihan, 5=Quran, 6=Bahasa
                    // Index: 9=BB, 10=TB, 11=Ziyadah, 12=Murojaah, 13=Sakit, 14=Izin, 15=Alpa, 16=Pulang, 17=Catatan
                    const getNum = (val) => (val === '' || val === undefined || val === null) ? null : Number(val)

                    payloads.push({
                        student_id: student.id,
                        month: selectedMonth,
                        year: selectedYear,
                        musyrif_name: musyrif,
                        updated_by: profile?.id ?? null,
                        updated_by_name: profile?.name ?? null,
                        nilai_akhlak: getNum(row[2]),
                        nilai_ibadah: getNum(row[3]),
                        nilai_kebersihan: getNum(row[4]),
                        nilai_quran: getNum(row[5]),
                        nilai_bahasa: getNum(row[6]),
                        berat_badan: getNum(row[9]),
                        tinggi_badan: getNum(row[10]),
                        ziyadah: row[11] || null,
                        murojaah: row[12] || null,
                        hari_sakit: getNum(row[13]) || 0,
                        hari_izin: getNum(row[14]) || 0,
                        hari_alpa: getNum(row[15]) || 0,
                        hari_pulang: getNum(row[16]) || 0,
                        catatan: row[17] || null
                    })
                    totalProcessed++
                }
            }

            if (payloads.length === 0) {
                addToast('Tidak ada data valid yang bisa diimport', 'warning')
                return
            }

            // 3. Bulk Upsert ke Supabase
            const { error: upsErr } = await supabase
                .from('student_monthly_reports')
                .upsert(payloads, { onConflict: 'student_id,month,year' })

            if (upsErr) throw upsErr

            addToast(`Berhasil import ${totalProcessed} data raport`, 'success')
            if (notFound.length > 0) {
                console.warn('Siswa tidak ditemukan:', notFound)
                addToast(`${notFound.length} siswa tidak ditemukan di database (cek log)`, 'warning')
            }

            // Reload data jika kelas yang sedang dibuka termasuk yang diimport
            loadStudents()

            logAudit({
                action: 'INSERT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { method: 'IMPORT_XLS', count: totalProcessed, file_name: file.name }
            })

        } catch (err) {
            addToast('Gagal import: ' + err.message, 'error')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [selectedMonth, selectedYear, musyrif, profile, addToast, loadStudents])

    // ── Auto-save
    const triggerAutoSave = useCallback((studentId) => {
        setSavedIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
        if (autoSaveTimers.current[studentId]) clearTimeout(autoSaveTimers.current[studentId])
        // FIX 6: show "Menyimpan..." indicator
        setGlobalSaveIndicator('saving')
        if (globalSaveTimerRef.current) clearTimeout(globalSaveTimerRef.current)
        autoSaveTimers.current[studentId] = setTimeout(() => {
            saveStudent(studentId)
            setGlobalSaveIndicator('saved')
            globalSaveTimerRef.current = setTimeout(() => setGlobalSaveIndicator(null), 2000)
        }, 1500)
    }, [saveStudent])

    // PERF: Stable callback untuk update extras field — diperlukan agar ExtraInput memo()
    // tidak re-render tiap parent render (karena inline arrow selalu buat referensi baru).
    const handleExtraChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
    }, [triggerAutoSave])

    // Sama dengan handleExtraChange tapi juga reset terjemahan Arab catatan
    const handleCatatanChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave])

    // PERF: Stable callback untuk ScoreCell onChange — tiap inline arrow baru = ScoreCell re-render
    const handleScoreChange = useCallback((studentId, key, value) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
    }, [triggerAutoSave])

    // Stable: toggle template dropdown per santri
    const handleTemplateToggle = useCallback((studentId) => {
        setTemplateOpenId(prev => prev === studentId ? null : studentId)
    }, [])

    // Stable: apply template catatan ke santri
    const handleTemplateApply = useCallback((studentId, tmpl) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], catatan: tmpl } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setTemplateOpenId(null)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave])

    // Stable: toggle terjemahan Arab catatan
    const handleTranslitToggle = useCallback(async (studentId, catatan, currentArab) => {
        if (currentArab) {
            setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
        } else {
            const arab = await transliterateToArab(catatan)
            setCatatanArabMap(prev => ({ ...prev, [studentId]: arab }))
        }
    }, [transliterateToArab])

    // Stable: bulk checkbox toggle
    const handleBulkToggle = useCallback((studentId, checked) => {
        setBulkSelected(prev => { const n = new Set(prev); checked ? n.add(studentId) : n.delete(studentId); return n })
    }, [])

    // Stable: PDF preview
    const handlePDF = useCallback((studentId) => {
        setPreviewStudentId(studentId); setStep(3)
    }, [])

    // Stable: reset student — wrap dalam confirmModal
    const handleResetStudent = useCallback((student) => {
        setConfirmModal({
            title: 'Reset Nilai?',
            subtitle: `Semua data ${student.name} akan dikosongkan`,
            body: 'Nilai akademik, hafalan, fisik, dan catatan santri ini akan dihapus permanen dari database.',
            icon: 'danger', variant: 'red', confirmLabel: 'Ya, Reset Semua',
            onConfirm: () => { setConfirmModal(null); resetStudent(student.id) }
        })
    }, [resetStudent])

    // ── Copy from last month
    const copyFromLastMonth = useCallback(async () => {
        if (!selectedClassId || !students.length) return
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
        setCopyingLastMonth(true)
        try {
            const ids = students.map(s => s.id)
            const { data } = await supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', prevMonth).eq('year', prevYear)
            if (!data?.length) { addToast('Tidak ada data bulan lalu', 'warning'); return }
            // Hitung dulu di luar updater agar tidak double-count di StrictMode
            const toCopy = data.filter(rep => {
                const cur = scores[rep.student_id] || {}
                return KRITERIA.every(k => cur[k.key] === '' || cur[k.key] === null || cur[k.key] === undefined)
            })
            const copied = toCopy.length
            setScores(prev => { const next = { ...prev }; for (const rep of toCopy) { next[rep.student_id] = { nilai_akhlak: rep.nilai_akhlak ?? '', nilai_ibadah: rep.nilai_ibadah ?? '', nilai_kebersihan: rep.nilai_kebersihan ?? '', nilai_quran: rep.nilai_quran ?? '', nilai_bahasa: rep.nilai_bahasa ?? '' } }; return next })
            setExtras(prev => { const next = { ...prev }; for (const rep of data) { const cur = next[rep.student_id] || {}; if (!cur.berat_badan && !cur.tinggi_badan) next[rep.student_id] = { ...cur, berat_badan: rep.berat_badan ?? '', tinggi_badan: rep.tinggi_badan ?? '' } }; return next })
            // FIX: jangan wipe seluruh savedIds — hapus hanya ID santri yang
            // benar-benar disalin agar santri lain tidak kehilangan status tersimpan
            const copiedIds = new Set(data.map(rep => rep.student_id))
            setSavedIds(prev => { const next = new Set(prev); for (const id of copiedIds) next.delete(id); return next })
            addToast(`Disalin dari ${BULAN.find(b => b.id === prevMonth)?.id_str} ${prevYear} — ${copied} santri`, 'success')
        } catch (e) { addToast('Gagal menyalin data bulan lalu', 'error'); console.error('copyFromLastMonth error:', e) }
        finally { setCopyingLastMonth(false) }
    }, [selectedClassId, students, selectedMonth, selectedYear, addToast])

    // ── Keyboard nav
    const handleKeyDown = useCallback((e, studentIdx, kriteriaIdx) => {
        // FIX MINOR: Virtual scroll hanya me-render baris yang terlihat.
        // Sebelumnya focus() langsung dipanggil — jika baris tujuan di luar
        // viewport, ref-nya undefined dan fokus gagal diam-diam.
        // Solusi: scroll dulu ke posisi baris tujuan, lalu fokus setelah
        // satu frame agar React sempat merender baris tersebut.
        const focusCell = (si, ki) => {
            const el = cellRefs.current[`${si}-${ki}`]
            if (el) {
                el.focus()
                // Move cursor to end (works for type="number" too)
                const val = el.value
                el.value = ''
                el.value = val
            } else if (tableScrollRef.current) {
                // Baris belum di-render — scroll container ke posisi estimasi
                tableScrollRef.current.scrollTop = si * ROW_HEIGHT
                requestAnimationFrame(() => {
                    const elDelayed = cellRefs.current[`${si}-${ki}`]
                    if (elDelayed) {
                        elDelayed.focus()
                        const valD = elDelayed.value
                        elDelayed.value = ''
                        elDelayed.value = valD
                    }
                })
            }
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault()
            let nSi = studentIdx, nKi = kriteriaIdx + 1
            if (nKi >= KRITERIA.length) { nKi = 0; nSi = studentIdx + 1 }
            if (nSi >= filteredStudents.length) nSi = 0
            focusCell(nSi, nKi)
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); focusCell(studentIdx + 1, kriteriaIdx) }
        if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(studentIdx - 1, kriteriaIdx) }
        if (e.key === 'ArrowRight') { e.preventDefault(); focusCell(studentIdx, kriteriaIdx + 1) }
        if (e.key === 'ArrowLeft') { e.preventDefault(); focusCell(studentIdx, kriteriaIdx - 1) }
    }, [filteredStudents.length])

    // ── Archive
    const loadArchive = useCallback(async () => {
        setArchiveLoading(true)
        try {
            // FIX MAJOR: Supabase membatasi response default 1000 baris.
            // Tanpa paginasi, arsip lama akan terpotong diam-diam tanpa error.
            // Solusi: fetch dalam batch 1000 hingga tidak ada data tersisa.
            const PAGE_SIZE = 1000
            let allReports = []
            let page = 0
            while (true) {
                const { data: batch, error: batchErr } = await supabase
                    .from('student_monthly_reports')
                    .select('student_id, month, year, musyrif_name, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa')
                    .order('year', { ascending: false })
                    .order('month', { ascending: false })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                if (batchErr) throw batchErr
                if (!batch?.length) break
                allReports = allReports.concat(batch)
                // Jika batch kurang dari PAGE_SIZE, berarti sudah halaman terakhir
                if (batch.length < PAGE_SIZE) break
                page++
            }
            const reports = allReports
            if (!reports.length) { setArchiveList([]); return }
            const studentIds = [...new Set(reports.map(r => r.student_id))]
            const { data: stuData } = await supabase.from('students').select('id, class_id').in('id', studentIds)
            const classIds = [...new Set((stuData || []).map(s => s.class_id).filter(Boolean))]
            const { data: classData } = await supabase.from('classes').select('id, name, grade, major').in('id', classIds)
            const stuMap = {}, clsMap = {}
            for (const s of (stuData || [])) stuMap[s.id] = s
            for (const c of (classData || [])) clsMap[c.id] = c
            const grouped = {}
            for (const row of reports) {
                const stu = stuMap[row.student_id]; if (!stu?.class_id) continue
                const cls = clsMap[stu.class_id]; if (!cls) continue
                const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok') || (cls.major || '').toLowerCase().includes('boarding')
                const key = `${cls.id}__${row.month}__${row.year}`
                if (!grouped[key]) grouped[key] = { key, class_id: cls.id, class_name: cls.name, month: row.month, year: row.year, musyrif: row.musyrif_name, count: 0, completed: 0, lang: isBoarding ? 'ar' : 'id' }
                grouped[key].count++
                const hasAllMainScores = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
                    .every(k => row[k] !== '' && row[k] !== null && row[k] !== undefined)
                if (hasAllMainScores) grouped[key].completed++
            }
            setArchiveList(Object.values(grouped).sort((a, b) => b.year - a.year || b.month - a.month))
        } catch (e) { addToast('Gagal memuat arsip', 'error'); console.error('loadArchive error:', e) }
        finally { setArchiveLoading(false) }
    }, [addToast])

    // ── Load student trend
    const loadStudentTrend = useCallback(async (stuIds) => {
        if (!stuIds?.length) return
        try {
            const { data } = await supabase
                .from('student_monthly_reports')
                .select('student_id, month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa')
                .in('student_id', stuIds)
                .order('year').order('month')
            const trendMap = {}
            for (const r of (data || [])) {
                if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
            }
            setStudentTrend(trendMap)
        } catch (e) { console.error('loadStudentTrend error:', e) }
    }, [])

    const loadArchiveDetail = useCallback(async (entry) => {
        setArchiveLoading(true)
        try {
            const { data: stuData } = await supabase.from('students').select('id, name, phone, metadata').eq('class_id', entry.class_id).is('deleted_at', null).order('name')
            const ids = (stuData || []).map(s => s.id)
            const { data: repData } = await supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            const scMap = {}, exMap = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                scMap[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                exMap[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
            }
            const stuList = stuData || []
            setArchivePreview({ students: stuList, scores: scMap, extras: exMap, bulanObj: BULAN.find(b => b.id === entry.month), tahun: entry.year, musyrif: entry.musyrif, className: entry.class_name, lang: entry.lang, entry })
            setStudentTrend({})
            loadStudentTrend(stuList.map(s => s.id))
        } catch (e) { addToast('Gagal memuat detail arsip', 'error'); console.error('loadArchiveDetail error:', e) }
        finally { setArchiveLoading(false) }
    }, [loadStudentTrend, addToast])

    // ── Save archive inline edits back to Supabase
    const saveArchiveEdit = useCallback(async () => {
        if (!archivePreview) return
        setArchiveEditSaving(true)
        try {
            const { students: pStu, entry } = archivePreview
            const payloads = pStu.map(s => {
                const sc = archiveEditScores[s.id] || archivePreview.scores[s.id] || {}
                const ex = archiveEditExtras[s.id] || archivePreview.extras[s.id] || {}
                return {
                    student_id: s.id,
                    month: entry.month,
                    year: entry.year,
                    musyrif_name: archivePreview.musyrif,
                    updated_by: profile?.id ?? null,
                    updated_by_name: profile?.name ?? null,
                    ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                    berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                    tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                    ziyadah: ex.ziyadah || null,
                    murojaah: ex.murojaah || null,
                    hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                    hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                    hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                    hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                    catatan: ex.catatan || null,
                }
            })
            const { error } = await supabase.from('student_monthly_reports').upsert(payloads, { onConflict: 'student_id,month,year' })
            if (error) throw error
            // Merge edits back into archivePreview so preview reflects saved data
            setArchivePreview(prev => {
                if (!prev) return prev
                const mergedScores = { ...prev.scores }
                const mergedExtras = { ...prev.extras }
                for (const sid of Object.keys(archiveEditScores)) mergedScores[sid] = { ...mergedScores[sid], ...archiveEditScores[sid] }
                for (const sid of Object.keys(archiveEditExtras)) mergedExtras[sid] = { ...mergedExtras[sid], ...archiveEditExtras[sid] }
                return { ...prev, scores: mergedScores, extras: mergedExtras }
            })
            setArchiveEditScores({})
            setArchiveEditExtras({})
            setArchiveEditMode(false)
            addToast(`${pStu.length} raport arsip berhasil diperbarui`, 'success')
            await logAudit({
                action: 'UPDATE', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { bulk_archive_edit: true, count: pStu.length, class_name: archivePreview.className, month: entry.month, year: entry.year }
            })
        } catch (e) { addToast('Gagal menyimpan: ' + e.message, 'error') }
        finally { setArchiveEditSaving(false) }
    }, [archivePreview, archiveEditScores, archiveEditExtras, addToast])

    // ── Load full monthly history for student detail drawer
    const openStudentDetailDrawer = useCallback(async (student) => {
        setStudentDetailLoading(true)
        setStudentDetailDrawer({ student, history: null })
        try {
            const { data, error } = await supabase
                .from('student_monthly_reports')
                .select('month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, catatan, musyrif_name')
                .eq('student_id', student.id)
                .order('year', { ascending: true })
                .order('month', { ascending: true })
            if (error) throw error
            const history = (data || []).map(r => ({
                month: r.month, year: r.year,
                musyrif: r.musyrif_name,
                catatan: r.catatan,
                scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
            }))
            setStudentDetailDrawer({ student, history })
        } catch (e) {
            addToast('Gagal memuat histori santri: ' + e.message, 'error')
            setStudentDetailDrawer(null)
        } finally { setStudentDetailLoading(false) }
    }, [addToast])

    const executeDeleteArchive = useCallback(async (entry) => {
        setConfirmDelete(null)
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)
            if (!ids.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const { data: toDelete } = await supabase.from('student_monthly_reports').select('id').in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            if (!toDelete?.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const { error: delErr } = await supabase.from('student_monthly_reports').delete().in('id', toDelete.map(r => r.id))
            if (delErr) throw delErr
            setArchiveList(prev => prev.filter(a => a.key !== entry.key))
            addToast('Arsip berhasil dihapus', 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'student_monthly_reports', recordId: null,
                oldData: { archive_month: entry.month, archive_year: entry.year, class_id: entry.class_id, count: toDelete.length }
            })
            loadArchive()
        } catch (e) { addToast('Gagal menghapus arsip: ' + e.message, 'error'); console.error('executeDeleteArchive error:', e) }
    }, [loadArchive, addToast])

    // ── Print
    const openPrintWindow = useCallback((stuList) => {
        if (!stuList?.length) { addToast('Tidak ada data untuk dicetak', 'warning'); return }
        setPrintRenderedCount(0); setPrintQueue(stuList.map(s => s.id))
    }, [addToast])

    const executePrint = useCallback((stuList) => {
        const container = printContainerRef.current; if (!container) return
        const cards = container.querySelectorAll('.raport-card'); if (!cards.length) { addToast('Gagal menyiapkan raport', 'error'); return }
        const html = [...cards].map(c => c.outerHTML).join('')
        const titleStr = stuList.length === 1 ? `Raport ${stuList[0].name}_${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}` : `Raport Kelas ${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}`
        const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir browser.', 'error'); setPrintQueue([]); setPrintRenderedCount(0); return }
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleStr}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Outfit:wght@700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; font-family: 'Inter', sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white; }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                .raport-card { page-break-after: always; position: relative; overflow: hidden; background: white !important; }
                img { mix-blend-mode: multiply; max-width: 100%; height: auto; }
                @media print {
                    body { background: white; }
                    .raport-card { box-shadow: none !important; border: none !important; margin: 0 !important; }
                }
            </style></head><body>${html}</body></html>`)
        win.document.close(); win.focus(); setTimeout(() => {
            win.print(); setPrintQueue([]); setPrintRenderedCount(0);
            logAudit({
                action: 'PRINT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'PDF_PRINT', count: stuList.length, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
            })
        }, 700)
    }, [selectedClass, bulanObj, selectedYear, addToast, profile, selectedMonth])

    useEffect(() => {
        if (!printQueue.length || printRenderedCount < printQueue.length) return
        const stuList = (archivePreview ? archivePreview.students : students).filter(s => printQueue.includes(s.id))
        executePrint(stuList)
    }, [printRenderedCount, printQueue, students, archivePreview, executePrint])

    // ── Export PDF bulk
    const exportBulkPDF = useCallback(async (entry) => { setPendingExport(entry); await loadArchiveDetail(entry) }, [loadArchiveDetail])
    useEffect(() => {
        if (!pendingExport || !archivePreview || archivePreview.entry?.key !== pendingExport.key) return
        const entry = pendingExport; setPendingExport(null)
        const stuIds = archivePreview.students.map(s => s.id); setPrintRenderedCount(0); setPrintQueue(stuIds)
        const tryExport = (attempt = 0) => {
            const cards = printContainerRef.current?.querySelectorAll('.raport-card')
            if ((!cards || cards.length < stuIds.length) && attempt < 30) { setTimeout(() => tryExport(attempt + 1), 200); return }
            const html = [...(cards?.length ? cards : document.querySelectorAll('.raport-card'))].map(c => c.outerHTML).join('')
            const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir.', 'error'); return }
            win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Raport ${entry.class_name} ${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year}</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Outfit:wght@700;900&family=Amiri:wght@400;700&display=swap" rel="stylesheet">
                <style>
                    @page{size:A4;margin:0}body{margin:0;padding:0;font-family:'Inter',sans-serif;background:white}.raport-card{page-break-after:always;box-sizing:border-box}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
                </style></head><body>${html}</body></html>`)
            win.document.close(); win.focus(); setTimeout(() => { win.print(); setPrintQueue([]); setPrintRenderedCount(0) }, 800)
        }
        setTimeout(() => tryExport(), 300)
    }, [pendingExport, archivePreview, addToast])

    // ── WA
    const buildWaMessage = useCallback((student, pdfUrl = null) => {
        // FIX #17: Menggunakan helper buildWaLines yang lebih terstruktur
        const lines = buildWaLines({
            student,
            sc: scores[student.id] || {},
            extras: extras[student.id],
            bulanObj,
            selectedYear,
            selectedClass,
            musyrif,
            pdfUrl,
            waFooter: settings.wa_footer,
        })
        return encodeURIComponent(lines.join('\n'))
    }, [scores, extras, bulanObj, selectedYear, selectedClass, musyrif, settings])

    const sendWATextOnly = useCallback((student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        const tab = window.open(`https://wa.me/${phone}?text=${buildWaMessage(student)}`, '_blank')
        if (!tab) addToast('Popup diblokir.', 'warning')
        else addToast(`📲 WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
    }, [buildWaMessage, addToast])

    const generatePDFBlob = useCallback(async (student, contextOverride = {}) => {
        await Promise.all([
            new Promise((res, rej) => { if (window.html2canvas) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
            new Promise((res, rej) => { if (window.jspdf?.jsPDF || window.jsPDF) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
        ])
        const activeBulanObj = contextOverride.bulanObj ?? bulanObj
        const activeYear = contextOverride.year ?? selectedYear
        const bulanStr = activeBulanObj?.id_str || String(contextOverride.month ?? selectedMonth)
        const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filename = `${safeName}_${bulanStr}_${activeYear}.pdf`
        let cardEl = document.querySelector(`.raport-card[data-student-id="${student.id}"]`)
        if (!cardEl) {
            setPrintRenderedCount(0); setPrintQueue([student.id])
            await new Promise(resolve => {
                let t = 0
                const timer = setInterval(() => {
                    const card = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 50) { clearInterval(timer); resolve() }
                }, 100)
            })
            setPrintQueue([]); setPrintRenderedCount(0)
        }
        if (!cardEl) throw new Error('Gagal render raport card')
        const rootStyles = getComputedStyle(document.documentElement)
        const cssVars = ['--color-border', '--color-surface', '--color-surface-alt', '--color-text', '--color-text-muted'].map(v => `${v}: ${rootStyles.getPropertyValue(v).trim() || '#ccc'};`).join(' ')
        const A4W = 794, A4H = 1123, wrapper = document.createElement('div')
        wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4W}px;height:${A4H}px;background:white;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;font-family:'Times New Roman',serif;`
        wrapper.innerHTML = `<style>:root{${cssVars}}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important}img{mix-blend-mode:multiply}.raport-card{width:${A4W}px!important;min-width:${A4W}px!important;height:${A4H}px!important;overflow:hidden!important;background:white!important;margin:0!important}</style>${cardEl.outerHTML}`
        document.body.appendChild(wrapper)
        await new Promise(r => setTimeout(r, 700))
        try {
            // FIX #9: withTimeout agar html2canvas tidak hang selamanya
            const canvas = await withTimeout(
                window.html2canvas(wrapper, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: A4W, height: A4H, scrollX: 0, scrollY: 0, logging: false }),
                15000,
                'Render PDF'
            )
            const jsPDF = window.jspdf?.jsPDF || window.jsPDF
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
            const blob = pdf.output('blob')
            if (!blob || blob.size < 5000) throw new Error('PDF terlalu kecil')
            return { blob, filename }
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
        }
    }, [bulanObj, selectedMonth, selectedYear])

    const uploadToSupabase = useCallback(async (blob, filename) => {
        // FIX #14: Gunakan STORAGE_BUCKET konstanta
        const path = `${selectedYear}/${bulanObj?.id_str || selectedMonth}/${filename}`
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: 'application/pdf', upsert: true })
        if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        return data.publicUrl
    }, [selectedYear, bulanObj, selectedMonth])

    const generateAndSendWA = useCallback(async (student, autoNext = false) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        const openWATab = (url) => { const tab = window.open(url, '_blank'); if (!tab) addToast('Popup diblokir browser.', 'warning') }
        if (raportLinks[student.id]) { openWATab(`https://wa.me/${phone}?text=${buildWaMessage(student, raportLinks[student.id])}`); return }
        setPreviewStudentId(student.id); await new Promise(r => setTimeout(r, 300))
        setSendingWA(prev => ({ ...prev, [student.id]: 'generating' }))
        try {
            const { blob, filename } = await generatePDFBlob(student)
            setSendingWA(prev => ({ ...prev, [student.id]: 'uploading' }))
            const url = await uploadToSupabase(blob, filename)
            setRaportLinks(prev => ({ ...prev, [student.id]: url }))
            setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
            openWATab(`https://wa.me/${phone}?text=${buildWaMessage(student, url)}`)
            addToast(`Terkirim ke wali ${student.name.split(' ')[0]}`, 'success')

            // Forensic Audit Log
            logAudit({
                action: 'SEND_WA', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                recordId: student.id,
                newData: { student_name: student.name, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear, url: raportLinks[student.id] }
            })
        } catch (err) { addToast(`Gagal: ${err.message}`, 'error'); setSendingWA(prev => ({ ...prev, [student.id]: null })); console.error('generateAndSendWA error:', err) }
    }, [raportLinks, buildWaMessage, generatePDFBlob, uploadToSupabase, addToast, profile, selectedClass, selectedMonth, selectedYear])

    // ── WA Blast runner
    const runWaBlast = useCallback(async (queue) => {
        setWaBlastConfirm(null)
        waBlastAbortRef.current = false // reset flag setiap blast baru dimulai
        setWaBlast({ queue, idx: 0, done: 0, failed: 0, active: true })
        let done = 0, failed = 0
        for (let i = 0; i < queue.length; i++) {
            // Cek abort flag di setiap iterasi — set oleh tombol Batalkan
            if (waBlastAbortRef.current) {
                addToast(`WA Blast dibatalkan — ${done} terkirim, ${queue.length - done - failed} dibatalkan`, 'warning')
                setWaBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
                return
            }
            const student = queue[i]
            setWaBlast(prev => prev ? { ...prev, idx: i, active: true } : null)
            try {
                if (!student.phone) { failed++; continue }
                const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
                let url = raportLinks[student.id]
                if (!url) {
                    setPreviewStudentId(student.id)
                    await new Promise(r => setTimeout(r, 400))
                    const { blob, filename } = await generatePDFBlob(student)
                    url = await uploadToSupabase(blob, filename)
                    setRaportLinks(prev => ({ ...prev, [student.id]: url }))
                    setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
                }
                window.open(`https://wa.me/${phone}?text=${buildWaMessage(student, url)}`, '_blank')
                done++
                await new Promise(r => setTimeout(r, 800))
            } catch (e) { failed++; console.error('WA Blast item error:', e) }
            setWaBlast(prev => prev ? { ...prev, done, failed } : null)
        }
        setWaBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
        addToast(`WA Blast selesai: ${done} terkirim, ${failed} gagal`, done > 0 ? 'success' : 'error')

        // Forensic Audit Log
        logAudit({
            action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
            newData: { format: 'WA_BLAST', count: done, failed_count: failed, class_name: selectedClass?.name, month: selectedMonth, year: selectedYear }
        })
    }, [raportLinks, generatePDFBlob, uploadToSupabase, buildWaMessage, addToast, profile, selectedClass, selectedMonth, selectedYear])

    // ── Bulk ZIP export (after generatePDFBlob so no TDZ)
    const runZipBlast = useCallback(async (stuList, archEntry) => {
        if (!window.JSZip) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
                s.onload = res; s.onerror = rej
                document.head.appendChild(s)
            })
        }
        setZipBlast({ queue: stuList, idx: 0, done: 0, failed: 0, total: stuList.length, active: true })
        const zip = new window.JSZip()
        let done = 0, failed = 0
        const bulanStr = archEntry ? (BULAN.find(b => b.id === archEntry.month)?.id_str || '') : (BULAN.find(b => b.id === selectedMonth)?.id_str || '')
        const yearStr = archEntry ? archEntry.year : selectedYear
        for (let i = 0; i < stuList.length; i++) {
            const student = stuList[i]
            setZipBlast(prev => prev ? { ...prev, idx: i } : null)
            try {
                setPreviewStudentId(student.id)
                await new Promise(r => setTimeout(r, 350))
                const archCtx = archEntry ? { bulanObj: BULAN.find(b => b.id === archEntry.month), year: archEntry.year, month: archEntry.month } : {}
                const { blob, filename } = await generatePDFBlob(student, archCtx)
                zip.file(filename, blob)
                done++
            } catch (e) { failed++; console.error('ZIP item error:', e) }
            setZipBlast(prev => prev ? { ...prev, done, failed } : null)
        }
        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Raport_${archEntry?.class_name || selectedClass?.name || 'Kelas'}_${bulanStr}_${yearStr}.zip`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 5000)
            setZipBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
            addToast(`ZIP berhasil: ${done} raport diunduh`, 'success')

            // Forensic Audit Log
            logAudit({
                action: 'EXPORT', source: 'OPERATIONAL', tableName: 'student_monthly_reports',
                newData: { format: 'ZIP_ARCHIVE', count: done, failed_count: failed, class_name: archEntry?.class_name || selectedClass?.name, month: archEntry ? archEntry.month : selectedMonth, year: archEntry ? archEntry.year : selectedYear }
            })
        } catch (e) { addToast('Gagal membuat ZIP: ' + e.message, 'error'); setZipBlast(null) }
    }, [generatePDFBlob, selectedMonth, selectedYear, selectedClass, addToast, profile])

    // ─── Render helpers ───────────────────────────────────────────────────────

    useEffect(() => {
        if (step === 3 && window.innerWidth < 768) {
            const padding = 56 // extra breathing room: 12px container p-3 * 2 + 16px visual margin each side
            const containerWidth = window.innerWidth - padding
            const docWidth = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
            const fitZoom = Math.floor((containerWidth / docWidth) * 100) / 100
            setPreviewZoom(Math.max(0.3, Math.min(0.8, fitZoom)))
        }
    }, [step, pageSize])

    // ── Handle Escape key for full screen
    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') setIsFullScreenPreview(false) }
        window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
    }, [])

    const renderStep0 = () => (
        <div className="space-y-6">
            {/* Banner Raport Belum Lengkap */}
            {newMonthBanner && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 flex items-start gap-3 overflow-hidden">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] mb-0.5">Raport {newMonthBanner.prevMonthStr} {newMonthBanner.prevYear} belum lengkap!</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-3">
                            {newMonthBanner.classesNotArchived.length} kelas masih ada santri yang belum diisi.
                        </p>

                        {/* Mobile: Grid 2 Col | Tablet: 3-4 Col | Desktop: Flex Wrap */}
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:flex md:flex-wrap items-center gap-2 mt-3">
                            {(showAllIncompleteBanner ? newMonthBanner.classesNotArchived : newMonthBanner.classesNotArchived.slice(0, 8)).map(cls => (
                                <button
                                    key={cls.class_id}
                                    onClick={() => {
                                        setSelectedClassId(cls.class_id);
                                        setSelectedMonth(newMonthBanner.prevMonth);
                                        setSelectedYear(newMonthBanner.prevYear);
                                        const clsObj = classesList.find(c => c.id === cls.class_id);
                                        if (clsObj) {
                                            const n = (clsObj.name || '').toLowerCase();
                                            setLang(n.includes('boarding') || n.includes('pondok') ? 'ar' : 'id')
                                        };
                                        setStep(1)
                                    }}
                                    className="h-9 px-3 rounded-xl bg-white/70 border border-amber-500/30 text-amber-900 text-[10px] font-black hover:bg-white hover:shadow-md hover:border-amber-500 transition-all flex items-center justify-between gap-2 shrink-0 shadow-sm"
                                >
                                    <span className="truncate min-w-0">{cls.class_name.split(' ')[0]}</span>
                                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${cls.filled === 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {cls.filled}/{cls.total}
                                    </span>
                                </button>
                            ))}
                            {!showAllIncompleteBanner && newMonthBanner.classesNotArchived.length > 8 && (
                                <button
                                    onClick={() => setShowAllIncompleteBanner(true)}
                                    className="h-9 px-3 rounded-xl bg-amber-500/10 border border-dashed border-amber-500/40 text-amber-600 text-[9px] font-black hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                                >
                                    +{newMonthBanner.classesNotArchived.length - 8} kelas lagi
                                </button>
                            )}
                            {showAllIncompleteBanner && (
                                <button
                                    onClick={() => setShowAllIncompleteBanner(false)}
                                    className="h-9 px-3 rounded-xl text-amber-600 text-[9px] font-black hover:underline transition-all"
                                >
                                    Sembunyikan
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-amber-500/10">
                            <button onClick={() => setNewMonthBanner(null)} className="h-8 px-4 rounded-xl bg-white/50 border border-amber-500/20 text-amber-700 text-[9px] font-black hover:bg-white transition-all">
                                Nanti
                            </button>
                            <button onClick={() => { localStorage.setItem(newMonthBanner.dismissKey, '1'); setNewMonthBanner(null) }} className="h-8 px-4 rounded-xl bg-white/50 border border-amber-500/20 text-amber-700 text-[9px] font-black hover:bg-white transition-all">
                                Jangan ingatkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Banner Lanjutkan Sesi Terakhir */}
            {lastSession && classesList.find(c => c.id === lastSession.classId) && (
                <div className="flex items-center gap-3 p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faBolt} className="text-indigo-500 text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] leading-tight">Lanjutkan yang tadi?</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-medium truncate opacity-70">
                            {lastSession.className} · {BULAN.find(b => b.id === lastSession.month)?.id_str} {lastSession.year}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={async () => {
                                setSelectedClassId(lastSession.classId); setSelectedMonth(lastSession.month); setSelectedYear(lastSession.year); setLang(lastSession.useLang)
                                const ok = await loadStudents(lastSession.classId, lastSession.month, lastSession.year, lastSession.useLang)
                                if (ok) setStep(2)
                            }}
                            className="h-8 px-4 rounded-xl bg-indigo-600 text-white text-[9px] font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/20"
                        >
                            Buka →
                        </button>
                        <button
                            onClick={() => { localStorage.removeItem('raport_last_session'); setLastSession(null) }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                        </button>
                    </div>
                </div>
            )}

            {/* ── SEARCH & FILTER CONTROLS ── */}
            <div className="flex flex-col gap-4 border-b border-[var(--color-border)]/50 pb-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <FontAwesomeIcon icon={faSchool} className="text-indigo-500 text-sm" />
                        </div>
                        <label className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--color-text-muted)]">Pilih Kelas</label>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Search Row */}
                    <div className="relative flex-1 group">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[11px] opacity-40 group-focus-within:text-indigo-500 group-focus-within:opacity-100 transition-all" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Cari nama kelas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-11 pl-11 pr-10 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] outline-none text-[13px] font-bold transition-all focus:border-indigo-500/50 focus:shadow-xl focus:shadow-indigo-500/5 text-[var(--color-text)]"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 transition-all">
                                <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                            </button>
                        )}
                    </div>

                    {/* Filter Row (Fixed grid on mobile to avoid 'offside') */}
                    <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl w-full sm:w-auto overflow-hidden shrink-0 shadow-inner">
                        {[
                            { id: 'all', label: 'Semua', icon: faSchool },
                            { id: 'boarding', label: 'Boarding', icon: faMoon },
                            { id: 'regular', label: 'Reguler', icon: faSun }
                        ].map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setFilterType(opt.id)}
                                className={`h-9 sm:px-5 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${filterType === opt.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white dark:hover:bg-slate-800'}`}
                            >
                                <FontAwesomeIcon icon={opt.icon} className="text-[9px] shrink-0" />
                                <span className="whitespace-nowrap">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid Area */}
            <div className="relative">
                {filteredClasses.length === 0 && !pageLoading ? (
                    <EmptyState
                        variant="dashed"
                        color={searchQuery ? 'indigo' : 'slate'}
                        icon={searchQuery ? faMagnifyingGlass : faSchool}
                        title={searchQuery ? `"${searchQuery}" tidak ditemukan` : 'Belum ada kelas'}
                        description={searchQuery ? 'Coba kata kunci lain atau hapus filter.' : 'Tambahkan kelas di menu Master Terlebih dahulu.'}
                        action={searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="h-10 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:shadow-lg transition-all flex items-center gap-2 mx-auto">
                                <FontAwesomeIcon icon={faXmark} /> Reset Filter
                            </button>
                        )}
                    />
                ) : pageLoading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {filteredClasses.map(cls => {
                            const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                            const prog = classProgress[cls.id]
                            const teacher = cls.teachers?.name || 'Wali Kelas -'
                            const isDone = prog && prog.total > 0 && prog.done === prog.total
                            const isPartial = prog && prog.done > 0 && prog.done < prog.total
                            const pct = typeof prog?.pct === 'number'
                                ? prog.pct
                                : (prog?.total ? Math.round((prog.done / prog.total) * 100) : 0)
                            const lastLabel = prog?.lastMonth ? `${BULAN.find(b => b.id === prog.lastMonth)?.id_str} ${prog.lastYear}` : null

                            return (
                                <div key={cls.id} className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/50 hover:shadow-md transition-all duration-200 flex items-center p-2.5 gap-3 h-[72px]">
                                    {/* Small Initial */}
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px] transition-all ${isDone ? 'bg-emerald-500 text-white' : isBoarding ? 'bg-indigo-500/10 text-indigo-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                        {cls.name?.charAt(0)}
                                    </div>

                                    {/* Main Info Area */}
                                    <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-[11px] font-black text-[var(--color-text)] truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none">{cls.name}</h3>
                                            <span className={`text-[6px] font-black px-1 py-0.5 rounded-md border shrink-0 ${isBoarding ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' : 'bg-sky-500/10 text-sky-500 border-sky-500/20'}`}>
                                                {isBoarding ? 'B' : 'R'}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] truncate opacity-60 leading-none">{teacher}</p>

                                        {/* Slim Progress */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="h-1 flex-1 rounded-full bg-[var(--color-border)]/40 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span className="text-[8px] font-black text-indigo-500 w-6 text-right">{pct}%</span>
                                        </div>
                                    </div>

                                    {/* Right Side Actions */}
                                    <div className="flex items-center gap-1 shrink-0 ml-1 h-full pl-2 border-l border-[var(--color-border)]/50">
                                        <button
                                            onClick={async () => {
                                                const m = now.getMonth() + 1, y = now.getFullYear(), l = isBoarding ? 'ar' : 'id'
                                                setSelectedClassId(cls.id); setSelectedMonth(m); setSelectedYear(y); setLang(l)
                                                const ok = await loadStudents(cls.id, m, y, l); if (ok) setStep(2)
                                            }}
                                            title="Mulai Input"
                                            className="w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg transition-all flex items-center justify-center shrink-0"
                                        >
                                            <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedClassId(cls.id); setStep(4); loadArchive() }}
                                            disabled={!lastLabel}
                                            title="Lihat Arsip"
                                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-all ${lastLabel ? 'border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-indigo-500/30 hover:text-indigo-600 text-[var(--color-text-muted)]' : 'opacity-20 cursor-not-allowed border-dashed'}`}
                                        >
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-[10px]" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )

    const renderStep1 = () => {
        if (!selectedClassId) {
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faSchool} className="text-indigo-500 text-xl" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[var(--color-text)]">Pilih Kelas</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Langkah awal: Pilih kelas yang ingin dibuatkan laporan raportnya.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="relative">
                            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-xs" />
                            <input
                                type="text"
                                placeholder="Cari nama kelas..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-11 pr-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all shadow-sm"
                            />
                        </div>

                        {filteredClasses.length === 0 ? (
                            <EmptyState
                                icon={faMagnifyingGlass}
                                title="Kelas tidak ditemukan"
                                subtitle="Coba kata kunci lain atau pastikan kelas sudah terdaftar."
                                variant="dashed"
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {filteredClasses.map(cls => {
                                    const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                                    const teacher = cls.teachers?.name || 'Wali Kelas -'
                                    const studentCount = classProgress[cls.id]?.total || 0

                                    return (
                                        <button
                                            key={cls.id}
                                            onClick={() => {
                                                setSelectedClassId(cls.id)
                                                setLang(isBoarding ? 'ar' : 'id')
                                                if (cls.metadata?.homeroom_teacher) setMusyrif(cls.metadata.homeroom_teacher)
                                            }}
                                            className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group flex items-center gap-3 shadow-sm active:scale-[0.98]"
                                        >
                                            {/* Leading Initial */}
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs transition-all ${isBoarding ? 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white' : 'bg-indigo-500/10 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                                                {cls.name?.charAt(0)}
                                            </div>

                                            {/* Core Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className="text-[12px] font-black text-[var(--color-text)] group-hover:text-indigo-600 transition-colors truncate">{cls.name}</span>
                                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md border shrink-0 ${isBoarding ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'}`}>
                                                        {isBoarding ? 'Boarding' : 'Reguler'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-70">
                                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] truncate">{teacher}</p>
                                                    <div className="w-1 h-1 rounded-full bg-[var(--color-border)] shrink-0" />
                                                    <p className="text-[9px] font-bold text-indigo-500 shrink-0">{studentCount} Siswa</p>
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="flex pt-4 border-t border-[var(--color-border)]">
                        <button onClick={() => setStep(0)} className="h-11 px-6 rounded-xl border border-[var(--color-border)] text-xs font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                            <FontAwesomeIcon icon={faArrowLeft} /> Kembali ke Beranda
                        </button>
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faClipboardList} className="text-emerald-500 text-xl" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[var(--color-text)]">Setup Raport Bulanan</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Langkah 2: Tentukan periode dan bahasa pengantar untuk raport kelas ini.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faSchool} className="opacity-60" /> Kelas Terpilih
                            </label>
                            <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-[1.2rem] bg-emerald-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-500/20 shrink-0">
                                        {selectedClass?.name?.charAt(0) || 'K'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[14px] font-black text-[var(--color-text)] truncate leading-tight">
                                            {selectedClass?.name || 'Memuat nama kelas...'}
                                        </p>
                                        <p className="text-[10px] text-emerald-600/70 font-bold uppercase tracking-wider">Kelas Terpilih</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setSelectedClassId(''); setMusyrif('') }}
                                    className="h-9 px-4 rounded-xl border border-emerald-500/30 bg-white text-emerald-600 text-[11px] font-black hover:bg-emerald-500/10 transition-all shrink-0 shadow-sm active:scale-95"
                                >
                                    Ganti
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bulan</label>
                                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="w-full h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all">
                                    {BULAN.map(b => <option key={b.id} value={b.id}>{b.id_str} — {b.ar}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun</label>
                                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="w-full h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all">
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Musyrif / Wali Kelas</label>
                                {homeroomTeacherName && musyrif !== homeroomTeacherName && (
                                    <button type="button" onClick={() => setMusyrif(homeroomTeacherName)} className="text-[9px] font-black text-indigo-500 hover:underline">Reset ke Wali Kelas</button>
                                )}
                            </div>
                            <input value={musyrif} onChange={e => setMusyrif(e.target.value)} placeholder={homeroomTeacherName || "Nama lengkap musyrif..."} className="w-full h-11 px-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Bahasa</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ v: 'ar', label: 'العربية', sub: 'Pondok / Boarding', icon: '☪️' }, { v: 'id', label: 'Indonesia', sub: 'Sekolah / Reguler', icon: '🇮🇩' }].map(opt => (
                                    <button key={opt.v} onClick={() => setLang(opt.v)} className={`p-4 rounded-2xl border text-left transition-all ${lang === opt.v ? 'bg-indigo-500/10 border-indigo-500/50 shadow-sm' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-indigo-500/20'}`}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-base font-black ${lang === opt.v ? 'text-indigo-600' : 'text-[var(--color-text)]'}`}>{opt.label}</span>
                                            <span className="text-lg">{opt.icon}</span>
                                        </div>
                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-tight">{opt.sub}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 sm:gap-4 pt-4 border-t border-[var(--color-border)]">
                    <button onClick={() => { setSelectedClassId(''); setMusyrif('') }} className="h-12 px-4 rounded-2xl border border-[var(--color-border)] text-xs sm:text-sm font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center gap-2 shrink-0">
                        <FontAwesomeIcon icon={faArrowLeft} /> <span className="hidden sm:inline">Kembali</span>
                    </button>
                    <button onClick={async () => { if (!selectedClassId) return; const ok = await loadStudents(); if (ok) setStep(2) }} disabled={!selectedClassId || loading} className="flex-1 h-12 rounded-2xl bg-emerald-500 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 overflow-hidden px-2">
                        {loading ? (
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                            <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-70" />
                        )}
                        <span className="whitespace-nowrap">
                            {loading ? 'Memuat Santri...' : 'Mulai Input Nilai'}
                        </span>
                    </button>
                </div>
            </div>
        )
    }

    const renderStep2 = () => {
        return (
            <div className="space-y-4">
                {/* ── TOOLBAR CONTAINER ── */}
                <div className="pt-2 pb-3 space-y-3 mb-2">
                    {/* ── ROW 1: Context + Progress + Actions ── */}
                    <div className="w-full flex flex-wrap items-center justify-between gap-3 gap-y-4">
                        {/* Left: Context */}
                        <div className="flex items-center gap-2 overflow-hidden">
                            <button onClick={() => {
                                if (hasUnsavedMemo) {
                                    setPendingNav({ action: () => { setStep(0); setSelectedClassId('') } })
                                    return
                                }
                                setStep(0); setSelectedClassId('')
                            }} className="h-9 w-9 md:h-10 md:w-auto md:px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center justify-center md:gap-1.5 shrink-0">
                                <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                                <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider">Ganti Kelas</span>
                            </button>
                            <div className="flex items-center gap-2 px-3 h-9 md:h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shrink-0 overflow-hidden">
                                <FontAwesomeIcon icon={faSchool} className="text-emerald-500 text-[10px] shrink-0" />
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-[10px] font-black text-[var(--color-text)] whitespace-nowrap">{selectedClass?.name}</span>
                                    <span className="hidden sm:inline w-px h-3 bg-[var(--color-border)] mx-1" />
                                    <span className="hidden sm:inline text-[9px] font-bold text-[var(--color-text-muted)] uppercase">{BULAN[selectedMonth - 1]?.id_str} {selectedYear}</span>
                                </div>
                            </div>
                        </div>

                        {/* Middle: Progress (Desktop only) */}
                        <div className="flex-1 min-w-0 hidden lg:flex items-center gap-4 px-4">
                            <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden relative">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : progressPct > 50 ? '#6366f1' : '#f59e0b' }} />
                            </div>
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase whitespace-nowrap">{Math.round(progressPct)}% Input</span>
                        </div>

                        {/* Right: Primary Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Salin Bin Lalu (Desktop only) */}
                            <button onClick={() => setShowCopyModal(true)} className="hidden md:flex h-10 px-5 rounded-xl border border-sky-500/20 bg-sky-500/5 text-sky-600 text-[10px] font-black uppercase tracking-widest hover:bg-sky-500/10 transition-all items-center gap-2.5">
                                <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" /><span>Salin Bin Lalu</span>
                            </button>

                            <button onClick={saveAll} disabled={savingAll || !canEdit} className="h-9 px-4 md:h-10 md:px-6 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 relative disabled:opacity-70 shrink-0">
                                <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin' : ''} />
                                <span className="hidden md:inline">{savingAll ? 'Menyimpan...' : 'Simpan Semua'}</span>
                                {!savingAll && hasUnsavedMemo && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white animate-pulse" />}
                            </button>
                            <button onClick={() => setStep(3)} className="h-9 w-9 md:h-10 md:w-auto md:px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center md:gap-2.5 shrink-0">
                                <FontAwesomeIcon icon={faPrint} />
                                <span className="hidden md:inline text-[10px] uppercase font-black tracking-widest">Preview & Cetak</span>
                            </button>
                        </div>
                    </div>

                    {/* ── ROW 2: Search + Filters + Exports ── */}
                    <div className="w-full max-w-full flex md:flex-row flex-col md:items-center gap-2">
                        {/* Search & Nav (Compact Row) */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {/* Navigation Guide (Desktop Only) */}
                            <div className="hidden md:flex items-center gap-2 px-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                <FontAwesomeIcon icon={faBolt} className="text-amber-500 text-[10px]" />
                                <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">Navigasi:</span>
                                <div className="flex items-center gap-1.5 ml-1">
                                    <span className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px] font-bold">TAB/ENTER</span>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)]">-</span>
                                    <div className="flex items-center gap-0.5">
                                        <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">↑</span>
                                        <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">↓</span>
                                        <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">←</span>
                                        <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">→</span>
                                    </div>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="relative flex-1 md:w-93 shrink-0">
                                <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px] pointer-events-none" />
                                <input type="text" placeholder="Cari santri..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                    className="h-9 md:h-10 w-full pl-8 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                            </div>
                        </div>

                        {/* Tools & Exports */}
                        <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-end gap-2">
                            <div className="flex items-center gap-1.5 md:gap-2">

                                <button onClick={() => { setBulkMode(v => !v); setBulkValues({}); setBulkSelected(new Set()) }} className={`h-9 px-4 w-full md:w-auto rounded-xl border text-[10px] font-black flex items-center justify-center md:justify-start gap-2 transition-all ${bulkMode ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                    <FontAwesomeIcon icon={faFillDrip} className="text-[10px]" />
                                    <span>Isi Massal</span>
                                </button>

                                {noPhoneCount > 0 && (
                                    <button
                                        onClick={() => { setShowNoPhoneOnly(v => !v); setShowIncompleteOnly(false) }}
                                        className={`h-10 px-4 rounded-xl border text-[10px] font-black hidden md:flex items-center gap-2 transition-all ${showNoPhoneOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}
                                    >
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                                        <span className="whitespace-nowrap">{noPhoneCount} Tanpa WA</span>
                                    </button>
                                )}
                            </div>

                            <div className="hidden md:block w-px h-4 bg-[var(--color-border)] mx-1" />

                            {/* Export Group (Grid on mobile, flex on desktop) */}
                            <div className="grid grid-cols-4 md:flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 md:pb-0">
                                <button onClick={exportCSV} className="h-9 md:px-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 text-[10px] font-black flex items-center justify-center transition-all hover:bg-teal-500/20">CSV</button>
                                <button onClick={exportXLS} className="h-9 md:px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black flex items-center justify-center transition-all hover:bg-emerald-500/20" title="Export Kelas Ini (XLS)">XLS</button>
                                <button onClick={() => {
                                    const completeds = students.filter(s => isComplete(scores[s.id] || {}))
                                    if (completeds.length) runZipBlast(completeds, null)
                                }} className="h-9 md:px-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[10px] font-black flex items-center justify-center transition-all hover:bg-sky-500/20">ZIP</button>
                                <button onClick={() => {
                                    const withPhone = students.filter(s => s.phone && isComplete(scores[s.id] || {}))
                                    if (withPhone.length) setWaBlastConfirm({ queue: withPhone })
                                }} className="h-9 md:px-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-black flex items-center justify-center gap-1.5 transition-all hover:bg-green-500/20">
                                    <FontAwesomeIcon icon={faWhatsapp} className="text-[12px]" /> <span className="hidden md:inline">Blast WA</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* UIUX: Floating Bulk Action Bar */}
                <BulkActionBar
                    selectedCount={bulkSelected.size}
                    onSave={async () => {
                        const selected = students.filter(s => bulkSelected.has(s.id))
                        if (!selected.length) return
                        const hasAnyData = (sc, ex) =>
                            KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                            ].some(v => v !== '' && v !== null && v !== undefined)
                        const toSave = selected.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
                        if (!toSave.length) { addToast('Santri yang dipilih belum ada yang diisi nilainya', 'warning'); return }
                        setSavingAll(true)
                        try {
                            const payloads = toSave.map(s => {
                                const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                                return {
                                    student_id: s.id, month: selectedMonth, year: selectedYear,
                                    musyrif_name: musyrif, updated_by: profile?.id ?? null,
                                    updated_by_name: profile?.name ?? null,
                                    ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                                    berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null,
                                    tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null,
                                    ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null,
                                    hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0,
                                    hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0,
                                    hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0,
                                    hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0,
                                    catatan: ex.catatan || null
                                }
                            })
                            const { data: upserted, error } = await supabase.from('student_monthly_reports').upsert(payloads, { onConflict: 'student_id,month,year' }).select('id, student_id')
                            if (error) throw error
                            if (upserted?.length) {
                                setExistingReportIds(prev => {
                                    const next = { ...prev }
                                    for (const r of upserted) next[r.student_id] = r.id
                                    return next
                                })
                            }
                            setSavedIds(prev => { const n = new Set(prev); toSave.forEach(s => n.add(s.id)); return n })
                            const skipped = selected.length - toSave.length
                            addToast(skipped > 0 ? `${toSave.length} disimpan, ${skipped} dilewati (kosong)` : `${toSave.length} raport tersimpan`, 'success')
                            setBulkSelected(new Set())
                        } catch (e) { addToast('Gagal simpan: ' + e.message, 'error') }
                        finally { setSavingAll(false) }
                    }}
                    onWA={() => {
                        const withPhone = students.filter(s => bulkSelected.has(s.id) && s.phone && isComplete(scores[s.id] || {}))
                        if (!withPhone.length) { addToast('Tidak ada santri terpilih dengan WA & nilai lengkap', 'warning'); return }
                        setWaBlastConfirm({ queue: withPhone })
                    }}
                    onExport={() => {
                        const toExport = students.filter(s => bulkSelected.has(s.id) && isComplete(scores[s.id] || {}))
                        if (!toExport.length) { addToast('Tidak ada santri terpilih dengan nilai lengkap', 'warning'); return }
                        runZipBlast(toExport, null)
                    }}
                    onCancel={() => {
                        setBulkSelected(new Set())
                        setBulkMode(false)
                    }}
                />
                {bulkMode && (
                    <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-3">
                        {/* Compact Header */}
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faFillDrip} className="text-violet-500 text-[10px]" />
                            </div>
                            <div className="flex flex-col gap-0">
                                <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">Isi Massal Nilai</span>
                                <span className="text-[9px] text-[var(--color-text-muted)] leading-tight">Berlaku hanya untuk kolom yang masih kosong.</span>
                            </div>
                        </div>

                        {/* Input Grid: Slimmer & Faster */}
                        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-end gap-2 md:gap-3">
                            {KRITERIA.map(k => (
                                <div key={k.key} className="flex flex-col gap-1 flex-1 min-w-[70px]">
                                    <span className="text-[9px] font-black uppercase tracking-tight truncate opacity-80" style={{ color: k.color }}>{k.id}</span>
                                    <input type="number" min={0} max={MAX_SCORE} placeholder="—"
                                        value={bulkValues[k.key] ?? ''}
                                        onChange={e => setBulkValues(prev => ({ ...prev, [k.key]: e.target.value === '' ? '' : Math.min(MAX_SCORE, Math.max(0, Number(e.target.value))) }))}
                                        className="w-full h-8 text-center text-[11px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Actions Row: Compact */}
                        <div className="flex items-center gap-2 pt-0.5">
                            <button onClick={() => {
                                const keys = Object.keys(bulkValues).filter(k => bulkValues[k] !== '')
                                if (!keys.length) { addToast('Isi minimal satu nilai', 'warning'); return }
                                const changedIds = students
                                    .filter(s => {
                                        const cur = scores[s.id] || {}
                                        return keys.some(k => cur[k] === '' || cur[k] === null || cur[k] === undefined)
                                    })
                                    .map(s => s.id)
                                if (!changedIds.length) {
                                    addToast('Semua kolom sudah memiliki nilai', 'warning')
                                    return
                                }
                                setScores(prev => {
                                    const next = { ...prev }
                                    for (const s of students) {
                                        const cur = next[s.id] || {}
                                        const updated = { ...cur }
                                        let changed = false
                                        for (const k of keys) {
                                            if (cur[k] === '' || cur[k] === null || cur[k] === undefined) {
                                                updated[k] = bulkValues[k]; changed = true
                                            }
                                        }
                                        if (changed) next[s.id] = updated
                                    }
                                    return next
                                })
                                changedIds.forEach(id => {
                                    setSavedIds(p => { const n = new Set(p); n.delete(id); return n })
                                    triggerAutoSave(id)
                                })
                                addToast(`Berhasil diterapkan ke ${changedIds.length} santri`, 'success')
                                setBulkMode(false)
                            }} className="flex-1 md:flex-none h-8 px-5 rounded-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                                <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Terapkan
                            </button>
                            <button onClick={() => setBulkValues({})} className="h-8 px-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">Reset</button>
                        </div>
                    </div>
                )}
                {/* UIUX: Desktop table (md+) */}
                <div className="hidden md:block">
                    <div
                        ref={tableScrollRef}
                        className="overflow-x-auto rounded-xl border border-[var(--color-border)]"
                        style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', overflowAnchor: 'none' }}
                    >
                        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 910, tableLayout: 'fixed' }}>
                            <colgroup>
                                {bulkMode && <col style={{ width: 36 }} />}
                                <col style={{ width: 140 }} />{KRITERIA.map(k => <col key={k.key} style={{ width: 55 }} />)}<col style={{ width: 170 }} /><col style={{ width: 160 }} /><col style={{ width: 130 }} />
                            </colgroup>
                            <thead className="sticky top-0 z-20" style={{ boxShadow: '0 1px 0 var(--color-border)' }}>
                                <tr style={{ background: 'none' }}>
                                    {bulkMode && (
                                        <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                            <input type="checkbox"
                                                checked={bulkSelected.size === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={e => setBulkSelected(e.target.checked ? new Set(filteredStudents.map(s => s.id)) : new Set())}
                                                aria-label="Pilih semua"
                                                className="w-3.5 h-3.5 accent-violet-500 cursor-pointer"
                                            />
                                        </th>
                                    )}
                                    <th className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] sticky left-0 z-10" style={{ background: 'var(--color-surface-alt)', padding: '10px 0', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>Santri</th>
                                    {KRITERIA.map(k => (<th key={k.key} style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ direction: 'rtl', fontSize: 14, fontWeight: 900, color: k.color, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: 'serif' }}>{k.arShort}</span><span style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{k.id}</span></div></th>))}
                                    <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fisik</span><span style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.55, fontWeight: 600 }}>BB · TB · Skt · Izin · Alpa · Plg</span></div></th>
                                    <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Hafalan & Catatan</span></div></th>
                                    <th className="sticky right-0 z-10" style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, background: 'var(--color-surface-alt)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* PERF-3: Virtual scroll — spacer atas */}
                                {filteredStudents.length > 20 && visibleRange.start > 0 && (
                                    <tr style={{ height: visibleRange.start * ROW_HEIGHT }}><td colSpan={99} /></tr>
                                )}
                                {/* Empty state */}
                                {filteredStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={99} className="py-20 text-center">
                                            <EmptyState
                                                icon={faUsers}
                                                title={showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : 'Santri tidak ditemukan'}
                                                subtitle={showIncompleteOnly ? 'Tidak ada santri yang nilainya belum diisi.' : 'Coba kata kunci lain atau hapus filter.'}
                                            />
                                            <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }}
                                                className="h-8 px-4 rounded-lg border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                                Tampilkan Semua
                                            </button>
                                        </td>
                                    </tr>
                                )}
                                {/* Render rows */}
                                {(filteredStudents.length > 20
                                    ? filteredStudents.slice(visibleRange.start, visibleRange.end)
                                    : filteredStudents
                                ).map((student, _vi) => {
                                    const si = filteredStudents.length > 20 ? visibleRange.start + _vi : _vi
                                    const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                                    return (
                                        <StudentRow key={student.id}
                                            student={student} si={si} sc={sc} ex={ex}
                                            isSaved={savedIds.has(student.id)}
                                            isSaving={!!saving[student.id]}
                                            isDirty={!savedIds.has(student.id) && (KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null) || Object.values(ex).some(v => v !== '' && v !== null))}
                                            isChecked={bulkSelected.has(student.id)}
                                            bulkMode={bulkMode} lang={lang}
                                            trendData={studentTrend[student.id]}
                                            prevScores={prevMonthScores[student.id]}
                                            templateOpen={templateOpenId === student.id}
                                            catatanArab={catatanArabMap[student.id]}
                                            sendingWAStatus={sendingWA[student.id]}
                                            onScoreChange={handleScoreChange}
                                            onExtraChange={handleExtraChange}
                                            onCatatanChange={handleCatatanChange}
                                            onSave={saveStudent}
                                            onWA={generateAndSendWA}
                                            onPDF={handlePDF}
                                            onReset={handleResetStudent}
                                            onBulkToggle={handleBulkToggle}
                                            onKeyDown={handleKeyDown}
                                            onTemplateToggle={handleTemplateToggle}
                                            onTemplateApply={handleTemplateApply}
                                            onTranslitToggle={handleTranslitToggle}
                                            cellRefs={cellRefs}
                                        />
                                    )
                                })}
                                {/* PERF-3: Virtual scroll — spacer bawah */}
                                {filteredStudents.length > 20 && visibleRange.end < filteredStudents.length && (
                                    <tr style={{ height: (filteredStudents.length - visibleRange.end) * ROW_HEIGHT }}><td colSpan={99} /></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── UIUX: Mobile card view (< md) ── */}
                <div className="md:hidden">
                    {filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-text-muted)]">
                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                <FontAwesomeIcon icon={showIncompleteOnly ? faCircleCheck : showNoPhoneOnly ? faCircleCheck : faMagnifyingGlass} className="text-xl opacity-30" />
                            </div>
                            <p className="text-[12px] font-black">{showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : showNoPhoneOnly ? 'Semua santri sudah ada nomor WA ✓' : 'Santri tidak ditemukan'}</p>
                            <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }} className="h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">Tampilkan Semua</button>
                        </div>
                    ) : (() => {
                        const safeIdx = Math.min(mobileActiveIdx, filteredStudents.length - 1)
                        const student = filteredStudents[safeIdx]
                        if (!student) return null
                        const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                        const avg = calcAvg(sc), isSaved = savedIds.has(student.id), isSaving = saving[student.id]
                        const isDirty = !isSaved && KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined)
                        const complete = isComplete(sc)
                        const goTo = (idx) => setMobileActiveIdx(Math.max(0, Math.min(filteredStudents.length - 1, idx)))
                        let _touchStartX = 0
                        const onTouchStart = (e) => { _touchStartX = e.touches[0].clientX }
                        const onTouchEnd = (e) => { const dx = e.changedTouches[0].clientX - _touchStartX; if (dx < -50) goTo(safeIdx + 1); else if (dx > 50) goTo(safeIdx - 1) }
                        return (
                            <div>
                                {/* Sticky nama + counter */}
                                <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl border bg-[var(--color-surface)] shadow-sm"
                                    style={{ borderColor: complete ? '#10b98130' : isDirty ? '#f59e0b30' : 'var(--color-border)' }}>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] shrink-0">{safeIdx + 1}/{filteredStudents.length}</span>
                                        <p className="text-[12px] font-black text-[var(--color-text)] truncate">{student.name}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {avg ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).uiColor }}>{avg}</span> : null}
                                        {complete && <FontAwesomeIcon icon={faCircleCheck} className="text-[10px] text-emerald-500" />}
                                        {isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[9px] text-amber-500 animate-spin" />}
                                        {!isSaving && isDirty && <span className="text-[8px] font-black text-amber-500">●</span>}
                                        <button onClick={() => openStudentDetailDrawer(student)}
                                            title="Histori semua raport santri ini"
                                            className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                                            <FontAwesomeIcon icon={faArrowTrendUp} className="text-[9px]" />
                                        </button>
                                    </div>
                                </div>

                                {/* Card dengan swipe gesture */}
                                <div className="rounded-2xl border bg-[var(--color-surface)] overflow-hidden transition-all"
                                    style={{ borderColor: complete ? '#10b98130' : isDirty ? '#f59e0b30' : 'var(--color-border)' }}
                                    onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                                    {/* Header */}
                                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]"
                                        style={{ background: complete ? '#10b98108' : 'var(--color-surface-alt)' }}>
                                        {bulkMode && <input type="checkbox" checked={bulkSelected.has(student.id)}
                                            onChange={e => setBulkSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(student.id) : n.delete(student.id); return n })}
                                            className="w-4 h-4 accent-violet-500" />}
                                        <RadarChart scores={sc} size={38} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-black text-[var(--color-text)] truncate">{student.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                {avg ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).uiColor }}>{avg} — {GRADE(Number(avg)).id}</span>
                                                    : <span className="text-[9px] text-[var(--color-text-muted)]">Belum diisi</span>}
                                                {isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[9px] text-amber-500 animate-spin" />}
                                                {!isSaving && isSaved && <FontAwesomeIcon icon={faCircleCheck} className="text-[9px] text-emerald-500" />}
                                                {!isSaving && isDirty && <span className="text-[8px] font-black text-amber-500">● belum simpan</span>}
                                            </div>
                                        </div>
                                        <button onClick={() => saveStudent(student.id)} disabled={isSaving || !canEdit}
                                            className="h-8 px-2.5 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0 transition-all"
                                            style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: `1px solid ${isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)'}` }}>
                                            <FontAwesomeIcon icon={isSaving ? faSpinner : isSaved ? faCircleCheck : faFloppyDisk} className={isSaving ? 'animate-spin' : ''} />
                                        </button>
                                    </div>
                                    {/* Body */}
                                    <div className="px-4 py-3 space-y-3">
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Nilai Kriteria</p>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {KRITERIA.map(k => (
                                                    <div key={k.key} className="flex flex-col items-center gap-0.5">
                                                        <span className="text-[7px] font-black uppercase tracking-wide" style={{ color: k.color }}>{k.id.slice(0, 3)}</span>
                                                        <input type="number" inputMode="decimal" min={0} max={MAX_SCORE} placeholder="—"
                                                            value={sc[k.key] ?? ''}
                                                            onChange={e => { const v = e.target.value === '' ? '' : Math.min(MAX_SCORE, Math.max(0, Number(e.target.value))); setScores(prev => ({ ...prev, [student.id]: { ...prev[student.id], [k.key]: v } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }}
                                                            className="w-full h-10 text-center text-base font-black rounded-xl outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            style={{ background: sc[k.key] !== '' && sc[k.key] != null ? GRADE(Number(sc[k.key])).bg : 'var(--color-surface-alt)', color: sc[k.key] !== '' && sc[k.key] != null ? GRADE(Number(sc[k.key])).uiColor : 'var(--color-text-muted)', border: `2px solid ${sc[k.key] !== '' && sc[k.key] != null ? GRADE(Number(sc[k.key])).border : 'var(--color-border)'}` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 flex justify-between items-center">
                                                <span>Fisik & Kehadiran</span>
                                                <span className="text-[7px] opacity-40 font-medium uppercase">BB • TB • SAKIT • IZIN • ALPA • PULANG</span>
                                            </p>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {[{ key: 'berat_badan', label: 'Berat Badan', icon: faWeightScale, color: '#6366f1', unit: 'kg' }, { key: 'tinggi_badan', label: 'Tinggi Badan', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' }, { key: 'hari_sakit', label: 'Sakit', icon: faBandage, color: '#ef4444', unit: 'hr' }, { key: 'hari_izin', label: 'Izin', icon: faCircleExclamation, color: '#f59e0b', unit: 'hr' }, { key: 'hari_alpa', label: 'Alpa', icon: faTriangleExclamation, color: '#ef4444', unit: 'hr' }, { key: 'hari_pulang', label: 'Pulang', icon: faDoorOpen, color: '#8b5cf6', unit: 'x' }].map(f => (
                                                    <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]" style={{ height: 32 }}>
                                                        <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                        <ExtraInput type="text" inputMode="decimal" placeholder={f.label} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                            className="flex-1 w-0 h-full text-[11px] font-black text-left px-1.5 bg-transparent text-[var(--color-text)] outline-none" />
                                                        <span className="text-[7px] font-black text-[var(--color-text-muted)] pr-1.5 opacity-60 uppercase">{f.unit}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[{ key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981' }, { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6' }].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden" style={{ height: 32 }}>
                                                    <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                    <ExtraInput placeholder={f.ph} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                        className="flex-1 w-0 h-full px-1.5 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                                            <div className="w-7 shrink-0 flex items-start justify-center pt-2" style={{ background: '#f59e0b18' }}><FontAwesomeIcon icon={faClipboardList} style={{ color: '#f59e0b', fontSize: 9 }} /></div>
                                            <ExtraTextarea placeholder="Catatan musyrif..." value={ex.catatan ?? ''} studentId={student.id} fieldKey="catatan" onCommit={handleCatatanChange}
                                                maxLength={200} rows={2} className="flex-1 w-0 px-2 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                                            <button
                                                onClick={() => { const c = generateAutoComment(sc, student.id, studentTrend[student.id]); if (!c) return; setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], catatan: c } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }}
                                                title="Generate komentar otomatis" disabled={!avg}
                                                className="shrink-0 w-8 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-30" aria-label="Generate komentar otomatis">
                                                <FontAwesomeIcon icon={faBolt} style={{ fontSize: 10 }} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={() => { setPreviewStudentId(student.id); setStep(3) }} className="flex-1 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all"><FontAwesomeIcon icon={faFilePdf} className="text-[10px]" /> PDF</button>
                                            <button onClick={() => generateAndSendWA(student)} disabled={!student.phone}
                                                className={`flex-1 h-9 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${!student.phone ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]' : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'}`}>
                                                <FontAwesomeIcon icon={faWhatsapp} className="text-[10px]" /> WA
                                            </button>
                                            <button onClick={() => setConfirmModal({ title: 'Reset Nilai?', subtitle: `Semua data ${student.name.split(' ')[0]} akan dikosongkan`, body: 'Nilai akan dihapus permanen.', icon: 'danger', variant: 'red', confirmLabel: 'Ya, Reset', onConfirm: () => { setConfirmModal(null); resetStudent(student.id) } })}
                                                className="h-9 w-9 rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-all">
                                                <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Prominent prev/next navigation */}
                                <div className="flex gap-2 mt-3">
                                    <button onClick={() => goTo(safeIdx - 1)} disabled={safeIdx === 0}
                                        className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 transition-all">
                                        <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> Sebelumnya
                                    </button>
                                    <div className="flex items-center gap-1 px-1">
                                        {filteredStudents.length <= 9
                                            ? filteredStudents.map((_, i) => (
                                                <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all"
                                                    style={{ width: i === safeIdx ? 10 : 6, height: i === safeIdx ? 10 : 6, background: i === safeIdx ? 'var(--color-primary)' : 'var(--color-border)' }} />
                                            ))
                                            : <span className="text-[9px] font-black text-[var(--color-text-muted)] whitespace-nowrap">{safeIdx + 1}/{filteredStudents.length}</span>
                                        }
                                    </div>
                                    <button onClick={() => goTo(safeIdx + 1)} disabled={safeIdx === filteredStudents.length - 1}
                                        className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 transition-all">
                                        Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                    </button>
                                </div>
                            </div>
                        )
                    })()}
                </div>{/* end md:hidden */}

                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {KRITERIA.map(k => { const vals = filteredStudents.map(s => scores[s.id]?.[k.key]).filter(v => v !== '' && v !== null && v !== undefined); const avg = vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : '—'; const g = avg !== '—' ? GRADE(Number(avg)) : null; return (<div key={k.key} className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center"><div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: k.color }}>{k.id}</div><div className="text-lg font-black" style={{ color: g?.uiColor || 'var(--color-text-muted)' }}>{avg}</div><div className="text-[7px] font-bold text-[var(--color-text-muted)]">Rata - Rata Kelas</div></div>) })}
                </div>
            </div>
        )
    }

    const renderStep3 = () => {
        const previewStudent = previewStudentId ? students.find(s => s.id === previewStudentId) : students[0]
        const completeCount = students.filter(s => isComplete(scores[s.id] || {})).length
        const totalCount = students.length
        const pct = totalCount ? Math.round((completeCount / totalCount) * 100) : 0

        return (
            <div className="space-y-6">
                {/* Header Stats */}
                <StatsCarousel count={4} cols={4}>
                    <StatCard key="total" label="Total Santri" value={totalCount} icon={faUsers} color="sky" />
                    <StatCard key="progress" label="Progress Lengkap" value={completeCount} icon={faCircleCheck} color="emerald" />
                    <StatCard key="pct" label="Persentase" value={pct} suffix="%" icon={faChartPie} color="indigo" />
                    <StatCard key="periode" label="Periode" value={`${BULAN.find(b => b.id === selectedMonth)?.id_str} ${selectedYear}`} icon={faCalendarAlt} color="amber" />
                </StatsCarousel>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Sidebar Navigation - Desktop: Sidebar, Mobile: Smart Navigator */}
                    <div className="w-full lg:w-64 xl:w-72 space-y-4 self-start lg:sticky lg:top-6">
                        <div className="p-4 lg:p-5 rounded-3xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                            <div className="flex items-center justify-between mb-3 lg:mb-4 px-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{window.innerWidth < 1024 ? 'Navigasi Santri' : 'Pilih Santri'}</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-black">{totalCount}</span>
                            </div>

                            {/* MOBILE: Smart Selector with Arrows & Custom FontAwesome Picker */}
                            <div className="lg:hidden flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const idx = students.findIndex(s => s.id === (previewStudentId || students[0].id))
                                        if (idx > 0) setPreviewStudentId(students[idx - 1].id)
                                    }}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-indigo-500 flex items-center justify-center active:scale-95 transition-all"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} />
                                </button>

                                <button
                                    onClick={() => setShowMobileStudentPicker(true)}
                                    className="flex-1 h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between gap-2 overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                        <FontAwesomeIcon
                                            icon={isComplete(scores[previewStudentId || students[0]?.id] || {}) ? faCircleCheck : faCircleExclamation}
                                            className={`text-[10px] shrink-0 ${isComplete(scores[previewStudentId || students[0]?.id] || {}) ? 'text-emerald-500' : 'text-amber-500'}`}
                                        />
                                        <span className="text-[11px] font-bold text-[var(--color-text)] truncate">
                                            {students.find(s => s.id === (previewStudentId || students[0]?.id))?.name || 'Pilih Santri'}
                                        </span>
                                    </div>
                                    <FontAwesomeIcon icon={faChevronDown} className="text-[10px] text-[var(--color-text-muted)] shrink-0" />
                                </button>

                                <button
                                    onClick={() => {
                                        const idx = students.findIndex(s => s.id === (previewStudentId || students[0].id))
                                        if (idx < students.length - 1) setPreviewStudentId(students[idx + 1].id)
                                    }}
                                    className="w-10 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-indigo-500 flex items-center justify-center active:scale-95 transition-all"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>

                            {/* MOBILE STUDENT PICKER MODAL */}
                            <Modal
                                isOpen={showMobileStudentPicker}
                                onClose={() => setShowMobileStudentPicker(false)}
                                title="Pilih Santri"
                                size="md"
                            >
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                                    {students.map(s => {
                                        const complete = isComplete(scores[s.id] || {})
                                        const active = (previewStudentId || students[0]?.id) === s.id
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    setPreviewStudentId(s.id)
                                                    setShowMobileStudentPicker(false)
                                                }}
                                                className={`w-full p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text)]'}`}
                                            >
                                                <div className="flex items-center gap-3 truncate">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface)]'}`}>
                                                        <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                                    </div>
                                                    <span className="text-xs font-bold truncate">{s.name}</span>
                                                </div>
                                                <FontAwesomeIcon
                                                    icon={complete ? faCircleCheck : faCircleExclamation}
                                                    className={`text-xs ${active ? 'text-white/80' : complete ? 'text-emerald-500' : 'text-amber-500'}`}
                                                />
                                            </button>
                                        )
                                    })}
                                </div>
                            </Modal>

                            {/* DESKTOP: Vertical Sidebar List */}
                            <div className="hidden lg:flex flex-col gap-1.5 h-[calc(100vh-320px)] min-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {students.map(s => {
                                    const complete = isComplete(scores[s.id] || {})
                                    const active = previewStudentId === s.id
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setPreviewStudentId(s.id)}
                                            className={`w-full p-2.5 rounded-xl border text-left transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/15' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-indigo-500/30'}`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                    <span className={`text-[9px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                                </div>
                                                <span className="text-[11px] font-bold truncate flex-1">{s.name}</span>
                                                {complete && <FontAwesomeIcon icon={faCircleCheck} className={`text-[10px] ${active ? 'text-white' : 'text-emerald-500'}`} />}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button onClick={() => openPrintWindow(students)} className="w-full h-11 rounded-2xl bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                                <FontAwesomeIcon icon={faPrint} /> Cetak Semua ({totalCount})
                            </button>
                            <button onClick={() => setStep(2)} className="w-full h-11 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-xs font-black hover:text-[var(--color-text)] transition-all flex items-center justify-center gap-2">
                                <FontAwesomeIcon icon={faArrowLeft} /> Kembali ke Input
                            </button>
                        </div>
                    </div>

                    {/* Right: Preview Area - Unified in one card */}
                    <div className="flex-1 flex flex-col rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
                        <div className="px-4 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            {/* Row 1: Title & Mobile Toggle */}
                            <div className="flex items-center justify-between w-full sm:w-auto">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-indigo-500 text-[10px]" />
                                    </div>
                                    <h4 className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">Preview Raport</h4>
                                </div>
                                <button
                                    onClick={() => setIsFullScreenPreview(true)}
                                    className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center sm:hidden"
                                >
                                    <FontAwesomeIcon icon={faExpand} className="scale-75" />
                                </button>
                            </div>

                            {/* Row 2 & 3: Controls */}
                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                {/* Group: Format & Lang - Stretching on Mobile */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                        <button onClick={() => setPageSize('a4')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'a4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>A4</button>
                                        <button onClick={() => setPageSize('f4')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'f4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>F4</button>
                                    </div>
                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                        <button onClick={() => setLang('ar')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>AR</button>
                                        <button onClick={() => setLang('id')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'id' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>ID</button>
                                    </div>
                                </div>

                                {/* Group: Zoom & Actions - Stretching on Mobile */}
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    {/* Zoom Control stretches on mobile */}
                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                        <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.max(0.3, p - 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><FontAwesomeIcon icon={faSearch} className="scale-75" />-</button>
                                        {/* #3: Fit-Width shortcut — tap sekali langsung fit ke lebar container */}
                                        <button
                                            onClick={() => {
                                                manualZoomRef.current = false
                                                const el = previewContainerRef.current
                                                if (!el) return
                                                const padding = window.innerWidth < 640 ? 24 : 80
                                                const availW = el.clientWidth - padding
                                                const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
                                                setPreviewZoom(Math.min(1, Math.max(0.3, Math.floor((availW / docW) * 100) / 100)))
                                            }}
                                            title="Fit ke lebar layar"
                                            className="text-[9px] font-black w-10 text-center text-indigo-500 tabular-nums hover:text-indigo-700 transition-colors cursor-pointer select-none"
                                        >{Math.round(previewZoom * 100)}%</button>
                                        <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.min(1.5, p + 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><FontAwesomeIcon icon={faSearch} className="scale-75" />+</button>
                                    </div>

                                    {previewStudent?.phone && (
                                        <button onClick={() => sendWATextOnly(previewStudent)} className="h-10 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial">
                                            <FontAwesomeIcon icon={faWhatsapp} className="text-xs" /> <span className="hidden xs:inline">Whatsapp</span>
                                        </button>
                                    )}

                                    <button onClick={() => openPrintWindow([previewStudent].filter(Boolean))} className="h-10 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-lg shadow-emerald-500/20">
                                        <FontAwesomeIcon icon={faPrint} className="text-xs" /> <span className="hidden xs:inline">Cetak</span>
                                    </button>

                                    <button
                                        onClick={() => setIsFullScreenPreview(true)}
                                        className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hidden sm:flex items-center justify-center hover:text-indigo-500 transition-all"
                                    >
                                        <FontAwesomeIcon icon={faExpand} className="scale-90" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div
                            ref={previewContainerRef}
                            className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-200 dark:bg-slate-700 flex flex-col items-center custom-scrollbar p-3 sm:p-10"
                            style={{ minHeight: window.innerWidth < 768 ? 300 : 600 }}
                            /* #5: Pinch-to-zoom gesture */
                            onTouchStart={e => {
                                if (e.touches.length === 2) {
                                    e.currentTarget._pinchStartDist = Math.hypot(
                                        e.touches[0].clientX - e.touches[1].clientX,
                                        e.touches[0].clientY - e.touches[1].clientY
                                    )
                                    e.currentTarget._pinchStartZoom = previewZoom
                                }
                            }}
                            onTouchMove={e => {
                                if (e.touches.length === 2 && e.currentTarget._pinchStartDist) {
                                    e.preventDefault()
                                    const dist = Math.hypot(
                                        e.touches[0].clientX - e.touches[1].clientX,
                                        e.touches[0].clientY - e.touches[1].clientY
                                    )
                                    const ratio = dist / e.currentTarget._pinchStartDist
                                    const newZoom = Math.min(1.5, Math.max(0.3, e.currentTarget._pinchStartZoom * ratio))
                                    manualZoomRef.current = true
                                    setPreviewZoom(Math.floor(newZoom * 100) / 100)
                                }
                            }}
                            onTouchEnd={e => { e.currentTarget._pinchStartDist = null }}
                        >
                            {/* #2: Animated eye-catching hint badge — hanya di mobile */}
                            <div className="lg:hidden flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-indigo-500/20 shadow-sm animate-pulse">
                                <FontAwesomeIcon icon={faExpand} className="text-indigo-500 text-[9px]" />
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Klik raport untuk memperbesar</span>
                            </div>
                            {/* Layout Wrapper — menggunakan transform:scale agar layout width selalu akurat di Android */}
                            {(() => {
                                // Natural px size of the paper (96dpi)
                                const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                // A4: 297mm, F4: ~330mm
                                const naturalH = pageSize === 'f4' ? 1247 : 1122
                                return (
                                    <div
                                        className="mx-auto overflow-hidden"
                                        style={{
                                            width: `${naturalW * previewZoom}px`,
                                            height: `${naturalH * previewZoom}px`,
                                        }}
                                    >
                                        {/* #4: Pulse ring animation untuk hint tap-to-fullscreen */}
                                        <div
                                            className="relative shadow-2xl rounded-xl overflow-hidden cursor-pointer transition-all group"
                                            style={{
                                                width: pageSize === 'f4' ? '215mm' : '210mm',
                                                transform: `scale(${previewZoom})`,
                                                transformOrigin: 'top left',
                                            }}
                                            onClick={() => setIsFullScreenPreview(true)}
                                        >
                                            {/* Pulse ring hanya di mobile — muncul di atas kertas */}
                                            <div className="lg:hidden absolute inset-0 rounded-xl ring-2 ring-indigo-400/40 animate-pulse pointer-events-none z-10" />
                                            <div className="lg:hidden absolute inset-0 rounded-xl ring-4 ring-indigo-400/10 animate-pulse pointer-events-none z-10" style={{ animationDelay: '0.3s' }} />
                                            {previewStudent && (
                                                <RaportPrintCard
                                                    student={previewStudent}
                                                    scores={scores[previewStudent.id]}
                                                    extra={extras[previewStudent.id]}
                                                    bulanObj={bulanObj}
                                                    tahun={selectedYear}
                                                    musyrif={musyrif}
                                                    className={selectedClass?.name}
                                                    lang={lang}
                                                    settings={settings}
                                                    pageSize={pageSize}
                                                    catatanArab={catatanArabMap[previewStudent.id]}
                                                />
                                            )}
                                        </div>
                                    </div>
                                )
                            })()}
                            <div className="hidden sm:block h-8 w-full shrink-0" />
                        </div>
                    </div>
                </div>

                {/* ── FULLSCREEN DIGITAL PREVIEW ── */}
                {isFullScreenPreview && createPortal(
                    <div
                        className="fixed inset-0 z-[99999] bg-slate-400/80 p-2 sm:p-3"
                        onClick={() => setIsFullScreenPreview(false)}
                        onMouseMove={bumpFullScreenHud}
                        onWheel={bumpFullScreenHud}
                        onTouchStart={bumpFullScreenHud}
                    >
                        <div
                            className="relative h-full w-full rounded-[24px] overflow-hidden border border-slate-200/80 bg-[#e9edf5] shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div
                                className={`absolute left-3 right-3 z-20 h-12 px-2 sm:px-3 rounded-2xl flex items-center justify-between border border-slate-200/80 bg-white/92 shadow-sm transition-all duration-200 ${showFullScreenHud ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                                style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <button
                                        onClick={() => setIsFullScreenPreview(false)}
                                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-all flex items-center justify-center shrink-0"
                                        title="Tutup fullscreen"
                                    >
                                        <FontAwesomeIcon icon={faArrowLeft} className="text-[11px]" />
                                    </button>
                                    <div className="min-w-0">
                                        <p className="text-slate-800 text-[11px] font-black truncate max-w-[140px] sm:max-w-xs">
                                            {previewStudent?.name || 'Preview'}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-[0.14em]">
                                            Digital Preview
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200">
                                        <span className="text-[9px] font-black text-slate-500">SIZE {pageSize.toUpperCase()}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-[9px] font-black text-slate-500">LANG {lang.toUpperCase()}</span>
                                    </div>
                                    <button
                                        onClick={() => openPrintWindow([previewStudent].filter(Boolean))}
                                        className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/30 flex items-center justify-center transition-all"
                                        title="Cetak Raport"
                                    >
                                        <FontAwesomeIcon icon={faPrint} className="text-[11px]" />
                                    </button>
                                </div>
                            </div>

                            <div
                                ref={fullScreenScrollRef}
                                className="h-full overflow-auto flex flex-col items-center px-3 sm:px-6 pt-20 pb-20"
                                style={{
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none',
                                    backgroundColor: 'transparent',
                                }}
                                onTouchStart={e => {
                                    bumpFullScreenHud()
                                    if (e.touches.length === 2) {
                                        e.currentTarget._pinchDist = Math.hypot(
                                            e.touches[0].clientX - e.touches[1].clientX,
                                            e.touches[0].clientY - e.touches[1].clientY
                                        )
                                        e.currentTarget._pinchZoom = fullScreenZoom
                                    }
                                }}
                                onTouchMove={e => {
                                    bumpFullScreenHud()
                                    if (e.touches.length === 2 && e.currentTarget._pinchDist) {
                                        e.preventDefault()
                                        const dist = Math.hypot(
                                            e.touches[0].clientX - e.touches[1].clientX,
                                            e.touches[0].clientY - e.touches[1].clientY
                                        )
                                        const ratio = dist / e.currentTarget._pinchDist
                                        setFullScreenZoom(Math.min(2, Math.max(0.3, Math.floor(e.currentTarget._pinchZoom * ratio * 100) / 100)))
                                    }
                                }}
                                onTouchEnd={e => { e.currentTarget._pinchDist = null }}
                                onMouseMove={bumpFullScreenHud}
                                onWheel={bumpFullScreenHud}
                                onClick={bumpFullScreenHud}
                                onTouchEndCapture={() => {
                                    bumpFullScreenHud()
                                    if (!isMobileViewport) return
                                    const now = Date.now()
                                    const since = now - fullScreenLastTapRef.current
                                    fullScreenLastTapRef.current = now
                                    if (since > 0 && since < 320) {
                                        const fit = getFullScreenFitZoom(true)
                                        setFullScreenZoom(prev => (Math.abs(prev - fit) < 0.04 ? 1 : fit))
                                    }
                                }}
                            >
                                {(() => {
                                    const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                    const naturalH = pageSize === 'f4' ? 1247 : 1122
                                    const s = fullScreenZoom
                                    return (
                                        <div
                                            className="shrink-0"
                                            style={{
                                                width: `${naturalW * s}px`,
                                                height: `${naturalH * s}px`,
                                                borderRadius: '20px',
                                                overflow: 'hidden',
                                                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                                            }}
                                        >
                                            <div style={{ width: `${naturalW}px`, transformOrigin: 'top left', transform: `scale(${s})` }}>
                                                {previewStudent && (
                                                    <RaportPrintCard
                                                        student={previewStudent}
                                                        scores={scores[previewStudent.id]}
                                                        extra={extras[previewStudent.id]}
                                                        bulanObj={bulanObj}
                                                        tahun={selectedYear}
                                                        musyrif={musyrif}
                                                        className={selectedClass?.name}
                                                        lang={lang}
                                                        settings={settings}
                                                        pageSize={pageSize}
                                                        catatanArab={catatanArabMap[previewStudent.id]}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            <div
                                className={`absolute left-3 right-3 z-20 flex items-center justify-center transition-all duration-200 ${showFullScreenHud ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
                                style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
                            >
                                <div className="max-w-full overflow-x-auto no-scrollbar">
                                    <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-2xl bg-white/92 backdrop-blur border border-slate-200 shadow-sm w-max mx-auto">
                                        <button
                                            onClick={() => setFullScreenZoom(p => Math.round(Math.max(0.3, p - 0.1) * 100) / 100)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                                            <span className="text-[10px] font-black leading-none ml-0.5">-</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFullScreenZoom(getFullScreenFitZoom(isMobileViewport))
                                            }}
                                            title="Fit ke lebar viewer"
                                            className="min-w-[52px] h-9 sm:min-w-[56px] sm:h-10 px-1.5 sm:px-2 rounded-lg sm:rounded-xl text-indigo-500 hover:text-indigo-700 hover:bg-indigo-500/10 transition-all text-[10px] sm:text-[11px] font-black tabular-nums"
                                        >
                                            {Math.round(fullScreenZoom * 100)}%
                                        </button>
                                        <button
                                            onClick={() => setFullScreenZoom(p => Math.round(Math.min(2.0, p + 0.1) * 100) / 100)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
                                            <span className="text-[10px] font-black leading-none ml-0.5">+</span>
                                        </button>
                                        <div className="w-px h-5 sm:h-6 bg-slate-300 mx-0.5 sm:mx-1" />
                                        <button
                                            onClick={() => {
                                                const idx = students.findIndex(s => s.id === (previewStudent?.id))
                                                if (idx > 0) setPreviewStudentId(students[idx - 1].id)
                                            }}
                                            disabled={!previewStudent || students.findIndex(s => s.id === previewStudent?.id) === 0}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center disabled:opacity-30"
                                        >
                                            <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                        </button>
                                        <span className="min-w-[46px] sm:min-w-[54px] text-center text-[9px] sm:text-[10px] font-black text-slate-400 tabular-nums">
                                            {(students.findIndex(s => s.id === previewStudent?.id) + 1)}/{students.length}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const idx = students.findIndex(s => s.id === (previewStudent?.id))
                                                if (idx < students.length - 1) setPreviewStudentId(students[idx + 1].id)
                                            }}
                                            disabled={!previewStudent || students.findIndex(s => s.id === previewStudent?.id) === students.length - 1}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-500 hover:text-slate-700 hover:bg-white transition-all flex items-center justify-center disabled:opacity-30"
                                        >
                                            <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                        </button>
                                        <div className="w-px h-5 sm:h-6 bg-slate-300 mx-0.5 sm:mx-1" />
                                        <button
                                            onClick={() => setIsFullScreenPreview(false)}
                                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                                        >
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        )
    }

    const renderStep4 = () => {
        const _minAvgNum = archiveMinAvg !== '' ? Number(archiveMinAvg) : null
        let filtered = archiveList.filter(e =>
            (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
            (!archiveFilter.year || String(e.year) === String(archiveFilter.year)) &&
            (!archiveFilter.month || String(e.month) === String(archiveFilter.month)) &&
            (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase())) &&
            (archiveStatusFilter === 'all' || (archiveStatusFilter === 'complete' ? e.completed === e.count && e.count > 0 : e.completed < e.count)) &&
            (_minAvgNum === null || (e.count > 0 && (e.completed / e.count) * 100 < _minAvgNum))
        )
        if (archiveSort === 'oldest') filtered = [...filtered].sort((a, b) => a.year - b.year || a.month - b.month)
        else if (archiveSort === 'name') filtered = [...filtered].sort((a, b) => a.class_name.localeCompare(b.class_name))
        else if (archiveSort === 'progress') filtered = [...filtered].sort((a, b) => (b.count ? b.completed / b.count : 0) - (a.count ? a.completed / a.count : 0))
        const uniqueYears = [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)

        if (archivePreview) {
            const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, lang: pLang, entry } = archivePreview
            const editSc = (sid) => archiveEditMode ? { ...pSc[sid], ...(archiveEditScores[sid] || {}) } : pSc[sid]
            const editEx = (sid) => archiveEditMode ? { ...pEx[sid], ...(archiveEditExtras[sid] || {}) } : pEx[sid]
            const pStudent = previewStudentId ? pStu.find(s => s.id === previewStudentId) : pStu[0]

            return (
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setArchivePreview(null); setArchiveEditMode(false) }} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                                <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                            </button>
                            <div>
                                <h3 className="text-base font-black text-[var(--color-text)]">{entry.class_name}</h3>
                                <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{BULAN.find(b => b.id === entry.month)?.id_str} {entry.year} · {pStu.length} Santri</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setArchiveEditMode(!archiveEditMode)} className={`h-9 px-4 rounded-xl border text-xs font-black transition-all ${archiveEditMode ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-violet-500/10 border-violet-500/20 text-violet-600 hover:bg-violet-500/20'}`}>
                                <FontAwesomeIcon icon={faSliders} className="mr-2" /> {archiveEditMode ? 'Selesai Edit' : 'Edit Arsip'}
                            </button>
                            <button onClick={() => runZipBlast(pStu, entry)} className="h-9 px-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 text-xs font-black hover:bg-teal-500/20 transition-all">
                                <FontAwesomeIcon icon={faFileZipper} className="mr-2" /> ZIP PDF
                            </button>
                            <button onClick={() => openPrintWindow(pStu)} className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-xs font-black hover:bg-indigo-600 transition-all flex items-center gap-2">
                                <FontAwesomeIcon icon={faPrint} /> Cetak Semua
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-2">
                                <FontAwesomeIcon icon={faUsers} className="opacity-50" /> Daftar Santri
                            </p>
                            {pStu.map(s => {
                                const sc = editSc(s.id) || {}
                                const complete = isComplete(sc)
                                const active = previewStudentId === s.id
                                return (
                                    <button key={s.id} onClick={() => setPreviewStudentId(s.id)} className={`w-full p-3 rounded-2xl border text-left transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-indigo-500/30'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface)] shadow-sm'}`}>
                                                <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                            </div>
                                            <div className="min-w-0 pr-2">
                                                <p className="text-xs font-black truncate">{s.name}</p>
                                                <p className={`text-[10px] font-medium opacity-70 ${active ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                                                    {complete ? 'Raport Lengkap ✓' : 'Belum Lengkap !'}
                                                </p>
                                            </div>
                                            {complete && (
                                                <div className={`ml-auto w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-emerald-500'}`} />
                                            )}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="lg:col-span-2">
                            {pStudent && (
                                <div className="space-y-4">
                                    {archiveEditMode ? (
                                        <div className="p-6 rounded-3xl border border-violet-500/20 bg-violet-500/5 animate-fade-in">
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20">
                                                    <FontAwesomeIcon icon={faSliders} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-[var(--color-text)]">Edit Mode: {pStudent.name}</h4>
                                                    <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Ubah nilai dan data tambahan untuk periode ini.</p>
                                                </div>
                                            </div>
                                            <p className="text-xs text-[var(--color-text-muted)] mb-4">Fitur edit arsip sedang diproses...</p>
                                            <div className="flex gap-3">
                                                <button onClick={saveArchiveEdit} disabled={archiveEditSaving} className="flex-1 h-11 rounded-xl bg-emerald-500 text-white text-sm font-black shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-60 transition-all">
                                                    {archiveEditSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-3xl border border-[var(--color-border)] bg-gray-50 dark:bg-slate-900/50 p-6 flex justify-center shadow-inner min-h-[500px]">
                                            <div className="shadow-2xl h-fit">
                                                <RaportPrintCard
                                                    student={pStudent}
                                                    scores={pSc[pStudent.id]}
                                                    extra={pEx[pStudent.id]}
                                                    bulanObj={pBulan}
                                                    tahun={pTahun}
                                                    musyrif={pMus}
                                                    className={pClass}
                                                    lang={pLang}
                                                    settings={settings}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep(0)} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                        </button>
                        <div>
                            <h3 className="text-base font-black text-[var(--color-text)]">Riwayat & Arsip</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Lihat dan kelola database raport yang telah disimpan.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                        {[{ id: 'list', label: 'Daftar Arsip', icon: faTableList }, { id: 'ringkasan', label: 'Statistik', icon: faChartPie }].map(tab => (
                            <button key={tab.id} onClick={() => setArchiveTab(tab.id)}
                                className={`h-9 px-4 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${archiveTab === tab.id ? 'bg-[var(--color-surface)] text-indigo-500 shadow-md border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={tab.icon} className="text-[10px]" /> {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <div className="relative flex-1 min-w-[200px]">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[11px]" />
                        <input type="text" placeholder="Cari kelas..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                    </div>
                    <select value={archiveFilter.year} onChange={e => setArchiveFilter(p => ({ ...p, year: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none">
                        <option value="">Semua Tahun</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={archiveFilter.month} onChange={e => setArchiveFilter(p => ({ ...p, month: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none">
                        <option value="">Semua Bulan</option>
                        {BULAN.map(b => <option key={b.id} value={b.id}>{b.id_str}</option>)}
                    </select>
                </div>

                {archiveLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
                                <div className="flex items-start justify-between mb-3"><div className="flex-1"><div className="h-3 w-2/3 bg-[var(--color-border)] rounded mb-2" /><div className="h-2.5 w-1/2 bg-[var(--color-border)] rounded" /></div><div className="h-4 w-12 bg-[var(--color-border)] rounded-full" /></div>
                                <div className="h-1.5 w-full bg-[var(--color-border)] rounded-full mb-3" />
                                <div className="flex gap-1.5"><div className="flex-1 h-8 bg-[var(--color-border)] rounded-lg" /><div className="flex-1 h-8 bg-[var(--color-border)] rounded-lg" /><div className="h-8 w-8 bg-[var(--color-border)] rounded-lg" /></div>
                            </div>
                        ))}
                    </div>
                ) : archiveTab === 'ringkasan' ? (() => {
                    // ── TAB RINGKASAN: Bar chart per kelas + heatmap kriteria ──
                    // Group archiveList by class_id, ambil bulan yang dipilih filter atau terbaru
                    const targetMonth = archiveFilter.month ? Number(archiveFilter.month) : null
                    const targetYear = archiveFilter.year ? Number(archiveFilter.year) : null
                    // Kalau tidak ada filter bulan/tahun, pakai periode terbaru yang ada di archiveList
                    const latestEntry = archiveList.length
                        ? archiveList.reduce((a, b) => b.year > a.year || (b.year === a.year && b.month > a.month) ? b : a, archiveList[0])
                        : null
                    const useMonth = targetMonth ?? latestEntry?.month
                    const useYear = targetYear ?? latestEntry?.year
                    const bulanLabel = BULAN.find(b => b.id === useMonth)?.id_str ?? '—'

                    // Filter archiveList sesuai periode
                    const periodEntries = archiveList.filter(e =>
                        e.month === useMonth && e.year === useYear &&
                        (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
                        (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase()))
                    )

                    if (!periodEntries.length) return (
                        <EmptyState
                            variant="dashed"
                            color="slate"
                            icon={faChartPie}
                            title="Tidak ada data statistik"
                            description="Pilih filter bulan/tahun yang memiliki data arsip untuk melihat ringkasan performa kelas."
                        />
                    )

                    // Hitung avg per kriteria per kelas dari archiveList (tidak ada nilai individual di sini,
                    // hanya count & completed — tampilkan progress + bar chart dari data yang tersedia)
                    // Kita tambahkan avg dari data yang sudah di-load di archiveList
                    const BAR_W = 120, BAR_H = 60

                    return (
                        <div className="space-y-4">
                            {/* Header ringkasan */}
                            <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-indigo-500/5 to-emerald-500/5">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faChartPie} className="text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-black text-[var(--color-text)]">Ringkasan {bulanLabel} {useYear}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">{periodEntries.length} kelas · {periodEntries.reduce((a, e) => a + e.count, 0)} santri · {periodEntries.reduce((a, e) => a + e.completed, 0)} raport lengkap</p>
                                </div>
                                <div className="flex-1" />
                                <div className="text-right">
                                    <p className="text-[9px] text-[var(--color-text-muted)]">Kelengkapan rata-rata</p>
                                    <p className="text-[18px] font-black text-emerald-500">
                                        {(() => { const total = periodEntries.reduce((a, e) => a + e.count, 0); const done = periodEntries.reduce((a, e) => a + e.completed, 0); return total ? Math.round(done / total * 100) : 0 })()}%
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar per kelas */}
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Progress per Kelas</p>
                                {[...periodEntries].sort((a, b) => (b.completed / (b.count || 1)) - (a.completed / (a.count || 1))).map(entry => {
                                    const pct = entry.count ? Math.round(entry.completed / entry.count * 100) : 0
                                    const barColor = pct === 100 ? '#10b981' : pct >= 70 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444'
                                    return (
                                        <div key={entry.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/20 transition-all group cursor-pointer"
                                            onClick={() => loadArchiveDetail(entry)}>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[11px] font-black text-[var(--color-text)] truncate">{entry.class_name}</span>
                                                    <span className="text-[10px] font-black shrink-0 ml-2" style={{ color: barColor }}>{pct}%</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[8px] text-[var(--color-text-muted)]">{entry.completed}/{entry.count} santri lengkap</span>
                                                    {entry.musyrif && <span className="text-[8px] text-[var(--color-text-muted)] opacity-60">· {entry.musyrif}</span>}
                                                </div>
                                            </div>
                                            {/* SVG mini bar chart: progress vs target */}
                                            <svg width="44" height="28" viewBox="0 0 44 28" className="shrink-0 opacity-60 group-hover:opacity-100 transition-all" aria-hidden="true">
                                                <rect x="0" y="0" width="44" height="28" rx="5" fill="var(--color-surface-alt)" />
                                                <rect x="4" y={28 - 4 - (pct / 100) * 20} width="16" height={(pct / 100) * 20 + 4} rx="3" fill={barColor} opacity="0.85" />
                                                <rect x="24" y={28 - 4 - ((entry.count ? entry.completed / entry.count : 0) * 20)} width="16" height={((entry.count ? entry.completed / entry.count : 0) * 20) + 4} rx="3" fill={barColor} opacity="0.4" />
                                            </svg>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Heatmap kriteria — tampilkan kalau ada data nilai per kelas */}
                            <div className="space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Heatmap Kriteria (dari arsip ter-load)</p>
                                <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                                        <thead>
                                            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                                <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kelas</th>
                                                {KRITERIA.map(k => (
                                                    <th key={k.key} className="px-2 py-2 text-center text-[9px] font-black" style={{ color: k.color }}>{k.id}</th>
                                                ))}
                                                <th className="px-2 py-2 text-center text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Lengkap</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {periodEntries.map((entry, idx) => {
                                                const pct = entry.count ? entry.completed / entry.count : 0
                                                return (
                                                    <tr key={entry.key} style={{ borderBottom: idx < periodEntries.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                                                        className="hover:bg-[var(--color-surface-alt)] transition-all cursor-pointer" onClick={() => loadArchiveDetail(entry)}>
                                                        <td className="px-3 py-2">
                                                            <span className="text-[10px] font-black text-[var(--color-text)]">{entry.class_name}</span>
                                                        </td>
                                                        {KRITERIA.map(k => (
                                                            <td key={k.key} className="px-2 py-2 text-center">
                                                                {/* Karena archiveList tidak menyimpan nilai per kriteria, tampilkan — tapi beri hint */}
                                                                <div className="w-8 h-6 rounded-md mx-auto flex items-center justify-center text-[9px] font-black"
                                                                    style={{ background: pct >= 0.9 ? k.color + '20' : pct >= 0.5 ? k.color + '10' : 'var(--color-surface-alt)', color: k.color, opacity: 0.5 + pct * 0.5 }}>
                                                                    {pct >= 0.9 ? '✓' : pct >= 0.5 ? '…' : '—'}
                                                                </div>
                                                            </td>
                                                        ))}
                                                        <td className="px-2 py-2 text-center">
                                                            <span className="text-[10px] font-black" style={{ color: pct === 1 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                                                                {Math.round(pct * 100)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-[8px] text-[var(--color-text-muted)] opacity-60">💡 Klik baris untuk buka detail kelas dan lihat nilai per santri.</p>
                            </div>
                        </div>
                    )
                })() : filtered.length === 0 ? (
                    <EmptyState
                        variant="dashed"
                        color="slate"
                        icon={faBoxArchive}
                        title="Arsip tidak ditemukan"
                        description={archiveSearch || archiveFilter.classId || archiveFilter.month
                            ? 'Coba ubah filter atau hapus pencarian untuk menemukan arsip yang kamu cari.'
                            : 'Belum ada raport yang tersimpan. Selesaikan input nilai di step 2, lalu simpan untuk membuat arsip.'}
                        action={(archiveSearch || archiveFilter.classId || archiveFilter.month) && (
                            <button onClick={() => { setArchiveSearch(''); setArchiveFilter({ classId: '', year: '', month: '' }) }}
                                className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-2 mx-auto active:scale-95 shadow-sm">
                                <FontAwesomeIcon icon={faXmark} className="text-[10px]" /> Reset Filter
                            </button>
                        )}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map(entry => {
                            const bulan = BULAN.find(b => b.id === entry.month), pct = entry.count ? Math.round((entry.completed / entry.count) * 100) : 0
                            return (
                                <div key={entry.key} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-start justify-between mb-3"><div><div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name}</div><div className="text-[10px] text-[var(--color-text-muted)] font-bold mt-0.5">{bulan?.id_str} {entry.year} · {entry.lang === 'ar' ? 'عربي' : 'Indonesia'}</div></div><span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${entry.lang === 'ar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'}`}>{entry.lang === 'ar' ? 'Pondok' : 'Reguler'}</span></div>
                                    <div className="mb-3"><div className="flex justify-between text-[9px] font-bold text-[var(--color-text-muted)] mb-1"><span>{entry.completed}/{entry.count} lengkap</span><span>{pct}%</span></div><div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#6366f1' : '#f59e0b' }} /></div></div>
                                    {entry.musyrif && <div className="text-[9px] text-[var(--color-text-muted)] mb-3 flex items-center gap-1"><FontAwesomeIcon icon={faUsers} className="opacity-50" /> {entry.musyrif}</div>}
                                    <div className="flex gap-1.5">
                                        <button onClick={() => loadArchiveDetail(entry)} className="flex-1 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all"><FontAwesomeIcon icon={faMagnifyingGlass} /> Preview</button>
                                        <button onClick={() => exportBulkPDF(entry)} className="flex-1 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all"><FontAwesomeIcon icon={faFileZipper} /> Export PDF</button>
                                        <button onClick={() => setConfirmDelete(entry)} aria-label={`Hapus arsip ${entry.class_name}`} className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    // ── Print hidden container
    const printStudents = archivePreview ? archivePreview.students : students
    const printScores = archivePreview ? archivePreview.scores : scores
    const printExtras = archivePreview ? archivePreview.extras : extras
    const printBulan = archivePreview ? archivePreview.bulanObj : bulanObj
    const printYear = archivePreview ? archivePreview.tahun : selectedYear
    const printMusyrif = archivePreview ? archivePreview.musyrif : musyrif
    const printClass = archivePreview ? archivePreview.className : selectedClass?.name
    const printLang = archivePreview ? archivePreview.lang : lang


    const stepLabels = ['Setup', 'Input Nilai', 'Preview & Cetak']

    // ── Guards ─────────────────────────────────────────────────────────────────

    if (isAllowed === null) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
            </div>
        </DashboardLayout>
    )
    if (!isAllowed) return (
        <DashboardLayout>
            <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faLock} className="text-2xl text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Akses Ditolak</h2>
                    <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">Halaman ini hanya dapat diakses oleh <strong>Guru</strong> dan <strong>Admin</strong>.</p>
                </div>
                <button onClick={() => navigate(-1)} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">Kembali</button>
            </div>
        </DashboardLayout>
    )

    // FIX MINOR: pageLoading pakai skeleton layout, bukan full-page spinner kosong
    if (pageLoading) {
        return (
            <DashboardLayout title="Raport Bulanan">
                {/* Header skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="h-7 w-44 bg-[var(--color-border)] rounded-lg animate-pulse mb-2" />
                        <div className="h-3 w-64 bg-[var(--color-border)] rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-[var(--color-border)] rounded-xl animate-pulse" />
                        <div className="h-9 w-28 bg-[var(--color-border)] rounded-xl animate-pulse" />
                    </div>
                </div>
                {/* Stats skeleton */}
                <StatsCarousel count={4}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass rounded-[1.5rem] p-4 flex items-center gap-3 animate-pulse min-h-[90px]">
                            <div className="w-12 h-12 rounded-xl bg-[var(--color-border)] shrink-0" />
                            <div className="flex-1">
                                <div className="h-2.5 w-16 bg-[var(--color-border)] rounded mb-2" />
                                <div className="h-5 w-10 bg-[var(--color-border)] rounded" />
                            </div>
                        </div>
                    ))}
                </StatsCarousel>
                {/* Kelas grid skeleton */}
                <div className="h-3 w-24 bg-[var(--color-border)] rounded animate-pulse mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Raport Bulanan">
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Read-only Banner — access.teacher_raport flag off */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faLock} className="text-rose-500 shrink-0" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">Mode Read-only — Edit raport dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── PAGE HEADER ── */}
                <PageHeader
                    badge="Reports"
                    breadcrumbs={['Grade Reports']}
                    title="Raport Bulanan"
                    subtitle="نتيجة الشخصية — Kelola dan cetak raport bulanan per kelas."
                    actions={
                        <>
                            {step >= 1 && step <= 3 && (
                                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] mr-2">
                                    {stepLabels.map((label, i) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${step === i + 1 ? 'bg-emerald-500 text-white' : step > i + 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>{step > i + 1 ? <FontAwesomeIcon icon={faCheck} className="text-[7px]" /> : i + 1}</div>
                                            <span className={`text-[9px] font-bold ${step === i + 1 ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>{label}</span>
                                            {i < stepLabels.length - 1 && <div className="w-4 h-px bg-[var(--color-border)]" />}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                ref={shortcutBtnRef}
                                onClick={() => { if (!showShortcutModal) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setShowShortcutModal(v => !v) }}
                                className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center text-sm transition-all active:scale-95
                                    ${showShortcutModal
                                        ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)] shadow-sm'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'
                                    }`}
                                title="Keyboard Shortcuts (?)"
                            >
                                <FontAwesomeIcon icon={faKeyboard} />
                            </button>

                            <button
                                ref={headerMenuBtnRef}
                                onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 shadow-sm' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Data & Backup Operations"
                            >
                                <FontAwesomeIcon icon={faSliders} />
                            </button>

                            <button onClick={() => { setTutorialStep(0); setShowTutorialModal(true) }} aria-label="Panduan penggunaan" className="h-9 px-3 gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-500 text-[10px] font-black flex items-center justify-center hover:bg-amber-500/15 transition-all" title="Panduan & Tutorial">
                                <FontAwesomeIcon icon={faLightbulb} className="text-[9px]" />
                                Tutorial
                            </button>
                            {step === 0 && (
                                <button onClick={() => { setSelectedClassId(''); setStep(1) }} className="h-9 px-4 lg:px-5 rounded-xl bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2 hover:opacity-90 transition-all">
                                    <FontAwesomeIcon icon={faPlus} className="text-sm" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Buat Raport</span>
                                </button>
                            )}
                        </>
                    }
                />

                {/* ── STATS ── */}
                {step === 0 && (
                    <StatsCarousel count={4}>
                        <StatCard
                            icon={faSchool}
                            label="Total Kelas"
                            value={step0Stats.totalKelas}
                            color="indigo"
                        />
                        <StatCard
                            icon={faUsers}
                            label="Total Siswa"
                            value={step0Stats.totalSiswa}
                            color="emerald"
                        />
                        <StatCard
                            icon={faCircleCheck}
                            label="Raport Lengkap"
                            value={step0Stats.raportLengkap}
                            color="indigo"
                        />
                        <StatCard
                            icon={faChartPie}
                            label="Rata Input"
                            value={step0Stats.rataInput}
                            color="amber"
                        />
                    </StatsCarousel>
                )}


                {/* ── CONTENT — dengan animasi fade+slide antar step ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 sm:p-6">
                    {/* FIX 6: Global auto-save indicator */}
                    {step === 2 && globalSaveIndicator && (
                        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg text-[10px] font-black transition-all duration-300 ${globalSaveIndicator === 'saving' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                            <FontAwesomeIcon icon={globalSaveIndicator === 'saving' ? faSpinner : faCircleCheck} className={globalSaveIndicator === 'saving' ? 'animate-spin text-[9px]' : 'text-[9px]'} />
                            {globalSaveIndicator === 'saving' ? 'Menyimpan...' : 'Tersimpan ✓'}
                        </div>
                    )}
                    <div key={step}
                        style={{
                            animation: 'stepFadeIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
                        }}
                    >
                        {step === 0 && renderStep0()}
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                    </div>
                </div>
                {/* Keyframe untuk animasi step */}
                <style>{`
                @keyframes stepFadeIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.995); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

                {/* Portaled Header Menu Dropdown */}
                {isHeaderMenuOpen && headerMenuRect && createPortal(
                    <>
                        <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsHeaderMenuOpen(false)} />
                        <div
                            className="fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-0 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden"
                            style={{
                                top: headerMenuRect.bottom + 8,
                                left: Math.max(10, headerMenuRect.right - 224)
                            }}
                        >
                            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Data & Backup</p>
                            </div>
                            
                            <div className="p-2 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-1">Operasi</p>

                            {/* Import Section */}
                            <input type="file" ref={fileInputRef} onChange={importXLS} accept=".xlsx, .xls" className="hidden" />
                            <button onClick={() => { setIsHeaderMenuOpen(false); fileInputRef.current?.click() }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Import XLS</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Restore data dari file Excel backup</p>
                                </div>
                            </button>

                            <button onClick={() => { setIsHeaderMenuOpen(false); exportAllClassesXLS() }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Export Semua</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Backup seluruh kelas bulan ini ke XLS</p>
                                </div>
                            </button>

                            <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                            <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Arsip</p>

                            <button onClick={() => { setIsHeaderMenuOpen(false); setStep(4); loadArchive() }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black leading-tight">Riwayat Raport</p>
                                    <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat dan cetak arsip bulan sebelumnya</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </>,
                document.body
            )}

                {/* ── Hidden print container ── */}
                {printQueue.length > 0 && (
                    <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
                        {printStudents.filter(s => printQueue.includes(s.id)).map(s => (
                            <RaportPrintCard key={s.id} student={s} scores={printScores[s.id]} extra={printExtras[s.id]} bulanObj={printBulan} tahun={printYear} musyrif={printMusyrif} className={printClass} lang={printLang} settings={settings} pageSize={pageSize} catatanArab={catatanArabMap[s.id]} onRendered={() => setPrintRenderedCount(c => c + 1)} />
                        ))}
                    </div>
                )}

                {/* Portaled Keyboard Shortcuts Dropdown */}
                {showShortcutModal && shortcutRect && createPortal(
                    <>
                        <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setShowShortcutModal(false)} />
                        <div
                            className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
                            style={{
                                top: shortcutRect.bottom + 8,
                                left: Math.max(10, shortcutRect.right - 288)
                            }}
                        >
                            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface)]">
                                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Pintasan Keyboard</p>
                                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                                <ShortcutModalContent />
                            </div>
                        </div>
                    </>,
                    document.body
                )}

                {/* Tutorial Modal */}
                {(() => {
                    const [t1, t2, t3, t4, t5, t6, t7] = tutorialImgs
                    const SLIDES = [
                        {
                            icon: faClipboardList,
                            iconColor: 'text-emerald-500',
                            iconBg: 'bg-emerald-500/15',
                            title: 'Dua Cara Memulai Input Nilai',
                            subtitle: 'Pilih jalur yang paling nyaman untukmu',
                            body: (
                                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                        <p className="font-black text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                                            Lewat tombol "＋ Buat Raport"
                                        </p>
                                        <p className="text-[var(--color-text-muted)] pl-6">Klik tombol di pojok kanan atas → pilih kelas → atur bulan & tahun → isi nama Musyrif → pilih template bahasa → klik <strong>"Mulai Input Nilai"</strong>.</p>
                                    </div>
                                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                        <p className="font-black text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                                            Langsung klik kartu kelas
                                        </p>
                                        <p className="text-[var(--color-text-muted)] pl-6">Di halaman utama, klik langsung kartu kelas yang ingin diisi. Kamu akan langsung masuk ke halaman input nilai tanpa perlu mengatur periode.</p>
                                    </div>
                                </div>
                            ),
                            tips: 'Template bahasa otomatis: kelas Boarding → Arab, kelas Reguler → Indonesia. Nama Musyrif terisi otomatis jika sudah diset di data kelas.',
                            img: t1,
                        },
                        {
                            icon: faTableList,
                            iconColor: 'text-indigo-500',
                            iconBg: 'bg-indigo-500/15',
                            title: 'Mengisi Nilai Santri',
                            subtitle: 'Input 5 kriteria penilaian karakter',
                            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Setiap santri memiliki 5 kolom nilai: Akhlak, Ibadah, Kebersihan, Al-Quran, dan Bahasa. Nilai berkisar antara 0–9. Tekan <strong>Tab</strong> atau <strong>Enter</strong> untuk berpindah ke cell berikutnya dengan cepat.</p>,
                            tips: 'Ketik angka 0–9 langsung saat cell aktif. Warna cell berubah otomatis sesuai grade — hijau untuk nilai tinggi, merah untuk nilai rendah.',
                            img: t2,
                        },
                        {
                            icon: faFloppyDisk,
                            iconColor: 'text-sky-500',
                            iconBg: 'bg-sky-500/15',
                            title: 'Auto-Save & Status Simpan',
                            subtitle: 'Data tersimpan otomatis ke server',
                            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Setiap perubahan nilai tersimpan otomatis ke database dalam 1.5 detik. Indikator berwarna hijau (✓) menandakan data sudah tersimpan. Tekan <strong>Ctrl+S</strong> atau klik "Simpan Semua" untuk menyimpan sekaligus.</p>,
                            tips: 'Jika koneksi terputus, nilai tetap tersimpan sementara sebagai draft di browser. Saat online kembali, muat draft untuk melanjutkan.',
                            img: t3,
                        },
                        {
                            icon: faBoxArchive,
                            iconColor: 'text-violet-500',
                            iconBg: 'bg-violet-500/15',
                            title: 'Data Tambahan per Santri',
                            subtitle: 'Kesehatan, hafalan & catatan',
                            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Selain nilai karakter, isi juga data tambahan: berat & tinggi badan, jumlah hari sakit / izin / alpa, progress Ziyadah & Murojaah hafalan, serta catatan khusus yang akan tercetak di raport untuk orang tua.</p>,
                            tips: 'Data tambahan ini opsional — raport tetap bisa dicetak meski tidak diisi. Namun semakin lengkap datanya, semakin informatif raport yang diterima orang tua.',
                            img: t4,
                        },
                        {
                            icon: faFillDrip,
                            iconColor: 'text-rose-500',
                            iconBg: 'bg-rose-500/15',
                            title: 'Isi Massal & Copy Bulan Lalu',
                            subtitle: 'Hemat waktu untuk nilai yang sama',
                            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Gunakan "Isi Massal" untuk mengisi nilai yang sama ke banyak santri sekaligus — centang santri yang ingin diisi, set nilai, klik Terapkan. Gunakan "Copy Bulan Lalu" untuk menyalin nilai dari periode sebelumnya sebagai titik awal.</p>,
                            tips: 'Undo/Redo tersedia dengan Ctrl+Z dan Ctrl+Y jika ingin membatalkan perubahan nilai yang sudah diisi.',
                            img: t5,
                        },
                        {
                            icon: faFilePdf,
                            iconColor: 'text-red-500',
                            iconBg: 'bg-red-500/15',
                            title: 'Cetak, ZIP & WA Blast',
                            subtitle: 'Distribusikan raport ke orang tua',
                            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Klik ikon Print untuk mencetak raport dari browser. Klik ZIP untuk mengunduh semua raport dalam satu file. Klik ikon WhatsApp di tiap baris santri untuk kirim raport ke orang tua, atau gunakan "WA Blast" untuk kirim ke semua sekaligus.</p>,
                            tips: 'Hanya santri yang nilainya sudah lengkap (semua 5 kriteria terisi) yang bisa diekspor ke PDF / ZIP / WA.',
                            img: t6,
                        },
                        {
                            icon: faBoxArchive,
                            iconColor: 'text-teal-500',
                            iconBg: 'bg-teal-500/15',
                            title: 'Arsip & Riwayat',
                            subtitle: 'Lihat dan edit raport bulan lalu',
                            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Semua raport yang pernah disimpan tersedia di tab "Riwayat". Kamu bisa melihat raport per kelas per bulan, mengedit nilai yang sudah tersimpan, menghapus arsip, hingga mencetak atau mengirim ulang via WA.</p>,
                            tips: 'Filter arsip berdasarkan tahun, bulan, atau kelas. Gunakan "Edit Arsip" untuk memperbaiki nilai yang salah input bulan lalu.',
                            img: t7,
                        },
                    ]
                    const currentSlide = SLIDES[tutorialStep]

                    return (
                        <Modal
                            isOpen={showTutorialModal}
                            onClose={() => setShowTutorialModal(false)}
                            title={currentSlide.title}
                            description={currentSlide.subtitle}
                            icon={currentSlide.icon}
                            iconBg={currentSlide.iconBg}
                            iconColor={currentSlide.iconColor}
                            size="lg"
                        >
                            <TutorialModalContent
                                step={tutorialStep}
                                setStep={setTutorialStep}
                                totalSteps={SLIDES.length}
                                slides={SLIDES}
                                onFinish={() => setShowTutorialModal(false)}
                                onZoomImg={setTutorialZoomImg}
                            />
                        </Modal>
                    )
                })()}

                {/* Tutorial Image Zoom (Lightbox) */}
                <Modal
                    isOpen={!!tutorialZoomImg}
                    onClose={() => setTutorialZoomImg(null)}
                    title="Detail Panduan"
                    size="xl"
                    showClose={true}
                >
                    <div className="flex items-center justify-center bg-black/5 rounded-2xl overflow-hidden">
                        <img
                            src={tutorialZoomImg}
                            alt="Zoom Tutorial"
                            className="max-w-full max-h-[80vh] object-contain shadow-2xl"
                        />
                    </div>
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={() => setTutorialZoomImg(null)}
                            className="px-8 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-xs font-black shadow-lg shadow-indigo-500/20 hover:brightness-110 transition-all"
                        >
                            Tutup Preview
                        </button>
                    </div>
                </Modal>

                {/* WA Blast Confirm Modal */}
                <Modal
                    isOpen={!!waBlastConfirm}
                    onClose={() => setWaBlastConfirm(null)}
                    title="Konfirmasi WA Blast"
                    icon={faWhatsapp}
                    variant="green"
                >
                    {waBlastConfirm && (
                        <WaBlastConfirmContent
                            count={waBlastConfirm.queue.length}
                            onConfirm={() => runWaBlast(waBlastConfirm.queue)}
                            onCancel={() => setWaBlastConfirm(null)}
                        />
                    )}
                </Modal>

                {/* WA Blast Progress Modal */}
                <Modal
                    isOpen={!!waBlast}
                    onClose={() => !waBlast?.active && setWaBlast(null)}
                    title="WA Blast Progress"
                    icon={faWhatsapp}
                    showClose={!waBlast?.active}
                >
                    {waBlast && (
                        <WaBlastProgressContent
                            progress={waBlast.done + waBlast.failed}
                            total={waBlast.queue.length}
                            activeName={waBlast.active && waBlast.queue[waBlast.idx]?.name}
                            isFailed={waBlast.failed > 0}
                        />
                    )}
                </Modal>

                {/* ZIP Blast Progress Modal */}
                <Modal
                    isOpen={!!zipBlast}
                    onClose={() => !zipBlast?.active && setZipBlast(null)}
                    title="Ekspor ZIP Progress"
                    icon={faFileZipper}
                    showClose={!zipBlast?.active}
                >
                    {zipBlast && (
                        <div className="space-y-6 py-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faFileZipper} className="text-lg" />
                                    </div>
                                    <p className="text-sm font-black text-[var(--color-text)]">Menyiapkan File ZIP...</p>
                                </div>
                                <span className="text-lg font-black text-[var(--color-text)]">
                                    {zipBlast.total > 0 ? Math.round((zipBlast.done / zipBlast.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="h-3 w-full rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden">
                                <div className="h-full bg-teal-500 transition-all duration-700" style={{ width: `${zipBlast.total > 0 ? (zipBlast.done / zipBlast.total) * 100 : 0}%` }} />
                            </div>
                            <p className="text-center text-[10px] text-[var(--color-text-muted)] font-medium">
                                {zipBlast.done} dari {zipBlast.total} raport diproses. Mohon tunggu...
                            </p>
                        </div>
                    )}
                </Modal>



                {/* Delete Confirm Modal (Portal implementation replace) */}
                {confirmDelete && (
                    <Modal
                        isOpen={true}
                        onClose={() => setConfirmDelete(null)}
                        title="Hapus Arsip Raport"
                        icon={faTriangleExclamation}
                        variant="red"
                    >
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-2">
                                <p className="text-sm font-black text-[var(--color-text)]">Aksi ini tidak bisa dibatalkan!</p>
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                                    Anda akan menghapus arsip raport kelas <strong>{confirmDelete.class_name}</strong> untuk periode <strong>{BULAN.find(b => b.id === confirmDelete.month)?.id_str} {confirmDelete.year}</strong>.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setConfirmDelete(null)} className="flex-1 h-11 rounded-xl border border-[var(--color-border)] text-sm font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                                <button onClick={() => executeDeleteArchive(confirmDelete)} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-sm font-black shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all">Ya, Hapus Permanen</button>
                            </div>
                        </div>
                    </Modal>
                )}


                {/* ── FLOATING UNSAVED BAR ── */}
                {
                    step === 2 && hasUnsavedMemo && !unsavedBarDismissed && (
                        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2.5 md:py-3 rounded-2xl shadow-2xl border border-amber-500/30 bg-[var(--color-surface)] backdrop-blur-sm animate-bounce-subtle w-max max-w-[95vw]"
                            style={{ boxShadow: '0 8px 32px rgba(245,158,11,0.18)' }}>
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                            <span className="text-[10px] md:text-[11px] font-black text-[var(--color-text)] whitespace-nowrap">
                                Ada perubahan yang belum disimpan
                            </span>
                            <button onClick={saveAll} disabled={savingAll}
                                className="h-8 px-4 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-amber-500/20">
                                <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin text-[9px]' : 'text-[9px]'} />
                                {savingAll ? 'Menyimpan...' : 'Simpan'}
                            </button>
                            {/* FIX MAJOR: tombol × hanya dismiss bar, tidak menyimpan apapun */}
                            <button
                                onClick={() => setUnsavedBarDismissed(true)}
                                aria-label="Tutup pengingat"
                                title="Tutup pengingat (data belum disimpan)"
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                            </button>
                        </div>
                    )
                }

                {/* Unsaved Navigation Confirm */}
                <Modal
                    isOpen={!!pendingNav}
                    onClose={() => setPendingNav(null)}
                    title="Yakin Ingin Keluar?"
                    icon={faTriangleExclamation}
                    variant="amber"
                >
                    <div className="space-y-6">
                        <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                            Anda memiliki perubahan nilai yang belum disimpan. Perubahan tersebut akan <strong>hilang selamanya</strong> jika Anda keluar tanpa menyimpan.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={async () => { await saveAll(); const action = pendingNav.action; setPendingNav(null); action() }}
                                className="h-11 rounded-xl bg-emerald-500 text-white text-sm font-black shadow-lg shadow-emerald-500/20"
                            >
                                Simpan & Lanjut
                            </button>
                            <button
                                onClick={() => { const action = pendingNav.action; setPendingNav(null); action() }}
                                className="h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-black"
                            >
                                Buang Perubahan
                            </button>
                            <button
                                onClick={() => setPendingNav(null)}
                                className="h-10 text-[var(--color-text-muted)] text-xs font-black"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* Student Detail History Drawer */}
                <Modal
                    isOpen={!!studentDetailDrawer}
                    onClose={() => setStudentDetailDrawer(null)}
                    title={studentDetailDrawer?.student?.name ?? 'Detail Santri'}
                    icon={faArrowTrendUp}
                    size="lg"
                >
                    {studentDetailDrawer && (
                        <div className="space-y-6">
                            {studentDetailLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="h-20 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse" />
                                    ))}
                                </div>
                            ) : !studentDetailDrawer.history?.length ? (
                                <EmptyState
                                    icon={faBoxArchive}
                                    title="Belum Ada Histori"
                                    subtitle="Santri ini belum memiliki record raport yang tersimpan."
                                />
                            ) : (() => {
                                const history = studentDetailDrawer.history
                                const allAvgs = history.map(h => calcAvg(h.scores)).filter(Boolean).map(Number)
                                const bestAvg = allAvgs.length ? Math.max(...allAvgs) : null
                                const latest = history[history.length - 1]
                                return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-3">
                                            <StatCard label="Total Record" value={history.length} icon={faTableList} color="indigo" />
                                            <StatCard label="Skor Tertinggi" value={bestAvg?.toFixed(1) ?? '—'} icon={faArrowTrendUp} color="emerald" />
                                            <StatCard label="Bulan Terakhir" value={BULAN.find(b => b.id === latest?.month)?.id_str || '—'} icon={faCalendarAlt} color="amber" />
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Histori Bulanan</p>
                                            {[...history].reverse().map(h => {
                                                const avg = calcAvg(h.scores)
                                                const g = avg ? GRADE(Number(avg)) : null
                                                return (
                                                    <div key={`${h.year}-${h.month}`} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] hover:border-indigo-500/30 transition-all">
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div>
                                                                <p className="text-xs font-black text-[var(--color-text)]">{BULAN.find(b => b.id === h.month)?.id_str} {h.year}</p>
                                                                <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">Musyrif: {h.musyrif || '—'}</p>
                                                            </div>
                                                            {avg && g && (
                                                                <div className="text-right">
                                                                    <p className="text-sm font-black" style={{ color: g.uiColor }}>{avg}</p>
                                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: g.uiColor }}>{g.id}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-5 gap-2">
                                                            {KRITERIA.map(k => {
                                                                const val = h.scores[k.key]
                                                                const scG = val !== null ? GRADE(Number(val)) : null
                                                                return (
                                                                    <div key={k.key} className="text-center">
                                                                        <p className="text-[8px] font-black uppercase text-[var(--color-text-muted)] mb-1">{k.id.slice(0, 3)}</p>
                                                                        <div className="h-8 rounded-lg flex items-center justify-center text-xs font-black border border-[var(--color-border)]" style={{ background: scG?.bg || 'var(--color-surface)', color: scG?.uiColor || 'var(--color-text-muted)' }}>
                                                                            {val ?? '—'}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        {h.catatan && (
                                                            <div className="mt-3 p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                                                "{h.catatan}"
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </Modal>

                {/* Save All Confirmation */}
                <Modal
                    isOpen={!!saveAllConfirm}
                    onClose={() => setSaveAllConfirm(null)}
                    title="Simpan Nilai"
                    icon={faFloppyDisk}
                    variant="amber"
                >
                    {saveAllConfirm && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-xl" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-amber-900">Nilai Belum Lengkap</p>
                                    <p className="text-xs text-amber-700 font-medium">Ada {saveAllConfirm.incompleteCount} santri yang belum terisi nilainya.</p>
                                </div>
                            </div>
                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">
                                Anda tetap bisa menyimpan raport yang sudah terisi. Santri dengan nilai kosong akan tetap disimpan dengan status "Belum Lengkap".
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={_doSaveAll}
                                    className="h-11 rounded-xl bg-emerald-500 text-white text-sm font-black shadow-lg shadow-emerald-500/20"
                                >
                                    Simpan yang Sudah Terisi
                                </button>
                                <button
                                    onClick={() => setSaveAllConfirm(null)}
                                    className="h-10 text-[var(--color-text-muted)] text-xs font-black"
                                >
                                    Kembali & Lengkapi
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>

                {/* General Confirmation Modal */}
                <Modal
                    isOpen={!!confirmModal}
                    onClose={() => setConfirmModal(null)}
                    title={confirmModal?.title ?? 'Konfirmasi'}
                    size="sm"
                >
                    {confirmModal && (
                        <div className="space-y-5">
                            <div className={`p-3.5 rounded-2xl flex items-center gap-3.5 border ${confirmModal.variant === 'amber' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg border ${confirmModal.variant === 'amber' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-red-500/20 border-red-500/30'
                                    }`}>
                                    <FontAwesomeIcon icon={faTriangleExclamation} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-[11px] font-black uppercase tracking-wider leading-tight">{confirmModal.title ?? 'Konfirmasi'}</h3>
                                    {confirmModal.subtitle && (
                                        <p className="text-[9px] font-bold uppercase tracking-widest opacity-80 mt-1">{confirmModal.subtitle}</p>
                                    )}
                                </div>
                            </div>

                            <div className="px-1">
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    {confirmModal.body}
                                </p>
                            </div>

                            <div className="flex gap-2.5 pt-1">
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="h-10 px-4 rounded-xl flex-1 bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={() => { confirmModal.onConfirm(); setConfirmModal(null) }}
                                    className={`h-10 px-5 rounded-xl flex-1 text-white text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${confirmModal.variant === 'amber'
                                        ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                                        : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                        }`}
                                >
                                    {confirmModal.confirmLabel ?? 'Lanjutkan'}
                                </button>
                            </div>
                        </div>
                    )}
                </Modal>
            </div >
        </DashboardLayout >
    )
}