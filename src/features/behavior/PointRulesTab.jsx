import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { 
    Plus, Search, X, Loader2, Shield, Gavel, Trophy, Sliders, 
    Trash2, Eye, EyeOff, Download, Archive, RotateCcw, Keyboard, 
    Check, AlertTriangle, AlertCircle, Info, Edit2, Layers, 
    GraduationCap, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import Pagination from '@shared/components/Pagination'
import { StatCard } from '@shared/components/DataDisplay'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import Papa from 'papaparse'

const CATEGORIES = ['Kedisiplinan', 'Akademik', 'Tata Tertib', 'Sikap', 'Prestasi', 'Lainnya']
const LS_COLS = 'Poin_columns'
const LS_PAGE_SIZE = 'Poin_page_size'

export default function PointRulesTab({ showStats = true }) {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const { enabled: teacherPoinEnabled } = useFlag('access.teacher_poin')
    const { enabled: canViolation } = useFlag('module.pelanggaran')
    const { enabled: canAchievement } = useFlag('module.prestasi')

    const canEdit = profile?.role === 'guru' ? teacherPoinEnabled : true

    const [poin, setPoin] = useState([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Stats
    const [stats, setStats] = useState({ total: 0, poin: 0, achievements: 0, avgPoints: 0 })

    // UI states
    const [searchQuery, setSearchQuery] = useState('')
    const [filterCategory, setFilterCategory] = useState('')
    const [filterType, setFilterType] = useState('') // 'violation' or 'achievement'
    const [filterStatus, setFilterStatus] = useState('active')
    const [sortBy, setSortBy] = useState('name')
    const [isFilterOpen, setIsFilterOpen] = useState(false)
    const [filterExtreme, setFilterExtreme] = useState(false) // Points >= 20

    // Privasi Mode
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isShortcutOpen, setIsShortcutOpen] = useState(false)
    const shortcutRef = useRef(null)

    // Pagination
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(() => {
        try { return Number(localStorage.getItem(LS_PAGE_SIZE)) || 10 } catch { return 10 }
    })
    const [jumpPage, setJumpPage] = useState('')

    // Refs
    const searchInputRef = useRef(null)
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

    const [isColMenuOpen, setIsColMenuOpen] = useState(false)
    const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

    // Reset Poin States
    const [isResetModalOpen, setIsResetModalOpen] = useState(false)
    const [resetPointsClassId, setResetPointsClassId] = useState('')
    const [classesList, setClassesList] = useState([])
    const [resettingPoints, setResettingPoints] = useState(false)
    const [resetPointsSearch, setResetPointsSearch] = useState('')

    // ── DATA FETCHING ──────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.from('point_rules').select('*').order('name')
            if (error) throw error
            if (data) {
                const filtered = data.filter(v => {
                    if (v.is_negative) return canViolation
                    return canAchievement
                })
                setPoin(filtered)
                const s = {
                    total: filtered.length,
                    poin: filtered.filter(v => v.is_negative).length,
                    achievements: filtered.filter(v => !v.is_negative).length,
                    avgPoints: filtered.length ? Math.round(filtered.reduce((acc, v) => acc + Math.abs(v.points), 0) / filtered.length) : 0
                }
                setStats(s)
            }
        } catch (err) {
            console.error(err)
            addToast('Gagal mengambil data poin', 'error')
        } finally {
            setLoading(false)
        }
    }, [addToast, canViolation, canAchievement])

    const fetchDataRef = useRef(fetchData)
    useEffect(() => { fetchDataRef.current = fetchData }, [fetchData])

    useEffect(() => {
        fetchData()
        const ch = supabase.channel('violation-types-rt')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'point_rules' }, () => fetchDataRef.current?.())
            .subscribe()

        // Fetch classes for reset modal
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('*').order('name')
            if (data) setClassesList(data)
        }
        fetchClasses()

        return () => {
            supabase.removeChannel(ch)
        }
    }, [fetchData])

    // ── UI EFFECTS ─────────────────────────────────────────────────
    useEffect(() => { localStorage.setItem(LS_COLS, JSON.stringify(visibleCols)) }, [visibleCols])
    useEffect(() => { localStorage.setItem(LS_PAGE_SIZE, pageSize) }, [pageSize])

    const isAnyModalOpen = isModalOpen || isDeleteModalOpen || isBulkDeleteOpen || isExportModalOpen || isResetModalOpen

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
            if (shortcutRef.current && !shortcutRef.current.contains(e.target)) setIsShortcutOpen(false)
            if (colMenuRef.current && !colMenuRef.current.contains(e.target)) setIsColMenuOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const handleAdd = () => { setSelectedItem(null); setIsModalOpen(true) }
    const handleEdit = item => { setSelectedItem(item); setIsModalOpen(true) }

    const filteredResetClasses = useMemo(() => {
        return [...classesList]
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
            .filter(c => c.name.toLowerCase().includes(resetPointsSearch.toLowerCase()))
    }, [classesList, resetPointsSearch])

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
    const filteredPoin = useMemo(() => {
        let result = poin.filter(v => {
            const q = searchQuery.toLowerCase()
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
    }, [poin, searchQuery, filterCategory, filterType, filterStatus, filterExtreme, sortBy])

    const totalRows = filteredPoin.length
    const pagedPoin = filteredPoin.slice((page - 1) * pageSize, page * pageSize)

    useEffect(() => { setPage(1) }, [searchQuery, filterCategory, filterType, filterStatus, filterExtreme])

    // Insights Row
    const insights = useMemo(() => {
        const res = []
        const extremeCount = poin.filter(v => Math.abs(v.points) >= 20).length
        if (extremeCount > 0) res.push({
            id: 'extreme',
            label: `${extremeCount} Poin Ekstrim`,
            desc: 'Bobot poin ≥ 20 ditemukan',
            icon: AlertTriangle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            active: filterExtreme,
            onClick: () => { setFilterExtreme(!filterExtreme); setIsFilterOpen(true) }
        })

        const inactiveCount = poin.filter(v => v.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: `${inactiveCount} Tipe Nonaktif`,
            desc: 'Poin yang sedang dideaktifkan',
            icon: Archive,
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            active: filterStatus === 'inactive',
            onClick: () => { setFilterStatus(filterStatus === 'inactive' ? 'active' : 'inactive'); setIsFilterOpen(true) }
        })

        return res
    }, [poin, filterExtreme, filterStatus])

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
                const { error } = await supabase.from('point_rules').update(payload).eq('id', selectedItem.id)
                if (error) throw error
                addToast('Data berhasil diupdate', 'success')
                await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'point_rules', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data: insData, error } = await supabase.from('point_rules').insert(payload).select().single()
                if (error) throw error
                addToast('Data baru berhasil ditambahkan', 'success')
                await logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'point_rules', recordId: insData?.id, newData: payload })
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
            const { error } = await supabase.from('point_rules').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast('Data berhasil dihapus', 'success')
            await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'point_rules', recordId: itemToDelete.id, oldData: itemToDelete })
            setIsDeleteModalOpen(false)
            fetchData()
        } catch { addToast('Gagal menghapus data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const idsSnap = [...selectedIds]
            const { error } = await supabase.from('point_rules').delete().in('id', idsSnap)
            if (error) throw error
            addToast(`${idsSnap.length} data berhasil dihapus`, 'success')
            await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'point_rules', oldData: { bulk: true, count: idsSnap.length, ids: idsSnap } })
            setSelectedIds([])
            setIsBulkDeleteOpen(false)
            fetchData()
        } catch { addToast('Gagal menghapus data', 'error') }
        finally { setSubmitting(false) }
    }

    const handleBatchResetPoints = async () => {
        const msg = resetPointsClassId
            ? `Reset semua poin siswa di kelas ini ke 0?`
            : `Reset SEMUA poin siswa di SELURUH kelas ke 0? Tindakan ini tidak bisa dibatalkan.`

        if (!window.confirm(msg)) return

        setResettingPoints(true)
        try {
            let query = supabase.from('students').update({ total_points: 0 })
            if (resetPointsClassId) {
                query = query.eq('class_id', resetPointsClassId)
            }

            const { error } = await query
            if (error) throw error

            await logAudit({
                action: 'RESET_POINTS',
                table: 'students',
                description: `Reset poin siswa ke 0 ${resetPointsClassId ? `untuk kelas ${resetPointsClassId}` : 'untuk semua kelas'}`,
                metadata: { class_id: resetPointsClassId }
            })

            addToast('Berhasil mereset poin siswa', 'success')
            setIsResetModalOpen(false)
        } catch (err) {
            console.error(err)
            addToast('Gagal mereset poin', 'error')
        } finally {
            setResettingPoints(false)
        }
    }

    const toggleSelect = id => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    const toggleSelectAll = () => {
        const ids = pagedPoin.map(v => v.id)
        setSelectedIds(prev => ids.every(id => prev.includes(id)) ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])])
    }
    const allSelected = pagedPoin.length > 0 && pagedPoin.every(v => selectedIds.includes(v.id))

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
            let q = supabase.from('point_rules').select('*').order('name')
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
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.setAttribute('download', `data_poin_${new Date().toISOString().slice(0, 10)}.csv`)
                link.click()
            } else {
                const XLSX = await import('xlsx')
                const ws = XLSX.utils.json_to_sheet(mapped)
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, 'Data Poin')
                XLSX.writeFile(wb, `data_poin_${new Date().toISOString().slice(0, 10)}.xlsx`)
            }

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'point_rules',
                newData: {
                    format,
                    scope: exportScope,
                    count: data.length
                }
            })

            addToast(`Export berhasil`, 'success')
        } catch (err) {
            console.error(err)
            addToast('Gagal export data', 'error')
        } finally {
            setExporting(false)
            setIsExportModalOpen(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Read-only Banner */}
            {!canEdit && (
                <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                    <EyeOff className="text-rose-500 shrink-0 w-4 h-4" />
                    <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit konfigurasi poin dinonaktifkan oleh administrator.</p>
                </div>
            )}

            {/* Sub-Header Actions */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface-alt)]/10">
                <div>
                    <h3 className="text-sm font-black text-[var(--color-text)]">Konfigurasi Aturan Poin</h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        Atur jenis pelanggaran, prestasi, bobot poin, dan reset periodik di sini.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-end w-full sm:w-auto">
                    {/* Reset Button */}
                    {canEdit && (
                        <button 
                            onClick={() => { setResetPointsClassId(''); setIsResetModalOpen(true) }}
                            className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-orange-500 hover:border-orange-500/30 flex items-center gap-2 transition-all text-xs font-bold"
                            title="Reset Poin Santri"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Poin Siswa</span>
                        </button>
                    )}

                    {/* Export Button */}
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center gap-2 transition-all text-xs font-bold"
                        title="Export Aturan Poin"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export</span>
                    </button>

                    {/* Privacy Toggle */}
                    <button 
                        onClick={() => {
                            const next = !isPrivacyMode
                            setIsPrivacyMode(next)
                            addToast(next ? 'Mode privasi diaktifkan — Data sensitif disembunyikan' : 'Mode privasi dinonaktifkan', next ? 'info' : 'success')
                        }}
                        className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all text-xs font-bold ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}
                    >
                        {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="hidden md:inline">{isPrivacyMode ? 'Privasi On' : 'Privasi Off'}</span>
                    </button>

                    {/* Add Button */}
                    {canEdit && (
                        <button 
                            onClick={handleAdd}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Aturan</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            {showStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Shield} label="Total Tipe" value={stats.total} color="primary" loading={loading} />
                    <StatCard icon={Gavel} label="Pelanggaran" value={stats.poin} color="rose" loading={loading} />
                    <StatCard icon={Trophy} label="Prestasi" value={stats.achievements} color="emerald" loading={loading} />
                    <StatCard icon={Info} label="Rata-rata Poin" value={stats.avgPoints} color="amber" loading={loading} />
                </div>
            )}


            {/* Filters & Actions */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
                <div className="flex flex-row items-center gap-2 p-3">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari nama poin atau deskripsi... (Ctrl+K)"
                            className="w-full h-9 pl-10 pr-10 text-xs sm:text-sm bg-transparent border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl outline-none"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-3 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`h-9 px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isFilterOpen || activeFilterCount > 0 ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            <span className="hidden xs:inline">Filter</span>
                            {activeFilterCount > 0 && <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">{activeFilterCount}</span>}
                        </button>
                    </div>
                </div>

                {/* Active Filter Chips */}
                {(searchQuery || filterCategory || filterType || filterStatus !== 'active' || filterExtreme) && (
                    <div className="px-3 pb-3 -mt-1">
                        <div className="flex flex-wrap gap-2">
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus pencarian">
                                    <Search className="w-3 h-3 opacity-60" />
                                    <span className="max-w-[220px] truncate">"{searchQuery}"</span>
                                    <span className="w-4 h-4 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterCategory && (
                                <button type="button" onClick={() => setFilterCategory('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]" title="Hapus filter kategori">
                                    <span className="opacity-70">Kategori:</span> {filterCategory}
                                    <span className="w-4 h-4 rounded bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterType && (
                                <button type="button" onClick={() => setFilterType('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus filter tipe">
                                    {filterType === 'violation' ? 'Pelanggaran' : 'Prestasi'}
                                    <span className="w-4 h-4 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterStatus !== 'active' && (
                                <button type="button" onClick={() => setFilterStatus('active')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600" title="Hapus filter status">
                                    Status: {filterStatus === 'inactive' ? 'Nonaktif' : filterStatus}
                                    <span className="w-4 h-4 rounded bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterExtreme && (
                                <button type="button" onClick={() => setFilterExtreme(false)}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-red-500/20 bg-red-500/10 text-[10px] font-black text-red-600" title="Hapus filter poin ekstrim">
                                    Poin Ekstrim
                                    <span className="w-4 h-4 rounded bg-white/70 dark:bg-[var(--color-surface)] border border-red-500/20 flex items-center justify-center text-red-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            <button type="button" onClick={resetAllFilters}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600" title="Reset semua filter">
                                <RotateCcw className="w-3 h-3" />
                                <span>Reset semua</span>
                            </button>
                        </div>
                    </div>
                )}

                {isFilterOpen && (
                    <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Kategori</label>
                                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="">Semua Kategori</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Tipe</label>
                                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="">Pelanggaran & Prestasi</option>
                                    <option value="violation">Hanya Pelanggaran</option>
                                    <option value="achievement">Hanya Prestasi</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">Urutan</label>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="name">Nama (A-Z)</option>
                                    <option value="points">Poin Tertinggi</option>
                                    <option value="newest">Terbaru</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={resetAllFilters} className="w-full h-9 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                    <p className="text-sm font-black text-[var(--color-primary)] tracking-tight">{selectedIds.length} tipe poin dipilih</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                        </button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                            <X className="w-3.5 h-3.5" />
                            <span>Batal</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-4">
                        <div className="animate-pulse space-y-3">
                            <div className="h-10 bg-[var(--color-surface-alt)] rounded-xl w-full" />
                            {[1, 2, 3, 4, 5].map(idx => (
                                <div key={idx} className="h-16 bg-[var(--color-surface-alt)]/60 rounded-xl w-full" />
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto whitespace-nowrap hidden md:block">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--color-surface-alt)]/50 border-b border-[var(--color-border)]">
                                    <tr>
                                        <th className="px-6 py-4 w-16 text-center">
                                            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />
                                        </th>
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
                                                        <div className={`fixed z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 space-y-0.5 animate-in fade-in zoom-in-95`}
                                                            style={{ top: menuPos.top, right: menuPos.right }}>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Atur Kolom</p>
                                                            {[{ key: 'description', label: 'Keterangan Aturan' }, { key: 'type', label: 'Tipe (Neg/Pos)' }, { key: 'category', label: 'Kategori' }, { key: 'points', label: 'Bobot Poin' }].map(({ key, label }) => (
                                                                <button key={key} onClick={() => setVisibleCols(p => ({ ...p, [key]: !p[key] }))} className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all group text-left">
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
                                    {totalRows === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-24 text-center align-middle">
                                                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                                                    <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mb-4 text-xl">
                                                        <Search className="w-6 h-6 opacity-40" />
                                                    </div>
                                                    <h3 className="text-sm font-black text-[var(--color-text)] mb-1">Pencarian Tidak Ditemukan</h3>
                                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] leading-relaxed mb-4">
                                                        Tidak ditemukan tipe poin yang cocok dengan kriteria filter atau database masih kosong.
                                                    </p>
                                                    <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition">
                                                        Reset Semua Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : pagedPoin.map(rule => (
                                        <tr key={rule.id} className="hover:bg-[var(--color-surface-alt)]/30 transition-all group">
                                            <td className="px-6 py-4 w-16 text-center">
                                                <input type="checkbox" checked={selectedIds.includes(rule.id)} onChange={() => toggleSelect(rule.id)} className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 ${rule.is_negative ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                                        {rule.is_negative ? <Gavel className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-[var(--color-text)] truncate">{rule.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {visibleCols.description && (
                                                <td className="px-6 py-4">
                                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] line-clamp-1 max-w-xs">{rule.description || '—'}</p>
                                                </td>
                                            )}
                                            {visibleCols.type && (
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${rule.is_negative ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                                                        {rule.is_negative ? 'Pelanggaran' : 'Prestasi'}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleCols.category && (
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{rule.category}</span>
                                                </td>
                                            )}
                                            {visibleCols.points && (
                                                <td className="px-6 py-4 text-center">
                                                    <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-white text-[10px] font-black shadow-lg ${getPointStyle(rule.points)}`}>
                                                        {isPrivacyMode ? '***' : `${rule.points > 0 ? '+' : ''}${rule.points}`}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center gap-1">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleEdit(rule)}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all text-sm"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => { setItemToDelete(rule); setIsDeleteModalOpen(true) }}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Stack View */}
                        <div className="md:hidden divide-y divide-[var(--color-border)]">
                            {totalRows === 0 ? (
                                <div className="py-16 text-center px-4">
                                    <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] mx-auto mb-3 text-lg">
                                        <Search className="w-5 h-5 opacity-40" />
                                    </div>
                                    <h3 className="text-xs font-black text-[var(--color-text)] mb-1">Pencarian Tidak Ditemukan</h3>
                                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-4 mx-auto">
                                        Tidak ditemukan tipe poin yang cocok dengan kriteria filter.
                                    </p>
                                    <button onClick={resetAllFilters} className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition">
                                        Reset Semua
                                    </button>
                                </div>
                            ) : pagedPoin.map(v => (
                                <div key={v.id} className="p-4 bg-[var(--color-surface)]">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center text-white ${v.is_negative ? 'bg-red-500' : 'bg-emerald-500'}`}>
                                                {v.is_negative ? <Gavel className="w-4 h-4" /> : <Trophy className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-[var(--color-text)] leading-tight">{v.name}</h4>
                                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">{v.category}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded-lg text-white text-[9px] font-black shadow-lg shrink-0 ${getPointStyle(v.points)}`}>
                                            {isPrivacyMode ? '***' : `${v.points > 0 ? '+' : ''}${v.points}`}
                                        </div>
                                    </div>
                                    {v.description && (
                                        <p className="text-[10px] font-bold text-[var(--color-text-muted)] leading-relaxed mt-1.5 pl-11">{v.description}</p>
                                    )}
                                    {canEdit && (
                                        <div className="flex items-center gap-2 mt-4">
                                            <button onClick={() => handleEdit(v)} className="flex-1 h-8.5 rounded-xl bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">Edit</button>
                                            <button onClick={() => { setItemToDelete(v); setIsDeleteModalOpen(true) }} className="flex-1 h-8.5 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest">Hapus</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Pagination Footer */}
                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label="aturan poin"
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    </>
                )}
            </div>

            {/* Modal Form Add/Edit */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedItem ? 'Edit Konfigurasi Poin' : 'Tambah Konfigurasi Poin'} size="lg">
                <form onSubmit={(e) => {
                    e.preventDefault()
                    const formData = new FormData(e.target)
                    handleSubmit({
                        name: formData.get('name'),
                        points: Number(formData.get('points')),
                        category: formData.get('category'),
                        is_negative: formData.get('type') === 'violation',
                        description: formData.get('description'),
                        status: formData.get('status')
                    })
                }} className="space-y-6 pb-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Nama Aturan / Poin</label>
                            <input name="name" defaultValue={selectedItem?.name} required placeholder="Contoh: Terlambat Masuk Kelas" className="w-full h-11 px-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Kategori</label>
                            <select name="category" defaultValue={selectedItem?.category || 'Kedisiplinan'} className="w-full h-11 px-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none appearance-none">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Tipe Akumulasi</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
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
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Bobot Poin (Angka Positif)</label>
                            <input type="number" name="points" defaultValue={selectedItem ? Math.abs(selectedItem.points) : ''} required min="1" placeholder="Misal: 10" className="w-full h-11 px-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Status Keaktifan</label>
                            <select name="status" defaultValue={selectedItem?.status || 'active'} className="w-full h-11 px-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none appearance-none">
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif (Arsip)</option>
                            </select>
                        </div>
                        <div className="space-y-3 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">Deskripsi & Dasar Aturan (Opsional)</label>
                            <textarea name="description" defaultValue={selectedItem?.description} rows={3} placeholder="Tuliskan detail atau pasal yang berkaitan..." className="w-full p-4 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl text-sm font-bold focus:border-[var(--color-primary)] outline-none resize-none" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                        <button type="submit" disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-[var(--color-primary)] text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all flex items-center justify-center">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (selectedItem ? 'Update Poin' : 'Simpan Konfigurasi')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Delete Confirmation */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Hapus Tipe Poin" size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-4 text-red-500">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><Trash2 className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider">Hapus Permanen</h3>
                            <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest leading-tight">Berisiko pada relasi laporan siswa.</p>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">Yakin menghapus tipe poin <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{itemToDelete?.name}</span>? Tindakan ini tidak dapat dibatalkan.</p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">BATAL</button>
                        <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'HAPUS SEKARANG'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Bulk Delete */}
            <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title="Hapus Massal" size="sm">
                <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-500/20 shadow-xl"><Trash2 className="text-3xl w-10 h-10" /></div>
                    <h3 className="text-lg font-black text-[var(--color-text)] uppercase tracking-tight">Hapus {selectedIds.length} Pilihan?</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-widest leading-relaxed">Semua konfigurasi yang dipilih akan dihapus permanen dari sistem.</p>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">Batal</button>
                        <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-1 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ya, Hapus Semua'}
                        </button>
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
                        <button onClick={() => handleExport('excel')} disabled={exporting} className="w-full h-12 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 transition-all active:scale-95">
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> <span>Export ke Excel (.XLSX)</span></>}
                        </button>
                        <button onClick={() => handleExport('csv')} disabled={exporting} className="w-full h-12 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95">
                            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> <span>Export ke CSV (.CSV)</span></>}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Reset Poin Siswa Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset Poin Semester Baru"
                description="Set semua poin siswa ke 0 untuk semester/tahun ajaran baru."
                icon={RotateCcw}
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
                size="sm"
                mobileVariant="bottom-sheet"
                footer={
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => setIsResetModalOpen(false)}
                            className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--color-surface-alt)] transition-all"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleBatchResetPoints}
                            disabled={resettingPoints}
                            className="flex-[2] h-11 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            {resettingPoints ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset Sekarang</span>
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1 ml-1 flex items-center gap-2">
                            <GraduationCap className="opacity-40 w-4 h-4" /> <span>Pilih Kelas</span>
                        </label>
                        <div className="space-y-3">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                    <Search className="w-3.5 h-3.5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Cari nama kelas..."
                                    value={resetPointsSearch}
                                    onChange={(e) => setResetPointsSearch(e.target.value)}
                                    className="w-full h-10 pl-9 pr-8 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[11px] font-medium focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] transition-all outline-none"
                                />
                                {resetPointsSearch && (
                                    <button
                                        onClick={() => setResetPointsSearch('')}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--color-text-muted)] hover:text-rose-500 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1 max-h-48 overflow-y-auto pr-1">
                                {/* Option Semua Kelas */}
                                {!resetPointsSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setResetPointsClassId('')}
                                        className={`col-span-full p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-95 group mb-1 ${resetPointsClassId === ''
                                            ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20'
                                            : 'border-orange-500/30 bg-orange-500/5 text-orange-600 hover:bg-orange-500/10'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${resetPointsClassId === '' ? 'bg-white/20 text-white' : 'bg-orange-500 text-white shadow-sm'
                                            }`}>
                                            <Layers className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-[10px] uppercase tracking-wider leading-tight">Semua Kelas</p>
                                        </div>
                                        {resetPointsClassId === '' && <Check className="w-3 h-3 opacity-60" />}
                                    </button>
                                )}

                                {filteredResetClasses.map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setResetPointsClassId(c.id)}
                                        className={`p-2.5 rounded-xl border text-left flex items-center gap-3 transition-all hover:scale-[1.01] active:scale-95 group ${resetPointsClassId === c.id
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20'
                                            : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-alt)]'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${resetPointsClassId === c.id ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                                            }`}>
                                            <GraduationCap className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-[10px] uppercase tracking-wider leading-tight">{c.name}</p>
                                        </div>
                                        {resetPointsClassId === c.id && <Check className="w-3 h-3 opacity-60" />}
                                    </button>
                                ))}

                                {filteredResetClasses.length === 0 && (
                                    <div className="col-span-full py-8 text-center space-y-2">
                                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto opacity-40">
                                            <Search className="w-4 h-4" />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40">Kelas tidak ditemukan</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-[10px] text-red-600 dark:text-red-400 font-bold leading-relaxed">
                        <AlertCircle className="inline w-3.5 h-3.5 mr-1" />
                        <span>Tindakan ini tidak bisa dibatalkan. Semua poin siswa akan direset ke 0 untuk rombongan kelas yang dipilih.</span>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
