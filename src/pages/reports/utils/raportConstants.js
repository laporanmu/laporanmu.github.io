import { 
    faStar, faMosque, faBroom, faBookOpen, faLanguage,
    faWeightScale, faRulerVertical, faBandage, faCircleExclamation, 
    faTriangleExclamation, faDoorOpen, faFileLines
} from '@fortawesome/free-solid-svg-icons'

export const MAX_SCORE = 9
export const STORAGE_BUCKET = 'raport-mbs'

export const toArabicNum = (n) => String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d])

export const BULAN = [
    { id: 1, ar: 'يناير', id_str: 'Januari' },
    { id: 2, ar: 'فبراير', id_str: 'Februari' },
    { id: 3, ar: 'مارس', id_str: 'Maret' },
    { id: 4, ar: 'أبريل', id_str: 'April' },
    { id: 5, ar: 'مايو', id_str: 'Mei' },
    { id: 6, id_str: 'Juni' },
    { id: 7, id_str: 'Juli' },
    { id: 8, id_str: 'Agustus' },
    { id: 9, id_str: 'September' },
    { id: 10, id_str: 'Oktober' },
    { id: 11, id_str: 'November' },
    { id: 12, id_str: 'Desember' },
]

export const CATATAN_TEMPLATES = [
    'Alhamdulillah perkembangannya sangat baik bulan ini.',
    'Perlu perhatian lebih pada aspek kedisiplinan.',
    'Konsisten dan terus meningkat, pertahankan.',
    'Mohon dukungan orang tua untuk hafalan di rumah.',
    'Ada peningkatan signifikan dibanding bulan lalu.',
    'Perlu bimbingan lebih intensif untuk Al-Qur\'an.',
    'Akhlak dan ibadah sangat baik, tingkatkan bahasa.',
    'Kesehatan kurang baik bulan ini, semoga lekas pulih.',
]

export const LABEL = {
    ar: {
        studentName: 'اسم الطالب', room: 'الغرفة', class: 'الفصل', year: 'العام الدراسي',
        dailyWork: 'الأعمال اليومية', subject: 'المواد الدراسية', score: 'النقاط',
        grade: 'التقدير', num: 'الرقم', weight: 'وزن البدن', height: 'طول البden',
        ziyadah: 'الزيادة', murojaah: 'المراجعة', sick: 'المريض', home: 'الإجازة',
        izin: 'الإذن', alpa: 'الغيab', gradeScale: 'نظام التقدير',
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

export const KRITERIA = [
    { key: 'nilai_akhlak', id: 'Akhlak', ar: 'الأخلاق', arShort: 'الأخلاق', icon: faStar, color: '#f59e0b' },
    { key: 'nilai_ibadah', id: 'Ibadah', ar: 'العبادة', arShort: 'العبادة', icon: faMosque, color: '#6366f1' },
    { key: 'nilai_kebersihan', id: 'Kebersihan', ar: 'النظافة', arShort: 'النظافة', icon: faBroom, color: '#06b6d4' },
    { key: 'nilai_quran', id: "Al-Qur'an", ar: 'تحسين القراءة وحفظ القرآن', arShort: 'القرآن', icon: faBookOpen, color: '#10b981' },
    { key: 'nilai_bahasa', id: 'Bahasa', ar: 'اللغة', arShort: 'اللغة', icon: faLanguage, color: '#8b5cf6' },
]

export const FISIK_FIELDS = [
    { key: 'berat_badan', label: 'BB', icon: faWeightScale, color: '#6366f1', unit: 'kg' },
    { key: 'tinggi_badan', label: 'TB', icon: faRulerVertical, color: '#06b6d4', unit: 'cm' },
    { key: 'hari_sakit', label: 'Skt', icon: faBandage, color: '#ef4444', unit: 'hr' },
    { key: 'hari_izin', label: 'Izin', icon: faCircleExclamation, color: '#f59e0b', unit: 'hr' },
    { key: 'hari_alpa', label: 'Alpa', icon: faTriangleExclamation, color: '#ef4444', unit: 'hr' },
    { key: 'hari_pulang', label: 'Plg', icon: faDoorOpen, color: '#8b5cf6', unit: 'x' },
]

export const HAFALAN_FIELDS = [
    { key: 'ziyadah', ph: 'Ziyadah', icon: faBookOpen, color: '#10b981' },
    { key: 'murojaah', ph: "Muroja'ah", icon: faFileLines, color: '#8b5cf6' },
]

export const GRADE = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'ممتاز', id: 'Istimewa', bg: '#10b98115', border: '#10b98140', uiColor: '#10b981', color: '#000' }
    if (num >= 8) return { label: 'جيد جدا', id: 'Sangat Baik', bg: '#3b82f615', border: '#3b82f640', uiColor: '#3b82f6', color: '#000' }
    if (num >= 6) return { label: 'جيد', id: 'Baik', bg: '#6366f115', border: '#6366f140', uiColor: '#6366f1', color: '#000' }
    if (num >= 4) return { label: 'مقبول', id: 'Cukup', bg: '#f59e0b15', border: '#f59e0b40', uiColor: '#f59e0b', color: '#000' }
    return { label: 'راسب', id: 'Kurang', bg: '#ef444415', border: '#ef444440', uiColor: '#ef4444', color: '#ef4444' }
}

export const calcAvg = (scores) => {
    const vals = KRITERIA.map(k => scores[k.key]).filter(v => v !== '' && v !== null && v !== undefined)
    if (!vals.length) return null
    return (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1)
}
