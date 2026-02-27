import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faHouse,
    faClipboardList,
    faLayerGroup,
    faClockRotateLeft,
    faCog,
} from "@fortawesome/free-solid-svg-icons"
import MasterSheet from "./MasterSheet"

const LOGS_ROUTE = "/logs" // <-- ganti kalau route kamu beda

export default function BottomNav() {
    const [isMasterOpen, setIsMasterOpen] = useState(false)
    const navigate = useNavigate()

    const Item = ({ to, icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition
        ${isActive ? "text-indigo-600" : "text-[var(--color-text-muted)] hover:text-indigo-600"}`
            }
        >
            <FontAwesomeIcon icon={icon} className="text-base" />
            <span className="tracking-tight">{label}</span>
        </NavLink>
    )

    return (
        <>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[200]">
                <div className="mx-auto max-w-7xl px-3 pb-3">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                        <div className="grid grid-cols-5">
                            <Item to="/dashboard" icon={faHouse} label="Home" />
                            <Item to="/reports" icon={faClipboardList} label="Laporan" />

                            {/* Master - opens bottom sheet */}
                            <button
                                onClick={() => setIsMasterOpen(true)}
                                className="py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-indigo-600 transition"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faLayerGroup} className="text-base" />
                                <span className="tracking-tight">Master</span>
                            </button>

                            {/* Logs / Riwayat */}
                            <button
                                onClick={() => navigate(LOGS_ROUTE)}
                                className="py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-indigo-600 transition"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faClockRotateLeft} className="text-base" />
                                <span className="tracking-tight">Riwayat</span>
                            </button>

                            <Item to="/settings" icon={faCog} label="Setting" />
                        </div>
                    </div>
                </div>
            </nav>

            <MasterSheet isOpen={isMasterOpen} onClose={() => setIsMasterOpen(false)} />
        </>
    )
}