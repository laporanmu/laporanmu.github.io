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
    const navigate = useNavigate()
    const [expandedMenus, setExpandedMenus] = useState(['Master Data'])

    const toggleMenu = (label) => {
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

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-[var(--sidebar-width)] bg-[var(--color-surface)] 
          border-r border-[var(--color-border)] z-50 transition-transform duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                {/* Logo */}
                <div className="h-14 flex items-center gap-3 px-5 border-b border-[var(--color-border)]">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <span className="text-white font-black text-sm">L</span>
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-bold text-[15px] text-[var(--color-text)] leading-none truncate">Laporanmu</h1>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-tighter mt-0.5 truncate text-indigo-500">Student Behavior</p>
                    </div>
                </div>

                {/* Demo Mode Banner */}
                {isDemoMode && (
                    <div className="mx-4 mt-4 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            🎮 Mode Demo Aktif
                        </p>
                    </div>
                )}

                {/* Menu */}
                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <ul className="space-y-1">
                        {menuItems.map((item, idx) => (
                            <li key={idx}>
                                {item.children ? (
                                    <div>
                                        <button
                                            onClick={() => toggleMenu(item.label)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg 
                        text-[var(--color-text-muted)] hover:bg-gray-50 dark:hover:bg-gray-900 
                        hover:text-indigo-600 transition-all font-bold group/btn"
                                        >
                                            <span className="flex items-center gap-3">
                                                <FontAwesomeIcon icon={item.icon} className="w-4 text-xs group-hover/btn:scale-110 transition-transform" />
                                                <span className="text-xs uppercase tracking-tight">{item.label}</span>
                                            </span>
                                            <FontAwesomeIcon
                                                icon={faChevronDown}
                                                className={`w-3 transition-transform ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {expandedMenus.includes(item.label) && (
                                            <ul className="mt-1 ml-3.5 pl-3.5 border-l border-gray-100 dark:border-gray-800 space-y-0.5">
                                                {item.children.map((child, childIdx) => (
                                                    <li key={childIdx}>
                                                        <NavLink
                                                            to={child.path}
                                                            onClick={onClose}
                                                            className={({ isActive }) =>
                                                                `flex items-center gap-3 px-3 py-2 rounded-lg text-[11px] font-bold transition-all uppercase tracking-tight
                                ${isActive
                                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                                    : 'text-gray-400 dark:text-gray-500 hover:text-indigo-500'
                                                                }`
                                                            }
                                                        >
                                                            <FontAwesomeIcon icon={child.icon} className="w-3" />
                                                            {child.label}
                                                        </NavLink>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <NavLink
                                        to={item.path}
                                        onClick={onClose}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-tight
                      ${isActive
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                                : 'text-gray-400 dark:text-gray-500 hover:text-indigo-500'
                                            }`
                                        }
                                    >
                                        <FontAwesomeIcon icon={item.icon} className="w-4" />
                                        {item.label}
                                    </NavLink>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* Footer - Logout only (profile & theme ada di navbar) */}
                <div className="p-3 border-t border-[var(--color-border)]">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm
              text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-500 transition-colors font-medium"
                        title="Logout"
                    >
                        <FontAwesomeIcon icon={faSignOutAlt} className="w-4" />
                        Keluar
                    </button>
                </div>
            </aside>
        </>
    )
}
