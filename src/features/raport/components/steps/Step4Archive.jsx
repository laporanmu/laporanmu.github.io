import React from 'react'
import {
    ArrowLeft, Sliders, FileArchive, Printer, CheckCircle2, ClipboardList, Zap, Search, Maximize2,
    ChevronLeft, ChevronRight, ChevronDown, AlertCircle
} from 'lucide-react'
import RaportArchive from '@features/raport/components/RaportArchive'
import RaportPrintCard from '@features/raport/components/RaportPrintCard'
import Modal from '@shared/components/Modal'
import {
    KRITERIA, GRADE, FISIK_FIELDS, HAFALAN_FIELDS, BULAN
} from '@utils/reports/raportConstants'
import {
    isComplete, generateAutoComment
} from '@utils/reports/raportHelpers'

const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 448 512" fill="currentColor" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
    </svg>
)

export default function Step4Archive({
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
    manualZoomRef,
}) {
    const outerWrapperRef = React.useRef(null)
    const innerCardRef = React.useRef(null)
    const zoomLabelRef = React.useRef(null)
    const tempZoomRef = React.useRef(previewZoom)

    React.useEffect(() => {
        tempZoomRef.current = previewZoom
        if (zoomLabelRef.current) {
            zoomLabelRef.current.textContent = `${Math.round(previewZoom * 100)}%`
        }
        const naturalW = pageSize === 'f4' ? 812.6 : 793.7
        const naturalH = pageSize === 'f4' ? 1247 : 1122
        if (outerWrapperRef.current) {
            outerWrapperRef.current.style.width = `${naturalW * previewZoom}px`
            outerWrapperRef.current.style.height = `${naturalH * previewZoom}px`
        }
        if (innerCardRef.current) {
            innerCardRef.current.style.transform = `scale(${previewZoom})`
        }
    }, [previewZoom, pageSize])

    if (archivePreview) {
        const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, lang: pLang, entry } = archivePreview
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
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div>
                            <h3 className="text-base font-black text-[var(--color-text)]">{entry.class_name}</h3>
                            <p className="text-[11px] text-[var(--color-text-muted)] font-medium">{BULAN.find(b => b.id === entry.month)?.id_str} {entry.year} · {pStu.length} Santri</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => setArchiveEditMode(!archiveEditMode)} className={`h-9 px-4 rounded-xl border text-xs font-black transition-all ${archiveEditMode ? 'bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-violet-500/10 border-violet-500/20 text-violet-600 hover:bg-violet-500/20'}`}>
                            <Sliders className="w-3.5 h-3.5 mr-2" /> {archiveEditMode ? 'Selesai Edit' : 'Edit Arsip'}
                        </button>
                        <button onClick={() => runZipBlast(pStu, entry)} className="h-9 px-4 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 text-xs font-black hover:bg-teal-500/20 transition-all">
                            <FileArchive className="w-3.5 h-3.5 mr-2" /> ZIP PDF
                        </button>
                        <button onClick={() => openPrintWindow(pStu)} className="h-9 px-4 rounded-xl bg-indigo-500 text-white text-xs font-black hover:bg-indigo-600 transition-all flex items-center gap-2">
                            <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak Semua
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
                                            {complete && <CheckCircle2 className={`w-3 h-3 ${active ? 'text-white' : 'text-emerald-500'}`} />}
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
                                                <Sliders className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-[var(--color-text)]">Edit Mode: {pStudent.name}</h4>
                                                <p className="text-[10px] text-[var(--color-text-muted)] font-medium">Ubah nilai dan data tambahan untuk periode ini.</p>
                                            </div>
                                        </div>

                                        {/* Nilai Kriteria */}
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                                                <ClipboardList className="w-3.5 h-3.5 opacity-50 mr-1.5" /> Nilai Kriteria
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
                                                            {(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3.5 h-3.5 shrink-0 opacity-80" /> })()}
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
                                                            {(() => { const Icon = f.icon; return <Icon style={{ color: f.color }} className="w-3.5 h-3.5 shrink-0 opacity-80" /> })()}
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
                                                    className="h-6 px-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 text-[8px] font-black flex items-center gap-1 transition-all active:scale-95"
                                                >
                                                    <Zap className="w-3 h-3" />
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
                                            {/* Row 1: Title & Mobile Toggle */}
                                            <div className="flex items-center justify-between w-full sm:w-auto">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                                                        <Search className="w-3 h-3 text-indigo-500" />
                                                    </div>
                                                    <h4 className="text-[11px] font-black text-[var(--color-text)] uppercase tracking-wider">Preview Raport</h4>
                                                </div>
                                                <button
                                                    onClick={() => setIsFullScreenPreview(true)}
                                                    className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] flex items-center justify-center sm:hidden"
                                                >
                                                    <Maximize2 className="w-3 h-3" />
                                                </button>
                                            </div>

                                            {/* Row 2 & 3: Controls */}
                                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                                {/* Group: Format & Lang - Stretching on Mobile */}
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

                                                {/* Group: Zoom & Actions - Stretching on Mobile */}
                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                    {/* Zoom Control stretches on mobile */}
                                                    <div className="flex-1 sm:flex-initial flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm h-10">
                                                        <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.max(0.3, p - 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><Search className="w-3 h-3 mr-0.5" />-</button>
                                                        <button
                                                            ref={zoomLabelRef}
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
                                                        <button onClick={() => { manualZoomRef.current = true; setPreviewZoom(p => Math.min(1.5, p + 0.1)) }} className="flex-1 sm:w-8 h-8 text-[11px] text-[var(--color-text-muted)] hover:text-indigo-500 flex items-center justify-center"><Search className="w-3 h-3 mr-0.5" />+</button>
                                                    </div>

                                                    {pStudent?.phone && (
                                                        <button onClick={() => sendWATextOnly(pStudent)} className="h-10 px-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial">
                                                            <WhatsAppIcon className="w-3.5 h-3.5 mr-1" /> <span className="hidden xs:inline">WhatsApp</span>
                                                        </button>
                                                    )}

                                                    <button onClick={() => openPrintWindow([pStudent].filter(Boolean))} className="h-10 px-5 rounded-xl bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center gap-2 flex-1 sm:flex-initial shadow-lg shadow-emerald-500/20">
                                                        <Printer className="w-3.5 h-3.5 mr-1" /> <span className="hidden xs:inline">Cetak</span>
                                                    </button>

                                                    <button
                                                        onClick={() => setIsFullScreenPreview(true)}
                                                        className="h-10 w-10 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hidden sm:flex items-center justify-center hover:text-indigo-500 transition-all"
                                                    >
                                                        <Maximize2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Report Card Body with interactive Zoom */}
                                        <div
                                            className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-900/50 flex flex-col items-center custom-scrollbar p-6 min-h-[500px]"
                                            onTouchStart={e => {
                                                if (e.touches.length === 2) {
                                                    e.currentTarget._pinchStartDist = Math.hypot(
                                                        e.touches[0].clientX - e.touches[1].clientX,
                                                        e.touches[0].clientY - e.touches[1].clientY
                                                    )
                                                    e.currentTarget._pinchStartZoom = tempZoomRef.current
                                                }
                                            }}
                                            onTouchMove={e => {
                                                if (e.touches.length === 2 && e.currentTarget._pinchStartDist) {
                                                    e.preventDefault()
                                                    const dist = Math.hypot(
                                                        e.touches[0].clientX - e.touches[1].clientX,
                                                        e.touches[0].clientY - e.touches[1].clientY
                                                    )
                                                    const ratio = dist / e.currentTarget._pinchStartDist
                                                    const newZoom = Math.min(1.5, Math.max(0.3, e.currentTarget._pinchStartZoom * ratio))
                                                    
                                                    const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                                    const naturalH = pageSize === 'f4' ? 1247 : 1122
                                                    if (outerWrapperRef.current) {
                                                        outerWrapperRef.current.style.width = `${naturalW * newZoom}px`
                                                        outerWrapperRef.current.style.height = `${naturalH * newZoom}px`
                                                    }
                                                    if (innerCardRef.current) {
                                                        innerCardRef.current.style.transform = `scale(${newZoom})`
                                                    }
                                                    if (zoomLabelRef.current) {
                                                        zoomLabelRef.current.textContent = `${Math.round(newZoom * 100)}%`
                                                    }
                                                    tempZoomRef.current = newZoom
                                                }
                                            }}
                                            onTouchEnd={e => {
                                                e.currentTarget._pinchStartDist = null
                                                if (tempZoomRef.current !== previewZoom) {
                                                    manualZoomRef.current = true
                                                    setPreviewZoom(Math.floor(tempZoomRef.current * 100) / 100)
                                                }
                                            }}
                                        >
                                            {(() => {
                                                const naturalW = pageSize === 'f4' ? 812.6 : 793.7
                                                const naturalH = pageSize === 'f4' ? 1247 : 1122
                                                return (
                                                    <div
                                                        ref={outerWrapperRef}
                                                        className="mx-auto overflow-hidden"
                                                        style={{
                                                            width: `${naturalW * previewZoom}px`,
                                                            height: `${naturalH * previewZoom}px`,
                                                        }}
                                                    >
                                                        <div
                                                            ref={innerCardRef}
                                                            className="relative shadow-2xl rounded-none overflow-hidden cursor-pointer transition-all group"
                                                            style={{
                                                                width: pageSize === 'f4' ? '215mm' : '210mm',
                                                                transform: `scale(${previewZoom})`,
                                                                transformOrigin: 'top left',
                                                            }}
                                                            onClick={() => setIsFullScreenPreview(true)}
                                                        >
                                                            {/* Mobile pulse ring */}
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
                                                )
                                            })()}
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
        <RaportArchive
            archiveList={archiveList}
            archiveLoading={archiveLoading}
            archiveFilter={archiveFilter}
            setArchiveFilter={setArchiveFilter}
            archiveSearch={archiveSearch}
            setArchiveSearch={setArchiveSearch}
            archiveSort={archiveSort}
            archiveTab={archiveTab}
            setArchiveTab={setArchiveTab}
            archiveVisibleCount={archiveVisibleCount}
            setArchiveVisibleCount={setArchiveVisibleCount}
            archivePreview={archivePreview}
            setArchivePreview={setArchivePreview}
            previewStudentId={previewStudentId}
            setPreviewStudentId={setPreviewStudentId}
            archiveEditMode={archiveEditMode}
            setArchiveEditMode={setArchiveEditMode}
            archiveEditScores={archiveEditScores}
            setArchiveEditScores={setArchiveEditScores}
            archiveEditExtras={archiveEditExtras}
            setArchiveEditExtras={setArchiveEditExtras}
            archiveEditSaving={archiveEditSaving}
            archiveStatusFilter={archiveStatusFilter}
            archiveMinAvg={archiveMinAvg}
            loadArchiveDetail={loadArchiveDetail}
            saveArchiveEdit={saveArchiveEdit}
            exportBulkPDF={exportBulkPDF}
            setConfirmDelete={setConfirmDelete}
            runZipBlast={runZipBlast}
            openPrintWindow={openPrintWindow}
            sendWATextOnly={sendWATextOnly}
            pageSize={pageSize}
            setPageSize={setPageSize}
            lang={lang}
            setLang={setLang}
            previewZoom={previewZoom}
            setPreviewZoom={setPreviewZoom}
            setIsFullScreenPreview={setIsFullScreenPreview}
            settings={settings}
            setStep={setStep}
            previewContainerRef={previewContainerRef}
            manualZoomRef={manualZoomRef}
        />
    )
}
