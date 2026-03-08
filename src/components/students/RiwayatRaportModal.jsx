import { useState, useEffect, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faSpinner, faArrowLeft, faPrint, faMagnifyingGlass,
    faXmark, faClipboardList, faUsers, faTableList,
    faFileZipper, faChevronDown, faBoxArchive,
    faFilter, faChartBar, faCalendarAlt, faSchool,
    faCircleCheck, faTriangleExclamation, faStar,
    faTrashAlt, faFilePdf
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

// ─── Re-use dari RaportBulananModal ──────────────────────────────────────────

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

const KRITERIA_KEYS = ['nilai_akhlak', 'nilai_ibadah', 'nilai_kebersihan', 'nilai_quran', 'nilai_bahasa']
const KRITERIA_LABELS = { nilai_akhlak: 'Akhlak', nilai_ibadah: 'Ibadah', nilai_kebersihan: 'Kebersihan', nilai_quran: "Al-Qur'an", nilai_bahasa: 'Bahasa' }

const GRADE = (n) => {
    const num = Number(n)
    if (num >= 9) return { label: 'Istimewa', ar: 'ممتاز', color: '#10b981', bg: '#10b98112' }
    if (num >= 8) return { label: 'Sangat Baik', ar: 'جيد جدا', color: '#3b82f6', bg: '#3b82f612' }
    if (num >= 6) return { label: 'Baik', ar: 'جيد', color: '#6366f1', bg: '#6366f112' }
    if (num >= 4) return { label: 'Cukup', ar: 'مقبول', color: '#f59e0b', bg: '#f59e0b12' }
    return { label: 'Kurang', ar: 'راسب', color: '#ef4444', bg: '#ef444412' }
}

// Mini bar chart for trend
const TrendBar = ({ values, label, color }) => {
    const max = Math.max(...values.filter(Boolean), 9)
    return (
        <div className="flex flex-col gap-1">
            <div className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color }}>{label}</div>
            <div className="flex items-end gap-0.5 h-10">
                {values.map((v, i) => (
                    <div key={i} className="flex-1 rounded-sm transition-all"
                        style={{ height: v ? `${(v / max) * 100}%` : '4px', background: v ? color : 'var(--color-border)', opacity: v ? 1 : 0.3 }}
                        title={v ? `${BULAN[i % 12]?.id_str}: ${v}` : '—'} />
                ))}
            </div>
        </div>
    )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function RiwayatRaportModal({ isOpen, onClose, classesList = [] }) {
    const { addToast } = useToast()

    // ── State
    const [loading, setLoading] = useState(false)
    const [archiveList, setArchiveList] = useState([])       // grouped entries
    const [rawReports, setRawReports] = useState([])         // flat raw data for stats
    const [view, setView] = useState('list')                  // 'list' | 'detail' | 'stats'
    const [detailEntry, setDetailEntry] = useState(null)
    const [detailStudents, setDetailStudents] = useState([])
    const [detailScores, setDetailScores] = useState({})
    const [detailExtras, setDetailExtras] = useState({})
    const [previewStudentId, setPreviewStudentId] = useState(null)
    const [filter, setFilter] = useState({ classId: '', year: '', search: '' })
    const [exportingId, setExportingId] = useState(null)

    // ── Load archive on open
    useEffect(() => {
        if (isOpen) loadArchive()
        else { setView('list'); setDetailEntry(null); setPreviewStudentId(null) }
    }, [isOpen])

    const loadArchive = useCallback(async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('student_monthly_reports')
                .select(`
                    student_id, month, year, musyrif_name,
                    nilai_akhlak, nilai_ibadah, nilai_kebersihan, nilai_quran, nilai_bahasa,
                    students(id, name, class_id, classes(id, name, type))
                `)
                .order('year', { ascending: false })
                .order('month', { ascending: false })
            if (error) throw error

            setRawReports(data || [])

            // Group by class + month + year
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
                        lang: (cls.type === 'boarding' || cls.type === 'pondok') ? 'ar' : 'id',
                        avgScores: { nilai_akhlak: [], nilai_ibadah: [], nilai_kebersihan: [], nilai_quran: [], nilai_bahasa: [] }
                    }
                }
                grouped[key].count++
                const hasAll = KRITERIA_KEYS.every(k => row[k] !== null)
                if (hasAll) grouped[key].completed++
                KRITERIA_KEYS.forEach(k => { if (row[k] !== null) grouped[key].avgScores[k].push(row[k]) })
            }

            // Compute averages per entry
            const entries = Object.values(grouped).map(e => ({
                ...e,
                avgs: Object.fromEntries(KRITERIA_KEYS.map(k => {
                    const vals = e.avgScores[k]
                    return [k, vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null]
                }))
            }))

            setArchiveList(entries.sort((a, b) => b.year - a.year || b.month - a.month))
        } catch (e) {
            addToast('Gagal memuat riwayat raport', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Load detail for one entry
    const loadDetail = useCallback(async (entry) => {
        setLoading(true)
        setDetailEntry(entry)
        try {
            const { data: stuData } = await supabase
                .from('students').select('id, name, phone, metadata')
                .eq('class_id', entry.class_id).is('deleted_at', null).order('name')
            const ids = (stuData || []).map(s => s.id)
            const { data: repData } = await supabase
                .from('student_monthly_reports').select('*')
                .in('student_id', ids).eq('month', entry.month).eq('year', entry.year)

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
            setDetailStudents(stuData || [])
            setDetailScores(scMap)
            setDetailExtras(exMap)
            setPreviewStudentId((stuData || [])[0]?.id || null)
            setView('detail')
        } catch (e) {
            addToast('Gagal memuat detail', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    // ── Delete entry
    const deleteEntry = useCallback(async (entry) => {
        if (!window.confirm(`Hapus semua raport ${BULAN.find(b => b.id === entry.month)?.id_str} ${entry.year} kelas ${entry.class_name}? Tidak bisa dibatalkan.`)) return
        try {
            const { data: stuData } = await supabase.from('students').select('id').eq('class_id', entry.class_id)
            const ids = (stuData || []).map(s => s.id)
            await supabase.from('student_monthly_reports').delete().in('student_id', ids).eq('month', entry.month).eq('year', entry.year)
            addToast('Arsip berhasil dihapus', 'success')
            loadArchive()
        } catch (e) {
            addToast('Gagal menghapus', 'error')
        }
    }, [loadArchive])

    // ── Export Bulk PDF — new window with all raport, print to PDF
    const exportBulk = useCallback(async (entry) => {
        setExportingId(entry.key)
        try {
            const { data: stuData } = await supabase
                .from('students').select('id, name, phone, metadata')
                .eq('class_id', entry.class_id).is('deleted_at', null).order('name')
            const ids = (stuData || []).map(s => s.id)
            const { data: repData } = await supabase
                .from('student_monthly_reports').select('*')
                .in('student_id', ids).eq('month', entry.month).eq('year', entry.year)

            const bulan = BULAN.find(b => b.id === entry.month)
            const isAr = entry.lang === 'ar'

            const cards = (stuData || []).map(student => {
                const rep = repData?.find(r => r.student_id === student.id) || {}
                const rows = [
                    ['nilai_akhlak', isAr ? 'الأخلاق' : 'Akhlak'],
                    ['nilai_ibadah', isAr ? 'العبادة' : 'Ibadah'],
                    ['nilai_kebersihan', isAr ? 'النظافة' : 'Kebersihan'],
                    ['nilai_quran', isAr ? 'تحسين القراءة وحفظ القرآن' : "Al-Qur'an"],
                    ['nilai_bahasa', isAr ? 'اللغة' : 'Bahasa'],
                ]
                const arNums = ['١', '٢', '٣', '٤', '٥']
                const gradeRows = rows.map(([key, label], i) => {
                    const val = rep[key]
                    const g = val !== null && val !== undefined ? GRADE(val) : null
                    const gradeLabel = g ? (isAr ? g.ar : g.label) : '—'
                    if (isAr) {
                        return `<tr>
                            <td style="border:1px solid #999;padding:4px 8px;text-align:center;font-weight:700;color:${g?.color || '#000'};font-family:'Traditional Arabic',serif">${gradeLabel}</td>
                            <td style="border:1px solid #999;padding:4px 8px;text-align:center;font-weight:700">${val ?? '—'}</td>
                            <td style="border:1px solid #999;padding:4px 8px;font-family:'Traditional Arabic',serif">${label}</td>
                            <td style="border:1px solid #999;padding:4px 8px;text-align:center;font-family:'Traditional Arabic',serif">${arNums[i]}</td>
                        </tr>`
                    } else {
                        return `<tr>
                            <td style="border:1px solid #999;padding:4px 8px;text-align:center">${i + 1}</td>
                            <td style="border:1px solid #999;padding:4px 8px">${label}</td>
                            <td style="border:1px solid #999;padding:4px 8px;text-align:center;font-weight:700">${val ?? '—'}</td>
                            <td style="border:1px solid #999;padding:4px 8px;text-align:center;font-weight:700;color:${g?.color || '#000'}">${gradeLabel}</td>
                        </tr>`
                    }
                }).join('')

                const tableHead = isAr
                    ? `<th style="border:1px solid #999;padding:4px 8px;width:18%;font-family:'Traditional Arabic',serif">التقدم</th>
                       <th style="border:1px solid #999;padding:4px 8px;width:14%;font-family:'Traditional Arabic',serif">النقاط</th>
                       <th style="border:1px solid #999;padding:4px 8px;font-family:'Traditional Arabic',serif">المواد الدراسية</th>
                       <th style="border:1px solid #999;padding:4px 8px;width:8%;font-family:'Traditional Arabic',serif">الرقم</th>`
                    : `<th style="border:1px solid #999;padding:4px 8px;width:8%">No</th>
                       <th style="border:1px solid #999;padding:4px 8px">Mata Pelajaran</th>
                       <th style="border:1px solid #999;padding:4px 8px;width:14%">Nilai</th>
                       <th style="border:1px solid #999;padding:4px 8px;width:18%">Predikat</th>`

                const dir = isAr ? 'rtl' : 'ltr'
                const yearStr = isAr ? `${entry.year.toString().replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d])} – ٢٠٢٥` : `2025 – ${entry.year}`

                return `
                <div style="font-family:'Times New Roman',serif;width:210mm;min-height:297mm;background:#fff;color:#000;padding:12mm 15mm;box-sizing:border-box;font-size:11pt;line-height:1.4;page-break-after:always">
                    <!-- Header -->
                    <div style="border-bottom:3px double #1a5c35;padding-bottom:8px;margin-bottom:10px;display:flex;align-items:center;gap:16px">
                        <img src="/src/assets/mbs.png" style="width:80px;height:80px;object-fit:contain;mix-blend-mode:multiply;flex-shrink:0" />
                        <div style="flex:1;text-align:center">
                            <div style="font-size:8pt;color:#444;direction:rtl;margin-bottom:3px;font-family:'Traditional Arabic',serif">المجلس التعليمي للمرحلتين الابتدائية والمتوسطة التابع للرئاسة الفرعية للجمعية المحمدية</div>
                            <div style="font-size:20pt;font-weight:900;color:#1a5c35;direction:rtl;font-family:'Traditional Arabic',serif">معهد محمدية الإسلامي تانجول</div>
                            <div style="font-size:10pt;font-weight:700;letter-spacing:2.5px;color:#333;margin-top:1px">MUHAMMADIYAH BOARDING SCHOOL (MBS) TANGGUL</div>
                            <div style="font-size:7.5pt;color:#666;margin-top:2px">Muhammadiyah Boarding School (MBS) | Jl. Pembangunan no. 88 Rt 003/003 kelurahan Tanggul Jember 68155</div>
                            <div style="margin-top:5px;height:3px;background:linear-gradient(90deg,#1a5c35,#c8a400,#1a5c35)"></div>
                        </div>
                    </div>
                    <!-- Judul -->
                    <div style="text-align:center;margin:8px 0 12px">
                        <div style="font-size:14pt;font-weight:900;direction:${dir};font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'نتيجة الشخصية' : 'Raport Bulanan'}</div>
                        <div style="font-size:12pt;font-weight:700;direction:${dir};margin-top:2px">${isAr ? `شهر ${bulan?.ar}` : `Bulan ${bulan?.id_str}`}</div>
                    </div>
                    <!-- Info Siswa -->
                    <table style="width:100%;margin-bottom:10px;font-size:10.5pt;border-collapse:collapse;direction:${dir}">
                        <tbody>
                            <tr>
                                <td style="padding-bottom:5px;width:20%;text-align:${isAr ? 'right' : 'left'};font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'اسم الطالب' : 'Nama Santri'} :</td>
                                <td style="font-weight:700;padding-bottom:5px;width:30%;text-align:${isAr ? 'right' : 'left'}">${student.name}</td>
                                <td style="width:20%;text-align:${isAr ? 'right' : 'left'};font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'الغرفة' : 'Kamar'} :</td>
                                <td style="font-weight:700;width:30%;text-align:${isAr ? 'right' : 'left'}">${student.metadata?.kamar || '—'}</td>
                            </tr>
                            <tr>
                                <td style="text-align:${isAr ? 'right' : 'left'};font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'الفصل' : 'Kelas'} :</td>
                                <td style="font-weight:700;text-align:${isAr ? 'right' : 'left'}">${entry.class_name}</td>
                                <td style="text-align:${isAr ? 'right' : 'left'};font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'العام الدراسي' : 'Tahun Ajaran'} :</td>
                                <td style="font-weight:700;text-align:${isAr ? 'right' : 'left'}">${yearStr}</td>
                            </tr>
                        </tbody>
                    </table>
                    <!-- Label -->
                    <div style="direction:${dir};font-weight:700;font-size:11pt;margin-bottom:5px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'الأعمال اليومية' : 'Amal Harian'}</div>
                    <!-- Tabel Nilai -->
                    <table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin-bottom:12px;direction:${dir}">
                        <thead><tr style="background:#e8f5e9">${tableHead}</tr></thead>
                        <tbody>${gradeRows}</tbody>
                    </table>
                    <!-- Extra -->
                    <div style="display:flex;gap:14px;margin-bottom:14px;direction:${dir}">
                        <table style="flex:1;border-collapse:collapse;font-size:9.5pt">
                            <tbody>
                                <tr><td style="border:1px solid #999;padding:3px 7px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'وزن البدن' : 'Berat Badan'}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700;width:35%">${rep.berat_badan || '—'}</td></tr>
                                <tr><td style="border:1px solid #999;padding:3px 7px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'طول البدن' : 'Tinggi Badan'}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700">${rep.tinggi_badan || '—'}</td></tr>
                            </tbody>
                        </table>
                        <table style="flex:1;border-collapse:collapse;font-size:9.5pt">
                            <tbody>
                                <tr><td style="border:1px solid #999;padding:3px 7px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'الزيادة' : 'Ziyadah'}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700;width:35%">${rep.ziyadah || '—'}</td></tr>
                                <tr><td style="border:1px solid #999;padding:3px 7px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'المراجعة' : "Muroja'ah"}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700">${rep.murojaah || '—'}</td></tr>
                            </tbody>
                        </table>
                        <table style="flex:1;border-collapse:collapse;font-size:9.5pt">
                            <tbody>
                                <tr><td style="border:1px solid #999;padding:3px 7px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'المريض' : 'Hari Sakit'}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700;width:35%">${rep.hari_sakit ?? '—'}</td></tr>
                                <tr><td style="border:1px solid #999;padding:3px 7px;font-family:${isAr ? "'Traditional Arabic',serif" : 'inherit'}">${isAr ? 'الراجع' : 'Hari Pulang'}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700">${rep.hari_pulang ?? '—'}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <!-- TTD -->
                    <div style="display:flex;gap:14px;align-items:flex-start;margin-top:8px;direction:${dir}">
                        ${isAr ? `
                        <div style="flex:1;display:flex;justify-content:space-around;padding-bottom:4px">
                            ${[['مدير معهد المحمدية الإسلامي تانجول', 'كياهي الحاج محمد علي معصوم، ليسانس'], ['رائد الحجرة', entry.musyrif || '...'], ['ولي الأمر', '']].map(([l, s]) => `
                            <div style="text-align:center;font-size:8.5pt;font-family:'Traditional Arabic',serif">
                                <div>${l}</div><div style="height:44px"></div>
                                <div style="border-top:1px solid #333;padding-top:2px;font-weight:700;font-size:8pt">${s || '......................'}</div>
                            </div>`).join('')}
                        </div>
                        <table style="border-collapse:collapse;font-size:9pt;direction:rtl">
                            <thead><tr><th colspan="2" style="border:1px solid #999;padding:3px 10px;background:#e8f5e9;font-family:'Traditional Arabic',serif">نظام التقدير</th></tr></thead>
                            <tbody>
                                ${[['٩', 'ممتاز'], ['٨', 'جيد جدا'], ['٦ – ٧', 'جيد'], ['٤ – ٥', 'مقبول'], ['٠ – ٣', 'راسب']].map(([n, l]) => `<tr><td style="border:1px solid #999;padding:2px 10px;font-family:'Traditional Arabic',serif">${l}</td><td style="border:1px solid #999;padding:2px 10px;text-align:center;font-family:'Traditional Arabic',serif">${n}</td></tr>`).join('')}
                            </tbody>
                        </table>
                        ` : `
                        <table style="border-collapse:collapse;font-size:9pt">
                            <thead><tr><th colspan="2" style="border:1px solid #999;padding:3px 10px;background:#e8f5e9">Skala Penilaian</th></tr></thead>
                            <tbody>
                                ${[['9', 'Istimewa'], ['8', 'Sangat Baik'], ['6 – 7', 'Baik'], ['4 – 5', 'Cukup'], ['0 – 3', 'Kurang']].map(([n, l]) => `<tr><td style="border:1px solid #999;padding:2px 10px">${l}</td><td style="border:1px solid #999;padding:2px 10px;text-align:center">${n}</td></tr>`).join('')}
                            </tbody>
                        </table>
                        <div style="flex:1;display:flex;justify-content:space-around;padding-bottom:4px">
                            ${[['Direktur MBS Tanggul', 'KH. Muhammad Ali Maksum, Lc'], ['Musyrif / Wali Kamar', entry.musyrif || '...'], ['Wali Santri', '']].map(([l, s]) => `
                            <div style="text-align:center;font-size:8.5pt">
                                <div>${l}</div><div style="height:44px"></div>
                                <div style="border-top:1px solid #333;padding-top:2px;font-weight:700;font-size:8pt">${s || '......................'}</div>
                            </div>`).join('')}
                        </div>`}
                    </div>
                </div>`
            }).join('')

            const win = window.open('', '_blank')
            win.document.write(`<!DOCTYPE html><html><head>
                <meta charset="utf-8">
                <title>Raport ${entry.class_name} — ${bulan?.id_str} ${entry.year}</title>
                <style>
                    @page { size: A4; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Times New Roman', serif; }
                    div[style*="page-break-after"] { display: block; }
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                </style>
            </head><body>${cards}</body></html>`)
            win.document.close()
            win.focus()
            setTimeout(() => win.print(), 900)
            addToast(`📄 Membuka ${stuData?.length || 0} raport untuk di-export...`, 'info')
        } catch (e) {
            addToast('Gagal export PDF', 'error')
        } finally {
            setExportingId(null)
        }
    }, [])

    // ── Stats data computed from rawReports
    const stats = (() => {
        if (!rawReports.length) return null
        const totalReports = rawReports.length
        const totalClasses = new Set(rawReports.map(r => r.students?.class_id)).size
        const totalPeriods = archiveList.length
        const avgAll = KRITERIA_KEYS.map(k => {
            const vals = rawReports.map(r => r[k]).filter(v => v !== null && v !== undefined)
            return { key: k, label: KRITERIA_LABELS[k], avg: vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null }
        })
        // Top santri (highest avg across all months)
        const byStudent = {}
        for (const r of rawReports) {
            if (!r.students) continue
            if (!byStudent[r.student_id]) byStudent[r.student_id] = { name: r.students.name, scores: [] }
            const vals = KRITERIA_KEYS.map(k => r[k]).filter(v => v !== null)
            if (vals.length) byStudent[r.student_id].scores.push(vals.reduce((a, b) => a + b, 0) / vals.length)
        }
        const topStudents = Object.values(byStudent)
            .map(s => ({ ...s, avg: s.scores.length ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : null }))
            .filter(s => s.avg).sort((a, b) => b.avg - a.avg).slice(0, 5)

        return { totalReports, totalClasses, totalPeriods, avgAll, topStudents }
    })()

    // ── Filtered list
    const filtered = archiveList.filter(e =>
        (!filter.classId || e.class_id === filter.classId) &&
        (!filter.year || String(e.year) === String(filter.year)) &&
        (!filter.search || e.class_name.toLowerCase().includes(filter.search.toLowerCase()) ||
            String(e.year).includes(filter.search) ||
            (BULAN.find(b => b.id === e.month)?.id_str || '').toLowerCase().includes(filter.search.toLowerCase()))
    )
    const uniqueYears = [...new Set(archiveList.map(e => e.year))].sort((a, b) => b - a)

    // ── Render: Stats View
    const renderStats = () => (
        <div className="space-y-5">
            <div className="flex items-center gap-3 mb-2">
                <button onClick={() => setView('list')}
                    className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali
                </button>
                <span className="text-sm font-black text-[var(--color-text)]">Statistik Keseluruhan</span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Total Raport', value: stats?.totalReports || 0, color: '#6366f1' },
                    { label: 'Periode Aktif', value: stats?.totalPeriods || 0, color: '#10b981' },
                    { label: 'Kelas Terdaftar', value: stats?.totalClasses || 0, color: '#f59e0b' },
                ].map((s, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[9px] font-bold text-[var(--color-text-muted)] mt-1 uppercase tracking-widest">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Avg per kriteria */}
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">Rata-rata Nilai per Kriteria (semua kelas)</div>
                <div className="grid grid-cols-5 gap-3">
                    {stats?.avgAll.map(({ key, label, avg }) => {
                        const g = avg ? GRADE(Number(avg)) : null
                        return (
                            <div key={key} className="text-center p-2 rounded-xl" style={{ background: g?.bg || 'var(--color-surface-alt)' }}>
                                <div className="text-xl font-black" style={{ color: g?.color || 'var(--color-text-muted)' }}>{avg || '—'}</div>
                                <div className="text-[8px] font-bold text-[var(--color-text-muted)] mt-0.5">{label}</div>
                                {g && <div className="text-[7px] font-black mt-0.5" style={{ color: g.color }}>{g.label}</div>}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Top santri */}
            <div className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] mb-3">🏆 Top 5 Santri — Rata-rata Tertinggi</div>
                <div className="space-y-2">
                    {stats?.topStudents.map((s, i) => {
                        const g = GRADE(Number(s.avg))
                        return (
                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: g.bg }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: g.color }}>{i + 1}</div>
                                <div className="flex-1 text-[11px] font-bold text-[var(--color-text)]">{s.name}</div>
                                <div className="text-[12px] font-black" style={{ color: g.color }}>{s.avg}</div>
                                <div className="text-[9px] font-bold" style={{ color: g.color }}>{g.label}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )

    // ── Render: Detail View
    const renderDetail = () => {
        if (!detailEntry) return null
        const bulan = BULAN.find(b => b.id === detailEntry.month)
        const previewStudent = previewStudentId
            ? detailStudents.find(s => s.id === previewStudentId)
            : detailStudents[0]

        return (
            <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => { setView('list'); setDetailEntry(null) }}
                        className="h-8 px-3 rounded-lg bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-[10px] font-black hover:text-[var(--color-text)] transition-all flex items-center gap-1.5">
                        <FontAwesomeIcon icon={faArrowLeft} className="text-[9px]" /> Kembali
                    </button>
                    <div className="text-[11px] font-black text-[var(--color-text)]">{detailEntry.class_name} · {bulan?.id_str} {detailEntry.year}</div>
                    <div className="flex-1" />
                    <button onClick={() => exportBulk(detailEntry)} disabled={exportingId === detailEntry.key}
                        className="h-8 px-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black hover:bg-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50">
                        <FontAwesomeIcon icon={exportingId === detailEntry.key ? faSpinner : faFileZipper} className={exportingId === detailEntry.key ? 'animate-spin' : ''} />
                        Export PDF
                    </button>
                    <button onClick={() => window.print()}
                        className="h-8 px-4 rounded-lg bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2">
                        <FontAwesomeIcon icon={faPrint} /> Cetak Semua
                    </button>
                </div>

                {/* Student chips */}
                <div className="flex gap-1.5 flex-wrap p-3 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)]">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] self-center mr-1">Santri:</span>
                    {detailStudents.map(s => {
                        const hasScore = KRITERIA_KEYS.some(k => detailScores[s.id]?.[k] !== '' && detailScores[s.id]?.[k] !== null && detailScores[s.id]?.[k] !== undefined)
                        const isActive = s.id === (previewStudentId || detailStudents[0]?.id)
                        const avg = (() => {
                            const sc = detailScores[s.id] || {}
                            const vals = KRITERIA_KEYS.map(k => sc[k]).filter(v => v !== '' && v !== null && v !== undefined)
                            return vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : null
                        })()
                        const g = avg ? GRADE(Number(avg)) : null
                        return (
                            <button key={s.id} onClick={() => setPreviewStudentId(s.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${isActive ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-indigo-500/30'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full`} style={{ background: g?.color || (hasScore ? '#10b981' : '#94a3b8') }} />
                                {s.name.split(' ')[0]}
                                {avg && <span className={`text-[8px] font-black ${isActive ? 'text-white/80' : ''}`} style={!isActive ? { color: g?.color } : {}}>{avg}</span>}
                            </button>
                        )
                    })}
                </div>

                {/* Preview */}
                {previewStudent && (
                    <div className="overflow-auto rounded-2xl border border-[var(--color-border)] bg-gray-100 dark:bg-gray-900 p-4 flex justify-center print:p-0 print:bg-white print:border-none">
                        <div className="shadow-2xl text-sm">
                            <p className="text-center text-[var(--color-text-muted)] text-[10px] mb-2 print:hidden">Preview raport · {detailEntry.lang === 'ar' ? 'Template Arab' : 'Template Indonesia'}</p>
                            {/* Inline mini preview table */}
                            <div className="bg-white rounded-xl p-6 w-[595px] text-black text-[9pt]" style={{ fontFamily: "'Times New Roman', serif" }}>
                                <div className="font-black text-base mb-1 text-center" style={{ color: '#1a5c35', direction: 'rtl', fontFamily: "'Traditional Arabic', serif" }}>نتيجة الشخصية — {previewStudent.name}</div>
                                <table className="w-full border-collapse text-[8.5pt] mt-2">
                                    <tbody>
                                        {KRITERIA_KEYS.map((key, i) => {
                                            const val = detailScores[previewStudent.id]?.[key]
                                            const g = (val !== '' && val !== null && val !== undefined) ? GRADE(val) : null
                                            return (
                                                <tr key={key} className="border-b border-gray-200">
                                                    <td className="py-1.5 pr-3 text-gray-500 w-5">{i + 1}</td>
                                                    <td className="py-1.5 flex-1">{KRITERIA_LABELS[key]}</td>
                                                    <td className="py-1.5 px-3 font-black text-center" style={{ color: g?.color || '#999' }}>{val ?? '—'}</td>
                                                    <td className="py-1.5 text-right text-[7.5pt]" style={{ color: g?.color || '#999' }}>{g ? g.label : '—'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-[8pt] text-gray-500">
                                    <div>BB: {detailExtras[previewStudent.id]?.berat_badan || '—'} | TB: {detailExtras[previewStudent.id]?.tinggi_badan || '—'}</div>
                                    <div>Ziyadah: {detailExtras[previewStudent.id]?.ziyadah || '—'}</div>
                                    <div>Sakit: {detailExtras[previewStudent.id]?.hari_sakit ?? '—'} hari</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hidden print all */}
                <div className="hidden print:block">
                    {detailStudents.map(s => (
                        <div key={s.id} style={{ pageBreakAfter: 'always', fontFamily: "'Times New Roman', serif", fontSize: '11pt' }}>
                            <div style={{ textAlign: 'center', borderBottom: '3px double #1a5c35', marginBottom: 10, paddingBottom: 8 }}>
                                <div style={{ fontWeight: 900, fontSize: '18pt', color: '#1a5c35', direction: 'rtl', fontFamily: "'Traditional Arabic', serif" }}>معهد محمدية الإسلامي تانجول</div>
                                <div style={{ fontWeight: 700, letterSpacing: 2 }}>MUHAMMADIYAH BOARDING SCHOOL (MBS) TANGGUL</div>
                            </div>
                            <div style={{ textAlign: 'center', margin: '8px 0 12px', direction: detailEntry.lang === 'ar' ? 'rtl' : 'ltr', fontFamily: "'Traditional Arabic', serif", fontSize: '13pt', fontWeight: 900 }}>
                                {detailEntry.lang === 'ar' ? `نتيجة الشخصية — شهر ${bulan?.ar}` : `Raport Bulanan — ${bulan?.id_str} ${detailEntry.year}`}
                            </div>
                            <p style={{ fontWeight: 700 }}>Nama: {s.name} | Kelas: {detailEntry.class_name}</p>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                                {KRITERIA_KEYS.map((key, i) => {
                                    const val = detailScores[s.id]?.[key]
                                    const g = (val !== '' && val !== null && val !== undefined) ? GRADE(val) : null
                                    return <tr key={key}><td style={{ border: '1px solid #999', padding: '4px 8px' }}>{i + 1}</td><td style={{ border: '1px solid #999', padding: '4px 8px' }}>{KRITERIA_LABELS[key]}</td><td style={{ border: '1px solid #999', padding: '4px 8px', textAlign: 'center', fontWeight: 700 }}>{val ?? '—'}</td><td style={{ border: '1px solid #999', padding: '4px 8px', color: g?.color }}>{g?.label || '—'}</td></tr>
                                })}
                            </table>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // ── Render: List View
    const renderList = () => (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 relative">
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px]" />
                    <input
                        value={filter.search}
                        onChange={e => setFilter(p => ({ ...p, search: e.target.value }))}
                        placeholder="Cari kelas, bulan, tahun..."
                        className="w-full h-8 pl-7 pr-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none focus:border-emerald-500/50"
                    />
                </div>
                <select value={filter.year} onChange={e => setFilter(p => ({ ...p, year: e.target.value }))}
                    className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                    <option value="">Semua Tahun</option>
                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filter.classId} onChange={e => setFilter(p => ({ ...p, classId: e.target.value }))}
                    className="h-8 px-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[10px] font-bold text-[var(--color-text)] outline-none">
                    <option value="">Semua Kelas</option>
                    {[...new Map(archiveList.map(e => [e.class_id, e])).values()].map(e => (
                        <option key={e.class_id} value={e.class_id}>{e.class_name}</option>
                    ))}
                </select>
                <button onClick={() => setView('stats')}
                    className="h-8 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black flex items-center gap-1.5 hover:bg-indigo-500/20 transition-all">
                    <FontAwesomeIcon icon={faChartBar} /> Statistik
                </button>
            </div>

            {/* Summary bar */}
            <div className="flex gap-3 px-4 py-2.5 rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-bold text-[var(--color-text-muted)]">
                <span><span className="text-[var(--color-text)] font-black">{archiveList.length}</span> periode</span>
                <span>·</span>
                <span><span className="text-[var(--color-text)] font-black">{archiveList.reduce((a, e) => a + e.count, 0)}</span> raport tersimpan</span>
                <span>·</span>
                <span><span className="text-[var(--color-text)] font-black">{archiveList.reduce((a, e) => a + e.completed, 0)}</span> lengkap</span>
                <div className="flex-1" />
                {filter.search || filter.classId || filter.year ? (
                    <button onClick={() => setFilter({ classId: '', year: '', search: '' })} className="text-red-500 font-black flex items-center gap-1">
                        <FontAwesomeIcon icon={faXmark} className="text-[8px]" /> Reset filter
                    </button>
                ) : null}
            </div>

            {/* Archive Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" /> Memuat arsip...
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--color-text-muted)]">
                    <FontAwesomeIcon icon={faBoxArchive} className="text-5xl opacity-10" />
                    <p className="text-sm font-bold">Belum ada raport tersimpan</p>
                    <p className="text-[10px]">Raport yang sudah disimpan akan muncul di sini</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(entry => {
                        const bulan = BULAN.find(b => b.id === entry.month)
                        const pct = entry.count ? Math.round((entry.completed / entry.count) * 100) : 0
                        const overallAvg = KRITERIA_KEYS.reduce((sum, k) => {
                            const vals = entry.avgScores?.[k] || []
                            return sum + (vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0)
                        }, 0) / KRITERIA_KEYS.length
                        const g = overallAvg ? GRADE(overallAvg) : null
                        return (
                            <div key={entry.key} className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:border-emerald-500/30 transition-all flex flex-col gap-3">
                                {/* Top row */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-[11px] font-black text-[var(--color-text)]">{entry.class_name}</div>
                                        <div className="text-[10px] text-[var(--color-text-muted)] font-bold mt-0.5">
                                            {bulan?.id_str} {entry.year}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full ${entry.lang === 'ar' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-500'}`}>
                                            {entry.lang === 'ar' ? '🕌 Boarding' : '🏫 Reguler'}
                                        </span>
                                        {g && <span className="text-[8px] font-black" style={{ color: g.color }}>{Number(overallAvg).toFixed(1)} avg</span>}
                                    </div>
                                </div>

                                {/* Progress */}
                                <div>
                                    <div className="flex justify-between text-[8px] font-bold text-[var(--color-text-muted)] mb-1">
                                        <span>{entry.completed}/{entry.count} santri lengkap</span>
                                        <span>{pct}%</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-[var(--color-surface-alt)] overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? '#10b981' : pct > 50 ? '#6366f1' : '#f59e0b' }} />
                                    </div>
                                </div>

                                {/* Kriteria mini scores */}
                                <div className="flex gap-1.5">
                                    {KRITERIA_KEYS.map(k => {
                                        const vals = entry.avgScores?.[k] || []
                                        const avg = vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null
                                        const kg = avg ? GRADE(Number(avg)) : null
                                        return (
                                            <div key={k} className="flex-1 text-center rounded-md py-1" style={{ background: kg?.bg || 'var(--color-surface-alt)' }}
                                                title={`${KRITERIA_LABELS[k]}: ${avg || '—'}`}>
                                                <div className="text-[9px] font-black" style={{ color: kg?.color || 'var(--color-text-muted)' }}>{avg || '—'}</div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Musyrif */}
                                {entry.musyrif && (
                                    <div className="text-[8px] text-[var(--color-text-muted)] flex items-center gap-1">
                                        <FontAwesomeIcon icon={faUsers} className="opacity-50" /> {entry.musyrif}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-1.5">
                                    <button onClick={() => loadDetail(entry)}
                                        className="flex-1 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-indigo-500/20 transition-all">
                                        <FontAwesomeIcon icon={faMagnifyingGlass} /> Preview
                                    </button>
                                    <button onClick={() => exportBulk(entry)} disabled={exportingId === entry.key}
                                        className="flex-1 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-black flex items-center justify-center gap-1.5 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                                        <FontAwesomeIcon icon={exportingId === entry.key ? faSpinner : faFileZipper} className={exportingId === entry.key ? 'animate-spin' : ''} />
                                        {exportingId === entry.key ? 'Exporting...' : 'Export PDF'}
                                    </button>
                                    <button onClick={() => deleteEntry(entry)}
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                        <FontAwesomeIcon icon={faBoxArchive} className="text-amber-500 text-sm" />
                    </div>
                    <div>
                        <span className="font-black text-sm">Riwayat Raport</span>
                        <span className="text-[var(--color-text-muted)] font-normal text-xs ml-2">Arsip semua raport bulanan</span>
                    </div>
                    {!loading && archiveList.length > 0 && (
                        <div className="ml-2 px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)]">
                            {archiveList.length} periode
                        </div>
                    )}
                </div>
            }
            size="full"
        >
            {view === 'list' && renderList()}
            {view === 'detail' && renderDetail()}
            {view === 'stats' && renderStats()}

            <style>{`
                @media print {
                    body > *:not(.raport-print-root) { display: none !important; }
                }
            `}</style>
        </Modal>
    )
}