import { Fragment, useState, useEffect, useCallback, useRef, useMemo, memo } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faLock, faCalendarAlt, faChevronLeft, faChevronRight,
    faPrint, faCheck, faSpinner, faFloppyDisk,
    faChartPie, faTableList, faMagnifyingGlass, faArrowLeft, faDownload,
    faCircleCheck, faCircleExclamation, faTriangleExclamation,
    faBolt, faXmark, faSchool, faClipboardList, faUsers,
    faMosque, faBookOpen, faBroom, faLanguage, faStar,
    faWeightScale, faRulerVertical, faBandage, faDoorOpen,
    faCloudArrowUp, faFileLines, faFilePdf, faFileZipper, faBoxArchive,
    faSearch, faSliders, faPlus, faFilter, faFillDrip, faArrowTrendUp, faArrowTrendDown, faFileExport,
    faQuestion, faCircleInfo, faSortAmountDown, faWifi, faKeyboard, faLightbulb
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import DashboardLayout from '../components/layout/DashboardLayout'
import Breadcrumb from '../components/ui/Breadcrumb'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLogger'
import { useToast } from '../context/ToastContext'
import { useSchoolSettings } from '../context/SchoolSettingsContext'
import { useAuth } from '../context/AuthContext'
import { useFlag } from '../context/FeatureFlagsContext'


// ─── Constants ────────────────────────────────────────────────────────────────

// FIX #7: MAX_SCORE sebagai konstanta agar skala mudah diubah
const MAX_SCORE = 9

// FIX #14: Nama bucket Supabase sebagai konstanta
const STORAGE_BUCKET = 'raport-mbs'

// ─── Template catatan musyrif (FITUR 3) ──────────────────────────────────────
const CATATAN_TEMPLATES = [
    'Alhamdulillah perkembangannya sangat baik bulan ini.',
    'Perlu perhatian lebih pada aspek kedisiplinan.',
    'Konsisten dan terus meningkat, pertahankan.',
    'Mohon dukungan orang tua untuk hafalan di rumah.',
    'Ada peningkatan signifikan dibanding bulan lalu.',
    'Perlu bimbingan lebih intensif untuk Al-Qur\'an.',
    'Akhlak dan ibadah sangat baik, tingkatkan bahasa.',
    'Kesehatan kurang baik bulan ini, semoga lekas pulih.',
]

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

// PERF: KATA_ARAB, ASMAUL_HUSNA, DIGRAPH, SINGLE dipindah ke translitData.js
// dan di-lazy-load hanya saat lang === 'ar' pertama kali dibutuhkan.
// Cache module-level agar import() hanya dipanggil sekali.
let _translitCache = null
const loadTranslitData = () => {
    if (_translitCache) return Promise.resolve(_translitCache)
    return import('../data/translitData').then(m => { _translitCache = m; return m })
}

// ─── KATA_ARAB (versi singkat — hanya untuk RaportPrintCard inline musyrif) ──
// File lengkap ada di translitData.js
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
    'zainal': 'زين العابدين', 'zainul': 'زين العابدين',
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

// Digraf & Single — versi inline untuk fallback sinkron di RaportPrintCard
// Versi lengkap ada di translitData.js (sama isinya, tapi di-lazy-load)
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

// ─── Auto-comment generator ───────────────────────────────────────────────────

const generateAutoComment = (sc, studentId = '', trendHistory = []) => {
    // ── Nilai bulan ini ──────────────────────────────────────────────────────
    const vals = KRITERIA.map(k => ({ key: k.key, id: k.id, val: sc?.[k.key] }))
        .filter(k => k.val !== '' && k.val !== null && k.val !== undefined)
        .map(k => ({ ...k, val: Number(k.val) }))
    if (!vals.length) return ''

    const avg = vals.reduce((a, b) => a + b.val, 0) / vals.length
    const best = vals.reduce((a, b) => b.val > a.val ? b : a, vals[0])
    const worst = vals.reduce((a, b) => b.val < a.val ? b : a, vals[0])
    const allHigh = vals.every(v => v.val >= 8)
    const allMed = vals.every(v => v.val >= 6)
    const hasLow = vals.some(v => v.val < 4)

    // Seed deterministik agar komentar konsisten per santri, bukan random tiap klik
    const seed = (studentId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const pick = (arr) => arr[seed % arr.length]

    // ── Analisis tren dari histori ────────────────────────────────────────────
    const history = (trendHistory || []).slice().sort((a, b) =>
        a.year !== b.year ? a.year - b.year : a.month - b.month
    )
    const hasHistory = history.length >= 2

    const histAvgs = history.map(h => {
        const hVals = KRITERIA.map(k => h.scores?.[k.key]).filter(v => v !== null && v !== undefined && v !== '')
        return hVals.length ? hVals.reduce((a, b) => a + Number(b), 0) / hVals.length : null
    }).filter(v => v !== null)

    const prevAvg = histAvgs.length >= 1 ? histAvgs[histAvgs.length - 1] : null
    const delta = prevAvg !== null ? avg - prevAvg : 0
    const isRising = delta > 0.3
    const isFalling = delta < -0.3

    // Streak naik/turun berturut-turut
    let streakUp = 0, streakDown = 0
    for (let i = histAvgs.length - 1; i >= 1; i--) {
        if (histAvgs[i] > histAvgs[i - 1] + 0.2) streakUp++; else break
    }
    for (let i = histAvgs.length - 1; i >= 1; i--) {
        if (histAvgs[i] < histAvgs[i - 1] - 0.2) streakDown++; else break
    }

    // Per-kriteria: aspek mana naik/turun signifikan dari bulan lalu
    const prevScores = history.length >= 1 ? history[history.length - 1].scores : null
    const kriteriaDeltas = prevScores ? KRITERIA.map(k => {
        const prev = prevScores?.[k.key]; const curr = sc?.[k.key]
        if (prev == null || curr == null) return null
        return { id: k.id, delta: Number(curr) - Number(prev) }
    }).filter(Boolean) : []
    const mostImproved = kriteriaDeltas.filter(d => d.delta >= 1).sort((a, b) => b.delta - a.delta)[0]
    const mostDeclined = kriteriaDeltas.filter(d => d.delta <= -1).sort((a, b) => a.delta - b.delta)[0]

    // Konsistensi per-kriteria naik/turun 3 bulan berturut
    const consistentUp = hasHistory ? KRITERIA.filter(k => {
        const kVals = history.slice(-3).map(h => h.scores?.[k.key]).filter(v => v != null && v !== '')
        return kVals.length >= 3 && kVals[1] > kVals[0] && kVals[2] > kVals[1]
    }) : []
    const consistentDown = hasHistory ? KRITERIA.filter(k => {
        const kVals = history.slice(-3).map(h => h.scores?.[k.key]).filter(v => v != null && v !== '')
        return kVals.length >= 3 && kVals[1] < kVals[0] && kVals[2] < kVals[1]
    }) : []

    // ── Bangun komentar ───────────────────────────────────────────────────────
    let parts = []

    // 1) Pembuka — berbasis tren jika ada histori
    if (hasHistory && streakUp >= 2) {
        parts.push(pick([
            `Alhamdulillah, nilai rata-rata terus meningkat ${streakUp + 1} bulan berturut-turut`,
            `Masya Allah, perkembangan konsisten naik selama ${streakUp + 1} bulan terakhir`,
            `Tren positif yang luar biasa — rata-rata terus naik ${streakUp + 1} bulan berturut-turut`,
        ]))
    } else if (hasHistory && streakDown >= 2) {
        parts.push(pick([
            `Nilai rata-rata mengalami penurunan ${streakDown + 1} bulan berturut-turut, perlu perhatian`,
            `Tren menurun ${streakDown + 1} bulan berturut-turut memerlukan evaluasi segera`,
            `Penurunan nilai selama ${streakDown + 1} bulan berturut-turut perlu disikapi bersama`,
        ]))
    } else if (hasHistory && isRising) {
        const d = Math.abs(delta) >= 1 ? `${Math.abs(delta).toFixed(1)} poin` : 'cukup signifikan'
        parts.push(pick([
            `Alhamdulillah, terjadi peningkatan rata-rata sebesar ${d} dibanding bulan lalu`,
            `Ada kenaikan nilai yang menggembirakan (${d}) dari bulan sebelumnya`,
            `Perkembangan positif terlihat jelas — rata-rata naik ${d} dari bulan lalu`,
        ]))
    } else if (hasHistory && isFalling) {
        const d = Math.abs(delta) >= 1 ? `${Math.abs(delta).toFixed(1)} poin` : 'sedikit'
        parts.push(pick([
            `Nilai rata-rata turun ${d} dibanding bulan lalu, perlu evaluasi bersama`,
            `Terjadi penurunan ${d} dari bulan sebelumnya, mohon perhatian lebih`,
            `Ada penurunan nilai sebesar ${d} dari bulan lalu yang perlu diantisipasi`,
        ]))
    } else if (hasHistory && allHigh) {
        parts.push(pick([
            `Alhamdulillah, nilai tetap konsisten tinggi dan stabil di semua aspek`,
            `Masya Allah, performa sangat baik dan konsisten dari bulan ke bulan`,
            `Konsistensi nilai yang tinggi sangat membanggakan, pertahankan`,
        ]))
    } else if (allHigh) {
        parts.push(pick([
            `Alhamdulillah, seluruh aspek penilaian sangat memuaskan bulan ini`,
            `Masya Allah, perkembangan di semua aspek sangat luar biasa`,
            `Capaian bulan ini luar biasa, semua aspek menunjukkan hasil terbaik`,
        ]))
    } else if (avg >= 6) {
        parts.push(pick([
            `Alhamdulillah, perkembangan ${best.id.toLowerCase()} cukup baik bulan ini`,
            `Kemajuan pada aspek ${best.id.toLowerCase()} sudah terlihat nyata`,
            `Aspek ${best.id.toLowerCase()} menunjukkan perkembangan yang positif`,
        ]))
    } else {
        parts.push(pick([
            `Perlu perhatian lebih pada aspek ${worst.id.toLowerCase()} bulan ini`,
            `Butuh pendampingan ekstra, khususnya di aspek ${worst.id.toLowerCase()}`,
            `Aspek ${worst.id.toLowerCase()} memerlukan perhatian dan bimbingan lebih`,
        ]))
    }

    // 2) Insight spesifik per-kriteria
    if (consistentUp.length > 0 && consistentUp.length <= 2) {
        const names = consistentUp.map(k => k.id.toLowerCase()).join(' dan ')
        parts.push(pick([
            `Aspek ${names} terus naik 3 bulan berturut-turut`,
            `${names.charAt(0).toUpperCase() + names.slice(1)} konsisten meningkat selama 3 bulan`,
        ]))
    } else if (mostImproved && !consistentUp.length) {
        parts.push(pick([
            `Aspek ${mostImproved.id.toLowerCase()} menunjukkan peningkatan paling menonjol`,
            `Kemajuan paling signifikan terlihat pada ${mostImproved.id.toLowerCase()}`,
        ]))
    }

    if (consistentDown.length > 0 && consistentDown.length <= 2) {
        const names = consistentDown.map(k => k.id.toLowerCase()).join(' dan ')
        parts.push(pick([
            `Perhatikan aspek ${names} yang turun 3 bulan berturut-turut`,
            `Aspek ${names} perlu ditangani segera karena terus menurun`,
        ]))
    } else if (mostDeclined && !consistentDown.length) {
        parts.push(pick([
            `Perlu ditingkatkan pada aspek ${mostDeclined.id.toLowerCase()}`,
            `Aspek ${mostDeclined.id.toLowerCase()} masih bisa lebih ditingkatkan`,
        ]))
    } else if (!hasHistory && !allHigh && worst.val < 7) {
        parts.push(pick([
            `Masih ada ruang peningkatan pada aspek ${worst.id.toLowerCase()}`,
            `Aspek ${worst.id.toLowerCase()} perlu mendapat perhatian lebih`,
        ]))
    }

    // 3) Penutup
    const closingHigh = [
        'Semoga terus istiqomah dan menjadi teladan.',
        'Barakallahu fiik, semoga terus berkembang.',
        'Semoga konsisten dan terus meningkat.',
    ]
    const closingMid = [
        'Semoga semakin berkembang ke depannya.',
        'Tetap semangat dan terus tingkatkan diri.',
        'Semoga bulan depan semakin baik.',
    ]
    const closingLow = [
        'Mohon dukungan penuh dari wali santri.',
        'Diperlukan kerjasama wali santri untuk mendampingi.',
        'Semoga dengan dukungan keluarga dapat lebih berkembang.',
    ]

    const closing = (allHigh || streakUp >= 2) ? pick(closingHigh)
        : (allMed && !isFalling) ? pick(closingMid)
            : pick(closingLow)

    return parts.join('. ') + '. ' + closing
}

// ─── Radar Chart SVG ──────────────────────────────────────────────────────────

const RadarChart = memo(({ scores, size = 80 }) => {
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
})

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
                inputMode="decimal"
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

// ─── ExtraInput — memoized input untuk field fisik/hafalan ───────────────────
// Local state agar typing instant; propagate ke parent state setelah 300ms debounce
// atau segera saat blur. Mencegah re-render seluruh tabel tiap keystroke.
const ExtraInput = memo(({ value, studentId, fieldKey, onCommit, ...inputProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const debounceRef = useRef(null)

    // Sync dari parent saat ada perubahan eksternal (reset, copy last month, dll)
    useEffect(() => { setLocalVal(value ?? '') }, [value])

    const handleChange = (e) => {
        const v = e.target.value
        setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }
    const handleBlur = () => {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        onCommit(studentId, fieldKey, localVal)
    }
    return <input {...inputProps} value={localVal} onChange={handleChange} onBlur={handleBlur} />
})

// ─── ExtraTextarea — memoized textarea untuk field catatan ───────────────────
const ExtraTextarea = memo(({ value, studentId, fieldKey, onCommit, ...textareaProps }) => {
    const [localVal, setLocalVal] = useState(value ?? '')
    const debounceRef = useRef(null)

    useEffect(() => { setLocalVal(value ?? '') }, [value])

    const handleChange = (e) => {
        const v = e.target.value
        setLocalVal(v)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => onCommit(studentId, fieldKey, v), 300)
    }
    const handleBlur = () => {
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
        onCommit(studentId, fieldKey, localVal)
    }
    return <textarea {...textareaProps} value={localVal} onChange={handleChange} onBlur={handleBlur} />
})

// ─── Module-level field configs (stop recreating arrays every render) ─────────
const FISIK_FIELDS = [
    { key: 'berat_badan', label: 'BB', icon: faWeightScale, color: '#6366f1', unit: 'kg' },
    { key: 'tinggi_badan', label: 'TB', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' },
    { key: 'hari_sakit', label: 'Skt', icon: faBandage, color: '#ef4444', unit: 'hr' },
    { key: 'hari_izin', label: 'Izin', icon: faCircleExclamation, color: '#f59e0b', unit: 'hr' },
    { key: 'hari_alpa', label: 'Alpa', icon: faTriangleExclamation, color: '#ef4444', unit: 'hr' },
    { key: 'hari_pulang', label: 'Plg', icon: faDoorOpen, color: '#8b5cf6', unit: 'x' },
]
const HAFALAN_FIELDS = [
    { key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981' },
    { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6' },
]

// ─── StudentRow — THE key perf fix ────────────────────────────────────────────
// Memo comparator: hanya compare data yang mempengaruhi tampilan row ini.
// Callback props sengaja diabaikan karena semua dipass sebagai stable useCallback.
const studentRowAreEqual = (prev, next) => {
    if (prev.si !== next.si) return false
    if (prev.student !== next.student) return false
    if (prev.sc !== next.sc) return false
    if (prev.ex !== next.ex) return false
    if (prev.isSaved !== next.isSaved) return false
    if (prev.isSaving !== next.isSaving) return false
    if (prev.isDirty !== next.isDirty) return false
    if (prev.isChecked !== next.isChecked) return false
    if (prev.bulkMode !== next.bulkMode) return false
    if (prev.lang !== next.lang) return false
    if (prev.trendData !== next.trendData) return false
    if (prev.prevScores !== next.prevScores) return false
    if (prev.templateOpen !== next.templateOpen) return false
    if (prev.catatanArab !== next.catatanArab) return false
    if (prev.sendingWAStatus !== next.sendingWAStatus) return false
    return true
}

const StudentRow = memo(({
    student, si, sc, ex,
    isSaved, isSaving, isDirty, isChecked,
    bulkMode, lang,
    trendData, prevScores, templateOpen, catatanArab, sendingWAStatus,
    onScoreChange, onExtraChange, onCatatanChange,
    onSave, onWA, onPDF, onReset, onBulkToggle,
    onKeyDown, onTemplateToggle, onTemplateApply,
    onTranslitToggle, cellRefs,
}) => {
    const avg = calcAvg(sc)
    return (
        <tr className="border-t border-[var(--color-border)] transition-colors hover:bg-[var(--color-primary)]/[0.02]"
            style={{ background: isChecked ? 'var(--color-primary, #6366f1)08' : si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}>
            {bulkMode && (
                <td className="text-center px-1" style={{ verticalAlign: 'middle' }}>
                    <input type="checkbox" checked={isChecked}
                        onChange={e => onBulkToggle(student.id, e.target.checked)}
                        aria-label={`Pilih ${student.name}`}
                        className="w-3.5 h-3.5 accent-violet-500 cursor-pointer" />
                </td>
            )}
            <td className="px-3 py-3 sticky left-0 z-10" style={{ background: isChecked ? '#6366f108' : si % 2 === 0 ? 'var(--color-surface)' : 'var(--color-surface-alt)' }}>
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
                const prevVal = prevScores?.[k.key]
                const curVal = sc[k.key]
                const hasDelta = prevVal !== null && prevVal !== undefined && curVal !== '' && curVal !== null && curVal !== undefined
                const delta = hasDelta ? Number(curVal) - Number(prevVal) : 0
                return (
                    <td key={k.key} className="py-2 text-center" style={{ verticalAlign: 'middle' }}>
                        <ScoreCell value={sc[k.key]}
                            onChange={v => onScoreChange(student.id, k.key, v)}
                            onKeyDown={e => onKeyDown(e, si, ki)}
                            inputRef={el => { cellRefs.current[`${si}-${ki}`] = el }}
                            kriteria={k} />
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
                    {FISIK_FIELDS.map(f => (
                        <div key={f.key} className="flex items-center gap-1 rounded-md border border-[var(--color-border)] overflow-hidden" style={{ background: 'var(--color-surface)', height: 32 }}>
                            <div className="w-6 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                            <ExtraInput type="number" inputMode="decimal" placeholder="—" value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={onExtraChange} aria-label={f.label} className="flex-1 w-0 h-full text-[11px] font-bold text-center bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
                        <ExtraTextarea placeholder={`Catatan untuk ${student.name.split(' ')[0]}...`} value={ex.catatan ?? ''} studentId={student.id} fieldKey="catatan" onCommit={onCatatanChange} maxLength={200} rows={2} aria-label="Catatan musyrif" className="flex-1 w-0 px-1.5 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                        <button onClick={() => { const c = generateAutoComment(sc, student.id, trendData); if (!c) return; onCatatanChange(student.id, 'catatan', c) }}
                            title="Generate komentar otomatis dari nilai" disabled={!avg}
                            className="shrink-0 w-6 flex items-center justify-center text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-all disabled:opacity-30" aria-label="Generate komentar otomatis">
                            <FontAwesomeIcon icon={faBolt} style={{ fontSize: 9 }} />
                        </button>
                    </div>
                    <div className="relative" data-template-anchor="1">
                        <button onClick={() => onTemplateToggle(student.id)}
                            className={`w-full h-6 rounded-md border text-[8px] font-black flex items-center justify-center gap-1 transition-all ${templateOpen ? 'bg-amber-500/15 border-amber-500/30 text-amber-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={faLightbulb} style={{ fontSize: 7 }} /> Template Catatan
                        </button>
                        {templateOpen && (
                            <div className="absolute left-0 right-0 z-30 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl overflow-hidden"
                                style={{ ...(si < 2 ? { top: 'calc(100% + 4px)' } : { bottom: 'calc(100% + 4px)' }), minWidth: 200 }}>
                                <p className="text-[7px] font-black uppercase tracking-widest text-[var(--color-text-muted)] px-2.5 pt-2 pb-1">Pilih template catatan</p>
                                {CATATAN_TEMPLATES.map((tmpl, ti) => (
                                    <button key={ti} onClick={() => onTemplateApply(student.id, tmpl)}
                                        className="w-full text-left px-2.5 py-1.5 text-[10px] text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all leading-snug border-t border-[var(--color-border)]/40 first:border-t-0">
                                        {tmpl}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {lang === 'ar' && ex.catatan && (
                        <button onClick={() => onTranslitToggle(student.id, ex.catatan, catatanArab)}
                            title={catatanArab ? 'Kembali ke Indonesia' : 'Terjemahkan catatan ke huruf Arab'}
                            className={`w-full h-6 rounded-md border text-[8px] font-black flex items-center justify-center gap-1 transition-all ${catatanArab ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={faLanguage} style={{ fontSize: 8 }} />
                            {catatanArab ? 'Arab ✓' : 'Ke Arab'}
                        </button>
                    )}
                </div>
            </td>
            <td className="px-2 py-3" style={{ verticalAlign: 'middle' }}>
                <div className="flex flex-col gap-1.5">
                    <button onClick={() => onSave(student.id)} disabled={isSaving}
                        className="w-full h-8 rounded-lg flex items-center justify-center gap-1.5 text-[11px] font-black transition-all disabled:opacity-50"
                        style={{ background: isSaved ? '#10b98115' : isDirty ? '#6366f115' : 'var(--color-surface-alt)', color: isSaved ? '#10b981' : isDirty ? '#6366f1' : 'var(--color-text-muted)', border: '1px solid', borderColor: isSaved ? '#10b98130' : isDirty ? '#6366f130' : 'var(--color-border)' }}>
                        <FontAwesomeIcon icon={isSaving ? faSpinner : isSaved ? faCircleCheck : faFloppyDisk} className={isSaving ? 'animate-spin text-[10px]' : 'text-[10px]'} />
                        {isSaving ? 'Menyimpan...' : isSaved ? 'Tersimpan' : 'Simpan'}
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

// ─── Raport Print Card ────────────────────────────────────────────────────────

// PERF: Custom comparator — hanya re-render kalau data yang benar-benar ditampilkan berubah.
// Tanpa ini, memo() masih re-render saat parent re-render karena object identity berubah.
const printCardAreEqual = (prev, next) => {
    if (prev.lang !== next.lang) return false
    if (prev.tahun !== next.tahun) return false
    if (prev.musyrif !== next.musyrif) return false
    if (prev.className !== next.className) return false
    if (prev.student?.id !== next.student?.id) return false
    if (prev.student?.metadata?.nama_arab !== next.student?.metadata?.nama_arab) return false
    if (prev.bulanObj?.id !== next.bulanObj?.id) return false
    // Deep-compare scores (5 kriteria)
    const sk = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
    for (const k of sk) { if ((prev.scores?.[k] ?? '') !== (next.scores?.[k] ?? '')) return false }
    // Deep-compare extra fields
    const ek = ['berat_badan', 'tinggi_badan', 'ziyadah', 'murojaah', 'hari_sakit', 'hari_izin', 'hari_alpa', 'hari_pulang', 'catatan']
    for (const k of ek) { if ((prev.extra?.[k] ?? '') !== (next.extra?.[k] ?? '')) return false }
    // Compare settings (logo, colors, school name, headmaster — all affect print output)
    if (JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) return false
    return true
}

const RaportPrintCard = memo(({ student, scores, extra, bulanObj, tahun, musyrif, className, lang = 'ar', settings = {}, catatanArab, onRendered }) => {
    const sc = scores || {}, ex = extra || {}, L = LABEL[lang], isAr = lang === 'ar'
    // FIX #2: Tambahkan onRendered ke dependency array
    useEffect(() => { onRendered?.() }, [onRendered])
    const gradeLabel = isAr ? (v) => GRADE(v)?.label : (v) => GRADE(v)?.id
    const yearDisplay = isAr ? `\u200F${toArabicNum(tahun - 1)} \u2013 ${toArabicNum(tahun)}` : `${tahun - 1} – ${tahun}`
    const tableDir = isAr ? 'rtl' : 'ltr'
    const displayName = isAr ? (student?.metadata?.nama_arab || student?.name || '—') : (student?.name || '—')
    const displayVal = (v) => { if (v === '' || v === null || v === undefined) return '—'; return isAr ? toArabicNum(v) : v }

    // Transliterasi nama musyrif ke Arab — pakai KATA_ARAB inline + DIGRAPH/SINGLE sebagai fallback
    const displayMusyrif = isAr && musyrif
        ? musyrif.trim().split(/\s+/).map(w => {
            const wl = w.toLowerCase()
            // 1) Coba kamus lengkap inline dulu
            if (KATA_ARAB[wl]) return KATA_ARAB[wl]
            // 2) Pola Abdul-/Abdi- + Asmaul Husna
            const abdulMatch = wl.match(/^ab[du]u?l?[-_]?(.+)$/) || wl.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suf = abdulMatch[1]
                if (ASMAUL_HUSNA[suf]) return 'عبد ' + ASMAUL_HUSNA[suf]
                if (suf === 'llah' || suf === 'lah' || suf === 'illah') return 'عبد الله'
            }
            // 3) Pola bin/binti
            if (wl === 'bin' || wl === 'ibn' || wl === 'ibnu') return 'بن'
            if (wl === 'binti' || wl === 'bint') return 'بنت'
            // 4) Fallback: transliterasi huruf per huruf dengan DIGRAPH + SINGLE
            let res = '', i = 0
            while (i < wl.length) {
                const two = wl.slice(i, i + 2)
                const di = DIGRAPH.find(([k]) => k === two)
                if (di) { res += di[1]; i += 2; continue }
                res += SINGLE[wl[i]] || wl[i]
                i++
            }
            return res
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

            {/* ── Skala Penilaian + Catatan Musyrif sejajar ── */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'flex-start', flexDirection: isAr ? 'row-reverse' : 'row' }}>
                {/* Skala Penilaian */}
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
                {/* Catatan musyrif — mengisi sisa ruang di samping skala */}
                {ex.catatan && (
                    <div style={{
                        flex: 1,
                        alignSelf: 'stretch',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        padding: '8px 12px',
                        fontSize: '9.5pt',
                        direction: isAr ? 'rtl' : 'ltr',
                        fontFamily: isAr ? "'Traditional Arabic', serif" : 'inherit',
                        lineHeight: 1.6,
                    }}>
                        <div style={{ fontWeight: 700, fontSize: '9pt', color: '#555', marginBottom: 4 }}>
                            {isAr ? 'ملاحظة' : 'Catatan Musyrif'}
                        </div>
                        {isAr && catatanArab ? catatanArab : ex.catatan}
                    </div>
                )}
            </div>

            {/* ── TTD 3 Kolom: Ketua Pondok · Musyrif · Wali Santri ── */}
            <div style={{
                display: 'flex',
                marginTop: 36,
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

        </div>
    )
    // PERF: custom comparator — cegah re-render saat prop identity berubah tapi nilai sama
}, printCardAreEqual)

// ─── Skeleton Loader (FIX #13) ────────────────────────────────────────────────

const ClassCardSkeleton = () => (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 animate-pulse">
        <div className="h-3 w-2/3 bg-[var(--color-border)] rounded mb-2" />
        <div className="h-2 w-1/3 bg-[var(--color-border)] rounded mb-3" />
        <div className="h-1.5 w-full bg-[var(--color-border)] rounded" />
    </div>
)

// ─── Module-level constants (moved from inside component for stable references)
// FIX: ROW_HEIGHT & OVERSCAN dipindah ke module-level agar tidak masuk dep array
// sebagai nilai yang "berubah", sekaligus menghilangkan noise bagi linter.
const ROW_HEIGHT = 80  // px per baris — diukur empiris (3 baris input ≈ 80px)
const OVERSCAN = 5     // baris ekstra di atas/bawah viewport (anti-flicker)

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RaportPage() {
    const { addToast } = useToast()
    const { settings } = useSchoolSettings()
    const { profile } = useAuth()
    // FIX #10: now sebagai ref agar tidak berubah setiap render
    const now = useRef(new Date()).current

    const ALLOWED_ROLES = ['admin', 'guru', 'developer']
    const isAllowed = profile ? ALLOWED_ROLES.includes(profile.role?.toLowerCase()) : null

    // access.teacher_raport flag — kalau off, guru jadi read-only
    const { enabled: teacherRaportEnabled } = useFlag('access.teacher_raport')
    const canEdit = profile?.role === 'guru' ? teacherRaportEnabled : true

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
    const [scores, setScoresRaw] = useState({})
    // ── Undo-aware wrapper — push ke history setiap kali scores berubah dari user
    // Ref mutations dijadwalkan via Promise.resolve() agar tidak ter-double di StrictMode
    const setScores = useCallback((updater) => {
        setScoresRaw(prev => {
            const next = typeof updater === 'function' ? updater(prev) : updater
            const hist = scoresHistoryRef.current
            const idx = scoresHistoryIdxRef.current
            // Potong redo-branch jika ada
            const newHist = hist.slice(0, idx + 1)
            newHist.push(JSON.parse(JSON.stringify(next)))
            if (newHist.length > 30) newHist.shift()
            // Jadwalkan setelah render commit — aman dari StrictMode double-invoke
            Promise.resolve().then(() => {
                scoresHistoryRef.current = newHist
                scoresHistoryIdxRef.current = newHist.length - 1
            })
            return next
        })
    }, [])
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
    const [archiveMinAvg, setArchiveMinAvg] = useState('')   // filter rata-rata < X
    const [archivePreview, setArchivePreview] = useState(null)
    const [studentTrend, setStudentTrend] = useState({})
    const [trendModal, setTrendModal] = useState(null) // { student, trendData }

    // ── Archive inline edit state
    const [archiveEditMode, setArchiveEditMode] = useState(false)
    const [archiveEditScores, setArchiveEditScores] = useState({})
    const [archiveEditExtras, setArchiveEditExtras] = useState({})
    const [archiveEditSaving, setArchiveEditSaving] = useState(false)

    // ── Archive tab (list | ringkasan)
    const [archiveTab, setArchiveTab] = useState('list')

    // ── Mobile card — show one at a time with swipe nav
    const [mobileActiveIdx, setMobileActiveIdx] = useState(0)
    // FIX: mobileSwipeRef dihapus (dead code) — swipe pakai _touchStartX lokal di render

    // ── Student detail drawer (full history timeline)
    const [studentDetailDrawer, setStudentDetailDrawer] = useState(null) // null | { student, history: [{month,year,scores}] }
    const [studentDetailLoading, setStudentDetailLoading] = useState(false)

    // ── Bulk ZIP export
    const [zipBlast, setZipBlast] = useState(null) // null | { queue, idx, done, failed, active }

    // ── Offline draft
    const [draftAvailable, setDraftAvailable] = useState(false)
    // FIX: guard navigator.onLine agar tidak throw di SSR / browser extension
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true)

    // ── Modals
    const [showShortcutModal, setShowShortcutModal] = useState(false)
    const [showTutorialModal, setShowTutorialModal] = useState(false)
    const [tutorialStep, setTutorialStep] = useState(0)
    const [tutorialZoomImg, setTutorialZoomImg] = useState(null)
    const [tutorialImgs, setTutorialImgs] = useState([null, null, null, null, null, null, null])

    useEffect(() => {
        if (!showTutorialModal) return
        Promise.all([
            import('../assets/Tutorial_1.png'),
            import('../assets/Tutorial_2.png'),
            import('../assets/Tutorial_3.png'),
            import('../assets/Tutorial_4.png'),
            import('../assets/Tutorial_5.png'),
            import('../assets/Tutorial_6.png'),
            import('../assets/Tutorial_7.png'),
        ]).then(mods => setTutorialImgs(mods.map(m => m.default)))
    }, [showTutorialModal])
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
    const [saveAllConfirm, setSaveAllConfirm] = useState(null) // IMPROVISASI: konfirmasi simpan semua saat ada yg kosong

    // ── Print
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)
    const printContainerRef = useRef(null)
    const [pendingExport, setPendingExport] = useState(null)

    // ── Prev month scores for delta comparison
    const [prevMonthScores, setPrevMonthScores] = useState({})

    // ── UX extras
    const [showIncompleteOnly, setShowIncompleteOnly] = useState(false)
    const [showNoPhoneOnly, setShowNoPhoneOnly] = useState(false)
    const [bulkMode, setBulkMode] = useState(false)
    const [bulkValues, setBulkValues] = useState({})
    const [bulkSelected, setBulkSelected] = useState(new Set())  // UIUX: bulk select state
    const [pendingNav, setPendingNav] = useState(null)
    const [templateOpenId, setTemplateOpenId] = useState(null) // FITUR 3: template catatan per santri
    const [catatanArabMap, setCatatanArabMap] = useState({}) // map studentId → terjemahan Arab catatan

    // FIX 6: global auto-save indicator
    const [globalSaveIndicator, setGlobalSaveIndicator] = useState(null) // null | 'saving' | 'saved'
    const globalSaveTimerRef = useRef(null)
    const [stepVisible, setStepVisible] = useState(true)
    const prevStepRef = useRef(step)
    useEffect(() => {
        if (prevStepRef.current === step) return
        prevStepRef.current = step
        setStepVisible(false)
        const t = setTimeout(() => setStepVisible(true), 80)
        return () => clearTimeout(t)
    }, [step])

    // FIX 5: '/' shortcut fokus ke search kelas di step 0
    const searchInputRef = useRef(null)
    useEffect(() => {
        const handler = (e) => {
            if (step !== 0) return
            if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step])

    // Close template dropdown saat klik di luar
    useEffect(() => {
        if (!templateOpenId) return
        const handler = (e) => {
            if (!e.target.closest('[data-template-anchor]')) setTemplateOpenId(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [templateOpenId])
    // FIX MAJOR: state khusus untuk dismiss floating unsaved bar
    // — agar tombol × tidak memanipulasi savedIds (yang punya fungsi berbeda)
    const [unsavedBarDismissed, setUnsavedBarDismissed] = useState(false)

    // ── Refs
    const cellRefs = useRef({})
    const autoSaveTimers = useRef({})
    // FIX MINOR: Bersihkan semua pending auto-save timer saat komponen unmount.
    useEffect(() => () => Object.values(autoSaveTimers.current).forEach(clearTimeout), [])
    const waBlastAbortRef = useRef(false) // flag abort untuk runWaBlast
    // u2500u2500 Undo history (max 30 snapshots of scores state)
    const scoresHistoryRef = useRef([])
    const scoresHistoryIdxRef = useRef(-1)
    // PERF: Virtual scroll — hanya render baris yang visible + overscan
    const tableScrollRef = useRef(null)
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 30 })
    // ROW_HEIGHT & OVERSCAN kini module-level constants (atas file) — tidak dideklarasi ulang di sini
    const selectedClass = classesList.find(c => c.id === selectedClassId)
    const bulanObj = BULAN.find(b => b.id === selectedMonth)

    // FIX 10: tab title dinamis — harus setelah selectedClass & bulanObj dideklarasi
    useEffect(() => {
        if (step === 2 && selectedClass?.name && bulanObj?.id_str) {
            document.title = `${selectedClass.name} · ${bulanObj.id_str} ${selectedYear} | Laporanmu`
        } else {
            document.title = 'Raport Bulanan | Laporanmu'
        }
        return () => { document.title = 'Laporanmu' }
    }, [step, selectedClass, bulanObj, selectedYear])
    // FIX #3: years dengan useMemo agar referensi stabil
    const years = useMemo(() => [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1], [now])

    // FIX MINOR: filteredStudents dipecah menjadi dua useMemo agar tidak
    // recompute setiap kali guru mengetik nilai.
    const baseFiltered = useMemo(() => {
        let list = students
        if (studentSearch.trim()) list = list.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
        if (showNoPhoneOnly) list = list.filter(s => !s.phone)
        return list
    }, [students, studentSearch, showNoPhoneOnly])

    // FIX MINOR: Saat showIncompleteOnly aktif, baris santri menghilang seketika
    // begitu nilai terakhir diisi — sebelum auto-save sempat jalan, membuat guru panik.
    // Solusi: gunakan snapshot filteredStudents yang di-update dengan debounce 1.5 detik
    // (sama dengan delay auto-save) saat filter "tidak lengkap" aktif.
    const [filteredStudents, setFilteredStudents] = useState(() => students)
    const filteredDebounceRef = useRef(null)
    useEffect(() => {
        const next = showIncompleteOnly
            ? baseFiltered.filter(s => !isComplete(scores[s.id] || {}))
            : baseFiltered
        if (!showIncompleteOnly) {
            // Tanpa filter incomplete — update langsung, tidak perlu debounce
            setFilteredStudents(next)
            return
        }
        // Dengan filter incomplete — debounce agar baris tidak langsung hilang
        // saat nilai terakhir baru saja diketik
        if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current)
        filteredDebounceRef.current = setTimeout(() => setFilteredStudents(next), 1500)
        return () => { if (filteredDebounceRef.current) clearTimeout(filteredDebounceRef.current) }
    }, [baseFiltered, showIncompleteOnly, scores])

    const completedCount = useMemo(() => students.filter(s => isComplete(scores[s.id] || {})).length, [students, scores])
    const progressPct = students.length ? Math.round((completedCount / students.length) * 100) : 0
    // FIX MINOR: useMemo agar tidak dihitung ulang tiap render
    const noPhoneCount = useMemo(() => students.filter(s => !s.phone).length, [students])

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
            try {
                // PERF #1: hanya fetch report bulan ini + 1 report terakhir per kelas
                // Sebelumnya fetch SEMUA history raport — mahal di DB besar
                const [classRes, studRes, curRepRes, lastRepRes] = await Promise.all([
                    supabase.from('classes').select('id, name').order('name'),
                    supabase.from('students').select('id, class_id').is('deleted_at', null),
                    supabase.from('student_monthly_reports')
                        .select('student_id')
                        .eq('month', curMonth).eq('year', curYear),
                    supabase.from('student_monthly_reports')
                        .select('student_id, month, year')
                        .order('year', { ascending: false })
                        .order('month', { ascending: false })
                        .limit(5000),
                ])
                if (classRes.error) throw classRes.error
                if (studRes.error) throw studRes.error
                const classes = classRes.data || []
                const allStudents = studRes.data || []
                const curReports = curRepRes.data || []
                const lastReports = lastRepRes.data || []
                setClassesList(classes)
                setStats({
                    totalKelas: classes.length,
                    totalSiswa: allStudents.length,
                    totalRaport: lastReports.length,
                    bulanIni: curMonth,
                })
                const stuByClass = {}
                for (const s of allStudents) {
                    if (!stuByClass[s.class_id]) stuByClass[s.class_id] = []
                    stuByClass[s.class_id].push(s.id)
                }
                const stuToClass = {}
                for (const s of allStudents) stuToClass[s.id] = s.class_id
                const curDoneSet = new Set(curReports.map(r => r.student_id))
                const lastReportByClass = {}
                for (const r of lastReports) {
                    const cid = stuToClass[r.student_id]
                    if (!cid) continue
                    if (!lastReportByClass[cid]) {
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
            } catch (e) {
                console.error('fetchData error:', e)
            } finally {
                setPageLoading(false)
            }
        }
        fetchData()
    }, [])

    // ── Auto-arsip banner
    useEffect(() => {
        if (!classesList.length) return
        const today = new Date()
        const dayOfMonth = today.getDate()
        // Banner muncul setelah tanggal 20 sampai akhir bulan
        if (dayOfMonth < 20) return
        const prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
        const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()

        // Cek apakah banner bulan ini sudah pernah di-dismiss permanen
        const dismissKey = `banner_dismissed_${prevYear}_${prevMonth}`
        if (localStorage.getItem(dismissKey)) return

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
                // Kelas dianggap belum lengkap kalau ADA santri yang belum punya raport bulan itu
                const missing = classesList.filter(cls => {
                    const ids = stuByClass[cls.id] || []
                    return ids.length > 0 && ids.some(id => !archivedSet.has(id))
                }).map(cls => {
                    const ids = stuByClass[cls.id] || []
                    const filledCount = ids.filter(id => archivedSet.has(id)).length
                    return { class_id: cls.id, class_name: cls.name, filled: filledCount, total: ids.length }
                })
                if (missing.length) setNewMonthBanner({ prevMonth, prevYear, prevMonthStr: BULAN.find(b => b.id === prevMonth)?.id_str || '', classesNotArchived: missing, dismissKey })
            } catch (e) { console.error('Auto-arsip banner check error:', e) }
        }
        check()
    }, [classesList])

    // ── Reset student search when class changes
    useEffect(() => { setStudentSearch(''); setMusyrif(''); setCatatanArabMap({}) }, [selectedClassId])

    // ── FITUR 1: Pin sesi terakhir — baca dari localStorage saat mount
    const [lastSession, setLastSession] = useState(() => {
        try {
            const raw = localStorage.getItem('raport_last_session')
            return raw ? JSON.parse(raw) : null
        } catch { return null }
    })

    // ── Fetch homeroom teacher
    // FIX MINOR: dulu 2 query terpisah (N+1), sekarang 1 query dengan join
    useEffect(() => {
        if (!selectedClassId) { setHomeroomTeacherName(''); return }
        supabase
            .from('classes')
            .select('homeroom_teacher_id, teachers:homeroom_teacher_id(name)')
            .eq('id', selectedClassId)
            .single()
            .then(({ data }) => {
                const name = data?.teachers?.name || ''
                setHomeroomTeacherName(name)
                setMusyrif(prev => prev ? prev : name)
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
    // FIX MAJOR: debounce 500ms — mencegah write tiap keystroke & QuotaExceededError di mobile
    const draftSaveTimerRef = useRef(null)
    useEffect(() => {
        if (step !== 2 || !selectedClassId || !students.length) return
        if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = setTimeout(() => {
            const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
            try {
                const payload = JSON.stringify({ scores, extras, savedAt: Date.now() })
                // Guard: jangan simpan kalau >4MB agar tidak QuotaExceededError
                if (payload.length > 4 * 1024 * 1024) {
                    console.warn('Draft terlalu besar, skip localStorage save')
                    return
                }
                localStorage.setItem(key, payload)
            } catch (e) {
                console.error('Draft localStorage save error:', e)
            }
        }, 500)
        return () => { if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current) }
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

    // ── Ctrl+Z Undo / Ctrl+Y Redo (scores only, step 2)
    useEffect(() => {
        const handler = (e) => {
            if (step !== 2) return
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx > 0) {
                    scoresHistoryIdxRef.current = idx - 1
                    setScoresRaw(JSON.parse(JSON.stringify(hist[idx - 1])))
                    addToast('Undo nilai', 'info')
                }
            } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
                e.preventDefault()
                const hist = scoresHistoryRef.current
                const idx = scoresHistoryIdxRef.current
                if (idx < hist.length - 1) {
                    scoresHistoryIdxRef.current = idx + 1
                    setScoresRaw(JSON.parse(JSON.stringify(hist[idx + 1])))
                    addToast('Redo nilai', 'info')
                }
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [step, addToast])

    // ── Preload print libs
    useEffect(() => {
        const load = (src, check) => new Promise(res => { if (check()) { res(); return }; const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = res; document.head.appendChild(s) })
        load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => !!window.html2canvas)
        load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => !!(window.jspdf?.jsPDF || window.jsPDF))
    }, [])

    // PERF: transliterateToArab sekarang async — lazy load kamus dari translitData.js
    // Kamus hanya di-load saat lang==='ar' pertama kali (≈ 15KB hemat parse awal)
    const transliterateToArab = useCallback(async (name) => {
        const { KATA_ARAB: KA, ASMAUL_HUSNA: AH, DIGRAPH: DG, SINGLE: SG } = await loadTranslitData()
        const latinToArab = (word) => {
            let res = '', i = 0
            while (i < word.length) {
                const two = word.slice(i, i + 2).toLowerCase()
                const di = DG.find(([k]) => k === two)
                if (di) { res += di[1]; i += 2; continue }
                res += SG[word[i].toLowerCase()] || ''
                i++
            }
            return res
        }
        const words = name.toLowerCase().trim().split(/\s+/)
        const result = []
        for (const w of words) {
            if (KA[w]) { result.push(KA[w]); continue }
            const abdulMatch = w.match(/^ab[du]u?l?[-_]?(.+)$/) || w.match(/^abdi[-_]?(.+)$/)
            if (abdulMatch) {
                const suffix = abdulMatch[1]
                if (AH[suffix]) { result.push('عبد ' + AH[suffix]); continue }
                if (suffix === 'llah' || suffix === 'lah' || suffix === 'illah') { result.push('عبد الله'); continue }
            }
            if (w === 'bin' || w === 'ibn' || w === 'ibnu') { result.push('بن'); continue }
            if (w === 'binti' || w === 'bint') { result.push('بنت'); continue }
            if (w.endsWith('uddin') || w.endsWith('udin') || w.endsWith('addin') || w.endsWith('iddin')) {
                const base = w.replace(/(uddin|udin|addin|iddin)$/, '')
                if (KA[base]) { result.push(KA[base] + ' الدين'); continue }
            }
            if (w.startsWith('nur') || w.startsWith('noor')) {
                const suffix = w.replace(/^noo?r[-_]?/, '')
                const sufArab = KA[suffix] || AH[suffix]
                if (sufArab) { result.push('نور ' + sufArab.replace(/^ال/, '')); continue }
            }
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
            const namaArab = await transliterateToArab(s.name)  // PERF: await async lazy-load
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
            // PERF #2: trend data di-fetch terpisah (non-blocking) setelah students render
            // Sebelumnya masuk ke Promise.all — blok load utama 200-500ms ekstra
            setTimeout(() => {
                const trendMonths = []
                for (let i = 5; i >= 0; i--) {
                    let m = month - i, y = year
                    if (m <= 0) { m += 12; y -= 1 }
                    trendMonths.push({ m, y })
                }
                supabase.from('student_monthly_reports')
                    .select('student_id,month,year,nilai_akhlak,nilai_ibadah,nilai_kebersihan,nilai_quran,nilai_bahasa')
                    .in('student_id', ids)
                    .or(trendMonths.map(t => `and(month.eq.${t.m},year.eq.${t.y})`).join(','))
                    .order('year').order('month')
                    .then(({ data: trendData }) => {
                        const trendMap = {}
                        for (const r of (trendData || [])) {
                            if (!trendMap[r.student_id]) trendMap[r.student_id] = []
                            trendMap[r.student_id].push({ month: r.month, year: r.year, scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa } })
                        }
                        setStudentTrend(trendMap)
                    })
            }, 0)
            const prevScoreMap = {}
            for (const r of (prevRepData || [])) {
                prevScoreMap[r.student_id] = { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
            }
            setPrevMonthScores(prevScoreMap)
            const initScores = {}, initExtras = {}, initExisting = {}
            // FIX MAJOR: kumpulkan semua savedId dulu, baru panggil setSavedIds satu kali
            // — mencegah race condition akibat N setState berurutan dalam satu loop
            const initSavedIds = new Set()
            for (const s of (stuData || [])) {
                const rep = repData?.find(r => r.student_id === s.id)
                initScores[s.id] = { nilai_akhlak: rep?.nilai_akhlak ?? '', nilai_ibadah: rep?.nilai_ibadah ?? '', nilai_kebersihan: rep?.nilai_kebersihan ?? '', nilai_quran: rep?.nilai_quran ?? '', nilai_bahasa: rep?.nilai_bahasa ?? '' }
                initExtras[s.id] = { berat_badan: rep?.berat_badan ?? '', tinggi_badan: rep?.tinggi_badan ?? '', ziyadah: rep?.ziyadah ?? '', murojaah: rep?.murojaah ?? '', hari_sakit: rep?.hari_sakit ?? '', hari_izin: rep?.hari_izin ?? '', hari_alpa: rep?.hari_alpa ?? '', hari_pulang: rep?.hari_pulang ?? '', catatan: rep?.catatan ?? '' }
                if (rep) { initExisting[s.id] = rep.id; initSavedIds.add(s.id) }
            }
            let finalStudents = stuData || []
            if (useLang === 'ar') {
                const needs = finalStudents.filter(s => !s.metadata?.nama_arab)
                if (needs.length) {
                    setTransliterating(true)
                    try { finalStudents = await transliterateNames(finalStudents) }
                    finally { setTransliterating(false) }
                }
            }
            // Reset undo history + filters saat load data baru
            scoresHistoryRef.current = [JSON.parse(JSON.stringify(initScores))]
            scoresHistoryIdxRef.current = 0
            setShowNoPhoneOnly(false)
            setShowIncompleteOnly(false)
            // FIX: setScoresRaw (bukan setScores) saat init — history sudah di-reset
            // manual 3 baris di atas, setScores wrapper akan push snapshot duplikat
            setStudents(finalStudents); setScoresRaw(initScores); setExtras(initExtras); setExistingReportIds(initExisting)
            setSavedIds(initSavedIds)
            // FITUR 1: Simpan sesi terakhir ke localStorage
            try {
                const session = { classId, month, year, useLang, className: classesList.find(c => c.id === classId)?.name || '' }
                localStorage.setItem('raport_last_session', JSON.stringify(session))
                setLastSession(session)
            } catch { }
            return true
        } catch (e) { addToast('Gagal memuat siswa: ' + e.message, 'error'); console.error('loadStudents error:', e); return false }
        finally { setLoading(false) }
    }, [selectedClassId, selectedMonth, selectedYear, lang, transliterateNames, addToast])

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
    }, [selectedClassId, selectedMonth, selectedYear, addToast, setScores, setExtras])

    const clearDraft = useCallback(() => {
        const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`
        try { localStorage.removeItem(key); setDraftAvailable(false); addToast('Draft dihapus', 'success') }
        catch (e) { console.error('clearDraft error:', e) }
    }, [selectedClassId, selectedMonth, selectedYear, addToast])

    // ── Save single
    const saveStudent = useCallback(async (studentId) => {
        const sc = scores[studentId], ex = extras[studentId] ?? {}
        if (!sc) return
        setSaving(prev => ({ ...prev, [studentId]: true }))
        try {
            const payload = { student_id: studentId, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null }
            const existingId = existingReportIds[studentId]
            let error
            if (existingId) { ; ({ error } = await supabase.from('student_monthly_reports').update(payload).eq('id', existingId)) }
            else { const { data, error: upsErr } = await supabase.from('student_monthly_reports').upsert(payload, { onConflict: 'student_id,month,year' }).select('id').single(); error = upsErr; if (!upsErr && data) setExistingReportIds(prev => ({ ...prev, [studentId]: data.id })) }
            if (error) throw error
            setSavedIds(prev => new Set([...prev, studentId]))
            await logAudit({
                action: existingId ? 'UPDATE' : 'INSERT',
                source: 'OPERATIONAL',
                tableName: 'student_monthly_reports',
                recordId: existingId || null,
                newData: { student_id: studentId, month: selectedMonth, year: selectedYear, student_name: students.find(s => s.id === studentId)?.name },
            })
        } catch (e) { addToast(`Gagal menyimpan: ${e.message}`, 'error'); console.error('saveStudent error:', e) }
        finally { setSaving(prev => ({ ...prev, [studentId]: false })) }
    }, [scores, extras, selectedMonth, selectedYear, musyrif, existingReportIds, students, addToast])

    // ── Reset student — kosongkan state lokal DAN hapus dari DB jika sudah tersimpan
    const resetStudent = useCallback(async (studentId) => {
        // FIX: cancel auto-save timer terlebih dahulu — timer pending bisa tembak
        // saveStudent() setelah data dikosongkan dan menyimpan data kosong ke DB
        if (autoSaveTimers.current[studentId]) {
            clearTimeout(autoSaveTimers.current[studentId])
            delete autoSaveTimers.current[studentId]
        }
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
            const studentName = students.find(s => s.id === studentId)?.name
            addToast(`Data ${studentName?.split(' ')[0] ?? ''} berhasil direset`, 'success')
            await logAudit({
                action: 'DELETE', source: 'OPERATIONAL', tableName: 'student_monthly_reports', recordId: existingId,
                oldData: { student_id: studentId, student_name: studentName, month: selectedMonth, year: selectedYear }
            })
        } catch (e) {
            addToast(`Gagal hapus dari DB: ${e.message}`, 'error')
            console.error('resetStudent error:', e)
        }
    }, [existingReportIds, students, addToast, setScores])

    const savingAllRef = useRef(false)

    // ── Save all (dengan konfirmasi jika ada nilai kosong)
    const saveAll = useCallback(async () => {
        if (savingAll || savingAllRef.current) return
        savingAllRef.current = true
        // IMPROVISASI: cek apakah ada santri yang belum lengkap, tampilkan konfirmasi
        const hasAnyData = (sc, ex) =>
            KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
            ].some(v => v !== '' && v !== null && v !== undefined)

        const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
        if (!studentsToSave.length) {
            addToast('Belum ada data yang diisi untuk disimpan', 'warning')
            savingAllRef.current = false
            return
        }
        const incomplete = students.filter(s => !isComplete(scores[s.id] || {}))
        if (incomplete.length > 0) {
            setSaveAllConfirm({ completedCount: completedCount, totalCount: students.length, incompleteCount: incomplete.length })
            savingAllRef.current = false
            return
        }
        await _doSaveAll()
    }, [savingAll, students, scores, extras, completedCount]) // eslint-disable-line

    const _doSaveAll = useCallback(async () => {
        setSaveAllConfirm(null)
        setSavingAll(true)
        try {
            const hasAnyData = (sc, ex) =>
                KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                ].some(v => v !== '' && v !== null && v !== undefined)

            const studentsToSave = students.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
            if (!studentsToSave.length) {
                addToast('Belum ada data yang diisi untuk disimpan', 'warning')
                return
            }

            const payloads = studentsToSave.map(s => { const sc = scores[s.id] || {}, ex = extras[s.id] || {}; return { student_id: s.id, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null } })
            // FIX: .select() agar IDs yang baru dibuat dikembalikan dan disimpan
            // ke existingReportIds — tanpa ini saveStudent() berikutnya tidak tahu
            // record sudah ada dan akan coba INSERT lagi (unique constraint error)
            const { data: upserted, error } = await supabase
                .from('student_monthly_reports')
                .upsert(payloads, { onConflict: 'student_id,month,year' })
                .select('id, student_id')
            if (error) throw error
            if (upserted?.length) {
                setExistingReportIds(prev => {
                    const next = { ...prev }
                    for (const r of upserted) next[r.student_id] = r.id
                    return next
                })
            }
            setSavedIds(prev => {
                const next = new Set(prev)
                studentsToSave.forEach(s => next.add(s.id))
                return next
            })
            const skipped = students.length - studentsToSave.length
            addToast(
                skipped > 0
                    ? `${studentsToSave.length} raport disimpan (${skipped} santri dilewati karena belum diisi)`
                    : `${studentsToSave.length} raport berhasil disimpan`,
                'success'
            )
            try { const key = `draft_raport_${selectedClassId}_${selectedMonth}_${selectedYear}`; localStorage.removeItem(key); setDraftAvailable(false) } catch { }
        } catch (e) { addToast(`Gagal menyimpan semua: ${e.message}`, 'error'); console.error('_doSaveAll error:', e) }
        finally { setSavingAll(false); savingAllRef.current = false }
    }, [students, scores, extras, selectedMonth, selectedYear, musyrif, selectedClassId, addToast])

    // Sync ref setelah saveAll terdefinisi — dipakai Ctrl+S handler di atas
    useEffect(() => { saveAllRef.current = saveAll }, [saveAll])

    // Reset dismissed state setiap kali muncul perubahan baru
    useEffect(() => { if (hasUnsavedMemo) setUnsavedBarDismissed(false) }, [hasUnsavedMemo])

    // PERF-3: Virtual scroll handler — update visibleRange saat tabel di-scroll
    // Hanya aktif di step 2 dan kalau jumlah siswa > 20 (tidak perlu untuk kelas kecil)
    useEffect(() => {
        if (step !== 2) return
        const el = tableScrollRef.current
        if (!el) return
        const handleScroll = () => {
            const scrollTop = el.scrollTop
            const viewHeight = el.clientHeight
            const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN)
            const end = Math.min(
                filteredStudents.length,
                Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + OVERSCAN
            )
            setVisibleRange(prev => (prev.start === start && prev.end === end) ? prev : { start, end })
        }
        el.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // initial calculation
        return () => el.removeEventListener('scroll', handleScroll)
    }, [step, filteredStudents.length]) // ROW_HEIGHT & OVERSCAN adalah module-level constants, tidak perlu di dep array

    // Reset visible range setiap filter berubah
    useEffect(() => { setVisibleRange({ start: 0, end: 30 }) }, [filteredStudents])
    // Reset mobile card index juga saat filter/santri berubah
    useEffect(() => { setMobileActiveIdx(0) }, [filteredStudents])

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

    // ── Export XLS (XLSX via SheetJS — lazy load dari CDN)
    const exportXLS = useCallback(async () => {
        if (!window.XLSX) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
                s.onload = res; s.onerror = () => rej(new Error('Gagal memuat library XLSX'))
                document.head.appendChild(s)
            })
        }
        const headers = ['No', 'Nama', 'Akhlak', 'Ibadah', 'Kebersihan', "Al-Qur'an", 'Bahasa', 'Rata-rata', 'Predikat', 'BB(kg)', 'TB(cm)', 'Ziyadah', "Muroja'ah", 'Hari Sakit', 'Hari Izin', 'Hari Alpa', 'Hari Pulang', 'Catatan']
        const rows = students.map((s, i) => {
            const sc = scores[s.id] || {}, ex = extras[s.id] || {}
            const avg = calcAvg(sc)
            const predikat = avg ? GRADE(Number(avg)).id : ''
            return [
                i + 1, s.name,
                sc.nilai_akhlak !== '' ? Number(sc.nilai_akhlak) : '',
                sc.nilai_ibadah !== '' ? Number(sc.nilai_ibadah) : '',
                sc.nilai_kebersihan !== '' ? Number(sc.nilai_kebersihan) : '',
                sc.nilai_quran !== '' ? Number(sc.nilai_quran) : '',
                sc.nilai_bahasa !== '' ? Number(sc.nilai_bahasa) : '',
                avg ? Number(avg) : '', predikat,
                ex.berat_badan !== '' ? Number(ex.berat_badan) : '',
                ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : '',
                ex.ziyadah ?? '', ex.murojaah ?? '',
                ex.hari_sakit !== '' ? Number(ex.hari_sakit) : '',
                ex.hari_izin !== '' ? Number(ex.hari_izin) : '',
                ex.hari_alpa !== '' ? Number(ex.hari_alpa) : '',
                ex.hari_pulang !== '' ? Number(ex.hari_pulang) : '',
                ex.catatan || '',
            ]
        })
        const XLSX = window.XLSX
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        // Styling lebar kolom
        ws['!cols'] = [
            { wch: 4 }, { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 8 },
            { wch: 10 }, { wch: 12 }, { wch: 7 }, { wch: 7 }, { wch: 12 }, { wch: 12 },
            { wch: 10 }, { wch: 9 }, { wch: 9 }, { wch: 10 }, { wch: 30 }
        ]
        const wb = XLSX.utils.book_new()
        const sheetName = `${bulanObj?.id_str || ''} ${selectedYear}`.trim().slice(0, 31)
        XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Raport')
        XLSX.writeFile(wb, `Raport_${selectedClass?.name || ''}_${bulanObj?.id_str || ''}_${selectedYear}.xlsx`)
        addToast(`XLS berhasil diexport (${students.length} santri)`, 'success')
    }, [students, scores, extras, selectedClass, bulanObj, selectedYear, addToast])

    // ── Auto-save
    const triggerAutoSave = useCallback((studentId) => {
        setSavedIds(prev => { const next = new Set(prev); next.delete(studentId); return next })
        if (autoSaveTimers.current[studentId]) clearTimeout(autoSaveTimers.current[studentId])
        // FIX 6: show "Menyimpan..." indicator
        setGlobalSaveIndicator('saving')
        if (globalSaveTimerRef.current) clearTimeout(globalSaveTimerRef.current)
        autoSaveTimers.current[studentId] = setTimeout(() => {
            saveStudent(studentId)
            setGlobalSaveIndicator('saved')
            globalSaveTimerRef.current = setTimeout(() => setGlobalSaveIndicator(null), 2000)
        }, 1500)
    }, [saveStudent])

    // PERF: Stable callback untuk update extras field — diperlukan agar ExtraInput memo()
    // tidak re-render tiap parent render (karena inline arrow selalu buat referensi baru).
    const handleExtraChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
    }, [triggerAutoSave])

    // Sama dengan handleExtraChange tapi juga reset terjemahan Arab catatan
    const handleCatatanChange = useCallback((studentId, key, value) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave])

    // PERF: Stable callback untuk ScoreCell onChange — tiap inline arrow baru = ScoreCell re-render
    const handleScoreChange = useCallback((studentId, key, value) => {
        setScores(prev => ({ ...prev, [studentId]: { ...prev[studentId], [key]: value } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
    }, [triggerAutoSave])

    // Stable: toggle template dropdown per santri
    const handleTemplateToggle = useCallback((studentId) => {
        setTemplateOpenId(prev => prev === studentId ? null : studentId)
    }, [])

    // Stable: apply template catatan ke santri
    const handleTemplateApply = useCallback((studentId, tmpl) => {
        setExtras(prev => ({ ...prev, [studentId]: { ...prev[studentId], catatan: tmpl } }))
        setSavedIds(prev => { const n = new Set(prev); n.delete(studentId); return n })
        triggerAutoSave(studentId)
        setTemplateOpenId(null)
        setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
    }, [triggerAutoSave])

    // Stable: toggle terjemahan Arab catatan
    const handleTranslitToggle = useCallback(async (studentId, catatan, currentArab) => {
        if (currentArab) {
            setCatatanArabMap(prev => { const n = { ...prev }; delete n[studentId]; return n })
        } else {
            const arab = await transliterateToArab(catatan)
            setCatatanArabMap(prev => ({ ...prev, [studentId]: arab }))
        }
    }, [transliterateToArab])

    // Stable: bulk checkbox toggle
    const handleBulkToggle = useCallback((studentId, checked) => {
        setBulkSelected(prev => { const n = new Set(prev); checked ? n.add(studentId) : n.delete(studentId); return n })
    }, [])

    // Stable: PDF preview
    const handlePDF = useCallback((studentId) => {
        setPreviewStudentId(studentId); setStep(3)
    }, [])

    // Stable: reset student — wrap dalam confirmModal
    const handleResetStudent = useCallback((student) => {
        setConfirmModal({
            title: 'Reset Nilai?',
            subtitle: `Semua data ${student.name.split(' ')[0]} akan dikosongkan`,
            body: 'Nilai akademik, hafalan, fisik, dan catatan santri ini akan dihapus permanen dari database.',
            icon: 'danger', variant: 'red', confirmLabel: 'Ya, Reset Semua',
            onConfirm: () => { setConfirmModal(null); resetStudent(student.id) }
        })
    }, [resetStudent])

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
            // Hitung dulu di luar updater agar tidak double-count di StrictMode
            const toCopy = data.filter(rep => {
                const cur = scores[rep.student_id] || {}
                return KRITERIA.every(k => cur[k.key] === '' || cur[k.key] === null || cur[k.key] === undefined)
            })
            const copied = toCopy.length
            setScores(prev => { const next = { ...prev }; for (const rep of toCopy) { next[rep.student_id] = { nilai_akhlak: rep.nilai_akhlak ?? '', nilai_ibadah: rep.nilai_ibadah ?? '', nilai_kebersihan: rep.nilai_kebersihan ?? '', nilai_quran: rep.nilai_quran ?? '', nilai_bahasa: rep.nilai_bahasa ?? '' } }; return next })
            setExtras(prev => { const next = { ...prev }; for (const rep of data) { const cur = next[rep.student_id] || {}; if (!cur.berat_badan && !cur.tinggi_badan) next[rep.student_id] = { ...cur, berat_badan: rep.berat_badan ?? '', tinggi_badan: rep.tinggi_badan ?? '' } }; return next })
            // FIX: jangan wipe seluruh savedIds — hapus hanya ID santri yang
            // benar-benar disalin agar santri lain tidak kehilangan status tersimpan
            const copiedIds = new Set(data.map(rep => rep.student_id))
            setSavedIds(prev => { const next = new Set(prev); for (const id of copiedIds) next.delete(id); return next })
            addToast(`Disalin dari ${BULAN.find(b => b.id === prevMonth)?.id_str} ${prevYear} — ${copied} santri`, 'success')
        } catch (e) { addToast('Gagal menyalin data bulan lalu', 'error'); console.error('copyFromLastMonth error:', e) }
        finally { setCopyingLastMonth(false) }
    }, [selectedClassId, students, selectedMonth, selectedYear, addToast])

    // ── Keyboard nav
    const handleKeyDown = useCallback((e, studentIdx, kriteriaIdx) => {
        // FIX MINOR: Virtual scroll hanya me-render baris yang terlihat.
        // Sebelumnya focus() langsung dipanggil — jika baris tujuan di luar
        // viewport, ref-nya undefined dan fokus gagal diam-diam.
        // Solusi: scroll dulu ke posisi baris tujuan, lalu fokus setelah
        // satu frame agar React sempat merender baris tersebut.
        const focusCell = (si, ki) => {
            const el = cellRefs.current[`${si}-${ki}`]
            if (el) {
                el.focus()
            } else if (tableScrollRef.current) {
                // Baris belum di-render — scroll container ke posisi estimasi
                tableScrollRef.current.scrollTop = si * ROW_HEIGHT
                requestAnimationFrame(() => cellRefs.current[`${si}-${ki}`]?.focus())
            }
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault()
            let nSi = studentIdx, nKi = kriteriaIdx + 1
            if (nKi >= KRITERIA.length) { nKi = 0; nSi = studentIdx + 1 }
            if (nSi >= filteredStudents.length) nSi = 0
            focusCell(nSi, nKi)
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); focusCell(studentIdx + 1, kriteriaIdx) }
        if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(studentIdx - 1, kriteriaIdx) }
        if (e.key === 'ArrowRight') focusCell(studentIdx, kriteriaIdx + 1)
        if (e.key === 'ArrowLeft') focusCell(studentIdx, kriteriaIdx - 1)
    }, [filteredStudents.length])

    // ── Archive
    const loadArchive = useCallback(async () => {
        setArchiveLoading(true)
        try {
            // FIX MAJOR: Supabase membatasi response default 1000 baris.
            // Tanpa paginasi, arsip lama akan terpotong diam-diam tanpa error.
            // Solusi: fetch dalam batch 1000 hingga tidak ada data tersisa.
            const PAGE_SIZE = 1000
            let allReports = []
            let page = 0
            while (true) {
                const { data: batch, error: batchErr } = await supabase
                    .from('student_monthly_reports')
                    .select('student_id, month, year, musyrif_name, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa')
                    .order('year', { ascending: false })
                    .order('month', { ascending: false })
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
                if (batchErr) throw batchErr
                if (!batch?.length) break
                allReports = allReports.concat(batch)
                // Jika batch kurang dari PAGE_SIZE, berarti sudah halaman terakhir
                if (batch.length < PAGE_SIZE) break
                page++
            }
            const reports = allReports
            if (!reports.length) { setArchiveList([]); return }
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
    }, [addToast])

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
    }, [loadStudentTrend, addToast])

    // ── Save archive inline edits back to Supabase
    const saveArchiveEdit = useCallback(async () => {
        if (!archivePreview) return
        setArchiveEditSaving(true)
        try {
            const { students: pStu, entry } = archivePreview
            const payloads = pStu.map(s => {
                const sc = archiveEditScores[s.id] || archivePreview.scores[s.id] || {}
                const ex = archiveEditExtras[s.id] || archivePreview.extras[s.id] || {}
                return {
                    student_id: s.id,
                    month: entry.month,
                    year: entry.year,
                    musyrif_name: archivePreview.musyrif,
                    updated_by: profile?.id ?? null,
                    updated_by_name: profile?.name ?? null,
                    ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])),
                    berat_badan: ex.berat_badan !== '' && ex.berat_badan != null ? Number(ex.berat_badan) : null,
                    tinggi_badan: ex.tinggi_badan !== '' && ex.tinggi_badan != null ? Number(ex.tinggi_badan) : null,
                    ziyadah: ex.ziyadah || null,
                    murojaah: ex.murojaah || null,
                    hari_sakit: ex.hari_sakit !== '' && ex.hari_sakit != null ? Number(ex.hari_sakit) : 0,
                    hari_izin: ex.hari_izin !== '' && ex.hari_izin != null ? Number(ex.hari_izin) : 0,
                    hari_alpa: ex.hari_alpa !== '' && ex.hari_alpa != null ? Number(ex.hari_alpa) : 0,
                    hari_pulang: ex.hari_pulang !== '' && ex.hari_pulang != null ? Number(ex.hari_pulang) : 0,
                    catatan: ex.catatan || null,
                }
            })
            const { error } = await supabase.from('student_monthly_reports').upsert(payloads, { onConflict: 'student_id,month,year' })
            if (error) throw error
            // Merge edits back into archivePreview so preview reflects saved data
            setArchivePreview(prev => {
                if (!prev) return prev
                const mergedScores = { ...prev.scores }
                const mergedExtras = { ...prev.extras }
                for (const sid of Object.keys(archiveEditScores)) mergedScores[sid] = { ...mergedScores[sid], ...archiveEditScores[sid] }
                for (const sid of Object.keys(archiveEditExtras)) mergedExtras[sid] = { ...mergedExtras[sid], ...archiveEditExtras[sid] }
                return { ...prev, scores: mergedScores, extras: mergedExtras }
            })
            setArchiveEditScores({})
            setArchiveEditExtras({})
            setArchiveEditMode(false)
            addToast(`${pStu.length} raport arsip berhasil diperbarui`, 'success')
        } catch (e) { addToast('Gagal menyimpan: ' + e.message, 'error') }
        finally { setArchiveEditSaving(false) }
    }, [archivePreview, archiveEditScores, archiveEditExtras, addToast])

    // ── Load full monthly history for student detail drawer
    const openStudentDetailDrawer = useCallback(async (student) => {
        setStudentDetailLoading(true)
        setStudentDetailDrawer({ student, history: null })
        try {
            const { data, error } = await supabase
                .from('student_monthly_reports')
                .select('month, year, nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa, catatan, musyrif_name')
                .eq('student_id', student.id)
                .order('year', { ascending: true })
                .order('month', { ascending: true })
            if (error) throw error
            const history = (data || []).map(r => ({
                month: r.month, year: r.year,
                musyrif: r.musyrif_name,
                catatan: r.catatan,
                scores: { nilai_akhlak: r.nilai_akhlak, nilai_ibadah: r.nilai_ibadah, nilai_kebersihan: r.nilai_kebersihan, nilai_quran: r.nilai_quran, nilai_bahasa: r.nilai_bahasa }
            }))
            setStudentDetailDrawer({ student, history })
        } catch (e) {
            addToast('Gagal memuat histori santri: ' + e.message, 'error')
            setStudentDetailDrawer(null)
        } finally { setStudentDetailLoading(false) }
    }, [addToast])

    const executeDeleteArchive = useCallback(async (entry) => {
        setConfirmDelete(null)
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)
            if (!ids.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const { data: toDelete } = await supabase.from('student_monthly_reports').select('id').in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            if (!toDelete?.length) { setArchiveList(prev => prev.filter(a => a.key !== entry.key)); addToast('Arsip berhasil dihapus', 'success'); return }
            const { error: delErr } = await supabase.from('student_monthly_reports').delete().in('id', toDelete.map(r => r.id))
            if (delErr) throw delErr
            setArchiveList(prev => prev.filter(a => a.key !== entry.key))
            addToast('Arsip berhasil dihapus', 'success')
            await logAudit({
                action: 'DELETE', tableName: 'student_monthly_reports', recordId: null,
                oldData: { archive_month: entry.month, archive_year: entry.year, class_id: entry.class_id, count: toDelete.length }
            })
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

    const generatePDFBlob = useCallback(async (student, contextOverride = {}) => {
        await Promise.all([
            new Promise((res, rej) => { if (window.html2canvas) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
            new Promise((res, rej) => { if (window.jspdf?.jsPDF || window.jsPDF) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
        ])
        const activeBulanObj = contextOverride.bulanObj ?? bulanObj
        const activeYear = contextOverride.year ?? selectedYear
        const bulanStr = activeBulanObj?.id_str || String(contextOverride.month ?? selectedMonth)
        const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        const filename = `${safeName}_${bulanStr}_${activeYear}.pdf`
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
        waBlastAbortRef.current = false // reset flag setiap blast baru dimulai
        setWaBlast({ queue, idx: 0, done: 0, failed: 0, active: true })
        let done = 0, failed = 0
        for (let i = 0; i < queue.length; i++) {
            // Cek abort flag di setiap iterasi — set oleh tombol Batalkan
            if (waBlastAbortRef.current) {
                addToast(`WA Blast dibatalkan — ${done} terkirim, ${queue.length - done - failed} dibatalkan`, 'warning')
                setWaBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
                return
            }
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

    // ── Bulk ZIP export (after generatePDFBlob so no TDZ)
    const runZipBlast = useCallback(async (stuList, archEntry) => {
        if (!window.JSZip) {
            await new Promise((res, rej) => {
                const s = document.createElement('script')
                s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
                s.onload = res; s.onerror = rej
                document.head.appendChild(s)
            })
        }
        setZipBlast({ queue: stuList, idx: 0, done: 0, failed: 0, active: true })
        const zip = new window.JSZip()
        let done = 0, failed = 0
        const bulanStr = archEntry ? (BULAN.find(b => b.id === archEntry.month)?.id_str || '') : (BULAN.find(b => b.id === selectedMonth)?.id_str || '')
        const yearStr = archEntry ? archEntry.year : selectedYear
        for (let i = 0; i < stuList.length; i++) {
            const student = stuList[i]
            setZipBlast(prev => prev ? { ...prev, idx: i } : null)
            try {
                setPreviewStudentId(student.id)
                await new Promise(r => setTimeout(r, 350))
                const archCtx = archEntry ? { bulanObj: BULAN.find(b => b.id === archEntry.month), year: archEntry.year, month: archEntry.month } : {}
                const { blob, filename } = await generatePDFBlob(student, archCtx)
                zip.file(filename, blob)
                done++
            } catch (e) { failed++; console.error('ZIP item error:', e) }
            setZipBlast(prev => prev ? { ...prev, done, failed } : null)
        }
        try {
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const url = URL.createObjectURL(zipBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Raport_${archEntry?.class_name || selectedClass?.name || 'Kelas'}_${bulanStr}_${yearStr}.zip`
            a.click()
            setTimeout(() => URL.revokeObjectURL(url), 5000)
            setZipBlast(prev => prev ? { ...prev, active: false, done, failed } : null)
            addToast(`ZIP berhasil: ${done} raport diunduh`, 'success')
        } catch (e) { addToast('Gagal membuat ZIP: ' + e.message, 'error'); setZipBlast(null) }
    }, [generatePDFBlob, selectedMonth, selectedYear, selectedClass, addToast])

    // ─── Render helpers ───────────────────────────────────────────────────────

    const renderStep0 = () => (
        <div className="space-y-6">
            {/* Banner */}
            {newMonthBanner && (
                <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5"><FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" /></div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[var(--color-text)] mb-0.5">Raport {newMonthBanner.prevMonthStr} {newMonthBanner.prevYear} belum lengkap!</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mb-2">
                            {newMonthBanner.classesNotArchived.length} kelas masih ada santri yang belum diisi:{' '}
                            <span className="font-bold text-amber-600">{newMonthBanner.classesNotArchived.map(c => c.class_name).join(', ')}</span>
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                            {newMonthBanner.classesNotArchived.map(cls => (
                                <button key={cls.class_id} onClick={() => { setSelectedClassId(cls.class_id); setSelectedMonth(newMonthBanner.prevMonth); setSelectedYear(newMonthBanner.prevYear); const clsObj = classesList.find(c => c.id === cls.class_id); if (clsObj) { const n = (clsObj.name || '').toLowerCase(); setLang(n.includes('boarding') || n.includes('pondok') ? 'ar' : 'id') }; setStep(1) }} className="h-7 px-3 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-700 text-[9px] font-black hover:bg-amber-500/25 transition-all flex items-center gap-1.5">
                                    <FontAwesomeIcon icon={faBolt} className="text-[8px]" />
                                    {cls.class_name}
                                    <span className="opacity-70">({cls.filled}/{cls.total})</span>
                                </button>
                            ))}
                            <div className="flex items-center gap-1.5 ml-auto">
                                <button onClick={() => setNewMonthBanner(null)} className="h-7 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black hover:text-[var(--color-text)] transition-all">
                                    Nanti
                                </button>
                                <button onClick={() => { localStorage.setItem(newMonthBanner.dismissKey, '1'); setNewMonthBanner(null) }} className="h-7 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black hover:text-[var(--color-text)] transition-all">
                                    Jangan ingatkan lagi
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* FITUR 1: Banner lanjut sesi terakhir */}
            {lastSession && classesList.find(c => c.id === lastSession.classId) && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faBolt} className="text-indigo-500 text-xs" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-[var(--color-text)]">Lanjutkan yang tadi?</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-medium truncate">
                            {lastSession.className} · {BULAN.find(b => b.id === lastSession.month)?.id_str} {lastSession.year}
                        </p>
                    </div>
                    <button
                        onClick={async () => {
                            setSelectedClassId(lastSession.classId)
                            setSelectedMonth(lastSession.month)
                            setSelectedYear(lastSession.year)
                            setLang(lastSession.useLang)
                            const ok = await loadStudents(lastSession.classId, lastSession.month, lastSession.year, lastSession.useLang)
                            if (ok) setStep(2)
                        }}
                        className="h-7 px-3 rounded-lg bg-indigo-500 text-white text-[9px] font-black hover:bg-indigo-600 transition-all shrink-0"
                    >
                        Buka →
                    </button>
                    <button
                        onClick={() => { localStorage.removeItem('raport_last_session'); setLastSession(null) }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all shrink-0"
                        aria-label="Tutup"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-[9px]" />
                    </button>
                </div>
            )}
            {/* Kelas Grid */}
            <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3 flex items-center gap-1.5"><FontAwesomeIcon icon={faSchool} className="opacity-60" /> Pilih Kelas</p>
                {filteredClasses.length === 0 && !pageLoading ? (
                    <div className="text-center py-16 rounded-2xl border-2 border-dashed border-[var(--color-border)]">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center mx-auto mb-4">
                            <FontAwesomeIcon icon={searchQuery ? faMagnifyingGlass : faSchool} className="text-2xl text-[var(--color-text-muted)] opacity-40" />
                        </div>
                        <p className="text-[13px] font-black text-[var(--color-text-muted)] mb-1">
                            {searchQuery ? `Kelas "${searchQuery}" tidak ditemukan` : 'Belum ada kelas'}
                        </p>
                        <p className="text-[11px] text-[var(--color-text-muted)] opacity-60">
                            {searchQuery ? 'Coba kata kunci lain atau hapus filter.' : 'Tambahkan kelas di menu Master → Kelas terlebih dahulu.'}
                        </p>
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="mt-3 h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                Hapus Filter
                            </button>
                        )}
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
                                            const ok = await loadStudents(cls.id, m, y, l); if (ok) setStep(2)
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
                                                <div className="flex-1 flex items-center gap-1.5">
                                                    <div className="flex-1 h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
                                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: isDone ? '#10b981' : isPartial ? '#f59e0b' : '#e5e7eb' }} />
                                                    </div>
                                                    <span className="text-[8px] font-black shrink-0" style={{ color: isDone ? '#10b981' : isPartial ? '#f59e0b' : 'var(--color-text-muted)' }}>{pct}%</span>
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
                        {years.map(y => <option key={y} value={y}>{y}</option>)} {/* FIX: value prop diperlukan agar onChange tidak kirim string kosong di Firefox */}
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
                <button onClick={async () => { if (!selectedClassId) { addToast('Pilih kelas terlebih dahulu', 'warning'); return }; const ok = await loadStudents(); if (ok) setStep(2) }} disabled={!selectedClassId || loading} className="flex-1 h-12 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
                    {transliterating ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mentransliterasi...</> : loading ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Memuat siswa...</> : <><FontAwesomeIcon icon={faChevronRight} /> Mulai Input Nilai</>}
                </button>
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-2">
            {/* ── ROW 1: konteks + aksi utama ── */}
            <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
                <button onClick={() => {
                    if (hasUnsavedMemo) {
                        setPendingNav({ action: () => { setStep(0); setSelectedClassId('') } })
                        return
                    }
                    setStep(0); setSelectedClassId('')
                }} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5 shrink-0"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Ganti Kelas</button>
                {!isOnline && <span className="h-8 px-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[9px] font-black flex items-center gap-1.5 shrink-0"><FontAwesomeIcon icon={faWifi} className="text-[9px] opacity-50" /> Offline</span>}
                {draftAvailable && (
                    <div className="flex items-center gap-1 h-8 px-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[9px] font-black shrink-0">
                        <FontAwesomeIcon icon={faCircleInfo} className="text-[9px]" />
                        <span>Draft tersedia</span>
                        <button onClick={loadDraft} className="ml-1 underline hover:no-underline">Muat</button>
                        <button onClick={clearDraft} aria-label="Hapus draft" className="text-[var(--color-text-muted)] hover:text-rose-500 ml-0.5"><FontAwesomeIcon icon={faXmark} className="text-[8px]" /></button>
                    </div>
                )}
                {/* Kelas + bulan badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] shrink-0"><FontAwesomeIcon icon={faSchool} className="text-emerald-500 text-xs" /><span className="text-[10px] font-black text-[var(--color-text)]">{selectedClass?.name}</span><span className="text-[var(--color-text-muted)] text-[10px]">·</span><span className="text-[10px] font-bold text-[var(--color-text-muted)]">{bulanObj?.id_str} {selectedYear}</span></div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex-1 h-2 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden min-w-[60px]"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressPct === 100 ? '#10b981' : progressPct > 50 ? '#6366f1' : '#f59e0b' }} /></div>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)] whitespace-nowrap shrink-0">{completedCount}/{students.length} lengkap</span>
                </div>
                {/* Salin bulan lalu */}
                <button onClick={copyFromLastMonth} disabled={copyingLastMonth} className="h-8 px-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-sky-500/20 transition-all disabled:opacity-50 shrink-0"><FontAwesomeIcon icon={copyingLastMonth ? faSpinner : faChevronLeft} className={copyingLastMonth ? 'animate-spin' : ''} /> Salin Bln Lalu</button>
                {/* Simpan Semua */}
                <button onClick={saveAll} disabled={savingAll || !canEdit} className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 relative disabled:opacity-70 shrink-0">
                    <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin text-[9px]' : 'text-[9px]'} />{savingAll ? 'Menyimpan...' : !canEdit ? 'Read-only' : 'Simpan Semua'}
                    {!savingAll && hasUnsavedMemo && <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white animate-pulse" />}
                </button>
                {/* Preview & Cetak — CTA utama selalu terlihat */}
                <button onClick={() => setStep(3)} className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-1.5 shrink-0"><FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px]" /> Preview & Cetak</button>
            </div>
            {/* ── ROW 2: tools, export, filter, search ── */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Navigasi hint */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)]"><FontAwesomeIcon icon={faBolt} className="text-amber-500 text-[10px]" /><span className="text-[9px] text-[var(--color-text-muted)] font-bold">Navigasi: <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Tab</kbd>/<kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Enter</kbd> · <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">↑↓←→</kbd> · <kbd className="px-1 py-0.5 rounded bg-[var(--color-border)] text-[8px] font-mono">Ctrl+S</kbd></span></div>
                {/* Search */}
                <div className="relative"><FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px] pointer-events-none" /><input type="text" placeholder="Cari santri..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} className="h-8 pl-7 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[11px] font-bold text-[var(--color-text)] outline-none focus:border-indigo-500/50 transition-all w-36" />{studentSearch && <button onClick={() => setStudentSearch('')} aria-label="Bersihkan pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} className="text-[10px]" /></button>}</div>
                {/* Filter belum lengkap */}
                <button onClick={() => setShowIncompleteOnly(v => !v)} className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1.5 transition-all ${showIncompleteOnly ? 'bg-rose-500/15 border-rose-500/30 text-rose-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                    <FontAwesomeIcon icon={faFilter} className="text-[9px]" />
                    {showIncompleteOnly ? `Belum lengkap (${filteredStudents.length})` : 'Semua'}
                </button>
                {/* Badge santri tanpa WA — klik untuk filter */}
                {noPhoneCount > 0 && (
                    <button
                        onClick={() => { setShowNoPhoneOnly(v => !v); setShowIncompleteOnly(false) }}
                        title={`${noPhoneCount} santri belum ada nomor WA — klik untuk filter`}
                        className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1.5 transition-all ${showNoPhoneOnly ? 'bg-amber-500/15 border-amber-500/30 text-amber-700' : 'bg-amber-500/8 border-amber-500/20 text-amber-600 hover:bg-amber-500/15'}`}
                    >
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[9px]" />
                        {noPhoneCount} tanpa WA
                        {showNoPhoneOnly && <FontAwesomeIcon icon={faXmark} className="text-[8px] ml-0.5 opacity-70" />}
                    </button>
                )}
                {/* Shortcut modal */}
                <button onClick={() => setShowShortcutModal(true)} aria-label="Lihat keyboard shortcuts" className="h-8 w-8 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[10px] font-black flex items-center justify-center hover:text-[var(--color-text)] transition-all" title="Keyboard shortcuts (?)">
                    <FontAwesomeIcon icon={faKeyboard} className="text-[9px]" />
                </button>
                {/* Isi Massal */}
                <button onClick={() => { setBulkMode(v => !v); setBulkValues({}); setBulkSelected(new Set()) }} className={`h-8 px-3 rounded-lg border text-[10px] font-black flex items-center gap-1.5 transition-all ${bulkMode ? 'bg-violet-500/15 border-violet-500/30 text-violet-600' : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                    <FontAwesomeIcon icon={faFillDrip} className="text-[9px]" />
                    {bulkMode ? `Isi Massal${bulkSelected.size > 0 ? ` (${bulkSelected.size})` : ''}` : 'Isi Massal'}
                </button>
                <div className="flex-1" />
                {/* Export tools — dikumpulkan di kanan */}
                <button onClick={exportCSV} className="h-8 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-teal-500/20 transition-all"><FontAwesomeIcon icon={faFileExport} className="text-[9px]" /> CSV</button>
                <button onClick={exportXLS} className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-emerald-500/20 transition-all" title="Export Excel (.xlsx) — mendukung warna sel & karakter Arab"><FontAwesomeIcon icon={faFileExport} className="text-[9px]" /> XLS</button>
                <button onClick={() => { const completed = students.filter(s => isComplete(scores[s.id] || {})); if (!completed.length) { addToast('Belum ada nilai lengkap untuk diunduh', 'warning'); return }; runZipBlast(completed, null) }} className="h-8 px-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-sky-500/20 transition-all" title="Download semua raport lengkap sebagai ZIP"><FontAwesomeIcon icon={faFileZipper} className="text-[9px]" /> ZIP</button>
                <button onClick={() => {
                    const withPhone = students.filter(s => s.phone && isComplete(scores[s.id] || {}))
                    if (!withPhone.length) { addToast('Tidak ada santri dengan nomor WA dan nilai lengkap', 'warning'); return }
                    setWaBlastConfirm({ queue: withPhone })
                }} className="h-8 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-[10px] font-black flex items-center gap-1.5 hover:bg-green-500/20 transition-all">
                    <FontAwesomeIcon icon={faWhatsapp} className="text-[9px]" /> Kirim WA
                </button>
            </div>
            {/* UIUX: Bulk selected action bar */}
            {bulkMode && bulkSelected.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-500/5 animate-in slide-in-from-top-1 duration-200">
                    <span className="text-[10px] font-black text-violet-600">{bulkSelected.size} santri dipilih</span>
                    <div className="flex-1" />
                    <button onClick={async () => {
                        const selected = students.filter(s => bulkSelected.has(s.id))
                        if (!selected.length) return
                        // BUG FIX: filter santri kosong sama seperti saveAll
                        const hasAnyData = (sc, ex) =>
                            KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) ||
                            [ex.berat_badan, ex.tinggi_badan, ex.ziyadah, ex.murojaah,
                            ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan
                            ].some(v => v !== '' && v !== null && v !== undefined)
                        const toSave = selected.filter(s => hasAnyData(scores[s.id] || {}, extras[s.id] || {}))
                        if (!toSave.length) { addToast('Santri yang dipilih belum ada yang diisi nilainya', 'warning'); return }
                        setSavingAll(true)
                        try {
                            const payloads = toSave.map(s => { const sc = scores[s.id] || {}, ex = extras[s.id] || {}; return { student_id: s.id, month: selectedMonth, year: selectedYear, musyrif_name: musyrif, updated_by: profile?.id ?? null, updated_by_name: profile?.name ?? null, ...Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, v === '' ? null : Number(v)])), berat_badan: ex.berat_badan !== '' ? Number(ex.berat_badan) : null, tinggi_badan: ex.tinggi_badan !== '' ? Number(ex.tinggi_badan) : null, ziyadah: ex.ziyadah || null, murojaah: ex.murojaah || null, hari_sakit: ex.hari_sakit !== '' ? Number(ex.hari_sakit) : 0, hari_izin: ex.hari_izin !== '' ? Number(ex.hari_izin) : 0, hari_alpa: ex.hari_alpa !== '' ? Number(ex.hari_alpa) : 0, hari_pulang: ex.hari_pulang !== '' ? Number(ex.hari_pulang) : 0, catatan: ex.catatan || null } })
                            const { data: upserted, error } = await supabase.from('student_monthly_reports').upsert(payloads, { onConflict: 'student_id,month,year' }).select('id, student_id')
                            if (error) throw error
                            if (upserted?.length) {
                                setExistingReportIds(prev => {
                                    const next = { ...prev }
                                    for (const r of upserted) next[r.student_id] = r.id
                                    return next
                                })
                            }
                            setSavedIds(prev => { const n = new Set(prev); toSave.forEach(s => n.add(s.id)); return n })
                            const skipped = selected.length - toSave.length
                            addToast(skipped > 0 ? `${toSave.length} disimpan, ${skipped} dilewati (kosong)` : `${toSave.length} raport tersimpan`, 'success')
                            setBulkSelected(new Set())
                        } catch (e) { addToast('Gagal simpan: ' + e.message, 'error') }
                        finally { setSavingAll(false) }
                    }} disabled={savingAll} className="h-7 px-3 rounded-lg bg-emerald-500 text-white text-[9px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 disabled:opacity-60">
                        <FontAwesomeIcon icon={savingAll ? faSpinner : faFloppyDisk} className={savingAll ? 'animate-spin text-[8px]' : 'text-[8px]'} />
                        Simpan Dipilih
                    </button>
                    <button onClick={() => {
                        const withPhone = students.filter(s => bulkSelected.has(s.id) && s.phone && isComplete(scores[s.id] || {}))
                        if (!withPhone.length) { addToast('Tidak ada santri terpilih dengan WA & nilai lengkap', 'warning'); return }
                        setWaBlastConfirm({ queue: withPhone })
                    }} className="h-7 px-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-[9px] font-black flex items-center gap-1.5 hover:bg-green-500/20 transition-all">
                        <FontAwesomeIcon icon={faWhatsapp} className="text-[8px]" /> WA Dipilih
                    </button>
                    <button onClick={() => setBulkSelected(new Set())} className="h-7 px-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black hover:text-[var(--color-text)] transition-all">
                        Batalkan
                    </button>
                </div>
            )}
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
                            // FIX: hitung changedIds dari scores state saat ini (SEBELUM setScores)
                            // agar changedIds.forEach(triggerAutoSave) berjalan dengan data yang benar.
                            // Sebelumnya changedIds di-push di dalam updater → sudah kosong saat forEach jalan.
                            const changedIds = students
                                .filter(s => {
                                    const cur = scores[s.id] || {}
                                    return keys.some(k => cur[k] === '' || cur[k] === null || cur[k] === undefined)
                                })
                                .map(s => s.id)
                            if (!changedIds.length) {
                                addToast('Semua santri sudah memiliki nilai untuk kolom ini', 'warning')
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
                            addToast(`Nilai massal diterapkan ke ${changedIds.length} santri`, 'success')
                            // FIX: tutup panel Isi Massal setelah Terapkan
                            setBulkMode(false)
                        }} className="h-7 px-3 rounded-lg bg-violet-500 text-white text-[9px] font-black hover:bg-violet-600 transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faCheck} className="text-[8px]" /> Terapkan
                        </button>
                        <button onClick={() => setBulkValues({})} className="h-7 px-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-[9px] font-black hover:text-[var(--color-text)] transition-all">Reset</button>
                    </div>
                </div>
            )}
            {/* UIUX: Desktop table (md+) */}
            <div className="hidden md:block">
                <div
                    ref={tableScrollRef}
                    className="overflow-x-auto rounded-2xl border border-[var(--color-border)]"
                    style={{ maxHeight: filteredStudents.length > 20 ? '70vh' : 'none', overflowY: filteredStudents.length > 20 ? 'auto' : 'visible' }}
                >
                    <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                        <colgroup>
                            {bulkMode && <col style={{ width: 36 }} />}
                            <col style={{ width: 200 }} />{KRITERIA.map(k => <col key={k.key} style={{ width: 48 }} />)}<col style={{ width: 192 }} /><col style={{ width: 155 }} /><col style={{ width: 125 }} />
                        </colgroup>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                            <tr style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)' }}>
                                {bulkMode && (
                                    <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', background: 'var(--color-surface-alt)' }}>
                                        <input type="checkbox"
                                            checked={bulkSelected.size === filteredStudents.length && filteredStudents.length > 0}
                                            onChange={e => setBulkSelected(e.target.checked ? new Set(filteredStudents.map(s => s.id)) : new Set())}
                                            aria-label="Pilih semua"
                                            className="w-3.5 h-3.5 accent-violet-500 cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] sticky left-0 z-10" style={{ background: 'var(--color-surface-alt)', padding: '10px 12px', verticalAlign: 'middle' }}>Santri</th>
                                {KRITERIA.map(k => (<th key={k.key} style={{ padding: '10px 4px', textAlign: 'center', verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ direction: 'rtl', fontSize: 14, fontWeight: 900, color: k.color, lineHeight: 1, whiteSpace: 'nowrap', fontFamily: 'serif' }}>{k.arShort}</span><span style={{ fontSize: 8, fontWeight: 800, color: 'var(--color-text-muted)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{k.id}</span></div></th>))}
                                <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Fisik</span><span style={{ fontSize: 8, color: 'var(--color-text-muted)', opacity: 0.55, fontWeight: 600 }}>BB · TB · Skt · Izin · Alpa · Plg</span></div></th>
                                <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}><span style={{ fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Hafalan</span></div></th>
                                <th style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle', fontSize: 10, fontWeight: 900, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* PERF-3: Virtual scroll — spacer atas */}
                            {filteredStudents.length > 20 && visibleRange.start > 0 && (
                                <tr style={{ height: visibleRange.start * ROW_HEIGHT }}><td colSpan={99} /></tr>
                            )}
                            {/* Empty state saat filter tidak menemukan siswa */}
                            {filteredStudents.length === 0 && (
                                <tr>
                                    <td colSpan={99} className="py-14 text-center">
                                        <div className="flex flex-col items-center gap-3 text-[var(--color-text-muted)]">
                                            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                                                <FontAwesomeIcon icon={showIncompleteOnly ? faCircleCheck : showNoPhoneOnly ? faCircleCheck : faMagnifyingGlass} className="text-xl opacity-30" />
                                            </div>
                                            <div>
                                                <p className="text-[12px] font-black mb-0.5">
                                                    {showIncompleteOnly ? 'Semua nilai sudah lengkap! 🎉' : showNoPhoneOnly ? 'Semua santri sudah ada nomor WA ✓' : 'Santri tidak ditemukan'}
                                                </p>
                                                <p className="text-[10px] opacity-60">
                                                    {showIncompleteOnly ? 'Tidak ada santri yang nilainya belum diisi.' : showNoPhoneOnly ? 'Tidak ada santri tanpa nomor WA di kelas ini.' : `Tidak ada santri dengan nama "${studentSearch}".`}
                                                </p>
                                            </div>
                                            <button onClick={() => { setShowIncompleteOnly(false); setShowNoPhoneOnly(false); setStudentSearch('') }}
                                                className="h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">
                                                Tampilkan Semua
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {/* Render hanya baris visible + overscan */}
                            {(filteredStudents.length > 20
                                ? filteredStudents.slice(visibleRange.start, visibleRange.end)
                                : filteredStudents
                            ).map((student, _vi) => {
                                const si = filteredStudents.length > 20 ? visibleRange.start + _vi : _vi
                                const sc = scores[student.id] || {}, ex = extras[student.id] || {}
                                const avg = calcAvg(sc)
                                const isSaved = savedIds.has(student.id), isSaving = !!saving[student.id]
                                const isDirty = !isSaved && (KRITERIA.some(k => sc[k.key] !== '' && sc[k.key] !== null && sc[k.key] !== undefined) || [ex.berat_badan, ex.tinggi_badan, ex.hari_sakit, ex.hari_izin, ex.hari_alpa, ex.hari_pulang, ex.catatan].some(v => v !== '' && v !== null && v !== undefined))
                                return (
                                    <StudentRow key={student.id}
                                        student={student} si={si} sc={sc} ex={ex}
                                        isSaved={isSaved} isSaving={isSaving} isDirty={isDirty}
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
                            {/* PERF-3: Virtual scroll — spacer bawah */}
                            {filteredStudents.length > 20 && visibleRange.end < filteredStudents.length && (
                                <tr style={{ height: (filteredStudents.length - visibleRange.end) * ROW_HEIGHT }}><td colSpan={99} /></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div> {/* end hidden md:block */}

            {/* ── UIUX: Mobile card view (< md) ── */}
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
                                    style={{ background: complete ? '#10b98108' : 'var(--color-surface-alt)' }}>
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
                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-1.5">Fisik & Kehadiran</p>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {[{ key: 'berat_badan', label: 'BB', icon: faWeightScale, color: '#6366f1', unit: 'kg' }, { key: 'tinggi_badan', label: 'TB', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' }, { key: 'hari_sakit', label: 'Sakit', icon: faBandage, color: '#ef4444', unit: 'hr' }, { key: 'hari_izin', label: 'Izin', icon: faCircleExclamation, color: '#f59e0b', unit: 'hr' }, { key: 'hari_alpa', label: 'Alpa', icon: faTriangleExclamation, color: '#ef4444', unit: 'hr' }, { key: 'hari_pulang', label: 'Pulang', icon: faDoorOpen, color: '#8b5cf6', unit: 'x' }].map(f => (
                                                <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden" style={{ height: 32 }}>
                                                    <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                                    <ExtraInput type="number" inputMode="decimal" placeholder={f.label} value={ex[f.key] ?? ''} studentId={student.id} fieldKey={f.key} onCommit={handleExtraChange}
                                                        className="flex-1 w-0 h-full text-[11px] font-bold text-center bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
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
                            <p className="text-center text-[8px] text-[var(--color-text-muted)] mt-1 opacity-50">← geser kartu untuk pindah santri →</p>
                        </div>
                    )
                })()}
            </div>{/* end md:hidden */}

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
                        <div className="shadow-2xl"><RaportPrintCard student={previewStudent} scores={scores[previewStudent.id]} extra={extras[previewStudent.id]} bulanObj={bulanObj} tahun={selectedYear} musyrif={musyrif} className={selectedClass?.name} lang={lang} settings={settings} catatanArab={catatanArabMap[previewStudent?.id]} /></div>
                    </div>
                )}
            </div>
        )
    }

    const renderStep4 = () => {
        // FIX: archiveMinAvg sebelumnya hanya punya UI tapi TIDAK dipakai di filter (dead UI)
        // Logika: filter kelas yang persentase kelengkapannya DI BAWAH angka yang dimasukkan
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
        if (archivePreview) {
            const { students: pStu, scores: pSc, extras: pEx, bulanObj: pBulan, tahun: pTahun, musyrif: pMus, className: pClass, lang: pLang, entry } = archivePreview
            // Merge edit overrides into display data
            const editSc = (sid) => archiveEditMode ? { ...pSc[sid], ...(archiveEditScores[sid] || {}) } : pSc[sid]
            const editEx = (sid) => archiveEditMode ? { ...pEx[sid], ...(archiveEditExtras[sid] || {}) } : pEx[sid]
            const pStudent = previewStudentId ? pStu.find(s => s.id === previewStudentId) : pStu[0]
            return (
                <div className="space-y-3">
                    {/* ── toolbar */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={() => { setArchivePreview(null); setArchiveEditMode(false); setArchiveEditScores({}); setArchiveEditExtras({}) }} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali Arsip</button>
                        <div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name} · {BULAN.find(b => b.id === entry.month)?.id_str} {entry.year}</div>
                        <div className="flex-1" />
                        {/* Edit mode toggle */}
                        {!archiveEditMode ? (
                            <button onClick={() => { setArchiveEditMode(true); setArchiveEditScores({}); setArchiveEditExtras({}) }} className="h-8 px-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-600 text-[10px] font-black hover:bg-violet-500/20 transition-all flex items-center gap-1.5">
                                <FontAwesomeIcon icon={faSliders} className="text-[9px]" /> Edit Arsip
                            </button>
                        ) : (
                            <>
                                <button onClick={() => { setArchiveEditMode(false); setArchiveEditScores({}); setArchiveEditExtras({}) }} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">Batal Edit</button>
                                <button onClick={saveArchiveEdit} disabled={archiveEditSaving} className="h-8 px-4 rounded-lg bg-emerald-500 text-white text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 disabled:opacity-60 shadow-md shadow-emerald-500/20">
                                    <FontAwesomeIcon icon={archiveEditSaving ? faSpinner : faFloppyDisk} className={archiveEditSaving ? 'animate-spin text-[9px]' : 'text-[9px]'} />
                                    {archiveEditSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </>
                        )}
                        {/* ZIP download */}
                        <button onClick={() => runZipBlast(pStu, entry)} className="h-8 px-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-600 text-[10px] font-black hover:bg-teal-500/20 transition-all flex items-center gap-1.5">
                            <FontAwesomeIcon icon={faFileZipper} className="text-[9px]" /> Unduh ZIP
                        </button>
                        <button onClick={() => exportBulkPDF(entry)} className="h-8 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black hover:bg-amber-500/20 transition-all flex items-center gap-2"><FontAwesomeIcon icon={faFilePdf} /> Export PDF</button>
                        <button onClick={() => openPrintWindow(pStu)} className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"><FontAwesomeIcon icon={faPrint} /> Cetak Semua ({pStu.length})</button>
                    </div>
                    {/* Edit mode banner */}
                    {archiveEditMode && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-violet-500/30 bg-violet-500/5">
                            <FontAwesomeIcon icon={faSliders} className="text-violet-500 text-[10px]" />
                            <span className="text-[10px] font-black text-violet-600">Mode Edit Arsip</span>
                            <span className="text-[9px] text-[var(--color-text-muted)]">— Ubah nilai, lalu klik Simpan Perubahan</span>
                        </div>
                    )}
                    {/* Student pills */}
                    <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        {pStu.map(s => {
                            const sc = editSc(s.id) || {}
                            const complete = isComplete(sc)
                            const isActive = previewStudentId === s.id || (!previewStudentId && s.id === pStu[0]?.id)
                            const trend = studentTrend[s.id]
                            const avg = calcAvg(sc)
                            return (
                                <Fragment key={s.id}>
                                    <button onClick={() => setPreviewStudentId(s.id)} onDoubleClick={() => trend?.length >= 2 && setTrendModal({ student: s, trendData: trend, avg })} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${complete ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                        {s.name.split(' ')[0]}
                                        {trend && trend.length >= 2 && !isActive && <SparklineTrend trendData={trend} />}
                                    </button>
                                    <button onClick={() => openStudentDetailDrawer(s)} title="Histori semua raport"
                                        className="h-6 w-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center hover:bg-indigo-500/20 transition-all -ml-1">
                                        <FontAwesomeIcon icon={faArrowTrendUp} style={{ fontSize: 8 }} />
                                    </button>
                                </Fragment>
                            )
                        })}
                        {pStu.some(s => studentTrend[s.id]?.length >= 2) && <span className="text-[8px] text-[var(--color-text-muted)] self-center opacity-60 ml-1">Double-klik nama untuk detail trend</span>}
                    </div>
                    {/* Edit form or preview card */}
                    {archiveEditMode && pStudent ? (
                        <div className="p-4 rounded-2xl border border-violet-500/30 bg-[var(--color-surface-alt)] space-y-3">
                            <p className="text-[11px] font-black text-[var(--color-text)]">{pStudent.name}</p>
                            {/* Scores */}
                            <div className="flex gap-2 flex-wrap">
                                {KRITERIA.map(k => {
                                    const cur = (archiveEditScores[pStudent.id] || {})[k.key] ?? pSc[pStudent.id]?.[k.key] ?? ''
                                    const g = cur !== '' ? GRADE(Number(cur)) : null
                                    return (
                                        <div key={k.key} className="flex flex-col items-center gap-1">
                                            <span className="text-[8px] font-black" style={{ color: k.color }}>{k.id}</span>
                                            <input type="number" min={0} max={MAX_SCORE} value={cur}
                                                onChange={e => { const v = e.target.value === '' ? '' : Math.min(MAX_SCORE, Math.max(0, Number(e.target.value))); setArchiveEditScores(prev => ({ ...prev, [pStudent.id]: { ...(prev[pStudent.id] || {}), [k.key]: v } })) }}
                                                className="w-12 h-10 text-center text-base font-black rounded-lg outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                                                style={{ background: g ? g.bg : 'var(--color-surface)', color: g ? g.uiColor : 'var(--color-text-muted)', border: `2px solid ${g ? g.border : 'var(--color-border)'}` }}
                                                placeholder="—" />
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Extra fields */}
                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                {[{ key: 'berat_badan', label: 'BB', icon: faWeightScale, color: '#6366f1' }, { key: 'tinggi_badan', label: 'TB', icon: faRulerVertical, color: '#06b6d4' }, { key: 'hari_sakit', label: 'Sakit', icon: faBandage, color: '#ef4444' }, { key: 'hari_izin', label: 'Izin', icon: faCircleExclamation, color: '#f59e0b' }, { key: 'hari_alpa', label: 'Alpa', icon: faTriangleExclamation, color: '#ef4444' }, { key: 'hari_pulang', label: 'Pulang', icon: faDoorOpen, color: '#8b5cf6' }].map(f => {
                                    const val = (archiveEditExtras[pStudent.id] || {})[f.key] ?? pEx[pStudent.id]?.[f.key] ?? ''
                                    return (
                                        <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden" style={{ height: 32 }}>
                                            <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                            <input type="number" placeholder={f.label} value={val}
                                                onChange={e => setArchiveEditExtras(prev => ({ ...prev, [pStudent.id]: { ...(prev[pStudent.id] || {}), [f.key]: e.target.value } }))}
                                                className="flex-1 w-0 h-full text-[11px] font-bold text-center bg-transparent text-[var(--color-text)] outline-none appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Hafalan */}
                            <div className="grid grid-cols-2 gap-1.5">
                                {[{ key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981' }, { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6' }].map(f => {
                                    const val = (archiveEditExtras[pStudent.id] || {})[f.key] ?? pEx[pStudent.id]?.[f.key] ?? ''
                                    return (
                                        <div key={f.key} className="flex items-center gap-1 rounded-lg border border-[var(--color-border)] overflow-hidden" style={{ height: 32 }}>
                                            <div className="w-7 h-full flex items-center justify-center shrink-0" style={{ background: f.color + '18' }}><FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: 9 }} /></div>
                                            <input placeholder={f.ph} value={val}
                                                onChange={e => setArchiveEditExtras(prev => ({ ...prev, [pStudent.id]: { ...(prev[pStudent.id] || {}), [f.key]: e.target.value } }))}
                                                className="flex-1 w-0 h-full px-1.5 text-[11px] font-bold bg-transparent text-[var(--color-text)] outline-none" />
                                        </div>
                                    )
                                })}
                            </div>
                            {/* Catatan */}
                            <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden">
                                <div className="w-7 shrink-0 flex items-start justify-center pt-2" style={{ background: '#f59e0b18' }}><FontAwesomeIcon icon={faClipboardList} style={{ color: '#f59e0b', fontSize: 9 }} /></div>
                                <textarea placeholder="Catatan musyrif..." value={(archiveEditExtras[pStudent.id] || {}).catatan ?? pEx[pStudent.id]?.catatan ?? ''}
                                    onChange={e => setArchiveEditExtras(prev => ({ ...prev, [pStudent.id]: { ...(prev[pStudent.id] || {}), catatan: e.target.value } }))}
                                    maxLength={200} rows={2} className="flex-1 w-0 px-2 py-1.5 text-[11px] bg-transparent text-[var(--color-text)] outline-none resize-none leading-tight" />
                            </div>
                        </div>
                    ) : (
                        pStudent ? (<div className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-gray-100 dark:bg-gray-900 p-4 flex justify-center"><div className="shadow-2xl"><RaportPrintCard student={pStudent} scores={pSc[pStudent.id]} extra={pEx[pStudent.id]} bulanObj={pBulan} tahun={pTahun} musyrif={pMus} className={pClass} lang={pLang} settings={settings} /></div></div>) : null
                    )}
                </div>
            )
        }
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setStep(0)} className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5"><FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali</button>
                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">{archiveList.length} periode tersimpan</span>
                    <div className="flex-1" />
                    {/* Tab switcher */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                        {[{ id: 'list', label: 'Daftar Arsip', icon: faTableList }, { id: 'ringkasan', label: 'Ringkasan', icon: faChartPie }].map(tab => (
                            <button key={tab.id} onClick={() => setArchiveTab(tab.id)}
                                className={`h-7 px-3 rounded-lg text-[9px] font-black flex items-center gap-1.5 transition-all ${archiveTab === tab.id ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                                <FontAwesomeIcon icon={tab.icon} className="text-[8px]" /> {tab.label}
                            </button>
                        ))}
                    </div>
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
                    <div className="relative flex items-center">
                        <FontAwesomeIcon icon={faFilter} className="absolute left-2.5 text-[var(--color-text-muted)] text-[9px] pointer-events-none" />
                        <input type="number" min={0} max={100} step={1} placeholder="Lengkap < %?" value={archiveMinAvg} onChange={e => setArchiveMinAvg(e.target.value)} title="Filter kelas dengan persentase kelengkapan di bawah angka ini (%)" className="h-8 pl-7 pr-2 w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none focus:border-rose-500/50 appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        {archiveMinAvg !== '' && <button onClick={() => setArchiveMinAvg('')} className="absolute right-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} className="text-[9px]" /></button>}
                    </div>
                    <select value={archiveSort} onChange={e => setArchiveSort(e.target.value)} className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                        <option value="name">Nama Kelas</option>
                        <option value="progress">Progress ↓</option>
                    </select>
                </div>
                {archiveLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] animate-pulse">
                                <div className="flex items-start justify-between mb-3"><div className="flex-1"><div className="h-3 w-2/3 bg-[var(--color-border)] rounded mb-2" /><div className="h-2.5 w-1/2 bg-[var(--color-border)] rounded" /></div><div className="h-4 w-12 bg-[var(--color-border)] rounded-full" /></div>
                                <div className="h-1.5 w-full bg-[var(--color-border)] rounded-full mb-3" />
                                <div className="flex gap-1.5"><div className="flex-1 h-8 bg-[var(--color-border)] rounded-lg" /><div className="flex-1 h-8 bg-[var(--color-border)] rounded-lg" /><div className="h-8 w-8 bg-[var(--color-border)] rounded-lg" /></div>
                            </div>
                        ))}
                    </div>
                ) : archiveTab === 'ringkasan' ? (() => {
                    // ── TAB RINGKASAN: Bar chart per kelas + heatmap kriteria ──
                    // Group archiveList by class_id, ambil bulan yang dipilih filter atau terbaru
                    const targetMonth = archiveFilter.month ? Number(archiveFilter.month) : null
                    const targetYear = archiveFilter.year ? Number(archiveFilter.year) : null
                    // Kalau tidak ada filter bulan/tahun, pakai periode terbaru yang ada di archiveList
                    const latestEntry = archiveList.length
                        ? archiveList.reduce((a, b) => b.year > a.year || (b.year === a.year && b.month > a.month) ? b : a, archiveList[0])
                        : null
                    const useMonth = targetMonth ?? latestEntry?.month
                    const useYear = targetYear ?? latestEntry?.year
                    const bulanLabel = BULAN.find(b => b.id === useMonth)?.id_str ?? '—'

                    // Filter archiveList sesuai periode
                    const periodEntries = archiveList.filter(e =>
                        e.month === useMonth && e.year === useYear &&
                        (!archiveFilter.classId || e.class_id === archiveFilter.classId) &&
                        (!archiveSearch || e.class_name.toLowerCase().includes(archiveSearch.toLowerCase()))
                    )

                    if (!periodEntries.length) return (
                        <div className="flex flex-col items-center py-16 gap-3 text-[var(--color-text-muted)]">
                            <FontAwesomeIcon icon={faChartPie} className="text-3xl opacity-20" />
                            <p className="text-[12px] font-black">Tidak ada data untuk periode ini</p>
                            <p className="text-[10px] opacity-60">Pilih filter bulan/tahun yang memiliki data arsip.</p>
                        </div>
                    )

                    // Hitung avg per kriteria per kelas dari archiveList (tidak ada nilai individual di sini,
                    // hanya count & completed — tampilkan progress + bar chart dari data yang tersedia)
                    // Kita tambahkan avg dari data yang sudah di-load di archiveList
                    const BAR_W = 120, BAR_H = 60

                    return (
                        <div className="space-y-4">
                            {/* Header ringkasan */}
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

                            {/* Progress bar per kelas */}
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
                                            {/* SVG mini bar chart: progress vs target */}
                                            <svg width="44" height="28" viewBox="0 0 44 28" className="shrink-0 opacity-60 group-hover:opacity-100 transition-all" aria-hidden="true">
                                                <rect x="0" y="0" width="44" height="28" rx="5" fill="var(--color-surface-alt)" />
                                                <rect x="4" y={28 - 4 - (pct / 100) * 20} width="16" height={(pct / 100) * 20 + 4} rx="3" fill={barColor} opacity="0.85" />
                                                <rect x="24" y={28 - 4 - ((entry.count ? entry.completed / entry.count : 0) * 20)} width="16" height={((entry.count ? entry.completed / entry.count : 0) * 20) + 4} rx="3" fill={barColor} opacity="0.4" />
                                            </svg>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Heatmap kriteria — tampilkan kalau ada data nilai per kelas */}
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
                                                                {/* Karena archiveList tidak menyimpan nilai per kriteria, tampilkan — tapi beri hint */}
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
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                            <FontAwesomeIcon icon={faBoxArchive} className="text-2xl opacity-25" />
                        </div>
                        <div className="text-center">
                            <p className="text-[13px] font-black mb-1">Arsip tidak ditemukan</p>
                            <p className="text-[11px] opacity-60 max-w-xs">
                                {archiveSearch || archiveFilter.classId || archiveFilter.month
                                    ? 'Coba ubah filter atau hapus pencarian.'
                                    : 'Belum ada raport yang tersimpan. Selesaikan input nilai di step 2, lalu simpan untuk membuat arsip.'}
                            </p>
                        </div>
                        {(archiveSearch || archiveFilter.classId || archiveFilter.month) && (
                            <button onClick={() => { setArchiveSearch(''); setArchiveFilter({ classId: '', year: '', month: '' }) }}
                                className="h-7 px-3 rounded-lg border border-[var(--color-border)] text-[10px] font-black hover:text-[var(--color-text)] transition-all">
                                Reset Filter
                            </button>
                        )}
                    </div>
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

    // ── Guards ─────────────────────────────────────────────────────────────────

    if (isAllowed === null) return (
        <DashboardLayout>
            <div className="flex items-center justify-center min-h-[60vh]">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-[var(--color-primary)]" />
            </div>
        </DashboardLayout>
    )
    if (!isAllowed) return (
        <DashboardLayout>
            <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                    <FontAwesomeIcon icon={faLock} className="text-2xl text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-[var(--color-text)] mb-1">Akses Ditolak</h2>
                    <p className="text-[12px] text-[var(--color-text-muted)] max-w-xs">Halaman ini hanya dapat diakses oleh <strong>Guru</strong> dan <strong>Admin</strong>.</p>
                </div>
                <button onClick={() => navigate(-1)} className="h-9 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black hover:opacity-90 transition-all">Kembali</button>
            </div>
        </DashboardLayout>
    )

    // FIX MINOR: pageLoading pakai skeleton layout, bukan full-page spinner kosong
    if (pageLoading) {
        return (
            <DashboardLayout title="Raport Bulanan">
                {/* Header skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="h-7 w-44 bg-[var(--color-border)] rounded-lg animate-pulse mb-2" />
                        <div className="h-3 w-64 bg-[var(--color-border)] rounded animate-pulse" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-9 w-24 bg-[var(--color-border)] rounded-xl animate-pulse" />
                        <div className="h-9 w-28 bg-[var(--color-border)] rounded-xl animate-pulse" />
                    </div>
                </div>
                {/* Stats skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass rounded-[1.5rem] p-4 flex items-center gap-3 animate-pulse">
                            <div className="w-9 h-9 rounded-xl bg-[var(--color-border)] shrink-0" />
                            <div className="flex-1">
                                <div className="h-2.5 w-16 bg-[var(--color-border)] rounded mb-2" />
                                <div className="h-5 w-10 bg-[var(--color-border)] rounded" />
                            </div>
                        </div>
                    ))}
                </div>
                {/* Kelas grid skeleton */}
                <div className="h-3 w-24 bg-[var(--color-border)] rounded animate-pulse mb-3" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, i) => <ClassCardSkeleton key={i} />)}
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Raport Bulanan">
            {/* TAMBAH INI: */}
            <div className="p-4 md:p-6 space-y-4 max-w-[1800px] mx-auto">

                {/* Read-only Banner — access.teacher_raport flag off */}
                {!canEdit && (
                    <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2">
                        <FontAwesomeIcon icon={faLock} className="text-rose-500 shrink-0" />
                        <p className="text-[11px] font-bold text-rose-600 flex-1">Mode Read-only — Edit raport dinonaktifkan oleh administrator.</p>
                    </div>
                )}

                {/* ── PAGE HEADER ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Breadcrumb badge="Reports" items={['Grade Reports']} className="mb-1" />
                        <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">Raport Bulanan</h1>
                        <p className="text-[var(--color-text-muted)] text-[11px] mt-0.5 font-medium italic opacity-70">نتيجة الشخصية — Kelola dan cetak raport bulanan per kelas.</p>
                        <p className="text-[10px] text-[var(--color-text-muted)] mt-1 font-bold opacity-60">
                            Ikuti langkah di atas (1–3) dari pilih kelas sampai review sebelum cetak atau kirim ke orang tua.
                        </p>
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
                        <button onClick={() => { setTutorialStep(0); setShowTutorialModal(true) }} aria-label="Panduan penggunaan" className="h-8 w-18 gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/8 text-amber-500 text-[10px] font-black flex items-center justify-center hover:bg-amber-500/15 transition-all" title="Panduan & Tutorial">
                            <FontAwesomeIcon icon={faLightbulb} className="text-[9px]" />
                            Tutorial
                        </button>
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
                                <input ref={searchInputRef} type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama kelas... (tekan / untuk fokus)" className="input-field pl-10 w-full h-9 text-xs sm:text-sm bg-transparent border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all rounded-xl" />
                                {searchQuery && <button onClick={() => setSearchQuery('')} aria-label="Bersihkan pencarian kelas" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all"><FontAwesomeIcon icon={faXmark} className="text-xs" /></button>}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── CONTENT — dengan animasi fade+slide antar step ── */}
                <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-4 sm:p-6">
                    {/* FIX 6: Global auto-save indicator */}
                    {step === 2 && globalSaveIndicator && (
                        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl border shadow-lg text-[10px] font-black transition-all duration-300 ${globalSaveIndicator === 'saving' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                            <FontAwesomeIcon icon={globalSaveIndicator === 'saving' ? faSpinner : faCircleCheck} className={globalSaveIndicator === 'saving' ? 'animate-spin text-[9px]' : 'text-[9px]'} />
                            {globalSaveIndicator === 'saving' ? 'Menyimpan...' : 'Tersimpan ✓'}
                        </div>
                    )}
                    <div key={step}
                        style={{
                            animation: 'stepFadeIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
                        }}
                    >
                        {step === 0 && renderStep0()}
                        {step === 1 && renderStep1()}
                        {step === 2 && renderStep2()}
                        {step === 3 && renderStep3()}
                        {step === 4 && renderStep4()}
                    </div>
                </div>
                {/* Keyframe untuk animasi step */}
                <style>{`
                @keyframes stepFadeIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.995); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>

                {/* ── Hidden print container ── */}
                {printQueue.length > 0 && (
                    <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
                        {printStudents.filter(s => printQueue.includes(s.id)).map(s => (
                            <RaportPrintCard key={s.id} student={s} scores={printScores[s.id]} extra={printExtras[s.id]} bulanObj={printBulan} tahun={printYear} musyrif={printMusyrif} className={printClass} lang={printLang} settings={settings} catatanArab={catatanArabMap[s.id]} onRendered={() => setPrintRenderedCount(c => c + 1)} />
                        ))}
                    </div>
                )}

                {/* ── KEYBOARD SHORTCUT MODAL ── */}
                {showShortcutModal && createPortal(
                    <div className="fixed inset-0 z-[202] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => { if (e.target === e.currentTarget) setShowShortcutModal(false) }}>
                        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-md" role="dialog" aria-modal="true" aria-label="Keyboard Shortcuts">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center"><FontAwesomeIcon icon={faKeyboard} className="text-indigo-500" /></div>
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Keyboard Shortcuts</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Tekan <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-mono"><FontAwesomeIcon icon={faKeyboard} /></kbd> kapan saja untuk membuka ini</p>
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
                                    { keys: ['Ctrl', 'Z'], desc: 'Undo nilai (Ctrl+Y untuk Redo)' },
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

                {/* ── TUTORIAL MODAL ── */}
                {showTutorialModal && createPortal(
                    (() => {
                        const [t1, t2, t3, t4, t5, t6, t7] = tutorialImgs
                        const SLIDES = [
                            {
                                icon: faClipboardList,
                                iconColor: 'text-emerald-500',
                                iconBg: 'bg-emerald-500/15',
                                title: 'Dua Cara Memulai Input Nilai',
                                subtitle: 'Pilih jalur yang paling nyaman untukmu',
                                body: (
                                    <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                            <p className="font-black text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                                                Lewat tombol "＋ Buat Raport"
                                            </p>
                                            <p className="text-[var(--color-text-muted)] pl-6">Klik tombol di pojok kanan atas → pilih kelas → atur bulan & tahun → isi nama Musyrif → pilih template bahasa → klik <strong>"Mulai Input Nilai"</strong>.</p>
                                        </div>
                                        <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                            <p className="font-black text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                                                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                                                Langsung klik kartu kelas
                                            </p>
                                            <p className="text-[var(--color-text-muted)] pl-6">Di halaman utama, klik langsung kartu kelas yang ingin diisi. Kamu akan langsung masuk ke halaman input nilai tanpa perlu mengatur periode.</p>
                                        </div>
                                    </div>
                                ),
                                tips: 'Template bahasa otomatis: kelas Boarding → Arab, kelas Reguler → Indonesia. Nama Musyrif terisi otomatis jika sudah diset di data kelas.',
                                img: t1,
                            },
                            {
                                icon: faTableList,
                                iconColor: 'text-indigo-500',
                                iconBg: 'bg-indigo-500/15',
                                title: 'Mengisi Nilai Santri',
                                subtitle: 'Input 5 kriteria penilaian karakter',
                                body: 'Setiap santri memiliki 5 kolom nilai: Akhlak, Ibadah, Kebersihan, Al-Quran, dan Bahasa.Nilai berkisar antara 0–9. Tekan Tab atau Enter untuk berpindah ke cell berikutnya dengan cepat.',
                                tips: 'Ketik angka 0–9 langsung saat cell aktif. Warna cell berubah otomatis sesuai grade — hijau untuk nilai tinggi, merah untuk nilai rendah.',
                                img: t2,
                            },
                            {
                                icon: faFloppyDisk,
                                iconColor: 'text-sky-500',
                                iconBg: 'bg-sky-500/15',
                                title: 'Auto-Save & Status Simpan',
                                subtitle: 'Data tersimpan otomatis ke server',
                                body: 'Setiap perubahan nilai tersimpan otomatis ke database dalam 1.5 detik. Indikator berwarna hijau (✓) menandakan data sudah tersimpan. Tekan Ctrl+S atau klik "Simpan Semua" untuk menyimpan sekaligus.',
                                tips: 'Jika koneksi terputus, nilai tetap tersimpan sementara sebagai draft di browser. Saat online kembali, muat draft untuk melanjutkan.',
                                img: t3,
                            },
                            {
                                icon: faBoxArchive,
                                iconColor: 'text-violet-500',
                                iconBg: 'bg-violet-500/15',
                                title: 'Data Tambahan per Santri',
                                subtitle: 'Kesehatan, hafalan & catatan',
                                body: 'Selain nilai karakter, isi juga data tambahan: berat & tinggi badan, jumlah hari sakit / izin / alpa, progress Ziyadah & Murojaah hafalan, serta catatan khusus yang akan tercetak di raport untuk orang tua.',
                                tips: 'Data tambahan ini opsional — raport tetap bisa dicetak meski tidak diisi. Namun semakin lengkap datanya, semakin informatif raport yang diterima orang tua.',
                                img: t4,
                            },
                            {
                                icon: faFillDrip,
                                iconColor: 'text-rose-500',
                                iconBg: 'bg-rose-500/15',
                                title: 'Isi Massal & Copy Bulan Lalu',
                                subtitle: 'Hemat waktu untuk nilai yang sama',
                                body: 'Gunakan "Isi Massal" untuk mengisi nilai yang sama ke banyak santri sekaligus — centang santri yang ingin diisi, set nilai, klik Terapkan. Gunakan "Copy Bulan Lalu" untuk menyalin nilai dari periode sebelumnya sebagai titik awal.',
                                tips: 'Undo/Redo tersedia dengan Ctrl+Z dan Ctrl+Y jika ingin membatalkan perubahan nilai yang sudah diisi.',
                                img: t5,
                            },
                            {
                                icon: faFilePdf,
                                iconColor: 'text-red-500',
                                iconBg: 'bg-red-500/15',
                                title: 'Cetak, ZIP & WA Blast',
                                subtitle: 'Distribusikan raport ke orang tua',
                                body: 'Klik ikon Print untuk mencetak raport dari browser. Klik ZIP untuk mengunduh semua raport dalam satu file. Klik ikon WhatsApp di tiap baris santri untuk kirim raport ke orang tua, atau gunakan "WA Blast" untuk kirim ke semua sekaligus.',
                                tips: 'Hanya santri yang nilainya sudah lengkap (semua 5 kriteria terisi) yang bisa diekspor ke PDF / ZIP / WA.',
                                img: t6,
                            },
                            {
                                icon: faBoxArchive,
                                iconColor: 'text-teal-500',
                                iconBg: 'bg-teal-500/15',
                                title: 'Arsip & Riwayat',
                                subtitle: 'Lihat dan edit raport bulan lalu',
                                body: 'Semua raport yang pernah disimpan tersedia di tab "Riwayat". Kamu bisa melihat raport per kelas per bulan, mengedit nilai yang sudah tersimpan, menghapus arsip, hingga mencetak atau mengirim ulang via WA.',
                                tips: 'Filter arsip berdasarkan tahun, bulan, atau kelas. Gunakan "Edit Arsip" untuk memperbaiki nilai yang salah input bulan lalu.',
                                img: t7,
                            },
                        ]
                        const slide = SLIDES[tutorialStep]
                        const isLast = tutorialStep === SLIDES.length - 1
                        const isFirst = tutorialStep === 0
                        return (
                            <div className="fixed inset-0 z-[203] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                                onClick={e => { if (e.target === e.currentTarget) setShowTutorialModal(false) }}>
                                <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
                                    role="dialog" aria-modal="true" aria-label="Tutorial Panduan">
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--color-border)]">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${slide.iconBg}`}>
                                                <FontAwesomeIcon icon={slide.icon} className={`text-base ${slide.iconColor}`} />
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-black text-[var(--color-text)] leading-tight">{slide.title}</p>
                                                <p className="text-[10px] text-[var(--color-text-muted)]">{slide.subtitle}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setShowTutorialModal(false)} aria-label="Tutup tutorial"
                                            className="w-8 h-8 rounded-lg hover:bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] transition-all shrink-0">
                                            <FontAwesomeIcon icon={faXmark} />
                                        </button>
                                    </div>

                                    {/* Dot navigator */}
                                    <div className="flex items-center justify-center gap-1.5 pt-4 px-6">
                                        {SLIDES.map((_, i) => (
                                            <button key={i} onClick={() => setTutorialStep(i)}
                                                className={`rounded-full transition-all ${i === tutorialStep ? 'w-5 h-2 bg-amber-500' : 'w-2 h-2 bg-[var(--color-border)] hover:bg-amber-500/40'}`}
                                                aria-label={`Slide ${i + 1}`} />
                                        ))}
                                        <span className="ml-2 text-[9px] text-[var(--color-text-muted)] font-bold">{tutorialStep + 1}/{SLIDES.length}</span>
                                    </div>

                                    {/* Body */}
                                    <div className="px-6 pt-4 pb-2 overflow-y-auto flex-1">
                                        {slide.img ? (
                                            <div className="relative group mb-4 cursor-zoom-in" onClick={() => setTutorialZoomImg(slide.img)}>
                                                <img src={slide.img} alt={slide.title}
                                                    className="w-full rounded-xl border border-[var(--color-border)] object-contain max-h-64 transition-all group-hover:brightness-90" />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <div className="bg-black/60 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                                                        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px]" /> Klik untuk zoom
                                                    </div>
                                                </div>
                                            </div>
                                        ) : tutorialImgs[0] === null ? (
                                            /* skeleton while lazy-loading */
                                            <div className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] mb-4 h-48 animate-pulse" />
                                        ) : (
                                            <div className="w-full rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] mb-4 flex items-center justify-center h-24">
                                                <div className="text-center">
                                                    <FontAwesomeIcon icon={slide.icon} className={`text-2xl opacity-20 ${slide.iconColor}`} />
                                                    <p className="text-[9px] text-[var(--color-text-muted)] mt-1 opacity-50">Screenshot akan ditampilkan di sini</p>
                                                </div>
                                            </div>
                                        )}
                                        {typeof slide.body === 'string'
                                            ? <p className="text-[12px] text-[var(--color-text)] leading-relaxed">{slide.body}</p>
                                            : slide.body
                                        }
                                    </div>

                                    {/* Tips */}
                                    <div className="px-6 pb-2">
                                        <div className="p-3 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-start gap-2">
                                            <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 text-[11px] mt-0.5 shrink-0" />
                                            <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 leading-snug">{slide.tips}</p>
                                        </div>
                                    </div>

                                    {/* Footer nav */}
                                    <div className="flex items-center gap-3 px-6 py-4">
                                        <button onClick={() => setTutorialStep(v => Math.max(0, v - 1))} disabled={isFirst}
                                            className="h-9 px-4 rounded-xl border border-[var(--color-border)] text-[10px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-30 flex items-center gap-1.5">
                                            <FontAwesomeIcon icon={faChevronLeft} className="text-[9px]" /> Sebelumnya
                                        </button>
                                        <div className="flex-1" />
                                        {isLast ? (
                                            <button onClick={() => setShowTutorialModal(false)}
                                                className="h-9 px-5 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                                                <FontAwesomeIcon icon={faCheck} className="text-[9px]" /> Selesai
                                            </button>
                                        ) : (
                                            <button onClick={() => setTutorialStep(v => Math.min(SLIDES.length - 1, v + 1))}
                                                className="h-9 px-5 rounded-xl bg-amber-500 text-white text-[10px] font-black hover:bg-amber-600 transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20">
                                                Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[9px]" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })(),
                    document.body
                )}

                {/* ── TUTORIAL IMAGE LIGHTBOX ── */}
                {tutorialZoomImg && createPortal(
                    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
                        onClick={() => setTutorialZoomImg(null)}>
                        <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
                            <img src={tutorialZoomImg} alt="Tutorial zoom"
                                className="w-full rounded-2xl shadow-2xl border border-white/10 object-contain max-h-[85vh]" />
                            <button onClick={() => setTutorialZoomImg(null)}
                                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all backdrop-blur-sm"
                                aria-label="Tutup zoom">
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                            <p className="text-center text-white/50 text-[10px] mt-3 font-medium">Klik di luar untuk menutup</p>
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
                        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-md" role="dialog" aria-modal="true" aria-label="Progress WA Blast">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faWhatsapp} className="text-green-500 text-lg" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-black text-[var(--color-text)]">WA Blast Raport</p>
                                    <p className="text-[10px] text-[var(--color-text-muted)]">{waBlast.queue.length} wali · Tab WA terbuka otomatis per santri</p>
                                </div>
                            </div>
                            {/* FIX INFO: aria-live="polite" agar screen reader mengumumkan progress */}
                            <div className="mb-4" aria-live="polite" role="status">
                                <div className="flex justify-between mb-1.5">
                                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">Progress</span>
                                    <span className="text-[10px] font-black text-[var(--color-text)]">{waBlast.done + waBlast.failed} / {waBlast.queue.length}</span>
                                </div>
                                <div className="h-2.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden border border-[var(--color-border)]"
                                    role="progressbar"
                                    aria-valuenow={waBlast.done + waBlast.failed}
                                    aria-valuemin={0}
                                    aria-valuemax={waBlast.queue.length}
                                >
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
                                <div className="space-y-3">
                                    <p className="text-center text-[9px] text-[var(--color-text-muted)] font-medium">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mr-1" /> Jangan tutup halaman ini selama proses berlangsung
                                    </p>
                                    <button
                                        onClick={() => { waBlastAbortRef.current = true }}
                                        className="w-full h-9 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 text-[11px] font-black hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
                                        Batalkan Blast
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}

                {confirmPortal}

                {/* ── TREND MODAL ── */}
                {
                    trendModal && createPortal(
                        <div className="fixed inset-0 z-[201] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setTrendModal(null)}>
                            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-sm" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">{trendModal.student.name}</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Tren nilai {trendModal.trendData.length} bulan terakhir</p>
                                    </div>
                                    <button onClick={() => setTrendModal(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"><FontAwesomeIcon icon={faXmark} /></button>
                                </div>
                                {/* Sparkline per kriteria */}
                                <div className="space-y-2 mb-4">
                                    {KRITERIA.map(k => {
                                        const vals = trendModal.trendData.map(t => t.scores[k.key]).filter(v => v !== null && v !== undefined)
                                        const last = vals[vals.length - 1]
                                        const prev = vals[vals.length - 2]
                                        const delta = (last !== undefined && prev !== undefined) ? Number(last) - Number(prev) : null
                                        return (
                                            <div key={k.key} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-surface-alt)]">
                                                <FontAwesomeIcon icon={k.icon} style={{ color: k.color, fontSize: 11, width: 14 }} />
                                                <span className="text-[10px] font-black text-[var(--color-text-muted)] w-16 shrink-0">{k.id}</span>
                                                <div className="flex-1">
                                                    <SparklineTrend trendData={trendModal.trendData.map(t => ({ ...t, scores: { [k.key]: t.scores[k.key] } }))} />
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span className="text-[12px] font-black" style={{ color: k.color }}>{last ?? '—'}</span>
                                                    {delta !== null && delta !== 0 && <span className="text-[9px] font-black ml-1" style={{ color: delta > 0 ? '#10b981' : '#ef4444' }}>{delta > 0 ? '▲' : '▼'}{Math.abs(delta)}</span>}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--color-border)]">
                                    <span className="text-[10px] font-black text-[var(--color-text-muted)]">Rata-rata bulan ini</span>
                                    {(() => { const last = trendModal.trendData[trendModal.trendData.length - 1]; const avg = calcAvg(last?.scores || {}); return avg ? <span className="text-[14px] font-black px-2 py-0.5 rounded-lg" style={{ background: GRADE(Number(avg)).bg, color: GRADE(Number(avg)).uiColor }}>{avg} — {GRADE(Number(avg)).id}</span> : <span className="text-[var(--color-text-muted)] text-[11px]">—</span> })()}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* ── ZIP BLAST MODAL ── */}
                {
                    zipBlast && createPortal(
                        <div className="fixed inset-0 z-[202] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl p-6 w-full max-w-sm" role="dialog" aria-modal="true">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faFileZipper} className="text-teal-500 text-lg" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-black text-[var(--color-text)]">Ekspor ZIP PDF</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Mengompres raport menjadi satu file ZIP...</p>
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mb-4">
                                    <div className="flex justify-between text-[9px] font-black text-[var(--color-text-muted)] mb-1.5">
                                        <span>Proses {zipBlast.idx + 1} / {zipBlast.queue.length}</span>
                                        <span>{zipBlast.queue[zipBlast.idx]?.name?.split(' ')[0] || '...'}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-300 bg-teal-500" style={{ width: `${zipBlast.queue.length ? ((zipBlast.done + zipBlast.failed) / zipBlast.queue.length) * 100 : 0}%` }} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 mb-5">
                                    {[
                                        { label: 'Total', val: zipBlast.queue.length, color: '#6366f1' },
                                        { label: 'Berhasil', val: zipBlast.done, color: '#10b981' },
                                        { label: 'Gagal', val: zipBlast.failed, color: '#ef4444' },
                                    ].map(s => (
                                        <div key={s.label} className="text-center p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                            <p className="text-lg font-black" style={{ color: s.color }}>{s.val}</p>
                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                                {!zipBlast.active ? (
                                    <button onClick={() => setZipBlast(null)} className="w-full h-10 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-all">
                                        Selesai
                                    </button>
                                ) : (
                                    <p className="text-center text-[9px] text-[var(--color-text-muted)] font-medium">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mr-1" /> Jangan tutup halaman ini selama proses berlangsung
                                    </p>
                                )}
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* ── FLOATING UNSAVED BAR ── */}
                {
                    step === 2 && hasUnsavedMemo && !unsavedBarDismissed && (
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
                            {/* FIX MAJOR: tombol × hanya dismiss bar, tidak menyimpan apapun */}
                            <button
                                onClick={() => setUnsavedBarDismissed(true)}
                                aria-label="Tutup pengingat"
                                title="Tutup pengingat (data belum disimpan)"
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all"
                            >
                                <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                            </button>
                        </div>
                    )
                }

                {/* ── PENDING NAV CONFIRM (unsaved warning) ── */}
                {
                    pendingNav && createPortal(
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
                    )
                }

                {/* ── STUDENT DETAIL DRAWER — histori semua raport per santri ── */}
                {
                    studentDetailDrawer && createPortal(
                        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
                            onClick={e => { if (e.target === e.currentTarget) setStudentDetailDrawer(null) }}>
                            <div className="w-full sm:max-w-2xl bg-[var(--color-surface)] sm:rounded-2xl rounded-t-3xl border border-[var(--color-border)] shadow-2xl flex flex-col"
                                style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true">
                                {/* Header drawer */}
                                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                                        <FontAwesomeIcon icon={faArrowTrendUp} className="text-indigo-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-black text-[var(--color-text)] truncate">{studentDetailDrawer.student.name}</p>
                                        <p className="text-[10px] text-[var(--color-text-muted)]">Histori semua raport bulanan</p>
                                    </div>
                                    <button onClick={() => setStudentDetailDrawer(null)}
                                        className="w-8 h-8 rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] flex items-center justify-center hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-all">
                                        <FontAwesomeIcon icon={faXmark} className="text-[11px]" />
                                    </button>
                                </div>

                                {/* Body */}
                                <div className="flex-1 overflow-y-auto px-4 py-4">
                                    {studentDetailLoading ? (
                                        <div className="space-y-2">
                                            {Array.from({ length: 5 }).map((_, i) => (
                                                <div key={i} className="h-16 rounded-xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                                            ))}
                                        </div>
                                    ) : !studentDetailDrawer.history?.length ? (
                                        <div className="flex flex-col items-center py-12 gap-3 text-[var(--color-text-muted)]">
                                            <FontAwesomeIcon icon={faBoxArchive} className="text-3xl opacity-20" />
                                            <p className="text-[12px] font-black">Belum ada raport tersimpan</p>
                                        </div>
                                    ) : (() => {
                                        const history = studentDetailDrawer.history
                                        const allAvgs = history.map(h => calcAvg(h.scores)).filter(Boolean).map(Number)
                                        const bestAvg = allAvgs.length ? Math.max(...allAvgs) : null
                                        const worstAvg = allAvgs.length ? Math.min(...allAvgs) : null

                                        return (
                                            <div className="space-y-3">
                                                {/* Summary stats */}
                                                <div className="grid grid-cols-3 gap-2 mb-2">
                                                    {[
                                                        { label: 'Total Bulan', val: history.length, color: '#6366f1' },
                                                        { label: 'Terbaik', val: bestAvg?.toFixed(1) ?? '—', color: '#10b981' },
                                                        { label: 'Terendah', val: worstAvg?.toFixed(1) ?? '—', color: '#ef4444' },
                                                    ].map(s => (
                                                        <div key={s.label} className="text-center p-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                                            <p className="text-[15px] font-black" style={{ color: s.color }}>{s.val}</p>
                                                            <p className="text-[8px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">{s.label}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Sparkline keseluruhan */}
                                                {history.length >= 2 && (
                                                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-2">Tren Rata-rata</p>
                                                        <SparklineTrend trendData={history.map(h => ({ month: h.month, year: h.year, scores: h.scores }))} />
                                                    </div>
                                                )}

                                                {/* Timeline per bulan */}
                                                <div className="space-y-2">
                                                    {[...history].reverse().map((h, idx) => {
                                                        const avg = calcAvg(h.scores)
                                                        const avgNum = avg ? Number(avg) : null
                                                        const g = avgNum ? GRADE(avgNum) : null
                                                        const bulanLabel = BULAN.find(b => b.id === h.month)?.id_str ?? h.month
                                                        const hasVariance = bestAvg !== worstAvg
                                                        const isBest = avgNum !== null && avgNum === bestAvg && hasVariance
                                                        const isWorst = avgNum !== null && avgNum === worstAvg && history.length > 1 && hasVariance
                                                        return (
                                                            <div key={`${h.year}-${h.month}`}
                                                                className="rounded-xl border p-3 transition-all"
                                                                style={{ borderColor: isBest ? '#10b98140' : isWorst ? '#ef444430' : 'var(--color-border)', background: isBest ? '#10b98108' : isWorst ? '#ef444408' : 'var(--color-surface)' }}>
                                                                {/* Row header */}
                                                                <div className="flex items-center gap-2 mb-2">
                                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: isBest ? '#10b981' : isWorst ? '#ef4444' : 'var(--color-border)' }} />
                                                                    <span className="text-[11px] font-black text-[var(--color-text)]">{bulanLabel} {h.year}</span>
                                                                    {h.musyrif && <span className="text-[8px] text-[var(--color-text-muted)] opacity-70">{h.musyrif}</span>}
                                                                    <div className="flex-1" />
                                                                    {isBest && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600">⭐ Terbaik</span>}
                                                                    {isWorst && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-500">⚠ Terendah</span>}
                                                                    {avg && g && (
                                                                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md" style={{ background: g.bg, color: g.uiColor }}>
                                                                            {avg} — {g.id}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {/* Nilai per kriteria */}
                                                                <div className="grid grid-cols-5 gap-1.5">
                                                                    {KRITERIA.map(k => {
                                                                        const v = h.scores[k.key]
                                                                        const vNum = v !== null && v !== undefined ? Number(v) : null
                                                                        const kg = vNum !== null ? GRADE(vNum) : null
                                                                        return (
                                                                            <div key={k.key} className="flex flex-col items-center gap-0.5">
                                                                                <span className="text-[7px] font-black uppercase" style={{ color: k.color }}>{k.id.slice(0, 3)}</span>
                                                                                <div className="w-full h-8 rounded-lg flex items-center justify-center text-[12px] font-black"
                                                                                    style={{ background: kg ? kg.bg : 'var(--color-surface-alt)', color: kg ? kg.uiColor : 'var(--color-text-muted)', border: `1.5px solid ${kg ? kg.border : 'var(--color-border)'}` }}>
                                                                                    {vNum !== null ? vNum : '—'}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                                {/* Catatan */}
                                                                {h.catatan && (
                                                                    <p className="mt-2 text-[9px] text-[var(--color-text-muted)] italic leading-relaxed pl-1 border-l-2 border-[var(--color-border)]">
                                                                        {h.catatan}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>,
                        document.body
                    )
                }

                {/* ── IMPROVISASI: Modal konfirmasi Simpan Semua saat ada nilai kosong ── */}
                {saveAllConfirm && createPortal(
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setSaveAllConfirm(null)}>
                        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-2xl w-full max-w-sm p-6 space-y-4"
                            onClick={e => e.stopPropagation()}>
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[13px] font-black text-[var(--color-text)] mb-1">Nilai Belum Lengkap</p>
                                    <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                                        <span className="font-black text-amber-600">{saveAllConfirm.incompleteCount} dari {saveAllConfirm.totalCount} santri</span> belum lengkap nilainya. Simpan sekarang?
                                    </p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button onClick={() => setSaveAllConfirm(null)}
                                    className="h-9 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all">
                                    Batal
                                </button>
                                <button onClick={_doSaveAll}
                                    className="h-9 rounded-xl bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5">
                                    <FontAwesomeIcon icon={faFloppyDisk} className="text-[10px]" />
                                    Simpan yang Ada
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </DashboardLayout >
    )
}