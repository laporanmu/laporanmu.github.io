import { useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faUsers, faChalkboardTeacher, faSchool,
    faExclamationTriangle, faCalendarAlt,
    faClipboardList, faCalendarWeek, faShieldHalved,
} from "@fortawesome/free-solid-svg-icons"

const REPORTS_ITEMS = [
    { to: "/raport", label: "Raport Bulanan", icon: faClipboardList, desc: "Nilai & perilaku per bulan", color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
    { to: "/absensi", label: "Absensi Bulanan", icon: faCalendarWeek, desc: "Rekap kehadiran per bulan", color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
    { to: "/poin", label: "Poin Siswa", icon: faShieldHalved, desc: "Pelanggaran & prestasi siswa", color: "bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400" },
]

const MASTER_ITEMS = [
    { to: "/master/students", label: "Data Siswa", icon: faUsers, color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
    { to: "/master/teachers", label: "Data Guru", icon: faChalkboardTeacher, color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
    { to: "/master/classes", label: "Data Kelas", icon: faSchool, color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
    { to: "/master/violations", label: "Jenis Pelanggaran", icon: faExclamationTriangle, color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
    { to: "/master/academic-years", label: "Tahun Pelajaran", icon: faCalendarAlt, color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
]

function Section({ title, items, onNavigate }) {
    return (
        <>
            <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{title}</p>
            </div>
            <div className="px-2 pb-1">
                {items.map((it) => (
                    <button key={it.to} onClick={() => onNavigate(it.to)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${it.color}`}>
                            <FontAwesomeIcon icon={it.icon} className="text-sm" />
                        </div>
                        <div className="text-left min-w-0">
                            <div className="text-[13px] font-bold text-[var(--color-text)] leading-tight">{it.label}</div>
                            {it.desc && <div className="text-[10px] text-[var(--color-text-muted)]">{it.desc}</div>}
                        </div>
                    </button>
                ))}
            </div>
        </>
    )
}

export default function MasterSheet({ isOpen, onClose }) {
    const navigate = useNavigate()

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => { document.body.style.overflow = prev }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => e.key === "Escape" && onClose?.()
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const handleNav = (to) => { onClose?.(); navigate(to) }

    return createPortal(
        <div className="fixed inset-0 z-[100000]" onClick={onClose}>
            <div className="absolute inset-0 bg-black/35" />
            <div className="absolute left-0 right-0 bottom-0 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
                <div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">

                    {/* Grabber */}
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="h-1 w-10 rounded-full bg-gray-300/80 dark:bg-gray-700/80" />
                    </div>

                    <Section title="Laporan & Rekap" items={REPORTS_ITEMS} onNavigate={handleNav} />
                    <div className="h-px bg-[var(--color-border)] mx-4 my-1" />
                    <Section title="Master Data" items={MASTER_ITEMS} onNavigate={handleNav} />

                    <div className="h-3" />
                </div>
            </div>
        </div>,
        document.body
    )
}