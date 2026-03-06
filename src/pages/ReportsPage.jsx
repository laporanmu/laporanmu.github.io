import { useState, useEffect, useCallback, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faFilter, faFileExport,
    faArrowUp, faArrowDown, faSpinner, faRotateRight,
    faTimes, faChevronLeft, faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import Modal from '../components/ui/Modal'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 20

export default function ReportsPage() {
    const { profile } = useAuth()
    const { addToast } = useToast()

    // ── Data ───────────────────────────────────────────────────────────────
    const [reports, setReports] = useState([])
    const [students, setStudents] = useState([])
    const [violationTypes, setViolationTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [totalRows, setTotalRows] = useState(0)

    // ── Filters ────────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterType, setFilterType] = useState('') // 'positive' | 'negative' | ''
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [page, setPage] = useState(1)

    // ── Modal ──────────────────────────────────────────────────────────────
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [formData, setFormData] = useState({
        student_id: '',
        violation_type_id: '',
        notes: '',
    })

    const filterRef = useRef(null)

    // ── Debounce search ────────────────────────────────────────────────────
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1) }, 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    // ── Outside click filter ───────────────────────────────────────────────
    useEffect(() => {
        const h = e => { if (filterRef.current && !filterRef.current.contains(e.target)) setIsFilterOpen(false) }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    // ── Fetch metadata (students, violation_types) ─────────────────────────
    const fetchMetadata = useCallback(async () => {
        try {
            const [studRes, vtRes] = await Promise.all([
                supabase.from('students').select('id, name').order('name'),
                supabase.from('violation_types').select('id, name, points').order('name'),
            ])
            if (studRes.data) setStudents(studRes.data)
            if (vtRes.data) setViolationTypes(vtRes.data)
        } catch {
            addToast('Gagal memuat metadata', 'error')
        }
    }, [addToast])

    // ── Fetch reports ──────────────────────────────────────────────────────
    const fetchReports = useCallback(async () => {
        setLoading(true)
        try {
            const from = (page - 1) * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            let q = supabase
                .from('reports')
                .select(
                    'id, student_id, violation_type_id, points, notes, description, reported_at, teacher_name',
                    { count: 'exact' }
                )
                .order('reported_at', { ascending: false })
                .range(from, to)

            if (filterType === 'positive') q = q.gt('points', 0)
            if (filterType === 'negative') q = q.lt('points', 0)

            if (debouncedSearch) {
                // Search by student name or violation type name via text search on joined fields
                // Since we can't directly filter joined columns in Supabase, we filter student_ids first
                const { data: matchedStudents } = await supabase
                    .from('students')
                    .select('id')
                    .ilike('name', `%${debouncedSearch}%`)


                const { data: matchedTypes } = await supabase
                    .from('violation_types')
                    .select('id')
                    .ilike('name', `%${debouncedSearch}%`)

                const studentIds = (matchedStudents || []).map(s => s.id)
                const typeIds = (matchedTypes || []).map(t => t.id)

                if (studentIds.length === 0 && typeIds.length === 0) {
                    setReports([])
                    setTotalRows(0)
                    setLoading(false)
                    return
                }

                const filters = []
                if (studentIds.length > 0) filters.push(`student_id.in.(${studentIds.join(',')})`)
                if (typeIds.length > 0) filters.push(`violation_type_id.in.(${typeIds.join(',')})`)
                q = q.or(filters.join(','))
            }

            const { data, error, count } = await q
            if (error) throw error
            setReports(data || [])
            setTotalRows(count ?? 0)
        } catch (err) {
            addToast('Gagal memuat laporan', 'error')
        } finally {
            setLoading(false)
        }
    }, [page, debouncedSearch, filterType, addToast])

    // ── Initial load + real-time ───────────────────────────────────────────
    const fetchRef = useRef(fetchReports)
    useEffect(() => { fetchRef.current = fetchReports }, [fetchReports])

    useEffect(() => { fetchMetadata() }, [fetchMetadata])
    useEffect(() => { fetchReports() }, [fetchReports])

    useEffect(() => {
        const ch = supabase
            .channel('reports-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
                fetchRef.current()
            })
            .subscribe()
        return () => supabase.removeChannel(ch)
    }, [])

    // ── Submit ─────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.student_id || !formData.violation_type_id) {
            addToast('Siswa dan jenis laporan wajib diisi', 'warning')
            return
        }

        setSubmitting(true)
        try {
            const selectedType = violationTypes.find(vt => vt.id === formData.violation_type_id)
            const points = selectedType?.points ?? 0

            const payload = {
                student_id: formData.student_id,
                violation_type_id: formData.violation_type_id,
                reporter_id: profile?.id ?? null,
                teacher_name: profile?.name ?? 'Unknown',
                points,
                notes: formData.notes || null,
                reported_at: new Date().toISOString(),
            }

            const { error } = await supabase.from('reports').insert([payload])
            if (error) throw error

            addToast('Laporan berhasil dibuat', 'success')
            setIsModalOpen(false)
            setFormData({ student_id: '', violation_type_id: '', notes: '' })
            // fetchReports will be triggered via real-time, but also call directly for immediate UX
            fetchReports()
        } catch (err) {
            addToast(err.message || 'Gagal membuat laporan', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAdd = () => {
        setFormData({ student_id: '', violation_type_id: '', notes: '' })
        setIsModalOpen(true)
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
    const selectedViolationType = violationTypes.find(vt => vt.id === formData.violation_type_id)

    // ── Active filter count ────────────────────────────────────────────────
    const activeFilters = [filterType].filter(Boolean).length

    return (
        <DashboardLayout title="Laporan Perilaku">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading text-[var(--color-text)] tracking-tight">
                        Laporan Perilaku
                    </h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">
                        Rekam dan pantau perilaku siswa secara real-time.
                        {!loading && (
                            <span className="ml-2 font-black text-[var(--color-primary)]">
                                {totalRows} laporan
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={handleAdd}
                    className="btn btn-primary shadow-lg shadow-[var(--color-primary)]/20 h-11 text-xs font-bold px-5 rounded-full"
                >
                    <FontAwesomeIcon icon={faPlus} />
                    <span className="ml-2 uppercase tracking-widest">BUAT LAPORAN</span>
                </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="glass rounded-[1.5rem] mb-6 p-4 border border-[var(--color-border)]">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="flex-1 relative font-normal group">
                        <FontAwesomeIcon
                            icon={faSearch}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm transition-colors group-focus-within:text-[var(--color-primary)]"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari nama siswa atau jenis laporan..."
                            className="input-field pl-11 w-full h-11 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} className="text-xs" />
                            </button>
                        )}
                    </div>

                    {/* Filter dropdown */}
                    <div className="flex gap-3">
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setIsFilterOpen(v => !v)}
                                className={`btn h-11 px-5 text-xs font-bold uppercase tracking-widest rounded-xl relative transition-all ${activeFilters > 0 ? 'btn-primary' : 'btn-secondary'}`}
                            >
                                <FontAwesomeIcon icon={faFilter} className="mr-2 opacity-70" />
                                Filter
                                {activeFilters > 0 && (
                                    <span className="ml-2 w-4 h-4 rounded-full bg-white/30 text-[9px] flex items-center justify-center font-black">
                                        {activeFilters}
                                    </span>
                                )}
                            </button>

                            {isFilterOpen && (
                                <div className="absolute right-0 top-full mt-2 w-52 glass border border-[var(--color-border)] rounded-2xl shadow-xl p-3 z-50">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2 px-1">Jenis Poin</p>
                                    {[
                                        { value: '', label: 'Semua' },
                                        { value: 'positive', label: 'Positif (+)' },
                                        { value: 'negative', label: 'Negatif (−)' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => { setFilterType(opt.value); setPage(1); setIsFilterOpen(false) }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all mb-1 ${filterType === opt.value ? 'bg-[var(--color-primary)] text-white' : 'hover:bg-[var(--color-surface-alt)] text-[var(--color-text)]'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                    {activeFilters > 0 && (
                                        <button
                                            onClick={() => { setFilterType(''); setPage(1); setIsFilterOpen(false) }}
                                            className="w-full text-center px-3 py-2 rounded-lg text-[10px] font-black text-[var(--color-danger)] uppercase tracking-widest hover:bg-[var(--color-danger)]/10 transition-all mt-1 border border-[var(--color-danger)]/20"
                                        >
                                            Reset Filter
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={fetchReports}
                            disabled={loading}
                            className="btn btn-secondary h-11 px-4 text-xs font-bold rounded-xl"
                            title="Refresh"
                        >
                            <FontAwesomeIcon icon={faRotateRight} className={loading ? 'fa-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="glass rounded-[1.25rem] p-5 border border-[var(--color-border)] animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-alt)]" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-4 w-40 rounded-lg bg-[var(--color-surface-alt)]" />
                                    <div className="h-3 w-24 rounded-lg bg-[var(--color-surface-alt)]" />
                                </div>
                                <div className="h-7 w-20 rounded-lg bg-[var(--color-surface-alt)]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : reports.length === 0 ? (
                <div className="glass rounded-[1.5rem] p-16 border border-[var(--color-border)] text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto mb-4 opacity-40">
                        <FontAwesomeIcon icon={faFileExport} className="text-2xl text-[var(--color-text-muted)]" />
                    </div>
                    <p className="text-sm font-black text-[var(--color-text)] opacity-40 uppercase tracking-widest">
                        {searchQuery || filterType ? 'Tidak ada laporan yang sesuai' : 'Belum ada laporan'}
                    </p>
                    {(searchQuery || filterType) && (
                        <button
                            onClick={() => { setSearchQuery(''); setFilterType(''); setPage(1) }}
                            className="mt-4 text-xs font-bold text-[var(--color-primary)] hover:underline"
                        >
                            Reset pencarian & filter
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {reports.map(report => {
                            const isPositive = (report.points ?? 0) > 0
                            const student = students.find(s => s.id === report.student_id)
                            const violationType = violationTypes.find(vt => vt.id === report.violation_type_id)
                            const studentName = student?.name ?? '—'
                            const className = student?.class_name ?? ''
                            const typeName = violationType?.name ?? report.description ?? '—'
                            const pts = report.points ?? 0

                            const dateStr = report.reported_at
                                ? new Date(report.reported_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '—'
                            const timeStr = report.reported_at
                                ? new Date(report.reported_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                : ''

                            return (
                                <div
                                    key={report.id}
                                    className={`glass rounded-[1.25rem] p-5 border-l-[6px] transition-all hover:-translate-x-1 hover:shadow-md ${isPositive
                                            ? 'border-l-[var(--color-success)] shadow-[var(--color-success)]/5'
                                            : 'border-l-[var(--color-danger)] shadow-[var(--color-danger)]/5'
                                        }`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${isPositive
                                                    ? 'bg-gradient-to-br from-[var(--color-success)] to-emerald-600'
                                                    : 'bg-gradient-to-br from-[var(--color-danger)] to-rose-600'
                                                }`}>
                                                <FontAwesomeIcon
                                                    icon={isPositive ? faArrowUp : faArrowDown}
                                                    className="text-lg opacity-90"
                                                />
                                            </div>
                                            <div className="pt-0.5">
                                                <h3 className="font-black text-base text-[var(--color-text)] leading-tight font-heading">
                                                    {studentName}
                                                </h3>
                                                <p className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-1 opacity-80">
                                                    {className ? `${className} • ` : ''}{typeName}
                                                </p>
                                                {report.notes && (
                                                    <p className="text-xs text-[var(--color-text-muted)] italic mt-2.5 py-2 px-3.5 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)] opacity-90">
                                                        "{report.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest border ${isPositive
                                                    ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20'
                                                    : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
                                                }`}>
                                                {pts > 0 ? '+' : ''}{pts} POIN
                                            </span>
                                            <div className="mt-3 space-y-1">
                                                <p className="text-[11px] text-[var(--color-text-muted)] font-bold">
                                                    {dateStr} • {timeStr}
                                                </p>
                                                {report.teacher_name && (
                                                    <p className={`text-[9px] font-black uppercase tracking-widest leading-none ${isPositive ? 'text-[var(--color-success)]/80' : 'text-[var(--color-danger)]/80'
                                                        }`}>
                                                        OLEH {report.teacher_name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-5 border-t border-[var(--color-border)]">
                            <p className="text-[11px] font-bold text-[var(--color-text-muted)]">
                                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)} dari <span className="text-[var(--color-text)] font-black">{totalRows}</span> laporan
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                                </button>
                                <span className="text-[11px] font-black text-[var(--color-text)] px-2">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"
                                >
                                    <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Create Report Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Laporan Baru" size="md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Student select */}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">
                                Siswa
                            </label>
                            <select
                                value={formData.student_id}
                                onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                                className="select-field font-bold text-sm py-2 h-11"
                                required
                            >
                                <option value="">Pilih siswa...</option>
                                {students.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}{s.class_name ? ` — ${s.class_name}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Violation type select */}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">
                                Jenis Laporan
                            </label>
                            <select
                                value={formData.violation_type_id}
                                onChange={(e) => setFormData({ ...formData, violation_type_id: e.target.value })}
                                className="select-field font-bold text-sm py-2 h-11"
                                required
                            >
                                <option value="">Pilih jenis...</option>
                                {violationTypes.map(vt => (
                                    <option key={vt.id} value={vt.id}>
                                        {vt.name} ({vt.points > 0 ? '+' : ''}{vt.points} poin)
                                    </option>
                                ))}
                            </select>

                            {/* Points preview */}
                            {selectedViolationType && (
                                <div className={`mt-2 px-4 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest flex items-center gap-2 ${(selectedViolationType.points ?? 0) > 0
                                        ? 'bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20'
                                        : 'bg-[var(--color-danger)]/10 text-[var(--color-danger)] border-[var(--color-danger)]/20'
                                    }`}>
                                    <FontAwesomeIcon
                                        icon={(selectedViolationType.points ?? 0) > 0 ? faArrowUp : faArrowDown}
                                    />
                                    {(selectedViolationType.points ?? 0) > 0 ? '+' : ''}{selectedViolationType.points} poin akan dicatat
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2 ml-1">
                                Catatan Tambahan (Opsional)
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Tambahkan informasi pendukung..."
                                className="textarea-field font-medium text-sm py-3"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-secondary font-bold py-2 text-xs h-11 px-6 uppercase tracking-widest rounded-xl"
                        >
                            BATAL
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="btn btn-primary px-8 font-bold shadow-lg shadow-[var(--color-primary)]/20 py-2 text-xs h-11 uppercase tracking-widest rounded-xl"
                        >
                            {submitting ? (
                                <><FontAwesomeIcon icon={faSpinner} className="fa-spin mr-2" />MENYIMPAN...</>
                            ) : 'SIMPAN LAPORAN'}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    )
}