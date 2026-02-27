import { useEffect } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faUsers,
    faChalkboardTeacher,
    faSchool,
    faExclamationTriangle,
    faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons"

const ITEMS = [
    { to: "/master/students", label: "Data Siswa", icon: faUsers },
    { to: "/master/teachers", label: "Data Guru", icon: faChalkboardTeacher },
    { to: "/master/classes", label: "Data Kelas", icon: faSchool },
    { to: "/master/violations", label: "Jenis Pelanggaran", icon: faExclamationTriangle },
    { to: "/master/academic-years", label: "Tahun Pelajaran", icon: faCalendarAlt },
]

export default function MasterSheet({ isOpen, onClose }) {
    const navigate = useNavigate()

    useEffect(() => {
        if (!isOpen) return
        const prev = document.body.style.overflow
        document.body.style.overflow = "hidden"
        return () => {
            document.body.style.overflow = prev
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const onKeyDown = (e) => e.key === "Escape" && onClose?.()
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const node = (
        <div className="fixed inset-0 z-[100000]" onClick={onClose}>
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/35" />

            {/* sheet */}
            <div
                className="absolute left-0 right-0 bottom-0 px-3 pb-3"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mx-auto max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden">
                    {/* grabber */}
                    <div className="flex justify-center pt-3">
                        <div className="h-1 w-10 rounded-full bg-gray-300/80 dark:bg-gray-700/80" />
                    </div>

                    <div className="px-4 pt-3 pb-2">
                        <div className="text-sm font-extrabold text-[var(--color-text)]">Master Data</div>
                        <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                            Pilih menu untuk mengelola data
                        </div>
                    </div>

                    <div className="px-2 pb-3">
                        {ITEMS.map((it) => (
                            <button
                                key={it.to}
                                onClick={() => {
                                    onClose?.()
                                    navigate(it.to)
                                }}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-[var(--color-surface-alt)] transition"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    <FontAwesomeIcon icon={it.icon} />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-[var(--color-text)]">{it.label}</div>
                                    <div className="text-[11px] text-[var(--color-text-muted)]">Buka halaman</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )

    return createPortal(node, document.body)
}