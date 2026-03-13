import { useState, useEffect, useCallback, useRef, memo } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faIdCard, faKey, faSearch, faSpinner, faArrowLeft, faPhone, faSun, faMoon,
    faClipboardList, faChartBar, faStar, faMosque, faBroom, faBookOpen, faLanguage,
    faCalendarAlt, faUser, faChevronDown, faChevronUp, faLink, faCheck,
    faArrowUp, faArrowDown, faTrophy, faShieldHalved, faFilePdf
} from '@fortawesome/free-solid-svg-icons'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'
import { useToast } from '../../context/ToastContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'

const BULAN_STR = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const KRITERIA_LIST = [
    { key: 'nilai_akhlak', label: 'Akhlak', icon: faStar, color: '#f59e0b' },
    { key: 'nilai_ibadah', label: 'Ibadah', icon: faMosque, color: '#6366f1' },
    { key: 'nilai_kebersihan', label: 'Kebersihan', icon: faBroom, color: '#06b6d4' },
    { key: 'nilai_quran', label: "Al-Qur'an", icon: faBookOpen, color: '#10b981' },
    { key: 'nilai_bahasa', label: 'Bahasa', icon: faLanguage, color: '#8b5cf6' },
]

const getGrade = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'Istimewa', color: '#10b981', bg: '#10b98115', border: '#10b98140' }
    if (num >= 8) return { label: 'Sangat Baik', color: '#3b82f6', bg: '#3b82f615', border: '#3b82f640' }
    if (num >= 6) return { label: 'Baik', color: '#6366f1', bg: '#6366f115', border: '#6366f140' }
    if (num >= 4) return { label: 'Cukup', color: '#f59e0b', bg: '#f59e0b15', border: '#f59e0b40' }
    return { label: 'Kurang', color: '#ef4444', bg: '#ef444415', border: '#ef444440' }
}

// ── Konstanta & RaportPrintCard — copy exact dari RaportPage ────────────────
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

// ─── Konstanta ────────────────────────────────────────────────────────────────
const MAX_SCORE = 9

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
    // PERF: custom comparator — cegah re-render saat prop identity berubah tapi nilai sama
}, printCardAreEqual)

export default function ParentCheckPage() {
    const [code, setCode] = useState('')
    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [autoChecking, setAutoChecking] = useState(false)
    const [student, setStudent] = useState(null)
    const [errorMessage, setErrorMessage] = useState('')
    const [activeTab, setActiveTab] = useState('perilaku')
    const [raportHistory, setRaportHistory] = useState([])
    const [raportLoading, setRaportLoading] = useState(false)
    const [expandedRaport, setExpandedRaport] = useState(null)
    const [linkCopied, setLinkCopied] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(null)
    const [settings, setSettings] = useState({})
    const [printQueue, setPrintQueue] = useState([])
    const [printRenderedCount, setPrintRenderedCount] = useState(0)
    const [printRaportData, setPrintRaportData] = useState(null)
    const printContainerRef = useRef(null)
    const { addToast } = useToast()
    const { isDark, toggleTheme } = useTheme()

    const performCheck = useCallback(async (checkCode, checkPin) => {
        if (!checkCode || !checkPin) {
            setErrorMessage('Kode registrasi dan PIN harus diisi')
            return
        }
        const normalizedCode = checkCode.trim().toUpperCase()
        const normalizedPin = checkPin.trim()

        setLoading(true)
        setErrorMessage('')

        try {
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select(`*, classes (id, name)`)
                .eq('registration_code', normalizedCode)
                .eq('pin', normalizedPin)
                .single()

            if (studentError || !studentData) {
                throw new Error('Kode registrasi atau PIN tidak valid. Pastikan Anda memasukkan data yang benar.')
            }

            const { data: historyData } = await supabase
                .from('behavior_reports')
                .select('*')
                .eq('student_id', studentData.id)
                .order('created_at', { ascending: false })

            const reports = (historyData || []).filter(h => h.points < 0).map(h => ({
                id: h.id,
                date: new Date(h.created_at).toLocaleDateString('id-ID'),
                type: h.type,
                points: h.points,
                teacher: h.teacher_name || 'Staff Sekolah'
            }))

            const achievements = (historyData || []).filter(h => h.points >= 0).map(h => ({
                id: h.id,
                date: new Date(h.created_at).toLocaleDateString('id-ID'),
                type: h.type,
                points: h.points,
                teacher: h.teacher_name || 'Staff Sekolah'
            }))

            setStudent({
                ...studentData,
                class: studentData.classes?.name || '-',
                points: studentData.total_points || 0,
                reports,
                achievements
            })

            // Fetch raport bulanan
            setRaportLoading(true)
            const { data: raportData } = await supabase
                .from('student_monthly_reports')
                .select('*')
                .eq('student_id', studentData.id)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
            setRaportHistory(raportData || [])
            setRaportLoading(false)

            addToast('Data siswa berhasil ditemukan!', 'success')
        } catch (err) {
            setErrorMessage(err.message)
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
            setAutoChecking(false)
        }
    }, [addToast])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const urlCode = params.get('code')
        const urlPin = params.get('pin')
        if (urlCode && urlPin) {
            setCode(urlCode)
            setPin(urlPin)
            setAutoChecking(true)
            setTimeout(() => performCheck(urlCode, urlPin), 300)
        }
    }, [performCheck])

    const formatCode = (value) => {
        const raw = value.replace(/-/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11)
        const part1 = raw.slice(0, 3)
        const part2 = raw.slice(3, 7)
        const part3 = raw.slice(7, 11)
        let formatted = part1
        if (part2) formatted += '-' + part2
        if (part3) formatted += '-' + part3
        return formatted
    }

    const handleCheck = async (e) => {
        e.preventDefault()
        performCheck(code, pin)
    }

    const handleReset = () => {
        setStudent(null)
        setCode('')
        setPin('')
        setErrorMessage('')
        window.history.replaceState({}, '', '/check')
    }

    const handleCopyLink = () => {
        const url = `${window.location.origin}/check?code=${student?.registration_code}&pin=${pin}`
        const fallback = () => {
            const el = document.createElement('textarea')
            el.value = url
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setLinkCopied(true)
            addToast('Link berhasil disalin!', 'success')
            setTimeout(() => setLinkCopied(false), 2500)
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true)
                addToast('Link berhasil disalin!', 'success')
                setTimeout(() => setLinkCopied(false), 2500)
            }).catch(fallback)
        } else {
            fallback()
        }
    }

    // Fetch school settings — sama persis dengan SchoolSettingsContext
    useEffect(() => {
        const DEFAULT_SETTINGS = {
            school_name_id: 'Muhammadiyah Boarding School (MBS) Tanggul',
            school_name_ar: 'معهد محمدية الإسلامي تانجول',
            school_subtitle_ar: 'المجلس التعليمي للمرحلتين الابتدائية والمتوسطة التابع للرئاسة الفرعية للجمعية المحمدية',
            school_address: 'Jl. Pemandian no. 88 RT 002 RW 003 Patemon, Tanggul, Jember 68155',
            logo_url: '/src/assets/mbs.png',
            headmaster_title_id: 'Direktur MBS Tanggul',
            headmaster_name_id: 'KH. Muhammad Ali Maksum, Lc',
            headmaster_title_ar: 'مدير معهد محمدية الإسلامي تانجول',
            headmaster_name_ar: 'كياهي الحاج محمد علي معصوم، ليسانس',
            report_color_primary: '#1a5c35',
            report_color_secondary: '#c8a400',
            wa_footer: 'MBS Tanggul · Sistem Laporanmu',
        }
        supabase.from('school_settings').select('*').eq('id', 1).maybeSingle()
            .then(({ data }) => setSettings(data ? { ...DEFAULT_SETTINGS, ...data } : DEFAULT_SETTINGS))
            .catch(() => setSettings(DEFAULT_SETTINGS))
    }, [])

    // handlePrintRaport — IDENTIK dengan RaportPage generatePDFBlob
    //
    // PENTING: Jangan tambahkan font pre-loading (Google Fonts / Noto Naskh).
    // RaportPage tidak melakukan font pre-loading sama sekali dan Arabic-nya benar
    // karena 'Traditional Arabic' adalah Windows system font — sudah ada di browser
    // cache lokal, html2canvas langsung pakai tanpa perlu fetch dari internet.
    // Semua tambahan (Google Fonts link, document.fonts.load, cloneNode+patch) yang
    // kita coba sebelumnya justru merusak karena mengganggu timing html2canvas.
    const handlePrintRaport = async (r) => {
        setPdfLoading(r.id)
        try {
            await Promise.all([
                new Promise((res, rej) => { if (window.html2canvas) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
                new Promise((res, rej) => { if (window.jspdf?.jsPDF || window.jsPDF) { res(); return }; const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s) }),
            ])
            // Set data → trigger JSX render
            setPrintRaportData({ r, student })
            setPrintRenderedCount(0)
            setPrintQueue([r.id])
            // Poll sampai card ada di DOM
            let cardEl = null
            await new Promise(resolve => {
                let t = 0
                const timer = setInterval(() => {
                    const card = printContainerRef.current?.querySelector(`.raport-card[data-student-id="${student.id}"]`)
                    if (card) { cardEl = card; clearInterval(timer); resolve() }
                    if (++t > 50) { clearInterval(timer); resolve() }
                }, 100)
            })
            if (!cardEl) throw new Error('Gagal render raport card')
            // Snapshot — identik RaportPage
            const rootStyles = getComputedStyle(document.documentElement)
            const cssVars = ['--color-border', '--color-surface', '--color-surface-alt', '--color-text', '--color-text-muted'].map(v => `${v}: ${rootStyles.getPropertyValue(v).trim() || '#ccc'};`).join(' ')
            const A4W = 794, A4H = 1123, wrapper = document.createElement('div')
            wrapper.style.cssText = `position:fixed;left:-9999px;top:0;width:${A4W}px;height:${A4H}px;background:white;overflow:hidden;display:flex;align-items:flex-start;justify-content:center;font-family:'Times New Roman',serif;`
            wrapper.innerHTML = `<style>:root{${cssVars}}*{box-sizing:border-box;-webkit-print-color-adjust:exact!important}img{mix-blend-mode:multiply}.raport-card{width:${A4W}px!important;min-width:${A4W}px!important;height:${A4H}px!important;overflow:hidden!important;background:white!important;margin:0!important}</style>${cardEl.outerHTML}`
            document.body.appendChild(wrapper)
            await new Promise(res => setTimeout(res, 700))
            try {
                const canvas = await withTimeout(
                    window.html2canvas(wrapper, { scale: 3, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', width: A4W, height: A4H, scrollX: 0, scrollY: 0, logging: false }),
                    15000, 'Render PDF'
                )
                const jsPDF = window.jspdf?.jsPDF || window.jsPDF
                const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
                pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, 297)
                const bulanObj = BULAN.find(b => b.id === r.month)
                const bulanStr = bulanObj?.id_str || String(r.month)
                const safeName = student.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                const safeClass = (student.class || '').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
                pdf.save(`Raport_${safeName}_${safeClass}_${bulanStr}_${r.year}.pdf`)
                addToast('PDF berhasil diunduh!', 'success')
            } finally {
                if (document.body.contains(wrapper)) document.body.removeChild(wrapper)
                // Cleanup SETELAH snapshot — bukan sebelum (Bug #3 fix dari sesi sebelumnya)
                setPrintQueue([])
                setPrintRenderedCount(0)
                setPrintRaportData(null)
            }
        } catch (err) {
            console.error(err)
            addToast('Gagal membuat PDF. Coba lagi.', 'error')
            setPrintQueue([])
            setPrintRenderedCount(0)
            setPrintRaportData(null)
        } finally {
            setPdfLoading(null)
        }
    }

    // Auto-checking loading
    if (autoChecking) {
        return (
            <div className="min-h-screen bg-[var(--color-surface)] flex items-center justify-center p-4">
                <div className="text-center glass p-8 rounded-3xl">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--color-primary)]/30">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-white" />
                    </div>
                    <p className="font-heading font-bold text-lg text-[var(--color-text)]">Memuat Data Anak...</p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">Sistem sedang memverifikasi</p>
                </div>
            </div>
        )
    }

    // Student result view
    if (student) {
        const latestRaport = raportHistory[0] || null
        const now = new Date()
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()

        return (
            <div className="min-h-screen bg-[var(--color-surface)] py-8 px-4 relative overflow-x-hidden">
                {/* Ambient Background Glows */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-[var(--color-primary)]/5 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-[480px] mx-auto space-y-6 relative z-10">
                    {/* Nav */}
                    <div className="flex items-center justify-between glass px-5 py-3 rounded-2xl">
                        <button onClick={handleReset} className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 uppercase tracking-wide">
                            <span className="w-7 h-7 rounded-full bg-[var(--color-surface-alt)] flex items-center justify-center border border-[var(--color-border)]"><FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" /></span>
                            Kembali
                        </button>
                        <div className="flex items-center gap-3">
                            <Link to="/" className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors uppercase tracking-wide">Beranda</Link>
                            <button onClick={toggleTheme} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-all">
                                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-xs" />
                            </button>
                        </div>
                    </div>

                    {/* Profile Card */}
                    <div className="glass rounded-[2rem] overflow-hidden border border-[var(--color-border)]">
                        <div className="p-6 pb-0 flex items-center gap-5">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center text-3xl font-bold text-white shrink-0 overflow-hidden shadow-lg shadow-[var(--color-primary)]/20 shadow-inner">
                                {student.photo_url ? (
                                    <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    student.name.charAt(0)
                                )}
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-bold font-heading text-[var(--color-text)] leading-tight truncate">{student.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                                        {student.class}
                                    </span>
                                    <span className="text-xs font-mono font-medium text-[var(--color-text-muted)]">{student.registration_code}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 mt-6 bg-[var(--color-surface-alt)]/50 border-t border-[var(--color-border)] divide-x divide-[var(--color-border)]">
                            <div className="p-4 text-center">
                                <p className={`text-2xl font-bold font-heading mb-0.5 ${student.points >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {student.points > 0 ? '+' : ''}{student.points}
                                </p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Total Poin</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold font-heading text-red-500 mb-0.5">{student.reports.length}</p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Pelanggaran</p>
                            </div>
                            <div className="p-4 text-center">
                                <p className="text-2xl font-bold font-heading text-emerald-500 mb-0.5">{raportHistory.length}</p>
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Raport</p>
                            </div>
                        </div>

                        {/* Share row */}
                        <div className="flex gap-2 px-4 py-3 border-t border-[var(--color-border)]">
                            <button
                                onClick={handleCopyLink}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-black transition-all
                                    ${linkCopied
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                                        : 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30'
                                    }`}
                            >
                                <FontAwesomeIcon icon={linkCopied ? faCheck : faLink} className="text-[10px]" />
                                {linkCopied ? 'Link tersalin!' : 'Salin Link'}
                            </button>
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Assalamu'alaikum, berikut link raport ${student.name} di Pondok:\n${window.location.origin}/check?code=${student.registration_code}&pin=${pin}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-black bg-emerald-500/10 border-emerald-500/25 text-emerald-600 hover:bg-emerald-500/20 transition-all"
                            >
                                <FontAwesomeIcon icon={faWhatsapp} className="text-[11px]" />
                                Bagikan WA
                            </a>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="glass rounded-2xl p-1.5 flex gap-1">
                        <button onClick={() => setActiveTab('perilaku')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5
                                ${activeTab === 'perilaku' ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={faChartBar} className="text-[10px]" /> Perilaku
                        </button>
                        <button onClick={() => setActiveTab('raport')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 relative
                                ${activeTab === 'raport' ? 'bg-[var(--color-primary)] text-white shadow-lg shadow-[var(--color-primary)]/20' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}>
                            <FontAwesomeIcon icon={faClipboardList} className="text-[10px]" /> Raport Bulanan
                            {latestRaport && latestRaport.month === currentMonth && latestRaport.year === currentYear && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[var(--color-surface)]" />
                            )}
                        </button>
                    </div>

                    {/* ── TAB: PERILAKU ── */}
                    {activeTab === 'perilaku' && (
                        <div className="space-y-4">
                            {/* Reports */}
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest px-2 flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                    </span>
                                    Riwayat Pelanggaran
                                </p>
                                {student.reports.length > 0 ? (
                                    <div className="space-y-2">
                                        {student.reports.map((report) => (
                                            <div key={report.id} className="glass rounded-xl px-5 py-4 flex justify-between items-center gap-4 hover:border-red-500/30 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--color-text)] leading-tight truncate mb-1">{report.type}</p>
                                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
                                                        <span>{report.date}</span>
                                                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
                                                        <span className="truncate">{report.teacher}</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 font-bold font-mono text-sm">
                                                    {report.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 bg-[var(--color-surface-alt)] rounded-2xl border border-dashed border-[var(--color-border)] text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                                            <FontAwesomeIcon icon={faShieldHalved} className="text-xl text-emerald-500" />
                                        </div>
                                        <p className="text-sm font-bold text-[var(--color-text-muted)]">Nihil Pelanggaran</p>
                                        <p className="text-xs text-[var(--color-text-muted)] opacity-70 mt-1">Santri berlaku sangat baik sejauh ini.</p>
                                    </div>
                                )}
                            </div>

                            {/* Achievements */}
                            <div className="space-y-3 pt-2">
                                <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest px-2 flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 relative">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                    </span>
                                    Riwayat Prestasi
                                </p>
                                {student.achievements.length > 0 ? (
                                    <div className="space-y-2">
                                        {student.achievements.map((item) => (
                                            <div key={item.id} className="glass rounded-xl px-5 py-4 flex justify-between items-center gap-4 hover:border-emerald-500/30 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[var(--color-text)] leading-tight truncate mb-1">{item.type}</p>
                                                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
                                                        <span>{item.date}</span>
                                                        <span className="w-1 h-1 rounded-full bg-[var(--color-border)]"></span>
                                                        <span className="truncate">{item.teacher}</span>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-bold font-mono text-sm">
                                                    +{item.points}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-10 bg-[var(--color-surface-alt)] rounded-2xl border border-dashed border-[var(--color-border)] text-center space-y-2">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                                            <FontAwesomeIcon icon={faTrophy} className="text-xl text-amber-400" />
                                        </div>
                                        <p className="text-sm font-bold text-[var(--color-text-muted)]">Belum Ada Prestasi Tercatat</p>
                                        <p className="text-xs text-[var(--color-text-muted)] opacity-60 px-6 leading-relaxed">Setiap pencapaian positif santri akan muncul di sini. Terus semangat!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: RAPORT BULANAN ── */}
                    {activeTab === 'raport' && (
                        <div className="space-y-3">
                            {raportLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 rounded-2xl bg-[var(--color-surface-alt)] animate-pulse border border-[var(--color-border)]" />
                                    ))}
                                </div>
                            ) : raportHistory.length === 0 ? (
                                <div className="py-14 bg-[var(--color-surface-alt)] rounded-2xl border border-dashed border-[var(--color-border)] text-center">
                                    <FontAwesomeIcon icon={faClipboardList} className="text-3xl text-[var(--color-border)] mb-3" />
                                    <p className="text-sm font-bold text-[var(--color-text-muted)]">Belum ada raport tersimpan</p>
                                    <p className="text-xs text-[var(--color-text-muted)] opacity-60 mt-1">Raport akan muncul setelah musyrif mengisi nilai</p>
                                </div>
                            ) : (
                                raportHistory.map((r, idx) => {
                                    const avg = calcAvg(r)
                                    const g = avg ? getGrade(avg) : null
                                    const isLatest = r.month === currentMonth && r.year === currentYear
                                    const isExpanded = expandedRaport === r.id
                                    const allFilled = KRITERIA_LIST.every(k => r[k.key] !== null && r[k.key] !== undefined && r[k.key] !== '')
                                    const prevR = raportHistory[idx + 1] || null

                                    return (
                                        <div key={r.id}
                                            className="glass rounded-2xl border overflow-hidden transition-all"
                                            style={{ borderColor: isLatest ? 'rgba(16,185,129,0.3)' : 'var(--color-border)', background: isLatest ? 'rgba(16,185,129,0.03)' : undefined }}>
                                            {/* Card Header — always visible */}
                                            <button className="w-full px-5 py-4 flex items-center gap-3 text-left"
                                                onClick={() => setExpandedRaport(isExpanded ? null : r.id)}>
                                                <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border"
                                                    style={{ background: g ? g.bg : 'var(--color-surface-alt)', borderColor: g ? g.border : 'var(--color-border)' }}>
                                                    <FontAwesomeIcon icon={faClipboardList} className="text-sm" style={{ color: g ? g.color : 'var(--color-text-muted)' }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-black text-[var(--color-text)]">
                                                            {BULAN_STR[r.month]} {r.year}
                                                        </p>
                                                        {isLatest && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                                                                ✦ Terbaru
                                                            </span>
                                                        )}
                                                        {!allFilled && (
                                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/20">
                                                                Belum lengkap
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {r.musyrif && (
                                                            <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                                                                <FontAwesomeIcon icon={faUser} className="text-[8px]" /> {r.musyrif}
                                                            </span>
                                                        )}
                                                        {avg && g && (
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md" style={{ background: g.bg, color: g.color }}>
                                                                Rata-rata {avg} — {g.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {/* ── Sparkline 5 kriteria ── */}
                                                    {allFilled && (
                                                        <div className="flex items-end gap-1 mt-2 h-6">
                                                            {KRITERIA_LIST.map(k => {
                                                                const v = Number(r[k.key]) || 0
                                                                return (
                                                                    <div key={k.key} className="flex-1" title={`${k.label}: ${v}`}>
                                                                        <div className="w-full rounded-sm"
                                                                            style={{
                                                                                height: `${Math.max(3, Math.round(24 * v / 9))}px`,
                                                                                background: k.color,
                                                                                opacity: 0.65
                                                                            }} />
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                                <FontAwesomeIcon icon={isExpanded ? faChevronUp : faChevronDown}
                                                    className="text-[10px] text-[var(--color-text-muted)] shrink-0" />
                                            </button>

                                            {/* Expanded detail */}
                                            {isExpanded && (
                                                <div className="px-5 pb-5 pt-1 border-t border-[var(--color-border)] space-y-4">
                                                    {/* Nilai 5 kriteria + delta arrow */}
                                                    <div className="grid grid-cols-5 gap-2 pt-3">
                                                        {KRITERIA_LIST.map(k => {
                                                            const val = r[k.key]
                                                            const vNum = val !== null && val !== undefined && val !== '' ? Number(val) : null
                                                            const kg = vNum !== null ? getGrade(vNum) : null
                                                            const prevVal = prevR?.[k.key]
                                                            const prevNum = prevVal !== null && prevVal !== undefined && prevVal !== '' ? Number(prevVal) : null
                                                            const delta = (vNum !== null && prevNum !== null) ? vNum - prevNum : null
                                                            return (
                                                                <div key={k.key} className="flex flex-col items-center gap-1">
                                                                    <FontAwesomeIcon icon={k.icon} className="text-[10px]" style={{ color: k.color }} />
                                                                    <span className="text-[8px] font-black text-center leading-tight" style={{ color: k.color }}>
                                                                        {k.label}
                                                                    </span>
                                                                    <div className="w-full h-9 rounded-xl flex items-center justify-center text-[14px] font-black border"
                                                                        style={{
                                                                            background: kg ? kg.bg : 'var(--color-surface-alt)',
                                                                            color: kg ? kg.color : 'var(--color-text-muted)',
                                                                            borderColor: kg ? kg.border : 'var(--color-border)'
                                                                        }}>
                                                                        {vNum !== null ? vNum : '—'}
                                                                    </div>
                                                                    {delta !== null && delta !== 0 && (
                                                                        <span className={`text-[8px] font-black flex items-center gap-0.5 ${delta > 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                            <FontAwesomeIcon icon={delta > 0 ? faArrowUp : faArrowDown} className="text-[7px]" />
                                                                            {Math.abs(delta)}
                                                                        </span>
                                                                    )}
                                                                    {delta === 0 && prevNum !== null && (
                                                                        <span className="text-[8px] text-[var(--color-text-muted)]">—</span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })}
                                                    </div>

                                                    {/* Data tambahan jika ada */}
                                                    {(r.ziyadah || r.murojaah || r.hari_sakit || r.hari_izin || r.hari_alpa || r.berat_badan || r.tinggi_badan) && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {r.ziyadah && (
                                                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Ziyadah</p>
                                                                    <p className="text-sm font-black text-emerald-500">{r.ziyadah}</p>
                                                                </div>
                                                            )}
                                                            {r.murojaah && (
                                                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Muroja'ah</p>
                                                                    <p className="text-sm font-black text-indigo-500">{r.murojaah}</p>
                                                                </div>
                                                            )}
                                                            {(r.hari_sakit !== null && r.hari_sakit !== undefined) && (
                                                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Hari Sakit</p>
                                                                    <p className="text-sm font-black text-red-400">{r.hari_sakit} hari</p>
                                                                </div>
                                                            )}
                                                            {(r.hari_izin !== null && r.hari_izin !== undefined) && (
                                                                <div className="px-3 py-2 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                                                                    <p className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Hari Izin</p>
                                                                    <p className="text-sm font-black text-amber-500">{r.hari_izin} hari</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Catatan musyrif */}
                                                    {r.catatan && (
                                                        <div className="px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                                                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Catatan Musyrif</p>
                                                            <p className="text-xs text-[var(--color-text)] leading-relaxed italic">{r.catatan}</p>
                                                        </div>
                                                    )}

                                                    {/* PDF Download Button */}
                                                    <button
                                                        onClick={() => handlePrintRaport(r)}
                                                        disabled={pdfLoading === r.id}
                                                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[11px] font-black transition-all mt-1
                                                            ${pdfLoading === r.id
                                                                ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] text-[var(--color-text-muted)] opacity-60 cursor-not-allowed'
                                                                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/20'
                                                            }`}
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={pdfLoading === r.id ? faSpinner : faFilePdf}
                                                            className={`text-[10px] ${pdfLoading === r.id ? 'animate-spin' : ''}`}
                                                        />
                                                        {pdfLoading === r.id ? 'Membuat PDF...' : `Unduh PDF — ${BULAN_STR[r.month]} ${r.year}`}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {/* Hidden container for PDF rendering */}
                    {/* Hidden print container — render JSX langsung persis RaportPage */}
                    {printQueue.length > 0 && printRaportData && (
                        <div ref={printContainerRef} style={{ position: 'fixed', left: '-9999px', top: 0, visibility: 'hidden', pointerEvents: 'none' }}>
                            <RaportPrintCard
                                student={printRaportData.student}
                                scores={{
                                    nilai_akhlak: printRaportData.r.nilai_akhlak,
                                    nilai_ibadah: printRaportData.r.nilai_ibadah,
                                    nilai_kebersihan: printRaportData.r.nilai_kebersihan,
                                    nilai_quran: printRaportData.r.nilai_quran,
                                    nilai_bahasa: printRaportData.r.nilai_bahasa,
                                }}
                                extra={{
                                    berat_badan: printRaportData.r.berat_badan,
                                    tinggi_badan: printRaportData.r.tinggi_badan,
                                    ziyadah: printRaportData.r.ziyadah,
                                    murojaah: printRaportData.r.murojaah,
                                    hari_sakit: printRaportData.r.hari_sakit,
                                    hari_izin: printRaportData.r.hari_izin,
                                    hari_alpa: printRaportData.r.hari_alpa,
                                    hari_pulang: printRaportData.r.hari_pulang,
                                    catatan: printRaportData.r.catatan,
                                }}
                                bulanObj={BULAN.find(b => b.id === printRaportData.r.month)}
                                tahun={printRaportData.r.year}
                                musyrif={printRaportData.r.musyrif}
                                className={printRaportData.student.class}
                                lang="ar"
                                settings={settings}
                                onRendered={() => setPrintRenderedCount(c => c + 1)}
                            />
                        </div>
                    )}

                    {/* Support */}
                    <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 mt-2 shadow-xl">
                        <div className="min-w-0">
                            <p className="font-bold text-white mb-1">Perlu Bantuan?</p>
                            <p className="text-xs text-slate-300 truncate">Konsultasi langsung dengan wali kelas / BK</p>
                        </div>
                        <div className="flex gap-2">
                            {/* TODO: ganti nomor WA dengan kontak BK/wali kelas pondok */}
                            <a href="https://wa.me/6281234567890" className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg hover:bg-emerald-500 hover:text-white transition-all">
                                <FontAwesomeIcon icon={faWhatsapp} />
                            </a>
                            <a href="tel:+6281234567890" className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white text-sm hover:bg-white/20 transition-all">
                                <FontAwesomeIcon icon={faPhone} />
                            </a>
                        </div>
                    </div>

                    <p className="text-center text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-[0.2em] pt-4 opacity-70">
                        Laporanmu © 2026
                    </p>
                </div>
            </div>
        )
    }

    // Form view
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)] relative overflow-hidden px-4 py-8 transition-colors">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute top-[10%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[var(--color-primary)]/10 blur-[80px]" />
                <div className="absolute bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full bg-[var(--color-accent)]/10 blur-[100px]" />
            </div>

            <div className="w-full max-w-[420px] space-y-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                            <span className="text-white font-bold font-heading text-lg">L</span>
                        </div>
                        <span className="font-heading font-bold text-xl text-[var(--color-text)]">Laporan<span className="text-[var(--color-primary)]">mu</span></span>
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/30 transition-all"
                        aria-label="Toggle theme"
                    >
                        <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="text-sm" />
                    </button>
                </div>

                {/* Title */}
                <div className="text-center sm:text-left mt-8 mb-4">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-text)] mb-2">Cek Data Anak</h1>
                    <p className="text-sm text-[var(--color-text-muted)]">Gunakan kode registrasi & PIN dari sekolah</p>
                </div>

                {/* Form Card */}
                <div className="glass rounded-[2rem] p-6 sm:p-8">
                    <form onSubmit={handleCheck} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">Kode Registrasi</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faIdCard} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(formatCode(e.target.value))}
                                    placeholder="REG-XXXX-XXXX"
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold uppercase tracking-widest text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:font-medium placeholder:tracking-normal placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider pl-1">PIN Rahasia</label>
                            <div className="relative">
                                <FontAwesomeIcon icon={faKey} className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)] opacity-70" />
                                <input
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    placeholder="••••"
                                    maxLength={4}
                                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 rounded-xl pl-11 pr-4 py-3.5 text-lg font-bold tracking-[0.5em] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] placeholder:text-sm placeholder:tracking-normal placeholder:font-medium placeholder:opacity-50 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {errorMessage && (
                            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center shrink-0">!</div>
                                <p className="text-xs font-medium text-red-500">
                                    {errorMessage}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`btn btn-primary w-full py-3.5 mt-2 shadow-lg shadow-[var(--color-primary)]/20 ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <><FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" /> Memeriksa...</>
                            ) : (
                                <><FontAwesomeIcon icon={faSearch} className="text-sm mr-1" /> Cek Data</>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
                        <p className="text-[11px] font-medium tracking-wide text-[var(--color-text-muted)] text-center">Belum punya kode? Hubungi wali kelas.</p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex items-center justify-between text-xs px-2">
                    <Link to="/login" className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                        Guru/Staff Login di sini
                    </Link>
                    <Link to="/" className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                        ← Kembali
                    </Link>
                </div>
            </div>
        </div>
    )
}