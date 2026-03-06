import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faSearch, faTimes, faSpinner, faShieldAlt, faGavel, faTrophy,
    faFilter, faSliders, faChevronLeft, faChevronRight, faAnglesLeft, faAnglesRight,
    faTrash, faEye, faEyeSlash, faXmark, faDownload, faUpload, faBoxArchive, faRotateLeft,
    faKeyboard, faCheck, faExclamationTriangle, faCheckCircle, faCircleExclamation, faSlidersH,
    faInfoCircle, faEdit
} from '@fortawesome/free-solid-svg-icons'

import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../context/ToastContext'
import { supabase } from '../../lib/supabase'
import { useDebounce } from '../../hooks/useDebounce'
import { TableSkeleton, CardSkeleton } from '../../components/ui/Skeleton'

// Library for Export
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

const CATEGORIES = ['Kedisiplinan', 'Akademik', 'Tata Tertib', 'Sikap', 'Prestasi', 'Lainnya']
const LS_COLS = 'violations_columns'

function getPageItems(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total]
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total]
    return [1, '...', current - 1, current, current + 1, '...', total]
}

export default function ViolationsPage() {
    const { addToast } = useToast()

    // Data states
    const [violations, setViolations] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Stats
    const [stats, setStats] = useState({ total: 0, violations: 0, achievements: 0, avgPoints: 0 })

    // UI states
    const [searchQuery, setSearchQuery] = useState('')
    const debouncedSearch = useDebounce(searchQuery, 350)
    const [filterCategory, setFilterCategory] = useState('')
    const [filterType, setFilterType] = useState('') // 'violation' or 'achievement'
    const [filterStatus, setFilterStatus] = useState('active')
    const [sortBy, setSortBy] = useState('name')
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [filterExtreme, setFilterExtreme] = useState(false) // Points > 20

    // Privacy Mode
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const shortcutRef = useRef(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(25)
    const [jumpPage, setJumpPage] = useState('')

    // Refs
    const searchInputRef = useRef(null)
    const headerMenuRef = useRef(null)
    const colMenuRef = useRef(null)

    // Selection
    const [selectedIds, setSelectedIds] = useState([])

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false)
    const [isExportModalOpen, setIsExportModalOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState(null)
    const [itemToDelete, setItemToDelete] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')

    // Columns
    const defaultCols = { description: true, type: true, category: true, points: true, status: true }
    const [visibleCols, setVisibleCols] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_COLS)) || defaultCols }
        catch { return defaultCols }
    })

    // Header Actions state
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

    // ── DATA FETCHING ──────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('violation_types').select('*').order('name')
            if (error) throw error
            if (data) {
                setViolations(data)
                const s = {
                    total: data.length,
                    violations: data.filter(v => v.is_negative).length,
                    achievements: data.filter(v => !v.is_negative).length,
                    avgPoints: data.length ? Math.round(data.reduce((acc, v) => acc + Math.abs(v.points), 0) / data.length) : 0
                }
                setStats(s)
            }
        } catch (err) {
            console.error(err)
            addToast('Gagal mengambil data poin', 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast])

    const fetchDataRef = useRef(fetchData)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])

    useEffect(() => {
        fetchData()
        const ch = supabase.channel('violation-types-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'violation_types' }, () => fetchDataRef.current?.())
            .subscribe()
        return () => supabase.removeChannel(ch)
    }, [fetchData])

    // ── UI EFFECTS ─────────────────────────────────────────────────
    useEffect(() => { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) }, [visibleCols])

    const isAnyModalOpen = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen

    // Active Filter Count
    const activeFilterCount = (filterCategory ? 1 : 0) + (filterType ? 1 : 0) + (filterStatus !== 'active' ? 1 : 0) + (filterExtreme ? 1 : 0)
    const resetAllFilters = () => {
        setSearchQuery('')
        setFilterCategory('')
        setFilterType('')
        setFilterStatus('active')
        setFilterExtreme(false)
        setPage(1)
    }

    // Click Outside
    useEffect(() => {
        const handler = (e) => {
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setIsHeaderMenuOpen(false)
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isAnyModalOpen) return
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus() }
            if (e.key === '?') { e.preventDefault(); setIsShortcutOpen(v => !v) }
            if (e.key === 'n') { e.preventDefault(); handleAdd() }
            if (e.key === 'p') { e.preventDefault(); setIsPrivacyMode(v => !v) }
            if (e.key === 'r') { e.preventDefault(); fetchData() }
            if (e.key === 'x') { e.preventDefault(); resetAllFilters() }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isAnyModalOpen, fetchData])

    // Filter & Sort Logic
    const filteredViolations = useMemo(() => {
        let result = violations.filter(v => {
            const q = debouncedSearch.toLowerCase()
            const matchSearch = !q || v.name.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q)
            const matchCat = !filterCategory || v.category === filterCategory
            const matchType = !filterType || (filterType === 'violation' ? v.is_negative : !v.is_negative)
            const matchStatus = !filterStatus || v.status === filterStatus
            const matchExtreme = !filterExtreme || Math.abs(v.points) >= 20
            return matchSearch && matchCat && matchType && matchStatus && matchExtreme
        })
        if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name))
        else if (sortBy === 'points') result.sort((a, b) => Math.abs(b.points) - Math.abs(a.points))
        else if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        return result
    }, [violations, debouncedSearch, filterCategory, filterType, filterStatus, filterExtreme, sortBy])

    const totalRows = filteredViolations.length
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
    const fromRow = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
    const toRow = Math.min(page * pageSize, totalRows)
    const pagedViolations = filteredViolations.slice((page - 1) * pageSize, page * pageSize)

    useEffect(() => { setPage(1) }, [debouncedSearch, filterCategory, filterType, filterStatus, filterExtreme])

    // Insights Row
    const insights = useMemo(() => {
        const res = []
        const extremeCount = violations.filter(v => Math.abs(v.points) >= 20).length
        if (extremeCount > 0) res.push({
            id: 'extreme',
            label: `${extremeCount} Poin Ekstrim`,
            desc: 'Bobot poin ≥ 20 ditemukan',
            icon: faExclamationTriangle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            active: filterExtreme,
            onClick: () => { setFilterExtreme(!filterExtreme); setIsFilterOpen(true) }
        })

        const inactiveCount = violations.filter(v => v.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: `${inactiveCount} Tipe Nonaktif`,
            desc: 'Poin yang sedang dideaktifkan',
            icon: faBoxArchive,
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            active: filterStatus === 'inactive',
            onClick: () => { setFilterStatus(filterStatus === 'inactive' ? 'active' : 'inactive'); setIsFilterOpen(true) }
        })

        return res
    }, [violations, filterExtreme, filterStatus])

    // Handlers
    const handleSubmit = async (formData) => {
        setSubmitting(true)
        try {
            const payload = {
                name: formData.name,
                points: formData.is_negative ? -Math.abs(formData.points) : Math.abs(formData.points),
                category: formData.category,
                is_negative: formData.is_negative,
                description: formData.description,
                status: formData.status
            }
            if (selectedItem) {
                const { error } = await supabase.from('violation_types').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast('Data berhasil diupdate', 'success')
            } else {
                const { error } = await supabase.from('violation_types').insert(payload)
                if (error) throw error
                addToast('Data baru berhasil ditambahkan', 'success')
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err) { addToast(err.message || 'Gagal menyimpan data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('violation_types').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast('Data berhasil dihapus', 'success')
            setIsDeleteModalOpen(false)
            fetchData()
        } catch { addToast('Gagal menghapus data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const { error } = await supabase.from('violation_types').delete().in('id', selectedIds)
            if (error) throw error
            addToast(`${selectedIds.length} data berhasil dihapus`, 'success')
            setSelectedIds([])
            setIsBulkDeleteOpen(false)
            fetchData()
        } catch { addToast('Gagal menghapus data', 'error') }
        finally { setSubmitting(false) }
    }

    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => {
        const ids = pagedViolations.map(v => v.id)
        setSelectedIds(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
    }
    const allSelected = pagedViolations.length > 0 && pagedViolations.every(v => selectedIds.includes(v.id))

    // Points Badge Helper
    const getPointStyle = (val) => {
        const abs = Math.abs(val)
        if (val > 0) return 'bg-emerald-500 shadow-emerald-500/30'
        if (abs >= 20) return 'bg-red-600 shadow-red-600/30'
        if (abs >= 10) return 'bg-orange-500 shadow-orange-500/30'
        return 'bg-amber-500 shadow-amber-500/30'
    }

    // Export Logic
    const handleExport = async (format) => {
        setExporting(true)
        try {
            let q = supabase.from('violation_types').select('*').order('name')
            if (exportScope === 'selected') q = q.in('id', selectedIds)
            const { data, error } = await q
            if (error) throw error
            const mapped = (data || []).map(v => ({
                'Nama Poin': v.name,
                'Tipe': v.is_negative ? 'Pelanggaran' : 'Prestasi',
                'Kategori': v.category,
                'Bobot Poin': v.points,
                'Status': v.status,
                'Deskripsi': v.description || '-'
            }))
            if (format === 'csv') {
                const blob = new Blob([Papa.unparse(mapped)], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.setAttribute('download', `data_poin_${new Date().toISOString().slice(0, 10)}.csv`); link.click()
            } else {
                const ws = XLSX.utils.json_to_sheet(mapped); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data Poin')
                XLSX.writeFile(wb, `data_poin_${new Date().toISOString().slice(0, 10)}.xlsx`)
            }
            addToast(`Export berhasil`, 'success')
        } catch { addToast('Gagal export data', 'error') }
        finally { setExporting(false); setIsExportModalOpen(false) }
    }

    return (
        <DashboardLayout title="Konfigurasi Poin" hideHeader={isAnyModalOpen} hideSidebar={isAnyModalOpen}>
            <style>{isAnyModalOpen ? ` .top-nav, .sidebar, .floating-dock { display: none !important; } main { padding-top: 0 !important; } ` : ''}</style>

            {/* Privacy Banner */}
            {isPrivacyMode && (
                <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
                        <FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Nilai poin sensitif disensor
                    </div>
                    <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                </div>
            )}

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Konfigurasi Poin</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola bobot poin untuk {stats.violations} jenis pelanggaran & {stats.achievements} prestasi.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className="relative" ref={headerMenuRef}>
                        <button
                            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Opsi Lanjutan"><FontAwesomeIcon icon={faSliders} /></button>
                        {isHeaderMenuOpen && (
                            <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl shadow-black/10 overflow-hidden">
                                <div className="p-1.5 space-y-0.5">
                                    <p className="px-3 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Data</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-bold text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors text-left"><FontAwesomeIcon icon={faDownload} className="w-3.5 text-[var(--color-text-muted)]" /> Export Data</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                        className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}>
                        <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">{isPrivacyMode ? 'Privacy On' : 'Privacy Off'}</span>
                    </button>
                    <div className="relative" ref={shortcutRef}>
                        <button onClick={() => setIsShortcutOpen(!isShortcutOpen)}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isShortcutOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                            title="Keyboard Shortcuts (?)"><FontAwesomeIcon icon={faKeyboard} className="text-sm" /></button>
                        {isShortcutOpen && (
                            <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden animate-in fade-in zoom-in-95">
                                <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Shortcuts</p>
                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
                                </div>
                                <div className="p-3 space-y-0.5">
                                    {[{ section: 'Navigasi' }, { keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { section: 'Aksi' }, { keys: ['N'], label: 'Tambah poin baru' }, { keys: ['P'], label: 'Toggle privacy mode' }, { keys: ['X'], label: 'Reset semua filter' }].map((item, i) => item.section ? (
                                        <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                                    ) : (
                                        <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                                            <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                                            <div className="flex items-center gap-1">{item.keys.map((k, ki) => <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={handleAdd} className="h-9 px-4 rounded-xl bg-[var(--color-primary)] hover:brightness-110 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center gap-2 active:scale-95">
                        <FontAwesomeIcon icon={faPlus} /> Tambah
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {[
                    { label: 'Total Tipe', val: stats.total, icon: faShieldAlt, gradient: 'from-indigo-600 to-blue-500' },
                    { label: 'Pelanggaran', val: stats.violations, icon: faGavel, gradient: 'from-orange-600 to-red-500' },
                    { label: 'Prestasi', val: stats.achievements, icon: faTrophy, gradient: 'from-emerald-600 to-teal-500' },
                    { label: 'Rata-rata Poin', val: stats.avgPoints, icon: faInfoCircle, gradient: 'from-pink-600 to-rose-500' },
                ].map((s, i) => (
                    <div key={i} className="bg-[var(--color-surface)] rounded-2xl p-4 border border-[var(--color-border)] flex items-center gap-4 transition-all hover:border-[var(--color-primary)]/30 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white text-[15px] shrink-0 shadow-lg`}><FontAwesomeIcon icon={s.icon} /></div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] truncate">{s.label}</p>
                            <p className="text-xl font-black text-[var(--color-text)] leading-none mt-1 tracking-tight">{s.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Insights Hub */}
            {insights.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">
                    {insights.map((ins) => (
                        <button
                            key={ins.id}
                            onClick={ins.onClick}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${ins.active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 ring-1 ring-[var(--color-primary)]' : `border-current opacity-80 ${ins.bg} ${ins.color}`}`}
                        >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ins.active ? 'bg-[var(--color-primary)] text-white' : 'bg-white/20'}`}>
                                <FontAwesomeIcon icon={ins.icon} className="text-[10px]" />
                            </div>
                            <div className="text-left">
                                <p className={`text-[10px] font-black leading-none ${ins.active ? 'text-[var(--color-primary)]' : ''}`}>{ins.label}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">{ins.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Filters & Actions */}
            <div className="bg-[var(--color-surface)] rounded-2xl mb-6 border border-[var(--color-border)] overflow-hidden shadow-sm">
                <div className="flex gap-2 p-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSearch} /></div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari nama poin atau deskripsi... (Ctrl+K)"
                            className="input-field pl-10 w-full h-9 text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                <FontAwesomeIcon icon={faTimes} className="text-xs" />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isFilterOpen || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                    >
                        <FontAwesomeIcon icon={faSliders} /> Filter {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                    </button>
                </div>

                {isFilterOpen && (
                    <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="space-y-1.5"><label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Kategori</label>
                                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="">Semua Kategori</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5"><label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Tipe</label>
                                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="">Pelanggaran & Prestasi</option>
                                    <option value="violation">Hanya Pelanggaran</option>
                                    <option value="achievement">Hanya Prestasi</option>
                                </select>
                            </div>
                            <div className="space-y-1.5"><label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Urutan</label>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="name">Nama (A-Z)</option>
                                    <option value="points">Poin Tertinggi</option>
                                    <option value="newest">Terbaru</option>
                                </select>
                            </div>
                            <div className="flex items-end"><button onClick={resetAllFilters} className="w-full h-9 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"><FontAwesomeIcon icon={faRotateLeft} /> Reset</button></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                    <p className="text-sm font-black text-[var(--color-primary)] tracking-tight">{selectedIds.length} tipe poin dipilih</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2"><FontAwesomeIcon icon={faTrash} /> Hapus</button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-text)] transition-all flex items-center gap-2"><FontAwesomeIcon icon={faXmark} /> Batal</button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4"><div className="hidden md:block"><TableSkeleton rows={8} cols={5} /></div><div className="md:hidden"><CardSkeleton count={4} /></div></div>
                ) : totalRows === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 mb-4 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] opacity-40"><FontAwesomeIcon icon={faShieldAlt} className="text-2xl" /></div>
                        <h3 className="text-base font-black text-[var(--color-text)] mb-2 uppercase tracking-wide">Data Tidak Ditemukan</h3>
                        <p className="text-[10px] text-[var(--color-text-muted)] max-w-xs leading-relaxed font-bold uppercase tracking-widest opacity-60">Tidak ditemukan tipe poin yang cocok dengan filter atau database masih kosong.</p>
                        <button onClick={resetAllFilters} className="mt-6 h-9 px-5 rounded-xl border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all">Clear Filter</button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto whitespace-nowrap hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" /></th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Identitas Poin</th>
                                        {visibleCols.description && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Keterangan Aturan</th>}
                                        {visibleCols.type && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">Tipe</th>}
                                        {visibleCols.category && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">Kategori</th>}
                                        {visibleCols.points && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">Bobot</th>}
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>Aksi</span>
                                                <div className="relative">
                                                    <button onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect()
                                                        const menuHeight = 240
                                                        const spaceBelow = window.innerHeight - rect.bottom
                                                        const showUp = spaceBelow < menuHeight && rect.top > menuHeight
                                                        setMenuPos({
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
                                                        <div className={`absolute z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 p-2 space-y-0.5 animate-in fade-in zoom-in-95 ${menuPos.showUp ? 'slide-in-from-bottom-2' : 'slide-in-from-top-2'}`}
                                                            style={{ top: menuPos.top, right: menuPos.right }}>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                            {[{ key: 'description', label: 'Aturan Poin' }, { key: 'type', label: 'Tipe (Neg/Pos)' }, { key: 'category', label: 'Kategori' }, { key: 'points', label: 'Bobot Poin' }].map(({ key, label }) => (
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
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {pagedViolations.map(violation => (
                                        <tr key={violation.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-all group">
                                            <td className="px-6 py-4 w-16 text-center"><input type="checkbox" checked={selectedIds.includes(violation.id)} onChange={() => toggleSelect(violation.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs text-white shrink-0 ${violation.is_negative ? 'bg-red-500' : 'bg-emerald-500'}`}><FontAwesomeIcon icon={violation.is_negative ? faGavel : faTrophy} /></div>
                                                    <div className="min-w-0"><p className="text-sm font-black text-[var(--color-text)] truncate">{violation.name}</p></div>
                                                </div>
                                            </td>
                                            {visibleCols.description && <td className="px-6 py-4"><p className="text-[11px] font-bold text-[var(--color-text-muted)] line-clamp-1 max-w-xs">{violation.description || '—'}</p></td>}
                                            {visibleCols.type && <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${violation.is_negative ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>{violation.is_negative ? 'Pelanggaran' : 'Prestasi'}</span>
                                            </td>}
                                            {visibleCols.category && <td className="px-6 py-4 text-center"><span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{violation.category}</span></td>}
                                            {visibleCols.points && <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-white text-[10px] font-black shadow-lg ${getPointStyle(violation.points)}`}>{isPrivacyMode ? '***' : `${violation.points > 0 ? '+' : ''}${violation.points}`}</div>
                                            </td>}
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => handleEdit(violation)}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm"
                                                        title="Edit"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setItemToDelete(violation); setIsDeleteModalOpen(true) }}
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

                        {/* Mobile view */}
                        <div className="md:hidden divide-y divide-[var(--color-border)]">
                            {pagedViolations.map(v => (
                                <div key={v.id} className="p-4 bg-[var(--color-surface)]">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${v.is_negative ? 'bg-red-500' : 'bg-emerald-500'}`}><FontAwesomeIcon icon={v.is_negative ? faGavel : faTrophy} /></div>
                                            <div>
                                                <h4 className="text-sm font-black text-[var(--color-text)]">{v.name}</h4>
                                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">{v.category}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2.5 py-1.5 rounded-lg text-white text-[10px] font-black shadow-lg ${getPointStyle(v.points)}`}>{isPrivacyMode ? '***' : `${v.points > 0 ? '+' : ''}${v.points}`}</div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-4">
                                        <button onClick={() => handleEdit(v)} className="flex-1 h-9 rounded-xl bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">Edit</button>
                                        <button onClick={() => { setItemToDelete(v); setIsDeleteModalOpen(true) }} className="flex-1 h-9 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest">Hapus</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-5 bg-[var(--color-surface-alt)]/20 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Menampilkan {fromRow}–{toRow} dari {totalRows} poin</p>
                            <div className="flex items-center gap-2">
                                <button disabled={page === 1} onClick={() => setPage(1)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesLeft} className="text-[10px]" /></button>
                                <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /></button>
                                <div className="flex items-center gap-1.5 mx-1">
                                    {getPageItems(page, totalPages).map((it, idx) => it === '...' ? <span key={`s${idx}`} className="w-8 flex items-center justify-center text-[var(--color-text-muted)] font-bold opacity-30">···</span> : (
                                        <button key={it} onClick={() => setPage(it)} className={`h-9 min-w-[36px] px-2.5 rounded-xl font-black text-[10px] transition-all ${it === page ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/25' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]'}`}>{it}</button>
                                    ))}
                                </div>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faChevronRight} className="text-[10px]" /></button>
                                <button disabled={page >= totalPages} onClick={() => setPage(totalPages)} className="h-9 w-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all disabled:opacity-30"><FontAwesomeIcon icon={faAnglesRight} className="text-[10px]" /></button>
                                <div className="ml-2 relative flex items-center">
                                    <input value={jumpPage} onChange={e => setJumpPage(e.target.value.replace(/[^\d]/g, ''))} onKeyDown={e => { if (e.key === 'Enter') { const n = Number(jumpPage); if (n >= 1 && n <= totalPages) { setPage(n); setJumpPage('') } } }} placeholder="Hal..." className="w-16 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-center text-[11px] font-black focus:border-[var(--color-primary)] outline-none" />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Modal Form */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Konfigurasi Poin' : 'Tambah Konfigurasi Poin'} size="lg">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    handleSubmit({
                        name: formData.get('name'),
                        points: Number(formData.get('points')),
                        category: formData.get('category'),
                        is_negative: formData.get('type') === 'violation',
                        description: formData.get('description'),
                        status: formData.get('status')
                    });
                }} className="space-y-6 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Nama Aturan / Poin</label>
                            <input name="name" defaultValue={selectedItem?.name} required placeholder="Contoh: Terlambat Masuk Kelas" className="w-full h-11 px-4 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none" />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Kategori</label>
                            <select name="category" defaultValue={selectedItem?.category || 'Kedisiplinan'} className="w-full h-11 px-4 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Tipe Akumulasi</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl h-11">
                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="violation" defaultChecked={selectedItem ? selectedItem.is_negative : true} className="hidden peer" />
                                    <div className="w-full h-full flex items-center justify-center rounded-lg peer-checked:bg-red-500 peer-checked:text-white text-[var(--color-text-muted)] font-black text-[10px] uppercase transition-all">Pelanggaran (-)</div>
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="achievement" defaultChecked={selectedItem ? !selectedItem.is_negative : false} className="hidden peer" />
                                    <div className="w-full h-full flex items-center justify-center rounded-lg peer-checked:bg-emerald-500 peer-checked:text-white text-[var(--color-text-muted)] font-black text-[10px] uppercase transition-all">Prestasi (+)</div>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Bobot Poin (Angka Positif)</label>
                            <input type="number" name="points" defaultValue={selectedItem ? Math.abs(selectedItem.points) : ''} required min="1" placeholder="Misal: 10" className="w-full h-11 px-4 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none" />
                        </div>
                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Status Keaktifan</label>
                            <select name="status" defaultValue={selectedItem?.status || 'active'} className="w-full h-11 px-4 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none">
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif (Arsip)</option>
                            </select>
                        </div>
                        <div className="space-y-4 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Deskripsi & Dasar Aturan (Opsional)</label>
                            <textarea name="description" defaultValue={selectedItem?.description} rows={3} placeholder="Tuliskan detail atau pasal yang berkaitan..." className="w-full p-4 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none resize-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                        <button type="submit" disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-[var(--color-primary)] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all">
                            {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (selectedItem ? 'Update Poin' : 'Simpan Konfigurasi')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Tipe Poin" size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-4 text-red-500">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><FontAwesomeIcon icon={faTrash} /></div>
                        <div><h3 className="text-sm font-black uppercase tracking-wider italic">Hapus Permanen</h3><p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest leading-tight">Berisiko pada relasi laporan siswa.</p></div>
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">Yakin menghapus tipe poin <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20 italic">{itemToDelete?.name}</span>? Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">BATAL</button>
                        <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">HAPUS SEKARANG</button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Delete */}
            <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Hapus Massal" size="sm">
                <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-500/20 shadow-xl"><FontAwesomeIcon icon={faTrash} className="text-3xl" /></div>
                    <h3 className="text-lg font-black text-[var(--color-text)] uppercase tracking-tight">Hapus {selectedIds.length} Pilihan?</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-widest leading-relaxed">Semua konfigurasi yang dipilih akan dihapus permanen dari sistem.</p>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">Batal</button>
                        <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-1 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all">Ya, Hapus Semua</button>
                    </div>
                </div>
            </Modal>

            {/* Export Modal */}
            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Konfigurasi Poin" size="sm">
                <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-xl">
                        <button onClick={() => setExportScope('filtered')} className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${exportScope === 'filtered' ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'}`}>Filter Aktif</button>
                        <button onClick={() => setExportScope('selected')} disabled={selectedIds.length === 0} className={`py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 ${exportScope === 'selected' ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/30' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'}`}>Terpilih ({selectedIds.length})</button>
                    </div>
                    <div className="space-y-2">
                        <button onClick={() => handleExport('excel')} className="w-full h-12 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95"><FontAwesomeIcon icon={faDownload} /> Export ke Excel (.XLSX)</button>
                        <button onClick={() => handleExport('csv')} className="w-full h-12 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95"><FontAwesomeIcon icon={faDownload} /> Export ke CSV (.CSV)</button>
                    </div>
                </div>
            </Modal>

        </DashboardLayout>
    )
}