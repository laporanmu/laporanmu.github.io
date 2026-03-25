import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faHistory, faCircleInfo, faChevronRight, faAngleDown, faXmark,
    faUserShield, faClock, faDatabase, faSearch
} from '@fortawesome/free-solid-svg-icons'
import { fmtRelative, fmtDateTime } from '../../utils/formatters'
import { ActionBadge, DiffViewer } from './AuditDetails'

export default function AuditTimeline({ tableName, recordId, limit = 20, showSearch = false }) {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)
    const [search, setSearch] = useState('')
    const [restoringId, setRestoringId] = useState(null)

    const fetchLogs = useCallback(async () => {
        if (!tableName || !recordId) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .eq('table_name', tableName)
                .eq('record_id', recordId)
                .order('created_at', { ascending: false })
                .limit(limit)

            if (error) throw error

            // Resolve actor names
            const uids = [...new Set((data || []).map(r => r.user_id).filter(id => id))]
            let profileMap = {}
            if (uids.length) {
                const { data: pData } = await supabase.from('profiles').select('id,full_name').in('id', uids)
                if (pData) pData.forEach(p => { profileMap[p.id] = p })
            }

            const normalized = (data || []).map(r => ({
                ...r,
                actor_name: profileMap[r.user_id]?.full_name || 'System'
            }))

            setLogs(normalized)
        } catch (e) {
            console.error('[AuditTimeline] Error:', e.message)
        } finally {
            setLoading(false)
        }
    }, [tableName, recordId, limit])

    const handleRestore = async (log) => {
        if (!window.confirm('Pulihkan data ini? Aksi ini akan menulis ulang state record saat ini.')) return
        setRestoringId(log.id)
        try {
            const targetData = log.action === 'DELETE' ? log.old_data : log.old_data
            if (!targetData) throw new Error('Data forensik tidak ditemukan')

            const { error } = await supabase
                .from(tableName)
                .upsert({ id: recordId, ...targetData })

            if (error) throw error
            
            // Log the restoration itself
            const { data: { user } } = await supabase.auth.getUser()
            await supabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'RESTORE',
                source: 'MASTER',
                table_name: tableName,
                record_id: recordId,
                old_data: {},
                new_data: { restored_from: log.id, action: log.action },
                url: window.location.href
            })

            window.location.reload() // Quickest way to sync UI
        } catch (e) {
            alert('Gagal memulihkan: ' + e.message)
        } finally {
            setRestoringId(null)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    const filteredLogs = logs.filter(l => 
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.actor_name.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) return (
        <div className="space-y-4 p-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-surface-alt)]" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-1/2 bg-[var(--color-surface-alt)] rounded" />
                        <div className="h-2 w-1/4 bg-[var(--color-surface-alt)] rounded opacity-50" />
                    </div>
                </div>
            ))}
        </div>
    )

    if (logs.length === 0) return (
        <div className="py-12 flex flex-col items-center justify-center text-center opacity-30 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-surface-alt)] flex items-center justify-center">
                <FontAwesomeIcon icon={faHistory} className="text-xl" />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest">Belum ada jejak audit</p>
                <p className="text-[9px] font-bold">Aktivitas forensik untuk data ini tidak ditemukan.</p>
            </div>
        </div>
    )

    return (
        <div className="space-y-4">
            {showSearch && (
                <div className="relative mb-4">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[10px]" />
                    <input 
                        type="text" 
                        value={search} 
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Cari dalam riwayat..."
                        className="w-full h-8 pl-9 pr-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]/50 text-[10px] font-bold outline-none focus:border-[var(--color-primary)] transition-all"
                    />
                </div>
            )}

            <div className="relative space-y-1">
                {/* Vertical Line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-[var(--color-border)] opacity-30" />

                {filteredLogs.map((log, idx) => {
                    const isExpanded = expandedId === log.id
                    return (
                        <div key={log.id} className="relative pl-9 pb-4 last:pb-0">
                            {/* Dot Indicator */}
                            <div className={`absolute left-0 top-1.5 w-8 h-8 rounded-xl border bg-[var(--color-surface)] flex items-center justify-center transition-all z-10
                                ${isExpanded ? 'border-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/10 scale-110' : 'border-[var(--color-border)] opacity-80'}`}>
                                <FontAwesomeIcon 
                                    icon={log.action === 'INSERT' ? faHistory : (log.action === 'DELETE' ? faDatabase : faCircleInfo)} 
                                    className={`text-[10px] ${isExpanded ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`} 
                                />
                            </div>

                            <button 
                                onClick={() => setExpandedId(isExpanded ? null : log.id)}
                                className={`w-full text-left group transition-all rounded-2xl p-3 border
                                    ${isExpanded 
                                        ? 'bg-[var(--color-surface-alt)] border-[var(--color-border)] shadow-sm' 
                                        : 'bg-transparent border-transparent hover:bg-[var(--color-surface-alt)]/30'}`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <ActionBadge action={log.action} />
                                        <span className="text-[10px] font-black text-[var(--color-text)] uppercase tracking-tight">
                                            {log.actor_name}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-[var(--color-text-muted)] tabular-nums opacity-60">
                                        {fmtRelative(log.created_at)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-medium leading-tight">
                                    {log.action === 'UPDATE' ? 'Melakukan perubahan data record' : 
                                     log.action === 'INSERT' ? 'Membuat record baru di sistem' : 
                                     log.action === 'DELETE' ? 'Menghapus record dari sistem' : 'Aktivitas sistem'} 
                                    <span className="mx-1.5 opacity-30">·</span> {fmtDateTime(log.created_at)}
                                </p>

                                {isExpanded && (
                                    <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]/50 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <FontAwesomeIcon icon={faClock} className="text-[10px] text-indigo-500" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Forensic Diff</span>
                                                    </div>
                                                    <div className="text-[8px] font-mono text-[var(--color-text-muted)] opacity-50">
                                                        IP: {log.ip_address || '?.?.?.?'}
                                                    </div>
                                                </div>
                                                <DiffViewer oldData={log.old_data} newData={log.new_data} />
                                                
                                                {/* Restore/Revert Action */}
                                                {(log.action === 'DELETE' || log.action === 'UPDATE') && (
                                                    <div className="pt-3 border-t border-[var(--color-border)]/50 flex justify-end">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleRestore(log) }}
                                                            disabled={restoringId === log.id}
                                                            className={`h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                                                                ${restoringId === log.id 
                                                                    ? 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] animate-pulse' 
                                                                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20 active:scale-95'}`}
                                                        >
                                                            <FontAwesomeIcon icon={faHistory} className={restoringId === log.id ? 'animate-spin' : ''} />
                                                            {restoringId === log.id ? 'Memulihkan...' : (log.action === 'DELETE' ? 'Pulihkan Record' : 'Revert ke State ini')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={`flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity ${isExpanded ? 'hidden' : ''}`}>
                                    <span className="text-[8px] font-black uppercase text-[var(--color-primary)] flex items-center gap-1.5">
                                        Detail Forensik <FontAwesomeIcon icon={faChevronRight} className="text-[7px]" />
                                    </span>
                                </div>
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
