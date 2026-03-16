import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faPalette, faCheck, faTriangleExclamation, faCircleInfo,
    faXmark, faChevronDown, faPlus, faTrash, faArrowRight,
    faMoon, faSun, faCopy, faEye, faCode, faFont,
    faLayerGroup, faExpand, faGrip, faBell, faCheckCircle,
    faExclamationCircle, faXmarkCircle, faChevronRight, faSearch,
    faCalendar, faUser, faShieldHalved
} from '@fortawesome/free-solid-svg-icons'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Breadcrumb from '../../components/ui/Breadcrumb'
import { useToast } from '../../context/ToastContext'

export default function PlaygroundPage() {
    const { addToast } = useToast()
    const [previewTheme, setPreviewTheme] = useState('dark') 
    const [copiedClass, setCopiedClass] = useState(null)

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopiedClass(text)
        addToast(`Class "${text}" disalin!`, 'success')
        setTimeout(() => setCopiedClass(null), 2000)
    }

    const ColorBlock = ({ name, variable }) => (
        <div className="space-y-2 group">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase">{name}</span>
                <button onClick={() => copyToClipboard(variable)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <FontAwesomeIcon icon={faCopy} className="text-[10px] text-[var(--color-primary)]" />
                </button>
            </div>
            <div className="h-16 rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm transition-transform group-hover:scale-105">
                <div className="h-full w-full" style={{ backgroundColor: `var(${variable})` }} />
            </div>
            <p className="text-[10px] font-medium text-[var(--color-text-muted)] text-center">{variable}</p>
        </div>
    )

    return (
        <DashboardLayout title="UI Playground">
            <div className="p-4 md:p-6 space-y-8 min-h-screen">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="max-w-2xl">
                        <Breadcrumb badge="Developer" items={['Admin', 'Design System']} className="mb-2" />
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl shadow-inner">
                                <FontAwesomeIcon icon={faPalette} />
                            </div>
                            <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--color-text)]">Design System</h1>
                        </div>
                        <p className="text-[var(--color-text-muted)] text-sm font-medium opacity-80 leading-relaxed">
                            Panduan standar antarmuka untuk menjaga konsistensi visual di seluruh ekosistem Laporanmu.
                            Gunakan variabel desain dan komponen yang sudah didefinisikan untuk mempercepat pengembangan.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 p-1 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl">
                        <button
                            onClick={() => setPreviewTheme('light')}
                            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${previewTheme === 'light' ? 'bg-white shadow-md text-orange-500' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={faSun} /> Light
                        </button>
                        <button
                            onClick={() => setPreviewTheme('dark')}
                            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${previewTheme === 'dark' ? 'bg-slate-900 shadow-md text-indigo-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={faMoon} /> Dark
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column: Atoms */}
                    <div className="lg:col-span-2 space-y-10">
                        {/* 1. Color Palette */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><FontAwesomeIcon icon={faGrip} className="text-xs" /></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Core Colors</h2>
                            </div>
                            <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                    <ColorBlock name="Primary" variable="--color-primary" />
                                    <ColorBlock name="Secondary" variable="--color-secondary" />
                                    <ColorBlock name="Accent" variable="--color-accent" />
                                    <ColorBlock name="Success" variable="--color-success" />
                                    <ColorBlock name="Warning" variable="--color-warning" />
                                    <ColorBlock name="Danger" variable="--color-danger" />
                                    <ColorBlock name="Surface" variable="--color-surface" />
                                    <ColorBlock name="Border" variable="--color-border" />
                                </div>
                            </div>
                        </section>

                        {/* 2. Interactive Components */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500"><FontAwesomeIcon icon={faLayerGroup} className="text-xs" /></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Interactive Elements</h2>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Buttons Preview */}
                                <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-6">
                                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 mb-4">
                                        <h3 className="font-black text-xs uppercase tracking-widest text-[var(--color-text)] flex items-center gap-2">
                                            <FontAwesomeIcon icon={faPlus} className="text-[10px] opacity-50" /> Buttons
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">.btn-primary</span>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex flex-wrap gap-3">
                                            <button className="h-11 px-6 rounded-2xl bg-[var(--color-primary)] text-white text-[13px] font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/25">
                                                Primary
                                            </button>
                                            <button className="h-11 px-5 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[13px] font-black hover:bg-[var(--color-primary)] hover:text-white transition-all">
                                                Soft
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <button className="h-11 px-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-[13px] font-black hover:border-[var(--color-text-muted)] transition-all flex items-center gap-2">
                                                Outline <FontAwesomeIcon icon={faChevronRight} className="text-[10px] opacity-50" />
                                            </button>
                                            <button className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center hover:rotate-6 transition-all shadow-lg shadow-rose-500/25">
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>

                                        <button className="w-full h-11 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-black text-[13px] tracking-wide hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                            <FontAwesomeIcon icon={faShieldHalved} /> Secure Action Gradient
                                        </button>
                                    </div>
                                </div>

                                {/* Form Fields Preview */}
                                <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-5">
                                    <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4 mb-4">
                                        <h3 className="font-black text-xs uppercase tracking-widest text-[var(--color-text)] flex items-center gap-2">
                                            <FontAwesomeIcon icon={faSearch} className="text-[10px] opacity-50" /> Form Inputs
                                        </h3>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[var(--color-text-muted)]">.input-field</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="relative group">
                                            <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within:text-[var(--color-primary)] transition-colors" />
                                            <input type="text" placeholder="Search components..." className="input-field pl-12 h-11 !rounded-2xl" />
                                        </div>

                                        <div className="relative">
                                            <select className="input-field h-11 !rounded-2xl pr-10 appearance-none font-medium text-[var(--color-text)]">
                                                <option>Pilih Departemen</option>
                                                <option>Kurikulum</option>
                                                <option>Kesiswaan</option>
                                            </select>
                                            <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--color-text-muted)] pointer-events-none" />
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" id="check-1" className="w-5 h-5 rounded-lg border-[var(--color-border)] text-[var(--color-primary)] cursor-pointer" />
                                            <label htmlFor="check-1" className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest cursor-pointer">Setujui Syarat</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 3. Typography & Badges */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><FontAwesomeIcon icon={faFont} className="text-xs" /></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Typography & Content</h2>
                            </div>

                            <div className="glass rounded-[2rem] border border-[var(--color-border)] p-8 space-y-10">
                                <div className="grid md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3">Primary Heading</p>
                                            <h1 className="text-3xl font-black font-heading tracking-tighter leading-[1.1]">Membangun Masa Depan Pendidikan Modern.</h1>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3">Secondary Heading</p>
                                            <h2 className="text-xl font-bold font-heading tracking-tight text-[var(--color-text)] opacity-90">Pantau laporan siswa dengan presisi tinggi.</h2>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-3">Body Text</p>
                                            <p className="text-sm text-[var(--color-text-muted)] leading-relaxed font-medium">
                                                Sistem manajemen sekolah yang modern, responsif, dan mudah digunakan untuk semua level operasional. Mendukung pengambilan keputusan berbasis data yang akurat.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">Badges & Status</p>
                                            <div className="flex flex-wrap gap-x-6 gap-y-4">
                                                <div className="flex flex-col gap-2.5">
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.1em]">Soft Palette</span>
                                                    <div className="flex gap-2">
                                                        <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-500 text-[10px] font-black tracking-wide border border-indigo-500/10">PENDING</span>
                                                        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-wide border border-emerald-500/10">SUCCESS</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2.5">
                                                    <span className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.1em]">Bold Palette</span>
                                                    <div className="flex gap-2">
                                                        <span className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-[10px] font-black tracking-wide shadow-lg shadow-rose-500/20">REJECTED</span>
                                                        <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-white text-[10px] font-black tracking-wide shadow-lg shadow-slate-800/20">ARCHIVED</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.3em]">Alert Patterns</p>
                                            <div className="p-4 rounded-2xl bg-amber-500/[0.03] border border-amber-500/20 flex gap-4 text-amber-600 shadow-sm">
                                                <FontAwesomeIcon icon={faTriangleExclamation} className="mt-1" />
                                                <p className="text-[11px] font-bold leading-relaxed">Peringatan: Perubahan skema basis data dapat menyebabkan kegagalan API sementara.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Information & Utilities */}
                    <div className="space-y-8">
                        {/* Toast Trigger Preview */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500"><FontAwesomeIcon icon={faBell} className="text-xs" /></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Feedback Loops</h2>
                            </div>
                            <div className="glass rounded-[2rem] border border-[var(--color-border)] p-5 space-y-4">
                                <p className="text-[11px] text-[var(--color-text-muted)] font-medium leading-relaxed">Uji coba tampilan toast notifikasi untuk berbagai skenario feedback user di aplikasi.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <button onClick={() => addToast('Berhasil disimpan!', 'success')} className="h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[11px] font-black hover:bg-emerald-500 hover:text-white transition-all">SUCCESS</button>
                                    <button onClick={() => addToast('Gagal memproses data!', 'error')} className="h-10 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20 text-[11px] font-black hover:bg-rose-500 hover:text-white transition-all">ERROR</button>
                                    <button onClick={() => addToast('Informasi terbaru.', 'info')} className="h-10 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[11px] font-black hover:bg-indigo-500 hover:text-white transition-all">INFO</button>
                                    <button onClick={() => addToast('Perhatian diperlukan.', 'warning')} className="h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 text-[11px] font-black hover:bg-amber-500 hover:text-white transition-all">WARNING</button>
                                </div>
                            </div>
                        </section>

                        {/* Spacing & Grid Visualization */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500"><FontAwesomeIcon icon={faExpand} className="text-xs" /></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Grid & Spacing</h2>
                            </div>
                            <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-6">
                                <div className="space-y-3">
                                    <div className="h-1.5 bg-[var(--color-primary)]/10 rounded-full flex justify-between px-2 overflow-hidden">
                                        <div className="w-1.5 h-full bg-[var(--color-primary)] opacity-40" />
                                        <div className="w-1.5 h-full bg-[var(--color-primary)] opacity-40" />
                                        <div className="w-1.5 h-full bg-[var(--color-primary)] opacity-40" />
                                    </div>
                                    <p className="text-[9px] font-black text-[var(--color-text-muted)] uppercase tracking-[0.4em] text-center">8px Grid Basis</p>
                                </div>

                                <div className="grid grid-cols-4 gap-2.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                        <div key={i} className="aspect-square rounded-xl bg-[var(--color-surface-alt)] border border-[var(--color-border)] flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)] opacity-30">
                                            {i * 4}
                                        </div>
                                    ))}
                                </div>

                                <div className="p-5 rounded-2xl bg-indigo-500/[0.03] text-indigo-500 text-[10px] font-bold leading-relaxed italic border border-indigo-500/10 text-center">
                                    "Consistency is the key to mastering the user's focus."
                                </div>
                            </div>
                        </section>

                        {/* Code Snippet Example */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-slate-500/10 text-slate-500"><FontAwesomeIcon icon={faCode} className="text-xs" /></div>
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Utility Classes</h2>
                            </div>
                            <div className="bg-slate-900 rounded-[2rem] p-7 font-mono text-[11px] overflow-hidden relative group shadow-2xl">
                                <div className="absolute top-5 right-5 text-slate-500 group-hover:text-indigo-400 cursor-pointer transition-colors" title="Copy to clipboard" onClick={() => copyToClipboard('.glass')}>
                                    <FontAwesomeIcon icon={faCopy} />
                                </div>
                                <div className="space-y-1.5 text-slate-300">
                                    <p><span className="text-pink-400">.glass</span> &#123;</p>
                                    <p className="pl-5">background: <span className="text-sky-300 opacity-60">rgba(var(--bg), 0.4);</span></p>
                                    <p className="pl-5">backdrop-filter: <span className="text-sky-300">blur(8px);</span></p>
                                    <p className="pl-5">border: <span className="text-sky-300 opacity-60">1px solid var(--br);</span></p>
                                    <p>&#125;</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
