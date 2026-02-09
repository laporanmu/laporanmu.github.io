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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold">Data Siswa</h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        Kelola {students.length} data siswa aktif dalam sistem laporan.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleImportClick} className="btn btn-secondary shadow-sm">
                        <FontAwesomeIcon icon={faUpload} />
                        <span className="hidden sm:inline ml-2 font-normal">Import</span>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv,.txt"
                    />

                    <button onClick={handleExport} className="btn btn-secondary shadow-sm">
                        <FontAwesomeIcon icon={faDownload} />
                        <span className="hidden sm:inline ml-2 font-normal">Export</span>
                    </button>

                    <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-indigo-500/20 px-6">
                        <FontAwesomeIcon icon={faPlus} />
                        <span className="ml-2 font-normal">Tambah</span>
                    </button>
                </div>
            </div>

            {/* Premium Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="card p-4 border-l-4 border-l-indigo-500 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <FontAwesomeIcon icon={faUsers} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Siswa</p>
                        <h3 className="text-xl font-bold">{stats.total}</h3>
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-l-blue-500 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <FontAwesomeIcon icon={faMars} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Putra</p>
                        <h3 className="text-xl font-bold">{stats.boys}</h3>
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-l-pink-500 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600">
                        <FontAwesomeIcon icon={faVenus} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Putri</p>
                        <h3 className="text-xl font-bold">{stats.girls}</h3>
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-l-emerald-500 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rata-rata Poin</p>
                        <h3 className="text-xl font-bold">{stats.avgPoints}</h3>
                    </div>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="card mb-6 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, kode, kelas..."
                            className="input-field pl-10 w-full"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filterClass}
                            onChange={(e) => setFilterClass(e.target.value)}
                            className="select-field w-full md:w-auto min-w-[140px]"
                        >
                            <option value="">Semua Kelas</option>
                            {classesList.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>

                        <select
                            value={filterGender}
                            onChange={(e) => setFilterGender(e.target.value)}
                            className="select-field w-full md:w-auto"
                        >
                            <option value="">Semua Gender</option>
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                        </select>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select-field w-full md:w-auto"
                        >
                            {SORT_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {(searchQuery || filterClass || filterGender) && (
                        <button
                            onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterGender('') }}
                            className="btn btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 px-4"
                        >
                            <FontAwesomeIcon icon={faTimes} className="mr-2" />
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
                    <div className="md:hidden space-y-4 mb-20">
                        {filteredStudents.map((student) => (
                            <div key={student.id} className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <div
                                        onClick={() => handleViewProfile(student)}
                                        className="w-16 h-16 rounded-3xl bg-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-xl shadow-indigo-500/10 overflow-hidden shrink-0 cursor-pointer"
                                    >
                                        {student.photo_url ? (
                                            <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            student.name.charAt(0)
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 onClick={() => handleViewProfile(student)} className="text-base font-black text-gray-900 dark:text-white truncate mb-1 cursor-pointer">
                                            {student.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="badge badge-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-tight">{student.className}</span>
                                            <span className="text-[9px] font-mono font-bold text-gray-400">{student.code}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-base font-black ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {student.points}
                                        </div>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Poin</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-50 dark:border-gray-800">
                                    <button onClick={() => handleViewQR(student)} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xs text-center border-l border-gray-200">
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </div>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Akses</span>
                                    </button>
                                    <a href={`https://wa.me/62${student.phone?.replace(/^0/, '')}`} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-500 text-xs">
                                            <FontAwesomeIcon icon={faWhatsapp} />
                                        </div>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">WA</span>
                                    </a>
                                    <button onClick={() => handleEdit(student)} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 text-xs">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </div>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Edit</span>
                                    </button>
                                    <button onClick={() => confirmDelete(student)} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                                        <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 text-xs">
                                            <FontAwesomeIcon icon={faTrash} />
                                        </div>
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Hapus</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Layout Desktop (Table) */}
                    <div className="hidden md:block table-container mb-6 overflow-hidden border border-[var(--color-border)] shadow-sm bg-white dark:bg-gray-950">
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
                                    <th className="px-4 py-4 w-4">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Informasi Siswa</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center">Gender</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center text-center">Kelas</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center text-center text-center">Poin Perilaku</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-right px-8">Kelola</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={`group hover:bg-[var(--color-surface-alt)]/30 transition-colors ${selectedStudentIds.includes(student.id) ? 'bg-indigo-50/50' : ''}`}>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={() => toggleSelectStudent(student.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    onClick={() => handleViewProfile(student)}
                                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm cursor-pointer hover:scale-105 transition-transform overflow-hidden"
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
                                                        className="font-bold text-[14px] leading-tight text-gray-900 group-hover:text-indigo-600 dark:text-white transition-colors block text-left"
                                                    >
                                                        {student.name}
                                                    </button>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                                                            {student.code}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                                                            <FontAwesomeIcon icon={faWhatsapp} className="text-[9px]" />
                                                            <span>Terkoneksi</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${student.gender === 'L' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                                                    <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center text-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 uppercase tracking-tighter">
                                                {student.className}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-center text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[13px] font-black ${student.points >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {student.points} Poin
                                                    </span>
                                                    <FontAwesomeIcon
                                                        icon={student.trend === 'up' ? faArrowTrendUp : faArrowTrendDown}
                                                        className={`text-[10px] ${student.trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right pr-8">
                                            <div className="flex items-center justify-end gap-1.5 transition-opacity">
                                                <button
                                                    onClick={() => handleViewPrint(student)}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 bg-gray-50/50 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all active:scale-95"
                                                    title="Cetak Kartu Siswa"
                                                >
                                                    <FontAwesomeIcon icon={faIdCardAlt} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewQR(student)}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 bg-gray-50/50 dark:bg-gray-800 dark:text-gray-400 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all active:scale-95"
                                                    title="Kode Akses QR"
                                                >
                                                    <FontAwesomeIcon icon={faQrcode} />
                                                </button>
                                                <a
                                                    href={`https://wa.me/62${student.phone?.replace(/^0/, '')}?text=Assalamualaikum, kami dari sekolah ingin menginformasikan perkembangan perilaku ${student.name}...`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all active:scale-95"
                                                    title="Hubungi Wali"
                                                >
                                                    <FontAwesomeIcon icon={faWhatsapp} />
                                                </a>
                                                <button
                                                    onClick={() => handleEdit(student)}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95"
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(student)}
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-red-600 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95"
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
                        <div className="md:col-span-2 flex justify-center mb-4">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 border-2 border-dashed border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-400 overflow-hidden">
                                    {formData.photo_url ? (
                                        <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faCamera} className="text-xl" />
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
                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10"
                                >
                                    <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
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
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="w-full md:w-32 flex flex-col items-center gap-3">
                                <div className="w-32 h-32 rounded-3xl bg-indigo-600 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-indigo-500/20 overflow-hidden">
                                    {selectedStudent.photo_url ? (
                                        <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        selectedStudent.name.charAt(0)
                                    )}
                                </div>
                                <button className="btn btn-secondary py-1.5 px-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <FontAwesomeIcon icon={faCamera} className="text-[9px]" />
                                    Ganti Foto
                                </button>
                            </div>

                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-2xl font-black text-gray-900 leading-none mb-2">{selectedStudent.name}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="badge badge-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{selectedStudent.className}</span>
                                        <span className="badge bg-gray-100 text-gray-500 border-none px-2 py-0.5 text-[10px] font-mono">{selectedStudent.code}</span>
                                        <span className={`badge ${selectedStudent.gender === 'L' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'} border-none px-2 py-0.5 text-[10px] font-bold uppercase`}>
                                            {selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4 border-y border-gray-100 py-4">
                                    <div className="text-center">
                                        <p className={`text-xl font-black ${selectedStudent.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {selectedStudent.points}
                                        </p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total Poin</p>
                                    </div>
                                    <div className="text-center border-x border-gray-100 px-4">
                                        <p className="text-xl font-black text-red-500">0</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Pelanggaran</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xl font-black text-emerald-500">0</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Prestasi</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Kontak Orang Tua</label>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm font-bold text-gray-700">{selectedStudent.phone || 'Tidak ada nomor'}</div>
                                        {selectedStudent.phone && (
                                            <a
                                                href={`https://wa.me/62${selectedStudent.phone.replace(/^0/, '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-white text-[10px] hover:bg-emerald-600 shadow-sm transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faWhatsapp} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
                                    <FontAwesomeIcon icon={faHistory} className="text-[10px]" />
                                    Behavior Timeline
                                </h4>
                                <button className="text-[10px] font-bold text-indigo-600 hover:underline">Lihat Selengkapnya</button>
                            </div>

                            {loadingHistory ? (
                                <div className="py-12 flex flex-col items-center justify-center text-gray-300 gap-3">
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Memuat Riwayat...</p>
                                </div>
                            ) : behaviorHistory.length > 0 ? (
                                <div className="space-y-3">
                                    {behaviorHistory.slice(0, 5).map((item) => (
                                        <div key={item.id} className="flex gap-4 p-3 rounded-2xl bg-gray-50/50 border border-gray-100 items-center">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${item.points >= 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">{item.type}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                            <div className={`text-xs font-black ${item.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {item.points >= 0 ? '+' : ''}{item.points}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-center">
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Belum Ada Riwayat Perilaku</p>
                                </div>
                            )}
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
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-5 bg-white rounded-3xl shadow-xl shadow-indigo-500/10 border border-indigo-50">
                            <QRCodeCanvas
                                value={`https://laporanmu.github.io/parent-check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                size={200}
                                level="H"
                                includeMargin={true}
                                imageSettings={{
                                    src: "/logo.png",
                                    x: undefined,
                                    y: undefined,
                                    height: 40,
                                    width: 40,
                                    excavate: true,
                                }}
                            />
                        </div>

                        <div className="space-y-4 w-full">
                            <div>
                                <h4 className="text-lg font-black text-gray-900">{selectedStudent.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scan untuk Cek Laporan & Poin</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="text-center">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kode Registrasi</p>
                                    <p className="font-mono text-xs font-bold text-indigo-600">{selectedStudent.code}</p>
                                </div>
                                <div className="text-center border-l border-gray-200">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">PIN AKses</p>
                                    <p className="font-mono text-xs font-bold text-indigo-600">{selectedStudent.pin}</p>
                                </div>
                            </div>

                            <button className="btn btn-primary w-full py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3">
                                <FontAwesomeIcon icon={faWhatsapp} />
                                Kirim Ke Orang Tua
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
                    <div className="flex flex-col items-center text-center space-y-6 py-2">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 text-2xl animate-bounce">
                            <FontAwesomeIcon icon={faCheckCircle} />
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-gray-900 leading-tight">Siswa Telah Terdaftar</h3>
                            <p className="text-xs text-gray-400 font-medium">Berikan kode & PIN berikut kepada wali murid</p>
                        </div>

                        <div className="w-full space-y-3 bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100/50">
                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-indigo-50">
                                <div className="text-left">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Kode Registrasi</p>
                                    <p className="font-mono text-sm font-black text-indigo-600 tracking-wider font-bold">{newlyCreatedStudent.registration_code}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newlyCreatedStudent.registration_code)
                                        addToast('Kode disalin!', 'success')
                                    }}
                                    className="p-2 text-indigo-400 hover:text-indigo-600"
                                >
                                    <FontAwesomeIcon icon={faIdCardAlt} />
                                </button>
                            </div>

                            <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-indigo-50">
                                <div className="text-left">
                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">PIN Akses</p>
                                    <p className="font-mono text-sm font-black text-indigo-600 tracking-[0.4em] font-bold">{newlyCreatedStudent.pin}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(newlyCreatedStudent.pin)
                                        addToast('PIN disalin!', 'success')
                                    }}
                                    className="p-2 text-indigo-400 hover:text-indigo-600"
                                >
                                    <FontAwesomeIcon icon={faKey} />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setIsSuccessModalOpen(false)}
                            className="btn btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em]"
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
                <div className="space-y-6">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                        <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Target Kenaikan</p>
                        <p className="text-[10px] text-indigo-400 font-medium">Anda akan memindahkan {selectedStudentIds.length} siswa terpilih ke kelas yang ditentukan.</p>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Pilih Kelas Baru</label>
                        <select
                            value={bulkClassId}
                            onChange={(e) => setBulkClassId(e.target.value)}
                            className="select-field text-sm py-2.5"
                        >
                            <option value="">Pilih Kelas Tujuan</option>
                            {classesList.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn btn-secondary flex-1 font-bold py-3 text-[11px] uppercase tracking-widest">
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleBulkPromote}
                            disabled={submitting}
                            className="btn btn-primary flex-1 font-bold py-3 text-[11px] uppercase tracking-widest"
                        >
                            {submitting ? 'Memproses...' : 'Proses Massal'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Cetak Kartu Siswa */}
            <Modal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                title="Cetak Kartu Pelajar"
                size="md"
            >
                {selectedStudent && (
                    <div className="space-y-8">
                        {/* ID Card Display (Miniature) */}
                        <div className="flex flex-col md:flex-row gap-6 justify-center items-center">
                            {/* Front Card */}
                            <div className="w-[320px] h-[200px] bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[20px] p-6 text-white relative shadow-2xl overflow-hidden shadow-indigo-500/20">
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                                <div className="absolute top-6 right-6 flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                        <span className="font-black text-sm">L</span>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Laporanmu</span>
                                </div>

                                <div className="flex gap-5 items-end mt-4">
                                    <div className="w-20 h-24 rounded-2xl bg-white/10 border border-white/20 p-1 shrink-0">
                                        <div className="w-full h-full rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
                                            {selectedStudent.photo_url ? (
                                                <img src={selectedStudent.photo_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-3xl font-black opacity-30">{selectedStudent.name.charAt(0)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black truncate leading-tight uppercase">{selectedStudent.name}</h3>
                                        <p className="text-[9px] font-bold opacity-70 uppercase tracking-[0.2em] mb-3">{selectedStudent.className}</p>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[7px] font-bold opacity-50 uppercase tracking-widest">Nomor Induk</p>
                                            <p className="text-xs font-mono font-bold tracking-widest">{selectedStudent.code}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute bottom-6 right-6 flex items-center gap-1">
                                    <FontAwesomeIcon icon={faGraduationCap} className="text-[8px] opacity-40" />
                                    <span className="text-[8px] font-black uppercase tracking-[0.4em] opacity-40">Kartu Pelajar Digital</span>
                                </div>
                            </div>

                            {/* Back Card */}
                            <div className="w-[320px] h-[200px] bg-white dark:bg-gray-950 rounded-[20px] p-6 border border-gray-100 dark:border-gray-800 relative shadow-2xl shadow-gray-200/50 dark:shadow-none flex flex-col items-center justify-center text-center">
                                <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-50 dark:border-gray-800 shadow-sm mb-4">
                                    <QRCodeCanvas
                                        value={`https://laporanmu.github.io/parent-check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                        size={80}
                                        level="M"
                                    />
                                </div>
                                <h4 className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest mb-1">Akses Portal Orang Tua</h4>
                                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[180px]">
                                    SILAKAN SCAN KODE DI ATAS UNTUK MENGECEK PERKEMBANGAN & PERILAKU SISWA
                                </p>

                                <div className="absolute bottom-6 w-full px-6 flex justify-between items-center opacity-20">
                                    <span className="text-[6px] font-black uppercase tracking-widest">Valid Unit 2026/2027</span>
                                    <span className="text-[6px] font-black uppercase tracking-widest">Laporanmu System</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="btn btn-secondary py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <FontAwesomeIcon icon={faSpinner} className="fa-spin opacity-50" />
                                Generate PDF
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="btn btn-primary py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20"
                            >
                                <FontAwesomeIcon icon={faIdCardAlt} />
                                Cetak Kartu
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Yakin Hapus Data?"
            >
                <div className="space-y-6">
                    <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center gap-5 text-red-600 dark:text-red-400">
                        <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-2xl">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-lg font-medium uppercase tracking-wider leading-tight">Hapus Siswa?</h3>
                            <p className="text-xs opacity-80 font-normal mt-1">Data poin dan riwayat laporan juga akan terpengaruh.</p>
                        </div>
                    </div>
                    <p className="text-[var(--color-text)] px-2 leading-relaxed">
                        Anda akan menghapus data <strong className="text-red-600 underline underline-offset-4 font-medium">{studentToDelete?.name}</strong>. Tindakan ini tidak dapat dibatalkan.
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary flex-1 font-normal">
                            BATALKAN
                        </button>
                        <button type="button" onClick={executeDelete} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-medium">
                            YA, HAPUS PERMANEN
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout >
    )
}
