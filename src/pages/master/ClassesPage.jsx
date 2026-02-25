import { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faSearch, faEdit, faTrash, faTimes, faSpinner, faBuilding, faMars, faVenus, faSchool, faBed, faCalendarAlt, faUsers } from '@fortawesome/free-solid-svg-icons'
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">Data Kelas</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Total {classes.length} kelas aktif didefinisikan dalam sistem.
                    </p>
                </div>
                <button onClick={handleAdd} className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full">
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2">TAMBAH KELAS</span>
                </button>
            </div>

            {/* Filters */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="flex-1 relative w-full group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--color-primary)]">
                            <FontAwesomeIcon icon={faSearch} className="text-sm" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama kelas, wali..."
                            className="input-field pl-11 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="glass rounded-[2rem] py-24 flex flex-col items-center justify-center border border-[var(--color-border)]">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-[var(--color-primary)] opacity-50 mb-4" />
                    <p className="text-[var(--color-text-muted)] font-bold tracking-[0.2em] uppercase text-xs">Memuat data kelas...</p>
                </div>
            ) : filteredClasses.length === 0 ? (
                <div className="glass rounded-[2rem] py-20 text-center border-dashed border-2 border-[var(--color-border)]">
                    <div className="w-24 h-24 bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <FontAwesomeIcon icon={faSchool} className="text-4xl text-[var(--color-text-muted)] opacity-50" />
                    </div>
                    <h3 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Tidak ada data ditemukan</h3>
                    <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-sm mx-auto">Coba gunakan kata kunci lain atau tambah kelas baru.</p>
                    <button onClick={handleAdd} className="btn btn-primary px-8 rounded-full">Tambah Kelas</button>
                </div>
            ) : (
                <div className="glass rounded-[1.5rem] overflow-hidden border border-[var(--color-border)] shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)] backdrop-blur-sm">
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Nama Kelas</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Tingkat</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Program</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Gender</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Wali Kelas</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-center">Siswa</th>
                                    <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] text-right pr-6">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filteredClasses.map((cls) => (
                                    <tr key={cls.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-sm text-[var(--color-text)]">{cls.name}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="badge badge-primary px-2.5 py-1 text-[11px] uppercase font-bold tracking-tight rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] border-none">Lvl {cls.grade}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {cls.major.includes('Boarding') ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-bold border border-amber-500/20 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faBed} className="text-[10px]" /> Boarding
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-bold border border-[var(--color-border)] uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faBuilding} className="text-[10px]" /> Reguler
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {cls.major.includes('Putra') ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-500/20 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faMars} className="text-[10px]" /> Putra
                                                </span>
                                            ) : cls.major.includes('Putri') ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[11px] font-bold border border-pink-500/20 uppercase tracking-tight">
                                                    <FontAwesomeIcon icon={faVenus} className="text-[10px]" /> Putri
                                                </span>
                                            ) : (
                                                <span className="text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-widest opacity-60">— CAMPUR —</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
                                                <span className="truncate">{cls.teacherName}</span>
                                            </div>
                                            <div className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1 font-mono font-medium opacity-80">
                                                <FontAwesomeIcon icon={faCalendarAlt} className="text-[9px]" />
                                                {cls.academicYearName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center gap-2 bg-[var(--color-surface-alt)] px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--color-text)] border border-[var(--color-border)]">
                                                <FontAwesomeIcon icon={faUsers} className="text-[11px] text-[var(--color-primary)]" />
                                                {cls.students}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleEdit(cls)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm"
                                                    title="Edit"
                                                >
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button
                                                    onClick={() => confirmDelete(cls)}
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    <section className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
                            <FontAwesomeIcon icon={faBuilding} className="text-[12px]" /> Identitas Kelas
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Nama Kelas <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: 7A, 8B"
                                    className="input-field font-bold text-sm py-2.5 h-11"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Tingkat (Level)</label>
                                <select
                                    value={formData.level}
                                    onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                                    className="select-field font-bold text-sm py-2 h-11"
                                >
                                    <option value="">Pilih Tingkat</option>
                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Program</label>
                                <div className="flex gap-1 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    {PROGRAMS.map(prog => (
                                        <button
                                            key={prog}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, program: prog })}
                                            className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all uppercase tracking-tight
                                                ${formData.program === prog
                                                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                                                }`}
                                        >
                                            {prog}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Gender Khusus</label>
                                <div className="flex gap-1 p-1 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)]">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender_type: formData.gender_type === 'Putra' ? '' : 'Putra' })}
                                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-tight
                                            ${formData.gender_type === 'Putra'
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faMars} className="text-[10px]" /> Putra
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, gender_type: formData.gender_type === 'Putri' ? '' : 'Putri' })}
                                        className={`flex-1 py-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 uppercase tracking-tight
                                            ${formData.gender_type === 'Putri'
                                                ? 'bg-pink-600 text-white shadow-md'
                                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                                            }`}
                                    >
                                        <FontAwesomeIcon icon={faVenus} className="text-[10px]" /> Putri
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-4 pt-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-primary)] border-b border-[var(--color-border)] pb-2 flex items-center gap-2">
                            <FontAwesomeIcon icon={faSchool} className="text-[12px]" /> Wali & Akademik
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Wali Kelas</label>
                                <select
                                    value={formData.homeroom_teacher_id}
                                    onChange={(e) => setFormData({ ...formData, homeroom_teacher_id: e.target.value })}
                                    className="select-field font-bold text-sm py-2 h-11"
                                >
                                    <option value="">Pilih Wali Kelas</option>
                                    {teachersList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">Tahun Ajaran</label>
                                <select
                                    value={formData.academic_year_id}
                                    onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
                                    className="select-field font-bold text-sm py-2 h-11"
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
                    <div className="p-4 bg-red-500/10 rounded-2xl flex items-center gap-5 text-red-500 border border-red-500/20">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl">
                            <FontAwesomeIcon icon={faTrash} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider leading-tight">Hapus Kelas?</h3>
                            <p className="text-[10px] opacity-80 font-medium mt-1">Tindakan ini permanen dan tidak bisa dibatalkan.</p>
                        </div>
                    </div>
                    <div className="px-2">
                        <p className="text-sm text-[var(--color-text)] leading-relaxed font-medium">
                            Apakah Anda yakin ingin menghapus kelas <strong className="text-red-500 font-bold">{itemToDelete?.name}</strong>?
                            <br />
                            <span className="text-[11px] text-[var(--color-text-muted)] mt-3 block italic">Semua data siswa dalam kelas ini mungkin akan kehilangan referensi kelas.</span>
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="btn btn-secondary flex-1 font-bold h-11 text-xs uppercase tracking-widest rounded-xl">
                            BATAL
                        </button>
                        <button type="button" onClick={executeDelete} className="btn bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg shadow-red-500/20 flex-1 font-bold h-11 text-xs uppercase tracking-widest rounded-xl">
                            YA, HAPUS
                        </button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
