import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faGraduationCap, faCalendarAlt, faChevronLeft, faChevronRight,
    faPrint, faCheck, faSpinner, faFloppyDisk,
    faChartPie, faTableList, faMagnifyingGlass, faArrowLeft, faDownload,
    faCircleCheck, faCircleExclamation, faTriangleExclamation,
    faBolt, faXmark, faSchool, faClipboardList, faUsers,
    faMosque, faBookOpen, faBroom, faLanguage, faStar,
    faWeightScale, faRulerVertical, faBandage, faDoorOpen,
    faCloudArrowUp, faFileLines, faFilePdf, faFileZipper, faBoxArchive
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import Modal from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

// ─── Constants ───────────────────────────────────────────────────────────────

const BULAN = [
    { id: 1, ar: 'يناير', id_str: 'Januari' },
    { id: 2, ar: 'فبراير', id_str: 'Februari' },
    { id: 3, ar: 'مارس', id_str: 'Maret' },
    { id: 4, ar: 'أبريل', id_str: 'April' },
    { id: 5, ar: 'مايو', id_str: 'Mei' },
    { id: 6, ar: 'يونيو', id_str: 'Juni' },
    { id: 7, ar: 'يوليو', id_str: 'Juli' },
    { id: 8, ar: 'أغسطس', id_str: 'Agustus' },
    { id: 9, ar: 'سبتمبر', id_str: 'September' },
    { id: 10, ar: 'أكتوبر', id_str: 'Oktober' },
    { id: 11, ar: 'نوفمبر', id_str: 'November' },
    { id: 12, ar: 'ديسمبر', id_str: 'Desember' },
]

const KRITERIA = [
    { key: 'nilai_akhlak', ar: 'الأخلاق', arShort: 'الأخلاق', id: 'Akhlak', icon: faStar, color: '#f59e0b' },
    { key: 'nilai_ibadah', ar: 'العبادة', arShort: 'العبادة', id: 'Ibadah', icon: faMosque, color: '#6366f1' },
    { key: 'nilai_kebersihan', ar: 'النظافة', arShort: 'النظافة', id: 'Kebersihan', icon: faBroom, color: '#06b6d4' },
    { key: 'nilai_quran', ar: 'تحسين القراءة وحفظ القرآن', arShort: 'القرآن', id: "Al-Qur'an", icon: faBookOpen, color: '#10b981' },
    { key: 'nilai_bahasa', ar: 'اللغة', arShort: 'اللغة', id: 'Bahasa', icon: faLanguage, color: '#8b5cf6' },
]

const GRADE = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'ممتاز', id: 'Istimewa', color: '#000', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981' }
    if (num >= 8) return { label: 'جيد جدا', id: 'Sangat Baik', color: '#000', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6' }
    if (num >= 6) return { label: 'جيد', id: 'Baik', color: '#000', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1' }
    if (num >= 4) return { label: 'مقبول', id: 'Cukup', color: '#000', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b' }
    return { label: 'راسب', id: 'Kurang', color: '#ef4444', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444' }
}

const toArabicNum = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

const LABEL = {
    ar: {
        studentName: 'اسم الطالب', room: 'الغرفة', class: 'الفصل', year: 'العام الدراسي',
        dailyWork: 'الأعمال اليومية', subject: 'المواد الدراسية', score: 'النقاط',
        grade: 'التقدير', num: 'الرقم', weight: 'وزن البدن', height: 'طول البدن',
        ziyadah: 'الزيادة', murojaah: 'المراجعة', sick: 'المريض', home: 'الإجازة',
        gradeScale: 'نظام التقدير',
        headmaster: 'مدير معهد محمدية الإسلامي تانجول',
        headmasterSub: 'كياهي الحاج محمد علي معصوم، ليسانس',
        musyrif: 'رائد الحجرة', guardian: 'ولي الأمر',
        reportTitle: 'نتيجة الشخصية', month: 'شهر',
    },
    id: {
        studentName: 'Nama Santri', room: 'Kamar', class: 'Kelas', year: 'Tahun Ajaran',
        dailyWork: 'Amal Harian', subject: 'Mata Pelajaran', score: 'Nilai',
        grade: 'Predikat', num: 'No', weight: 'Berat Badan', height: 'Tinggi Badan',
        ziyadah: 'Ziyadah', murojaah: "Muroja'ah", sick: 'Hari Sakit', home: 'Hari Pulang',
        gradeScale: 'Skala Penilaian', headmaster: 'Direktur MBS Tanggul',
        headmasterSub: 'KH. Muhammad Ali Maksum, Lc',
        musyrif: 'Musyrif / Wali Kamar', guardian: 'Wali Santri',
        reportTitle: 'Raport Bulanan', month: 'Bulan',
    }
}

const GRADE_ID = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'Istimewa', color: '#10b981', bg: '#10b98115', border: '#10b98140' }
    if (num >= 8) return { label: 'Sangat Baik', color: '#3b82f6', bg: '#3b82f615', border: '#3b82f640' }
    if (num >= 6) return { label: 'Baik', color: '#6366f1', bg: '#6366f115', border: '#6366f140' }
    if (num >= 4) return { label: 'Cukup', color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b40' }
    return { label: 'Kurang', color: '#ef4444', bg: '#ef444415', border: '#ef444440' }
}


const calcAvg = (scores) => {
    const vals = KRITERIA.map(k => scores[k.key]).filter(v => v !== '' && v !== null && v !== undefined)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
}

const isComplete = (scores) => KRITERIA.every(k => scores[k.key] !== '' && scores[k.key] !== null && scores[k.key] !== undefined)

// ─── Radar Chart SVG ─────────────────────────────────────────────────────────

const RadarChart = ({ scores, size = 80 }) => {
    const vals = KRITERIA.map(k => Number(scores?.[k.key]) || 0)
    const cx = size / 2, cy = size / 2, r = size * 0.36
    const angle = (i) => (i * 2 * Math.PI / KRITERIA.length) - Math.PI / 2
    const pt = (i, v) => [cx + (v / 9) * r * Math.cos(angle(i)), cy + (v / 9) * r * Math.sin(angle(i))]
    const bgPt = (i) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
    const polyPts = vals.map((v, i) => pt(i, v).join(',')).join(' ')
    const bgPts = KRITERIA.map((_, i) => bgPt(i).join(',')).join(' ')
    const avg = calcAvg(scores || {})

    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            {[0.33, 0.67, 1].map((sc, ri) => (
                <polygon key={ri} points={KRITERIA.map((_, i) => {
                    const [x, y] = bgPt(i)
                    return [cx + (x - cx) * sc, cy + (y - cy) * sc].join(',')
                }).join(' ')} fill="none" stroke="var(--color-border)" strokeWidth="0.6" />
            ))}
            {KRITERIA.map((_, i) => {
                const [x, y] = bgPt(i)
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="0.5" />
            })}
            <polygon points={polyPts} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth="1.2" strokeLinejoin="round" />
            {vals.map((v, i) => {
                const [x, y] = pt(i, v)
                return <circle key={i} cx={x} cy={y} r="1.8" fill={KRITERIA[i].color} />
            })}
            {avg && (
                <>
                    <circle cx={cx} cy={cy} r={size * 0.14} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="0.8" />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.12} fontWeight="900" fill="var(--color-text)">{avg}</text>
                </>
            )}
        </svg>
    )
}

// ─── Score Cell ───────────────────────────────────────────────────────────────

const ScoreCell = ({ value, onChange, onKeyDown, inputRef, kriteria }) => {
    const [focused, setFocused] = useState(false)
    const val = value !== '' && value !== null && value !== undefined ? Number(value) : ''
    const g = val !== '' ? GRADE(val) : null

    return (
        <div title={g ? `${kriteria.id}: ${val} — ${g.id} (${g.label})` : kriteria.id}>
            <input
                ref={inputRef}
                type="number" min={0} max={9}
                value={val}
                onChange={e => {
                    const v = e.target.value === '' ? '' : Math.min(9, Math.max(0, Number(e.target.value)))
                    onChange(v)
                }}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                className="w-11 h-10 text-center text-base font-black rounded-lg outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{
                    background: g ? g.bg : 'var(--color-surface-alt)',
                    color: g ? g.uiColor : 'var(--color-text-muted)',
                    border: `2px solid ${focused ? (g ? g.uiColor : 'var(--color-primary)') : (g ? g.border : 'var(--color-border)')}`,
                }}
                placeholder="—"
            />
        </div>
    )
}

// ─── Raport Print Template ────────────────────────────────────────────────────

const RaportPrintCard = ({ student, scores, extra, bulanObj, tahun, musyrif, className, lang = 'ar', onRendered }) => {
    const sc = scores || {}
    const ex = extra || {}
    const L = LABEL[lang]
    const isAr = lang === 'ar'

    useEffect(() => { onRendered?.() }, [])
    const gradeLabel = isAr ? (v) => GRADE(v)?.label : (v) => GRADE_ID(v)?.label
    const gradeColor = (v) => GRADE(v)?.color
    const numRows = isAr ? ['١', '٢', '٣', '٤', '٥'] : [1, 2, 3, 4, 5]
    // RTL dibaca kanan→kiri, jadi "٢٠٢٥ – ٢٠٢٦" ditulis sebagai tahun-1 dulu lalu tahun
    // tapi karena dash – di tengah, browser render RTL: ٢٠٢٦ – ٢٠٢٥ jadi kita balik manual
    const yearDisplay = isAr
        ? `\u200F${toArabicNum(tahun - 1)} \u2013 ${toArabicNum(tahun)}`
        : `${tahun - 1} – ${tahun}`
    const tableDir = isAr ? 'rtl' : 'ltr'
    // Nama: pakai nama Arab dari metadata jika ada, fallback ke nama Latin
    const displayName = isAr
        ? (student?.metadata?.nama_arab || student?.name || '—')
        : (student?.name || '—')
    // Nilai: di template AR gunakan angka Arab
    const displayVal = (v) => {
        if (v === '' || v === null || v === undefined) return '—'
        return isAr ? toArabicNum(v) : v
    }

    // Transliterasi nama kelas ke Arab
    // Contoh: "7A Boarding Putra" → "السابع أ · بوتر"
    const displayClassName = isAr ? (() => {
        const ANGKA_AR = { '1': 'الأول', '2': 'الثاني', '3': 'الثالث', '4': 'الرابع', '5': 'الخامس', '6': 'السادس', '7': 'السابع', '8': 'الثامن', '9': 'التاسع', '10': 'العاشر' }
        const HURUF_AR = { 'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د', 'e': 'ه' }
        const KELAS_KATA = {
            'boarding': '', 'pondok': '', 'reguler': '', 'regular': '', 'putra': 'بوتر', 'putri': 'بوتري',
            'ikhwan': 'إخوان', 'akhwat': 'أخوات', 'sd': '', 'smp': '', 'sma': '',
            'mts': '', 'ma': '', 'class': '', 'kelas': ''
        }
        const parts = (className || '').toLowerCase().split(/[\s\-_]+/)
        const result = []
        for (const p of parts) {
            // Angka saja misal "7" → "السابع"
            if (ANGKA_AR[p]) { result.push(ANGKA_AR[p]); continue }
            // Angka + huruf misal "7a" → "السابع أ"
            const m = p.match(/^(\d+)([a-e]?)$/)
            if (m) {
                if (ANGKA_AR[m[1]]) result.push(ANGKA_AR[m[1]])
                if (m[2] && HURUF_AR[m[2]]) result.push(HURUF_AR[m[2]])
                continue
            }
            // Huruf saja misal "a" → "أ"
            if (HURUF_AR[p]) { result.push(HURUF_AR[p]); continue }
            // Kata yang diabaikan / sudah diterjemahkan
            if (KELAS_KATA[p] !== undefined) {
                if (KELAS_KATA[p]) result.push(KELAS_KATA[p])
                continue
            }
            // Fallback: tetap tampilkan aslinya
            result.push(p)
        }
        return result.filter(Boolean).join(' ')
    })() : className

    // Transliterasi nama musyrif (sama seperti nama santri, pakai metadata atau rule-based)
    const displayMusyrif = isAr && musyrif
        ? musyrif.split(/\s+/).map(w => {
            const KATA = {
                'muhammad': 'محمد', 'mohamad': 'محمد', 'muhamad': 'محمد', 'ahmad': 'أحمد', 'achmad': 'أحمد',
                'ali': 'علي', 'umar': 'عمر', 'hasan': 'حسن', 'husain': 'حسين', 'ibrahim': 'إبراهيم',
                'ismail': 'إسماعيل', 'yusuf': 'يوسف', 'abdul': 'عبد', 'abdullah': 'عبد الله',
                'abdillah': 'عبد الله', 'nur': 'نور', 'rahim': 'رحيم', 'rahman': 'رحمن',
                'hamid': 'حامد', 'hamzah': 'حمزة', 'fauzi': 'فوزي', 'rizki': 'رزقي', 'rizky': 'رزقي',
                'taufiq': 'توفيق', 'taufik': 'توفيق', 'sholeh': 'صالح', 'soleh': 'صالح',
                'miftah': 'مفتاح', 'hafidz': 'حافظ', 'hafiz': 'حافظ', 'anas': 'أنس',
                'jabir': 'جابر', 'khalid': 'خالد', 'kholid': 'خالد', 'wahid': 'واحد',
                'luthfi': 'لطفي', 'lutfi': 'لطفي', 'najib': 'نجيب', 'akbar': 'أكبر',
                'ramadhan': 'رمضان', 'ramadan': 'رمضان', 'aziz': 'عزيز', 'hilmi': 'حلمي',
                'arif': 'عارف', 'irfan': 'عرفان', 'zaki': 'زكي', 'fuad': 'فؤاد',
                'syarif': 'شريف', 'burhan': 'برهان', 'mustafa': 'مصطفى', 'mustofa': 'مصطفى',
                'farid': 'فريد', 'mansur': 'منصور', 'said': 'سعيد', 'salim': 'سالم',
                'bilal': 'بلال', 'habib': 'حبيب', 'ihsan': 'إحسان', 'ilham': 'إلهام',
                'ridho': 'رضا', 'ridha': 'رضا', 'zaid': 'زيد', 'hanif': 'حنيف',
            }
            return KATA[w.toLowerCase()] || w
        }).join(' ')
        : musyrif

    return (
        <div className="raport-card" style={{
            fontFamily: "'Times New Roman', serif",
            width: '210mm', minHeight: '297mm',
            background: '#fff', color: '#000',
            padding: '12mm 15mm', boxSizing: 'border-box',
            fontSize: '11pt', lineHeight: 1.4,
            pageBreakAfter: 'always'
        }}>
            {/* Header */}
            <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 6 }}>
                    <div style={{ flexShrink: 0, width: 80, height: 80, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src="/src/assets/mbs.png" alt="MBS Logo" style={{ width: 78, height: 78, objectFit: 'contain', mixBlendMode: 'multiply', backgroundColor: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: '8pt', color: '#444', direction: 'rtl', marginBottom: 3, fontFamily: "'Traditional Arabic', serif" }}>
                            المجلس التعليمي للمرحلتين الابتدائية والمتوسطة التابع للرئاسة الفرعية للجمعية المحمدية
                        </div>
                        <div style={{ fontSize: '20pt', fontWeight: 900, color: '#1a5c35', direction: 'rtl', fontFamily: "'Traditional Arabic', serif", letterSpacing: 0.5 }}>
                            معهد محمدية الإسلامي تانجول
                        </div>
                        <div style={{ fontSize: '10pt', fontWeight: 700, letterSpacing: 2.5, color: '#333', marginTop: 1 }}>
                            MUHAMMADIYAH BOARDING SCHOOL (MBS) TANGGUL
                        </div>
                        <div style={{ fontSize: '7.5pt', color: '#666', marginTop: 2 }}>
                            Muhammadiyah Boarding School (MBS) | Jl. Pemandian no. 88 RT 002 RW 003 Patemon, Tanggul, Jember 68155
                        </div>
                    </div>
                </div>
                {/* Garis full width di luar flex agar tidak terpotong */}
                <div style={{ height: 3, background: 'linear-gradient(90deg,#1a5c35,#c8a400,#1a5c35)', marginBottom: 0 }} />
                <div style={{ borderBottom: '3px double #1a5c35', marginTop: 3 }} />
            </div>

            {/* Judul */}
            <div style={{ textAlign: 'center', margin: '8px 0 12px', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                <div style={{ fontSize: '14pt', fontWeight: 900, direction: isAr ? 'rtl' : 'ltr' }}>{L.reportTitle}</div>
                <div style={{ fontSize: '12pt', fontWeight: 700, direction: isAr ? 'rtl' : 'ltr', marginTop: 2 }}>
                    {isAr ? `${L.month} ${bulanObj?.ar || ''}` : `${L.month} ${bulanObj?.id_str || ''}`}
                </div>
            </div>

            {/* Info Siswa */}
            <table style={{ width: '100%', marginBottom: 10, fontSize: '10.5pt', borderCollapse: 'collapse', direction: tableDir }}>
                <tbody>
                    <tr>
                        <td style={{ paddingBottom: 5, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', width: '20%' }}>{L.studentName} :</td>
                        <td style={{ fontWeight: 700, paddingBottom: 5, width: '30%', textAlign: isAr ? 'right' : 'left' }}>{displayName}</td>
                        <td style={{ fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left', width: '20%' }}>{L.room} :</td>
                        <td style={{ fontWeight: 700, width: '30%', textAlign: isAr ? 'right' : 'left' }}>{student?.metadata?.kamar || '—'}</td>
                    </tr>
                    <tr>
                        <td style={{ fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left' }}>{L.class} :</td>
                        <td style={{ fontWeight: 700, textAlign: isAr ? 'right' : 'left' }}>{displayClassName}</td>
                        <td style={{ fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: isAr ? 'right' : 'left' }}>{L.year} :</td>
                        <td style={{ fontWeight: 700, textAlign: isAr ? 'right' : 'left' }}>{yearDisplay}</td>
                    </tr>
                </tbody>
            </table>

            {/* Label Amal Yaumiyah */}
            <div style={{ direction: isAr ? 'rtl' : 'ltr', fontWeight: 700, fontSize: '11pt', marginBottom: 5, fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                {L.dailyWork}
            </div>

            {/* Tabel Nilai */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt', marginBottom: 12 }}>
                <thead>
                    <tr style={{ background: '#e8f5e9' }}>
                        {isAr ? <>
                            <th style={{ border: '1px solid #999', padding: '4px 8px', width: '19%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center' }}>{L.grade}</th>
                            <th style={{ border: '1px solid #999', padding: '4px 6px', width: '11%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center' }}>{L.score}</th>
                            <th style={{ border: '1px solid #999', padding: '4px 10px', fontFamily: "'Traditional Arabic', serif", textAlign: 'right' }}>{L.subject}</th>
                            <th style={{ border: '1px solid #999', padding: '4px 6px', width: '6%', fontFamily: "'Traditional Arabic', serif", textAlign: 'center' }}>{L.num}</th>
                        </> : <>
                            <th style={{ border: '1px solid #999', padding: '4px 6px', width: '6%', textAlign: 'center' }}>{L.num}</th>
                            <th style={{ border: '1px solid #999', padding: '4px 10px', textAlign: 'left' }}>{L.subject}</th>
                            <th style={{ border: '1px solid #999', padding: '4px 6px', width: '11%', textAlign: 'center' }}>{L.score}</th>
                            <th style={{ border: '1px solid #999', padding: '4px 8px', width: '19%', textAlign: 'center' }}>{L.grade}</th>
                        </>}
                    </tr>
                </thead>
                <tbody>
                    {KRITERIA.map((k, i) => {
                        const val = sc[k.key]
                        const g = (val !== '' && val !== null && val !== undefined) ? GRADE(val) : null
                        return (
                            <tr key={k.key}>
                                {isAr ? <>
                                    <td style={{ border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color, fontFamily: "'Traditional Arabic', serif" }}>{g ? gradeLabel(val) : '—'}</td>
                                    <td style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontFamily: "'Traditional Arabic', serif" }}>{displayVal(val)}</td>
                                    <td style={{ border: '1px solid #999', padding: '4px 10px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{k.ar}</td>
                                    <td style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontFamily: "'Traditional Arabic', serif" }}>{numRows[i]}</td>
                                </> : <>
                                    <td style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'center' }}>{numRows[i]}</td>
                                    <td style={{ border: '1px solid #999', padding: '4px 10px', textAlign: 'left' }}>{k.id}</td>
                                    <td style={{ border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{val ?? '—'}</td>
                                    <td style={{ border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color }}>{g ? gradeLabel(val) : '—'}</td>
                                </>}
                            </tr>
                        )
                    })}
                </tbody>
            </table>

            {/* Extra Data Row */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexDirection: isAr ? 'row-reverse' : 'row' }}>
                {/* BB / TB */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.berat_badan)}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.weight}</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.weight}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.berat_badan)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.tinggi_badan)}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.height}</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.height}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.tinggi_badan)}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
                {/* Ziyadah / Murojaah */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.ziyadah)}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.ziyadah}</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.ziyadah}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.ziyadah)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.murojaah)}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.murojaah}</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.murojaah}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.murojaah)}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
                {/* Sakit / Pulang */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_sakit)}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.sick}</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.sick}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_sakit)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_pulang)}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.home}</td>
                            </> : <>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.home}</td>
                                <td style={{ border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.hari_pulang)}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Skala Penilaian — lebar sesuai konten, tidak full width */}
            <div style={{ marginTop: 10, display: 'inline-block' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: '9pt', direction: isAr ? 'rtl' : 'ltr' }}>
                    <thead>
                        <tr>
                            <th colSpan={2} style={{ border: '1px solid #999', padding: '3px 16px', background: '#e8f5e9', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit', textAlign: 'center' }}>
                                {L.gradeScale}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {isAr
                            ? [['٩', 'ممتاز'], ['٨', 'جيد جدا'], ['٦ – ٧', 'جيد'], ['٤ – ٥', 'مقبول'], ['٠ – ٣', 'راسب']].map(([n, l]) => (
                                <tr key={n}>
                                    <td style={{ border: '1px solid #999', padding: '2px 14px', fontFamily: "'Traditional Arabic', serif", textAlign: 'right' }}>{l}</td>
                                    <td style={{ border: '1px solid #999', padding: '2px 14px', textAlign: 'center', fontFamily: "'Traditional Arabic', serif", whiteSpace: 'nowrap' }}>{n}</td>
                                </tr>
                            ))
                            : [['9', 'Istimewa'], ['8', 'Sangat Baik'], ['6 – 7', 'Baik'], ['4 – 5', 'Cukup'], ['0 – 3', 'Kurang']].map(([n, l]) => (
                                <tr key={n}>
                                    <td style={{ border: '1px solid #999', padding: '2px 14px' }}>{l}</td>
                                    <td style={{ border: '1px solid #999', padding: '2px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>{n}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            {/* TTD 3 Kolom — penuh lebar, RTL untuk AR */}
            <div style={{
                display: 'flex',
                marginTop: 32,
                flexDirection: isAr ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                direction: isAr ? 'rtl' : 'ltr',
            }}>
                {[
                    { label: L.headmaster, sub: L.headmasterSub },
                    { label: L.musyrif, sub: displayMusyrif || '......................' },
                    { label: L.guardian, sub: '' }
                ].map((item, i) => (
                    <div key={i} style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit',
                        fontSize: '9pt',
                        direction: isAr ? 'rtl' : 'ltr',
                    }}>
                        <div style={{ fontWeight: 700 }}>{item.label}</div>
                        <div style={{ height: 70 }} />
                        <div style={{
                            borderTop: '1px solid #333',
                            paddingTop: 4,
                            width: '75%',
                            fontWeight: 700,
                            fontSize: '8.5pt',
                            textAlign: 'center',
                        }}>
                            {item.sub || '......................'}
                        </div>
                    </div>
                ))}
            </div>

            {/* Catatan */}
            {ex.catatan && (
                <div style={{ marginTop: 10, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: '9pt' }}>
                    <span style={{ fontWeight: 700 }}>{isAr ? 'ملاحظة: ' : 'Catatan: '}</span>
                    {ex.catatan}
                </div>
            )}
        </div>
    )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function RaportBulananModal({ isOpen, onClose, classesList = [] }) {
    const { addToast } = useToast()

    // ── Setup State
    const now = new Date()
    const [step, setStep] = useState(1) // 1: Setup, 2: Input, 3: Preview, 4: Riwayat
    const [selectedClassId, setSelectedClassId] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [musyrif, setMusyrif] = useState('')
    const [lang, setLang] = useState('ar') // 'ar' | 'id'

    // ── Archive State
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [archiveList, setArchiveList] = useState([]) // { class_id, class_name, month, year, count, completed, lang }
    const [archiveFilter, setArchiveFilter] = useState({ classId: '', year: '' })
    const [archivePreview, setArchivePreview] = useState(null) // { students, scores, extras, bulanObj, tahun, musyrif, className, lang }

    // ── Data State
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [transliterating, setTransliterating] = useState(false)
    const [scores, setScores] = useState({})      // { studentId: { nilai_akhlak, ... } }
    const [extras, setExtras] = useState({})       // { studentId: { berat_badan, ... } }
    const [saving, setSaving] = useState({})       // { studentId: bool }
    const [savedIds, setSavedIds] = useState(new Set())
    const [existingReportIds, setExistingReportIds] = useState({}) // { studentId: reportId }

    // ── Preview State
    const [previewStudentId, setPreviewStudentId] = useState(null)

    // ── WA + Supabase Storage State
    const [sendingWA, setSendingWA] = useState({})     // { studentId: 'generating'|'uploading'|'done'|null }
    const [raportLinks, setRaportLinks] = useState({}) // { studentId: url } — cache sesi ini

    // ── Refs for keyboard nav
    const cellRefs = useRef({}) // key: `${studentIndex}-${kriteriaIndex}`

    const selectedClass = classesList.find(c => c.id === selectedClassId)
    const bulanObj = BULAN.find(b => b.id === selectedMonth)
    const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]

    const completedCount = students.filter(s => isComplete(scores[s.id] || {})).length
    const progressPct = students.length ? Math.round((completedCount / students.length) * 100) : 0

    // ── Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep(1)
            setSelectedClassId('')
            setStudents([])
            setScores({})
            setExtras({})
            setSavedIds(new Set())
            setExistingReportIds({})
            setPreviewStudentId(null)
            setArchivePreview(null)
        }
    }, [isOpen])

    // ── Load Students + existing reports
    const loadStudents = useCallback(async () => {
        if (!selectedClassId) return
        setLoading(true)
        try {
            // Fetch students
            const { data: stuData, error: stuErr } = await supabase
                .from('students')
                .select('id, name, registration_code, photo_url, gender, phone, metadata')
                .eq('class_id', selectedClassId)
                .is('deleted_at', null)
                .order('name')
            if (stuErr) throw stuErr

            // Fetch existing reports for this month/year
            const ids = (stuData || []).map(s => s.id)
            const { data: repData } = await supabase
                .from('student_monthly_reports')
                .select('*')
                .in('student_id', ids)
                .eq('month', selectedMonth)
                .eq('year', selectedYear)

            // Build state maps
            const initScores = {}
            const initExtras = {}
            const initExisting = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                initScores[s.id] = {
                    nilai_akhlak: rep?.nilai_akhlak ?? '',
                    nilai_ibadah: rep?.nilai_ibadah ?? '',
                    nilai_kebersihan: rep?.nilai_kebersihan ?? '',
                    nilai_quran: rep?.nilai_quran ?? '',
                    nilai_bahasa: rep?.nilai_bahasa ?? '',
                }
                initExtras[s.id] = {
                    berat_badan: rep?.berat_badan ?? '',
                    tinggi_badan: rep?.tinggi_badan ?? '',
                    ziyadah: rep?.ziyadah ?? '',
                    murojaah: rep?.murojaah ?? '',
                    hari_sakit: rep?.hari_sakit ?? '',
                    hari_pulang: rep?.hari_pulang ?? '',
                    catatan: rep?.catatan ?? '',
                }
                if (rep) {
                    initExisting[s.id] = rep.id
                    setSavedIds(prev => new Set([...prev, s.id]))
                }
            }
            let finalStudents = stuData || []
            // Auto-transliterasi nama ke Arab jika template Boarding (AR) dan ada yang belum punya nama_arab
            if (lang === 'ar') {
                const needsTranslit = finalStudents.filter(s => !s.metadata?.nama_arab)
                if (needsTranslit.length) {
                    setTransliterating(true)
                    finalStudents = await transliterateNames(finalStudents)
                    setTransliterating(false)
                }
            }
            setStudents(finalStudents)
            setScores(initScores)
            setExtras(initExtras)
            setExistingReportIds(initExisting)
            if (repData?.length) {
                setSavedIds(new Set(repData.map(r => r.student_id)))
                setMusyrif(repData[0]?.musyrif_name || '')
            }
        } catch (e) {
            addToast('Gagal memuat data siswa', 'error')
        } finally {
            setLoading(false)
        }
    }, [selectedClassId, selectedMonth, selectedYear])

    // ── Rule-based transliterasi nama Latin → Arab (tanpa API)
    // Khusus untuk nama-nama santri pesantren Indonesia
    const transliterateToArab = useCallback((name) => {
        // ── Kamus nama Arab lengkap yang umum di pesantren Indonesia
        const KATA_ARAB = {
            // Nama lengkap / kata utuh (prioritas tertinggi)
            'muhammad': 'محمد', 'mohamad': 'محمد', 'muhamad': 'محمد', 'mohammad': 'محمد',
            'ahmad': 'أحمد', 'achmad': 'أحمد', 'ahcmad': 'أحمد',
            'abdillah': 'عبد الله', 'abdullah': 'عبد الله',
            'abdurrahman': 'عبد الرحمن', 'abdurrahman': 'عبد الرحمن',
            'abdussalam': 'عبد السلام', 'abdurrozaq': 'عبد الرزاق',
            'abdurrozak': 'عبد الرزاق', 'abdulaziz': 'عبد العزيز',
            'abdulghani': 'عبد الغني', 'abdulhakim': 'عبد الحكيم',
            'abdullatif': 'عبد اللطيف', 'abdulmalik': 'عبد الملك',
            'abdulwahid': 'عبد الواحد', 'abdulhadi': 'عبد الهادي',
            'abdulhamid': 'عبد الحميد', 'abdulkarim': 'عبد الكريم',
            'abdulmajid': 'عبد المجيد', 'abdurrahim': 'عبد الرحيم',
            'abdurahman': 'عبد الرحمن',
            'ali': 'علي', 'aliy': 'علي',
            'umar': 'عمر', 'omar': 'عمر',
            'usman': 'عثمان', 'utsman': 'عثمان', 'othman': 'عثمان',
            'hasan': 'حسن', 'husain': 'حسين', 'husein': 'حسين', 'hussein': 'حسين',
            'ibrahim': 'إبراهيم', 'ibrohim': 'إبراهيم',
            'ismail': 'إسماعيل', 'isma\'il': 'إسماعيل',
            'idris': 'إدريس',
            'ilyas': 'إلياس', 'elias': 'إلياس',
            'isa': 'عيسى', 'issa': 'عيسى',
            'yusuf': 'يوسف', 'yousuf': 'يوسف',
            'yahya': 'يحيى',
            'yunus': 'يونس',
            'musa': 'موسى',
            'sulaiman': 'سليمان', 'sulayman': 'سليمان', 'soliman': 'سليمان',
            'dawud': 'داود', 'daud': 'داود',
            'zakaria': 'زكريا', 'zakariya': 'زكريا', 'zakariyya': 'زكريا',
            'harun': 'هارون',
            'nuh': 'نوح',
            'sholeh': 'صالح', 'soleh': 'صالح', 'saleh': 'صالح', 'shaleh': 'صالح',
            'sholih': 'صالح', 'solih': 'صالح',
            'hamid': 'حامد', 'hamdan': 'حمدان',
            'hamzah': 'حمزة', 'hamza': 'حمزة',
            'hadi': 'هادي',
            'hafidz': 'حافظ', 'hafidh': 'حافظ', 'hafiz': 'حافظ',
            'hakim': 'حكيم',
            'halim': 'حليم',
            'hanif': 'حنيف',
            'haris': 'حارث', 'harith': 'حارث',
            'harits': 'حارث',
            'haikal': 'هيكل',
            'hilmi': 'حلمي',
            'hisyam': 'هشام', 'hisham': 'هشام',
            'faris': 'فارس',
            'farid': 'فريد',
            'faruq': 'فاروق', 'farouq': 'فاروق', 'faruqi': 'فاروقي',
            'fauzi': 'فوزي', 'fauzy': 'فوزي',
            'fikri': 'فكري', 'fikry': 'فكري',
            'fuad': 'فؤاد',
            'ghani': 'غني',
            'ghofur': 'غفور', 'ghafur': 'غفور',
            'ghozali': 'غزالي', 'ghazali': 'غزالي',
            'ilham': 'إلهام',
            'imam': 'إمام',
            'irfan': 'عرفان', 'erfan': 'عرفان',
            'jabir': 'جابر', 'jabir': 'جابر',
            'jalal': 'جلال', 'jalaludin': 'جلال الدين',
            'jalaluddin': 'جلال الدين',
            'kamal': 'كمال', 'kamil': 'كامل',
            'khalid': 'خالد', 'kholid': 'خالد',
            'khoirul': 'خيرل', 'khairul': 'خيرل',
            'khoiron': 'خيرون', 'khairon': 'خيرون',
            'khoir': 'خير', 'khair': 'خير',
            'luthfi': 'لطفي', 'lutfi': 'لطفي',
            'lukman': 'لقمان', 'luqman': 'لقمان',
            'mahfudz': 'محفوظ', 'mahfuz': 'محفوظ', 'mahfudzh': 'محفوظ',
            'majid': 'مجيد',
            'malik': 'مالك',
            'mansur': 'منصور', 'mansour': 'منصور',
            'marwan': 'مروان',
            'mas\'ud': 'مسعود', 'masud': 'مسعود', 'mas\'udi': 'مسعودي',
            'miftah': 'مفتاح',
            'mukhtar': 'مختار',
            'munir': 'منير',
            'mursid': 'مرشد', 'mursyid': 'مرشد',
            'mustafa': 'مصطفى', 'mustofa': 'مصطفى',
            'muzakki': 'مزكي',
            'najib': 'نجيب', 'najeeb': 'نجيب',
            'nashir': 'ناصر', 'nasir': 'ناصر', 'nasser': 'ناصر',
            'nazhif': 'نظيف', 'nadhif': 'نظيف',
            'nizar': 'نزار',
            'nur': 'نور', 'noor': 'نور',
            'nuruddin': 'نور الدين', 'nooruddin': 'نور الدين',
            'qodir': 'قادر', 'qadir': 'قادر',
            'qosim': 'قاسم', 'qasim': 'قاسم',
            'rafi': 'رافع', 'rafi\'': 'رافع',
            'rafif': 'رفيف',
            'raihan': 'ريحان', 'rayhan': 'ريحان',
            'ramadhan': 'رمضان', 'ramadan': 'رمضان',
            'rasyid': 'راشد', 'rashid': 'راشد',
            'ridho': 'رضا', 'ridha': 'رضا', 'rida': 'رضا',
            'ridhwan': 'رضوان', 'ridwan': 'رضوان',
            'rizqi': 'رزقي', 'rizky': 'رزقي', 'rizki': 'رزقي',
            'rohman': 'رحمن', 'rahman': 'رحمن',
            'rohim': 'رحيم', 'rahim': 'رحيم',
            'rofi': 'رفيع',
            'sabiq': 'سابق',
            'said': 'سعيد', 'saeed': 'سعيد',
            'salim': 'سالم', 'salem': 'سالم',
            'samir': 'سمير',
            'syarif': 'شريف', 'sharif': 'شريف',
            'syarifuddin': 'شريف الدين',
            'syarifudin': 'شريف الدين',
            'taufiq': 'توفيق', 'taufik': 'توفيق', 'tawfiq': 'توفيق',
            'thoriq': 'طارق', 'thariq': 'طارق', 'tariq': 'طارق',
            'tsaqif': 'ثاقف',
            'ubaid': 'عبيد', 'ubaidillah': 'عبيد الله',
            'wahid': 'واحد', 'wahiduddin': 'واحد الدين',
            'walid': 'وليد',
            'waris': 'وارث',
            'yahya': 'يحيى',
            'zaid': 'زيد', 'zayd': 'زيد',
            'zainal': 'زين العابدين', 'zainul': 'زين ال',
            'zaki': 'زكي', 'zakky': 'زكي',
            'ziyad': 'زياد',
            'dzakwan': 'ذكوان', 'zakwan': 'ذكوان',
            'akbar': 'أكبر',
            'atha': 'عطاء', 'atho': 'عطاء',
            'amir': 'أمير',
            'anas': 'أنس',
            'arif': 'عارف', 'arief': 'عارف',
            'arsyad': 'أرشد', 'arsyad': 'أرشد',
            'asad': 'أسد',
            'asror': 'أسرار', 'asrar': 'أسرار',
            'azzam': 'عزام',
            'aziz': 'عزيز',
            'azhar': 'أزهر',
            'badr': 'بدر', 'badar': 'بدر',
            'bahauddin': 'بهاء الدين',
            'bilal': 'بلال',
            'burhan': 'برهان', 'burhanudin': 'برهان الدين', 'burhanuddin': 'برهان الدين',
            'dani': 'داني', 'danny': 'داني',
            'dzikri': 'ذكري', 'zikri': 'ذكري',
            'fathur': 'فتحور', 'fathurrohman': 'فتح الرحمن', 'fathurrahman': 'فتح الرحمن',
            'fathi': 'فتحي',
            'fathoni': 'فطوني',
            'habib': 'حبيب',
            'habibi': 'حبيبي',
            'ihsan': 'إحسان', 'ikhsan': 'إحسان',
            'irsyad': 'إرشاد',
            'labib': 'لبيب',
            'lathif': 'لطيف', 'latif': 'لطيف',
            'ma\'ruf': 'معروف', 'maruf': 'معروف',
            'mamduh': 'ممدوح',
            'nafi\'': 'نافع', 'nafi': 'نافع',
            'naim': 'نعيم',
            'qoirul': 'خيرل', 'qoiron': 'خيرون',
            'romadhon': 'رمضان', 'romadon': 'رمضان',
            'royyan': 'ريّان', 'rayan': 'ريّان',
            'shabir': 'صابر', 'sabir': 'صابر',
            'shofwan': 'صفوان', 'sofwan': 'صفوان', 'shafwan': 'صفوان',
            'siddiq': 'صديق', 'sidiq': 'صديق', 'shadiq': 'صادق',
            'sufyan': 'سفيان', 'tsufyan': 'سفيان',
            'syukron': 'شكرون', 'syukran': 'شكراً',
            'ubay': 'أُبَيّ',
            'ubaydillah': 'عبيد الله',
            'wafa': 'وفاء',
            'zuhdi': 'زهدي', 'zuhry': 'زهري',
        }

        // Prefix Abdul-/Abdi-/Abdu- yang diikuti nama Allah
        const ASMAUL_HUSNA = {
            'rahman': 'الرحمن', 'rahim': 'الرحيم', 'malik': 'الملك',
            'quddus': 'القدوس', 'salam': 'السلام', 'mukmin': 'المؤمن',
            'muhaimin': 'المهيمن', 'aziz': 'العزيز', 'jabbar': 'الجبار',
            'mutakabbir': 'المتكبر', 'khaliq': 'الخالق', 'bari': 'البارئ',
            'mushowwir': 'المصور', 'ghoffar': 'الغفار', 'ghafar': 'الغفار',
            'qohhar': 'القهار', 'wahhab': 'الوهاب', 'rozzaq': 'الرزاق',
            'fattah': 'الفتاح', 'alim': 'العليم', 'qobidh': 'القابض',
            'basith': 'الباسط', 'latif': 'اللطيف', 'khabir': 'الخبير',
            'halim': 'الحليم', 'adhim': 'العظيم', 'ghofur': 'الغفور',
            'syakur': 'الشكور', 'ali': 'العلي', 'kabir': 'الكبير',
            'hafidz': 'الحفيظ', 'hafiz': 'الحفيظ', 'muqit': 'المقيت',
            'hasib': 'الحسيب', 'jalil': 'الجليل', 'karim': 'الكريم',
            'raqib': 'الرقيب', 'mujib': 'المجيب', 'wasi': 'الواسع',
            'hakim': 'الحكيم', 'wadud': 'الودود', 'majid': 'المجيد',
            'ba\'its': 'الباعث', 'syahid': 'الشهيد', 'haq': 'الحق',
            'wakil': 'الوكيل', 'qowiy': 'القوي', 'matin': 'المتين',
            'wali': 'الولي', 'hamid': 'الحميد', 'muhshi': 'المحصي',
            'mubdi': 'المبدئ', 'mu\'id': 'المعيد', 'muhyi': 'المحيي',
            'mumit': 'المميت', 'hayy': 'الحي', 'qoyyum': 'القيوم',
            'wahid': 'الواحد', 'ahad': 'الأحد', 'somad': 'الصمد',
            'qadir': 'القادر', 'qodir': 'القادر', 'muqtadir': 'المقتدر',
            'muqoddim': 'المقدم', 'muakhkhir': 'المؤخر', 'awwal': 'الأول',
            'akhir': 'الآخر', 'dhohir': 'الظاهر', 'batin': 'الباطن',
            'wali': 'الوالي', 'muta\'ali': 'المتعالي', 'barr': 'البر',
            'tawwab': 'التواب', 'muntaqim': 'المنتقم', 'afuw': 'العفو',
            'rauf': 'الرؤوف', 'nur': 'النور', 'hadi': 'الهادي',
            'badi': 'البديع', 'baqi': 'الباقي', 'warits': 'الوارث',
            'rasyid': 'الرشيد', 'sabur': 'الصبور',
        }

        const words = name.toLowerCase().trim().split(/\s+/)
        const result = []

        for (let i = 0; i < words.length; i++) {
            const w = words[i]

            // Cek di kamus kata utuh dulu
            if (KATA_ARAB[w]) {
                result.push(KATA_ARAB[w])
                continue
            }

            // Cek pola Abdul/Abdu/Abdi + asmaul husna
            const abdulMatch = w.match(/^ab[du]u?l?[-_]?(.+)$/) ||
                w.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suffix = abdulMatch[1]
                if (ASMAUL_HUSNA[suffix]) {
                    result.push('عبد ' + ASMAUL_HUSNA[suffix])
                    continue
                }
                if (suffix === 'llah' || suffix === 'lah' || suffix === 'illah') {
                    result.push('عبد الله')
                    continue
                }
            }

            // Cek pola Ibn/Ibnu/bin/binti
            if (w === 'bin' || w === 'ibn' || w === 'ibnu') { result.push('بن'); continue }
            if (w === 'binti' || w === 'bint') { result.push('بنت'); continue }

            // Pola -uddin / -udin / -addin
            const dinMatch = w.match(/^(.+?)u?[dt]?[dt]?i?n$/)
            if (w.endsWith('uddin') || w.endsWith('udin') || w.endsWith('addin') || w.endsWith('iddin')) {
                const base = w.replace(/(uddin|udin|addin|iddin)$/, '')
                const baseArab = KATA_ARAB[base] || ''
                if (baseArab) { result.push(baseArab + ' الدين'); continue }
            }

            // Pola Nur- / Noor-
            if (w.startsWith('nur') || w.startsWith('noor')) {
                const suffix = w.replace(/^noo?r[-_]?/, '')
                const sufArab = KATA_ARAB[suffix] || ASMAUL_HUSNA[suffix]
                if (sufArab) { result.push('نور ' + sufArab.replace(/^ال/, '')); continue }
            }

            // Fallback: rule-based huruf per huruf
            result.push(latinToArabLetters(w))
        }

        return result.join(' ')
    }, [])

    // ── Letter-by-letter transliterasi fallback
    const latinToArabLetters = (word) => {
        // Digraf (2 huruf → 1 Arab) — cek dulu sebelum single
        const DIGRAPH = [
            ['kh', 'خ'], ['gh', 'غ'], ['sh', 'ش'], ['sy', 'ش'], ['ts', 'ث'],
            ['dz', 'ذ'], ['zh', 'ظ'], ['dh', 'ض'], ['th', 'ط'], ['ny', 'ن'],
            ['ng', 'نج'], ['ch', 'خ'], ['ph', 'ف'], ['qu', 'ق'], ['wr', 'ور'],
        ]
        const SINGLE = {
            'a': 'ا', 'b': 'ب', 'c': 'ك', 'd': 'د', 'e': 'ي', 'f': 'ف', 'g': 'ج',
            'h': 'ه', 'i': 'ي', 'j': 'ج', 'k': 'ك', 'l': 'ل', 'm': 'م', 'n': 'ن',
            'o': 'و', 'p': 'ف', 'q': 'ق', 'r': 'ر', 's': 'س', 't': 'ت', 'u': 'و',
            'v': 'ف', 'w': 'و', 'x': 'كس', 'y': 'ي', 'z': 'ز',
            "'": 'ء', // hamzah
        }
        let res = ''
        let i = 0
        while (i < word.length) {
            const two = word.slice(i, i + 2).toLowerCase()
            const di = DIGRAPH.find(([k]) => k === two)
            if (di) { res += di[1]; i += 2; continue }
            res += SINGLE[word[i].toLowerCase()] || ''
            i++
        }
        return res
    }

    // ── Proses transliterasi semua nama yang belum ada nama_arab
    const transliterateNames = useCallback(async (stuList) => {
        const needsTranslit = stuList.filter(s => !s.metadata?.nama_arab)
        if (!needsTranslit.length) return stuList

        const updated = [...stuList]
        const dbUpdates = []

        for (const s of needsTranslit) {
            const namaArab = transliterateToArab(s.name)
            const newMeta = { ...(s.metadata || {}), nama_arab: namaArab }
            dbUpdates.push(supabase.from('students').update({ metadata: newMeta }).eq('id', s.id))
            const idx = updated.findIndex(x => x.id === s.id)
            if (idx !== -1) updated[idx] = { ...updated[idx], metadata: newMeta }
        }
        // Simpan semua ke DB secara paralel
        await Promise.allSettled(dbUpdates)
        return updated
    }, [transliterateToArab])


    const saveStudent = useCallback(async (studentId) => {
        const sc = scores[studentId]
        const ex = extras[studentId]
        if (!sc) return

        setSaving(prev => ({ ...prev, [studentId]: true }))
        try {
            const payload = {
                student_id: studentId,
                month: selectedMonth,
                year: selectedYear,
                musyrif_name: musyrif,
                ...Object.fromEntries(
                    Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])
                ),
                berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null,
                tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null,
                ziyadah: ex.ziyadah || null,
                murojaah: ex.murojaah || null,
                hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0,
                hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0,
                catatan: ex.catatan || null,
            }

            const existingId = existingReportIds[studentId]
            let error
            if (existingId) {
                ; ({ error } = await supabase.from('student_monthly_reports').update(payload).eq('id', existingId))
            } else {
                const { data, error: insErr } = await supabase.from('student_monthly_reports').insert(payload).select('id').single()
                error = insErr
                if (!insErr && data) {
                    setExistingReportIds(prev => ({ ...prev, [studentId]: data.id }))
                }
            }
            if (error) throw error
            setSavedIds(prev => new Set([...prev, studentId]))
        } catch (e) {
            addToast(`Gagal menyimpan: ${e.message}`, 'error')
        } finally {
            setSaving(prev => ({ ...prev, [studentId]: false }))
        }
    }, [scores, extras, selectedMonth, selectedYear, musyrif, existingReportIds])

    // ── Save all
    const saveAll = async () => {
        for (const s of students) {
            await saveStudent(s.id)
        }
        addToast(`✅ ${students.length} raport berhasil disimpan`, 'success')
    }

    // ── Load Archive — semua raport yang pernah dibuat, group by class+month+year
    const loadArchive = useCallback(async () => {
        setArchiveLoading(true)
        try {
            const { data, error } = await supabase
                .from('student_monthly_reports')
                .select('student_id, month, year, musyrif_name, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, students(id, name, class_id, classes(id, name, type))')
                .order('year', { ascending: false })
                .order('month', { ascending: false })
            if (error) throw error

            // Group by class_id + month + year
            const grouped = {}
            for (const row of (data || [])) {
                const cls = row.students?.classes
                if (!cls) continue
                const key = `${cls.id}__${row.month}__${row.year}`
                if (!grouped[key]) {
                    grouped[key] = {
                        key, class_id: cls.id, class_name: cls.name, class_type: cls.type,
                        month: row.month, year: row.year, musyrif: row.musyrif_name,
                        count: 0, completed: 0,
                        lang: cls.type === 'boarding' ? 'ar' : 'id'
                    }
                }
                grouped[key].count++
                const hasAll = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa'].every(k => row[k] !== null)
                if (hasAll) grouped[key].completed++
            }
            setArchiveList(Object.values(grouped).sort((a, b) => b.year - a.year || b.month - a.month))
        } catch (e) {
            addToast('Gagal memuat arsip', 'error')
        } finally {
            setArchiveLoading(false)
        }
    }, [])

    // ── Load Archive Detail — load full raport data for a given entry
    const loadArchiveDetail = useCallback(async (entry) => {
        setArchiveLoading(true)
        try {
            const { data: stuData } = await supabase
                .from('students')
                .select('id, name, phone, metadata')
                .eq('class_id', entry.class_id)
                .is('deleted_at', null)
                .order('name')

            const ids = (stuData || []).map(s => s.id)
            const { data: repData } = await supabase
                .from('student_monthly_reports')
                .select('*')
                .in('student_id', ids)
                .eq('month', entry.month)
                .eq('year', entry.year)

            const scMap = {}, exMap = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                scMap[s.id] = {
                    nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '',
                    nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '',
                    nilai_bahasa: rep?.nilai_bahasa ?? '',
                }
                exMap[s.id] = {
                    berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '',
                    ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '',
                    hari_sakit: rep?.hari_sakit ?? '', hari_pulang: rep?.hari_pulang ?? '',
                    catatan: rep?.catatan ?? '',
                }
            }
            setArchivePreview({
                students: stuData || [], scores: scMap, extras: exMap,
                bulanObj: BULAN.find(b => b.id === entry.month),
                tahun: entry.year, musyrif: entry.musyrif,
                className: entry.class_name, lang: entry.lang,
                entry
            })
        } catch (e) {
            addToast('Gagal memuat detail arsip', 'error')
        } finally {
            setArchiveLoading(false)
        }
    }, [])

    // ── Delete Archive entry
    const deleteArchiveEntry = useCallback(async (entry) => {
        if (!window.confirm(`Hapus semua raport ${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year} kelas ${entry.class_name}? Aksi ini tidak bisa dibatalkan.`)) return
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)
            await supabase.from('student_monthly_reports').delete().in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            addToast('Arsip berhasil dihapus', 'success')
            loadArchive()
        } catch (e) {
            addToast('Gagal menghapus arsip', 'error')
        }
    }, [loadArchive])



    // ── Print: set santri yang akan dicetak, render di hidden container, ambil HTML
    const [printQueue, setPrintQueue] = useState([]) // list student id yang akan dicetak
    const [printRenderedCount, setPrintRenderedCount] = useState(0)
    const printContainerRef = useRef(null)

    const openPrintWindow = useCallback((stuList) => {
        if (!stuList?.length) { addToast('Tidak ada data untuk dicetak', 'warning'); return }
        setPrintRenderedCount(0)
        setPrintQueue(stuList.map(s => s.id))
    }, [addToast])

    const executePrint = useCallback((stuList) => {
        const container = printContainerRef.current
        if (!container) return
        const cards = container.querySelectorAll('.raport-card')
        if (!cards.length) { addToast('Gagal menyiapkan raport', 'error'); return }
        const html = [...cards].map(c => c.outerHTML).join('')
        const titleStr = stuList.length === 1
            ? `Raport ${stuList[0].name}_${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}`
            : `Raport Kelas ${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}`
        const win = window.open('', '_blank')
        win.document.write(`<!DOCTYPE html><html><head>
            <meta charset="utf-8">
            <title>${titleStr}</title>
            <style>
                @page { size: A4; margin: 0; }
                body { margin: 0; padding: 0; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                img { mix-blend-mode: multiply; }
                .raport-card { page-break-after: always; }
            </style>
        </head><body>${html}</body></html>`)
        win.document.close()
        win.focus()
        setTimeout(() => { win.print(); setPrintQueue([]); setPrintRenderedCount(0) }, 700)
    }, [selectedClass, bulanObj, selectedYear, addToast])

    // Tunggu semua kartu selesai render baru execute print
    useEffect(() => {
        if (!printQueue.length || printRenderedCount < printQueue.length) return
        const stuList = students.filter(s => printQueue.includes(s.id))
        executePrint(stuList)
    }, [printRenderedCount, printQueue, students, executePrint])



    // ── Export Bulk — buka window baru dengan semua raport, siap print ke PDF
    const exportBulkPDF = useCallback(async (entry) => {
        await loadArchiveDetail(entry)
        // Give state time to update, then open print window
        setTimeout(() => {
            const cards = document.querySelectorAll('.raport-card')
            if (!cards.length) { addToast('Tidak ada data untuk di-export', 'warning'); return }
            const html = [...cards].map(c => c.outerHTML).join('')
            const win = window.open('', '_blank')
            win.document.write(`<!DOCTYPE html><html><head>
                <meta charset="utf-8">
                <title>Raport ${entry.class_name} ${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
                    .raport-card { page-break-after: always; box-sizing: border-box; }
                    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                </style>
            </head><body>${html}</body></html>`)
            win.document.close()
            win.focus()
            setTimeout(() => { win.print(); }, 800)
        }, 600)
    }, [loadArchiveDetail, addToast])


    const handleKeyDown = (e, studentIdx, kriteriaIdx) => {
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault()
            let nextSi = studentIdx
            let nextKi = kriteriaIdx + 1
            if (nextKi >= KRITERIA.length) { nextKi = 0; nextSi = studentIdx + 1 }
            if (nextSi >= students.length) { nextSi = 0 }
            const ref = cellRefs.current[`${nextSi}-${nextKi}`]
            if (ref) ref.focus()
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            const ref = cellRefs.current[`${studentIdx + 1}-${kriteriaIdx}`]
            if (ref) ref.focus()
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            const ref = cellRefs.current[`${studentIdx - 1}-${kriteriaIdx}`]
            if (ref) ref.focus()
        }
        if (e.key === 'ArrowRight') {
            const ref = cellRefs.current[`${studentIdx}-${kriteriaIdx + 1}`]
            if (ref) ref.focus()
        }
        if (e.key === 'ArrowLeft') {
            const ref = cellRefs.current[`${studentIdx}-${kriteriaIdx - 1}`]
            if (ref) ref.focus()
        }
    }

    // ── WA Message builder (dengan optional link PDF)
    const buildWaMessage = useCallback((student, pdfUrl = null) => {
        const sc = scores[student.id] || {}
        const avg = calcAvg(sc)
        const g = avg ? GRADE(Number(avg)) : null
        const lines = [
            `Assalamu'alaikum Wr. Wb.`,
            ``,
            `Yth. Bapak/Ibu Wali dari Ananda *${student.name}*`,
            ``,
            `Berikut hasil *Raport Bulanan ${bulanObj?.id_str} ${selectedYear}*`,
            `Kelas: ${selectedClass?.name || '—'} | Musyrif: ${musyrif || '—'}`,
            ``,
            ...KRITERIA.map(k => {
                const v = sc[k.key]
                const gr = (v !== '' && v !== null) ? GRADE(Number(v)) : null
                return `• ${k.id}: *${v ?? '—'}* ${gr ? `(${gr.id})` : ''}`
            }),
            ``,
            avg ? `📊 Rata-rata: *${avg}* — ${g?.id}` : '',
            ``,
            ...(pdfUrl ? [
                `📄 *Unduh Raport PDF:*`,
                pdfUrl,
                `_(Link aktif 3 hari)_`,
                ``
            ] : []),
            `Wassalamu'alaikum Wr. Wb.`,
            `_MBS Tanggul · Sistem Laporanmu_`
        ].filter(l => l !== undefined)
        return encodeURIComponent(lines.join('\n'))
    }, [scores, bulanObj, selectedYear, selectedClass, musyrif])

    // ── Load html2pdf.js dari CDN (sekali saja)
    const loadHtml2Pdf = useCallback(() => {
        return new Promise((resolve, reject) => {
            if (window.html2pdf) { resolve(); return }
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
            s.onload = () => resolve()
            s.onerror = () => reject(new Error('Gagal memuat html2pdf.js'))
            document.head.appendChild(s)
        })
    }, [])

    // ── Render card santri → HTML string → PDF Blob
    const generatePDFBlob = useCallback(async (student) => {
        await loadHtml2Pdf()

        const bulanStr = bulanObj?.id_str || String(selectedMonth)
        const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filename = `${safeName}_${bulanStr}_${selectedYear}.pdf`

        // Strategi: cari card yang sudah ada di DOM (preview atau print container)
        let cardEl = null
        const allCards = document.querySelectorAll('.raport-card')
        for (const c of allCards) {
            const text = c.innerText || c.textContent || ''
            if (text.includes(student.name) || text.includes(student.name.split(' ')[0])) {
                cardEl = c
                break
            }
        }

        // Kalau tidak ketemu, trigger printQueue dan tunggu render
        if (!cardEl) {
            setPrintRenderedCount(0)
            setPrintQueue([student.id])
            await new Promise((resolve) => {
                let t = 0
                const timer = setInterval(() => {
                    const container = printContainerRef.current
                    const card = container?.querySelector('.raport-card')
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 30) { clearInterval(timer); resolve() }
                }, 100)
            })
            setPrintQueue([])
            setPrintRenderedCount(0)
        }

        if (!cardEl) throw new Error('Gagal render raport card')

        // Pakai HTML yang sama persis dengan executePrint
        const cardHTML = cardEl.outerHTML

        // html2pdf dengan A4 strict — scale konten agar muat 1 halaman
        const wrapper = document.createElement('div')
        wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:794px;background:white;`
        wrapper.innerHTML = `
            <style>
                @page { size: A4; margin: 0; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
                img { mix-blend-mode: multiply; }
                .raport-card {
                    width: 210mm !important;
                    transform-origin: top left;
                }
            </style>
            ${cardHTML}
        `
        document.body.appendChild(wrapper)

        // Ukur tinggi aktual card di dalam wrapper (di posisi fixed, bukan scaled)
        const cardInWrapper = wrapper.querySelector('.raport-card')
        const naturalHeight = cardInWrapper ? cardInWrapper.scrollHeight : 1123
        // Scale agar muat tepat di A4 (1123px = 297mm @96dpi)
        const scale = Math.min(1, 1123 / naturalHeight)

        if (cardInWrapper && scale < 1) {
            cardInWrapper.style.transform = `scale(${scale})`
            cardInWrapper.style.height = `${naturalHeight * scale}px`
        }

        try {
            const blob = await window.html2pdf()
                .set({
                    margin: 0,
                    filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        logging: false,
                        width: 794,
                        height: Math.round(naturalHeight * scale),
                        windowWidth: 794,
                        windowHeight: Math.round(naturalHeight * scale),
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
                    pagebreak: { mode: 'avoid-all' },
                })
                .from(cardInWrapper || wrapper)
                .outputPdf('blob')

            if (!blob || blob.size < 5000) throw new Error(`PDF terlalu kecil (${blob?.size ?? 0} bytes)`)
            return { blob, filename }
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
        }
    }, [loadHtml2Pdf, bulanObj, selectedMonth, selectedYear])

    // ── Upload ke Supabase Storage, return public URL (pendek, tidak expire)
    const uploadToSupabase = useCallback(async (blob, filename) => {
        const bulanStr = bulanObj?.id_str || String(selectedMonth)
        const path = `${selectedYear}/${bulanStr}/${filename}`

        const { error: uploadError } = await supabase.storage
            .from('raport-mbs')
            .upload(path, blob, {
                contentType: 'application/pdf',
                upsert: true,
            })

        if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)

        // Pakai public URL — pendek dan tidak expire
        // (bucket raport-mbs harus Public agar bisa diakses)
        const { data } = supabase.storage
            .from('raport-mbs')
            .getPublicUrl(path)

        return data.publicUrl
    }, [supabase, bulanObj, selectedMonth, selectedYear])

    // ── MAIN: Generate PDF → Upload Supabase → Kirim WA
    const generateAndSendWA = useCallback(async (student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }

        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')

        // Sudah ada link di cache → langsung buka WA dengan PDF
        if (raportLinks[student.id]) {
            window.open(`https://wa.me/${phone}?text=${buildWaMessage(student, raportLinks[student.id])}`, '_blank')
            return
        }

        // ── KUNCI: buka tab WA dulu saat masih dalam user gesture
        // Browser izinkan window.open hanya langsung dari click, bukan setelah await
        // Buka dulu dengan pesan tanpa link, nanti kita update setelah upload selesai
        const waTab = window.open(`https://wa.me/${phone}?text=${buildWaMessage(student)}`, '_blank')

        setSendingWA(prev => ({ ...prev, [student.id]: 'generating' }))
        try {
            // Step 1: Generate PDF
            addToast(`📄 Membuat PDF ${student.name.split(' ')[0]}...`, 'info')
            const { blob, filename } = await generatePDFBlob(student)

            // Step 2: Upload ke Supabase
            setSendingWA(prev => ({ ...prev, [student.id]: 'uploading' }))
            addToast(`☁️ Mengupload PDF ${student.name.split(' ')[0]}...`, 'info')
            const signedUrl = await uploadToSupabase(blob, filename)

            // Step 3: Update tab WA yang sudah terbuka dengan URL baru yang ada link PDF
            setRaportLinks(prev => ({ ...prev, [student.id]: signedUrl }))
            setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))

            // Coba update tab yang sudah terbuka
            try {
                if (waTab && !waTab.closed) {
                    waTab.location.href = `https://wa.me/${phone}?text=${buildWaMessage(student, signedUrl)}`
                } else {
                    // Tab ditutup user atau diblokir — buka tab baru
                    window.open(`https://wa.me/${phone}?text=${buildWaMessage(student, signedUrl)}`, '_blank')
                }
            } catch {
                // Cross-origin block — buka tab baru
                window.open(`https://wa.me/${phone}?text=${buildWaMessage(student, signedUrl)}`, '_blank')
            }

            addToast(`✅ WA + PDF siap untuk wali ${student.name.split(' ')[0]}`, 'success')

        } catch (err) {
            console.error('[generateAndSendWA]', err)
            addToast(`Gagal: ${err.message}`, 'error')
            setSendingWA(prev => ({ ...prev, [student.id]: null }))
        }
    }, [raportLinks, buildWaMessage, generatePDFBlob, uploadToSupabase, addToast])

    // ── Broadcast semua WA secara berurutan
    const broadcastAllWA = useCallback(async () => {
        const withPhone = students.filter(s => s.phone)
        if (!withPhone.length) { addToast('Tidak ada santri dengan nomor WA', 'warning'); return }
        addToast(`📲 Memulai broadcast ke ${withPhone.length} wali santri...`, 'info')
        for (const s of withPhone) {
            await generateAndSendWA(s)
            await new Promise(r => setTimeout(r, 1200))
        }
        addToast(`🎉 Broadcast selesai!`, 'success')
    }, [students, generateAndSendWA, addToast])

    const openWA = useCallback((student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        window.open(`https://wa.me/${phone}?text=${buildWaMessage(student)}`, '_blank')
    }, [buildWaMessage, addToast])

    // ── Step 1: Setup ─────────────────────────────────────────────────────────
    const renderSetup = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <FontAwesomeIcon icon={faClipboardList} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-[var(--color-text)]">Input Raport Bulanan</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">نتيجة الشخصية — Pilih kelas & periode terlebih dahulu</p>
                    </div>
                </div>
            </div>

            {/* Config Grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Kelas */}
                <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faSchool} className="opacity-60" /> Pilih Kelas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {classesList.map(cls => (
                            <button
                                key={cls.id}
                                onClick={() => {
                                    setSelectedClassId(cls.id)
                                    // Auto-detect bahasa dari tipe kelas
                                    if (cls.type === 'boarding' || cls.type === 'pondok') setLang('ar')
                                    else if (cls.type === 'reguler' || cls.type === 'regular') setLang('id')
                                }}
                                className={`p-3 rounded-xl border text-left transition-all ${selectedClassId === cls.id
                                    ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-emerald-500/30'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-black">{cls.name}</span>
                                    {selectedClassId === cls.id
                                        ? <FontAwesomeIcon icon={faCheck} className="text-[9px] text-emerald-500 shrink-0" />
                                        : cls.type && <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${(cls.type === 'boarding' || cls.type === 'pondok') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                            {(cls.type === 'boarding' || cls.type === 'pondok') ? 'Boarding' : 'Reguler'}
                                        </span>
                                    }
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bulan */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bulan</label>
                    <select
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50"
                    >
                        {BULAN.map(b => <option key={b.id} value={b.id}>{b.id_str} — {b.ar}</option>)}
                    </select>
                </div>

                {/* Tahun */}
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun</label>
                    <select
                        value={selectedYear}
                        onChange={e => setSelectedYear(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50"
                    >
                        {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                </div>

                {/* Musyrif */}
                <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Musyrif / Wali Kelas</label>
                    <input
                        value={musyrif}
                        onChange={e => setMusyrif(e.target.value)}
                        placeholder="Contoh: Ahmad Fauzi, Lc"
                        className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50"
                    />
                </div>

                {/* Bahasa Template */}
                <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Bahasa Raport</label>
                    <div className="flex gap-2">
                        {[{ v: 'ar', label: 'عربي', sub: 'Arabic (Pondok/Boarding)' }, { v: 'id', label: 'ID', sub: 'Indonesia (Reguler)' }].map(opt => (
                            <button key={opt.v} onClick={() => setLang(opt.v)}
                                className={`flex-1 py-2.5 px-4 rounded-xl border text-left transition-all ${lang === opt.v ? 'bg-emerald-500/15 border-emerald-500/50' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-emerald-500/30'}`}>
                                <div className={`text-sm font-black ${lang === opt.v ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--color-text-muted)]'}`}>{opt.label}</div>
                                <div className="text-[9px] text-[var(--color-text-muted)] font-medium mt-0.5">{opt.sub}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CTA */}
            <button
                onClick={async () => {
                    if (!selectedClassId) { addToast('Pilih kelas terlebih dahulu', 'warning'); return }
                    await loadStudents()
                    setStep(2)
                }}
                disabled={!selectedClassId || loading}
                className="w-full h-12 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
                {transliterating
                    ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mentransliterasi nama ke Arab...</>
                    : loading
                        ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Memuat siswa...</>
                        : <><FontAwesomeIcon icon={faChevronRight} /> Mulai Input Nilai</>
                }
            </button>
        </div>
    )

    // ── Step 2: Input ─────────────────────────────────────────────────────────
    const renderInput = () => (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setStep(1)} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Ganti Kelas
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <FontAwesomeIcon icon={faSchool} className="text-emerald-500 text-xs" />
                    <span className="text-[10px] font-black text-[var(--color-text)]">{selectedClass?.name}</span>
                    <span className="text-[var(--color-text-muted)] text-[10px]">·</span>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{bulanObj?.id_str} {selectedYear}</span>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${progressPct}%`,
                                background: progressPct === 100 ? '#10b981' : progressPct > 50 ? '#6366f1' : '#f59e0b'
                            }}
                        />
                    </div>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] whitespace-nowrap">
                        {completedCount}/{students.length} lengkap
                    </span>
                </div>

                <button
                    onClick={saveAll}
                    className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                    <FontAwesomeIcon icon={faFloppyDisk} className="text-[9px]" /> Simpan Semua
                </button>

                <button
                    onClick={() => setStep(3)}
                    className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-1.5"
                >
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px]" /> Preview & Cetak
                </button>
            </div>

            {/* Keyboard hint */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                <FontAwesomeIcon icon={faBolt} className="text-amber-500 text-[10px]" />
                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">
                    Navigasi keyboard: <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Tab</kbd> / <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Enter</kbd> lanjut · <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">↑↓←→</kbd> pindah sel
                </span>
            </div>

            {/* Main Input Table */}
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: 200 }} />
                        {KRITERIA.map(k => <col key={k.key} style={{ width: 48 }} />)}
                        <col style={{ width: 192 }} />
                        <col style={{ width: 155 }} />
                        <col style={{ width: 125 }} />
                    </colgroup>
                    <thead>
                        <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '2px solid var(--color-border)' }}>
                            <th className="px-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] sticky left-0 z-10" style={{ background: 'var(--color-surface-alt)', padding: '10px 12px', verticalAlign: 'middle' }}>
                                Santri
                            </th>
                            {KRITERIA.map(k => (
                                <th key={k.key} style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                        <span style={{ direction: 'rtl', fontSize: 14, fontWeight: 900, color: k.color, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: 'serif' }}>{k.arShort}</span>
                                        <span style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{k.id}</span>
                                    </div>
                                </th>
                            ))}
                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fisik</span>
                                    <span style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.55, fontWeight: 600 }}>BB · TB · Sakit · Pulang</span>
                                </div>
                            </th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                                    <span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Hafalan</span>
                                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', opacity: 0.55, direction: 'rtl', fontFamily: 'serif' }}>الزيادة · المراجعة</span>
                                </div>
                            </th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, si) => {
                            const sc = scores[student.id] || {}
                            const ex = extras[student.id] || {}
                            const complete = isComplete(sc)
                            const avg = calcAvg(sc)
                            const isSaved = savedIds.has(student.id)
                            const isSaving = saving[student.id]

                            return (
                                <tr
                                    key={student.id}
                                    className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary)]/[0.02]"
                                    style={{ background: si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}
                                >
                                    {/* Student Info */}
                                    <td className="px-3 py-3 sticky left-0 z-10" style={{ background: si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}>
                                        <div className="flex items-center gap-2.5">
                                            <RadarChart scores={sc} size={36} />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-black text-[var(--color-text)] leading-tight truncate">{student.name}</div>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    {avg
                                                        ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).color }}>{avg}</span>
                                                        : <span className="text-[8px] text-[var(--color-text-muted)] font-bold">isi nilai</span>
                                                    }
                                                    {isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[8px] text-amber-500 animate-spin" />}
                                                    {!isSaving && isSaved && <FontAwesomeIcon icon={faCircleCheck} className="text-[8px] text-emerald-500" />}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Score Cells */}
                                    {KRITERIA.map((k, ki) => (
                                        <td key={k.key} className="py-2 text-center" style={{ verticalAlign: 'middle' }}>
                                            <ScoreCell
                                                value={sc[k.key]}
                                                onChange={v => setScores(prev => ({
                                                    ...prev,
                                                    [student.id]: { ...prev[student.id], [k.key]: v }
                                                }))}
                                                onKeyDown={e => handleKeyDown(e, si, ki)}
                                                inputRef={el => { cellRefs.current[`${si}-${ki}`] = el }}
                                                kriteria={k}
                                            />
                                        </td>
                                    ))}

                                    {/* Fisik & Kehadiran */}
                                    <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {[
                                                { key: 'berat_badan', label: 'BB', icon: faWeightScale, color: '#6366f1', unit: 'kg' },
                                                { key: 'tinggi_badan', label: 'TB', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' },
                                                { key: 'hari_sakit', label: 'Skt', icon: faBandage, color: '#ef4444', unit: 'hr' },
                                                { key: 'hari_pulang', label: 'Plg', icon: faDoorOpen, color: '#f59e0b', unit: 'x' },
                                            ].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden"
                                                    style={{ background: 'var(--color-surface)', height: 32 }}>
                                                    <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}>
                                                        <FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} />
                                                    </div>
                                                    <input
                                                        type="number" placeholder="—"
                                                        value={ex[f.key] ?? ''}
                                                        onChange={e => setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], [f.key]: e.target.value } }))}
                                                        className="flex-1 w-0 h-full text-[11px] font-bold text-center bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold pr-1 shrink-0">{f.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Hafalan */}
                                    <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                                        <div className="flex flex-col gap-1.5">
                                            {[
                                                { key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981', label: 'Ziyadah' },
                                                { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6', label: "Muroja'ah" },
                                            ].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden"
                                                    style={{ background: 'var(--color-surface)', height: 32 }}>
                                                    <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}>
                                                        <FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} />
                                                    </div>
                                                    <input
                                                        placeholder={f.label}
                                                        value={ex[f.key] ?? ''}
                                                        onChange={e => setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], [f.key]: e.target.value } }))}
                                                        className="flex-1 w-0 h-full px-1 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </td>

                                    {/* Aksi */}
                                    <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                                        <div className="flex flex-col gap-1.5">
                                            {/* Simpan */}
                                            <button onClick={() => saveStudent(student.id)} disabled={isSaving}
                                                className="w-full h-8 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-black transition-all disabled:opacity-50"
                                                style={{ background: isSaved ? '#10b98115' : '#6366f115', color: isSaved ? '#10b981' : '#6366f1', border: '1px solid', borderColor: isSaved ? '#10b98130' : '#6366f130' }}>
                                                <FontAwesomeIcon icon={isSaving ? faSpinner : isSaved ? faCircleCheck : faFloppyDisk} className={isSaving ? 'animate-spin' : ''} />
                                                {isSaving ? 'Saving' : isSaved ? 'Saved' : 'Simpan'}
                                            </button>
                                            {/* PDF + WA */}
                                            <div className="flex gap-1">
                                                <button onClick={() => { setPreviewStudentId(student.id); setStep(3) }}
                                                    className="flex-1 h-8 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center gap-1 text-[11px] font-black hover:bg-indigo-500/20 transition-all"
                                                    title="Preview PDF">
                                                    <FontAwesomeIcon icon={faFilePdf} /> PDF
                                                </button>
                                                <button onClick={() => generateAndSendWA(student)}
                                                    className={`h-8 px-2 rounded-md border text-[11px] font-black flex items-center justify-center gap-1 transition-all
                                                        ${!student.phone
                                                            ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-40 cursor-not-allowed'
                                                            : sendingWA[student.id] === 'done'
                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20'
                                                                : sendingWA[student.id]
                                                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 cursor-wait'
                                                                    : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'
                                                        }`}
                                                    title={
                                                        !student.phone ? 'No. WA tidak ada'
                                                            : sendingWA[student.id] === 'generating' ? 'Membuat PDF...'
                                                                : sendingWA[student.id] === 'uploading' ? 'Mengupload...'
                                                                    : sendingWA[student.id] === 'done' ? 'Terkirim! Klik untuk kirim ulang'
                                                                        : 'Generate PDF + Kirim WA'
                                                    }
                                                    disabled={!student.phone || (!!sendingWA[student.id] && sendingWA[student.id] !== 'done')}>
                                                    <FontAwesomeIcon
                                                        icon={
                                                            sendingWA[student.id] === 'generating' || sendingWA[student.id] === 'uploading'
                                                                ? faSpinner
                                                                : sendingWA[student.id] === 'done'
                                                                    ? faCircleCheck
                                                                    : faWhatsapp
                                                        }
                                                        className={sendingWA[student.id] === 'generating' || sendingWA[student.id] === 'uploading' ? 'animate-spin' : ''}
                                                    /> WA
                                                </button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary Footer */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {KRITERIA.map(k => {
                    const vals = students.map(s => scores[s.id]?.[k.key]).filter(v => v !== '' && v !== null && v !== undefined)
                    const avg = vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : '—'
                    const g = avg !== '—' ? GRADE(Number(avg)) : null
                    return (
                        <div key={k.key} className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center">
                            <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: k.color }}>{k.id}</div>
                            <div className="text-lg font-black" style={{ color: g?.uiColor || 'var(--color-text-muted)' }}>{avg}</div>
                            <div className="text-[7px] font-bold text-[var(--color-text-muted)]" style={{ direction: 'rtl' }}>{g?.label || 'rata kelas'}</div>
                        </div>
                    )
                })}
            </div>
        </div>
    )

    // ── Step 3: Preview & Print ───────────────────────────────────────────────
    const renderPreview = () => {
        const previewStudent = previewStudentId
            ? students.find(s => s.id === previewStudentId)
            : students[0]

        return (
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setStep(2)} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali Input
                    </button>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{completedCount}/{students.length} raport lengkap</span>
                    <div className="flex-1" />
                    <button
                        onClick={() => openPrintWindow([previewStudent].filter(Boolean))}
                        className="h-8 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPrint} /> Cetak Ini
                    </button>
                    <button
                        onClick={() => openPrintWindow(students)}
                        className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"
                    >
                        <FontAwesomeIcon icon={faPrint} /> Cetak Semua ({students.length})
                    </button>
                </div>

                {/* Student Selector Chips */}
                <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] self-center mr-1">Pilih:</span>
                    {students.map(s => {
                        const complete = isComplete(scores[s.id] || {})
                        const isActive = previewStudentId === s.id || (!previewStudentId && s.id === students[0]?.id)
                        const waStatus = sendingWA[s.id]
                        return (
                            <div key={s.id} className="flex items-center">
                                {/* Nama — klik untuk preview */}
                                <button
                                    onClick={() => setPreviewStudentId(s.id)}
                                    className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-l-lg text-[10px] font-bold transition-all border-y border-l ${isActive
                                        ? 'bg-indigo-500 border-indigo-500 text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'
                                        }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    {s.name.split(' ')[0]}
                                </button>
                                {/* Tombol WA per-santri */}
                                <button
                                    onClick={() => generateAndSendWA(s)}
                                    disabled={!s.phone || (!!waStatus && waStatus !== 'done')}
                                    title={!s.phone ? 'No. WA tidak ada' : waStatus === 'done' ? 'Terkirim! Klik kirim ulang' : 'Kirim PDF via WA'}
                                    className={`h-full px-1.5 py-1 text-[8px] transition-all border-y ${!s.phone
                                            ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-30 cursor-not-allowed'
                                            : waStatus === 'done'
                                                ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-emerald-500'
                                                : waStatus
                                                    ? 'bg-[var(--color-surface)] border-[var(--color-border)] text-amber-500 cursor-wait'
                                                    : isActive
                                                        ? 'bg-indigo-600 border-indigo-500 text-white/80 hover:text-white'
                                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-green-500 hover:border-green-500/30'
                                        }`}
                                >
                                    <FontAwesomeIcon
                                        icon={waStatus === 'generating' || waStatus === 'uploading' ? faSpinner : waStatus === 'done' ? faCircleCheck : faWhatsapp}
                                        className={waStatus === 'generating' || waStatus === 'uploading' ? 'animate-spin' : ''}
                                    />
                                </button>
                                {/* Tombol Cetak per-santri */}
                                <button
                                    onClick={() => openPrintWindow([s])}
                                    title={`Cetak raport ${s.name}`}
                                    className={`h-full px-1.5 py-1 rounded-r-lg text-[8px] transition-all border-y border-r ${isActive
                                        ? 'bg-indigo-600 border-indigo-500 text-white/80 hover:text-white'
                                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-indigo-500 hover:border-indigo-500/30'
                                        }`}
                                >
                                    <FontAwesomeIcon icon={faPrint} />
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* WA broadcast bar */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <div>
                        <p className="text-[11px] font-black text-green-700 dark:text-green-400 flex items-center gap-1.5"><FontAwesomeIcon icon={faWhatsapp} /> Broadcast via WhatsApp</p>
                        <p className="text-[9px] text-green-600/70 dark:text-green-500/70 font-bold">
                            Generate PDF + upload ke Supabase (link aktif 3 hari) + kirim ke semua wali santri
                        </p>
                    </div>
                    <button
                        onClick={broadcastAllWA}
                        className="h-9 px-4 rounded-xl bg-green-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all flex items-center gap-2 shrink-0"
                    >
                        <FontAwesomeIcon icon={faWhatsapp} /> Kirim Semua WA + PDF
                    </button>
                </div>

                {/* A4 Preview */}
                {previewStudent && (
                    <div className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-gray-100 dark:bg-gray-900 p-4 flex justify-center print:hidden">
                        <div className="shadow-2xl">
                            <RaportPrintCard
                                student={previewStudent}
                                scores={scores[previewStudent.id]}
                                extra={extras[previewStudent.id]}
                                bulanObj={bulanObj}
                                tahun={selectedYear}
                                musyrif={musyrif}
                                className={selectedClass?.name}
                                lang={lang}
                            />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ── Step 4: Archive / Riwayat ─────────────────────────────────────────────
    const renderArchive = () => {
        const filtered = archiveList.filter(e =>
            (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
            (!archiveFilter.year || String(e.year) === String(archiveFilter.year))
        )
        const uniqueYears = [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)

        if (archivePreview) {
            const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, lang: pLang, entry } = archivePreview
            const previewId = pStu[0]?.id
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setArchivePreview(null)}
                            className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali Arsip
                        </button>
                        <div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name} · {BULAN.find(b => b.id === entry.month)?.id_str} {entry.year}</div>
                        <div className="flex-1" />
                        <button onClick={() => exportBulkPDF(entry)}
                            className="h-8 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all flex items-center gap-2">
                            <FontAwesomeIcon icon={faFileZipper} /> Export PDF
                        </button>
                        <button onClick={() => window.print()}
                            className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2">
                            <FontAwesomeIcon icon={faPrint} /> Cetak Semua
                        </button>
                    </div>
                    {/* Student chips */}
                    <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        {pStu.map(s => {
                            const complete = isComplete(pSc[s.id] || {})
                            const isActive = previewStudentId === s.id || (!previewStudentId && s.id === pStu[0]?.id)
                            return (
                                <button key={s.id} onClick={() => setPreviewStudentId(s.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    {s.name.split(' ')[0]}
                                </button>
                            )
                        })}
                    </div>
                    {/* Preview card */}
                    {(() => {
                        const pStudent = previewStudentId ? pStu.find(s => s.id === previewStudentId) : pStu[0]
                        return pStudent ? (
                            <div className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-gray-100 dark:bg-gray-900 p-4 flex justify-center print:p-0 print:bg-white print:border-none">
                                <div className="shadow-2xl">
                                    <RaportPrintCard student={pStudent} scores={pSc[pStudent.id]} extra={pEx[pStudent.id]}
                                        bulanObj={pBulan} tahun={pTahun} musyrif={pMus} className={pClass} lang={pLang} />
                                </div>
                            </div>
                        ) : null
                    })()}
                    <div className="hidden print:block">
                        {pStu.map(s => (
                            <RaportPrintCard key={s.id} student={s} scores={pSc[s.id]} extra={pEx[s.id]}
                                bulanObj={pBulan} tahun={pTahun} musyrif={pMus} className={pClass} lang={pLang} />
                        ))}
                    </div>
                </div>
            )
        }

        return (
            <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setStep(1)}
                        className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali
                    </button>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">{archiveList.length} periode tersimpan</span>
                    <div className="flex-1" />
                    {/* Filter Tahun */}
                    <select value={archiveFilter.year} onChange={e => setArchiveFilter(p => ({ ...p, year: e.target.value }))}
                        className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                        <option value="">Semua Tahun</option>
                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {/* Filter Kelas */}
                    <select value={archiveFilter.classId} onChange={e => setArchiveFilter(p => ({ ...p, classId: e.target.value }))}
                        className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                        <option value="">Semua Kelas</option>
                        {[...new Map(archiveList.map(e => [e.class_id, e])).values()].map(e => (
                            <option key={e.class_id} value={e.class_id}>{e.class_name}</option>
                        ))}
                    </select>
                </div>

                {/* Archive Grid */}
                {archiveLoading ? (
                    <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> Memuat arsip...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]">
                        <FontAwesomeIcon icon={faClipboardList} className="text-4xl opacity-20" />
                        <p className="text-sm font-bold">Belum ada raport tersimpan</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map(entry => {
                            const bulan = BULAN.find(b => b.id === entry.month)
                            const pct = entry.count ? Math.round((entry.completed / entry.count) * 100) : 0
                            return (
                                <div key={entry.key} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500/30 transition-all group">
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name}</div>
                                            <div className="text-[10px] text-[var(--color-text-muted)] font-bold mt-0.5">
                                                {bulan?.id_str} {entry.year} · {entry.lang === 'ar' ? 'عربي' : 'Indonesia'}
                                            </div>
                                        </div>
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${entry.lang === 'ar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'}`}>
                                            {entry.lang === 'ar' ? 'Pondok' : 'Reguler'}
                                        </span>
                                    </div>
                                    {/* Progress */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-[9px] font-bold text-[var(--color-text-muted)] mb-1">
                                            <span>{entry.completed}/{entry.count} lengkap</span>
                                            <span>{pct}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#6366f1' : '#f59e0b' }} />
                                        </div>
                                    </div>
                                    {/* Musyrif */}
                                    {entry.musyrif && (
                                        <div className="text-[9px] text-[var(--color-text-muted)] mb-3 flex items-center gap-1">
                                            <FontAwesomeIcon icon={faUsers} className="opacity-50" /> {entry.musyrif}
                                        </div>
                                    )}
                                    {/* Actions */}
                                    <div className="flex gap-1.5 mt-auto">
                                        <button onClick={() => loadArchiveDetail(entry)}
                                            className="flex-1 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all">
                                            <FontAwesomeIcon icon={faMagnifyingGlass} /> Preview
                                        </button>
                                        <button onClick={() => exportBulkPDF(entry)}
                                            className="flex-1 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all"
                                            title="Export semua raport ke PDF">
                                            <FontAwesomeIcon icon={faFileZipper} /> Export PDF
                                        </button>
                                        <button onClick={() => deleteArchiveEntry(entry)}
                                            className="h-8 w-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all"
                                            title="Hapus arsip">
                                            <FontAwesomeIcon icon={faXmark} className="text-xs" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    const stepLabels = ['Setup', 'Input Nilai', 'Preview & Cetak']

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                        <FontAwesomeIcon icon={faClipboardList} className="text-emerald-500 text-sm" />
                    </div>
                    <div>
                        <span className="font-black text-sm">Raport Bulanan</span>
                        <span className="text-[var(--color-text-muted)] font-normal text-xs ml-2">نتيجة الشخصية</span>
                    </div>
                    {/* Step Indicator — hanya tampil kalau bukan di step arsip */}
                    {step !== 4 && (
                        <div className="flex items-center gap-1.5 ml-4">
                            {stepLabels.map((label, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${step === i + 1 ? 'bg-emerald-500 text-white' :
                                        step > i + 1 ? 'bg-emerald-500/20 text-emerald-500' :
                                            'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'
                                        }`}>
                                        {step > i + 1 ? <FontAwesomeIcon icon={faCheck} className="text-[7px]" /> : i + 1}
                                    </div>
                                    <span className={`text-[9px] font-bold hidden sm:inline ${step === i + 1 ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>{label}</span>
                                    {i < stepLabels.length - 1 && <div className="w-4 h-px bg-[var(--color-border)]" />}
                                </div>
                            ))}
                        </div>
                    )}
                    {step === 4 && (
                        <div className="ml-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[9px] font-black flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faTableList} /> Arsip Riwayat
                        </div>
                    )}
                    <div className="flex-1" />
                    {/* Riwayat button — always visible */}
                    <button
                        onClick={() => { setStep(4); loadArchive() }}
                        className={`h-7 px-3 rounded-lg border text-[9px] font-black flex items-center gap-1.5 transition-all ${step === 4 ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                    >
                        <FontAwesomeIcon icon={faTableList} /> Riwayat
                    </button>
                </div>
            }
            size="full"
        >
            {step === 1 && renderSetup()}
            {step === 2 && renderInput()}
            {step === 3 && renderPreview()}
            {step === 4 && renderArchive()}

            {/* Hidden print container — render semua kartu yang akan dicetak */}
            {printQueue.length > 0 && (
                <div
                    ref={printContainerRef}
                    style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}
                >
                    {students.filter(s => printQueue.includes(s.id)).map(s => (
                        <RaportPrintCard
                            key={s.id}
                            student={s}
                            scores={scores[s.id]}
                            extra={extras[s.id]}
                            bulanObj={bulanObj}
                            tahun={selectedYear}
                            musyrif={musyrif}
                            className={selectedClass?.name}
                            lang={lang}
                            onRendered={() => setPrintRenderedCount(c => c + 1)}
                        />
                    ))}
                </div>
            )}
        </Modal>
    )
}