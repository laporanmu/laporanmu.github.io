import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUsers, faUserPlus, faUserSlash, faSearch, faSpinner,
    faXmark, faEdit, faTrash, faCheck, faRotateLeft,
    faEnvelope, faLock, faShield, faKey, faLink, faLinkSlash,
    faChalkboardTeacher, faBriefcase, faUserTie, faUserGear,
    faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faTriangleExclamation, faCircleInfo, faCircleCheck,
    faFilter, faSortAmountDown, faEyeSlash, faEye,
    faSliders, faCopy, faArrowRotateRight, faExclamationTriangle,
    faUserShield, faDatabase, faCode,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── Role Hierarchy: developer > admin > guru = satpam > viewer ───────────────
const ROLE_META = {
    developer: { label: 'Developer', color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: faCode },
    admin: { label: 'Admin', color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: faUserShield },
    guru: { label: 'Guru', color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: faChalkboardTeacher },
    satpam: { label: 'Satpam', color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: faShield },
    viewer: { label: 'Viewer', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: faEye },
}
const ROLES = Object.entries(ROLE_META).map(([key, v]) => ({ key, ...v }))

// ─── Permission Helpers ───────────────────────────────────────────────────────
const canManageUsers = (role) => ['developer', 'admin'].includes(role)
const canDeleteUsers = (role) => ['developer', 'admin'].includes(role)
const canCreateUsers = (role) => ['developer', 'admin'].includes(role)

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
    const meta = ROLE_META[role] || { label: role, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: faUserGear }
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-0.5 rounded-lg border ${meta.bg} ${meta.color} ${meta.border}`}>
            <FontAwesomeIcon icon={meta.icon} className="text-[8px]" />
            {meta.label}
        </span>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function UserManagementPage() {
    const { profile: currentUser } = useAuth()
    const { addToast } = useToast()

    // ── State: data ────────────────────────────────────────────────────────────
    const [users, setUsers] = useState([])
    const [unlinkedTeachers, setUnlinkedTeachers] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingUnlinked, setLoadingUnlinked] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [stats, setStats] = useState({ total: 0, guru: 0, karyawan: 0, admin: 0, noAccount: 0 })
    const [profileIdExists, setProfileIdExists] = useState(true)  // whether teachers.profile_id column exists

    // ── State: filter/sort/pagination ─────────────────────────────────────────
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [filterLinked, setFilterLinked] = useState('') // '' | 'linked' | 'unlinked'
    const [sortBy, setSortBy] = useState('name_asc')
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const PAGE_SIZE = 15

    // ── State: modals ──────────────────────────────────────────────────────────
    const [createModal, setCreateModal] = useState(false)
    const [editModal, setEditModal] = useState(null)   // profile object
    const [linkModal, setLinkModal] = useState(null)   // profile object
    const [resetModal, setResetModal] = useState(null)   // profile object
    const [deleteModal, setDeleteModal] = useState(null)   // profile object
    const [detailModal, setDetailModal] = useState(null)   // profile object
    const [sqlModal, setSqlModal] = useState(false)

    // ── State: create form ─────────────────────────────────────────────────────
    const [createEmail, setCreateEmail] = useState('')
    const [createName, setCreateName] = useState('')
    const [createRole, setCreateRole] = useState('guru')
    const [createTeacherId, setCreateTeacherId] = useState('')
    const [createPassword, setCreatePassword] = useState('')
    const [createSendEmail, setCreateSendEmail] = useState(true)
    const [showCreatePw, setShowCreatePw] = useState(false)

    // ── State: link form ───────────────────────────────────────────────────────
    const [linkTeacherId, setLinkTeacherId] = useState('')

    // ── State: edit form ───────────────────────────────────────────────────────
    const [editRole, setEditRole] = useState('')
    const [editName, setEditName] = useState('')

    const searchRef = useRef(null)

    // ── Debounce search ────────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1) }, 300)
        return () => clearTimeout(t)
    }, [search])

    // ── Fetch profiles (with linked teacher info) ─────────────────────────────
    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true })
            if (error) throw error

            // Try to fetch linked teacher info for each profile
            let enriched = data || []
            try {
                const { data: teachersData } = await supabase
                    .from('teachers')
                    .select('id, name, nbm, type, status, profile_id')
                    .not('profile_id', 'is', null)
                    .is('deleted_at', null)

                const teacherByProfileId = {}
                    ; (teachersData || []).forEach(t => { teacherByProfileId[t.profile_id] = t })
                enriched = enriched.map(u => ({ ...u, linkedTeacher: teacherByProfileId[u.id] || null }))
            } catch {
                // profile_id column might not exist yet
                setProfileIdExists(false)
                enriched = enriched.map(u => ({ ...u, linkedTeacher: null }))
            }

            setUsers(enriched)
            setStats({
                total: enriched.length,
                guru: enriched.filter(u => u.role === 'guru').length,
                karyawan: enriched.filter(u => u.role === 'karyawan').length,
                admin: enriched.filter(u => u.role === 'admin').length,
                noAccount: 0, // will be set in fetchUnlinked
            })
        } catch (err) {
            addToast('Gagal memuat data user: ' + err.message, 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast])

    // ── Fetch teachers without accounts ───────────────────────────────────────
    const fetchUnlinked = useCallback(async () => {
        setLoadingUnlinked(true)
        try {
            const { data, error } = await supabase
                .from('teachers')
                .select('id, name, nbm, type, status, email, phone')
                .is('deleted_at', null)
                .is('profile_id', null)
                .order('name')
            if (error) {
                // column doesn't exist yet
                setProfileIdExists(false)
                setUnlinkedTeachers([])
            } else {
                setUnlinkedTeachers(data || [])
                setStats(prev => ({ ...prev, noAccount: (data || []).length }))
            }
        } catch {
            setUnlinkedTeachers([])
        } finally {
            setLoadingUnlinked(false)
        }
    }, [])

    useEffect(() => { fetchUsers(); fetchUnlinked() }, [fetchUsers, fetchUnlinked])

    // ── Filtered & sorted users ────────────────────────────────────────────────
    const filteredUsers = useMemo(() => {
        let list = [...users]
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase()
            list = list.filter(u =>
                u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                u.linkedTeacher?.name?.toLowerCase().includes(q)
            )
        }
        if (filterRole) list = list.filter(u => u.role === filterRole)
        if (filterLinked === 'linked') list = list.filter(u => u.linkedTeacher)
        if (filterLinked === 'unlinked') list = list.filter(u => !u.linkedTeacher)
        list.sort((a, b) => {
            if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '')
            if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '')
            if (sortBy === 'email_asc') return (a.email || '').localeCompare(b.email || '')
            if (sortBy === 'role_asc') return (a.role || '').localeCompare(b.role || '')
            return 0
        })
        return list
    }, [users, debouncedSearch, filterRole, filterLinked, sortBy])

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
    const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

    const resetFilters = () => { setSearch(''); setFilterRole(''); setFilterLinked(''); setSortBy('name_asc'); setPage(1) }
    const hasFilters = !!(search || filterRole || filterLinked || sortBy !== 'name_asc')

    // ── Handle Create User (via Edge Function) ─────────────────────────────────
    const handleCreate = async () => {
        if (!createEmail.trim() || !createName.trim()) {
            addToast('Email dan nama wajib diisi', 'error'); return
        }
        if (!/\S+@\S+\.\S+/.test(createEmail)) {
            addToast('Format email tidak valid', 'error'); return
        }
        if (!createPassword.trim() || createPassword.length < 8) {
            addToast('Password minimal 8 karakter', 'error'); return
        }
        setSubmitting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const res = await supabase.functions.invoke('create-user', {
                body: {
                    email: createEmail.trim(),
                    name: createName.trim(),
                    role: createRole,
                    teacher_id: createTeacherId || null,
                    password: createPassword,
                    send_email: createSendEmail,
                }
            })
            if (res.error) throw new Error(res.error.message || 'Edge Function error')
            addToast(`Akun berhasil dibuat untuk ${createName} ✓`, 'success')
            setCreateModal(false)
            setCreateEmail(''); setCreateName(''); setCreateRole('guru')
            setCreateTeacherId(''); setCreatePassword('')
            fetchUsers(); fetchUnlinked()
        } catch (err) {
            // Edge function belum deploy? Tampilkan panduan SQL
            if (err.message?.includes('not found') || err.message?.includes('Edge Function')) {
                addToast('Edge Function belum tersedia. Lihat panduan SQL.', 'warning')
                setSqlModal(true)
            } else {
                addToast('Gagal membuat akun: ' + err.message, 'error')
            }
        } finally {
            setSubmitting(false)
        }
    }

    // ── Handle Reset Password ─────────────────────────────────────────────────
    const handleResetPassword = async () => {
        if (!resetModal?.email) return
        setSubmitting(true)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetModal.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            })
            if (error) throw error
            addToast(`Email reset password dikirim ke ${resetModal.email} ✓`, 'success')
            setResetModal(null)
        } catch (err) {
            addToast('Gagal kirim reset: ' + err.message, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Handle Edit Role & Name ────────────────────────────────────────────────
    const handleEditSave = async () => {
        if (!editModal) return
        setSubmitting(true)
        try {
            const updates = {}
            if (editName.trim() && editName !== editModal.name) updates.name = editName.trim()
            if (editRole && editRole !== editModal.role) updates.role = editRole
            if (!Object.keys(updates).length) { setEditModal(null); return }
            const { error } = await supabase.from('profiles').update(updates).eq('id', editModal.id)
            if (error) throw error
            addToast('Profil user diperbarui ✓', 'success')
            setEditModal(null)
            fetchUsers()
        } catch (err) {
            addToast('Gagal update: ' + err.message, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Handle Link Teacher ────────────────────────────────────────────────────
    const handleLinkTeacher = async () => {
        if (!linkModal || !linkTeacherId) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers')
                .update({ profile_id: linkModal.id })
                .eq('id', linkTeacherId)
            if (error) throw error
            addToast('Teacher berhasil di-link ke akun ini ✓', 'success')
            setLinkModal(null); setLinkTeacherId('')
            fetchUsers(); fetchUnlinked()
        } catch (err) {
            addToast('Gagal link: ' + err.message, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Handle Unlink Teacher ─────────────────────────────────────────────────
    const handleUnlinkTeacher = async (user) => {
        if (!user.linkedTeacher) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('teachers')
                .update({ profile_id: null })
                .eq('id', user.linkedTeacher.id)
            if (error) throw error
            addToast('Teacher berhasil di-unlink ✓', 'success')
            fetchUsers(); fetchUnlinked()
        } catch (err) {
            addToast('Gagal unlink: ' + err.message, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Handle Delete Profile ─────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteModal) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('profiles').delete().eq('id', deleteModal.id)
            if (error) throw error
            addToast(`Profil ${deleteModal.name} dihapus ✓`, 'success')
            setDeleteModal(null)
            fetchUsers()
        } catch (err) {
            addToast('Gagal hapus: ' + err.message, 'error')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Copy to clipboard helper ───────────────────────────────────────────────
    const copyText = (text) => {
        navigator.clipboard.writeText(text).then(() => addToast('Disalin ke clipboard ✓', 'success'))
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <DashboardLayout title="Manajemen User">
            <div className="p-4 md:p-6 space-y-5 max-w-[1800px] mx-auto">

                {/* ── Banner: profile_id belum ada ── */}
                {!profileIdExists && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 text-sm">
                            <FontAwesomeIcon icon={faDatabase} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-amber-700">Kolom <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">profile_id</code> belum ada di tabel <code className="px-1 py-0.5 bg-amber-100 rounded text-[11px]">teachers</code></p>
                            <p className="text-[11px] text-amber-600/80 font-bold mt-0.5">Fitur link teacher ke akun belum bisa digunakan. Jalankan migrasi SQL terlebih dahulu.</p>
                        </div>
                        <button onClick={() => setSqlModal(true)} className="shrink-0 h-8 px-3 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:brightness-105 transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCode} className="text-[9px]" />Lihat SQL
                        </button>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Manajemen User</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium opacity-70">
                            Kelola akun login guru, karyawan, dan staff sistem.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { fetchUsers(); fetchUnlinked() }}
                            className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all flex items-center justify-center"
                            title="Refresh">
                            <FontAwesomeIcon icon={faArrowRotateRight} className="text-sm" />
                        </button>
                        <button
                            onClick={() => { setCreateEmail(''); setCreateName(''); setCreateRole('guru'); setCreateTeacherId(''); setCreatePassword(''); setCreateModal(true) }}
                            disabled={!canCreateUsers(currentUser?.role)}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed">
                            <FontAwesomeIcon icon={faUserPlus} className="text-[10px]" />Buat Akun
                        </button>
                    </div>
                </div>

                {/* ── Stats Cards ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {[
                        { label: 'Total Akun', val: stats.total, color: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/10', border: 'border-t-[var(--color-primary)]', icon: faUsers },
                        { label: 'Guru', val: stats.guru, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-t-indigo-500', icon: faChalkboardTeacher },
                        { label: 'Karyawan', val: stats.karyawan, color: 'text-teal-600', bg: 'bg-teal-500/10', border: 'border-t-teal-500', icon: faBriefcase },
                        { label: 'Admin / Staff', val: stats.admin, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-t-purple-500', icon: faUserShield },
                        { label: 'Belum Ada Akun', val: stats.noAccount, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-t-amber-500', icon: faUserSlash },
                    ].map((s, i) => (
                        <div key={i} className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.border} flex items-center gap-3 hover:border-t-4 transition-all cursor-default`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${s.bg}`}>
                                <FontAwesomeIcon icon={s.icon} className={s.color} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-none mb-1">{s.label}</p>
                                <p className={`text-xl font-black font-heading leading-none tabular-nums ${s.color}`}>{loading ? '…' : s.val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Toolbar ── */}
                <div className="glass rounded-[1.5rem] px-4 py-3 flex items-center gap-2 flex-wrap border border-[var(--color-border)]">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[180px]">
                        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Cari nama, email, atau nama guru..."
                            className="w-full h-9 pl-8 pr-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition-all"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
                                <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                            </button>
                        )}
                    </div>

                    {/* Filter Role */}
                    <div className="flex gap-1 flex-wrap">
                        {[{ key: '', label: 'Semua' }, ...ROLES].map(r => (
                            <button key={r.key || 'all'} onClick={() => { setFilterRole(r.key || ''); setPage(1) }}
                                className={`h-8 px-3 rounded-xl text-[10px] font-black transition-all ${filterRole === (r.key || '')
                                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                                    : 'border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter Linked */}
                    <select value={filterLinked} onChange={e => { setFilterLinked(e.target.value); setPage(1) }}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all">
                        <option value="">Semua (link status)</option>
                        <option value="linked">Sudah di-link</option>
                        <option value="unlinked">Belum di-link</option>
                    </select>

                    {/* Sort */}
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                        className="h-8 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[10px] font-black text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all">
                        <option value="name_asc">Nama A–Z</option>
                        <option value="name_desc">Nama Z–A</option>
                        <option value="email_asc">Email A–Z</option>
                        <option value="role_asc">Role A–Z</option>
                    </select>

                    {hasFilters && (
                        <button onClick={resetFilters} className="h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20">
                            Reset
                        </button>
                    )}

                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] ml-auto shrink-0">
                        {filteredUsers.length} user
                    </span>
                </div>

                {/* ── Users Table ── */}
                {loading ? (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-surface-alt)]">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-left">
                                    <th className="px-5 py-4">User</th>
                                    <th className="px-5 py-4">Role</th>
                                    <th className="px-5 py-4">Linked Teacher</th>
                                    <th className="px-5 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="border-t border-[var(--color-border)]">
                                        <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[var(--color-border)] animate-pulse shrink-0" /><div className="space-y-2"><div className="h-3 w-28 rounded bg-[var(--color-border)] animate-pulse" /><div className="h-2 w-36 rounded bg-[var(--color-border)] animate-pulse opacity-60" /></div></div></td>
                                        <td className="px-5 py-4"><div className="h-5 w-20 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                        <td className="px-5 py-4"><div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                        <td className="px-5 py-4"><div className="h-7 w-36 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[700px] text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-left">
                                        <th className="px-5 py-3.5">User</th>
                                        <th className="px-5 py-3.5">Role</th>
                                        <th className="px-5 py-3.5">Linked Teacher</th>
                                        <th className="px-5 py-3.5 text-right pr-6">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pagedUsers.length === 0 ? (
                                        <tr><td colSpan={4} className="px-5 py-16">
                                            <div className="flex flex-col items-center gap-2 text-center">
                                                <FontAwesomeIcon icon={faUsers} className="text-3xl text-[var(--color-text-muted)] opacity-20 mb-2" />
                                                <p className="text-sm font-black text-[var(--color-text)]">Tidak ada user ditemukan</p>
                                                <p className="text-xs text-[var(--color-text-muted)]">Coba ubah filter atau kata kunci pencarian.</p>
                                                {hasFilters && <button onClick={resetFilters} className="mt-2 h-8 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black hover:bg-[var(--color-surface-alt)] transition-all">Reset Filter</button>}
                                            </div>
                                        </td></tr>
                                    ) : pagedUsers.map(user => (
                                        <UserRow
                                            key={user.id}
                                            user={user}
                                            currentUser={currentUser}
                                            onDetail={() => setDetailModal(user)}
                                            onEdit={() => { setEditModal(user); setEditRole(user.role || ''); setEditName(user.name || '') }}
                                            onLink={() => { setLinkModal(user); setLinkTeacherId('') }}
                                            onUnlink={() => handleUnlinkTeacher(user)}
                                            onReset={() => setResetModal(user)}
                                            onDelete={() => setDeleteModal(user)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-5 py-3 border-t border-[var(--color-border)] flex items-center justify-between gap-3 bg-[var(--color-surface-alt)]/30 flex-wrap">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} dari {filteredUsers.length} user
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button disabled={page <= 1} onClick={() => setPage(1)} className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesLeft} className="text-[9px]" /></button>
                                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" /></button>
                                    {getPageItems(page, totalPages).map((it, i) => it === '...'
                                        ? <span key={`e${i}`} className="text-[var(--color-text-muted)] px-1">…</span>
                                        : <button key={it} onClick={() => setPage(it)} className={`h-8 min-w-[32px] px-2 rounded-xl font-black text-[10px] transition-all ${it === page ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}>{it}</button>
                                    )}
                                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronRight} className="text-[9px]" /></button>
                                    <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesRight} className="text-[9px]" /></button>
                                    <input value={jumpPage} onChange={e => setJumpPage(e.target.value.replace(/\D/g, ''))} onKeyDown={e => { if (e.key === 'Enter') { const n = Number(jumpPage); if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage('') } } }} placeholder="Hal…" className="w-14 h-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-center text-[10px] font-black focus:border-[var(--color-primary)] outline-none" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Teachers Tanpa Akun ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    <div className="px-5 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">Guru & Karyawan Belum Punya Akun</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] opacity-70 mt-0.5">Teacher di tabel <code className="text-[9px] bg-[var(--color-surface-alt)] px-1 rounded">teachers</code> yang belum di-link ke akun login.</p>
                        </div>
                        {unlinkedTeachers.length > 0 && (
                            <span className="text-[9px] font-black px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">{unlinkedTeachers.length} orang</span>
                        )}
                    </div>
                    {loadingUnlinked ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faSpinner} className="fa-spin" />
                            <span className="text-xs font-bold">Memuat...</span>
                        </div>
                    ) : !profileIdExists ? (
                        <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                            <FontAwesomeIcon icon={faDatabase} className="text-2xl text-amber-500/50" />
                            <p className="text-sm font-black text-[var(--color-text-muted)]">Kolom <code>profile_id</code> belum ada</p>
                            <p className="text-[11px] text-[var(--color-text-muted)] opacity-70">Jalankan SQL migration terlebih dahulu.</p>
                            <button onClick={() => setSqlModal(true)} className="mt-2 h-8 px-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 text-[10px] font-black hover:bg-amber-500/20 transition-all">Lihat SQL Migration</button>
                        </div>
                    ) : unlinkedTeachers.length === 0 ? (
                        <div className="px-5 py-10 flex flex-col items-center gap-2 text-center">
                            <FontAwesomeIcon icon={faCircleCheck} className="text-2xl text-emerald-500/50" />
                            <p className="text-sm font-black text-emerald-600">Semua teacher sudah punya akun!</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {unlinkedTeachers.map(t => (
                                <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors group">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-primary)] font-black text-sm shrink-0">
                                        {t.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[12px] font-black text-[var(--color-text)] truncate">{t.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            {t.nbm && <span className="text-[9px] font-bold text-[var(--color-text-muted)]">{t.nbm}</span>}
                                            {t.type && <RoleBadge role={t.type} />}
                                            {t.email && <span className="text-[9px] text-[var(--color-text-muted)] opacity-70">{t.email}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setCreateEmail(t.email || '')
                                                setCreateName(t.name)
                                                setCreateRole(t.type || 'guru')
                                                setCreateTeacherId(t.id)
                                                setCreatePassword('')
                                                setCreateModal(true)
                                            }}
                                            disabled={!canCreateUsers(currentUser?.role)}
                                            className="h-8 px-3 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center gap-1.5 disabled:opacity-40">
                                            <FontAwesomeIcon icon={faUserPlus} className="text-[9px]" />Buat Akun
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                MODALS
            ════════════════════════════════════════════════════════════════ */}

            {/* ── Modal: Buat Akun ── */}
            <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Buat Akun Login" size="sm">
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15 flex items-center gap-3">
                        <FontAwesomeIcon icon={faCircleInfo} className="text-[var(--color-primary)] shrink-0" />
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold leading-relaxed">
                            Akun akan dibuat via <strong>Edge Function</strong>. Pastikan sudah di-deploy. Password bisa segera diganti oleh user lewat fitur reset.
                        </p>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Email <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faEnvelope} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                            <input value={createEmail} onChange={e => setCreateEmail(e.target.value)}
                                placeholder="email@sekolah.id"
                                className="w-full h-10 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                        </div>
                    </div>

                    {/* Nama */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Nama Lengkap <span className="text-red-400">*</span></label>
                        <input value={createName} onChange={e => setCreateName(e.target.value)}
                            placeholder="Nama lengkap..."
                            className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                    </div>

                    {/* Role */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Role</label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {ROLES.map(r => (
                                <button key={r.key} onClick={() => setCreateRole(r.key)}
                                    className={`h-9 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 border transition-all ${createRole === r.key ? `${r.bg} ${r.color} ${r.border}` : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                    <FontAwesomeIcon icon={r.icon} className="text-[9px]" />{r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Password Sementara <span className="text-red-400">*</span></label>
                        <div className="relative">
                            <FontAwesomeIcon icon={faLock} className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                            <input
                                type={showCreatePw ? 'text' : 'password'}
                                value={createPassword} onChange={e => setCreatePassword(e.target.value)}
                                placeholder="Min. 8 karakter..."
                                className="w-full h-10 pl-8 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                            <button type="button" onClick={() => setShowCreatePw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                                <FontAwesomeIcon icon={showCreatePw ? faEyeSlash : faEye} className="text-[10px]" />
                            </button>
                        </div>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-1 opacity-60">User bisa reset password lewat email setelah login pertama.</p>
                    </div>

                    {/* Link Teacher (jika dari unlinked) */}
                    {createTeacherId && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                            <FontAwesomeIcon icon={faLink} className="text-emerald-600 text-[11px] shrink-0" />
                            <p className="text-[10px] font-black text-emerald-700">Akan otomatis di-link ke data teacher.</p>
                        </div>
                    )}

                    {/* Send email toggle */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <div onClick={() => setCreateSendEmail(v => !v)}
                            className={`w-9 h-5 rounded-full transition-all flex items-center px-0.5 cursor-pointer ${createSendEmail ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all ${createSendEmail ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-[11px] font-bold text-[var(--color-text)]">Kirim notifikasi email ke user</span>
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setCreateModal(false)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                        <button onClick={handleCreate} disabled={submitting || !createEmail || !createName || !createPassword}
                            className="flex-1 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faUserPlus} className="text-[10px]" />}
                            Buat Akun
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ── Modal: Edit User ── */}
            <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit User" size="sm">
                {editModal && (
                    <div className="space-y-4">
                        {/* User info header */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white font-black text-base shrink-0">
                                {(editModal.name || editModal.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[12px] font-black text-[var(--color-text)] truncate">{editModal.name || '—'}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] truncate">{editModal.email}</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Nama Tampilan</label>
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all" />
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Role</label>
                            <div className="grid grid-cols-3 gap-1.5">
                                {ROLES.map(r => (
                                    <button key={r.key} onClick={() => setEditRole(r.key)}
                                        className={`h-9 rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 border transition-all ${editRole === r.key ? `${r.bg} ${r.color} ${r.border}` : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                        <FontAwesomeIcon icon={r.icon} className="text-[9px]" />{r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {editModal.id === currentUser?.id && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-[11px] shrink-0" />
                                <p className="text-[10px] font-bold text-amber-700">Kamu sedang mengedit akun milikmu sendiri.</p>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setEditModal(null)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                            <button onClick={handleEditSave} disabled={submitting}
                                className="flex-1 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : null} Simpan
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Modal: Link Teacher ── */}
            <Modal isOpen={!!linkModal} onClose={() => setLinkModal(null)} title="Link ke Data Teacher" size="sm">
                {linkModal && (
                    <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <p className="text-[11px] font-black text-[var(--color-text)]">Akun: {linkModal.name}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)]">{linkModal.email}</p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1.5 block">Pilih Teacher</label>
                            {unlinkedTeachers.length === 0 ? (
                                <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] text-center">
                                    <p className="text-[11px] font-black text-emerald-600">Semua teacher sudah punya akun!</p>
                                </div>
                            ) : (
                                <select value={linkTeacherId} onChange={e => setLinkTeacherId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] transition-all">
                                    <option value="">-- Pilih teacher --</option>
                                    {unlinkedTeachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}{t.nbm ? ` (${t.nbm})` : ''} — {t.type}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                            Setelah di-link, data laporan dan portal keluar-masuk akan terhubung ke akun ini secara otomatis.
                        </p>

                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setLinkModal(null)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                            <button onClick={handleLinkTeacher} disabled={submitting || !linkTeacherId}
                                className="flex-1 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faLink} className="text-[10px]" />} Link Teacher
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Modal: Reset Password ── */}
            <Modal isOpen={!!resetModal} onClose={() => setResetModal(null)} title="Reset Password" size="sm">
                {resetModal && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/20 flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center shrink-0 text-lg">
                                <FontAwesomeIcon icon={faKey} className="text-[var(--color-primary)]" />
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-[var(--color-text)]">{resetModal.name}</p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{resetModal.email}</p>
                            </div>
                        </div>
                        <p className="text-[11px] text-[var(--color-text)] leading-relaxed">
                            Sistem akan mengirim <strong>email berisi link reset password</strong> ke alamat di atas. User klik link tersebut untuk membuat password baru.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setResetModal(null)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                            <button onClick={handleResetPassword} disabled={submitting}
                                className="flex-1 h-10 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />} Kirim Link Reset
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Modal: Hapus Profile ── */}
            <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Hapus Profil User" size="sm">
                {deleteModal && (
                    <div className="space-y-5">
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 text-red-500">
                            <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-lg border border-red-500/30">
                                <FontAwesomeIcon icon={faTrash} />
                            </div>
                            <div>
                                <p className="text-[13px] font-black">Hapus profil ini?</p>
                                <p className="text-[10px] font-bold opacity-80 mt-0.5">{deleteModal.name} · {deleteModal.email}</p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-[11px] mt-0.5 shrink-0" />
                            <div className="text-[10px] font-bold text-amber-700 leading-relaxed space-y-1">
                                <p>Ini hanya menghapus <strong>data profil</strong> dari tabel <code className="bg-amber-100 px-1 rounded">profiles</code>.</p>
                                <p>Akun auth Supabase <strong>tidak ikut terhapus</strong> — hapus manual dari Supabase Dashboard → Authentication → Users jika diperlukan.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteModal(null)} className="flex-1 h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Batal</button>
                            <button onClick={handleDelete} disabled={submitting || deleteModal.id === currentUser?.id || !canDeleteUsers(currentUser?.role)}
                                className="flex-1 h-10 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[11px] font-black transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : null} Hapus Profil
                            </button>
                        </div>
                        {deleteModal.id === currentUser?.id && (
                            <p className="text-[10px] text-red-500 font-bold text-center">Tidak bisa menghapus akun milikmu sendiri.</p>
                        )}
                        {deleteModal.id !== currentUser?.id && !canDeleteUsers(currentUser?.role) && (
                            <p className="text-[10px] text-amber-600 font-bold text-center">Role kamu tidak memiliki izin hapus user.</p>
                        )}
                    </div>
                )}
            </Modal>

            {/* ── Modal: Detail User ── */}
            <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Detail User" size="sm">
                {detailModal && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-2xl font-black shrink-0">
                                {(detailModal.name || detailModal.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[14px] font-black text-[var(--color-text)]">{detailModal.name || '—'}</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{detailModal.email}</p>
                                <div className="mt-1.5"><RoleBadge role={detailModal.role} /></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { label: 'ID', val: detailModal.id?.slice(0, 8) + '...', full: detailModal.id, copyable: true },
                                { label: 'Email', val: detailModal.email, copyable: true },
                                { label: 'Phone', val: detailModal.phone || '—' },
                                { label: 'Dibuat', val: detailModal.created_at ? new Date(detailModal.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                            ].map((item, i) => (
                                <div key={i} className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 mb-1">{item.label}</p>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[11px] font-bold text-[var(--color-text)] truncate flex-1">{item.val}</p>
                                        {item.copyable && (
                                            <button onClick={() => copyText(item.full || item.val)} className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all shrink-0">
                                                <FontAwesomeIcon icon={faCopy} className="text-[8px]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {detailModal.linkedTeacher && (
                            <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/20">
                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1.5 flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faLink} />Linked Teacher
                                </p>
                                <p className="text-[12px] font-black text-[var(--color-text)]">{detailModal.linkedTeacher.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    {detailModal.linkedTeacher.nbm && <span className="text-[9px] text-[var(--color-text-muted)]">{detailModal.linkedTeacher.nbm}</span>}
                                    <RoleBadge role={detailModal.linkedTeacher.type} />
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2 pt-1">
                            <button onClick={() => { setDetailModal(null); setResetModal(detailModal) }}
                                className="flex-1 h-9 rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black hover:bg-[var(--color-primary)] hover:text-white transition-all flex items-center justify-center gap-1.5">
                                <FontAwesomeIcon icon={faKey} className="text-[9px]" />Reset PW
                            </button>
                            <button onClick={() => { setDetailModal(null); setEditModal(detailModal); setEditRole(detailModal.role || ''); setEditName(detailModal.name || '') }}
                                className="flex-1 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text)] text-[10px] font-black hover:bg-[var(--color-border)] transition-all flex items-center justify-center gap-1.5">
                                <FontAwesomeIcon icon={faEdit} className="text-[9px]" />Edit
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Modal: SQL Migration Guide ── */}
            <Modal isOpen={sqlModal} onClose={() => setSqlModal(false)} title="SQL Migration" size="md">
                <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-[var(--color-primary)]/8 border border-[var(--color-primary)]/15 flex items-start gap-3">
                        <FontAwesomeIcon icon={faDatabase} className="text-[var(--color-primary)] shrink-0 mt-0.5" />
                        <div>
                            <p className="text-[11px] font-black text-[var(--color-text)]">Jalankan SQL berikut di Supabase Dashboard → SQL Editor</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Diperlukan untuk fitur link teacher ke akun login.</p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center justify-between">
                            Step 1 — Tambah kolom profile_id di teachers
                            <button onClick={() => copyText(`-- Step 1: Add profile_id to teachers\nALTER TABLE teachers\nADD COLUMN IF NOT EXISTS profile_id UUID\n  REFERENCES auth.users(id)\n  ON DELETE SET NULL;\n\nCREATE INDEX IF NOT EXISTS idx_teachers_profile_id\n  ON teachers(profile_id);`)} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                                <FontAwesomeIcon icon={faCopy} className="text-[8px]" />Salin
                            </button>
                        </p>
                        <pre className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text)] overflow-x-auto leading-relaxed whitespace-pre-wrap">{`-- Step 1: Add profile_id to teachers
ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS profile_id UUID
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_profile_id
  ON teachers(profile_id);`}</pre>
                    </div>

                    <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 flex items-center justify-between">
                            Step 2 — Edge Function create-user (deploy via Supabase CLI)
                            <button onClick={() => copyText(`// supabase/functions/create-user/index.ts\nimport { createClient } from 'https://esm.sh/@supabase/supabase-js@2'\n\nDeno.serve(async (req) => {\n  const { email, name, role, teacher_id, password } = await req.json()\n  const supabaseAdmin = createClient(\n    Deno.env.get('SUPABASE_URL')!,\n    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!\n  )\n  // Verify caller is admin\n  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')\n  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader)\n  const { data: callerProfile } = await supabaseAdmin\n    .from('profiles').select('role').eq('id', user?.id).single()\n  if (callerProfile?.role !== 'admin') return new Response('Forbidden', { status: 403 })\n  // Create user\n  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({\n    email, password, email_confirm: true, user_metadata: { name, role }\n  })\n  if (error) return Response.json({ error: error.message }, { status: 400 })\n  // Upsert profile\n  await supabaseAdmin.from('profiles').upsert({ id: newUser.user.id, email, name, role })\n  // Link teacher if provided\n  if (teacher_id) {\n    await supabaseAdmin.from('teachers')\n      .update({ profile_id: newUser.user.id }).eq('id', teacher_id)\n  }\n  return Response.json({ success: true })\n})`)} className="flex items-center gap-1 text-[var(--color-primary)] hover:underline">
                                <FontAwesomeIcon icon={faCopy} className="text-[8px]" />Salin
                            </button>
                        </p>
                        <pre className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text)] overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-48">{`// supabase/functions/create-user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const { email, name, role, teacher_id, password } = await req.json()
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  // Verify caller is admin
  const authHeader = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader)
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user?.id).single()
  if (callerProfile?.role !== 'admin')
    return new Response('Forbidden', { status: 403 })
  // Create user
  const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { name, role }
  })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  // Upsert profile
  await supabaseAdmin.from('profiles')
    .upsert({ id: newUser.user.id, email, name, role })
  // Link teacher if provided
  if (teacher_id) {
    await supabaseAdmin.from('teachers')
      .update({ profile_id: newUser.user.id }).eq('id', teacher_id)
  }
  return Response.json({ success: true })
})`}</pre>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Deploy Edge Function</p>
                        <code className="text-[10px] font-mono text-[var(--color-text)]">supabase functions deploy create-user</code>
                    </div>

                    <button onClick={() => setSqlModal(false)} className="w-full h-10 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">Tutup</button>
                </div>
            </Modal>
        </DashboardLayout>
    )
}

// ─── UserRow sub-component ────────────────────────────────────────────────────

function UserRow({ user, currentUser, onDetail, onEdit, onLink, onUnlink, onReset, onDelete }) {
    const isSelf = user.id === currentUser?.id

    return (
        <tr className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors group cursor-pointer" onClick={onDetail}>
            {/* User info */}
            <td className="px-5 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 flex items-center justify-center text-[var(--color-primary)] font-black text-sm shrink-0">
                        {(user.name || user.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <p className="text-[12px] font-black text-[var(--color-text)] truncate">{user.name || '—'}</p>
                            {isSelf && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">Saya</span>}
                        </div>
                        <p className="text-[10px] text-[var(--color-text-muted)] truncate">{user.email}</p>
                    </div>
                </div>
            </td>

            {/* Role */}
            <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                <RoleBadge role={user.role} />
            </td>

            {/* Linked Teacher */}
            <td className="px-5 py-3">
                {user.linkedTeacher ? (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-[10px]">
                            <FontAwesomeIcon icon={faLink} className="text-emerald-500 text-[9px]" />
                            <span className="font-black text-[var(--color-text)] truncate max-w-[140px]">{user.linkedTeacher.name}</span>
                            {user.linkedTeacher.nbm && <span className="text-[var(--color-text-muted)] opacity-60">{user.linkedTeacher.nbm}</span>}
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onUnlink() }}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all"
                            title="Unlink teacher">
                            <FontAwesomeIcon icon={faLinkSlash} className="text-[9px]" />
                        </button>
                    </div>
                ) : (
                    <span className="text-[10px] text-[var(--color-text-muted)] opacity-40 italic">Belum di-link</span>
                )}
            </td>

            {/* Actions */}
            <td className="px-5 py-3 text-right pr-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Link/Unlink teacher */}
                    {!user.linkedTeacher && (
                        <button onClick={onLink} title="Link ke teacher"
                            className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-emerald-600 hover:border-emerald-500/30 hover:bg-emerald-500/10 flex items-center justify-center transition-all">
                            <FontAwesomeIcon icon={faLink} className="text-[10px]" />
                        </button>
                    )}
                    {/* Reset password */}
                    <button onClick={onReset} title="Reset password"
                        className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 flex items-center justify-center transition-all">
                        <FontAwesomeIcon icon={faKey} className="text-[10px]" />
                    </button>
                    {/* Edit */}
                    <button onClick={onEdit} title="Edit user"
                        className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center justify-center transition-all">
                        <FontAwesomeIcon icon={faEdit} className="text-[10px]" />
                    </button>
                    {/* Delete — only for users with delete permission, not self */}
                    {!isSelf && canDeleteUsers(currentUser?.role) && (
                        <button onClick={onDelete} title="Hapus profil"
                            className="h-8 w-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 flex items-center justify-center transition-all">
                            <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    )
}