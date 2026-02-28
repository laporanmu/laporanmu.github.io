import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faSearch,
    faEdit,
    faTrash,
    faMars,
    faVenus,
    faDownload,
    faUpload,
    faUsers,
    faTrophy,
    faSpinner,
    faHistory,
    faQrcode,
    faIdCardAlt,
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
    faFilter,
    faXmark,
    faSliders,
    faTableList,
    faSchool,
    faBullhorn,
    faArchive,
    faBoxArchive,
    faRotateLeft,
    faUserTie,
    faLink,
    faClockRotateLeft,
    faArrowRightArrowLeft,
    faCheck,
    faTag,
    faKey,
    faChartBar,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

// ✅ Advanced import/export libs
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Fallback bila DB belum ada / demo mode (tidak dipakai untuk import/export)
const FALLBACK_CLASS_NAMES = [
    'X MIPA 1', 'X MIPA 2', 'X MIPA 3',
    'XI IPA 1', 'XI IPA 2', 'XI IPS 1',
    'XII IPA 1', 'XII IPA 2', 'XII IPS 1',
]

// Demo data with Gender (tidak dipakai jika DB aktif)
const DEMO_STUDENTS = [
    { id: 1, code: 'REG-7K3Q-9P2X', name: 'Ahmad Rizki Pratama', gender: 'L', class: 'XII IPA 1', points: -15, phone: '081234567890' },
    { id: 2, code: 'REG-8M4R-2T5Y', name: 'Siti Aminah', gender: 'P', class: 'XI IPS 2', points: 25, phone: '081234567891' },
    { id: 3, code: 'REG-9N5S-3U6Z', name: 'Budi Santoso', gender: 'L', class: 'X MIPA 3', points: -30, phone: '081234567892' },
    { id: 4, code: 'REG-1P6T-4V7A', name: 'Dewi Lestari', gender: 'P', class: 'XII IPA 2', points: 45, phone: '081234567893' },
    { id: 5, code: 'REG-2Q7U-5W8B', name: 'Eko Prasetyo', gender: 'L', class: 'XI MIPA 1', points: 0, phone: '081234567894' },
]

const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Nama A–Z' },
    { value: 'name_desc', label: 'Nama Z–A' },
    { value: 'class_asc', label: 'Kelas A–Z' },
    { value: 'points_desc', label: 'Poin tertinggi' },
    { value: 'points_asc', label: 'Poin terendah' },
]

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
    const [formData, setFormData] = useState({ name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah' })
    const [submitting, setSubmitting] = useState(false)
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
    const [isQRModalOpen, setIsQRModalOpen] = useState(false)
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false)
    const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null)
    const [behaviorHistory, setBehaviorHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(false)
    const [selectedStudentIds, setSelectedStudentIds] = useState([])
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
    const [isBulkWAModalOpen, setIsBulkWAModalOpen] = useState(false)
    const [bulkClassId, setBulkClassId] = useState('')
    const [globalStats, setGlobalStats] = useState({ total: 0, boys: 0, girls: 0, avgPoints: 0, worstClass: null })
    const [totalRows, setTotalRows] = useState(0)
    const [lastReportMap, setLastReportMap] = useState({})

    // Filter poin range
    const [filterPointMode, setFilterPointMode] = useState('')
    const [filterPointMin, setFilterPointMin] = useState('')
    const [filterPointMax, setFilterPointMax] = useState('')
    const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
    const RISK_THRESHOLD = -30

    // ✅ NEW: Soft Delete / Arsip
    const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
    const [archivedStudents, setArchivedStudents] = useState([])
    const [loadingArchived, setLoadingArchived] = useState(false)
    const [showArchived, setShowArchived] = useState(false)

    // ✅ NEW: Riwayat Kelas
    const [isClassHistoryModalOpen, setIsClassHistoryModalOpen] = useState(false)
    const [classHistory, setClassHistory] = useState([])
    const [loadingClassHistory, setLoadingClassHistory] = useState(false)

    // ✅ NEW: Quick Inline Add
    const [isInlineAddOpen, setIsInlineAddOpen] = useState(false)
    const [inlineForm, setInlineForm] = useState({ name: '', gender: 'L', class_id: '', phone: '' })
    const [submittingInline, setSubmittingInline] = useState(false)

    // ✅ NEW: Photo Storage upload progress
    const [uploadingPhoto, setUploadingPhoto] = useState(false)

    // ✅ NEW: Class Breakdown Modal (Fitur 1)
    const [isClassBreakdownOpen, setIsClassBreakdownOpen] = useState(false)
    const [classBreakdownData, setClassBreakdownData] = useState(null)
    const [loadingBreakdown, setLoadingBreakdown] = useState(false)

    // ✅ NEW: Batch Reset Poin (Fitur 2)
    const [isResetPointsModalOpen, setIsResetPointsModalOpen] = useState(false)
    const [resetPointsClassId, setResetPointsClassId] = useState('')
    const [resettingPoints, setResettingPoints] = useState(false)

    // ✅ NEW: Student Status (Fitur 4)
    const [filterStatus, setFilterStatus] = useState('')

    // ✅ NEW: Reset PIN (Fitur 5)
    const [resettingPin, setResettingPin] = useState(false)

    // ✅ NEW: Duplicate Detection (Fitur 6)
    const [duplicateWarning, setDuplicateWarning] = useState(null)
    const [checkingDuplicate, setCheckingDuplicate] = useState(false)

    // ✅ NEW: Student Tags / Labels (Fitur 7)
    const [isTagModalOpen, setIsTagModalOpen] = useState(false)
    const [studentForTags, setStudentForTags] = useState(null)
    const [filterTag, setFilterTag] = useState('')
    const AVAILABLE_TAGS = ['Beasiswa', 'OSIS', 'Pramuka', 'Boarding', 'Ekstrakurikuler', 'Berprestasi']

    // ✅ NEW: Multi-Filter Kelas (Fitur 8)
    const [filterClasses, setFilterClasses] = useState([]) // array of class ids

    // ✅ NEW: Audit Trail (Fitur 10)
    const [isAuditLogOpen, setIsAuditLogOpen] = useState(false)
    const [auditStudentId, setAuditStudentId] = useState(null)
    const [auditLogs, setAuditLogs] = useState([])
    const [loadingAudit, setLoadingAudit] = useState(false)

    // ✅ NEW: Template WA Customizable (Fitur 11)
    const [waTemplate, setWaTemplate] = useState(`Assalamu'alaikum Bapak/Ibu wali dari {nama} ({kelas}).\nPoin perilaku saat ini: {poin}.\nKode siswa: {kode}.`)

    // ✅ NEW: Import Google Sheets (Fitur 12)
    const [gSheetsUrl, setGSheetsUrl] = useState('')
    const [fetchingGSheets, setFetchingGSheets] = useState(false)
    const [isGSheetsModalOpen, setIsGSheetsModalOpen] = useState(false)

    // ✅ NEW: Dropdown menu header
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const headerMenuRef = useRef(null)
    useEffect(() => {
        const handler = (e) => { if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // ✅ Row action dropdown
    const [openRowMenuId, setOpenRowMenuId] = useState(null)
    // ✅ Form optional fields toggle
    const [showOptionalFields, setShowOptionalFields] = useState(false)

    // ✅ NEW: Photo Hover Zoom (Fitur 13)
    const [photoZoom, setPhotoZoom] = useState(null) // { url, name, x, y }

    // ✅ FIX: ref import dan ref foto dipisah (sebelumnya bentrok)
    const importFileInputRef = useRef(null)
    const photoInputRef = useRef(null)

    const { addToast } = useToast()

    // =========================================
    // Pagination + Filter + Sort
    // =========================================
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [jumpPage, setJumpPage] = useState('')

    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    // =========================================
    // Load Data
    // =========================================
    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')
            if (classesError) throw classesError
            setClassesList(classesData || [])

            const from = (page - 1) * pageSize
            const to = from + pageSize - 1

            const sortMap = {
                name_asc: { col: 'name', asc: true },
                name_desc: { col: 'name', asc: false },
                class_asc: { col: 'class_id', asc: true },
                points_desc: { col: 'total_points', asc: false },
                points_asc: { col: 'total_points', asc: true },
            }
            const orderCfg = sortMap[sortBy] || sortMap.name_asc

            let q = supabase
                .from('students')
                .select(`*, classes (id, name)`, { count: 'exact' })
                .order(orderCfg.col, { ascending: orderCfg.asc })
                .range(from, to)
                .is('deleted_at', null) // ✅ soft delete: hanya tampilkan yang belum dihapus

            // ✅ FIX: support multi-class filter (Fitur 8)
            if (filterClasses.length === 1) q = q.eq('class_id', filterClasses[0])
            else if (filterClasses.length > 1) q = q.in('class_id', filterClasses)
            else if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (filterStatus) q = q.eq('status', filterStatus)
            if (filterTag) q = q.contains('tags', [filterTag])
            if (filterGender) q = q.eq('gender', filterGender)
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%`)
            }
            // ✅ NEW: filter poin range
            if (filterPointMode === 'risk') q = q.lt('total_points', RISK_THRESHOLD)
            else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
            else if (filterPointMode === 'custom') {
                if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
                if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
            }

            const { data: studentsData, error: studentsError, count } = await q
            if (studentsError) throw studentsError

            setTotalRows(count ?? 0)

            // ✅ Global stats — semua siswa aktif (non-archived)
            const { data: statsData } = await supabase
                .from('students')
                .select('id, gender, total_points, class_id, classes(name)')
                .is('deleted_at', null)
            if (statsData) {
                const total = statsData.length
                const boys = statsData.filter(s => s.gender === 'L').length
                const girls = statsData.filter(s => s.gender === 'P').length
                const avgPoints = total > 0
                    ? Math.round(statsData.reduce((acc, s) => acc + (s.total_points || 0), 0) / total)
                    : 0

                // ✅ NEW: hitung kelas dengan rata-rata poin terendah
                const classBuckets = {}
                statsData.forEach(s => {
                    const cn = s.classes?.name || 'Tanpa Kelas'
                    if (!classBuckets[cn]) classBuckets[cn] = []
                    classBuckets[cn].push(s.total_points || 0)
                })
                // ✅ BUG FIX: hanya tampilkan kelas bermasalah jika rata-rata poin BENAR-BENAR negatif
                let worstClass = null, worstAvg = 0
                Object.entries(classBuckets).forEach(([name, pts]) => {
                    const avg = pts.reduce((a, b) => a + b, 0) / pts.length
                    if (avg < worstAvg) { worstAvg = avg; worstClass = { name, avg: Math.round(avg), count: pts.length } }
                })

                setGlobalStats({ total, boys, girls, avgPoints, worstClass })
            }

            // ✅ NEW: fetch last behavior report per student di halaman ini
            const ids = (studentsData || []).map(s => s.id)
            if (ids.length > 0) {
                const { data: reportsData } = await supabase
                    .from('behavior_reports')
                    .select('student_id, created_at')
                    .in('student_id', ids)
                    .order('created_at', { ascending: false })
                const map = {}
                    ; (reportsData || []).forEach(r => {
                        if (!map[r.student_id]) map[r.student_id] = r.created_at
                    })
                setLastReportMap(map)
            } else {
                setLastReportMap({})
            }

            const transformed = (studentsData || []).map(s => {
                const pts = s.total_points ?? 0
                const trend = pts > 0 ? 'up' : pts < 0 ? 'down' : 'neutral'
                return {
                    ...s,
                    className: s.classes?.name || '-',
                    code: s.registration_code,
                    points: pts,
                    trend,
                }
            })

            // ✅ NEW: Fitur 3 - Ranking poin per kelas
            const classBucketsForRank = {}
            transformed.forEach(s => {
                if (!classBucketsForRank[s.class_id]) classBucketsForRank[s.class_id] = []
                classBucketsForRank[s.class_id].push(s)
            })
            Object.values(classBucketsForRank).forEach(arr => {
                const sorted = [...arr].sort((a, b) => b.points - a.points)
                sorted.forEach((s, idx) => { s._rank = idx + 1 })
            })

            setStudents(transformed)
        } catch (err) {
            console.error('Fetch error:', err)
            addToast('Gagal memuat data dari database', 'error')
        } finally {
            setLoading(false)
        }
    }

    const fetchBehaviorHistory = async (studentId) => {
        setLoadingHistory(true)
        try {
            const { data, error } = await supabase
                .from('behavior_reports')
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })

            if (error) {
                setBehaviorHistory([])
            } else {
                setBehaviorHistory(data || [])
            }
        } catch {
            setBehaviorHistory([])
        } finally {
            setLoadingHistory(false)
        }
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, pageSize, filterClass, filterClasses, filterGender, filterStatus, filterTag, sortBy, debouncedSearch, filterPointMode, filterPointMin, filterPointMax])

    // ✅ FIX: hapus client-side filter/sort — sudah dilakukan server-side
    // students = data halaman aktif langsung dari Supabase
    // totalRows = count dari server (semua baris yang cocok filter)
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)

    // clamp page
    useEffect(() => {
        if (page > totalPages && totalPages > 0) setPage(totalPages)
        if (page < 1) setPage(1)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [totalPages])

    // ✅ NEW: Escape key untuk clear search
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'Escape' && searchQuery) setSearchQuery('')
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [searchQuery])

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

    // ✅ FIX: stats dari globalStats (semua siswa), bukan hanya halaman aktif
    const stats = globalStats

    // =========================================
    // BASIC CRUD
    // =========================================
    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }

    const handleAdd = () => {
        setSelectedStudent(null)
        setFormData({ name: '', gender: 'L', class_id: '', phone: '', photo_url: '', nisn: '', guardian_name: '', guardian_relation: 'Ayah', status: 'aktif', tags: [] })
        setDuplicateWarning(null)
        setShowOptionalFields(false)
        setIsModalOpen(true)
    }

    const handleEdit = (student) => {
        setSelectedStudent(student)
        setFormData({
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
        })
        setDuplicateWarning(null)
        // Buka optional jika ada data opsional
        setShowOptionalFields(!!(student.nisn || student.guardian_name || (student.tags || []).length > 0))
        setIsModalOpen(true)
    }

    const confirmDelete = (student) => {
        setStudentToDelete(student)
        setIsDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!studentToDelete) return
        try {
            // ✅ SOFT DELETE: set deleted_at, bukan hard delete
            const { error } = await supabase
                .from('students')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', studentToDelete.id)
            if (error) throw error

            addToast(`${studentToDelete.name} dipindahkan ke arsip`, 'success')
            fetchData()
        } catch {
            addToast('Gagal mengarsipkan siswa', 'error')
        } finally {
            setIsDeleteModalOpen(false)
            setStudentToDelete(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
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

                // ✅ NEW: Rekam riwayat kelas jika kelas berubah
                if (formData.class_id !== selectedStudent.class_id) {
                    await supabase.from('student_class_history').insert([{
                        student_id: selectedStudent.id,
                        from_class_id: selectedStudent.class_id,
                        to_class_id: formData.class_id,
                        changed_at: new Date().toISOString(),
                        note: 'Diubah manual'
                    }]).catch(() => { }) // silent fail — tabel mungkin belum ada
                }

                addToast('Data siswa berhasil diperbarui', 'success')
            } else {
                const { error } = await supabase.from('students').insert([newStudentData])
                if (error) throw error
                setNewlyCreatedStudent(newStudentData)
                setIsSuccessModalOpen(true)
                addToast('Siswa berhasil didaftarkan', 'success')
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err) {
            console.error('Submit error:', err)
            addToast('Gagal menyimpan data', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // =========================================
    // BULK PROMOTE
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
        try {
            const { error } = await supabase
                .from('students')
                .update({ class_id: bulkClassId })
                .in('id', selectedStudentIds)

            if (error) throw error

            setIsBulkModalOpen(false)
            setSelectedStudentIds([])
            fetchData()
        } catch {
            addToast('Gagal memproses kenaikan kelas massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ✅ NEW: Bulk soft delete (arsip)
    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('students')
                .update({ deleted_at: new Date().toISOString() })
                .in('id', selectedStudentIds)
            if (error) throw error
            addToast(`${selectedStudentIds.length} siswa dipindahkan ke arsip`, 'success')
            setIsBulkDeleteModalOpen(false)
            setSelectedStudentIds([])
            fetchData()
        } catch {
            addToast('Gagal mengarsipkan siswa terpilih', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ✅ NEW: Fetch archived students
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

    // ✅ NEW: Restore student from archive
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
        } catch {
            addToast('Gagal memulihkan siswa', 'error')
        }
    }

    // ✅ NEW: Hard delete from archive
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

    // ✅ NEW: Fetch class history for a student
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

    // ✅ NEW: Fitur 1 - Class Breakdown
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
                const riskCount = data.filter(s => (s.total_points || 0) <= RISK_THRESHOLD).length
                const sorted = [...data].sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
                const topStudents = sorted.slice(0, 3)
                setClassBreakdownData({ className, total: data.length, boys, girls, avgPoints, riskCount, topStudents, allStudents: sorted })
            }
        } catch { } finally {
            setLoadingBreakdown(false)
        }
    }

    // ✅ NEW: Fitur 2 - Batch Reset Poin
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
        } catch {
            addToast('Gagal reset poin', 'error')
        } finally {
            setResettingPoints(false)
        }
    }

    // ✅ NEW: Fitur 5 - Reset PIN
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
            if (selectedStudent?.id === student.id) setSelectedStudent({ ...selectedStudent, pin: newPin })
        } catch {
            addToast('Gagal reset PIN', 'error')
        } finally {
            setResettingPin(false)
        }
    }

    // ✅ NEW: Fitur 6 - Duplicate Detection
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

    // ✅ NEW: Fitur 7 - Tag management
    const handleToggleTag = async (student, tag) => {
        const currentTags = student.tags || []
        const newTags = currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
        try {
            const { error } = await supabase.from('students').update({ tags: newTags }).eq('id', student.id)
            if (error) throw error
            setStudentForTags({ ...student, tags: newTags })
            fetchData()
            addToast('Tag berhasil diperbarui', 'success')
        } catch {
            addToast('Gagal update tag', 'error')
        }
    }

    // ✅ NEW: Fitur 9 - Export hasil filter aktif
    const fetchFilteredForExport = async () => {
        let q = supabase.from('students').select(`*, classes (name)`).is('deleted_at', null).order('name')
        if (filterClasses.length > 0) q = q.in('class_id', filterClasses)
        else if (filterClass) q = q.eq('class_id', filterClass)
        if (filterGender) q = q.eq('gender', filterGender)
        if (filterStatus) q = q.eq('status', filterStatus)
        if (filterTag) q = q.contains('tags', [filterTag])
        if (debouncedSearch) {
            const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
            q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%`)
        }
        if (filterPointMode === 'risk') q = q.lt('total_points', RISK_THRESHOLD)
        else if (filterPointMode === 'positive') q = q.gt('total_points', 0)
        else if (filterPointMode === 'custom') {
            if (filterPointMin !== '') q = q.gte('total_points', Number(filterPointMin))
            if (filterPointMax !== '') q = q.lte('total_points', Number(filterPointMax))
        }
        const { data, error } = await q
        if (error) throw error
        return (data || []).map(s => ({
            ID: s.id, Kode: s.registration_code || '', Nama: s.name || '',
            Gender: s.gender || '', Kelas: s.classes?.name || '',
            Poin: s.total_points ?? 0, Phone: s.phone || '', Status: s.status || 'aktif',
            Tags: (s.tags || []).join(', ')
        }))
    }

    // ✅ NEW: Fitur 10 - Audit Log
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
        } catch {
            // Table mungkin belum ada
            setAuditLogs([])
        } finally {
            setLoadingAudit(false)
        }
    }

    // ✅ NEW: Fitur 12 - Import Google Sheets
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
            buildImportPreview(rows)
            setIsGSheetsModalOpen(false)
            setIsImportModalOpen(true)
            addToast(`${rows.length} baris berhasil dibaca dari Google Sheets`, 'success')
        } catch (err) {
            addToast(err.message || 'Gagal mengambil data dari Google Sheets', 'error')
        } finally {
            setFetchingGSheets(false)
        }
    }

    // ✅ NEW: Upload foto ke Supabase Storage
    const handlePhotoUpload = async (file) => {
        if (!file) return
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
            setFormData(prev => ({ ...prev, photo_url: urlData.publicUrl }))
            addToast('Foto berhasil diupload', 'success')
        } catch (err) {
            console.error('Upload error:', err)
            // Fallback ke base64 jika storage belum dikonfigurasi
            const reader = new FileReader()
            reader.onloadend = () => setFormData(prev => ({ ...prev, photo_url: reader.result }))
            reader.readAsDataURL(file)
            addToast('Storage belum aktif, foto disimpan lokal sementara', 'warning')
        } finally {
            setUploadingPhoto(false)
        }
    }

    // ✅ NEW: Quick Inline Add
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
        } catch {
            addToast('Gagal menambahkan siswa', 'error')
        } finally {
            setSubmittingInline(false)
        }
    }
    const handleViewProfile = (student) => {
        setSelectedStudent(student)
        fetchBehaviorHistory(student.id)
        setIsProfileModalOpen(true)
    }

    const handleViewQR = (student) => {
        setSelectedStudent(student)
        setIsQRModalOpen(true)
    }

    const handleViewPrint = (student) => {
        setSelectedStudent(student)
        setIsPrintModalOpen(true)
    }

    // ✅ NEW: Bulk WA — kirim notifikasi ke semua wali terpilih
    const handleBulkWA = () => {
        const targets = students.filter(s => selectedStudentIds.includes(s.id) && s.phone)
        if (!targets.length) {
            addToast('Tidak ada siswa terpilih yang memiliki nomor WA', 'warning')
            return
        }
        setIsBulkWAModalOpen(true)
    }

    const buildWAMessage = (student, template) => {
        return template
            .replace(/{nama}/g, student.name)
            .replace(/{kelas}/g, student.className || student.class || '-')
            .replace(/{poin}/g, String(student.points ?? student.total_points ?? 0))
            .replace(/{kode}/g, student.code || student.registration_code || '-')
            .replace(/{pin}/g, student.pin || '-')
    }

    const openWAForStudent = (student, msg) => {
        const phone = (student.phone || '').replace(/\D/g, '').replace(/^0/, '62')
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        window.open(url, '_blank')
    }

    // ✅ NEW: Bulk print kartu PDF — semua siswa terpilih
    const handleBulkPrint = async () => {
        const targets = students.filter(s => selectedStudentIds.includes(s.id))
        if (!targets.length) { addToast('Pilih siswa terlebih dahulu', 'warning'); return }

        addToast('Menyiapkan PDF kartu...', 'info')
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [215, 135] })
            targets.forEach((s, idx) => {
                if (idx > 0) doc.addPage()
                // Card background
                doc.setFillColor(55, 48, 163)
                doc.roundedRect(10, 10, 195, 115, 8, 8, 'F')
                // Name
                doc.setTextColor(255, 255, 255)
                doc.setFontSize(14)
                doc.setFont('helvetica', 'bold')
                doc.text(s.name, 20, 35)
                // Class
                doc.setFontSize(10)
                doc.setFont('helvetica', 'normal')
                doc.text(s.className || '-', 20, 44)
                // Code
                doc.setFontSize(9)
                doc.text(`Kode: ${s.code || '-'}`, 20, 58)
                doc.text(`PIN: ${s.pin || '-'}`, 20, 66)
                if (s.nisn) doc.text(`NISN: ${s.nisn}`, 20, 74)
                // Gender badge
                doc.setFontSize(8)
                doc.text(s.gender === 'L' ? 'PUTRA' : 'PUTRI', 20, 105)
                // School label
                doc.setFontSize(7)
                doc.text('Laporanmu — Sistem Laporan Perilaku', 20, 118)
            })
            doc.save(`kartu_siswa_${new Date().toISOString().slice(0, 10)}.pdf`)
            addToast(`${targets.length} kartu berhasil digenerate`, 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal generate kartu PDF', 'error')
        }
    }

    // ✅ NEW: Download template import xlsx
    const handleDownloadTemplate = () => {
        const templateData = [
            { name: 'Contoh: Ahmad Rizki', gender: 'L', phone: '081234567890', class_name: 'XII IPA 1', nisn: '1234567890' },
            { name: 'Contoh: Siti Aminah', gender: 'P', phone: '081234567891', class_name: 'XI IPS 2', nisn: '0987654321' },
        ]
        const ws = XLSX.utils.json_to_sheet(templateData)
        ws['!cols'] = [{ wch: 25 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 15 }]
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Template')
        const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'template_import_siswa.xlsx'
        link.click()
        addToast('Template berhasil didownload', 'success')
    }

    // ✅ Helper: format relative date
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

    // ✅ Helper: reset all filters
    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterClass('')
        setFilterClasses([])
        setFilterGender('')
        setFilterStatus('')
        setFilterTag('')
        setSortBy('name_asc')
        setFilterPointMode('')
        setFilterPointMin('')
        setFilterPointMax('')
        setSelectedStudentIds([])
    }

    const activeFilterCount = [filterClass, filterClasses.length > 0 ? 'multi' : '', filterGender, filterStatus, filterTag, filterPointMode, debouncedSearch].filter(Boolean).length

    // =========================================
    // ADVANCED IMPORT / EXPORT (ALL IN THIS FILE)
    // =========================================
    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)

    const [importFileName, setImportFileName] = useState('')
    const [importPreview, setImportPreview] = useState([]) // rows siap insert
    const [importIssues, setImportIssues] = useState([])   // {row, level, messages[]}
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
    const [exporting, setExporting] = useState(false)

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

    const pick = (obj, keys) => {
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

    const buildImportPreview = (rows) => {
        const issues = []
        const preview = rows.map((r, idx) => {
            // header fleksibel
            const name = sanitizeText(pick(r, ['name', 'nama']))
            const genderRaw = sanitizeText(pick(r, ['gender', 'jk', 'jenis_kelamin']))
            const phone = normalizePhone(pick(r, ['phone', 'no_hp', 'hp', 'whatsapp']))
            const className = sanitizeText(pick(r, ['class_name', 'kelas', 'class']))

            // normalisasi gender ringan
            let gender = genderRaw
            if (genderRaw) {
                const g = genderRaw.toLowerCase()
                if (['l', 'lk', 'laki', 'laki-laki', 'male'].includes(g)) gender = 'L'
                else if (['p', 'pr', 'perempuan', 'female'].includes(g)) gender = 'P'
            }
            if (!gender) gender = 'L'

            const classObj = classesList.find(c => (c.name || '').toLowerCase() === className.toLowerCase())
            const class_id = classObj?.id || null

            const rowIssues = []
            // blocking errors minimal (biar import ga “ngaco”)
            if (!name) rowIssues.push({ level: 'error', msg: 'Nama wajib diisi' })
            if (!className) rowIssues.push({ level: 'error', msg: 'Kelas wajib diisi (kolom class_name/kelas)' })
            if (className && !class_id) rowIssues.push({ level: 'error', msg: `Kelas "${className}" tidak ditemukan di database` })

            // warnings (ga ngeblok import)
            if (phone && !isValidPhone(phone)) rowIssues.push({ level: 'warn', msg: 'No HP formatnya aneh (08/+62, 10-13 digit)' })
            if (gender && !['L', 'P'].includes(gender)) rowIssues.push({ level: 'warn', msg: 'Gender sebaiknya L/P' })

            if (rowIssues.length) {
                const level = rowIssues.some(x => x.level === 'error') ? 'error' : 'warn'
                issues.push({
                    row: idx + 2,
                    level,
                    messages: rowIssues.map(x => x.msg)
                })
            }

            return {
                name,
                gender,
                phone: phone || null,
                class_id,
                photo_url: null
            }
        })

        setImportPreview(preview)
        setImportIssues(issues)
    }

    const handleImportClick = () => importFileInputRef.current?.click()

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setImportFileName(file.name)
        setImportPreview([])
        setImportIssues([])

        try {
            const isXlsx = file.name.toLowerCase().endsWith('.xlsx') || (file.type || '').includes('sheet')
            const rows = isXlsx ? await parseExcelFile(file) : await parseCSVFile(file)

            if (!rows.length) {
                addToast('File kosong atau tidak terbaca', 'error')
                return
            }

            buildImportPreview(rows)
            setIsImportModalOpen(true)
        } catch (err) {
            console.error(err)
            addToast('Gagal membaca file import', 'error')
        } finally {
            e.target.value = ''
        }
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

        // Filter hanya baris yang tidak punya error blocking
        const errorRows = new Set(importIssues.filter(x => x.level === 'error').map(x => x.row - 2))
        const validRows = importPreview.filter((_, i) => !errorRows.has(i))

        setImporting(true)
        setImportProgress({ done: 0, total: validRows.length })

        // ✅ FIX: batch insert (chunk 50) jauh lebih cepat dari sequential
        const CHUNK = 50
        try {
            for (let i = 0; i < validRows.length; i += CHUNK) {
                const chunk = validRows.slice(i, i + CHUNK).map(r => ({
                    ...r,
                    registration_code: generateCode(),
                    pin: String(Math.floor(1000 + Math.random() * 9000)),
                    total_points: 0
                }))
                const { error } = await supabase.from('students').insert(chunk)
                if (error) throw error
                setImportProgress({ done: Math.min(i + CHUNK, validRows.length), total: validRows.length })
            }

            addToast(`Berhasil import ${validRows.length} siswa`, 'success')
            setIsImportModalOpen(false)
            setImportPreview([])
            setImportIssues([])
            await fetchData()
        } catch (err) {
            console.error(err)
            addToast('Gagal import (cek constraint DB / duplikat / koneksi)', 'error')
        } finally {
            setImporting(false)
        }
    }

    // EXPORT
    // ✅ FIX: fetch semua data sebelum export (bukan hanya halaman aktif)
    const fetchAllForExport = async () => {
        const { data, error } = await supabase
            .from('students')
            .select(`*, classes (name)`)
            .order('name', { ascending: true })
        if (error) throw error
        return (data || []).map(s => ({
            ID: s.id,
            Kode: s.registration_code || '',
            Nama: s.name || '',
            Gender: s.gender || '',
            Kelas: s.classes?.name || '',
            Poin: s.total_points ?? 0,
            Phone: s.phone || ''
        }))
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
            const rows = await fetchAllForExport()
            const headers = ['ID', 'Kode', 'Nama', 'Gender', 'Kelas', 'Poin', 'Phone']
            const csvContent = [
                headers.join(','),
                ...rows.map(s =>
                    [
                        s.ID,
                        s.Kode,
                        `"${String(s.Nama).replace(/"/g, '""')}"`,
                        s.Gender,
                        `"${String(s.Kelas).replace(/"/g, '""')}"`,
                        s.Poin,
                        `"${String(s.Phone).replace(/"/g, '""')}"`
                    ].join(',')
                )
            ].join('\n')
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            downloadBlob(blob, `data_siswa_${new Date().toISOString().slice(0, 10)}.csv`)
            addToast('Export CSV berhasil', 'success')
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
            const data = await fetchAllForExport()
            const ws = XLSX.utils.json_to_sheet(data)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Students')
            const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
            const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            downloadBlob(blob, `data_siswa_${new Date().toISOString().slice(0, 10)}.xlsx`)
            addToast('Export Excel berhasil', 'success')
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
            const allRows = await fetchAllForExport()
            const doc = new jsPDF({ orientation: 'landscape' })
            doc.setFontSize(12)
            doc.text('Laporan Data Siswa', 14, 12)
            doc.setFontSize(9)
            doc.text(`Tanggal: ${new Date().toLocaleDateString()}`, 14, 18)

            const rows = allRows.map(s => ([s.ID, s.Kode, s.Nama, s.Gender, s.Kelas, String(s.Poin), s.Phone]))

            autoTable(doc, {
                head: [['ID', 'Kode', 'Nama', 'Gender', 'Kelas', 'Poin', 'Phone']],
                body: rows,
                startY: 22,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [30, 30, 30] }
            })

            doc.save(`laporan_siswa_${new Date().toISOString().slice(0, 10)}.pdf`)
            addToast('Export PDF berhasil', 'success')
        } catch (e) {
            console.error(e)
            addToast('Gagal export PDF', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    return (
        <DashboardLayout title="Data Siswa">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Kelola {globalStats.total} data siswa aktif dalam sistem laporan.
                    </p>
                </div>

                <div className="flex gap-2 items-center">
                    {/* Dropdown menu untuk aksi sekunder */}
                    <div className="relative" ref={headerMenuRef}>
                        <button
                            onClick={() => setIsHeaderMenuOpen(v => !v)}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Aksi lainnya"
                        >
                            <FontAwesomeIcon icon={faSliders} />
                        </button>

                        {isHeaderMenuOpen && (
                            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/10 overflow-hidden">
                                <div className="p-1.5 space-y-0.5">
                                    <p className="px-3 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Data</p>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); handleImportClick() }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faUpload} className="w-3.5 text-[var(--color-text-muted)]" />
                                        Import CSV / Excel
                                    </button>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); setIsGSheetsModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-emerald-600 hover:bg-emerald-500/10 transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faLink} className="w-3.5" />
                                        Import Google Sheets
                                    </button>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faDownload} className="w-3.5 text-[var(--color-text-muted)]" />
                                        Export Data
                                    </button>

                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="px-3 pt-0.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); fetchArchivedStudents(); setIsArchivedModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-500/10 transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faBoxArchive} className="w-3.5" />
                                        Arsip Siswa
                                    </button>

                                    <button
                                        onClick={() => { setIsHeaderMenuOpen(false); setResetPointsClassId(''); setIsResetPointsModalOpen(true) }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-orange-600 hover:bg-orange-500/10 transition-colors text-left"
                                    >
                                        <FontAwesomeIcon icon={faRotateLeft} className="w-3.5" />
                                        Reset Poin
                                    </button>
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
                        onClick={handleAdd}
                        className="h-9 px-5 rounded-lg btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02]"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        Tambah
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
                        <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{stats.total}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-blue-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-blue-500/5">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faMars} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putra</p>
                        <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{stats.boys}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-pink-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-pink-500/5">
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faVenus} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putri</p>
                        <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{stats.girls}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-emerald-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-emerald-500/5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Rata-rata Poin</p>
                        <h3 className={`text-xl font-black font-heading leading-none ${stats.avgPoints >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'}`}>{stats.avgPoints}</h3>
                    </div>
                </div>

                {/* ✅ NEW: Kelas Bermasalah */}
                <div
                    className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-red-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-red-500/5 cursor-pointer col-span-2 lg:col-span-1"
                    onClick={() => { if (stats.worstClass) { setFilterClass(''); setFilterPointMode('risk') } }}
                    title="Klik untuk filter siswa risiko"
                >
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                        <FontAwesomeIcon icon={faTriangleExclamation} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Kelas Bermasalah</p>
                        {stats.worstClass ? (
                            <>
                                <h3 className="text-sm font-black font-heading leading-none text-red-500 truncate">{stats.worstClass.name}</h3>
                                <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">avg {stats.worstClass.avg} poin</p>
                            </>
                        ) : (
                            <h3 className="text-sm font-black text-[var(--color-text-muted)]">-</h3>
                        )}
                    </div>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">

                {/* Row 1: Search + action buttons */}
                <div className="flex gap-2 p-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, kode..."
                            className="input-field pl-10 w-full h-9 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                    </div>

                    {/* Filter toggle button */}
                    <button
                        type="button"
                        onClick={() => setShowAdvancedFilter(v => !v)}
                        className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showAdvancedFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                    >
                        <FontAwesomeIcon icon={faSliders} />
                        Filter
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
                            Reset
                        </button>
                    )}
                </div>

                {/* Row 2: Expandable filter panel */}
                {showAdvancedFilter && (
                    <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

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
                                    {AVAILABLE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
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
                                    {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </div>

                            {/* Filter Poin Min */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Minimum</label>
                                <input
                                    type="number"
                                    value={filterPointMin}
                                    onChange={(e) => { setFilterPointMin(e.target.value); setFilterPointMode(e.target.value || filterPointMax ? 'custom' : ''); setPage(1) }}
                                    placeholder="0"
                                    className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                                />
                            </div>

                            {/* Filter Poin Max */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Poin Maksimum</label>
                                <input
                                    type="number"
                                    value={filterPointMax}
                                    onChange={(e) => { setFilterPointMax(e.target.value); setFilterPointMode(filterPointMin || e.target.value ? 'custom' : ''); setPage(1) }}
                                    placeholder="Unlimited"
                                    className="input-field h-9 text-sm w-full rounded-xl border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] px-3"
                                />
                            </div>

                            {/* Quick poin presets */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Preset Poin</label>
                                <div className="flex gap-1.5">
                                    {[
                                        { value: '', label: 'Semua' },
                                        { value: 'risk', label: '⚠ Risiko' },
                                        { value: 'positive', label: '✓ Positif' },
                                    ].map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => { setFilterPointMode(opt.value); setFilterPointMin(''); setFilterPointMax(''); setPage(1) }}
                                            className={`flex-1 h-9 rounded-xl text-[9px] font-black uppercase border transition-all ${filterPointMode === opt.value && opt.value !== '' ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] bg-[var(--color-surface)]'}`}
                                        >{opt.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Table / Loading */}
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
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                    <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.length === students.length && students.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-4">Siswa</th>
                                        <th className="px-6 py-4 text-center">Gender</th>
                                        <th className="px-6 py-4 text-center">Kelas</th>
                                        <th className="px-6 py-4 text-center">Poin</th>
                                        <th className="px-6 py-4 text-center">Lap. Terakhir</th>
                                        <th className="px-6 py-4 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-14 ">
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
                                    ) : (students.map((student) => {
                                        const isRisk = student.points <= RISK_THRESHOLD
                                        const lastReport = lastReportMap[student.id]
                                        return (
                                            <tr key={student.id} className={`border-t border-[var(--color-border)] transition-colors ${isRisk ? 'bg-red-500/[0.03] hover:bg-red-500/[0.06]' : 'hover:bg-[var(--color-surface-alt)]/40'}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudentIds.includes(student.id)}
                                                        onChange={() => toggleSelectStudent(student.id)}
                                                    />
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        {/* ✅ NEW: Fitur 13 - Photo hover zoom */}
                                                        <div
                                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black shadow-sm overflow-hidden relative shrink-0 cursor-pointer transition-transform hover:scale-110 ${isRisk ? 'bg-red-500/10 text-red-500' : 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]'}`}
                                                            onClick={() => student.photo_url && setPhotoZoom({ url: student.photo_url, name: student.name })}
                                                            title={student.photo_url ? 'Klik untuk zoom foto' : ''}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                                                            {student.photo_url ? (
                                                                <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                                                            ) : (
                                                                <span className="relative z-10">{(student.name || 'S').charAt(0)}</span>
                                                            )}
                                                        </div>

                                                        <div className="pt-0.5 min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                                <button
                                                                    onClick={() => handleViewProfile(student)}
                                                                    className="font-bold text-sm leading-tight text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors text-left px-0.5 rounded-sm truncate"
                                                                >
                                                                    {student.name}
                                                                </button>
                                                                {isRisk && (
                                                                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest">
                                                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[7px]" />
                                                                        Risiko
                                                                    </span>
                                                                )}
                                                                {/* ✅ NEW: Fitur 4 - Status badge */}
                                                                {student.status && student.status !== 'aktif' && (
                                                                    <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${student.status === 'lulus' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                                        student.status === 'pindah' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                                            'bg-gray-500/10 text-gray-500 border-gray-500/20'
                                                                        }`}>
                                                                        {student.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-[10px] font-mono text-[var(--color-text-muted)] italic opacity-80 leading-none">
                                                                    {student.code}
                                                                </span>
                                                                {student.nisn && (
                                                                    <span className="text-[9px] text-[var(--color-text-muted)] opacity-60 leading-none">NISN: {student.nisn}</span>
                                                                )}
                                                                {/* ✅ NEW: Fitur 7 - Tags */}
                                                                {(student.tags || []).slice(0, 2).map(tag => (
                                                                    <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-500 border border-violet-500/20 font-bold">
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shadow-inner ${student.gender === 'L' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-pink-500/10 text-pink-500 border border-pink-500/20'}`}>
                                                            <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => handleClassBreakdown(student.class_id, student.className)}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest leading-none hover:bg-[var(--color-primary)]/20 transition-colors"
                                                        title="Lihat statistik kelas"
                                                    >
                                                        {student.className}
                                                    </button>
                                                </td>

                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {/* ✅ NEW: Fitur 3 - Rank badge */}
                                                        {student._rank <= 3 && student._rank >= 1 && (
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${student._rank === 1 ? 'bg-yellow-400/20 text-yellow-600 border-yellow-400/30' :
                                                                student._rank === 2 ? 'bg-gray-400/20 text-gray-500 border-gray-400/30' :
                                                                    'bg-orange-400/20 text-orange-600 border-orange-400/30'
                                                                }`}>#{student._rank}</span>
                                                        )}
                                                        <span className={`text-sm font-black ${student.points > 0 ? 'text-[var(--color-success)]' : student.points < 0 ? 'text-red-500' : 'text-[var(--color-text-muted)]'}`}>
                                                            {student.points}
                                                        </span>
                                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-inner ${student.trend === 'up' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20' : student.trend === 'down' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'}`}>
                                                            <FontAwesomeIcon icon={student.trend === 'up' ? faArrowTrendUp : student.trend === 'down' ? faArrowTrendDown : faArrowTrendUp} className={`text-[9px] ${student.trend === 'neutral' ? 'opacity-0' : ''}`} />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* ✅ NEW: Laporan terakhir */}
                                                <td className="px-6 py-4 text-center">
                                                    {lastReport ? (
                                                        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{formatRelativeDate(lastReport)}</span>
                                                    ) : (
                                                        <span className="text-[10px] text-[var(--color-text-muted)] opacity-40">–</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-4 text-right pr-5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* Tombol utama: Edit */}
                                                        <button
                                                            onClick={() => handleEdit(student)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm"
                                                            title="Edit"
                                                        >
                                                            <FontAwesomeIcon icon={faEdit} />
                                                        </button>

                                                        {/* Tombol utama: Profil */}
                                                        <button
                                                            onClick={() => handleViewProfile(student)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-all text-sm"
                                                            title="Lihat Profil"
                                                        >
                                                            <FontAwesomeIcon icon={faUserTie} />
                                                        </button>

                                                        {/* Dropdown ••• */}
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setOpenRowMenuId(openRowMenuId === student.id ? null : student.id)}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all text-xs font-black"
                                                                title="Aksi lainnya"
                                                            >
                                                                •••
                                                            </button>

                                                            {openRowMenuId === student.id && (
                                                                <>
                                                                    {/* Overlay untuk close */}
                                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenRowMenuId(null)} />

                                                                    <div className="absolute right-0 top-9 z-50 w-48 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/10 overflow-hidden">
                                                                        <div className="p-1.5 space-y-0.5">
                                                                            <button
                                                                                onClick={() => { setOpenRowMenuId(null); handleViewQR(student) }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                                                            >
                                                                                <FontAwesomeIcon icon={faQrcode} className="w-3.5 text-indigo-500" />
                                                                                QR Akses
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { setOpenRowMenuId(null); handleViewPrint(student) }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                                                            >
                                                                                <FontAwesomeIcon icon={faIdCardAlt} className="w-3.5 text-[var(--color-primary)]" />
                                                                                Cetak Kartu
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { setOpenRowMenuId(null); setStudentForTags(student); setIsTagModalOpen(true) }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                                                            >
                                                                                <FontAwesomeIcon icon={faFilter} className="w-3.5 text-violet-500" />
                                                                                Kelola Label
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { setOpenRowMenuId(null); handleViewClassHistory(student) }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"
                                                                            >
                                                                                <FontAwesomeIcon icon={faClockRotateLeft} className="w-3.5 text-purple-500" />
                                                                                Riwayat Kelas
                                                                            </button>

                                                                            <div className="h-px bg-[var(--color-border)] my-1 mx-2" />

                                                                            <button
                                                                                onClick={() => { setOpenRowMenuId(null); confirmDelete(student) }}
                                                                                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-amber-600 hover:bg-amber-500/10 transition-colors text-left"
                                                                            >
                                                                                <FontAwesomeIcon icon={faBoxArchive} className="w-3.5" />
                                                                                Arsipkan
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }))}

                                    {/* ✅ NEW: Quick Inline Add Row */}
                                    {isInlineAddOpen && (
                                        <tr className="border-t-2 border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.02]">
                                            <td className="px-6 py-3" colSpan={1}></td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="text"
                                                    value={inlineForm.name}
                                                    onChange={e => setInlineForm(p => ({ ...p, name: e.target.value }))}
                                                    onKeyDown={e => e.key === 'Enter' && handleInlineSubmit()}
                                                    placeholder="Nama siswa baru..."
                                                    autoFocus
                                                    className="input-field text-sm h-8 px-3 rounded-lg border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent w-full max-w-[200px]"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex gap-1 justify-center">
                                                    {['L', 'P'].map(g => (
                                                        <button key={g} type="button" onClick={() => setInlineForm(p => ({ ...p, gender: g }))}
                                                            className={`w-7 h-7 rounded-md text-[10px] font-black border transition-all ${inlineForm.gender === g ? (g === 'L' ? 'bg-blue-500/20 border-blue-500/40 text-blue-500' : 'bg-pink-500/20 border-pink-500/40 text-pink-500') : 'border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
                                                        >{g}</button>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <select
                                                    value={inlineForm.class_id}
                                                    onChange={e => setInlineForm(p => ({ ...p, class_id: e.target.value }))}
                                                    className="select-field text-xs h-8 px-2 rounded-lg border-[var(--color-border)] bg-transparent font-bold min-w-[110px]"
                                                >
                                                    <option value="">Pilih kelas</option>
                                                    {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <input
                                                    type="text"
                                                    value={inlineForm.phone}
                                                    onChange={e => setInlineForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                                    placeholder="08xxx"
                                                    className="input-field text-xs h-8 px-2 rounded-lg border-[var(--color-border)] bg-transparent w-24"
                                                />
                                            </td>
                                            <td className="px-6 py-3"></td>
                                            <td className="px-6 py-3 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={handleInlineSubmit} disabled={submittingInline}
                                                        className="h-8 px-3 rounded-lg bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition disabled:opacity-50 flex items-center gap-1.5">
                                                        {submittingInline ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faCheck} /> Simpan</>}
                                                    </button>
                                                    <button onClick={() => setIsInlineAddOpen(false)}
                                                        className="h-8 w-8 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faXmark} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* ✅ NEW: Quick Add trigger */}
                        {!isInlineAddOpen && (
                            <button
                                onClick={() => setIsInlineAddOpen(true)}
                                className="w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all border-t border-[var(--color-border)] border-dashed"
                            >
                                <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                                Quick Add Siswa
                            </button>
                        )}

                        {/* Bulk action footer */}
                        {selectedStudentIds.length > 0 && (
                            <div className="p-3 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[var(--color-surface-alt)]/40">
                                <div className="text-xs font-bold text-[var(--color-text-muted)]">
                                    <span className="text-[var(--color-primary)] font-black">{selectedStudentIds.length}</span> siswa terpilih
                                    <span className="text-[var(--color-text-muted)]/60 ml-1">(halaman ini)</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleBulkWA}
                                        className="btn bg-green-500/10 hover:bg-green-500 text-green-600 hover:text-white border border-green-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faWhatsapp} />
                                        WA Wali
                                    </button>
                                    <button
                                        onClick={handleBulkPrint}
                                        className="btn bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white border border-indigo-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faPrint} />
                                        Cetak Kartu
                                    </button>
                                    <button
                                        onClick={() => setIsBulkDeleteModalOpen(true)}
                                        className="btn bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                        Hapus
                                    </button>
                                    <button
                                        onClick={() => setIsBulkModalOpen(true)}
                                        className="btn btn-primary h-8 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5"
                                    >
                                        <FontAwesomeIcon icon={faGraduationCap} />
                                        Naik Kelas
                                    </button>
                                    {/* ✅ NEW: Fitur 9 - Export filter aktif */}
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
                                                    addToast(`${rows.length} baris berhasil diekspor`, 'success')
                                                } catch { addToast('Gagal export', 'error') }
                                            }}
                                            className="btn bg-teal-500/10 hover:bg-teal-500 text-teal-600 hover:text-white border border-teal-500/20 h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-1.5"
                                        >
                                            <FontAwesomeIcon icon={faDownload} />
                                            Export Filter
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Pagination Footer */}
            <div className="p-4 border-t border-[var(--color-border)] flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-[var(--color-surface-alt)]/30">
                {/* Left info */}
                <div className="text-xs font-bold text-[var(--color-text-muted)]">
                    Menampilkan <span className="text-[var(--color-text)]">{fromRow}</span> – <span className="text-[var(--color-text)]">{toRow}</span> dari{' '}
                    <span className="text-[var(--color-text)]">{totalRows}</span>
                </div>

                {/* Right controls */}
                <div className="flex flex-wrap items-center gap-2 justify-end">
                    {/* Page size */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--color-text-muted)]">Tampilkan</span>
                        <select
                            className="h-10 rounded-xl border border-[var(--color-border)] bg-transparent px-3 text-sm font-bold"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value))
                                setPage(1)
                            }}
                        >
                            {[10, 25, 50, 100].map(n => (
                                <option key={n} value={n}>{n} / halaman</option>
                            ))}
                        </select>
                    </div>

                    {/* Hide page controls kalau cuma 1 halaman atau data kosong */}
                    {(totalPages > 1 && totalRows > 0) && (
                        <>
                            {/* First */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page === 1}
                                onClick={() => setPage(1)}
                                title="Halaman pertama"
                            >
                                <FontAwesomeIcon icon={faAnglesLeft} />
                            </button>

                            {/* Prev */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                title="Sebelumnya"
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>

                            {/* Page numbers */}
                            <div className="flex items-center gap-1 px-1">
                                {getPageItems(page, totalPages).map((it, idx) => {
                                    if (it === '...') {
                                        return (
                                            <div key={`dots-${idx}`} className="h-10 px-2 flex items-center text-[var(--color-text-muted)] font-black">
                                                …
                                            </div>
                                        )
                                    }
                                    const n = it
                                    const active = n === page
                                    return (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n)}
                                            className={
                                                `h-10 min-w-[40px] px-3 rounded-xl border transition font-black text-xs ` +
                                                (active
                                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20'
                                                    : 'border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]')
                                            }
                                        >
                                            {n}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Next */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                title="Berikutnya"
                            >
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>

                            {/* Last */}
                            <button
                                className="h-10 w-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={page >= totalPages}
                                onClick={() => setPage(totalPages)}
                                title="Halaman terakhir"
                            >
                                <FontAwesomeIcon icon={faAnglesRight} />
                            </button>

                            {/* Jump to page */}
                            <div className="flex items-center gap-2 ml-1">
                                <span className="text-xs font-bold text-[var(--color-text-muted)] hidden sm:inline">Ke</span>
                                <input
                                    value={jumpPage}
                                    onChange={(e) => setJumpPage(e.target.value.replace(/[^\d]/g, ''))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const n = Number(jumpPage)
                                            if (!n) return
                                            setPage(Math.min(totalPages, Math.max(1, n)))
                                            setJumpPage('')
                                        }
                                    }}
                                    placeholder={`${page}/${totalPages}`}
                                    className="h-10 w-24 rounded-xl border border-[var(--color-border)] bg-transparent px-3 text-sm font-bold"
                                />
                                <button
                                    className="h-10 px-4 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition text-xs font-black uppercase tracking-widest"
                                    onClick={() => {
                                        const n = Number(jumpPage)
                                        if (!n) return
                                        setPage(Math.min(totalPages, Math.max(1, n)))
                                        setJumpPage('')
                                    }}
                                >
                                    Go
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ===================== */}
            {/* IMPORT MODAL */}
            {/* ===================== */}
            <Modal
                isOpen={isImportModalOpen}
                onClose={() => {
                    if (importing) return
                    setIsImportModalOpen(false)
                }}
                title={`Import Students${importFileName ? ` — ${importFileName}` : ''}`}
                size="xl"
            >
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="text-xs text-[var(--color-text-muted)]">
                            Support file: <b>.csv</b> / <b>.xlsx</b>. Header fleksibel:
                            <b> name/nama</b>, <b> gender/jk</b>, <b> phone/no_hp</b>, <b> class_name/kelas</b>, <b> nisn</b>
                        </div>
                        {/* ✅ NEW: Download template button */}
                        <button
                            type="button"
                            onClick={handleDownloadTemplate}
                            className="shrink-0 btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap"
                        >
                            <FontAwesomeIcon icon={faDownload} />
                            Template
                        </button>
                    </div>

                    {importIssues.length > 0 && (
                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm">
                            <div className="font-black mb-2">
                                Issues ditemukan: {importIssues.length} baris
                                {hasImportBlockingErrors ? ' (ada ERROR, import diblok)' : ' (hanya WARNING, import boleh)'}
                            </div>
                            <div className="max-h-44 overflow-auto space-y-1 text-xs">
                                {importIssues.slice(0, 60).map((e, idx) => (
                                    <div key={idx}>
                                        <b>{e.level.toUpperCase()}</b> — Baris {e.row}: {e.messages.join(', ')}
                                    </div>
                                ))}
                                {importIssues.length > 60 && (
                                    <div className="text-[var(--color-text-muted)]">… dan lainnya</div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
                        <div className="max-h-[45vh] overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0">
                                    <tr className="text-left">
                                        <th className="p-3">#</th>
                                        <th className="p-3">Nama</th>
                                        <th className="p-3">Gender</th>
                                        <th className="p-3">Phone</th>
                                        <th className="p-3">Kelas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importPreview.slice(0, 200).map((r, i) => (
                                        <tr key={i} className="border-t border-[var(--color-border)]">
                                            <td className="p-3">{i + 1}</td>
                                            <td className="p-3">{r.name || '-'}</td>
                                            <td className="p-3">{r.gender || '-'}</td>
                                            <td className="p-3">{r.phone || '-'}</td>
                                            <td className="p-3">
                                                {classesList.find(c => c.id === r.class_id)?.name || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {importPreview.length > 200 && (
                            <div className="p-3 text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]">
                                Preview menampilkan 200 baris pertama dari total {importPreview.length}.
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <button
                            onClick={() => setIsImportModalOpen(false)}
                            disabled={importing}
                            className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)]
              border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                        >
                            Tutup
                        </button>

                        <div className="flex items-center gap-3">
                            {importing && (
                                <div className="text-xs text-[var(--color-text-muted)]">
                                    Importing {importProgress.done}/{importProgress.total}...
                                </div>
                            )}

                            <button
                                onClick={handleCommitImport}
                                disabled={importing || hasImportBlockingErrors || importPreview.length === 0}
                                className="btn bg-[var(--color-primary)] hover:brightness-110 text-white
                text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                            >
                                {importing ? 'Mengimport...' : 'Import ke Database'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ===================== */}
            {/* EXPORT MODAL */}
            {/* ===================== */}
            <Modal
                isOpen={isExportModalOpen}
                onClose={() => {
                    if (exporting) return
                    setIsExportModalOpen(false)
                }}
                title="Export Data Students"
                size="lg"
            >
                <div className="space-y-3">
                    <div className="text-sm text-[var(--color-text-muted)]">
                        Pilih format export:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                            onClick={handleExportCSV}
                            disabled={exporting}
                            className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)]
              border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                        >
                            CSV
                        </button>

                        <button
                            onClick={handleExportExcel}
                            disabled={exporting}
                            className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)]
              border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                        >
                            Excel (.xlsx)
                        </button>

                        <button
                            onClick={handleExportPDF}
                            disabled={exporting}
                            className="btn bg-[var(--color-primary)] hover:brightness-110 text-white
              text-[10px] font-black uppercase tracking-widest h-11 px-5 rounded-xl disabled:opacity-50"
                        >
                            PDF
                        </button>
                    </div>

                    {exporting && (
                        <div className="text-xs text-[var(--color-text-muted)]">
                            Menyiapkan file export...
                        </div>
                    )}
                </div>
            </Modal>

            {/* ===================== */}
            {/* INPUT MODAL */}
            {/* ===================== */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedStudent ? 'Pembaruan Data Siswa' : 'Registrasi Siswa Baru'}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    {/* ── Baris atas: Foto + Field utama ── */}
                    <div className="flex gap-5 items-start">

                        {/* Foto — kiri */}
                        <div className="shrink-0 flex flex-col items-center gap-2">
                            <div className="relative group">
                                <div
                                    className="w-[72px] h-[72px] rounded-2xl bg-[var(--color-surface-alt)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)] cursor-pointer"
                                    onClick={() => photoInputRef.current?.click()}
                                >
                                    {formData.photo_url ? (
                                        <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faCamera} className="text-xl opacity-30" />
                                    )}
                                </div>
                                <input type="file" ref={photoInputRef} onChange={async (e) => { const file = e.target.files[0]; if (file) await handlePhotoUpload(file) }} className="hidden" accept="image/*" />
                                {uploadingPhoto && (
                                    <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-white text-sm" />
                                    </div>
                                )}
                            </div>
                            <span className="text-[9px] text-[var(--color-text-muted)] font-bold text-center leading-tight">Foto<br />Opsional</span>
                        </div>

                        {/* Field utama — kanan */}
                        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3">
                            {/* Nama — full width */}
                            <div className="col-span-2">
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">Nama Lengkap *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => {
                                        setFormData({ ...formData, name: e.target.value })
                                        clearTimeout(window._dupTimer)
                                        window._dupTimer = setTimeout(() => checkDuplicate(e.target.value, formData.class_id), 600)
                                    }}
                                    placeholder="e.g. Akbar Atha Ramadhan"
                                    className="input-field text-sm py-2 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent w-full"
                                    autoFocus
                                />
                                {formData.name && formData.name.trim().length < 3 && (
                                    <p className="text-[9px] text-red-500 mt-0.5 ml-0.5">Min. 3 karakter</p>
                                )}
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">Jenis Kelamin</label>
                                <div className="flex gap-1.5">
                                    {[['L', 'Putra', 'blue'], ['P', 'Putri', 'pink']].map(([val, label, color]) => (
                                        <button key={val} type="button" onClick={() => setFormData({ ...formData, gender: val })}
                                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${formData.gender === val
                                                ? `bg-${color}-500/10 border-${color}-500/30 text-${color}-500`
                                                : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                        >{label}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Kelas */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">Kelas *</label>
                                <select
                                    value={formData.class_id}
                                    onChange={(e) => { setFormData({ ...formData, class_id: e.target.value }); checkDuplicate(formData.name, e.target.value) }}
                                    className="select-field text-sm py-2 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent w-full appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] pr-8"
                                >
                                    <option value="">Pilih Kelas</option>
                                    {classesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* WA Wali */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">WA Wali</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                    placeholder="08xxxxxxxxxx"
                                    className="input-field text-sm py-2 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent w-full"
                                />
                                {formData.phone && !isValidPhone(formData.phone) && (
                                    <p className="text-[9px] text-red-500 mt-0.5">Format tidak valid</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">Status</label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {[['aktif', 'emerald'], ['lulus', 'blue'], ['pindah', 'purple'], ['keluar', 'gray']].map(([s, color]) => (
                                        <button key={s} type="button" onClick={() => setFormData({ ...formData, status: s })}
                                            className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${formData.status === s
                                                ? `bg-${color}-500/10 border-${color}-500/30 text-${color}-600`
                                                : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                        >{s}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Duplicate warning ── */}
                    {duplicateWarning && (
                        <div className="mt-3 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5">⚠ Kemungkinan duplikat!</p>
                            {duplicateWarning.map(d => (
                                <p key={d.id} className="text-[11px]"><b>{d.name}</b> ({d.registration_code}) sudah terdaftar di kelas ini.</p>
                            ))}
                        </div>
                    )}

                    {/* ── Collapsible: Data Opsional ── */}
                    <div className="mt-4 border border-[var(--color-border)] rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowOptionalFields(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <FontAwesomeIcon icon={faUserTie} />
                                Data Opsional — NISN, Wali & Label
                            </span>
                            <FontAwesomeIcon icon={faChevronRight} className={`text-[10px] transition-transform duration-200 ${showOptionalFields ? 'rotate-90' : ''}`} />
                        </button>

                        {showOptionalFields && (
                            <div className="px-4 pb-4 pt-1 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--color-border)]">
                                {/* NISN */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">NISN</label>
                                    <input
                                        type="text"
                                        value={formData.nisn}
                                        onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                        placeholder="10 digit angka"
                                        maxLength={10}
                                        className="input-field text-sm py-2 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent font-mono tracking-wider w-full"
                                    />
                                    {formData.nisn && formData.nisn.length !== 10 && (
                                        <p className="text-[9px] text-amber-500 mt-0.5">{formData.nisn.length}/10 digit</p>
                                    )}
                                </div>

                                {/* Hubungan Wali */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">Hubungan Wali</label>
                                    <select
                                        value={formData.guardian_relation}
                                        onChange={(e) => setFormData({ ...formData, guardian_relation: e.target.value })}
                                        className="select-field text-sm py-2 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_0.75rem_center] pr-8 w-full"
                                    >
                                        {['Ayah', 'Ibu', 'Kakek', 'Nenek', 'Wali'].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                {/* Nama Wali — full width */}
                                <div className="col-span-2">
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1 ml-0.5">Nama Wali</label>
                                    <input
                                        type="text"
                                        value={formData.guardian_name}
                                        onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                                        placeholder="e.g. Bapak Ahmad Fauzi"
                                        className="input-field text-sm py-2 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] bg-transparent w-full"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex justify-end gap-2 pt-4 mt-1 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)}
                            className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest h-10 px-5 rounded-xl transition-all">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting}
                            className="btn btn-primary h-10 px-7 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-xl transition-all hover:scale-[1.02] flex items-center gap-2">
                            {submitting
                                ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                                : selectedStudent ? 'Simpan Perubahan' : 'Daftarkan Siswa'
                            }
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Cetak Kartu Siswa */}
            <Modal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                title="Cetak Kartu Pelajar"
                size="xl"
            >
                {selectedStudent && (
                    <div className="space-y-8 py-4">
                        {/* ID Card Display - Fixed Layout */}
                        <div id="printable-cards" className="flex flex-col lg:flex-row gap-6 justify-center items-start">
                            {/* Front Card */}
                            <div className="w-[340px] h-[215px] bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white relative shadow-2xl overflow-hidden shadow-indigo-500/30 shrink-0">
                                {/* Background Decoration */}
                                <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full blur-2xl" />

                                {/* Header Logo */}
                                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                                    <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                                        <span className="font-black text-[10px]">L</span>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80">Laporanmu</span>
                                </div>

                                {/* Main Content Area */}
                                <div className="absolute top-12 left-5 right-5 bottom-10 flex gap-3.5 z-10">
                                    {/* Photo Section */}
                                    <div className="w-[72px] h-[90px] rounded-xl bg-white/10 border border-white/20 p-1.5 shrink-0 shadow-xl">
                                        <div className="w-full h-full rounded-lg overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
                                            {selectedStudent.photo_url ? (
                                                <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-black opacity-30">{selectedStudent.name.charAt(0)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Info Section */}
                                    <div className="min-w-0 flex-1 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h3 className="text-[13px] font-black leading-[1.2] uppercase mb-1.5 drop-shadow-sm line-clamp-2">{selectedStudent.name}</h3>
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] font-black text-white/90 uppercase tracking-tight leading-tight">{selectedStudent.className}</p>
                                                <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest leading-none">MBS TANGGUL</p>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-white/10">
                                            <p className="text-[6px] font-bold opacity-30 uppercase tracking-widest mb-0.5 leading-none">NOMOR INDUK</p>
                                            <p className="text-[10px] font-mono font-bold tracking-wider text-indigo-100 leading-tight">{selectedStudent.code}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Watermark */}
                                <div className="absolute bottom-3 left-5 right-5 flex items-center justify-between opacity-20">
                                    <div className="flex items-center gap-1">
                                        <FontAwesomeIcon icon={faGraduationCap} className="text-[8px]" />
                                        <span className="text-[6px] font-black uppercase tracking-[0.3em]">KARTU PELAJAR</span>
                                    </div>
                                    <span className="text-[6px] font-black uppercase tracking-[0.2em]">2026/2027</span>
                                </div>
                            </div>

                            {/* Back Card */}
                            <div className="w-[340px] h-[215px] bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800 relative shadow-2xl shadow-gray-200/50 dark:shadow-none flex flex-col items-center justify-center text-center shrink-0 p-5">
                                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm mb-3.5">
                                    <QRCodeCanvas
                                        value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                        size={85}
                                        level="M"
                                    />
                                </div>
                                <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.15em] mb-1.5 leading-tight">AKSES PORTAL ORANG TUA</h4>
                                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[240px]">
                                    Silakan scan kode di atas untuk<br />mengecek perkembangan siswa
                                </p>

                                <div className="absolute bottom-4 w-full left-0 px-6 flex justify-between items-center opacity-20">
                                    <span className="text-[6px] font-black uppercase tracking-[0.25em]">TAHUN 2026/2027</span>
                                    <span className="text-[6px] font-black uppercase tracking-[0.25em]">MBS TANGGUL</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto pt-4 print:hidden">
                            <button className="btn btn-secondary flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 h-11 bg-[var(--color-surface-alt)] border-[var(--color-border)] order-2 sm:order-1 hover:bg-[var(--color-border)]">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin opacity-50" />
                                GENERATE PDF
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="btn btn-primary flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 h-11 order-1 sm:order-2"
                            >
                                <FontAwesomeIcon icon={faIdCardAlt} />
                                CETAK KARTU
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Modal Detail Profil Siswa */}
            <Modal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                title="Profil Lengkap Siswa"
                size="lg"
            >
                {selectedStudent && (
                    <div className="space-y-7 py-2">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="relative group shrink-0 mx-auto md:mx-0">
                                <div className="w-32 h-32 rounded-[2rem] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-[var(--color-primary)]/20 overflow-hidden ring-[6px] ring-[var(--color-surface)] transition-transform group-hover:scale-[1.05] relative">
                                    <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                                    {selectedStudent.photo_url ? (
                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                                    ) : (
                                        <span className="relative z-10">{selectedStudent.name.charAt(0)}</span>
                                    )}
                                </div>

                                <input
                                    type="file"
                                    id="profile-photo-input"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onloadend = async () => {
                                                const base64 = reader.result
                                                setSelectedStudent({ ...selectedStudent, photo_url: base64 })
                                                addToast('Foto berhasil diperbarui!', 'success')
                                            }
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                />
                            </div>

                            {/* Info */}
                            <div className="flex-1 w-full space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-2xl font-black font-heading text-[var(--color-text)] leading-tight">{selectedStudent.name}</h2>
                                        <p className="text-[11px] font-bold text-[var(--color-text-muted)] mt-1">
                                            {selectedStudent.className} • {selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Kode</p>
                                        <p className="font-mono font-black text-[var(--color-primary)]">{selectedStudent.code}</p>
                                    </div>
                                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Poin</p>
                                        <p className={`font-black ${selectedStudent.points >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`}>
                                            {selectedStudent.points}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">WhatsApp Wali</p>
                                    <p className="font-bold text-[var(--color-text)]">{selectedStudent.phone || '-'}</p>
                                </div>
                                {/* ✅ NEW: Info Wali */}
                                {(selectedStudent.guardian_name || selectedStudent.guardian_relation) && (
                                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40">
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Nama Wali</p>
                                        <p className="font-bold text-[var(--color-text)]">
                                            {selectedStudent.guardian_name || '-'}
                                            {selectedStudent.guardian_relation && <span className="text-[10px] ml-1.5 opacity-60">({selectedStudent.guardian_relation})</span>}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* History */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--color-text)] flex items-center gap-2">
                                    <FontAwesomeIcon icon={faHistory} />
                                    Riwayat Perilaku
                                </h3>
                                {loadingHistory && <FontAwesomeIcon icon={faSpinner} className="fa-spin text-[var(--color-text-muted)]" />}
                            </div>

                            <div className="max-h-64 overflow-auto border border-[var(--color-border)] rounded-[1.25rem]">
                                {behaviorHistory.length === 0 ? (
                                    <div className="p-4 text-xs text-[var(--color-text-muted)]">Belum ada riwayat.</div>
                                ) : (
                                    <div className="divide-y divide-[var(--color-border)]">
                                        {behaviorHistory.map((item) => (
                                            <div key={item.id} className="p-4 text-sm">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="font-bold">{item.title || item.type || 'Laporan'}</div>
                                                    <div className="text-[11px] text-[var(--color-text-muted)]">{new Date(item.created_at).toLocaleString()}</div>
                                                </div>
                                                {item.description && <div className="text-[12px] text-[var(--color-text-muted)] mt-1">{item.description}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* QR Modal */}
            <Modal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                title="QR Akses Siswa"
                size="sm"
            >
                {selectedStudent && (
                    <div className="space-y-5 text-center">
                        <div className="mx-auto inline-block p-3 bg-white rounded-xl border border-[var(--color-border)]">
                            <QRCodeCanvas
                                value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                size={180}
                                level="M"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3 p-3 glass bg-[var(--color-surface-alt)]/50 rounded-[1.25rem] border border-[var(--color-border)]">
                            <div className="text-center">
                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Kode</p>
                                <p className="font-mono text-sm font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 py-1 px-2 rounded-lg inline-block border border-[var(--color-primary)]/20">{selectedStudent.code}</p>
                            </div>
                            <div className="text-center border-l border-[var(--color-border)]">
                                <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">PIN</p>
                                <p className="font-mono text-sm font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 py-1 px-2 rounded-lg inline-block border border-[var(--color-primary)]/20">{selectedStudent.pin}</p>
                            </div>
                        </div>

                        {/* ✅ NEW: Fitur 5 - Reset PIN button */}
                        <button
                            onClick={() => handleResetPin(selectedStudent)}
                            disabled={resettingPin}
                            className="w-full h-10 rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-600 text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {resettingPin ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faRotateLeft} />}
                            Generate PIN Baru & Kirim via WA
                        </button>

                        <a
                            href={selectedStudent.phone
                                ? `https://wa.me/${selectedStudent.phone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Assalamualaikum, berikut data akses Laporanmu untuk ${selectedStudent.name}:\n\nKode: ${selectedStudent.code}\nPIN: ${selectedStudent.pin}\n\nLink: ${window.location.origin}/check?code=${selectedStudent.code}`)}`
                                : undefined}
                            target="_blank"
                            rel="noreferrer"
                            onClick={!selectedStudent.phone ? (e) => { e.preventDefault(); addToast('Nomor WA wali belum diisi', 'warning') } : undefined}
                            className="btn btn-primary w-full py-3 text-[10px] font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 rounded-[1rem] transition-all hover:scale-[1.02]"
                        >
                            <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                            Kirim Ke WhatsApp Wali
                        </a>
                    </div>
                )}
            </Modal>

            {/* Success Modal */}
            <Modal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                title="Registrasi Berhasil ✨"
                size="sm"
            >
                {newlyCreatedStudent && (
                    <div className="flex flex-col items-center text-center space-y-6 py-2">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 flex items-center justify-center text-[var(--color-success)] text-3xl animate-[bounce_2s_infinite]">
                            <FontAwesomeIcon icon={faCheckCircle} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-2xl font-black font-heading text-[var(--color-text)] leading-tight">Siswa Terdaftar</h3>
                            <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest">Berikan kode & PIN di bawah kepada wali murid</p>
                        </div>

                        <div className="w-full space-y-3 glass bg-[var(--color-primary)]/5 p-4 rounded-[1.5rem] border border-[var(--color-primary)]/10">
                            <div className="flex justify-between items-center bg-[var(--color-surface)] p-3 rounded-[1.25rem] border border-[var(--color-border)] shadow-sm group">
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Kode Registrasi</p>
                                    <p className="font-mono text-sm font-black text-[var(--color-primary)] tracking-wider uppercase">{newlyCreatedStudent.registration_code}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newlyCreatedStudent.registration_code)
                                        addToast('Kode disalin!', 'success')
                                    }}
                                    className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white flex items-center justify-center transition-all group-hover:scale-105 active:scale-95"
                                >
                                    <FontAwesomeIcon icon={faIdCardAlt} className="text-sm" />
                                </button>
                            </div>

                            <div className="flex justify-between items-center bg-[var(--color-surface)] p-3 rounded-[1.25rem] border border-[var(--color-border)] shadow-sm group">
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">PIN Akses</p>
                                    <p className="font-mono text-sm font-black text-[var(--color-primary)] tracking-[0.3em]">{newlyCreatedStudent.pin}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newlyCreatedStudent.pin)
                                        addToast('PIN disalin!', 'success')
                                    }}
                                    className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white flex items-center justify-center transition-all group-hover:scale-105 active:scale-95"
                                >
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-sm" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSuccessModalOpen(false)}
                            className="btn btn-primary w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] h-12 rounded-[1rem] shadow-lg shadow-[var(--color-primary)]/20 transition-all hover:scale-[1.02]"
                        >
                            Selesai & Tutup
                        </button>
                    </div>
                )}
            </Modal>

            {/* Bulk Promote Modal */}
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
            </Modal>

            {/* Delete (Arsip) Modal */}
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
            </Modal>
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

                            {/* ✅ NEW: Fitur 11 - Template WA customizable */}
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

            {/* Bulk Delete Modal */}
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
            {/* ✅ NEW: Modal Arsip Siswa */}
            <Modal
                isOpen={isArchivedModalOpen}
                onClose={() => setIsArchivedModalOpen(false)}
                title="Arsip Siswa"
                size="xl"
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
                                    {archivedStudents.map(s => (
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
                    )}

                    <div className="flex justify-end">
                        <button onClick={() => setIsArchivedModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ✅ NEW: Modal Riwayat Kelas */}
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

            {/* ✅ NEW: Fitur 1 - Class Breakdown Modal */}
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
                                <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">Siswa Risiko (≤ {RISK_THRESHOLD})</p>
                                <p className="text-lg font-black text-red-500">{classBreakdownData.riskCount} siswa</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-2">🏆 Top 3 Poin Tertinggi</p>
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

            {/* ✅ NEW: Fitur 2 - Batch Reset Poin Modal */}
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

            {/* ✅ NEW: Fitur 7 - Tag Modal */}
            <Modal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                title={`Kelola Label — ${studentForTags?.name || ''}`}
                size="sm"
            >
                {studentForTags && (
                    <div className="space-y-4">
                        <p className="text-xs text-[var(--color-text-muted)]">Pilih label/tag untuk siswa ini. Bisa dipilih lebih dari satu.</p>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(tag => {
                                const active = (studentForTags.tags || []).includes(tag)
                                return (
                                    <button key={tag} onClick={() => handleToggleTag(studentForTags, tag)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${active
                                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-600 dark:text-violet-400'
                                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                            }`}>
                                        {active ? '✓ ' : ''}{tag}
                                    </button>
                                )
                            })}
                        </div>
                        {(studentForTags.tags || []).length > 0 && (
                            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Label Aktif</p>
                                <div className="flex flex-wrap gap-1">
                                    {(studentForTags.tags || []).map(t => (
                                        <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-600 font-bold">{t}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end">
                            <button onClick={() => setIsTagModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-lg">Tutup</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ✅ NEW: Fitur 12 - Google Sheets Import Modal */}
            <Modal
                isOpen={isGSheetsModalOpen}
                onClose={() => setIsGSheetsModalOpen(false)}
                title="Import dari Google Sheets"
                size="sm"
            >
                <div className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                        Pastikan Google Sheets bersifat <b>publik</b> (Anyone with link can view).
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
                    <div className="flex gap-3">
                        <button onClick={() => setIsGSheetsModalOpen(false)} className="btn bg-[var(--color-surface-alt)] h-11 flex-1 text-[10px] font-black uppercase tracking-widest rounded-xl">Batal</button>
                        <button onClick={handleFetchGSheets} disabled={fetchingGSheets}
                            className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex-1 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                            {fetchingGSheets ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faLink} />}
                            Ambil Data
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ✅ NEW: Fitur 13 - Photo Zoom Overlay */}
            {photoZoom && (
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
            )}

        </DashboardLayout>
    )
}