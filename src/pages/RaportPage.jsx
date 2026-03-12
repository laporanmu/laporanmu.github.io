import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faGraduationCap, faCalendarAlt, faChevronLeft, faChevronRight,
    faPrint, faCheck, faSpinner, faFloppyDisk,
    faChartPie, faTableList, faMagnifyingGlass, faArrowLeft, faDownload,
    faCircleCheck, faCircleExclamation, faTriangleExclamation,
    faBolt, faXmark, faSchool, faClipboardList, faUsers,
    faMosque, faBookOpen, faBroom, faLanguage, faStar,
    faWeightScale, faRulerVertical, faBandage, faDoorOpen,
    faCloudArrowUp, faFileLines, faFilePdf, faFileZipper, faBoxArchive,
    faSearch, faSliders, faPlus, faFilter, faFillDrip, faArrowTrendUp, faArrowTrendDown, faFileExport,
    faQuestion, faCircleInfo, faSortAmountDown, faWifi,
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { useSchoolSettings } from '../context/SchoolSettingsContext'

// ─── Constants ────────────────────────────────────────────────────────────────

// FIX #7: MAX_SCORE sebagai konstanta agar skala mudah diubah
const MAX_SCORE = 9

// FIX #14: Nama bucket Supabase sebagai konstanta
const STORAGE_BUCKET = 'raport-mbs'

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

// FIX #1: GRADE_ID dihapus (dead code). Gunakan GRADE(n).id untuk label Indonesia.
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
        izin: 'الإذن', alpa: 'الغياب', gradeScale: 'نظام التقدير',
        musyrif: 'رائد الحجرة', guardian: 'ولي الأمر',
        reportTitle: 'نتيجة الشخصية', month: 'شهر',
    },
    id: {
        studentName: 'Nama Santri', room: 'Kamar', class: 'Kelas', year: 'Tahun Ajaran',
        dailyWork: 'Amal Harian', subject: 'Mata Pelajaran', score: 'Nilai',
        grade: 'Predikat', num: 'No', weight: 'Berat Badan', height: 'Tinggi Badan',
        ziyadah: 'Ziyadah', murojaah: "Muroja'ah", sick: 'Hari Sakit', home: 'Hari Pulang',
        izin: 'Hari Izin', alpa: 'Hari Alpa', gradeScale: 'Skala Penilaian',
        musyrif: 'Musyrif / Wali Kamar', guardian: 'Wali Santri',
        reportTitle: 'Raport Bulanan', month: 'Bulan',
    }
}

// Kamus transliterasi nama Arab lengkap — khusus nama santri pesantren Indonesia
const KATA_ARAB = {
    'muhammad': 'محمد', 'mohamad': 'محمد', 'muhamad': 'محمد', 'mohammad': 'محمد',
    'ahmad': 'أحمد', 'achmad': 'أحمد',
    'abdillah': 'عبد الله', 'abdullah': 'عبد الله',
    'abdurrahman': 'عبد الرحمن', 'abdussalam': 'عبد السلام', 'abdurrozaq': 'عبد الرزاق',
    'abdurrozak': 'عبد الرزاق', 'abdulaziz': 'عبد العزيز', 'abdulghani': 'عبد الغني',
    'abdulhakim': 'عبد الحكيم', 'abdullatif': 'عبد اللطيف', 'abdulmalik': 'عبد الملك',
    'abdulwahid': 'عبد الواحد', 'abdulhadi': 'عبد الهادي', 'abdulhamid': 'عبد الحميد',
    'abdulkarim': 'عبد الكريم', 'abdulmajid': 'عبد المجيد', 'abdurrahim': 'عبد الرحيم',
    'abdurahman': 'عبد الرحمن',
    'ali': 'علي', 'aliy': 'علي',
    'umar': 'عمر', 'omar': 'عمر',
    'usman': 'عثمان', 'utsman': 'عثمان', 'othman': 'عثمان',
    'hasan': 'حسن', 'husain': 'حسين', 'husein': 'حسين', 'hussein': 'حسين',
    'ibrahim': 'إبراهيم', 'ibrohim': 'إبراهيم',
    'ismail': 'إسماعيل',
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
    'haris': 'حارث', 'harith': 'حارث', 'harits': 'حارث',
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
    'jabir': 'جابر',
    'jalal': 'جلال', 'jalaludin': 'جلال الدين', 'jalaluddin': 'جلال الدين',
    'kamal': 'كمال', 'kamil': 'كامل',
    'khalid': 'خالد', 'kholid': 'خالد',
    'khoirul': 'خيرل', 'khairul': 'خيرل',
    'khoiron': 'خيرون', 'khairon': 'خيرون',
    'khoir': 'خير', 'khair': 'خير',
    'luthfi': 'لطفي', 'lutfi': 'لطفي',
    'lukman': 'لقمان', 'luqman': 'لقمان',
    'mahfudz': 'محفوظ', 'mahfuz': 'محفوظ',
    'majid': 'مجيد',
    'malik': 'مالك',
    'mansur': 'منصور', 'mansour': 'منصور',
    'marwan': 'مروان',
    'masud': 'مسعود',
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
    'rafi': 'رافع', 'rafif': 'رفيف',
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
    'syarifuddin': 'شريف الدين', 'syarifudin': 'شريف الدين',
    'taufiq': 'توفيق', 'taufik': 'توفيق', 'tawfiq': 'توفيق',
    'thoriq': 'طارق', 'thariq': 'طارق', 'tariq': 'طارق',
    'tsaqif': 'ثاقف',
    'ubaid': 'عبيد', 'ubaidillah': 'عبيد الله', 'ubaydillah': 'عبيد الله',
    'wahid': 'واحد', 'wahiduddin': 'واحد الدين',
    'walid': 'وليد',
    'waris': 'وارث',
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
    'arsyad': 'أرشد',
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
    'habib': 'حبيب', 'habibi': 'حبيبي',
    'ihsan': 'إحسان', 'ikhsan': 'إحسان',
    'irsyad': 'إرشاد',
    'labib': 'لبيب',
    'lathif': 'لطيف', 'latif': 'لطيف',
    'maruf': 'معروف',
    'mamduh': 'ممدوح',
    'nafi': 'نافع',
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
    'wafa': 'وفاء',
    'zuhdi': 'زهدي', 'zuhry': 'زهري',
}

// Kamus Asmaul Husna — untuk pola Abdul-/Abdi- + nama Allah
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
    'syahid': 'الشهيد', 'haq': 'الحق',
    'wakil': 'الوكيل', 'qowiy': 'القوي', 'matin': 'المتين',
    'wali': 'الولي', 'hamid': 'الحميد', 'muhshi': 'المحصي',
    'mubdi': 'المبدئ', 'muhyi': 'المحيي',
    'mumit': 'المميت', 'hayy': 'الحي', 'qoyyum': 'القيوم',
    'wahid': 'الواحد', 'ahad': 'الأحد', 'somad': 'الصمد',
    'qadir': 'القادر', 'qodir': 'القادر', 'muqtadir': 'المقتدر',
    'muqoddim': 'المقدم', 'muakhkhir': 'المؤخر', 'awwal': 'الأول',
    'akhir': 'الآخر', 'dhohir': 'الظاهر', 'batin': 'الباطن',
    'tawwab': 'التواب', 'muntaqim': 'المنتقم', 'afuw': 'العفو',
    'rauf': 'الرؤوف', 'nur': 'النور', 'hadi': 'الهادي',
    'badi': 'البديع', 'baqi': 'الباقي', 'warits': 'الوارث',
    'rasyid': 'الرشيد', 'sabur': 'الصبور',
}

// Digraf — termasuk tambahan ny/ng/ch/ph/qu/wr dari Modal
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

// FIX #15: Helper withTimeout agar generatePDFBlob tidak hang selamanya
const withTimeout = (promise, ms, label = 'Operasi') =>
    Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout setelah ${ms / 1000}s`)), ms)),
    ])

const calcAvg = (scores) => {
    const vals = KRITERIA.map(k => scores[k.key]).filter(v => v !== '' && v !== null && v !== undefined)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
}

const isComplete = (scores) => KRITERIA.every(k => scores[k.key] !== '' && scores[k.key] !== null && scores[k.key] !== undefined)

// FIX #17: Helper untuk membangun pesan WA — dipecah agar mudah dibaca & dimaintain
const buildWaLines = ({ student, sc, extras, bulanObj, selectedYear, selectedClass, musyrif, pdfUrl, waFooter }) => {
    const avg = calcAvg(sc)
    const g = avg ? GRADE(Number(avg)) : null
    const header = [
        `Assalamu'alaikum Wr. Wb.`,
        ``,
        `Yth. Bapak/Ibu Wali dari Ananda *${student.name}*`,
        ``,
        `Berikut hasil *Raport Bulanan ${bulanObj?.id_str} ${selectedYear}*`,
        `Kelas: ${selectedClass?.name || '—'} | Musyrif: ${musyrif || '—'}`,
        ``,
    ]
    const scoreLines = KRITERIA.map(k => {
        const v = sc[k.key]
        const gr = (v !== '' && v !== null) ? GRADE(Number(v)) : null
        return `• ${k.id}: *${v ?? '—'}* ${gr ? `(${gr.id})` : ''}`
    })
    const avgLine = avg ? [``, `📊 Rata-rata: *${avg}/${MAX_SCORE}* (${Math.round((Number(avg) / MAX_SCORE) * 100)}/100) — ${g?.id}`] : []
    const catatanLine = extras?.catatan ? [``, `📝 Catatan: ${extras.catatan}`] : []
    const pdfLine = pdfUrl ? [``, `📄 *Unduh Raport PDF:*`, pdfUrl, `_Simpan PDF ini untuk arsip Bapak/Ibu._`, ``] : []
    const footer = [``, `Wassalamu'alaikum Wr. Wb.`, `_${waFooter || 'Sistem Laporanmu'}_`]
    return [...header, ...scoreLines, ...avgLine, ...catatanLine, ...pdfLine, ...footer]
}

// FIX #16: CSV escape yang proper — handle newline dan karakter spesial di catatan
const escapeCsvCell = (val) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

// ─── Radar Chart SVG ──────────────────────────────────────────────────────────

const RadarChart = ({ scores, size = 80 }) => {
    const vals = KRITERIA.map(k => Number(scores?.[k.key]) || 0)
    const cx = size / 2, cy = size / 2, r = size * 0.36
    const angle = (i) => (i * 2 * Math.PI / KRITERIA.length) - Math.PI / 2
    // FIX #7: Gunakan MAX_SCORE instead of hardcoded 9
    const pt = (i, v) => [cx + (v / MAX_SCORE) * r * Math.cos(angle(i)), cy + (v / MAX_SCORE) * r * Math.sin(angle(i))]
    const bgPt = (i) => [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))]
    const polyPts = vals.map((v, i) => pt(i, v).join(',')).join(' ')
    const avg = calcAvg(scores || {})
    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
            {[0.33, 0.67, 1].map((sc, ri) => (
                <polygon key={ri} points={KRITERIA.map((_, i) => { const [x, y] = bgPt(i); return [cx + (x - cx) * sc, cy + (y - cy) * sc].join(',') }).join(' ')} fill="none" stroke="var(--color-border)" strokeWidth="0.6" />
            ))}
            {KRITERIA.map((_, i) => { const [x, y] = bgPt(i); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--color-border)" strokeWidth="0.5" /> })}
            <polygon points={polyPts} fill="rgba(99,102,241,0.18)" stroke="#6366f1" strokeWidth="1.2" strokeLinejoin="round" />
            {vals.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r="1.8" fill={KRITERIA[i].color} /> })}
            {avg && (<><circle cx={cx} cy={cy} r={size * 0.14} fill="var(--color-surface)" stroke="var(--color-border)" strokeWidth="0.8" /><text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.12} fontWeight="900" fill="var(--color-text)">{avg}</text></>)}
        </svg>
    )
}

// ─── Sparkline Trend ─────────────────────────────────────────────────────────

const SparklineTrend = memo(({ trendData }) => {
    if (!trendData || trendData.length < 2) return null
    const avgs = trendData.map(t => {
        const vals = KRITERIA.map(k => t.scores[k.key]).filter(v => v !== null && v !== undefined)
        return vals.length ? vals.reduce((a, b) => a + Number(b), 0) / vals.length : null
    }).filter(v => v !== null)
    if (avgs.length < 2) return null
    const W = 60, H = 22, pad = 2
    const minV = Math.min(...avgs), maxV = Math.max(...avgs)
    const range = maxV - minV || 1
    const pts = avgs.map((v, i) => {
        const x = pad + (i / (avgs.length - 1)) * (W - pad * 2)
        const y = H - pad - ((v - minV) / range) * (H - pad * 2)
        return `${x},${y}`
    }).join(' ')
    const last = avgs[avgs.length - 1], prev = avgs[avgs.length - 2]
    const trend = last > prev ? '#10b981' : last < prev ? '#ef4444' : '#6366f1'
    return (
        <div className="flex items-center gap-1.5" title={`Tren rata-rata ${trendData.length} bulan terakhir`}>
            <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
                <polyline points={pts} fill="none" stroke={trend} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
                {avgs.map((v, i) => {
                    const x = pad + (i / (avgs.length - 1)) * (W - pad * 2)
                    const y = H - pad - ((v - minV) / range) * (H - pad * 2)
                    return <circle key={i} cx={x} cy={y} r="2" fill={i === avgs.length - 1 ? trend : 'var(--color-surface)'} stroke={trend} strokeWidth="1.2" />
                })}
            </svg>
            <span style={{ fontSize: 9, fontWeight: 900, color: trend }}>{last.toFixed(1)}</span>
        </div>
    )
})

// ─── Score Cell ───────────────────────────────────────────────────────────────

const ScoreCell = memo(({ value, onChange, onKeyDown, inputRef, kriteria }) => {
    const [focused, setFocused] = useState(false)
    // FIX #12: Tambah state error untuk feedback input di luar range
    const [hasError, setHasError] = useState(false)
    const val = value !== '' && value !== null && value !== undefined ? Number(value) : ''
    const g = val !== '' ? GRADE(val) : null

    const handleChange = (e) => {
        const raw = e.target.value
        if (raw === '') { setHasError(false); onChange(''); return }
        const num = Number(raw)
        if (num < 0 || num > MAX_SCORE) {
            setHasError(true)
            onChange(Math.min(MAX_SCORE, Math.max(0, num)))
            setTimeout(() => setHasError(false), 1200)
        } else {
            setHasError(false)
            onChange(num)
        }
    }

    return (
        <div title={g ? `${kriteria.id}: ${val} — ${g.id} (${g.label})` : kriteria.id}>
            <input
                ref={inputRef}
                type="number"
                min={0}
                max={MAX_SCORE}
                value={val}
                onChange={handleChange}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => { setFocused(false); setHasError(false) }}
                aria-label={`Nilai ${kriteria.id}`}
                className="w-11 h-10 text-center text-base font-black rounded-lg outline-none transition-all appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{
                    background: hasError ? '#ef444415' : g ? g.bg : 'var(--color-surface-alt)',
                    color: hasError ? '#ef4444' : g ? g.uiColor : 'var(--color-text-muted)',
                    border: `2px solid ${hasError ? '#ef4444' : focused ? (g ? g.uiColor : 'var(--color-primary)') : (g ? g.border : 'var(--color-border)')}`,
                }}
                placeholder="—"
            />
        </div>
    )
})

// ─── Raport Print Card ────────────────────────────────────────────────────────

const RaportPrintCard = memo(({ student, scores, extra, bulanObj, tahun, musyrif, className, lang = 'ar', settings = {}, onRendered }) => {
    const sc = scores || {}, ex = extra || {}, L = LABEL[lang], isAr = lang === 'ar'
    // FIX #2: Tambahkan onRendered ke dependency array
    useEffect(() => { onRendered?.() }, [onRendered])
    const gradeLabel = isAr ? (v) => GRADE(v)?.label : (v) => GRADE(v)?.id
    const yearDisplay = isAr ? `\u200F${toArabicNum(tahun - 1)} \u2013 ${toArabicNum(tahun)}` : `${tahun - 1} – ${tahun}`
    const tableDir = isAr ? 'rtl' : 'ltr'
    const displayName = isAr ? (student?.metadata?.nama_arab || student?.name || '—') : (student?.name || '—')
    const displayVal = (v) => { if (v === '' || v === null || v === undefined) return '—'; return isAr ? toArabicNum(v) : v }

    // Transliterasi nama musyrif ke Arab
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

    const displayClassName = isAr ? (() => {
        const ANGKA_AR = { '1': 'الأول', '2': 'الثاني', '3': 'الثالث', '4': 'الرابع', '5': 'الخامس', '6': 'السادس', '7': 'السابع', '8': 'الثامن', '9': 'التاسع', '10': 'العاشر' }
        const HURUF_AR = { 'a': 'أ', 'b': 'ب', 'c': 'ج', 'd': 'د', 'e': 'ه' }
        const KELAS_KATA = { 'boarding': '', 'pondok': '', 'reguler': '', 'regular': '', 'putra': 'بوتر', 'putri': 'بوتري', 'ikhwan': 'إخوان', 'akhwat': 'أخوات', 'sd': '', 'smp': '', 'sma': '', 'mts': '', 'ma': '', 'class': '', 'kelas': '' }
        const parts = (className || '').toLowerCase().split(/[\s\-_]+/), result = []
        for (const p of parts) {
            if (ANGKA_AR[p]) { result.push(ANGKA_AR[p]); continue }
            const m = p.match(/^(\d+)([a-e]?)$/)
            if (m) { if (ANGKA_AR[m[1]]) result.push(ANGKA_AR[m[1]]); if (m[2] && HURUF_AR[m[2]]) result.push(HURUF_AR[m[2]]); continue }
            if (HURUF_AR[p]) { result.push(HURUF_AR[p]); continue }
            if (KELAS_KATA[p] !== undefined) { if (KELAS_KATA[p]) result.push(KELAS_KATA[p]); continue }
            result.push(p)
        }
        return result.filter(Boolean).join(' ')
    })() : className

    return (
        <div className="raport-card" data-student-id={student?.id} style={{ fontFamily: "'Times New Roman', serif", width: '210mm', minHeight: '297mm', background: '#fff', color: '#000', padding: '8mm 12mm', boxSizing: 'border-box', fontSize: '11pt', lineHeight: 1.4, pageBreakAfter: 'always' }}>
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
            <div style={{ textAlign: 'center', margin: '6px 0 10px', fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit' }}>
                <div style={{ fontSize: '16pt', fontWeight: 900, direction: isAr ? 'rtl' : 'ltr' }}>{L.reportTitle}</div>
                <div style={{ fontSize: '13pt', fontWeight: 700, direction: isAr ? 'rtl' : 'ltr', marginTop: 2 }}>{isAr ? `${L.month} ${bulanObj?.ar || ''}` : `${L.month} ${bulanObj?.id_str || ''}`}</div>
            </div>
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
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color, fontFamily: "'Traditional Arabic', serif" }}>{g ? gradeLabel(val) : '—'}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700, fontFamily: "'Traditional Arabic', serif" }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{k.ar}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontFamily: "'Traditional Arabic', serif" }}>{numRows[i]}</td>
                                </> : <>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center' }}>{numRows[i]}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 10px' }}>{k.id}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{displayVal(val)}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: g?.color }}>{g ? gradeLabel(val) : '—'}</td>
                                </>}
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            {/* ── Extra Data: BB/TB · Ziyadah/Murojaah · Sakit/Izin/Alpa/Pulang ── */}
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
                {/* Sakit / Izin / Alpa / Pulang */}
                <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                    <tbody>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_sakit)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.sick}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.sick}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_sakit)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_izin)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.izin}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.izin}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_izin)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_alpa)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.alpa}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.alpa}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_alpa)}</td>
                            </>}
                        </tr>
                        <tr>
                            {isAr ? <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700, width: '35%' }}>{displayVal(ex.hari_pulang)}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'right', fontFamily: "'Traditional Arabic', serif" }}>{L.home}</td>
                            </> : <>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'left' }}>{L.home}</td>
                                <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '3px 7px', textAlign: 'center', fontWeight: 700 }}>{displayVal(ex.hari_pulang)}</td>
                            </>}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Skala Penilaian ── */}
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
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', fontFamily: "'Traditional Arabic', serif", textAlign: 'right' }}>{l}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', textAlign: 'center', fontFamily: "'Traditional Arabic', serif", whiteSpace: 'nowrap' }}>{n}</td>
                                </tr>
                            ))
                            : [['9', 'Istimewa'], ['8', 'Sangat Baik'], ['6 – 7', 'Baik'], ['4 – 5', 'Cukup'], ['0 – 3', 'Kurang']].map(([n, l]) => (
                                <tr key={n}>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px' }}>{l}</td>
                                    <td style={{ verticalAlign: 'middle', border: '1px solid #999', padding: '2px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>{n}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </table>
            </div>

            {/* ── TTD 3 Kolom: Ketua Pondok · Musyrif · Wali Santri ── */}
            <div style={{
                display: 'flex',
                marginTop: 20,
                flexDirection: isAr ? 'row-reverse' : 'row',
                justifyContent: 'space-between',
                direction: isAr ? 'rtl' : 'ltr',
            }}>
                {[
                    {
                        label: isAr
                            ? (settings.headmaster_title_ar || 'مدير المعهد')
                            : (settings.headmaster_title_id || 'Direktur'),
                        sub: isAr
                            ? (settings.headmaster_name_ar || '—')
                            : (settings.headmaster_name_id || '—')
                    },
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
                        <div style={{ height: 60 }} />
                        <div style={{ borderTop: '1px solid #333', paddingTop: 4, width: '80%', fontWeight: 700, fontSize: '9pt', textAlign: 'center' }}>
                            {item.sub || '......................'}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Catatan ── */}
            {ex.catatan && (
                <div style={{ marginTop: 10, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4, fontSize: '9pt' }}>
                    <span style={{ fontWeight: 700 }}>{isAr ? 'ملاحظة: ' : 'Catatan: '}</span>
                    {ex.catatan}
                </div>
            )}
        </div>
    )
})

// ─── Skeleton Loader (FIX #13) ────────────────────────────────────────────────

const ClassCardSkeleton = () => (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 animate-pulse">
        <div className="h-3 w-2/3 bg-[var(--color-border)] rounded mb-2" />
        <div className="h-2 w-1/3 bg-[var(--color-border)] rounded mb-3" />
        <div className="h-1.5 w-full bg-[var(--color-border)] rounded" />
    </div>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RaportPage() {
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
    // FIX #10: now sebagai ref agar tidak berubah setiap render
    const now = useRef(new Date()).current

    // ── Page-level state
    const [classesList, setClassesList] = useState([])
    const [pageLoading, setPageLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [stats, setStats] = useState({ totalKelas: 0, totalSiswa: 0, totalRaport: 0, bulanIni: now.getMonth() + 1 })
    const [classProgress, setClassProgress] = useState({})

    // ── Step state (0 = daftar kelas, 1 = setup, 2 = input, 3 = preview, 4 = arsip)
    const [step, setStep] = useState(0)

    // ── Setup state
    const [selectedClassId, setSelectedClassId] = useState('')
    const [homeroomTeacherName, setHomeroomTeacherName] = useState('')
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(now.getFullYear())
    const [musyrif, setMusyrif] = useState('')
    const [lang, setLang] = useState('ar')

    // ── Data state
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(false)
    const [transliterating, setTransliterating] = useState(false)
    const [scores, setScores] = useState({})
    const [extras, setExtras] = useState({})
    const [saving, setSaving] = useState({})
    const [savedIds, setSavedIds] = useState(new Set())
    const [existingReportIds, setExistingReportIds] = useState({})
    const [savingAll, setSavingAll] = useState(false)
    const [copyingLastMonth, setCopyingLastMonth] = useState(false)
    const [studentSearch, setStudentSearch] = useState('')

    // ── Archive state
    const [archiveLoading, setArchiveLoading] = useState(false)
    const [archiveList, setArchiveList] = useState([])
    const [archiveFilter, setArchiveFilter] = useState({ classId: '', year: '', month: '' })
    const [archiveSearch, setArchiveSearch] = useState('')
    const [archiveSort, setArchiveSort] = useState('newest')
    const [archiveStatusFilter, setArchiveStatusFilter] = useState('all')
    const [archivePreview, setArchivePreview] = useState(null)
    const [studentTrend, setStudentTrend] = useState({})

    // ── Offline draft
    const [draftAvailable, setDraftAvailable] = useState(false)
    const [isOnline, setIsOnline] = useState(navigator.onLine)

    // ── Modals
    const [showShortcutModal, setShowShortcutModal] = useState(false)
    // FIX #11: State konfirmasi sebelum WA Blast dimulai
    const [waBlastConfirm, setWaBlastConfirm] = useState(null) // null | { queue }
    const [waBlast, setWaBlast] = useState(null)

    // ── Banner
    const [newMonthBanner, setNewMonthBanner] = useState(null)

    // ── Preview
    const [previewStudentId, setPreviewStudentId] = useState(null)

    // ── WA/PDF
    const [sendingWA, setSendingWA] = useState({})
    const [raportLinks, setRaportLinks] = useState({})

    // ── Confirm modals
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [confirmModal, setConfirmModal] = useState(null)

    // ── Print
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)
    const printContainerRef = useRef(null)
    const [pendingExport, setPendingExport] = useState(null)

    // ── Prev month scores for delta comparison
    const [prevMonthScores, setPrevMonthScores] = useState({})

    // ── UX extras
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkValues, setBulkValues] = useState({})
    const [pendingNav, setPendingNav] = useState(null)

    // ── Refs
    const cellRefs = useRef({})
    const autoSaveTimers = useRef({})

    const selectedClass = classesList.find(c => c.id === selectedClassId)
    const bulanObj = BULAN.find(b => b.id === selectedMonth)
    // FIX #3: years dengan useMemo agar referensi stabil
    const years = useMemo(() => [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1], [now])

    const filteredStudents = useMemo(() => {
        let list = students
        if (studentSearch.trim()) list = list.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
        if (showIncompleteOnly) list = list.filter(s => !isComplete(scores[s.id] || {}))
        return list
    }, [students, studentSearch, showIncompleteOnly, scores])

    const completedCount = useMemo(() => students.filter(s => isComplete(scores[s.id] || {})).length, [students, scores])
    const progressPct = students.length ? Math.round((completedCount / students.length) * 100) : 0
    const noPhoneCount = students.filter(s => !s.phone).length

    const hasUnsavedMemo = useMemo(() => students.some(s => {
        if (savedIds.has(s.id)) return false
        const sc = scores[s.id] || {}, ex = extras[s.id] || {}
        return KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
            [ex.berat_badan, ex.tinggi_badan, ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan].some(v => v !== '' && v !== null && v !== undefined)
    }), [students, scores, extras, savedIds])

    const filteredClasses = useMemo(() =>
        classesList.filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
        , [classesList, searchQuery])

    // ── Fetch page data
    useEffect(() => {
        const fetchData = async () => {
            const curMonth = now.getMonth() + 1
            const curYear = now.getFullYear()
            const [classRes, studRes, repRes] = await Promise.all([
                supabase.from('classes').select('id, name').order('name'),
                supabase.from('students').select('id, class_id').is('deleted_at', null),
                supabase.from('student_monthly_reports').select('id, student_id, month, year'),
            ])
            const classes = classRes.data || []
            const allStudents = studRes.data || []
            const allReports = repRes.data || []
            setClassesList(classes)
            setStats({
                totalKelas: classes.length,
                totalSiswa: allStudents.length,
                totalRaport: allReports.length,
                bulanIni: curMonth,
            })
            const stuByClass = {}
            for (const s of allStudents) {
                if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []
                stuByClass[s.class_id].push(s.id)
            }
            const stuToClass = {}
            for (const s of allStudents) stuToClass[s.id] = s.class_id
            const curDoneSet = new Set(
                allReports.filter(r => r.month === curMonth && r.year === curYear).map(r => r.student_id)
            )
            const lastReportByClass = {}
            for (const r of allReports) {
                const cid = stuToClass[r.student_id]
                if (!cid) continue
                const prev = lastReportByClass[cid]
                if (!prev || r.year > prev.year || (r.year === prev.year && r.month > prev.month)) {
                    lastReportByClass[cid] = { month: r.month, year: r.year }
                }
            }
            const prog = {}
            for (const cls of classes) {
                const ids = stuByClass[cls.id] || []
                prog[cls.id] = {
                    total: ids.length,
                    done: ids.filter(id => curDoneSet.has(id)).length,
                    lastMonth: lastReportByClass[cls.id]?.month ?? null,
                    lastYear: lastReportByClass[cls.id]?.year ?? null,
                }
            }
            setClassProgress(prog)
            setPageLoading(false)
        }
        fetchData()
    }, [])

    // ── Auto-arsip banner
    useEffect(() => {
        if (!classesList.length) return
        const today = new Date()
        if (today.getDate() > 14) return
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
        const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
        const check = async () => {
            try {
                const classIds = classesList.map(c => c.id)
                const { data: stuData } = await supabase.from('students').select('id, class_id').in('class_id', classIds).is('deleted_at', null)
                if (!stuData?.length) return
                const allStudentIds = stuData.map(s => s.id)
                const { data: repData } = await supabase.from('student_monthly_reports').select('student_id').in('student_id', allStudentIds).eq('month', prevMonth).eq('year', prevYear)
                const archivedSet = new Set((repData || []).map(r => r.student_id))
                const stuByClass = {}
                for (const s of stuData) { if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []; stuByClass[s.class_id].push(s.id) }
                const missing = classesList.filter(cls => { const ids = stuByClass[cls.id] || []; return ids.length && !ids.some(id => archivedSet.has(id)) }).map(cls => ({ class_id: cls.id, class_name: cls.name }))
                if (missing.length) setNewMonthBanner({ prevMonth, prevYear, prevMonthStr: BULAN.find(b => b.id === prevMonth)?.id_str || '', classesNotArchived: missing })
            } catch (e) { console.error('Auto-arsip banner check error:', e) }
        }
        check()
    }, [classesList])

    // ── Reset student search when class changes
    useEffect(() => { setStudentSearch(''); setMusyrif('') }, [selectedClassId])

    // ── Fetch homeroom teacher
    useEffect(() => {
        if (!selectedClassId) { setHomeroomTeacherName(''); return }
        supabase.from('classes').select('homeroom_teacher_id').eq('id', selectedClassId).single().then(({ data: clsData }) => {
            if (!clsData?.homeroom_teacher_id) { setHomeroomTeacherName(''); return }
            supabase.from('teachers').select('name').eq('id', clsData.homeroom_teacher_id).single().then(({ data: teacherData }) => {
                setHomeroomTeacherName(teacherData?.name || '')
                setMusyrif(prev => prev ? prev : (teacherData?.name || ''))
            })
        })
    }, [selectedClassId])

    // ── Online/offline listener
    useEffect(() => {
        const onOnline = () => { setIsOnline(true); addToast('Koneksi kembali ✅', 'success') }
        const onOffline = () => { setIsOnline(false); addToast('Offline — data draft disimpan lokal', 'warning') }
        window.addEventListener('online', onOnline)
        window.addEventListener('offline', onOffline)
        return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
    }, [])

    // ── Check localStorage draft when class+month+year selected
    useEffect(() => {
        if (!selectedClassId || !selectedMonth || !selectedYear) { setDraftAvailable(false); return }
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { setDraftAvailable(!!localStorage.getItem(key)) } catch { setDraftAvailable(false) }
    }, [selectedClassId, selectedMonth, selectedYear])

    // ── Auto-save draft to localStorage on score/extra changes (step 2)
    useEffect(() => {
        if (step !== 2 || !selectedClassId || !students.length) return
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try {
            localStorage.setItem(key, JSON.stringify({ scores, extras, savedAt: Date.now() }))
        } catch (e) { console.error('Draft localStorage save error:', e) }
    }, [scores, extras, step, selectedClassId, selectedMonth, selectedYear, students.length])

    // FIX #4: Cleanup semua autoSaveTimers saat komponen unmount
    useEffect(() => {
        return () => {
            Object.values(autoSaveTimers.current).forEach(clearTimeout)
        }
    }, [])

    // ── Shortcut: "?" key opens shortcut modal
    useEffect(() => {
        const handler = (e) => {
            if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) setShowShortcutModal(v => !v)
            if (e.key === 'Escape') setShowShortcutModal(false)
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    // FIX #3: Ctrl+S — gunakan ref agar tidak ada TDZ (saveAll belum tersedia saat useEffect ini dibaca)
    const saveAllRef = useRef(null)
    useEffect(() => {
        const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && step === 2) { e.preventDefault(); saveAllRef.current?.() } }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step])

    // ── Preload print libs
    useEffect(() => {
        const load = (src, check) => new Promise(res => { if (check()) { res(); return }; const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s) })
        load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => !!window.html2canvas)
        load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf?.jsPDF || window.jsPDF))
    }, [])

    // transliterateToArab — kamus lengkap + pola Abdul/Asmaul Husna/bin/uddin/Nur
    const transliterateToArab = useCallback((name) => {
        const latinToArab = (word) => {
            let res = '', i = 0
            while (i < word.length) {
                const two = word.slice(i, i + 2).toLowerCase()
                const di = DIGRAPH.find(([k]) => k === two)
                if (di) { res += di[1]; i += 2; continue }
                res += SINGLE[word[i].toLowerCase()] || ''
                i++
            }
            return res
        }
        const words = name.toLowerCase().trim().split(/\s+/)
        const result = []
        for (const w of words) {
            // 1. Kamus kata utuh
            if (KATA_ARAB[w]) { result.push(KATA_ARAB[w]); continue }
            // 2. Pola Abdul-/Abdu-/Abdi- + Asmaul Husna
            const abdulMatch = w.match(/^ab[du]u?l?[-_]?(.+)$/) || w.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suffix = abdulMatch[1]
                if (ASMAUL_HUSNA[suffix]) { result.push('عبد ' + ASMAUL_HUSNA[suffix]); continue }
                if (suffix === 'llah' || suffix === 'lah' || suffix === 'illah') { result.push('عبد الله'); continue }
            }
            // 3. bin / binti
            if (w === 'bin' || w === 'ibn' || w === 'ibnu') { result.push('بن'); continue }
            if (w === 'binti' || w === 'bint') { result.push('بنت'); continue }
            // 4. Pola *uddin / *udin / *addin / *iddin
            if (w.endsWith('uddin') || w.endsWith('udin') || w.endsWith('addin') || w.endsWith('iddin')) {
                const base = w.replace(/(uddin|udin|addin|iddin)$/, '')
                const baseArab = KATA_ARAB[base]
                if (baseArab) { result.push(baseArab + ' الدين'); continue }
            }
            // 5. Pola Nur- / Noor- + nama/asmaul husna
            if (w.startsWith('nur') || w.startsWith('noor')) {
                const suffix = w.replace(/^noo?r[-_]?/, '')
                const sufArab = KATA_ARAB[suffix] || ASMAUL_HUSNA[suffix]
                if (sufArab) { result.push('نور ' + sufArab.replace(/^ال/, '')); continue }
            }
            // 6. Fallback huruf per huruf
            result.push(latinToArab(w))
        }
        return result.join(' ')
    }, [])

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
        await Promise.allSettled(dbUpdates)
        return updated
    }, [transliterateToArab])

    // ── Load students
    const loadStudents = useCallback(async (overrideClassId, overrideMonth, overrideYear, overrideLang) => {
        const classId = overrideClassId ?? selectedClassId
        const month = overrideMonth ?? selectedMonth
        const year = overrideYear ?? selectedYear
        const useLang = overrideLang ?? lang
        if (!classId) return
        setLoading(true)
        try {
            const { data: stuData, error: stuErr } = await supabase.from('students').select('id, name, registration_code, photo_url, gender, phone, metadata').eq('class_id', classId).is('deleted_at', null).order('name')
            if (stuErr) throw stuErr
            const ids = (stuData || []).map(s => s.id)
            const prevM = month === 1 ? 12 : month - 1
            const prevY = month === 1 ? year - 1 : year
            const [{ data: repData }, { data: prevRepData }] = await Promise.all([
                supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', month).eq('year', year),
                supabase.from('student_monthly_reports').select('student_id,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa').in('student_id', ids).eq('month', prevM).eq('year', prevY),
            ])
            const prevScoreMap = {}
            for (const r of (prevRepData || [])) {
                prevScoreMap[r.student_id] = { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
            }
            setPrevMonthScores(prevScoreMap)
            const initScores = {}, initExtras = {}, initExisting = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                initScores[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                initExtras[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
                if (rep) { initExisting[s.id] = rep.id; setSavedIds(prev => new Set([...prev, s.id])) }
            }
            let finalStudents = stuData || []
            if (useLang === 'ar') { const needs = finalStudents.filter(s => !s.metadata?.nama_arab); if (needs.length) { setTransliterating(true); finalStudents = await transliterateNames(finalStudents); setTransliterating(false) } }
            setStudents(finalStudents); setScores(initScores); setExtras(initExtras); setExistingReportIds(initExisting)
        } catch (e) { addToast('Gagal memuat siswa: ' + e.message, 'error'); console.error('loadStudents error:', e) }
        finally { setLoading(false) }
    }, [selectedClassId, selectedMonth, selectedYear, lang, transliterateNames])

    // ── Load offline draft
    const loadDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try {
            const raw = localStorage.getItem(key)
            if (!raw) return
            const { scores: dScores, extras: dExtras, savedAt } = JSON.parse(raw)
            setScores(dScores)
            setExtras(dExtras)
            // FIX #5: Jangan reset savedIds sepenuhnya — hanya hapus id yang ada di draft
            // agar record yang sudah tersimpan di DB tidak kehilangan status "tersimpan"
            setSavedIds(prev => {
                const next = new Set(prev)
                Object.keys(dScores || {}).forEach(id => next.delete(id))
                return next
            })
            const mins = Math.round((Date.now() - savedAt) / 60000)
            addToast(`Draft dimuat (disimpan ${mins < 1 ? 'baru saja' : mins + ' menit lalu'})`, 'success')
        } catch (e) { addToast('Gagal memuat draft', 'error'); console.error('loadDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast])

    const clearDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { localStorage.removeItem(key); setDraftAvailable(false); addToast('Draft dihapus', 'success') }
        catch (e) { console.error('clearDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast])

    // ── Save single
    const saveStudent = useCallback(async (studentId) => {
        const sc = scores[studentId], ex = extras[studentId]
        if (!sc) return
        setSaving(prev => ({ ...prev, [studentId]: true }))
        try {
            const payload = { student_id: studentId, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null }
            const existingId = existingReportIds[studentId]
            let error
            if (existingId) { ; ({ error } = await supabase.from('student_monthly_reports').update(payload).eq('id', existingId)) }
            else { const { data, error: upsErr } = await supabase.from('student_monthly_reports').upsert(payload, { onConflict: 'student_id,month,year' }).select('id').single(); error = upsErr; if (!upsErr && data) setExistingReportIds(prev => ({ ...prev, [studentId]: data.id })) }
            if (error) throw error
            setSavedIds(prev => new Set([...prev, studentId]))
        } catch (e) { addToast(`Gagal menyimpan: ${e.message}`, 'error'); console.error('saveStudent error:', e) }
        finally { setSaving(prev => ({ ...prev, [studentId]: false })) }
    }, [scores, extras, selectedMonth, selectedYear, musyrif, existingReportIds])

    // ── Reset student — kosongkan state lokal DAN hapus dari DB jika sudah tersimpan
    const resetStudent = useCallback(async (studentId) => {
        // 1. Kosongkan state lokal dulu (UI langsung responsif)
        setScores(prev => ({ ...prev, [studentId]: { nilai_akhlak: '', nilai_ibadah: '', nilai_kebersihan: '', nilai_quran: '', nilai_bahasa: '' } }))
        setExtras(prev => ({ ...prev, [studentId]: { berat_badan: '', tinggi_badan: '', ziyadah: '', murojaah: '', hari_sakit: '', hari_izin: '', hari_alpa: '', hari_pulang: '', catatan: '' } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })

        // 2. Hapus dari DB hanya kalau record memang sudah ada
        const existingId = existingReportIds[studentId]
        if (!existingId) return
        try {
            const { error } = await supabase.from('student_monthly_reports').delete().eq('id', existingId)
            if (error) throw error
            setExistingReportIds(prev => { const n = { ...prev }; delete n[studentId]; return n })
            addToast(`Data ${students.find(s => s.id === studentId)?.name?.split(' ')[0] ?? ''} berhasil direset`, 'success')
        } catch (e) {
            addToast(`Gagal hapus dari DB: ${e.message}`, 'error')
            console.error('resetStudent error:', e)
        }
    }, [existingReportIds, students, addToast])

    // ── Save all
    const saveAll = useCallback(async () => {
        if (savingAll) return
        setSavingAll(true)
        try {
            const payloads = students.map(s => { const sc = scores[s.id] || {}, ex = extras[s.id] || {}; return { student_id: s.id, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null } })
            const { error } = await supabase.from('student_monthly_reports').upsert(payloads, { onConflict: 'student_id,month,year' })
            if (error) throw error
            setSavedIds(new Set(students.map(s => s.id)))
            addToast(`${students.length} raport berhasil disimpan`, 'success')
            try { const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`; localStorage.removeItem(key); setDraftAvailable(false) } catch { }
        } catch (e) { addToast(`Gagal menyimpan semua: ${e.message}`, 'error'); console.error('saveAll error:', e) }
        finally { setSavingAll(false) }
    }, [students, scores, extras, selectedMonth, selectedYear, musyrif, savingAll, selectedClassId, addToast])

    // Sync ref setelah saveAll terdefinisi — dipakai Ctrl+S handler di atas
    useEffect(() => { saveAllRef.current = saveAll }, [saveAll])

    // ── Export CSV
    const exportCSV = useCallback(() => {
        const headers = ['No', 'Nama', 'Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa', 'Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan']
        const rows = students.map((s, i) => {
            const sc = scores[s.id] || {}, ex = extras[s.id] || {}
            const avg = calcAvg(sc)
            const predikat = avg ? GRADE(Number(avg)).id : ''
            return [
                i + 1, s.name,
                sc.nilai_akhlak ?? '', sc.nilai_ibadah ?? '', sc.nilai_kebersihan ?? '', sc.nilai_quran ?? '', sc.nilai_bahasa ?? '',
                avg ?? '', predikat,
                ex.berat_badan ?? '', ex.tinggi_badan ?? '', ex.ziyadah ?? '', ex.murojaah ?? '',
                ex.hari_sakit ?? '', ex.hari_izin ?? '', ex.hari_alpa ?? '', ex.hari_pulang ?? '',
                // FIX #16: Gunakan escapeCsvCell yang proper untuk handle newline & quote
                ex.catatan || '',
            ]
        })
        // FIX #16: Semua cell di-escape dengan benar
        const csv = [headers, ...rows].map(r => r.map(escapeCsvCell).join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `Raport_${selectedClass?.name || ''}_${bulanObj?.id_str || ''}_${selectedYear}.csv`
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
        addToast(`CSV berhasil diexport (${students.length} santri)`, 'success')
    }, [students, scores, extras, selectedClass, bulanObj, selectedYear, addToast])

    // ── Auto-save
    const triggerAutoSave = useCallback((studentId) => {
        setSavedIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
        if (autoSaveTimers.current[studentId]) clearTimeout(autoSaveTimers.current[studentId])
        autoSaveTimers.current[studentId] = setTimeout(() => saveStudent(studentId), 1500)
    }, [saveStudent])

    // ── Copy from last month
    const copyFromLastMonth = useCallback(async () => {
        if (!selectedClassId || !students.length) return
        const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1
        const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear
        setCopyingLastMonth(true)
        try {
            const ids = students.map(s => s.id)
            const { data } = await supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', prevMonth).eq('year', prevYear)
            if (!data?.length) { addToast('Tidak ada data bulan lalu', 'warning'); return }
            let copied = 0
            setScores(prev => { const next = { ...prev }; for (const rep of data) { const cur = next[rep.student_id] || {}; const isEmpty = KRITERIA.every(k => cur[k.key] === '' || cur[k.key] === null || cur[k.key] === undefined); if (isEmpty) { next[rep.student_id] = { nilai_akhlak: rep.nilai_akhlak ?? '', nilai_ibadah: rep.nilai_ibadah ?? '', nilai_kebersihan: rep.nilai_kebersihan ?? '', nilai_quran: rep.nilai_quran ?? '', nilai_bahasa: rep.nilai_bahasa ?? '' }; copied++ } }; return next })
            setExtras(prev => { const next = { ...prev }; for (const rep of data) { const cur = next[rep.student_id] || {}; if (!cur.berat_badan && !cur.tinggi_badan) next[rep.student_id] = { ...cur, berat_badan: rep.berat_badan ?? '', tinggi_badan: rep.tinggi_badan ?? '' } }; return next })
            setSavedIds(new Set())
            addToast(`Disalin dari ${BULAN.find(b => b.id === prevMonth)?.id_str} ${prevYear} — ${copied} santri`, 'success')
        } catch (e) { addToast('Gagal menyalin data bulan lalu', 'error'); console.error('copyFromLastMonth error:', e) }
        finally { setCopyingLastMonth(false) }
    }, [selectedClassId, students, selectedMonth, selectedYear, addToast])

    // ── Keyboard nav
    const handleKeyDown = useCallback((e, studentIdx, kriteriaIdx) => {
        if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); let nSi = studentIdx, nKi = kriteriaIdx + 1; if (nKi >= KRITERIA.length) { nKi = 0; nSi = studentIdx + 1 }; if (nSi >= students.length) nSi = 0; cellRefs.current[`${nSi}-${nKi}`]?.focus() }
        if (e.key === 'ArrowDown') { e.preventDefault(); cellRefs.current[`${studentIdx + 1}-${kriteriaIdx}`]?.focus() }
        if (e.key === 'ArrowUp') { e.preventDefault(); cellRefs.current[`${studentIdx - 1}-${kriteriaIdx}`]?.focus() }
        if (e.key === 'ArrowRight') cellRefs.current[`${studentIdx}-${kriteriaIdx + 1}`]?.focus()
        if (e.key === 'ArrowLeft') cellRefs.current[`${studentIdx}-${kriteriaIdx - 1}`]?.focus()
    }, [students.length])

    // ── Archive
    const loadArchive = useCallback(async () => {
        setArchiveLoading(true)
        try {
            const { data: reports, error: repErr } = await supabase.from('student_monthly_reports').select('student_id, month, year, musyrif_name, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa').order('year', { ascending: false }).order('month', { ascending: false })
            if (repErr) throw repErr
            if (!reports?.length) { setArchiveList([]); return }
            const studentIds = [...new Set(reports.map(r => r.student_id))]
            const { data: stuData } = await supabase.from('students').select('id, class_id').in('id', studentIds)
            const classIds = [...new Set((stuData || []).map(s => s.class_id).filter(Boolean))]
            const { data: classData } = await supabase.from('classes').select('id, name, grade, major').in('id', classIds)
            const stuMap = {}, clsMap = {}
            for (const s of (stuData || [])) stuMap[s.id] = s
            for (const c of (classData || [])) clsMap[c.id] = c
            const grouped = {}
            for (const row of reports) {
                const stu = stuMap[row.student_id]; if (!stu?.class_id) continue
                const cls = clsMap[stu.class_id]; if (!cls) continue
                const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok') || (cls.major || '').toLowerCase().includes('boarding')
                const key = `${cls.id}__${row.month}__${row.year}`
                if (!grouped[key]) grouped[key] = { key, class_id: cls.id, class_name: cls.name, month: row.month, year: row.year, musyrif: row.musyrif_name, count: 0, completed: 0, lang: isBoarding ? 'ar' : 'id' }
                grouped[key].count++
                if (['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa'].every(k => row[k] !== null)) grouped[key].completed++
            }
            setArchiveList(Object.values(grouped).sort((a, b) => b.year - a.year || b.month - a.month))
        } catch (e) { addToast('Gagal memuat arsip', 'error'); console.error('loadArchive error:', e) }
        finally { setArchiveLoading(false) }
    }, [])

    const loadArchiveDetail = useCallback(async (entry) => {
        setArchiveLoading(true)
        try {
            const { data: stuData } = await supabase.from('students').select('id, name, phone, metadata').eq('class_id', entry.class_id).is('deleted_at', null).order('name')
            const ids = (stuData || []).map(s => s.id)
            const { data: repData } = await supabase.from('student_monthly_reports').select('*').in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            const scMap = {}, exMap = {}
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                scMap[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                exMap[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
            }
            const stuList = stuData || []
            setArchivePreview({ students: stuList, scores: scMap, extras: exMap, bulanObj: BULAN.find(b => b.id === entry.month), tahun: entry.year, musyrif: entry.musyrif, className: entry.class_name, lang: entry.lang, entry })
            setStudentTrend({})
            loadStudentTrend(stuList.map(s => s.id))
        } catch (e) { addToast('Gagal memuat detail arsip', 'error'); console.error('loadArchiveDetail error:', e) }
        finally { setArchiveLoading(false) }
    }, [])

    const executeDeleteArchive = useCallback(async (entry) => {
        setConfirmDelete(null)
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)
            if (!ids.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const { data: toDelete } = await supabase.from('student_monthly_reports').select('id').in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            if (!toDelete?.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            await supabase.from('student_monthly_reports').delete().in('id', toDelete.map(r => r.id))
            setArchiveList(prev => prev.filter(a => a.key !== entry.key))
            addToast('Arsip berhasil dihapus', 'success')
            loadArchive()
        } catch (e) { addToast('Gagal menghapus arsip: ' + e.message, 'error'); console.error('executeDeleteArchive error:', e) }
    }, [loadArchive, addToast])

    // ── Print
    const openPrintWindow = useCallback((stuList) => {
        if (!stuList?.length) { addToast('Tidak ada data untuk dicetak', 'warning'); return }
        setPrintRenderedCount(0); setPrintQueue(stuList.map(s => s.id))
    }, [addToast])

    const executePrint = useCallback((stuList) => {
        const container = printContainerRef.current; if (!container) return
        const cards = container.querySelectorAll('.raport-card'); if (!cards.length) { addToast('Gagal menyiapkan raport', 'error'); return }
        const html = [...cards].map(c => c.outerHTML).join('')
        const titleStr = stuList.length === 1 ? `Raport ${stuList[0].name}_${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}` : `Raport Kelas ${selectedClass?.name}_${bulanObj?.id_str} ${selectedYear}`
        const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir browser.', 'error'); setPrintQueue([]); setPrintRenderedCount(0); return }
        win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titleStr}</title><style>@page{size:A4;margin:0}body{margin:0;padding:0}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}img{mix-blend-mode:multiply}.raport-card{page-break-after:always}</style></head><body>${html}</body></html>`)
        win.document.close(); win.focus(); setTimeout(() => { win.print(); setPrintQueue([]); setPrintRenderedCount(0) }, 700)
    }, [selectedClass, bulanObj, selectedYear, addToast])

    useEffect(() => {
        if (!printQueue.length || printRenderedCount < printQueue.length) return
        const stuList = (archivePreview ? archivePreview.students : students).filter(s => printQueue.includes(s.id))
        executePrint(stuList)
    }, [printRenderedCount, printQueue, students, archivePreview, executePrint])

    // ── Export PDF bulk
    const exportBulkPDF = useCallback(async (entry) => { setPendingExport(entry); await loadArchiveDetail(entry) }, [loadArchiveDetail])
    useEffect(() => {
        if (!pendingExport || !archivePreview || archivePreview.entry?.key !== pendingExport.key) return
        const entry = pendingExport; setPendingExport(null)
        const stuIds = archivePreview.students.map(s => s.id); setPrintRenderedCount(0); setPrintQueue(stuIds)
        const tryExport = (attempt = 0) => {
            const cards = printContainerRef.current?.querySelectorAll('.raport-card')
            if ((!cards || cards.length < stuIds.length) && attempt < 30) { setTimeout(() => tryExport(attempt + 1), 200); return }
            const html = [...(cards?.length ? cards : document.querySelectorAll('.raport-card'))].map(c => c.outerHTML).join('')
            const win = window.open('', '_blank'); if (!win) { addToast('Popup diblokir.', 'error'); return }
            win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Raport ${entry.class_name} ${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year}</title><style>@page{size:A4;margin:0}body{margin:0;padding:0;font-family:'Times New Roman',serif}.raport-card{page-break-after:always;box-sizing:border-box}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${html}</body></html>`)
            win.document.close(); win.focus(); setTimeout(() => { win.print(); setPrintQueue([]); setPrintRenderedCount(0) }, 800)
        }
        setTimeout(() => tryExport(), 300)
    }, [pendingExport, archivePreview, addToast])

    // ── WA
    const buildWaMessage = useCallback((student, pdfUrl = null) => {
        // FIX #17: Menggunakan helper buildWaLines yang lebih terstruktur
        const lines = buildWaLines({
            student,
            sc: scores[student.id] || {},
            extras: extras[student.id],
            bulanObj,
            selectedYear,
            selectedClass,
            musyrif,
            pdfUrl,
            waFooter: settings.wa_footer,
        })
        return encodeURIComponent(lines.join('\n'))
    }, [scores, extras, bulanObj, selectedYear, selectedClass, musyrif, settings])

    const sendWATextOnly = useCallback((student) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        const tab = window.open(`https://wa.me/${phone}?text=${buildWaMessage(student)}`, '_blank')
        if (!tab) addToast('Popup diblokir.', 'warning')
        else addToast(`📲 WA dibuka untuk ${student.name.split(' ')[0]}`, 'info')
    }, [buildWaMessage, addToast])

    const generatePDFBlob = useCallback(async (student) => {
        await Promise.all([
            new Promise((res, rej) => { if (window.html2canvas) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
            new Promise((res, rej) => { if (window.jspdf?.jsPDF || window.jsPDF) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
        ])
        const bulanStr = bulanObj?.id_str || String(selectedMonth)
        const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filename = `${safeName}_${bulanStr}_${selectedYear}.pdf`
        let cardEl = document.querySelector(`.raport-card[data-student-id="${student.id}"]`)
        if (!cardEl) {
            setPrintRenderedCount(0); setPrintQueue([student.id])
            await new Promise(resolve => {
                let t = 0
                const timer = setInterval(() => {
                    const card = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 50) { clearInterval(timer); resolve() }
                }, 100)
            })
            setPrintQueue([]); setPrintRenderedCount(0)
        }
        if (!cardEl) throw new Error('Gagal render raport card')
        const rootStyles = getComputedStyle(document.documentElement)
        const cssVars = ['--color-border', '--color-surface', '--color-surface-alt', '--color-text', '--color-text-muted'].map(v => `${v}: ${rootStyles.getPropertyValue(v).trim() || '#ccc'};`).join(' ')
        const A4W = 794, A4H = 1123, wrapper = document.createElement('div')
        wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4W}px;height:${A4H}px;background:white;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;font-family:'Times New Roman',serif;`
        wrapper.innerHTML = `<style>:root{${cssVars}}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important}img{mix-blend-mode:multiply}.raport-card{width:${A4W}px!important;min-width:${A4W}px!important;height:${A4H}px!important;overflow:hidden!important;background:white!important;margin:0!important}</style>${cardEl.outerHTML}`
        document.body.appendChild(wrapper)
        await new Promise(r => setTimeout(r, 700))
        try {
            // FIX #9: withTimeout agar html2canvas tidak hang selamanya
            const canvas = await withTimeout(
                window.html2canvas(wrapper, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: A4W, height: A4H, scrollX: 0, scrollY: 0, logging: false }),
                15000,
                'Render PDF'
            )
            const jsPDF = window.jspdf?.jsPDF || window.jsPDF
            const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
            const blob = pdf.output('blob')
            if (!blob || blob.size < 5000) throw new Error('PDF terlalu kecil')
            return { blob, filename }
        } finally {
            if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
        }
    }, [bulanObj, selectedMonth, selectedYear])

    const uploadToSupabase = useCallback(async (blob, filename) => {
        // FIX #14: Gunakan STORAGE_BUCKET konstanta
        const path = `${selectedYear}/${bulanObj?.id_str || selectedMonth}/${filename}`
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, blob, { contentType: 'application/pdf', upsert: true })
        if (uploadError) throw new Error(`Upload gagal: ${uploadError.message}`)
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
        return data.publicUrl
    }, [selectedYear, bulanObj, selectedMonth])

    const generateAndSendWA = useCallback(async (student, autoNext = false) => {
        if (!student.phone) { addToast('Nomor WA tidak tersedia', 'warning'); return }
        const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
        const openWATab = (url) => { const tab = window.open(url, '_blank'); if (!tab) addToast('Popup diblokir browser.', 'warning') }
        if (raportLinks[student.id]) { openWATab(`https://wa.me/${phone}?text=${buildWaMessage(student, raportLinks[student.id])}`); return }
        setPreviewStudentId(student.id); await new Promise(r => setTimeout(r, 300))
        setSendingWA(prev => ({ ...prev, [student.id]: 'generating' }))
        try {
            const { blob, filename } = await generatePDFBlob(student)
            setSendingWA(prev => ({ ...prev, [student.id]: 'uploading' }))
            const url = await uploadToSupabase(blob, filename)
            setRaportLinks(prev => ({ ...prev, [student.id]: url }))
            setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
            openWATab(`https://wa.me/${phone}?text=${buildWaMessage(student, url)}`)
            addToast(`Terkirim ke wali ${student.name.split(' ')[0]}`, 'success')
        } catch (err) { addToast(`Gagal: ${err.message}`, 'error'); setSendingWA(prev => ({ ...prev, [student.id]: null })); console.error('generateAndSendWA error:', err) }
    }, [raportLinks, buildWaMessage, generatePDFBlob, uploadToSupabase, addToast])

    // ── WA Blast runner
    const runWaBlast = useCallback(async (queue) => {
        setWaBlastConfirm(null)
        setWaBlast({ queue, idx: 0, done: 0, failed: 0, active: true })
        let done = 0, failed = 0
        for (let i = 0; i < queue.length; i++) {
            const student = queue[i]
            setWaBlast(prev => prev ? { ...prev, idx: i, active: true } : null)
            try {
                if (!student.phone) { failed++; continue }
                const phone = student.phone.replace(/\D/g, '').replace(/^0/, '62')
                let url = raportLinks[student.id]
                if (!url) {
                    setPreviewStudentId(student.id)
                    await new Promise(r => setTimeout(r, 400))
                    const { blob, filename } = await generatePDFBlob(student)
                    url = await uploadToSupabase(blob, filename)
                    setRaportLinks(prev => ({ ...prev, [student.id]: url }))
                    setSendingWA(prev => ({ ...prev, [student.id]: 'done' }))
                }
                window.open(`https://wa.me/${phone}?text=${buildWaMessage(student, url)}`, '_blank')
                done++
                await new Promise(r => setTimeout(r, 800))
            } catch (e) { failed++; console.error('WA Blast item error:', e) }
            setWaBlast(prev => prev ? { ...prev, done, failed } : null)
        }
        setWaBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
        addToast(`WA Blast selesai: ${done} terkirim, ${failed} gagal`, done > 0 ? 'success' : 'error')
    }, [raportLinks, generatePDFBlob, uploadToSupabase, buildWaMessage, addToast])

    // ── Load student trend
    const loadStudentTrend = useCallback(async (stuIds) => {
        if (!stuIds?.length) return
        try {
            const { data } = await supabase
                .from('student_monthly_reports')
                .select('student_id, month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa')
                .in('student_id', stuIds)
                .order('year').order('month')
            const trendMap = {}
            for (const r of (data || [])) {
                if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
            }
            setStudentTrend(trendMap)
        } catch (e) { console.error('loadStudentTrend error:', e) }
    }, [])

    // ─── Render helpers ───────────────────────────────────────────────────────

    const renderStep0 = () => (
        <div className="space-y-6">
            {/* Banner */}
            {newMonthBanner && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5"><FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] mb-0.5">Raport {newMonthBanner.prevMonthStr} {newMonthBanner.prevYear} belum diarsip!</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">{newMonthBanner.classesNotArchived.length} kelas belum punya raport bulan lalu: <span className="font-bold text-amber-600">{newMonthBanner.classesNotArchived.map(c => c.class_name).join(', ')}</span></p>
                        <div className="flex items-center gap-2 flex-wrap">
                            {newMonthBanner.classesNotArchived.map(cls => (
                                <button key={cls.class_id} onClick={() => { setSelectedClassId(cls.class_id); setSelectedMonth(newMonthBanner.prevMonth); setSelectedYear(newMonthBanner.prevYear); const clsObj = classesList.find(c => c.id === cls.class_id); if (clsObj) { const n = (clsObj.name || '').toLowerCase(); setLang(n.includes('boarding') || n.includes('pondok') ? 'ar' : 'id') }; setStep(1) }} className="h-7 px-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 text-[9px] font-black hover:bg-amber-500/25 transition-all flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faBolt} className="text-[8px]" /> Isi {cls.class_name}
                                </button>
                            ))}
                            <button onClick={() => setNewMonthBanner(null)} aria-label="Abaikan banner" className="h-7 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black hover:text-[var(--color-text)] transition-all ml-auto">Abaikan</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Kelas Grid */}
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-1.5"><FontAwesomeIcon icon={faSchool} className="opacity-60" /> Pilih Kelas</p>
                {filteredClasses.length === 0 && !pageLoading ? (
                    <div className="text-center py-16 rounded-2xl border-2 border-dashed border-[var(--color-border)]">
                        <p className="text-sm font-black text-[var(--color-text-muted)]">{searchQuery ? 'Kelas tidak ditemukan' : 'Belum ada kelas'}</p>
                    </div>
                ) : pageLoading ? (
                    /* FIX #13: Skeleton loader agar UX lebih responsif saat loading */
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {filteredClasses.map(cls => {
                            const isBoarding = (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                            const prog = classProgress[cls.id]
                            const isDone = prog && prog.total > 0 && prog.done === prog.total
                            const isPartial = prog && prog.done > 0 && prog.done < prog.total
                            const pct = prog?.total ? Math.round((prog.done / prog.total) * 100) : 0
                            const statusBadge = isDone
                                ? { label: 'Selesai ✓', style: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' }
                                : isPartial
                                    ? { label: `${prog.done}/${prog.total} siswa`, style: 'bg-amber-500/15 text-amber-600 border-amber-500/30' }
                                    : { label: 'Belum diisi', style: 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)]' }
                            const lastLabel = prog?.lastMonth ? `${BULAN.find(b => b.id === prog.lastMonth)?.id_str} ${prog.lastYear}` : null
                            return (
                                <div key={cls.id} className={`rounded-xl border text-left transition-all group relative ${isDone ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}>
                                    <button
                                        onClick={async () => {
                                            const m = now.getMonth() + 1, y = now.getFullYear(), l = isBoarding ? 'ar' : 'id'
                                            setSelectedClassId(cls.id); setSelectedMonth(m); setSelectedYear(y); setLang(l)
                                            await loadStudents(cls.id, m, y, l); setStep(2)
                                        }}
                                        aria-label={`Buka kelas ${cls.name}`}
                                        className="w-full p-3 text-left hover:bg-[var(--color-primary)]/5 rounded-xl transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-1.5 mb-2">
                                            <span className="text-[11px] font-black text-[var(--color-text)] leading-snug">{cls.name}</span>
                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 border ${isBoarding ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-sky-500/10 text-sky-500 border-sky-500/20'}`}>{isBoarding ? 'Boarding' : 'Reguler'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[9px] text-[var(--color-text-muted)] font-bold flex items-center gap-1">
                                                <FontAwesomeIcon icon={faUsers} className="text-[7px] opacity-60" />
                                                {prog?.total ?? '—'} siswa
                                            </span>
                                            {lastLabel && (
                                                <span className="text-[9px] text-[var(--color-text-muted)] font-medium flex items-center gap-1 opacity-70">
                                                    · <FontAwesomeIcon icon={faCalendarAlt} className="text-[7px]" /> {lastLabel}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md border ${statusBadge.style}`}>{statusBadge.label}</span>
                                            {prog && prog.total > 0 && (
                                                <div className="flex-1 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: isDone ? '#10b981' : isPartial ? '#f59e0b' : '#e5e7eb' }} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                    {lastLabel && (
                                        <div className="px-3 pb-2.5 pt-0 border-t border-[var(--color-border)]/50">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedClassId(cls.id); setStep(4); loadArchive() }}
                                                aria-label={`Lihat arsip kelas ${cls.name}`}
                                                className="w-full h-6 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[8px] font-black hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <FontAwesomeIcon icon={faTableList} className="text-[7px]" /> Lihat Arsip
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )

    const renderStep1 = () => (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center"><FontAwesomeIcon icon={faClipboardList} className="text-emerald-500" /></div>
                    <div><p className="text-xs font-black text-[var(--color-text)]">Input Raport Bulanan</p><p className="text-[10px] text-[var(--color-text-muted)]">نتيجة الشخصية — Pilih kelas & periode terlebih dahulu</p></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5"><FontAwesomeIcon icon={faSchool} className="opacity-60" /> Pilih Kelas</label>
                    {selectedClassId ? (
                        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/8">
                            <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-sm" />
                            <span className="text-[12px] font-black text-[var(--color-text)] flex-1">{selectedClass?.name}</span>
                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full ${(() => { const isB = (selectedClass?.type === 'boarding' || (selectedClass?.name || '').toLowerCase().includes('boarding') || (selectedClass?.name || '').toLowerCase().includes('pondok')); return isB ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-500' })()}`}>
                                {(selectedClass?.type === 'boarding' || (selectedClass?.name || '').toLowerCase().includes('boarding') || (selectedClass?.name || '').toLowerCase().includes('pondok')) ? 'Boarding' : 'Reguler'}
                            </span>
                            <button onClick={() => { setSelectedClassId(''); setStep(0) }} className="text-[9px] font-black px-2 py-1 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">Ganti</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {classesList.map(cls => {
                                const isBoarding = cls.type === 'boarding' || (cls.name || '').toLowerCase().includes('boarding') || (cls.name || '').toLowerCase().includes('pondok')
                                return (
                                    <button key={cls.id} onClick={() => { setSelectedClassId(cls.id); setLang(isBoarding ? 'ar' : 'id') }} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-left hover:border-emerald-500/40 transition-all">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-black text-[var(--color-text)]">{cls.name}</span>
                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${isBoarding ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-500'}`}>{isBoarding ? 'Boarding' : 'Reguler'}</span>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Bulan</label>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50">
                        {BULAN.map(b => <option key={b.id} value={b.id}>{b.id_str} — {b.ar}</option>)}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tahun</label>
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50">
                        {years.map(y => <option key={y}>{y}</option>)}
                    </select>
                </div>
                <div className="col-span-2 space-y-1.5">
                    <div className="flex items-center gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Nama Musyrif / Wali Kelas</label>
                        {homeroomTeacherName && musyrif === homeroomTeacherName && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">✓ dari wali kelas</span>}
                        {homeroomTeacherName && musyrif !== homeroomTeacherName && musyrif && <button type="button" onClick={() => setMusyrif(homeroomTeacherName)} className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">↩ reset ke wali kelas</button>}
                    </div>
                    <input value={musyrif} onChange={e => setMusyrif(e.target.value)} placeholder={homeroomTeacherName || "Contoh: Ahmad Fauzi, Lc"} className="w-full h-10 px-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-sm font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50 transition" />
                </div>
                <div className="col-span-2 space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Template Bahasa Raport</label>
                    <div className="flex gap-2">
                        {[{ v: 'ar', label: 'عربي', sub: 'Arabic (Pondok/Boarding)' }, { v: 'id', label: 'ID', sub: 'Indonesia (Reguler)' }].map(opt => (
                            <button key={opt.v} onClick={() => setLang(opt.v)} className={`flex-1 py-2.5 px-4 rounded-xl border text-left transition-all ${lang === opt.v ? 'bg-emerald-500/15 border-emerald-500/50' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] hover:border-emerald-500/30'}`}>
                                <div className={`text-sm font-black ${lang === opt.v ? 'text-emerald-600' : 'text-[var(--color-text-muted)]'}`}>{opt.label}</div>
                                <div className="text-[9px] text-[var(--color-text-muted)] font-medium mt-0.5">{opt.sub}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="h-12 px-5 rounded-xl border border-[var(--color-border)] text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all flex items-center gap-2"><FontAwesomeIcon icon={faArrowLeft} /> Kembali</button>
                <button onClick={async () => { if (!selectedClassId) { addToast('Pilih kelas terlebih dahulu', 'warning'); return }; await loadStudents(); setStep(2) }} disabled={!selectedClassId || loading} className="flex-1 h-12 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {transliterating ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mentransliterasi...</> : loading ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Memuat siswa...</> : <><FontAwesomeIcon icon={faChevronRight} /> Mulai Input Nilai</>}
                </button>
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => {
                    if (hasUnsavedMemo) { setPendingNav({ action: () => setStep(1) }); return }
                    setStep(1)
                }} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Ganti Kelas</button>
                {!isOnline && <span className="h-8 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[9px] font-black flex items-center gap-1.5"><FontAwesomeIcon icon={faWifi} className="text-[9px] opacity-50" /> Offline</span>}
                {draftAvailable && (
                    <div className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[9px] font-black">
                        <FontAwesomeIcon icon={faCircleInfo} className="text-[9px]" />
                        <span>Draft tersedia</span>
                        <button onClick={loadDraft} className="ml-1 underline hover:no-underline">Muat</button>
                        <button onClick={clearDraft} aria-label="Hapus draft" className="text-[var(--color-text-muted)] hover:text-rose-500 ml-0.5"><FontAwesomeIcon icon={faXmark} className="text-[8px]" /></button>
                    </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]"><FontAwesomeIcon icon={faSchool} className="text-emerald-500 text-xs" /><span className="text-[10px] font-black text-[var(--color-text)]">{selectedClass?.name}</span><span className="text-[var(--color-text-muted)] text-[10px]">·</span><span className="text-[10px] font-bold text-[var(--color-text-muted)]">{bulanObj?.id_str} {selectedYear}</span></div>
                <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : progressPct > 50 ? '#6366f1' : '#f59e0b' }} /></div>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] whitespace-nowrap">{completedCount}/{students.length} lengkap</span>
                </div>
                <button onClick={copyFromLastMonth} disabled={copyingLastMonth} className="h-8 px-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-sky-500/20 transition-all disabled:opacity-50"><FontAwesomeIcon icon={copyingLastMonth ? faSpinner : faChevronLeft} className={copyingLastMonth ? 'animate-spin' : ''} /> Salin Bln Lalu</button>
                <button onClick={saveAll} disabled={savingAll} className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 relative disabled:opacity-70">
                    <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin text-[9px]' : 'text-[9px]'} />{savingAll ? 'Menyimpan...' : 'Simpan Semua'}
                    {!savingAll && hasUnsavedMemo && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />}
                </button>
                <button onClick={exportCSV} className="h-8 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-teal-500/20 transition-all"><FontAwesomeIcon icon={faFileExport} className="text-[9px]" /> Export CSV</button>
                {/* FIX #11: Tombol WA Blast sekarang membuka modal konfirmasi dahulu */}
                <button onClick={() => {
                    const withPhone = students.filter(s => s.phone && isComplete(scores[s.id] || {}))
                    if (!withPhone.length) { addToast('Tidak ada santri dengan nomor WA dan nilai lengkap', 'warning'); return }
                    setWaBlastConfirm({ queue: withPhone })
                }} className="h-8 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-green-500/20 transition-all">
                    <FontAwesomeIcon icon={faWhatsapp} className="text-[9px]" /> Kirim Semua WA
                </button>
                <button onClick={() => setStep(3)} className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px]" /> Preview & Cetak</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex-1"><FontAwesomeIcon icon={faBolt} className="text-amber-500 text-[10px]" /><span className="text-[9px] text-[var(--color-text-muted)] font-bold">Navigasi: <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Tab</kbd>/<kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Enter</kbd> Lanjut · <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">↑↓←→</kbd> Pindah Sel · <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Ctrl+S</kbd> Simpan Semua</span></div>
                <div className="relative"><FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px] pointer-events-none" /><input type="text" placeholder="Cari santri..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="h-8 pl-7 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all w-40" />{studentSearch && <button onClick={() => setStudentSearch('')} aria-label="Bersihkan pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>}</div>
                <button onClick={() => setShowIncompleteOnly(v => !v)} className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1.5 transition-all ${showIncompleteOnly ? 'bg-rose-500/15 border-rose-500/30 text-rose-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                    <FontAwesomeIcon icon={faFilter} className="text-[9px]" />
                    {showIncompleteOnly ? `Belum lengkap (${filteredStudents.length})` : 'Semua'}
                </button>
                <button onClick={() => setShowShortcutModal(true)} aria-label="Lihat keyboard shortcuts" className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center justify-center hover:text-[var(--color-text)] transition-all" title="Keyboard shortcuts (?)">
                    <FontAwesomeIcon icon={faQuestion} className="text-[9px]" />
                </button>
                <button onClick={() => { setBulkMode(v => !v); setBulkValues({}) }} className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1.5 transition-all ${bulkMode ? 'bg-violet-500/15 border-violet-500/30 text-violet-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                    <FontAwesomeIcon icon={faFillDrip} className="text-[9px]" />
                    Isi Massal
                </button>
            </div>
            {bulkMode && (
                <div className="p-3 rounded-xl border border-violet-500/30 bg-violet-500/5 flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center"><FontAwesomeIcon icon={faFillDrip} className="text-violet-500 text-[9px]" /></div>
                        <span className="text-[10px] font-black text-violet-600">Isi Massal:</span>
                        <span className="text-[9px] text-[var(--color-text-muted)]">isi nilai per kolom → terapkan ke semua santri yang belum diisi</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap flex-1">
                        {KRITERIA.map(k => (
                            <div key={k.key} className="flex items-center gap-1">
                                <span className="text-[9px] font-black" style={{ color: k.color }}>{k.id}</span>
                                <input type="number" min={0} max={MAX_SCORE} placeholder="—"
                                    value={bulkValues[k.key] ?? ''}
                                    onChange={e => setBulkValues(prev => ({ ...prev, [k.key]: e.target.value === '' ? '' : Math.min(MAX_SCORE, Math.max(0, Number(e.target.value))) }))}
                                    aria-label={`Nilai massal ${k.id}`}
                                    className="w-10 h-7 text-center text-[11px] font-black rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] outline-none focus:border-violet-400 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                            </div>
                        ))}
                        <button onClick={() => {
                            const keys = Object.keys(bulkValues).filter(k => bulkValues[k] !== '')
                            if (!keys.length) { return }
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
                                    if (changed) { next[s.id] = updated; setSavedIds(p => { const n = new Set(p); n.delete(s.id); return n }); triggerAutoSave(s.id) }
                                }
                                return next
                            })
                            addToast(`Nilai massal diterapkan ke santri yang belum diisi`, 'success')
                        }} className="h-7 px-3 rounded-lg bg-violet-500 text-white text-[9px] font-black hover:bg-violet-600 transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> Terapkan
                        </button>
                        <button onClick={() => setBulkValues({})} className="h-7 px-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black hover:text-[var(--color-text)] transition-all">Reset</button>
                    </div>
                </div>
            )}
            <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
                <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <colgroup><col style={{ width: 200 }} />{KRITERIA.map(k => <col key={k.key} style={{ width: 48 }} />)}<col style={{ width: 192 }} /><col style={{ width: 155 }} /><col style={{ width: 125 }} /></colgroup>
                    <thead>
                        <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                            <th className="px-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] sticky left-0 z-10" style={{ background: 'var(--color-surface-alt)', padding: '10px 12px', verticalAlign: 'middle' }}>Santri</th>
                            {KRITERIA.map(k => (<th key={k.key} style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ direction: 'rtl', fontSize: 14, fontWeight: 900, color: k.color, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: 'serif' }}>{k.arShort}</span><span style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{k.id}</span></div></th>))}
                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fisik</span><span style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.55, fontWeight: 600 }}>BB · TB · Skt · Izin · Alpa · Plg</span></div></th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Hafalan</span></div></th>
                            <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map((student, si) => {
                            const sc = scores[student.id] || {}, ex = extras[student.id] || {}, complete = isComplete(sc), avg = calcAvg(sc), isSaved = savedIds.has(student.id), isSaving = saving[student.id], isDirty = !isSaved && (KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) || [ex.berat_badan, ex.tinggi_badan, ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan].some(v => v !== '' && v !== null && v !== undefined))
                            return (
                                <tr key={student.id} className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary)]/[0.02]" style={{ background: si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}>
                                    <td className="px-3 py-3 sticky left-0 z-10" style={{ background: si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}>
                                        <div className="flex items-center gap-2.5"><RadarChart scores={sc} size={36} /><div className="min-w-0 flex-1"><div className="text-[13px] font-black text-[var(--color-text)] leading-tight truncate">{student.name}</div><div className="flex items-center gap-1 mt-0.5">{avg ? <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).color }}>{avg}</span> : <span className="text-[8px] text-[var(--color-text-muted)] font-bold">isi nilai</span>}{isSaving && <FontAwesomeIcon icon={faSpinner} className="text-[8px] text-amber-500 animate-spin" />}{!isSaving && isSaved && <FontAwesomeIcon icon={faCircleCheck} className="text-[8px] text-emerald-500" />}{!isSaving && !isSaved && isDirty && <span className="text-[8px] font-black text-amber-500 flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />belum simpan</span>}</div></div></div>
                                    </td>
                                    {KRITERIA.map((k, ki) => {
                                        const prevSc = prevMonthScores[student.id]
                                        const prevVal = prevSc?.[k.key]
                                        const curVal = sc[k.key]
                                        const hasDelta = prevVal !== null && prevVal !== undefined && curVal !== '' && curVal !== null && curVal !== undefined
                                        const delta = hasDelta ? Number(curVal) - Number(prevVal) : 0
                                        return (
                                            <td key={k.key} className="py-2 text-center" style={{ verticalAlign: 'middle' }}>
                                                <ScoreCell value={sc[k.key]} onChange={v => { setScores(prev => ({ ...prev, [student.id]: { ...prev[student.id], [k.key]: v } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }} onKeyDown={e => handleKeyDown(e, si, ki)} inputRef={el => { cellRefs.current[`${si}-${ki}`] = el }} kriteria={k} />
                                                {hasDelta && delta !== 0 && (
                                                    <div style={{ fontSize: 8, fontWeight: 900, color: delta > 0 ? '#10b981' : '#ef4444', lineHeight: 1, marginTop: 1 }} title={`Bulan lalu: ${prevVal}`}>
                                                        {delta > 0 ? '▲' : '▼'}{Math.abs(delta)}
                                                    </div>
                                                )}
                                                {hasDelta && delta === 0 && (
                                                    <div style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.4, lineHeight: 1, marginTop: 1 }}>—</div>
                                                )}
                                            </td>
                                        )
                                    })}
                                    <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[{ key: 'berat_badan', label: 'BB', icon: faWeightScale, color: '#6366f1', unit: 'kg' }, { key: 'tinggi_badan', label: 'TB', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' }, { key: 'hari_sakit', label: 'Skt', icon: faBandage, color: '#ef4444', unit: 'hr' }, { key: 'hari_izin', label: 'Izin', icon: faCircleExclamation, color: '#f59e0b', unit: 'hr' }, { key: 'hari_alpa', label: 'Alpa', icon: faTriangleExclamation, color: '#ef4444', unit: 'hr' }, { key: 'hari_pulang', label: 'Plg', icon: faDoorOpen, color: '#8b5cf6', unit: 'x' }].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 32 }}>
                                                    <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                    <input type="number" placeholder="—" value={ex[f.key] ?? ''} onChange={e => { setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], [f.key]: e.target.value } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }} aria-label={f.label} className="flex-1 w-0 h-full text-[11px] font-bold text-center bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                                    <span className="text-[9px] text-[var(--color-text-muted)] font-bold pr-1 shrink-0">{f.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                                        <div className="flex flex-col gap-1.5">
                                            {[{ key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981' }, { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6' }].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 32 }}>
                                                    <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                    <input placeholder={f.ph} value={ex[f.key] ?? ''} onChange={e => { setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], [f.key]: e.target.value } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }} aria-label={f.ph} className="flex-1 w-0 h-full px-1 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                                </div>
                                            ))}
                                            <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', minHeight: 32 }}>
                                                <div className="w-6 shrink-0 flex items-start justify-center pt-[7px]" style={{ background: '#f59e0b18' }}><FontAwesomeIcon icon={faClipboardList} style={{ color: '#f59e0b', fontSize: 9 }} /></div>
                                                <textarea placeholder="Catatan musyrif..." value={ex.catatan ?? ''} onChange={e => { setExtras(prev => ({ ...prev, [student.id]: { ...prev[student.id], catatan: e.target.value } })); setSavedIds(prev => { const n = new Set(prev); n.delete(student.id); return n }); triggerAutoSave(student.id) }} maxLength={200} rows={2} aria-label="Catatan musyrif" className="flex-1 w-0 px-1.5 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                                        <div className="flex flex-col gap-1.5">
                                            <button onClick={() => saveStudent(student.id)} disabled={isSaving} className="w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black transition-all disabled:opacity-50" style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: '1px solid', borderColor: isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)' }}><FontAwesomeIcon icon={isSaving ? faSpinner : isSaved ? faCircleCheck : faFloppyDisk} className={isSaving ? 'animate-spin text-[10px]' : 'text-[10px]'} />{isSaving ? 'Menyimpan...' : isSaved ? 'Tersimpan' : 'Simpan'}</button>
                                            <div className="grid grid-cols-2 gap-1">
                                                <button onClick={() => { setPreviewStudentId(student.id); setStep(3) }} aria-label={`Preview PDF ${student.name}`} className="h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center gap-1 text-[11px] font-black hover:bg-indigo-500/20 transition-all"><FontAwesomeIcon icon={faFilePdf} className="text-[10px]" /> PDF</button>
                                                <button onClick={() => generateAndSendWA(student)} disabled={!student.phone || (!!sendingWA[student.id] && sendingWA[student.id] !== 'done')} aria-label={`Kirim WA ke wali ${student.name}`} className={`h-8 rounded-lg border text-[11px] font-black flex items-center justify-center gap-1 transition-all ${!student.phone ? 'opacity-30 cursor-not-allowed bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)]' : sendingWA[student.id] === 'done' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20' : sendingWA[student.id] ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 cursor-wait' : 'bg-green-500/10 border-green-500/20 text-green-600 hover:bg-green-500/20'}`}><FontAwesomeIcon icon={sendingWA[student.id] === 'generating' || sendingWA[student.id] === 'uploading' ? faSpinner : sendingWA[student.id] === 'done' ? faCircleCheck : faWhatsapp} className={(sendingWA[student.id] === 'generating' || sendingWA[student.id] === 'uploading') ? 'animate-spin text-[10px]' : 'text-[10px]'} /> WA</button>
                                            </div>
                                            <button onClick={() => setConfirmModal({ title: 'Reset Nilai?', subtitle: `Semua data ${student.name.split(' ')[0]} akan dikosongkan`, body: 'Nilai akademik, hafalan, fisik, dan catatan santri ini akan dihapus permanen dari database.', icon: 'danger', variant: 'red', confirmLabel: 'Ya, Reset Semua', onConfirm: () => { setConfirmModal(null); resetStudent(student.id) } })} aria-label={`Reset nilai ${student.name}`} className="w-full h-7 rounded-lg flex items-center justify-center gap-1 text-[10px] font-black transition-all hover:bg-red-500/10 hover:text-red-500" style={{ background: 'transparent', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)' }}><FontAwesomeIcon icon={faXmark} className="text-[9px]" /> Reset</button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {KRITERIA.map(k => { const vals = filteredStudents.map(s => scores[s.id]?.[k.key]).filter(v => v !== '' && v !== null && v !== undefined); const avg = vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : '—'; const g = avg !== '—' ? GRADE(Number(avg)) : null; return (<div key={k.key} className="p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-center"><div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: k.color }}>{k.id}</div><div className="text-lg font-black" style={{ color: g?.uiColor || 'var(--color-text-muted)' }}>{avg}</div><div className="text-[7px] font-bold text-[var(--color-text-muted)]" style={{ direction: 'rtl' }}>{g?.label || 'rata kelas'}</div></div>) })}
            </div>
        </div>
    )

    const renderStep3 = () => {
        const previewStudent = previewStudentId ? students.find(s => s.id === previewStudentId) : students[0]
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => setStep(2)} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali Input</button>
                    <span className="text-[10px] font-bold text-[var(--color-text-muted)]">{completedCount}/{students.length} raport lengkap</span>
                    {noPhoneCount > 0 && <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" /> {noPhoneCount} tanpa WA</span>}
                    <div className="flex-1" />
                    <button onClick={() => openPrintWindow([previewStudent].filter(Boolean))} className="h-8 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black hover:bg-emerald-500/20 transition-all flex items-center gap-2"><FontAwesomeIcon icon={faPrint} /> Cetak Ini</button>
                    {previewStudent?.phone && <button onClick={() => sendWATextOnly(previewStudent)} className="h-8 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 text-[10px] font-black flex items-center gap-1.5 hover:bg-green-500/20 transition-all"><FontAwesomeIcon icon={faWhatsapp} className="text-[11px]" /> Ringkasan</button>}
                    <button onClick={() => openPrintWindow(students)} className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"><FontAwesomeIcon icon={faPrint} /> Cetak Semua ({students.length})</button>
                </div>
                <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] self-center mr-1">Pilih:</span>
                    {students.map(s => { const complete = isComplete(scores[s.id] || {}), isActive = previewStudentId === s.id || (!previewStudentId && s.id === students[0]?.id); return (<button key={s.id} onClick={() => setPreviewStudentId(s.id)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}><span className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-emerald-400' : 'bg-amber-400'}`} />{s.name.split(' ')[0]}</button>) })}
                </div>
                {previewStudent && (
                    <div className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-gray-100 dark:bg-gray-900 p-4 flex justify-center">
                        <div className="shadow-2xl"><RaportPrintCard student={previewStudent} scores={scores[previewStudent.id]} extra={extras[previewStudent.id]} bulanObj={bulanObj} tahun={selectedYear} musyrif={musyrif} className={selectedClass?.name} lang={lang} settings={settings} /></div>
                    </div>
                )}
            </div>
        )
    }

    const renderStep4 = () => {
        let filtered = archiveList.filter(e =>
            (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
            (!archiveFilter.year || String(e.year) === String(archiveFilter.year)) &&
            (!archiveFilter.month || String(e.month) === String(archiveFilter.month)) &&
            (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase())) &&
            (archiveStatusFilter === 'all' || (archiveStatusFilter === 'complete' ? e.completed === e.count && e.count > 0 : e.completed < e.count))
        )
        if (archiveSort === 'oldest') filtered = [...filtered].sort((a, b) => a.year - b.year || a.month - b.month)
        else if (archiveSort === 'name') filtered = [...filtered].sort((a, b) => a.class_name.localeCompare(b.class_name))
        else if (archiveSort === 'progress') filtered = [...filtered].sort((a, b) => (b.count ? b.completed / b.count : 0) - (a.count ? a.completed / a.count : 0))
        const uniqueYears = [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)
        if (archivePreview) {
            const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, lang: pLang, entry } = archivePreview
            return (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setArchivePreview(null)} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali Arsip</button>
                        <div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name} · {BULAN.find(b => b.id === entry.month)?.id_str} {entry.year}</div>
                        <div className="flex-1" />
                        <button onClick={() => exportBulkPDF(entry)} className="h-8 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black hover:bg-amber-500/20 transition-all flex items-center gap-2"><FontAwesomeIcon icon={faFileZipper} /> Export PDF</button>
                        <button onClick={() => openPrintWindow(pStu)} className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"><FontAwesomeIcon icon={faPrint} /> Cetak Semua ({pStu.length})</button>
                    </div>
                    <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        {pStu.map(s => {
                            const complete = isComplete(pSc[s.id] || {})
                            const isActive = previewStudentId === s.id || (!previewStudentId && s.id === pStu[0]?.id)
                            const trend = studentTrend[s.id]
                            return (
                                <button key={s.id} onClick={() => setPreviewStudentId(s.id)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    {s.name.split(' ')[0]}
                                    {trend && trend.length >= 2 && !isActive && <SparklineTrend trendData={trend} />}
                                </button>
                            )
                        })}
                    </div>
                    {(() => { const pStudent = previewStudentId ? pStu.find(s => s.id === previewStudentId) : pStu[0]; return pStudent ? (<div className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-gray-100 dark:bg-gray-900 p-4 flex justify-center"><div className="shadow-2xl"><RaportPrintCard student={pStudent} scores={pSc[pStudent.id]} extra={pEx[pStudent.id]} bulanObj={pBulan} tahun={pTahun} musyrif={pMus} className={pClass} lang={pLang} settings={settings} /></div></div>) : null })()}
                </div>
            )
        }
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setStep(0)} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali</button>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">{archiveList.length} periode tersimpan</span>
                    <div className="flex-1" />
                    <div className="relative">
                        <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[9px] pointer-events-none" />
                        <input type="text" placeholder="Cari kelas..." value={archiveSearch} onChange={e => setArchiveSearch(e.target.value)} className="h-8 pl-7 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 w-36" />
                        {archiveSearch && <button onClick={() => setArchiveSearch('')} aria-label="Bersihkan pencarian arsip" className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"><FontAwesomeIcon icon={faXmark} className="text-[9px]" /></button>}
                    </div>
                    {[{ val: archiveFilter.year, key: 'year', opts: uniqueYears.map(y => ({ v: y, l: y })), placeholder: 'Semua Tahun' }, { val: archiveFilter.month, key: 'month', opts: BULAN.map(b => ({ v: b.id, l: b.id_str })), placeholder: 'Semua Bulan' }, { val: archiveFilter.classId, key: 'classId', opts: [...new Map(archiveList.map(e => [e.class_id, e])).values()].map(e => ({ v: e.class_id, l: e.class_name })), placeholder: 'Semua Kelas' }].map(f => (
                        <select key={f.key} value={f.val} onChange={e => setArchiveFilter(p => ({ ...p, [f.key]: e.target.value }))} className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                            <option value="">{f.placeholder}</option>
                            {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                        </select>
                    ))}
                    <select value={archiveStatusFilter} onChange={e => setArchiveStatusFilter(e.target.value)} className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                        <option value="all">Semua Status</option>
                        <option value="complete">Lengkap (100%)</option>
                        <option value="incomplete">Belum Lengkap</option>
                    </select>
                    <select value={archiveSort} onChange={e => setArchiveSort(e.target.value)} className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                        <option value="name">Nama Kelas</option>
                        <option value="progress">Progress ↓</option>
                    </select>
                </div>
                {archiveLoading ? (
                    <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]"><FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> Memuat arsip...</div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]"><FontAwesomeIcon icon={faClipboardList} className="text-4xl opacity-20" /><p className="text-sm font-bold">Belum ada raport tersimpan</p></div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map(entry => {
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
                )}
            </div>
        )
    }

    // ── Print hidden container
    const printStudents = archivePreview ? archivePreview.students : students
    const printScores = archivePreview ? archivePreview.scores : scores
    const printExtras = archivePreview ? archivePreview.extras : extras
    const printBulan = archivePreview ? archivePreview.bulanObj : bulanObj
    const printYear = archivePreview ? archivePreview.tahun : selectedYear
    const printMusyrif = archivePreview ? archivePreview.musyrif : musyrif
    const printClass = archivePreview ? archivePreview.className : selectedClass?.name
    const printLang = archivePreview ? archivePreview.lang : lang

    // ── Confirm portal
    const confirmPortal = (confirmDelete || confirmModal) && (() => {
        const isDelete = !!confirmDelete && !confirmModal
        const variant = confirmModal?.variant ?? 'red'
        const accentColor = variant === 'amber' ? { bg: '#f59e0b', bgLight: '#f59e0b15', border: '#f59e0b30', hover: '#d97706' } : { bg: '#ef4444', bgLight: '#ef444415', border: '#ef444430', hover: '#dc2626' }
        const title = isDelete ? 'Hapus Arsip' : confirmModal?.title
        const subtitle = isDelete ? 'Aksi ini tidak bisa dibatalkan' : confirmModal?.subtitle
        const confirmLabel = isDelete ? 'Ya, Hapus' : confirmModal?.confirmLabel ?? 'Lanjutkan'
        const onConfirm = isDelete ? () => executeDeleteArchive(confirmDelete) : confirmModal?.onConfirm
        const onCancel = isDelete ? () => setConfirmDelete(null) : () => setConfirmModal(null)
        return createPortal(
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
                <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: 'var(--color-surface)', border: `1px solid ${accentColor.border}` }}>
                    <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: accentColor.bgLight }}><FontAwesomeIcon icon={faTriangleExclamation} className="text-lg" style={{ color: accentColor.bg }} /></div><div className="flex-1"><div className="font-black text-[13px] text-[var(--color-text)]">{title}</div>{subtitle && <div className="text-[11px] font-medium mt-0.5" style={{ color: accentColor.bg }}>{subtitle}</div>}</div></div>
                    <div className="text-[12px] text-[var(--color-text-muted)] leading-relaxed mb-5 pl-[52px]">{isDelete ? <>Yakin menghapus raport <strong className="text-[var(--color-text)]">{BULAN.find(b => b.id === confirmDelete.month)?.id_str} {confirmDelete.year}</strong> kelas <strong className="text-[var(--color-text)]">{confirmDelete.class_name}</strong>?<br /><span className="font-bold" style={{ color: accentColor.bg }}>{confirmDelete.count} raport akan dihapus permanen.</span></> : confirmModal?.body}</div>
                    <div className="flex gap-2"><button onClick={onCancel} className="flex-1 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black hover:text-[var(--color-text)] transition-all">Batal</button><button onClick={onConfirm} className="flex-1 h-9 rounded-xl text-white text-[11px] font-black transition-all flex items-center justify-center" style={{ background: accentColor.bg }} onMouseEnter={e => e.currentTarget.style.background = accentColor.hover} onMouseLeave={e => e.currentTarget.style.background = accentColor.bg}>{confirmLabel}</button></div>
                </div>
            </div>,
            document.body
        )
    })()

    const stepLabels = ['Setup', 'Input Nilai', 'Preview & Cetak']

    if (pageLoading) {
        return (
            <DashboardLayout title="Raport Bulanan">
                <div className="flex flex-col items-center justify-center py-24 text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={faSpinner} className="fa-spin text-3xl mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Memuat data...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Raport Bulanan">

            {/* ── PAGE HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Raport Bulanan</h1>
                    <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium italic opacity-70">نتيجة الشخصية — Kelola dan cetak raport bulanan per kelas.</p>
                </div>
                <div className="flex gap-2 items-center">
                    {step >= 1 && step <= 3 && (
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                            {stepLabels.map((label, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black transition-all ${step === i + 1 ? 'bg-emerald-500 text-white' : step > i + 1 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}`}>{step > i + 1 ? <FontAwesomeIcon icon={faCheck} className="text-[7px]" /> : i + 1}</div>
                                    <span className={`text-[9px] font-bold ${step === i + 1 ? 'text-emerald-500' : 'text-[var(--color-text-muted)]'}`}>{label}</span>
                                    {i < stepLabels.length - 1 && <div className="w-4 h-px bg-[var(--color-border)]" />}
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={() => { setStep(4); loadArchive() }} className={`h-9 px-3 rounded-lg border text-[9px] font-black flex items-center gap-1.5 transition-all ${step === 4 ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}><FontAwesomeIcon icon={faTableList} /> Riwayat</button>
                    {step === 0 && (
                        <button onClick={() => { setSelectedClassId(''); setStep(1) }} className="btn btn-primary h-9 px-4 lg:px-5 shadow-lg shadow-[var(--color-primary)]/20 flex items-center gap-2">
                            <FontAwesomeIcon icon={faPlus} className="text-sm" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Buat Raport</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── STATS ── */}
            {step === 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[
                        { label: 'Total Kelas', value: stats.totalKelas, icon: faSchool, bg: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]', border: 'border-t-[var(--color-primary)]' },
                        { label: 'Total Siswa', value: stats.totalSiswa, icon: faUsers, bg: 'bg-emerald-500/10 text-emerald-500', border: 'border-t-emerald-500' },
                        { label: 'Total Raport', value: stats.totalRaport, icon: faClipboardList, bg: 'bg-indigo-500/10 text-indigo-500', border: 'border-t-indigo-500' },
                        { label: 'Bulan Berjalan', value: BULAN[stats.bulanIni - 1]?.id_str || '—', icon: faCalendarAlt, bg: 'bg-amber-500/10 text-amber-500', border: 'border-t-amber-500', isText: true },
                    ].map(s => (
                        <div key={s.label} className={`glass rounded-[1.5rem] p-4 border-t-[3px] ${s.border} flex items-center gap-3 hover:border-t-4 transition-all`}>
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${s.bg}`}><FontAwesomeIcon icon={s.icon} /></div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 leading-none mb-1">{s.label}</p>
                                <h3 className={`font-black font-heading leading-none text-[var(--color-text)] ${s.isText ? 'text-sm' : 'text-xl tabular-nums'}`}>{s.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── SEARCH (only at step 0) ── */}
            {step === 0 && (
                <div className="glass rounded-[1.5rem] mb-6 border border-[var(--color-border)] overflow-hidden">
                    <div className="flex items-center gap-2 p-3">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)] text-sm"><FontAwesomeIcon icon={faSearch} /></div>
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama kelas..." className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Bersihkan pencarian kelas" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
                        </div>
                    </div>
                </div>
            )}

            {/* ── CONTENT ── */}
            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 sm:p-6">
                {step === 0 && renderStep0()}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </div>

            {/* ── Hidden print container ── */}
            {printQueue.length > 0 && (
                <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
                    {printStudents.filter(s => printQueue.includes(s.id)).map(s => (
                        <RaportPrintCard key={s.id} student={s} scores={printScores[s.id]} extra={printExtras[s.id]} bulanObj={printBulan} tahun={printYear} musyrif={printMusyrif} className={printClass} lang={printLang} settings={settings} onRendered={() => setPrintRenderedCount(c => c + 1)} />
                    ))}
                </div>
            )}

            {/* ── KEYBOARD SHORTCUT MODAL ── */}
            {showShortcutModal && createPortal(
                <div className="fixed inset-0 z-[202] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setShowShortcutModal(false) }}>
                    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-md" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center"><FontAwesomeIcon icon={faQuestion} className="text-indigo-500" /></div>
                                <div>
                                    <p className="text-[13px] font-black text-[var(--color-text)]">Keyboard Shortcuts</p>
                                    <p className="text-[10px] text-[var(--color-text-muted)]">Tekan <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-mono">?</kbd> kapan saja untuk membuka ini</p>
                                </div>
                            </div>
                            <button onClick={() => setShowShortcutModal(false)} aria-label="Tutup modal shortcut" className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all"><FontAwesomeIcon icon={faXmark} /></button>
                        </div>
                        <div className="space-y-1">
                            {[
                                { keys: ['Tab', 'Enter'], desc: 'Pindah ke cell berikutnya' },
                                { keys: ['↑', '↓'], desc: 'Naik / turun baris' },
                                { keys: ['←', '→'], desc: 'Pindah kolom kriteria' },
                                { keys: ['Ctrl', 'S'], desc: 'Simpan semua nilai' },
                                { keys: ['?'], desc: 'Buka / tutup panel shortcut ini' },
                                { keys: ['Esc'], desc: 'Tutup modal / panel' },
                                { keys: ['0–9'], desc: 'Input nilai langsung di cell aktif' },
                            ].map((sc, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-[var(--color-surface-alt)] transition-all">
                                    <span className="text-[11px] text-[var(--color-text-muted)]">{sc.desc}</span>
                                    <div className="flex items-center gap-1">
                                        {sc.keys.map((k, j) => (
                                            <span key={j}>
                                                <kbd className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[10px] font-mono font-black text-[var(--color-text)]">{k}</kbd>
                                                {j < sc.keys.length - 1 && <span className="text-[9px] text-[var(--color-text-muted)] mx-0.5">+</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                            <p className="text-[10px] font-bold text-amber-600 flex items-start gap-1.5"><FontAwesomeIcon icon={faCircleInfo} className="text-amber-500 mt-0.5 shrink-0" /> Tips: Gunakan Tab untuk navigasi cepat, Ctrl+S untuk auto-save semua, dan filter "Belum Lengkap" untuk fokus ke santri yang nilainya masih kosong.</p>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── WA BLAST CONFIRM MODAL (FIX #11) ── */}
            {waBlastConfirm && createPortal(
                <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-sm" role="dialog" aria-modal="true">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faWhatsapp} className="text-green-500 text-lg" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-[var(--color-text)]">Konfirmasi WA Blast</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                                    Akan membuka <strong>{waBlastConfirm.queue.length} tab browser</strong> secara berurutan untuk mengirim pesan WA ke wali santri.
                                </p>
                            </div>
                        </div>
                        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 mb-5">
                            <p className="text-[10px] font-bold text-amber-600 flex items-start gap-1.5">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 shrink-0" />
                                Pastikan popup browser <strong>tidak diblokir</strong> dan jangan tutup halaman ini selama proses berlangsung.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setWaBlastConfirm(null)} className="flex-1 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black hover:text-[var(--color-text)] transition-all">Batal</button>
                            <button onClick={() => runWaBlast(waBlastConfirm.queue)} className="flex-1 h-9 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5">
                                <FontAwesomeIcon icon={faWhatsapp} /> Ya, Kirim Sekarang
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── WA BLAST MODAL ── */}
            {waBlast && createPortal(
                <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faWhatsapp} className="text-green-500 text-lg" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-[var(--color-text)]">WA Blast Raport</p>
                                <p className="text-[10px] text-[var(--color-text-muted)]">{waBlast.queue.length} wali · Tab WA terbuka otomatis per santri</p>
                            </div>
                        </div>
                        <div className="mb-4">
                            <div className="flex justify-between mb-1.5">
                                <span className="text-[10px] font-black text-[var(--color-text-muted)]">Progress</span>
                                <span className="text-[10px] font-black text-[var(--color-text)]">{waBlast.done + waBlast.failed} / {waBlast.queue.length}</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden border border-[var(--color-border)]">
                                <div className="h-full rounded-full bg-green-500 transition-all duration-500"
                                    style={{ width: `${waBlast.queue.length ? Math.round(((waBlast.done + waBlast.failed) / waBlast.queue.length) * 100) : 0}%` }} />
                            </div>
                        </div>
                        {waBlast.active && waBlast.queue[waBlast.idx] && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/8 border border-green-500/20 mb-4">
                                <FontAwesomeIcon icon={faSpinner} className="text-green-500 animate-spin text-sm shrink-0" />
                                <div>
                                    <p className="text-[11px] font-black text-[var(--color-text)]">{waBlast.queue[waBlast.idx].name}</p>
                                    <p className="text-[9px] text-[var(--color-text-muted)]">Membuat PDF & membuka tab WA...</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {[
                                { label: 'Antrian', val: waBlast.queue.length, color: '#6366f1' },
                                { label: 'Terkirim', val: waBlast.done, color: '#10b981' },
                                { label: 'Gagal', val: waBlast.failed, color: '#ef4444' },
                            ].map(s => (
                                <div key={s.label} className="text-center p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                    <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                                    <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{s.label}</p>
                                </div>
                            ))}
                        </div>
                        {!waBlast.active && (
                            <button onClick={() => setWaBlast(null)} className="w-full h-10 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-all">
                                Selesai
                            </button>
                        )}
                        {waBlast.active && (
                            <p className="text-center text-[9px] text-[var(--color-text-muted)] font-medium">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mr-1" /> Jangan tutup halaman ini selama proses berlangsung
                            </p>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {confirmPortal}

            {/* ── FLOATING UNSAVED BAR ── */}
            {step === 2 && hasUnsavedMemo && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border border-amber-500/30 bg-[var(--color-surface)] backdrop-blur-sm animate-bounce-subtle"
                    style={{ boxShadow: '0 8px 32px rgba(245,158,11,0.18)' }}>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-[11px] font-black text-[var(--color-text)]">
                        Ada perubahan yang belum disimpan
                    </span>
                    <button onClick={saveAll} disabled={savingAll}
                        className="h-8 px-4 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-amber-500/20">
                        <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin text-[9px]' : 'text-[9px]'} />
                        {savingAll ? 'Menyimpan...' : 'Simpan Sekarang'}
                    </button>
                    <button onClick={async () => { await saveAll() }} aria-label="Tutup bar unsaved" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                        <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                    </button>
                </div>
            )}

            {/* ── PENDING NAV CONFIRM (unsaved warning) ── */}
            {pendingNav && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-5 w-full max-w-sm" role="dialog" aria-modal="true">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                                <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 text-lg" />
                            </div>
                            <div>
                                <p className="text-[13px] font-black text-[var(--color-text)]">Ada data belum disimpan</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Nilai yang sudah diisi tapi belum disimpan akan hilang jika kamu pindah halaman sekarang.</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setPendingNav(null)} className="flex-1 h-9 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[11px] font-black hover:text-[var(--color-text)] transition-all">Batal</button>
                            <button onClick={async () => { await saveAll(); setPendingNav(null); pendingNav.action() }} className="flex-1 h-9 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5">
                                <FontAwesomeIcon icon={faFloppyDisk} className="text-[10px]" /> Simpan & Lanjut
                            </button>
                            <button onClick={() => { setPendingNav(null); pendingNav.action() }} className="flex-1 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 text-[11px] font-black hover:bg-rose-500/25 transition-all">Buang & Lanjut</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </DashboardLayout>
    )
}