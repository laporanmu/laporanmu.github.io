import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowLeft, faSliders, faFileZipper, faPrint, faCircleCheck,
    faClipboardList, faUsers, faSearch, faChevronDown, faChevronLeft,
    faChevronRight, faXmark, faExpand, faTableList,
    faChartPie, faBoxArchive, faBolt, faMagnifyingGlass, faCircleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { EmptyState, Skeleton } from '@shared/components'
import RaportPrintCard from './RaportPrintCard'

import {
    KRITERIA, GRADE, BULAN, FISIK_FIELDS, HAFALAN_FIELDS, LABEL
} from '@utils/reports/raportConstants'
import { isComplete, generateAutoComment } from '@utils/reports/raportHelpers'

export default function RaportArchive({
    archiveList,
    archiveLoading,
    archiveFilter,
    setArchiveFilter,
    archiveSearch,
    setArchiveSearch,
    archiveSort,
    archiveTab,
    setArchiveTab,
    archiveVisibleCount,
    setArchiveVisibleCount,
    archivePreview,
    setArchivePreview,
    previewStudentId,
    setPreviewStudentId,
    archiveEditMode,
    setArchiveEditMode,
    archiveEditScores,
    setArchiveEditScores,
    archiveEditExtras,
    setArchiveEditExtras,
    archiveEditSaving,
    archiveStatusFilter,
    archiveMinAvg,

    // Actions & Helpers
    loadArchiveDetail,
    saveArchiveEdit,
    exportBulkPDF,
    setConfirmDelete,
    runZipBlast,
    openPrintWindow,
    sendWATextOnly,
    pageSize,
    setPageSize,
    lang,
    setLang,
    previewZoom,
    setPreviewZoom,
    setIsFullScreenPreview,
    settings,
    setStep,
    previewContainerRef,
    manualZoomRef
}) {
    const _minAvgNum = archiveMinAvg !== '' ? Number(archiveMinAvg) : null
    let filtered = archiveList.filter(e =>
        (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
        (!archiveFilter.year || String(e.year) === String(archiveFilter.year)) &&
        (!archiveFilter.month || String(e.month) === String(archiveFilter.month)) &&
        (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase())) &&
        (archiveStatusFilter === 'all' || (archiveStatusFilter === 'complete' ? e.completed === e.count && e.count > 0 : e.completed < e.count)) &&
        (_minAvgNum === null || (e.count > 0 && (e.completed / e.count) * 100 < _minAvgNum))
    )
    if (archiveSort === 'oldest') filtered = [...filtered].sort((a, b) => a.year - b.year || a.month - b.month)
    else if (archiveSort === 'name') filtered = [...filtered].sort((a, b) => a.class_name.localeCompare(b.class_name))
    else if (archiveSort === 'progress') filtered = [...filtered].sort((a, b) => (b.count ? b.completed / b.count : 0) - (a.count ? a.completed / a.count : 0))
    const uniqueYears = [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)

    const cardsToRender = filtered.slice(0, archiveVisibleCount)

    if (archivePreview) {
        const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass } = archivePreview
        const editSc = (sid) => archiveEditMode ? { ...pSc[sid], ...(archiveEditScores[sid] || {}) } : pSc[sid]
        const editEx = (sid) => archiveEditMode ? { ...pEx[sid], ...(archiveEditExtras[sid] || {}) } : pEx[sid]
        const pStudent = previewStudentId ? pStu.find(s => s.id === previewStudentId) : pStu[0]

        const handleScoreEdit = (key, val) => {
            const raw = val.replace(/[^0-9]/g, '')
            if (raw === '') {
                setArchiveEditScores(prev => ({
                    ...prev,
                    [pStudent.id]: {
                        ...(prev[pStudent.id] || {}),
                        [key]: ''
                    }
                }))
                return
            }
            const num = Number(raw)
            const checkedNum = Math.min(100, Math.max(0, num))
            setArchiveEditScores(prev => ({
                ...prev,
                [pStudent.id]: {
                    ...(prev[pStudent.id] || {}),
                    [key]: checkedNum
                }
            }))
        }

        const handleExtraEdit = (key, val) => {
            setArchiveEditExtras(prev => ({
                ...prev,
                [pStudent.id]: {
                    ...(prev[pStudent.id] || {}),
                    [key]: val
                }
            }))
        }

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { setArchivePreview(null); setArchiveEditMode(false) }} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                        </button>
                        <div>
                            <h3 className="text-base font-black text-[var(--color-text)]">{archivePreview.entry.class_name}</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{BULAN.find(b => b.id === archivePreview.entry.month)?.id_str} {archivePreview.entry.year} · {pStu.length} Santri</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setArchiveEditMode(!archiveEditMode)} className={`h-9 px-4 rounded-xl border text-xs font-black transition-all ${archiveEditMode ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-violet-500/10 border-violet-500/20 text-violet-600 hover:bg-violet-500/20'}`}>
                            <FontAwesomeIcon icon={faSliders} className="mr-2" /> {archiveEditMode ? 'Selesai Edit' : 'Edit Arsip'}
                        </button>
                        <button onClick={() => runZipBlast(pStu, archivePreview.entry)} className="h-9 px-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 text-xs font-black hover:bg-teal-500/20 transition-all">
                            <FontAwesomeIcon icon={faFileZipper} className="mr-2" /> ZIP PDF
                        </button>
                        <button onClick={() => openPrintWindow(pStu)} className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-xs font-black hover:bg-indigo-600 transition-all flex items-center gap-2">
                            <FontAwesomeIcon icon={faPrint} /> Cetak Semua
                        </button>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Left: Sidebar Navigation */}
                    <div className="w-full lg:w-64 xl:w-72 p-4 lg:p-5 rounded-3xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm self-start lg:sticky lg:top-6">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Pilih Santri</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-black">{pStu.length}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                            {pStu.map(s => {
                                const sc = editSc(s.id) || {}
                                const complete = isComplete(sc)
                                const active = previewStudentId === s.id
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => setPreviewStudentId(s.id)}
                                        className={`w-full p-2.5 rounded-xl border text-left transition-all ${active ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/15' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-indigo-500/30'}`}
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-white/20' : 'bg-[var(--color-surface-alt)]'}`}>
                                                <span className={`text-[9px] font-black ${active ? 'text-white' : 'text-indigo-500'}`}>{s.name.charAt(0)}</span>
                                            </div>
                                            <span className="text-[11px] font-bold truncate flex-1">{s.name}</span>
                                            {complete && <FontAwesomeIcon icon={faCircleCheck} className={`text-[10px] ${active ? 'text-white' : 'text-emerald-500'}`} />}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Right: Preview Area */}
                    <div className="flex-1 min-w-0">
                        {pStudent && (
                            <div className="space-y-4">
                                {archiveEditMode ? (
                                    <div className="p-6 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-md animate-fade-in space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                                                <FontAwesomeIcon icon={faSliders} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-[var(--color-text)]">Edit Mode: {pStudent.name}</h4>
                                                <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Ubah nilai dan data tambahan untuk periode ini.</p>
                                            </div>
                                        </div>

                                        {/* Nilai Kriteria */}
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                <FontAwesomeIcon icon={faClipboardList} className="opacity-50" /> Nilai Kriteria
                                            </h5>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {KRITERIA.map(k => {
                                                    const val = editSc(pStudent.id)?.[k.key] ?? '';
                                                    const g = val !== '' ? GRADE(Number(val)) : null;
                                                    return (
                                                        <div key={k.key} className="flex flex-col p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] shadow-sm">
                                                            <span className="text-[9px] font-black" style={{ color: k.color }}>{k.id}</span>
                                                            <span className="text-[7px] text-[var(--color-text-muted)] font-medium leading-none mb-1.5 truncate">{k.label}</span>
                                                            <div className="flex items-center gap-1.5 mt-auto">
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={val}
                                                                    onChange={(e) => handleScoreEdit(k.key, e.target.value)}
                                                                    className="w-full h-8 text-center text-[12px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] focus:border-indigo-500 outline-none text-[var(--color-text)]"
                                                                    placeholder="—"
                                                                />
                                                                {g && (
                                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded shrink-0" style={{ background: g.bg, color: g.color }}>
                                                                        {g.id}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>

                                        {/* Kondisi Fisik & Perkembangan Hafalan */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* Fisik */}
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kondisi Fisik</h5>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {FISIK_FIELDS.map(f => (
                                                        <div key={f.key} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 h-10">
                                                            <FontAwesomeIcon icon={f.icon} style={{ color: f.color }} className="text-xs shrink-0 opacity-80" />
                                                            <input
                                                                type="number"
                                                                inputMode="decimal"
                                                                placeholder={f.label}
                                                                value={editEx(pStudent.id)?.[f.key] ?? ''}
                                                                onChange={(e) => handleExtraEdit(f.key, e.target.value)}
                                                                className="flex-1 w-0 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none"
                                                            />
                                                            <span className="text-[9px] text-[var(--color-text-muted)] font-black">{f.unit}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Hafalan */}
                                            <div className="space-y-2">
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Perkembangan Hafalan</h5>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {HAFALAN_FIELDS.map(f => (
                                                        <div key={f.key} className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 h-10">
                                                            <FontAwesomeIcon icon={f.icon} style={{ color: f.color }} className="text-xs shrink-0 opacity-80" />
                                                            <input
                                                                type="text"
                                                                placeholder={f.ph}
                                                                value={editEx(pStudent.id)?.[f.key] ?? ''}
                                                                onChange={(e) => handleExtraEdit(f.key, e.target.value)}
                                                                className="flex-1 w-0 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ketidakhadiran */}
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Ketidakhadiran</h5>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { key: 'hari_sakit', label: 'Sakit', color: '#ef4444' },
                                                    { key: 'hari_izin', label: 'Izin', color: '#3b82f6' },
                                                    { key: 'hari_alpa', label: 'Alpa', color: '#f59e0b' },
                                                    { key: 'hari_pulang', label: 'Pulang', color: '#10b981' }
                                                ].map(item => (
                                                    <div key={item.key} className="flex flex-col p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center">
                                                        <span className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-wider mb-1">{item.label}</span>
                                                        <div className="flex items-center justify-center gap-1">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={editEx(pStudent.id)?.[item.key] ?? ''}
                                                                onChange={(e) => handleExtraEdit(item.key, e.target.value)}
                                                                className="w-10 h-7 text-center text-[11px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none"
                                                                placeholder="0"
                                                            />
                                                            <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Hari</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Catatan Musyrif */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Catatan Musyrif</h5>
                                                <button
                                                    onClick={() => {
                                                        const c = generateAutoComment(editSc(pStudent.id), pStudent.id, []);
                                                        if (c) handleExtraEdit('catatan', c);
                                                    }}
                                                    className="h-6 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 text-[8px] font-black flex items-center gap-1 transition-all active:scale-95 flex-shrink-0"
                                                >
                                                    <FontAwesomeIcon icon={faBolt} className="text-[7px]" />
                                                    Generate Catatan
                                                </button>
                                            </div>
                                            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] overflow-hidden">
                                                <textarea
                                                    placeholder="Tulis catatan perkembangan di sini..."
                                                    value={editEx(pStudent.id)?.catatan ?? ''}
                                                    onChange={(e) => handleExtraEdit('catatan', e.target.value)}
                                                    maxLength={200}
                                                    rows={3}
                                                    className="w-full p-3 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-relaxed"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button onClick={saveArchiveEdit} disabled={archiveEditSaving} className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-500/10 hover:bg-emerald-600 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-2">
                                                {archiveEditSaving ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col rounded-[32px] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm">
                                        <div className="px-4 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center justify-between w-full sm:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-indigo-500 text-[10px]" />
                                                    </div>
                                                    <h4 className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">Preview Raport</h4>
                                                </div>
                                                <button
                                                    onClick={() => setIsFullScreenPreview(true)}
                                                    className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center sm:hidden"
                                                >
                                                    <FontAwesomeIcon icon={faExpand} className="scale-75" />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                        <button onClick={() => setPageSize('a4')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'a4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>A4</button>
                                                        <button onClick={() => setPageSize('f4')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${pageSize === 'f4' ? 'bg-amber-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>F4</button>
                                                    </div>
                                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                        <button onClick={() => setLang('ar')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'ar' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>AR</button>
                                                        <button onClick={() => setLang('id')} className={`flex-1 sm:px-3 h-8 rounded-lg text-[10px] font-black transition-all ${lang === 'id' ? 'bg-indigo-500 text-white shadow-sm' : 'text-[var(--color-text-muted)]'}`}>ID</button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                        <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.max(0.3, p - 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><FontAwesomeIcon icon={faSearch} className="scale-75" />-</button>
                                                        <button
                                                            onClick={() => {
                                                                manualZoomRef.current = false
                                                                const el = previewContainerRef.current
                                                                if (!el) return
                                                                const padding = window.innerWidth < 640 ? 24 : 80
                                                                const availW = el.clientWidth - padding
                                                                const docW = pageSize === 'f4' ? 215 * 3.7795275591 : 210 * 3.7795275591
                                                                setPreviewZoom(Math.min(1, Math.max(0.3, Math.floor((availW / docW) * 100) / 100)))
                                                            }}
                                                            title="Fit ke lebar layar"
                                                            className="text-[9px] font-black w-10 text-center text-indigo-500 tabular-nums hover:text-indigo-700 transition-colors cursor-pointer select-none"
                                                        >{Math.round(previewZoom * 100)}%</button>
                                                        <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.min(1.5, p + 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><FontAwesomeIcon icon={faSearch} className="scale-75" />+</button>
                                                    </div>

                                                    {pStudent?.phone && (
                                                        <button onClick={() => sendWATextOnly(pStudent)} className="h-10 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial">
                                                            <FontAwesomeIcon icon={faWhatsapp} className="text-xs" /> <span className="hidden xs:inline">Whatsapp</span>
                                                        </button>
                                                    )}

                                                    <button onClick={() => openPrintWindow([pStudent].filter(Boolean))} className="h-10 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-lg shadow-emerald-500/20">
                                                        <FontAwesomeIcon icon={faPrint} className="text-xs" /> <span className="hidden xs:inline">Cetak</span>
                                                    </button>

                                                    <button
                                                        onClick={() => setIsFullScreenPreview(true)}
                                                        className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hidden sm:flex items-center justify-center hover:text-indigo-500 transition-all"
                                                    >
                                                        <FontAwesomeIcon icon={faExpand} className="scale-90" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-900/50 flex flex-col items-center custom-scrollbar p-6 min-h-[500px]">
                                            <div
                                                style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}
                                                className="shadow-2xl h-fit cursor-pointer relative"
                                                onClick={() => setIsFullScreenPreview(true)}
                                            >
                                                <div className="lg:hidden absolute inset-0 rounded-none ring-2 ring-indigo-400/40 animate-pulse pointer-events-none z-10" />
                                                <RaportPrintCard
                                                    student={pStudent}
                                                    scores={pSc[pStudent.id]}
                                                    extra={pEx[pStudent.id]}
                                                    bulanObj={pBulan}
                                                    tahun={pTahun}
                                                    musyrif={pMus}
                                                    className={pClass}
                                                    lang={lang}
                                                    settings={settings}
                                                    pageSize={pageSize}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep(0)} className="w-10 h-10 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] flex items-center justify-center transition-all">
                        <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
                    </button>
                    <div>
                        <h3 className="text-base font-black text-[var(--color-text)]">Riwayat & Arsip</h3>
                        <p className="text-[11px] text-[var(--color-text-muted)] font-medium">Lihat dan kelola database raport yang telah disimpan.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] shadow-sm">
                    {[{ id: 'list', label: 'Daftar Arsip', icon: faTableList }, { id: 'ringkasan', label: 'Statistik', icon: faChartPie }].map(tab => (
                        <button key={tab.id} onClick={() => setArchiveTab(tab.id)}
                            className={`h-9 px-4 rounded-xl text-[11px] font-black flex items-center gap-2 transition-all ${archiveTab === tab.id ? 'bg-[var(--color-surface)] text-indigo-500 shadow-md border border-[var(--color-border)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={tab.icon} className="text-[10px]" /> {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <div className="relative flex-1 min-w-[200px]">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[11px]" />
                    <input type="text" placeholder="Cari kelas..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all" />
                </div>
                <select value={archiveFilter.year} onChange={e => setArchiveFilter(p => ({ ...p, year: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none">
                    <option value="">Semua Tahun</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={archiveFilter.month} onChange={e => setArchiveFilter(p => ({ ...p, month: e.target.value }))} className="h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-bold text-[var(--color-text)] outline-none">
                    <option value="">Semua Bulan</option>
                    {BULAN.map(b => <option key={b.id} value={b.id}>{b.id_str}</option>)}
                </select>
            </div>

            {archiveLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <Skeleton className="h-3 w-2/3 rounded mb-2" />
                                    <Skeleton className="h-2.5 w-1/2 rounded" />
                                </div>
                                <Skeleton className="h-4 w-12 rounded-full" />
                            </div>
                            <Skeleton className="h-1.5 w-full rounded-full mb-3" />
                            <div className="flex gap-1.5">
                                <Skeleton className="flex-1 h-8 rounded-lg" />
                                <Skeleton className="flex-1 h-8 rounded-lg" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : archiveTab === 'ringkasan' ? (() => {
                const targetMonth = archiveFilter.month ? Number(archiveFilter.month) : null
                const targetYear = archiveFilter.year ? Number(archiveFilter.year) : null
                const latestEntry = archiveList.length
                    ? archiveList.reduce((a, b) => b.year > a.year || (b.year === a.year && b.month > a.month) ? b : a, archiveList[0])
                    : null
                const useMonth = targetMonth ?? latestEntry?.month
                const useYear = targetYear ?? latestEntry?.year
                const bulanLabel = BULAN.find(b => b.id === useMonth)?.id_str ?? '—'

                const periodEntries = archiveList.filter(e =>
                    e.month === useMonth && e.year === useYear &&
                    (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
                    (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase()))
                )

                if (!periodEntries.length) return (
                    <EmptyState
                        variant="dashed"
                        color="slate"
                        icon={faChartPie}
                        title="Tidak ada data statistik"
                        description="Pilih filter bulan/tahun yang memiliki data arsip untuk melihat ringkasan performa kelas."
                    />
                )

                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-gradient-to-r from-indigo-500/5 to-emerald-500/5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faChartPie} className="text-indigo-500" />
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-[var(--color-text)]">Ringkasan {bulanLabel} {useYear}</p>
                                <p className="text-[9px] text-[var(--color-text-muted)]">{periodEntries.length} kelas · {periodEntries.reduce((a, e) => a + e.count, 0)} santri · {periodEntries.reduce((a, e) => a + e.completed, 0)} raport lengkap</p>
                            </div>
                            <div className="flex-1" />
                            <div className="text-right">
                                <p className="text-[9px] text-[var(--color-text-muted)]">Kelengkapan rata-rata</p>
                                <p className="text-[18px] font-black text-emerald-500">
                                    {(() => { const total = periodEntries.reduce((a, e) => a + e.count, 0); const done = periodEntries.reduce((a, e) => a + e.completed, 0); return total ? Math.round(done / total * 100) : 0 })()}%
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Progress per Kelas</p>
                            {[...periodEntries].sort((a, b) => (b.completed / (b.count || 1)) - (a.completed / (a.count || 1))).map(entry => {
                                const pct = entry.count ? Math.round(entry.completed / entry.count * 100) : 0
                                const barColor = pct === 100 ? '#10b981' : pct >= 70 ? '#6366f1' : pct >= 40 ? '#f59e0b' : '#ef4444'
                                return (
                                    <div key={entry.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-indigo-500/20 transition-all group cursor-pointer"
                                        onClick={() => loadArchiveDetail(entry)}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[11px] font-black text-[var(--color-text)] truncate">{entry.class_name}</span>
                                                <span className="text-[10px] font-black shrink-0 ml-2" style={{ color: barColor }}>{pct}%</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] text-[var(--color-text-muted)]">{entry.completed}/{entry.count} santri lengkap</span>
                                                {entry.musyrif && <span className="text-[8px] text-[var(--color-text-muted)] opacity-60">· {entry.musyrif}</span>}
                                            </div>
                                        </div>
                                        <svg width="44" height="28" viewBox="0 0 44 28" className="shrink-0 opacity-60 group-hover:opacity-100 transition-all" aria-hidden="true">
                                            <rect x="0" y="0" width="44" height="28" rx="5" fill="var(--color-surface-alt)" />
                                            <rect x="4" y={28 - 4 - (pct / 100) * 20} width="16" height={(pct / 100) * 20 + 4} rx="3" fill={barColor} opacity="0.85" />
                                            <rect x="24" y={28 - 4 - ((entry.count ? entry.completed / entry.count : 0) * 20)} width="16" height={((entry.count ? entry.completed / entry.count : 0) * 20) + 4} rx="3" fill={barColor} opacity="0.4" />
                                        </svg>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Heatmap Kriteria (dari arsip ter-load)</p>
                            <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                            <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Kelas</th>
                                            {KRITERIA.map(k => (
                                                <th key={k.key} className="px-2 py-2 text-center text-[9px] font-black" style={{ color: k.color }}>{k.id}</th>
                                            ))}
                                            <th className="px-2 py-2 text-center text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Lengkap</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {periodEntries.map((entry, idx) => {
                                            const pct = entry.count ? entry.completed / entry.count : 0
                                            return (
                                                <tr key={entry.key} style={{ borderBottom: idx < periodEntries.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                                                    className="hover:bg-[var(--color-surface-alt)] transition-all cursor-pointer" onClick={() => loadArchiveDetail(entry)}>
                                                    <td className="px-3 py-2">
                                                        <span className="text-[10px] font-black text-[var(--color-text)]">{entry.class_name}</span>
                                                    </td>
                                                    {KRITERIA.map(k => (
                                                        <td key={k.key} className="px-2 py-2 text-center">
                                                            <div className="w-8 h-6 rounded-md mx-auto flex items-center justify-center text-[9px] font-black"
                                                                style={{ background: pct >= 0.9 ? k.color + '20' : pct >= 0.5 ? k.color + '10' : 'var(--color-surface-alt)', color: k.color, opacity: 0.5 + pct * 0.5 }}>
                                                                {pct >= 0.9 ? '✓' : pct >= 0.5 ? '…' : '—'}
                                                            </div>
                                                        </td>
                                                    ))}
                                                    <td className="px-2 py-2 text-center">
                                                        <span className="text-[10px] font-black" style={{ color: pct === 1 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444' }}>
                                                            {Math.round(pct * 100)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[8px] text-[var(--color-text-muted)] opacity-60">💡 Klik baris untuk buka detail kelas dan lihat nilai per santri.</p>
                        </div>
                    </div>
                )
            })() : filtered.length === 0 ? (
                <EmptyState
                    variant="dashed"
                    color="slate"
                    icon={faBoxArchive}
                    title="Arsip tidak ditemukan"
                    description={archiveSearch || archiveFilter.classId || archiveFilter.month
                        ? 'Coba ubah filter atau hapus pencarian untuk menemukan arsip yang kamu cari.'
                        : 'Belum ada raport yang tersimpan. Selesaikan input nilai di step 2, lalu simpan untuk membuat arsip.'}
                    action={(archiveSearch || archiveFilter.classId || archiveFilter.month) && (
                        <button onClick={() => { setArchiveSearch(''); setArchiveFilter({ classId: '', year: '', month: '' }) }}
                            className="h-9 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[11px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-2 mx-auto active:scale-95 shadow-sm">
                            <FontAwesomeIcon icon={faXmark} className="text-[10px]" /> Reset Filter
                        </button>
                    )}
                />
            ) : (
                <div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cardsToRender.map(entry => {
                            const bulan = BULAN.find(b => b.id === entry.month), pct = entry.count ? Math.round((entry.completed / entry.count) * 100) : 0
                            return (
                                <div key={entry.key} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500/30 transition-all">
                                    <div className="flex items-start justify-between mb-3"><div><div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name}</div><div className="text-[10px] text-[var(--color-text-muted)] font-bold mt-0.5">{bulan?.id_str} {entry.year} · {entry.lang === 'ar' ? 'عربي' : 'Indonesia'}</div></div><span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${entry.lang === 'ar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'}`}>{entry.lang === 'ar' ? 'Pondok' : 'Reguler'}</span></div>
                                    <div className="mb-3"><div className="flex justify-between text-[9px] font-bold text-[var(--color-text-muted)] mb-1"><span>{entry.completed}/{entry.count} lengkap</span><span>{pct}%</span></div><div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#6366f1' : '#f59e0b' }} /></div></div>
                                    {entry.musyrif && <div className="text-[9px] text-[var(--color-text-muted)] mb-3 flex items-center gap-1"><FontAwesomeIcon icon={faUsers} className="opacity-50" /> {entry.musyrif}</div>}
                                    <div className="flex gap-1.5">
                                        <button onClick={() => loadArchiveDetail(entry)} className="flex-1 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all"><FontAwesomeIcon icon={faMagnifyingGlass} /> Preview</button>
                                        <button onClick={() => exportBulkPDF(entry)} className="flex-1 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all"><FontAwesomeIcon icon={faFileZipper} /> Export PDF</button>
                                        <button onClick={() => setConfirmDelete(entry)} aria-label={`Hapus arsip ${entry.class_name}`} className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {filtered.length > archiveVisibleCount && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={() => setArchiveVisibleCount(prev => prev + 12)}
                                className="h-9 px-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] hover:text-indigo-500 hover:border-indigo-500/30 text-[var(--color-text)] text-[11px] font-black transition-all active:scale-95 shadow-sm flex items-center gap-2"
                            >
                                <FontAwesomeIcon icon={faChevronDown} className="text-[10px]" />
                                Muat Lebih Banyak ({filtered.length - archiveVisibleCount} Kelas Tersisa)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
