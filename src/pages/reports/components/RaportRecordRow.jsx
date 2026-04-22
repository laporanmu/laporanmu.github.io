import { memo, useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSpinner, faCircleCheck, faFloppyDisk, faFilePdf, faXmark,
    faClipboardList, faBolt, faLightbulb, faLanguage
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import {
    MAX_SCORE, KRITERIA, GRADE, FISIK_FIELDS, HAFALAN_FIELDS,
    CATATAN_TEMPLATES, calcAvg
} from '../utils/raportConstants'
import { RadarChart, SparklineTrend } from './RaportCharts'

// ─── Sub-components ──────────────────────────────────────────────────────────

export const ScoreCell = memo(({ value, onChange, onKeyDown, inputRef, kriteria }) => {
    const [focused, setFocused] = useState(false)
    const [hasError, setHasError] = useState(false)
    const val = value !== '' && value !== null && value !== undefined ? Number(value) : ''
    const g = val !== '' ? GRADE(val) : null

    const handleChange = (e) => {
        const raw = e.target.value
        if (raw === '') { setHasError(false); onChange(''); return }
        const num = Number(raw)
        if (num < 0 || num > MAX_SCORE) {
            setHasError(true); onChange(Math.min(MAX_SCORE, Math.max(0, num)))
            setTimeout(() => setHasError(false), 1200)
        } else {
            setHasError(false); onChange(num)
        }
    }

    return (
        <div title={g ? `${kriteria.id}: ${val} — ${g.id} (${g.label})` : kriteria.id}>
            <input
                ref={inputRef}
                type="number"
                inputMode="decimal"
                min={0}
                max={MAX_SCORE}
                value={val}
                onChange={handleChange}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); setHasError(false) }}
                aria-label={`Nilai ${kriteria.id}`}
                className="w-11 h-10 text-center text-base font-black rounded-lg outline-none transition-all appearance-none"
                style={{
                    background: hasError ? '#ef444415' : g ? g.bg : 'var(--color-surface-alt)',
                    color: hasError ? '#ef4444' : g ? g.uiColor : 'var(--color-text-muted)',
                    border: `2px solid ${hasError ? '#ef4444' : focused ? (g ? g.uiColor : 'var(--color-primary)') : (g ? g.border : 'var(--color-border)')}`
                }}
                placeholder="—"
            />
        </div>
    )
})

export const ExtraInput = memo(({ value, studentId, fieldKey, onCommit, ...inputProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const debounceRef = useRef(null)
    useEffect(() => { setLocalVal(value ?? '') }, [value])
    const handleChange = (e) => {
        const v = e.target.value; setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }
    const handleBlur = () => {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        onCommit(studentId, fieldKey, localVal)
    }
    return <input {...inputProps} value={localVal} onChange={handleChange} onBlur={handleBlur} />
})

export const ExtraTextarea = memo(({ value, studentId, fieldKey, onCommit, ...textareaProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const debounceRef = useRef(null)
    useEffect(() => { setLocalVal(value ?? '') }, [value])
    const handleChange = (e) => {
        const v = e.target.value; setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }
    const handleBlur = () => {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        onCommit(studentId, fieldKey, localVal)
    }
    return <textarea {...textareaProps} value={localVal} onChange={handleChange} onBlur={handleBlur} />
})

// ─── Main StudentRow ─────────────────────────────────────────────────────────

const studentRowAreEqual = (prev, next) => {
    return (
        prev.si === next.si &&
        prev.student === next.student &&
        prev.sc === next.sc &&
        prev.ex === next.ex &&
        prev.isSaved === next.isSaved &&
        prev.isSaving === next.isSaving &&
        prev.isDirty === next.isDirty &&
        prev.isChecked === next.isChecked &&
        prev.bulkMode === next.bulkMode &&
        prev.lang === next.lang &&
        prev.trendData === next.trendData &&
        prev.prevScores === next.prevScores &&
        prev.templateOpen === next.templateOpen &&
        prev.catatanArab === next.catatanArab &&
        prev.sendingWAStatus === next.sendingWAStatus &&
        prev.onScoreChange === next.onScoreChange &&
        prev.onExtraChange === next.onExtraChange &&
        prev.onCatatanChange === next.onCatatanChange &&
        prev.onSave === next.onSave &&
        prev.onWA === next.onWA &&
        prev.onPDF === next.onPDF &&
        prev.onReset === next.onReset &&
        prev.onBulkToggle === next.onBulkToggle &&
        prev.onKeyDown === next.onKeyDown &&
        prev.onTemplateToggle === next.onTemplateToggle &&
        prev.onTemplateApply === next.onTemplateApply &&
        prev.onTranslitToggle === next.onTranslitToggle
    )
}

const StudentRow = memo(({
    student, si, sc, ex, isSaved, isSaving, isDirty, isChecked,
    bulkMode, lang, trendData, prevScores, templateOpen, catatanArab, sendingWAStatus,
    onScoreChange, onExtraChange, onCatatanChange, onSave, onWA, onPDF, onReset,
    onBulkToggle, onKeyDown, onTemplateToggle, onTemplateApply, onTranslitToggle,
    generateAutoComment, cellRefs
}) => {
    const avg = calcAvg(sc)
    return (
        <tr className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary)]/[0.02]" style={{ background: isChecked ? 'var(--color-primary, #6366f1)08' : si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}>
            {bulkMode && (
                <td className="text-center px-1" style={{ verticalAlign: 'middle' }}>
                    <input type="checkbox" checked={isChecked} onChange={e => onBulkToggle(student.id, e.target.checked)} aria-label={`Pilih ${student.name}`} className="w-3.5 h-3.5 accent-violet-500 cursor-pointer" />
                </td>
            )}
            <td className="px-3 py-3 sticky left-0 z-10" style={{ background: isChecked ? '#6366f108' : si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)', borderRight: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-2.5">
                    <RadarChart scores={sc} size={36} />
                    <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-black text-[var(--color-text)] leading-tight truncate">{student.name}</div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            {avg ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).color }}>{avg}</span> : <span className="text-[8px] text-[var(--color-text-muted)] font-bold">isi nilai</span>}
                            {isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[8px] text-amber-500 animate-spin" />}
                            {!isSaving && isSaved && <FontAwesomeIcon icon={faCircleCheck} className="text-[8px] text-emerald-500" />}
                            {!isSaving && !isSaved && isDirty && <span className="text-[8px] font-black text-amber-500 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />belum simpan</span>}
                            {trendData?.length >= 2 && <SparklineTrend trendData={trendData} />}
                        </div>
                    </div>
                </div>
            </td>
            {KRITERIA.map((k, ki) => {
                const prevVal = prevScores?.[k.key], curVal = sc[k.key], hasDelta = (prevVal != null && curVal !== '' && curVal != null), delta = hasDelta ? Number(curVal) - Number(prevVal) : 0
                return (
                    <td key={k.key} className="py-2 text-center" style={{ verticalAlign: 'middle' }}>
                        <ScoreCell value={sc[k.key]} onChange={v => onScoreChange(student.id, k.key, v)} onKeyDown={e => onKeyDown(e, si, ki)} inputRef={el => { cellRefs.current[`${si}-${ki}`] = el }} kriteria={k} />
                        {hasDelta && delta !== 0 && (<div style={{ fontSize: 8, fontWeight: 900, color: delta > 0 ? '#10b981' : '#ef4444', lineHeight: 1, marginTop: 1 }} title={`Bulan lalu: ${prevVal}`}>{delta > 0 ? '▲' : '▼'}{Math.abs(delta)}</div>)}
                        {hasDelta && delta === 0 && (<div style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.4, lineHeight: 1, marginTop: 1 }}>—</div>)}
                    </td>
                )
            })}
            <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                <div className="grid grid-cols-2 gap-1.5">
                    {FISIK_FIELDS.map(f => (
                        <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 32 }}>
                            <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                            <ExtraInput type="number" inputMode="decimal" placeholder="—" value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={onExtraChange} aria-label={f.label} className="flex-1 w-0 h-full text-[11px] font-bold text-left px-1.5 bg-transparent text-[var(--color-text)] outline-none appearance-none" />
                            <span className="text-[9px] text-[var(--color-text-muted)] font-bold pr-1 shrink-0">{f.unit}</span>
                        </div>
                    ))}
                </div>
            </td>
            <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                <div className="flex flex-col gap-1.5">
                    {HAFALAN_FIELDS.map(f => (
                        <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 32 }}>
                            <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                            <ExtraInput placeholder={f.ph} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={onExtraChange} aria-label={f.ph} className="flex-1 w-0 h-full px-1 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                        </div>
                    ))}
                    <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', minHeight: 32 }}>
                        <div className="w-6 shrink-0 flex items-start justify-center pt-[7px]" style={{ background: '#f59e0b18' }}><FontAwesomeIcon icon={faClipboardList} style={{ color: '#f59e0b', fontSize: 9 }} /></div>
                        <ExtraTextarea placeholder="Catatan untuk Santri..." value={ex.catatan ?? ''} studentId={student.id} fieldKey="catatan" onCommit={onCatatanChange} maxLength={200} rows={2} aria-label="Catatan musyrif" className="flex-1 w-0 px-1.5 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                        <button onClick={() => { const c = generateAutoComment(sc, student.id, trendData); if (!c) return; onCatatanChange(student.id, 'catatan', c) }} title="Generate komentar otomatis dari nilai" disabled={!avg} className="shrink-0 w-6 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-30"><FontAwesomeIcon icon={faBolt} style={{ fontSize: 9 }} /></button>
                    </div>
                    <div className="relative">
                        <button onClick={() => onTemplateToggle(student.id)} className={`w-full h-6 rounded-md border text-[8px] font-black flex items-center justify-center gap-1 transition-all ${templateOpen ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}><FontAwesomeIcon icon={faLightbulb} style={{ fontSize: 7 }} /> Template Catatan</button>
                        {templateOpen && (
                            <div className="absolute left-0 right-0 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden" style={{ ...(si < 2 ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }), minWidth: 200 }}>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-2.5 pt-2 pb-1">Pilih template catatan</p>
                                {CATATAN_TEMPLATES.map((tmpl, ti) => (<button key={ti} onMouseDown={() => onTemplateApply(student.id, tmpl)} className="w-full text-left px-2.5 py-1.5 text-[10px] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all leading-snug border-t border-[var(--color-border)]/40 first:border-t-0">{tmpl}</button>))}
                            </div>
                        )}
                    </div>
                    {lang === 'ar' && ex.catatan && (
                        <button onClick={() => onTranslitToggle(student.id, ex.catatan, catatanArab)} title={catatanArab ? 'Kembali ke Indonesia' : 'Terjemahkan catatan ke huruf Arab'} className={`w-full h-6 rounded-md border text-[8px] font-black flex items-center justify-center gap-1 transition-all ${catatanArab ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}><FontAwesomeIcon icon={faLanguage} style={{ fontSize: 8 }} />{catatanArab ? 'Arab ✓' : 'Ke Arab'}</button>
                    )}
                </div>
            </td>
            <td className="px-2 py-3 sticky right-0 z-10" style={{ verticalAlign: 'middle', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
                <div className="flex flex-col gap-1.5">
                    <button onClick={() => onSave(student.id)} disabled={isSaving} className="w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black transition-all disabled:opacity-50" style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: '1px solid', borderColor: isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)' }}>
                        <FontAwesomeIcon icon={isSaving ? faSpinner : isSaved ? faCircleCheck : faFloppyDisk} className={isSaving ? 'animate-spin text-[10px]' : 'text-[10px]'} />{isSaving ? 'Menyimpan...' : isSaved ? 'Tersimpan' : 'Simpan'}
                    </button>
                    <div className="grid grid-cols-2 gap-1">
                        <button onClick={() => onPDF(student.id)} aria-label={`Preview PDF ${student.name}`} className="h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center gap-1 text-[11px] font-black hover:bg-indigo-500/20 transition-all"><FontAwesomeIcon icon={faFilePdf} className="text-[10px]" /> PDF</button>
                        <button onClick={() => onWA(student)} disabled={!student.phone || (!!sendingWAStatus && sendingWAStatus !== 'done')} aria-label={`Kirim WA ke wali ${student.name}`}
                            className={`h-8 rounded-lg border text-[11px] font-black flex items-center justify-center gap-1 transition-all ${!student.phone ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]' : sendingWAStatus === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20' : sendingWAStatus ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 cursor-wait' : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'}`}>
                            <FontAwesomeIcon icon={sendingWAStatus === 'generating' || sendingWAStatus === 'uploading' ? faSpinner : sendingWAStatus === 'done' ? faCircleCheck : faWhatsapp} className={(sendingWAStatus === 'generating' || sendingWAStatus === 'uploading') ? 'animate-spin text-[10px]' : 'text-[10px]'} /> WA
                        </button>
                    </div>
                    <button onClick={() => onReset(student)} aria-label={`Reset nilai ${student.name}`}
                        className="w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-black transition-all hover:bg-red-500/10 hover:text-red-500"
                        style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}>
                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" /> Reset
                    </button>
                </div>
            </td>
        </tr>
    )
}, studentRowAreEqual)

export default StudentRow
