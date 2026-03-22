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
                <button onClick={() => copyToClipboard(variable)} className="opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-125">
                    <FontAwesomeIcon icon={faCopy} className="text-[10px] text-[var(--color-primary)]" />
                </button>
            </div>
            <div className="h-16 rounded-[1.5rem] border border-[var(--color-border)] overflow-hidden shadow-sm transition-all group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-95 cursor-pointer" onClick={() => copyToClipboard(variable)}>
                <div className="h-full w-full" style={{ backgroundColor: `var(${variable})` }} />
            </div>
            <p className="text-[9px] font-bold text-[var(--color-text-muted)] text-center opacity-60 uppercase">{variable}</p>
        </div>
    )

    return (
        <DashboardLayout title="UI Playground">
            <div className="p-4 md:p-6 space-y-8 min-h-screen">
                {/* Header Section - Refined */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                        <Breadcrumb badge="Developer" items={['Admin', 'Design System']} className="mb-2" />
                        <div className="flex items-center gap-3.5 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-white flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">
                                <FontAwesomeIcon icon={faPalette} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--color-text)]">UI Playground</h1>
                                <p className="text-[var(--color-text-muted)] text-[11px] font-bold uppercase tracking-[0.2em] opacity-60">Creative Design Sandbox</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 p-1.5 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl backdrop-blur-md">
                        <button
                            onClick={() => setPreviewTheme('light')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${previewTheme === 'light' ? 'bg-white shadow-xl text-orange-500 scale-105' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={faSun} /> Light
                        </button>
                        <button
                            onClick={() => setPreviewTheme('dark')}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${previewTheme === 'dark' ? 'bg-slate-900 shadow-xl text-indigo-400 scale-105' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
                        >
                            <FontAwesomeIcon icon={faMoon} /> Dark
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left & Middle Column (Main Playground) */}
                    <div className="lg:col-span-2 space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                        
                        {/* 1. Interactive Color Grid */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Core Color Strategy</span>
                                <div className="h-px bg-[var(--color-border)] flex-1" />
                            </div>
                            <div className="glass rounded-[2.5rem] border border-[var(--color-border)] p-8 shadow-sm">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
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

                        {/* 2. Interactive Elements Showcase */}
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Component: Button Factory */}
                            <section className="space-y-4 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 group-hover:rotate-12 transition-transform"><FontAwesomeIcon icon={faPlus} className="text-xs" /></div>
                                    <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Button Factory</h2>
                                </div>
                                <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-6 min-h-[220px] flex flex-col justify-between">
                                    <div className="flex flex-wrap gap-4">
                                        <button className="h-12 px-8 rounded-2xl bg-[var(--color-primary)] text-white text-[13px] font-black hover:scale-110 hover:-rotate-2 active:scale-90 transition-all shadow-xl shadow-indigo-500/20">
                                            Solid Bold
                                        </button>
                                        <button className="h-12 px-6 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[13px] font-black hover:bg-[var(--color-primary)] hover:text-white transition-all">
                                            Soft Air
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <button className="h-12 flex-1 rounded-2xl border-2 border-dashed border-[var(--color-border)] text-[var(--color-text-muted)] text-[12px] font-black hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all">
                                            Dashed Empty
                                        </button>
                                        <button className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-rose-500/20">
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                    <button className="w-full h-12 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black text-[13px] tracking-wide relative overflow-hidden group/btn shadow-2xl">
                                        <span className="relative z-10">Magic Modern Button</span>
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 group-hover/btn:h-full transition-all opacity-20" />
                                    </button>
                                </div>
                            </section>

                            {/* Component: Input Playground */}
                            <section className="space-y-4 group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform"><FontAwesomeIcon icon={faSearch} className="text-xs" /></div>
                                    <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Input Fields</h2>
                                </div>
                                <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-4 min-h-[220px]">
                                    <div className="relative group/input">
                                        <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] group-focus-within/input:text-[var(--color-primary)] transition-colors" />
                                        <input type="text" placeholder="Type something cool..." className="w-full pl-12 h-12 bg-[var(--color-surface-alt)]/50 border border-[var(--color-border)] rounded-2xl outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/5 transition-all text-sm font-medium" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="relative">
                                            <select className="w-full h-11 px-4 pr-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl outline-none appearance-none text-[12px] font-bold">
                                                <option>Dropdown</option>
                                                <option>Option A</option>
                                            </select>
                                            <FontAwesomeIcon icon={faChevronDown} className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] opacity-40 pointer-events-none" />
                                        </div>
                                        <div className="flex items-center justify-center p-3 bg-[var(--color-primary)]/5 rounded-2xl border border-[var(--color-primary)]/10 border-dashed">
                                            <div className="w-10 h-5 bg-[var(--color-primary)] rounded-full relative cursor-pointer">
                                                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full transition-all" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10 flex gap-3 items-start">
                                        <FontAwesomeIcon icon={faTriangleExclamation} className="text-amber-500 mt-0.5 text-xs" />
                                        <p className="text-[10px] text-amber-600/80 font-medium leading-tight text-balance italic">Pastikan semua inputan sudah tervalidasi sebelum masuk ke server.</p>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Right Side Support (Utilities & Simulation) */}
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-700 delay-200">
                        
                        {/* Feedbacks Loop (More prominent) */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Feedback Engine</span>
                                <div className="h-px bg-[var(--color-border)] flex-1" />
                            </div>
                            <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-5 bg-gradient-to-br from-transparent to-indigo-500/[0.02]">
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => addToast('Yess! Berhasil dieksekusi.', 'success')} className="group flex flex-col items-center gap-2 p-4 rounded-[1.5rem] bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                                        <FontAwesomeIcon icon={faCheckCircle} className="text-xl group-hover:scale-125 transition-transform" />
                                        <span className="text-[9px] font-black tracking-widest uppercase">Success</span>
                                    </button>
                                    <button onClick={() => addToast('Oops! Ada kegagalan sistem.', 'error')} className="group flex flex-col items-center gap-2 p-4 rounded-[1.5rem] bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500 hover:text-white transition-all shadow-sm">
                                        <FontAwesomeIcon icon={faXmarkCircle} className="text-xl group-hover:scale-125 transition-transform" />
                                        <span className="text-[9px] font-black tracking-widest uppercase">Error</span>
                                    </button>
                                    <button onClick={() => addToast('Proses sedang berjalan...', 'info')} className="group flex flex-col items-center gap-2 p-4 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 hover:bg-indigo-500 hover:text-white transition-all shadow-sm">
                                        <FontAwesomeIcon icon={faCircleInfo} className="text-xl group-hover:scale-125 transition-transform" />
                                        <span className="text-[9px] font-black tracking-widest uppercase">Info</span>
                                    </button>
                                    <button onClick={() => addToast('Hati-hati, cek kembali data anda.', 'warning')} className="group flex flex-col items-center gap-2 p-4 rounded-[1.5rem] bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500 hover:text-white transition-all shadow-sm">
                                        <FontAwesomeIcon icon={faExclamationCircle} className="text-xl group-hover:scale-125 transition-transform" />
                                        <span className="text-[9px] font-black tracking-widest uppercase">Warning</span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Grid & Tokenization Visualization */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Visual Constraints</span>
                                <div className="h-px bg-[var(--color-border)] flex-1" />
                            </div>
                            <div className="glass rounded-[2rem] border border-[var(--color-border)] p-6 space-y-6 overflow-hidden">
                                <div className="flex justify-between items-end gap-1 h-20 px-2 pt-2 bg-[var(--color-surface-alt)]/50 rounded-2xl border border-[var(--color-border)]">
                                    {[20, 45, 12, 67, 34, 89, 50, 40].map((h, i) => (
                                        <div key={i} className="flex-1 bg-[var(--color-primary)]/20 rounded-t-lg transition-all hover:bg-[var(--color-primary)] group relative" style={{ height: `${h}%` }}>
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{h}</div>
                                        </div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-square rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] border-dashed flex items-center justify-center text-[10px] font-black text-[var(--color-text-muted)]">
                                            {i}x
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 rounded-[1.2rem] bg-slate-900 text-[10px] font-mono leading-relaxed text-indigo-400 overflow-hidden relative group">
                                    <button onClick={() => copyToClipboard('.playground-card')} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <FontAwesomeIcon icon={faCopy} />
                                    </button>
                                    <p className="text-slate-500">// Modern Utility</p>
                                    <p>config: &#123;</p>
                                    <p className="pl-4">radius: <span className="text-rose-400">'2.5rem'</span>,</p>
                                    <p className="pl-4">glass: <span className="text-sky-400">true</span></p>
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
