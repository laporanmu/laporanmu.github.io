const fs = require('fs');
const lines = fs.readFileSync('src/pages/AbsensiPage.jsx', 'utf-8').split('\n');
const queries = ['Absensi Guru', 'Tutorial', 'Aksi Massal', 'Total Lembur', 'Terlambat', 'keyboard shortcut', 'activeTab', 'view table', 'lembur'];
lines.forEach((line, i) => {
    if (queries.some(q => line.toLowerCase().includes(q.toLowerCase()))) {
        console.log((i + 1) + ':' + line.trim());
    }
});
