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
    faTimes,
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
        } catch {
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
        } catch {
            addToast('Gagal memproses kenaikan kelas massal', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        } catch {
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
            } catch {
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
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Siswa</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Kelola {students.length} data siswa aktif dalam sistem laporan.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={handleImportClick} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 shadow-sm rounded-xl transition-all">
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

                    <button onClick={handleExport} className="btn bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest h-11 px-5 shadow-sm rounded-xl transition-all">
                        <FontAwesomeIcon icon={faDownload} />
                        <span className="hidden sm:inline ml-2">Export</span>
                    </button>

                    <button onClick={handleAdd} className="btn btn-primary h-11 px-6 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 rounded-xl transition-all hover:scale-[1.02]">
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
                            placeholder="Cari nama, kode, kelas..."
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

                    {(searchQuery || filterClass || filterGender) && (
                        <button
                            onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterGender('') }}
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex items-center h-11"
                        >
                            <FontAwesomeIcon icon={faTimes} className="mr-2" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Dynamic Content */}
            {loading ? (
                <div className="glass rounded-[2rem] py-24 flex flex-col items-center justify-center border border-[var(--color-border)]">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--color-primary)] opacity-50 mb-4" />
                    <p className="text-[var(--color-text-muted)] font-bold tracking-[0.2em] uppercase text-xs">Sinkronisasi Data...</p>
                </div>
            ) : filteredStudents.length === 0 ? (
                <div className="glass rounded-[2rem] py-20 text-center border-dashed border-2 border-[var(--color-border)]">
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FontAwesomeIcon icon={faUsers} className="text-4xl text-[var(--color-text-muted)] opacity-50" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Tidak Ada Data</h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-sm mx-auto">Sesuaikan filter pencarian atau tambahkan data siswa baru ke sistem.</p>
                </div>
            ) : (
                <>
                    {/* Layout Mobile (Card Stack) */}
                    <div className="md:hidden space-y-4 mb-20 relative">
                        {filteredStudents.map((student) => (
                            <div key={student.id} className="glass rounded-[1.5rem] p-5 border border-[var(--color-border)] space-y-4 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-transform group-hover:scale-110"></div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div
                                        onClick={() => handleViewProfile(student)}
                                        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-lg font-black text-[var(--color-primary)] overflow-hidden shrink-0 cursor-pointer shadow-sm relative group-hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-shadow"
                                    >
                                        <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                                        {student.photo_url ? (
                                            <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                                        ) : (
                                            <span className="relative z-10">{student.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 onClick={() => handleViewProfile(student)} className="text-sm font-black font-heading text-[var(--color-text)] truncate mb-1 cursor-pointer leading-tight">
                                            {student.name}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest leading-none">{student.className}</span>
                                            <span className="text-[9px] font-mono font-medium text-[var(--color-text-muted)] italic opacity-80 leading-none">{student.code}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <div className={`text-lg font-black leading-none mb-1 ${student.points >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`}>
                                            {student.points}
                                        </div>
                                        <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-none">Poin</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-3 border-t border-[var(--color-border)] relative z-10">
                                    <button onClick={() => handleViewQR(student)} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] text-xs text-center border border-[var(--color-border)] shadow-inner">
                                            <FontAwesomeIcon icon={faQrcode} />
                                        </div>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-none">Akses</span>
                                    </button>
                                    <a href={`https://wa.me/62${student.phone?.replace(/^0/, '')}`} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[var(--color-success)]/5 transition-colors group/wa">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--color-success)]/10 flex items-center justify-center text-[var(--color-success)] text-xs border border-[var(--color-success)]/20 shadow-inner group-hover/wa:shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-shadow">
                                            <FontAwesomeIcon icon={faWhatsapp} />
                                        </div>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-none">WA</span>
                                    </a>
                                    <button onClick={() => handleEdit(student)} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-[var(--color-primary)]/5 transition-colors group/edit">
                                        <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs border border-[var(--color-primary)]/20 shadow-inner group-hover/edit:shadow-[0_0_10px_rgba(99,102,241,0.2)] transition-shadow">
                                            <FontAwesomeIcon icon={faEdit} />
                                        </div>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-none">Edit</span>
                                    </button>
                                    <button onClick={() => confirmDelete(student)} className="flex flex-col items-center gap-2 p-2 rounded-xl hover:bg-red-500/5 transition-colors group/del">
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 text-xs border border-red-500/20 shadow-inner group-hover/del:shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-shadow">
                                            <FontAwesomeIcon icon={faTrash} />
                                        </div>
                                        <span className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest leading-none">Hapus</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Layout Desktop (Table) */}
                    <div className="hidden md:block glass rounded-[1.5rem] mb-6 overflow-hidden border border-[var(--color-border)] shadow-sm">
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
                                <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                                    <th className="px-5 py-4 w-4">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded-md border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface-alt)]"
                                            />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Siswa</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Gender</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Kelas</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Poin</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-right pr-6">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredStudents.map((student) => (
                                    <tr key={student.id} className={`group hover:bg-[var(--color-surface-alt)]/30 transition-colors relative ${selectedStudentIds.includes(student.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedStudentIds.includes(student.id)}
                                                    onChange={() => toggleSelectStudent(student.id)}
                                                    className="w-4 h-4 rounded-md border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] bg-[var(--color-surface-alt)]"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    onClick={() => handleViewProfile(student)}
                                                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-xs font-black shadow-sm cursor-pointer hover:scale-110 transition-transform overflow-hidden relative shrink-0"
                                                >
                                                    <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                                                    {student.photo_url ? (
                                                        <img src={student.photo_url} alt="" className="w-full h-full object-cover relative z-10" />
                                                    ) : (
                                                        <span className="relative z-10">{student.name.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div className="pt-0.5">
                                                    <button
                                                        onClick={() => handleViewProfile(student)}
                                                        className="font-bold text-sm leading-tight text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors block text-left mb-0.5 px-0.5 rounded-sm focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] outline-none truncate"
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
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 shadow-[0_0_10px_rgba(99,102,241,0.1)] uppercase tracking-widest leading-none">
                                                {student.className}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={`text-sm font-black ${student.points >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'}`}>
                                                    {student.points}
                                                </span>
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shadow-inner ${student.trend === 'up' ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                                                    <FontAwesomeIcon
                                                        icon={student.trend === 'up' ? faArrowTrendUp : faArrowTrendDown}
                                                        className="text-[9px]"
                                                    />
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
                                <div className="w-20 h-20 rounded-[1.5rem] bg-[var(--color-surface-alt)] border-2 border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary)] overflow-hidden transition-all group-hover:border-[var(--color-primary)]">
                                    {formData.photo_url ? (
                                        <img src={formData.photo_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <FontAwesomeIcon icon={faCamera} className="text-lg opacity-50" />
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
                                <button
                                    onClick={() => document.getElementById('profile-photo-input').click()}
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all rounded-[2rem] cursor-pointer border border-white/20"
                                >
                                    <FontAwesomeIcon icon={faCamera} className="text-xl mb-1.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Ganti Foto</span>
                                </button>
                            </div>

                            {/* Info Section */}
                            <div className="flex-1 space-y-4 min-w-0 w-full">
                                <div className="text-center md:text-left">
                                    <h3 className="text-2xl font-black font-heading text-[var(--color-text)] leading-tight mb-2 uppercase tracking-tight">{selectedStudent.name}</h3>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        <span className="px-2.5 py-1 text-[9px] font-black bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 uppercase tracking-widest rounded-lg shadow-sm leading-none">{selectedStudent.className}</span>
                                        <span className="bg-[var(--color-surface-alt)] border-[var(--color-border)] border text-[var(--color-text-muted)] px-2.5 py-1 text-[9px] font-mono tracking-wider rounded-lg leading-none flex items-center">{selectedStudent.code}</span>
                                        <span className={`border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg leading-none flex items-center ${selectedStudent.gender === 'L' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-pink-500/10 text-pink-500 border-pink-500/20'}`}>
                                            {selectedStudent.gender === 'L' ? 'Putra' : 'Putri'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="glass bg-[var(--color-surface-alt)]/50 p-3 rounded-[1.25rem] border border-[var(--color-border)] text-center shadow-sm">
                                        <p className={`text-xl font-black font-heading ${selectedStudent.points >= 0 ? 'text-[var(--color-success)]' : 'text-red-500'} leading-none mb-1`}>
                                            {selectedStudent.points}
                                        </p>
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Total Poin</p>
                                    </div>
                                    <div className="glass bg-[var(--color-surface-alt)]/50 p-3 rounded-[1.25rem] border border-[var(--color-border)] text-center shadow-sm">
                                        <p className="text-xl font-black font-heading text-red-500 leading-none mb-1">0</p>
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Pelanggaran</p>
                                    </div>
                                    <div className="glass bg-[var(--color-surface-alt)]/50 p-3 rounded-[1.25rem] border border-[var(--color-border)] text-center shadow-sm">
                                        <p className="text-xl font-black font-heading text-[var(--color-success)] leading-none mb-1">0</p>
                                        <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Prestasi</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contact Section */}
                        <div className="glass bg-[var(--color-primary)]/5 p-4 rounded-[1.5rem] border border-[var(--color-primary)]/10 flex items-center justify-between">
                            <div>
                                <p className="text-[8px] font-black text-[var(--color-primary)] uppercase tracking-widest mb-1 opacity-80">Kontak Orang Tua / Wali</p>
                                <p className="text-sm font-black text-[var(--color-text)] font-mono tracking-wider">{selectedStudent.phone || 'TIDAK ADA NOMOR'}</p>
                            </div>
                            {selectedStudent.phone && (
                                <a
                                    href={`https://wa.me/62${selectedStudent.phone.replace(/^0/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-11 h-11 rounded-2xl bg-[var(--color-success)] flex items-center justify-center text-white shadow-lg shadow-[var(--color-success)]/20 hover:scale-110 active:scale-95 transition-transform"
                                    title="WhatsApp Sekarang"
                                >
                                    <FontAwesomeIcon icon={faWhatsapp} className="text-xl" />
                                </a>
                            )}
                        </div>

                        {/* History Timeline */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
                                    <FontAwesomeIcon icon={faHistory} className="text-xs" />
                                    Riwayat Perilaku
                                </h4>
                                <button className="text-[10px] font-black text-[var(--color-primary)] hover:underline uppercase tracking-widest">Lihat Semua</button>
                            </div>

                            <div className="min-h-[160px] glass bg-[var(--color-surface-alt)]/30 rounded-[1.5rem] border border-[var(--color-border)] p-4">
                                {loadingHistory ? (
                                    <div className="py-12 flex flex-col items-center justify-center text-[var(--color-text-muted)] gap-4">
                                        <FontAwesomeIcon icon={faSpinner} className="fa-spin text-2xl" />
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em]">Sinkronisasi Data...</p>
                                    </div>
                                ) : behaviorHistory.length > 0 ? (
                                    <div className="space-y-2.5">
                                        {behaviorHistory.slice(0, 5).map((item) => (
                                            <div key={item.id} className="flex gap-4 p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] items-center hover:border-[var(--color-primary)]/50 transition-colors shadow-sm">
                                                <div className={`w-2 h-2 rounded-full shrink-0 shadow-[0_0_10px_currentColor] ${item.points >= 0 ? 'bg-[var(--color-success)] text-[var(--color-success)]' : 'bg-red-500 text-red-500'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[12px] font-black text-[var(--color-text)] truncate mb-0.5">{item.type}</p>
                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider">{new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                                </div>
                                                <div className={`text-[13px] font-black ${item.points >= 0 ? 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20' : 'text-red-500 bg-red-500/10 border-red-500/20'} px-2.5 py-1 rounded-xl border`}>
                                                    {item.points >= 0 ? '+' : ''}{item.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 flex flex-col items-center justify-center text-center">
                                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]">
                                            <FontAwesomeIcon icon={faHistory} className="text-2xl" />
                                        </div>
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.3em]">Belum Ada Riwayat Perilaku</p>
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
                    <div className="flex flex-col items-center text-center space-y-6">
                        <div className="p-4 bg-[var(--color-surface)] rounded-[2rem] shadow-2xl shadow-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            <div className="relative z-10 glass bg-[var(--color-surface-alt)]/80 p-2 rounded-[1.5rem]">
                                <QRCodeCanvas
                                    value={`${window.location.origin}/check?code=${selectedStudent.code}&pin=${selectedStudent.pin}`}
                                    size={180}
                                    level="H"
                                    includeMargin={true}
                                    fgColor="currentColor"
                                    className="text-[var(--color-text)]"
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
                        </div>

                        <div className="space-y-4 w-full">
                            <div>
                                <h4 className="text-xl font-black font-heading text-[var(--color-text)] leading-tight">{selectedStudent.name}</h4>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-widest mt-1">Pindai untuk Akses Portal</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 p-3 glass bg-[var(--color-surface-alt)]/50 rounded-[1.25rem] border border-[var(--color-border)]">
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Kode Registrasi</p>
                                    <p className="font-mono text-sm font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 py-1 px-2 rounded-lg inline-block border border-[var(--color-primary)]/20">{selectedStudent.code}</p>
                                </div>
                                <div className="text-center border-l border-[var(--color-border)]">
                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">PIN Akses</p>
                                    <p className="font-mono text-sm font-black text-[var(--color-primary)] bg-[var(--color-primary)]/10 py-1 px-2 rounded-lg inline-block border border-[var(--color-primary)]/20">{selectedStudent.pin}</p>
                                </div>
                            </div>

                            <button className="btn btn-primary w-full py-3 text-[10px] font-black uppercase tracking-widest h-12 flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 rounded-[1rem] transition-all hover:scale-[1.02]">
                                <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                                Kirim Ke WhatsApp Wali
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

            {/* Modal Naik Kelas Massal */}
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
                        <p className="text-[11px] text-[var(--color-text)] leading-relaxed font-bold">Anda akan memindahkan <span className="text-[var(--color-primary)] font-black text-[13px] bg-[var(--color-primary)]/10 px-1.5 py-0.5 rounded-md border border-[var(--color-primary)]/20">{selectedStudentIds.length} siswa</span> terpilih ke kelas tujuan.</p>
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
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'PROSES MASSAL'}
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
        </DashboardLayout>
    )
}