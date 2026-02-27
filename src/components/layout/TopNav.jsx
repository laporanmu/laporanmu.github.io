import { useEffect, useRef, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faBell, faChevronDown, faMoon, faSun, faGear, faRightFromBracket, faLayerGroup } from "@fortawesome/free-solid-svg-icons"
import { useTheme } from "../../context/ThemeContext"
import { useAuth } from "../../context/AuthContext"

const MASTER_ITEMS = [
    { to: "/master/students", label: "Data Siswa" },
    { to: "/master/teachers", label: "Data Guru" },
    { to: "/master/classes", label: "Data Kelas" },
    { to: "/master/violations", label: "Jenis Pelanggaran" },
    { to: "/master/academic-years", label: "Tahun Pelajaran" },
]

// ganti kalau route logs/history kamu beda
const LOGS_ROUTE = "/logs"

export default function TopNav({ title, subtitle }) {
    const { isDark, toggleTheme } = useTheme()
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()

    const [masterOpen, setMasterOpen] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)
    const masterRef = useRef(null)
    const profileRef = useRef(null)

    useEffect(() => {
        const onClick = (e) => {
            if (masterRef.current && !masterRef.current.contains(e.target)) setMasterOpen(false)
            if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
        }
        window.addEventListener("mousedown", onClick)
        return () => window.removeEventListener("mousedown", onClick)
    }, [])

    const tabClass = ({ isActive }) =>
        `px-3 py-2 rounded-xl text-sm font-bold transition
     ${isActive ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`

    const avatarLetter = profile?.name?.charAt(0) || "U"

    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    })

    return (
        <header className="sticky top-0 z-40">
            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 pt-3">

                {/* ===================== */}
                {/* MOBILE: Title + Date + Profile */}
                {/* ===================== */}
                <div className="lg:hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/70 backdrop-blur-md shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between px-4 py-3">
                        {/* Left */}
                        <div className="min-w-0">
                            <div className="text-base font-extrabold text-[var(--color-text)] truncate">
                                {title || "Dashboard"}
                            </div>
                            <div className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">
                                {subtitle || today}
                            </div>
                        </div>

                        {/* Right: Profile dropdown */}
                        <div className="relative flex-shrink-0" ref={profileRef}>
                            <button
                                onClick={() => setProfileOpen((v) => !v)}
                                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]"
                                type="button"
                            >
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black">
                                    {avatarLetter}
                                </div>
                                <FontAwesomeIcon
                                    icon={faChevronDown}
                                    className={`text-xs text-[var(--color-text-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                                />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                    <button
                                        onClick={() => {
                                            setProfileOpen(false)
                                            navigate("/settings")
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faGear} />
                                        Settings
                                    </button>

                                    <button
                                        onClick={async () => {
                                            setProfileOpen(false)
                                            await signOut()
                                            navigate("/login")
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-red-600"
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faRightFromBracket} />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ===================== */}
                {/* DESKTOP TOPNAV (full) */}
                {/* ===================== */}
                <div className="hidden lg:block rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur-xl shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                    <div className="grid grid-cols-3 items-center px-4 py-3">
                        {/* Left: Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center">
                                L
                            </div>
                            <div className="leading-tight">
                                <div className="text-sm font-extrabold text-[var(--color-text)]">Laporanmu</div>
                                <div className="text-[10px] font-bold tracking-widest text-[var(--color-text-muted)] uppercase">
                                    {subtitle || today}
                                </div>
                            </div>
                        </div>

                        {/* Center: Tabs */}
                        <div className="flex justify-center">
                            <nav className="flex items-center gap-2 bg-[var(--color-surface-alt)]/60 rounded-2xl p-1.5">
                                <NavLink to="/dashboard" className={tabClass}>Dashboard</NavLink>
                                <NavLink to="/reports" className={tabClass}>Reports</NavLink>

                                <div className="relative" ref={masterRef}>
                                    <button
                                        onClick={() => setMasterOpen((v) => !v)}
                                        className={`px-3 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2
                  ${masterOpen ? "bg-[var(--color-surface)] shadow-sm text-[var(--color-text)]"
                                                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5"}`}
                                        type="button"
                                    >
                                        <FontAwesomeIcon icon={faLayerGroup} />
                                        Master
                                        <FontAwesomeIcon
                                            icon={faChevronDown}
                                            className={`text-xs transition-transform ${masterOpen ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {masterOpen && (
                                        <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                            <div className="px-3 py-2 text-[11px] font-extrabold tracking-widest text-[var(--color-text-muted)] uppercase">
                                                Master Data
                                            </div>
                                            <div className="p-2">
                                                {MASTER_ITEMS.map((it) => (
                                                    <button
                                                        key={it.to}
                                                        onClick={() => {
                                                            setMasterOpen(false)
                                                            navigate(it.to)
                                                        }}
                                                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                                        type="button"
                                                    >
                                                        {it.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => navigate(LOGS_ROUTE)}
                                    className="px-3 py-2 rounded-xl text-sm font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-white/50 dark:hover:bg-white/5 transition"
                                    type="button"
                                >
                                    History
                                </button>
                            </nav>
                        </div>

                        {/* Right: actions (desktop) */}
                        <div className="flex items-center justify-end gap-2">
                            <button className="p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition">
                                <FontAwesomeIcon icon={faBell} />
                            </button>

                            <button
                                onClick={toggleTheme}
                                className="p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition"
                                type="button"
                            >
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
                            </button>

                            {/* Profile dropdown (desktop) */}
                            <div className="relative" ref={profileRef}>
                                <button
                                    onClick={() => setProfileOpen((v) => !v)}
                                    className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-[var(--color-surface-alt)] transition border border-transparent hover:border-[var(--color-border)]"
                                    type="button"
                                >
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black">
                                        {avatarLetter}
                                    </div>
                                    <div className="hidden sm:flex flex-col items-start leading-tight">
                                        <span className="text-sm font-extrabold text-[var(--color-text)]">{profile?.name || "User"}</span>
                                        <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--color-text-muted)]">{profile?.role || "Staff"}</span>
                                    </div>
                                    <FontAwesomeIcon
                                        icon={faChevronDown}
                                        className={`text-xs text-[var(--color-text-muted)] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                                    />
                                </button>

                                {profileOpen && (
                                    <div className="absolute right-0 mt-2 w-52 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
                                        <button
                                            onClick={() => {
                                                setProfileOpen(false)
                                                navigate("/settings")
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-[var(--color-text)]"
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faGear} />
                                            Settings
                                        </button>

                                        <button
                                            onClick={async () => {
                                                setProfileOpen(false)
                                                await signOut()
                                                navigate("/login")
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-alt)] transition font-bold text-sm text-red-600"
                                            type="button"
                                        >
                                            <FontAwesomeIcon icon={faRightFromBracket} />
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </header>
    )
}