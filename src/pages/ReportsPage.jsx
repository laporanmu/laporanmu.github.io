import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSearch, faFilter, faFileExport, faEye, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'

const DEMO_REPORTS = [
    { id: 1, student: 'Ahmad Rizki Pratama', class: 'XII IPA 1', type: 'Terlambat', points: -5, teacher: 'Budi Santoso', date: '2024-01-20', time: '08:15', notes: 'Terlambat 15 menit' },
    { id: 2, student: 'Siti Aminah', class: 'XI IPS 2', type: 'Juara Lomba', points: 30, teacher: 'Sari Dewi', date: '2024-01-20', time: '10:00', notes: 'Juara 1 Olimpiade Matematika' },
    { id: 3, student: 'Budi Santoso', class: 'X MIPA 3', type: 'Tidak mengerjakan PR', points: -10, teacher: 'Ahmad Fauzi', date: '2024-01-19', time: '09:30', notes: '' },
    { id: 4, student: 'Dewi Lestari', class: 'XII IPA 2', type: 'Membantu Guru', points: 5, teacher: 'Rina Marlina', date: '2024-01-19', time: '11:00', notes: 'Membantu persiapan lab' },
]

const VIOLATION_TYPES = ['Terlambat', 'Tidak mengerjakan PR', 'Makan di kelas', 'Tidak memakai seragam lengkap', 'Berkelahi', 'Juara Kelas', 'Membantu Guru', 'Juara Lomba']

export default function ReportsPage() {
    const [reports, setReports] = useState(DEMO_REPORTS)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({ student: '', class: '', type: '', notes: '' })
    const { profile } = useAuth()
    const { addToast } = useToast()

    const filteredReports = reports.filter(r =>
        r.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleAdd = () => {
        setFormData({ student: '', class: '', type: '', notes: '' })
        setIsModalOpen(true)
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.student || !formData.type) {
            addToast('Siswa dan jenis pelanggaran wajib diisi', 'warning')
            return
        }

        const isNegative = !['Juara Kelas', 'Membantu Guru', 'Juara Lomba'].includes(formData.type)
        const points = isNegative ? -5 : 10 // Simplified; in real app, fetch from violation types

        const newReport = {
            id: Date.now(),
            student: formData.student,
            class: formData.class || 'XII IPA 1',
            type: formData.type,
            points,
            teacher: profile?.name || 'Unknown',
            date: new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
            notes: formData.notes,
        }
        setReports(prev => [newReport, ...prev])
        addToast('Laporan berhasil dibuat', 'success')
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Laporan Perilaku">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Laporan Perilaku</h1>
                    <p className="text-[var(--color-text-muted)]">Rekam dan pantau perilaku siswa</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <FontAwesomeIcon icon={faPlus} /> Buat Laporan
                </button>
            </div>

            <div className="card mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari siswa atau jenis..." className="input pl-10" />
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary"><FontAwesomeIcon icon={faFilter} /> Filter</button>
                        <button className="btn btn-secondary"><FontAwesomeIcon icon={faFileExport} /> Export</button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredReports.map(report => (
                    <div key={report.id} className={`card border-l-4 ${report.points > 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${report.points > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                    <FontAwesomeIcon icon={report.points > 0 ? faArrowUp : faArrowDown} />
                                </div>
                                <div>
                                    <h3 className="font-semibold">{report.student}</h3>
                                    <p className="text-sm text-[var(--color-text-muted)]">{report.class} • {report.type}</p>
                                    {report.notes && <p className="text-sm text-[var(--color-text-muted)] mt-1">"{report.notes}"</p>}
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`badge ${report.points > 0 ? 'badge-success' : 'badge-danger'}`}>
                                    {report.points > 0 ? '+' : ''}{report.points} poin
                                </span>
                                <p className="text-xs text-[var(--color-text-muted)] mt-1">{report.date} {report.time}</p>
                                <p className="text-xs text-[var(--color-text-muted)]">oleh {report.teacher}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Laporan Baru">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-2">Nama Siswa</label><input type="text" value={formData.student} onChange={(e) => setFormData({ ...formData, student: e.target.value })} placeholder="Ketik nama siswa..." className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">Kelas</label><input type="text" value={formData.class} onChange={(e) => setFormData({ ...formData, class: e.target.value })} placeholder="e.g. XII IPA 1" className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">Jenis</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="input"><option value="">Pilih jenis...</option>{VIOLATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-sm font-medium mb-2">Catatan (Opsional)</label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Tambahkan catatan..." className="input" rows={3} /></div>
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button><button type="submit" className="btn btn-primary">Simpan</button></div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
