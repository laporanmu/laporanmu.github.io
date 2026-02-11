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

export default function Sidebar({ isOpen, onClose }) {
    const { profile, signOut, isDemoMode } = useAuth()
    const { addToast } = useToast()
    const { isCollapsed } = useSidebar()
    const navigate = useNavigate()
    const [expandedMenus, setExpandedMenus] = useState(['Master Data'])
    const [hoveredSubmenu, setHoveredSubmenu] = useState(null)

    const toggleMenu = (label) => {
        if (isCollapsed) return
        setExpandedMenus(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
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
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar - Collapsible */}
            <aside
                className={`fixed top-0 left-0 h-full bg-[var(--color-surface)] 
          border-r border-[var(--color-border)] z-50 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[70px]' : 'w-[var(--sidebar-width)]'}`}
            >
                {/* Logo - Adaptive */}
                <div className={`h-14 flex items-center border-b border-[var(--color-border)] overflow-hidden
                    ${isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-4'}`}>
                    <div className={`rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/10 shrink-0
                        ${isCollapsed ? 'w-9 h-9' : 'w-7 h-7'}`}>
                        <span className={`text-white font-black ${isCollapsed ? 'text-sm' : 'text-xs'}`}>L</span>
                    </div>
                    {!isCollapsed && (
                        <div className="min-w-0 animate-in fade-in slide-in-from-left-2 duration-200">
                            <h1 className="font-bold text-sm text-[var(--color-text)] leading-none truncate">Laporanmu</h1>
                            <p className="text-[8px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5 truncate">Behavior System</p>
                        </div>
                    )}
                </div>

                {/* Demo Mode Banner */}
                {isDemoMode && !isCollapsed && (
                    <div className="mx-3 mt-3 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-in fade-in duration-200">
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold tracking-wider">
                            🎮 MODE DEMO
                        </p>
                    </div>
                )}

                {/* Menu - Adaptive */}
                <nav className="flex-1 overflow-y-auto py-3 px-2.5">
                    <ul className="space-y-0.5">
                        {menuItems.map((item, idx) => (
                            <li
                                key={idx}
                                className="relative"
                                onMouseEnter={() => isCollapsed && item.children && setHoveredSubmenu(item.label)}
                                onMouseLeave={() => isCollapsed && setHoveredSubmenu(null)}
                            >
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className={`w-full flex items-center rounded-lg 
                        text-[var(--color-text-muted)] hover:bg-gray-50 dark:hover:bg-gray-900 
                        hover:text-indigo-600 transition-all font-bold group/btn
                        ${isCollapsed ? 'justify-center px-2.5 py-2.5' : 'justify-between px-2.5 py-2'}`}
                                            title={isCollapsed ? item.label : ''}
                                        >
                                            <span className={`flex items-center ${isCollapsed ? '' : 'gap-2.5'}`}>
                                                <FontAwesomeIcon icon={item.icon} className="w-3.5 text-[11px] group-hover/btn:scale-110 transition-transform" />
                                                {!isCollapsed && <span className="text-[11px] uppercase tracking-tight">{item.label}</span>}
                                            </span>
                                            {!isCollapsed && (
                                                <FontAwesomeIcon
                                                    icon={faChevronDown}
                                                    className={`w-2.5 text-[10px] transition-transform ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`}
                                                />
                                            )}
                                        </button>

                                        {/* Regular Submenu (Expanded) */}
                                        {!isCollapsed && expandedMenus.includes(item.label) && (
                                            <ul className="mt-0.5 ml-3 pl-2.5 border-l border-gray-200 dark:border-gray-800 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
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

                                        {/* Popover Submenu (Collapsed) */}
                                        {isCollapsed && hoveredSubmenu === item.label && (
                                            <div
                                                className="fixed left-[70px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-2 min-w-[220px] z-[60] animate-in fade-in slide-in-from-left-2 duration-200"
                                                style={{
                                                    top: `${14 + (idx * 48) + 12}px` // 14px header + idx*48px spacing + 12px offset
                                                }}
                                            >
                                                {/* Header */}
                                                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                                                    <div className="flex items-center gap-2.5">
                                                        <FontAwesomeIcon icon={item.icon} className="text-indigo-500 text-xs" />
                                                        <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.label}</p>
                                                    </div>
                                                </div>

                                                {/* Menu Items */}
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
                                                                }`}
                                                            title={isCollapsed ? child.label : child.label}
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
                                            `flex items-center rounded-lg text-[11px] font-bold transition-all uppercase tracking-tight
                      ${isCollapsed ? 'justify-center px-2.5 py-2.5' : 'gap-2.5 px-2.5 py-2'}
                      ${isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                : 'text-gray-400 dark:text-gray-500 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-900'
                                            }`}
                                        title={isCollapsed ? item.label : ''}
                                    >
                                        <FontAwesomeIcon icon={item.icon} className="w-3.5 text-[11px]" />
                                        {!isCollapsed && item.label}
                                    </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer - Logout */}
                <div className="p-2.5 border-t border-[var(--color-border)]">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center rounded-lg text-[11px]
              text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500 
              transition-colors font-bold uppercase tracking-tight
              ${isCollapsed ? 'justify-center px-2.5 py-2.5' : 'justify-center gap-2 px-2.5 py-2'}`}
                        title={isCollapsed ? 'Keluar' : ''}
                    >
                        <FontAwesomeIcon icon={faSignOutAlt} className="w-3.5 text-[11px]" />
                        {!isCollapsed && 'Keluar'}
                    </button>
                </div>
            </aside >
        </>
    )
}