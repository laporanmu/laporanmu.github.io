
import { supabase } from './supabase'

/**
 * Tulis satu entry ke audit_logs
 * @param {Object} params
 * @param {'INSERT'|'UPDATE'|'DELETE'|'LOGIN'|'LOGOUT'|'RESTORE'} params.action
 * @param {string}  params.tableName
 * @param {'OPERATIONAL'|'SYSTEM'|'MASTER'|'SECURITY'|'AUTH'} [params.source]
 * @param {string}  [params.recordId]
 * @param {Object}  [params.oldData]
 * @param {Object}  [params.newData]
 */
export async function logAudit({ action, tableName, source = 'SYSTEM', recordId = null, oldData = null, newData = null }) {
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Capture forensic context
        const userAgent = navigator.userAgent
        const url = window.location.href
        
        let ipAddress = '0.0.0.0'
        try {
            const ipRes = await fetch('https://api64.ipify.org?format=json')
            const ipJson = await ipRes.json()
            ipAddress = ipJson.ip
        } catch (e) {
            console.debug('[auditLogger] Failed to fetch IP:', e.message)
        }

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
            source: source || 'SYSTEM',
            table_name: tableName,
            record_id: recordId || null,
            old_data: sanitize(oldData),
            new_data: sanitize(newData),
            ip_address: ipAddress,
            user_agent: userAgent,
            url: url
        })
        // Sengaja tidak throw error — audit log gagal tidak boleh block aksi utama
    } catch (err) {
        console.warn('[auditLogger] Gagal menulis audit log:', err?.message)
    }
}

/**
 * Helper khusus untuk batch log — misalnya import massal
 * @param {Array} entries - Array of { action, tableName, source, recordId, oldData, newData }
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

        const userAgent = navigator.userAgent
        const url = window.location.href
        let ipAddress = '0.0.0.0'
        try {
            const ipRes = await fetch('https://api64.ipify.org?format=json')
            const ipJson = await ipRes.json()
            ipAddress = ipJson.ip
        } catch (e) {}

        const rows = entries.map(e => ({
            user_id: user.id,
            action: e.action,
            source: e.source || 'SYSTEM',
            table_name: e.tableName,
            record_id: e.recordId || null,
            old_data: sanitize(e.oldData),
            new_data: sanitize(e.newData),
            ip_address: ipAddress,
            user_agent: userAgent,
            url: url
        }))

        await supabase.from('audit_logs').insert(rows)
    } catch (err) {
        console.warn('[auditLogger] Gagal menulis batch audit log:', err?.message)
    }
}