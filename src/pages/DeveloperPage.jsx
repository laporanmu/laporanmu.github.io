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

    // Only admin can access this page
    if (profile?.role !== 'admin') {
        return (
            <DashboardLayout title="Developer">
                <div className="card text-center py-16">
                    <FontAwesomeIcon icon={faShieldAlt} className="text-4xl text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Akses Ditolak</h2>
                    <p className="text-[var(--color-text-muted)]">Halaman ini hanya dapat diakses oleh Administrator.</p>
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
            case 'admin': return 'badge-danger'
            case 'guru': return 'badge-primary'
            case 'pengurus': return 'badge-warning'
            default: return 'badge-primary'
        }
    }

    return (
        <DashboardLayout title="Developer">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Manajemen User</h1>
                    <p className="text-[var(--color-text-muted)]">Kelola akun staff dan hak akses</p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <FontAwesomeIcon icon={faUserPlus} /> Tambah User
                </button>
            </div>

            <div className="card mb-6">
                <div className="relative">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama atau email..." className="input pl-10" />
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Dibuat</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">{user.name.charAt(0)}</div>
                                        <div>
                                            <p className="font-medium">{user.name}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td><span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span></td>
                                <td><span className="badge badge-success">{user.status}</span></td>
                                <td>{user.createdAt}</td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEdit(user)} className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500"><FontAwesomeIcon icon={faEdit} /></button>
                                        <button onClick={() => handleDelete(user)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500"><FontAwesomeIcon icon={faTrash} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedUser ? 'Edit User' : 'Tambah User Baru'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-2">Email</label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@sekolah.id" className="input" /></div>
                    <div><label className="block text-sm font-medium mb-2">Nama Lengkap</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama lengkap" className="input" /></div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Role</label>
                        <div className="space-y-2">
                            {ROLES.map(role => (
                                <label key={role.value} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border ${formData.role === role.value ? 'border-indigo-500 bg-indigo-500/5' : 'border-[var(--color-border)]'}`}>
                                    <input type="radio" name="role" value={role.value} checked={formData.role === role.value} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="accent-indigo-500" />
                                    <div><p className="font-medium">{role.label}</p><p className="text-xs text-[var(--color-text-muted)]">{role.description}</p></div>
                                </label>
                            ))}
                        </div>
                    </div>
                    {!selectedUser && <div><label className="block text-sm font-medium mb-2">Password</label><input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Minimal 8 karakter" className="input" /></div>}
                    <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button><button type="submit" className="btn btn-primary">{selectedUser ? 'Update' : 'Simpan'}</button></div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
