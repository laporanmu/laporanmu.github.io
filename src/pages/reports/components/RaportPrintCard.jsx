import React, { memo, useEffect } from 'react'
import { KRITERIA, GRADE, LABEL, toArabicNum } from '../utils/raportConstants'
import { translitToAr, translitClassToAr } from '../utils/translitData'

const printCardAreEqual = (prev, next) => {
    if (prev.lang !== next.lang) return false
    if (prev.tahun !== next.tahun) return false
    if (prev.musyrif !== next.musyrif) return false
    if (prev.className !== next.className) return false
    if (prev.student?.id !== next.student?.id) return false
    if (prev.student?.metadata?.nama_arab !== next.student?.metadata?.nama_arab) return false
    if (prev.bulanObj?.id !== next.bulanObj?.id) return false
    
    // Deep-compare scores
    const sk = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
    for (const k of sk) { if ((prev.scores?.[k] ?? '') !== (next.scores?.[k] ?? '')) return false }
    
    // Deep-compare extra fields
    const ek = ['berat_badan', 'tinggi_badan', 'ziyadah', 'murojaah', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang', 'catatan']
    for (const k of ek) { if ((prev.extra?.[k] ?? '') !== (next.extra?.[k] ?? '')) return false }
    
    if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) return false
    return true
}

const RaportPrintCard = memo(({ student, scores, extra, bulanObj, tahun, musyrif, className, lang = 'ar', settings = {}, catatanArab, onRendered }) => {
    const sc = scores || {}, ex = extra || {}, L = LABEL[lang], isAr = lang === 'ar'
    
    useEffect(() => { onRendered?.() }, [onRendered])
    
    const gradeLabel = isAr ? (v) => GRADE(v)?.label : (v) => GRADE(v)?.id
    const yearDisplay = isAr ? `\u200F${toArabicNum(tahun - 1)} \u2013 ${toArabicNum(tahun)}` : `${tahun - 1} – ${tahun}`
    const tableDir = isAr ? 'rtl' : 'ltr'
    const displayName = isAr ? (student?.metadata?.nama_arab || student?.name || '—') : (student?.name || '—')
    const displayVal = (v) => { if (v === '' || v === null || v === undefined) return '—'; return isAr ? toArabicNum(v) : v }

    const displayMusyrif = isAr && musyrif ? translitToAr(musyrif) : musyrif
    const displayClassName = isAr && className ? translitClassToAr(className) : className

    return (
        <div className="raport-card" data-student-id={student?.id} style={{ 
            fontFamily: "'Times New Roman', serif", width: '210mm', minHeight: '297mm', background: '#fff', 
            color: '#000', padding: '8mm 12mm', boxSizing: 'border-box', fontSize: '11pt', lineHeight: 1.4, pageBreakAfter: 'always' 
        }}>
            {/* Header Sekolah */}
            <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 6 }}>
                    <div style={{ flexShrink: 0, width: 80, height: 80, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={settings.logo_url || '/src/assets/mbs.png'} alt="Logo sekolah" style={{ width: 78, height: 78, objectFit: 'contain', mixBlendMode: 'multiply', backgroundColor: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        {settings.school_subtitle_ar && <div style={{ fontSize: '8pt', color: '#444', direction: 'rtl', marginBottom: 3, fontFamily: "'Traditional Arabic', serif" }}>{settings.school_subtitle_ar}</div>}
                        <div style={{ fontSize: '20pt', fontWeight: 900, color: settings.report_color_primary || '#1a5c35', direction: 'rtl', fontFamily: "'Traditional Arabic', serif", letterSpacing: 0.5 }}>{settings.school_name_ar || ''}</div>
                        <div style={{ fontSize: '10pt', fontWeight: 700, letterSpacing: 2.5, color: '#333', marginTop: 1 }}>{settings.school_name_id || ''}</div>
                        <div style={{ fontSize: '7.5pt', color: '#666', marginTop: 2 }}>{settings.school_address || ''}</div>
                    </div>
                </div>
                <div style={{ height: 3, background: `linear-gradient(90deg, ${settings.report_color_primary || '#1a5c35'}, ${settings.report_color_secondary || '#c8a400'}, ${settings.report_color_primary || '#1a5c35'})`, marginBottom: 0 }} />
                <div style={{ borderBottom: `3px double ${settings.report_color_primary || '#1a5c35'}`, marginTop: 3 }} />
            </div>

            {/* Judul Laporan */}
            <div style={{ textAlign: 'center', margin: '6px 0 10px', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                <div style={{ fontSize: '16pt', fontWeight: 900, direction: isAr ? 'rtl' : 'ltr' }}>{L.reportTitle}</div>
                <div style={{ fontSize: '13pt', fontWeight: 700, direction: isAr ? 'rtl' : 'ltr', marginTop: 2 }}>{isAr ? `${L.month} ${bulanObj?.ar || ''}` : `${L.month} ${bulanObj?.id_str || ''}`}</div>
            </div>

            {/* Info Santri & Kelas */}
            <table style={{ width: '100%', marginBottom: 10, fontSize: '10.5pt', borderCollapse: 'collapse', direction: tableDir }}>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={{ verticalAlign: 'middle', padding: '4px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', width: '20%' }}>{L.studentName} :</td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, padding: '4px 0', width: '30%', textAlign: isAr ? 'right' : 'left' }}>{displayName}</td>
                        <td style={{ verticalAlign: 'middle', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', width: '20%', padding: '4px 0' }}>{L.room} :</td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, width: '30%', textAlign: isAr ? 'right' : 'left', padding: '4px 0' }}>{student?.metadata?.kamar || '—'}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={{ verticalAlign: 'middle', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', padding: '4px 0' }}>{L.class} :</td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: '4px 0' }}>{displayClassName}</td>
                        <td style={{ verticalAlign: 'middle', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', padding: '4px 0' }}>{L.year} :</td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: '4px 0' }}>{yearDisplay}</td>
                    </tr>
                </tbody>
            </table>

            {/* Tabel Nilai Utama */}
            <div style={{ direction: isAr ? 'rtl' : 'ltr', fontWeight: 700, fontSize: '11pt', marginBottom: 5, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>{L.dailyWork}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', marginBottom: 12 }}>
                <thead>
                    <tr style={{ background: '#f0f7f0' }}>
                        {isAr ? <>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', width: '19%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center' }}>{L.grade}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '11%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center' }}>{L.score}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', fontFamily: "'Traditional Arabic', serif", textAlign: 'right' }}>{L.subject}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '6%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center' }}>{L.num}</th>
                        </> : <>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '6%', textAlign: 'center' }}>{L.num}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'left' }}>{L.subject}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '11%', textAlign: 'center' }}>{L.score}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', width: '19%', textAlign: 'center' }}>{L.grade}</th>
                        </>}
                    </tr>
                </thead>
                <tbody>
                    {KRITERIA.map((k, i) => {
                        const val = sc[k.key], g = (val !== '' && val !== null && val !== undefined) ? GRADE(val) : null
                        const numRows = isAr ? ['١', '٢', '٣', '٤', '٥'] : [1, 2, 3, 4, 5]
                        return (
                            <tr key={k.key}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color || '#000', fontFamily: "'Traditional Arabic', serif" }}>{g ? gradeLabel(val) : '—'}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontFamily: "'Traditional Arabic', serif" }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{k.ar || k.id}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontFamily: "'Traditional Arabic', serif" }}>{numRows[i]}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center' }}>{numRows[i]}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px' }}>{k.id}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color || '#000' }}>{g ? gradeLabel(val) : '—'}</td>
                                </>}
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* Extra Data Table */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexDirection: isAr ? 'row-reverse' : 'row' }}>
                {/* BB / TB */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.berat_badan)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.weight}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.weight}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.berat_badan)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.tinggi_badan)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.height}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.height}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.tinggi_badan)}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
                {/* Ziyadah / Murojaah */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.ziyadah)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.ziyadah}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.ziyadah}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.ziyadah)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.murojaah)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.murojaah}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.murojaah}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.murojaah)}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
                {/* Kehadiran */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        {[
                            { key: 'hari_sakit', label: L.sick },
                            { key: 'hari_izin', label: L.izin },
                            { key: 'hari_alpa', label: L.alpa },
                            { key: 'hari_pulang', label: L.home },
                        ].map(item => (
                            <tr key={item.key}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex[item.key])}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{item.label}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{item.label}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex[item.key])}</td>
                                </>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Skala Penilaian & Catatan */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'flex-start', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                <div style={{ flexShrink: 0 }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '9pt', direction: isAr ? 'rtl' : 'ltr' }}>
                        <thead>
                            <tr>
                                <th colSpan={2} style={{ border: '1px solid #999', padding: '3px 16px', background: '#e8f5e9', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: 'center' }}>
                                    {L.gradeScale}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {(isAr
                                ? [['٩', 'ممتاز'], ['٨', 'جيد جدا'], ['٦ – ٧', 'جيد'], ['٤ – ٥', 'مقبول'], ['٠ – ٣', 'راسب']]
                                : [['9', 'Istimewa'], ['8', 'Sangat Baik'], ['6 – 7', 'Baik'], ['4 – 5', 'Cukup'], ['0 – 3', 'Kurang']]
                            ).map(([n, l]) => (
                                <tr key={n}>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left' }}>{l}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', textAlign: 'center', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', whiteSpace: 'nowrap' }}>{n}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {ex.catatan && (
                    <div style={{
                        flex: 1, alignSelf: 'stretch', border: '1px solid #ccc', borderRadius: 4, padding: '8px 12px', 
                        fontSize: '9.5pt', direction: isAr ? 'rtl' : 'ltr', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', lineHeight: 1.6,
                    }}>
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#555', marginBottom: 4 }}>
                            {isAr ? 'ملاحظة' : 'Catatan Musyrif'}
                        </div>
                        {isAr && catatanArab ? catatanArab : ex.catatan}
                    </div>
                )}
            </div>

            {/* Tanda Tangan */}
            <div style={{ display: 'flex', marginTop: 36, flexDirection: isAr ? 'row-reverse' : 'row', justifyContent: 'space-between', direction: isAr ? 'rtl' : 'ltr' }}>
                {[
                    {
                        label: isAr ? (settings.headmaster_title_ar || 'مدير المعهد') : (settings.headmaster_title_id || 'Direktur'),
                        sub: isAr ? (settings.headmaster_name_ar || '—') : (settings.headmaster_name_id || '—')
                    },
                    { label: L.musyrif, sub: displayMusyrif || '......................' },
                    { label: L.guardian, sub: '' }
                ].map((item, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: '9pt' }}>
                        <div style={{ fontWeight: 700 }}>{item.label}</div>
                        <div style={{ height: 60 }} />
                        <div style={{ borderTop: '1px solid #333', paddingTop: 4, width: '80%', fontWeight: 700 }}>
                            {item.sub || '......................'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}, printCardAreEqual)

export default RaportPrintCard
