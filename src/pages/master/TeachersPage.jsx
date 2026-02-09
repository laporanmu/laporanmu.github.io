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
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl font-bold">Data Guru</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium">Kelola data guru dan staff pengajar di sekolah ini.</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-indigo-500/20 h-10 text-xs font-bold px-4">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH GURU</span>
                </button>
            </div>

            {/* Filter Area */}
            <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl mb-5 p-3.5 shadow-sm">
                <div className="relative font-normal">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <FontAwesomeIcon icon={faSearch} className="text-xs" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama atau mata pelajaran..."
                        className="input-field pl-10 w-full h-10 text-xs"
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Nama Guru</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Mata Pelajaran</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Email</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Kontak</th>
                                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right pr-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredTeachers.map(teacher => (
                                <tr key={teacher.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                    <td className="px-5 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-600 flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-sm">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-[13px] text-gray-900 dark:text-white truncate">{teacher.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 text-[12px] text-gray-600 dark:text-gray-400 font-medium">
                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold">
                                            {teacher.subject}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-[11px] text-gray-500 dark:text-gray-400 font-medium lowercase italic">{teacher.email}</td>
                                    <td className="px-5 py-3 text-[11px] text-gray-500 dark:text-gray-400 font-bold">{teacher.phone}</td>
                                    <td className="px-5 py-3 text-right pr-4">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <button onClick={() => handleEdit(teacher)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-xs" title="Edit">
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                            <button onClick={() => handleDelete(teacher)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-xs" title="Hapus">
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Update Data Guru' : 'Guru Baru'} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama lengkap dengan gelar" className="input-field font-bold text-xs py-2.5 h-10" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Mata Pelajaran</label>
                            <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Matematika" className="input-field font-bold text-xs py-2.5 h-10" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">No. HP / WA</label>
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="input-field font-bold text-xs py-2.5 h-10" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Sekolah</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@sekolah.id" className="input-field font-bold text-xs py-2.5 h-10" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-10 px-6 uppercase tracking-widest">Batal</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-md shadow-indigo-500/20 py-2 text-xs h-10 uppercase tracking-widest">{selectedItem ? 'UPDATE' : 'SIMPAN'}</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
