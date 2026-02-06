import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'

const DEMO_YEARS = [
    { id: 1, name: '2024/2025', semester: 'Ganjil', isActive: true, startDate: '2024-07-15', endDate: '2024-12-20' },
    { id: 2, name: '2023/2024', semester: 'Genap', isActive: false, startDate: '2024-01-08', endDate: '2024-06-15' },
    { id: 3, name: '2023/2024', semester: 'Ganjil', isActive: false, startDate: '2023-07-17', endDate: '2023-12-22' },
]

export default function AcademicYearsPage() {
    const [years, setYears] = useState(DEMO_YEARS)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', semester: 'Ganjil', startDate: '', endDate: '' })
    const { addToast } = useToast()

    const handleAdd = () => { setSelectedItem(null); setFormData({ name: '', semester: 'Ganjil', startDate: '', endDate: '' }); setIsModalOpen(true) }
    const handleEdit = (item) => { setSelectedItem(item); setFormData({ name: item.name, semester: item.semester, startDate: item.startDate, endDate: item.endDate }); setIsModalOpen(true) }
    const handleDelete = (item) => { if (confirm(`Hapus "${item.name} ${item.semester}"?`)) { setYears(prev => prev.filter(y => y.id !== item.id)); addToast('Data berhasil dihapus', 'success') } }
    const handleSetActive = (item) => { setYears(prev => prev.map(y => ({ ...y, isActive: y.id === item.id }))); addToast(`${item.name} ${item.semester} diaktifkan`, 'success') }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name) { addToast('Nama tahun pelajaran wajib diisi', 'warning'); return }
        if (selectedItem) { setYears(prev => prev.map(y => y.id === selectedItem.id ? { ...y, ...formData } : y)); addToast('Data berhasil diupdate', 'success') }
        else { setYears(prev => [...prev, { id: Date.now(), isActive: false, ...formData }]); addToast('Data berhasil ditambahkan', 'success') }
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Tahun Pelajaran">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div><h1 className="text-2xl font-bold">Tahun Pelajaran</h1><p className="text-[var(--color-text-muted)]">Kelola tahun pelajaran dan semester aktif</p></div>
                <button onClick={handleAdd} className="btn btn-primary"><FontAwesomeIcon icon={faPlus} /> Tambah</button>
            </div>

            <div className="space-y-4">
                {years.map(year => (
                    <div key={year.id} className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${year.isActive ? 'border-2 border-indigo-500' : ''}`}>
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${year.isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-[var(--color-surface-alt)]'}`}>
                                {year.name.slice(2, 4)}
                            </div>
                            <div>
                                <h3 className="font-semibold flex items-center gap-2">{year.name} - {year.semester} {year.isActive && <span className="badge badge-success">Aktif</span>}</h3>
                                <p className="text-sm text-[var(--color-text-muted)]">{year.startDate} s/d {year.endDate}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {!year.isActive && <button onClick={() => handleSetActive(year)} className="btn btn-secondary text-sm">Aktifkan</button>}
                            <button onClick={() => handleEdit(year)} className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500"><FontAwesomeIcon icon={faEdit} /></button>
                            <button onClick={() => handleDelete(year)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500"><FontAwesomeIcon icon={faTrash} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Tahun Pelajaran' : 'Tambah Tahun Pelajaran'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-2">Tahun Pelajaran</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. 2024/2025" className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">Semester</label><select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="input"><option value="Ganjil">Ganjil</option><option value="Genap">Genap</option></select></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium mb-2">Tanggal Mulai</label><input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="input" /></div>
                        <div><label className="block text-sm font-medium mb-2">Tanggal Selesai</label><input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="input" /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button><button type="submit" className="btn btn-primary">{selectedItem ? 'Update' : 'Simpan'}</button></div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
