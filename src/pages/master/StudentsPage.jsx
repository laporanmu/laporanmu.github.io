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
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

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
    const [students, setStudents] = useState(DEMO_STUDENTS)
    const [classesList, setClassesList] = useState([]) // { id, name }[] dari DB atau fallback
    const [searchQuery, setSearchQuery] = useState('')
    const [filterClass, setFilterClass] = useState('')
    const [filterGender, setFilterGender] = useState('') // '', 'L', 'P'
    const [sortBy, setSortBy] = useState('name_asc')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [studentToDelete, setStudentToDelete] = useState(null)
    const [formData, setFormData] = useState({ name: '', gender: 'L', class: '', phone: '' })
    const [loadingClasses, setLoadingClasses] = useState(true)

    const fileInputRef = useRef(null)
    const { addToast } = useToast()

    // Ambil data kelas dari database (table classes)
    useEffect(() => {
        async function loadClasses() {
            if (supabase) {
                try {
                    const { data, error } = await supabase
                        .from('classes')
                        .select('id, name')
                        .order('name')
                    if (!error && data?.length) {
                        setClassesList(data)
                    } else {
                        setClassesList(FALLBACK_CLASS_NAMES.map((name, i) => ({ id: String(i), name })))
                    }
                } catch {
                    setClassesList(FALLBACK_CLASS_NAMES.map((name, i) => ({ id: String(i), name })))
                }
            } else {
                setClassesList(FALLBACK_CLASS_NAMES.map((name, i) => ({ id: String(i), name })))
            }
            setLoadingClasses(false)
        }
        loadClasses()
    }, [])

    const classNames = classesList.map(c => (typeof c === 'string' ? c : c.name))

    // Filter + Sort
    const filteredStudents = students
        .filter(s => {
            const matchesSearch =
                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.class.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesClass = filterClass ? s.class === filterClass : true
            const matchesGender = filterGender ? s.gender === filterGender : true
            return matchesSearch && matchesClass && matchesGender
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'name_asc': return (a.name || '').localeCompare(b.name || '')
                case 'name_desc': return (b.name || '').localeCompare(a.name || '')
                case 'class_asc': return (a.class || '').localeCompare(b.class || '')
                case 'points_desc': return (b.points ?? 0) - (a.points ?? 0)
                case 'points_asc': return (a.points ?? 0) - (b.points ?? 0)
                default: return 0
            }
        })

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }

    const handleAdd = () => {
        setSelectedStudent(null)
        setFormData({ name: '', gender: 'L', class: '', phone: '' })
        setIsModalOpen(true)
    }

    const handleEdit = (student) => {
        setSelectedStudent(student)
        setFormData({ name: student.name, gender: student.gender || 'L', class: student.class, phone: student.phone })
        setIsModalOpen(true)
    }

    const confirmDelete = (student) => {
        setStudentToDelete(student)
        setIsDeleteModalOpen(true)
    }

    const executeDelete = () => {
        if (studentToDelete) {
            setStudents(prev => prev.filter(s => s.id !== studentToDelete.id))
            addToast('Siswa berhasil dihapus', 'success')
            setIsDeleteModalOpen(false)
            setStudentToDelete(null)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name || !formData.class) {
            addToast('Nama dan kelas wajib diisi', 'warning')
            return
        }

        if (selectedStudent) {
            // Edit
            setStudents(prev => prev.map(s =>
                s.id === selectedStudent.id ? { ...s, ...formData } : s
            ))
            addToast('Data siswa berhasil diupdate', 'success')
        } else {
            // Add
            const newStudent = {
                id: Date.now(),
                code: generateCode(),
                pin: String(Math.floor(1000 + Math.random() * 9000)),
                points: 0,
                ...formData,
            }
            setStudents(prev => [...prev, newStudent])
            addToast(`Siswa berhasil ditambahkan. Kode: ${newStudent.code}`, 'success')
        }
        setIsModalOpen(false)
    }

    // Export Functionality
    const handleExport = () => {
        const headers = ['ID', 'Kode', 'Nama', 'Gender', 'Kelas', 'Poin', 'No. HP']
        const csvContent = [
            headers.join(','),
            ...students.map(s => `${s.id},${s.code},"${s.name}",${s.gender},"${s.class}",${s.points},"${s.phone}"`)
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
            } catch (err) {
                addToast('Terjadi kesalahan saat import', 'error')
            }
            // Reset input
            e.target.value = ''
        }
        reader.readAsText(file)
    }

    const getPointsBadge = (points) => {
        if (points > 0) return 'badge-success'
        if (points < 0) return 'badge-danger'
        return 'badge-primary'
    }

    return (
        <DashboardLayout title="Data Siswa">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Data Siswa</h1>
                    <p className="text-[var(--color-text-muted)]">
                        Kelola data siswa, export/import, dan kode registrasi
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleImportClick} className="btn btn-secondary">
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

                    <button onClick={handleExport} className="btn btn-secondary">
                        <FontAwesomeIcon icon={faDownload} />
                        <span className="hidden sm:inline ml-2">Export</span>
                    </button>

                    <button onClick={handleAdd} className="btn btn-primary">
                        <FontAwesomeIcon icon={faPlus} />
                        <span className="ml-2">Tambah</span>
                    </button>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="card mb-6 p-4">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                        {/* Search */}
                        <div className="flex-1 min-w-[200px] relative">
                            <FontAwesomeIcon
                                icon={faSearch}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari nama, kode registrasi, kelas..."
                                className="input-field pl-10 w-full"
                            />
                        </div>

                        {/* Class Filter */}
                        <div className="w-full md:w-44 relative">
                            <FontAwesomeIcon
                                icon={faFilter}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none"
                            />
                            <select
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                                className="select-field pl-10 w-full appearance-none"
                            >
                                <option value="">Semua Kelas</option>
                                {classNames.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                        </div>

                        {/* Gender Filter */}
                        <div className="w-full md:w-40">
                            <select
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value)}
                                className="select-field w-full"
                            >
                                <option value="">Semua Gender</option>
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>

                        {/* Sort */}
                        <div className="w-full md:w-48">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="select-field w-full"
                            >
                                {SORT_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {(searchQuery || filterClass || filterGender) && (
                            <button
                                onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterGender('') }}
                                className="btn btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 shrink-0"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                                Reset Filter
                            </button>
                        )}
                    </div>
                    {(searchQuery || filterClass || filterGender) && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                            Menampilkan {filteredStudents.length} dari {students.length} siswa
                        </p>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="table-container shadow-sm border border-[var(--color-border)] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-[var(--color-surface-alt)]">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Siswa</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Gender</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Kelas</th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Poin</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border)]">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md
                                                ${student.gender === 'L' ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-pink-500 to-rose-600'}`}>
                                                {student.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-[var(--color-text)]">{student.name}</div>
                                                <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-2">
                                                    <span className="font-mono bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">
                                                        {student.code}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg 
                                            ${student.gender === 'L' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400'}`}>
                                            <FontAwesomeIcon icon={student.gender === 'L' ? faMars : faVenus} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="badge badge-secondary">{student.class}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`badge ${getPointsBadge(student.points)} min-w-[80px]`}>
                                            {student.points > 0 ? '+' : ''}{student.points} Poin
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <a
                                                href={`https://wa.me/62${student.phone.slice(1)}?text=Assalamualaikum, ini info dari sekolah tentang ${student.name}...`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                                                title="WhatsApp Wali"
                                            >
                                                <FontAwesomeIcon icon={faWhatsapp} />
                                            </a>
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                title="Edit"
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                            <button
                                                onClick={() => confirmDelete(student)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                title="Hapus"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faSearch} className="text-4xl mb-3 opacity-20" />
                                        <p>Tidak ada data siswa ditemukan</p>
                                        {(searchQuery || filterClass || filterGender) && (
                                            <button
                                                onClick={() => { setSearchQuery(''); setFilterClass(''); setFilterGender('') }}
                                                className="text-indigo-500 hover:underline mt-2 text-sm"
                                            >
                                                Reset filter
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Input Modal - data kelas dari DB */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
                            Identitas Siswa
                        </h4>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Nama Lengkap</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Masukkan nama siswa"
                                className="input-field w-full"
                                autoFocus
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Jenis Kelamin</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender: 'L' })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.gender === 'L'
                                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faMars} className="text-lg mb-1" />
                                        <span className="text-xs font-medium">Laki-laki</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender: 'P' })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${formData.gender === 'P'
                                            ? 'border-pink-500 bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300'
                                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-pink-300 hover:bg-pink-50/50 dark:hover:bg-pink-900/10'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faVenus} className="text-lg mb-1" />
                                        <span className="text-xs font-medium">Perempuan</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">Kelas</label>
                                <select
                                    value={formData.class}
                                    onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                    className="select-field w-full"
                                >
                                    <option value="">Pilih Kelas</option>
                                    {classNames.map(cls => (
                                        <option key={cls} value={cls}>{cls}</option>
                                    ))}
                                </select>
                                {loadingClasses && classNames.length === 0 && (
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Memuat data kelas...</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h4 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)] pb-2">
                            Kontak Wali
                        </h4>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-[var(--color-text)]">No. HP Wali Murid</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="08xxxxxxxxxx"
                                className="input-field w-full"
                            />
                        </div>
                    </section>

                    <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {selectedStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Custom Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Konfirmasi Hapus"
            >
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-4 text-red-600 dark:text-red-400">
                        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div>
                            <h3 className="font-bold">Hapus Data Siswa?</h3>
                            <p className="text-sm opacity-90">Tindakan ini tidak dapat dibatalkan.</p>
                        </div>
                    </div>
                    <p>
                        Apakah Anda yakin ingin menghapus siswa <strong>{studentToDelete?.name}</strong>?
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary">
                            Batal
                        </button>
                        <button type="button" onClick={executeDelete} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/30">
                            Ya, Hapus
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
