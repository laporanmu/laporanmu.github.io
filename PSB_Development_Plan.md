# 📋 PSB (Penerimaan Santri Baru) — Full Development Plan
### Sistem Informasi Pesantren Muhammadiyah — Laporanmu

---

## 🧠 Konteks Sistem

**Stack:**
- Frontend: React + Vite + TailwindCSS
- Backend: Supabase (PostgreSQL, Auth, RLS, Storage)
- Notifikasi: Telegram Bot API / WhatsApp API
- Export: xlsx / PDF

**Role yang ada:**
- `developer` → full access
- `admin` → full access
- `pengurus` → full access
- `spmb_ketua` (via kolom spmb_role di profiles) → manage PSB
- `spmb_anggota` (via kolom spmb_role di profiles) → input data PSB
- `guru` → view only

**Table yang sudah ada:**
- `enrollments` → data pendaftar
- `enrollment_waves` → gelombang pendaftaran
- `students` → data siswa aktif
- `profiles` → data user sistem (dengan kolom spmb_role)

---

## 🗂️ FASE 1 — Gelombang & Kuota

### Tujuan
Mengelola multi gelombang pendaftaran dengan kuota per program dan auto-close otomatis.

### Perubahan Database

```sql
-- Tambah kolom ke enrollment_waves yang sudah ada
ALTER TABLE enrollment_waves
  ADD COLUMN IF NOT EXISTS quota_reguler integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_tahfidz integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_khusus integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registered_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS registration_fee integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS announcement_date date,
  ADD COLUMN IF NOT EXISTS test_date date;

-- Function auto-update registered_count & auto-close gelombang
CREATE OR REPLACE FUNCTION update_wave_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE enrollment_waves
  SET registered_count = (
    SELECT COUNT(*) FROM enrollments
    WHERE wave_id = NEW.wave_id
    AND status NOT IN ('ditolak', 'mengundurkan_diri')
  )
  WHERE id = NEW.wave_id;

  -- Auto-close jika kuota penuh
  UPDATE enrollment_waves
  SET is_active = false
  WHERE id = NEW.wave_id
  AND registered_count >= quota_reguler + quota_tahfidz + quota_khusus
  AND quota_reguler + quota_tahfidz + quota_khusus > 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_wave_count
AFTER INSERT OR UPDATE OR DELETE ON enrollments
FOR EACH ROW EXECUTE FUNCTION update_wave_count();
```

### Fitur UI yang Dibutuhkan

1. **Halaman Manajemen Gelombang** (`/psb/gelombang`)
   - List semua gelombang dengan status aktif/nonaktif
   - Card per gelombang: nama, tanggal buka-tutup, kuota, progress bar terisi
   - Badge: AKTIF / DITUTUP / AKAN DATANG
   - Tombol: Buat Gelombang, Edit, Nonaktifkan

2. **Form Buat/Edit Gelombang**
   - Nama gelombang (contoh: Gelombang 1 - 2026)
   - Tanggal buka & tutup pendaftaran
   - Tanggal pengumuman & tes
   - Kuota per program (Reguler, Tahfidz, Khusus)
   - Biaya pendaftaran
   - Deskripsi/keterangan
   - Toggle is_active

3. **Widget Kuota Realtime**
   - Progress bar per program
   - Counter: terisi / total kuota
   - Auto-refresh setiap 30 detik

---

## 🗂️ FASE 2 — Seleksi & Tes

### Tujuan
Mengelola jadwal tes, input nilai, dan keputusan penerimaan per pendaftar.

### Perubahan Database

```sql
-- Table jadwal tes
CREATE TABLE enrollment_tests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wave_id uuid REFERENCES enrollment_waves(id),
  test_type text, -- 'tulis', 'quran', 'wawancara'
  test_date date,
  test_time time,
  location text,
  duration_minutes integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Table nilai tes per pendaftar
CREATE TABLE enrollment_test_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid REFERENCES enrollments(id),
  test_id uuid REFERENCES enrollment_tests(id),
  nilai_tulis numeric(5,2),
  nilai_quran numeric(5,2),
  nilai_wawancara numeric(5,2),
  nilai_total numeric(5,2) GENERATED ALWAYS AS (
    (COALESCE(nilai_tulis, 0) + COALESCE(nilai_quran, 0) + COALESCE(nilai_wawancara, 0)) / 3
  ) STORED,
  catatan_penguji text,
  penguji_id uuid REFERENCES profiles(id),
  penguji_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tambah kolom ke enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS keputusan text, -- 'diterima', 'ditolak', 'cadangan'
  ADD COLUMN IF NOT EXISTS alasan_penolakan text,
  ADD COLUMN IF NOT EXISTS diputuskan_oleh uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS diputuskan_at timestamptz,
  ADD COLUMN IF NOT EXISTS test_schedule_id uuid REFERENCES enrollment_tests(id),
  ADD COLUMN IF NOT EXISTS no_ujian text; -- nomor ujian untuk hari tes

-- RLS untuk table baru
ALTER TABLE enrollment_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollment_test_results ENABLE ROW LEVEL SECURITY;

-- Policy enrollment_tests
CREATE POLICY "enrollment_tests_select" ON enrollment_tests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus','guru') OR profiles.spmb_role IN ('ketua','anggota'))));

CREATE POLICY "enrollment_tests_insert" ON enrollment_tests FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role = 'ketua')));

CREATE POLICY "enrollment_tests_update" ON enrollment_tests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role = 'ketua')));

CREATE POLICY "enrollment_tests_delete" ON enrollment_tests FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('developer','admin')));

-- Policy enrollment_test_results
CREATE POLICY "test_results_select" ON enrollment_test_results FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus','guru') OR profiles.spmb_role IN ('ketua','anggota'))));

CREATE POLICY "test_results_insert" ON enrollment_test_results FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role IN ('ketua','anggota'))));

CREATE POLICY "test_results_update" ON enrollment_test_results FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role IN ('ketua','anggota'))));
```

### Fitur UI yang Dibutuhkan

1. **Halaman Jadwal Tes** (`/psb/jadwal-tes`)
   - List jadwal tes per gelombang
   - Jenis tes: Tertulis, Baca Qur'an, Wawancara
   - Info: tanggal, jam, lokasi, durasi
   - Tombol: Tambah Jadwal, Edit, Hapus

2. **Halaman Input Nilai** (`/psb/nilai`)
   - Table pendaftar yang sudah hadir tes
   - Kolom input: nilai tulis, nilai Qur'an, nilai wawancara
   - Auto-hitung nilai total
   - Filter per gelombang & jenis tes
   - Inline edit langsung di table

3. **Halaman Keputusan** (`/psb/keputusan`)
   - List pendaftar yang sudah diinput nilainya
   - Sorted by nilai total (tertinggi ke terendah)
   - Tombol aksi per baris: Terima, Tolak, Cadangan
   - Modal konfirmasi dengan field alasan (wajib isi jika ditolak)
   - Bulk action: terima/tolak banyak sekaligus

---

## 🗂️ FASE 3 — Administrasi Keuangan

### Tujuan
Mengelola biaya pendaftaran, konfirmasi pembayaran, dan biaya daftar ulang.

### Perubahan Database

```sql
-- Table pembayaran
CREATE TABLE enrollment_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid REFERENCES enrollments(id),
  jenis_pembayaran text, -- 'pendaftaran', 'daftar_ulang'
  jumlah integer,
  status text DEFAULT 'menunggu', -- 'menunggu', 'lunas', 'ditolak'
  metode_pembayaran text, -- 'transfer', 'tunai', 'qris'
  no_rekening_pengirim text,
  nama_pengirim text,
  bukti_url text, -- URL foto bukti transfer di Supabase Storage
  catatan text,
  dikonfirmasi_oleh uuid REFERENCES profiles(id),
  dikonfirmasi_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tambah kolom ke enrollments
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'belum_bayar',
  ADD COLUMN IF NOT EXISTS total_paid integer DEFAULT 0;

-- RLS
ALTER TABLE enrollment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON enrollment_payments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role IN ('ketua','anggota'))));

CREATE POLICY "payments_insert" ON enrollment_payments FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role IN ('ketua','anggota'))));

CREATE POLICY "payments_update" ON enrollment_payments FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role IN ('developer','admin','pengurus') OR profiles.spmb_role = 'ketua')));
```

### Fitur UI yang Dibutuhkan

1. **Halaman Pembayaran** (`/psb/pembayaran`)
   - List pendaftar dengan status pembayaran
   - Filter: belum bayar, menunggu konfirmasi, lunas
   - Badge status pembayaran di setiap baris

2. **Form Konfirmasi Pembayaran**
   - Upload bukti transfer
   - Input nominal, metode, nama pengirim
   - Tombol: Konfirmasi Lunas / Tolak Pembayaran
   - Catatan penolakan jika ditolak

3. **Input Pembayaran Manual (Tunai)**
   - Form input pembayaran tunai oleh admin
   - Langsung set status lunas
   - Cetak kwitansi (PDF)

4. **Summary Keuangan PSB**
   - Total pendapatan per gelombang
   - Breakdown per jenis pembayaran
   - Pendaftar belum bayar (dengan reminder)

---

## 🗂️ FASE 4 — Notifikasi

### Tujuan
Kirim notifikasi WhatsApp/Telegram ke wali santri saat status berubah.

### Perubahan Database

```sql
-- Table log notifikasi
CREATE TABLE enrollment_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enrollment_id uuid REFERENCES enrollments(id),
  jenis text, -- 'status_berubah', 'pengumuman', 'reminder_daftar_ulang', 'reminder_bayar'
  channel text, -- 'whatsapp', 'telegram'
  recipient_phone text,
  message text,
  status text DEFAULT 'pending', -- 'pending', 'terkirim', 'gagal'
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE enrollment_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON enrollment_notifications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('developer','admin','pengurus')));

CREATE POLICY "notifications_insert" ON enrollment_notifications FOR INSERT TO authenticated
WITH CHECK (true);
```

### Implementasi Notifikasi

```javascript
// lib/notifikasi.js
// Template pesan WhatsApp/Telegram

const TEMPLATES = {
  diterima: (nama, gelombang) => `
🎉 *Selamat! Ananda ${nama} DITERIMA*

Alhamdulillah, ananda dinyatakan *DITERIMA* di Pesantren Muhammadiyah MBS Tanggul pada ${gelombang}.

📋 Langkah selanjutnya:
1. Segera lakukan daftar ulang
2. Lunasi biaya daftar ulang
3. Lengkapi dokumen yang diminta

Informasi lebih lanjut hubungi panitia PSB.
_Laporanmu - MBS Tanggul_
  `,

  ditolak: (nama, alasan) => `
Yth. Wali dari ananda ${nama},

Kami menyampaikan bahwa ananda *belum dapat diterima* pada seleksi ini.

Alasan: ${alasan}

Terima kasih atas kepercayaan Bapak/Ibu.
_Laporanmu - MBS Tanggul_
  `,

  reminder_daftar_ulang: (nama, deadline) => `
⚠️ *Reminder Daftar Ulang*

Yth. Wali ananda ${nama},
Batas daftar ulang: *${deadline}*

Segera hubungi panitia PSB jika ada kendala.
_Laporanmu - MBS Tanggul_
  `
};

export async function sendNotifikasi(enrollment, jenis) {
  const message = TEMPLATES[jenis](enrollment.name, ...);
  
  // Kirim via Telegram Bot atau WA API
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    body: JSON.stringify({ chat_id: phoneNumber, text: message, parse_mode: 'Markdown' })
  });

  // Log ke database
  await supabase.from('enrollment_notifications').insert({
    enrollment_id: enrollment.id,
    jenis,
    channel: 'telegram',
    recipient_phone: enrollment.phone,
    message,
    status: 'terkirim',
    sent_at: new Date()
  });
}
```

### Fitur UI yang Dibutuhkan

1. **Pengaturan Notifikasi** (`/psb/notifikasi/settings`)
   - Toggle aktif/nonaktif per jenis notifikasi
   - Template pesan yang bisa diedit
   - Test kirim notifikasi

2. **Log Notifikasi** (`/psb/notifikasi/log`)
   - List semua notifikasi terkirim
   - Status: terkirim / gagal
   - Tombol kirim ulang jika gagal

3. **Blast Pengumuman**
   - Kirim pesan ke semua pendaftar sekaligus
   - Filter penerima: semua / diterima / ditolak / belum bayar
   - Preview pesan sebelum dikirim

---

## 🗂️ FASE 5 — Laporan & Statistik

### Tujuan
Rekap data PSB lengkap dengan export Excel dan PDF.

### Fitur UI yang Dibutuhkan

1. **Dashboard Statistik PSB** (`/psb/statistik`)
   - Total pendaftar per gelombang (bar chart)
   - Breakdown status: mendaftar, tes, diterima, ditolak (pie chart)
   - Asal sekolah terbanyak (bar chart horizontal)
   - Trend pendaftaran per hari (line chart)
   - Program yang paling diminati

2. **Laporan Rekap** (`/psb/laporan`)
   - Filter: gelombang, program, status, tanggal
   - Table rekap dengan semua kolom
   - Kolom: No, Nama, PSB, Asal Sekolah, Program, Nilai, Status, Pembayaran

3. **Export Excel**
```javascript
// Gunakan library xlsx
import * as XLSX from 'xlsx';

export function exportToExcel(data, filename) {
  const ws = XLSX.utils.json_to_sheet(data.map(d => ({
    'No Pendaftaran': d.registration_number,
    'Nama': d.name,
    'Asal Sekolah': d.school_origin,
    'Program': d.program,
    'Nilai Tulis': d.nilai_tulis,
    'Nilai Quran': d.nilai_quran,
    'Nilai Wawancara': d.nilai_wawancara,
    'Nilai Total': d.nilai_total,
    'Status': d.status,
    'Pembayaran': d.payment_status,
    'Tgl Daftar': d.created_at
  })));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data PSB');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

4. **Export PDF**
   - Surat keputusan penerimaan per pendaftar
   - Rekap daftar peserta tes (per kelompok)
   - Laporan akhir PSB per gelombang

---

## 🗂️ FASE 6 — Integrasi Sistem Sekolah

### Tujuan
Konversi otomatis pendaftar yang diterima menjadi data siswa aktif.

### Perubahan Database

```sql
-- Function generate kode registrasi
CREATE OR REPLACE FUNCTION generate_registration_code()
RETURNS text AS $$
DECLARE
  year_code text;
  seq_num integer;
  reg_code text;
BEGIN
  year_code := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COUNT(*) + 1 INTO seq_num
  FROM students
  WHERE registration_code LIKE 'REG-' || year_code || '-%';
  
  reg_code := 'REG-' || year_code || '-' || LPAD(seq_num::text, 4, '0');
  
  RETURN reg_code;
END;
$$ LANGUAGE plpgsql;

-- Function konversi enrollment → student
CREATE OR REPLACE FUNCTION convert_enrollment_to_student(enrollment_uuid uuid, class_uuid uuid)
RETURNS uuid AS $$
DECLARE
  enroll record;
  new_student_id uuid;
  reg_code text;
BEGIN
  -- Ambil data pendaftar
  SELECT * INTO enroll FROM enrollments WHERE id = enrollment_uuid;
  
  -- Validasi status diterima
  IF enroll.status != 'diterima' THEN
    RAISE EXCEPTION 'Pendaftar belum berstatus diterima';
  END IF;
  
  -- Generate kode registrasi
  reg_code := generate_registration_code();
  
  -- Insert ke table students
  INSERT INTO students (
    registration_code,
    name,
    gender,
    birth_place,
    birth_date,
    nisn,
    phone,
    photo_url,
    class_id,
    is_active,
    status,
    metadata
  ) VALUES (
    reg_code,
    enroll.name,
    enroll.gender,
    enroll.birth_place,
    enroll.birth_date,
    enroll.nisn,
    enroll.phone,
    enroll.photo_url,
    class_uuid,
    true,
    'aktif',
    jsonb_build_object(
      'enrollment_id', enrollment_uuid,
      'program', enroll.program,
      'wave_id', enroll.wave_id,
      'school_origin', enroll.school_origin
    )
  ) RETURNING id INTO new_student_id;
  
  -- Update enrollment dengan student_id
  UPDATE enrollments
  SET metadata = metadata || jsonb_build_object('student_id', new_student_id)
  WHERE id = enrollment_uuid;
  
  RETURN new_student_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fitur UI yang Dibutuhkan

1. **Halaman Konversi Siswa** (`/psb/konversi`)
   - List pendaftar dengan status DITERIMA & pembayaran LUNAS
   - Filter yang belum dikonversi
   - Tombol: Konversi ke Siswa (per baris atau bulk)

2. **Modal Konversi**
   - Pilih kelas yang akan dimasukkan
   - Preview data yang akan dikonversi
   - Konfirmasi konversi
   - Hasil: kode REG yang digenerate

3. **Status Konversi**
   - Badge: Belum Dikonversi / Sudah Menjadi Siswa
   - Link ke data siswa yang sudah dibuat

---

## 📅 Timeline Pengerjaan (Rekomendasi)

| Fase | Estimasi | Dependensi |
|------|----------|------------|
| Fase 1 — Gelombang & Kuota | 3-5 hari | - |
| Fase 2 — Seleksi & Tes | 5-7 hari | Fase 1 |
| Fase 3 — Keuangan | 5-7 hari | Fase 2 |
| Fase 4 — Notifikasi | 3-4 hari | Fase 2 |
| Fase 5 — Laporan | 3-4 hari | Fase 1, 2, 3 |
| Fase 6 — Integrasi | 2-3 hari | Fase 2, 3 |

---

## 🔒 Catatan Keamanan

- Semua table sudah menggunakan RLS dengan role-based policy
- Upload bukti pembayaran menggunakan Supabase Storage dengan bucket private
- Function `convert_enrollment_to_student` menggunakan `SECURITY DEFINER` agar aman
- Log semua aksi penting ke `audit_logs`
- Notifikasi tidak menyimpan API key di frontend, gunakan Supabase Edge Function

---

## 🗃️ Summary Table Database

| Table | Status |
|-------|--------|
| `enrollment_waves` | Sudah ada, perlu ALTER |
| `enrollments` | Sudah ada, perlu ALTER |
| `enrollment_tests` | Baru |
| `enrollment_test_results` | Baru |
| `enrollment_payments` | Baru |
| `enrollment_notifications` | Baru |
| `students` | Sudah ada, langsung dipakai |
