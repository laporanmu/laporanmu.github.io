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
    faAnglesRight
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
    const [formData, setFormData] = useState({ name: '', gender: 'L', class_id: '', phone: '', photo_url: '' })
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
    const [bulkClassId, setBulkClassId] = useState('')
    const [globalStats, setGlobalStats] = useState({ total: 0, boys: 0, girls: 0, avgPoints: 0 })
    const [totalRows, setTotalRows] = useState(0)

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

            if (filterClass) q = q.eq('class_id', filterClass)
            if (filterGender) q = q.eq('gender', filterGender)
            if (debouncedSearch) {
                const s = debouncedSearch.replace(/%/g, '\\%').replace(/_/g, '\\_')
                q = q.or(`name.ilike.%${s}%,registration_code.ilike.%${s}%`)
            }

            const { data: studentsData, error: studentsError, count } = await q
            if (studentsError) throw studentsError

            // ✅ FIX: gunakan server count untuk totalRows yang akurat
            setTotalRows(count ?? 0)

            // ✅ FIX: ambil stats global dari semua data (bukan hanya halaman aktif)
            const { data: statsData } = await supabase
                .from('students')
                .select('gender, total_points')
            if (statsData) {
                const total = statsData.length
                const boys = statsData.filter(s => s.gender === 'L').length
                const girls = statsData.filter(s => s.gender === 'P').length
                const avgPoints = total > 0
                    ? Math.round(statsData.reduce((acc, s) => acc + (s.total_points || 0), 0) / total)
                    : 0
                setGlobalStats({ total, boys, girls, avgPoints })
            }

            const transformed = (studentsData || []).map(s => {
                const pts = s.total_points ?? 0
                // ✅ FIX: trend netral untuk poin 0
                const trend = pts > 0 ? 'up' : pts < 0 ? 'down' : 'neutral'
                return {
                    ...s,
                    className: s.classes?.name || '-',
                    code: s.registration_code,
                    points: pts,
                    trend,
                }
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
    }, [page, pageSize, filterClass, filterGender, sortBy, debouncedSearch])

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
        setFormData({ name: '', gender: 'L', class_id: '', phone: '', photo_url: '' })
        setIsModalOpen(true)
    }

    const handleEdit = (student) => {
        setSelectedStudent(student)
        setFormData({
            name: student.name,
            gender: student.gender || 'L',
            class_id: student.class_id || '',
            phone: student.phone || '',
            photo_url: student.photo_url || ''
        })
        setIsModalOpen(true)
    }

    const confirmDelete = (student) => {
        setStudentToDelete(student)
        setIsDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!studentToDelete) return
        try {
            const { error } = await supabase.from('students').delete().eq('id', studentToDelete.id)
            if (error) throw error

            addToast('Siswa berhasil dihapus', 'success')
            fetchData()
        } catch {
            addToast('Gagal menghapus siswa', 'error')
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
            photo_url: formData.photo_url
        }

        try {
            if (selectedStudent) {
                const { error } = await supabase
                    .from('students')
                    .update({
                        name: formData.name,
                        gender: formData.gender,
                        class_id: formData.class_id,
                        phone: formData.phone,
                        photo_url: formData.photo_url
                    })
                    .eq('id', selectedStudent.id)
                if (error) throw error
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

    // ✅ NEW: Bulk delete
    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase
                .from('students')
                .delete()
                .in('id', selectedStudentIds)
            if (error) throw error
            addToast(`${selectedStudentIds.length} siswa berhasil dihapus`, 'success')
            setIsBulkDeleteModalOpen(false)
            setSelectedStudentIds([])
            fetchData()
        } catch {
            addToast('Gagal menghapus siswa terpilih', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // =========================================
    // VIEW MODALS
    // =========================================
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

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={handleImportClick}
                        className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 shadow-sm rounded-xl transition-all"
                    >
                        <FontAwesomeIcon icon={faUpload} />
                        <span className="hidden sm:inline ml-2">Import</span>
                    </button>

                    <input
                        type="file"
                        ref={importFileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv,.xlsx"
                    />

                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 shadow-sm rounded-xl transition-all"
                    >
                        <FontAwesomeIcon icon={faDownload} />
                        <span className="hidden sm:inline ml-2">Export</span>
                    </button>

                    <button
                        onClick={handleAdd}
                        className="btn btn-primary h-11 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-xl transition-all hover:scale-[1.02]"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        <span className="ml-2">Tambah</span>
                    </button>
                </div>
            </div>

            {/* Premium Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-[var(--color-primary)] flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-[var(--color-primary)]/5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 dark:from-[var(--color-primary)]/20 dark:to-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-primary)] text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faUsers} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Total Siswa</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.total}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-blue-500 flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-blue-500/5">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faMars} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Putra</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.boys}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-pink-500 flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-pink-500/5">
                    <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faVenus} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Putri</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.girls}</h3>
                    </div>
                </div>

                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-emerald-500 flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-emerald-500/5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Rata-rata</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.avgPoints}</h3>
                    </div>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>

                <div className="flex flex-col md:flex-row gap-3 relative z-10">
                    <div className="flex-1 relative font-normal transition-all group-focus-within:text-[var(--color-primary)]">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm transition-colors">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, kode... (Esc untuk clear)"
                            className="input-field pl-11 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="select-field h-11 text-sm py-2 px-4 w-full md:w-auto min-w-[120px] rounded-xl border-[var(--color-border)] bg-transparent focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
                        >
                            <option value="">Semua Kelas</option>
                            {classesList.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                            className="select-field h-11 text-sm py-2 px-4 w-full md:w-auto rounded-xl border-[var(--color-border)] bg-transparent focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
                        >
                            <option value="">Semua Gender</option>
                            <option value="L">Putra (Laki-laki)</option>
                            <option value="P">Putri (Perempuan)</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select-field h-11 text-sm py-2 px-4 w-full md:w-auto rounded-xl border-[var(--color-border)] bg-transparent focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table / Loading */}

            {loading ? (
                <div className="glass rounded-[1.5rem] p-10 border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin mr-3" />
                    Memuat data...
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
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-14 ">
                                                <div className="flex flex-col items-center text-center gap-2">
                                                    <div className="text-sm font-extrabold text-[var(--color-text)] mt-6">
                                                        Data tidak ditemukan
                                                    </div>
                                                    <div className="text-xs font-bold text-[var(--color-text-muted)]">
                                                        Coba ganti filter / kata kunci pencarian.
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSearchQuery('')
                                                            setFilterClass('')
                                                            setFilterGender('')
                                                            setSortBy('name_asc')
                                                            setSelectedStudentIds([])
                                                        }}
                                                        className="mt-3 h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest
                       border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4"
                                                    >
                                                        Reset filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (students.map((student) => (
                                        <tr key={student.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={() => toggleSelectStudent(student.id)}
                                                />
                                            </td>

                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-black shadow-sm overflow-hidden relative shrink-0">
                                                        <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                                                        {student.photo_url ? (
                                                            <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                                                        ) : (
                                                            <span className="relative z-10">{(student.name || 'S').charAt(0)}</span>
                                                        )}
                                                    </div>

                                                    <div className="pt-0.5 min-w-0">
                                                        <button
                                                            onClick={() => handleViewProfile(student)}
                                                            className="font-bold text-sm leading-tight text-[var(--color-text)] hover:text-[var(--color-primary)] transition-colors block text-left mb-0.5 px-0.5 rounded-sm truncate"
                                                        >
                                                            {student.name}
                                                        </button>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-mono text-[var(--color-text-muted)] italic opacity-80 leading-none">
                                                                {student.code}
                                                            </span>
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
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest leading-none">
                                                    {student.className}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className={`text-sm font-black ${student.points >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`}>
                                                        {student.points}
                                                    </span>
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-inner ${student.trend === 'up' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20' : student.trend === 'down' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-400/10 text-gray-400 border border-gray-400/20'}`}>
                                                        <FontAwesomeIcon icon={student.trend === 'up' ? faArrowTrendUp : student.trend === 'down' ? faArrowTrendDown : faArrowTrendUp} className={`text-[9px] ${student.trend === 'neutral' ? 'opacity-0' : ''}`} />
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-6 py-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleViewPrint(student)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm border hover:border-[var(--color-primary)]/20 border-transparent"
                                                        title="Cetak Kartu"
                                                    >
                                                        <FontAwesomeIcon icon={faIdCardAlt} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewQR(student)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/10 transition-all text-sm border hover:border-indigo-500/20 border-transparent"
                                                        title="QR Akses"
                                                    >
                                                        <FontAwesomeIcon icon={faQrcode} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(student)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm border hover:border-[var(--color-primary)]/20 border-transparent"
                                                        title="Edit"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(student)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm border hover:border-red-500/20 border-transparent"
                                                        title="Hapus"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )))}
                                </tbody>
                            </table>
                        </div>

                        {/* Bulk action footer */}
                        {selectedStudentIds.length > 0 && (
                            <div className="p-4 border-t border-[var(--color-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-surface-alt)]/40">
                                <div className="text-xs font-bold text-[var(--color-text-muted)]">
                                    <span className="text-[var(--color-primary)] font-black">{selectedStudentIds.length}</span> siswa terpilih
                                    <span className="text-[var(--color-text-muted)]/60 ml-1">(halaman ini)</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsBulkDeleteModalOpen(true)}
                                        className="btn bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 h-11 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="mr-2" />
                                        Hapus Terpilih
                                    </button>
                                    <button
                                        onClick={() => setIsBulkModalOpen(true)}
                                        className="btn btn-primary h-11 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl"
                                    >
                                        <FontAwesomeIcon icon={faGraduationCap} className="mr-2" />
                                        Naik Kelas Massal
                                    </button>
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
                    <div className="text-xs text-[var(--color-text-muted)]">
                        Support file: <b>.csv</b> / <b>.xlsx</b>. Header fleksibel:
                        <b> name/nama</b>, <b> gender/jk</b>, <b> phone/no_hp</b>, <b> class_name/kelas</b>
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
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                        {/* Photo Upload UI */}
                        <div className="md:col-span-2 flex justify-center mb-2">
                            <div className="relative group">
                                <div className="w-20 h-20 rounded-[1.5rem] bg-[var(--color-surface-alt)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)]">
                                    {formData.photo_url ? (
                                        <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faCamera} className="text-lg opacity-50" />
                                    )}
                                </div>

                                <input
                                    type="file"
                                    ref={photoInputRef}
                                    onChange={(e) => {
                                        const file = e.target.files[0]
                                        if (file) {
                                            const reader = new FileReader()
                                            reader.onloadend = () => {
                                                setFormData({ ...formData, photo_url: reader.result })
                                            }
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                    className="hidden"
                                    accept="image/*"
                                />

                                <button
                                    type="button"
                                    onClick={() => photoInputRef.current?.click()}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
                                >
                                    <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 ml-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Akbar Atha Ramadhan"
                                className="input-field text-sm py-2.5 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-transparent"
                                autoFocus
                            />
                            {formData.name && formData.name.trim().length < 3 && (
                                <p className="text-[10px] text-red-500 mt-1 ml-1">Nama minimal 3 karakter</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 ml-1">Jenis Kelamin</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: 'L' })}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.gender === 'L'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 shadow-inner'
                                        : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                        }`}
                                >
                                    PUTRA
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: 'P' })}
                                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.gender === 'P'
                                        ? 'bg-pink-500/10 border-pink-500/30 text-pink-500 shadow-inner'
                                        : 'bg-transparent border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'
                                        }`}
                                >
                                    PUTRI
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 ml-1">Penempatan Kelas</label>
                            <select
                                value={formData.class_id}
                                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                className="select-field text-sm py-2.5 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-transparent appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center]"
                            >
                                <option value="">Pilih Kelas</option>
                                {classesList.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 ml-1">Nomor WhatsApp Wali</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                placeholder="08xxxxxxxxxx"
                                className="input-field text-sm py-2.5 rounded-xl border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-transparent"
                            />
                            {formData.phone && !isValidPhone(formData.phone) && (
                                <p className="text-[10px] text-red-500 mt-1 ml-1">Format HP tidak valid (08/+62, 10–13 digit)</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest h-11 px-6 rounded-xl transition-all">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary h-11 px-8 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-xl transition-all hover:scale-[1.02]">
                            {submitting ? (
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                            ) : (
                                selectedStudent ? 'SIMPAN PERUBAHAN' : 'DAFTARKAN SISWA'
                            )}
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

            {/* Delete Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Yakin Hapus Data?"
            >
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-[1.5rem] flex items-center gap-4 text-red-500 border border-red-500/20">
                        <div className="w-12 h-12 rounded-[1rem] bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-black uppercase tracking-wider leading-tight">Hapus Data?</h3>
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mt-1">Riwayat laporan & poin terhapus permanen.</p>
                        </div>
                    </div>

                    <div className="px-1">
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                            Anda yakin ingin menghapus <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{studentToDelete?.name}</span>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all">
                            BATAL
                        </button>
                        <button type="button" onClick={executeDelete} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-black text-[10px] h-11 uppercase tracking-widest rounded-[1rem] transition-all hover:scale-[1.02]">
                            HAPUS PERMANEN
                        </button>
                    </div>
                </div>
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
        </DashboardLayout>
    )
}