import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPlus, faPen, faTrash, faHistory, faSync, faTools,
    faChevronRight, faCircleInfo
} from '@fortawesome/free-solid-svg-icons'

export const ActionBadge = ({ action }) => {
    const config = {
        'INSERT': { label: 'TAMBAH', color: 'bg-emerald-500/10 text-emerald-500', icon: faPlus },
        'UPDATE': { label: 'UBAH', color: 'bg-amber-500/10 text-amber-500', icon: faPen },
        'DELETE': { label: 'HAPUS', color: 'bg-rose-500/10 text-rose-500', icon: faTrash },
        'RESTORE': { label: 'PULIH', color: 'bg-indigo-500/10 text-indigo-500', icon: faHistory },
        'EXECUTE': { label: 'JALAN', color: 'bg-sky-500/10 text-sky-500', icon: faSync },
        'LOGIN': { label: 'MASUK', color: 'bg-emerald-500/10 text-emerald-500', icon: faHistory },
        'REPAIR': { label: 'PERBAIKAN', color: 'bg-purple-500/10 text-purple-500', icon: faTools }
    }
    const c = config[action] || { label: action, color: 'bg-gray-500/10 text-gray-500', icon: faHistory }

    return (
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-1 w-fit ${c.color}`}>
            <FontAwesomeIcon icon={c.icon} className="text-[7px]" />
            {c.label}
        </span>
    )
}

export const JsonVisualizer = ({ data }) => {
    if (!data || typeof data !== 'object') return <span className="text-[var(--color-text-muted)] italic">null</span>

    const renderValue = (val) => {
        if (val === null) return <span className="text-rose-400">null</span>
        if (typeof val === 'boolean') return <span className="text-amber-400">{val.toString()}</span>
        if (typeof val === 'number') return <span className="text-sky-400 font-mono">{val}</span>
        if (typeof val === 'string') return <span className="text-emerald-400">"{val}"</span>
        return JSON.stringify(val)
    }

    return (
        <div className="space-y-1 font-mono text-[10px]">
            {Object.entries(data).map(([key, val]) => (
                <div key={key} className="flex gap-2">
                    <span className="text-[var(--color-primary)] opacity-70 shrink-0">{key}:</span>
                    <span className="truncate">{renderValue(val)}</span>
                </div>
            ))}
        </div>
    )
}

const getDiff = (oldObj, newObj) => {
    const changes = {}
    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})])

    allKeys.forEach(key => {
        const oldVal = oldObj?.[key]
        const newVal = newObj?.[key]

        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
            changes[key] = { old: oldVal, new: newVal }
        }
    })
    return changes
}

export const DiffViewer = ({ oldData, newData }) => {
    const diff = getDiff(oldData, newData)
    const keys = Object.keys(diff)

    if (keys.length === 0) return (
        <div className="flex flex-col items-center justify-center py-8 opacity-40">
            <FontAwesomeIcon icon={faCircleInfo} className="text-xl mb-2" />
            <p className="text-[10px] italic font-bold uppercase tracking-widest">Tidak ada perubahan terbaca</p>
        </div>
    )

    return (
        <div className="space-y-3">
            <div className="hidden lg:grid grid-cols-2 gap-4 mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-50 px-2">Data Sebelumnya</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-80 px-2 text-right">Data Terbaru</p>
            </div>
            {keys.map(key => {
                const isSensitive = ['password', 'secret', 'token'].includes(key.toLowerCase())
                const valOld = diff[key].old
                const valNew = diff[key].new

                return (
                    <div key={key} className="group">
                        <div className="px-2 py-1.5 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-surface-alt)]/30 group-hover:border-[var(--color-primary)]/30 transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-[var(--color-text-muted)] tracking-tighter">
                                    {key.replace(/_/g, ' ')}
                                </span>
                                {isSensitive && (
                                    <span className="text-[8px] font-black text-rose-500 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase">Sensitif</span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/10 min-h-[32px] flex items-center">
                                        <code className="text-[10px] font-mono break-all text-rose-600/70 line-through">
                                            {isSensitive ? '••••••••' : (typeof valOld === 'object' ? JSON.stringify(valOld) : String(valOld ?? 'null'))}
                                        </code>
                                    </div>
                                </div>
                                <div className="space-y-1 relative">
                                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 hidden lg:flex w-4 h-4 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] items-center justify-center z-10">
                                        <FontAwesomeIcon icon={faChevronRight} className="text-[8px] text-[var(--color-text-muted)] opacity-30" />
                                    </div>
                                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 min-h-[32px] flex items-center">
                                        <code className="text-[10px] font-mono font-black break-all text-emerald-600">
                                            {isSensitive ? '••••••••' : (typeof valNew === 'object' ? JSON.stringify(valNew) : String(valNew ?? 'null'))}
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
