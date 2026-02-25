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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Tahun Pelajaran</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola tahun pelajaran dan semester aktif dalam sistem.</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {years.map(year => (
                    <div key={year.id} className={`glass rounded-[1.5rem] p-5 transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden group ${year.isActive ? 'border-2 border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/10' : 'border border-[var(--color-border)]'}`}>
                        {year.isActive && (
                            <div className="absolute top-0 right-0">
                                <span className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-widest shadow-sm">AKTIF</span>
                            </div>
                        )}
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${year.isActive ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white ring-2 ring-[var(--color-primary)]/20 shadow-[var(--color-primary)]/30' : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                {year.name.slice(2, 4)}
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                                <h3 className="font-black text-lg text-[var(--color-text)] flex items-center gap-2 truncate leading-tight font-heading">
                                    {year.name}
                                </h3>
                                <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${year.isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>{year.semester} SEMESTER</p>
                                <div className="text-[10px] text-[var(--color-text-muted)] font-medium mt-2 flex items-center gap-1.5 opacity-80">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-border)]"></div>
                                    {year.startDate} <span className="text-[8px] opacity-70">hingga</span> {year.endDate}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-5 pt-4 border-t border-[var(--color-border)]">
                            {!year.isActive ? (
                                <button onClick={() => handleSetActive(year)} className="text-[10px] font-black text-[var(--color-primary)] hover:text-[var(--color-accent)] uppercase tracking-widest transition-colors py-1 flex items-center gap-1.5 group-hover:gap-2">
                                    Aktifkan Sekarang <FontAwesomeIcon icon={faPlus} className="text-[9px] transition-transform group-hover:rotate-90" />
                                </button>
                            ) : (
                                <div className="text-[10px] font-black text-[var(--color-primary)] opacity-80 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping absolute"></div>
                                    <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] relative"></div>
                                    Sistem Sedang Digunakan
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(year)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm" title="Edit">
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                                {!year.isActive && (
                                    <button onClick={() => handleDelete(year)} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Hapus">
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Update Tahun Pelajaran' : 'Tahun Pelajaran Baru'} size="sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Tahun Pelajaran</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. 2024/2025" className="input-field font-bold text-sm py-2.5 h-11" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Semester</label>
                        <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="select-field font-bold text-sm py-2 h-11">
                            <option value="Ganjil">Ganjil</option>
                            <option value="Genap">Genap</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Tanggal Mulai</label>
                            <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="input-field font-bold text-sm py-2 h-11" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Tanggal Selesai</label>
                            <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="input-field font-bold text-sm py-2 h-11" />
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
