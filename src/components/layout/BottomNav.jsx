import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faHouse,
    faTableList,
    faClockRotateLeft,
    faCog,
} from "@fortawesome/free-solid-svg-icons"
import MasterSheet from "./MasterSheet"

const LOGS_ROUTE = "/logs"

export default function BottomNav() {
    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const navigate = useNavigate()

    const Item = ({ to, icon, label }) => (
        <NavLink to={to}
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
                        <div className="grid grid-cols-4">
                            <Item to="/dashboard" icon={faHouse} label="Home" />

                            {/* Menu — buka bottom sheet (Reports + Master) */}
                            <button
                                onClick={() => setIsSheetOpen(true)}
                                className="py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-indigo-600 transition"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faTableList} className="text-base" />
                                <span className="tracking-tight">Menu</span>
                            </button>

                            {/* History */}
                            <button
                                onClick={() => navigate(LOGS_ROUTE)}
                                className="py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold text-[var(--color-text-muted)] hover:text-indigo-600 transition"
                                type="button"
                            >
                                <FontAwesomeIcon icon={faClockRotateLeft} className="text-base" />
                                <span className="tracking-tight">History</span>
                            </button>

                            <Item to="/settings" icon={faCog} label="Setting" />
                        </div>
                    </div>
                </div>
            </nav>

            <MasterSheet isOpen={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
        </>
    )
}