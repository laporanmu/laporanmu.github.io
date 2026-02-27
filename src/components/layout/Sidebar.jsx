import { NavLink, useNavigate } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faHome,
    faClipboardList,
    faDatabase,
    faCog,
    faCode,
    faSignOutAlt,
    faChevronDown,
    faUsers,
    faChalkboardTeacher,
    faSchool,
    faExclamationTriangle,
    faCalendarAlt,
} from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useSidebar } from '../../context/SidebarContext'

const MENU_ITEMS = [
    { path: '/dashboard', icon: faHome, label: 'Dashboard' },
    { path: '/reports', icon: faClipboardList, label: 'Laporan' },
    {
        label: 'Master Data',
        icon: faDatabase,
        children: [
            { path: '/master/students', icon: faUsers, label: 'Data Siswa' },
            { path: '/master/teachers', icon: faChalkboardTeacher, label: 'Data Guru' },
            { path: '/master/classes', icon: faSchool, label: 'Data Kelas' },
            { path: '/master/violations', icon: faExclamationTriangle, label: 'Jenis Pelanggaran' },
            { path: '/master/academic-years', icon: faCalendarAlt, label: 'Tahun Pelajaran' },
        ],
    },
    { path: '/settings', icon: faCog, label: 'Pengaturan' },
]

const ADMIN_MENU = { path: '/developer', icon: faCode, label: 'Developer' }

/**
 * embedded=true  => desktop icon-rail (relative, no overlay, always collapsed)
 * embedded=false => mobile drawer (fixed + overlay), always expanded for usability
 */
export default function Sidebar({ isOpen, onClose, embedded = false }) {
    const { profile, signOut, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const { isCollapsed } = useSidebar()
    const navigate = useNavigate()

    // desktop rail: icon-only
    // mobile drawer: expanded
    const effectiveCollapsed = embedded ? true : false

    const [expandedMenus, setExpandedMenus] = useState(['Master Data'])
    const [hoveredSubmenu, setHoveredSubmenu] = useState(null)
    const [submenuPos, setSubmenuPos] = useState({ top: 0 })

    const toggleMenu = (label) => {
        if (effectiveCollapsed) return
        setExpandedMenus((prev) =>
            prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
        )
    }

    const handleLogout = async () => {
        await signOut()
        addToast('Berhasil logout!', 'success')
        navigate('/login')
    }

    const menuItems = profile?.role === 'admin' ? [...MENU_ITEMS, ADMIN_MENU] : MENU_ITEMS

    return (
        <>
            {/* Overlay: only for mobile drawer */}
            {!embedded && isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
            )}

            <aside
                className={`
          ${embedded ? 'relative h-full z-[80]' : 'fixed top-0 left-0 h-full z-50'}
          bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col
          ${embedded ? '' : (isOpen ? 'translate-x-0' : '-translate-x-full')}
          transition-all duration-300 ease-in-out
          ${embedded ? 'w-[72px]' : 'w-[240px]'}
          ${embedded ? 'm-3 rounded-[22px] border shadow-sm' : ''}
        `}
            >
                {/* Logo */}
                <div
                    className={`h-14 flex items-center border-b border-[var(--color-border)] overflow-hidden
            ${effectiveCollapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}
                >
                    <div
                        className={`rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0
              ${effectiveCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}
                        title="Laporanmu"
                    >
                        <span className={`text-white font-black ${effectiveCollapsed ? 'text-sm' : 'text-xs'}`}>L</span>
                    </div>

                    {!effectiveCollapsed && (
                        <div className="min-w-0">
                            <h1 className="font-bold text-sm text-[var(--color-text)] leading-none truncate">Laporanmu</h1>
                            <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5 truncate">
                                Behavior System
                            </p>
                        </div>
                    )}
                </div>

                {/* Demo Mode Banner (only drawer) */}
                {isDemoMode && !effectiveCollapsed && (
                    <div className="mx-3 mt-3 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wider">
                            🎮 MODE DEMO
                        </p>
                    </div>
                )}

                {/* Menu */}
                <nav className={`flex-1 overflow-y-auto py-3 ${effectiveCollapsed ? 'px-2' : 'px-2.5'}`}>
                    <ul className="space-y-0.5">
                        {menuItems.map((item, idx) => (
                            <li
                                key={idx}
                                className="relative"
                                onMouseEnter={(e) => {
                                    if (!effectiveCollapsed || !item.children) return
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    // 8px biar turun dikit
                                    setSubmenuPos({ top: rect.top + 8 })
                                    setHoveredSubmenu(item.label)
                                }}
                                onMouseLeave={() => {
                                    if (!effectiveCollapsed) return
                                    setHoveredSubmenu(null)
                                }}
                            >
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={`w-full flex items-center rounded-xl
                        text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]
                        hover:text-indigo-600 transition-all font-bold group/btn
                        ${effectiveCollapsed ? 'justify-center px-2.5 py-2.5' : 'justify-between px-3 py-2'}`}
                                            title={effectiveCollapsed ? item.label : ''}
                                        >
                                            <span className={`flex items-center ${effectiveCollapsed ? '' : 'gap-2.5'}`}>
                                                <FontAwesomeIcon icon={item.icon} className="w-4 text-[13px] group-hover/btn:scale-110 transition-transform" />
                                                {!effectiveCollapsed && <span className="text-[11px] uppercase tracking-tight">{item.label}</span>}
                                            </span>

                                            {!effectiveCollapsed && (
                                                <FontAwesomeIcon
                                                    icon={faChevronDown}
                                                    className={`w-2.5 text-[10px] transition-transform ${expandedMenus.includes(item.label) ? 'rotate-180' : ''
                                                        }`}
                                                />
                                            )}
                                        </button>

                                        {/* Drawer submenu */}
                                        {!effectiveCollapsed && expandedMenus.includes(item.label) && (
                                            <ul className="mt-0.5 ml-3 pl-2.5 border-l border-gray-200 dark:border-gray-800 space-y-0.5">
                                                {item.children.map((child, childIdx) => (
                                                    <li key={childIdx}>
                                                        <NavLink
                                                            to={child.path}
                                                            onClick={onClose}
                                                            className={({ isActive }) =>
                                                                `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-tight
                                ${isActive
                                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                                    : 'text-gray-400 dark:text-gray-500 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-900'
                                                                }`
                                                            }
                                                        >
                                                            <FontAwesomeIcon icon={child.icon} className="w-3 text-[10px]" />
                                                            {child.label}
                                                        </NavLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        {/* Rail popover submenu */}
                                        {effectiveCollapsed && hoveredSubmenu === item.label && (
                                            <div
                                                className="fixed left-[96px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl py-2 min-w-[220px] z-[9999]"
                                                style={{ top: submenuPos.top }}
                                            >
                                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                                                    <div className="flex items-center gap-2.5">
                                                        <FontAwesomeIcon icon={item.icon} className="text-indigo-500 text-xs" />
                                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                                                            {item.label}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="py-1">
                                                    {item.children.map((child, childIdx) => (
                                                        <NavLink
                                                            key={childIdx}
                                                            to={child.path}
                                                            onClick={onClose}
                                                            className={({ isActive }) =>
                                                                `flex items-center gap-3 px-3 py-2 text-xs font-bold transition-all
                                ${isActive
                                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                                    : 'text-gray-600 dark:text-gray-400 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                                }`
                                                            }
                                                        >
                                                            <FontAwesomeIcon icon={child.icon} className="w-3.5 text-xs" />
                                                            <span className="tracking-tight">{child.label}</span>
                                                        </NavLink>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <NavLink
                                        to={item.path}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            `flex items-center rounded-xl font-bold transition-all
                      ${effectiveCollapsed ? 'justify-center px-2.5 py-2.5' : 'gap-2.5 px-3 py-2'}
                      ${isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-indigo-600'
                                            }`
                                        }
                                        title={effectiveCollapsed ? item.label : ''}
                                    >
                                        <FontAwesomeIcon icon={item.icon} className="w-4 text-[13px]" />
                                        {!effectiveCollapsed && <span className="text-[11px] uppercase tracking-tight">{item.label}</span>}
                                    </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer actions */}
                <div className={`border-t border-[var(--color-border)] ${effectiveCollapsed ? 'p-2' : 'p-3'}`}>
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center rounded-xl font-bold transition-all
              ${effectiveCollapsed ? 'justify-center px-2.5 py-2.5' : 'gap-2.5 px-3 py-2'}
              text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-red-500`}
                        title={effectiveCollapsed ? 'Keluar' : ''}
                    >
                        <FontAwesomeIcon icon={faSignOutAlt} className="w-4 text-[13px]" />
                        {!effectiveCollapsed && <span className="text-[11px] uppercase tracking-tight">Keluar</span>}
                    </button>
                </div>
            </aside>
        </>
    )
}