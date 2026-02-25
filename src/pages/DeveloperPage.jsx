import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch, faShieldAlt, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/ui/Modal'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'

const DEMO_USERS = [
    { id: 1, email: 'admin@laporanmu.id', name: 'Administrator', role: 'admin', status: 'active', createdAt: '2024-01-01' },
    { id: 2, email: 'guru@laporanmu.id', name: 'Budi Santoso', role: 'guru', status: 'active', createdAt: '2024-01-05' },
    { id: 3, email: 'pengurus@laporanmu.id', name: 'OSIS', role: 'pengurus', status: 'active', createdAt: '2024-01-10' },
]

const ROLES = [
    { value: 'admin', label: 'Admin', description: 'Akses penuh ke semua fitur' },
    { value: 'guru', label: 'Guru', description: 'Bisa input laporan dan lihat data siswa' },
    { value: 'pengurus', label: 'Pengurus', description: 'Akses terbatas untuk pengurus OSIS' },
]

export default function DeveloperPage() {
    const [users, setUsers] = useState(DEMO_USERS)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUser, setSelectedUser] = useState(null)
    const [formData, setFormData] = useState({ email: '', name: '', role: 'guru', password: '' })
    const { profile } = useAuth()
    const { addToast } = useToast()

    if (profile?.role !== 'admin') {
        return (
            <DashboardLayout title="Developer">
                <div className="glass rounded-[2rem] p-12 text-center max-w-md mx-auto mt-12 border border-red-500/20 shadow-lg shadow-red-500/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none"></div>
                    <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6 transition-transform group-hover:rotate-0 duration-500 relative">
                        <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full"></div>
                        <FontAwesomeIcon icon={faShieldAlt} className="text-4xl text-red-500 relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </div>
                    <h2 className="text-2xl font-black font-heading tracking-tight mb-3 text-[var(--color-text)]">Akses Ditolak</h2>
                    <p className="text-[var(--color-text-muted)] text-sm font-medium leading-relaxed">
                        Halaman ini merupakan area terlarang. Hanya <span className="text-red-500 font-bold">Administrator</span> sistem yang memiliki wewenang untuk mengakses halaman ini.
                    </p>
                </div>
            </DashboardLayout>
        )
    }

    const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()))

    const handleAdd = () => { setSelectedUser(null); setFormData({ email: '', name: '', role: 'guru', password: '' }); setIsModalOpen(true) }
    const handleEdit = (user) => { setSelectedUser(user); setFormData({ email: user.email, name: user.name, role: user.role, password: '' }); setIsModalOpen(true) }
    const handleDelete = (user) => { if (confirm(`Hapus user "${user.name}"?`)) { setUsers(prev => prev.filter(u => u.id !== user.id)); addToast('User berhasil dihapus', 'success') } }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.email || !formData.name) { addToast('Email dan nama wajib diisi', 'warning'); return }
        if (!selectedUser && !formData.password) { addToast('Password wajib diisi untuk user baru', 'warning'); return }

        if (selectedUser) {
            setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, ...formData } : u))
            addToast('User berhasil diupdate', 'success')
        } else {
            setUsers(prev => [...prev, { id: Date.now(), status: 'active', createdAt: new Date().toISOString().split('T')[0], ...formData }])
            addToast('User berhasil ditambahkan', 'success')
        }
        setIsModalOpen(false)
    }

    const getRoleBadge = (role) => {
        switch (role) {
            case 'admin': return 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
            case 'guru': return 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]'
            case 'pengurus': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
            default: return 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
        }
    }

    return (
        <DashboardLayout title="Developer">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Manajemen User</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola akun staff dan hak akses sistem.</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faUserPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH USER</span>
                </button>
            </div>

            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="relative font-normal group">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm transition-colors group-focus-within:text-[var(--color-primary)]" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama atau email..." className="input-field pl-11 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                </div>
            </div>

            <div className="glass rounded-[1.5rem] overflow-hidden border border-[var(--color-border)] shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">User</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Role</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Status</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Dibuat</th>
                                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-right pr-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm relative overflow-hidden">
                                                <div className="absolute inset-0 bg-white/20 blur-[2px] rounded-full scale-150 -translate-y-1/2 opacity-50"></div>
                                                <span className="relative z-10">{user.name.charAt(0)}</span>
                                            </div>
                                            <div className="pt-0.5">
                                                <p className="font-bold text-sm text-[var(--color-text)] truncate">{user.name}</p>
                                                <p className="text-xs text-[var(--color-text-muted)] font-medium lowercase italic opacity-80 mt-0.5">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${getRoleBadge(user.role)}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2.5 py-1 bg-[var(--color-success)]/10 text-[var(--color-success)] border border-[var(--color-success)]/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] rounded-md text-[10px] font-black uppercase tracking-widest">
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[11px] text-[var(--color-text-muted)] font-medium opacity-80">{user.createdAt}</td>
                                    <td className="px-6 py-4 text-right pr-6">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => handleEdit(user)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm" title="Edit">
                                                <FontAwesomeIcon icon={faEdit} />
                                            </button>
                                            <button onClick={() => handleDelete(user)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Hapus">
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedUser ? 'Edit User' : 'Tambah User Baru'} size="sm">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Email</label>
                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@sekolah.id" className="input-field font-bold text-sm py-2.5 h-11" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Nama Lengkap</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama lengkap staf" className="input-field font-bold text-sm py-2.5 h-11" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 ml-1">Hak Akses (Role)</label>
                        <div className="space-y-3">
                            {ROLES.map(role => (
                                <label key={role.value} className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer border transition-all hover:bg-[var(--color-surface-alt)] ${formData.role === role.value ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-[0_4px_15px_-3px_rgba(99,102,241,0.1)]' : 'border-[var(--color-border)]'}`}>
                                    <div className="relative flex items-center mt-0.5">
                                        <input type="radio" name="role" value={role.value} checked={formData.role === role.value} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="peer sr-only" />
                                        <div className="w-5 h-5 rounded-full border-2 border-[var(--color-border)] peer-checked:border-[var(--color-primary)] flex items-center justify-center transition-colors">
                                            <div className={`w-2 h-2 rounded-full bg-[var(--color-primary)] transition-transform duration-200 ${formData.role === role.value ? 'scale-100' : 'scale-0'}`}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className={`font-bold text-sm ${formData.role === role.value ? 'text-[var(--color-primary)]' : 'text-[var(--color-text)]'}`}>{role.label}</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1 font-medium leading-relaxed">{role.description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                    {!selectedUser && (
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Password</label>
                            <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Minimal 8 karakter" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                    )}
                    <div className="flex justify-end gap-3 pt-5 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-11 px-6 uppercase tracking-widest rounded-xl">Batal</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-lg shadow-[var(--color-primary)]/20 py-2 text-xs h-11 uppercase tracking-widest rounded-xl">{selectedUser ? 'Update' : 'Simpan'}</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
