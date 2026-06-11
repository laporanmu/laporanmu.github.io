import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
    Plus, Search, X, Loader2, Shield, Gavel, Trophy, Sliders,
    Trash2, Eye, EyeOff, Download, Archive, RotateCcw, Keyboard,
    Check, AlertTriangle, AlertCircle, Info, Edit2, Layers,
    GraduationCap, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight
} from 'lucide-react'
import Modal from '@shared/components/Modal'
import RichSelect from '@shared/components/RichSelect'
import Pagination from '@shared/components/Pagination'
import RulesExportModal from './RulesExportModal'
import { StatCard } from '@shared/components/DataDisplay'
import { useToast } from '@context/Toast'
import { useAuth } from '@context/Auth'
import { useFlag } from '@context/FeatureFlags'
import { useLanguage } from '@context/Language'
import { supabase } from '@lib/supabase'
import { logAudit } from '@utils/auditLogger'
import Papa from 'papaparse'
import { buildPrintHTML, openPrintWindow } from '@utils/printTemplate'

const CATEGORIES = ['Kedisiplinan', 'Akademik', 'Tata Tertib', 'Sikap', 'Prestasi', 'Lainnya']
const LS_COLS = 'Poin_columns'
const LS_PAGE_SIZE = 'Poin_page_size'

export default function PointRulesTab({ showStats = true }) {
    const { addToast } = useToast()
    const { profile } = useAuth()
    const { enabled: teacherPoinEnabled } = useFlag('access.teacher_poin')
    const { enabled: canViolation } = useFlag('module.pelanggaran')
    const { enabled: canAchievement } = useFlag('module.prestasi')

    const { t, tNum, dir, language } = useLanguage()
    const tp = useCallback((key, params) => t(`behavior.${key}`, params), [t])

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
    const [formCategory, setFormCategory] = useState('Kedisiplinan')
    const [formStatus, setFormStatus] = useState('active')

    useEffect(() => {
        if (isModalOpen) {
            setFormCategory(selectedItem?.category || 'Kedisiplinan')
            setFormStatus(selectedItem?.status || 'active')
        }
    }, [isModalOpen, selectedItem])

    const [itemToDelete, setItemToDelete] = useState(null)
    const [exporting, setExporting] = useState(false)
    const [exportScope, setExportScope] = useState('filtered')
    const [exportColumns, setExportColumns] = useState(['name', 'type', 'category', 'points', 'status', 'description'])

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
            addToast(tp('rulesToastMetaLoadError'), 'error')
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
            label: tp('rulesExtremeInsight', { count: extremeCount }),
            desc: tp('rulesExtremeInsightDesc'),
            icon: AlertTriangle,
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            active: filterExtreme,
            onClick: () => { setFilterExtreme(!filterExtreme); setIsFilterOpen(true) }
        })

        const inactiveCount = poin.filter(v => v.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: tp('rulesInactiveInsight', { count: inactiveCount }),
            desc: tp('rulesInactiveInsightDesc'),
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
                addToast(tp('rulesToastUpdateSuccess'), 'success')
                await logAudit({ action: 'UPDATE', source: 'SYSTEM', tableName: 'point_rules', recordId: selectedItem.id, oldData: selectedItem, newData: { ...selectedItem, ...payload } })
            } else {
                const { data: insData, error } = await supabase.from('point_rules').insert(payload).select().single()
                if (error) throw error
                addToast(tp('rulesToastCreateSuccess'), 'success')
                await logAudit({ action: 'INSERT', source: 'SYSTEM', tableName: 'point_rules', recordId: insData?.id, newData: payload })
            }
            setIsModalOpen(false)
            fetchData()
        } catch (err) { addToast(err.message || tp('rulesToastSaveError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleDeleteConfirm = async () => {
        if (!itemToDelete) return
        setSubmitting(true)
        try {
            const { error } = await supabase.from('point_rules').delete().eq('id', itemToDelete.id)
            if (error) throw error
            addToast(tp('rulesToastDeleteSuccess'), 'success')
            await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'point_rules', recordId: itemToDelete.id, oldData: itemToDelete })
            setIsDeleteModalOpen(false)
            fetchData()
        } catch { addToast(tp('rulesToastDeleteError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleBulkDelete = async () => {
        setSubmitting(true)
        try {
            const idsSnap = [...selectedIds]
            const { error } = await supabase.from('point_rules').delete().in('id', idsSnap)
            if (error) throw error
            addToast(tp('rulesToastBulkDeleteSuccess', { count: idsSnap.length }), 'success')
            await logAudit({ action: 'DELETE', source: 'SYSTEM', tableName: 'point_rules', oldData: { bulk: true, count: idsSnap.length, ids: idsSnap } })
            setSelectedIds([])
            setIsBulkDeleteOpen(false)
            fetchData()
        } catch { addToast(tp('rulesToastDeleteError'), 'error') }
        finally { setSubmitting(false) }
    }

    const handleBatchResetPoints = async () => {
        const msg = resetPointsClassId
            ? tp('resetPointsClassConfirm')
            : tp('resetPointsAllConfirm')

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

            addToast(tp('rulesToastResetSuccess'), 'success')
            setIsResetModalOpen(false)
        } catch (err) {
            console.error(err)
            addToast(tp('rulesToastResetError'), 'error')
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
    const handleExport = async (format, fileName, options = {}) => {
        setExporting(true)
        try {
            let q = supabase.from('point_rules').select('*').order('name')
            if (exportScope === 'selected') {
                q = q.in('id', selectedIds)
            } else if (exportScope === 'filtered') {
                q = q.in('id', filteredPoin.map(x => x.id))
            }
            const { data, error } = await q
            if (error) throw error
            const mapped = (data || []).map(v => {
                const row = {}
                if (exportColumns.includes('name')) row[tp('rulesFieldName')] = v.name
                if (exportColumns.includes('type')) row[tp('rulesColTypePreset')] = v.is_negative ? tp('rulesFieldTypeViolation') : tp('rulesFieldTypeAchievement')
                if (exportColumns.includes('category')) row[tp('category')] = tp(`cat.${v.category}`) || v.category
                if (exportColumns.includes('points')) row[tp('rulesColWeightPreset')] = v.points
                if (exportColumns.includes('status')) row[tp('rulesFieldStatus')] = v.status === 'active' ? tp('rulesFieldStatusActive') : tp('rulesFieldStatusInactive')
                if (exportColumns.includes('description')) row[tp('notes')] = v.description || '-'
                return row
            })

            const finalFileName = fileName || `data_poin_${new Date().toISOString().slice(0, 10)}`

            if (format === 'csv') {
                const csvData = Papa.unparse(mapped, { header: options.includeHeader !== false })
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.setAttribute('download', `${finalFileName}.csv`)
                link.click()
            } else if (format === 'excel') {
                const XLSX = await import('xlsx')
                const ws = XLSX.utils.json_to_sheet(mapped, { skipHeader: options.includeHeader === false })
                const wb = XLSX.utils.book_new()
                XLSX.utils.book_append_sheet(wb, ws, tp('tabRules'))
                XLSX.writeFile(wb, `${finalFileName}.xlsx`)
            } else if (format === 'pdf') {
                const [{ default: jsPDF }, autoTableMod] = await Promise.all([
                    import('jspdf'),
                    import('jspdf-autotable'),
                ])
                const autoTable = autoTableMod.default || autoTableMod
                const doc = new jsPDF({ orientation: options.orientation || 'landscape' })
                
                const width = doc.internal.pageSize.width
                const height = doc.internal.pageSize.height
                
                // Draw Letterhead Box Logo
                doc.setFillColor(30, 58, 95) // #1e3a5f
                doc.roundedRect(14, 12, 12, 12, 2, 2, 'F')
                
                // Draw simple mortarboard cap symbol
                doc.setDrawColor(255, 255, 255)
                doc.setLineWidth(0.4)
                doc.line(16, 17, 20, 15)
                doc.line(20, 15, 24, 17)
                doc.line(24, 17, 20, 19)
                doc.line(20, 19, 16, 17)
                doc.line(18, 18, 18, 20.5)
                doc.line(22, 18, 22, 20.5)
                doc.line(18, 20.5, 22, 20.5)

                // School Name and Subtitle
                doc.setTextColor(30, 58, 95) // #1e3a5f
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(11)
                doc.text('SMP Muhammadiyah 04 Tanggul', 29, 16)
                
                doc.setTextColor(85, 85, 85) // #555
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.text('Muhammadiyah Boarding School', 29, 20)
                
                doc.setTextColor(136, 136, 136) // #888
                doc.setFontSize(7.5)
                doc.text('Jln. Pemandian No 88, Tanggul, Jember', 29, 23.5)
                
                // Right aligned doc badge & date
                const now = new Date()
                const dateLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
                const docNo = `ATR/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % 9999 + 1).padStart(4, '0')}`
                const printDateStr = new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(now) + ' WIB'
                
                // Badge rect
                doc.setFillColor(30, 58, 95)
                doc.roundedRect(width - 50, 11, 36, 5, 1, 1, 'F')
                doc.setTextColor(255, 255, 255)
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(7)
                doc.text('ATURAN POIN', width - 32, 14.5, { align: 'center' })
                
                doc.setTextColor(85, 85, 85)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.text(`No. Dok: ${docNo}`, width - 14, 20, { align: 'right' })
                doc.setTextColor(170, 170, 170)
                doc.setFontSize(7.5)
                doc.text(`Dicetak: ${printDateStr}`, width - 14, 23.5, { align: 'right' })
                
                // Blue line
                doc.setDrawColor(30, 58, 95)
                doc.setLineWidth(0.6)
                doc.line(14, 27, width - 14, 27)
                
                // Title
                doc.setTextColor(26, 26, 26) // #1a1a1a
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(13)
                doc.text(tp('rulesExportTitle') || 'Konfigurasi Aturan Poin', 14, 34)
                
                doc.setTextColor(85, 85, 85)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(8)
                doc.text('Laporan Konfigurasi Aturan Poin Terdaftar', 14, 38)
                
                // Total Badge
                doc.setTextColor(30, 58, 95)
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(18)
                doc.text(String(data.length), width - 14, 35, { align: 'right' })
                doc.setTextColor(170, 170, 170)
                doc.setFontSize(7.5)
                doc.text('TOTAL ATURAN', width - 14, 38.5, { align: 'right' })

                // Stats Cards Y = 42
                const totalViolations = data.filter(v => v.is_negative).length
                const totalAchievements = data.filter(v => !v.is_negative).length
                const avgWeight = data.length ? Math.round(data.reduce((acc, v) => acc + Math.abs(v.points), 0) / data.length) : 0
                
                const cardGap = 4
                const cardW = (width - 28 - 3 * cardGap) / 4
                const cardH = 15
                const cardY = 42
                
                const drawCard = (x, title, val, sub, colorRGB) => {
                    doc.setDrawColor(212, 212, 212)
                    doc.setFillColor(255, 255, 255)
                    doc.setLineWidth(0.25)
                    doc.roundedRect(x, cardY, cardW, cardH, 1.5, 1.5, 'FD')
                    
                    // Left color accent bar
                    doc.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2])
                    doc.rect(x, cardY, 1.5, cardH, 'F')
                    
                    // Texts
                    doc.setTextColor(136, 136, 136)
                    doc.setFont('Helvetica', 'bold')
                    doc.setFontSize(7)
                    doc.text(title.toUpperCase(), x + 4, cardY + 4)
                    
                    doc.setTextColor(26, 26, 26)
                    doc.setFont('Helvetica', 'bold')
                    doc.setFontSize(13)
                    doc.text(String(val), x + 4, cardY + 10.5)
                    
                    if (sub) {
                        doc.setTextColor(187, 187, 187)
                        doc.setFont('Helvetica', 'normal')
                        doc.setFontSize(6.5)
                        doc.text(sub, x + 4, cardY + 13.5)
                    }
                }
                
                drawCard(14, 'Total Aturan', data.length, 'aktif terdaftar', [30, 58, 95])
                drawCard(14 + cardW + cardGap, 'Poin Pelanggaran', totalViolations, 'tipe negatif (-)', [220, 38, 38])
                drawCard(14 + (cardW + cardGap) * 2, 'Poin Prestasi', totalAchievements, 'tipe positif (+)', [16, 185, 129])
                drawCard(14 + (cardW + cardGap) * 3, 'Rata-rata Poin', avgWeight, 'nilai bobot poin', [245, 158, 11])
                
                // Info Strip Y = 60
                const stripY = 60
                doc.setFillColor(240, 244, 248) // #f0f4f8
                doc.setDrawColor(205, 214, 224) // #cdd6e0
                doc.setLineWidth(0.2)
                doc.roundedRect(14, stripY, width - 28, 6, 1, 1, 'FD')
                
                const itemGap = (width - 28) / 4
                const scopeLabel = exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'
                const operatorName = profile?.name || 'Sistem Otomatis'
                
                doc.setTextColor(136, 136, 136)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(7.5)
                
                // Item 1
                doc.text('Jangkauan: ', 18, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text(scopeLabel, 33, stripY + 4.2)
                
                // Item 2
                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(136, 136, 136)
                doc.text('Operator: ', 18 + itemGap, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text(operatorName, 18 + itemGap + 12, stripY + 4.2)
                
                // Item 3
                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(136, 136, 136)
                doc.text('Status: ', 18 + itemGap * 2, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text('Aktif', 18 + itemGap * 2 + 10, stripY + 4.2)
                
                // Item 4
                doc.setFont('Helvetica', 'normal')
                doc.setTextColor(136, 136, 136)
                doc.text('Aplikasi: ', 18 + itemGap * 3, stripY + 4.2)
                doc.setFont('Helvetica', 'bold')
                doc.setTextColor(26, 26, 26)
                doc.text('LaporanMu', 18 + itemGap * 3 + 11, stripY + 4.2)

                const headers = Object.keys(mapped[0] || {})
                const rows = mapped.map(r => headers.map(h => String(r[h] ?? '')))

                autoTable(doc, {
                    head: [headers],
                    body: rows,
                    startY: 69,
                    theme: 'grid',
                    styles: { fontSize: 7.5, cellPadding: 2 },
                    headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] }
                })

                // Signature block
                let finalY = doc.lastAutoTable.finalY + 8
                if (finalY + 30 > height) {
                    doc.addPage()
                    finalY = 20
                }
                doc.setTextColor(136, 136, 136)
                doc.setFont('Helvetica', 'normal')
                doc.setFontSize(7.5)
                doc.text('Mengetahui,', width - 50, finalY)
                doc.setTextColor(30, 58, 95)
                doc.setFont('Helvetica', 'bold')
                doc.setFontSize(8.5)
                doc.text('Kepala Sekolah', width - 50, finalY + 4)
                
                doc.setDrawColor(200, 200, 200)
                doc.setLineWidth(0.2)
                doc.line(width - 50, finalY + 22, width - 14, finalY + 22)

                const pageCount = doc.internal.getNumberOfPages()
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i)
                    doc.setFontSize(7)
                    doc.setTextColor(150)
                    doc.setFont('Helvetica', 'normal')
                    doc.text('laporanmu.my.id • LaporanMu', 14, height - 8)
                    doc.text(`Halaman ${tNum(i)} dari ${tNum(pageCount)}`, width - 14, height - 8, { align: 'right' })
                }

                doc.save(`${finalFileName}.pdf`)
            } else if (format === 'word') {
                const headers = Object.keys(mapped[0] || {})
                const htmlRows = mapped.map(r => `
                    <tr>
                        ${headers.map(h => `<td style="border: 1px solid #cbd5e1; padding: 8px;">${r[h]}</td>`).join('')}
                    </tr>
                `).join('')

                const htmlContent = `
                    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
                    <head>
                        <title>${tp('rulesExportTitle') || 'Konfigurasi Aturan Poin'}</title>
                        <style>
                            body { font-family: Arial, sans-serif; }
                            table { width: 100%; border-collapse: collapse; }
                            th { border: 1px solid #cbd5e1; background-color: #f8fafc; padding: 8px; text-align: left; font-weight: bold; }
                            td { border: 1px solid #cbd5e1; padding: 8px; }
                        </style>
                    </head>
                    <body>
                        <h2>${tp('rulesExportTitle') || 'Konfigurasi Aturan Poin'}</h2>
                        <table>
                            <thead>
                                <tr>
                                    ${headers.map(h => `<th>${h}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${htmlRows}
                            </tbody>
                        </table>
                    </body>
                    </html>
                `
                const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword' })
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.setAttribute('download', `${finalFileName}.doc`)
                link.click()
            } else if (format === 'print') {
                const totalViolations = data.filter(v => v.is_negative).length
                const totalAchievements = data.filter(v => !v.is_negative).length
                const avgWeight = data.length ? Math.round(data.reduce((acc, v) => acc + Math.abs(v.points), 0) / data.length) : 0

                const headers = Object.keys(mapped[0] || {})
                const tableHeaders = ['#', ...headers]

                const htmlRows = mapped.map((r, i) => {
                    const cells = headers.map(h => {
                        const val = r[h] ?? '-'
                        if (h === tp('rulesColTypePreset')) {
                            const isViolation = val === tp('rulesFieldTypeViolation')
                            const badgeClass = isViolation ? 'tag-visitor guru' : 'tag-visitor santri'
                            return `<td><span class="${badgeClass}">${val}</span></td>`
                        }
                        if (h === tp('rulesFieldStatus')) {
                            const isActive = val === tp('rulesFieldStatusActive')
                            const badgeClass = isActive ? 'tag-status success' : 'tag-status warning'
                            return `<td><span class="${badgeClass}">${val}</span></td>`
                        }
                        if (h === tp('rulesColWeightPreset')) {
                            const points = Number(val)
                            const color = points > 0 ? '#16a34a' : '#dc2626'
                            return `<td style="color:${color};font-weight:700">${points > 0 ? '+' : ''}${tNum(points)}</td>`
                        }
                        return `<td>${val}</td>`
                    }).join('')
                    return `<tr><td>${tNum(i + 1)}</td>${cells}</tr>`
                }).join('')

                const scopeLabel = exportScope === 'filtered' ? 'Filter Aktif' : exportScope === 'selected' ? 'Dipilih' : 'Semua'
                const operatorValue = profile?.name || 'Sistem Otomatis'

                const htmlContent = buildPrintHTML({
                    language,
                    docBadge: 'ATURAN POIN',
                    title: tp('rulesExportTitle') || 'Konfigurasi Aturan Poin',
                    subtitle: 'Laporan Konfigurasi Aturan Poin Terdaftar',
                    totalCount: data.length,
                    totalLabel: 'Total Aturan',
                    stats: [
                        { label: 'Total Aturan', value: tNum(data.length), type: 'total', description: 'aktif terdaftar' },
                        { label: 'Poin Pelanggaran', value: tNum(totalViolations), type: 'pelanggaran', description: 'tipe negatif (-)' },
                        { label: 'Poin Prestasi', value: tNum(totalAchievements), type: 'prestasi', description: 'tipe positif (+)' },
                        { label: 'Rata-rata Poin', value: tNum(avgWeight), type: 'avg', description: 'nilai bobot poin' },
                    ],
                    infoStrip: [
                        { label: 'Jangkauan', value: scopeLabel },
                        { label: 'Operator', value: operatorValue },
                        { label: 'Status', value: 'Aktif' },
                        { label: 'Aplikasi', value: 'LaporanMu' }
                    ],
                    tableHeaders,
                    tableRowsHTML: htmlRows,
                    showSignature: true,
                    signatureTitle: 'Kepala Sekolah',
                    signatureName: '',
                    paperSize: options.orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape'
                })

                openPrintWindow(htmlContent)
            }

            await logAudit({
                action: 'EXPORT',
                source: 'OPERATIONAL',
                tableName: 'point_rules',
                newData: {
                    format,
                    scope: exportScope,
                    count: data.length,
                    columns: exportColumns
                }
            })

            addToast(tp('rulesExportSuccess'), 'success')
            setIsExportModalOpen(false)
        } catch (err) {
            console.error(err)
            addToast(tp('rulesExportFailed'), 'error')
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Read-only Banner */}
            {!canEdit && (
                <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                    <EyeOff className="text-rose-500 shrink-0 w-4 h-4" />
                    <p className="text-[11px] font-bold text-rose-600">{tp('rulesReadOnlyBanner')}</p>
                </div>
            )}

            {/* Sub-Header Actions */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--color-surface-alt)]/10">
                <div>
                    <h3 className="text-sm font-black text-[var(--color-text)]">{tp('rulesTitleConfig')}</h3>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                        {tp('rulesSubtitleConfig')}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 items-center justify-end w-full sm:w-auto">
                    {/* Reset Button */}
                    {canEdit && (
                        <button
                            onClick={() => { setResetPointsClassId(''); setIsResetModalOpen(true) }}
                            className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-orange-500 hover:border-orange-500/30 flex items-center gap-2 transition-all text-xs font-bold"
                            title={tp('rulesResetPointsTitle')}
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>{tp('rulesResetPoints')}</span>
                        </button>
                    )}

                    {/* Export Button */}
                    <button
                        onClick={() => setIsExportModalOpen(true)}
                        className="h-9 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 flex items-center gap-2 transition-all text-xs font-bold"
                        title={tp('rulesExportTitle')}
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>{tp('rulesExport')}</span>
                    </button>

                    {/* Privacy Toggle */}
                    <button
                        onClick={() => {
                            const next = !isPrivacyMode
                            setIsPrivacyMode(next)
                            addToast(next ? tp('toastPrivacyOn') : tp('toastPrivacyOff'), next ? 'info' : 'success')
                        }}
                        className={`h-9 px-3 rounded-lg border flex items-center gap-2 transition-all text-xs font-bold ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        title={isPrivacyMode ? tp('disablePrivacy') : tp('enablePrivacy')}
                    >
                        {isPrivacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span className="hidden md:inline">{tp('privacy')}</span>
                    </button>

                    {/* Add Button */}
                    {canEdit && (
                        <button
                            onClick={handleAdd}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{tp('rulesAdd')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Overview */}
            {showStats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard icon={Shield} label={tp('rulesTotal')} value={stats.total} color="primary" loading={loading} />
                    <StatCard icon={Gavel} label={tp('rulesViolations')} value={stats.poin} color="rose" loading={loading} />
                    <StatCard icon={Trophy} label={tp('rulesAchievements')} value={stats.achievements} color="emerald" loading={loading} />
                    <StatCard icon={Info} label={tp('rulesAvg')} value={stats.avgPoints} color="amber" loading={loading} />
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
                            placeholder={tp('rulesSearchPlaceholder')}
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
                            <span className="hidden xs:inline">{tp('filterShort')}</span>
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
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title={tp('rulesClearSearch')}>
                                    <Search className="w-3 h-3 opacity-60" />
                                    <span className="max-w-[220px] truncate">"{searchQuery}"</span>
                                    <span className="w-4 h-4 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterCategory && (
                                <button type="button" onClick={() => setFilterCategory('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]" title={tp('rulesClearCategory')}>
                                    <span className="opacity-70">{tp('category')}:</span> {tp(`cat.${filterCategory}`) || filterCategory}
                                    <span className="w-4 h-4 rounded bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] opacity-70 group-hover:opacity-100 transition-opacity">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterType && (
                                <button type="button" onClick={() => setFilterType('')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]" title={tp('rulesClearType')}>
                                    {filterType === 'violation' ? tp('violation') : tp('achievement')}
                                    <span className="w-4 h-4 rounded bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterStatus !== 'active' && (
                                <button type="button" onClick={() => setFilterStatus('active')}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[10px] font-black text-amber-600" title={tp('rulesClearStatus')}>
                                    {tp('status')}: {filterStatus === 'inactive' ? tp('rulesStatusInactive') : filterStatus}
                                    <span className="w-4 h-4 rounded bg-white/70 dark:bg-[var(--color-surface)] border border-amber-500/20 flex items-center justify-center text-amber-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            {filterExtreme && (
                                <button type="button" onClick={() => setFilterExtreme(false)}
                                    className="group inline-flex items-center gap-2 px-3 py-1 rounded-xl border border-red-500/20 bg-red-500/10 text-[10px] font-black text-red-600" title={tp('rulesClearExtreme')}>
                                    {tp('rulesExtremePoints')}
                                    <span className="w-4 h-4 rounded bg-white/70 dark:bg-[var(--color-surface)] border border-red-500/20 flex items-center justify-center text-red-600 opacity-70 group-hover:opacity-100 transition-opacity">
                                        <X className="w-2.5 h-2.5" />
                                    </span>
                                </button>
                            )}
                            <button type="button" onClick={resetAllFilters}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600" title={tp('resetAllFilters')}>
                                <RotateCcw className="w-3 h-3" />
                                <span>{tp('resetAll')}</span>
                            </button>
                        </div>
                    </div>
                )}

                {isFilterOpen && (
                    <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">{tp('category')}</label>
                                <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="">{tp('rulesAllCategories')}</option>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{tp(`cat.${c}`) || c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">{tp('rulesType')}</label>
                                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="">{tp('rulesAllTypes')}</option>
                                    <option value="violation">{tp('rulesViolationsOnly')}</option>
                                    <option value="achievement">{tp('rulesAchievementsOnly')}</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)] ml-1">{tp('rulesOrder')}</label>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full h-9 px-3 text-xs font-bold bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl appearance-none outline-none focus:border-[var(--color-primary)]">
                                    <option value="name">{tp('rulesOrderName')}</option>
                                    <option value="points">{tp('rulesOrderPoints')}</option>
                                    <option value="newest">{tp('newest')}</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={resetAllFilters} className="w-full h-9 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>{tp('resetShort')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.length > 0 && (
                <div className="px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap animate-in slide-in-from-top-2">
                    <p className="text-sm font-black text-[var(--color-primary)] tracking-tight">{tp('rulesSelectedCount', { count: selectedIds.length })}</p>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsBulkDeleteOpen(true)} className="h-8 px-4 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{tp('delete')}</span>
                        </button>
                        <button onClick={() => setSelectedIds([])} className="h-8 px-4 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--color-text)] transition-all flex items-center gap-2">
                            <X className="w-3.5 h-3.5" />
                            <span>{tp('cancel')}</span>
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
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{tp('rulesColIdentity')}</th>
                                        {visibleCols.description && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">{tp('rulesColDescription')}</th>}
                                        {visibleCols.type && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">{tp('rulesColType')}</th>}
                                        {visibleCols.category && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">{tp('rulesColCategory')}</th>}
                                        {visibleCols.points && <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">{tp('rulesColWeight')}</th>}
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] text-center w-32">
                                            <div className="flex items-center justify-center gap-2">
                                                <span>{tp('rulesColAction')}</span>
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
                                                    }} title={tp('manageColumns')}
                                                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isColMenuOpen ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'}`}>
                                                        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><rect x="0" y="0" width="5" height="5" rx="1" /><rect x="7" y="0" width="5" height="5" rx="1" /><rect x="0" y="7" width="5" height="5" rx="1" /><rect x="7" y="7" width="5" height="5" rx="1" /></svg>
                                                    </button>
                                                    {isColMenuOpen && createPortal(
                                                        <div className={`fixed z-[9999] w-48 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 space-y-0.5 animate-in fade-in zoom-in-95`}
                                                            style={{ top: menuPos.top, right: menuPos.right }}>
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">{tp('manageColumns')}</p>
                                                            {[{ key: 'description', label: tp('rulesColDescription') }, { key: 'type', label: tp('rulesColTypePreset') }, { key: 'category', label: tp('rulesColCategory') }, { key: 'points', label: tp('rulesColWeightPreset') }].map(({ key, label }) => (
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
                                                    <h3 className="text-sm font-black text-[var(--color-text)] mb-1">{tp('rulesNoResults')}</h3>
                                                    <p className="text-[11px] font-bold text-[var(--color-text-muted)] leading-relaxed mb-4">
                                                        {tp('rulesNoResultsDesc')}
                                                    </p>
                                                    <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition">
                                                        {tp('resetAllFilters')}
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
                                                        {rule.is_negative ? tp('violation') : tp('achievement')}
                                                    </span>
                                                </td>
                                            )}
                                            {visibleCols.category && (
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{tp(`cat.${rule.category}`) || rule.category}</span>
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
                                                            title={tp('edit')}
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => { setItemToDelete(rule); setIsDeleteModalOpen(true) }}
                                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-all text-sm"
                                                            title={tp('delete')}
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
                                    <h3 className="text-xs font-black text-[var(--color-text)] mb-1">{tp('rulesNoResults')}</h3>
                                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] max-w-[280px] leading-relaxed mb-4 mx-auto">
                                        {tp('rulesNoResultsDescMobile')}
                                    </p>
                                    <button onClick={resetAllFilters} className="h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition">
                                        {tp('resetAll')}
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
                                                <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mt-0.5">{tp(`cat.${v.category}`) || v.category}</p>
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
                                            <button onClick={() => handleEdit(v)} className="flex-1 h-8.5 rounded-xl bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">{tp('edit')}</button>
                                            <button onClick={() => { setItemToDelete(v); setIsDeleteModalOpen(true) }} className="flex-1 h-8.5 rounded-xl bg-red-500/10 text-red-600 text-[10px] font-black uppercase tracking-widest">{tp('delete')}</button>
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
                            label={tp('rulesPaginationLabel')}
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />
                    </>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={selectedItem ? tp('rulesEditTitle') : tp('rulesAddTitle')}
                description={selectedItem ? tp('rulesEditDesc') : tp('rulesAddDesc')}
                size="md"
                icon={selectedItem ? Edit2 : Plus}
                iconBg="bg-[var(--color-primary)]/10"
                iconColor="text-[var(--color-primary)]"
                footer={
                    <div className="flex items-center w-full gap-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                        >
                            {tp('cancel')}
                        </button>
                        <div className="flex-1" />
                        <button
                            type="submit"
                            form="point-rule-form"
                            disabled={submitting}
                            className="h-10 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 transition-all flex items-center justify-center gap-2 shrink-0"
                        >
                            {submitting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                            {selectedItem ? tp('rulesBtnUpdate') : tp('rulesBtnSave')}
                        </button>
                    </div>
                }
            >
                <form id="point-rule-form" onSubmit={(e) => {
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
                }} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldName')}</label>
                            <input name="name" defaultValue={selectedItem?.name} required placeholder={tp('rulesFieldNamePlaceholder')} className="w-full px-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('category')}</label>
                            <input type="hidden" name="category" value={formCategory} />
                            <RichSelect
                                value={formCategory}
                                onChange={(val) => setFormCategory(val)}
                                options={CATEGORIES.map(c => ({ id: c, name: tp(`cat.${c}`) || c }))}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldType')}</label>
                            <div className="flex p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-xl h-11">
                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="violation" defaultChecked={selectedItem ? selectedItem.is_negative : true} className="hidden peer" />
                                    <div className="w-full h-full flex items-center justify-center rounded-lg peer-checked:bg-red-500 peer-checked:text-white text-[var(--color-text-muted)] font-bold text-[9.5px] transition-all">{tp('rulesFieldTypeViolation')}</div>
                                </label>
                                <label className="flex-1 flex items-center justify-center gap-2 cursor-pointer">
                                    <input type="radio" name="type" value="achievement" defaultChecked={selectedItem ? !selectedItem.is_negative : false} className="hidden peer" />
                                    <div className="w-full h-full flex items-center justify-center rounded-lg peer-checked:bg-emerald-500 peer-checked:text-white text-[var(--color-text-muted)] font-bold text-[9.5px] transition-all">{tp('rulesFieldTypeAchievement')}</div>
                                </label>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldPoints')}</label>
                            <input type="number" name="points" defaultValue={selectedItem ? Math.abs(selectedItem.points) : ''} required min="1" placeholder={tp('rulesFieldPointsPlaceholder')} className="w-full px-4 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40" />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldStatus')}</label>
                            <input type="hidden" name="status" value={formStatus} />
                            <RichSelect
                                value={formStatus}
                                onChange={(val) => setFormStatus(val)}
                                options={[
                                    { id: 'active', name: tp('rulesFieldStatusActive') },
                                    { id: 'inactive', name: tp('rulesFieldStatusInactive') }
                                ]}
                            />
                        </div>
                        <div className="space-y-3 md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] ml-1">{tp('rulesFieldDescription')}</label>
                            <textarea name="description" defaultValue={selectedItem?.description} rows={3} placeholder={tp('rulesFieldDescriptionPlaceholder')} className="w-full p-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl text-sm focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-all text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:opacity-40 resize-none" />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal Delete Confirmation */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title={tp('rulesDeleteTitle')} size="sm">
                <div className="space-y-6">
                    <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center gap-4 text-red-500">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0 text-xl border border-red-500/30 animate-pulse"><Trash2 className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-wider">{tp('rulesDeletePermanent')}</h3>
                            <p className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-widest leading-tight">{tp('rulesDeleteRisk')}</p>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text)] leading-relaxed font-bold">
                        {(() => {
                            const deleteTemplate = tp('rulesDeleteWarningTemplate')
                            const parts = deleteTemplate.includes('{name}') ? deleteTemplate.split('{name}') : [deleteTemplate, '']
                            return (
                                <>
                                    {parts[0]}
                                    <span className="text-red-500 font-black px-1.5 py-0.5 bg-red-500/10 rounded-md border border-red-500/20">{itemToDelete?.name}</span>
                                    {parts[1]}
                                </>
                            )
                        })()}
                    </p>
                    <div className="flex gap-3 pt-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">{tp('cancel').toUpperCase()}</button>
                        <button onClick={handleDeleteConfirm} disabled={submitting} className="h-11 flex-[1.5] rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center justify-center">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tp('rulesBtnDeleteNow')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Bulk Delete */}
            <Modal isOpen={isBulkDeleteOpen} onClose={() => setIsBulkDeleteOpen(false)} title={tp('rulesBulkDeleteConfirmTitle', { count: selectedIds.length })} size="sm">
                <div className="space-y-6 text-center">
                    <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-500/20 shadow-xl"><Trash2 className="text-3xl w-10 h-10" /></div>
                    <h3 className="text-lg font-black text-[var(--color-text)] uppercase tracking-tight">{tp('rulesBulkDeleteConfirmTitle', { count: selectedIds.length })}</h3>
                    <p className="text-[11px] text-[var(--color-text-muted)] font-black uppercase tracking-widest leading-relaxed">{tp('rulesBulkDeleteWarning')}</p>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsBulkDeleteOpen(false)} className="h-11 flex-1 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text)] font-black text-[10px] uppercase tracking-widest">{tp('cancel')}</button>
                        <button onClick={handleBulkDelete} disabled={submitting} className="h-11 flex-1 rounded-xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-500/20 transition-all flex items-center justify-center">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : tp('rulesBtnBulkDeleteConfirm')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Export Modal */}
            <RulesExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                rulesCount={totalRows}
                selectedCount={selectedIds.length}
                exportScope={exportScope}
                setExportScope={setExportScope}
                exportColumns={exportColumns}
                setExportColumns={setExportColumns}
                exporting={exporting}
                handleExport={handleExport}
            />

            {/* Reset Poin Siswa Modal */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title={tp('resetPointsTitle')}
                description={tp('resetPointsDesc')}
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
                            {tp('cancel')}
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
                                    <span>{tp('resetPointsBtnConfirm')}</span>
                                </>
                            )}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] block mb-1 ml-1 flex items-center gap-2">
                            <GraduationCap className="opacity-40 w-4 h-4" /> <span>{tp('resetPointsSelectClass')}</span>
                        </label>
                        <div className="space-y-3">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors">
                                    <Search className="w-3.5 h-3.5" />
                                </div>
                                <input
                                    type="text"
                                    placeholder={tp('resetPointsSearchClassPlaceholder')}
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
                                            <p className="font-black text-[10px] uppercase tracking-wider leading-tight">{tp('resetPointsAllClasses')}</p>
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
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-40">{tp('resetPointsClassNotFound')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-red-500/5 rounded-2xl border border-red-500/10 text-[10px] text-red-600 dark:text-red-400 font-bold leading-relaxed">
                        <AlertCircle className="inline w-3.5 h-3.5 mr-1" />
                        <span>{tp('resetPointsWarning')}</span>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
