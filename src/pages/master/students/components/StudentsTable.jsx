import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { StudentRow, StudentMobileCard } from '../../../../components/students/StudentRow'
import { InlineAddRow } from './InlineAddRow'
import { MobileInlineAdd } from './MobileInlineAdd'
import { EmptyStateDesktop, EmptyStateMobile } from './EmptyState'
import { ColumnToggleMenu } from './ColumnToggleMenu'
import { Pagination } from './Pagination'
import { TableLoadingSkeleton } from './TableLoadingSkeleton'

const MOBILE_BOTTOM_NAV_PX = 72

export function StudentsTable({
    // Data
    students,
    loading,
    classesList,
    lastReportMap,
    // Selection
    selectedStudentIds,
    selectedIdSet,
    toggleSelectAll,
    toggleSelectStudent,
    // Columns
    visibleColumns,
    toggleColumn,
    isColMenuOpen,
    setIsColMenuOpen,
    colMenuPos,
    setColMenuPos,
    colMenuRef,
    // Actions
    handleEdit,
    handleViewProfile,
    handleViewQR,
    handleViewPrint,
    handleViewClassHistory,
    confirmDelete,
    handleClassBreakdown,
    handleQuickPoint,
    handleInlineUpdate,
    handleTogglePin,
    setStudentForTags,
    setIsTagModalOpen,
    setPhotoZoom,
    // Inline Add
    isInlineAddOpen,
    setIsInlineAddOpen,
    inlineForm,
    setInlineForm,
    handleInlineSubmit,
    submittingInline,
    // Filters
    isPrivacyMode,
    resetAllFilters,
    formatRelativeDate,
    RiskThreshold,
    canEdit,
    // Pagination
    page,
    totalPages,
    setPage,
    pageSize,
    setPageSize,
    totalRows,
    fromRow,
    toRow,
    getPageItems,
}) {
    if (loading) return <TableLoadingSkeleton />

    return (
        <>
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[var(--color-surface-alt)] sticky top-0 z-10">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">
                                <th className="px-6 py-4 text-center w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedStudentIds.length === students.length && students.length > 0}
                                        onChange={toggleSelectAll}
                                        className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                    />
                                </th>
                                <th className="px-6 py-4 text-left">Siswa</th>

                                {visibleColumns.gender && (
                                    <th className="px-6 py-4 text-center">Gender</th>
                                )}
                                {visibleColumns.kelas && (
                                    <th className="px-6 py-4 text-center">Kelas</th>
                                )}
                                {visibleColumns.poin && (
                                    <th className="px-6 py-4 text-center">Poin</th>
                                )}

                                <ColumnToggleMenu
                                    isColMenuOpen={isColMenuOpen}
                                    setIsColMenuOpen={setIsColMenuOpen}
                                    colMenuPos={colMenuPos}
                                    setColMenuPos={setColMenuPos}
                                    colMenuRef={colMenuRef}
                                    visibleColumns={visibleColumns}
                                    toggleColumn={toggleColumn}
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <EmptyStateDesktop resetAllFilters={resetAllFilters} />
                            ) : (students.map((student) => (
                                <StudentRow
                                    key={student.id}
                                    student={student}
                                    visibleColumns={visibleColumns}
                                    isSelected={selectedIdSet.has(student.id)}
                                    lastReportMap={lastReportMap}
                                    isPrivacyMode={isPrivacyMode}
                                    onEdit={canEdit ? handleEdit : null}
                                    onViewProfile={handleViewProfile}
                                    onViewQR={handleViewQR}
                                    onViewPrint={handleViewPrint}
                                    onViewTags={(s) => { setStudentForTags(s); setIsTagModalOpen(true) }}
                                    onViewClassHistory={handleViewClassHistory}
                                    onConfirmDelete={canEdit ? confirmDelete : null}
                                    onClassBreakdown={handleClassBreakdown}
                                    onPhotoZoom={setPhotoZoom}
                                    onToggleSelect={toggleSelectStudent}
                                    onQuickPoint={handleQuickPoint}
                                    onInlineUpdate={canEdit ? handleInlineUpdate : null}
                                    onTogglePin={handleTogglePin}
                                    classesList={classesList}
                                    formatRelativeDate={formatRelativeDate}
                                    RiskThreshold={RiskThreshold}
                                />
                            )))}

                            {/* Quick Inline Add Row */}
                            {isInlineAddOpen && (
                                <InlineAddRow
                                    inlineForm={inlineForm}
                                    setInlineForm={setInlineForm}
                                    handleInlineSubmit={handleInlineSubmit}
                                    submittingInline={submittingInline}
                                    canEdit={canEdit}
                                    classesList={classesList}
                                    setIsInlineAddOpen={setIsInlineAddOpen}
                                />
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div
                    className="md:hidden px-3 pb-6 space-y-3"
                    style={{
                        paddingBottom:
                            selectedStudentIds.length > 0
                                ? `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom) + 88px)`
                                : `calc(${MOBILE_BOTTOM_NAV_PX}px + env(safe-area-inset-bottom) + 16px)`,
                    }}
                >
                    {students.length === 0 ? (
                        <EmptyStateMobile resetAllFilters={resetAllFilters} />
                    ) : (
                        <>
                            {isInlineAddOpen && canEdit && (
                                <MobileInlineAdd
                                    inlineForm={inlineForm}
                                    setInlineForm={setInlineForm}
                                    handleInlineSubmit={handleInlineSubmit}
                                    submittingInline={submittingInline}
                                    canEdit={canEdit}
                                    classesList={classesList}
                                    setIsInlineAddOpen={setIsInlineAddOpen}
                                />
                            )}

                            {students.map(student => (
                                <StudentMobileCard
                                    key={student.id}
                                    student={student}
                                    isSelected={selectedIdSet.has(student.id)}
                                    onToggleSelect={toggleSelectStudent}
                                    onViewProfile={handleViewProfile}
                                    onEdit={canEdit ? handleEdit : null}
                                    onConfirmDelete={canEdit ? confirmDelete : null}
                                    onTogglePin={handleTogglePin}
                                    onQuickPoint={handleQuickPoint}
                                    isPrivacyMode={isPrivacyMode}
                                    RiskThreshold={RiskThreshold}
                                />
                            ))}
                        </>
                    )}
                </div>

                {/* Quick Add trigger */}
                {!isInlineAddOpen && canEdit && (
                    <button
                        onClick={() => setIsInlineAddOpen(true)}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all border-t border-[var(--color-border)] border-dashed"
                    >
                        <FontAwesomeIcon icon={faPlus} className="text-[9px]" />
                        Quick Add Siswa
                    </button>
                )}

                {/* Pagination Footer */}
                <Pagination
                    page={page}
                    totalPages={totalPages}
                    setPage={setPage}
                    pageSize={pageSize}
                    setPageSize={setPageSize}
                    totalRows={totalRows}
                    fromRow={fromRow}
                    toRow={toRow}
                    getPageItems={getPageItems}
                />
            </div>
        </>
    )
}
