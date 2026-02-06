import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'

const DEMO_TEACHERS = [
    { id: 1, name: 'Budi Santoso, S.Pd', subject: 'Matematika', phone: '081234567890', email: 'budi@sekolah.id' },
    { id: 2, name: 'Sari Dewi, M.Pd', subject: 'Bahasa Indonesia', phone: '081234567891', email: 'sari@sekolah.id' },
    { id: 3, name: 'Ahmad Fauzi, S.Pd', subject: 'Fisika', phone: '081234567892', email: 'ahmad@sekolah.id' },
    { id: 4, name: 'Rina Marlina, S.Pd', subject: 'Biologi', phone: '081234567893', email: 'rina@sekolah.id' },
]

export default function TeachersPage() {
    const [teachers, setTeachers] = useState(DEMO_TEACHERS)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', subject: '', phone: '', email: '' })
    const { addToast } = useToast()

    const filteredTeachers = teachers.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({ name: '', subject: '', phone: '', email: '' })
        setIsModalOpen(true)
    }

    const handleEdit = (item) => {
        setSelectedItem(item)
        setFormData({ name: item.name, subject: item.subject, phone: item.phone, email: item.email })
        setIsModalOpen(true)
    }

    const handleDelete = (item) => {
        if (confirm(`Hapus "${item.name}"?`)) {
            setTeachers(prev => prev.filter(t => t.id !== item.id))
            addToast('Data berhasil dihapus', 'success')
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name) {
            addToast('Nama wajib diisi', 'warning')
            return
        }

        if (selectedItem) {
            setTeachers(prev => prev.map(t => t.id === selectedItem.id ? { ...t, ...formData } : t))
            addToast('Data berhasil diupdate', 'success')
        } else {
            setTeachers(prev => [...prev, { id: Date.now(), ...formData }])
            addToast('Data berhasil ditambahkan', 'success')
        }
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Data Guru">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Data Guru</h1>
                    <p className="text-[var(--color-text-muted)]">Kelola data guru dan staff pengajar</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <FontAwesomeIcon icon={faPlus} /> Tambah Guru
                </button>
            </div>

            <div className="card mb-6">
                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama atau mata pelajaran..." className="input pl-10" />
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nama</th>
                            <th>Mata Pelajaran</th>
                            <th>Email</th>
                            <th>No. HP</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTeachers.map(teacher => (
                            <tr key={teacher.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-sm font-medium">
                                            {teacher.name.charAt(0)}
                                        </div>
                                        <span className="font-medium">{teacher.name}</span>
                                    </div>
                                </td>
                                <td>{teacher.subject}</td>
                                <td>{teacher.email}</td>
                                <td>{teacher.phone}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEdit(teacher)} className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500"><FontAwesomeIcon icon={faEdit} /></button>
                                        <button onClick={() => handleDelete(teacher)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500"><FontAwesomeIcon icon={faTrash} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Guru' : 'Tambah Guru'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-2">Nama Lengkap</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama lengkap dengan gelar" className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">Mata Pelajaran</label><input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Matematika" className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@sekolah.id" className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">No. HP</label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="input" /></div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button><button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Simpan'}</button></div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
