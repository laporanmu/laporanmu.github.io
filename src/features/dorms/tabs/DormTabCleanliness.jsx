import React from 'react'
import { EmptyState } from '@components/ui/DataDisplay'
import RichSelect from '@components/ui/RichSelect'
import RichDatePicker from '@components/ui/RichDatePicker'
import {
    Bed, Plus, X, ClipboardList, Trash2, Award, ShieldAlert
} from 'lucide-react'

export default function DormTabCleanliness({
    setIsAuditModalOpen,
    auditRoomFilter,
    setAuditRoomFilter,
    dorms,
    auditDateFrom,
    setAuditDateFrom,
    auditDateTo,
    setAuditDateTo,
    filteredAudits,
    audits,
    handleOpenDeleteAuditModal
}) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
            {/* Room Rating Cleanliness Scorecard */}
            <div className="lg:col-span-2 space-y-4">
                <div className="glass rounded-[1.5rem] p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div>
                            <p className="text-[13px] font-black text-[var(--color-text)]">Jurnal Penilaian Kebersihan</p>
                            <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Riwayat skor kebersihan dan kerapian kamar mingguan.</p>
                        </div>
                        <button
                            onClick={() => setIsAuditModalOpen(true)}
                            className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95 shadow-md shadow-[var(--color-primary)]/20 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Input Penilaian
                        </button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-[var(--color-surface-alt)]/40 border border-[var(--color-border)]">

                        {/* Room Filter — RichSelect compact */}
                        <div className="flex-1 min-w-[110px]">
                            <RichSelect
                                icon={Bed}
                                value={auditRoomFilter}
                                onChange={setAuditRoomFilter}
                                placeholder="Semua Kamar"
                                options={dorms.map(d => ({ id: d.id, name: d.id }))}
                                extraOption={{ id: '', name: 'Semua Kamar' }}
                            />
                        </div>

                        {/* Date Range — RichDatePicker */}
                        <div className="flex items-center gap-1.5">
                            <RichDatePicker
                                compact
                                value={auditDateFrom}
                                onChange={setAuditDateFrom}
                                clearable={false}
                                className="w-[190px]"
                            />
                            <span className="text-[10px] text-[var(--color-text-muted)] font-black">s/d</span>
                            <RichDatePicker
                                compact
                                value={auditDateTo}
                                onChange={setAuditDateTo}
                                clearable={false}
                                className="w-[190px]"
                            />
                        </div>

                        {/* Reset Button */}
                        {(auditRoomFilter || auditDateFrom || auditDateTo) && (
                            <button
                                onClick={() => { setAuditRoomFilter(''); setAuditDateFrom(''); setAuditDateTo(''); }}
                                className="h-8 px-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500/10 transition flex items-center gap-1.5"
                            >
                                <X className="w-3 h-3" /> Reset
                            </button>
                        )}

                        <span className="text-[9px] text-[var(--color-text-muted)] font-black ml-auto opacity-60">
                            {filteredAudits.length} / {audits.length} laporan
                        </span>
                    </div>

                    <div className="space-y-3">
                        {filteredAudits.length === 0 ? (
                            <EmptyState
                                variant="plain"
                                icon={ClipboardList}
                                title={audits.length === 0 ? "Belum Ada Penilaian" : "Tidak Ditemukan"}
                                description={audits.length === 0 ? "Belum ada laporan kebersihan yang diinput. Klik '+ Input Penilaian' untuk memulai." : "Tidak ada laporan yang sesuai filter."}
                                action={audits.length === 0 ? (
                                    <button
                                        onClick={() => setIsAuditModalOpen(true)}
                                        className="h-9 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 shadow-lg shadow-[var(--color-primary)]/10 transition flex items-center gap-2 mx-auto"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Input Penilaian
                                    </button>
                                ) : null}
                            />
                        ) : filteredAudits.map(audit => (
                            <div
                                key={audit.id}
                                className="p-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-[var(--color-border-hover)] transition"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-[12px] font-black text-[var(--color-text)]">{audit.room}</span>
                                        <span className={`text-[8.5px] font-black px-2 py-0.5 rounded-md ${audit.rating === 'A' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                                            Predikat {audit.rating}
                                        </span>
                                    </div>
                                    <p className="text-[10.5px] text-[var(--color-text-muted)]">{audit.notes}</p>
                                    <div className="flex items-center gap-3 text-[9px] text-[var(--color-text-muted)] opacity-60 font-semibold pt-1">
                                        <span>Tgl: {audit.date}</span>
                                        <span>•</span>
                                        <span>Kerapian: {audit.aspects?.kerapian}</span>
                                        <span>•</span>
                                        <span>Kebersihan: {audit.aspects?.kebersihan}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 justify-between sm:justify-end border-t sm:border-t-0 border-[var(--color-border)] pt-3 sm:pt-0">
                                    <div className="text-right sm:pr-2">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Skor Rata-rata</p>
                                        <p className="text-xl font-black text-[var(--color-primary)] mt-0.5">{audit.score} <span className="text-[10px] font-bold text-[var(--color-text-muted)]">/ 100</span></p>
                                    </div>
                                    <button
                                        onClick={() => handleOpenDeleteAuditModal(audit)}
                                        className="w-8 h-8 rounded-xl bg-red-500/5 hover:bg-red-500/10 text-red-500 transition flex items-center justify-center"
                                        title="Hapus Laporan"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Best Cleanliness Performance & Guidelines */}
            <div className="space-y-4">
                <div className="glass rounded-[1.5rem] p-5 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-emerald-500/5 rounded-full blur-[50px] pointer-events-none" />
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Award className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[12px] font-black text-[var(--color-text)]">Kamar Terbaik Minggu Ini</p>
                            <p className="text-[9px] text-[var(--color-text-muted)]">Skor tertinggi se-asrama</p>
                        </div>
                    </div>

                    {audits.length === 0 ? (
                        <div className="bg-[var(--color-surface-alt)] border border-dashed border-[var(--color-border)] rounded-2xl p-5 text-center">
                            <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Kamar Terbersih</p>
                            <p className="text-[11px] text-[var(--color-text-muted)] mt-2 opacity-60">Belum ada data penilaian. Input penilaian pertama untuk melihat kamar terbersih.</p>
                        </div>
                    ) : (() => {
                        const best = audits.reduce((prev, curr) => (curr.score > prev.score ? curr : prev), audits[0])
                        return (
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Kamar Terbersih</p>
                                <p className="text-xl font-black text-[var(--color-text)] mt-1.5">Kamar {best.room}</p>
                                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{best.notes || 'Kamar dengan skor tertinggi se-asrama.'}</p>
                                <div className="w-fit mx-auto mt-4 bg-emerald-500 text-white font-black text-xs px-3.5 py-1.5 rounded-xl shadow-lg shadow-emerald-500/20">
                                    {best.score} Poin
                                </div>
                            </div>
                        )
                    })()}
                </div>

                <div className="glass rounded-[1.5rem] p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[12px] font-black text-[var(--color-text)]">
                        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>Pedoman Penilaian</span>
                    </div>
                    <p className="text-[10.5px] text-[var(--color-text-muted)] leading-relaxed">
                        Pemeriksaan kebersihan dilakukan setiap hari Minggu pagi oleh Musyrif Kamar/Piket asrama.
                    </p>
                    <div className="space-y-2 pt-1.5">
                        <div className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                            <p className="text-[10px] text-[var(--color-text)]"><strong>Kerapian (33.3%):</strong> Plot kasur, pelipatan selimut, susunan lemari pakaian.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                            <p className="text-[10px] text-[var(--color-text)]"><strong>Kebersihan (33.3%):</strong> Menyapu, mengepel lantai kamar, kebersihan ventilasi jendela.</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mt-1.5 shrink-0" />
                            <p className="text-[10px] text-[var(--color-text)]"><strong>Keharuman (33.3%):</strong> Aroma kesegaran, tidak apek, sirkulasi udara lancar.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
