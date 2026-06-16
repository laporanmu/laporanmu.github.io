import React from 'react'
import { useLanguage } from '@context/Language'
import {
    RefreshCw, Plus, Check, CheckSquare
} from 'lucide-react'

export default function DormTabMusyrif({
    resetAllTasks,
    musyrifTasks,
    toggleTask,
    setIsLogModalOpen,
    shiftLogs
}) {
    const { t } = useLanguage()
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {/* Tasks Checklist */}
            <div className="lg:col-span-2 space-y-4">
                <div className="glass rounded-[1.5rem] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">{t('dorms.musyrif.title')}</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{t('dorms.musyrif.subtitle')}</p>
                        </div>
                        <button
                            onClick={resetAllTasks}
                            className="h-8.5 px-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)] flex items-center gap-1.5"
                        >
                            <RefreshCw className="w-3 h-3" />
                            {t('dorms.musyrif.resetChecklist')}
                        </button>
                    </div>

                    <div className="space-y-2">
                        {musyrifTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => toggleTask(task.id)}
                                className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${task.completed ? 'bg-[var(--color-primary)]/5 border-[var(--color-primary)]/20' : 'bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-hover)]'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${task.completed ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}>
                                        {task.completed && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                                    </div>
                                    <div>
                                        <p className={`text-[11.5px] font-bold transition-all ${task.completed ? 'text-[var(--color-text-muted)] line-through' : 'text-[var(--color-text)]'}`}>{task.title}</p>
                                        <p className="text-[9.5px] text-[var(--color-text-muted)] mt-0.5">{task.desc}</p>
                                    </div>
                                </div>

                                {task.completed && task.completedAt && (
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">
                                        {t('dorms.musyrif.completedAt').replace('{completedAt}', task.completedAt)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Shift Logs Jurnal Piket */}
            <div className="space-y-4">
                <div className="glass rounded-[1.5rem] p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-[12.5px] font-black text-[var(--color-text)]">{t('dorms.musyrif.piketTitle')}</p>
                            <p className="text-[9.5px] text-[var(--color-text-muted)] mt-0.5">{t('dorms.musyrif.piketSubtitle')}</p>
                        </div>
                        <button
                            onClick={() => setIsLogModalOpen(true)}
                            className="h-8 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/10 transition flex items-center gap-1.5"
                        >
                            <Plus className="w-3 h-3" />
                            {t('dorms.musyrif.fillJournal')}
                        </button>
                    </div>

                    <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                        {shiftLogs.length === 0 ? (
                            <p className="text-[11px] text-[var(--color-text-muted)] text-center py-8">{t('dorms.musyrif.noLogs')}</p>
                        ) : (
                            shiftLogs.map(log => (
                                <div key={log.id} className="p-3.5 rounded-2xl bg-[var(--color-surface-alt)]/65 border border-[var(--color-border)] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-[var(--color-text)]">{log.musyrifName}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)] opacity-60 bg-[var(--color-surface)] px-1.5 py-0.5 rounded">{log.shift}</span>
                                    </div>
                                    <div className="text-[10px] space-y-1 text-[var(--color-text-muted)] leading-relaxed">
                                        <p><strong>{t('dorms.musyrif.notes')}:</strong> {log.notes}</p>
                                        <p><strong>{t('dorms.musyrif.findings')}:</strong> <span className={log.issues !== 'Nihil' ? 'text-red-500 font-bold' : ''}>{log.issues === 'Nihil' ? t('dorms.musyrif.findingsNihil') : log.issues}</span></p>
                                    </div>
                                    <div className="text-[8px] text-[var(--color-text-muted)] opacity-50 text-right">{log.date}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
