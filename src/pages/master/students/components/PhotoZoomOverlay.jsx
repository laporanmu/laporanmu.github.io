import React from 'react'

export function PhotoZoomOverlay({ photoZoom, setPhotoZoom }) {
    if (!photoZoom) return null

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center cursor-pointer backdrop-blur-sm"
            onClick={() => setPhotoZoom(null)}
        >
            <div className="text-center" onClick={e => e.stopPropagation()}>
                <img
                    src={photoZoom.url}
                    alt={photoZoom.name}
                    className="max-w-[320px] max-h-[320px] w-auto h-auto rounded-2xl object-cover shadow-2xl ring-4 ring-white/10"
                />
                <p className="text-white font-black mt-3 text-sm drop-shadow">{photoZoom.name}</p>
                <button 
                    onClick={() => setPhotoZoom(null)}
                    className="mt-3 h-8 px-4 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition"
                >
                    Tutup
                </button>
            </div>
        </div>
    )
}
