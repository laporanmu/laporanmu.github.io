import React from 'react'
import StudentFormModal from '../../../../components/students/StudentFormModal'
import { BulkPhotoModal } from '../modals/BulkPhotoModal'
import { BulkWAModal } from '../modals/BulkWAModal'
import { StudentProfileModal } from '../modals/StudentProfileModal'
import { BulkPromoteModal } from '../modals/BulkPromoteModal'
import { DeleteModal } from '../modals/DeleteModal'
import { BulkDeleteModal } from '../modals/BulkDeleteModal'
import { ArchivedModal } from '../modals/ArchivedModal'
import { ClassHistoryModal } from '../modals/ClassHistoryModal'
import { ClassBreakdownModal } from '../modals/ClassBreakdownModal'
import { ResetPointsModal } from '../modals/ResetPointsModal'
import { TagModal } from '../modals/TagModal'
import { GSheetsImportModal } from '../modals/GSheetsImportModal'
import { BulkTagModal } from '../modals/BulkTagModal'
import { BulkPointModal } from '../modals/BulkPointModal'
import { PhotoZoomOverlay } from './PhotoZoomOverlay'

const LazyStudentPrintModal = React.lazy(() =>
    import('../StudentPrintModal')
)
const LazyStudentExportModal = React.lazy(() =>
    import('../StudentExportModal')
)
const LazyStudentImportModal = React.lazy(() =>
    import('../StudentImportModal')
)

export function ModalsSection({
    // Import Modal
    isImportModalOpen,
    setIsImportModalOpen,
    importing,
    importStep,
    setImportStep,
    importPreview,
    importDuplicates,
    importFileName,
    setImportFileName,
    importFileInputRef,
    importDragOver,
    setImportDragOver,
    processImportFile,
    classesList,
    handleDownloadTemplate,
    importFileHeaders,
    SYSTEM_COLS,
    importColumnMapping,
    setImportColumnMapping,
    importRawData,
    importLoading,
    setImportLoading,
    buildImportPreview,
    importIssues,
    importValidationOpen,
    setImportValidationOpen,
    importProgress,
    handleCommitImport,
    hasImportBlockingErrors,
    importReadyRows,

    // Bulk Photo
    isBulkPhotoModalOpen,
    setIsBulkPhotoModalOpen,
    matchingPhotos,
    handleBulkPhotoMatch,
    bulkPhotoMatches,
    uploadingBulkPhotos,
    handleBulkPhotoUpload,

    // Bulk WA
    isBulkWAModalOpen,
    setIsBulkWAModalOpen,
    selectedStudentsWithPhone,
    broadcastTemplate,
    setBroadcastTemplate,
    customWaMsg,
    setCustomWaMsg,
    broadcastIndex,
    setBroadcastIndex,
    buildWAMessage,
    openWAForStudent,

    // Export Modal
    isExportModalOpen,
    setIsExportModalOpen,
    students,
    selectedStudentIds,
    exportScope,
    setExportScope,
    exportColumns,
    setExportColumns,
    exporting,
    handleExportCSV,
    handleExportExcel,
    handleExportPDF,
    generateStudentPDF,
    addToast,

    // Student Form Modal
    isModalOpen,
    setIsModalOpen,
    selectedStudent,
    handleSubmit,
    submitting,
    handlePhotoUpload,
    uploadingPhoto,

    // Print Modal
    isPrintModalOpen,
    setIsPrintModalOpen,
    newlyCreatedStudent,
    setNewlyCreatedStudent,
    isPrivacyMode,
    maskInfo,
    cardCaptureRef,
    waTemplate,
    handleResetPin,
    resettingPin,
    generatingPdf,
    handlePrintSingle,
    handleSavePNG,
    handlePrintThermal,

    // Profile Modal
    isProfileModalOpen,
    setIsProfileModalOpen,
    calculateCompleteness,
    behaviorHistory,
    loadingHistory,
    RiskThreshold,
    canEdit,
    handleEdit,
    handleViewQR,
    profileTab,
    setProfileTab,
    timelineStats,
    timelineFilter,
    setTimelineFilter,
    timelineVisible,
    setTimelineVisible,
    timelineFiltered,
    raportHistory,
    loadingRaport,

    // Bulk Promote
    isBulkModalOpen,
    setIsBulkModalOpen,
    bulkClassId,
    setBulkClassId,
    handleBulkPromote,

    // Delete
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    studentToDelete,
    executeDelete,

    // Bulk Delete
    isBulkDeleteModalOpen,
    setIsBulkDeleteModalOpen,
    handleBulkDelete,

    // Archived
    isArchivedModalOpen,
    setIsArchivedModalOpen,
    archivedStudents,
    loadingArchived,
    archivePage,
    setArchivePage,
    archivePageSize,
    formatRelativeDate,
    handleRestoreStudent,
    handlePermanentDelete,

    // Class History
    isClassHistoryModalOpen,
    setIsClassHistoryModalOpen,
    classHistory,
    loadingClassHistory,

    // Class Breakdown
    isClassBreakdownOpen,
    setIsClassBreakdownOpen,
    classBreakdownData,
    loadingBreakdown,
    setFilterClass,

    // Reset Points
    isResetPointsModalOpen,
    setIsResetPointsModalOpen,
    resetPointsClassId,
    setResetPointsClassId,
    handleBatchResetPoints,
    resettingPoints,

    // Tags
    isTagModalOpen,
    setIsTagModalOpen,
    studentForTags,
    newTagInput,
    setNewTagInput,
    handleAddCustomTag,
    handleToggleTag,
    getTagColor,
    AvailableTags,
    allUsedTags,
    tagToEdit,
    setTagToEdit,
    renameInput,
    setRenameInput,
    handleGlobalRenameTag,
    handleGlobalDeleteTag,

    // Google Sheets
    isGSheetsModalOpen,
    setIsGSheetsModalOpen,
    gSheetsUrl,
    setGSheetsUrl,
    fetchingGSheets,
    handleFetchGSheets,

    // Photo Zoom
    photoZoom,
    setPhotoZoom,

    // Bulk Tag
    isBulkTagModalOpen,
    setIsBulkTagModalOpen,
    bulkTagAction,
    setBulkTagAction,
    handleBulkTagApply,

    // Bulk Point
    isBulkPointModalOpen,
    setIsBulkPointModalOpen,
    bulkPointValue,
    setBulkPointValue,
    bulkPointLabel,
    setBulkPointLabel,
    handleBulkPointUpdate,
}) {
    return (
        <>
            {/* IMPORT MODAL (lazy chunk) */}
            <React.Suspense fallback={null}>
                {isImportModalOpen && (
                    <LazyStudentImportModal
                        isOpen={isImportModalOpen}
                        onClose={() => {
                            if (importing) return
                            setIsImportModalOpen(false)
                            importPreview.length && void 0 // just guard
                            setImportFileName('')
                            setImportDragOver(false)
                            setImportStep(1)
                        }}
                        importing={importing}
                        importStep={importStep}
                        setImportStep={setImportStep}
                        importPreview={importPreview}
                        importDuplicates={importDuplicates}
                        importFileName={importFileName}
                        importFileInputRef={importFileInputRef}
                        importDragOver={importDragOver}
                        setImportDragOver={setImportDragOver}
                        processImportFile={processImportFile}
                        classesList={classesList}
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
                        hasImportBlockingErrors={hasImportBlockingErrors}
                        importReadyRows={importReadyRows}
                    />
                )}
            </React.Suspense>

            {/* BULK PHOTO MATCHER */}
            <BulkPhotoModal
                isOpen={isBulkPhotoModalOpen}
                onClose={() => { if (!uploadingBulkPhotos) setIsBulkPhotoModalOpen(false) }}
                matchingPhotos={matchingPhotos}
                handleBulkPhotoMatch={handleBulkPhotoMatch}
                bulkPhotoMatches={bulkPhotoMatches}
                uploadingBulkPhotos={uploadingBulkPhotos}
                handleBulkPhotoUpload={handleBulkPhotoUpload}
            />

            {/* GUARDIAN BROADCAST HUB */}
            <BulkWAModal
                isOpen={isBulkWAModalOpen}
                onClose={() => setIsBulkWAModalOpen(false)}
                selectedStudentsWithPhone={selectedStudentsWithPhone}
                broadcastTemplate={broadcastTemplate}
                setBroadcastTemplate={setBroadcastTemplate}
                customWaMsg={customWaMsg}
                setCustomWaMsg={setCustomWaMsg}
                broadcastIndex={broadcastIndex}
                setBroadcastIndex={setBroadcastIndex}
                buildWAMessage={buildWAMessage}
                openWAForStudent={openWAForStudent}
            />

            {/* EXPORT MODAL (lazy chunk) */}
            <React.Suspense fallback={null}>
                {isExportModalOpen && (
                    <LazyStudentExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => { if (exporting) return; setIsExportModalOpen(false) }}
                        students={students}
                        selectedStudentIds={selectedStudentIds}
                        exportScope={exportScope}
                        setExportScope={setExportScope}
                        exportColumns={exportColumns}
                        setExportColumns={setExportColumns}
                        exporting={exporting}
                        handleExportCSV={handleExportCSV}
                        handleExportExcel={handleExportExcel}
                        handleExportPDF={handleExportPDF}
                        generateStudentPDF={generateStudentPDF}
                        addToast={addToast}
                    />
                )}
            </React.Suspense>

            {/* Student Form Modal */}
            {isModalOpen && (
                <StudentFormModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    selectedStudent={selectedStudent}
                    classesList={classesList}
                    onSubmit={handleSubmit}
                    submitting={submitting}
                    onPhotoUpload={handlePhotoUpload}
                    uploadingPhoto={uploadingPhoto}
                />
            )}

            {/* Print Modal (lazy-loaded) */}
            <React.Suspense fallback={null}>
                {isPrintModalOpen && (
                    <LazyStudentPrintModal
                        isOpen={isPrintModalOpen}
                        onClose={() => {
                            setIsPrintModalOpen(false);
                            if (newlyCreatedStudent) setNewlyCreatedStudent(null);
                        }}
                        selectedStudent={selectedStudent}
                        newlyCreatedStudent={newlyCreatedStudent}
                        isPrivacyMode={isPrivacyMode}
                        maskInfo={maskInfo}
                        addToast={addToast}
                        cardCaptureRef={cardCaptureRef}
                        waTemplate={waTemplate}
                        buildWAMessage={buildWAMessage}
                        openWAForStudent={openWAForStudent}
                        handleResetPin={handleResetPin}
                        resettingPin={resettingPin}
                        generatingPdf={generatingPdf}
                        handlePrintSingle={handlePrintSingle}
                        handleSavePNG={handleSavePNG}
                        handlePrintThermal={handlePrintThermal}
                    />
                )}
            </React.Suspense>

            {/* Profile Modal */}
            <StudentProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                selectedStudent={selectedStudent}
                isPrivacyMode={isPrivacyMode}
                maskInfo={maskInfo}
                calculateCompleteness={calculateCompleteness}
                behaviorHistory={behaviorHistory}
                loadingHistory={loadingHistory}
                RiskThreshold={RiskThreshold}
                canEdit={canEdit}
                handleEdit={handleEdit}
                handleViewQR={handleViewQR}
                profileTab={profileTab}
                setProfileTab={setProfileTab}
                timelineStats={timelineStats}
                timelineFilter={timelineFilter}
                setTimelineFilter={setTimelineFilter}
                timelineVisible={timelineVisible}
                setTimelineVisible={setTimelineVisible}
                timelineFiltered={timelineFiltered}
                raportHistory={raportHistory}
                loadingRaport={loadingRaport}
            />

            {/* Bulk Promote Modal */}
            <BulkPromoteModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                selectedStudentIds={selectedStudentIds}
                bulkClassId={bulkClassId}
                setBulkClassId={setBulkClassId}
                classesList={classesList}
                handleBulkPromote={handleBulkPromote}
                submitting={submitting}
            />

            {/* Delete Modal */}
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                studentToDelete={studentToDelete}
                executeDelete={executeDelete}
            />

            {/* Bulk Delete Modal */}
            <BulkDeleteModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                selectedStudentIds={selectedStudentIds}
                handleBulkDelete={handleBulkDelete}
                submitting={submitting}
            />

            {/* Archived Modal */}
            <ArchivedModal
                isOpen={isArchivedModalOpen}
                onClose={() => setIsArchivedModalOpen(false)}
                archivedStudents={archivedStudents}
                loadingArchived={loadingArchived}
                archivePage={archivePage}
                setArchivePage={setArchivePage}
                archivePageSize={archivePageSize}
                formatRelativeDate={formatRelativeDate}
                handleRestoreStudent={handleRestoreStudent}
                handlePermanentDelete={handlePermanentDelete}
            />

            {/* Class History Modal */}
            <ClassHistoryModal
                isOpen={isClassHistoryModalOpen}
                onClose={() => setIsClassHistoryModalOpen(false)}
                selectedStudent={selectedStudent}
                classHistory={classHistory}
                loadingClassHistory={loadingClassHistory}
                formatRelativeDate={formatRelativeDate}
            />

            {/* Class Breakdown Modal */}
            <ClassBreakdownModal
                isOpen={isClassBreakdownOpen}
                onClose={() => setIsClassBreakdownOpen(false)}
                classBreakdownData={classBreakdownData}
                loadingBreakdown={loadingBreakdown}
                RiskThreshold={RiskThreshold}
                classesList={classesList}
                setFilterClass={setFilterClass}
            />

            {/* Reset Points Modal */}
            <ResetPointsModal
                isOpen={isResetPointsModalOpen}
                onClose={() => setIsResetPointsModalOpen(false)}
                resetPointsClassId={resetPointsClassId}
                setResetPointsClassId={setResetPointsClassId}
                classesList={classesList}
                handleBatchResetPoints={handleBatchResetPoints}
                resettingPoints={resettingPoints}
            />

            {/* Tag Modal */}
            <TagModal
                isOpen={isTagModalOpen}
                onClose={() => setIsTagModalOpen(false)}
                studentForTags={studentForTags}
                newTagInput={newTagInput}
                setNewTagInput={setNewTagInput}
                handleAddCustomTag={handleAddCustomTag}
                handleToggleTag={handleToggleTag}
                getTagColor={getTagColor}
                AvailableTags={AvailableTags}
                allUsedTags={allUsedTags}
                tagToEdit={tagToEdit}
                setTagToEdit={setTagToEdit}
                renameInput={renameInput}
                setRenameInput={setRenameInput}
                handleGlobalRenameTag={handleGlobalRenameTag}
                handleGlobalDeleteTag={handleGlobalDeleteTag}
            />

            {/* Google Sheets Import */}
            <GSheetsImportModal
                isOpen={isGSheetsModalOpen}
                onClose={() => setIsGSheetsModalOpen(false)}
                gSheetsUrl={gSheetsUrl}
                setGSheetsUrl={setGSheetsUrl}
                fetchingGSheets={fetchingGSheets}
                handleFetchGSheets={handleFetchGSheets}
            />

            {/* Photo Zoom Overlay */}
            <PhotoZoomOverlay
                photoZoom={photoZoom}
                setPhotoZoom={setPhotoZoom}
            />

            {/* Bulk Tag Modal */}
            <BulkTagModal
                isOpen={isBulkTagModalOpen}
                onClose={() => setIsBulkTagModalOpen(false)}
                selectedStudentIds={selectedStudentIds}
                bulkTagAction={bulkTagAction}
                setBulkTagAction={setBulkTagAction}
                allUsedTags={allUsedTags}
                getTagColor={getTagColor}
                handleToggleBulkTag={handleBulkTagApply}
            />

            {/* Bulk Point Modal */}
            <BulkPointModal
                isOpen={isBulkPointModalOpen}
                onClose={() => setIsBulkPointModalOpen(false)}
                selectedStudentIds={selectedStudentIds}
                bulkPointValue={bulkPointValue}
                setBulkPointValue={setBulkPointValue}
                bulkPointLabel={bulkPointLabel}
                setBulkPointLabel={setBulkPointLabel}
                handleBulkPointUpdate={handleBulkPointUpdate}
                submitting={submitting}
            />
        </>
    )
}
