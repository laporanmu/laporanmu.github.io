import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faTriangleExclamation, faCircleExclamation, 
    faArrowTrendUp, faArrowTrendDown, faCrown, faSchool
} from '@fortawesome/free-solid-svg-icons'

const InsightRow = memo(function InsightRow({
    globalStats,
    filterPointMode,
    setFilterPointMode,
    filterMissing,
    setFilterMissing,
    setShowAdvancedFilter,
    filterClass,
    setFilterClass,
    setFilterClasses,
    setPage
}) {
    if (!(globalStats.risk > 0 || globalStats.incompleteCount > 0 || globalStats.topPerformer || (globalStats.worstClass && globalStats.worstClass.avg < 0) || globalStats.avgPointsLastWeek !== null)) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-top-1 duration-500">
            {/* Siswa berisiko */}
            {globalStats.risk > 0 && (
                <button
                    onClick={() => { setFilterPointMode(filterPointMode === 'risk' ? '' : 'risk'); setShowAdvancedFilter(true) }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${filterPointMode === 'risk' ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500' : 'bg-red-500/[0.08] border-red-500/20 hover:bg-red-500/[0.15] text-red-600'}`}
                >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterPointMode === 'risk' ? 'bg-red-500 text-white' : 'bg-red-500/15'}`}>
                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-[10px]" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black leading-none">{globalStats.risk} Siswa Berisiko</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Poin di bawah threshold</p>
                    </div>
                </button>
            )}

            {/* Data tidak lengkap */}
            {globalStats.incompleteCount > 0 && (
                <button
                    onClick={() => { setFilterMissing(filterMissing === 'photo' ? '' : 'photo'); setShowAdvancedFilter(true) }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${filterMissing === 'photo' ? 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500' : 'bg-amber-500/[0.08] border-amber-500/20 hover:bg-amber-500/[0.15]'}`}
                >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterMissing === 'photo' ? 'bg-amber-500 text-white' : 'bg-amber-500/15'}`}>
                        <FontAwesomeIcon icon={faCircleExclamation} className="text-amber-500 text-[10px]" />
                    </div>
                    <div className="text-left">
                        <p className={`text-[10px] font-black leading-none ${filterMissing === 'photo' ? 'text-amber-600' : 'text-amber-600 dark:text-amber-400'}`}>{globalStats.incompleteCount} Data Belum Lengkap</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Foto/NISN/WA kosong</p>
                    </div>
                </button>
            )}

            {/* Tren poin minggu ini */}
            {globalStats.avgPointsLastWeek !== null && (
                <div className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all ${globalStats.avgPointsLastWeek >= 0 ? 'bg-emerald-500/[0.08] border-emerald-500/20' : 'bg-red-500/[0.08] border-red-500/20'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${globalStats.avgPointsLastWeek >= 0 ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                        <FontAwesomeIcon icon={globalStats.avgPointsLastWeek >= 0 ? faArrowTrendUp : faArrowTrendDown} className={`text-[10px] ${globalStats.avgPointsLastWeek >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    </div>
                    <div className="text-left">
                        <p className={`text-[10px] font-black leading-none ${globalStats.avgPointsLastWeek >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            Tren {globalStats.avgPointsLastWeek >= 0 ? '▲' : '▼'} {globalStats.avgPointsLastWeek > 0 ? '+' : ''}{globalStats.avgPointsLastWeek} / siswa
                        </p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Delta poin 7 hari terakhir</p>
                    </div>
                </div>
            )}

            {/* Top performer */}
            {globalStats.topPerformer && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/20 transition-all">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                        <FontAwesomeIcon icon={faCrown} className="text-indigo-500 text-[10px]" />
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-indigo-500 leading-none truncate max-w-[140px]">{globalStats.topPerformer.name}</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Top Performer · +{globalStats.topPerformer.points}</p>
                    </div>
                </div>
            )}

            {/* Kelas rata-rata terendah */}
            {globalStats.worstClass && globalStats.worstClass.avg < 0 && (
                <button
                    onClick={() => { setFilterClass(globalStats.worstClass.id); setFilterClasses([]); setPage(1); setShowAdvancedFilter(true) }}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl border transition-all hover:scale-[1.02] active:scale-95 ${filterClass === globalStats.worstClass.id ? 'border-orange-500 bg-orange-500/5 ring-1 ring-orange-500' : 'bg-orange-500/[0.08] border-orange-500/20 hover:bg-orange-500/[0.15]'}`}
                >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${filterClass === globalStats.worstClass.id ? 'bg-orange-500 text-white' : 'bg-orange-500/15'}`}>
                        <FontAwesomeIcon icon={faSchool} className="text-orange-500 text-[10px]" />
                    </div>
                    <div className="text-left">
                        <p className={`text-[10px] font-black leading-none truncate max-w-[140px] ${filterClass === globalStats.worstClass.id ? 'text-orange-600' : 'text-orange-600 dark:text-orange-400'}`}>{globalStats.worstClass.name}</p>
                        <p className="text-[9px] text-[var(--color-text-muted)] font-bold mt-0.5">Rata terendah ({globalStats.worstClass.avg})</p>
                    </div>
                </button>
            )}
        </div>
    )
})

export default InsightRow
