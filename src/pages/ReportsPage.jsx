import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSearch, faFilter, faFileExport, faEye, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/ui/Modal'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl font-bold">Laporan Perilaku</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium">Rekam dan pantau perilaku siswa secara real-time.</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-indigo-500/20 h-10 text-xs font-bold px-4">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">BUAT LAPORAN</span>
                </button>
            </div>

            <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl mb-5 p-3.5 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative font-normal">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari siswa atau jenis..."
                            className="input-field pl-10 h-10 text-xs"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-secondary h-10 px-4 text-xs font-bold uppercase tracking-widest"><FontAwesomeIcon icon={faFilter} className="mr-2" /> Filter</button>
                        <button className="btn btn-secondary h-10 px-4 text-xs font-bold uppercase tracking-widest"><FontAwesomeIcon icon={faFileExport} className="mr-2" /> Export</button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {filteredReports.map(report => (
                    <div key={report.id} className={`bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl p-3.5 shadow-sm border-l-4 transition-all hover:border-l-8 ${report.points > 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm ${report.points > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                    <FontAwesomeIcon icon={report.points > 0 ? faArrowUp : faArrowDown} className="text-xs" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[14px] text-gray-900 dark:text-white leading-tight">{report.student}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight mt-0.5">{report.class} • {report.type}</p>
                                    {report.notes && <p className="text-[11px] text-gray-500 italic mt-2 py-1.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-100 dark:border-gray-800">"{report.notes}"</p>}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${report.points > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-red-50 text-red-600 dark:bg-red-900/20'}`}>
                                    {report.points > 0 ? '+' : ''}{report.points} POIN
                                </span>
                                <div className="mt-2 space-y-0.5">
                                    <p className="text-[10px] text-gray-400 font-bold">{report.date} • {report.time}</p>
                                    <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest leading-none">OLEH {report.teacher}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Laporan Baru" size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Siswa</label>
                            <input
                                type="text"
                                value={formData.student}
                                onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                                placeholder="Ketik nama siswa..."
                                className="input-field font-bold text-xs py-2.5 h-10"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Kelas</label>
                            <input
                                type="text"
                                value={formData.class}
                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                placeholder="e.g. XII IPA 1"
                                className="input-field font-bold text-xs py-2.5 h-10"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Jenis Laporan</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="select-field font-bold text-xs py-2 h-10"
                            >
                                <option value="">Pilih jenis...</option>
                                {VIOLATION_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Catatan Tambahan (Opsional)</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Tambahkan informasi pendukung..."
                                className="textarea-field font-medium text-xs py-2.5"
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-10 px-6 uppercase tracking-widest">Batal</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-md shadow-indigo-500/20 py-2 text-xs h-10 uppercase tracking-widest">SIMPAN LAPORAN</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
