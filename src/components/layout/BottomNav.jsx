import { useState } from "react"
import { NavLink } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faHouse, faClipboardList, faLayerGroup, faUserGear, faCog,
} from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../../context/AuthContext"
import { useFeatureFlags } from "../../context/FeatureFlagsContext"
import MasterSheet from "./MasterSheet"

// Warna aktif konsisten dengan TopNav (indigo-600)
const ACTIVE = "text-indigo-600"
const INACTIVE = "text-[var(--color-text-muted)] hover:text-indigo-500"

// NavItem: pakai NavLink → active state otomatis + dot indicator
function NavItem({ to, icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors relative
                 ${isActive ? ACTIVE : INACTIVE}`
            }
        >
            {({ isActive }) => (
                <>
                    {isActive && (
                        <span className="absolute top-1.5 w-1 h-1 rounded-full bg-indigo-600" />
                    )}
                    <FontAwesomeIcon icon={icon} className="text-[17px]" />
                    <span className="tracking-tight leading-none">{label}</span>
                </>
            )}
        </NavLink>
    )
}

// MenuButton: non-route button, styling mirip NavItem
function MenuButton({ icon, label, onClick, active = false }) {
    return (
        <button
            onClick={onClick}
            type="button"
            className={`py-3 flex flex-col items-center justify-center gap-1 text-[10px] font-bold transition-colors relative ${active ? ACTIVE : INACTIVE}`}
        >
            {active && <span className="absolute top-1.5 w-1 h-1 rounded-full bg-indigo-600" />}
            <FontAwesomeIcon icon={icon} className="text-[17px]" />
            <span className="tracking-tight leading-none">{label}</span>
        </button>
    )
}

export default function BottomNav() {
    // openSheet: null | 'reports' | 'master' | 'admin'
    const [openSheet, setOpenSheet] = useState(null)
    const { profile } = useAuth()

    const role = profile?.role?.toLowerCase()
    const isAdminUp = ['developer', 'admin'].includes(role)
    const isSatpam = role === 'satpam'

    const open = (section) => setOpenSheet(section)
    const close = () => setOpenSheet(null)

    return (
        <>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[200]">
                <div className="mx-auto max-w-7xl px-3 pb-3">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.12)]">

                        {/* ── Admin / Developer: Home | Reports | Master | Admin ── */}
                        {isAdminUp && (
                            <div className="grid grid-cols-4">
                                <NavItem to="/dashboard" icon={faHouse} label="Home" />
                                <MenuButton icon={faClipboardList} label="Reports" onClick={() => open('reports')} active={openSheet === 'reports'} />
                                <MenuButton icon={faLayerGroup} label="Master" onClick={() => open('master')} active={openSheet === 'master'} />
                                <MenuButton icon={faUserGear} label="Admin" onClick={() => open('admin')} active={openSheet === 'admin'} />
                            </div>
                        )}

                        {/* ── Satpam: Home | Reports | Settings (3 col) ── */}
                        {isSatpam && (
                            <div className="grid grid-cols-3">
                                <NavItem to="/dashboard" icon={faHouse} label="Home" />
                                <MenuButton icon={faClipboardList} label="Reports" onClick={() => open('reports')} active={openSheet === 'reports'} />
                                <NavItem to="/settings" icon={faCog} label="Setting" />
                            </div>
                        )}

                        {/* ── Staff biasa: Home | Reports | Master | Settings ── */}
                        {!isAdminUp && !isSatpam && (
                            <div className="grid grid-cols-4">
                                <NavItem to="/dashboard" icon={faHouse} label="Home" />
                                <MenuButton icon={faClipboardList} label="Reports" onClick={() => open('reports')} active={openSheet === 'reports'} />
                                <MenuButton icon={faLayerGroup} label="Master" onClick={() => open('master')} active={openSheet === 'master'} />
                                <NavItem to="/settings" icon={faCog} label="Setting" />
                            </div>
                        )}

                    </div>
                </div>
            </nav>

            <MasterSheet isOpen={openSheet !== null} section={openSheet} onClose={close} />
        </>
    )
}