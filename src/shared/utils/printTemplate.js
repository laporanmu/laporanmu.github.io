/**
 * Utility untuk membuat halaman cetak (Print/PDF) LaporanMu dengan template standar premium.
 */

export const PRINT_BASE_STYLE = `
html,body{height:100%;margin:0;padding:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:10px;color:#1a1a1a;background:#fff;line-height:1.5}
.page{padding:14mm 16mm;height:100%;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box}
.content-wrap{flex:1 0 auto}
.footer-wrap{flex-shrink:0;margin-top:auto}

/* ── Letterhead header ── */
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1e3a5f;padding-bottom:14px;margin-bottom:16px}
.header-brand{display:flex;align-items:flex-start;gap:12px}
.header-logo{width:44px;height:44px;background:#1e3a5f;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.header-logo svg{width:26px;height:26px;fill:#fff}
.header-school-name{font-size:13px;font-weight:800;color:#1e3a5f;letter-spacing:0.01em;line-height:1.2}
.header-school-sub{font-size:9px;color:#555;margin-top:2px}
.header-school-addr{font-size:8.5px;color:#888;margin-top:3px}
.header-right{text-align:right;font-size:9px;color:#64748b}
.badge{display:inline-block;background:#1e3a5f;color:#fff;font-size:8px;font-weight:700;padding:2px 8px;border-radius:3px;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.07em}
.doc-id{font-size:9px;color:#555;margin-bottom:2px}
.doc-printed{font-size:8.5px;color:#aaa}

/* ── Report title row ── */
.title-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px}
.report-title{font-size:16px;font-weight:800;color:#1a1a1a}
.report-sub{font-size:9px;color:#555;margin-top:2px}
.total-badge{font-size:22px;font-weight:800;color:#1e3a5f;line-height:1;text-align:right}
.total-label{font-size:8px;text-transform:uppercase;letter-spacing:0.06em;color:#aaa;text-align:right;margin-top:1px}

/* ── Section divider ── */
.section-label{font-size:8.5px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;margin-bottom:7px;display:flex;align-items:center;gap:8px}
.section-label::after{content:'';flex:1;height:0.5px;background:#ddd}

/* ── Stats grid ── */
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
.stat{border:0.5px solid #d4d4d4;border-radius:5px;padding:9px 12px;position:relative;overflow:hidden}
.stat::before{content:'';position:absolute;top:0;left:0;bottom:0;width:3px}
.stat.total::before{background:#1e3a5f}
.stat.pelanggaran::before{background:#dc2626}
.stat.prestasi::before{background:#10b981}
.stat.avg::before{background:#f59e0b}
.stat.violet::before{background:#7c3aed}
.stat.teal::before{background:#0d9488}
.stat.amber::before{background:#d97706}
.stat p.l{font-size:8px;text-transform:uppercase;letter-spacing:0.08em;color:#888;font-weight:700;margin-bottom:3px}
.stat p.v{font-size:20px;font-weight:800;color:#1a1a1a;line-height:1}
.stat p.d{font-size:8.5px;color:#bbb;margin-top:2px}

/* ── Info strip ── */
.info-strip{background:#f0f4f8;border:0.5px solid #cdd6e0;border-radius:4px;padding:6px 12px;display:flex;flex-wrap:wrap;gap:4px 20px;margin-bottom:14px;font-size:9px;color:#444}
.info-item{display:flex;gap:5px}
.info-key{color:#888}
.info-val{font-weight:700;color:#1a1a1a}

/* ── Table ── */
table{width:100%;border-collapse:collapse;margin-bottom:20px}
thead tr{background:#1e3a5f}
th{font-size:8.5px;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;color:#fff;padding:7px 9px;text-align:left}
th:first-child{border-radius:3px 0 0 3px;width:24px;text-align:center}
th:last-child{border-radius:0 3px 3px 0}
td{padding:7px 9px;border-bottom:0.5px solid #eee;vertical-align:middle;color:#1a1a1a;font-size:9.5px}
tr:nth-child(even) td{background:#f8f9fb}
tr{page-break-inside:avoid}
td:first-child{text-align:center;color:#aaa;font-size:9px}

/* ── Badges ── */
.tag-visitor{display:inline-block;padding:2px 7px;border-radius:3px;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em}
.tag-visitor.guru{background:#fef3c7;color:#92400e;border:0.5px solid #fde047}
.tag-visitor.santri{background:#dbeafe;color:#1d4ed8;border:0.5px solid #93c5fd}
.tag-status{display:inline-block;padding:2px 7px;border-radius:3px;font-size:8.5px;font-weight:700}
.tag-status.warning{background:#fef9c3;color:#713f12;border:0.5px solid #fde047}
.tag-status.success{background:#dcfce7;color:#14532d;border:0.5px solid #86efac}

/* ── Signature ── */
.signature-section{display:flex;justify-content:flex-end;margin-top:24px;page-break-inside:avoid}
.signature-box{text-align:center;border:0.5px solid #ccc;border-radius:4px;padding:8px 24px}
.signature-box p.ttd-title{font-size:8.5px;color:#aaa;margin-bottom:2px}
.signature-box p.ttd-role{font-weight:700;font-size:9.5px;color:#1e3a5f;text-transform:uppercase;letter-spacing:0.03em}
.signature-box .signature-line{height:48px}
.signature-box p.ttd-name{font-weight:700;font-size:10px;color:#1a1a1a;border-top:0.5px solid #bbb;padding-top:4px;margin:0 8px}

/* ── Footer ── */
.footer{margin-top:16px;padding-top:10px;border-top:0.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;color:#bbb;font-size:8.5px}
.footer-app{color:#888;font-weight:600}
.page-num{font-size:8.5px;color:#bbb}

/* RTL overrides */
html[dir="rtl"] th{text-align:right}
html[dir="rtl"] th:first-child{border-radius:0 3px 3px 0}
html[dir="rtl"] th:last-child{border-radius:3px 0 0 3px}
html[dir="rtl"] .header-right{text-align:left}
html[dir="rtl"] .total-badge,html[dir="rtl"] .total-label{text-align:left}

@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{padding:0;min-height:auto;height:auto;display:block}
  .footer-wrap{margin-top:24px}
}
`

export function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=1200,height=750')
  if (!win) return false
  win.document.write(html)
  win.document.close()
  return true
}

export function buildPrintHTML({
  language = 'id',
  schoolName = 'SMP Muhammadiyah 04 Tanggul',
  schoolSub = 'Muhammadiyah Boarding School',
  schoolAddress = 'Jln. Pemandian No 88, Tanggul, Jember',
  docBadge = 'LAPORAN',
  docNumber = '',
  title = '',
  subtitle = '',
  totalCount = 0,
  totalLabel = 'Total',
  stats = [], // Array of { label, value, type: 'total|pelanggaran|prestasi|avg|violet|teal|amber', description }
  infoStrip = [], // Array of { label, value }
  tableHeaders = [], // Array of string/HTML
  tableRowsHTML = '', // Raw HTML string for <tr>...</tr>
  showSignature = true,
  signatureTitle = 'Kepala Sekolah',
  signatureName = '',
  paperSize = 'A4 landscape'
}) {
  const now = new Date()
  const dateLocale = language === 'ar' ? 'ar-SA' : language === 'en' ? 'en-US' : 'id-ID'
  const timeLocale = new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(now)
  const dateLocaleOnly = new Intl.DateTimeFormat(dateLocale, { dateStyle: 'medium' }).format(now)

  const dict = {
    id: {
      docNo: 'No. Dok',
      printed: 'Dicetak',
      summary: 'Ringkasan',
      details: 'Detail Laporan',
      approvedBy: 'Mengetahui,',
      page: 'Hal.',
      total: 'Total',
      timeSuffix: 'WIB'
    },
    en: {
      docNo: 'Doc No',
      printed: 'Printed',
      summary: 'Summary',
      details: 'Report Details',
      approvedBy: 'Approved by,',
      page: 'Page',
      total: 'Total',
      timeSuffix: 'UTC'
    },
    ar: {
      docNo: 'رقم المستند',
      printed: 'تمت الطباعة',
      summary: 'ملخص',
      details: 'تفاصيل التقرير',
      approvedBy: 'التوقيع والموافقة',
      page: 'الصفحة',
      total: 'الإجمالي',
      timeSuffix: 'توقيت'
    }
  }

  const t = dict[language] || dict.id

  const finalDocNumber = docNumber || `DOC/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String((now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) % 9999 + 1).padStart(4, '0')}`

  const statsHtml = stats.map(s => 
    `<div class="stat ${s.type || 'total'}">
      <p class="l">${s.label}</p>
      <p class="v">${s.value}</p>
      ${s.description ? `<p class="d">${s.description}</p>` : ''}
    </div>`
  ).join('')

  const infoStripHtml = infoStrip.map(item => 
    `<div class="info-item">
      <span class="info-key">${item.label}:</span>
      <span class="info-val">${item.value}</span>
    </div>`
  ).join('')

  const tableHeaderHtml = tableHeaders.map(h => `<th>${h}</th>`).join('')

  const signatureHtml = showSignature ? `
    <div class="signature-section">
      <div class="signature-box">
        <p class="ttd-title">${t.approvedBy}</p>
        <p class="ttd-role">${signatureTitle}</p>
        <div class="signature-line"></div>
        <p class="ttd-name">${signatureName || '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'}</p>
      </div>
    </div>` : ''

  const pageStyle = `@page{margin:14mm 16mm;size:${paperSize}}`
  const dirAttribute = language === 'ar' ? 'dir="rtl"' : 'dir="ltr"'

  return `<!DOCTYPE html>
<html lang="${language}" ${dirAttribute}>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${PRINT_BASE_STYLE}${pageStyle}</style>
</head>
<body>
<div class="page">
  <div class="content-wrap">

    <!-- Letterhead header -->
    <div class="header">
      <div class="header-brand">
        <div class="header-logo">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
          </svg>
        </div>
        <div>
          <div class="header-school-name">${schoolName}</div>
          <div class="header-school-sub">${schoolSub}</div>
          <div class="header-school-addr">${schoolAddress}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="badge">${docBadge}</div>
        <div class="doc-id">${t.docNo}: ${finalDocNumber}</div>
        <div class="doc-printed">${t.printed}: ${timeLocale} ${t.timeSuffix}</div>
      </div>
    </div>

    <!-- Title -->
    <div class="title-row">
      <div>
        <div class="report-title">${title}</div>
        ${subtitle ? `<div class="report-sub">${subtitle}</div>` : ''}
      </div>
      <div>
        <div class="total-badge">${totalCount}</div>
        <div class="total-label">${totalLabel}</div>
      </div>
    </div>

    <!-- Stats -->
    ${statsHtml ? `<div class="section-label">${t.summary}</div><div class="stats">${statsHtml}</div>` : ''}

    <!-- Info strip -->
    ${infoStripHtml ? `<div class="info-strip">${infoStripHtml}</div>` : ''}

    <!-- Table -->
    <div class="section-label">${t.details}</div>
    <table>
      <thead><tr>${tableHeaderHtml}</tr></thead>
      <tbody>${tableRowsHTML}</tbody>
    </table>

  </div><!-- /content-wrap -->

  <div class="footer-wrap">
    ${signatureHtml}
    <div class="footer">
      <span class="footer-app">laporanmu.my.id &nbsp;·&nbsp; LaporanMu</span>
      <span>${t.total} ${totalCount} &nbsp;·&nbsp; ${dateLocaleOnly}</span>
      <span class="page-num">${t.page} 1</span>
    </div>
  </div>

</div><!-- /page -->
<script>window.onload=()=>window.print()<\/script>
</body></html>`
}
