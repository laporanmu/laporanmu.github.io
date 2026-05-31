import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import PageHeader from '../../components/ui/PageHeader'
import { EmptyState, StatCard } from '../../components/ui/DataDisplay'
import RichSelect from '../../components/ui/RichSelect'
import RichDatePicker from '../../components/ui/RichDatePicker'
import Pagination from '../../components/ui/Pagination'
import StatsCarousel from '../../components/StatsCarousel'
import BulkActionsBar from '../../components/ui/BulkActionsBar'
import { LIST_KAMAR } from '../../utils/reports/raportConstants'
import Modal from '../../components/ui/Modal'
import {
    Bed, Users, ClipboardList, CheckSquare, Search, Plus, Trash2, X,
    Sparkles, Star, Award, ShieldAlert, UserMinus, ArrowRightLeft,
    Check, User, RefreshCw, AlertCircle, LayoutGrid, Table, Edit2,
    Clock, CheckCircle2, Sliders, RotateCcw,
    User2Icon, VenusAndMars, Info,
    Eye, EyeOff, Download, FileSpreadsheet
} from 'lucide-react'

// Local storage keys for audit and task persistence during preview/session
const LS_AUDITS = 'laporanmu_dorm_audits'
const LS_TASKS = 'laporanmu_dorm_tasks'
const LS_LOGS = 'laporanmu_dorm_shift_logs'

// ── Taruh TEPAT di atas "export default function DormsPage()" ──

const InventoryModalContent = ({
    inventoryModalDorm,
    inventories,
    setSelectedDormForInventory,
    setEditingInventoryItem,
    setNewInventoryItem,
    setIsInventoryModalOpen,
    setInventoryToDelete,
    setIsConfirmDeleteInventoryOpen,
    setPendingInventoryDorm,
    setInventoryModalDorm,
}) => {
    const [invSearch, setInvSearch] = useState('')
    const [invSort, setInvSort] = useState('name_asc')
    const [invFilter, setInvFilter] = useState('all')

    const roomItems = inventories.filter(i => i.dorm_id === inventoryModalDorm?.id)

    const filtered = roomItems
        .filter(item => {
            const matchSearch = item.item_name.toLowerCase().includes(invSearch.toLowerCase())
            const matchFilter =
                invFilter === 'all' ? true :
                    invFilter === 'good' ? item.damaged_condition_count === 0 :
                        invFilter === 'damaged' ? item.damaged_condition_count > 0 : true
            return matchSearch && matchFilter
        })
        .sort((a, b) => {
            if (invSort === 'name_asc') return a.item_name.localeCompare(b.item_name)
            if (invSort === 'name_desc') return b.item_name.localeCompare(a.item_name)
            if (invSort === 'total_desc') return b.total_quantity - a.total_quantity
            if (invSort === 'damaged_desc') return b.damaged_condition_count - a.damaged_condition_count
            return 0
        })

    return (
        <div className="flex flex-col gap-0">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)] opacity-40" />
                    <input
                        type="text"
                        value={invSearch}
                        onChange={e => setInvSearch(e.target.value)}
                        placeholder="Cari item..."
                        className="w-full h-8 pl-8 pr-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                </div>

                {/* Filter pills */}
                {['all', 'good', 'damaged'].map(f => (
                    <button
                        key={f}
                        onClick={() => setInvFilter(f)}
                        className={`h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 ${invFilter === f
                            ? 'bg-[var(--color-primary)] text-white border-transparent'
                            : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                            }`}
                    >
                        {f === 'all' ? 'Semua' : f === 'good' ? 'Baik' : 'Rusak'}
                    </button>
                ))}

                {/* Sort */}
                <div className="shrink-0 w-[130px]">
                    <RichSelect
                        compact
                        value={invSort}
                        onChange={setInvSort}
                        options={[
                            { id: 'name_asc', name: 'Nama A–Z' },
                            { id: 'name_desc', name: 'Nama Z–A' },
                            { id: 'total_desc', name: 'Terbanyak' },
                            { id: 'damaged_desc', name: 'Rusak' },
                        ]}
                    />
                </div>

                <span className="text-[9px] text-[var(--color-text-muted)] font-black opacity-50 shrink-0">
                    {filtered.length}/{roomItems.length}
                </span>
            </div>

            {/* Table */}
            <div className="px-4 py-4">
                {filtered.length === 0 ? (
                    <EmptyState
                        variant="dashed"
                        icon={ClipboardList}
                        color="indigo"
                        title={roomItems.length === 0 ? 'Belum Ada Inventaris' : 'Tidak Ditemukan'}
                        description={
                            roomItems.length === 0
                                ? 'Klik "+ Tambah Item" untuk menambahkan fasilitas kamar ini.'
                                : 'Tidak ada item yang cocok dengan pencarian atau filter saat ini.'
                        }
                    />
                ) : (
                    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-left table-fixed border-separate border-spacing-0">
                            <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                <tr>
                                    <th className="pl-4 pr-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[50%]">Nama Item</th>
                                    <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[20%]">Total</th>
                                    <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[20%]">Kondisi</th>
                                    <th className="px-2 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[15%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-[var(--color-surface-alt)]/25 transition-colors">
                                        {/* Nama Item */}
                                        <td className="pl-4 pr-2 py-3.5 text-left">
                                            <p className="text-[12px] font-black text-[var(--color-text)]">{item.item_name}</p>
                                            {item.notes && <p className="text-[9px] text-[var(--color-text-muted)] opacity-60 mt-0.5">{item.notes}</p>}
                                        </td>

                                        {/* Total — angka saja */}
                                        <td className="px-2 py-3.5 text-center">
                                            <p className="text-[13px] font-black text-[var(--color-text)]">{item.total_quantity} Buah</p>
                                        </td>

                                        {/* Kondisi — angka real baik & rusak */}
                                        <td className="px-2 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-2.5">
                                                <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                    {item.good_condition_count}
                                                </span>
                                                <span className="text-[var(--color-border)]">|</span>
                                                <span className={`flex items-center gap-1 text-[11px] font-black ${item.damaged_condition_count > 0 ? 'text-rose-500' : 'text-[var(--color-text-muted)] opacity-30'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.damaged_condition_count > 0 ? 'bg-rose-500' : 'bg-[var(--color-border)]'}`} />
                                                    {item.damaged_condition_count}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Aksi */}
                                        <td className="px-2 py-3.5 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setPendingInventoryDorm(inventoryModalDorm)
                                                        setSelectedDormForInventory(inventoryModalDorm?.id)
                                                        setEditingInventoryItem(item)
                                                        setNewInventoryItem({
                                                            item_name: item.item_name,
                                                            total_quantity: item.total_quantity,
                                                            good_condition_count: item.good_condition_count,
                                                            damaged_condition_count: item.damaged_condition_count,
                                                            notes: item.notes || ''
                                                        })
                                                        setInventoryModalDorm(null)
                                                        setIsInventoryModalOpen(true)
                                                    }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { setPendingInventoryDorm(inventoryModalDorm); setInventoryModalDorm(null); setInventoryToDelete(item); setIsConfirmDeleteInventoryOpen(true) }}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// Helper: create/find a portal container div by ID
function getPortalContainer(id) {
    let el = document.getElementById(id)
    if (!el) { el = document.createElement('div'); el.id = id; document.body.appendChild(el) }
    return el
}

// Privacy mask helper
function maskName(str) {
    if (!str) return '—'
    const parts = str.trim().split(' ')
    return parts.map((p, i) => i === 0 ? p : p[0] + '***').join(' ')
}

export default function DormsPage() {
    const { addToast } = useToast()
    const [activeTab, setActiveTab] = useState('plotting') // 'plotting' | 'kebersihan' | 'musyrif' | 'inventori' | 'kelola_kamar'

    // Header actions state
    const [isPrivacyMode, setIsPrivacyMode] = useState(false)
    const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false)
    const [headerMenuRect, setHeaderMenuRect] = useState(null)
    const [headerMenuMounted, setHeaderMenuMounted] = useState(false)
    const headerMenuBtnRef = useRef(null)

    // Mount/unmount header dropdown with animation delay
    useEffect(() => {
        if (isHeaderMenuOpen) {
            setHeaderMenuMounted(true)
        } else {
            const t = setTimeout(() => setHeaderMenuMounted(false), 200)
            return () => clearTimeout(t)
        }
    }, [isHeaderMenuOpen])

    // Close header menu on outside click
    useEffect(() => {
        if (!isHeaderMenuOpen) return
        const handler = (e) => {
            if (headerMenuBtnRef.current && !headerMenuBtnRef.current.contains(e.target) && !e.target.closest('#portal-dorm-header-menu')) {
                setIsHeaderMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [isHeaderMenuOpen])

    // --- State variables ---
    const [students, setStudents] = useState([])
    const [classesList, setClassesList] = useState([])

    // Export plotting CSV — declared after students to avoid TDZ
    const handleExportCSV = useCallback(() => {
        setIsHeaderMenuOpen(false)
        try {
            const rows = [['Nama Santri', 'Kelas', 'Kamar', 'Status']]
            students.forEach(s => {
                rows.push([
                    s.name,
                    s.classes?.name || '—',
                    s.metadata?.kamar || '—',
                    s.metadata?.kamar ? 'Terplot' : 'Belum Terplot'
                ])
            })
            const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
            const blob = new Blob([csv], { type: 'text/csv' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a'); a.href = url; a.download = 'plotting_kamar.csv'; a.click()
            URL.revokeObjectURL(url)
            addToast('Data plotting berhasil diekspor', 'success')
        } catch { addToast('Gagal mengekspor data', 'error') }
    }, [students, addToast])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Filters for room plotting
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClassFilter, setSelectedClassFilter] = useState('')
    const [selectedRoomTab, setSelectedRoomTab] = useState('All') // 'All' | 'Unassigned' | 'Fachruddin' | ...
    const [selectedGenderFilter, setSelectedGenderFilter] = useState('') // '' | 'putra' | 'putri'
    const [selectedBuildingFilter, setSelectedBuildingFilter] = useState('') // '' | 'Gedung A' | ...
    const [viewMode, setViewMode] = useState('cards') // 'cards' | 'table'
    const [showAdvFilter, setShowAdvFilter] = useState(false)

    // Pagination states
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [jumpPage, setJumpPage] = useState('')

    // Room assignment modal state
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
    const [studentToAssign, setStudentToAssign] = useState(null)
    const [selectedTargetRoom, setSelectedTargetRoom] = useState('')
    const [inventoryModalDorm, setInventoryModalDorm] = useState(null)
    const [pendingInventoryDorm, setPendingInventoryDorm] = useState(null)

    // Eviction modal state
    const [isConfirmEvictOpen, setIsConfirmEvictOpen] = useState(false)
    const [studentToEvict, setStudentToEvict] = useState(null)

    // Bulk actions state
    const [selectedIds, setSelectedIds] = useState([])
    const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false)
    const [selectedBulkRoom, setSelectedBulkRoom] = useState('')
    const [bulkSubmitting, setBulkSubmitting] = useState(false)

    // Kebersihan (Cleanliness Audit) State
    const [audits, setAudits] = useState([])
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false)
    const [newAudit, setNewAudit] = useState({
        room: 'Fachruddin',
        score: 85,
        rating: 'A',
        aspects: { kerapian: 85, kebersihan: 85, keharuman: 85 },
        notes: ''
    })

    // Tugas Musyrif State
    const [musyrifTasks, setMusyrifTasks] = useState([])
    const [shiftLogs, setShiftLogs] = useState([])
    const [isLogModalOpen, setIsLogModalOpen] = useState(false)
    const [newLog, setNewLog] = useState({
        musyrifName: '',
        shift: 'Malam',
        notes: '',
        issues: ''
    })

    // Dynamic Dorms list (CRUD)
    const [dorms, setDorms] = useState([])
    const [loadingDorms, setLoadingDorms] = useState(true)
    const [isDormModalOpen, setIsDormModalOpen] = useState(false)
    const [editingDorm, setEditingDorm] = useState(null)
    const [submittingDorm, setSubmittingDorm] = useState(false)
    const [newDorm, setNewDorm] = useState({ id: '', ar: '', capacity: 30, gender: '', building: '', status: 'active', musyrif_id: '' })
    const [isConfirmDeleteDormOpen, setIsConfirmDeleteDormOpen] = useState(false)
    const [dormToDelete, setDormToDelete] = useState(null)
    const [submittingDeleteDorm, setSubmittingDeleteDorm] = useState(false)
    const [isConfirmDeleteAuditOpen, setIsConfirmDeleteAuditOpen] = useState(false)
    const [auditToDelete, setAuditToDelete] = useState(null)
    const [submittingDeleteAudit, setSubmittingDeleteAudit] = useState(false)

    // Musyrif (staff) list — for PJ Kamar assignment
    const [musyrifList, setMusyrifList] = useState([])

    // Inventory state
    const [inventories, setInventories] = useState([]) // { dorm_id, items: [] }
    const [loadingInventory, setLoadingInventory] = useState(false)
    const [selectedDormForInventory, setSelectedDormForInventory] = useState('')
    const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
    const [editingInventoryItem, setEditingInventoryItem] = useState(null)
    const [newInventoryItem, setNewInventoryItem] = useState({ item_name: '', total_quantity: 1, good_condition_count: 1, damaged_condition_count: 0, notes: '' })
    const [submittingInventory, setSubmittingInventory] = useState(false)
    const [isConfirmDeleteInventoryOpen, setIsConfirmDeleteInventoryOpen] = useState(false)
    const [inventoryToDelete, setInventoryToDelete] = useState(null)

    // Audit date filter
    const [auditDateFrom, setAuditDateFrom] = useState('')
    const [auditDateTo, setAuditDateTo] = useState('')
    const [auditRoomFilter, setAuditRoomFilter] = useState('')

    const fetchDorms = async () => {
        try {
            setLoadingDorms(true)
            const { data, error } = await supabase
                .from('dorms')
                .select('*')
                .order('created_at', { ascending: true })

            if (error) throw error
            setDorms(data || [])
        } catch (err) {
            console.error('[DormsPage] Gagal memuat data kamar:', err.message)
            // Fallback to LIST_KAMAR
            setDorms(LIST_KAMAR)
        } finally {
            setLoadingDorms(false)
        }
    }

    const fetchAudits = async () => {
        try {
            const { data, error } = await supabase
                .from('dorm_audits')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            setAudits(data || [])
        } catch (err) {
            console.warn('[DormsPage] Gagal mengambil audits dari Supabase, fallback ke localStorage:', err.message)
            try {
                const saved = localStorage.getItem(LS_AUDITS)
                setAudits(saved ? JSON.parse(saved) : getMockAudits())
            } catch {
                setAudits(getMockAudits())
            }
        }
    }

    const fetchShiftLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('dorm_shift_logs')
                .select('*')
                .order('created_at', { ascending: false })
            if (error) throw error
            const formatted = (data || []).map(d => ({
                id: d.id,
                date: d.date,
                musyrifName: d.musyrif_name,
                shift: d.shift,
                notes: d.notes,
                issues: d.issues
            }))
            setShiftLogs(formatted)
        } catch (err) {
            console.warn('[DormsPage] Gagal mengambil shift logs dari Supabase, fallback ke localStorage:', err.message)
            try {
                const saved = localStorage.getItem(LS_LOGS)
                setShiftLogs(saved ? JSON.parse(saved) : getMockShiftLogs())
            } catch {
                setShiftLogs(getMockShiftLogs())
            }
        }
    }

    const fetchMusyrifTasks = async () => {
        try {
            const { data, error } = await supabase
                .from('dorm_musyrif_tasks')
                .select('*')
                .order('id', { ascending: true })
            if (error) throw error
            if (!data || data.length === 0) {
                setMusyrifTasks(getMockTasks())
            } else {
                const formatted = data.map(d => ({
                    id: d.id,
                    title: d.title,
                    desc: d.desc_text,
                    completed: d.completed,
                    completedAt: d.completed_at
                }))
                setMusyrifTasks(formatted)
            }
        } catch (err) {
            console.warn('[DormsPage] Gagal mengambil tasks dari Supabase, fallback ke localStorage:', err.message)
            try {
                const saved = localStorage.getItem(LS_TASKS)
                setMusyrifTasks(saved ? JSON.parse(saved) : getMockTasks())
            } catch {
                setMusyrifTasks(getMockTasks())
            }
        }
    }

    // --- Load Database Core ---
    const fetchData = async () => {
        try {
            setLoading(true)
            // 1. Fetch active students and classes
            const { data: stdData, error: stdErr } = await supabase
                .from('students')
                .select('id, name, metadata, class_id, classes(id, name)')
                .is('deleted_at', null)
                .order('name')

            if (stdErr) throw stdErr

            // 2. Fetch classes list for filtering
            const { data: clsData, error: clsErr } = await supabase
                .from('classes')
                .select('id, name')
                .order('name')

            if (clsErr) throw clsErr

            setStudents(stdData || [])
            setClassesList(clsData || [])

            // 3. Fetch dynamic dorms
            await fetchDorms()

            // 4. Fetch cleanliness, shift logs, and tasks
            await fetchAudits()
            await fetchShiftLogs()
            await fetchMusyrifTasks()

            // 5. Fetch musyrif list and inventories
            await fetchMusyrifList()
            await fetchInventories()
        } catch (err) {
            console.error('[DormsPage] Gagal mengambil data:', err.message)
            addToast('Gagal memuat data dari database', 'error')
        } finally {
            setLoading(false)
        }
    }

    const fetchMusyrifList = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, name, role')
                .order('name')
            if (error) throw error
            setMusyrifList(data || [])
        } catch (err) {
            console.warn('[DormsPage] Gagal memuat daftar musyrif:', err.message)
            setMusyrifList([])
        }
    }

    const fetchInventories = async () => {
        try {
            setLoadingInventory(true)
            const { data, error } = await supabase
                .from('dorm_inventories')
                .select('*')
                .order('dorm_id')
            if (error) throw error
            setInventories(data || [])
        } catch (err) {
            // Table may not exist yet \u2014 silent fallback
            setInventories([])
        } finally {
            setLoadingInventory(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        setPage(1)
    }, [searchQuery, selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter])

    useEffect(() => {
        setSelectedIds([])
    }, [searchQuery, selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter, page])

    // --- Room assignment functions ---
    const handleOpenAssignModal = (student) => {
        setStudentToAssign(student)
        setSelectedTargetRoom(student.metadata?.kamar || '')
        setIsAssignModalOpen(true)
    }

    const handleSaveAssignment = async () => {
        if (!studentToAssign) return
        try {
            setSubmitting(true)
            const currentMetadata = studentToAssign.metadata || {}
            const nextMetadata = { ...currentMetadata, kamar: selectedTargetRoom }

            const { error } = await supabase
                .from('students')
                .update({ metadata: nextMetadata })
                .eq('id', studentToAssign.id)

            if (error) throw error

            // Update state locally
            setStudents(prev => prev.map(s => {
                if (s.id === studentToAssign.id) {
                    return { ...s, metadata: nextMetadata }
                }
                return s
            }))

            addToast(`Santri ${studentToAssign.name} berhasil dialokasikan ke kamar ${selectedTargetRoom || 'Dikosongkan'}`, 'success')
            setIsAssignModalOpen(false)
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan plotting:', err.message)
            addToast('Gagal memindahkan kamar santri', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleOpenEvictModal = (student) => {
        setStudentToEvict(student)
        setIsConfirmEvictOpen(true)
    }

    const handleConfirmEvict = async () => {
        if (!studentToEvict) return
        try {
            setSubmitting(true)
            const currentMetadata = studentToEvict.metadata || {}
            const nextMetadata = { ...currentMetadata, kamar: '' }

            const { error } = await supabase
                .from('students')
                .update({ metadata: nextMetadata })
                .eq('id', studentToEvict.id)

            if (error) throw error

            setStudents(prev => prev.map(s => {
                if (s.id === studentToEvict.id) {
                    return { ...s, metadata: nextMetadata }
                }
                return s
            }))

            addToast(`Plotting kamar ${studentToEvict.name} berhasil dikosongkan`, 'success')
            setIsConfirmEvictOpen(false)
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus plotting:', err.message)
            addToast('Gagal mengeluarkan santri dari kamar', 'error')
        } finally {
            setSubmitting(false)
            setStudentToEvict(null)
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
    }

    const handleBulkAssignSave = async () => {
        if (selectedIds.length === 0 || !selectedBulkRoom) return
        try {
            setBulkSubmitting(true)

            const updates = selectedIds.map(async (id) => {
                const student = students.find(s => s.id === id)
                if (!student) return
                const currentMetadata = student.metadata || {}
                const nextMetadata = { ...currentMetadata, kamar: selectedBulkRoom }

                const { error } = await supabase
                    .from('students')
                    .update({ metadata: nextMetadata })
                    .eq('id', id)

                if (error) throw error
                return { id, nextMetadata }
            })

            const results = await Promise.all(updates)

            setStudents(prev => prev.map(s => {
                const match = results.find(r => r && r.id === s.id)
                if (match) {
                    return { ...s, metadata: match.nextMetadata }
                }
                return s
            }))

            addToast(`${selectedIds.length} santri berhasil dialokasikan ke kamar ${selectedBulkRoom}`, 'success')
            setIsBulkAssignModalOpen(false)
            setSelectedIds([])
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan plotting massal:', err.message)
            addToast('Gagal memindahkan kamar santri secara massal', 'error')
        } finally {
            setBulkSubmitting(false)
        }
    }

    const handleBulkUnassign = async () => {
        if (selectedIds.length === 0) return
        if (!window.confirm(`Apakah Anda yakin ingin menghapus plotting kamar untuk ${selectedIds.length} santri terpilih?`)) return
        try {
            setBulkSubmitting(true)

            const updates = selectedIds.map(async (id) => {
                const student = students.find(s => s.id === id)
                if (!student) return
                const currentMetadata = student.metadata || {}
                const nextMetadata = { ...currentMetadata, kamar: '' }

                const { error } = await supabase
                    .from('students')
                    .update({ metadata: nextMetadata })
                    .eq('id', id)

                if (error) throw error
                return { id, nextMetadata }
            })

            const results = await Promise.all(updates)

            setStudents(prev => prev.map(s => {
                const match = results.find(r => r && r.id === s.id)
                if (match) {
                    return { ...s, metadata: match.nextMetadata }
                }
                return s
            }))

            addToast(`Plotting kamar untuk ${selectedIds.length} santri berhasil dihapus`, 'success')
            setSelectedIds([])
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus plotting massal:', err.message)
        } finally {
            setBulkSubmitting(false)
        }
    }

    const handleSaveDorm = async (e) => {
        e.preventDefault()
        if (!newDorm.id.trim()) return
        try {
            setSubmittingDorm(true)
            const dormData = {
                ar: newDorm.ar || null,
                capacity: Number(newDorm.capacity),
                gender: newDorm.gender || null,
                building: newDorm.building || null,
                status: newDorm.status || 'active',
                musyrif_id: newDorm.musyrif_id || null
            }

            if (editingDorm) {
                // Update
                const { error } = await supabase
                    .from('dorms')
                    .update(dormData)
                    .eq('id', editingDorm.id)
                if (error) throw error
                addToast(`Kamar ${editingDorm.id} berhasil diperbarui`, 'success')
            } else {
                // Create
                const { error } = await supabase
                    .from('dorms')
                    .insert([{ id: newDorm.id, ...dormData }])
                if (error) throw error
                addToast(`Kamar ${newDorm.id} berhasil ditambahkan`, 'success')
            }
            setIsDormModalOpen(false)
            await fetchDorms()
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan kamar:', err.message)
            addToast('Gagal menyimpan data kamar', 'error')
        } finally {
            setSubmittingDorm(false)
        }
    }

    const handleOpenDeleteDormModal = (room) => {
        setDormToDelete(room)
        setIsConfirmDeleteDormOpen(true)
    }

    const handleConfirmDeleteDorm = async () => {
        if (!dormToDelete) return
        const roomName = dormToDelete.id
        try {
            setSubmittingDeleteDorm(true)
            const occupants = students.filter(s => s.metadata?.kamar === roomName)
            if (occupants.length > 0) {
                // Empty their rooms first
                const studentIds = occupants.map(s => s.id)
                const updates = studentIds.map(async (id) => {
                    const studentObj = students.find(s => s.id === id)
                    const nextMetadata = { ...studentObj.metadata, kamar: '' }
                    const { error } = await supabase.from('students').update({ metadata: nextMetadata }).eq('id', id)
                    if (error) throw error
                    return { id, nextMetadata }
                })

                const results = await Promise.all(updates)

                // Update local student states
                setStudents(prev => prev.map(s => {
                    const match = results.find(r => r && r.id === s.id)
                    if (match) {
                        return { ...s, metadata: match.nextMetadata }
                    }
                    return s
                }))
            }

            // Delete the room
            const { error } = await supabase.from('dorms').delete().eq('id', roomName)
            if (error) throw error
            addToast(`Kamar ${roomName} berhasil dihapus`, 'success')
            await fetchDorms()
            setIsConfirmDeleteDormOpen(false)
            setDormToDelete(null)
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus kamar:', err.message)
            addToast('Gagal menghapus kamar dari database', 'error')
        } finally {
            setSubmittingDeleteDorm(false)
        }
    }

    // --- Kebersihan Audit Functions ---
    const handleSaveAudit = async (e) => {
        e.preventDefault()
        const avg = Math.round((Number(newAudit.aspects.kerapian) + Number(newAudit.aspects.kebersihan) + Number(newAudit.aspects.keharuman)) / 3)
        let rating = 'C'
        if (avg >= 85) rating = 'A'
        else if (avg >= 70) rating = 'B'

        const auditData = {
            date: new Date().toISOString().slice(0, 10),
            room: newAudit.room,
            score: avg,
            rating,
            aspects: { ...newAudit.aspects },
            notes: newAudit.notes || 'Pemeriksaan rutin asrama'
        }

        try {
            const { error } = await supabase
                .from('dorm_audits')
                .insert([auditData])

            if (error) throw error

            addToast(`Laporan kebersihan kamar ${newAudit.room} berhasil disubmit dengan predikat ${rating} (${avg} Poin)`, 'success')
            await fetchAudits()
        } catch (err) {
            console.warn('[DormsPage] Gagal menyimpan audit ke Supabase, fallback ke localStorage:', err.message)
            const localData = {
                id: Date.now().toString(),
                ...auditData
            }
            const nextAudits = [localData, ...audits]
            setAudits(nextAudits)
            localStorage.setItem(LS_AUDITS, JSON.stringify(nextAudits))
            addToast('Laporan kebersihan berhasil disimpan', 'success')
        } finally {
            setIsAuditModalOpen(false)
            setNewAudit({
                room: 'Fachruddin',
                score: 85,
                rating: 'A',
                aspects: { kerapian: 85, kebersihan: 85, keharuman: 85 },
                notes: ''
            })
        }
    }

    const handleOpenDeleteAuditModal = (audit) => {
        setAuditToDelete(audit)
        setIsConfirmDeleteAuditOpen(true)
    }

    const handleConfirmDeleteAudit = async () => {
        if (!auditToDelete) return
        const id = auditToDelete.id
        try {
            setSubmittingDeleteAudit(true)
            // Check if ID is UUID (Supabase uses string UUID, localStorage uses stringified timestamp)
            const isUUID = id && id.toString().length > 15
            if (isUUID) {
                const { error } = await supabase
                    .from('dorm_audits')
                    .delete()
                    .eq('id', id)
                if (error) throw error
                addToast('Laporan penilaian kebersihan berhasil dihapus', 'success')
                await fetchAudits()
            } else {
                const next = audits.filter(a => a.id !== id)
                setAudits(next)
                localStorage.setItem(LS_AUDITS, JSON.stringify(next))
                addToast('Laporan penilaian kebersihan berhasil dihapus', 'success')
            }
            setIsConfirmDeleteAuditOpen(false)
            setAuditToDelete(null)
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus audit:', err.message)
            addToast('Gagal menghapus laporan kebersihan', 'error')
        } finally {
            setSubmittingDeleteAudit(false)
        }
    }
    // --- Inventory CRUD Functions ---
    const handleSaveInventoryItem = async (e) => {
        e.preventDefault()
        if (!newInventoryItem.item_name.trim() || !selectedDormForInventory) return
        try {
            setSubmittingInventory(true)
            const payload = {
                dorm_id: selectedDormForInventory,
                item_name: newInventoryItem.item_name,
                total_quantity: Number(newInventoryItem.total_quantity) || 1,
                good_condition_count: Number(newInventoryItem.good_condition_count) || 0,
                damaged_condition_count: Number(newInventoryItem.damaged_condition_count) || 0,
                notes: newInventoryItem.notes || null,
                last_checked_at: new Date().toISOString()
            }
            if (editingInventoryItem) {
                const { error } = await supabase.from('dorm_inventories').update(payload).eq('id', editingInventoryItem.id)
                if (error) throw error
                addToast('Item inventaris berhasil diperbarui', 'success')
            } else {
                const { error } = await supabase.from('dorm_inventories').insert([payload])
                if (error) throw error
                addToast('Item inventaris berhasil ditambahkan', 'success')
            }
            setIsInventoryModalOpen(false)
            setEditingInventoryItem(null)
            setNewInventoryItem({ item_name: '', total_quantity: 1, good_condition_count: 1, damaged_condition_count: 0, notes: '' })
            await fetchInventories()
            if (pendingInventoryDorm) {
                setInventoryModalDorm(pendingInventoryDorm)
                setPendingInventoryDorm(null)
            }
        } catch (err) {
            console.error('[DormsPage] Gagal menyimpan inventaris:', err.message)
            addToast('Gagal menyimpan data inventaris. Pastikan tabel dorm_inventories sudah dibuat.', 'error')
        } finally {
            setSubmittingInventory(false)
        }
    }

    const handleConfirmDeleteInventory = async () => {
        if (!inventoryToDelete) return
        try {
            const { error } = await supabase.from('dorm_inventories').delete().eq('id', inventoryToDelete.id)
            if (error) throw error
            addToast('Item inventaris berhasil dihapus', 'success')
            setIsConfirmDeleteInventoryOpen(false)
            setInventoryToDelete(null)
            await fetchInventories()
            if (pendingInventoryDorm) {
                setInventoryModalDorm(pendingInventoryDorm)
                setPendingInventoryDorm(null)
            }
        } catch (err) {
            console.error('[DormsPage] Gagal menghapus inventaris:', err.message)
            addToast('Gagal menghapus item inventaris', 'error')
        }
    }

    // --- Musyrif ID Assignment (PJ Kamar) ---
    const handleSaveMusyrifId = async (dormId, musyrifId) => {
        try {
            const { error } = await supabase
                .from('dorms')
                .update({ musyrif_id: musyrifId || null })
                .eq('id', dormId)
            if (error) throw error
            addToast(`PJ Kamar ${dormId} berhasil diperbarui`, 'success')
            await fetchDorms()
        } catch (err) {
            console.error('[DormsPage] Gagal update musyrif_id:', err.message)
            addToast('Gagal menetapkan PJ Kamar', 'error')
        }
    }

    // --- Musyrif Task Functions ---
    const toggleTask = async (taskId) => {
        const targetTask = musyrifTasks.find(t => t.id === taskId)
        if (!targetTask) return

        const nextCompleted = !targetTask.completed
        const completedTime = nextCompleted ? new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : null

        try {
            const { error } = await supabase
                .from('dorm_musyrif_tasks')
                .update({
                    completed: nextCompleted,
                    completed_at: completedTime,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId)

            if (error) throw error
            addToast('Status tugas berhasil diperbarui', 'success')
            await fetchMusyrifTasks()
        } catch (err) {
            console.warn('[DormsPage] Gagal update task di Supabase, fallback ke localStorage:', err.message)
            const next = musyrifTasks.map(t => t.id === taskId ? { ...t, completed: nextCompleted, completedAt: completedTime } : t)
            setMusyrifTasks(next)
            localStorage.setItem(LS_TASKS, JSON.stringify(next))
            addToast('Status tugas berhasil diperbarui', 'success')
        }
    }

    const resetAllTasks = async () => {
        try {
            const { error } = await supabase
                .from('dorm_musyrif_tasks')
                .update({
                    completed: false,
                    completed_at: null,
                    updated_at: new Date().toISOString()
                })
                .neq('id', '0') // Update all rows

            if (error) throw error
            addToast('Seluruh daftar kontrol tugas musyrif berhasil direset', 'success')
            await fetchMusyrifTasks()
        } catch (err) {
            console.warn('[DormsPage] Gagal reset tasks di Supabase, fallback ke localStorage:', err.message)
            const next = musyrifTasks.map(t => ({ ...t, completed: false, completedAt: null }))
            setMusyrifTasks(next)
            localStorage.setItem(LS_TASKS, JSON.stringify(next))
            addToast('Seluruh daftar kontrol tugas musyrif berhasil direset', 'success')
        }
    }

    const handleSaveLog = async (e) => {
        e.preventDefault()
        if (!newLog.musyrifName) {
            addToast('Nama Musyrif penjaga wajib diisi', 'warning')
            return
        }

        const logData = {
            date: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }),
            musyrif_name: newLog.musyrifName,
            shift: newLog.shift,
            notes: newLog.notes || 'Kondisi asrama kondusif',
            issues: newLog.issues || 'Nihil'
        }

        try {
            const { error } = await supabase
                .from('dorm_shift_logs')
                .insert([logData])

            if (error) throw error
            addToast('Jurnal piket musyrif berhasil disimpan', 'success')
            await fetchShiftLogs()
        } catch (err) {
            console.warn('[DormsPage] Gagal menyimpan log piket ke Supabase, fallback ke localStorage:', err.message)
            const localData = {
                id: Date.now().toString(),
                musyrifName: logData.musyrif_name,
                ...logData
            }
            const nextLogs = [localData, ...shiftLogs]
            setShiftLogs(nextLogs)
            localStorage.setItem(LS_LOGS, JSON.stringify(nextLogs))
            addToast('Jurnal piket musyrif berhasil disimpan', 'success')
        } finally {
            setIsLogModalOpen(false)
            setNewLog({ musyrifName: '', shift: 'Malam', notes: '', issues: '' })
        }
    }

    // --- Computed values ---
    // Count stats
    const stats = useMemo(() => {
        let totalCount = students.length
        let assignedCount = students.filter(s => s.metadata?.kamar).length
        let unassignedCount = totalCount - assignedCount

        // Cleanliness stats (Average score of rooms this week)
        const avgCleanliness = audits.length > 0
            ? Math.round(audits.reduce((acc, curr) => acc + curr.score, 0) / audits.length)
            : 0

        // Musyrif task progress
        const completedTasks = musyrifTasks.filter(t => t.completed).length
        const totalTasks = musyrifTasks.length
        const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        return { totalCount, assignedCount, unassignedCount, avgCleanliness, taskProgress, completedTasks, totalTasks }
    }, [students, audits, musyrifTasks])

    // Group students by rooms
    const studentsByRoom = useMemo(() => {
        const mapping = {}
        dorms.forEach(room => {
            mapping[room.id] = []
        })

        students.forEach(s => {
            const roomVal = s.metadata?.kamar
            if (roomVal && mapping[roomVal]) {
                mapping[roomVal].push(s)
            }
        })
        return mapping
    }, [students, dorms])

    const activeFilters = useMemo(() => {
        const list = []
        if (selectedClassFilter) {
            const cls = classesList.find(c => c.id === selectedClassFilter)
            list.push({
                label: `Kelas: ${cls?.name || selectedClassFilter}`,
                clear: () => { setSelectedClassFilter(''); setPage(1); }
            })
        }
        if (selectedRoomTab && selectedRoomTab !== 'All') {
            let label = `Kamar: ${selectedRoomTab}`
            if (selectedRoomTab === 'Assigned') label = 'Status: Sudah Diplot'
            if (selectedRoomTab === 'Unassigned') label = 'Status: Belum Diplot'
            list.push({
                label,
                clear: () => { setSelectedRoomTab('All'); setPage(1); }
            })
        }
        if (selectedGenderFilter) {
            list.push({
                label: `Kelamin: ${selectedGenderFilter === 'putra' ? 'Putra' : 'Putri'}`,
                clear: () => { setSelectedGenderFilter(''); setPage(1); }
            })
        }
        if (selectedBuildingFilter) {
            list.push({
                label: `Gedung: ${selectedBuildingFilter}`,
                clear: () => { setSelectedBuildingFilter(''); setPage(1); }
            })
        }
        return list
    }, [selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter, classesList])

    // Filtered students list for room listing
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase())
            const matchClass = selectedClassFilter ? s.class_id === selectedClassFilter : true
            const roomVal = s.metadata?.kamar || ''

            let matchRoomTab = true
            if (selectedRoomTab === 'Unassigned') {
                matchRoomTab = !roomVal
            } else if (selectedRoomTab === 'Assigned') {
                matchRoomTab = !!roomVal
            } else if (selectedRoomTab !== 'All') {
                matchRoomTab = roomVal === selectedRoomTab
            }

            let matchGender = true
            if (selectedGenderFilter) {
                const dormOfStudent = dorms.find(d => d.id === roomVal)
                matchGender = dormOfStudent?.gender === selectedGenderFilter
            }

            let matchBuilding = true
            if (selectedBuildingFilter) {
                const dormOfStudent = dorms.find(d => d.id === roomVal)
                matchBuilding = dormOfStudent?.building === selectedBuildingFilter
            }

            return matchSearch && matchClass && matchRoomTab && matchGender && matchBuilding
        })
    }, [students, searchQuery, selectedClassFilter, selectedRoomTab, selectedGenderFilter, selectedBuildingFilter, dorms])

    // Sliced and paginated students list
    const paginatedStudents = useMemo(() => {
        const startIndex = (page - 1) * pageSize
        return filteredStudents.slice(startIndex, startIndex + pageSize)
    }, [filteredStudents, page, pageSize])

    // Filtered audits for Kontrol Kebersihan tab
    const filteredAudits = useMemo(() => {
        return audits.filter(a => {
            const matchRoom = auditRoomFilter ? a.room === auditRoomFilter : true
            const matchFrom = auditDateFrom ? a.date >= auditDateFrom : true
            const matchTo = auditDateTo ? a.date <= auditDateTo : true
            return matchRoom && matchFrom && matchTo
        })
    }, [audits, auditRoomFilter, auditDateFrom, auditDateTo])

    // Computed unique building list from dorms (for filter dropdown)
    const buildingOptions = useMemo(() => {
        const buildings = dorms.map(d => d.building).filter(Boolean)
        return [...new Set(buildings)]
    }, [dorms])

    const allSelected = paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.includes(s.id))

    const toggleAll = () => {
        if (allSelected) {
            const paginatedIds = paginatedStudents.map(s => s.id)
            setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)))
        } else {
            const paginatedIds = paginatedStudents.map(s => s.id)
            setSelectedIds(prev => {
                const newIds = [...prev]
                paginatedIds.forEach(id => {
                    if (!newIds.includes(id)) newIds.push(id)
                })
                return newIds
            })
        }
    }

    return (
        <DashboardLayout>
            <div className="p-4 sm:p-6 space-y-5">
                {/* --- HEADER --- */}
                <PageHeader
                    badge="Kesantrian"
                    breadcrumbs={['Manajemen Asrama']}
                    title="Manajemen Asrama"
                    subtitle="Plotting kamar santri, audit kebersihan, dan jurnal Musyrif."
                    actions={
                        <>
                            {/* Dropdown: Opsi Ekspor */}
                            <div className="relative">
                                <button
                                    ref={headerMenuBtnRef}
                                    onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                                    className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${
                                        isHeaderMenuOpen
                                            ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                            : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'
                                    }`}
                                    title="Opsi Data"
                                >
                                    <Sliders className="w-4 h-4" />
                                </button>

                                {headerMenuMounted && headerMenuRect && createPortal(
                                    <>
                                        <div
                                            className={`fixed inset-0 z-[9990] bg-black/[0.08] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                            onClick={() => setIsHeaderMenuOpen(false)}
                                        />
                                        <div
                                            className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-[opacity,transform] duration-200 ease-out origin-top-right ${
                                                isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'
                                            }`}
                                            style={{ top: headerMenuRect.bottom + 8, left: Math.max(10, headerMenuRect.right - 224) }}
                                        >
                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Opsi Data</p>
                                            <button
                                                onClick={handleExportCSV}
                                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Download className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[11px] font-black leading-tight">Ekspor Plotting</p>
                                                    <p className="text-[9px] opacity-40 font-bold uppercase tracking-wider">csv</p>
                                                </div>
                                            </button>
                                        </div>
                                    </>,
                                    getPortalContainer('portal-dorm-header-menu')
                                )}
                            </div>

                            {/* Privasi */}
                            <button
                                onClick={() => setIsPrivacyMode(v => !v)}
                                className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all ${
                                    isPrivacyMode
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                                title={isPrivacyMode ? 'Nonaktifkan Mode Privasi' : 'Aktifkan Mode Privasi'}
                            >
                                {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Privasi</span>
                            </button>

                            {/* Primary: Assign Santri */}
                            <button
                                onClick={() => { setSelectedTargetRoom(''); setStudentToAssign(null); setIsAssignModalOpen(true) }}
                                className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Assign Santri</span>
                            </button>
                        </>
                    }
                />

                {/* --- STATS CAROUSEL / STAT CARDS --- */}
                <StatsCarousel count={4} className="mb-5">
                    <StatCard
                        onClick={() => { setActiveTab('plotting'); setSelectedRoomTab('Assigned'); }}
                        className={`${activeTab === 'plotting' && selectedRoomTab !== 'Unassigned' ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10 shadow-md' : 'border-transparent'}`}
                        icon={Bed}
                        label="Plotting Kamar"
                        value={stats.assignedCount}
                        suffix={`/${stats.totalCount}`}
                        color="primary"
                    />

                    <StatCard
                        onClick={() => { setActiveTab('plotting'); setSelectedRoomTab('Unassigned'); }}
                        className={`${activeTab === 'plotting' && selectedRoomTab === 'Unassigned' ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-md shadow-amber-500/5' : 'border-transparent'}`}
                        icon={Users}
                        label="Belum Masuk Kamar"
                        value={stats.unassignedCount}
                        suffix=" Santri"
                        color="amber"
                    />

                    <StatCard
                        onClick={() => setActiveTab('kebersihan')}
                        className={`${activeTab === 'kebersihan' ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md shadow-emerald-500/5' : 'border-transparent'}`}
                        icon={Star}
                        label="Rata-rata Kebersihan"
                        value={stats.avgCleanliness}
                        suffix=" Poin"
                        color="emerald"
                    />

                    <StatCard
                        onClick={() => setActiveTab('musyrif')}
                        className={`${activeTab === 'musyrif' ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-md shadow-indigo-500/5' : 'border-transparent'}`}
                        icon={ClipboardList}
                        label="Kontrol Musyrif"
                        value={stats.taskProgress}
                        suffix={`% (${stats.completedTasks}/${stats.totalTasks})`}
                        color="indigo"
                    />
                </StatsCarousel>

                {/* --- NAVIGATION TABS --- */}
                <div className="grid grid-cols-4 sm:flex gap-1 sm:gap-1.5 p-1 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] w-full sm:w-fit shrink-0">
                    <button
                        onClick={() => setActiveTab('plotting')}
                        className={`py-2 sm:py-0 sm:h-9 px-1 sm:px-6 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shrink-0 ${activeTab === 'plotting' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Bed className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden text-[8px] xs:text-[9px] tracking-tight xs:tracking-wider">Plotting</span>
                        <span className="hidden sm:inline">Plotting Kamar</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('kebersihan')}
                        className={`py-2 sm:py-0 sm:h-9 px-1 sm:px-6 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shrink-0 ${activeTab === 'kebersihan' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse shrink-0" />
                        <span className="sm:hidden text-[8px] xs:text-[9px] tracking-tight xs:tracking-wider">Kebersihan</span>
                        <span className="hidden sm:inline">Kontrol Kebersihan</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('musyrif')}
                        className={`py-2 sm:py-0 sm:h-9 px-1 sm:px-6 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shrink-0 ${activeTab === 'musyrif' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden text-[8px] xs:text-[9px] tracking-tight xs:tracking-wider">Musyrif</span>
                        <span className="hidden sm:inline">Tugas Musyrif</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('kelola_kamar')}
                        className={`py-2 sm:py-0 sm:h-9 px-1 sm:px-6 rounded-xl text-[9px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shrink-0 ${activeTab === 'kelola_kamar' ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden text-[8px] xs:text-[9px] tracking-tight xs:tracking-wider">Kelola</span>
                        <span className="hidden sm:inline">Kelola Kamar</span>
                    </button>
                </div>

                {/* ======================================================== */}
                {/* TAB 1: PLOTTING KAMAR                                    */}
                {/* ======================================================== */}
                {activeTab === 'plotting' && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* ── SEARCH & FILTER BAR (Standardized from BehaviorPage) ── */}
                        <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                            {/* Row 1: Search + Quick Filters + Action Buttons */}
                            <div className="flex items-center gap-1.5 p-2 xs:gap-2 xs:p-2.5 lg:p-3">
                                {/* Search Bar - Dynamic & Responsive */}
                                <div className="flex-1 min-w-[80px] sm:min-w-[140px] transition-all duration-300">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm group-focus-within:text-[var(--color-primary)] transition-colors">
                                            <Search className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                            placeholder="Cari nama santri..."
                                            className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-[var(--color-surface-alt)]/50 border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition-all rounded-xl font-bold placeholder:font-normal placeholder:opacity-40 outline-none"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => { setSearchQuery(''); setPage(1); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Filter Chips - Desktop Only */}
                                <div className="hidden lg:flex flex-initial items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 min-w-0 h-full">
                                    <div className="h-4 w-px bg-[var(--color-border)] mx-1" />

                                    {/* Group 1: Status Plotting */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {[
                                            { id: 'All', label: 'Semua', icon: Users, activeCls: 'bg-[var(--color-primary)] border-[var(--color-primary)]' },
                                            { id: 'Assigned', label: 'Sudah Diplot', icon: CheckCircle2, activeCls: 'bg-emerald-500 border-emerald-500' },
                                            { id: 'Unassigned', label: 'Belum Diplot', icon: AlertCircle, activeCls: 'bg-amber-500 border-amber-500' },
                                        ].map((s) => {
                                            const isActive = selectedRoomTab === s.id || (s.id === 'Assigned' && selectedRoomTab !== 'All' && selectedRoomTab !== 'Unassigned' && selectedRoomTab !== '')
                                            return (
                                                <button
                                                    key={s.id}
                                                    onClick={() => {
                                                        if (s.id === 'Assigned') {
                                                            setSelectedRoomTab('Assigned')
                                                        } else {
                                                            setSelectedRoomTab(s.id);
                                                        }
                                                        setPage(1);
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${isActive
                                                        ? `${s.activeCls} text-white`
                                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5 hover:text-[var(--color-primary)]'
                                                        }`}
                                                >
                                                    <s.icon className={`w-3.5 h-3.5 ${isActive ? 'opacity-100' : 'opacity-30'}`} />
                                                    {s.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-1.5 xs:gap-2 shrink-0 lg:ml-auto">
                                    {/* View Switcher (Cards vs Tabel) */}
                                    <div className="bg-[var(--color-surface-alt)] p-1 rounded-xl border border-[var(--color-border)] flex gap-0.5 items-center shrink-0">
                                        <button
                                            onClick={() => setViewMode('cards')}
                                            title="Kartu"
                                            className={`h-7 px-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                        >
                                            <LayoutGrid className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Kartu</span>
                                        </button>
                                        <button
                                            onClick={() => setViewMode('table')}
                                            title="Tabel"
                                            className={`h-7 px-2.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                                        >
                                            <Table className="w-3.5 h-3.5" />
                                            <span className="hidden sm:inline">Tabel</span>
                                        </button>
                                    </div>

                                    {/* Pilih Semua / Batal */}
                                    <button
                                        onClick={toggleAll}
                                        className={`h-9 px-2.5 xs:px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${selectedIds.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'} `}
                                        title={selectedIds.length > 0 ? 'Batalkan Pilihan' : 'Pilih Semua'}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">{selectedIds.length > 0 ? 'Terpilih' : 'Pilih Semua'}</span>
                                        {selectedIds.length > 0 && (
                                            <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">
                                                {selectedIds.length}
                                            </span>
                                        )}
                                    </button>

                                    {/* Advanced Filter Sliders */}
                                    <button
                                        onClick={() => setShowAdvFilter(v => !v)}
                                        className={`h-9 px-2.5 xs:px-3 sm:px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showAdvFilter || activeFilters.length > 0
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/30'
                                            : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}
                                        title="Filter Lanjutan"
                                    >
                                        <Sliders className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Filter</span>
                                        {activeFilters.length > 0 && (
                                            <span className="w-4 h-4 rounded-full bg-white/30 text-white text-[9px] font-black flex items-center justify-center">
                                                {activeFilters.length}
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Active Filter Chips */}
                            {activeFilters.length > 0 && (
                                <div className="px-3 pb-3 -mt-1 flex flex-wrap gap-2">
                                    {activeFilters.map((f, i) => (
                                        <button key={i} type="button" onClick={f.clear}
                                            className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title="Hapus Filter">
                                            {f.label}
                                            <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                                <X className="w-3.5 h-3.5" />
                                            </span>
                                        </button>
                                    ))}
                                    <button type="button"
                                        onClick={() => {
                                            setSelectedClassFilter('');
                                            setSelectedRoomTab('All');
                                            setPage(1);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600" title="Reset Semua Filter">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Reset Filter</span>
                                    </button>
                                </div>
                            )}

                            {/* Row 2: Advanced Filter Panel */}
                            {showAdvFilter && (
                                <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                                    {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                                    <div className="flex items-center justify-between mb-3.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-1 h-3.5 bg-[var(--color-primary)] rounded-full" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--color-primary)] flex items-center gap-2">
                                                <Sliders className="w-3 h-3 opacity-60" />
                                                <span className="sm:hidden">Filter</span>
                                                <span className="hidden sm:inline">Filter Lanjutan</span>
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedClassFilter('');
                                                setSelectedRoomTab('All');
                                                setSelectedGenderFilter('');
                                                setPage(1);
                                            }}
                                            className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/5 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-500/10"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                            <span>Reset Filter</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kelas</label>
                                            <RichSelect
                                                value={selectedClassFilter}
                                                onChange={(val) => { setSelectedClassFilter(val); setPage(1); }}
                                                options={[
                                                    { id: '', name: 'Semua Kelas' },
                                                    ...classesList.map(c => ({ id: c.id, name: c.name }))
                                                ]}
                                                placeholder="Semua Kelas"
                                                small
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Kamar</label>
                                            <RichSelect
                                                value={selectedRoomTab}
                                                onChange={(val) => { setSelectedRoomTab(val); setPage(1); }}
                                                options={[
                                                    { id: 'All', name: 'Semua Kamar' },
                                                    { id: 'Assigned', name: 'Sudah Diplot' },
                                                    { id: 'Unassigned', name: 'Belum Diplot' },
                                                    ...dorms.map(d => ({ id: d.id, name: d.id }))
                                                ]}
                                                placeholder="Semua Kamar"
                                                small
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Jenis Kelamin</label>
                                            <RichSelect
                                                value={selectedGenderFilter}
                                                onChange={(val) => { setSelectedGenderFilter(val); setPage(1); }}
                                                options={[
                                                    { id: '', name: 'Semua' },
                                                    { id: 'putra', name: 'Putra' },
                                                    { id: 'putri', name: 'Putri' },
                                                ]}
                                                placeholder="Semua"
                                                small
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Gedung / Blok</label>
                                            <RichSelect
                                                value={selectedBuildingFilter}
                                                onChange={(val) => { setSelectedBuildingFilter(val); setPage(1); }}
                                                options={[
                                                    { id: '', name: 'Semua Gedung' },
                                                    ...buildingOptions.map(b => ({ id: b, name: b }))
                                                ]}
                                                placeholder="Semua Gedung"
                                                small
                                            />
                                        </div>
                                        <div className="flex items-end justify-end">
                                            <button onClick={() => setShowAdvFilter(false)}
                                                className="h-9 px-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[9px] font-black uppercase tracking-widest text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                                Tutup Panel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── CARD 2: DATA CONTAINER ── */}
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                            {loading ? (
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {[1, 2, 3, 4, 5, 6].map(i => (
                                            <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                                        ))}
                                    </div>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="p-4 sm:p-5">
                                    <EmptyState
                                        variant="plain"
                                        icon={Search}
                                        title="Pencarian Tidak Ditemukan"
                                        description="Tidak ada santri yang sesuai dengan filter atau kata kunci pencarian Anda."
                                        action={
                                            <button
                                                onClick={() => {
                                                    setSearchQuery('')
                                                    setSelectedClassFilter('')
                                                    setSelectedRoomTab('All')
                                                    setSelectedGenderFilter('')
                                                    setPage(1)
                                                }}
                                                className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition"
                                            >
                                                Reset Filter
                                            </button>
                                        }
                                    />
                                </div>
                            ) : viewMode === 'cards' ? (
                                <div className="p-4 sm:p-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {paginatedStudents.map(student => {
                                            const room = student.metadata?.kamar
                                            const isSelected = selectedIds.includes(student.id)
                                            return (
                                                <div
                                                    key={student.id}
                                                    className={`p-4 rounded-2xl border bg-[var(--color-surface)] flex flex-col justify-between gap-3 group hover:scale-[1.01] transition duration-300 ${isSelected ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10 shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}`}
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex items-start gap-3 min-w-0">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${room ? 'bg-indigo-500/10 text-indigo-600' : 'bg-amber-500/10 text-amber-500'}`}>
                                                                <User className="w-4.5 h-4.5" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[12px] font-black text-[var(--color-text)] truncate">{isPrivacyMode ? maskName(student.name) : student.name}</p>
                                                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mt-0.5">{student.classes?.name || 'Kelas —'}</p>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleSelect(student.id)}
                                                            className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)] mt-1"
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-3 mt-1">
                                                        <div>
                                                            <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Kamar & Okupansi</p>
                                                            {room ? (
                                                                (() => {
                                                                    const roomDetails = dorms.find(d => d.id === room)
                                                                    const cap = roomDetails?.capacity || 30
                                                                    const occupiedCount = students.filter(s => s.metadata?.kamar === room).length
                                                                    return (
                                                                        <p className="text-[11px] font-black mt-0.5 text-indigo-600 flex items-center gap-1">
                                                                            <span>{room}</span>
                                                                            <span className="text-[9px] text-[var(--color-text-muted)] font-black opacity-60">({occupiedCount}/{cap})</span>
                                                                        </p>
                                                                    )
                                                                })()
                                                            ) : (
                                                                <p className="text-[11px] font-black mt-0.5 text-amber-500">
                                                                    Belum Diplot
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            {room && (
                                                                <button
                                                                    onClick={() => handleOpenEvictModal(student)}
                                                                    title="Keluarkan dari Kamar"
                                                                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 active:scale-95 transition-all"
                                                                >
                                                                    <UserMinus className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleOpenAssignModal(student)}
                                                                className="h-8 px-3.5 flex items-center gap-1.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 active:scale-95 transition-all"
                                                            >
                                                                <ArrowRightLeft className="w-3 h-3" />
                                                                Plotting
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[750px]">
                                        <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                            <tr>
                                                <th className="px-5 py-3.5 w-12 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={allSelected}
                                                        onChange={toggleAll}
                                                        className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)]"
                                                    />
                                                </th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[35%]">Santri</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[20%]">Status</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[30%]">Kamar & Okupansi</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-36">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {paginatedStudents.map((student, idx) => {
                                                const room = student.metadata?.kamar
                                                const isSelected = selectedIds.includes(student.id)
                                                return (
                                                    <tr key={student.id} className={`transition-colors ${isSelected ? 'bg-[var(--color-primary)]/5' : 'hover:bg-[var(--color-surface-alt)]/25'}`}>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelect(student.id)}
                                                                className="w-4 h-4 rounded border-[var(--color-border)] cursor-pointer accent-[var(--color-primary)]"
                                                            />
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[11px] flex-shrink-0 ${room ? 'bg-indigo-500/10 text-indigo-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                                                    {student.name[0].toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-[var(--color-text)] leading-tight whitespace-nowrap">{isPrivacyMode ? maskName(student.name) : student.name}</p>
                                                                    <p className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider opacity-50 mt-0.5">{student.classes?.name || 'Kelas —'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {room ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                                                                    Terplot
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-dashed border-amber-500/25">
                                                                    Belum Terplot
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {(() => {
                                                                if (!room) {
                                                                    return (
                                                                        <span className="text-xs font-bold text-[var(--color-text-muted)]/50">—</span>
                                                                    )
                                                                }
                                                                const roomDetails = dorms.find(d => d.id === room)
                                                                const cap = roomDetails?.capacity || 30
                                                                const occupiedCount = students.filter(s => s.metadata?.kamar === room).length
                                                                return (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="text-xs font-black text-indigo-600 flex items-center gap-1.5">
                                                                            <Bed className="w-3.5 h-3.5 opacity-70" />
                                                                            {room}
                                                                        </span>
                                                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black opacity-60">
                                                                            {occupiedCount} / {cap} Terisi
                                                                        </span>
                                                                    </div>
                                                                )
                                                            })()}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button
                                                                    onClick={() => handleOpenAssignModal(student)}
                                                                    title="Plotting Kamar"
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                                >
                                                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                                                </button>
                                                                {room ? (
                                                                    <button
                                                                        onClick={() => handleOpenEvictModal(student)}
                                                                        title="Keluarkan dari Kamar"
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                                    >
                                                                        <UserMinus className="w-3.5 h-3.5" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        disabled
                                                                        className="w-7 h-7 rounded-lg opacity-0 pointer-events-none flex-shrink-0 inline-flex items-center justify-center"
                                                                    >
                                                                        <UserMinus className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Pagination Footer */}
                            {filteredStudents.length > 0 && (
                                <Pagination
                                    totalRows={filteredStudents.length}
                                    page={page}
                                    pageSize={pageSize}
                                    setPage={setPage}
                                    setPageSize={setPageSize}
                                    label="Santri"
                                    jumpPage={jumpPage}
                                    setJumpPage={setJumpPage}
                                />
                            )}
                        </div>

                        {/* Floating Bulk Actions Bar */}
                        <BulkActionsBar
                            selectedCount={selectedIds.length}
                            onClear={() => setSelectedIds([])}
                            title="Terpilih"
                            subtitle="Aksi Massal Plotting"
                        >
                            <button
                                onClick={() => { setSelectedBulkRoom(''); setIsBulkAssignModalOpen(true); }}
                                className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-primary)] text-white hover:scale-105 active:scale-95 justify-center shadow-lg shadow-[var(--color-primary)]/10"
                            >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Plot Kamar ({selectedIds.length})</span>
                            </button>
                            <button
                                onClick={handleBulkUnassign}
                                className="h-9 px-4 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white justify-center shadow-lg shadow-rose-500/5"
                            >
                                <UserMinus className="w-3.5 h-3.5" />
                                <span>Kosongkan Kamar</span>
                            </button>
                        </BulkActionsBar>
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 2: KONTROL KEBERSIHAN                                */}
                {/* ======================================================== */}
                {activeTab === 'kebersihan' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
                        {/* Room Rating Cleanliness Scorecard */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="glass rounded-[1.5rem] p-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Jurnal Penilaian Kebersihan</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Riwayat skor kebersihan dan kerapian kamar mingguan.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsAuditModalOpen(true)}
                                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Input Penilaian
                                    </button>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)]">

                                    {/* Room Filter — RichSelect compact */}
                                    <div className="flex-1 min-w-[110px]">
                                        <RichSelect
                                            icon={Bed}
                                            value={auditRoomFilter}
                                            onChange={setAuditRoomFilter}
                                            placeholder="Semua Kamar"
                                            options={dorms.map(d => ({ id: d.id, name: d.id }))}
                                            extraOption={{ id: '', name: 'Semua Kamar' }}
                                        />
                                    </div>

                                    {/* Date Range — RichDatePicker */}
                                    <div className="flex items-center gap-1.5">
                                        <RichDatePicker
                                            compact
                                            value={auditDateFrom}
                                            onChange={setAuditDateFrom}
                                            clearable={false}
                                            className="w-[190px]"
                                        />
                                        <span className="text-[10px] text-[var(--color-text-muted)] font-black">s/d</span>
                                        <RichDatePicker
                                            compact
                                            value={auditDateTo}
                                            onChange={setAuditDateTo}
                                            clearable={false}
                                            className="w-[190px]"
                                        />
                                    </div>

                                    {/* Reset Button */}
                                    {(auditRoomFilter || auditDateFrom || auditDateTo) && (
                                        <button
                                            onClick={() => { setAuditRoomFilter(''); setAuditDateFrom(''); setAuditDateTo(''); }}
                                            className="h-8 px-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 transition flex items-center gap-1.5"
                                        >
                                            <X className="w-3 h-3" /> Reset
                                        </button>
                                    )}

                                    <span className="text-[9px] text-[var(--color-text-muted)] font-black ml-auto opacity-60">
                                        {filteredAudits.length} / {audits.length} laporan
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {filteredAudits.length === 0 ? (
                                        <EmptyState
                                            variant="plain"
                                            icon={ClipboardList}
                                            title={audits.length === 0 ? "Belum Ada Penilaian" : "Tidak Ditemukan"}
                                            description={audits.length === 0 ? "Belum ada laporan kebersihan yang diinput. Klik '+ Input Penilaian' untuk memulai." : "Tidak ada laporan yang sesuai filter."}
                                            action={audits.length === 0 ? (
                                                <button
                                                    onClick={() => setIsAuditModalOpen(true)}
                                                    className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-lg shadow-[var(--color-primary)]/10 transition flex items-center gap-2 mx-auto"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    Input Penilaian
                                                </button>
                                            ) : null}
                                        />
                                    ) : filteredAudits.map(audit => (
                                        <div
                                            key={audit.id}
                                            className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--color-border-hover)] transition"
                                        >
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[12px] font-black text-[var(--color-text)]">{audit.room}</span>
                                                    <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md ${audit.rating === 'A' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                                                        Predikat {audit.rating}
                                                    </span>
                                                </div>
                                                <p className="text-[10.5px] text-[var(--color-text-muted)]">{audit.notes}</p>
                                                <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-muted)] opacity-60 font-semibold pt-1">
                                                    <span>Tgl: {audit.date}</span>
                                                    <span>•</span>
                                                    <span>Kerapian: {audit.aspects?.kerapian}</span>
                                                    <span>•</span>
                                                    <span>Kebersihan: {audit.aspects?.kebersihan}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 border-[var(--color-border)] pt-3 sm:pt-0">
                                                <div className="text-right sm:pr-2">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Skor Rata-rata</p>
                                                    <p className="text-xl font-black text-[var(--color-primary)] mt-0.5">{audit.score} <span className="text-[10px] font-bold text-[var(--color-text-muted)]">/ 100</span></p>
                                                </div>
                                                <button
                                                    onClick={() => handleOpenDeleteAuditModal(audit)}
                                                    className="w-8 h-8 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-500 transition flex items-center justify-center"
                                                    title="Hapus Laporan"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Best Cleanliness Performance & Guidelines */}
                        <div className="space-y-4">
                            <div className="glass rounded-[1.5rem] p-5 relative overflow-hidden">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                        <Award className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-[var(--color-text)]">Kamar Terbaik Minggu Ini</p>
                                        <p className="text-[9px] text-[var(--color-text-muted)]">Skor tertinggi se-asrama</p>
                                    </div>
                                </div>

                                {audits.length === 0 ? (
                                    <div className="bg-[var(--color-surface-alt)] border border-dashed border-[var(--color-border)] rounded-2xl p-5 text-center">
                                        <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Kamar Terbersih</p>
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-2 opacity-60">Belum ada data penilaian. Input penilaian pertama untuk melihat kamar terbersih.</p>
                                    </div>
                                ) : (() => {
                                    const best = audits.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), audits[0])
                                    return (
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Kamar Terbersih</p>
                                            <p className="text-xl font-black text-[var(--color-text)] mt-1.5">Kamar {best.room}</p>
                                            <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{best.notes || 'Kamar dengan skor tertinggi se-asrama.'}</p>
                                            <div className="w-fit mx-auto mt-4 bg-emerald-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-500/20">
                                                {best.score} Poin
                                            </div>
                                        </div>
                                    )
                                })()}
                            </div>

                            <div className="glass rounded-[1.5rem] p-5 space-y-3">
                                <div className="flex items-center gap-2 text-[12px] font-black text-[var(--color-text)]">
                                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                                    <span>Pedoman Penilaian</span>
                                </div>
                                <p className="text-[10.5px] text-[var(--color-text-muted)] leading-relaxed">
                                    Pemeriksaan kebersihan dilakukan setiap hari Minggu pagi oleh Musyrif Kamar/Piket asrama.
                                </p>
                                <div className="space-y-2 pt-1.5">
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                                        <p className="text-[10px] text-[var(--color-text)]"><strong>Kerapian (33.3%):</strong> Plot kasur, pelipatan selimut, susunan lemari pakaian.</p>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                                        <p className="text-[10px] text-[var(--color-text)]"><strong>Kebersihan (33.3%):</strong> Menyapu, mengepel lantai kamar, kebersihan ventilasi jendela.</p>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                                        <p className="text-[10px] text-[var(--color-text)]"><strong>Keharuman (33.3%):</strong> Aroma kesegaran, tidak apek, sirkulasi udara lancar.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================================================== */}
                {/* TAB 3: TUGAS MUSYRIF                                     */}
                {/* ======================================================== */}
                {activeTab === 'musyrif' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
                        {/* Tasks Checklist */}
                        <div className="lg:col-span-2 space-y-4">
                            <div className="glass rounded-[1.5rem] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Kontrol Jurnal Harian Musyrif</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Daftar tugas rutin pengawasan asrama hari ini.</p>
                                    </div>
                                    <button
                                        onClick={resetAllTasks}
                                        className="h-8.5 px-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5"
                                    >
                                        <RefreshCw className="w-3 h-3" />
                                        Reset Checklist
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {musyrifTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => toggleTask(task.id)}
                                            className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${task.completed ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${task.completed ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}>
                                                    {task.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                                </div>
                                                <div>
                                                    <p className={`text-[11.5px] font-bold transition-all ${task.completed ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>{task.title}</p>
                                                    <p className="text-[9.5px] text-[var(--color-text-muted)] mt-0.5">{task.desc}</p>
                                                </div>
                                            </div>

                                            {task.completed && task.completedAt && (
                                                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                                                    Selesai {task.completedAt}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Shift Logs Jurnal Piket */}
                        <div className="space-y-4">
                            <div className="glass rounded-[1.5rem] p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[12.5px] font-black text-[var(--color-text)]">Jurnal Piket Asrama</p>
                                        <p className="text-[9.5px] text-[var(--color-text-muted)] mt-0.5">Catatan piket harian musyrif asrama.</p>
                                    </div>
                                    <button
                                        onClick={() => setIsLogModalOpen(true)}
                                        className="h-8 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/10 transition flex items-center gap-1.5"
                                    >
                                        <Plus className="w-3 h-3" />
                                        Isi Jurnal
                                    </button>
                                </div>

                                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                                    {shiftLogs.length === 0 ? (
                                        <p className="text-[11px] text-[var(--color-text-muted)] text-center py-8">Belum ada entri jurnal hari ini.</p>
                                    ) : (
                                        shiftLogs.map(log => (
                                            <div key={log.id} className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)]/65 border border-[var(--color-border)] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-black text-[var(--color-text)]">{log.musyrifName}</span>
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 bg-[var(--color-surface)] px-1.5 py-0.5 rounded">{log.shift}</span>
                                                </div>
                                                <div className="text-[10px] space-y-1 text-[var(--color-text-muted)] leading-relaxed">
                                                    <p><strong>Catatan:</strong> {log.notes}</p>
                                                    <p><strong>Temuan Masalah:</strong> <span className={log.issues !== 'Nihil' ? 'text-red-500 font-bold' : ''}>{log.issues}</span></p>
                                                </div>
                                                <div className="text-[8px] text-[var(--color-text-muted)] opacity-50 text-right">{log.date}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================================================== */}
                {/* MODAL: PLOTTING KAMAR (ASSIGN ROOM)                      */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isAssignModalOpen && !!studentToAssign}
                    onClose={() => setIsAssignModalOpen(false)}
                    title="Atur Plotting Kamar"
                    description={studentToAssign ? `Plotting kamar untuk santri ${studentToAssign.name}` : ""}
                    icon={Bed}
                    size="md"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                onClick={() => setIsAssignModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={handleSaveAssignment}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                {submitting ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                Simpan Plotting
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-2">Pilih Kamar Tujuan</label>

                            {/* Card Wrapper for Scrollable Content */}
                            <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                                <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                    {/* Distinct warning clearing action */}
                                    <button
                                        onClick={() => setSelectedTargetRoom('')}
                                        className={`p-3 rounded-xl border text-[11px] font-black transition-all text-left flex items-center justify-between ${!selectedTargetRoom
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-600 shadow-sm'
                                            : 'border-dashed border-amber-500/30 bg-amber-500/5 text-amber-600/70 hover:bg-amber-500/10 hover:border-amber-500/50'
                                            }`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <X className="w-3.5 h-3.5 shrink-0" />
                                            Batalkan Plotting (Kosongkan)
                                        </span>
                                        {!selectedTargetRoom && <Check className="w-3.5 h-3.5 stroke-[3px] text-amber-600" />}
                                    </button>

                                    {dorms.map(room => {
                                        const isSelected = selectedTargetRoom === room.id
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedTargetRoom(room.id)}
                                                className={`p-3 rounded-xl border text-[11px] transition-all text-left flex items-center justify-between ${isSelected
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] font-bold'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Bed className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                                                    <span>{room.id}</span>
                                                    <span className="text-[9px] opacity-40 ml-1.5" dir="rtl">{room.ar}</span>
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: PLOTTING MASAL KAMAR (BULK PLOTTING)              */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isBulkAssignModalOpen}
                    onClose={() => setIsBulkAssignModalOpen(false)}
                    title="Plotting Kamar Massal"
                    description={`Alokasikan ${selectedIds.length} santri terpilih ke kamar baru`}
                    icon={Bed}
                    size="md"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                onClick={() => setIsBulkAssignModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                onClick={handleBulkAssignSave}
                                disabled={bulkSubmitting || !selectedBulkRoom}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {bulkSubmitting ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                Simpan Plotting Massal
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Pilih Kamar Tujuan</label>

                            {/* Card Wrapper for Scrollable Content */}
                            <div className="bg-[var(--color-surface-alt)]/30 border border-[var(--color-border)]/50 rounded-2xl p-2">
                                <div className="grid grid-cols-2 gap-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                    {dorms.map((room) => {
                                        const isSelected = selectedBulkRoom === room.id
                                        return (
                                            <button
                                                key={room.id}
                                                onClick={() => setSelectedBulkRoom(room.id)}
                                                className={`p-3 rounded-xl border text-[11px] transition-all text-left flex items-center justify-between ${isSelected
                                                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)] font-black'
                                                    : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]/60 hover:border-[var(--color-border-hover)] font-bold'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Bed className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] opacity-50'}`} />
                                                    <span>{room.id}</span>
                                                    <span className="text-[9px] opacity-40 ml-1.5" dir="rtl">{room.ar}</span>
                                                </div>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: KONFIRMASI KELUARKAN DARI KAMAR                   */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isConfirmEvictOpen}
                    onClose={() => {
                        setIsConfirmEvictOpen(false)
                        setStudentToEvict(null)
                    }}
                    title="Keluarkan dari Kamar"
                    description="Plotting kamar santri akan dikosongkan"
                    icon={UserMinus}
                    iconBg="bg-red-500/10"
                    iconColor="text-red-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmEvictOpen(false)
                                    setStudentToEvict(null)
                                }}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleConfirmEvict}
                                disabled={submitting}
                                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <UserMinus className="w-3.5 h-3.5 opacity-70" />
                                )}
                                Ya, Keluarkan
                            </button>
                        </div>
                    }
                >
                    <div className="px-1">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Santri <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{studentToEvict?.name}</span> akan dikeluarkan dari kamar {studentToEvict?.metadata?.kamar || 'Kamar'}. Tindakan ini akan mengosongkan plotting kamar santri tersebut.
                        </p>
                    </div>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: KONFIRMASI HAPUS KAMAR                            */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isConfirmDeleteDormOpen}
                    onClose={() => {
                        setIsConfirmDeleteDormOpen(false)
                        setDormToDelete(null)
                    }}
                    title="Hapus Kamar"
                    description="Kamar asrama akan dihapus secara permanen"
                    icon={Trash2}
                    iconBg="bg-red-500/10"
                    iconColor="text-red-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmDeleteDormOpen(false)
                                    setDormToDelete(null)
                                }}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleConfirmDeleteDorm}
                                disabled={submittingDeleteDorm}
                                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                {submittingDeleteDorm ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                )}
                                Ya, Hapus
                            </button>
                        </div>
                    }
                >
                    <div className="px-1">
                        {dormToDelete && (() => {
                            const occupants = students.filter(s => s.metadata?.kamar === dormToDelete.id)
                            if (occupants.length > 0) {
                                return (
                                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                        Ada {occupants.length} santri yang saat ini menempati kamar <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{dormToDelete.id}</span>. Apakah Anda yakin ingin mengeluarkan mereka dari kamar secara otomatis dan menghapus kamar ini?
                                    </p>
                                )
                            }
                            return (
                                <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Apakah Anda yakin ingin menghapus kamar <span className="text-[var(--color-text)] font-black">{dormToDelete.id}</span>? Tindakan ini akan menghapus data kamar secara permanen dan tidak dapat dibatalkan.
                                </p>
                            )
                        })()}
                    </div>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: KONFIRMASI HAPUS AUDIT KEBERSIHAN                  */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isConfirmDeleteAuditOpen}
                    onClose={() => {
                        setIsConfirmDeleteAuditOpen(false)
                        setAuditToDelete(null)
                    }}
                    title="Hapus Laporan Kebersihan"
                    description="Laporan pemeriksaan akan dihapus secara permanen"
                    icon={Trash2}
                    iconBg="bg-red-500/10"
                    iconColor="text-red-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmDeleteAuditOpen(false)
                                    setAuditToDelete(null)
                                }}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleConfirmDeleteAudit}
                                disabled={submittingDeleteAudit}
                                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                            >
                                {submittingDeleteAudit ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Trash2 className="w-3.5 h-3.5 opacity-70" />
                                )}
                                Ya, Hapus
                            </button>
                        </div>
                    }
                >
                    <div className="px-1">
                        {auditToDelete && (
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                Apakah Anda yakin ingin menghapus laporan kebersihan kamar <span className="text-[var(--color-text)] font-black">{auditToDelete.room}</span> tanggal <span className="text-[var(--color-text)] font-black">{auditToDelete.date}</span>? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        )}
                    </div>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: MELIHAT  INVENTARIS  KAMAR                        */}
                {/* ======================================================== */}
                <Modal
                    isOpen={!!inventoryModalDorm}
                    onClose={() => setInventoryModalDorm(null)}
                    title={`Inventori — ${inventoryModalDorm?.id}`}
                    description="Daftar fasilitas dan kondisi barang di kamar ini."
                    icon={ClipboardList}
                    iconBg="bg-indigo-500/10"
                    iconColor="text-indigo-500"
                    size="md"
                    noPadding
                    footer={
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--color-text-muted)] font-black opacity-60">
                                {inventories.filter(i => i.dorm_id === inventoryModalDorm?.id).length} item tercatat
                            </span>
                            <button
                                onClick={() => {
                                    setPendingInventoryDorm(inventoryModalDorm)
                                    setSelectedDormForInventory(inventoryModalDorm?.id)
                                    setEditingInventoryItem(null)
                                    setNewInventoryItem({ item_name: '', total_quantity: 1, good_condition_count: 1, damaged_condition_count: 0, notes: '' })
                                    setInventoryModalDorm(null)
                                    setIsInventoryModalOpen(true)
                                }}
                                className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 transition-all"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Tambah Item
                            </button>
                        </div>
                    }
                >
                    <InventoryModalContent
                        inventoryModalDorm={inventoryModalDorm}
                        inventories={inventories}
                        setSelectedDormForInventory={setSelectedDormForInventory}
                        setEditingInventoryItem={setEditingInventoryItem}
                        setNewInventoryItem={setNewInventoryItem}
                        setIsInventoryModalOpen={setIsInventoryModalOpen}
                        setInventoryToDelete={setInventoryToDelete}
                        setIsConfirmDeleteInventoryOpen={setIsConfirmDeleteInventoryOpen}
                        setPendingInventoryDorm={setPendingInventoryDorm}    // ← tambah
                        setInventoryModalDorm={setInventoryModalDorm}        // ← tambah
                    />
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: TAMBAH / EDIT ITEM INVENTARIS                     */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isInventoryModalOpen}
                    onClose={() => { setIsInventoryModalOpen(false); setEditingInventoryItem(null) }}
                    title={editingInventoryItem ? 'Edit Item Inventaris' : 'Tambah Item Inventaris'}
                    description={`Kamar: ${selectedDormForInventory || '—'}`}
                    icon={ClipboardList}
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button type="button" onClick={() => {
                                setIsInventoryModalOpen(false);
                                if (pendingInventoryDorm) {
                                    setInventoryModalDorm(pendingInventoryDorm)
                                    setPendingInventoryDorm(null)
                                }; setEditingInventoryItem(null)
                            }}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition">
                                Batal
                            </button>
                            <button type="submit" form="inventory-form" disabled={submittingInventory}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2 ml-auto">
                                {submittingInventory ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Simpan
                            </button>
                        </div>
                    }
                >
                    <form id="inventory-form" onSubmit={handleSaveInventoryItem} className="space-y-4">
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Item *</label>
                            <input type="text" required value={newInventoryItem.item_name}
                                onChange={e => setNewInventoryItem(p => ({ ...p, item_name: e.target.value }))}
                                placeholder="Contoh: Kasur, Kipas Angin, Lemari"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Total</label>
                                <input type="number" min="0" required value={newInventoryItem.total_quantity}
                                    onChange={e => setNewInventoryItem(p => ({ ...p, total_quantity: Number(e.target.value) }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kondisi Baik</label>
                                <input type="number" min="0" value={newInventoryItem.good_condition_count}
                                    onChange={e => setNewInventoryItem(p => ({ ...p, good_condition_count: Number(e.target.value) }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Rusak</label>
                                <input type="number" min="0" value={newInventoryItem.damaged_condition_count}
                                    onChange={e => setNewInventoryItem(p => ({ ...p, damaged_condition_count: Number(e.target.value) }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Catatan (Optional)</label>
                            <input type="text" value={newInventoryItem.notes}
                                onChange={e => setNewInventoryItem(p => ({ ...p, notes: e.target.value }))}
                                placeholder="Contoh: Perlu penggantian, bantalan sudah tipis"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition" />
                        </div>
                    </form>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: KONFIRMASI HAPUS INVENTARIS                       */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isConfirmDeleteInventoryOpen}
                    onClose={() => { setIsConfirmDeleteInventoryOpen(false); setInventoryToDelete(null) }}
                    title="Hapus Item Inventaris"
                    description="Item akan dihapus secara permanen"
                    icon={Trash2} iconBg="bg-red-500/10" iconColor="text-red-500"
                    size="sm" mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button type="button" onClick={() => { setIsConfirmDeleteInventoryOpen(false); setInventoryToDelete(null); if (pendingInventoryDorm) { setInventoryModalDorm(pendingInventoryDorm); setPendingInventoryDorm(null); } }}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button type="button" onClick={handleConfirmDeleteInventory}
                                className="h-10 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 shrink-0">
                                <Trash2 className="w-3.5 h-3.5 opacity-70" /> Ya, Hapus
                            </button>
                        </div>
                    }
                >
                    <div className="px-1">
                        {inventoryToDelete && (
                            <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                                Apakah Anda yakin ingin menghapus item <span className="text-[var(--color-text)] font-black">{inventoryToDelete.item_name}</span>? Tindakan ini tidak dapat dibatalkan.
                            </p>
                        )}
                    </div>
                </Modal>


                <Modal
                    isOpen={isAuditModalOpen}
                    onClose={() => setIsAuditModalOpen(false)}
                    title="Pemeriksaan Kebersihan"
                    description="Input penilaian kebersihan & kerapian asrama"
                    icon={ClipboardList}
                    size="md"
                    footer={
                        <div className="flex items-center justify-between gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setIsAuditModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="audit-form"
                                className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Simpan Penilaian
                            </button>
                        </div>
                    }
                >
                    <form id="audit-form" onSubmit={handleSaveAudit} className="space-y-4.5">
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Pilih Kamar</label>
                            <div className="w-full">
                                <RichSelect
                                    value={newAudit.room}
                                    onChange={(val) => setNewAudit(prev => ({ ...prev, room: val }))}
                                    options={dorms.map(r => ({ id: r.id, name: r.id }))}
                                    placeholder="Pilih Kamar"
                                    icon={Bed}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kerapian (0-100)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="100"
                                    value={newAudit.aspects.kerapian}
                                    onChange={(e) => setNewAudit(prev => ({
                                        ...prev,
                                        aspects: { ...prev.aspects, kerapian: Number(e.target.value) }
                                    }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kebersihan (0-100)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="100"
                                    value={newAudit.aspects.kebersihan}
                                    onChange={(e) => setNewAudit(prev => ({
                                        ...prev,
                                        aspects: { ...prev.aspects, kebersihan: Number(e.target.value) }
                                    }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Keharuman (0-100)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="100"
                                    value={newAudit.aspects.keharuman}
                                    onChange={(e) => setNewAudit(prev => ({
                                        ...prev,
                                        aspects: { ...prev.aspects, keharuman: Number(e.target.value) }
                                    }))}
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Catatan Pemeriksaan</label>
                            <textarea
                                value={newAudit.notes}
                                onChange={(e) => setNewAudit(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Tuliskan temuan atau instruksi perbaikan..."
                                rows="3"
                                className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none"
                            />
                        </div>
                    </form>
                </Modal>

                {/* ======================================================== */}
                {/* MODAL: INPUT JURNAL PIKET MUSYRIF                        */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isLogModalOpen}
                    onClose={() => setIsLogModalOpen(false)}
                    title="Jurnal Piket Musyrif"
                    description="Catat kondisi asrama dan temuan masalah"
                    icon={ClipboardList}
                    size="md"
                    footer={
                        <div className="flex items-center justify-between gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setIsLogModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="log-form"
                                className="h-10 px-6 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                            >
                                <Check className="w-3.5 h-3.5" />
                                Simpan Jurnal
                            </button>
                        </div>
                    }
                >
                    <form id="log-form" onSubmit={handleSaveLog} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Musyrif Penjaga</label>
                                <input
                                    type="text"
                                    required
                                    value={newLog.musyrifName}
                                    onChange={(e) => setNewLog(prev => ({ ...prev, musyrifName: e.target.value }))}
                                    placeholder="Ustadz..."
                                    className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Shift Jaga</label>
                                <div className="w-full">
                                    <RichSelect
                                        value={newLog.shift}
                                        onChange={(val) => setNewLog(prev => ({ ...prev, shift: val }))}
                                        options={[
                                            { id: 'Malam', name: 'Shift Malam' },
                                            { id: 'Siang', name: 'Shift Siang' }
                                        ]}
                                        placeholder="Pilih Shift"
                                        icon={Clock}
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Catatan/Kondisi Umum</label>
                            <textarea
                                value={newLog.notes}
                                onChange={(e) => setNewLog(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Kondisi asrama malam ini..."
                                rows="3"
                                className="w-full p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition resize-none"
                            />
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Temuan Masalah/Nihil</label>
                            <input
                                type="text"
                                value={newLog.issues}
                                onChange={(e) => setNewLog(prev => ({ ...prev, issues: e.target.value }))}
                                placeholder="Contoh: Lampu teras Ibrahim mati (atau Nihil)"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                            />
                        </div>
                    </form>
                </Modal>

                {/* ======================================================== */}
                {/* TAB 5: KELOLA KAMAR (DORM MASTER DATA)                   */}
                {/* ======================================================== */}
                {activeTab === 'kelola_kamar' && (
                    <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Header toolbar */}
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface-alt)]/10">
                            <div>
                                <h3 className="text-sm font-black text-[var(--color-text)]">Master Data Kamar</h3>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Tambah, edit, dan hapus data kamar asrama MBS secara dinamis.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingDorm(null);
                                    setNewDorm({ id: '', ar: '', capacity: 30, gender: '', building: '', status: 'active', musyrif_id: '' });
                                    setIsDormModalOpen(true);
                                }}
                                className="h-10 px-5 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-[var(--color-primary)] text-white hover:scale-105 active:scale-95 justify-center shadow-lg shadow-[var(--color-primary)]/10"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Kamar</span>
                            </button>
                        </div>

                        {/* List/Grid of Dorms */}
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                            {loadingDorms ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-3 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-xs text-[var(--color-text-muted)] font-black uppercase tracking-widest">Memuat Kamar...</p>
                                </div>
                            ) : dorms.length === 0 ? (
                                <EmptyState
                                    icon={Bed}
                                    title="Belum Ada Kamar"
                                    description="Tambahkan kamar asrama baru menggunakan tombol di atas."
                                />
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[750px]">
                                        <thead className="bg-[var(--color-surface-alt)]/60 border-b border-[var(--color-border)]">
                                            <tr>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[20%]">Nama Kamar</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-right w-[12%]" dir="rtl">الغرفة (Arab)</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[10%]">Kapasitas</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[18%]">Okupansi</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-[10%]">Status</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] w-[18%]">PJ Musyrif</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-28">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--color-border)]">
                                            {dorms.map((room) => {
                                                const occupants = students.filter(s => s.metadata?.kamar === room.id)
                                                const count = occupants.length
                                                const cap = room.capacity || 30
                                                const percent = Math.min((count / cap) * 100, 100)

                                                let progressColor = 'bg-[var(--color-primary)]'
                                                if (percent >= 100) progressColor = 'bg-rose-500'
                                                else if (percent >= 85) progressColor = 'bg-amber-500'

                                                return (
                                                    <tr key={room.id} className="transition-colors hover:bg-[var(--color-surface-alt)]/25">
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                                                    <Bed className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <span className="text-sm font-black text-[var(--color-text)] block leading-tight">{room.id}</span>
                                                                    {(room.building || room.gender) && (
                                                                        <span className="text-[9px] text-[var(--color-text-muted)] font-black uppercase tracking-wider opacity-65 block mt-1">
                                                                            {room.building || '—'} • {room.gender === 'putra' ? 'Putra' : room.gender === 'putri' ? 'Putri' : 'Semua'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-right text-xs font-black text-[var(--color-text-muted)] tracking-wider" dir="rtl">
                                                            {room.ar || '—'}
                                                        </td>
                                                        <td className="px-5 py-4 text-center text-xs font-bold text-[var(--color-text)]">
                                                            {cap} Santri
                                                        </td>
                                                        <td className="px-5 py-4 min-w-[200px]">
                                                            <div className="space-y-1.5 max-w-[180px]">
                                                                <div className="flex items-center justify-between text-[10px] font-black">
                                                                    <span className={percent >= 100 ? 'text-rose-500' : percent >= 85 ? 'text-amber-500' : 'text-[var(--color-primary)]'}>
                                                                        {count} / {cap} Terisi
                                                                    </span>
                                                                    <span className="text-[var(--color-text-muted)] opacity-60">
                                                                        {Math.round(percent)}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-[var(--color-surface-alt)] h-1.5 rounded-full overflow-hidden">
                                                                    <div className={`${progressColor} h-full transition-all duration-500`} style={{ width: `${percent}%` }} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            {room.status === 'maintenance' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-500/25">
                                                                    Perbaikan
                                                                </span>
                                                            ) : room.status === 'full' ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/25">
                                                                    Terkunci
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/25">
                                                                    Aktif
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            {(() => {
                                                                const musyrif = musyrifList.find(m => m.id === room.musyrif_id)
                                                                return musyrif ? (
                                                                    <span className="text-xs font-bold text-[var(--color-text)]">
                                                                        {musyrif.name}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-[var(--color-text-muted)] italic opacity-60">
                                                                        — Tidak Ada —
                                                                    </span>
                                                                )
                                                            })()}
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                {/* Tombol baru — Lihat Inventori */}
                                                                <button
                                                                    onClick={() => setInventoryModalDorm(room)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-indigo-500 hover:bg-indigo-500/5 transition-all"
                                                                    title="Lihat Inventori"
                                                                >
                                                                    <ClipboardList className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingDorm(room);
                                                                        setNewDorm({
                                                                            id: room.id,
                                                                            ar: room.ar || '',
                                                                            capacity: room.capacity,
                                                                            gender: room.gender || '',
                                                                            building: room.building || '',
                                                                            status: room.status || 'active',
                                                                            musyrif_id: room.musyrif_id || ''
                                                                        });
                                                                        setIsDormModalOpen(true);
                                                                    }}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenDeleteDormModal(room)}
                                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/5 transition-all"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ======================================================== */}
                {/* MODAL: TAMBAH / EDIT KAMAR (DORM MASTER DATA)            */}
                {/* ======================================================== */}
                <Modal
                    isOpen={isDormModalOpen}
                    onClose={() => setIsDormModalOpen(false)}
                    title={editingDorm ? 'Edit Data Kamar' : 'Tambah Kamar Baru'}
                    description={editingDorm ? `Mengubah data kamar ${editingDorm.id}` : 'Tambahkan kamar asrama baru ke sistem'}
                    icon={Bed}
                    size="md"
                    footer={
                        <div className="flex items-center justify-between gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setIsDormModalOpen(false)}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                form="dorm-form"
                                disabled={submittingDorm}
                                className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition flex items-center justify-center gap-2"
                            >
                                {submittingDorm ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Check className="w-3.5 h-3.5" />
                                )}
                                Simpan Kamar
                            </button>
                        </div>
                    }
                >
                    <form id="dorm-form" onSubmit={handleSaveDorm} className="space-y-4">
                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Kamar</label>
                            <input
                                type="text"
                                required
                                disabled={!!editingDorm}
                                value={newDorm.id}
                                onChange={(e) => setNewDorm(prev => ({ ...prev, id: e.target.value }))}
                                placeholder="Contoh: Fachruddin"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Nama Arab (Optional)</label>
                            <input
                                type="text"
                                value={newDorm.ar}
                                onChange={(e) => setNewDorm(prev => ({ ...prev, ar: e.target.value }))}
                                placeholder="فخر الدين"
                                dir="rtl"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                            />
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Kapasitas Maksimal</label>
                            <input
                                type="number"
                                required
                                min="1"
                                value={newDorm.capacity}
                                onChange={(e) => setNewDorm(prev => ({ ...prev, capacity: Number(e.target.value) }))}
                                placeholder="30"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Jenis Kelamin</label>
                                <RichSelect
                                    usePortal={true}
                                    value={newDorm.gender || ''}
                                    onChange={(val) => setNewDorm(prev => ({ ...prev, gender: val }))}
                                    placeholder="Semua"
                                    options={[
                                        { id: '', name: 'Semua' },
                                        { id: 'putra', name: 'Putra' },
                                        { id: 'putri', name: 'Putri' }
                                    ]}
                                    icon={VenusAndMars}
                                />
                            </div>
                            <div>
                                <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Status Kamar</label>
                                <RichSelect
                                    usePortal={true}
                                    value={newDorm.status || 'active'}
                                    onChange={(val) => setNewDorm(prev => ({ ...prev, status: val }))}
                                    placeholder="Aktif"
                                    options={[
                                        { id: 'active', name: 'Aktif' },
                                        { id: 'maintenance', name: 'Perbaikan' },
                                        { id: 'full', name: 'Terkunci' }
                                    ]}
                                    icon={Info}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">Gedung / Blok (Optional)</label>
                            <input
                                type="text"
                                value={newDorm.building}
                                onChange={(e) => setNewDorm(prev => ({ ...prev, building: e.target.value }))}
                                placeholder="Contoh: Gedung A, Blok Tahfidz"
                                className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[12px] font-bold focus:outline-none focus:border-[var(--color-primary)] transition"
                            />
                        </div>

                        <div>
                            <label className="text-[9.5px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1.5">PJ Musyrif</label>
                            <RichSelect
                                usePortal={true}
                                value={newDorm.musyrif_id || ''}
                                onChange={(val) => setNewDorm(prev => ({ ...prev, musyrif_id: val }))}
                                placeholder="— Tidak Ada Musyrif —"
                                searchable
                                options={musyrifList.map(m => ({ id: m.id, name: m.name }))}
                                extraOption={{ id: '', name: '— Tidak Ada Musyrif —' }}
                                icon={User2Icon}
                            />
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    )
}

// --- MOCK AND HELPER FUNCTIONS ---
function getMockAudits() {
    return [
        {
            id: '1',
            date: '2026-05-24',
            room: 'Ahmad Dahlan',
            score: 94,
            rating: 'A',
            aspects: { kerapian: 95, kebersihan: 92, keharuman: 95 },
            notes: 'Sangat bersih dan rapi. Lemari tertata sempurna.'
        },
        {
            id: '2',
            date: '2026-05-24',
            room: 'Buya Hamka',
            score: 86,
            rating: 'A',
            aspects: { kerapian: 82, kebersihan: 88, keharuman: 88 },
            notes: 'Kondisi wangi, ventilasi baik. Ada sedikit pakaian gantung di luar lemari.'
        },
        {
            id: '3',
            date: '2026-05-24',
            room: 'Ibrahim',
            score: 72,
            rating: 'B',
            aspects: { kerapian: 70, kebersihan: 75, keharuman: 71 },
            notes: 'Kasur kurang rapi. Tolong Musyrif bantu ingatkan santri untuk lipat selimut.'
        }
    ]
}

function getMockTasks() {
    return [
        { id: '1', title: 'Absensi Subuh Berjamaah', desc: 'Kontrol ketertiban shalat subuh berjamaah di masjid jami mbs.', completed: true, completedAt: '05.00' },
        { id: '2', title: 'Pemberian Mufradat / Kosa Kata', desc: 'Pemberian 3 kosakata bahasa Arab/Inggris pagi hari setelah subuh.', completed: true, completedAt: '05.45' },
        { id: '3', title: 'Inspeksi Kamar Pagi (Kerapian)', desc: 'Musyrif keliling memastikan kasur dilipat dan tidak ada baju bergelantungan.', completed: false, completedAt: null },
        { id: '4', title: 'Kontrol Tidur Siang', desc: 'Pengkondisian santri untuk qailulah (istirahat tidur siang) jam 13.00 - 14.00.', completed: false, completedAt: null },
        { id: '5', title: 'Absensi Kehadiran Masjid Isya', desc: 'Pengecekan absensi santri lengkap pada shalat Isya berjamaah.', completed: false, completedAt: null },
        { id: '6', title: 'Kunci Pintu Asrama & Absen Malam', desc: 'Jam malam asrama, kunci pintu utama pada 22.00 dan absen kamar masing-masing.', completed: false, completedAt: null }
    ]
}

function getMockShiftLogs() {
    return [
        { id: '1', date: '28 Mei 2026', musyrifName: 'Ustadz Ahmad Fauzi', shift: 'Malam', notes: 'Santri lengkap dan tertib tidur malam tepat waktu.', issues: 'Nihil' },
        { id: '2', date: '27 Mei 2026', musyrifName: 'Ustadz Muhammad Rafli', shift: 'Malam', notes: 'Kamar Fachruddin sempat bising jam 22.30, sudah dibina.', issues: 'Nihil' },
        { id: '3', date: '26 Mei 2026', musyrifName: 'Ustadz Hilman Hakim', shift: 'Siang', notes: 'Piket asrama berjalan normal.', issues: 'Gagang pintu kamar Ibrahim longgar' }
    ]
}
