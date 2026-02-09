import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBed, faMars, faVenus, faPlus, faEdit, faTrash, faSearch, faSchool, faFilter, faLayerGroup, faVenusMars, faBuilding, faUserTie, faCalendarAlt, faUsers } from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'

// Demo data fallback only if supabase client is missing entirely
const DEMO_CLASSES = [
    { id: '1', name: '7A', grade: '7', major: 'Boarding Putra', homeroom_teacher_id: null, academic_year_id: null, teacherName: 'Budi Santoso, S.Pd', academicYearName: '2024/2025', students: 32 },
    { id: '2', name: '7B', grade: '7', major: 'Boarding Putri', homeroom_teacher_id: null, academic_year_id: null, teacherName: 'Sari Dewi, M.Pd', academicYearName: '2024/2025', students: 30 },
]

const LEVELS = ['7', '8', '9', '10', '11', '12']
const PROGRAMS = ['Boarding', 'Reguler']
const GENDERS = ['Putra', 'Putri']

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

    // Modal & Selection States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)

    // UI fields for the modal
    const [formData, setFormData] = useState({
        name: '',
        level: '',
        program: '',
        gender_type: '',
        homeroom_teacher_id: '',
        academic_year_id: ''
    })

    const { addToast } = useToast()

    async function loadTeachers() {
        if (!supabase) return {}
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('user_role', 'teacher')
                .order('name')
            const list = data || []
            setTeachersList(list)
            return Object.fromEntries(list.map(t => [t.id, t.name || '—']))
        } catch { return {} }
    }

    async function loadAcademicYears() {
        if (!supabase) return {}
        try {
            const { data } = await supabase
                .from('academic_years')
                .select('id, name, semester')
                .order('name', { ascending: false })
            const list = (data || []).map(y => ({
                ...y,
                label: [y.name, y.semester].filter(Boolean).join(' ') || '—',
            }))
            setAcademicYearsList(list)
            return Object.fromEntries(list.map(y => [y.id, y.label]))
        } catch { return {} }
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

                if (!error) {
                    setClasses((data || []).map(row => normalizeClass(row, teachersMap, yearsMap)))
                } else {
                    console.error("Error fetching classes:", error)
                    setClasses(DEMO_CLASSES)
                }
            } catch (err) {
                console.error("Exception fetching classes:", err)
                setClasses(DEMO_CLASSES)
            }
        } else {
            setClasses(DEMO_CLASSES)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadClasses()
    }, [])

    const parseMajorColumn = (majorStr = '') => {
        let program = 'Reguler'
        let gender = ''
        if (majorStr.includes('Boarding')) program = 'Boarding'
        if (majorStr.includes('Putra')) gender = 'Putra'
        if (majorStr.includes('Putri')) gender = 'Putri'
        return { program, gender }
    }

    const filteredClasses = classes.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.major.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({
            name: '',
            level: '7',
            program: 'Reguler',
            gender_type: 'Putra',
            homeroom_teacher_id: '',
            academic_year_id: ''
        })
        setIsModalOpen(true)
    }

    const handleEdit = (item) => {
        setSelectedItem(item)
        const { program, gender } = parseMajorColumn(item.major)
        setFormData({
            name: item.name,
            level: item.grade,
            program: program,
            gender_type: gender,
            homeroom_teacher_id: item.homeroom_teacher_id || '',
            academic_year_id: item.academic_year_id || '',
        })
        setIsModalOpen(true)
    }

    const confirmDelete = (item) => {
        setItemToDelete(item)
        setIsDeleteModalOpen(true)
    }

    const executeDelete = async () => {
        if (!itemToDelete) return
        if (supabase) {
            const { error } = await supabase.from('classes').delete().eq('id', itemToDelete.id)
            if (error) {
                addToast(error.message || 'Gagal menghapus kelas', 'error')
                setIsDeleteModalOpen(false)
                return
            }
        }
        setClasses(prev => prev.filter(c => c.id !== itemToDelete.id))
        addToast('Kelas berhasil dihapus', 'success')
        setIsDeleteModalOpen(false)
        setItemToDelete(null)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name) { addToast('Nama kelas wajib diisi', 'warning'); return }
        if (!formData.level) { addToast('Tingkat wajib dipilih', 'warning'); return }

        let constructedMajor = []
        if (formData.program) constructedMajor.push(formData.program)
        if (formData.gender_type) constructedMajor.push(formData.gender_type)
        const finalMajor = constructedMajor.join(' ')

        const payload = {
            name: formData.name,
            grade: formData.level,
            major: finalMajor,
            homeroom_teacher_id: formData.homeroom_teacher_id || null,
            academic_year_id: formData.academic_year_id || null,
        }

        if (selectedItem) {
            if (supabase) {
                const { error } = await supabase.from('classes').update(payload).eq('id', selectedItem.id)
                if (error) {
                    addToast(error.message || 'Gagal mengupdate kelas', 'error')
                    return
                }
                await loadClasses()
            } else {
                const teacherName = teachersList.find(t => t.id === formData.homeroom_teacher_id)?.name || '—'
                const ay = academicYearsList.find(y => y.id === formData.academic_year_id)
                const academicYearName = ay?.label || ay?.name || '—'
                setClasses(prev => prev.map(c => c.id === selectedItem.id ? { ...c, ...payload, teacherName, academicYearName } : c))
            }
            addToast('Data berhasil diupdate', 'success')
        } else {
            if (supabase) {
                const { error } = await supabase.from('classes').insert(payload)
                if (error) {
                    addToast(error.message || 'Gagal menambah kelas', 'error')
                    setIsModalOpen(false)
                    return
                }
                await loadClasses()
            } else {
                const teacherName = teachersList.find(t => t.id === formData.homeroom_teacher_id)?.name || '—'
                const ay = academicYearsList.find(y => y.id === formData.academic_year_id)
                const academicYearName = ay?.label || ay?.name || '—'
                setClasses(prev => [...prev, { id: String(Date.now()), students: 0, ...payload, teacherName, academicYearName }])
            }
            addToast('Kelas berhasil ditambahkan', 'success')
        }
        setIsModalOpen(false)
    }

    return (
        <DashboardLayout title="Data Kelas">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                    <h1 className="text-xl font-bold">Data Kelas</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5">
                        Total {classes.length} kelas aktif didefinisikan dalam sistem.
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-indigo-500/20 h-10 text-xs font-bold px-4">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2">TAMBAH KELAS</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl mb-5 p-3.5 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                            <FontAwesomeIcon icon={faSearch} className="text-xs" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama kelas, wali..."
                            className="input-field pl-10 w-full h-10 text-xs"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="card py-20 flex flex-col items-center justify-center">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="text-[var(--color-text-muted)] mt-4 font-medium">Memuat data kelas...</p>
                </div>
            ) : filteredClasses.length === 0 ? (
                <div className="card py-16 text-center">
                    <div className="w-20 h-20 bg-[var(--color-surface-alt)] rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSchool} className="text-3xl" />
                    </div>
                    <h3 className="text-xl font-bold text-[var(--color-text)]">Tidak ada data ditemukan</h3>
                    <p className="text-[var(--color-text-muted)] mb-6">Coba gunakan kata kunci lain atau tambah kelas baru.</p>
                    <button onClick={handleAdd} className="btn btn-primary px-8">Tambah Kelas</button>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-950 border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Nama Kelas</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Tingkat</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Program</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Gender</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Wali Kelas</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Siswa</th>
                                    <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right pr-6">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredClasses.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                        <td className="px-5 py-3">
                                            <span className="font-bold text-[13px] text-gray-900 dark:text-white">{cls.name}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <span className="badge badge-primary px-2 py-0.5 text-[10px] uppercase font-bold tracking-tight rounded-md">Lvl {cls.grade}</span>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {cls.major.includes('Boarding') ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 text-[10px] font-bold border border-amber-200/50 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faBed} className="text-[9px]" /> Boarding
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold border border-slate-200/50 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faBuilding} className="text-[9px]" /> Reguler
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            {cls.major.includes('Putra') ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 text-[10px] font-bold border border-blue-200/50 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faMars} className="text-[9px]" /> Putra
                                                </span>
                                            ) : cls.major.includes('Putri') ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400 text-[10px] font-bold border border-pink-200/50 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faVenus} className="text-[9px]" /> Putri
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">— CAMPUR —</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-1.5 text-[13px] font-bold text-gray-900 dark:text-white">
                                                <span className="truncate">{cls.teacherName}</span>
                                            </div>
                                            <div className="text-[9px] text-gray-400 flex items-center gap-1 mt-0.5 font-mono font-medium">
                                                <FontAwesomeIcon icon={faCalendarAlt} className="text-[8px]" />
                                                {cls.academicYearName}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-center">
                                            <div className="inline-flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-2.5 py-1 rounded-md text-[11px] font-bold text-gray-900 dark:text-white border border-gray-100 dark:border-gray-800">
                                                <FontAwesomeIcon icon={faUsers} className="text-[10px] text-indigo-500" />
                                                {cls.students}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 text-right pr-6">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <button
                                                    onClick={() => handleEdit(cls)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all text-xs"
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(cls)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all text-xs"
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
            )}

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Kelas' : 'Tambah Kelas Baru'} size="md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <section className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-2">
                            <FontAwesomeIcon icon={faBuilding} className="text-[9px]" /> Identitas Kelas
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Kelas <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: 7A, 8B"
                                    className="input-field font-bold text-xs py-2.5 h-10"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tingkat (Level)</label>
                                <select
                                    value={formData.level}
                                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                    className="select-field font-bold text-xs py-2 h-10"
                                >
                                    <option value="">Pilih Tingkat</option>
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Program</label>
                                <div className="flex gap-1 p-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    {PROGRAMS.map(prog => (
                                        <button
                                            key={prog}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, program: prog })}
                                            className={`flex-1 py-1.5 rounded-md text-[9px] font-bold transition-all uppercase tracking-tighter
                                                ${formData.program === prog
                                                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5'
                                                    : 'text-gray-400 hover:text-gray-600'
                                                }`}
                                        >
                                            {prog}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Gender Khusus</label>
                                <div className="flex gap-1 p-1 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender_type: formData.gender_type === 'Putra' ? '' : 'Putra' })}
                                        className={`flex-1 py-1.5 rounded-md text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-tighter
                                            ${formData.gender_type === 'Putra'
                                                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm ring-1 ring-black/5'
                                                : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faMars} className="text-[8px]" /> Putra
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender_type: formData.gender_type === 'Putri' ? '' : 'Putri' })}
                                        className={`flex-1 py-1.5 rounded-md text-[9px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-tighter
                                            ${formData.gender_type === 'Putri'
                                                ? 'bg-white dark:bg-pink-600 text-pink-600 dark:text-white shadow-sm ring-1 ring-black/5'
                                                : 'text-gray-400 hover:text-gray-600'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faVenus} className="text-[8px]" /> Putri
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-3 pt-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 border-b border-gray-100 dark:border-gray-800 pb-1.5 flex items-center gap-2">
                            <FontAwesomeIcon icon={faSchool} className="text-[9px]" /> Wali & Akademik
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Wali Kelas</label>
                                <select
                                    value={formData.homeroom_teacher_id}
                                    onChange={(e) => setFormData({ ...formData, homeroom_teacher_id: e.target.value })}
                                    className="select-field font-bold text-xs py-2 h-10"
                                >
                                    <option value="">Pilih Wali Kelas</option>
                                    {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tahun Ajaran</label>
                                <select
                                    value={formData.academic_year_id}
                                    onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                                    className="select-field font-bold text-xs py-2 h-10"
                                >
                                    <option value="">Pilih Tahun Ajaran</option>
                                    {academicYearsList.map(y => <option key={y.id} value={y.id}>{y.label || y.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary font-bold py-2 text-xs h-10 px-6 uppercase tracking-widest">Batal</button>
                        <button type="submit" className="btn btn-primary px-8 font-bold shadow-md shadow-indigo-500/20 py-2 text-xs h-10 uppercase tracking-widest">{selectedItem ? 'UPDATE' : 'SIMPAN'}</button>
                    </div>
                </form>
            </Modal>

            {/* Custom Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Hapus">
                <div className="space-y-5">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-4 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/30">
                        <div className="w-11 h-11 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0 text-lg">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider leading-tight">Hapus Kelas?</h3>
                            <p className="text-[9px] opacity-80 font-medium mt-0.5">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
                        </div>
                    </div>
                    <div className="px-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                            Apakah Anda yakin ingin menghapus kelas <strong className="text-red-600 font-bold">{itemToDelete?.name}</strong>?
                            <br />
                            <span className="text-[10px] text-gray-400 mt-2 block italic">Semua data siswa dalam kelas ini mungkin akan kehilangan referensi kelas.</span>
                        </p>
                    </div>
                    <div className="flex gap-2.5 pt-1">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary flex-1 font-bold h-10 text-[10px] uppercase tracking-widest">
                            BATAL
                        </button>
                        <button type="button" onClick={executeDelete} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-sm flex-1 font-bold h-10 text-[10px] uppercase tracking-widest">
                            YA, HAPUS
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
