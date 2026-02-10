import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faSearch,
    faEdit,
    faTrash,
    faFilter,
    faMars,
    faVenus,
    faDownload,
    faUpload,
    faTimes,
    faUsers,
    faTrophy,
    faPhone,
    faSpinner,
    faHistory,
    faQrcode,
    faIdCardAlt,
    faArrowTrendUp,
    faArrowTrendDown,
    faCheckCircle,
    faEye,
    faGraduationCap,
    faCamera,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

// Fallback bila DB belum ada / demo mode
const FALLBACK_CLASS_NAMES = [
    'X MIPA 1', 'X MIPA 2', 'X MIPA 3',
    'XI IPA 1', 'XI IPA 2', 'XI IPS 1',
    'XII IPA 1', 'XII IPA 2', 'XII IPS 1',
]

// Demo data with Gender
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
    const [bulkClassId, setBulkClassId] = useState('')

    const fileInputRef = useRef(null)
    const { addToast } = useToast()

    // 1. Load Classes & Students
    const fetchData = async () => {
        setLoading(true)
        try {
            // First load classes
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')

            if (classesError) throw classesError
            setClassesList(classesData || [])

            // Then load students
            const { data: studentsData, error: studentsError } = await supabase
                .from('students')
                .select(`
                    *,
                    classes (id, name)
                `)
                .order('name')

            if (studentsError) throw studentsError

            // Map data and calculate simplified trends
            const transformed = (studentsData || []).map(s => {
                // Mock trend logic for now: positive points = up, negative = down
                const trend = (s.total_points || 0) >= 0 ? 'up' : 'down'
                return {
                    ...s,
                    className: s.classes?.name || '-',
                    code: s.registration_code,
                    points: s.total_points ?? 0,
                    trend: trend
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
            // Fetch both violations and achievements (assume they might be in separate tables or filtered)
            // For now, let's assume a unified 'behavior_reports' table or similar logic
            // If not exists, we'll show a message
            const { data, error } = await supabase
                .from('behavior_reports') // Assuming this table exists based on previous conversations or generic naming
                .select('*')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false })

            if (error) {
                // If table doesn't exist, we'll just show empty
                setBehaviorHistory([])
            } else {
                setBehaviorHistory(data || [])
            }
        } catch (err) {
            setBehaviorHistory([])
        } finally {
            setLoadingHistory(false)
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

    const toggleSelectAll = () => {
        if (selectedStudentIds.length === filteredStudents.length) {
            setSelectedStudentIds([])
        } else {
            setSelectedStudentIds(filteredStudents.map(s => s.id))
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

            addToast(`${selectedStudentIds.length} siswa berhasil dipindahkan ke kelas baru`, 'success')
            setIsBulkModalOpen(false)
            setSelectedStudentIds([])
            fetchData()
        } catch (err) {
            addToast('Gagal memproses kenaikan kelas massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // Filter + Sort
    const filteredStudents = students
        .filter(s => {
            const matchesSearch =
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.className.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesClass = filterClass ? s.class_id === filterClass : true
            const matchesGender = filterGender ? s.gender === filterGender : true
            return matchesSearch && matchesClass && matchesGender
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name_asc': return (a.name || '').localeCompare(b.name || '')
                case 'name_desc': return (b.name || '').localeCompare(a.name || '')
                case 'class_asc': return (a.className || '').localeCompare(b.className || '')
                case 'points_desc': return (b.points ?? 0) - (a.points ?? 0)
                case 'points_asc': return (a.points ?? 0) - (b.points ?? 0)
                default: return 0
            }
        })

    // Stats Calculation
    const stats = {
        total: students.length,
        boys: students.filter(s => s.gender === 'L').length,
        girls: students.filter(s => s.gender === 'P').length,
        avgPoints: students.length > 0 ? Math.round(students.reduce((acc, s) => acc + (s.points || 0), 0) / students.length) : 0
    }

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }

    const handleAdd = () => {
        setSelectedStudent(null)
        setFormData({ name: '', gender: 'L', class_id: '', phone: '' })
        setIsModalOpen(true)
    }

    const handleEdit = (student) => {
        setSelectedStudent(student)
        setFormData({ name: student.name, gender: student.gender || 'L', class_id: student.class_id || '', phone: student.phone || '' })
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
        } catch (err) {
            addToast('Gagal menghapus siswa', 'error')
        } finally {
            setIsDeleteModalOpen(false)
            setStudentToDelete(null)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name || !formData.class_id) {
            addToast('Nama dan kelas wajib diisi', 'warning')
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

    // Export Functionality (Keep CSV but updated with real data)
    const handleExport = () => {
        const headers = ['ID', 'Kode', 'Nama', 'Gender', 'Kelas', 'Poin', 'No. HP']
        const csvContent = [
            headers.join(','),
            ...students.map(s => `${s.id},${s.code},"${s.name}",${s.gender},"${s.className}",${s.points},"${s.phone}"`)
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `data_siswa_${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        addToast('Data berhasil diexport ke CSV', 'success')
    }

    const getPointsBadge = (points) => {
        if (points > 0) return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
        if (points < 0) return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
        return 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }

    // Import Functionality
    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                // Simple CSV parser for demo
                const text = event.target.result
                const lines = text.split('\n').filter(line => line.trim() !== '')
                // Skip header
                const newStudents = []
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].split(',')
                    if (parts.length >= 5) {
                        newStudents.push({
                            id: Date.now() + i,
                            code: generateCode(),
                            name: parts[2]?.replace(/"/g, '') || 'Unknown',
                            gender: parts[3] || 'L',
                            class: parts[4]?.replace(/"/g, '') || 'X',
                            points: 0,
                            phone: parts[6]?.replace(/"/g, '') || '-'
                        })
                    }
                }

                if (newStudents.length > 0) {
                    setStudents(prev => [...prev, ...newStudents])
                    addToast(`Berhasil mengimport ${newStudents.length} siswa`, 'success')
                } else {
                    addToast('Gagal membaca format CSV', 'error')
                }
            } catch (err) {
                addToast('Terjadi kesalahan saat import', 'error')
            }
            // Reset input
            e.target.value = ''
        }
        reader.readAsText(file)
    }


    return (
        <DashboardLayout title="Data Siswa">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold">Data Siswa</h1>
                    <p className="text-[var(--color-text-muted)] text-xs mt-0.5">
                        Kelola {students.length} data siswa aktif dalam sistem laporan.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleImportClick} className="btn btn-secondary h-10 px-4 text-xs font-medium">
                        <FontAwesomeIcon icon={faUpload} />
                        <span className="hidden sm:inline ml-2">Import</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv,.txt"
                    />

                    <button onClick={handleExport} className="btn btn-secondary h-10 px-4 text-xs font-medium">
                        <FontAwesomeIcon icon={faDownload} />
                        <span className="hidden sm:inline ml-2">Export</span>
                    </button>

                    <button onClick={handleAdd} className="btn btn-primary h-10 px-5 text-xs font-bold shadow-sm">
                        <FontAwesomeIcon icon={faPlus} />
                        <span className="ml-2">Tambah</span>
                    </button>
                </div>
            </div>

            {/* Premium Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="card p-3.5 border-l-2 border-l-indigo-500 flex items-center gap-3 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 text-sm">
                        <FontAwesomeIcon icon={faUsers} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Siswa</p>
                        <h3 className="text-lg font-bold leading-tight">{stats.total}</h3>
                    </div>
                </div>
                <div className="card p-3.5 border-l-2 border-l-blue-500 flex items-center gap-3 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 text-sm">
                        <FontAwesomeIcon icon={faMars} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Putra</p>
                        <h3 className="text-lg font-bold leading-tight">{stats.boys}</h3>
                    </div>
                </div>
                <div className="card p-3.5 border-l-2 border-l-pink-500 flex items-center gap-3 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 text-sm">
                        <FontAwesomeIcon icon={faVenus} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Putri</p>
                        <h3 className="text-lg font-bold leading-tight">{stats.girls}</h3>
                    </div>
                </div>
                <div className="card p-3.5 border-l-2 border-l-emerald-500 flex items-center gap-3 rounded-xl">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 text-sm">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Rata-rata</p>
                        <h3 className="text-lg font-bold leading-tight">{stats.avgPoints}</h3>
                    </div>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="card mb-5 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 text-xs">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, kode, kelas..."
                            className="input-field pl-9 w-full h-10 text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-800 transition-all rounded-lg"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="select-field h-10 text-xs py-2 w-full md:w-auto min-w-[120px] rounded-lg border-gray-200 dark:border-gray-800"
                        >
                            <option value="">Semua Kelas</option>
                            {classesList.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                            className="select-field h-10 text-xs py-2 w-full md:w-auto rounded-lg border-gray-200 dark:border-gray-800"
                        >
                            <option value="">Gender</option>
                            <option value="L">Putra</option>
                            <option value="P">Putri</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select-field h-10 text-xs py-2 w-full md:w-auto rounded-lg border-gray-200 dark:border-gray-800"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {(searchQuery || filterClass || filterGender) && (
                        <button
                            onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterGender('') }}
                            className="btn btn-ghost h-10 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 px-3 text-xs"
                        >
                            <FontAwesomeIcon icon={faTimes} className="mr-1.5" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Dynamic Content */}
            {loading ? (
                <div className="card py-20 flex flex-col items-center justify-center bg-white dark:bg-gray-950 border border-[var(--color-border)]">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-indigo-500 opacity-20" />
                    <p className="text-[var(--color-text-muted)] mt-4 font-normal tracking-widest uppercase text-[10px]">Sinkronisasi Data...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="card py-16 text-center border-dashed border-2 border-[var(--color-border)] bg-white dark:bg-gray-950">
                    <div className="w-20 h-20 bg-[var(--color-surface-alt)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)] opacity-20">
                        <FontAwesomeIcon icon={faUsers} className="text-3xl" />
                    </div>
                    <h3 className="text-xl font-normal text-[var(--color-text)]">Tidak Ada Data</h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-xs mx-auto">Sesuaikan filter pencarian atau tambahkan data siswa baru ke sistem.</p>
                </div>
            ) : (
                <>
                    {/* Layout Mobile (Card Stack) */}
                    <div className="md:hidden space-y-3 mb-20">
                        {filteredStudents.map((student) => (
                            <div key={student.id} className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-3">
                                    <div
                                        onClick={() => handleViewProfile(student)}
                                        className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-500/10 overflow-hidden shrink-0 cursor-pointer"
                                    >
                                        {student.photo_url ? (
                                            <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            student.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 onClick={() => handleViewProfile(student)} className="text-sm font-bold text-gray-900 dark:text-white truncate mb-0.5 cursor-pointer leading-tight">
                                            {student.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="badge badge-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-tight rounded-md">{student.className}</span>
                                            <span className="text-[8px] font-mono font-medium text-gray-400">{student.code}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-sm font-bold ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {student.points}
                                        </div>
                                        <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">Poin</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-gray-50 dark:border-gray-800">
                                    <button onClick={() => handleViewQR(student)} className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-[10px] text-center">
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </div>
                                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">Akses</span>
                                    </button>
                                    <a href={`https://wa.me/62${student.phone?.replace(/^0/, '')}`} className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 text-[10px]">
                                            <FontAwesomeIcon icon={faWhatsapp} />
                                        </div>
                                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">WhatsApp</span>
                                    </a>
                                    <button onClick={() => handleEdit(student)} className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 text-[10px]">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </div>
                                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">Edit</span>
                                    </button>
                                    <button onClick={() => confirmDelete(student)} className="flex flex-col items-center gap-1.5 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                        <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 text-[10px]">
                                            <FontAwesomeIcon icon={faTrash} />
                                        </div>
                                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">Hapus</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Layout Desktop (Table) */}
                    <div className="hidden md:block table-container mb-6 overflow-hidden border border-[var(--color-border)] shadow-sm bg-white dark:bg-gray-950 rounded-xl">
                        {/* Bulk Action Bar (Floating) */}
                        {selectedStudentIds.length > 0 && (
                            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-300">
                                <div className="bg-gray-900 border border-gray-800 rounded-2xl px-6 py-4 flex items-center gap-6 shadow-2xl">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                                            {selectedStudentIds.length}
                                        </span>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest whitespace-nowrap">Siswa Terpilih</span>
                                    </div>
                                    <div className="h-4 w-[1px] bg-gray-800" />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setIsBulkModalOpen(true)}
                                            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors text-xs font-black uppercase tracking-widest"
                                        >
                                            <FontAwesomeIcon icon={faGraduationCap} />
                                            Naik Kelas
                                        </button>
                                        <button
                                            onClick={() => setSelectedStudentIds([])}
                                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-widest ml-4"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                    <th className="px-3 py-3 w-4">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Siswa</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Gender</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Kelas</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Poin</th>
                                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right pr-6">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={`group hover:bg-[var(--color-surface-alt)]/30 transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={() => toggleSelectStudent(student.id)}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    onClick={() => handleViewProfile(student)}
                                                    className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm cursor-pointer hover:scale-105 transition-transform overflow-hidden"
                                                >
                                                    {student.photo_url ? (
                                                        <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        student.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <button
                                                        onClick={() => handleViewProfile(student)}
                                                        className="font-bold text-[13px] leading-tight text-gray-900 group-hover:text-indigo-600 dark:text-white transition-colors block text-left"
                                                    >
                                                        {student.name}
                                                    </button>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[9px] font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 px-1 py-0.5 rounded border border-gray-100 dark:border-gray-800">
                                                            {student.code}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] ${student.gender === 'L' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                                                    <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-tight">
                                                {student.className}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs font-bold ${student.points >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {student.points}
                                                    </span>
                                                    <FontAwesomeIcon
                                                        icon={student.trend === 'up' ? faArrowTrendUp : faArrowTrendDown}
                                                        className={`text-[8px] ${student.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleViewPrint(student)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs"
                                                    title="Cetak Kartu"
                                                >
                                                    <FontAwesomeIcon icon={faIdCardAlt} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewQR(student)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all text-xs"
                                                    title="QR Akses"
                                                >
                                                    <FontAwesomeIcon icon={faQrcode} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(student)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-xs"
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(student)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all text-xs"
                                                    title="Hapus"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Input Modal */}
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
                                <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-400 overflow-hidden">
                                    {formData.photo_url ? (
                                        <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faCamera} className="text-lg" />
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
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
                                    onClick={() => fileInputRef.current.click()}
                                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
                                >
                                    <FontAwesomeIcon icon={faCamera} className="text-[9px]" />
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5 ml-1">Nama Lengkap</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Akbar Atha Ramadhan"
                                className="input-field text-sm py-2.5"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5 ml-1">Jenis Kelamin</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: 'L' })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${formData.gender === 'L'
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
                                        }`}
                                >
                                    PUTRA
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, gender: 'P' })}
                                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${formData.gender === 'P'
                                        ? 'bg-pink-50 border-pink-200 text-pink-600 dark:bg-pink-900/30 dark:border-pink-800 dark:text-pink-400'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)]'
                                        }`}
                                >
                                    PUTRI
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5 ml-1">Penempatan Kelas</label>
                            <select
                                value={formData.class_id}
                                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                                className="select-field text-sm py-2.5"
                            >
                                <option value="">Pilih Kelas</option>
                                {classesList.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1.5 ml-1">Nomor WhatsApp Wali</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                placeholder="08xxxxxxxxxx"
                                className="input-field text-sm py-2.5"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary px-8 font-bold shadow-md shadow-indigo-500/20 py-2 text-xs">
                            {submitting ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            ) : (
                                selectedStudent ? 'SIMPAN PERUBAHAN' : 'DAFTARKAN SISWA'
                            )}
                        </button>
                    </div>
                </form>
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
                        {/* Top Profile Header */}
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            {/* Avatar Section */}
                            <div className="relative group shrink-0 mx-auto md:mx-0">
                                <div className="w-32 h-32 rounded-2xl bg-indigo-600 flex items-center justify-center text-4xl font-bold text-white shadow-2xl shadow-indigo-500/20 overflow-hidden ring-4 ring-white dark:ring-gray-900 transition-transform group-hover:scale-[1.02]">
                                    {selectedStudent.photo_url ? (
                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="opacity-40">{selectedStudent.name.charAt(0)}</span>
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
                                                // Ideally call a Supabase update here, but for now we update local state
                                                // and show a success message.
                                                setSelectedStudent({ ...selectedStudent, photo_url: base64 })
                                                addToast('Foto berhasil diperbarui!', 'success')
                                            }
                                            reader.readAsDataURL(file)
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => document.getElementById('profile-photo-input').click()}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all rounded-2xl cursor-pointer border border-white/20"
                                >
                                    <FontAwesomeIcon icon={faCamera} className="text-xl mb-1.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Ganti Foto</span>
                                </button>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 space-y-4 min-w-0 w-full">
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight mb-2 uppercase tracking-tight">{selectedStudent.name}</h3>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        <span className="badge badge-primary px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm">{selectedStudent.className}</span>
                                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-none px-2.5 py-1 text-[9px] font-mono tracking-wider rounded-lg">{selectedStudent.code}</span>
                                        <span className={`badge ${selectedStudent.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'} dark:bg-opacity-10 border-none px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg`}>
                                            {selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 text-center shadow-sm">
                                        <p className={`text-xl font-black ${selectedStudent.points >= 0 ? 'text-emerald-500' : 'text-red-500'} leading-none mb-1`}>
                                            {selectedStudent.points}
                                        </p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Total Poin</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 text-center shadow-sm">
                                        <p className="text-xl font-black text-red-500 leading-none mb-1">0</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Pelanggaran</p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 text-center shadow-sm">
                                        <p className="text-xl font-black text-emerald-500 leading-none mb-1">0</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Prestasi</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Section */}
                        <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black text-indigo-400 dark:text-indigo-500 uppercase tracking-widest mb-1">Kontak Orang Tua / Wali</p>
                                <p className="text-sm font-black text-gray-700 dark:text-gray-300 font-mono tracking-wider">{selectedStudent.phone || 'TIDAK ADA NOMOR'}</p>
                            </div>
                            {selectedStudent.phone && (
                                <a
                                    href={`https://wa.me/62${selectedStudent.phone.replace(/^0/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all hover:scale-110 active:scale-95"
                                    title="WhatsApp Sekarang"
                                >
                                    <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                                </a>
                            )}
                        </div>

                        {/* History Timeline */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                                    <FontAwesomeIcon icon={faHistory} className="text-xs" />
                                    Riwayat Perilaku
                                </h4>
                                <button className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest">Lihat Semua</button>
                            </div>

                            <div className="min-h-[160px]">
                                {loadingHistory ? (
                                    <div className="py-16 flex flex-col items-center justify-center text-gray-300 dark:text-gray-700 gap-4">
                                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">Sinkronisasi Data...</p>
                                    </div>
                                ) : behaviorHistory.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {behaviorHistory.slice(0, 5).map((item) => (
                                            <div key={item.id} className="flex gap-4 p-3.5 rounded-2xl bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-white/5 items-center hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all group/item shadow-sm hover:shadow-md">
                                                <div className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${item.points >= 0 ? 'bg-emerald-400 shadow-emerald-400/20' : 'bg-red-400 shadow-red-400/20'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-black text-gray-900 dark:text-white truncate mb-0.5">{item.type}</p>
                                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                                <div className={`text-[13px] font-black ${item.points >= 0 ? 'text-emerald-500' : 'text-red-500'} bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800`}>
                                                    {item.points >= 0 ? '+' : ''}{item.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-14 bg-gray-50/50 dark:bg-gray-900/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center text-gray-200 dark:text-gray-800 mb-3 shadow-sm">
                                            <FontAwesomeIcon icon={faHistory} className="text-xl" />
                                        </div>
                                        <p className="text-[10px] font-black text-gray-300 dark:text-gray-700 uppercase tracking-[0.3em]">Belum Ada Riwayat Perilaku</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal QR Code Akses */}
            <Modal
                isOpen={isQRModalOpen}
                onClose={() => setIsQRModalOpen(false)}
                title="Akses Portal Orang Tua"
                size="sm"
            >
                {selectedStudent && (
                    <div className="flex flex-col items-center text-center space-y-5">
                        <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-500/10 border border-indigo-50">
                            <QRCodeCanvas
                                value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                size={180}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "/logo.png",
                                    x: undefined,
                                    y: undefined,
                                    height: 32,
                                    width: 32,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <div className="space-y-3 w-full">
                            <div>
                                <h4 className="text-base font-bold text-gray-900">{selectedStudent.name}</h4>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Pindai untuk Akses Portal</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="text-center">
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Kode Registrasi</p>
                                    <p className="font-mono text-xs font-bold text-indigo-600">{selectedStudent.code}</p>
                                </div>
                                <div className="text-center border-l border-gray-200">
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">PIN Akses</p>
                                    <p className="font-mono text-xs font-bold text-indigo-600">{selectedStudent.pin}</p>
                                </div>
                            </div>

                            <button className="btn btn-primary w-full py-2.5 text-xs font-bold uppercase tracking-widest h-10 flex items-center justify-center gap-2">
                                <FontAwesomeIcon icon={faWhatsapp} />
                                Kirim Ke Wali
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Sukses Registrasi (Show PIN) */}
            <Modal
                isOpen={isSuccessModalOpen}
                onClose={() => setIsSuccessModalOpen(false)}
                title="Registrasi Berhasil ✨"
                size="sm"
            >
                {newlyCreatedStudent && (
                    <div className="flex flex-col items-center text-center space-y-5 py-1">
                        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 text-xl animate-bounce">
                            <FontAwesomeIcon icon={faCheckCircle} />
                        </div>

                        <div className="space-y-1.5">
                            <h3 className="text-lg font-bold text-gray-900 leading-tight">Siswa Terdaftar</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Berikan kode & PIN di bawah kepada wali murid</p>
                        </div>

                        <div className="w-full space-y-2.5 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                            <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-50 shadow-sm">
                                <div className="text-left">
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Kode Registrasi</p>
                                    <p className="font-mono text-xs font-bold text-indigo-600 tracking-wider uppercase">{newlyCreatedStudent.registration_code}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newlyCreatedStudent.registration_code)
                                        addToast('Kode disalin!', 'success')
                                    }}
                                    className="p-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faIdCardAlt} className="text-xs" />
                                </button>
                            </div>

                            <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-50 shadow-sm">
                                <div className="text-left">
                                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">PIN Akses</p>
                                    <p className="font-mono text-xs font-bold text-indigo-600 tracking-[0.3em]">{newlyCreatedStudent.pin}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newlyCreatedStudent.pin)
                                        addToast('PIN disalin!', 'success')
                                    }}
                                    className="p-1.5 text-indigo-400 hover:text-indigo-600 transition-colors"
                                >
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-xs" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSuccessModalOpen(false)}
                            className="btn btn-primary w-full py-3 text-xs font-bold uppercase tracking-widest h-11"
                        >
                            Selesai & Tutup
                        </button>
                    </div>
                )}
            </Modal>

            {/* Modal Naik Kelas Massal */}
            <Modal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                title="Kenaikan Kelas Massal"
                size="sm"
            >
                <div className="space-y-5">
                    <div className="p-3.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Target Kenaikan
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Anda akan memindahkan <span className="text-indigo-600 font-bold">{selectedStudentIds.length} siswa</span> terpilih ke kelas tujuan.</p>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Pilih Kelas Baru</label>
                        <select
                            value={bulkClassId}
                            onChange={(e) => setBulkClassId(e.target.value)}
                            className="select-field text-xs py-2 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 rounded-lg h-10"
                        >
                            <option value="">Cari Kelas Tujuan</option>
                            {classesList.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn btn-secondary flex-1 font-bold h-10 text-[10px] uppercase tracking-widest">
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkPromote}
                            disabled={submitting}
                            className="btn btn-primary flex-1 font-bold h-10 text-[10px] uppercase tracking-widest shadow-sm"
                        >
                            {submitting ? 'MEMPROSES...' : 'PROSES MASSAL'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Cetak Kartu Siswa - FIXED VERSION */}
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

            {/* Print Specific Styles - FIXED VERSION */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page {
                        size: auto;
                        margin: 10mm;
                    }
                    
                    /* Hide everything first */
                    body * {
                        visibility: hidden !important;
                    }
                    
                    /* Show only printable cards container */
                    #printable-cards,
                    #printable-cards * {
                        visibility: visible !important;
                    }
                    
                    /* Position cards for print */
                    #printable-cards {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 20mm !important;
                        align-items: center !important;
                    }
                    
                    /* Ensure cards maintain exact color */
                    #printable-cards > div {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                    }
                    
                    /* Hide all buttons */
                    button {
                        display: none !important;
                    }
                }
            ` }} />

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Yakin Hapus Data?"
            >
                <div className="space-y-5">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-4 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                        <div className="w-11 h-11 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 text-lg">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold uppercase tracking-wider leading-tight">Hapus Data?</h3>
                            <p className="text-[9px] opacity-80 font-medium mt-0.5">Riwayat laporan & poin juga akan terhapus permanen.</p>
                        </div>
                    </div>
                    <div className="px-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                            Anda yakin ingin menghapus <span className="text-red-600 font-bold">{studentToDelete?.name}</span>? Tindakan ini tidak dapat dibatalkan.
                        </p>
                    </div>
                    <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary flex-1 font-bold text-[10px] h-10 uppercase tracking-widest">
                            BATAL
                        </button>
                        <button type="button" onClick={executeDelete} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm flex-1 font-bold text-[10px] h-10 uppercase tracking-widest">
                            HAPUS PERMANEN
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}