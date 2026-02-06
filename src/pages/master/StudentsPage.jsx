import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus,
    faSearch,
    faEdit,
    faTrash,
    faEye,
    faFileExport,
    faFilter,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'

// Demo data
const DEMO_STUDENTS = [
    { id: 1, code: 'REG-7K3Q-9P2X', name: 'Ahmad Rizki Pratama', class: 'XII IPA 1', points: -15, phone: '081234567890' },
    { id: 2, code: 'REG-8M4R-2T5Y', name: 'Siti Aminah', class: 'XI IPS 2', points: 25, phone: '081234567891' },
    { id: 3, code: 'REG-9N5S-3U6Z', name: 'Budi Santoso', class: 'X MIPA 3', points: -30, phone: '081234567892' },
    { id: 4, code: 'REG-1P6T-4V7A', name: 'Dewi Lestari', class: 'XII IPA 2', points: 45, phone: '081234567893' },
    { id: 5, code: 'REG-2Q7U-5W8B', name: 'Eko Prasetyo', class: 'XI MIPA 1', points: 0, phone: '081234567894' },
]

export default function StudentsPage() {
    const [students, setStudents] = useState(DEMO_STUDENTS)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [formData, setFormData] = useState({ name: '', class: '', phone: '' })
    const { addToast } = useToast()

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.class.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const generateCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
        return `REG-${part1}-${part2}`
    }

    const handleAdd = () => {
        setSelectedStudent(null)
        setFormData({ name: '', class: '', phone: '' })
        setIsModalOpen(true)
    }

    const handleEdit = (student) => {
        setSelectedStudent(student)
        setFormData({ name: student.name, class: student.class, phone: student.phone })
        setIsModalOpen(true)
    }

    const handleDelete = (student) => {
        if (confirm(`Hapus siswa "${student.name}"?`)) {
            setStudents(prev => prev.filter(s => s.id !== student.id))
            addToast('Siswa berhasil dihapus', 'success')
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
                        Kelola data siswa dan kode registrasi wali murid
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <FontAwesomeIcon icon={faPlus} />
                    Tambah Siswa
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <FontAwesomeIcon
                            icon={faSearch}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, kode, atau kelas..."
                            className="input pl-10"
                        />
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2">
                        <button className="btn btn-secondary">
                            <FontAwesomeIcon icon={faFilter} />
                            Filter
                        </button>
                        <button className="btn btn-secondary">
                            <FontAwesomeIcon icon={faFileExport} />
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Kode Registrasi</th>
                            <th>Nama Siswa</th>
                            <th>Kelas</th>
                            <th>Poin</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <tr key={student.id}>
                                    <td>
                                        <code className="text-xs bg-[var(--color-surface-alt)] px-2 py-1 rounded">
                                            {student.code}
                                        </code>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 
                        flex items-center justify-center text-white text-sm font-medium">
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-medium">{student.name}</span>
                                        </div>
                                    </td>
                                    <td>{student.class}</td>
                                    <td>
                                        <span className={`badge ${getPointsBadge(student.points)}`}>
                                            {student.points > 0 ? '+' : ''}{student.points} poin
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleEdit(student)}
                                                className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500 transition-colors"
                                                title="Edit"
                                            >
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                            <a
                                                href={`https://wa.me/62${student.phone.slice(1)}?text=Assalamualaikum, ini info dari sekolah tentang ${student.name}...`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 text-[var(--color-text-muted)] hover:text-green-500 transition-colors"
                                                title="WhatsApp Wali"
                                            >
                                                <FontAwesomeIcon icon={faWhatsapp} />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(student)}
                                                className="p-2 text-[var(--color-text-muted)] hover:text-red-500 transition-colors"
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
                                <td colSpan={5} className="text-center py-8 text-[var(--color-text-muted)]">
                                    Tidak ada data siswa ditemukan
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedStudent ? 'Edit Siswa' : 'Tambah Siswa Baru'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Nama Lengkap</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Masukkan nama siswa"
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Kelas</label>
                        <input
                            type="text"
                            value={formData.class}
                            onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                            placeholder="e.g. XII IPA 1"
                            className="input"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">No. HP Wali Murid</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="08xxxxxxxxxx"
                            className="input"
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {selectedStudent ? 'Update' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
