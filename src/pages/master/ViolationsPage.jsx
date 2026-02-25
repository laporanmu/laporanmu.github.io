import { useState, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch, faShieldAlt, faGavel, faTrophy, faFilter, faCheckCircle, faExclamationTriangle, faSpinner, faTimes } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useDebounce } from '../../hooks/useDebounce'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

const DEMO_VIOLATIONS = [
    { id: 1, name: 'Terlambat', points: -5, category: 'Kedisiplinan', isNegative: true },
    { id: 2, name: 'Tidak mengerjakan PR', points: -10, category: 'Akademik', isNegative: true },
    { id: 3, name: 'Makan di kelas', points: -3, category: 'Tata Tertib', isNegative: true },
    { id: 4, name: 'Tidak memakai seragam lengkap', points: -5, category: 'Tata Tertib', isNegative: true },
    { id: 5, name: 'Berkelahi', points: -25, category: 'Kedisiplinan', isNegative: true },
    { id: 6, name: 'Juara Kelas', points: 20, category: 'Prestasi', isNegative: false },
    { id: 7, name: 'Membantu Guru', points: 5, category: 'Sikap', isNegative: false },
    { id: 8, name: 'Juara Lomba', points: 30, category: 'Prestasi', isNegative: false },
]

const CATEGORIES = ['Kedisiplinan', 'Akademik', 'Tata Tertib', 'Sikap', 'Prestasi']

// Point badge component dengan color coding
function PointsBadge({ points }) {
    const severity = Math.abs(points)
    let colorClass = ''

    if (severity >= 20) colorClass = 'bg-red-600 text-white shadow-red-600/30'
    else if (severity >= 10) colorClass = 'bg-orange-500 text-white shadow-orange-500/30'
    else if (severity >= 5) colorClass = 'bg-yellow-600 text-white shadow-yellow-600/30'
    else if (points > 0) colorClass = 'bg-emerald-500 text-white shadow-emerald-500/30'
    else colorClass = 'bg-gray-500 text-white shadow-gray-500/30'

    return (
        <span className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-md ${colorClass}`}>
            {points > 0 ? '+' : ''}{points} POIN
        </span>
    )
}

export default function ViolationsPage() {
    const [violations, setViolations] = useState(DEMO_VIOLATIONS)
    const [loading, setLoading] = useState(false) // Changed for demo
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterType, setFilterType] = useState('') // 'violation' or 'achievement'
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', points: '', category: '', isNegative: true })
    const { addToast } = useToast()

    // Debounced search
    const debouncedSearch = useDebounce(searchQuery, 300)

    // Stats calculation
    const stats = useMemo(() => ({
        total: violations.length,
        violations: violations.filter(v => v.isNegative).length,
        achievements: violations.filter(v => !v.isNegative).length,
    }), [violations])

    // Enhanced filtering
    const filteredViolations = useMemo(() => {
        return violations.filter(v => {
            const matchesSearch = v.name.toLowerCase().includes(debouncedSearch.toLowerCase())
            const matchesCategory = !filterCategory || v.category === filterCategory
            const matchesType = !filterType || (
                filterType === 'violation' ? v.isNegative : !v.isNegative
            )
            return matchesSearch && matchesCategory && matchesType
        })
    }, [violations, debouncedSearch, filterCategory, filterType])

    const hasActiveFilters = searchQuery || filterCategory || filterType

    const clearFilters = () => {
        setSearchQuery('')
        setFilterCategory('')
        setFilterType('')
    }

    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({ name: '', points: '', category: 'Kedisiplinan', isNegative: true })
        setIsModalOpen(true)
    }

    const handleEdit = (item) => {
        setSelectedItem(item)
        setFormData({
            name: item.name,
            points: Math.abs(item.points),
            category: item.category,
            isNegative: item.isNegative,
        })
        setIsModalOpen(true)
    }

    const handleDelete = (item) => {
        if (confirm(`Hapus "${item.name}"?`)) {
            setViolations(prev => prev.filter(v => v.id !== item.id))
            addToast('Data berhasil dihapus', 'success')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name || !formData.points || !formData.category) {
            addToast('Semua field wajib diisi', 'warning')
            return
        }

        setSubmitting(true)
        await new Promise(r => setTimeout(r, 600))

        const pointsValue = formData.isNegative ? -Math.abs(Number(formData.points)) : Math.abs(Number(formData.points))

        if (selectedItem) {
            setViolations(prev => prev.map(v =>
                v.id === selectedItem.id ? { ...v, name: formData.name, points: pointsValue, category: formData.category, isNegative: formData.isNegative } : v
            ))
            addToast('Data berhasil diupdate', 'success')
        } else {
            const newItem = {
                id: Date.now(),
                name: formData.name,
                points: pointsValue,
                category: formData.category,
                isNegative: formData.isNegative,
            }
            setViolations(prev => [...prev, newItem])
            addToast('Data berhasil ditambahkan', 'success')
        }
        setSubmitting(false)
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Jenis Pelanggaran & Prestasi">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Poin Perilaku</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Konfigurasi bobot poin untuk setiap jenis pelanggaran dan prestasi siswa.
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">TAMBAH</span>
                </button>
            </div>

            {/* Stats Row - Responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-[var(--color-primary)] flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-[var(--color-primary)]/5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faShieldAlt} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Total Tipe</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.total}</h3>
                    </div>
                </div>
                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-red-500 flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-red-500/5">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faGavel} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Pelanggaran</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.violations}</h3>
                    </div>
                </div>
                <div className="glass rounded-[1.5rem] p-5 border-t-[3px] border-t-emerald-500 flex items-center gap-4 group hover:border-t-4 transition-all hover:bg-emerald-500/5">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-xl group-hover:scale-110 transition-transform">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Prestasi</p>
                        <h3 className="text-2xl font-black font-heading leading-none text-[var(--color-text)]">{stats.achievements}</h3>
                    </div>
                </div>
            </div>

            {/* Enhanced Filters */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="flex flex-col gap-3">
                    {/* Search */}
                    <div className="flex-1 relative font-normal group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--color-primary)]">
                            <FontAwesomeIcon icon={faSearch} className="text-sm" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama pelanggaran atau prestasi..."
                            className="input-field pl-11 pr-10 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        )}
                    </div>

                    {/* Filter Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="select-field font-bold text-sm h-11 bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl"
                        >
                            <option value="">Semua Kategori</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>

                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="select-field font-bold text-sm h-11 bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] rounded-xl"
                        >
                            <option value="">Semua Tipe</option>
                            <option value="violation">Pelanggaran Saja</option>
                            <option value="achievement">Prestasi Saja</option>
                        </select>
                    </div>

                    {/* Active Filters */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)] flex-wrap">
                            <span className="text-xs text-[var(--color-text-muted)] font-medium flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
                                Filter aktif:
                            </span>
                            {filterCategory && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold">
                                    {filterCategory}
                                    <button onClick={() => setFilterCategory('')} className="hover:text-[var(--color-accent)]">
                                        <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                                    </button>
                                </span>
                            )}
                            {filterType && (
                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] rounded-lg text-xs font-bold">
                                    {filterType === 'violation' ? 'Pelanggaran' : 'Prestasi'}
                                    <button onClick={() => setFilterType('')} className="hover:text-[var(--color-accent)]">
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
                    <div className="pt-3 border-t border-[var(--color-border)]">
                        <p className="text-xs text-[var(--color-text-muted)]">
                            Menampilkan <strong className="text-[var(--color-text)] font-bold">{filteredViolations.length}</strong> dari {violations.length} konfigurasi
                            {debouncedSearch && ` (hasil pencarian: "${debouncedSearch}")`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <>
                    <div className="hidden md:block"><TableSkeleton rows={5} cols={5} /></div>
                    <div className="md:hidden"><CardSkeleton count={3} /></div>
                </>
            ) : filteredViolations.length === 0 ? (
                /* Empty State */
                <div className="glass rounded-[2rem] py-20 text-center border-dashed border-2 border-[var(--color-border)]">
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FontAwesomeIcon icon={faSearch} className="text-5xl text-[var(--color-text-muted)] opacity-40" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">
                        {hasActiveFilters ? 'Tidak ada hasil' : 'Belum ada konfigurasi'}
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-sm mx-auto">
                        {hasActiveFilters
                            ? 'Coba gunakan filter lain atau hapus filter yang aktif.'
                            : 'Mulai tambahkan konfigurasi poin baru.'
                        }
                    </p>
                    {hasActiveFilters ? (
                        <button onClick={clearFilters} className="btn btn-secondary px-8 rounded-full">
                            <FontAwesomeIcon icon={faTimes} className="mr-2" />
                            Clear Filters
                        </button>
                    ) : (
                        <button onClick={handleAdd} className="btn btn-primary px-8 rounded-full">
                            <FontAwesomeIcon icon={faPlus} className="mr-2" />
                            Tambah Konfigurasi
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
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Deskripsi</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Kategori</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Tipe Poin</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Bobot</th>
                                        <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-right pr-6">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {filteredViolations.map((item) => (
                                        <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-sm text-[var(--color-text)] leading-tight">{item.name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-bold tracking-widest uppercase border border-[var(--color-border)]">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {item.isNegative ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[11px] font-bold uppercase tracking-tight border border-red-500/20">
                                                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-[10px]" /> Pelanggaran
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-tight border border-emerald-500/20">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" /> Prestasi
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <PointsBadge points={item.points} />
                                            </td>
                                            <td className="px-6 py-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm"
                                                        title="Edit"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
                                                        title="Hapus"
                                                    >
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
                        {filteredViolations.map((item) => (
                            <div key={item.id} className="glass rounded-2xl p-4 border border-[var(--color-border)] hover:shadow-md transition-shadow">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-base text-[var(--color-text)] mb-2">
                                            {item.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-bold tracking-widest uppercase border border-[var(--color-border)]">
                                                {item.category}
                                            </span>
                                            {item.isNegative ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 text-red-600 text-[10px] font-bold uppercase tracking-tight border border-red-500/20">
                                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" /> Pelanggaran
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-tight border border-emerald-500/20">
                                                    <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /> Prestasi
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Points Display */}
                                <div className="mb-3">
                                    <PointsBadge points={item.points} />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                                    <button
                                        onClick={() => handleEdit(item)}
                                        className="flex-1 btn btn-secondary text-xs py-2 h-9 font-bold rounded-lg hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
                                    >
                                        <FontAwesomeIcon icon={faEdit} className="mr-1.5" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item)}
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
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Pembaruan Konfigurasi' : 'Konfigurasi Poin Baru'} size="md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">
                                Deskripsi Poin <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Contoh: Terlambat, Juara Kelas, dll"
                                className="input-field font-bold text-sm py-2.5 h-11"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Tipe Akumulasi</label>
                                <div className="flex gap-2 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isNegative: true })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all uppercase tracking-tight ${formData.isNegative
                                            ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faGavel} className="text-[12px]" />
                                        <span>PELANGGARAN (-)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isNegative: false })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[11px] font-bold transition-all uppercase tracking-tight ${!formData.isNegative
                                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faTrophy} className="text-[12px]" />
                                        <span>PRESTASI (+)</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">
                                    Bobot Poin <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.points}
                                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                                    placeholder="5"
                                    min="1"
                                    className="input-field font-bold text-sm py-2 h-11"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">
                                    Kategori <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="select-field font-bold text-sm py-2 h-11"
                                    required
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-11 px-6 uppercase tracking-widest rounded-xl" disabled={submitting}>
                            BATAL
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary px-8 font-bold shadow-lg shadow-[var(--color-primary)]/20 py-2 text-xs h-11 uppercase tracking-widest rounded-xl">
                            {submitting ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            ) : (
                                selectedItem ? 'UPDATE' : 'SIMPAN'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}