import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faEdit, faTrash, faSearch } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

const DEMO_CLASSES = [
    { id: '1', name: 'X MIPA 1', grade: 'X', major: 'MIPA', homeroom_teacher_id: null, academic_year_id: null, teacherName: 'Budi Santoso, S.Pd', academicYearName: '2024/2025', students: 32 },
    { id: '2', name: 'X MIPA 2', grade: 'X', major: 'MIPA', homeroom_teacher_id: null, academic_year_id: null, teacherName: 'Sari Dewi, M.Pd', academicYearName: '2024/2025', students: 30 },
    { id: '3', name: 'XI IPA 1', grade: 'XI', major: 'IPA', homeroom_teacher_id: null, academic_year_id: null, teacherName: 'Ahmad Fauzi, S.Pd', academicYearName: '2024/2025', students: 28 },
    { id: '4', name: 'XII IPA 1', grade: 'XII', major: 'IPA', homeroom_teacher_id: null, academic_year_id: null, teacherName: 'Rina Marlina, S.Pd', academicYearName: '2024/2025', students: 35 },
]

const DEMO_TEACHERS = [
    { id: 't1', name: 'Budi Santoso, S.Pd' },
    { id: 't2', name: 'Sari Dewi, M.Pd' },
    { id: 't3', name: 'Ahmad Fauzi, S.Pd' },
    { id: 't4', name: 'Rina Marlina, S.Pd' },
]
const DEMO_ACADEMIC_YEARS = [
    { id: 'y1', name: '2024/2025', semester: 'Ganjil', label: '2024/2025 Ganjil' },
    { id: 'y2', name: '2023/2024', semester: 'Genap', label: '2023/2024 Genap' },
]

function normalizeClass(row, teachersMap = {}, yearsMap = {}) {
    const id = row.id
    const homeroom_teacher_id = row.homeroom_teacher_id ?? null
    const academic_year_id = row.academic_year_id ?? null
    return {
        id,
        name: row.name || '',
        grade: row.grade || '',
        major: row.major || '',
        homeroom_teacher_id,
        academic_year_id,
        teacherName: homeroom_teacher_id ? (teachersMap[homeroom_teacher_id] || '—') : (row.teacherName ?? row.teacher ?? '—'),
        academicYearName: academic_year_id ? (yearsMap[academic_year_id] || '—') : (row.academicYearName ?? '—'),
        students: row.students ?? row.student_count ?? 0,
    }
}

export default function ClassesPage() {
    const [classes, setClasses] = useState([])
    const [teachersList, setTeachersList] = useState([])
    const [academicYearsList, setAcademicYearsList] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [formData, setFormData] = useState({ name: '', grade: '', major: '', homeroom_teacher_id: '', academic_year_id: '' })
    const { addToast } = useToast()

    async function loadTeachers() {
        if (!supabase) return {}
        try {
            const { data } = await supabase.from('teachers').select('id, name').order('name')
            const list = data || []
            setTeachersList(list)
            return Object.fromEntries((list).map(t => [t.id, t.name || '—']))
        } catch {
            return {}
        }
    }

    async function loadAcademicYears() {
        if (!supabase) return {}
        try {
            const { data } = await supabase.from('academic_years').select('id, name').order('name', { ascending: false })
            const list = (data || []).map(y => ({ ...y, label: y.name || '—' }))
            setAcademicYearsList(list)
            return Object.fromEntries(list.map(y => [y.id, y.label]))
        } catch {
            return {}
        }
    }

    async function loadClasses() {
        setLoading(true)
        if (supabase) {
            try {
                const teachersMap = await loadTeachers()
                const yearsMap = await loadAcademicYears()
                const { data, error } = await supabase
                    .from('classes')
                    .select('id, name, grade, major, homeroom_teacher_id, academic_year_id, created_at')
                    .order('name')
                if (!error && data?.length) {
                    setClasses(data.map(row => normalizeClass(row, teachersMap, yearsMap)))
                } else {
                    setClasses(DEMO_CLASSES)
                }
            } catch {
                setClasses(DEMO_CLASSES)
            }
        } else {
            setTeachersList(DEMO_TEACHERS)
            setAcademicYearsList(DEMO_ACADEMIC_YEARS)
            setClasses(DEMO_CLASSES)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadClasses()
    }, [])

    const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({ name: '', grade: '', major: '', homeroom_teacher_id: '', academic_year_id: '' })
        setIsModalOpen(true)
    }
    const handleEdit = (item) => {
        setSelectedItem(item)
        setFormData({
            name: item.name,
            grade: item.grade,
            major: item.major,
            homeroom_teacher_id: item.homeroom_teacher_id || '',
            academic_year_id: item.academic_year_id || '',
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (item) => {
        if (!confirm(`Hapus kelas "${item.name}"?`)) return
        if (supabase) {
            const { error } = await supabase.from('classes').delete().eq('id', item.id)
            if (error) {
                addToast(error.message || 'Gagal menghapus kelas', 'error')
                return
            }
        }
        setClasses(prev => prev.filter(c => c.id !== item.id))
        addToast('Kelas berhasil dihapus', 'success')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name) { addToast('Nama kelas wajib diisi', 'warning'); return }
        if (selectedItem) {
            if (supabase) {
                const { error } = await supabase.from('classes').update({
                    name: formData.name,
                    grade: formData.grade || null,
                    major: formData.major || null,
                    homeroom_teacher_id: formData.homeroom_teacher_id || null,
                    academic_year_id: formData.academic_year_id || null,
                }).eq('id', selectedItem.id)
                if (error) {
                    addToast(error.message || 'Gagal mengupdate kelas', 'error')
                    return
                }
                await loadClasses()
            } else {
                const teacherName = teachersList.find(t => t.id === formData.homeroom_teacher_id)?.name || '—'
                const ay = academicYearsList.find(y => y.id === formData.academic_year_id)
                const academicYearName = ay?.label || ay?.name || '—'
                setClasses(prev => prev.map(c => c.id === selectedItem.id ? { ...c, ...formData, teacherName, academicYearName } : c))
            }
            addToast('Data berhasil diupdate', 'success')
        } else {
            if (supabase) {
                const { error } = await supabase.from('classes').insert({
                    name: formData.name,
                    grade: formData.grade || null,
                    major: formData.major || null,
                    homeroom_teacher_id: formData.homeroom_teacher_id || null,
                    academic_year_id: formData.academic_year_id || null,
                })
                if (error) {
                    addToast(error.message || 'Gagal menambah kelas', 'error')
                    return
                }
                await loadClasses()
            } else {
                const teacherName = teachersList.find(t => t.id === formData.homeroom_teacher_id)?.name || '—'
                const ay = academicYearsList.find(y => y.id === formData.academic_year_id)
                const academicYearName = ay?.label || ay?.name || '—'
                setClasses(prev => [...prev, { id: String(Date.now()), students: 0, ...formData, teacherName, academicYearName }])
            }
            addToast('Kelas berhasil ditambahkan', 'success')
        }
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Data Kelas">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div><h1 className="text-2xl font-bold">Data Kelas</h1><p className="text-[var(--color-text-muted)]">Kelola data kelas dan wali kelas</p></div>
                <button onClick={handleAdd} className="btn btn-primary"><FontAwesomeIcon icon={faPlus} /> Tambah Kelas</button>
            </div>

            <div className="card mb-6">
                <div className="relative"><FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari kelas..." className="input pl-10 w-full" /></div>
            </div>

            {loading ? (
                <div className="text-center py-12 text-[var(--color-text-muted)]">Memuat data kelas...</div>
            ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map(cls => (
                    <div key={cls.id} className="card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">{cls.grade}</div>
                            <div className="flex gap-1">
                                <button onClick={() => handleEdit(cls)} className="p-2 text-[var(--color-text-muted)] hover:text-indigo-500"><FontAwesomeIcon icon={faEdit} /></button>
                                <button onClick={() => handleDelete(cls)} className="p-2 text-[var(--color-text-muted)] hover:text-red-500"><FontAwesomeIcon icon={faTrash} /></button>
                            </div>
                        </div>
                        <h3 className="font-semibold text-lg mb-1">{cls.name}</h3>
                        <p className="text-sm text-[var(--color-text-muted)] mb-1">Wali: {cls.teacherName}</p>
                        {cls.academicYearName && <p className="text-sm text-[var(--color-text-muted)] mb-3">Tahun: {cls.academicYearName}</p>}
                        <div className="flex items-center justify-between text-sm">
                            <span className="badge badge-primary">{cls.major}</span>
                            <span className="text-[var(--color-text-muted)]">{cls.students} siswa</span>
                        </div>
                    </div>
                ))}
            </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Kelas' : 'Tambah Kelas'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <section>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Informasi Kelas</h4>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Nama Kelas</label>
                                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. XII IPA 1" className="input w-full" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Tingkat</label>
                                    <select value={formData.grade} onChange={(e) => setFormData({ ...formData, grade: e.target.value })} className="input w-full">
                                        <option value="">Pilih</option>
                                        <option value="X">X</option>
                                        <option value="XI">XI</option>
                                        <option value="XII">XII</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Jurusan</label>
                                    <input type="text" value={formData.major} onChange={(e) => setFormData({ ...formData, major: e.target.value })} placeholder="e.g. IPA, MIPA, IPS" className="input w-full" />
                                </div>
                            </div>
                        </div>
                    </section>
                    <section>
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Wali & Tahun Ajaran</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Wali Kelas</label>
                                <select value={formData.homeroom_teacher_id} onChange={(e) => setFormData({ ...formData, homeroom_teacher_id: e.target.value })} className="input w-full">
                                    <option value="">Pilih wali kelas</option>
                                    {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Tahun Ajaran</label>
                                <select value={formData.academic_year_id} onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })} className="input w-full">
                                    <option value="">Pilih tahun ajaran</option>
                                    {academicYearsList.map(y => <option key={y.id} value={y.id}>{y.label || y.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>
                    <div className="flex justify-end gap-3 pt-2 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Batal</button>
                        <button type="submit" className="btn btn-primary">{selectedItem ? 'Simpan Perubahan' : 'Simpan Kelas'}</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}
