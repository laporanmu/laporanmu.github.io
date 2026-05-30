import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronDown, faChevronRight } from "@fortawesome/free-solid-svg-icons"
import { useAuth } from "../../context/AuthContext"
import { useFeatureFlags } from "../../context/FeatureFlagsContext"
import { useLanguage } from "../../context/LanguageContext"
import {
    DASHBOARD_ITEM, NAV_GROUPS, filterNavItems,
} from "./navItems"
import { ChevronDown, Settings, LogOut, MessageSquare } from "lucide-react"

// ─── NavIcon Helper (Pure outline, lightweight and crisp) ───────────────────
function NavIcon({ icon, className = "" }) {
    if (!icon) return null
    const isLucide = typeof icon === 'function' || (typeof icon === 'object' && icon.render)
    if (isLucide) {
        const IconComponent = icon
        return <IconComponent className={className || "w-4 h-4"} strokeWidth={2} />
    }
    return <FontAwesomeIcon icon={icon} className={className} />
}

// ─── Avatar Helper Component ───────────────────────────────────────────────────
function Avatar({ url, name, size = "w-8 h-8", textSize = "text-xs", rounded = "rounded-xl" }) {
    const [imgError, setImgError] = useState(false)
    const letter = name?.charAt(0)?.toUpperCase() || 'U'
    const showImg = url && !imgError

    return (
        <div className={`${size} ${rounded} bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-extrabold shadow-sm overflow-hidden shrink-0`}>
            {showImg ? (
                <img
                    src={url}
                    alt={name || "Avatar"}
                    onError={() => setImgError(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className={textSize}>{letter}</span>
            )}
        </div>
    )
}

// ─── Sidebar Persistence ──────────────────────────────────────────────────────
const GROUPS_KEY = 'sidebar-groups-open'

function getInitialGroupsOpen() {
    try {
        const stored = localStorage.getItem(GROUPS_KEY)
        return stored ? JSON.parse(stored) : {
            boarding: true,
            academic: true,
            finance: true,
            master: true,
            admin: true
        }
    } catch {
        return {
            boarding: true,
            academic: true,
            finance: true,
            master: true,
            admin: true
        }
    }
}

// ─── Single Nav Item ──────────────────────────────────────────────────────────
function SidebarItem({ item, collapsed }) {
    const { tNav } = useLanguage()

    return (
        <NavLink
            to={item.to}
            end={item.to === '/dashboard' || item.to === '/admin'}
            className={({ isActive }) =>
                `group/item flex items-center rounded-xl text-[12.5px] font-semibold transition-all duration-300 relative min-w-0
                ${isActive
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]'}
                ${collapsed
                    ? 'w-10 h-10 justify-center p-2 mx-auto group-hover/sidebar:w-full group-hover/sidebar:px-2.5 group-hover/sidebar:py-[5px] group-hover/sidebar:gap-2.5 group-hover/sidebar:justify-start group-hover/sidebar:mx-0'
                    : 'w-full px-2.5 py-[5px] gap-2.5'}`
            }
        >
            {({ isActive }) => (
                <>
                    {/* Active indicator bar */}
                    {isActive && (
                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-[var(--color-primary)] transition-all duration-300
                            ${collapsed ? 'opacity-0 group-hover/sidebar:opacity-100' : 'opacity-100'}`}
                        />
                    )}

                    {/* Icon */}
                    <div className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200
                        ${isActive
                            ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                            : 'text-[var(--color-text-muted)] group-hover/item:text-[var(--color-text)]'}`}
                    >
                        <NavIcon icon={item.icon} className="w-4 h-4" />
                    </div>

                    {/* Label — animated slide/fade */}
                    <span className={`truncate leading-none text-left transition-all duration-300
                        ${collapsed ? 'w-0 opacity-0 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100 overflow-hidden' : 'w-auto opacity-100'}`}
                    >
                        {tNav(item)}
                    </span>
                </>
            )}
        </NavLink>
    )
}

// ─── Collapsible Group ────────────────────────────────────────────────────────
function SidebarGroup({ group, items, collapsed, isOpen, onToggle }) {
    const { tNav, tGroup } = useLanguage()
    const location = useLocation()

    // Auto-expand group if any child route is active
    const hasActiveChild = useMemo(() =>
        items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/')),
        [items, location.pathname]
    )

    const showChildren = isOpen || hasActiveChild

    return (
        <div className="relative group/grp flex flex-col">
            {/* Group Header Button */}
            <button
                type="button"
                onClick={collapsed ? undefined : onToggle}
                className={`flex items-center rounded-xl min-w-0 outline-none transition-all duration-300
                    ${collapsed
                        ? 'w-10 h-10 justify-center mx-auto hover:bg-[var(--color-surface-alt)] group-hover/sidebar:w-full group-hover/sidebar:gap-2 group-hover/sidebar:px-2.5 group-hover/sidebar:py-[5px] group-hover/sidebar:justify-start group-hover/sidebar:mx-0'
                        : 'w-full gap-2 px-2.5 py-[5px] text-[10px] font-black tracking-wider uppercase'}
                    ${(!collapsed && hasActiveChild)
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-text-muted)]/70 hover:text-[var(--color-text-muted)]'}`}
            >
                {/* Chevron icon — only visible when expanded */}
                <div className={`w-2.5 mr-0.5 flex items-center justify-center shrink-0 transition-all duration-300
                    ${collapsed ? 'w-0 opacity-0 group-hover/sidebar:w-2.5 group-hover/sidebar:opacity-100 overflow-hidden' : 'w-2.5 opacity-100'}`}
                >
                    <NavIcon
                        icon={showChildren ? faChevronDown : faChevronRight}
                        className="text-[7px] shrink-0"
                    />
                </div>

                {/* Group Icon — only visible when collapsed (hidden on hover sidebar) */}
                <div className={`w-5 flex items-center justify-center shrink-0 transition-all duration-300
                    ${collapsed ? 'w-5 opacity-100 group-hover/sidebar:w-0 group-hover/sidebar:opacity-0 group-hover:overflow-hidden' : 'w-0 opacity-0 overflow-hidden'}`}
                >
                    <NavIcon icon={group.icon} className="w-4 h-4" />
                </div>

                {/* Group Label — hidden when collapsed, shown when expanded or sidebar hover */}
                <span className={`truncate text-left leading-none transition-all duration-300
                    ${collapsed
                        ? 'w-0 opacity-0 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100 overflow-hidden text-[9px] font-black tracking-widest uppercase text-[var(--color-text-muted)]/70'
                        : 'text-[9px] font-black tracking-widest uppercase text-[var(--color-text-muted)]/70'}`}
                >
                    {tGroup(group.key, group.label)}
                </span>
            </button>

            {/* Vertical Submenu Items */}
            <div className={`pl-0.5 space-y-[1px] mt-0.5 transition-all duration-300 origin-top
                ${collapsed ? 'h-0 opacity-0 overflow-hidden group-hover/sidebar:h-auto group-hover/sidebar:opacity-100 group-hover/sidebar:mt-1' : ''}`}
            >
                {showChildren && items.map(item => (
                    <SidebarItem key={item.to} item={item} collapsed={collapsed} />
                ))}
            </div>
        </div>
    )
}

// ─── Main Sidebar Component ──────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }) {
    const { profile, signOut } = useAuth()
    const { flags } = useFeatureFlags()
    const { t, tNav, tNum, dir } = useLanguage()
    const role = profile?.role?.toLowerCase() || ''
    const navigate = useNavigate()

    const [statusOpen, setStatusOpen] = useState(false)
    const [isOnline, setIsOnline] = useState(navigator.onLine)
    const footerRef = useRef(null)

    // Handle online/offline network listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Close status popover when clicking outside
    useEffect(() => {
        const onClick = (e) => {
            if (footerRef.current && !footerRef.current.contains(e.target)) {
                setStatusOpen(false)
            }
        }
        window.addEventListener('mousedown', onClick)
        return () => window.removeEventListener('mousedown', onClick)
    }, [])

    // Main navigation scroll container reference
    const navRef = useRef(null)

    // Restore scroll top instantly before layout paint
    useLayoutEffect(() => {
        try {
            const savedScroll = sessionStorage.getItem('sidebar-scroll-top')
            if (savedScroll && navRef.current) {
                navRef.current.scrollTop = Number(savedScroll)
            }
        } catch { /* ignore */ }
    }, [collapsed])

    // Save scroll position on user scrolling
    const handleScroll = useCallback((e) => {
        try {
            sessionStorage.setItem('sidebar-scroll-top', String(e.currentTarget.scrollTop))
        } catch { /* ignore */ }
    }, [])

    // Groups open/close state
    const [groupsOpen, setGroupsOpen] = useState(getInitialGroupsOpen)

    // Persist groups open state
    useEffect(() => {
        try { localStorage.setItem(GROUPS_KEY, JSON.stringify(groupsOpen)) }
        catch { /* ignore */ }
    }, [groupsOpen])

    const toggleGroup = useCallback((key) => {
        setGroupsOpen(prev => ({ ...prev, [key]: !prev[key] }))
    }, [])

    // Filter groups based on role
    const visibleGroups = useMemo(() => {
        return NAV_GROUPS.filter(group => {
            if (group.requireRoles && !group.requireRoles.includes(role)) return false
            if (group.hideForRoles && group.hideForRoles.includes(role)) return false
            return true
        })
    }, [role])

    // Class styles based on state
    const sidebarW = collapsed
        ? 'w-[56px] hover:w-[220px] shadow-none hover:shadow-[10px_0_40px_-6px_rgba(0,0,0,0.12)] dark:hover:shadow-[10px_0_40px_-6px_rgba(0,0,0,0.45)]'
        : 'w-[220px]'

    const isRtl = dir === 'rtl'

    return (
        <aside
            className={`hidden lg:flex flex-col fixed top-0 h-screen z-50 bg-[var(--color-surface)] ${sidebarW}
                transition-all duration-300 ease-in-out group/sidebar
                ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} border-[var(--color-border)]`}
        >
            {/* ── Logo Section ── */}
            <div className={`shrink-0 border-b border-[var(--color-border)] ${collapsed ? 'px-2 py-3 group-hover/sidebar:px-3.5 group-hover/sidebar:py-3' : 'px-3.5 py-3'} transition-all duration-300`}>
                <div className={`flex items-center ${collapsed ? 'justify-center group-hover/sidebar:justify-start group-hover/sidebar:gap-2.5' : 'gap-2.5'} transition-all duration-300`}>
                    {/* Logo badge */}
                    <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-black flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20 w-8 h-8 text-xs">
                        <span>L</span>
                    </div>

                    {/* Text — hidden smoothly, expands on hover */}
                    <div className={`min-w-0 flex flex-col transition-all duration-300
                        ${collapsed ? 'w-0 opacity-0 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100 overflow-hidden' : 'w-auto opacity-100'}`}
                    >
                        <p className="text-[13px] font-extrabold text-[var(--color-text)] leading-tight truncate font-heading">
                            Laporanmu
                        </p>
                        <p className="text-[8px] font-bold tracking-widest uppercase text-[var(--color-text-muted)] whitespace-nowrap mt-0.5">
                            {tNum("TA 2026/2027")}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Navigation ── */}
            <nav
                ref={navRef}
                onScroll={handleScroll}
                className={`flex-1 overflow-y-auto overflow-x-hidden py-2.5 space-y-0.5 scrollbar-none transition-all duration-300
                    ${collapsed ? 'px-1.5 group-hover/sidebar:px-2.5' : 'px-2.5'}`}
            >
                {/* Dashboard — always first, standalone */}
                <SidebarItem item={DASHBOARD_ITEM} collapsed={collapsed} />

                {/* Divider */}
                <div className={`h-px bg-[var(--color-border)]/60 !my-2 transition-all duration-300
                    ${collapsed ? 'mx-1 group-hover/sidebar:mx-1.5' : 'mx-1.5'}`}
                />

                {/* Grouped nav items */}
                {visibleGroups.map(group => {
                    const filteredItems = filterNavItems(group.items, flags, role)
                    if (filteredItems.length === 0) return null

                    return (
                        <SidebarGroup
                            key={group.key}
                            group={group}
                            items={filteredItems}
                            collapsed={collapsed}
                            isOpen={groupsOpen[group.key] ?? true}
                            onToggle={() => toggleGroup(group.key)}
                        />
                    )
                })}
            </nav>

            {/* ── Footer — user profile status ── */}
            <div className="shrink-0 border-t border-[var(--color-border)] px-2 py-2 flex items-center justify-center relative transition-all duration-300" ref={footerRef}>
                {statusOpen && (
                    <div className={`absolute bottom-[52px] z-50 w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-3 flex flex-col gap-2.5 animate-[fadeIn_0.15s_ease-out]
                        ${dir === 'rtl' ? 'right-2' : 'left-2'}`}
                    >
                        {/* User Identity Details */}
                        <div className="flex items-center gap-3 border-b border-[var(--color-border)]/60 pb-2.5 mb-1">
                            <Avatar url={profile?.avatar_url} name={profile?.name} size="w-9 h-9" />
                            <div className="min-w-0 flex-1">
                                <h4 className="text-[11px] font-black text-[var(--color-text)] truncate">{profile?.name || "Pengguna"}</h4>
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5 truncate">{profile?.role || "Staf"}</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={() => {
                                    setStatusOpen(false);
                                    navigate("/settings");
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all group ${dir === 'rtl' ? 'text-right' : 'text-start'}`}
                                type="button"
                            >
                                <Settings className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)] transition-colors shrink-0" strokeWidth={2} />
                                <span className="truncate">{t("ui.settings_account")}</span>
                            </button>

                            <a
                                href="https://wa.me/6281230660013?text=Halo%20Developer%20LaporanMu,%20saya%20butuh%20bantuan%20terkait%20sistem..."
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--color-text)] hover:bg-emerald-500/10 hover:text-emerald-600 transition-all group ${dir === 'rtl' ? 'text-right' : 'text-start'}`}
                            >
                                <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-emerald-500 transition-colors shrink-0" strokeWidth={2} />
                                <span className="truncate">{t("ui.support")}</span>
                            </a>

                            <div className="h-px bg-[var(--color-border)]/60 my-1 mx-1.5" />

                            <button
                                onClick={async () => {
                                    setStatusOpen(false);
                                    await signOut();
                                    navigate("/login");
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-500/10 transition-all group ${dir === 'rtl' ? 'text-right' : 'text-start'}`}
                                type="button"
                            >
                                <LogOut className="w-4 h-4 text-rose-500 transition-colors shrink-0" strokeWidth={2} />
                                <span className="truncate">{t("ui.logout")}</span>
                            </button>
                        </div>
                    </div>
                )}

                {collapsed ? (
                    <>
                        {/* Minimalist collapsed avatar — hidden on hover */}
                        <div className="group-hover/sidebar:hidden transition-all duration-300">
                            <button
                                onClick={() => setStatusOpen(prev => !prev)}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border border-transparent hover:border-[var(--color-border)]/50 hover:bg-[var(--color-surface-alt)] relative
                                    ${statusOpen ? 'bg-[var(--color-surface-alt)] border-[var(--color-primary)]/20' : ''}`}
                                aria-label="Profil Pengguna"
                                type="button"
                            >
                                <Avatar url={profile?.avatar_url} name={profile?.name} size="w-7 h-7" textSize="text-[10px]" rounded="rounded-lg" />
                                <span className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-[var(--color-surface)] shrink-0
                                    ${isOnline ? 'bg-emerald-500 animate-[pulse_2s_infinite]' : 'bg-rose-500 animate-[pulse_2s_infinite]'}`}
                                />
                            </button>
                        </div>

                        {/* Expanded full user panel — shown on hover */}
                        <div className="hidden group-hover/sidebar:block w-full transition-all duration-300">
                            <button
                                onClick={() => setStatusOpen(prev => !prev)}
                                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group border border-transparent hover:border-[var(--color-border)]/50 text-left gap-2
                                    ${statusOpen ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)]/50' : ''}`}
                                type="button"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative">
                                        <Avatar url={profile?.avatar_url} name={profile?.name} size="w-8 h-8" textSize="text-[11px]" rounded="rounded-xl" />
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--color-surface)] shrink-0
                                            ${isOnline ? 'bg-emerald-500 animate-[pulse_2s_infinite]' : 'bg-rose-500 animate-[pulse_2s_infinite]'}`}
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-extrabold text-[var(--color-text)] leading-tight truncate">
                                            {profile?.name || "Pengguna"}
                                        </p>
                                        <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider leading-none mt-0.5 truncate">
                                            {profile?.role || "Staf"}
                                        </p>
                                    </div>
                                </div>
                                <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 ${statusOpen ? 'rotate-180 opacity-100 text-[var(--color-primary)]' : ''}`} />
                            </button>
                        </div>
                    </>
                ) : (
                    <button
                        onClick={() => setStatusOpen(prev => !prev)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group border border-transparent hover:border-[var(--color-border)]/50 text-left gap-2
                            ${statusOpen ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)]/50' : ''}`}
                        type="button"
                    >
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative">
                                <Avatar url={profile?.avatar_url} name={profile?.name} size="w-8 h-8" textSize="text-[11px]" rounded="rounded-xl" />
                                <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[var(--color-surface)] shrink-0
                                    ${isOnline ? 'bg-emerald-500 animate-[pulse_2s_infinite]' : 'bg-rose-500 animate-[pulse_2s_infinite]'}`}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-extrabold text-[var(--color-text)] leading-tight truncate">
                                    {profile?.name || "Pengguna"}
                                </p>
                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider leading-none mt-0.5 truncate">
                                    {profile?.role || "Staf"}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 ${statusOpen ? 'rotate-180 opacity-100 text-[var(--color-primary)]' : ''}`} />
                    </button>
                )}
            </div>
        </aside>
    )
}
