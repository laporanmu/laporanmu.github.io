import React, { memo, useEffect } from 'react'
import { LABEL, toArabicNum, LIST_KAMAR } from '@utils/reports/raportConstants'
import { translitToAr, translitClassToAr } from '@utils/reports/translitData'
import { RAPORT_TYPES, getClassLevel, getGradePredicate } from '@features/raport/utils/raportTypeRegistry'
import mbsLogo from '@assets/images/logos/logo-mbs.png'
import smpLogo from '@assets/images/logos/logo-smp.png'
import smaLogo from '@assets/images/logos/logo-sma.jpg'

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
    if (prev.reportType !== next.reportType) return false
    if (prev.selectedSemester !== next.selectedSemester) return false
    if (prev.academicYear !== next.academicYear) return false

    // Deep-compare scores
    if (JSON.stringify(prev.scores) !== JSON.stringify(next.scores)) return false
    // Deep-compare extra fields
    if (JSON.stringify(prev.extra) !== JSON.stringify(next.extra)) return false

    if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) return false
    if (JSON.stringify(prev.layoutConfig) !== JSON.stringify(next.layoutConfig)) return false
    return true
}

const RaportPrintCard = memo(({ 
    student, 
    scores, 
    extra, 
    bulanObj, 
    tahun, 
    musyrif, 
    className, 
    lang = 'ar', 
    settings = {}, 
    catatanArab, 
    onRendered, 
    pageSize = 'a4', 
    studentIndex,
    reportType = 'bulanan',
    selectedSemester = 1,
    academicYear = '',
    selectedClass,
    layoutConfig = {}
}) => {
    // Resolve layoutConfig values with fallback defaults
    const lc = {
        arMainFontSize: 15.5,
        arSecFontSize: 13.5,
        arScaleFontSize: 13.5,
        arValueFontSize: 13.5,
        scoreColWidth: 10,
        gradeColWidth: 15,
        numColWidth: 6,
        subjectArWidth: 34.5,
        subjectIdWidth: 34.5,
        ...layoutConfig,
    }
    const sc = scores || {}, ex = extra || {}, L = LABEL[lang], isAr = lang === 'ar'
    const rtObj = RAPORT_TYPES[reportType] || RAPORT_TYPES.bulanan
    const criteria = rtObj.getCriteria(selectedClass)

    // Pondok Lisan: hitung total & rata-rata
    const isLisan = reportType === 'pondok_lisan'
    const isA4 = pageSize === 'a4'
    const lisanFilledScores = isLisan
        ? criteria.map(k => sc[k.key]).filter(v => v !== '' && v !== null && v !== undefined && !isNaN(Number(v)))
        : []
    const lisanTotal = lisanFilledScores.reduce((s, v) => s + Number(v), 0)
    const lisanAvg = lisanFilledScores.length > 0 ? Math.round(lisanTotal / lisanFilledScores.length) : 0
    const rp = isLisan ? '1px' : (isA4 ? '1.5px' : '2px') // row padding: kompak untuk lisan & A4/F4
    const rowPadding = isAr
        ? (isLisan ? (isA4 ? '1px 0' : '2px 0') : (isA4 ? '2.5px 0' : '4px 0'))
        : (isLisan ? (isA4 ? '2px 0' : '4px 0') : (isA4 ? '4px 0' : '7px 0'))
    const secPadding = isAr
        ? (isA4 ? '3px 7px' : '6px 7px')
        : (isA4 ? '5px 7px' : '9.5px 7px')
    const absPadding = isAr
        ? (isA4 ? '1.5px 7px' : '3px 7px')
        : (isA4 ? '3.5px 7px' : '6.5px 7px')
    const skalaPadding = isAr
        ? (isA4 ? '1px 14px' : '2px 14px')
        : (isA4 ? '3.5px 14px' : '5.5px 14px')
    const arFont = "'Traditional Arabic', serif"

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
    const isTanggul = String(settings.school_name_id || '').toLowerCase().includes('tanggul') ||
                      String(settings.school_address || '').toLowerCase().includes('tanggul')

    useEffect(() => { onRendered?.() }, [onRendered])

    const classLevel = selectedClass ? getClassLevel(selectedClass) : getClassLevel(className)
    const getGradeObj = (v) => getGradePredicate(v, reportType, classLevel)
    
    const gradeLabel = (v) => {
        const g = getGradeObj(v)
        return isAr ? g.label : g.id
    }

    const yearDisplay = reportType === 'bulanan'
        ? (isAr ? `\u200F${toArabicNum(tahun - 1)} \u2013 ${toArabicNum(tahun)}` : `${tahun - 1} – ${tahun}`)
        : (isAr ? toArabicNum(academicYear) : academicYear)

    const tableDir = isAr ? 'rtl' : 'ltr'
    const displayName = isAr ? (student?.metadata?.nama_arab || student?.name || '—') : (student?.name || '—')
    
    const displayVal = (v, zeroAsDash = false) => {
        if (v === '' || v === null || v === undefined || (v === 0 && zeroAsDash) || (v === '0' && zeroAsDash)) return '—';
        if (isAr) {
            let s = String(v);
            s = s.replace(/Halaman/gi, 'صفحة');
            s = s.replace(/Juz/gi, 'جزء');
            s = s.replace(/hari/gi, 'يوم');
            return toArabicNum(s);
        }
        return v
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

    const getVerificationUrl = () => {
        const origin = window.location.origin;
        const host = window.location.hostname;
        const reportNo = getReportNumber();
        const sId = student?.id || '';
        
        // Cek jika diakses lewat IP lokal agar HP satu Wi-Fi bisa langsung scan & akses local dev server
        const isLocalIp = host.startsWith('192.168.') || 
                          host.startsWith('10.') || 
                          host.startsWith('172.') ||
                          host.includes('.local');

        if (isLocalIp) {
            return `${origin}/verify?no=${reportNo}&s=${sId}`;
        }

        // Jika localhost / 127.0.0.1 (HP tidak bisa akses langsung), arahkan ke domain live aktif (laporanmu.my.id)
        if (host === 'localhost' || host === '127.0.0.1') {
            return `https://laporanmu.my.id/verify?no=${reportNo}&s=${sId}`;
        }
        
        // Di production, otomatis pakai domain aktif (dinamis)
        return `${origin}/verify?no=${reportNo}&s=${sId}`;
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
        const monthName = reportType === 'bulanan'
            ? (bulanObj?.id_str || 'BULAN').toUpperCase()
            : `SEM${selectedSemester}`;
        const periodStr = reportType === 'bulanan'
            ? `${monthName}${tahun}`
            : `${academicYear.replace('/', '')}`;

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

    const getReportTitle = () => {
        if (reportType === 'bulanan') {
            return L.reportTitle
        }
        return isAr ? rtObj.arName : rtObj.name
    }

    const getPeriodTitle = () => {
        if (reportType === 'bulanan') {
            return isAr ? `${L.month} ${bulanObj?.ar || ''}` : `${L.month} ${bulanObj?.id_str || ''}`
        }
        if (isAr) {
            return `الفصل الدراسي ${toArabicNum(selectedSemester)} (${selectedSemester === 1 ? 'الأول' : 'الثاني'})`
        }
        return `Semester ${selectedSemester} (${selectedSemester === 1 ? 'Ganjil' : 'Genap'})`
    }

    const getGradingScale = () => {
        if (reportType === 'bulanan') {
            return isAr
                ? [['٩', 'ممتاز'], ['٨', 'جيد جدا'], ['٦ – ٧', 'جيد'], ['٤ – ٥', 'مقبول'], ['٠ – ٣', 'راسب']]
                : [['9', 'Istimewa'], ['8', 'Sangat Baik'], ['6 – 7', 'Baik'], ['4 – 5', 'Cukup'], ['0 – 3', 'Kurang']]
        }
        if (reportType === 'umum') {
            return [
                ['90 – 100', 'A (Sangat Baik)'],
                ['80 – 89', 'B (Baik)'],
                ['70 – 79', 'C (Cukup)'],
                ['< 70', 'D (Kurang)']
            ]
        }
        const lvl = classLevel
        if (lvl === 'SMA') {
            return isAr
                ? [['٩٠ – ١٠٠', 'ممتاز'], ['٨٠ – ٨٩', 'جيد جدا'], ['٦٠ – ٧٩', 'جيد'], ['٥٠ – ٥٩', 'مقبول'], ['٠ – ٤٩', 'ضعيف']]
                : [['90 – 100', 'Istimewa (A)'], ['80 – 89', 'Sangat Baik (B)'], ['60 – 79', 'Baik (C)'], ['50 – 59', 'Cukup (D)'], ['0 – 49', 'Kurang (E)']]
        } else {
            return isAr
                ? [['٩٠ – ١٠٠', 'ممتاز'], ['٨٠ – ٨٩', 'جيد جدا'], ['٦٠ – ٧٩', 'جيد'], ['٥٠ – ٥٩', 'مقبول'], ['٠ – ٤٩', 'راسب']]
                : [['90 – 100', 'Istimewa (A)'], ['80 – 89', 'Sangat Baik (B)'], ['60 – 79', 'Baik (C)'], ['50 – 59', 'Cukup (D)'], ['0 – 49', 'Gagal (E)']]
        }
    }

    return (
        <div className="raport-card" data-student-id={student?.id} style={{
            fontFamily: "'Times New Roman', serif", width: pageW, minWidth: pageW, minHeight: pageH, background: '#fff',
            color: '#000', padding: isA4 ? '4mm 10mm 4mm 20mm' : '8mm 10mm 8mm 20mm', boxSizing: 'border-box', fontSize: '11pt', lineHeight: 1.4, pageBreakAfter: 'always', margin: '0 auto',
            position: 'relative'
        }}>
            {/* Gaya Cetak Dinamis */}
            <style>{`
                @media print {
                    @page {
                        size: ${pageSize === 'f4' ? '215mm 330mm' : 'A4'};
                        margin: ${pageSize === 'f4' ? '8mm 10mm 8mm 20mm' : '4mm 10mm 4mm 20mm'};
                    }
                    body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .raport-card {
                        box-shadow: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-width: 100% !important;
                        height: 100% !important;
                        min-height: 100% !important;
                        max-width: none !important;
                        box-sizing: border-box !important;
                    }
                    .raport-print-metadata {
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
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
                        width: ${isLisan ? '60pt' : '68pt'} !important;
                        height: ${isLisan ? '60pt' : '68pt'} !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                    }
                    .raport-logo-box img {
                        width: ${isLisan ? '60pt' : '68pt'} !important;
                        height: ${isLisan ? '60pt' : '68pt'} !important;
                        object-fit: contain !important;
                    }
                    .raport-header-center {
                        flex: 1 !important;
                        text-align: center !important;
                        min-width: 0 !important;
                    }
                    .school-name-ar {
                        font-size: ${isLisan ? '26pt' : '30pt'} !important;
                        line-height: 1.05 !important;
                    }
                    .school-subtitle-ar {
                        font-size: ${isLisan ? '12pt' : '14pt'} !important;
                        line-height: 1.3 !important;
                    }
                    .school-name-id {
                        font-size: ${isLisan ? '13pt' : '15pt'} !important;
                        color: #111 !important;
                        font-weight: 800 !important;
                    }
                    .school-address {
                        font-size: ${isTanggul ? '8.1pt' : '8.5pt'} !important;
                        font-family: ${isTanggul ? "'Segoe Print', 'Segoe Script', 'Monotype Corsiva', cursive, sans-serif" : 'inherit'} !important;
                        color: #333 !important;
                        line-height: 1.35 !important;
                        font-weight: 600 !important;
                    }
                    .divider-gradient { background: ${settings.report_color_primary || '#1a5c35'} !important; }
                }
            `}</style>
            {/* Header Sekolah */}
            <div style={{ marginBottom: isLisan ? (isA4 ? 4 : 6) : (isA4 ? 6 : 12) }}>
                <div className="raport-header-flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: isLisan ? (isA4 ? 2 : 4) : (isA4 ? 4 : 8) }}>
                    {/* Logo Kiri (Unit/Sekolah) */}
                    <div className="raport-logo-box" style={{ flexShrink: 0, width: isLisan ? '60pt' : '68pt', height: isLisan ? '60pt' : '68pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={unitLogo || settings.logo_url || mbsLogo} alt="Logo sekolah" style={{ width: isLisan ? '60pt' : '68pt', height: isLisan ? '60pt' : '68pt', objectFit: 'contain', display: 'block' }} />
                    </div>
                    {/* Tengah (Nama Sekolah) */}
                    <div className="raport-header-center" style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
                        {settings.school_subtitle_ar && (
                            <div className="school-subtitle-ar" style={{ fontSize: isLisan ? '12pt' : '14pt', color: '#444', direction: 'rtl', marginBottom: 2, fontFamily: "'Traditional Arabic', serif", fontWeight: 700, lineHeight: 1.3 }}>
                                {settings.school_subtitle_ar}
                            </div>
                        )}
                        <div className="school-name-ar" style={{
                            fontSize: isLisan ? '26pt' : '30pt', fontWeight: 900, color: settings.report_color_primary || '#1a5c35',
                            direction: 'rtl', fontFamily: "'Traditional Arabic', serif", letterSpacing: 0.5,
                            lineHeight: 1.05, marginBottom: 4,
                            textShadow: '0.4px 0 0 currentColor, -0.4px 0 0 currentColor'
                        }}>{settings.school_name_ar || ''}</div>
                        <div className="school-name-id" style={{ 
                            fontSize: isLisan ? '13pt' : '15pt', 
                            fontWeight: 800, 
                            letterSpacing: 0.8, 
                            color: '#111', 
                            marginTop: 2 
                        }}>{settings.school_name_id || ''}</div>
                        {isTanggul ? (
                            <div className="school-address" style={{ 
                                fontSize: '8.1pt', 
                                color: '#333', 
                                marginTop: 3, 
                                lineHeight: 1.35, 
                                fontWeight: 600,
                                fontFamily: "'Segoe Print', 'Segoe Script', 'Monotype Corsiva', cursive, sans-serif"
                            }}>
                                <div>Jl. Pemandian No. 88 Dusun Krajan II Patemon Tanggul Jember 68155</div>
                                <div>Asrama Tahfidz Al-Qur'an Bambu Kuning Jl. Teratai No. 11 Tanggul Jember 68155</div>
                            </div>
                        ) : (
                            <div className="school-address" style={{ fontSize: '8.5pt', color: '#666', marginTop: 3, lineHeight: 1.3 }}>{settings.school_address || ''}</div>
                        )}
                    </div>
                    {/* Logo Kanan (Pondok/Lembaga) */}
                    <div className="raport-logo-box" style={{ flexShrink: 0, width: isLisan ? '60pt' : '68pt', height: isLisan ? '60pt' : '68pt', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={settings.logo_url || mbsLogo} alt="Logo pondok" style={{ width: isLisan ? '60pt' : '68pt', height: isLisan ? '60pt' : '68pt', objectFit: 'contain', display: 'block' }} />
                    </div>
                </div>
                <div className="divider-gradient" style={{ height: 3, background: `linear-gradient(90deg, ${settings.report_color_primary || '#1a5c35'}, ${settings.report_color_secondary || '#c8a400'}, ${settings.report_color_primary || '#1a5c35'})`, marginBottom: 0 }} />
                <div style={{ borderBottom: `3px double ${settings.report_color_primary || '#1a5c35'}`, marginTop: 3 }} />
            </div>

            {/* Judul Laporan */}
            <div style={{ 
                textAlign: 'center', 
                margin: isLisan 
                    ? (isA4 ? '2px 0 4px' : '2px 0 6px') 
                    : (isA4 ? (isAr ? '4px 0 6px' : '12px 0 18px') : (isAr ? '6px 0 10px' : '18px 0 26px')), 
                fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' 
            }}>
                <div style={{ fontSize: isAr ? '28pt' : (isLisan ? '14pt' : '18pt'), fontWeight: 900, direction: isAr ? 'rtl' : 'ltr', lineHeight: isAr ? 1.15 : 1.3 }}>{getReportTitle()}</div>
                <div style={{ fontSize: isAr ? '22pt' : (isLisan ? '12pt' : '14pt'), fontWeight: 700, direction: isAr ? 'rtl' : 'ltr', marginTop: isAr ? 4 : 10, lineHeight: isAr ? 1.15 : 1.3 }}>{getPeriodTitle()}</div>
            </div>

            {/* Info Santri & Kelas */}
            <table style={{ width: '100%', marginBottom: isLisan ? (isA4 ? 4 : 6) : (isA4 ? 6 : 10), fontSize: isAr ? '10.5pt' : '11.5pt', borderCollapse: 'collapse', direction: tableDir }}>
                <tbody>
                    {isLisan ? (<>
                        {/* Baris 1: Nama | Kelas */}
                        <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{isAr ? 'اسم الطالب' : 'Nama Santri'}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, padding: rowPadding, width: '30%', textAlign: isAr ? 'right' : 'left', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{displayName}</td>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{L.class}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, width: '30%', textAlign: isAr ? 'right' : 'left', padding: rowPadding, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{displayClassName}</td>
                        </tr>
                        {/* Baris 2: No. Absen | Tahun */}
                        <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{isAr ? 'رقم الطالب' : 'No. Absen'}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, padding: rowPadding, width: '30%', textAlign: isAr ? 'right' : 'left', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                {studentIndex !== undefined && studentIndex !== null ? (isAr ? toArabicNum(studentIndex) : studentIndex) : '—'}
                            </td>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{L.year}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: rowPadding, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{yearDisplay}</td>
                        </tr>
                    </>) : (<>
                        {/* Baris 1 (non-lisan): Nama | Kamar */}
                        <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{L.studentName}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, padding: rowPadding, width: '30%', textAlign: isAr ? 'right' : 'left', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{displayName}</td>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{L.room}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, width: '30%', textAlign: isAr ? 'right' : 'left', padding: rowPadding, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{displayRoom}</td>
                        </tr>
                        {/* Baris 2 (non-lisan): Kelas | Tahun */}
                        <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{L.class}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: rowPadding, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{displayClassName}</td>
                            <td style={{ verticalAlign: 'middle', padding: rowPadding, width: '20%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: isAr ? 0 : '14px', paddingLeft: isAr ? '14px' : 0, boxSizing: 'border-box', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '11.5pt', lineHeight: isAr ? 1.15 : 1.25 }}>
                                    <span>{L.year}</span>
                                    <span>:</span>
                                </div>
                            </td>
                            <td style={{ verticalAlign: 'middle', fontWeight: 700, textAlign: isAr ? 'right' : 'left', padding: rowPadding, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '16pt' : '12pt', lineHeight: isAr ? 1.15 : 1.25 }}>{yearDisplay}</td>
                        </tr>
                    </>)}
                </tbody>
            </table>

            {/* Label Section Ujian Lisan */}
            {isLisan && (
                <div style={{ textAlign: isAr ? 'right' : 'left', direction: isAr ? 'rtl' : 'ltr', fontFamily: arFont, fontSize: isAr ? '13pt' : '11pt', fontWeight: 700, marginBottom: 2 }}>
                    {isAr ? 'الاختبار الشفهي' : 'Ujian Lisan'}
                </div>
            )}

            {/* Tabel Nilai */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', marginBottom: isLisan ? (isA4 ? 3 : 4) : (isA4 ? 6 : 12) }}>
                <thead>
                    <tr style={{ background: '#f0f4f8' }}>
                        {isAr ? <>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 8px`, width: `${lc.gradeColWidth}%`, fontFamily: arFont, textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isLisan ? '16pt' : '14.5pt' }}>{L.grade}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, width: `${lc.scoreColWidth}%`, fontFamily: arFont, textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isLisan ? '16pt' : '14.5pt' }}>{L.score}</th>
                            <th colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, fontFamily: arFont, textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isLisan ? '16pt' : '14.5pt' }}>{L.subject}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, width: `${lc.numColWidth}%`, fontFamily: arFont, textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isLisan ? '16pt' : '14.5pt' }}>{L.num}</th>
                        </> : <>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, width: `${lc.numColWidth}%`, textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.num}</th>
                            <th colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.subject}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, width: `${lc.scoreColWidth}%`, textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.score}</th>
                            <th style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 8px`, width: `${lc.gradeColWidth}%`, textAlign: 'center', fontWeight: 800, color: '#000', textTransform: 'uppercase' }}>{L.grade}</th>
                        </>}
                    </tr>
                </thead>
                <tbody>
                    {criteria.map((k, i) => {
                        const val = sc[k.key]
                        const hasVal = val !== '' && val !== null && val !== undefined
                        const g = hasVal ? getGradeObj(val) : null
                        const numRows = isAr ? [...Array(criteria.length).keys()].map(n => toArabicNum(n + 1)) : [...Array(criteria.length).keys()].map(n => n + 1)
                        return (
                            <tr key={k.key} style={isLisan && isAr ? { height: '20pt' } : undefined}>
                                {isAr ? <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 8px`, textAlign: 'center', fontWeight: 700, color: '#000', fontFamily: arFont, fontSize: isLisan ? '16pt' : '13.5pt', lineHeight: 1.1 }}>{hasVal ? gradeLabel(val) : '—'}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, textAlign: 'center', fontWeight: 700, fontFamily: arFont, fontSize: isLisan ? '16pt' : '13.5pt', lineHeight: 1.1 }}>{displayVal(val)}</td>
                                    {/* Kolom subject: lisan+Arab = hanya Arabic (colSpan=2), mode lain = 2 kolom */}
                                    {(isLisan && isAr) ? (
                                        <td colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'right', fontFamily: arFont, fontSize: isLisan ? '16pt' : `${lc.arMainFontSize}pt`, lineHeight: 1.1 }}>{k.ar || k.id}</td>
                                    ) : k.ar ? (
                                        <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'right', fontFamily: arFont, fontSize: isLisan ? '16pt' : `${lc.arMainFontSize}pt`, width: `${lc.subjectArWidth}%`, lineHeight: 1.1 }}>{k.ar}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'right', color: '#444', width: `${lc.subjectIdWidth}%`, fontSize: '10.5pt', fontFamily: 'inherit', lineHeight: 1.2 }}>{k.id}</td>
                                        </>
                                    ) : (
                                        <td colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'right', color: '#444', fontSize: '10.5pt', fontFamily: 'inherit', lineHeight: 1.2 }}>{k.id}</td>
                                    )}
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, textAlign: 'center', fontFamily: arFont, fontSize: isLisan ? '16pt' : `${lc.arValueFontSize}pt`, lineHeight: 1.1 }}>{numRows[i]}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, textAlign: 'center', width: `${lc.numColWidth}%` }}>{numRows[i]}</td>
                                    {k.ar ? (
                                        <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'left', color: '#444', width: `${lc.subjectIdWidth}%` }}>{k.id}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: isLisan ? '16pt' : `${lc.arMainFontSize}pt`, width: `${lc.subjectArWidth}%`, lineHeight: 1.1 }}>{k.ar}</td>
                                        </>
                                    ) : (
                                        <td colSpan={2} style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 10px`, textAlign: 'left', color: '#444', fontSize: '11pt' }}>{k.id}</td>
                                    )}
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 6px`, textAlign: 'center', fontWeight: 700, width: `${lc.scoreColWidth}%` }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: `${rp} 8px`, textAlign: 'center', fontWeight: 700, color: '#000', width: `${lc.gradeColWidth}%` }}>{hasVal ? gradeLabel(val) : '—'}</td>
                                </>}
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* Total & Rata-rata (Pondok Lisan) — full-width, sesuai Excel */}
            {isLisan && lisanFilledScores.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', direction: tableDir, marginBottom: 6, marginTop: -1 }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '4px 16px', textAlign: 'center', fontWeight: 700, fontFamily: "'Traditional Arabic', serif", fontSize: '12pt', background: '#f0f4f8', width: '25%' }}>{toArabicNum(lisanTotal)}</td>
                                <td style={{ border: '1px solid #999', padding: '4px 14px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt', fontWeight: 700 }}>المجموع الإجمالي</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '4px 14px', textAlign: 'left', fontWeight: 700 }}>Jumlah Total</td>
                                <td style={{ border: '1px solid #999', padding: '4px 16px', textAlign: 'center', fontWeight: 700, background: '#f0f4f8', width: '25%' }}>{lisanTotal}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '4px 16px', textAlign: 'center', fontWeight: 700, fontFamily: "'Traditional Arabic', serif", fontSize: '12pt', background: '#f0f4f8', width: '25%' }}>{toArabicNum(lisanAvg)}</td>
                                <td style={{ border: '1px solid #999', padding: '4px 14px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif", fontSize: '12pt', fontWeight: 700 }}>المعدل</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '4px 14px', textAlign: 'left', fontWeight: 700 }}>Nilai Rata-Rata</td>
                                <td style={{ border: '1px solid #999', padding: '4px 16px', textAlign: 'center', fontWeight: 700, background: '#f0f4f8', width: '25%' }}>{lisanAvg}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
            )}
            {/* Data Tambahan (Fisik, Hafalan, Kehadiran) */}
            {(rtObj.hasFisik || rtObj.hasHafalan || rtObj.hasAttendance) && (
                <div style={{ display: 'flex', gap: 14, marginBottom: isA4 ? 8 : 14, flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'stretch' }}>
                    {/* BB / TB */}
                    {rtObj.hasFisik && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: isAr ? (isLisan ? '16pt' : '14.5pt') : '9pt', fontWeight: 800, marginBottom: 0, textAlign: 'center', background: '#f0f4f8', border: '1px solid #999', borderBottom: 'none', padding: '3px 0', fontFamily: isAr ? arFont : 'inherit' }}>
                                {isAr ? 'التطور البدني' : 'PERKEMBANGAN FISIK'}
                            </div>
                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: isAr ? '10pt' : '11.5pt', flex: 1 }}>
                                <tbody>
                                    <tr style={{ height: '50%' }}>
                                        {isAr ? <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '35%', fontSize: `${lc.arSecFontSize}pt`, fontFamily: arFont }}>{displayVal(ex.berat_badan)}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'right', fontFamily: arFont, fontSize: `${lc.arSecFontSize}pt` }}>{L.weight}</td>
                                        </> : <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'left' }}>{L.weight}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.berat_badan)}</td>
                                        </>}
                                    </tr>
                                    <tr style={{ height: '50%' }}>
                                        {isAr ? <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '35%', fontSize: `${lc.arSecFontSize}pt`, fontFamily: arFont }}>{displayVal(ex.tinggi_badan)}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'right', fontFamily: arFont, fontSize: `${lc.arSecFontSize}pt` }}>{L.height}</td>
                                        </> : <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'left' }}>{L.height}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.tinggi_badan)}</td>
                                        </>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Ziyadah / Murojaah */}
                    {rtObj.hasHafalan && (
                        <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: isAr ? (isLisan ? '16pt' : '14.5pt') : '9pt', fontWeight: 800, marginBottom: 0, textAlign: 'center', background: '#f0f4f8', border: '1px solid #999', borderBottom: 'none', padding: '3px 0', fontFamily: isAr ? arFont : 'inherit' }}>
                                {isAr ? 'تطور الحفظ' : 'PERKEMBANGAN HAFALAN'}
                            </div>
                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: isAr ? '10pt' : '11.5pt', flex: 1 }}>
                                <tbody>
                                    <tr style={{ height: '50%' }}>
                                        {isAr ? <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '55%', fontSize: `${lc.arSecFontSize}pt`, fontFamily: arFont }}>{displayVal(ex.ziyadah, true)}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'right', fontFamily: arFont, fontSize: `${lc.arSecFontSize}pt`, width: '45%' }}>{L.ziyadah}</td>
                                        </> : <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'left', width: '45%' }}>{L.ziyadah}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '55%' }}>{displayVal(ex.ziyadah, true)}</td>
                                        </>}
                                    </tr>
                                    <tr style={{ height: '50%' }}>
                                        {isAr ? <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '55%', fontSize: `${lc.arSecFontSize}pt`, fontFamily: arFont }}>{displayVal(ex.murojaah, true)}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'right', fontFamily: arFont, fontSize: `${lc.arSecFontSize}pt`, width: '45%' }}>{L.murojaah}</td>
                                        </> : <>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'left', width: '45%' }}>{L.murojaah}</td>
                                            <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: secPadding, textAlign: 'center', fontWeight: 700, width: '55%' }}>{displayVal(ex.murojaah, true)}</td>
                                        </>}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Kehadiran */}
                    {rtObj.hasAttendance && (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: isAr ? (isLisan ? '16pt' : '14.5pt') : '9pt', fontWeight: 800, marginBottom: 0, textAlign: 'center', background: '#f0f4f8', border: '1px solid #999', borderBottom: 'none', padding: '3px 0', fontFamily: isAr ? arFont : 'inherit' }}>
                                {isAr ? 'الغياب' : 'ABSENSI'}
                            </div>
                            <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: isAr ? '9.5pt' : '11pt', flex: 1 }}>
                                <tbody>
                                    {[
                                        { key: 'hari_sakit', label: L.sick },
                                        { key: 'hari_izin', label: L.izin },
                                        { key: 'hari_alpa', label: L.alpa },
                                        { key: 'hari_pulang', label: L.home },
                                    ].map(item => (
                                        <tr key={item.key}>
                                            {isAr ? <>
                                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: absPadding, textAlign: 'center', fontWeight: 700, width: '35%', fontFamily: arFont, fontSize: `${lc.arSecFontSize}pt` }}>
                                                    {displayVal(ex[item.key], true) === '—' ? '—' : `${displayVal(ex[item.key], true)} يَوْم`}
                                                </td>
                                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: absPadding, textAlign: 'right', fontFamily: arFont, fontSize: `${lc.arSecFontSize}pt` }}>{item.label}</td>
                                            </> : <>
                                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: absPadding, textAlign: 'left' }}>{item.label}</td>
                                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: absPadding, textAlign: 'center', fontWeight: 700, width: '35%' }}>
                                                    {displayVal(ex[item.key], true) === '—' ? '—' : `${displayVal(ex[item.key], true)} hari`}
                                                </td>
                                            </>}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Skala Penilaian & Catatan */}
            <div style={{ display: 'flex', gap: 16, marginTop: isLisan ? (isA4 ? 4 : 6) : (isA4 ? 6 : 10), alignItems: 'flex-start', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                {/* Wrapper skala — dua tabel sejajar kalau lisan SMP */}
                <div style={{ flexShrink: 0, display: 'flex', gap: 16, flexDirection: isAr ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
                    {/* Skala Utama */}
                    <table style={{ borderCollapse: 'collapse', fontSize: '9pt', direction: isAr ? 'rtl' : 'ltr' }}>
                        <thead>
                            <tr>
                                <th colSpan={2} style={{ border: '1px solid #999', padding: isA4 ? '2px 16px' : '3px 16px', background: '#f0f4f8', fontFamily: isAr ? arFont : 'inherit', textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isAr ? (isLisan ? '16pt' : '14.5pt') : '10.5pt', textTransform: isAr ? 'none' : 'uppercase' }}>
                                    {isAr ? 'نظام التقدير' : L.gradeScale}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {getGradingScale().map(([n, l]) => (
                                <tr key={n}>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: skalaPadding, fontFamily: isAr ? arFont : 'inherit', textAlign: isAr ? 'right' : 'left', fontSize: isAr ? `${lc.arScaleFontSize}pt` : '10.5pt', minWidth: '80px' }}>{l}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: skalaPadding, textAlign: 'center', fontFamily: isAr ? arFont : 'inherit', whiteSpace: 'nowrap', fontSize: isAr ? `${lc.arScaleFontSize}pt` : '10.5pt', minWidth: '60px' }}>{n}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {/* Skala Praktek Ibadah (SMP Lisan only) */}
                    {isLisan && classLevel === 'SMP' && (
                        <table style={{ borderCollapse: 'collapse', fontSize: '9pt', direction: isAr ? 'rtl' : 'ltr' }}>
                            <thead>
                                <tr>
                                    <th colSpan={2} style={{ border: '1px solid #999', padding: isA4 ? '2px 16px' : '3px 16px', background: '#f0f4f8', fontFamily: isAr ? arFont : 'inherit', textAlign: 'center', fontWeight: 800, color: '#000', fontSize: isAr ? '11.5pt' : '10.5pt', textTransform: isAr ? 'none' : 'uppercase', whiteSpace: 'nowrap' }}>
                                        {isAr ? 'الاختبار التطبيقي' : 'Praktek Ibadah'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(isAr
                                    ? [['أ', '٩٥ – ١٠٠'], ['ب', '٨٠ – ٨٩'], ['ج', '< ٧٩']]
                                    : [['A', '95 – 100'], ['B', '80 – 89'], ['C', '< 79']]
                                ).map(([letter, range]) => (
                                    <tr key={letter}>
                                        <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: skalaPadding, fontFamily: isAr ? arFont : 'inherit', textAlign: isAr ? 'right' : 'left', fontSize: isAr ? '11.5pt' : '10.5pt', minWidth: '40px' }}>{letter}</td>
                                        <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: skalaPadding, textAlign: 'center', fontFamily: isAr ? arFont : 'inherit', whiteSpace: 'nowrap', fontSize: isAr ? '11.5pt' : '10.5pt', minWidth: '60px' }}>{range}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {rtObj.hasCatatan && ex.catatan && (
                    <div style={{
                        flex: 1, alignSelf: 'stretch', border: '1px solid #ccc', borderRadius: 4, padding: isA4 ? '6px 10px' : '8px 12px',
                        display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{
                            fontWeight: 700, fontSize: isAr ? '12pt' : '9pt', color: '#555', marginBottom: 4,
                            direction: isAr ? 'rtl' : 'ltr', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit',
                            textAlign: isAr ? 'right' : 'left'
                        }}>
                            {isAr ? 'ملاحظة' : 'Catatan Wali Kelas'}
                        </div>
                        <div style={{
                            fontSize: (isAr && catatanArab) ? '12pt' : '9.5pt',
                            direction: (isAr && catatanArab) ? 'rtl' : 'ltr',
                            fontFamily: (isAr && catatanArab) ? "'Traditional Arabic', serif" : 'inherit',
                            textAlign: (isAr && catatanArab) ? 'right' : 'left',
                            lineHeight: isA4 ? 1.4 : 1.6
                        }}>
                            {isAr && catatanArab ? catatanArab : ex.catatan}
                        </div>
                    </div>
                )}
            </div>

            {/* Tanda Tangan */}
            <div style={{ display: 'flex', marginTop: isLisan ? (isA4 ? 6 : 8) : (isA4 ? 12 : 36), flexDirection: 'row', justifyContent: 'space-between', direction: isAr ? 'rtl' : 'ltr', gap: 10 }}>
                {(isAr ? [
                    {
                        label: settings.headmaster_title_ar || 'مدير المعهد\nمعهد محمدية تانجول',
                        sub: isAr ? (settings.headmaster_name_ar || '—') : (settings.headmaster_name_id || '—')
                    },
                    { label: isLisan ? 'رائد الفصل' : L.musyrif, sub: displayMusyrif || '......................' },
                    { label: L.guardian, sub: '' },
                ] : [
                    { label: L.guardian, sub: '' },
                    { label: isLisan ? 'Wali Kelas' : L.musyrif, sub: displayMusyrif || '......................' },
                    {
                        label: settings.headmaster_title_id || 'Pengasuh\nMuhammadiyah Boarding School Tanggul',
                        sub: settings.headmaster_name_id || '—'
                    },
                ]).map((item, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', fontSize: isAr ? '14pt' : '10pt', maxWidth: '32%', minWidth: 0 }}>
                        <div style={{ fontWeight: 700, whiteSpace: 'pre-line', height: isLisan ? '2.8em' : '4.2em', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontSize: isAr ? '14.5pt' : '9.5pt', lineHeight: 1.25, marginBottom: 8 }}>{item.label}</div>
                        <div style={{ height: isLisan ? (isA4 ? 35 : 45) : (isA4 ? 50 : 90) }} />
                        <div style={{ borderTop: '1px solid #333', paddingTop: 4, width: '90%', fontWeight: 700, fontSize: isAr ? '16pt' : '10.5pt' }}>
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
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&format=svg&ecc=L&qzone=1&data=${encodeURIComponent(getVerificationUrl())}`}
                        alt="Verification QR"
                        style={{ width: '42px', height: '42px', display: 'block', backgroundColor: '#fff', padding: '2px', border: '1px solid #eee', borderRadius: '4px' }}
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
                        {isAr ? (
                            <>
                                <span>رقم التقرير: </span>
                                <span style={{ direction: 'ltr', display: 'inline-block' }}>{getReportNumber()}</span>
                            </>
                        ) : (
                            `No. Raport: ${getReportNumber()}`
                        )}
                    </span>
                    <span>{isAr ? `تاريخ الطباعة: ${getFormattedPrintDate()}` : `Waktu Cetak: ${getFormattedPrintDate()}`}</span>
                </div>
            </div>
        </div>
    )
}, printCardAreEqual)

export default RaportPrintCard
