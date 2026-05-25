import React, { memo, useEffect } from 'react'
import { KRITERIA, GRADE, LABEL, toArabicNum, LIST_KAMAR } from '../../utils/reports/raportConstants'
import { translitToAr, translitClassToAr } from '../../utils/reports/translitData'
import mbsLogo from '../../assets/mbs.png'
import smpLogo from '../../assets/smp.png'
import smaLogo from '../../assets/sma.jpg'

const printCardAreEqual = (prev, next) => {
    if (prev.lang !== next.lang) return false
    if (prev.pageSize !== next.pageSize) return false
    if (prev.tahun !== next.tahun) return false
    if (prev.musyrif !== next.musyrif) return false
    if (prev.className !== next.className) return false
    if (prev.student?.id !== next.student?.id) return false
    if (prev.studentIndex !== next.studentIndex) return false
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

const RaportPrintCard = memo(({ student, scores, extra, bulanObj, tahun, musyrif, className, lang = 'ar', settings = {}, catatanArab, onRendered, pageSize = 'a4', studentIndex }) => {
    const sc = scores || {}, ex = extra || {}, L = LABEL[lang], isAr = lang === 'ar'

    // Dimensi kertas: A4 (210x297) vs F4/Folio (215x330)
    const pageW = pageSize === 'f4' ? '215mm' : '210mm'
    const pageH = pageSize === 'f4' ? '330mm' : '297mm'

    // Logic to determine unit logo
    const getUnitLogo = () => {
        const c = String(className || '').toLowerCase()
        // SMP: Grades 7, 8, 9 or contains 'smp'
        if (c.includes('smp') || /^[789]/.test(c)) return smpLogo
        // SMA Placeholder (Add smaLogo import when file exists)
        if (c.includes('sma') || /^(10|11|12)/.test(c)) return smaLogo
        return null
    }
    const unitLogo = getUnitLogo()

    useEffect(() => { onRendered?.() }, [onRendered])

    const gradeLabel = isAr ? (v) => GRADE(v)?.label : (v) => GRADE(v)?.id
    const yearDisplay = isAr ? `\u200F${toArabicNum(tahun - 1)} \u2013 ${toArabicNum(tahun)}` : `${tahun - 1} – ${tahun}`
    const tableDir = isAr ? 'rtl' : 'ltr'
    const displayName = isAr ? (student?.metadata?.nama_arab || student?.name || '—') : (student?.name || '—')
    const displayVal = (v, zeroAsDash = false) => {
        if (v === '' || v === null || v === undefined || (v === 0 && zeroAsDash) || (v === '0' && zeroAsDash)) return '—';
        return isAr ? toArabicNum(v) : v
    }

    const displayMusyrif = isAr && musyrif ? translitToAr(musyrif) : musyrif
    const displayClassName = isAr && className ? translitClassToAr(className) : className

    const roomVal = student?.metadata?.kamar || '—'
    const roomObj = LIST_KAMAR.find(k => k.id === roomVal)
    const displayRoom = isAr ? (roomObj?.ar || roomVal) : (roomObj?.id || roomVal)

    const getFormattedPrintDate = () => {
        const now = new Date()
        const day = now.getDate()
        const year = now.getFullYear()
        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const timeStr = `${hours}:${minutes}`

        if (isAr) {
            const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
            const monthAr = monthsAr[now.getMonth()]
            const arDay = toArabicNum(day)
            const arYear = toArabicNum(year)
            const arTime = toArabicNum(timeStr)
            return `${arDay} ${monthAr} ${arYear} | ${arTime}`
        } else {
            const monthsId = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
            const monthId = monthsId[now.getMonth()]
            return `${day} ${monthId} ${year} ${timeStr}`
        }
    }

    const getReportNumber = () => {
        if (student?.metadata?.nomor_raport) return student.metadata.nomor_raport;
        if (extra?.nomor_raport) return extra.nomor_raport;

        const prefix = 'RPT';

        const getShortClassName = (name) => {
            if (!name) return 'CLASS';
            let clean = name.trim();
            const romanMatch = clean.match(/^(XII|XI|IX|VIII|VII|VI|IV|III|II|I|X|V)\s*([A-Za-z])?/i);
            if (romanMatch) {
                return `${romanMatch[1].toUpperCase()}${romanMatch[2] ? romanMatch[2].toUpperCase() : ''}`;
            }
            const numMatch = clean.match(/^(\d+)\s*([A-Za-z])/);
            if (numMatch) {
                return `${numMatch[1]}${numMatch[2].toUpperCase()}`;
            }
            const numOnlyMatch = clean.match(/^(\d+)/);
            if (numOnlyMatch) {
                return numOnlyMatch[1];
            }
            return clean.replace(/[\s/]/g, '').slice(0, 5).toUpperCase();
        };

        const cleanClass = getShortClassName(className);
        const monthName = (bulanObj?.id_str || 'BULAN').toUpperCase();
        const periodStr = `${monthName}${tahun}`;

        let orderStr = '001';
        if (studentIndex !== undefined && studentIndex !== null) {
            orderStr = String(studentIndex).padStart(3, '0');
        } else if (student?.registration_code) {
            const reg = String(student.registration_code).trim();
            const digits = reg.replace(/\D/g, '');
            if (digits.length >= 3) {
                orderStr = digits.slice(-3);
            } else if (digits.length > 0) {
                orderStr = digits.padStart(3, '0');
            } else {
                orderStr = reg.slice(-3).padStart(3, '0');
            }
        } else {
            let hash = 0;
            const name = student?.name || '';
            for (let i = 0; i < name.length; i++) {
                hash = name.charCodeAt(i) + ((hash << 5) - hash);
            }
            const orderNum = Math.abs(hash % 40) + 1;
            orderStr = String(orderNum).padStart(3, '0');
        }

        return `${prefix}/${cleanClass}/${periodStr}/${orderStr}`;
    }

    return (
        <div className="raport-card" data-student-id={student?.id} style={{
            fontFamily: "'Times New Roman', serif", width: pageW, minWidth: pageW, minHeight: pageH, background: '#fff',
            color: '#000', padding: '8mm 10mm 8mm 20mm', boxSizing: 'border-box', fontSize: '11pt', lineHeight: 1.4, pageBreakAfter: 'always', margin: '0 auto',
            position: 'relative'
        }}>
            {/* Gaya Cetak Dinamis */}
            <style>{`
                @media print {
                    @page {
                        size: ${pageSize === 'f4' ? '215mm 330mm' : 'A4'} !important;
                        margin: 0 !important;
                    }
                    body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .raport-card {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 8mm 10mm 8mm 20mm !important;
                        width: ${pageW} !important;
                        min-width: ${pageW} !important;
                        height: ${pageH} !important;
                        min-height: ${pageH} !important;
                        max-width: none !important;
                    }
                    .raport-header-flex {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        gap: 10px !important;
                        padding-bottom: 8px !important;
                    }
                    .raport-logo-box {
                        flex-shrink: 0 !important;
                        width: 60pt !important;
                        height: 60pt !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .raport-logo-box img {
                        width: 60pt !important;
                        height: 60pt !important;
                        object-fit: contain !important;
                    }
                    .raport-header-center {
                        flex: 1 !important;
                        text-align: center !important;
                        min-width: 0 !important;
                    }
                    .school-name-ar {
                        font-size: 26pt !important;
                        line-height: 1.05 !important;
                    }
                    .school-subtitle-ar {
                        font-size: 10.5pt !important;
                        line-height: 1.3 !important;
                    }
                    .school-name-id {
                        font-size: 11pt !important;
                    }
                    .school-address {
                        font-size: 8pt !important;
                    }
                    .divider-gradient { background: ${settings.report_color_primary || '#1a5c35'} !important; }
                }
            `}</style>
            {/* Header Sekolah */}
            <div style={{ marginBottom: 12 }}>
                <div className="raport-header-flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 8 }}>
                    {/* Logo Kiri (MBS) */}
                    <div className="raport-logo-box" style={{ flexShrink: 0, width: '60pt', height: '60pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={settings.logo_url || mbsLogo} alt="Logo sekolah" style={{ width: '60pt', height: '60pt', objectFit: 'contain', display: 'block' }} />
                    </div>
                    {/* Tengah (Nama Sekolah) */}
                    <div className="raport-header-center" style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                        {settings.school_subtitle_ar && (
                            <div className="school-subtitle-ar" style={{ fontSize: '10.5pt', color: '#444', direction: 'rtl', marginBottom: 2, fontFamily: "'Traditional Arabic', serif", fontWeight: 700, lineHeight: 1.3 }}>
                                {settings.school_subtitle_ar}
                            </div>
                        )}
                        <div className="school-name-ar" style={{
                            fontSize: '26pt', fontWeight: 900, color: settings.report_color_primary || '#1a5c35',
                            direction: 'rtl', fontFamily: "'Traditional Arabic', serif", letterSpacing: 0.5,
                            lineHeight: 1.05, marginBottom: 4,
                            textShadow: '0.4px 0 0 currentColor, -0.4px 0 0 currentColor'
                        }}>{settings.school_name_ar || ''}</div>
                        <div className="school-name-id" style={{ fontSize: '11pt', fontWeight: 700, letterSpacing: 0.8, color: '#333', marginTop: 2 }}>{settings.school_name_id || ''}</div>
                        <div className="school-address" style={{ fontSize: '8pt', color: '#666', marginTop: 3, lineHeight: 1.3 }}>{settings.school_address || ''}</div>
                    </div>
                    {/* Logo Kanan (Unit) */}
                    <div className="raport-logo-box" style={{ flexShrink: 0, width: '60pt', height: '60pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={unitLogo || settings.logo_url || mbsLogo} alt="Logo unit" style={{ width: '60pt', height: '60pt', objectFit: 'contain', display: 'block' }} />
                    </div>
                </div>
                <div className="divider-gradient" style={{ height: 3, background: `linear-gradient(90deg, ${settings.report_color_primary || '#1a5c35'}, ${settings.report_color_secondary || '#c8a400'}, ${settings.report_color_primary || '#1a5c35'})`, marginBottom: 0 }} />
                <div style={{ borderBottom: `3px double ${settings.report_color_primary || '#1a5c35'}`, marginTop: 3 }} />
            </div>

            {/* Judul Laporan */}
            <div style={{ textAlign: 'center', margin: '6px 0 10px', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                <div style={{ fontSize: isAr ? '16pt' : '16pt', fontWeight: 900, direction: isAr ? 'rtl' : 'ltr' }}>{L.reportTitle}</div>
                <div style={{ fontSize: isAr ? '14pt' : '13pt', fontWeight: 700, direction: isAr ? 'rtl' : 'ltr', marginTop: 2 }}>{isAr ? `${L.month} ${bulanObj?.ar || ''}` : `${L.month} ${bulanObj?.id_str || ''}`}</div>
            </div>

            {/* Info Santri & Kelas */}
            <table style={{ width: '100%', marginBottom: 10, fontSize: '10.5pt', borderCollapse: 'collapse', direction: tableDir }}>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={{ verticalAlign: 'middle', padding: '4px 0', width: '20%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>
                                <span>{L.studentName}</span>
                                <span>:</span>
                            </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, padding: '4px 0', width: '30%', textAlign: isAr ? 'right' : 'left', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>{displayName}</td>
                        <td style={{ verticalAlign: 'middle', padding: '4px 0', width: '20%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>
                                <span>{L.room}</span>
                                <span>:</span>
                            </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, width: '30%', textAlign: isAr ? 'right' : 'left', padding: '4px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>{displayRoom}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ccc' }}>
                        <td style={{ verticalAlign: 'middle', padding: '4px 0', width: '20%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>
                                <span>{L.class}</span>
                                <span>:</span>
                            </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: '4px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>{displayClassName}</td>
                        <td style={{ verticalAlign: 'middle', padding: '4px 0', width: '20%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>
                                <span>{L.year}</span>
                                <span>:</span>
                            </div>
                        </td>
                        <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: '4px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '10.5pt' }}>{yearDisplay}</td>
                    </tr>
                </tbody>
            </table>

            {/* Tabel Nilai */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', marginBottom: 12 }}>
                <thead>
                    <tr style={{ background: '#f0f4f8' }}>
                        {isAr ? <>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', width: '15%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center', fontWeight: 800, color: '#000', fontSize: '12pt' }}>{L.grade}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '10%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center', fontWeight: 800, color: '#000', fontSize: '12pt' }}>{L.score}</th>
                            <th colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', fontFamily: "'Traditional Arabic', serif", textAlign: 'center', fontWeight: 800, color: '#000', fontSize: '12pt' }}>{L.subject}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '6%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center', fontWeight: 800, color: '#000', fontSize: '12pt' }}>{L.num}</th>
                        </> : <>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '6%', textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.num}</th>
                            <th colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.subject}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', width: '10%', textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.score}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', width: '15%', textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.grade}</th>
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
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color || '#000', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{g ? gradeLabel(val) : '—'}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontSize: '10.5pt' }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '14pt', width: '34.5%' }}>{k.ar}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'right', color: '#444', width: '34.5%', fontSize: '10.5pt' }}>{k.id}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{numRows[i]}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center' }}>{numRows[i]}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'left', color: '#444', width: '34.5%' }}>{k.id}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '11pt', width: '34.5%' }}>{k.ar}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color || '#000' }}>{g ? gradeLabel(val) : '—'}</td>
                                </>}
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* Data Tambahan (Fisik, Hafalan, Kehadiran) */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'stretch' }}>
                {/* BB / TB */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: isAr ? '12pt' : '9pt', fontWeight: 700, marginBottom: 0, textAlign: 'center', background: '#f0f4f8', border: '1px solid #999', borderBottom: 'none', padding: '3px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                        {isAr ? 'التطور البدني' : 'PERKEMBANGAN FISIK'}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', flex: 1 }}>
                        <tbody>
                            <tr style={{ height: '50%' }}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700, width: '35%', fontSize: '10pt' }}>{displayVal(ex.berat_badan)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{L.weight}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'left' }}>{L.weight}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.berat_badan)}</td>
                                </>}
                            </tr>
                            <tr style={{ height: '50%' }}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700, width: '35%', fontSize: '10pt' }}>{displayVal(ex.tinggi_badan)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{L.height}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'left' }}>{L.height}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.tinggi_badan)}</td>
                                </>}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Ziyadah / Murojaah */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: isAr ? '12pt' : '9pt', fontWeight: 700, marginBottom: 0, textAlign: 'center', background: '#f0f4f8', border: '1px solid #999', borderBottom: 'none', padding: '3px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                        {isAr ? 'تطور الحفظ' : 'PERKEMBANGAN HAFALAN'}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', flex: 1 }}>
                        <tbody>
                            <tr style={{ height: '50%' }}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700, width: '35%', fontSize: '10pt' }}>{displayVal(ex.ziyadah, true)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{L.ziyadah}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'left' }}>{L.ziyadah}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.ziyadah, true)}</td>
                                </>}
                            </tr>
                            <tr style={{ height: '50%' }}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700, width: '35%', fontSize: '10pt' }}>{displayVal(ex.murojaah, true)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{L.murojaah}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'left' }}>{L.murojaah}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '13.5px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.murojaah, true)}</td>
                                </>}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Kehadiran */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: isAr ? '12pt' : '9pt', fontWeight: 700, marginBottom: 0, textAlign: 'center', background: '#f0f4f8', border: '1px solid #999', borderBottom: 'none', padding: '3px 0', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                        {isAr ? 'الغياب' : 'ABSENSI'}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', flex: 1 }}>
                        <tbody>
                            {[
                                { key: 'hari_sakit', label: L.sick },
                                { key: 'hari_izin', label: L.izin },
                                { key: 'hari_alpa', label: L.alpa },
                                { key: 'hari_pulang', label: L.home },
                            ].map(item => (
                                <tr key={item.key}>
                                    {isAr ? <>
                                        <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>
                                            {displayVal(ex[item.key], true) === '—' ? '—' : `${displayVal(ex[item.key], true)} يَوْم`}
                                        </td>
                                        <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt' }}>{item.label}</td>
                                    </> : <>
                                        <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{item.label}</td>
                                        <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>
                                            {displayVal(ex[item.key], true) === '—' ? '—' : `${displayVal(ex[item.key], true)} hari`}
                                        </td>
                                    </>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Skala Penilaian & Catatan */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'flex-start', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                <div style={{ flexShrink: 0 }}>
                    <table style={{ borderCollapse: 'collapse', fontSize: '9pt', direction: isAr ? 'rtl' : 'ltr' }}>
                        <thead>
                            <tr>
                                <th colSpan={2} style={{ border: '1px solid #999', padding: '3px 16px', background: '#f0f4f8', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isAr ? '12pt' : '9pt', textTransform: isAr ? 'none' : 'uppercase' }}>
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
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', fontSize: isAr ? '12pt' : '9pt' }}>{l}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', textAlign: 'center', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', whiteSpace: 'nowrap', fontSize: isAr ? '12pt' : '9pt' }}>{n}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {ex.catatan && (
                    <div style={{
                        flex: 1, alignSelf: 'stretch', border: '1px solid #ccc', borderRadius: 4, padding: '8px 12px',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{
                            fontWeight: 700, fontSize: isAr ? '12pt' : '9pt', color: '#555', marginBottom: 4,
                            direction: isAr ? 'rtl' : 'ltr', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit',
                            textAlign: isAr ? 'right' : 'left'
                        }}>
                            {isAr ? 'ملاحظة' : 'Catatan Musyrif'}
                        </div>
                        <div style={{
                            fontSize: (isAr && catatanArab) ? '12pt' : '9.5pt',
                            direction: (isAr && catatanArab) ? 'rtl' : 'ltr',
                            fontFamily: (isAr && catatanArab) ? "'Traditional Arabic', serif" : 'inherit',
                            textAlign: (isAr && catatanArab) ? 'right' : 'left',
                            lineHeight: 1.6
                        }}>
                            {isAr && catatanArab ? catatanArab : ex.catatan}
                        </div>
                    </div>
                )}
            </div>

            {/* Tanda Tangan */}
            <div style={{ display: 'flex', marginTop: 36, flexDirection: isAr ? 'row-reverse' : 'row', justifyContent: 'space-between', direction: isAr ? 'rtl' : 'ltr', gap: 10 }}>
                {[
                    {
                        label: isAr
                            ? (settings.headmaster_title_ar || 'مدير المعهد\nمعهد محمدية تانجول')
                            : (settings.headmaster_title_id || 'Pengasuh\nMuhammadiyah Boarding School Tanggul'),
                        sub: isAr ? (settings.headmaster_name_ar || '—') : (settings.headmaster_name_id || '—')
                    },
                    { label: L.musyrif, sub: displayMusyrif || '......................' },
                    { label: L.guardian, sub: '' }
                ].map((item, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '12pt' : '9pt', maxWidth: '32%', minWidth: 0 }}>
                        <div style={{ fontWeight: 700, whiteSpace: 'pre-line', height: '4.2em', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: isAr ? '12pt' : '8.5pt', lineHeight: 1.2, marginBottom: 8 }}>{item.label}</div>
                        <div style={{ height: 90 }} />
                        <div style={{ borderTop: '1px solid #333', paddingTop: 4, width: '90%', fontWeight: 700 }}>
                            {item.sub || '......................'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Metadata Cetak di Footer dengan QR Code Verifikasi */}
            <div className="raport-print-metadata" style={{
                position: 'absolute',
                bottom: '6mm',
                left: '20mm',
                right: '10mm',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '7.5pt',
                color: '#888',
                borderTop: '1px solid #eee',
                paddingTop: '6px',
                fontFamily: 'sans-serif',
                direction: isAr ? 'rtl' : 'ltr'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&format=svg&ecc=L&qzone=1&data=${encodeURIComponent(`${window.location.origin}/verify/raport?student=${student?.id}&no=${getReportNumber()}`)}`}
                        alt="Verification QR"
                        style={{ width: '42px', height: '42px', display: 'block', mixBlendMode: 'multiply' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: isAr ? 'right' : 'left', lineHeight: 1.2 }}>
                        <span style={{ fontWeight: 700, color: '#555' }}>{isAr ? 'بوابة LaporanMu الأكاديمية' : 'LaporanMu Academic Portal'}</span>
                        <span style={{ fontSize: '6.5pt', color: '#999', fontStyle: 'italic' }}>
                            {isAr ? 'امسح الرمز للتحقق من صحة التقرير' : 'Pindai QR untuk verifikasi keaslian raport'}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: isAr ? 'left' : 'right', lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 600, color: '#aaa' }}>
                        {isAr ? `رقم التقرير: ${toArabicNum(getReportNumber())}` : `No. Raport: ${getReportNumber()}`}
                    </span>
                    <span>{isAr ? `تاريخ الطباعة: ${getFormattedPrintDate()}` : `Waktu Cetak: ${getFormattedPrintDate()}`}</span>
                </div>
            </div>
        </div>
    )
}, printCardAreEqual)

export default RaportPrintCard
