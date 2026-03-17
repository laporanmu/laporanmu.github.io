import React, { memo } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const ShortcutCheatsheet = memo(function ShortcutCheatsheet({ isOpen }) {
    if (!isOpen) return null;

    const shortcuts = [
        { section: 'Navigasi' },
        { keys: ['Ctrl', 'K'], label: 'Fokus ke search' },
        { keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan' },
        { keys: ['Esc'], label: 'Tutup / clear / deselect' },
        { section: 'Aksi' },
        { keys: ['N'], label: 'Tambah siswa baru' },
        { keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect' },
        { keys: ['Ctrl', 'E'], label: 'Buka export' },
        { section: 'Tampilan' },
        { keys: ['P'], label: 'Toggle privacy mode' },
        { keys: ['R'], label: 'Refresh data' },
        { keys: ['X'], label: 'Reset semua filter' },
        { keys: ['?'], label: 'Tampilkan shortcut ini' },
    ];

    return (
        <div className="fixed sm:absolute left-1/2 sm:left-auto right-auto sm:right-0 top-[20vh] sm:top-11 -translate-x-1/2 sm:-translate-x-0 w-[90vw] max-w-[340px] sm:w-72 sm:max-w-none z-[100] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/10 overflow-hidden text-left animate-in fade-in zoom-in-95 slide-in-from-bottom-4 sm:slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center justify-between bg-[var(--color-surface-alt)]/50">
                <p className="text-[11px] font-black uppercase tracking-widest text-[var(--color-text)]">Keyboard Shortcuts</p>
                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">Tekan ? untuk toggle</span>
            </div>
            <div className="p-3 space-y-0.5">
                {[{ section: 'Navigasi' }, { keys: ['Ctrl', 'K'], label: 'Fokus ke search' }, { keys: ['Ctrl', 'F'], label: 'Toggle filter lanjutan' }, { keys: ['Esc'], label: 'Tutup / clear / deselect' }, { section: 'Aksi' }, { keys: ['N'], label: 'Tambah guru baru' }, { keys: ['Ctrl', 'A'], label: 'Pilih semua / deselect' }, { keys: ['Ctrl', 'E'], label: 'Buka export' }, { section: 'Tampilan' }, { keys: ['P'], label: 'Toggle privacy mode' }, { keys: ['R'], label: 'Refresh data' }, { keys: ['X'], label: 'Reset semua filter' }, { keys: ['?'], label: 'Tampilkan shortcut ini' }].map((item, i) => item.section ? (
                    <p key={i} className="text-[9px] font-black uppercase tracking-widest text-[var(--color-text-muted)] pt-2 pb-1 px-1">{item.section}</p>
                ) : (
                    <div key={i} className="flex items-center justify-between px-1 py-1 rounded-lg hover:bg-[var(--color-surface-alt)] transition-all">
                        <span className="text-[11px] font-semibold text-[var(--color-text)]">{item.label}</span>
                        <div className="flex items-center gap-1">{item.keys.map((k, ki) => <span key={ki} className="px-1.5 py-0.5 rounded-md bg-[var(--color-surface-alt)] border border-[var(--color-border)] text-[9px] font-black text-[var(--color-text-muted)] font-mono">{k}</span>)}</div>
                    </div>
                ))}
            </div>
        </div>
    )
})

export default ShortcutCheatsheet
