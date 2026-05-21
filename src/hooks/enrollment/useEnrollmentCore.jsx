import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    MOCK_ENROLLMENTS, MOCK_WAVES,
    ENROLLMENT_STATUS, getStatusConfig
} from '../../utils/enrollment/enrollmentConstants'

export function useEnrollmentCore({ addToast, addUndoToast }) {
    // ── DATA ──
    const [enrollments, setEnrollments] = useState([])
    const [waves, setWaves] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalRows, setTotalRows] = useState(0)

    // ── FILTERS ──
    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [filterWave, setFilterWave] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterGender, setFilterGender] = useState('')
    const [filterProgram, setFilterProgram] = useState('')
    const [sortBy, setSortBy] = useState('date_desc')

    // ── PAGINATION ──
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // ── MODALS ──
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isWaveModalOpen, setIsWaveModalOpen] = useState(false)
    const [activeModal, setActiveModal] = useState(null) // 'delete' | 'bulkApprove' | 'bulkReject' | null

    // ── ACTION CONTEXT ──
    const [selectedEnrollment, setSelectedEnrollment] = useState(null)
    const [enrollmentToDelete, setEnrollmentToDelete] = useState(null)
    const [selectedIds, setSelectedIds] = useState([])
    const [submitting, setSubmitting] = useState(false)

    // ── REFS ──
    const searchInputRef = useRef(null)

    // ── DEBOUNCE SEARCH ──
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350)
        return () => clearTimeout(t)
    }, [searchQuery])

    // Reset page on filter change
    useEffect(() => { setPage(1) }, [debouncedSearch, filterWave, filterStatus, filterGender, filterProgram, sortBy])

    // ── COMPUTED: STATS ──
    const globalStats = useMemo(() => {
        const all = MOCK_ENROLLMENTS
        const total = all.length
        const mendaftar = all.filter(e => e.status === 'mendaftar').length
        const verifikasi = all.filter(e => e.status === 'verifikasi').length
        const tes = all.filter(e => e.status === 'tes').length
        const diterima = all.filter(e => e.status === 'diterima').length
        const ditolak = all.filter(e => e.status === 'ditolak').length
        const boys = all.filter(e => e.gender === 'L').length
        const girls = all.filter(e => e.gender === 'P').length
        const activeWave = MOCK_WAVES.find(w => w.is_active)
        const quota = activeWave?.quota || 0
        const quotaUsed = diterima
        const quotaLeft = Math.max(0, quota - quotaUsed)
        return { total, mendaftar, verifikasi, tes, diterima, ditolak, boys, girls, quota, quotaUsed, quotaLeft, activeWave }
    }, [])

    // ── COMPUTED: PIPELINE DISTRIBUTION ──
    const pipelineDistribution = useMemo(() => {
        const total = globalStats.total || 1
        return {
            mendaftar: Math.round((globalStats.mendaftar / total) * 100),
            verifikasi: Math.round((globalStats.verifikasi / total) * 100),
            tes: Math.round((globalStats.tes / total) * 100),
            diterima: Math.round((globalStats.diterima / total) * 100),
            ditolak: Math.round((globalStats.ditolak / total) * 100),
        }
    }, [globalStats])

    // ── COMPUTED: FILTERED + SORTED + PAGINATED ──
    const filteredEnrollments = useMemo(() => {
        let data = [...MOCK_ENROLLMENTS]

        // Search
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase()
            data = data.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.registration_number.toLowerCase().includes(q) ||
                e.nisn?.toLowerCase().includes(q) ||
                e.school_origin?.toLowerCase().includes(q) ||
                e.phone?.includes(q)
            )
        }

        // Filters
        if (filterWave) data = data.filter(e => e.wave_id === filterWave)
        if (filterStatus) data = data.filter(e => e.status === filterStatus)
        if (filterGender) data = data.filter(e => e.gender === filterGender)
        if (filterProgram) data = data.filter(e => e.program === filterProgram)

        // Sort
        switch (sortBy) {
            case 'name_asc': data.sort((a, b) => a.name.localeCompare(b.name)); break
            case 'name_desc': data.sort((a, b) => b.name.localeCompare(a.name)); break
            case 'date_desc': data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break
            case 'date_asc': data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break
            default: break
        }

        return data
    }, [debouncedSearch, filterWave, filterStatus, filterGender, filterProgram, sortBy])

    const paginatedEnrollments = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredEnrollments.slice(start, start + pageSize)
    }, [filteredEnrollments, page, pageSize])

    // ── ACTIVE FILTER COUNT ──
    const activeFilterCount = useMemo(() =>
        [filterWave, filterStatus, filterGender, filterProgram, debouncedSearch].filter(Boolean).length
    , [filterWave, filterStatus, filterGender, filterProgram, debouncedSearch])

    // ── SELECTED ──
    const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
    const selectedEnrollments = useMemo(() =>
        paginatedEnrollments.filter(e => selectedIdSet.has(e.id))
    , [paginatedEnrollments, selectedIdSet])
    const allSelected = paginatedEnrollments.length > 0 && selectedIds.length === paginatedEnrollments.length

    const isAnyModalOpen = useMemo(() =>
        !!(isFormOpen || isProfileOpen || isWaveModalOpen || activeModal)
    , [isFormOpen, isProfileOpen, isWaveModalOpen, activeModal])

    // ── LOAD DATA (mock) ──
    const fetchData = useCallback(() => {
        setLoading(true)
        // Simulate network delay
        setTimeout(() => {
            setEnrollments(paginatedEnrollments)
            setTotalRows(filteredEnrollments.length)
            setWaves(MOCK_WAVES)
            setLoading(false)
        }, 400)
    }, [paginatedEnrollments, filteredEnrollments])

    useEffect(() => { fetchData() }, [fetchData])

    // ── ACTIONS ──
    const handleAdd = useCallback(() => {
        setSelectedEnrollment(null)
        setIsFormOpen(true)
    }, [])

    const handleEdit = useCallback((enrollment) => {
        setSelectedEnrollment(enrollment)
        setIsFormOpen(true)
    }, [])

    const handleViewProfile = useCallback((enrollment) => {
        setSelectedEnrollment(enrollment)
        setIsProfileOpen(true)
    }, [])

    const closeModal = useCallback(() => {
        setActiveModal(null)
    }, [])

    const closeForm = useCallback(() => {
        setIsFormOpen(false)
        setSelectedEnrollment(null)
    }, [])

    const closeProfile = useCallback(() => {
        setIsProfileOpen(false)
        setSelectedEnrollment(null)
    }, [])

    const handleSubmit = useCallback((formData) => {
        setSubmitting(true)
        setTimeout(() => {
            if (selectedEnrollment) {
                addToast('Data pendaftar berhasil diperbarui', 'success')
            } else {
                addToast('Pendaftar baru berhasil ditambahkan', 'success')
            }
            setIsFormOpen(false)
            setSelectedEnrollment(null)
            setSubmitting(false)
            fetchData()
        }, 600)
    }, [selectedEnrollment, addToast, fetchData])

    const confirmDelete = useCallback((enrollment) => {
        setEnrollmentToDelete(enrollment)
        setActiveModal('delete')
    }, [])

    const executeDelete = useCallback(() => {
        if (!enrollmentToDelete) return
        addToast(`${enrollmentToDelete.name} dihapus dari daftar`, 'success')
        setActiveModal(null)
        setEnrollmentToDelete(null)
        fetchData()
    }, [enrollmentToDelete, addToast, fetchData])

    // ── STATUS TRANSITIONS ──
    const updateStatus = useCallback((enrollment, newStatus) => {
        const cfg = getStatusConfig(newStatus)
        addToast(`${enrollment.name} → ${cfg.label}`, 'success')
        fetchData()
    }, [addToast, fetchData])

    // ── BULK ACTIONS ──
    const toggleSelectAll = useCallback(() => {
        setSelectedIds(prev =>
            prev.length === paginatedEnrollments.length
                ? []
                : paginatedEnrollments.map(e => e.id)
        )
    }, [paginatedEnrollments])

    const toggleSelect = useCallback((id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }, [])

    const handleBulkApprove = useCallback(() => {
        const count = selectedIds.length
        addToast(`${count} pendaftar diterima`, 'success')
        setSelectedIds([])
        setActiveModal(null)
        fetchData()
    }, [selectedIds, addToast, fetchData])

    const handleBulkReject = useCallback(() => {
        const count = selectedIds.length
        addToast(`${count} pendaftar ditolak`, 'success')
        setSelectedIds([])
        setActiveModal(null)
        fetchData()
    }, [selectedIds, addToast, fetchData])

    // ── FILTER RESET ──
    const resetAllFilters = useCallback(() => {
        setSearchQuery('')
        setFilterWave('')
        setFilterStatus('')
        setFilterGender('')
        setFilterProgram('')
        setSortBy('date_desc')
        setPage(1)
    }, [])

    return {
        // Data
        enrollments: paginatedEnrollments,
        waves,
        loading,
        totalRows: filteredEnrollments.length,
        globalStats,
        pipelineDistribution,

        // Filters
        searchQuery, setSearchQuery,
        debouncedSearch,
        filterWave, setFilterWave,
        filterStatus, setFilterStatus,
        filterGender, setFilterGender,
        filterProgram, setFilterProgram,
        sortBy, setSortBy,
        activeFilterCount,
        resetAllFilters,

        // Pagination
        page, setPage,
        pageSize, setPageSize,

        // Modals
        isFormOpen, setIsFormOpen,
        isProfileOpen, setIsProfileOpen,
        isWaveModalOpen, setIsWaveModalOpen,
        activeModal, setActiveModal,
        isAnyModalOpen,

        // Actions
        selectedEnrollment, setSelectedEnrollment,
        enrollmentToDelete,
        selectedIds, setSelectedIds,
        selectedIdSet,
        selectedEnrollments,
        allSelected,
        submitting,

        // Functions
        fetchData,
        handleAdd, handleEdit, handleViewProfile,
        closeModal, closeForm, closeProfile,
        handleSubmit, confirmDelete, executeDelete,
        updateStatus,
        toggleSelectAll, toggleSelect,
        handleBulkApprove, handleBulkReject,

        // Refs
        searchInputRef,
    }
}
