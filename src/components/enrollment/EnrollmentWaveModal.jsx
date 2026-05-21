import React, { useState, memo, useCallback } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faWaveSquare, faPlus, faCalendarAlt, faUsers,
    faToggleOn, faToggleOff, faPen, faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import Modal from '../ui/Modal'

const inputClass = "w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]/40 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10 transition-all outline-none"

function EnrollmentWaveModal({ isOpen, onClose, waves = [], addToast }) {
    const [isAdding, setIsAdding] = useState(false)
    const [form, setForm] = useState({ name: '', academic_year: '2026/2027', start_date: '', end_date: '', quota: 40 })

    const handleAdd = useCallback(() => {
        if (!form.name.trim() || !form.start_date || !form.end_date) {
            addToast?.('Nama, tanggal buka, dan tanggal tutup wajib diisi', 'warning')
            return
        }
        addToast?.(`Gelombang "${form.name}" berhasil ditambahkan`, 'success')
        setForm({ name: '', academic_year: '2026/2027', start_date: '', end_date: '', quota: 40 })
        setIsAdding(false)
    }, [form, addToast])

    const toggleActive = useCallback((wave) => {
        addToast?.(`${wave.name} ${wave.is_active ? 'dinonaktifkan' : 'diaktifkan'}`, 'success')
    }, [addToast])

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Manajemen Gelombang" maxWidth="max-w-lg">
            <div className="px-5 sm:px-6">
                {/* Wave List */}
                <div className="space-y-3 mb-4">
                    {waves.map(wave => {
                        const isExpired = new Date(wave.end_date) < new Date()
                        const isOpen = wave.is_active && !isExpired
                        return (
                            <div key={wave.id} className={`glass rounded-2xl border p-4 transition-all ${isOpen
                                ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                                : 'border-[var(--color-border)]'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOpen ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>
                                            <FontAwesomeIcon icon={faWaveSquare} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[13px] font-bold text-[var(--color-text)]">{wave.name}</p>
                                                {isOpen && (
                                                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                        Aktif
                                                    </span>
                                                )}
                                                {isExpired && !wave.is_active && (
                                                    <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] text-[8px] font-black uppercase tracking-widest border border-[var(--color-border)]">
                                                        Selesai
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5">
                                                TP {wave.academic_year} · Kuota: {wave.quota} santri
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => toggleActive(wave)} className={`p-2 rounded-lg transition-all ${wave.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)]'}`} title={wave.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                                        <FontAwesomeIcon icon={wave.is_active ? faToggleOn : faToggleOff} className="text-lg" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-border)]/50">
                                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-muted)]">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="opacity-40" />
                                        {new Date(wave.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – {new Date(wave.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Add Form */}
                {isAdding ? (
                    <div className="glass rounded-2xl border border-dashed border-[var(--color-primary)]/30 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--color-primary)]">Tambah Gelombang Baru</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Nama Gelombang</label>
                                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Gelombang 3" className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Tanggal Buka</label>
                                <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Tanggal Tutup</label>
                                <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} className={inputClass} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Kuota</label>
                                <input type="number" value={form.quota} onChange={e => setForm(p => ({ ...p, quota: Number(e.target.value) }))} className={inputClass} min={1} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-1">Tahun Pelajaran</label>
                                <input type="text" value={form.academic_year} onChange={e => setForm(p => ({ ...p, academic_year: e.target.value }))} className={inputClass} />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                                Batal
                            </button>
                            <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-[11px] font-black transition-all flex items-center gap-2">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" /> Simpan
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setIsAdding(true)} className="w-full py-3 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all flex items-center justify-center gap-2">
                        <FontAwesomeIcon icon={faPlus} /> Tambah Gelombang
                    </button>
                )}
            </div>

            <div className="px-5 sm:px-6 py-4 mt-4 border-t border-[var(--color-border)] flex justify-end">
                <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-[var(--color-border)] text-[11px] font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-all">
                    Tutup
                </button>
            </div>
        </Modal>
    )
}

export default memo(EnrollmentWaveModal)
