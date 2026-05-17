import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faEdit, faTrash, faSearch, faTimes, faSpinner,
    faBoxArchive, faRotateLeft, faVenus, faMars, faCheckCircle,
    faDownload, faXmark, faUserTie, faTriangleExclamation,
    faChalkboardTeacher, faEye, faEyeSlash, faThumbtack,
    faUpload, faTableList, faKeyboard, faPhone, faSliders,
    faEnvelope, faCalendar, faMapMarkerAlt, faNoteSticky,
    faCircleCheck, faUsers, faFileLines, faAnglesLeft, faAnglesRight,
    faChevronLeft, faChevronRight,
    faBullhorn, faIdCard, faBriefcase,
    faFileImport, faFileExport, faShieldHalved, faFingerprint
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Modal from '../../components/ui/Modal'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import { useFlag } from '../../context/FeatureFlagsContext'
import { supabase } from '../../lib/supabase'
import { logAudit } from '../../lib/auditLogger'
import RichSelect from '../../components/ui/RichSelect'
import { TeacherRow, TeacherMobileCard, STATUS_CONFIG } from '../../components/teachers/TeacherRow'
import TeacherFormModal from '../../components/teachers/TeacherFormModal'
import TeacherProfileModal from '../../components/teachers/TeacherProfileModal'
import TeacherImportModal from '../../components/teachers/TeacherImportModal'
import TeacherExportModal from '../../components/teachers/TeacherExportModal'
import TeacherArchiveModal from '../../components/teachers/TeacherArchiveModal'
import { ActionBadge, DiffViewer, AuditTimeline } from '../../pages/admin/LogsPage'
import Pagination from '../../components/ui/Pagination'
import Papa from 'papaparse'
import StatsCarousel from '../../components/StatsCarousel'
import { StatCard } from '../../components/ui/DataDisplay'

import * as XLSX from 'xlsx'
import { useDebounce } from '../../hooks/useDebounce'

import { useTeachersCore } from '../../hooks/teachers/useTeachersCore'
import { useTeachersImportExport } from '../../hooks/teachers/useTeachersImportExport'

// STATUS_CONFIG imported from TeacherRow component
const LS_FILTERS = 'teachers_filters'
const LS_COLS = 'teachers_columns'
const LS_PAGE_SIZE = 'teachers_page_size'

const maskInfo = (str, vis = 4) => {
    if (!str) return '—'
    if (str.length <= vis) return str[0] + '*'.repeat(str.length - 1)
    return str.substring(0, vis) + '***'
}

function getPortalContainer(id) {
    let el = document.getElementById(id);
    if (!el) {
        el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
    }
    return el;
}

export default function TeachersPage() {
    const { addToast } = useToast()
    const { profile } = useAuth()

    const core = useTeachersCore({ addToast, profile })
    const {
        teachers, setTeachers, loading, setLoading, submitting, setSubmitting, totalRows, setTotalRows,
        subjectsList, setSubjectsList, classesList, setClassesList, stats, setStats, uploadingPhoto, setUploadingPhoto,
        searchQuery, setSearchQuery, debouncedSearch, filterSubject, setFilterSubject, filterGender, setFilterGender,
        filterStatus, setFilterStatus, filterType, setFilterType, filterMissing, setFilterMissing, sortBy, setSortBy,
        page, setPage, jumpPage, setJumpPage, showAdvFilter, setShowAdvFilter, pageSize, setPageSize,
        visibleCols, setVisibleCols, isColMenuOpen, setIsColMenuOpen, menuPos, setMenuPos, colMenuRef,
        isPrivacyMode, setIsPrivacyMode, isShortcutOpen, setIsShortcutOpen, isHeaderMenuOpen, setIsHeaderMenuOpen,
        isModalOpen, setIsModalOpen, isArchiveModalOpen, setIsArchiveModalOpen, isArchivedOpen, setIsArchivedOpen,
        isProfileOpen, setIsProfileOpen, isImportModalOpen, setIsImportModalOpen, isExportModalOpen, setIsExportModalOpen,
        isBulkModalOpen, setIsBulkModalOpen, isBulkWAOpen, setIsBulkWAOpen, selectedItem, setSelectedItem,
        teacherToAction, setTeacherToAction, profileTeacher, setProfileTeacher, profileStats, setProfileStats,
        profileReports, setProfileReports, loadingProfile, setLoadingProfile, profileTab, setProfileTab,
        archivedTeachers, setArchivedTeachers, loadingArchived, setLoadingArchived, selectedIds, setSelectedIds,
        bulkWAIndex, setBulkWAIndex, bulkWAResults, setBulkWAResults, waTemplate, setWaTemplate,
        quickStatusId, setQuickStatusId, quickStatusRef, headerMenuBtnRef, shortcutBtnRef, headerMenuRect,
        setHeaderMenuRect, shortcutRect, setShortcutRect, headerMenuMounted, setHeaderMenuMounted,
        statsScrollRef, activeStatIdx, setActiveStatIdx,
        activeFilterCount, hasActiveFilters, resetAllFilters, fetchData, fetchStats,
        handleAdd, handleEdit, handleSubmit, handleArchive, handleRestore, fetchArchived,
        handleTogglePin, handlePhotoUpload, handleQuickStatus, openProfile,
        allPageIds, allSelected, someSelected, toggleSelectAll, toggleSelect, handleBulkArchive,
        bulkWATeachers, startBulkWA, sendNextWA
    } = core

    const importExport = useTeachersImportExport({
        teachers,
        selectedIds,
        filterStatus,
        filterGender,
        filterSubject,
        filterType,
        fetchData,
        fetchStats,
        addToast,
        setIsImportModalOpen,
        setIsExportModalOpen
    })

    const {
        importStep, setImportStep, importFileName, setImportFileName, importRawData, setImportRawData,
        importFileHeaders, setImportFileHeaders, importColumnMapping, setImportColumnMapping,
        importPreview, setImportPreview, importIssues, setImportIssues, importLoading, setImportLoading,
        importValidationOpen, setImportValidationOpen, importDrag, setImportDrag, importing, setImporting,
        importProgress, setImportProgress, importEditCell, setImportEditCell, importSkipDupes, setImportSkipDupes,
        exportScope, setExportScope, exportColumns, setExportColumns, exporting, setExporting,
        importReadyRows, hasImportBlockingErrors, SYSTEM_COLS, ALL_EXPORT_COLUMNS,
        processImportFile, buildImportPreview, handleImportCellEdit, handleRemoveImportRow,
        handleBulkFix, handleDownloadTemplate, handleCommitImport, getExportData,
        handleExportCSV, handleExportExcel, handleExportPDF
    } = importExport

    const STAT_CARD_COUNT = 4

    const searchInputRef = useRef(null)
    const importFileRef = useRef(null)
    const headerMenuRef = useRef(null)
    const shortcutRef = useRef(null)

    // access.teacher_teachers — kalau off, guru hanya bisa lihat (read-only)
    const { enabled: teacherTeachersEnabled } = useFlag('access.teacher_teachers')
    const canEdit = teacherTeachersEnabled

    // Insights Row
    const insights = useMemo(() => {
        const res = []
        const noWARecords = teachers.filter(t => !t.phone).length
        if (noWARecords > 0) res.push({
            id: 'wa',
            label: `${noWARecords} Guru Tanpa WA`,
            desc: 'Kontak WhatsApp belum tersedia',
            icon: faWhatsapp,
            color: 'text-amber-600',
            bg: 'bg-amber-600/10',
            active: filterMissing === 'wa',
            onClick: () => { setFilterMissing(filterMissing === 'wa' ? '' : 'wa'); setPage(1); setShowAdvFilter(true) }
        })

        const inactiveCount = teachers.filter(t => t.status === 'inactive').length
        if (inactiveCount > 0) res.push({
            id: 'archived',
            label: `${inactiveCount} Guru Nonaktif`,
            desc: 'Status saat ini sedang dideaktifkan',
            icon: faBoxArchive,
            color: 'text-gray-500',
            bg: 'bg-gray-500/10',
            active: filterStatus === 'inactive',
            onClick: () => { setFilterStatus(filterStatus === 'inactive' ? 'active' : 'inactive'); setPage(1); setShowAdvFilter(true) }
        })

        return res
    }, [teachers, filterMissing, filterStatus, setFilterMissing, setPage, setShowAdvFilter, setFilterStatus])

    const disp = val => isPrivacyMode ? maskInfo(val) : (val || '—')


    // ══════════════════════════════════════════════════════════════════════════
    return (
        <DashboardLayout title="Data Guru">
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">
                {/* Privasi Banner */}
                {isPrivacyMode && (
                    <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><FontAwesomeIcon icon={faEyeSlash} /> Mode Privasi Aktif — Data sensitif disensor</div>
                        <button onClick={() => setIsPrivacyMode(false)} className="text-amber-600 text-[10px] font-black hover:underline uppercase tracking-widest">Matikan</button>
                    </div>
                )}

                {/* Read-only Banner */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faEyeSlash} className="text-rose-500 shrink-0 text-xs" />
                        <p className="text-[11px] font-bold text-rose-600">Mode Read-only — Edit data guru dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* Bulk Action Bar */}
                {selectedIds.length > 0 && (
                    <div className="mb-4 px-4 py-3 rounded-2xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-between gap-3 flex-wrap">
                        <p className="text-sm font-black text-[var(--color-primary)]">{selectedIds.length} guru dipilih</p>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={startBulkWA} className="h-8 px-3 rounded-xl bg-green-500/10 text-green-600 text-[10px] font-black uppercase tracking-wide hover:bg-green-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faWhatsapp} />WA Massal</button>
                            <button onClick={() => setIsBulkModalOpen(true)} className="h-8 px-3 rounded-xl bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase tracking-wide hover:bg-amber-500 hover:text-white transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faBoxArchive} />Arsip</button>
                            <button onClick={() => setSelectedIds([])} className="h-8 px-3 rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black uppercase tracking-wide transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faXmark} />Batal</button>
                        </div>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Master Data" items={['Faculty Members']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Data Guru</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola {stats.total} data {filterType === 'karyawan' ? 'karyawan' : filterType === 'guru' ? 'guru' : 'guru dan karyawan'} dalam sistem.</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        {/* Header Menu Button */}
                        <button
                            ref={headerMenuBtnRef}
                            onClick={() => { if (!isHeaderMenuOpen) setHeaderMenuRect(headerMenuBtnRef.current?.getBoundingClientRect()); setIsHeaderMenuOpen(v => !v) }}
                            className={`h-9 w-9 rounded-lg border flex items-center justify-center text-sm transition-all active:scale-95 ${isHeaderMenuOpen ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}
                            title="Aksi lainnya"
                        >
                            <FontAwesomeIcon icon={faSliders} />
                        </button>

                        {/* Portaled Header Menu Dropdown */}
                        {headerMenuMounted && headerMenuRect && createPortal(
                            <>
                                <div
                                    className={`fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px] transition-opacity duration-200 ${isHeaderMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                    onClick={() => setIsHeaderMenuOpen(false)}
                                />
                                <div
                                    className={`fixed z-[9991] w-56 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl p-2 transition-all duration-200 ease-out origin-top-right
                                        ${isHeaderMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}`}
                                    style={{
                                        top: headerMenuRect.bottom + 8,
                                        left: Math.max(10, headerMenuRect.right - 224)
                                    }}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-3 py-2">Data</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setImportStep(1); setImportPreview([]); setImportFileName(''); setIsImportModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileImport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Import CSV / Excel</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Unggah data guru masal dari file Excel/CSV</p>
                                        </div>
                                    </button>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); setIsExportModalOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faFileExport} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Export Data</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Cadangkan seluruh database ke format Excel</p>
                                        </div>
                                    </button>
                                    <div className="h-px bg-[var(--color-border)] my-1 mx-2" />
                                    <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Manajemen</p>
                                    <button onClick={() => { setIsHeaderMenuOpen(false); fetchArchived(); setIsArchivedOpen(true) }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] text-[var(--color-text)] transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[11px] font-black leading-tight">Arsip Guru</p>
                                            <p className="text-[9px] opacity-60 font-medium leading-tight mt-0.5">Lihat & pulihkan data guru tidak aktif</p>
                                        </div>
                                    </button>
                                </div>
                            </>,
                            getPortalContainer('portal-teacher-header-menu')
                        )}

                        {/* Keyboard Shortcuts Button - hidden on mobile */}
                        <button
                            ref={shortcutBtnRef}
                            onClick={() => { if (!isShortcutOpen) setShortcutRect(shortcutBtnRef.current?.getBoundingClientRect()); setIsShortcutOpen(v => !v) }}
                            className={`hidden sm:flex h-9 w-9 rounded-lg border items-center justify-center transition-all active:scale-95
                                ${isShortcutOpen
                                    ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            title="Keyboard Shortcuts (?)"
                        >
                            <FontAwesomeIcon icon={faKeyboard} className="text-sm" />
                        </button>

                        {/* Portaled Keyboard Shortcuts Dropdown */}
                        {isShortcutOpen && shortcutRect && createPortal(
                            <>
                                <div className="fixed inset-0 z-[9990] bg-black/5 backdrop-blur-[1px]" onClick={() => setIsShortcutOpen(false)} />
                                <div
                                    className="fixed z-[9991] w-72 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-200"
                                    style={{
                                        top: shortcutRect.bottom + 8,
                                        left: Math.max(10, shortcutRect.right - 288)
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
                                            { keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan' },
                                            { keys: ['Esc'], label: 'Tutup / clear / deselect' },
                                            { section: 'Aksi' },
                                            { keys: ['N'], label: 'Tambah guru baru' },
                                            { keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect' },
                                            { keys: ['Ctrl', 'E'], label: 'Buka export' },
                                            { section: 'Tampilan' },
                                            { keys: ['P'], label: 'Toggle privacy mode' },
                                            { keys: ['R'], label: 'Refresh data' },
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
                            getPortalContainer('portal-teacher-shortcut-menu')
                        )}

                        {/* Privasi toggle */}
                        <button
                            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                            className={`h-9 w-9 sm:w-auto sm:px-3 rounded-lg border flex items-center justify-center sm:justify-start gap-2 transition-all active:scale-95 ${isPrivacyMode ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'} `}
                            title={isPrivacyMode ? "Matikan Mode Privasi" : "Aktifkan Mode Privasi"}
                        >
                            <FontAwesomeIcon icon={isPrivacyMode ? faEyeSlash : faEye} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                Privasi
                            </span>
                        </button>

                        {/* Add button */}
                        <button onClick={handleAdd} disabled={!canEdit} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10">
                            <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                            <span>{canEdit ? 'Tambah Guru' : 'Read-only'}</span>
                        </button>
                    </div>
                </div>

                {/* ── Stats ── */}
                <StatsCarousel count={STAT_CARD_COUNT} cols={4}>
                    {[
                        { icon: faChalkboardTeacher, label: 'Total', value: stats.total, borderColor: 'border-t-[var(--color-primary)]', iconBg: 'bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 text-[var(--color-primary)]', onClick: () => { setFilterType(''); setPage(1) } },
                        { icon: faCheckCircle, label: 'Aktif', value: stats.active, borderColor: 'border-t-emerald-500', iconBg: 'bg-emerald-500/10 text-emerald-500', onClick: () => { setFilterStatus('active'); setPage(1) } },
                        { icon: faChalkboardTeacher, label: 'Guru', value: stats.guru, borderColor: 'border-t-indigo-500', iconBg: 'bg-indigo-500/10 text-indigo-500', onClick: () => { setFilterType('guru'); setPage(1) } },
                        { icon: faBriefcase, label: 'Karyawan', value: stats.karyawan, borderColor: 'border-t-blue-500', iconBg: 'bg-blue-500/10 text-blue-500', onClick: () => { setFilterType('karyawan'); setPage(1) } },
                    ].map((s, i) => (
                        <StatCard
                            key={i}
                            icon={s.icon}
                            label={s.label}
                            value={s.value}
                            borderColor={s.borderColor}
                            iconBg={s.iconBg}
                            onClick={s.onClick}
                        />
                    ))}
                </StatsCarousel>

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

                {/* ── Filter Bar ── */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex flex-row items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSearch} /></div>
                            <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, NBM, mapel, email... (Ctrl+K)"
                                className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faTimes} className="text-xs" /></button>}
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
                        <div className="border-t border-[var(--color-border)] p-3.5 bg-[var(--color-surface-alt)]/60 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                            {/* Header Panel with Standardized "Vertical Bar" Pattern */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-1 h-3.5 bg-indigo-500 rounded-full" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 flex items-center gap-2">
                                        <FontAwesomeIcon icon={faSliders} className="text-[9px] opacity-60" />
                                        Filter Lanjutan
                                    </span>
                                </div>
                                <button
                                    onClick={resetAllFilters}
                                    className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 border border-transparent hover:border-red-100"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[9px]" />
                                    Reset Semua Filter
                                </button>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
                                {/* Primary Grid: Selects */}
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Jenis</label>
                                        <RichSelect
                                            value={filterType}
                                            onChange={val => { setFilterType(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Jenis' },
                                                { id: 'guru', name: 'Guru' },
                                                { id: 'karyawan', name: 'Karyawan' }
                                            ]}
                                            placeholder="Semua Jenis"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Mata Pelajaran</label>
                                        <RichSelect
                                            value={filterSubject}
                                            onChange={val => { setFilterSubject(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Mapel' },
                                                ...subjectsList.map(s => ({ id: s, name: s }))
                                            ]}
                                            placeholder="Semua Mapel"
                                            small
                                            searchable
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Gender</label>
                                        <RichSelect
                                            value={filterGender}
                                            onChange={val => { setFilterGender(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua' },
                                                { id: 'L', name: 'Laki-laki' },
                                                { id: 'P', name: 'Perempuan' }
                                            ]}
                                            placeholder="Semua"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Status</label>
                                        <RichSelect
                                            value={filterStatus}
                                            onChange={val => { setFilterStatus(val); setPage(1) }}
                                            options={[
                                                { id: '', name: 'Semua Status' },
                                                { id: 'active', name: 'Aktif' },
                                                { id: 'inactive', name: 'Nonaktif' },
                                                { id: 'cuti', name: 'Cuti' }
                                            ]}
                                            placeholder="Semua Status"
                                            small
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Urutkan</label>
                                        <RichSelect
                                            value={sortBy}
                                            onChange={val => { setSortBy(val); setPage(1) }}
                                            options={[
                                                { id: 'name_asc', name: 'Nama A–Z' },
                                                { id: 'name_desc', name: 'Nama Z–A' },
                                                { id: 'subject_asc', name: 'Mapel A–Z' },
                                                { id: 'join_desc', name: 'Bergabung Terbaru' },
                                                { id: 'join_asc', name: 'Bergabung Terlama' }
                                            ]}
                                            placeholder="Urutkan"
                                            small
                                        />
                                    </div>
                                </div>

                                {/* Secondary Grid: Quick Filters */}
                                <div>
                                    <label className="block text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Menu Cepat & Aksi</label>
                                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                                        {[
                                            { label: 'Semua', icon: faUsers, active: !filterMissing && filterStatus === 'active', onClick: () => { setFilterMissing(''); setFilterStatus('active'); setSortBy('name_asc') } },
                                            { label: 'Tanpa WA', icon: faWhatsapp, active: filterMissing === 'wa', onClick: () => { setFilterMissing('wa'); setPage(1) } },
                                            { label: 'Nonaktif', icon: faUserTie, active: filterStatus === 'inactive', onClick: () => { setFilterStatus('inactive'); setPage(1) } },
                                            { label: 'Cuti', icon: faBoxArchive, active: filterStatus === 'cuti', onClick: () => { setFilterStatus('cuti'); setPage(1) } },
                                        ].map((s, i) => (
                                            <button key={i} onClick={s.onClick} className={`whitespace-nowrap h-9 px-3 rounded-xl border flex items-center gap-2 transition-all ${s.active ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md shadow-[var(--color-primary)]/20' : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                                <FontAwesomeIcon icon={s.icon} className="text-[10px]" /><span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Table ── */}
                {loading ? (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[var(--color-surface-alt)]">
                                <tr className="text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                    <th className="px-6 py-4 w-10"></th><th className="px-6 py-4">Guru</th><th className="px-6 py-4">Mapel</th><th className="px-6 py-4">Kontak</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>{Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} className="border-t border-[var(--color-border)]">
                                    <td className="px-6 py-4"><div className="w-4 h-4 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-[var(--color-border)] animate-pulse shrink-0" /><div className="space-y-2"><div className="h-3 w-32 rounded bg-[var(--color-border)] animate-pulse" /><div className="h-2 w-20 rounded bg-[var(--color-border)] animate-pulse opacity-60" /></div></div></td>
                                    <td className="px-6 py-4"><div className="h-5 w-24 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-3 w-28 rounded bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-5 w-16 rounded-lg bg-[var(--color-border)] animate-pulse" /></td>
                                    <td className="px-6 py-4"><div className="h-7 w-28 rounded-lg bg-[var(--color-border)] animate-pulse ml-auto" /></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    </div>
                ) : (
                    <div className="glass rounded-[1.5rem] border border-[var(--color-border)]">
                        {/* Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                                    <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                        <th className="px-6 py-4 text-center w-12">
                                            <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected }} onChange={toggleSelectAll} className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                                        </th>
                                        <th className="px-6 py-4 text-left">Guru</th>
                                        {visibleCols.nbm && <th className="px-6 py-4 text-left">NBM</th>}
                                        {visibleCols.subject && <th className="px-6 py-4 text-left">Mata Pelajaran</th>}
                                        {visibleCols.gender && <th className="px-6 py-4 text-center">Gender</th>}
                                        {visibleCols.contact && <th className="px-6 py-4 text-left">Kontak</th>}
                                        {visibleCols.status && <th className="px-6 py-4 text-left">Status</th>}
                                        {visibleCols.join && <th className="px-6 py-4 text-left">Bergabung</th>}
                                        <th className="px-6 py-4 text-center pr-6 w-32 relative">
                                            <div className="flex items-center justify-center">
                                                <span>Aksi</span>
                                            </div>
                                            {/* Toggle Button — absolute kanan */}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <button onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect()
                                                    const menuHeight = 280 // Max height estimate
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
                                                        {[{ key: 'nbm', label: 'NBM' }, { key: 'subject', label: 'Mata Pelajaran' }, { key: 'gender', label: 'Jenis Kelamin' }, { key: 'contact', label: 'Kontak / HP' }, { key: 'status', label: 'Status Aktif' }, { key: 'join', label: 'Tgl Bergabung' }].map(({ key, label }) => (
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
                                    {teachers.length === 0 ? (
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
                                                        Tidak ada guru atau karyawan yang cocok dengan kriteria pencarian. Coba ubah kata kunci atau reset filter.
                                                    </p>
                                                    <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">
                                                        Reset Semua Filter
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : teachers.map(teacher => (
                                        <TeacherRow
                                            key={teacher.id}
                                            teacher={teacher}
                                            selectedIds={selectedIds}
                                            toggleSelect={toggleSelect}
                                            visibleCols={visibleCols}
                                            isPrivacyMode={isPrivacyMode}
                                            disp={disp}
                                            openProfile={openProfile}
                                            handleEdit={canEdit ? handleEdit : null}
                                            handleTogglePin={handleTogglePin}
                                            handleQuickStatus={handleQuickStatus}
                                            setTeacherToAction={setTeacherToAction}
                                            setIsArchiveModalOpen={canEdit ? setIsArchiveModalOpen : null}
                                            quickStatusId={quickStatusId}
                                            setQuickStatusId={setQuickStatusId}
                                            quickStatusRef={quickStatusRef}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden divide-y divide-[var(--color-border)]">
                            {teachers.length === 0 ? (
                                <div className="py-24 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700">
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
                                        Tidak ada guru atau karyawan yang cocok dengan kriteria pencarian. Coba ubah kata kunci atau reset filter.
                                    </p>
                                    <button onClick={resetAllFilters} className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition mb-4">
                                        Reset Semua Filter
                                    </button>
                                </div>
                            ) : teachers.map(teacher => (
                                <TeacherMobileCard
                                    key={teacher.id}
                                    teacher={teacher}
                                    selectedIds={selectedIds}
                                    toggleSelect={toggleSelect}
                                    isPrivacyMode={isPrivacyMode}
                                    disp={disp}
                                    openProfile={openProfile}
                                    handleEdit={canEdit ? handleEdit : null}
                                    handleTogglePin={handleTogglePin}
                                    setTeacherToAction={setTeacherToAction}
                                    setIsArchiveModalOpen={canEdit ? setIsArchiveModalOpen : null}
                                />
                            ))}
                        </div>

                        <Pagination
                            totalRows={totalRows}
                            page={page}
                            pageSize={pageSize}
                            setPage={setPage}
                            setPageSize={setPageSize}
                            label="guru"
                            jumpPage={jumpPage}
                            setJumpPage={setJumpPage}
                        />

                    </div>
                )}

                {/* ════ MODAL Tambah/Edit ════ */}
                <TeacherFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedItem={selectedItem}
                    classesList={classesList}
                    subjectsList={subjectsList}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    onPhotoUpload={handlePhotoUpload}
                    uploadingPhoto={uploadingPhoto}
                />

                {/* ════ MODAL Profil ════ */}
                <TeacherProfileModal
                    isOpen={isProfileOpen}
                    onClose={() => setIsProfileOpen(false)}
                    selectedTeacher={profileTeacher}
                    loadingProfile={loadingProfile}
                    profileStats={profileStats}
                    profileReports={profileReports}
                    profileTab={profileTab}
                    setProfileTab={setProfileTab}
                    canEdit={canEdit}
                    handleEdit={handleEdit}
                    addToast={addToast}
                    fetchData={fetchData}
                />

                {/* ════ MODAL Import ════ */}
                <TeacherImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => { if (importing) return; setIsImportModalOpen(false); setImportPreview([]); setImportIssues([]); setImportFileName(''); setImportStep(1) }}
                    importing={importing}
                    importStep={importStep}
                    setImportStep={setImportStep}
                    importPreview={importPreview}
                    importFileName={importFileName}
                    importFileInputRef={importFileRef}
                    importDragOver={importDrag}
                    setImportDragOver={setImportDrag}
                    processImportFile={processImportFile}
                    subjectsList={subjectsList}
                    handleDownloadTemplate={handleDownloadTemplate}
                    importFileHeaders={importFileHeaders}
                    SYSTEM_COLS={SYSTEM_COLS}
                    importColumnMapping={importColumnMapping}
                    setImportColumnMapping={setImportColumnMapping}
                    importRawData={importRawData}
                    importLoading={importLoading}
                    setImportLoading={setImportLoading}
                    buildImportPreview={buildImportPreview}
                    importIssues={importIssues}
                    importValidationOpen={importValidationOpen}
                    setImportValidationOpen={setImportValidationOpen}
                    importProgress={importProgress}
                    handleCommitImport={handleCommitImport}
                    handleImportClick={() => importFileRef.current?.click()}
                    hasImportBlockingErrors={hasImportBlockingErrors}
                    importReadyRows={importReadyRows}
                    handleImportCellEdit={handleImportCellEdit}
                    importEditCell={importEditCell}
                    setImportEditCell={setImportEditCell}
                    handleRemoveImportRow={handleRemoveImportRow}
                    importSkipDupes={importSkipDupes}
                    setImportSkipDupes={setImportSkipDupes}
                    handleBulkFix={handleBulkFix}
                    STATUS_CONFIG={STATUS_CONFIG}
                />

                {/* ════ MODAL Export ════ */}
                <TeacherExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    teachers={teachers}
                    selectedTeacherIds={selectedIds}
                    exportScope={exportScope}
                    setExportScope={setExportScope}
                    exportColumns={exportColumns}
                    setExportColumns={setExportColumns}
                    exporting={exporting}
                    handleExportCSV={handleExportCSV}
                    handleExportExcel={handleExportExcel}
                    handleExportPDF={handleExportPDF}
                    addToast={addToast}
                />

                {/* ════ MODAL Arsipkan ════ */}
                {isArchiveModalOpen && (
                    <Modal
                        isOpen={isArchiveModalOpen}
                        onClose={() => setIsArchiveModalOpen(false)}
                        title="Konfirmasi Arsip"
                        description="Guru akan dipindahkan ke folder Arsip"
                        icon={faBoxArchive}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-600"
                        size="sm"
                    >
                        <div className="space-y-6">
                            <div className="py-2">
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Guru <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{teacherToAction?.name}</span> akan diarsipkan.
                                </p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium italic">
                                    Seluruh riwayat mengajar & data kepegawaian tetap tersimpan dengan aman.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsArchiveModalOpen(false)} className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all">
                                    BATAL
                                </button>
                                <button
                                    onClick={handleArchive}
                                    disabled={submitting}
                                    className="flex-[2] h-11 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                >
                                    {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (
                                        <><FontAwesomeIcon icon={faBoxArchive} className="text-xs" /> ARSIPKAN</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}


                {isBulkModalOpen && (
                    <Modal
                        isOpen={isBulkModalOpen}
                        onClose={() => setIsBulkModalOpen(false)}
                        title="Arsip Massal"
                        description={`${selectedIds.length} guru akan diarsipkan`}
                        icon={faBoxArchive}
                        iconBg="bg-amber-500/10"
                        iconColor="text-amber-600"
                        size="sm"
                    >
                        <div className="space-y-6">
                            <div className="py-2">
                                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed font-bold">
                                    Anda akan mengarsipkan <span className="text-amber-600 font-black px-1.5 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">{selectedIds.length} guru</span>.
                                </p>
                                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-medium italic">
                                    Data ini dapat dipulihkan kapan saja melalui folder Arsip.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsBulkModalOpen(false)} className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all">
                                    BATAL
                                </button>
                                <button
                                    onClick={handleBulkArchive}
                                    disabled={submitting}
                                    className="flex-[2] h-11 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                                >
                                    {submitting ? <FontAwesomeIcon icon={faSpinner} className="fa-spin" /> : (
                                        <><FontAwesomeIcon icon={faBoxArchive} className="text-xs" /> ARSIPKAN SEMUA</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}

                {/* ════ MODAL WA Massal ════ */}
                <Modal isOpen={isBulkWAOpen} onClose={() => setIsBulkWAOpen(false)} title="WA Massal Guru" size="sm">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Pesan</p>
                            {[{ id: 'info', label: 'Info Akun Sistem' }, { id: 'notif', label: 'Notifikasi Baru' }].map(t => (
                                <button key={t.id} onClick={() => setWaTemplate(t.id)} className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all ${waTemplate === t.id ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-lg' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]'}`}>{t.label}</button>
                            ))}
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-xs text-[var(--color-text-muted)] font-medium">
                            {bulkWATeachers.length} guru dengan WA · {Object.values(bulkWAResults).filter(v => v === 'sent').length} sudah dikirim
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-2">
                            {bulkWATeachers.map((t, i) => (
                                <div key={t.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${i === bulkWAIndex ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : bulkWAResults[t.id] === 'sent' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-[var(--color-border)]'}`}>
                                    <div className="w-8 h-8 rounded-xl overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-white text-xs font-black shrink-0">
                                        {t.avatar_url
                                            ? <img src={t.avatar_url} alt={t.name} className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = 'none' }} />
                                            : t.name.charAt(0)
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{t.name}</p><p className="text-[10px] text-[var(--color-text-muted)]">{t.phone}</p></div>
                                    {bulkWAResults[t.id] === 'sent' && <FontAwesomeIcon icon={faCircleCheck} className="text-emerald-500 shrink-0" />}
                                    {i === bulkWAIndex && <span className="text-[9px] font-black text-[var(--color-primary)] uppercase">Berikutnya</span>}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsBulkWAOpen(false)} className="flex-1 h-11 rounded-xl bg-[var(--color-surface-alt)] text-xs font-black uppercase tracking-widest">Selesai</button>
                            {bulkWAIndex >= 0 && bulkWAIndex < bulkWATeachers.length && (
                                <button onClick={sendNextWA} className="flex-1 h-11 rounded-xl bg-green-500 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                                    <FontAwesomeIcon icon={faWhatsapp} />Kirim ke {bulkWATeachers[bulkWAIndex]?.name.split(' ')[0]}
                                </button>
                            )}
                        </div>
                    </div>
                </Modal>

                {/* ════ MODAL Arsip List ════ */}
                <TeacherArchiveModal
                    isOpen={isArchivedOpen}
                    onClose={() => setIsArchivedOpen(false)}
                    archivedTeachers={archivedTeachers}
                    loadingArchived={loadingArchived}
                    setArchivedTeachers={setArchivedTeachers}
                    fetchArchivedTeachers={fetchArchived}
                    fetchData={fetchData}
                    fetchStats={fetchStats}
                    addToast={addToast}
                />
            </div>
        </DashboardLayout >
    )
}