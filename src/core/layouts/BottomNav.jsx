import { useState, useEffect } from "react"
import { NavLink } from "react-router-dom"
import {
    Home,
    Compass,
    Layers,
    UserCog,
    Settings,
    Calendar,
    CreditCard,
    MoreHorizontal,
} from "lucide-react"
import { useAuth, useLanguage } from "@context"
import MasterSheet from "./MasterSheet"

// ─── Warna aktif ─────────────────────────────────────────────────────────────
const ACTIVE_COLOR = "text-indigo-600"
const INACTIVE_COLOR = "text-[var(--color-text-muted)]"

// ─── NavItem (route link) ────────────────────────────────────────────────────
function NavItem({ to, icon, label }) {
    const IconComp = icon
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `relative flex flex-col items-center justify-center gap-[3px] py-2.5 px-1 transition-colors duration-150
                 ${isActive ? ACTIVE_COLOR : INACTIVE_COLOR}`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Active pill indicator */}
                    <span
                        className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-indigo-600 transition-all duration-200
                            ${isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
                    />
                    <IconComp
                        className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`}
                        strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span className={`text-[9px] font-bold tracking-tight leading-none transition-all duration-150 ${isActive ? 'font-extrabold' : ''}`}>
                        {label}
                    </span>
                </>
            )}
        </NavLink>
    )
}

// ─── MenuButton (sheet trigger) ──────────────────────────────────────────────
function MenuButton({ icon, label, onClick, active = false }) {
    const IconComp = icon
    return (
        <button
            onClick={onClick}
            type="button"
            aria-label={`Buka menu ${label}`}
            className={`relative flex flex-col items-center justify-center gap-[3px] py-2.5 px-1 transition-colors duration-150
                ${active ? ACTIVE_COLOR : INACTIVE_COLOR}`}
        >
            {/* Active pill indicator */}
            <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-b-full bg-indigo-600 transition-all duration-200
                    ${active ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
            />
            <IconComp
                className={`w-5 h-5 transition-transform duration-150 ${active ? 'scale-110' : ''}`}
                strokeWidth={active ? 2.5 : 2}
            />
            <span className={`text-[9px] font-bold tracking-tight leading-none ${active ? 'font-extrabold' : ''}`}>
                {label}
            </span>
        </button>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function BottomNav() {
    // openSheet: null | 'boarding' | 'academic' | 'finance' | 'master' | 'admin' | 'more'
    const [openSheet, setOpenSheet] = useState(null)
    const [isVisible, setIsVisible] = useState(true)
    const { profile } = useAuth()
    const { t } = useLanguage()

    const role = profile?.role?.toLowerCase()
    const isAdminUp = ['developer', 'admin'].includes(role)
    const isSatpam = role === 'satpam'

    const open = (section) => setOpenSheet(section)
    const close = () => setOpenSheet(null)

    // ── Hide on Scroll ──
    useEffect(() => {
        let lastY = window.scrollY
        const handleScroll = () => {
            const currentY = window.scrollY
            const windowHeight = window.innerHeight
            const docHeight = document.documentElement.scrollHeight

            const isNearBottom = (windowHeight + currentY) >= (docHeight - 60)
            const isNearTop = currentY < 50
            const isScrollingUp = currentY < lastY
            const isScrollingDown = currentY > lastY

            if (isNearBottom || isNearTop || isScrollingUp) {
                setIsVisible(true)
            } else if (isScrollingDown && currentY > 100) {
                setIsVisible(false)
            }

            lastY = currentY
        }

        window.addEventListener("scroll", handleScroll, { passive: true })
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    return (
        <>
            <nav
                className={`lg:hidden fixed bottom-0 left-0 right-0 z-[200]
                    transition-transform duration-300 ease-in-out
                    ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
            >
                {/* Safe area padding for notched phones */}
                <div className="mx-auto max-w-lg px-3 pb-2">
                    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-xl shadow-[0_-4px_24px_rgba(15,23,42,0.10)] overflow-hidden">

                        {/* ── Admin / Developer: 5 col → Home | Kesantrian | Akademik | Keuangan | Lainnya ── */}
                        {isAdminUp && (
                            <div className="grid grid-cols-5">
                                <NavItem to="/dashboard" icon={Home} label={t('nav.dashboard')} />
                                <MenuButton icon={Compass} label={t('section.boarding')} onClick={() => open('boarding')} active={openSheet === 'boarding'} />
                                <MenuButton icon={Calendar} label={t('section.academic')} onClick={() => open('academic')} active={openSheet === 'academic'} />
                                <MenuButton icon={CreditCard} label={t('section.finance')} onClick={() => open('finance')} active={openSheet === 'finance'} />
                                <MenuButton
                                    icon={MoreHorizontal}
                                    label={t('ui.more')}
                                    onClick={() => open(openSheet === 'more' ? null : 'more')}
                                    active={openSheet === 'more'}
                                />
                            </div>
                        )}

                        {/* ── Satpam: 3 col → Home | Kesantrian | Setting ── */}
                        {isSatpam && (
                            <div className="grid grid-cols-3">
                                <NavItem to="/dashboard" icon={Home} label={t('nav.dashboard')} />
                                <MenuButton icon={Compass} label={t('section.boarding')} onClick={() => open('boarding')} active={openSheet === 'boarding'} />
                                <NavItem to="/settings" icon={Settings} label={t('nav.settings')} />
                            </div>
                        )}

                        {/* ── Staff: 5 col → Home | Kesantrian | Akademik | Keuangan | Master ── */}
                        {!isAdminUp && !isSatpam && (
                            <div className="grid grid-cols-5">
                                <NavItem to="/dashboard" icon={Home} label={t('nav.dashboard')} />
                                <MenuButton icon={Compass} label={t('section.boarding')} onClick={() => open('boarding')} active={openSheet === 'boarding'} />
                                <MenuButton icon={Calendar} label={t('section.academic')} onClick={() => open('academic')} active={openSheet === 'academic'} />
                                <MenuButton icon={CreditCard} label={t('section.finance')} onClick={() => open('finance')} active={openSheet === 'finance'} />
                                <MenuButton icon={Layers} label={t('section.master')} onClick={() => open('master')} active={openSheet === 'master'} />
                            </div>
                        )}

                    </div>
                </div>
            </nav>

            {/* MasterSheet: 'boarding' | 'academic' | 'finance' | 'master' | 'admin' */}
            <MasterSheet isOpen={openSheet !== null} section={openSheet} onClose={close} />
        </>
    )
}