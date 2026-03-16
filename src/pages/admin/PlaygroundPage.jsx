import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPalette, faCheck, faTriangleExclamation, faCircleInfo,
    faXmark, faChevronDown, faPlus, faTrash, faArrowRight
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'

export default function PlaygroundPage() {
    return (
        <DashboardLayout title="UI Playground">
            <div className="p-4 md:p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Breadcrumb badge="Developer" items={['Admin', 'UI Playground']} className="mb-1" />
                        <div className="flex items-center gap-2.5 mb-1">
                            <h1 className="text-2xl font-black font-heading tracking-tight text-[var(--color-text)]">UI Playground</h1>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-500 uppercase tracking-widest">Design System</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-[11px] font-medium opacity-70">
                            Katalog komponen antarmuka (Design System) untuk konsistensi di seluruh halaman Laporanmu.
                        </p>
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">

                    {/* Buttons */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">1. Buttons</h2>
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-6 space-y-6">

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Primary (Brand)</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[12px] font-black hover:opacity-90 transition-opacity">
                                        Primary Button
                                    </button>
                                    <button className="h-10 px-4 rounded-xl bg-[var(--color-primary)] text-white text-[12px] font-black hover:opacity-90 transition-opacity flex items-center gap-2">
                                        <FontAwesomeIcon icon={faPlus} /> With Icon
                                    </button>
                                    <button className="h-10 px-5 rounded-xl bg-[var(--color-primary)] text-white text-[12px] font-black opacity-50 cursor-not-allowed">
                                        Disabled
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Secondary (Surface)</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="h-10 px-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text)] text-[12px] font-black hover:bg-[var(--color-border)] transition-colors">
                                        Secondary Button
                                    </button>
                                    <button className="h-10 px-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-[12px] font-black transition-colors flex items-center gap-2">
                                        Ghost <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-[var(--color-text-muted)]">Danger Zone</p>
                                <div className="flex flex-wrap gap-3">
                                    <button className="h-10 px-5 rounded-xl bg-rose-500 text-white text-[12px] font-black hover:bg-rose-600 transition-colors">
                                        Delete Action
                                    </button>
                                    <button className="h-10 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 text-[12px] font-black hover:bg-rose-500 hover:text-white transition-colors flex items-center gap-2">
                                        <FontAwesomeIcon icon={faTrash} /> Soft Danger
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inputs & Forms */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">2. Form Inputs</h2>
                        <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-6 space-y-5">

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">Nama Lengkap</label>
                                <input type="text" placeholder="Masukkan nama..." className="input-field" />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">Pilih Opsi</label>
                                <div className="relative">
                                    <select className="input-field appearance-none w-full pr-10">
                                        <option>Opsi Pertama</option>
                                        <option>Opsi Kedua</option>
                                    </select>
                                    <FontAwesomeIcon icon={faChevronDown} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-text-muted)] pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-[var(--color-text-muted)] mb-1.5 ml-1">Error State</label>
                                <input type="text" defaultValue="Salah ketik" className="input-field !border-rose-500 focus:!ring-rose-500/20" />
                                <p className="text-[10px] text-rose-500 mt-1 ml-1 font-medium">Username ini sudah digunakan.</p>
                            </div>

                        </div>
                    </div>

                    {/* Alerts & Badges */}
                    <div className="space-y-4 lg:col-span-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-[var(--color-text-muted)]">3. Alerts & Badges</h2>
                        <div className="grid lg:grid-cols-2 gap-6">

                            {/* Alerts */}
                            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-6 space-y-4">
                                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3 text-blue-600">
                                    <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5" />
                                    <div>
                                        <p className="text-[12px] font-black mb-0.5">Informasi</p>
                                        <p className="text-[11px] opacity-80 leading-relaxed">Ini adalah contoh alert tipe informasi standar.</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-600">
                                    <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                                    <div>
                                        <p className="text-[12px] font-black mb-0.5">Peringatan</p>
                                        <p className="text-[11px] opacity-80 leading-relaxed">Ada sesuatu yang butuh perhatian kamu, tapi bukan error.</p>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-3 text-emerald-600">
                                    <FontAwesomeIcon icon={faCheck} className="mt-0.5" />
                                    <div>
                                        <p className="text-[12px] font-black mb-0.5">Berhasil</p>
                                        <p className="text-[11px] opacity-80 leading-relaxed">Tindakan telah berhasil dilakukan dengan baik.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Badges / Pills */}
                            <div className="glass rounded-[1.5rem] border border-[var(--color-border)] p-6 flex flex-col justify-center gap-6">
                                <div className="flex flex-wrap gap-3 items-center">
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-16">Solid:</span>
                                    <span className="px-2.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-[10px] font-black tracking-wide">PRIMARY</span>
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black tracking-wide">SUCCESS</span>
                                    <span className="px-2.5 py-1 rounded-full bg-rose-500 text-white text-[10px] font-black tracking-wide">DANGER</span>
                                    <span className="px-2.5 py-1 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text)] text-[10px] font-black tracking-wide">NEUTRAL</span>
                                </div>

                                <div className="flex flex-wrap gap-3 items-center">
                                    <span className="text-[10px] font-bold text-[var(--color-text-muted)] w-16">Soft:</span>
                                    <span className="px-2.5 py-1 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-black tracking-wide">PRIMARY</span>
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black tracking-wide">SUCCESS</span>
                                    <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-black tracking-wide">DANGER</span>
                                </div>
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    )
}
