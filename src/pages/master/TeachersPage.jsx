import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch, faTimes, faFilter } from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useDebounce } from '../../hooks/useDebounce'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

const DEMO_TEACHERS = [
    { id: 1, name: 'Budi Santoso, S.Pd', subject: 'Matematika', phone: '081234567890', email: 'budi@sekolah.id' },
    { id: 2, name: 'Sari Dewi, M.Pd', subject: 'Bahasa Indonesia', phone: '081234567891', email: 'sari@sekolah.id' },
    { id: 3, name: 'Ahmad Fauzi, S.Pd', subject: 'Fisika', phone: '081234567892', email: 'ahmad@sekolah.id' },
    { id: 4, name: 'Rina Marlina, S.Pd', subject: 'Biologi', phone: '081234567893', email: 'rina@sekolah.id' },
    { id: 5, name: 'Dedi Kusuma, M.Pd', subject: 'Matematika', phone: '081234567894', email: 'dedi@sekolah.id' },
    { id: 6, name: 'Nina Sari, S.Pd', subject: 'Bahasa Inggris', phone: '081234567895', email: 'nina@sekolah.id' },
]

export default function TeachersPage() {
    const [teachers, setTeachers] = useState(DEMO_TEACHERS)
    const [loading, setLoading] = useState(false) // Change to false for demo
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSubject, setFilterSubject] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', subject: '', phone: '', email: '' })
    const { addToast } = useToast()

    // Debounced search untuk better performance
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Get unique subjects untuk filter
    const subjects = useMemo(() => {
        return [...new Set(teachers.map(t => t.subject))].sort()
    }, [teachers])

    // Filtered & searched data dengan useMemo untuk optimization
    const filteredTeachers = useMemo(() => {
        return teachers.filter(t => {
            const matchesSearch =
                t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                t.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                t.email.toLowerCase().includes(debouncedSearch.toLowerCase())

            const matchesSubject = !filterSubject || t.subject === filterSubject

            return matchesSearch && matchesSubject
        })
    }, [teachers, debouncedSearch, filterSubject])

    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({ name: '', subject: '', phone: '', email: '' })
        setIsModalOpen(true)
    }

    const handleEdit = (item) => {
        setSelectedItem(item)
        setFormData({ name: item.name, subject: item.subject, phone: item.phone, email: item.email })
        setIsModalOpen(true)
    }

    const handleDelete = (item) => {
        if (confirm(`Hapus "${item.name}"?`)) {
            setTeachers(prev => prev.filter(t => t.id !== item.id))
            addToast('Data berhasil dihapus', 'success')
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name) {
            addToast('Nama wajib diisi', 'warning')
            return
        }

        if (selectedItem) {
            setTeachers(prev => prev.map(t => t.id === selectedItem.id ? { ...t, ...formData } : t))
            addToast('Data berhasil diupdate', 'success')
        } else {
            setTeachers(prev => [...prev, { id: Date.now(), ...formData }])
            addToast('Data berhasil ditambahkan', 'success')
        }
        setIsModalOpen(false)
    }

    const clearFilters = () => {
        setSearchQuery('')
        setFilterSubject('')
    }

    const hasActiveFilters = searchQuery || filterSubject

    return (
        <DashboardLayout title="Data Guru">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Data Guru</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Kelola data guru dan staff pengajar di sekolah ini.
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH GURU</span>
                </button>
            </div>

            {/* Enhanced Filter Area */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search Input dengan Clear Button */}
                    <div className="flex-1 relative font-normal group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--color-primary)]">
                            <FontAwesomeIcon icon={faSearch} className="text-sm" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama, mata pelajaran, atau email..."
                            className="input-field pl-11 pr-10 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                                title="Clear search"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>

                    {/* Subject Filter */}
                    <div className="relative w-full md:w-64">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faFilter} className="text-sm" />
                        </div>
                        <select
                            value={filterSubject}
                            onChange={(e) => setFilterSubject(e.target.value)}
                            className="select-field pl-11 w-full font-bold text-sm h-11 bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl"
                        >
                            <option value="">Semua Mata Pelajaran</option>
                            {subjects.map(subj => (
                                <option key={subj} value={subj}>{subj}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Active Filters Display */}
                {hasActiveFilters && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)] flex-wrap">
                        <span className="text-xs text-[var(--color-text-muted)] font-medium">Filter aktif:</span>
                        {filterSubject && (
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold">
                                {filterSubject}
                                <button
                                    onClick={() => setFilterSubject('')}
                                    className="hover:text-[var(--color-accent)] transition-colors"
                                >
                                    <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                </button>
                            </span>
                        )}
                        <button
                            onClick={clearFilters}
                            className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors ml-auto"
                        >
                            Clear All
                        </button>
                    </div>
                )}

                {/* Result Count */}
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Menampilkan <strong className="text-[var(--color-text)] font-bold">{filteredTeachers.length}</strong> dari {teachers.length} guru
                        {debouncedSearch && ` (hasil pencarian: "${debouncedSearch}")`}
                    </p>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <>
                    {/* Desktop Skeleton */}
                    <div className="hidden md:block">
                        <TableSkeleton rows={5} cols={5} />
                    </div>
                    {/* Mobile Skeleton */}
                    <div className="md:hidden">
                        <CardSkeleton count={3} />
                    </div>
                </>
            ) : filteredTeachers.length === 0 ? (
                /* Empty State */
                <div className="glass rounded-[2rem] py-20 text-center border-dashed border-2 border-[var(--color-border)]">
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FontAwesomeIcon icon={faSearch} className="text-5xl text-[var(--color-text-muted)] opacity-40" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">
                        {searchQuery || filterSubject ? 'Tidak ada hasil' : 'Belum ada data guru'}
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-sm mx-auto">
                        {searchQuery || filterSubject
                            ? 'Coba gunakan kata kunci lain atau hapus filter.'
                            : 'Mulai tambahkan data guru untuk melihat informasi di sini.'
                        }
                    </p>
                    {searchQuery || filterSubject ? (
                        <button onClick={clearFilters} className="btn btn-secondary px-8 rounded-full">
                            <FontAwesomeIcon icon={faTimes} className="mr-2" />
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={handleAdd} className="btn btn-primary px-8 rounded-full">
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            Tambah Guru Pertama
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop: Table View */}
                    <div className="hidden md:block glass rounded-[1.5rem] overflow-hidden border border-[var(--color-border)] shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Nama Guru</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Mata Pelajaran</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Email</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Kontak</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-right pr-6">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {filteredTeachers.map(teacher => (
                                        <tr key={teacher.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black shrink-0 shadow-sm">
                                                        {teacher.name.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-sm text-[var(--color-text)] truncate">{teacher.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-[13px] text-[var(--color-text-muted)] font-medium">
                                                <span className="px-2.5 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-none rounded-md text-[11px] font-bold tracking-tight uppercase">
                                                    {teacher.subject}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-[var(--color-text-muted)] font-medium lowercase italic opacity-80">{teacher.email}</td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-2 text-xs text-green-600 hover:text-green-700 font-bold transition-colors"
                                                    title="Hubungi via WhatsApp"
                                                >
                                                    <FontAwesomeIcon icon={faWhatsapp} className="text-base" />
                                                    {teacher.phone}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => handleEdit(teacher)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm" title="Edit">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button onClick={() => handleDelete(teacher)} className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm" title="Hapus">
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

                    {/* Mobile: Card View */}
                    <div className="md:hidden space-y-3">
                        {filteredTeachers.map(teacher => (
                            <div key={teacher.id} className="glass rounded-2xl p-4 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-sm font-black shrink-0 shadow-sm">
                                        {teacher.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm text-[var(--color-text)] truncate">
                                            {teacher.name}
                                        </h3>
                                        <p className="text-xs text-[var(--color-text-muted)] font-medium">
                                            <span className="px-2 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded text-[10px] font-bold uppercase">
                                                {teacher.subject}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-2 mb-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--color-text-muted)] font-medium w-16">Email:</span>
                                        <span className="text-[var(--color-text)] font-medium truncate lowercase italic">
                                            {teacher.email}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[var(--color-text-muted)] font-medium w-16">WA:</span>
                                        <a
                                            href={`https://wa.me/${teacher.phone.replace(/^0/, '62')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 font-bold transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faWhatsapp} />
                                            {teacher.phone}
                                        </a>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                                    <button
                                        onClick={() => handleEdit(teacher)}
                                        className="flex-1 btn btn-secondary text-xs py-2 h-9 font-bold rounded-lg hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
                                    >
                                        <FontAwesomeIcon icon={faEdit} className="mr-1.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(teacher)}
                                        className="flex-1 btn bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500 hover:text-white text-xs py-2 h-9 font-bold rounded-lg transition-all"
                                    >
                                        <FontAwesomeIcon icon={faTrash} className="mr-1.5" />
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Update Data Guru' : 'Guru Baru'} size="md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Nama Lengkap <span className="text-red-500">*</span></label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama lengkap dengan gelar" className="input-field font-bold text-sm py-2.5 h-11" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Mata Pelajaran</label>
                            <input type="text" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g. Matematika" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">No. HP / WA</label>
                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Email Sekolah</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@sekolah.id" className="input-field font-bold text-sm py-2.5 h-11" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-11 px-6 uppercase tracking-widest rounded-xl">BATAL</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-lg shadow-[var(--color-primary)]/20 py-2 text-xs h-11 uppercase tracking-widest rounded-xl">{selectedItem ? 'UPDATE' : 'SIMPAN'}</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}