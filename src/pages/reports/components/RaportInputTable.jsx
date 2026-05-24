import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowLeft, faSchool, faSpinner, faFloppyDisk, faPrint,
    faMagnifyingGlass, faBolt, faFillDrip, faTriangleExclamation,
    faFileExport, faCheck, faUsers, faCircleCheck,
    faChevronLeft, faChevronRight, faXmark, faArrowTrendUp, faFilePdf,
    faWeightScale, faRulerVertical, faBandage, faCircleExclamation as faExclamation,
    faDoorOpen, faBookOpen, faFileLines, faClipboardList
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { EmptyState } from '../../../components/ui/DataDisplay'
import StudentRow, { ExtraInput, ExtraTextarea } from './RaportRecordRow'
import BulkActionBar from './BulkActionBar'
import { RadarChart } from './RaportCharts'

import {
    KRITERIA, GRADE, BULAN, FISIK_FIELDS, HAFALAN_FIELDS, MAX_SCORE, calcAvg
} from '../utils/raportConstants'
import { isComplete, generateAutoComment } from '../utils/raportHelpers'

const ROW_HEIGHT = 188

export default function RaportInputTable({
    // Context States
    students,
    filteredStudents,
    scores,
    setScores,
    extras,
    setExtras,
    savedIds,
    setSavedIds,
    saving,
    savingAll,
    setSavingAll,
    studentSearch,
    setStudentSearch,
    showIncompleteOnly,
    setShowIncompleteOnly,
    showNoPhoneOnly,
    setShowNoPhoneOnly,
    selectedMonth,
    selectedYear,
    musyrif,
    selectedClass,
    progressPct,
    hasUnsavedMemo,
    noPhoneCount,
    bulkMode,
    setBulkMode,
    bulkValues,
    setBulkValues,
    bulkSelected,
    setBulkSelected,
    visibleRange,
    tableScrollRef,
    mobileActiveIdx,
    setMobileActiveIdx,
    templateOpenId,
    catatanArabMap,
    prevMonthScores,
    studentTrend,
    sendingWA,
    canEdit,
    lang,

    // Actions & Handlers
    setStep,
    setSelectedClassId,
    setPendingNav,
    saveAll,
    saveStudent,
    resetStudent,
    generateAndSendWA,
    handlePDF,
    handleResetStudent,
    handleBulkToggle,
    handleKeyDown,
    handleTemplateToggle,
    handleTemplateApply,
    handleTranslitToggle,
    handleScoreChange,
    handleExtraChange,
    handleCatatanChange,
    triggerAutoSave,
    openStudentDetailDrawer,
    setIsExportModalOpen,
    setWaBlastConfirm,
    addToast,
    setConfirmModal,
    runZipBlast,
    openPrintWindow,
    cellRefs
}) {
    return (
        <div className="space-y-4">
            {/* ── TOOLBAR CONTAINER ── */}
            <div className="pt-2 pb-3 space-y-3 mb-2">
                {/* ── ROW 1: Context + Progress + Actions ── */}
                <div className="w-full flex flex-wrap items-center justify-between gap-3 gap-y-4">
                    {/* Left: Context */}
                    <div className="flex items-center gap-2 overflow-hidden">
                        <button onClick={() => {
                            if (hasUnsavedMemo) {
                                setPendingNav({ action: () => { setStep(0); setSelectedClassId('') } })
                                return
                            }
                            setStep(0); setSelectedClassId('')
                        }} className="h-9 w-9 md:h-10 md:w-auto md:px-4 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all flex items-center justify-center md:gap-1.5 shrink-0">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                            <span className="hidden md:inline text-[10px] font-black uppercase tracking-wider">Ganti Kelas</span>
                        </button>
                        <div className="flex items-center gap-2 px-3 h-9 md:h-10 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shrink-0 overflow-hidden">
                            <FontAwesomeIcon icon={faSchool} className="text-emerald-500 text-[10px] shrink-0" />
                            <div className="flex items-center gap-1.5 truncate">
                                <span className="text-[10px] font-black text-[var(--color-text)] whitespace-nowrap">{selectedClass?.name}</span>
                                <span className="hidden sm:inline w-px h-3 bg-[var(--color-border)] mx-1" />
                                <span className="hidden sm:inline text-[9px] font-bold text-[var(--color-text-muted)] uppercase">{BULAN[selectedMonth - 1]?.id_str} {selectedYear}</span>
                            </div>
                        </div>
                    </div>

                    {/* Middle: Progress (Desktop only) */}
                    <div className="flex-1 min-w-0 hidden lg:flex items-center gap-4 px-4">
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden relative">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : progressPct > 50 ? '#6366f1' : '#f59e0b' }} />
                        </div>
                        <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase whitespace-nowrap">{Math.round(progressPct)}% Input</span>
                    </div>

                    {/* Right: Primary Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={saveAll} disabled={savingAll || !canEdit} className="h-9 px-4 md:h-10 md:px-6 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2 relative disabled:opacity-70 shrink-0">
                            <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin' : ''} />
                            <span className="hidden md:inline">{savingAll ? 'Menyimpan...' : 'Simpan Semua'}</span>
                            {!savingAll && hasUnsavedMemo && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white animate-pulse" />}
                        </button>
                        <button onClick={() => setStep(3)} className="h-9 w-9 md:h-10 md:w-auto md:px-6 rounded-xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center md:gap-2.5 shrink-0">
                            <FontAwesomeIcon icon={faPrint} />
                            <span className="hidden md:inline text-[10px] uppercase font-black tracking-widest">Preview & Cetak</span>
                        </button>
                    </div>
                </div>

                {/* ── ROW 2: Search + Filters + Exports ── */}
                <div className="w-full max-w-full flex md:flex-row flex-col md:items-center gap-2">
                    {/* Search & Nav (Compact Row) */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {/* Navigation Guide (Desktop Only) */}
                        <div className="hidden md:flex items-center gap-2 px-3 h-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                            <FontAwesomeIcon icon={faBolt} className="text-amber-500 text-[10px]" />
                            <span className="text-[9px] font-black text-[var(--color-text-muted)] uppercase">Navigasi:</span>
                            <div className="flex items-center gap-1.5 ml-1">
                                <span className="px-1.5 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px] font-bold">TAB/ENTER</span>
                                <span className="text-[9px] font-bold text-[var(--color-text-muted)]">-</span>
                                <div className="flex items-center gap-0.5">
                                    <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">↑</span>
                                    <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">↓</span>
                                    <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">←</span>
                                    <span className="px-1 py-0.5 rounded border border-[var(--color-border)] bg-[var(--color-surface)] text-[8px]">→</span>
                                </div>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="relative flex-1 md:w-93 shrink-0">
                            <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px] pointer-events-none" />
                            <input type="text" placeholder="Cari santri..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)}
                                className="h-9 md:h-10 w-full pl-8 pr-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-black text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                        </div>
                    </div>

                    {/* Tools & Exports */}
                    <div className="flex-1 flex flex-col md:flex-row md:items-center md:justify-end gap-2">
                        <div className="flex items-center gap-1.5 md:gap-2">
                            <button onClick={() => { setBulkMode(v => !v); setBulkValues({}); setBulkSelected(new Set()) }} className={`h-9 px-4 w-full md:w-auto rounded-xl border text-[10px] font-black flex items-center justify-center md:justify-start gap-2 transition-all ${bulkMode ? 'bg-violet-500 text-white border-violet-500 shadow-md shadow-violet-500/20' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                                <FontAwesomeIcon icon={faFillDrip} className="text-[10px]" />
                                <span>Isi Massal</span>
                            </button>

                            {noPhoneCount > 0 && (
                                <button
                                    onClick={() => { setShowNoPhoneOnly(v => !v); setShowIncompleteOnly(false) }}
                                    className={`h-10 px-4 rounded-xl border text-[10px] font-black hidden md:flex items-center gap-2 transition-all ${showNoPhoneOnly ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'}`}
                                >
                                    <FontAwesomeIcon icon={faExclamation} className="text-[10px]" />
                                    <span className="whitespace-nowrap">{noPhoneCount} Tanpa WA</span>
                                </button>
                            )}
                        </div>

                        <div className="hidden md:block w-px h-4 bg-[var(--color-border)] mx-1" />

                        {/* Export Group */}
                        <div className="grid grid-cols-4 md:flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 md:pb-0">
                            <button onClick={() => setIsExportModalOpen(true)} className="col-span-3 md:col-span-auto h-9 md:px-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black flex items-center justify-center gap-1.5 transition-all hover:bg-indigo-500/20">
                                <FontAwesomeIcon icon={faFileExport} className="text-[10px]" />
                                <span>Export</span>
                            </button>
                            <button onClick={() => {
                                const withPhone = students.filter(s => s.phone && isComplete(scores[s.id] || {}))
                                if (withPhone.length) setWaBlastConfirm({ queue: withPhone })
                            }} className="h-9 md:px-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-black flex items-center justify-center gap-1.5 transition-all hover:bg-green-500/20">
                                <FontAwesomeIcon icon={faWhatsapp} className="text-[12px]" /> <span className="hidden md:inline">Blast WA</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Bulk Action Bar */}
            <BulkActionBar
                selectedCount={bulkSelected.size}
                onSave={async () => {
                    const selected = students.filter(s => bulkSelected.has(s.id))
                    if (!selected.length) return
                    const hasAnyData = (sc, ex) =>
                        KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                        [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                        ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                        ].some(v => v !== '' && v !== null && v !== undefined)
                    const toSave = selected.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
                    if (!toSave.length) { addToast('Santri yang dipilih belum ada yang diisi nilainya', 'warning'); return }
                    setSavingAll(true)
                    try {
                        const payloads = toSave.map(s => {
                            const sc = scores[s.id] || {}, ex = extras[s.id] || {}
                            return {
                                student_id: s.id, month: selectedMonth, year: selectedYear,
                                musyrif_name: musyrif, updated_by: null, updated_by_name: null,
                                ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                                berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null,
                                tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null,
                                ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null,
                                hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0,
                                hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0,
                                hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0,
                                hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0,
                                catatan: ex.catatan || null
                            }
                        })
                        const { data: upserted, error } = await supabase.from('student_monthly_reports').upsert(payloads, { onConflict: 'student_id,month,year' }).select('id, student_id')
                        if (error) throw error
                        if (upserted?.length) {
                            setSavedIds(prev => { const n = new Set(prev); toSave.forEach(s => n.add(s.id)); return n })
                        }
                        const skipped = selected.length - toSave.length
                        addToast(skipped > 0 ? `${toSave.length} disimpan, ${skipped} dilewati (kosong)` : `${toSave.length} raport tersimpan`, 'success')
                        setBulkSelected(new Set())
                    } catch (e) { addToast('Gagal simpan: ' + e.message, 'error') }
                    finally { setSavingAll(false) }
                }}
                onWA={() => {
                    const withPhone = students.filter(s => bulkSelected.has(s.id) && s.phone && isComplete(scores[s.id] || {}))
                    if (!withPhone.length) { addToast('Tidak ada santri terpilih dengan WA & nilai lengkap', 'warning'); return }
                    setWaBlastConfirm({ queue: withPhone })
                }}
                onExport={() => {
                    const toExport = students.filter(s => bulkSelected.has(s.id) && isComplete(scores[s.id] || {}))
                    if (!toExport.length) { addToast('Tidak ada santri terpilih dengan nilai lengkap', 'warning'); return }
                    runZipBlast(toExport, null)
                }}
                onCancel={() => {
                    setBulkSelected(new Set())
                    setBulkMode(false)
                }}
            />

            {bulkMode && (
                <div className="p-3 rounded-xl border border-violet-500/20 bg-violet-500/5 space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faFillDrip} className="text-violet-500 text-[10px]" />
                        </div>
                        <div className="flex flex-col gap-0">
                            <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">Isi Massal Nilai</span>
                            <span className="text-[9px] text-[var(--color-text-muted)] leading-tight">Berlaku hanya untuk kolom yang masih kosong.</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-end gap-2 md:gap-3">
                        {KRITERIA.map(k => (
                            <div key={k.key} className="flex flex-col gap-1 flex-1 min-w-[70px]">
                                <span className="text-[9px] font-black uppercase tracking-tight truncate opacity-80" style={{ color: k.color }}>{k.id}</span>
                                <input type="number" min={0} max={MAX_SCORE} placeholder="—"
                                    value={bulkValues[k.key] ?? ''}
                                    onChange={e => setBulkValues(prev => ({ ...prev, [k.key]: e.target.value === '' ? '' : Math.min(MAX_SCORE, Math.max(0, Number(e.target.value))) }))}
                                    className="w-full h-8 text-center text-[11px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 pt-0.5">
                        <button onClick={() => {
                            const keys = Object.keys(bulkValues).filter(k => bulkValues[k] !== '')
                            if (!keys.length) { addToast('Isi minimal satu nilai', 'warning'); return }
                            const changedIds = students
                                .filter(s => {
                                    const cur = scores[s.id] || {}
                                    return keys.some(k => cur[k] === '' || cur[k] === null || cur[k] === undefined)
                                })
                                .map(s => s.id)
                            if (!changedIds.length) {
                                addToast('Semua kolom sudah memiliki nilai', 'warning')
                                return
                            }
                            setScores(prev => {
                                const next = { ...prev }
                                for (const s of students) {
                                    const cur = next[s.id] || {}
                                    const updated = { ...cur }
                                    let changed = false
                                    for (const k of keys) {
                                        if (cur[k] === '' || cur[k] === null || cur[k] === undefined) {
                                            updated[k] = bulkValues[k]; changed = true
                                        }
                                    }
                                    if (changed) next[s.id] = updated
                                }
                                return next
                            })
                            changedIds.forEach(id => {
                                setSavedIds(p => { const n = new Set(p); n.delete(id); return n })
                                triggerAutoSave(id)
                            })
                            addToast(`Berhasil diterapkan ke ${changedIds.length} santri`, 'success')
                            setBulkMode(false)
                        }} className="flex-1 md:flex-none h-8 px-5 rounded-lg bg-violet-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-violet-700 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm">
                            <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Terapkan
                        </button>
                        <button onClick={() => setBulkValues({})} className="h-8 px-3 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">Reset</button>
                    </div>
                </div>
            )}

            {/* Desktop Table View */}
            <div className="hidden md:block">
                <div
                    ref={tableScrollRef}
                    className="overflow-x-auto rounded-xl border border-[var(--color-border)]"
                    style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto', overflowAnchor: 'none' }}
                >
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 910, tableLayout: 'fixed' }}>
                        <colgroup>
                            {bulkMode && <col style={{ width: 36 }} />}
                            <col style={{ width: 140 }} />{KRITERIA.map(k => <col key={k.key} style={{ width: 55 }} />)}<col style={{ width: 170 }} /><col style={{ width: 160 }} /><col style={{ width: 130 }} />
                        </colgroup>
                        <thead className="sticky top-0 z-20" style={{ boxShadow: '0 1px 0 var(--color-border)' }}>
                            <tr style={{ background: 'none' }}>
                                {bulkMode && (
                                    <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                        <input type="checkbox"
                                            checked={bulkSelected.size === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={e => setBulkSelected(e.target.checked ? new Set(filteredStudents.map(s => s.id)) : new Set())}
                                            aria-label="Pilih semua"
                                            className="w-3.5 h-3.5 accent-violet-500 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] sticky left-0 z-10" style={{ background: 'var(--color-surface-alt)', padding: '10px 0', textAlign: 'center', verticalAlign: 'middle', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>Santri</th>
                                {KRITERIA.map(k => (<th key={k.key} style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ direction: 'rtl', fontSize: 14, fontWeight: 900, color: k.color, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: 'serif' }}>{k.arShort}</span><span style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{k.id}</span></div></th>))}
                                <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fisik</span><span style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.55, fontWeight: 600 }}>BB · TB · Skt · Izin · Alpa · Plg</span></div></th>
                                <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Hafalan & Catatan</span></div></th>
                                <th className="sticky right-0 z-10" style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1, background: 'var(--color-surface-alt)', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length > 20 && visibleRange.start > 0 && (
                                <tr style={{ height: visibleRange.start * ROW_HEIGHT }}><td colSpan={99} /></tr>
                            )}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={99} className="py-20 text-center">
                                        <EmptyState
                                            icon={faUsers}
                                            title={showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : 'Santri tidak ditemukan'}
                                            subtitle={showIncompleteOnly ? 'Tidak ada santri yang nilainya belum diisi.' : 'Coba kata kunci lain atau hapus filter.'}
                                        />
                                        <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }}
                                            className="h-8 px-4 rounded-lg border border-[var(--color-border)] text-[11px] font-black hover:bg-[var(--color-surface-alt)] transition-all">
                                            Tampilkan Semua
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {(filteredStudents.length > 20
                                ? filteredStudents.slice(visibleRange.start, visibleRange.end)
                                : filteredStudents
                            ).map((student, _vi) => {
                                const si = filteredStudents.length > 20 ? visibleRange.start + _vi : _vi
                                const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                                return (
                                    <StudentRow key={student.id}
                                        student={student} si={si} sc={sc} ex={ex}
                                        isSaved={savedIds.has(student.id)}
                                        isSaving={!!saving[student.id]}
                                        isDirty={!savedIds.has(student.id) && (KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null) || Object.values(ex).some(v => v !== '' && v !== null))}
                                        isChecked={bulkSelected.has(student.id)}
                                        bulkMode={bulkMode} lang={lang}
                                        trendData={studentTrend[student.id]}
                                        prevScores={prevMonthScores[student.id]}
                                        templateOpen={templateOpenId === student.id}
                                        catatanArab={catatanArabMap[student.id]}
                                        sendingWAStatus={sendingWA[student.id]}
                                        onScoreChange={handleScoreChange}
                                        onExtraChange={handleExtraChange}
                                        onCatatanChange={handleCatatanChange}
                                        onSave={saveStudent}
                                        onWA={generateAndSendWA}
                                        onPDF={handlePDF}
                                        onReset={handleResetStudent}
                                        onBulkToggle={handleBulkToggle}
                                        onKeyDown={handleKeyDown}
                                        onTemplateToggle={handleTemplateToggle}
                                        onTemplateApply={handleTemplateApply}
                                        onTranslitToggle={handleTranslitToggle}
                                        cellRefs={cellRefs}
                                    />
                                )
                            })}
                            {filteredStudents.length > 20 && visibleRange.end < filteredStudents.length && (
                                <tr style={{ height: (filteredStudents.length - visibleRange.end) * ROW_HEIGHT }}><td colSpan={99} /></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden">
                {filteredStudents.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12 text-[var(--color-text-muted)]">
                        <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                            <FontAwesomeIcon icon={showIncompleteOnly ? faCircleCheck : showNoPhoneOnly ? faCircleCheck : faMagnifyingGlass} className="text-xl opacity-30" />
                        </div>
                        <p className="text-[12px] font-black">{showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : showNoPhoneOnly ? 'Semua santri sudah ada nomor WA ✓' : 'Santri tidak ditemukan'}</p>
                        <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }} className="h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">Tampilkan Semua</button>
                    </div>
                ) : (() => {
                    const safeIdx = Math.min(mobileActiveIdx, filteredStudents.length - 1)
                    const student = filteredStudents[safeIdx]
                    if (!student) return null
                    const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                    const avg = calcAvg(sc), isSaved = savedIds.has(student.id), isSaving = saving[student.id]
                    const isDirty = !isSaved && KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined)
                    const complete = isComplete(sc)
                    const goTo = (idx) => setMobileActiveIdx(Math.max(0, Math.min(filteredStudents.length - 1, idx)))
                    let _touchStartX = 0
                    const onTouchStart = (e) => { _touchStartX = e.touches[0].clientX }
                    const onTouchEnd = (e) => { const dx = e.changedTouches[0].clientX - _touchStartX; if (dx < -50) goTo(safeIdx + 1); else if (dx > 50) goTo(safeIdx - 1) }
                    return (
                        <div>
                            {/* Sticky nama + counter */}
                            <div className="sticky top-0 z-20 flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl border bg-[var(--color-surface)] shadow-sm"
                                style={{ borderColor: complete ? '#10b98130' : isDirty ? '#f59e0b30' : 'var(--color-border)' }}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] shrink-0">{safeIdx + 1}/{filteredStudents.length}</span>
                                    <p className="text-[12px] font-black text-[var(--color-text)] truncate">{student.name}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {avg ? <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).uiColor }}>{avg}</span> : null}
                                    {complete && <FontAwesomeIcon icon={faCircleCheck} className="text-[10px] text-emerald-500" />}
                                    {isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[9px] text-amber-500 animate-spin" />}
                                    {!isSaving && isDirty && <span className="text-[8px] font-black text-amber-500">●</span>}
                                    <button onClick={() => openStudentDetailDrawer(student)}
                                        title="Histori semua raport santri ini"
                                        className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 transition-all">
                                        <FontAwesomeIcon icon={faArrowTrendUp} className="text-[9px]" />
                                    </button>
                                </div>
                            </div>

                            {/* Card dengan swipe gesture */}
                            <div className="rounded-2xl border bg-[var(--color-surface)] overflow-hidden transition-all"
                                style={{ borderColor: complete ? '#10b98130' : isDirty ? '#f59e0b30' : 'var(--color-border)' }}
                                onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
                                {/* Header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]"
                                    style={{ background: complete ? '#10b98008' : 'var(--color-surface-alt)' }}>
                                    {bulkMode && <input type="checkbox" checked={bulkSelected.has(student.id)}
                                        onChange={e => setBulkSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(student.id) : n.delete(student.id); return n })}
                                        className="w-4 h-4 accent-violet-500" />}
                                    <RadarChart scores={sc} size={38} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-black text-[var(--color-text)] truncate">{student.name}</p>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            {avg ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).uiColor }}>{avg} — {GRADE(Number(avg)).id}</span>
                                                : <span className="text-[9px] text-[var(--color-text-muted)]">Belum diisi</span>}
                                            {isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[9px] text-amber-500 animate-spin" />}
                                            {!isSaving && isSaved && <FontAwesomeIcon icon={faCircleCheck} className="text-[9px] text-emerald-500" />}
                                            {!isSaving && isDirty && <span className="text-[8px] font-black text-amber-500">● belum simpan</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => saveStudent(student.id)} disabled={isSaving || !canEdit}
                                        className="h-8 px-2.5 rounded-xl text-[10px] font-black flex items-center gap-1 shrink-0 transition-all"
                                        style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: `1px solid ${isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)'}` }}>
                                        <FontAwesomeIcon icon={isSaving ? faSpinner : isSaved ? faCircleCheck : faFloppyDisk} className={isSaving ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                {/* Body */}
                                <div className="px-4 py-3 space-y-3">
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Nilai Kriteria</p>
                                        <div className="grid grid-cols-5 gap-1.5">
                                            {KRITERIA.map(k => (
                                                <div key={k.key} className="flex flex-col items-center gap-0.5">
                                                    <span className="text-[7px] font-black uppercase tracking-wide" style={{ color: k.color }}>{k.id.slice(0, 3)}</span>
                                                    <input type="number" inputMode="decimal" min={0} max={MAX_SCORE} placeholder="—"
                                                        value={sc[k.key] ?? ''}
                                                        onChange={e => { const v = e.target.value === '' ? '' : Math.min(MAX_SCORE, Math.max(0, Number(e.target.value))); setScores(prev => ({ ...prev, [student.id]: { ...prev[student.id], [k.key]: v } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }}
                                                        className="w-full h-10 text-center text-base font-black rounded-xl outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                        style={{ background: sc[k.key] !== '' && sc[k.key] != null ? GRADE(Number(sc[k.key])).bg : 'var(--color-surface-alt)', color: sc[k.key] !== '' && sc[k.key] != null ? GRADE(Number(sc[k.key])).uiColor : 'var(--color-text-muted)', border: `2px solid ${sc[k.key] !== '' && sc[k.key] != null ? GRADE(Number(sc[k.key])).border : 'var(--color-border)'}` }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5 flex justify-between items-center">
                                            <span>Fisik & Kehadiran</span>
                                            <span className="text-[7px] opacity-40 font-medium uppercase">BB • TB • SAKIT • IZIN • ALPA • PULANG</span>
                                        </p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[{ key: 'berat_badan', label: 'Berat Badan', icon: faWeightScale, color: '#6366f1', unit: 'kg' }, { key: 'tinggi_badan', label: 'Tinggi Badan', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' }, { key: 'hari_sakit', label: 'Sakit', icon: faBandage, color: '#ef4444', unit: 'hr' }, { key: 'hari_izin', label: 'Izin', icon: faExclamation, color: '#f59e0b', unit: 'hr' }, { key: 'hari_alpa', label: 'Alpa', icon: faExclamation, color: '#ef4444', unit: 'hr' }, { key: 'hari_pulang', label: 'Pulang', icon: faDoorOpen, color: '#8b5cf6', unit: 'x' }].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden bg-[var(--color-surface-alt)]" style={{ height: 32 }}>
                                                    <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                    <ExtraInput type="text" inputMode="decimal" placeholder={f.label} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                        className="flex-1 w-0 h-full text-[11px] font-black text-left px-1.5 bg-transparent text-[var(--color-text)] outline-none" />
                                                    <span className="text-[7px] font-black text-[var(--color-text-muted)] pr-1.5 opacity-60 uppercase">{f.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {[{ key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981' }, { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6' }].map(f => (
                                            <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden" style={{ height: 32 }}>
                                                <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                <ExtraInput placeholder={f.ph} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                    className="flex-1 w-0 h-full px-1.5 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                                        <div className="w-7 shrink-0 flex items-start justify-center pt-2" style={{ background: '#f59e0b18' }}><FontAwesomeIcon icon={faClipboardList} style={{ color: '#f59e0b', fontSize: 9 }} /></div>
                                        <ExtraTextarea placeholder="Catatan musyrif..." value={ex.catatan ?? ''} studentId={student.id} fieldKey="catatan" onCommit={handleCatatanChange}
                                            maxLength={200} rows={2} className="flex-1 w-0 px-2 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                                        <button
                                            onClick={() => { const c = generateAutoComment(sc, student.id, studentTrend[student.id]); if (!c) return; setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], catatan: c } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }}
                                            title="Generate komentar otomatis" disabled={!avg}
                                            className="shrink-0 w-8 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-30" aria-label="Generate komentar otomatis">
                                            <FontAwesomeIcon icon={faBolt} style={{ fontSize: 10 }} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button onClick={() => { setPreviewStudentId(student.id); setStep(3) }} className="flex-1 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[11px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all"><FontAwesomeIcon icon={faFilePdf} className="text-[10px]" /> PDF</button>
                                        <button onClick={() => generateAndSendWA(student)} disabled={!student.phone}
                                            className={`flex-1 h-9 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1.5 transition-all ${!student.phone ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]' : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'}`}>
                                            <FontAwesomeIcon icon={faWhatsapp} className="text-[10px]" /> WA
                                        </button>
                                        <button onClick={() => setConfirmModal({ title: 'Reset Nilai?', subtitle: `Semua data ${student.name.split(' ')[0]} akan dikosongkan`, body: 'Nilai akan dihapus permanen.', icon: 'danger', variant: 'red', confirmLabel: 'Ya, Reset', onConfirm: () => { setConfirmModal(null); resetStudent(student.id) } })}
                                            className="h-9 w-9 rounded-xl border border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-red-500 hover:border-red-500/30 flex items-center justify-center transition-all">
                                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Prominent prev/next navigation */}
                            <div className="flex gap-2 mt-3">
                                <button onClick={() => goTo(safeIdx - 1)} disabled={safeIdx === 0}
                                    className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 transition-all">
                                    <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> Sebelumnya
                                </button>
                                <div className="flex items-center gap-1 px-1">
                                    {filteredStudents.length <= 9
                                        ? filteredStudents.map((_, i) => (
                                            <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all"
                                                style={{ width: i === safeIdx ? 10 : 6, height: i === safeIdx ? 10 : 6, background: i === safeIdx ? 'var(--color-primary)' : 'var(--color-border)' }} />
                                        ))
                                        : <span className="text-[9px] font-black text-[var(--color-text-muted)] whitespace-nowrap">{safeIdx + 1}/{filteredStudents.length}</span>
                                    }
                                </div>
                                <button onClick={() => goTo(safeIdx + 1)} disabled={safeIdx === filteredStudents.length - 1}
                                    className="flex-1 h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black flex items-center justify-center gap-2 hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] disabled:opacity-30 transition-all">
                                    Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                                </button>
                            </div>
                        </div>
                    )
                })()}
            </div>

            {/* Averages display */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {KRITERIA.map(k => { const vals = filteredStudents.map(s => scores[s.id]?.[k.key]).filter(v => v !== '' && v !== null && v !== undefined); const avg = vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : '—'; const g = avg !== '—' ? GRADE(Number(avg)) : null; return (<div key={k.key} className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center"><div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: k.color }}>{k.id}</div><div className="text-lg font-black" style={{ color: g?.uiColor || 'var(--color-text-muted)' }}>{avg}</div><div className="text-[7px] font-bold text-[var(--color-text-muted)]">Rata - Rata Kelas</div></div>) })}
            </div>
        </div>
    )
}
