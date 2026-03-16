import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faServer, faPlay, faStop, faCircleCheck, faCircleXmark,
    faRotateRight, faClockRotateLeft, faTriangleExclamation,
    faBolt, faClock, faFilePdf
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'

const INITIAL_TASKS = [
    {
        id: 'calc_grades',
        name: 'Recalculate Averages',
        desc: 'Menghitung ulang rata-rata nilai seluruh siswa bulan ini',
        icon: faBolt, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        status: 'idle', lastRun: '2 jam lalu', duration: '4.2s', progress: 0
    },
    {
        id: 'send_notif',
        name: 'Mass WhatsApp Broadcast',
        desc: 'Kirim notifikasi pesan WhatsApp yang tertunda ke wali santri',
        icon: faWhatsapp, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        status: 'idle', lastRun: 'Selesai', duration: '—', progress: 0
    },
    {
        id: 'pdf_gen',
        name: 'Generate Raport PDFs',
        desc: 'Buat file PDF secara massal sebelum dibagikan',
        icon: faFilePdf, color: 'text-rose-500', bg: 'bg-rose-500/10',
        status: 'idle', lastRun: 'Belum pernah', duration: '—', progress: 0
    },
]

export default function TasksPage() {
    const { addToast } = useToast()
    const [tasks, setTasks] = useState(INITIAL_TASKS)

    const runTask = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'running', progress: 0 } : t))

        // Simulasi progress
        const interval = setInterval(() => {
            setTasks(prev => {
                const task = prev.find(t => t.id === id)
                if (!task || task.status !== 'running') {
                    clearInterval(interval)
                    return prev
                }

                const newProgress = task.progress + Math.floor(Math.random() * 15) + 5

                if (newProgress >= 100) {
                    clearInterval(interval)
                    addToast(`${task.name} selesai dieksekusi`, 'success')
                    return prev.map(t => t.id === id ? { ...t, status: 'success', progress: 100, lastRun: 'Baru saja', duration: 'Selesai' } : t)
                }

                return prev.map(t => t.id === id ? { ...t, progress: newProgress } : t)
            })
        }, 800)
    }

    const cancelTask = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'idle', progress: 0 } : t))
        addToast('Task dihentikan', 'info')
    }

    return (
        <DashboardLayout title="Background Tasks">
            <div className="p-4 md:p-6 space-y-6 min-h-[80vh]">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Admin" items={['Admin', 'Background Tasks']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Background Tasks</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 uppercase tracking-widest">Edge Functions</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Picu fungsi komputasi berat secara manual tanpa menunggu jadwal cron.
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Main Tasks List */}
                    <div className="lg:col-span-2 space-y-4">
                        {tasks.map(task => (
                            <div key={task.id} className="glass rounded-[1.5rem] border border-[var(--color-border)] p-5 relative overflow-hidden">
                                {task.status === 'running' && (
                                    <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-border)]">
                                        <div className="h-full bg-[var(--color-primary)] transition-all duration-300" style={{ width: `${task.progress}%` }} />
                                    </div>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${task.bg}`}>
                                            <FontAwesomeIcon icon={task.icon} className={`text-xl ${task.color}`} />
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-black text-[var(--color-text)] leading-tight">{task.name}</h2>
                                            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{task.desc}</p>

                                            <div className="flex items-center gap-3 mt-2.5">
                                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                    <FontAwesomeIcon icon={faClockRotateLeft} />
                                                    {task.lastRun}
                                                </div>
                                                {task.status === 'success' && (
                                                    <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-500">
                                                        <FontAwesomeIcon icon={faCircleCheck} /> Success
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        {task.status === 'running' ? (
                                            <>
                                                <span className="text-[11px] font-black tabular-nums">{task.progress}%</span>
                                                <button onClick={() => cancelTask(task.id)} className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center">
                                                    <FontAwesomeIcon icon={faStop} />
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => runTask(task.id)} className="h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[12px] font-black hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm">
                                                <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                                                Run Trigger
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Sidebar Queue Info */}
                    <div className="space-y-4">
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <FontAwesomeIcon icon={faClock} className="text-[var(--color-text-muted)] text-lg" />
                                <h3 className="font-black text-sm text-[var(--color-text)]">Jadwal Otomatis (Cron)</h3>
                            </div>
                            <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-[var(--color-border)] ml-1 pl-6">
                                {[
                                    { time: '00:00', label: 'Backup Database Harian' },
                                    { time: '02:00', label: 'Sinkronisasi Absensi Mesin' },
                                    { time: 'Setiap jam', label: 'Proses Antrean WhatsApp' },
                                ].map((c, i) => (
                                    <div key={i} className="relative">
                                        <div className="absolute -left-[29px] top-1.5 w-2 h-2 rounded-full bg-[var(--color-primary)] ring-4 ring-[var(--color-surface)]" />
                                        <p className="text-[11px] font-black text-[var(--color-primary)]">{c.time}</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{c.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600/90 text-[11px] leading-relaxed flex gap-3">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                            <p>Menjalankan fungsi secara manual dapat memberatkan database. Pastikan tidak ada user lain yang sedang melakukan ekspor data masif.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
