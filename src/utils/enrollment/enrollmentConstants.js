// ─── PSB / Enrollment Constants ───────────────────────────────────────────────

export const ENROLLMENT_STATUS = {
    MENDAFTAR: 'mendaftar',
    VERIFIKASI: 'verifikasi',
    TES: 'tes',
    DITERIMA: 'diterima',
    DITOLAK: 'ditolak',
}

export const STATUS_CONFIG = {
    mendaftar: {
        label: 'Mendaftar',
        color: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
        dot: 'bg-sky-500',
        icon: 'faClipboardList',
        step: 1,
    },
    verifikasi: {
        label: 'Verifikasi',
        color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        dot: 'bg-amber-500',
        icon: 'faFileCircleCheck',
        step: 2,
    },
    tes: {
        label: 'Tes Baca/Hafalan',
        color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
        dot: 'bg-purple-500',
        icon: 'faBookQuran',
        step: 3,
    },
    diterima: {
        label: 'Diterima',
        color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        dot: 'bg-emerald-500',
        icon: 'faCircleCheck',
        step: 4,
    },
    ditolak: {
        label: 'Ditolak',
        color: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
        dot: 'bg-rose-500',
        icon: 'faCircleXmark',
        step: -1,
    },
}

export const PIPELINE_STEPS = [
    { key: 'mendaftar', label: 'Mendaftar' },
    { key: 'verifikasi', label: 'Verifikasi' },
    { key: 'tes', label: 'Tes' },
    { key: 'diterima', label: 'Diterima' },
]

export const PROGRAM_OPTIONS = [
    { id: 'tahfidz', name: 'Tahfidz', desc: 'Program hafalan Al-Quran intensif' },
    { id: 'reguler', name: 'Reguler', desc: 'Program pendidikan umum & diniyah' },
    { id: 'intensif', name: 'Intensif', desc: 'Program akselerasi akademik & diniyah' },
]

export const QURAN_LEVELS = [
    { id: 'belum', name: 'Belum Bisa', color: 'text-rose-500 bg-rose-500/10' },
    { id: 'iqro', name: "Iqro'", color: 'text-amber-500 bg-amber-500/10' },
    { id: 'lancar', name: 'Lancar', color: 'text-sky-500 bg-sky-500/10' },
    { id: 'tartil', name: 'Tartil', color: 'text-emerald-500 bg-emerald-500/10' },
]

export const TEST_SCORES = [
    { id: 'mumtaz', name: 'Mumtaz (Istimewa)', color: 'text-emerald-600 bg-emerald-500/10' },
    { id: 'jayyid_jiddan', name: 'Jayyid Jiddan (Sangat Baik)', color: 'text-sky-600 bg-sky-500/10' },
    { id: 'jayyid', name: 'Jayyid (Baik)', color: 'text-indigo-600 bg-indigo-500/10' },
    { id: 'maqbul', name: 'Maqbul (Cukup)', color: 'text-amber-600 bg-amber-500/10' },
    { id: 'rasib', name: 'Rasib (Kurang)', color: 'text-rose-600 bg-rose-500/10' },
]

export const UNIFORM_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export const SORT_OPTIONS = [
    { value: 'name_asc', label: 'Nama A–Z' },
    { value: 'name_desc', label: 'Nama Z–A' },
    { value: 'date_desc', label: 'Terbaru' },
    { value: 'date_asc', label: 'Terlama' },
]

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_NAMES_MALE = [
    'Ahmad Fadhil Rizqi', 'Muhammad Hafizh Al-Farisi', 'Abdullah Syakir Rahman',
    'Umar Hadi Prasetyo', 'Zaid Ibrahim Hakim', 'Bilal Aditya Nugraha',
    'Hasan Maulana Akbar', 'Yusuf Ardiansyah', 'Khalid Rafi Permana',
    'Salman Al-Farabi', 'Rizki Fauzan Hidayat', 'Dimas Arya Pratama',
    'Naufal Aziz Kurniawan', 'Farid Maulana Putra', 'Ikhsan Ramadhan Wibowo',
]

const MOCK_NAMES_FEMALE = [
    'Aisyah Putri Ramadhani', 'Fatimah Azzahra Salsabila', 'Khadijah Nur Aini',
    'Hafshah Dewi Lestari', 'Zahra Amelia Puspita', 'Maryam Indah Permata',
    'Safiyyah Dwi Anggraini', 'Ruqayyah Sari Utami', 'Ummu Kalsum Fitria',
    'Halimah Tri Wahyuni', 'Aminah Citra Dewi', 'Nabila Putri Handayani',
    'Syifa Nur Hidayah', 'Aliyah Rizka Amalia', 'Farah Dina Maharani',
]

const MOCK_SCHOOLS = [
    'SDN 1 Sukamakmur', 'SDN Cipinang 05', 'MI Al-Hikmah', 'MI Nurul Iman',
    'SD Islam Terpadu Al-Ikhlas', 'SDN Cikaret 01', 'MI Darul Falah',
    'SD Muhammadiyah 4', 'SDN Bojong Gede 03', 'MI Al-Munawaroh',
    'SD IT Bina Insani', 'SDN Parung 02', 'MI Miftahul Huda',
    'SD Al-Azhar Syifa Budi', 'SDN Sawangan 06',
]

const MOCK_CITIES = [
    'Bogor', 'Depok', 'Tangerang', 'Bekasi', 'Jakarta Timur',
    'Jakarta Selatan', 'Sukabumi', 'Cianjur', 'Bandung', 'Serang',
]

const MOCK_ADDRESSES = [
    'Jl. Raya Parung No. 45, Bogor', 'Jl. Margonda Raya No. 12, Depok',
    'Jl. Ciputat Raya No. 88, Tangerang Selatan', 'Kp. Cimanggis RT 03/05, Depok',
    'Jl. Raya Sawangan No. 32, Depok', 'Jl. KH. Hasyim Ashari No. 7, Ciledug',
    'Kp. Babakan RT 01/02, Bogor', 'Jl. Raya Cibinong No. 56, Bogor',
    'Jl. Pemuda No. 23, Bekasi', 'Kp. Sindangsari RT 04/06, Sukabumi',
]

const MOCK_FATHER_NAMES = [
    'H. Ahmad Sulaiman', 'Ir. Bambang Hermawan', 'Drs. Cecep Hidayat',
    'H. Dedi Mulyadi', 'Eko Prasetyo, S.Pd', 'Fajar Nugroho',
    'Gunawan Wibisono', 'Hendra Saputra', 'Irfan Hakim',
    'Joko Widodo', 'Kurniawan Dwi Putra', 'Lukman Hakim',
    'Mulyono Hadi', 'Nurhadi Setiawan', 'Oman Supriatna',
]

const MOCK_MOTHER_NAMES = [
    'Hj. Siti Aminah', 'Yuli Astuti', 'Dewi Rahayu',
    'Nur Hasanah', 'Sri Wahyuni', 'Rina Marlina',
    'Wati Susilawati', 'Eni Kurniasih', 'Fitri Handayani',
    'Ani Suryani', 'Ida Farida', 'Lilis Suryani',
    'Maya Sari', 'Neni Rohaeni', 'Puspita Sari',
]

function randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(start, end) {
    const s = start.getTime()
    const e = end.getTime()
    const d = new Date(s + Math.random() * (e - s))
    return d.toISOString().split('T')[0]
}

function generateRegistrationNumber(index) {
    return `PSB-2026-${String(index + 1).padStart(4, '0')}`
}

function generateMockEnrollments(count = 30) {
    const enrollments = []
    const statuses = ['mendaftar', 'verifikasi', 'tes', 'diterima', 'ditolak']
    const statusWeights = [0.25, 0.2, 0.2, 0.25, 0.1]
    const programs = ['tahfidz', 'reguler', 'intensif']
    const quranLevels = ['belum', 'iqro', 'lancar', 'tartil']
    const testScores = ['mumtaz', 'jayyid_jiddan', 'jayyid', 'maqbul', 'rasib']
    const uniformSizes = ['S', 'M', 'L', 'XL']
    const waves = ['wave-1', 'wave-2']

    for (let i = 0; i < count; i++) {
        const gender = Math.random() > 0.45 ? 'L' : 'P'
        const name = gender === 'L'
            ? randomPick(MOCK_NAMES_MALE)
            : randomPick(MOCK_NAMES_FEMALE)

        // Weighted random status
        let r = Math.random()
        let status = 'mendaftar'
        let acc = 0
        for (let s = 0; s < statuses.length; s++) {
            acc += statusWeights[s]
            if (r <= acc) { status = statuses[s]; break }
        }

        const program = randomPick(programs)
        const quranLevel = randomPick(quranLevels)
        const hafalanJuz = program === 'tahfidz'
            ? Math.floor(Math.random() * 10) + 1
            : Math.floor(Math.random() * 3)

        const hasTestScore = status === 'tes' || status === 'diterima' || status === 'ditolak'

        enrollments.push({
            id: `enroll-${String(i + 1).padStart(3, '0')}`,
            registration_number: generateRegistrationNumber(i),
            wave_id: randomPick(waves),
            name,
            gender,
            birth_place: randomPick(MOCK_CITIES),
            birth_date: randomDate(new Date(2012, 0, 1), new Date(2015, 11, 31)),
            nisn: String(Math.floor(1000000000 + Math.random() * 9000000000)),
            school_origin: randomPick(MOCK_SCHOOLS),
            previous_pesantren: Math.random() > 0.8 ? randomPick(['PP Darussalam', 'PP Al-Amin', 'PP Nurul Fikri']) : '',
            phone: `08${Math.floor(1000000000 + Math.random() * 9000000000).toString().slice(0, 10)}`,
            photo_url: '',
            father_name: randomPick(MOCK_FATHER_NAMES),
            mother_name: randomPick(MOCK_MOTHER_NAMES),
            address: randomPick(MOCK_ADDRESSES),
            program,
            hafalan_quran: hafalanJuz,
            quran_level: quranLevel,
            health_notes: Math.random() > 0.85 ? randomPick(['Alergi debu', 'Asma ringan', 'Alergi seafood', '']) : '',
            uniform_size: randomPick(uniformSizes),
            status,
            test_score: hasTestScore ? randomPick(testScores) : '',
            notes: '',
            target_class_id: '',
            documents: {},
            metadata: {},
            created_at: randomDate(new Date(2026, 0, 15), new Date(2026, 4, 20)) + 'T08:00:00.000Z',
            updated_at: new Date().toISOString(),
        })
    }

    // Sort by created_at descending
    enrollments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return enrollments
}

export const MOCK_ENROLLMENTS = generateMockEnrollments(30)

export const MOCK_WAVES = [
    {
        id: 'wave-1',
        name: 'Gelombang 1',
        academic_year: '2026/2027',
        start_date: '2026-01-15',
        end_date: '2026-03-31',
        quota: 60,
        is_active: false,
    },
    {
        id: 'wave-2',
        name: 'Gelombang 2',
        academic_year: '2026/2027',
        start_date: '2026-04-01',
        end_date: '2026-06-30',
        quota: 40,
        is_active: true,
    },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getStatusConfig(status) {
    return STATUS_CONFIG[status] || STATUS_CONFIG.mendaftar
}

export function getTestScoreConfig(score) {
    return TEST_SCORES.find(t => t.id === score) || null
}

export function getQuranLevelConfig(level) {
    return QURAN_LEVELS.find(q => q.id === level) || null
}

export function getProgramLabel(programId) {
    return PROGRAM_OPTIONS.find(p => p.id === programId)?.name || programId || '-'
}

export function formatEnrollmentDate(isoString) {
    if (!isoString) return '-'
    const d = new Date(isoString)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
