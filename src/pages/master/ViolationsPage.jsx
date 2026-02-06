import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons'
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
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', points: '', category: '', isNegative: true })
    const { addToast } = useToast()

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

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!formData.name || !formData.points || !formData.category) {
            addToast('Semua field wajib diisi', 'warning')
            return
        }

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
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Jenis Pelanggaran & Prestasi">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Jenis Pelanggaran & Prestasi</h1>
                    <p className="text-[var(--color-text-muted)]">
                        Kelola daftar pelanggaran, prestasi, dan poin masing-masing
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary">
                    <FontAwesomeIcon icon={faPlus} />
                    Tambah
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FontAwesomeIcon
                            icon={faSearch}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari..."
                            className="input pl-10"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="input w-auto"
                    >
                        <option value="">Semua Kategori</option>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredViolations.map((item) => (
                    <div
                        key={item.id}
                        className={`card border-l-4 ${item.isNegative ? 'border-l-red-500' : 'border-l-emerald-500'}`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-semibold mb-1">{item.name}</h3>
                                <p className="text-sm text-[var(--color-text-muted)] mb-2">{item.category}</p>
                                <span className={`badge ${item.isNegative ? 'badge-danger' : 'badge-success'}`}>
                                    {item.points > 0 ? '+' : ''}{item.points} poin
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(item)}
                                    className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500"
                                >
                                    <FontAwesomeIcon icon={faEdit} />
                                </button>
                                <button
                                    onClick={() => handleDelete(item)}
                                    className="p-2 text-[var(--color-text-muted)] hover:text-red-500"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedItem ? 'Edit Data' : 'Tambah Data Baru'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Nama</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Terlambat"
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Tipe</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    checked={formData.isNegative}
                                    onChange={() => setFormData({ ...formData, isNegative: true })}
                                    className="accent-red-500"
                                />
                                <span className="text-red-500">Pelanggaran (-)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    checked={!formData.isNegative}
                                    onChange={() => setFormData({ ...formData, isNegative: false })}
                                    className="accent-emerald-500"
                                />
                                <span className="text-emerald-500">Prestasi (+)</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Poin</label>
                        <input
                            type="number"
                            value={formData.points}
                            onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                            placeholder="5"
                            min="1"
                            className="input"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Kategori</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="input"
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
                            Batal
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {selectedItem ? 'Update' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
