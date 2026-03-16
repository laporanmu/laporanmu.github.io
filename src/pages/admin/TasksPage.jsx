import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faServer, faPlay, faStop, faCircleCheck, faCircleXmark,
    faRotateRight, faClockRotateLeft, faTriangleExclamation,
    faBolt, faClock, faFilePdf, faBroom, faChartLine, faFileLines,
    faSpinner, faTrashAlt, faDatabase, faHistory, faFilter, faXmark
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'

const INITIAL_TASKS = [
    {
        id: 'sync_stats',
        name: 'Sinkronisasi Statistik',
        desc: 'Menghitung ulang total poin, rata-rata kelas, dan ranking untuk seluruh siswa.',
        icon: faChartLine, color: 'text-indigo-500', bg: 'bg-indigo-500/10',
        status: 'idle', lastRun: '2 jam lalu', duration: '—', progress: 0
    },
    {
        id: 'cleanup_orphans',
        name: 'Pembersihan Data Orphan',
        desc: 'Menghapus log gerbang dan poin yang tidak memiliki entri siswa yang valid.',
        icon: faBroom, color: 'text-amber-500', bg: 'bg-amber-500/10',
        status: 'idle', lastRun: '1 hari lalu', duration: '—', progress: 0
    },
    {
        id: 'rotate_logs',
        name: 'Rotasi Audit Logs',
        desc: 'Mengarsipkan audit logs lama (di atas 45 hari) ke tabel arsip untuk menjaga performa query.',
        icon: faClockRotateLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10',
        status: 'idle', lastRun: '5 hari lalu', duration: '—', progress: 0
    },
]

export default function TasksPage() {
    const { addToast } = useToast()
    const [tasks, setTasks] = useState(INITIAL_TASKS)
    const [logs, setLogs] = useState([
        { id: 1, task: 'sync_stats', status: 'success', time: '10:15', msg: 'Sukses sinkron 420 siswa' },
        { id: 2, task: 'cleanup_orphans', status: 'success', time: 'Kemarin', msg: '12 data orphan dibersihkan' },
        { id: 3, task: 'rotate_logs', status: 'error', time: '2 hari lalu', msg: 'Timeout: Koneksi database sibuk' },
    ])
    const [searchLog, setSearchLog] = useState('')

    const runTask = async (id) => {
        const tObj = tasks.find(t => t.id === id)
        if (!tObj) return

        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'running', progress: 0 } : t))
        const startTime = Date.now()

        // Real functional logic placeholder (simulation of complex logic)
        try {
            // STEP 1: Initialization
            setTasks(prev => prev.map(t => t.id === id ? { ...t, progress: 10 } : t))
            await new Promise(r => setTimeout(r, 600))

            // STEP 2: Main Processing
            setTasks(prev => prev.map(t => t.id === id ? { ...t, progress: 40 } : t))
            await new Promise(r => setTimeout(r, 1000))

            // STEP 3: Verification
            setTasks(prev => prev.map(t => t.id === id ? { ...t, progress: 85 } : t))
            await new Promise(r => setTimeout(r, 800))

            const duration = ((Date.now() - startTime) / 1000).toFixed(1) + 's'
            const msg = `Berhasil dieksekusi dalam ${duration}.`

            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'success', progress: 100, lastRun: 'Baru saja', duration } : t))
            setLogs(prev => [{ id: Date.now(), task: id, status: 'success', time: 'Sekarang', msg: `Selesai (${duration})` }, ...prev])
            addToast(`Task "${tObj.name}" berhasil!`, 'success')

        } catch (err) {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'error', progress: 0 } : t))
            setLogs(prev => [{ id: Date.now(), task: id, status: 'error', time: 'Sekarang', msg: err?.message || 'Error' }, ...prev])
            addToast('Task gagal: ' + err.message, 'error')
        }
    }

    const cancelTask = (id) => {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'idle', progress: 0 } : t))
        addToast('Task dihentikan oleh user', 'info')
    }

    const filteredLogs = logs.filter(l =>
        tasks.find(t => t.id === l.task)?.name.toLowerCase().includes(searchLog.toLowerCase()) ||
        l.msg.toLowerCase().includes(searchLog.toLowerCase())
    )

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
                    <div className="lg:col-span-2 space-y-6">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tersedia untuk Trigger</span>
                                <div className="h-px bg-[var(--color-border)] flex-1" />
                            </div>
                            {tasks.map(task => (
                                <div key={task.id} className={`glass rounded-[2rem] border transition-all duration-300 ${task.status === 'running' ? 'border-[var(--color-primary)] ring-4 ring-[var(--color-primary)]/5 p-6' : 'border-[var(--color-border)] p-5 hover:border-[var(--color-text-muted)]/30'}`}>
                                    {task.status === 'running' && (
                                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-[var(--color-surface-alt)] overflow-hidden rounded-t-[2rem]">
                                            <div
                                                className="h-full bg-[var(--color-primary)] transition-all duration-700 ease-out relative"
                                                style={{ width: `${task.progress}%` }}
                                            >
                                                <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/30 animate-pulse" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${task.bg}`}>
                                                <FontAwesomeIcon icon={task.icon} className={`text-2xl ${task.color} ${task.status === 'running' ? 'animate-bounce' : ''}`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-[15px] font-black text-[var(--color-text)] leading-tight">{task.name}</h2>
                                                    {task.status === 'running' && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[9px] font-black uppercase tracking-tighter animate-pulse"><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Sedang Diproses</span>}
                                                </div>
                                                <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium max-w-md">{task.desc}</p>

                                                <div className="flex items-center gap-4 mt-3">
                                                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                        <FontAwesomeIcon icon={faClockRotateLeft} className="opacity-60" />
                                                        Terakhir: <span className="text-[var(--color-text)]">{task.lastRun}</span>
                                                    </div>
                                                    {task.duration !== '—' && (
                                                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                                            <FontAwesomeIcon icon={faBolt} className="opacity-60" />
                                                            Durasi: <span className="text-[var(--color-text)]">{task.duration}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            {task.status === 'running' ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-[14px] font-black tabular-nums text-[var(--color-primary)]">{task.progress}%</span>
                                                    <button onClick={() => cancelTask(task.id)} className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all transform active:scale-90 flex items-center justify-center shadow-lg shadow-rose-500/10">
                                                        <FontAwesomeIcon icon={faXmark} className="text-sm" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => runTask(task.id)} className="group h-11 px-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] text-[12px] font-black hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95">
                                                    <div className="w-7 h-7 rounded-lg bg-[var(--color-surface-alt)] flex items-center justify-center group-hover:bg-[var(--color-primary)]/10 transition-colors">
                                                        <FontAwesomeIcon icon={faPlay} className="text-[9px] group-hover:scale-125 transition-transform" />
                                                    </div>
                                                    Run Task
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </section>

                        {/* Recent History / Logs */}
                        <section className="glass rounded-[2rem] border border-[var(--color-border)] overflow-hidden">
                            <div className="p-5 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-slate-500/10 text-slate-500 flex items-center justify-center">
                                        <FontAwesomeIcon icon={faHistory} />
                                    </div>
                                    <h3 className="font-black text-sm text-[var(--color-text)]">Audit Log Eksekusi</h3>
                                </div>
                                <div className="relative">
                                    <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Cari log..."
                                        value={searchLog}
                                        onChange={e => setSearchLog(e.target.value)}
                                        className="h-8 pl-8 pr-3 w-32 sm:w-48 text-[11px] font-medium bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl outline-none focus:border-[var(--color-primary)] transition-all"
                                    />
                                </div>
                            </div>
                            <div className="divide-y divide-[var(--color-border)] max-h-[400px] overflow-y-auto">
                                {filteredLogs.length === 0 ? (
                                    <div className="p-10 text-center text-[var(--color-text-muted)] text-[11px] font-bold">
                                        Tidak ada log yang sesuai pencarian
                                    </div>
                                ) : (
                                    filteredLogs.map(log => {
                                        const taskInfo = tasks.find(t => t.id === log.task)
                                        return (
                                            <div key={log.id} className="p-4 flex items-center justify-between transition-colors hover:bg-[var(--color-surface-alt)]/20">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        <FontAwesomeIcon icon={log.status === 'success' ? faCircleCheck : faCircleXmark} className="text-xs" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-[var(--color-text)]">{taskInfo?.name || 'Unknown Task'}</p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{log.msg}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">{log.time}</p>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </section>
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
