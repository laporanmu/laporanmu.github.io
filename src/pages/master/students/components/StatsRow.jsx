import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faUsers, faMars, faVenus, faTrophy, faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'

export function StatsRow({ globalStats, setFilterClass, setFilterPointMode }) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-[var(--color-primary)] flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-[var(--color-primary)]/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-primary)] text-lg group-hover:scale-110 transition-transform shrink-0">
                    <FontAwesomeIcon icon={faUsers} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Total Siswa</p>
                    <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.total}</h3>
                </div>
            </div>

            <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-blue-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-blue-500/5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                    <FontAwesomeIcon icon={faMars} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putra</p>
                    <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.boys}</h3>
                </div>
            </div>

            <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-pink-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-pink-500/5">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                    <FontAwesomeIcon icon={faVenus} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Putri</p>
                    <h3 className="text-xl font-black font-heading leading-none text-[var(--color-text)]">{globalStats.girls}</h3>
                </div>
            </div>

            <div className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-emerald-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-emerald-500/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                    <FontAwesomeIcon icon={faTrophy} />
                </div>
                <div>
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Rata-rata Poin</p>
                    <h3 className={`text-xl font-black font-heading leading-none ${globalStats.avgPoints >= 0 ? 'text-[var(--color-text)]' : 'text-red-500'} `}>{globalStats.avgPoints}</h3>
                </div>
            </div>

            <div
                className="glass rounded-[1.5rem] p-4 border-t-[3px] border-t-red-500 flex items-center gap-3 group hover:border-t-4 transition-all hover:bg-red-500/5 cursor-pointer col-span-2 lg:col-span-1"
                onClick={() => { if (globalStats.worstClass) { setFilterClass(''); setFilterPointMode('risk') } }}
                title="Klik untuk filter siswa risiko"
            >
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg group-hover:scale-110 transition-transform shrink-0">
                    <FontAwesomeIcon icon={faTriangleExclamation} />
                </div>
                <div className="min-w-0">
                    <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-0.5">Kelas Bermasalah</p>
                    {globalStats.worstClass ? (
                        <>
                            <h3 className="text-sm font-black font-heading leading-none text-red-500 truncate">{globalStats.worstClass.name}</h3>
                            <p className="text-[9px] text-[var(--color-text-muted)] mt-0.5">avg {globalStats.worstClass.avg} poin</p>
                        </>
                    ) : (
                        <h3 className="text-sm font-black text-[var(--color-text-muted)]">-</h3>
                    )}
                </div>
            </div>
        </div>
    )
}
