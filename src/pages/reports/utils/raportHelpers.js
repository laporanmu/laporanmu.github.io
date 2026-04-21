import { KRITERIA, MAX_SCORE, GRADE, calcAvg } from './raportConstants'

/**
 * Validasi apakah semua kriteria nilai sudah terisi
 */
export const isComplete = (scores) => {
    if (!scores) return false
    return KRITERIA.every(k => 
        scores[k.key] !== '' && 
        scores[k.key] !== null && 
        scores[k.key] !== undefined
    )
}

/**
 * Format sel CSV untuk export
 */
export const escapeCsvCell = (val) => {
    const str = String(val ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

/**
 * Membangun baris pesan WhatsApp
 */
export const buildWaLines = ({ 
    student, sc, extras, bulanObj, selectedYear, selectedClass, musyrif, pdfUrl, waFooter 
}) => {
    const avg = calcAvg(sc)
    const g = avg ? GRADE(Number(avg)) : null
    const header = [
        `Assalamu'alaikum Wr. Wb.`,
        ``,
        `Yth. Bapak/Ibu Wali dari Ananda *${student.name}*`,
        ``,
        `Berikut hasil *Raport Bulanan ${bulanObj?.id_str || ''} ${selectedYear}*`,
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

/**
 * Generator komentar otomatis berdasarkan tren nilai
 */
export const generateAutoComment = (sc, studentId = '', trendHistory = []) => {
    const vals = KRITERIA.map(k => ({ key: k.key, id: k.id, val: sc?.[k.key] }))
        .filter(k => k.val !== '' && k.val !== null && k.val !== undefined)
        .map(k => ({ ...k, val: Number(k.val) }))
    
    if (!vals.length) return ''

    const avg = vals.reduce((a, b) => a + b.val, 0) / vals.length
    const best = vals.reduce((a, b) => b.val > a.val ? b : a, vals[0])
    const worst = vals.reduce((a, b) => b.val < a.val ? b : a, vals[0])
    const allHigh = vals.every(v => v.val >= 8)
    const allMed = vals.every(v => v.val >= 6)

    const seed = (studentId || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    const pick = (arr) => arr[seed % arr.length]

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

    let streakUp = 0, streakDown = 0
    for (let i = histAvgs.length - 1; i >= 1; i--) {
        if (histAvgs[i] > (histAvgs[i - 1] + 0.2)) streakUp++; else break
    }
    for (let i = histAvgs.length - 1; i >= 1; i--) {
        if (histAvgs[i] < (histAvgs[i - 1] - 0.2)) streakDown++; else break
    }

    let parts = []
    if (hasHistory && streakUp >= 2) {
        parts.push(pick([
            `Alhamdulillah, nilai rata-rata terus meningkat ${streakUp + 1} bulan berturut-turut`, 
            `Masya Allah, perkembangan konsisten naik selama ${streakUp + 1} bulan terakhir`
        ]))
    } else if (hasHistory && streakDown >= 2) {
        parts.push(pick([
            `Nilai rata-rata mengalami penurunan ${streakDown + 1} bulan berturut-turut, perlu perhatian`, 
            `Tren menurun ${streakDown + 1} bulan berturut-turut memerlukan evaluasi segera`
        ]))
    } else if (hasHistory && isRising) {
        parts.push(pick([
            `Alhamdulillah, terjadi peningkatan rata-rata dibanding bulan lalu`, 
            `Ada kenaikan nilai yang menggembirakan dari bulan sebelumnya`
        ]))
    } else if (hasHistory && isFalling) {
        parts.push(pick([
            `Nilai rata-rata turun dibanding bulan lalu, perlu evaluasi bersama`, 
            `Terjadi penurunan dari bulan sebelumnya, mohon perhatian lebih`
        ]))
    } else if (allHigh) {
        parts.push(pick([
            `Alhamdulillah, seluruh aspek penilaian sangat memuaskan bulan ini`, 
            `Masya Allah, perkembangan di semua aspek sangat luar biasa`
        ]))
    } else if (avg >= 6) {
        parts.push(pick([
            `Alhamdulillah, perkembangan ${best.id.toLowerCase()} cukup baik bulan ini`, 
            `Kemajuan pada aspek ${best.id.toLowerCase()} sudah terlihat nyata`
        ]))
    } else {
        parts.push(pick([
            `Perlu perhatian lebih pada aspek ${worst.id.toLowerCase()} bulan ini`, 
            `Butuh pendampingan ekstra, khususnya di aspek ${worst.id.toLowerCase()}`
        ]))
    }

    const closingHigh = ['Semoga terus istiqomah dan menjadi teladan.', 'Barakallahu fiik, semoga terus berkembang.']
    const closingMid = ['Semoga semakin berkembang ke depannya.', 'Tetap semangat dan terus tingkatkan diri.']
    const closingLow = ['Mohon dukungan penuh dari wali santri.', 'Diperlukan kerjasama wali santri untuk mendampingi.']

    const closing = (allHigh || streakUp >= 2) ? pick(closingHigh) : (allMed && !isFalling) ? pick(closingMid) : pick(closingLow)
    return parts.join('. ') + '. ' + closing
}
