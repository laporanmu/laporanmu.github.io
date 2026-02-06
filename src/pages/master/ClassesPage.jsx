import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'

const DEMO_CLASSES = [
    { id: 1, name: 'X MIPA 1', grade: 'X', major: 'MIPA', teacher: 'Budi Santoso, S.Pd', students: 32 },
    { id: 2, name: 'X MIPA 2', grade: 'X', major: 'MIPA', teacher: 'Sari Dewi, M.Pd', students: 30 },
    { id: 3, name: 'XI IPA 1', grade: 'XI', major: 'IPA', teacher: 'Ahmad Fauzi, S.Pd', students: 28 },
    { id: 4, name: 'XII IPA 1', grade: 'XII', major: 'IPA', teacher: 'Rina Marlina, S.Pd', students: 35 },
]

export default function ClassesPage() {
    const [classes, setClasses] = useState(DEMO_CLASSES)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', grade: '', major: '', teacher: '' })
    const { addToast } = useToast()

    const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const handleAdd = () => { setSelectedItem(null); setFormData({ name: '', grade: '', major: '', teacher: '' }); setIsModalOpen(true) }
    const handleEdit = (item) => { setSelectedItem(item); setFormData({ name: item.name, grade: item.grade, major: item.major, teacher: item.teacher }); setIsModalOpen(true) }
    const handleDelete = (item) => { if (confirm(`Hapus kelas "${item.name}"?`)) { setClasses(prev => prev.filter(c => c.id !== item.id)); addToast('Kelas berhasil dihapus', 'success') } }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name) { addToast('Nama kelas wajib diisi', 'warning'); return }
        if (selectedItem) { setClasses(prev => prev.map(c => c.id === selectedItem.id ? { ...c, ...formData } : c)); addToast('Data berhasil diupdate', 'success') }
        else { setClasses(prev => [...prev, { id: Date.now(), students: 0, ...formData }]); addToast('Kelas berhasil ditambahkan', 'success') }
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Data Kelas">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div><h1 className="text-2xl font-bold">Data Kelas</h1><p className="text-[var(--color-text-muted)]">Kelola data kelas dan wali kelas</p></div>
                <button onClick={handleAdd} className="btn btn-primary"><FontAwesomeIcon icon={faPlus} /> Tambah Kelas</button>
            </div>

            <div className="card mb-6">
                <div className="relative"><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kelas..." className="input pl-10" /></div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map(cls => (
                    <div key={cls.id} className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">{cls.grade}</div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(cls)} className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500"><FontAwesomeIcon icon={faEdit} /></button>
                                <button onClick={() => handleDelete(cls)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500"><FontAwesomeIcon icon={faTrash} /></button>
                            </div>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{cls.name}</h3>
                        <p className="text-sm text-[var(--color-text-muted)] mb-3">Wali: {cls.teacher}</p>
                        <div className="flex items-center justify-between text-sm">
                            <span className="badge badge-primary">{cls.major}</span>
                            <span className="text-[var(--color-text-muted)]">{cls.students} siswa</span>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Kelas' : 'Tambah Kelas'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-2">Nama Kelas</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. XII IPA 1" className="input" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium mb-2">Tingkat</label><select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input"><option value="">Pilih</option><option value="X">X</option><option value="XI">XI</option><option value="XII">XII</option></select></div>
                        <div><label className="block text-sm font-medium mb-2">Jurusan</label><input type="text" value={formData.major} onChange={(e) => setFormData({ ...formData, major: e.target.value })} placeholder="e.g. IPA" className="input" /></div>
                    </div>
                    <div><label className="block text-sm font-medium mb-2">Wali Kelas</label><input type="text" value={formData.teacher} onChange={(e) => setFormData({ ...formData, teacher: e.target.value })} placeholder="Nama wali kelas" className="input" /></div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button><button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Simpan'}</button></div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
