import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch, faShieldAlt, faGavel, faTrophy, faFilter, faCheckCircle, faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'

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

export default function ViolationsPage() {
    const [violations, setViolations] = useState(DEMO_VIOLATIONS)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', points: '', category: '', isNegative: true })
    const { addToast } = useToast()

    // Stats calculation
    const stats = {
        total: violations.length,
        violations: violations.filter(v => v.isNegative).length,
        achievements: violations.filter(v => !v.isNegative).length,
    }

    const filteredViolations = violations.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesCategory = !filterCategory || v.category === filterCategory
        return matchesSearch && matchesCategory
    })

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
        // Simulate a small delay for better UX feel
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Poin Perilaku</h1>
                    <p className="text-[var(--color-text-muted)] text-sm mt-1">
                        Konfigurasi bobot poin untuk setiap jenis pelanggaran dan prestasi siswa.
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-indigo-500/20">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2">Tambah Konfigurasi</span>
                </button>
            </div>

            {/* Premium Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="card p-4 border-l-4 border-l-indigo-500 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl">
                        <FontAwesomeIcon icon={faShieldAlt} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Tipe</p>
                        <h3 className="text-xl font-bold">{stats.total}</h3>
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-l-red-500 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center text-xl">
                        <FontAwesomeIcon icon={faGavel} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pelanggaran</p>
                        <h3 className="text-xl font-bold">{stats.violations}</h3>
                    </div>
                </div>
                <div className="card p-4 border-l-4 border-l-emerald-500 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xl">
                        <FontAwesomeIcon icon={faTrophy} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prestasi</p>
                        <h3 className="text-xl font-bold">{stats.achievements}</h3>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6 p-4">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full font-normal">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faSearch} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama pelanggaran atau prestasi..."
                            className="input-field pl-10 w-full"
                        />
                    </div>
                    <div className="relative w-full sm:w-64">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faFilter} className="text-xs" />
                        </div>
                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="select-field pl-10 w-full font-medium"
                        >
                            <option value="">Semua Kategori</option>
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Table Layout */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Deskripsi</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center">Kategori</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center">Tipe Poin</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-center">Bobot</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-text-muted)] text-right px-8">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--color-border)]">
                            {filteredViolations.map((item) => (
                                <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[var(--color-text)] leading-tight">{item.name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold tracking-widest uppercase border border-slate-200/50">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.isNegative ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 text-[10px] font-bold uppercase">
                                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-[8px]" /> Pelanggaran
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 text-[10px] font-bold uppercase">
                                                <FontAwesomeIcon icon={faCheckCircle} className="text-[8px]" /> Prestasi
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`text-sm font-bold ${item.isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {item.points > 0 ? '+' : ''}{item.points} Poin
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 px-2">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all active:scale-90"
                                                title="Edit"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="text-sm" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
                                                title="Hapus"
                                            >
                                                <FontAwesomeIcon icon={faTrash} className="text-sm" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedItem ? 'Pembaruan Konfigurasi' : 'Konfigurasi Poin Baru'}
                size="md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <section className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 ml-1">Deskripsi Poin</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Contoh: Terlambat, Juara Kelas, dll"
                                className="input-field font-medium text-sm py-2"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 ml-1">Tipe Akumulasi</label>
                                <div className="flex gap-1.5 p-1 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isNegative: true })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${formData.isNegative
                                            ? 'bg-red-500 text-white shadow-sm'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faGavel} className="text-[9px]" />
                                        <span>PELANGGARAN (-)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isNegative: false })}
                                        className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${!formData.isNegative
                                            ? 'bg-emerald-500 text-white shadow-sm'
                                            : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faTrophy} className="text-[9px]" />
                                        <span>PRESTASI (+)</span>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 ml-1">Bobot Poin</label>
                                <input
                                    type="number"
                                    value={formData.points}
                                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                                    placeholder="5"
                                    min="1"
                                    className="input-field font-medium text-sm py-2"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-1.5 ml-1">Kategori</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="select-field font-medium text-sm py-2"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs">
                            Batal
                        </button>
                        <button type="submit" disabled={submitting} className="btn btn-primary px-8 font-bold shadow-md shadow-indigo-500/20 py-2 text-xs">
                            {submitting ? (
                                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                            ) : (
                                selectedItem ? 'SIMPAN PERUBAHAN' : 'TAMBAHKAN POIN'
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
