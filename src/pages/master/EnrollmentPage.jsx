import React, { useState, memo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUserPlus, faUsers, faCheckCircle, faXmarkCircle, faClipboardList,
    faMars, faVenus, faSliders, faRotateLeft, faXmark, faWaveSquare,
    faSquareCheck, faCheckDouble, faBookQuran, faSearch, faSchool,
    faHourglassHalf, faArrowRight, faTrash
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
import { STATUS_CONFIG, MOCK_WAVES, PROGRAM_OPTIONS } from '../../utils/enrollment/enrollmentConstants'

// Pipeline visualization bar
const PipelineBar = memo(({ stats }) => {
    const segments = [
        { key: 'mendaftar', count: stats.mendaftar, color: 'bg-sky-500', label: 'Mendaftar' },
        { key: 'verifikasi', count: stats.verifikasi, color: 'bg-amber-500', label: 'Verifikasi' },
        { key: 'tes', count: stats.tes, color: 'bg-purple-500', label: 'Tes' },
        { key: 'diterima', count: stats.diterima, color: 'bg-emerald-500', label: 'Diterima' },
        { key: 'ditolak', count: stats.ditolak, color: 'bg-rose-500', label: 'Ditolak' },
    ]
    const total = stats.total || 1
    return (
        <div className="glass rounded-2xl border border-[var(--color-border)] p-4 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pipeline Pendaftaran</p>
                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">{stats.total} total pendaftar</p>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-[var(--color-surface-alt)]">
                {segments.map(s => s.count > 0 && (
                    <div key={s.key} className={`${s.color} transition-all duration-700`} style={{ width: `${(s.count / total) * 100}%` }} title={`${s.label}: ${s.count}`} />
                ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
                {segments.map(s => (
                    <div key={s.key} className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${s.color}`} />
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{s.label} <span className="font-black text-[var(--color-text)]">{s.count}</span></span>
                    </div>
                ))}
            </div>
        </div>
    )
})
PipelineBar.displayName = 'PipelineBar'

export default function EnrollmentPage() {
    const { addToast, addUndoToast } = useToast()
    const core = useEnrollmentCore({ addToast, addUndoToast })
    const [jumpPage, setJumpPage] = useState('')

    const {
        enrollments, waves, loading, totalRows, globalStats, pipelineDistribution,
        searchQuery, setSearchQuery, filterWave, setFilterWave,
        filterStatus, setFilterStatus, filterGender, setFilterGender,
        filterProgram, setFilterProgram, sortBy, setSortBy,
        activeFilterCount, resetAllFilters,
        page, setPage, pageSize, setPageSize,
        isFormOpen, isProfileOpen, isWaveModalOpen, setIsWaveModalOpen,
        activeModal, setActiveModal, selectedEnrollment,
        selectedIds, selectedIdSet, allSelected, submitting,
        handleAdd, handleEdit, handleViewProfile,
        closeForm, closeProfile, closeModal,
        handleSubmit, confirmDelete, executeDelete, enrollmentToDelete,
        updateStatus, toggleSelectAll, toggleSelect,
        handleBulkApprove, handleBulkReject, searchInputRef
    } = core

    const handleSearchChange = useCallback((val) => setSearchQuery(val), [setSearchQuery])

    return (
        <DashboardLayout title="PSB / Enrollment" subtitle="Penerimaan Santri Baru">
            <div className="p-3 sm:p-4 lg:p-6 pb-24 lg:pb-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div>
                        <Breadcrumb items={['Master', 'PSB / Enrollment']} />
                        <h1 className="text-xl sm:text-2xl font-black text-[var(--color-text)] mt-1 tracking-tight">Penerimaan Santri Baru</h1>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium mt-0.5">Kelola pendaftaran dan seleksi calon santri baru</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setIsWaveModalOpen(true)} className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2">
                            <FontAwesomeIcon icon={faWaveSquare} className="text-[10px]" /> Gelombang
                        </button>
                        <button onClick={handleAdd} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 border border-white/10">
                            <FontAwesomeIcon icon={faUserPlus} className="text-[10px]" /> Tambah Pendaftar
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

                {/* Pipeline */}
                <PipelineBar stats={globalStats} />

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
                                    ? 'bg-indigo-500 border-indigo-500 text-white'
                                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`}>
                                <FontAwesomeIcon icon={selectedIds.length > 0 ? faCheckDouble : faSquareCheck} />
                                <span className="hidden xs:inline">{selectedIds.length > 0 ? 'Terpilih' : 'Pilih'}</span>
                                {selectedIds.length > 0 && <span className="w-4 h-4 rounded-full bg-white/20 text-white text-[9px] font-black flex items-center justify-center">{selectedIds.length}</span>}
                            </button>
                            {/* Bulk actions when selected */}
                            {selectedIds.length > 0 && (
                                <>
                                    <button onClick={() => setActiveModal('bulkApprove')} className="h-9 px-3 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-500/20">
                                        <FontAwesomeIcon icon={faCheckCircle} /> Terima
                                    </button>
                                    <button onClick={() => setActiveModal('bulkReject')} className="h-9 px-3 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95">
                                        <FontAwesomeIcon icon={faXmarkCircle} /> Tolak
                                    </button>
                                </>
                            )}
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

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-t border-b border-[var(--color-border)]">
                                    <th className="w-10 pl-4 pr-1 py-3"><span className="sr-only">Select</span></th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama</th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hidden lg:table-cell">Asal Sekolah</th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hidden xl:table-cell">Program</th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hidden xl:table-cell">Quran</th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Status</th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hidden md:table-cell">Tgl Daftar</th>
                                    <th className="py-3 px-3 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Aksi</th>
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
                waves={MOCK_WAVES} addToast={addToast} />

            {/* Delete confirmation */}
            <Modal isOpen={activeModal === 'delete'} onClose={closeModal} title="Hapus Pendaftar" maxWidth="max-w-sm">
                <div className="px-6 py-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center"><FontAwesomeIcon icon={faTrash} className="text-rose-500 text-xl" /></div>
                    <p className="text-sm font-bold text-[var(--color-text)] mb-1">Hapus "{enrollmentToDelete?.name}"?</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">Data pendaftaran akan dihapus permanen.</p>
                </div>
                <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
                    <button onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">Batal</button>
                    <button onClick={executeDelete} className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-[11px] font-black">Hapus</button>
                </div>
            </Modal>

            {/* Bulk approve */}
            <Modal isOpen={activeModal === 'bulkApprove'} onClose={closeModal} title="Terima Pendaftar" maxWidth="max-w-sm">
                <div className="px-6 py-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center"><FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-xl" /></div>
                    <p className="text-sm font-bold text-[var(--color-text)]">Terima {selectedIds.length} pendaftar?</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Status akan diubah menjadi "Diterima".</p>
                </div>
                <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
                    <button onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">Batal</button>
                    <button onClick={handleBulkApprove} className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black">Terima Semua</button>
                </div>
            </Modal>

            {/* Bulk reject */}
            <Modal isOpen={activeModal === 'bulkReject'} onClose={closeModal} title="Tolak Pendaftar" maxWidth="max-w-sm">
                <div className="px-6 py-4 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/10 flex items-center justify-center"><FontAwesomeIcon icon={faXmarkCircle} className="text-rose-500 text-xl" /></div>
                    <p className="text-sm font-bold text-[var(--color-text)]">Tolak {selectedIds.length} pendaftar?</p>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Status akan diubah menjadi "Ditolak".</p>
                </div>
                <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-2">
                    <button onClick={closeModal} className="px-4 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)]">Batal</button>
                    <button onClick={handleBulkReject} className="px-4 py-2.5 rounded-xl bg-rose-500 text-white text-[11px] font-black">Tolak Semua</button>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
