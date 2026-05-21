import React, { useState, memo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUserPlus, faUsers, faCheckCircle, faXmarkCircle, faClipboardList,
    faMars, faVenus, faSliders, faRotateLeft, faXmark, faWaveSquare,
    faSquareCheck, faCheckDouble, faBookQuran, faSearch, faSchool,
    faHourglassHalf, faArrowRight, faTrash, faBoxArchive, faChevronDown
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import Modal from '../../components/ui/Modal'
import { StatCard, EmptyState } from '../../components/ui/DataDisplay'
import StatsCarousel from '../../components/StatsCarousel'
import Pagination from '../../components/ui/Pagination'
import { useToast } from '../../context/ToastContext'
import { useEnrollmentCore } from '../../hooks/enrollment/useEnrollmentCore'
import { EnrollmentRow, EnrollmentMobileCard, EnrollmentSkeletonRow, EnrollmentSkeletonCard } from '../../components/enrollment/EnrollmentRow'
import EnrollmentFormModal from '../../components/enrollment/EnrollmentFormModal'
import EnrollmentProfileModal from '../../components/enrollment/EnrollmentProfileModal'
import EnrollmentWaveModal from '../../components/enrollment/EnrollmentWaveModal'
import EnrollmentSearch from '../../components/enrollment/EnrollmentSearch'
import EnrollmentArchiveModal from '../../components/enrollment/EnrollmentArchiveModal'
import { STATUS_CONFIG, PROGRAM_OPTIONS } from '../../utils/enrollment/enrollmentConstants'


export default function EnrollmentPage() {
    const { addToast, addUndoToast } = useToast()
    const core = useEnrollmentCore({ addToast, addUndoToast })
    const [jumpPage, setJumpPage] = useState('')
    const [isArchiveOpen, setIsArchiveOpen] = useState(false)
    const [showStatusDropdown, setShowStatusDropdown] = useState(false)

    const {
        enrollments, waves, loading, totalRows, globalStats, pipelineDistribution,
        searchQuery, setSearchQuery, filterWave, setFilterWave,
        filterStatus, setFilterStatus, filterGender, setFilterGender,
        filterProgram, setFilterProgram, sortBy, setSortBy,
        activeFilterCount, resetAllFilters,
        page, setPage, pageSize, setPageSize,
        isFormOpen, isProfileOpen, isWaveModalOpen, setIsWaveModalOpen,
        activeModal, setActiveModal, selectedEnrollment,
        selectedIds, setSelectedIds, selectedIdSet, allSelected, submitting,
        handleAdd, handleEdit, handleViewProfile,
        closeForm, closeProfile, closeModal,
        handleSubmit, confirmDelete, executeDelete, enrollmentToDelete,
        updateStatus, toggleSelectAll, toggleSelect,
        handleBulkApprove, handleBulkReject, searchInputRef, fetchData,
        archivedEnrollments, loadingArchived, fetchArchivedEnrollments,
        handleRestoreEnrollment, handlePermanentDeleteEnrollment,
        handleBulkArchive, handleBulkStatusChange
    } = core

    const handleSearchChange = useCallback((val) => setSearchQuery(val), [setSearchQuery])

    return (
        <DashboardLayout title="PSB / Enrollment" subtitle="Penerimaan Santri Baru">
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto min-h-screen relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Master Data" items={['PSB / Enrollment']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Penerimaan Santri Baru</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-1 font-medium">Kelola pendaftaran dan seleksi calon santri baru</p>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <button onClick={() => { setIsArchiveOpen(true); fetchArchivedEnrollments(); }} className="h-9 px-3 sm:px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0" title="Arsip Pendaftar">
                            <FontAwesomeIcon icon={faBoxArchive} className="text-[10px]" />
                            <span className="hidden sm:inline">Arsip</span>
                        </button>
                        <button onClick={() => setIsWaveModalOpen(true)} className="h-9 px-3 sm:px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0" title="Gelombang Pendaftaran">
                            <FontAwesomeIcon icon={faWaveSquare} className="text-[10px]" />
                            <span className="hidden sm:inline">Gelombang</span>
                        </button>
                        <button onClick={handleAdd} className="h-9 px-4 sm:px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10 shrink-0">
                            <FontAwesomeIcon icon={faUserPlus} className="text-[10px]" />
                            <span>Tambah Pendaftar</span>
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <StatsCarousel count={5} cols={5}>
                    <StatCard icon={faUsers} label="Total Pendaftar" value={globalStats.total} color="sky" />
                    <StatCard icon={faHourglassHalf} label="Menunggu" value={globalStats.mendaftar + globalStats.verifikasi} color="amber" />
                    <StatCard icon={faBookQuran} label="Tahap Tes" value={globalStats.tes} color="indigo" />
                    <StatCard icon={faCheckCircle} label="Diterima" value={globalStats.diterima} color="emerald" subValue={globalStats.quota ? `Kuota: ${globalStats.quotaLeft} sisa` : undefined} />
                    <StatCard icon={faXmarkCircle} label="Ditolak" value={globalStats.ditolak} color="rose" />
                </StatsCarousel>

                {/* Filter Bar */}
                <div className="glass rounded-[1.5rem] mb-4 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center gap-2 p-2.5 lg:p-3">
                        <div className="flex-initial w-full lg:w-[232px] xl:w-[352px] min-w-[120px]">
                            <EnrollmentSearch searchQuery={searchQuery} onSearch={handleSearchChange} inputRef={searchInputRef} isLoading={loading} />
                        </div>

                        {/* Quick Filters — Desktop */}
                        <div className="hidden lg:flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide py-0.5 min-w-0 pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-32px),transparent)]">
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1" />
                            {/* Status chips */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[{ id: '', label: 'Semua', icon: faUsers },
                                { id: 'mendaftar', label: 'Mendaftar', icon: faClipboardList },
                                { id: 'verifikasi', label: 'Verifikasi', icon: faHourglassHalf },
                                { id: 'tes', label: 'Tes', icon: faBookQuran },
                                { id: 'diterima', label: 'Diterima', icon: faCheckCircle },
                                { id: 'ditolak', label: 'Ditolak', icon: faXmarkCircle },
                                ].map(s => (
                                    <button key={s.id} onClick={() => setFilterStatus(s.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterStatus === s.id
                                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/5'}`}>
                                        <FontAwesomeIcon icon={s.icon} className={`text-[10px] ${filterStatus === s.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-4 w-px bg-[var(--color-border)] mx-1 shrink-0" />
                            {/* Gender */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                {[{ id: 'L', label: 'Putra', icon: faMars, cls: 'bg-blue-500 border-blue-500' },
                                { id: 'P', label: 'Putri', icon: faVenus, cls: 'bg-pink-500 border-pink-500' }
                                ].map(g => (
                                    <button key={g.id} onClick={() => setFilterGender(filterGender === g.id ? '' : g.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${filterGender === g.id
                                            ? `${g.cls} text-white`
                                            : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30'}`}>
                                        <FontAwesomeIcon icon={g.icon} className={`text-[10px] ${filterGender === g.id ? 'opacity-100' : 'opacity-30'}`} />
                                        {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="hidden lg:block w-px h-4 bg-[var(--color-border)] mx-2 shrink-0" />

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
                            <button onClick={toggleSelectAll}
                                className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${selectedIds.length > 0
                                    ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/10'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                <FontAwesomeIcon icon={selectedIds.length > 0 ? faCheckDouble : faSquareCheck} />
                                <span className="hidden xs:inline">{selectedIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedIds.length > 0 && <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">{selectedIds.length}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Active filter chips */}
                    {activeFilterCount > 0 && (
                        <div className="px-3 pb-3 -mt-1">
                            <div className="flex flex-wrap gap-2">
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={faSearch} className="text-[10px] opacity-60" />
                                        <span className="max-w-[180px] truncate">"{searchQuery}"</span>
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500 transition-colors"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterStatus && (
                                    <button onClick={() => setFilterStatus('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 text-[10px] font-black text-[var(--color-primary)]">
                                        Status: {STATUS_CONFIG[filterStatus]?.label}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-[var(--color-primary)]/20 flex items-center justify-center opacity-70 group-hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterGender && (
                                    <button onClick={() => setFilterGender('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 text-[10px] font-black text-[var(--color-text)]">
                                        <FontAwesomeIcon icon={filterGender === 'L' ? faMars : faVenus} className="opacity-70" /> {filterGender === 'L' ? 'Putra' : 'Putri'}
                                        <span className="w-5 h-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:text-red-500"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                {filterProgram && (
                                    <button onClick={() => setFilterProgram('')} className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-[10px] font-black text-indigo-600">
                                        Program: {PROGRAM_OPTIONS.find(p => p.id === filterProgram)?.name}
                                        <span className="w-5 h-5 rounded-lg bg-white/70 dark:bg-[var(--color-surface)] border border-indigo-500/20 flex items-center justify-center opacity-70 group-hover:opacity-100"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></span>
                                    </button>
                                )}
                                <button onClick={resetAllFilters} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 text-[10px] font-black text-red-600">
                                    <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" /> Reset semua
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Data Table Card */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--color-surface-alt)]">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                                    <th className="w-10 pl-4 pr-1 py-3 text-center">
                                        <input
                                            type="checkbox"
                                            checked={allSelected && enrollments.length > 0}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer shrink-0"
                                            title={allSelected ? "Batal pilih semua" : "Pilih semua"}
                                        />
                                    </th>
                                    <th className="py-3 px-3">Nama</th>
                                    <th className="py-3 px-3 hidden lg:table-cell">Asal Sekolah</th>
                                    <th className="py-3 px-3 hidden xl:table-cell">Program</th>
                                    <th className="py-3 px-3 hidden xl:table-cell">Quran</th>
                                    <th className="py-3 px-3">Status</th>
                                    <th className="py-3 px-3 hidden md:table-cell">Tgl Daftar</th>
                                    <th className="py-3 px-3">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]/50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => <EnrollmentSkeletonRow key={i} />)
                                ) : enrollments.length === 0 ? (
                                    <tr><td colSpan={8} className="py-16 text-center">
                                        <EmptyState icon={faUserPlus} title="Belum Ada Pendaftar" description="Tambah pendaftar baru atau ubah filter pencarian" action={
                                            <button onClick={handleAdd} className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                                                <FontAwesomeIcon icon={faUserPlus} className="mr-2" />Tambah Pendaftar
                                            </button>
                                        } variant="plain" />
                                    </td></tr>
                                ) : enrollments.map(e => (
                                    <EnrollmentRow key={e.id} enrollment={e} isSelected={selectedIdSet.has(e.id)}
                                        onToggleSelect={toggleSelect} onView={handleViewProfile} onEdit={handleEdit}
                                        onDelete={confirmDelete} onStatusChange={updateStatus} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden p-3 space-y-3">
                        {loading ? (
                            Array.from({ length: 3 }).map((_, i) => <EnrollmentSkeletonCard key={i} />)
                        ) : enrollments.length === 0 ? (
                            <EmptyState icon={faUserPlus} title="Belum Ada Pendaftar" description="Tambah pendaftar baru" variant="dashed" />
                        ) : enrollments.map(e => (
                            <EnrollmentMobileCard key={e.id} enrollment={e} isSelected={selectedIdSet.has(e.id)}
                                onToggleSelect={toggleSelect} onView={handleViewProfile} onEdit={handleEdit}
                                onStatusChange={updateStatus} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalRows > 0 && (
                        <Pagination totalRows={totalRows} page={page} pageSize={pageSize}
                            setPage={setPage} setPageSize={setPageSize} label="Pendaftar"
                            jumpPage={jumpPage} setJumpPage={setJumpPage} />
                    )}
                </div>
            </div>

            {/* Modals */}
            <EnrollmentFormModal isOpen={isFormOpen} onClose={closeForm} onSubmit={handleSubmit}
                enrollment={selectedEnrollment} submitting={submitting} waves={waves} />
            <EnrollmentProfileModal isOpen={isProfileOpen} onClose={closeProfile}
                enrollment={selectedEnrollment} onEdit={(e) => { closeProfile(); handleEdit(e) }}
                onDelete={(e) => { closeProfile(); confirmDelete(e) }} onStatusChange={(e, s) => { closeProfile(); updateStatus(e, s) }} />
            <EnrollmentWaveModal isOpen={isWaveModalOpen} onClose={() => setIsWaveModalOpen(false)}
                waves={waves} addToast={addToast} onRefresh={fetchData} />
            <EnrollmentArchiveModal isOpen={isArchiveOpen} onClose={() => setIsArchiveOpen(false)}
                archivedEnrollments={archivedEnrollments} loadingArchived={loadingArchived}
                fetchArchivedEnrollments={fetchArchivedEnrollments} handleRestoreEnrollment={handleRestoreEnrollment}
                handlePermanentDeleteEnrollment={handlePermanentDeleteEnrollment} addToast={addToast} />

            {/* Archive confirmation */}
            <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Arsipkan Pendaftar" maxWidth="max-w-sm">
                <div className="px-6 py-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center"><FontAwesomeIcon icon={faBoxArchive} className="text-amber-500 text-xl" /></div>
                    <p className="text-sm font-bold text-[var(--color-text)] mb-1">Arsipkan "{enrollmentToDelete?.name}"?</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Data pendaftaran akan dipindahkan ke folder Arsip.</p>
                </div>
                <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
                    <button onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">Batal</button>
                    <button onClick={executeDelete} className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-[11px] font-black">Arsipkan</button>
                </div>
            </Modal>

            {/* Bulk approve */}
            {activeModal === 'bulkApprove' && (
                <Modal
                    isOpen={activeModal === 'bulkApprove'}
                    onClose={closeModal}
                    title="Terima Pendaftar Massal"
                    description={`${selectedIds.length} calon santri akan diterima`}
                    icon={faCheckCircle}
                    iconBg="bg-emerald-500/10"
                    iconColor="text-emerald-600"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleBulkApprove}
                                className="h-10 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faCheckCircle} className="text-[11px] opacity-70" />
                                Terima Semua
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Anda akan menyetujui pendaftaran untuk calon santri berikut. Status mereka akan diubah menjadi <span className="text-emerald-600 font-black px-1.5 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">Diterima</span>.
                        </p>
                        <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 py-1 scrollbar-thin">
                            {enrollments
                                .filter(e => selectedIds.includes(e.id))
                                .map(e => (
                                    <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/15 rounded-md">
                                        {e.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk reject */}
            {activeModal === 'bulkReject' && (
                <Modal
                    isOpen={activeModal === 'bulkReject'}
                    onClose={closeModal}
                    title="Tolak Pendaftar Massal"
                    description={`${selectedIds.length} calon santri akan ditolak`}
                    icon={faXmarkCircle}
                    iconBg="bg-rose-500/10"
                    iconColor="text-rose-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={handleBulkReject}
                                className="h-10 px-6 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faXmarkCircle} className="text-[11px] opacity-70" />
                                Tolak Semua
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Anda akan menolak pendaftaran untuk calon santri berikut. Status mereka akan diubah menjadi <span className="text-rose-500 font-black px-1.5 py-0.5 bg-rose-500/10 rounded-md border border-rose-500/20">Ditolak</span>.
                        </p>
                        <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 py-1 scrollbar-thin">
                            {enrollments
                                .filter(e => selectedIds.includes(e.id))
                                .map(e => (
                                    <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/15 rounded-md">
                                        {e.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk archive */}
            {activeModal === 'bulkArchive' && (
                <Modal
                    isOpen={activeModal === 'bulkArchive'}
                    onClose={closeModal}
                    title="Arsipkan Pendaftar Massal"
                    description={`${selectedIds.length} calon santri akan diarsipkan`}
                    icon={faBoxArchive}
                    iconBg="bg-amber-500/10"
                    iconColor="text-amber-500"
                    size="sm"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                            <div className="flex-1" />
                            <button
                                type="button"
                                onClick={async () => {
                                    await handleBulkArchive();
                                    closeModal();
                                }}
                                className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 shrink-0"
                            >
                                <FontAwesomeIcon icon={faBoxArchive} className="text-[11px] opacity-70" />
                                Arsipkan Semua
                            </button>
                        </div>
                    }
                >
                    <div className="px-1 space-y-3">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Anda akan mengarsipkan calon santri berikut. Data pendaftaran akan dipindahkan ke folder Arsip dan tetap tersimpan dengan aman.
                        </p>
                        <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5 py-1 scrollbar-thin">
                            {enrollments
                                .filter(e => selectedIds.includes(e.id))
                                .map(e => (
                                    <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/15 rounded-md">
                                        {e.name}
                                    </span>
                                ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Bulk Status Change Modal */}
            {activeModal === 'bulkStatusChange' && (
                <Modal
                    isOpen={activeModal === 'bulkStatusChange'}
                    onClose={closeModal}
                    title="Ubah Status Massal"
                    description={`Sesuaikan status untuk ${selectedIds.length} calon santri`}
                    icon={faSliders}
                    iconBg="bg-indigo-500/10"
                    iconColor="text-indigo-600"
                    size="md"
                    mobileVariant="bottom-sheet"
                    footer={
                        <div className="flex items-center w-full gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] text-[10px] font-black uppercase tracking-widest transition-all shrink-0"
                            >
                                Batal
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4 py-1">
                        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed font-bold">
                            Pilih status baru yang ingin Anda terapkan untuk calon santri yang terpilih:
                        </p>

                        <div className="space-y-1.5">
                            {[
                                { key: 'mendaftar', label: 'Mendaftar', desc: 'Pendaftaran baru masuk, menunggu berkas', activeColor: 'bg-sky-500/10 text-sky-500', iconColor: 'text-sky-500', barColor: 'bg-sky-500', icon: faClipboardList },
                                { key: 'verifikasi', label: 'Verifikasi', desc: 'Berkas dan data sedang divalidasi', activeColor: 'bg-amber-500/10 text-amber-600', iconColor: 'text-amber-500', barColor: 'bg-amber-500', icon: faHourglassHalf },
                                { key: 'tes', label: 'Tahap Tes', desc: 'Ujian seleksi lisan & baca Quran', activeColor: 'bg-purple-500/10 text-purple-600', iconColor: 'text-purple-500', barColor: 'bg-purple-500', icon: faBookQuran },
                                { key: 'diterima', label: 'Diterima', desc: 'Lolos seleksi & resmi bergabung', activeColor: 'bg-emerald-500/10 text-emerald-600', iconColor: 'text-emerald-500', barColor: 'bg-emerald-500', icon: faCheckCircle },
                                { key: 'ditolak', label: 'Ditolak', desc: 'Tidak memenuhi kriteria penerimaan', activeColor: 'bg-rose-500/10 text-rose-600', iconColor: 'text-rose-500', barColor: 'bg-rose-500', icon: faXmarkCircle }
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={async () => {
                                        await handleBulkStatusChange(opt.key);
                                        closeModal();
                                    }}
                                    className="w-full p-2.5 rounded-xl hover:bg-[var(--color-surface-alt)] hover:dark:bg-white/5 text-left transition-all duration-200 flex items-center justify-between group/opt cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        {/* Left Accent Bar */}
                                        <div className={`w-1 h-7 rounded-full ${opt.barColor} opacity-40 group-hover/opt:opacity-100 transition-opacity`} />
                                        
                                        {/* Icon Container */}
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/opt:scale-105 bg-[var(--color-surface-alt)] dark:bg-white/5 border border-[var(--color-border)]/40 ${opt.iconColor}`}>
                                            <FontAwesomeIcon icon={opt.icon} className="text-xs" />
                                        </div>

                                        {/* Text Info */}
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text)] leading-none mb-1">{opt.label}</p>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-none truncate">{opt.desc}</p>
                                        </div>
                                    </div>

                                    {/* Right Select Hint */}
                                    <div className="opacity-0 group-hover/opt:opacity-100 transition-all duration-200 transform translate-x-2 group-hover/opt:translate-x-0 pr-1 shrink-0">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${opt.activeColor}`}>
                                            Pilih →
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Selection list summary */}
                        <div className="pt-2 border-t border-[var(--color-border)] mt-4">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Santri yang akan diperbarui ({selectedIds.length}):</p>
                            <div className="max-h-24 overflow-y-auto pr-1 flex flex-wrap gap-1.5 scrollbar-thin">
                                {enrollments
                                    .filter(e => selectedIds.includes(e.id))
                                    .map(e => (
                                        <span key={e.id} className="text-[10px] font-black px-2 py-0.5 bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-md">
                                            {e.name}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ===================== */}
            {/* FLOATING BULK ACTION BAR - SaaS STYLE */}
            {/* ===================== */}
            {
                selectedIds.length > 0 && (
                    <div
                        className="fixed left-1/2 -translate-x-1/2 z-[250] w-max max-w-[95%] animate-in fade-in slide-in-from-bottom-8 duration-700 cubic-bezier(0.34, 1.56, 0.64, 1) bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-[max(24px,calc(16px+env(safe-area-inset-bottom)))]"
                    >
                        <div className="relative">
                            <div className="relative glass-morphism bg-gray-900/90 dark:bg-gray-800/95 backdrop-blur-3xl border border-white/20 rounded-2xl px-3 py-2 flex items-center gap-4 text-white shadow-2xl">
                                {/* Shimmer container overlay to keep shine within rounded corners */}
                                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none z-0">
                                    {/* Animated scanline */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                                </div>

                                {/* Left: count badge + label */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)] flex items-center justify-center font-black text-sm shrink-0">
                                        {selectedIds.length}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-50 leading-none">Terpilih</p>
                                        <p className="text-[10px] font-bold leading-none mt-0.5">Aksi Massal</p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-6 bg-white/10 shrink-0" />

                                {/* Center: action buttons */}
                                <div className="flex items-center gap-1.5 py-0.5 overflow-x-auto no-scrollbar">
                                    <button
                                        onClick={() => setActiveModal('bulkApprove')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Terima Massal"
                                    >
                                        <FontAwesomeIcon icon={faCheckCircle} className="text-xs animate-pulse" />
                                        <span className="hidden sm:inline">Terima</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkReject')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Tolak Massal"
                                    >
                                        <FontAwesomeIcon icon={faXmarkCircle} className="text-xs" />
                                        <span className="hidden sm:inline">Tolak</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkArchive')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Arsip Massal"
                                    >
                                        <FontAwesomeIcon icon={faBoxArchive} className="text-xs" />
                                        <span className="hidden sm:inline">Arsip</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveModal('bulkStatusChange')}
                                        className="h-8 px-2.5 sm:px-3 shrink-0 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all duration-200 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest"
                                        title="Ubah Status Massal"
                                    >
                                        <FontAwesomeIcon icon={faSliders} className="text-xs" />
                                        <span className="hidden sm:inline">Status</span>
                                    </button>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-6 bg-white/10 shrink-0" />

                                {/* Right: Cancel button */}
                                <button
                                    onClick={() => setSelectedIds([])}
                                    className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center text-xs shrink-0"
                                    title="Batal Pilih Semua"
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </DashboardLayout>
    )
}
