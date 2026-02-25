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
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Data Guru</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Kelola data guru dan staff pengajar di sekolah ini.
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH GURU</span>
                </button>
            </div>

            {/* Filter Area */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="relative font-normal group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--color-primary)]">
                        <FontAwesomeIcon icon={faSearch} className="text-sm" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama atau mata pelajaran..."
                        className="input-field pl-11 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                    />
                </div>
            </div>

            {/* Table Area */}
            <div className="glass rounded-[1.5rem] overflow-hidden border border-[var(--color-border)] shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Nama Guru</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Mata Pelajaran</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Email</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Kontak</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-right pr-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredTeachers.map(teacher => (
                                <tr key={teacher.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                                                {teacher.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-sm text-[var(--color-text)] truncate">{teacher.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-[13px] text-[var(--color-text-muted)] font-medium">
                                        <span className="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-none rounded-md text-[11px] font-bold tracking-tight uppercase">
                                            {teacher.subject}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-[var(--color-text-muted)] font-medium lowercase italic opacity-80">{teacher.email}</td>
                                    <td className="px-6 py-4 text-xs text-[var(--color-text)] font-bold">{teacher.phone}</td>
                                    <td className="px-6 py-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleEdit(teacher)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm" title="Edit">
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                            <button onClick={() => handleDelete(teacher)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Hapus">
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama lengkap dengan gelar" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
                            <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Matematika" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">No. HP / WA</label>
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Email Sekolah</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@sekolah.id" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-11 px-6 uppercase tracking-widest rounded-xl">BATAL</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-lg shadow-[var(--color-primary)]/20 py-2 text-xs h-11 uppercase tracking-widest rounded-xl">{selectedItem ? 'UPDATE' : 'SIMPAN'}</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
