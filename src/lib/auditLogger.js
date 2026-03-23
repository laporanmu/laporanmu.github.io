
import { supabase } from './supabase'

/**
 * Tulis satu entry ke audit_logs
 * @param {Object} params
 * @param {'INSERT'|'UPDATE'|'DELETE'} params.action  - Jenis aksi
 * @param {string}  params.tableName                  - Nama tabel yang dimodifikasi
 * @param {string}  [params.recordId]                 - UUID record yang dimodifikasi
 * @param {Object}  [params.oldData]                  - Data sebelum perubahan (UPDATE/DELETE)
 * @param {Object}  [params.newData]                  - Data setelah perubahan (INSERT/UPDATE)
 */
export async function logAudit({ action, tableName, recordId = null, oldData = null, newData = null }) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return // tidak log kalau tidak ada sesi

        // Bersihkan data — hapus field sensitif sebelum disimpan
        const sanitize = (obj) => {
            if (!obj) return null
            const clean = { ...obj }
            delete clean.password
            delete clean.password_hash
            delete clean.token
            delete clean.secret
            return clean
        }

        await supabase.from('audit_logs').insert({
            user_id: user.id,
            action,
            table_name: tableName,
            record_id: recordId || null,
            old_data: sanitize(oldData),
            new_data: sanitize(newData),
        })
        // Sengaja tidak throw error — audit log gagal tidak boleh block aksi utama
    } catch (err) {
        console.warn('[auditLogger] Gagal menulis audit log:', err?.message)
    }
}

/**
 * Helper khusus untuk batch log — misalnya import massal
 * @param {Array} entries - Array of { action, tableName, recordId, oldData, newData }
 */
export async function logAuditBatch(entries) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !entries?.length) return

        const sanitize = (obj) => {
            if (!obj) return null
            const clean = { ...obj }
            delete clean.password; delete clean.password_hash
            delete clean.token; delete clean.secret
            return clean
        }

        const rows = entries.map(e => ({
            user_id: user.id,
            action: e.action,
            table_name: e.tableName,
            record_id: e.recordId || null,
            old_data: sanitize(e.oldData),
            new_data: sanitize(e.newData),
        }))

        await supabase.from('audit_logs').insert(rows)
    } catch (err) {
        console.warn('[auditLogger] Gagal menulis batch audit log:', err?.message)
    }
}