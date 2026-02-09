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
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl font-bold">Tahun Pelajaran</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5">Kelola tahun pelajaran dan semester aktif dalam sistem.</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-indigo-500/20 h-10 text-xs font-bold px-4">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {years.map(year => (
                    <div key={year.id} className={`bg-white dark:bg-gray-950 border rounded-xl p-4 shadow-sm transition-all hover:shadow-md relative overflow-hidden group ${year.isActive ? 'border-2 border-indigo-500' : 'border-[var(--color-border)]'}`}>
                        {year.isActive && (
                            <div className="absolute top-0 right-0">
                                <span className="bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-lg uppercase tracking-widest">AKTIF</span>
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${year.isActive ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' : 'bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-400'}`}>
                                {year.name.slice(2, 4)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 truncate">
                                    {year.name}
                                </h3>
                                <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mt-0.5">{year.semester} SEMESTER</p>
                                <div className="text-[10px] text-gray-400 font-medium mt-2 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                    {year.startDate} <span className="text-[8px]">Hingga</span> {year.endDate}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-gray-50 dark:border-gray-900">
                            {!year.isActive ? (
                                <button onClick={() => handleSetActive(year)} className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest">Aktifkan Sekarang</button>
                            ) : (
                                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                    Sistem Sedang Digunakan
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(year)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-[10px]" title="Edit">
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                                <button onClick={() => handleDelete(year)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-[10px]" title="Hapus">
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Update Tahun Pelajaran' : 'Tahun Pelajaran Baru'} size="sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tahun Pelajaran</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. 2024/2025" className="input-field font-bold text-xs py-2.5 h-10" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Semester</label>
                        <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="select-field font-bold text-xs py-2 h-10">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tanggal Mulai</label>
                            <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="input-field font-bold text-xs py-2 h-10" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tanggal Selesai</label>
                            <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="input-field font-bold text-xs py-2 h-10" />
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
