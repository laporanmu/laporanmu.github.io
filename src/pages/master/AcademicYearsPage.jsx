import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faSpinner, faCalendar,
    faCheckCircle, faXmark, faSliders, faBoxArchive, faRotateLeft,
    faKeyboard, faChevronLeft, faChevronRight,
    faAnglesLeft, faAnglesRight, faDownload,
    faGraduationCap, faLayerGroup, faCircleCheck, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Pagination from '../../components/ui/Pagination'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'


const LS_COLS = 'academic_years_columns'
const LS_PAGE_SIZE = 'academic_years_page_size'

// Singleton portal manager — same pattern as StudentsPage
const _portalContainers = {}
function getPortalContainer(id) {
    if (typeof document === 'undefined') return null
    if (!_portalContainers[id]) {
        let el = document.getElementById(id)
        if (!el) {
            el = document.createElement('div')
            el.id = id
            document.body.appendChild(el)
        }
        _portalContainers[id] = el
    }
    return _portalContainers[id]
}

export default function AcademicYearsPage() {
    const { addToast, addUndoToast } = useToast()
    const { profile } = useAuth()
    const { enabled: canEdit } = useFlag('access.teacher_academic')

    const [years, setYears] = useState([])
    const [archivedYears, setArchivedYears] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [stats, setStats] = useState({ total: 0, active: 0, ganjil: 0, genap: 0 })

    // --- Stats Carousel Dot Indicator ---
    const statsScrollRef = useRef(null)
    const [activeStatIdx, setActiveStatIdx] = useState(0)
    const STAT_CARD_COUNT = 4

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState('')
    const [filterSemester, setFilterSemester] = useState('')
    const [sortBy, setSortBy] = useState('name_desc')
    const [showAdvFilter, setShowAdvFilter] = useState(false)

    // Pagination
    const [page, setPage] = useState(1)
    const [jumpPage, setJumpPage] = useState('')
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Columns
    const defaultCols = { semester: true, period: true, status: true, duration: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [colMenuPos, setColMenuPos] = useState({ top: 0, right: 0, showUp: false })
    const colMenuRef = useRef(null)

    // UI
    // Privasi mode not needed — academic year data is public info
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    // Portal rect tracking — keeps portaled dropdowns anchored to buttons on scroll
    const headerMenuBtnRef = useRef(null)
    const shortcutBtnRef = useRef(null)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [shortcutRect, setShortcutRect] = useState(null)
    const searchInputRef = useRef(null)

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isArchivedOpen, setIsArchivedOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isPermanentDeleteOpen, setIsPermanentDeleteOpen] = useState(false)
    const [isDeactivateConfirmOpen, setIsDeactivateConfirmOpen] = useState(false)
    const [itemToDeactivate, setItemToDeactivate] = useState(null)
    const [itemToPermanentDelete, setItemToPermanentDelete] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [formData, setFormData] = useState({ name: '', semester: 'Ganjil', startDate: '', endDate: '', makeActive: false })
    const [isDuplicateName, setIsDuplicateName] = useState(false)

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!supabase) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('academic_years')
                .select('*')
                .order('name', { ascending: false })
            if (error) throw error
            // Filter soft-delete di client side jika kolom belum ada
            const active = (data || []).filter(y => y.deleted_at === undefined || y.deleted_at === null)
            setYears(active)
            setStats({
                total: active.length,
                active: active.filter(y => y.is_active).length,
                ganjil: active.filter(y => y.semester === 'Ganjil').length,
                genap: active.filter(y => y.semester === 'Genap').length,
            })
        } catch { addToast('Gagal memuat data tahun pelajaran', 'error') }
        finally { setLoading(false) }
    }, [addToast])

    const fetchArchived = useCallback(async () => {
        if (!supabase) return
        try {
            const { data } = await supabase.from('academic_years').select('*').order('created_at', { ascending: false })
            // Filter hanya yang sudah diarsipkan (deleted_at tidak null)
            setArchivedYears((data || []).filter(y => y.deleted_at != null))
        } catch { }
    }, [])

    useEffect(() => { fetchData() }, [fetchData])

    // Click outside — only needed for colMenu now; headerMenu & shortcut use portaled backdrops
    useEffect(() => {
        const handler = (e) => {
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Sticky portal positioning — keep portaled dropdowns anchored to buttons on scroll/resize
    useEffect(() => {
        if (!isHeaderMenuOpen && !isShortcutOpen) return
        const update = () => {
            if (isHeaderMenuOpen && headerMenuBtnRef.current) setHeaderMenuRect(headerMenuBtnRef.current.getBoundingClientRect())
            if (isShortcutOpen && shortcutBtnRef.current) setShortcutRect(shortcutBtnRef.current.getBoundingClientRect())
        }
        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)
        return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
    }, [isHeaderMenuOpen, isShortcutOpen])

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if (isModalOpen || isDeleteModalOpen) return
            const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)

            if (e.key === 'Escape') {
                if (isTyping) { document.activeElement.blur() }
                else { setIsColMenuOpen(false); setIsHeaderMenuOpen(false); setIsShortcutOpen(false); setSearchQuery(''); setSelectedIds([]) }
                return
            }

            if (isTyping) return

            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            else if (e.key === 'n') { e.preventDefault(); handleAdd() }
            else if (e.key === 'e' || e.key === 'E') { if (selectedIds.length === 1) { const item = years.find(y => y.id === selectedIds[0]); if (item) handleEdit(item) } }
            else if (e.key === 'x' || e.key === 'X') { resetAllFilters() }
            else if (e.key === '?') { setIsShortcutOpen(v => !v) }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [isModalOpen, isDeleteModalOpen, selectedIds, years])

    // Cols persist
    useEffect(() => {
        localStorage.setItem(LS_COLS, JSON.stringify(visibleCols))
    }, [visibleCols])
    useEffect(() => {
        localStorage.setItem(LS_PAGE_SIZE, pageSize)
    }, [pageSize])

    // Form errors state
    const [formErrors, setFormErrors] = useState({})

    const handleAdd = () => {
        setSelectedItem(null)
        setFormData({ name: '', semester: 'Ganjil', startDate: '', endDate: '', makeActive: false })
        setFormErrors({})
        setIsDuplicateName(false)
        setIsModalOpen(true)
    }
    const handleEdit = (item) => {
        setSelectedItem(item)
        setFormData({ name: item.name, semester: item.semester, startDate: item.start_date || '', endDate: item.end_date || '', makeActive: item.is_active || false })
        setFormErrors({})
        setIsDuplicateName(false)
        setIsModalOpen(true)
    }

    const handleSubmit = async () => {
        // Inline validation
        const errors = {}
        if (!formData.name.trim()) errors.name = 'Nama tahun pelajaran wajib diisi'
        else if (!/^\d{4}\/\d{4}$/.test(formData.name.trim())) errors.name = 'Format harus YYYY/YYYY, contoh: 2024/2025'
        if (!formData.startDate) errors.startDate = 'Tanggal mulai wajib diisi'
        if (!formData.endDate) errors.endDate = 'Tanggal selesai wajib diisi'
        if (formData.startDate && formData.endDate && formData.endDate <= formData.startDate) errors.endDate = 'Tanggal selesai harus setelah tanggal mulai'
        // Cek overlap periode dengan tahun pelajaran lain
        if (formData.startDate && formData.endDate && formData.endDate > formData.startDate) {
            const newStart = new Date(formData.startDate)
            const newEnd = new Date(formData.endDate)
            const overlap = years.find(y => {
                if (selectedItem && y.id === selectedItem.id) return false
                if (!y.start_date || !y.end_date) return false
                const s = new Date(y.start_date)
                const e = new Date(y.end_date)
                return newStart < e && newEnd > s
            })
            if (overlap) errors.endDate = `Periode tumpang tindih dengan ${overlap.name} ${overlap.semester}`
        }
        if (Object.keys(errors).length > 0) { setFormErrors(errors); return }
        setFormErrors({})
        setSubmitting(true)
        try {
            const payload = { name: formData.name.trim(), semester: formData.semester, start_date: formData.startDate, end_date: formData.endDate }
            if (selectedItem) {
                const { data, error } = await supabase.from('academic_years').update(payload).eq('id', selectedItem.id).select()
                if (error) throw error
                if (!data || data.length === 0) throw new Error('Gagal mengupdate: tidak ada data yang berubah (periksa RLS policy)')
                // Handle makeActive for edit
                if (formData.makeActive && !selectedItem.is_active) {
                    await supabase.from('academic_years').update({ is_active: false }).neq('id', selectedItem.id)
                    await supabase.from('academic_years').update({ is_active: true }).eq('id', selectedItem.id)
                } else if (!formData.makeActive && selectedItem.is_active) {
                    await supabase.from('academic_years').update({ is_active: false }).eq('id', selectedItem.id)
                }
                addToast('Tahun pelajaran berhasil diupdate', 'success')
                await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data, error } = await supabase.from('academic_years').insert({ ...payload, is_active: false }).select()
                if (error) throw error
                if (!data || data.length === 0) throw new Error('Gagal menambahkan: tidak ada data yang tersimpan (periksa RLS policy)')
                // If makeActive checked, deactivate all others then activate new one
                if (formData.makeActive && data[0]?.id) {
                    await supabase.from('academic_years').update({ is_active: false }).neq('id', data[0].id)
                    await supabase.from('academic_years').update({ is_active: true }).eq('id', data[0].id)
                }
                addToast('Tahun pelajaran berhasil ditambahkan', 'success')
                await logAudit({ action: 'INSERT', source: 'MASTER', tableName: 'academic_years', recordId: data?.[0]?.id, newData: { ...payload, is_active: formData.makeActive } })
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err) { addToast(err.message || 'Gagal menyimpan data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleSetActive = async (item) => {
        if (submitting) return
        setSubmitting(true)
        try {
            const { error: e1 } = await supabase.from('academic_years').update({ is_active: false }).neq('id', item.id).select()
            if (e1) throw e1
            const { data, error: e2 } = await supabase.from('academic_years').update({ is_active: true }).eq('id', item.id).select()
            if (e2) throw e2
            if (!data || data.length === 0) throw new Error('Gagal mengaktifkan: periksa RLS policy di Supabase')
            addToast(`${item.name} ${item.semester} diaktifkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item, newData: { ...item, is_active: true } })
            fetchData()
        } catch (err) { addToast(err.message || 'Gagal mengaktifkan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeactivate = (item) => {
        setItemToDeactivate(item)
        setIsDeactivateConfirmOpen(true)
    }

    const handleDeactivateConfirm = async () => {
        if (!itemToDeactivate || submitting) return
        setSubmitting(true)
        try {
            const { data, error } = await supabase.from('academic_years').update({ is_active: false }).eq('id', itemToDeactivate.id).select()
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Gagal menonaktifkan: periksa RLS policy di Supabase')
            addToast(`${itemToDeactivate.name} ${itemToDeactivate.semester} dinonaktifkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: itemToDeactivate.id, oldData: itemToDeactivate, newData: { ...itemToDeactivate, is_active: false } })
            setIsDeactivateConfirmOpen(false)
            setItemToDeactivate(null)
            fetchData()
        } catch (err) { addToast(err.message || 'Gagal menonaktifkan', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDuplicate = async (item) => {
        try {
            const { error } = await supabase.from('academic_years').insert({
                name: item.name + ' (Salinan)',
                semester: item.semester,
                start_date: item.start_date,
                end_date: item.end_date,
                is_active: false,
            })
            if (error) throw error
            addToast(`Berhasil menduplikasi ${item.name}`, 'success')
            await logAudit({ action: 'INSERT', source: 'MASTER', tableName: 'academic_years', newData: { name: item.name + ' (Salinan)', semester: item.semester, duplicated_from: item.id } })
            fetchData()
        } catch { addToast('Gagal menduplikasi', 'error') }
    }

    // Status otomatis berdasarkan tanggal
    const getTimeStatus = (start, end) => {
        if (!start || !end) return null
        const now = new Date(); const s = new Date(start); const e = new Date(end)
        if (now < s) return { label: 'Akan Datang', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20', textCls: 'text-blue-500' }
        if (now > e) return { label: 'Sudah Selesai', cls: 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)]', textCls: 'text-[var(--color-text-muted)]' }
        return { label: 'Sedang Berjalan', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20', textCls: 'text-amber-500' }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        const archived = itemToDelete
        try {
            const { data, error } = await supabase.from('academic_years').update({ deleted_at: new Date().toISOString() }).eq('id', archived.id).select()
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Gagal mengarsipkan: periksa RLS policy di Supabase')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', recordId: archived.id, oldData: archived, newData: { ...archived, deleted_at: new Date().toISOString() } })
            setIsDeleteModalOpen(false)
            fetchData()
            addUndoToast(
                `${archived.name} ${archived.semester} diarsipkan.`,
                async () => {
                    await supabase.from('academic_years').update({ deleted_at: null }).eq('id', archived.id)
                    addToast('Berhasil dipulihkan', 'success')
                    fetchData()
                },
                6000
            )
        } catch (err) { addToast(err.message || 'Gagal menghapus', 'error') }
        finally { setSubmitting(false); setItemToDelete(null) }
    }

    const handleRestore = async (item) => {
        try {
            const { data, error } = await supabase.from('academic_years').update({ deleted_at: null }).eq('id', item.id).select()
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Gagal memulihkan: periksa RLS policy di Supabase')
            addToast('Berhasil dipulihkan', 'success')
            await logAudit({ action: 'RESTORE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item, newData: { ...item, deleted_at: null } })
            fetchArchived(); fetchData()
        } catch (err) { addToast(err.message || 'Gagal memulihkan', 'error') }
    }

    const handlePermanentDelete = async (item) => {
        try {
            const { error } = await supabase.from('academic_years').delete().eq('id', item.id)
            if (error) throw error
            addToast('Data dihapus permanen', 'success')
            await logAudit({ action: 'DELETE', source: 'MASTER', tableName: 'academic_years', recordId: item.id, oldData: item })
            setIsPermanentDeleteOpen(false)
            setItemToPermanentDelete(null)
            fetchArchived()
        } catch (err) { addToast(err.message || 'Gagal menghapus permanen', 'error') }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { data, error } = await supabase.from('academic_years').update({ deleted_at: new Date().toISOString() }).in('id', selectedIds).select()
            if (error) throw error
            if (!data || data.length === 0) throw new Error('Gagal mengarsipkan massal: periksa RLS policy di Supabase')
            addToast(`${data.length} data diarsipkan`, 'success')
            await logAudit({ action: 'UPDATE', source: 'MASTER', tableName: 'academic_years', newData: { bulk_archive: true, count: data.length, ids: selectedIds } })
            setSelectedIds([]); setIsBulkDeleteOpen(false); fetchData()
        } catch { addToast('Gagal menghapus massal', 'error') }
        finally { setSubmitting(false) }
    }

    const resetAllFilters = () => { setSearchQuery(''); setFilterSemester(''); setSortBy('name_desc'); setPage(1) }
    const activeFilterCount = [filterSemester].filter(Boolean).length

    const handleExportCSV = () => {
        const header = ['Tahun Pelajaran', 'Semester', 'Tanggal Mulai', 'Tanggal Selesai', 'Durasi', 'Status', 'Status Waktu']
        const rows = filtered.map(y => {
            const ts = getTimeStatus(y.start_date, y.end_date)
            return [
                y.name,
                y.semester,
                y.start_date ? new Date(y.start_date).toLocaleDateString('id-ID') : '-',
                y.end_date ? new Date(y.end_date).toLocaleDateString('id-ID') : '-',
                getDuration(y.start_date, y.end_date),
                y.is_active ? 'Aktif' : 'Tidak Aktif',
                ts?.label || '-',
            ]
        })
        const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `tahun-pelajaran-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        addToast(`${filtered.length} data berhasil diekspor`, 'success')
    }

    // ── Derived ───────────────────────────────────────────────────────────────
    const filtered = years.filter(y => {
        const q = searchQuery.toLowerCase()
        const matchSearch = !q || y.name.toLowerCase().includes(q) || y.semester.toLowerCase().includes(q)
        const matchSemester = !filterSemester || y.semester === filterSemester
        return matchSearch && matchSemester
    }).sort((a, b) => {
        // Pin active items to top always
        if (a.is_active !== b.is_active) return b.is_active ? 1 : -1
        // Then apply selected sort
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name)
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name)
        return 0
    })

    const totalRows = filtered.length

    // PAGINATION - define paged variable
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

    // Selection logic
    const allSelected = paged.length > 0 && paged.every(y => selectedIds.includes(y.id))
    const someSelected = selectedIds.length > 0 && !allSelected

    const toggleSelectAll = () => {
        if (allSelected) {
            // Uncheck all visible rows
            setSelectedIds(ids => ids.filter(id => !paged.map(y => y.id).includes(id)))
        } else {
            // Check all visible rows (combine with existing selections)
            setSelectedIds(ids => [...new Set([...ids, ...paged.map(y => y.id)])])
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id])
    }

    const getDuration = (start, end) => {
        if (!start || !end) return '—'
        const s = new Date(start), e = new Date(end)
        const months = (e.getFullYear() - s.getFullYear()) * 12 + e.getMonth() - s.getMonth()
        return `${months} bulan`
    }

    const formatDate = (d) => {
        if (!d) return '—'
        return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout title="Tahun Pelajaran">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm font-black text-[var(--color-primary)]">{selectedIds.length} data dipilih</p>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-3 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-wide hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faTrash} />Arsipkan</button>
                            <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} />Batal</button>
                        </div>
                    </div>
                )}

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit tahun pelajaran dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Master Data" items={['Academic Cycle']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Tahun Pelajaran</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola {stats.total} tahun pelajaran dan semester aktif dalam sistem.</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold opacity-60">
                            Tahun pelajaran aktif menjadi acuan laporan, presensi, dan penilaian di seluruh sistem.
                        </p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Header menu */}
                        <div className="relative">
                            <button
                                ref={headerMenuBtnRef}
                                onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                                title="Aksi lainnya"
                            >
                                <FontAwesomeIcon icon={faSliders} />
                            </button>
                        </div>

                        {/* Portaled Header Menu Dropdown */}
                        {isHeaderMenuOpen && headerMenuRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsHeaderMenuOpen(false)} />
                                <div
                                    className="fixed z-[9991] w-60 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                                    style={{
                                        top: headerMenuRect.bottom + 8,
                                        left: Math.max(10, headerMenuRect.right - 240),
                                    }}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Manajemen</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Tahun Pelajaran</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data yang diarsipkan</p>
                                        </div>
                                    </button>
                                    <div className="my-1 border-t border-[var(--color-border)]" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Export</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); handleExportCSV() }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faDownload} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Export CSV</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">{filtered.length} data (sesuai filter aktif)</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-ay-header-menu')
                        )}

                        {/* Keyboard shortcuts */}
                        <button
                            ref={shortcutBtnRef}
                            onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                            className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-all active:scale-95 ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            title="Keyboard Shortcuts (?)"
                        >
                            <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                        </button>

                        {/* Portaled Keyboard Shortcuts Dropdown */}
                        {isShortcutOpen && shortcutRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsShortcutOpen(false)} />
                                <div
                                    className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                                    style={{
                                        top: shortcutRect.bottom + 8,
                                        left: Math.max(10, shortcutRect.right - 288),
                                    }}
                                >
                                    <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
                                        <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                                        <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                    </div>
                                    <div className="p-3 space-y-0.5">
                                        {[
                                            { section: 'Navigasi' },
                                            { keys: ['Ctrl', 'K'], label: 'Fokus ke search' },
                                            { keys: ['Esc'], label: 'Tutup / clear / deselect' },
                                            { section: 'Aksi' },
                                            { keys: ['N'], label: 'Tambah tahun pelajaran' },
                                            { keys: ['E'], label: 'Edit (1 row dipilih)' },
                                            { keys: ['X'], label: 'Reset semua filter' },
                                            { keys: ['?'], label: 'Tampilkan shortcut ini' },
                                        ].map((item, i) => item.section ? (
                                            <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                        ) : (
                                            <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                                <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                                <div className="flex items-center gap-1">
                                                    {item.keys.map((k, ki) => (
                                                        <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>,
                            getPortalContainer('portal-ay-shortcut-menu')
                        )}

                        {/* Add button */}
                        <button onClick={handleAdd} disabled={!canEdit} className="h-9 px-3 sm:px-5 rounded-lg btn-primary text-[10px] font-black uppercase tracking-widest shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100">
                            <FontAwesomeIcon icon={faPlus} />
                            <span className="hidden sm:inline">{canEdit ? 'Tambah' : 'Read-only'}</span>
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <div className="relative mb-6 -mx-3 sm:mx-0 group/scroll">
                    <div
                        ref={statsScrollRef}
                        onScroll={() => {
                            const el = statsScrollRef.current
                            if (!el) return
                            const cardWidth = el.scrollWidth / STAT_CARD_COUNT
                            const idx = Math.round(el.scrollLeft / cardWidth)
                            setActiveStatIdx(Math.min(idx, STAT_CARD_COUNT - 1))
                        }}
                        className="flex overflow-x-auto scrollbar-hide gap-3 pb-2 snap-x snap-mandatory px-3 sm:px-0 sm:grid sm:grid-cols-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0 lg:snap-none"
                    >
                        {[
                            { icon: faGraduationCap, label: 'Total', value: stats.total, top: 'border-t-[var(--color-primary)]', ibg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', hover: 'hover:bg-[var(--color-primary)]/5' },
                            { icon: faCircleCheck, label: 'Aktif', value: stats.active, top: 'border-t-emerald-500', ibg: 'bg-emerald-500/10 text-emerald-500', hover: 'hover:bg-emerald-500/5' },
                            { icon: faLayerGroup, label: 'Semester Ganjil', value: stats.ganjil, top: 'border-t-blue-500', ibg: 'bg-blue-500/10 text-blue-500', hover: 'hover:bg-blue-500/5' },
                            { icon: faLayerGroup, label: 'Semester Genap', value: stats.genap, top: 'border-t-purple-500', ibg: 'bg-purple-500/10 text-purple-500', hover: 'hover:bg-purple-500/5' },
                        ].map((s, i) => (
                            <div key={i} className={`w-[200px] xs:w-[220px] sm:w-auto shrink-0 snap-center glass rounded-[1.5rem] p-4 border-t-[3px] ${s.top} flex items-center gap-3 group ${s.hover} transition-all`}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform shrink-0 ${s.ibg}`}><FontAwesomeIcon icon={s.icon} /></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5 whitespace-nowrap">{s.label}</p>
                                    <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{s.value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dot Indicators - Mobile Only */}
                    <div className="flex justify-center gap-1.5 mt-2 sm:hidden">
                        {Array.from({ length: STAT_CARD_COUNT }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    const el = statsScrollRef.current
                                    if (!el) return
                                    const cardWidth = el.scrollWidth / STAT_CARD_COUNT
                                    el.scrollTo({ left: cardWidth * i, behavior: 'smooth' })
                                }}
                                className={`rounded-full transition-all duration-300 ${activeStatIdx === i
                                    ? 'w-5 h-1.5 bg-[var(--color-primary)]'
                                    : 'w-1.5 h-1.5 bg-[var(--color-text-muted)]/30 hover:bg-[var(--color-text-muted)]/50'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Filter Bar ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-row items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSearch} /></div>
                            <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari tahun pelajaran atau semester... (Ctrl+K)"
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <button onClick={() => setShowAdvFilter(!showAdvFilter)}
                                className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                <FontAwesomeIcon icon={faSliders} />
                                <span className="hidden xs:inline">Filter</span>
                                {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                            {activeFilterCount > 0 && <button onClick={resetAllFilters} className="h-9 px-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-500/10 flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} /><span className="hidden sm:inline">Reset</span></button>}
                        </div>
                    </div>

                    {showAdvFilter && (
                        <div className="border-t border-[var(--color-border)] px-4 py-4 bg-[var(--color-surface-alt)]/40">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Semester</label>
                                    <select value={filterSemester} onChange={e => { setFilterSemester(e.target.value); setPage(1) }} className="input-field h-9 text-sm w-full rounded-xl">
                                        <option value="">Semua Semester</option>
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field h-9 text-sm w-full rounded-xl">
                                        <option value="name_desc">Tahun Terbaru</option>
                                        <option value="name_asc">Tahun Terlama</option>
                                        <option value="active">Aktif Dahulu</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Main Card ── */}
                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="p-6 space-y-4">
                            <div className="hidden md:block"><TableSkeleton rows={6} cols={5} /></div>
                            <div className="md:hidden"><CardSkeleton count={4} /></div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table — empty state handled inside tbody */}
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                                        <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                            <th className="px-6 py-4 w-12 text-center">
                                                <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                            </th>
                                            <th className="px-6 py-4">Tahun Pelajaran</th>
                                            {visibleCols.semester && <th className="px-6 py-4 text-center">Semester</th>}
                                            {visibleCols.period && <th className="px-6 py-4">Periode</th>}
                                            {visibleCols.duration && <th className="px-6 py-4 text-center">Durasi</th>}
                                            {visibleCols.status && <th className="px-6 py-4 text-center">Status</th>}
                                            <th className="px-6 py-4 text-center w-48 relative">
                                                <div className="flex items-center justify-center">
                                                    <span>Aksi</span>
                                                </div>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2" ref={colMenuRef}>
                                                    <button onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        const menuHeight = 220
                                                        const spaceBelow = window.innerHeight - rect.bottom
                                                        const showUp = spaceBelow < menuHeight && rect.top > menuHeight
                                                        setColMenuPos({
                                                            top: showUp ? (rect.top + window.scrollY - menuHeight - 8) : (rect.bottom + window.scrollY + 8),
                                                            right: window.innerWidth - rect.right - window.scrollX,
                                                            showUp
                                                        })
                                                        setIsColMenuOpen(p => !p)
                                                    }} title="Atur tampilan kolom"
                                                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                                        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                    </button>
                                                    {isColMenuOpen && createPortal(
                                                        <div className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${colMenuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                            style={{ top: colMenuPos.top, right: colMenuPos.right }}>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                            {[{ key: 'semester', label: 'Semester' }, { key: 'period', label: 'Periode' }, { key: 'duration', label: 'Durasi' }, { key: 'status', label: 'Status' }].map(({ key, label }) => (
                                                                <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
                                                                    <span className="text-[11px] font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">{label}</span>
                                                                    <div className={`w-8 h-4.5 rounded-full transition-all flex items-center px-0.5 ${visibleCols[key] ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
                                                                        <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all ${visibleCols[key] ? 'translate-x-[14px]' : 'translate-x-0'}`} />
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>,
                                                        document.body
                                                    )}
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paged.length === 0 ? (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-28 text-center align-middle">
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-center mx-auto animate-in fade-in zoom-in-95 duration-700">
                                                        <div className="relative mb-6">
                                                            <div className="absolute inset-0 bg-[var(--color-primary)]/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                                <FontAwesomeIcon icon={faSearch} className="text-4xl text-[var(--color-primary)]/30" />
                                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                                    <FontAwesomeIcon icon={faXmark} className="text-red-500 text-sm" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <h3 className="text-base font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-sm leading-relaxed mb-6">
                                                            Tidak ada tahun pelajaran yang cocok dengan kriteria tersebut. Coba ubah kata kunci atau reset filter.
                                                        </p>
                                                        <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">
                                                            Reset Semua Filter
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : paged.map(year => (
                                            <tr key={year.id} className={`border-b border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]/40 transition-colors group ${selectedIds.includes(year.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <input type="checkbox" checked={selectedIds.includes(year.id)} onChange={() => toggleSelect(year.id)} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${year.is_active ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                                            {year.name?.slice(2, 4) || '??'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-[var(--color-text)]">{year.name}</p>
                                                            {year.is_active && (
                                                                <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] inline-block animate-pulse"></span>
                                                                    Sedang Aktif
                                                                </span>
                                                            )}
                                                            {(() => { const ts = getTimeStatus(year.start_date, year.end_date); return ts ? <span className={`text-[9px] font-black uppercase tracking-widest ${ts.textCls}`}>{ts.label}</span> : null })()}
                                                        </div>
                                                    </div>
                                                </td>
                                                {visibleCols.semester && (
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${year.semester === 'Ganjil' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-purple-500/10 text-purple-600 border border-purple-500/20'}`}>
                                                            {year.semester}
                                                        </span>
                                                    </td>
                                                )}
                                                {visibleCols.period && (
                                                    <td className="px-6 py-4">
                                                        <p className="text-xs font-bold text-[var(--color-text)]">{formatDate(year.start_date)}</p>
                                                        <p className="text-[10px] text-[var(--color-text-muted)] font-medium">s/d {formatDate(year.end_date)}</p>
                                                    </td>
                                                )}
                                                {visibleCols.duration && (
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-xs font-bold text-[var(--color-text-muted)]">{getDuration(year.start_date, year.end_date)}</span>
                                                    </td>
                                                )}
                                                {visibleCols.status && (
                                                    <td className="px-6 py-4 text-center">
                                                        {year.is_active ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Aktif
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                                                                Tidak Aktif
                                                            </span>
                                                        )}
                                                    </td>
                                                )}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {/* Toggle aktif/nonaktif */}
                                                        {canEdit && (year.is_active ? (
                                                            <button onClick={() => handleDeactivate(year)} title="Nonaktifkan" disabled={submitting} className="h-8 px-2.5 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all whitespace-nowrap disabled:opacity-50">
                                                                Nonaktifkan
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleSetActive(year)} title="Aktifkan" disabled={submitting} className="h-8 px-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50">
                                                                Aktifkan
                                                            </button>
                                                        ))}
                                                        {/* Duplicate */}
                                                        {canEdit && (
                                                            <button onClick={() => handleDuplicate(year)} title="Duplikasi" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all">
                                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                            </button>
                                                        )}
                                                        {canEdit && (
                                                            <button onClick={() => handleEdit(year)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all">
                                                                <FontAwesomeIcon icon={faEdit} className="text-xs" />
                                                            </button>
                                                        )}
                                                        {canEdit && !year.is_active && (
                                                            <button onClick={() => { setItemToDelete(year); setIsDeleteModalOpen(true) }} title="Arsipkan" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all">
                                                                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-[var(--color-border)]">
                                {paged.length === 0 ? (
                                    <div className="py-24 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-700">
                                        <div className="relative mb-6">
                                            <div className="absolute inset-0 bg-[var(--color-primary)]/10 blur-3xl rounded-full scale-150 animate-pulse" />
                                            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-xl flex items-center justify-center">
                                                <FontAwesomeIcon icon={faSearch} className="text-4xl text-[var(--color-primary)]/30" />
                                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-[var(--color-surface)] shadow-lg flex items-center justify-center border border-[var(--color-border)]">
                                                    <FontAwesomeIcon icon={faXmark} className="text-red-500 text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-black text-[var(--color-text)] mb-2">Pencarian Tidak Ditemukan</h3>
                                        <p className="text-xs font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-6">
                                            Tidak ada tahun pelajaran yang cocok. Coba ubah kata kunci atau reset filter.
                                        </p>
                                        <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">
                                            Reset Semua Filter
                                        </button>
                                    </div>
                                ) : paged.map(year => (
                                    <div key={year.id} className={`p-4 flex items-center gap-3 hover:bg-[var(--color-surface-alt)]/40 transition-colors ${selectedIds.includes(year.id) ? 'bg-[var(--color-primary)]/5' : ''}`}>
                                        <input type="checkbox" checked={selectedIds.includes(year.id)} onChange={() => toggleSelect(year.id)} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] shrink-0" />
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${year.is_active ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white' : 'bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                            {year.name?.slice(2, 4) || '??'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-[var(--color-text)]">{year.name}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest">{year.semester}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">{formatDate(year.start_date)} — {formatDate(year.end_date)}</p>
                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                {year.is_active && (
                                                    <span className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-widest flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] inline-block animate-pulse"></span>
                                                        Sedang Aktif
                                                    </span>
                                                )}
                                                {(() => { const ts = getTimeStatus(year.start_date, year.end_date); return ts ? <span className={`text-[9px] font-black uppercase tracking-widest ${ts.textCls}`}>{ts.label}</span> : null })()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {canEdit && (year.is_active ? (
                                                <button onClick={() => handleDeactivate(year)} disabled={submitting} className="text-[9px] font-black text-amber-600 uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 disabled:opacity-50 whitespace-nowrap">Nonaktifkan</button>
                                            ) : (
                                                <button onClick={() => handleSetActive(year)} disabled={submitting} className="text-[9px] font-black text-[var(--color-primary)] uppercase tracking-widest px-2 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 disabled:opacity-50">Aktifkan</button>
                                            ))}
                                            {canEdit && (
                                                <button onClick={() => handleDuplicate(year)} title="Duplikasi" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-blue-500 hover:bg-blue-500/10 transition-all">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button onClick={() => handleEdit(year)} title="Edit" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all">
                                                    <FontAwesomeIcon icon={faEdit} className="text-xs" />
                                                </button>
                                            )}
                                            {canEdit && !year.is_active && (
                                                <button onClick={() => { setItemToDelete(year); setIsDeleteModalOpen(true) }} title="Arsipkan" className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all">
                                                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Pagination
                                totalRows={totalRows}
                                page={page}
                                pageSize={pageSize}
                                setPage={setPage}
                                setPageSize={setPageSize}
                                label="data"
                                jumpPage={jumpPage}
                                setJumpPage={setJumpPage}
                            />

                        </>
                    )}
                </div>

                {/* ── Form Modal ── */}
                <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setFormErrors({}); setIsDuplicateName(false) }} title={selectedItem ? 'Update Tahun Pelajaran' : 'Tahun Pelajaran Baru'} size="sm" mobileVariant="bottom-sheet">
                    <div className="space-y-4">
                        {/* Sub-header text */}
                        <p className="text-[10px] text-[var(--color-text-muted)] font-bold opacity-70 leading-relaxed px-0.5 -mt-2">
                            {selectedItem ? 'Perbarui detail periode tahun pelajaran ini.' : 'Buat periode tahun pelajaran baru untuk sistem.'}
                        </p>

                        <div className="grid grid-cols-12 gap-3">
                            {/* ── Nama Tahun Pelajaran ── */}
                            <div className="col-span-12 sm:col-span-7">
                                <label className="block text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] mb-1.5 ml-1 opacity-60">
                                    Tahun Pelajaran <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => {
                                            const val = e.target.value
                                            setFormData({ ...formData, name: val })
                                            setFormErrors(p => ({ ...p, name: '' }))
                                            const trimmed = val.trim()
                                            const isDupe = years.some(y =>
                                                y.name === trimmed &&
                                                y.semester === formData.semester &&
                                                (!selectedItem || y.id !== selectedItem.id)
                                            )
                                            setIsDuplicateName(isDupe)
                                        }}
                                        placeholder="2024/2025"
                                        maxLength={9}
                                        className={`w-full px-3.5 h-9 rounded-xl border bg-[var(--color-surface-alt)]/20 focus:ring-4 focus:ring-[var(--color-primary)]/10 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold placeholder:opacity-30 ${formErrors.name ? 'border-red-500' : isDuplicateName ? 'border-amber-400' : 'border-[var(--color-border)]'}`}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-[var(--color-text-muted)] opacity-30 uppercase tracking-widest pointer-events-none font-mono">
                                        YYYY/YYYY
                                    </span>
                                </div>
                                {formErrors.name && (
                                    <p className="mt-1 ml-1 text-[9px] font-bold text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />{formErrors.name}
                                    </p>
                                )}
                            </div>

                            {/* ── Semester ── */}
                            <div className="col-span-12 sm:col-span-5">
                                <label className="block text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] mb-1.5 ml-1 opacity-60">Semester</label>
                                <div className="flex p-0.5 bg-[var(--color-surface-alt)] rounded-xl border border-[var(--color-border)] h-9">
                                    {['Ganjil', 'Genap'].map(s => (
                                        <button key={s} type="button"
                                            onClick={() => {
                                                setFormData({ ...formData, semester: s })
                                                const isDupe = years.some(y =>
                                                    y.name === formData.name.trim() &&
                                                    y.semester === s &&
                                                    (!selectedItem || y.id !== selectedItem.id)
                                                )
                                                setIsDuplicateName(isDupe)
                                            }}
                                            className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${formData.semester === s ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Duplicates Alert */}
                        {isDuplicateName && !formErrors.name && (
                            <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-700 flex gap-2.5 animate-in fade-in slide-in-from-top-1">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-[10px] mt-0.5" />
                                <p className="text-[10px] font-bold leading-tight">Nama & semester ini sudah ada dalam sistem.</p>
                            </div>
                        )}

                        {/* ── Tanggal ── */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] mb-1.5 ml-1 opacity-60">Mulai <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => { setFormData({ ...formData, startDate: e.target.value }); setFormErrors(p => ({ ...p, startDate: '', endDate: '' })) }}
                                    className={`w-full px-3 h-9 rounded-xl border bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold ${formErrors.startDate ? 'border-red-500 ring-2 ring-red-500/10' : 'border-[var(--color-border)]'}`}
                                />
                                {formErrors.startDate && <p className="mt-1 text-[9px] font-bold text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />{formErrors.startDate}</p>}
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.2em] mb-1.5 ml-1 opacity-60">Selesai <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={e => { setFormData({ ...formData, endDate: e.target.value }); setFormErrors(p => ({ ...p, endDate: '' })) }}
                                    className={`w-full px-3 h-9 rounded-xl border bg-[var(--color-surface-alt)]/20 focus:border-[var(--color-primary)] outline-none transition-all text-sm font-bold ${formErrors.endDate ? 'border-red-500 ring-2 ring-red-500/10' : 'border-[var(--color-border)]'}`}
                                />
                                {formErrors.endDate && !formErrors.endDate.includes('tumpang tindih') && (
                                    <p className="mt-1 text-[9px] font-bold text-red-500 flex items-center gap-1 animate-in fade-in slide-in-from-top-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[8px]" />{formErrors.endDate}</p>
                                )}
                            </div>
                        </div>

                        {/* ── Overlap & Duration Compact Banner ── */}
                        {((formData.startDate && formData.endDate) || formErrors.endDate?.includes('tumpang tindih')) && (
                            <div className="space-y-2">
                                {formErrors.endDate?.includes('tumpang tindih') ? (
                                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-in zoom-in-95">
                                        <div className="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-600 text-[10px]" />
                                        </div>
                                        <p className="text-[10px] font-black text-amber-700 leading-tight">
                                            {formErrors.endDate}
                                        </p>
                                    </div>
                                ) : (formData.startDate && formData.endDate && formData.endDate > formData.startDate) && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/15">
                                        <FontAwesomeIcon icon={faCalendar} className="text-[var(--color-primary)] text-[10px] opacity-60" />
                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)]">
                                            Estimasi Durasi: <span className="font-black text-[var(--color-primary)]">{getDuration(formData.startDate, formData.endDate)}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Status Aktif Toggle ── */}
                        <div
                            onClick={() => setFormData(p => ({ ...p, makeActive: !p.makeActive }))}
                            className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl border transition-all cursor-pointer select-none ${formData.makeActive ? 'bg-emerald-500/8 border-emerald-500/30' : 'bg-[var(--color-surface-alt)]/40 border-[var(--color-border)] hover:border-[var(--color-primary)]/30'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${formData.makeActive ? 'bg-emerald-500/20 text-emerald-600' : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                    <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                                </div>
                                <div>
                                    <p className={`text-[11px] font-black ${formData.makeActive ? 'text-emerald-700' : 'text-[var(--color-text)]'}`}>Jadikan Tahun Aktif</p>
                                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] opacity-60 mt-0.5 uppercase tracking-tight">Otomatis menonaktifkan tahun lain</p>
                                </div>
                            </div>
                            <div className={`relative w-8 h-4.5 rounded-full transition-all shrink-0 ${formData.makeActive ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`}>
                                <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-200 ${formData.makeActive ? 'left-[16px]' : 'left-0.5'}`} />
                            </div>
                        </div>

                        {/* ── Actions ── */}
                        <div className="flex gap-2.5 pt-1">
                            <button type="button" onClick={() => { setIsModalOpen(false); setFormErrors({}); setIsDuplicateName(false) }}
                                className="h-10 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">
                                Batal
                            </button>
                            <button type="button" onClick={handleSubmit} disabled={submitting || isDuplicateName}
                                className="h-10 flex-[1.5] rounded-xl btn-primary font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (selectedItem ? 'Update Data' : 'Simpan Tahun')}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* ── Delete/Archive Modal ── */}
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Konfirmasi Arsip" size="sm" mobileVariant="bottom-sheet">
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl flex items-center gap-3 text-amber-600 border border-amber-500/20">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                                <FontAwesomeIcon icon={faBoxArchive} className="text-sm" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.1em]">Pindahkan ke Arsip?</p>
                                <p className="text-[10px] font-bold opacity-70 mt-0.5">Dapat dipulihkan dari menu arsip.</p>
                            </div>
                        </div>
                        <div className="px-1">
                            <p className="text-xs text-[var(--color-text)] leading-relaxed font-medium">
                                Tahun Pelajaran <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20 inline-block">{itemToDelete?.name} {itemToDelete?.semester}</span> akan diarsipkan. Laporan terkait tetap tersimpan dengan aman.
                            </p>
                        </div>
                        <div className="flex gap-2.5">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="h-10 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                            <button onClick={handleDeleteConfirm} disabled={submitting} className="h-10 flex-[1.5] rounded-xl bg-amber-500 hover:brightness-110 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faBoxArchive} className="text-[10px]" />Arsipkan</>}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* ── Bulk Delete Modal ── */}
                <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Arsipkan Massal" size="sm" mobileVariant="bottom-sheet">
                    <div className="space-y-4">
                        <div className="p-3 bg-red-500/10 rounded-2xl flex items-center gap-3 text-red-500 border border-red-500/20">
                            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30"><FontAwesomeIcon icon={faBoxArchive} className="text-sm" /></div>
                            <div><p className="text-[11px] font-black uppercase tracking-wider">Arsipkan {selectedIds.length} Data</p><p className="text-[10px] font-bold opacity-70 mt-0.5">Data bisa dipulihkan kembali.</p></div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                            <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faBoxArchive} className="text-[10px]" />Arsipkan {selectedIds.length} Data</>}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* ── Nonaktifkan Confirm Modal ── */}
                <Modal isOpen={isDeactivateConfirmOpen} onClose={() => { setIsDeactivateConfirmOpen(false); setItemToDeactivate(null) }} title="Nonaktifkan Periode" size="sm" mobileVariant="bottom-sheet">
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-500/10 rounded-2xl flex items-center gap-3 text-amber-600 border border-amber-500/20">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/30">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-sm" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.1em]">Konfirmasi Nonaktifkan</p>
                                <p className="text-[10px] font-bold opacity-70 mt-0.5">Laporan & presensi akan tanpa acuan aktif.</p>
                            </div>
                        </div>
                        <div className="px-1">
                            <p className="text-xs text-[var(--color-text)] leading-relaxed font-medium">
                                Nonaktifkan <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20 inline-block">{itemToDeactivate?.name} {itemToDeactivate?.semester}</span>?
                                <span className="block text-[10px] text-[var(--color-text-muted)] mt-1.5 opacity-70 font-medium leading-relaxed">Seluruh sistem akan berjalan tanpa acuan tahun aktif sampai kamu mengaktifkan yang lain.</span>
                            </p>
                        </div>
                        <div className="flex gap-2.5">
                            <button onClick={() => { setIsDeactivateConfirmOpen(false); setItemToDeactivate(null) }} className="h-10 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                            <button onClick={handleDeactivateConfirm} disabled={submitting} className="h-10 flex-[1.5] rounded-xl bg-amber-500 hover:brightness-110 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : 'Nonaktifkan SEKARANG'}
                            </button>
                        </div>
                    </div>
                </Modal>

                {/* ── Arsip Modal ── */}
                <Modal isOpen={isArchivedOpen} onClose={() => setIsArchivedOpen(false)} title="Arsip Tahun Pelajaran" size="lg" mobileVariant="bottom-sheet">
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/20">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-relaxed">Data di bawah telah diarsipkan. Anda dapat memulihkan atau menghapus permanen.</p>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                            {archivedYears.length === 0 ? (
                                <div className="py-12 text-center opacity-40">
                                    <FontAwesomeIcon icon={faBoxArchive} className="text-4xl mb-3" />
                                    <p className="text-xs font-black uppercase tracking-widest">Tidak ada arsip</p>
                                </div>
                            ) : archivedYears.map(y => (
                                <div key={y.id} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center justify-between group">
                                    <div>
                                        <h4 className="text-sm font-black text-[var(--color-text)]">{y.name} — {y.semester}</h4>
                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">
                                            Diarsipkan {new Date(y.deleted_at).toLocaleDateString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleRestore(y)} title="Pulihkan" className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center">
                                            <FontAwesomeIcon icon={faRotateLeft} className="text-xs" />
                                        </button>
                                        <button onClick={() => { setItemToPermanentDelete(y); setIsPermanentDeleteOpen(true) }} title="Hapus Permanen" className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setIsArchivedOpen(false)} className="w-full h-12 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Tutup</button>
                    </div>
                </Modal>

                {/* ── Hapus Permanen Modal ── */}
                <Modal isOpen={isPermanentDeleteOpen} onClose={() => { setIsPermanentDeleteOpen(false); setItemToPermanentDelete(null) }} title="Hapus Permanen" size="sm" mobileVariant="bottom-sheet">
                    <div className="space-y-4">
                        <div className="p-3 bg-red-500/10 rounded-2xl flex items-center gap-3 text-red-500 border border-red-500/20">
                            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30 animate-pulse">
                                <FontAwesomeIcon icon={faTrash} className="text-sm" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-wider">Hapus Permanen</p>
                                <p className="text-[10px] font-bold opacity-70 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
                            </div>
                        </div>
                        <p className="text-xs text-[var(--color-text)] leading-relaxed font-medium px-1">
                            Yakin hapus permanen <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{itemToPermanentDelete?.name} {itemToPermanentDelete?.semester}</span>?
                            <span className="block text-[10px] text-[var(--color-text-muted)] mt-1.5 opacity-60">Data tidak dapat dipulihkan kembali setelah dihapus.</span>
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => { setIsPermanentDeleteOpen(false); setItemToPermanentDelete(null) }} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] text-[var(--color-text-muted)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                            <button onClick={() => handlePermanentDelete(itemToPermanentDelete)} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                                {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : <><FontAwesomeIcon icon={faTrash} className="text-[10px]" />Hapus Permanen</>}
                            </button>
                        </div>
                    </div>
                </Modal>
            </div>
        </DashboardLayout>
    )
}