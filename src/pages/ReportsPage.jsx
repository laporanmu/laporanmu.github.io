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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Laporan Perilaku</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Rekam dan pantau perilaku siswa secara real-time.</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">BUAT LAPORAN</span>
                </button>
            </div>

            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative font-normal group">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm transition-colors group-focus-within:text-[var(--color-primary)]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari siswa atau jenis..."
                            className="input-field pl-11 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button className="btn btn-secondary h-11 px-5 text-xs font-bold uppercase tracking-widest rounded-xl"><FontAwesomeIcon icon={faFilter} className="mr-2 opacity-70" /> Filter</button>
                        <button className="btn btn-secondary h-11 px-5 text-xs font-bold uppercase tracking-widest rounded-xl"><FontAwesomeIcon icon={faFileExport} className="mr-2 opacity-70" /> Export</button>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredReports.map(report => (
                    <div key={report.id} className={`glass rounded-[1.25rem] p-5 border-l-[6px] transition-all hover:-translate-x-1 hover:shadow-md ${report.points > 0 ? 'border-l-[var(--color-success)] shadow-[var(--color-success)]/5' : 'border-l-[var(--color-danger)] shadow-[var(--color-danger)]/5'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${report.points > 0 ? 'bg-gradient-to-br from-[var(--color-success)] to-emerald-600' : 'bg-gradient-to-br from-[var(--color-danger)] to-rose-600'}`}>
                                    <FontAwesomeIcon icon={report.points > 0 ? faArrowUp : faArrowDown} className="text-lg opacity-90" />
                                </div>
                                <div className="pt-0.5">
                                    <h3 className="font-black text-base text-[var(--color-text)] leading-tight font-heading">{report.student}</h3>
                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1 opacity-80">{report.class} • {report.type}</p>
                                    {report.notes && <p className="text-xs text-[var(--color-text-muted)] italic mt-2.5 py-2 px-3.5 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)] opacity-90">"{report.notes}"</p>}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest border ${report.points > 0 ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20 shadow-[var(--color-success)]/10' : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20 shadow-[var(--color-danger)]/10'}`}>
                                    {report.points > 0 ? '+' : ''}{report.points} POIN
                                </span>
                                <div className="mt-3 space-y-1">
                                    <p className="text-[11px] text-[var(--color-text-muted)] font-bold">{report.date} • {report.time}</p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${report.points > 0 ? 'text-[var(--color-success)]/80' : 'text-[var(--color-danger)]/80'}`}>OLEH {report.teacher}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Laporan Baru" size="md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Nama Siswa</label>
                            <input
                                type="text"
                                value={formData.student}
                                onChange={(e) => setFormData({ ...formData, student: e.target.value })}
                                placeholder="Ketik nama siswa..."
                                className="input-field font-bold text-sm py-2.5 h-11"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Kelas</label>
                            <input
                                type="text"
                                value={formData.class}
                                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                                placeholder="e.g. XII IPA 1"
                                className="input-field font-bold text-sm py-2.5 h-11"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Jenis Laporan</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="select-field font-bold text-sm py-2 h-11"
                            >
                                <option value="">Pilih jenis...</option>
                                {VIOLATION_TYPES.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Catatan Tambahan (Opsional)</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Tambahkan informasi pendukung..."
                                className="textarea-field font-medium text-sm py-3"
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-11 px-6 uppercase tracking-widest rounded-xl">BATAL</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-lg shadow-[var(--color-primary)]/20 py-2 text-xs h-11 uppercase tracking-widest rounded-xl">SIMPAN LAPORAN</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
