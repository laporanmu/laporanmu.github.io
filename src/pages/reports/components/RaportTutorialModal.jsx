import { useState, useEffect, useRef, memo } from 'react'
import { createPortal } from 'react-dom'
import Modal from '../../../components/ui/Modal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faChevronLeft, faChevronRight, faCheck, faMagnifyingGlass, faLightbulb,
    faClipboardList, faTableList, faFloppyDisk, faBoxArchive, faFillDrip, faFilePdf,
    faXmark
} from '@fortawesome/free-solid-svg-icons'

export const RaportTutorialModal = memo(function RaportTutorialModal({ isOpen, onClose }) {
    const [step, setStep] = useState(0)
    const [zoomImg, setZoomImg] = useState(null)
    const [isZoomedIn, setIsZoomedIn] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const [images, setImages] = useState([null, null, null, null, null, null, null])

    const containerRef = useRef(null)
    const dragRef = useRef({
        isDragging: false,
        startX: 0,
        startY: 0,
        scrollLeft: 0,
        scrollTop: 0,
        hasDragged: false,
        clickStartX: 0,
        clickStartY: 0
    })

    // Reset zoom state when lightbox closes
    useEffect(() => {
        if (!zoomImg) {
            setIsZoomedIn(false)
            setIsDragging(false)
        }
    }, [zoomImg])

    // Click and drag pan handlers for desktop mouse
    const handleMouseDown = (e) => {
        if (!isZoomedIn) return
        const container = containerRef.current
        if (!container) return
        
        setIsDragging(true)
        dragRef.current = {
            isDragging: true,
            startX: e.pageX - container.offsetLeft,
            startY: e.pageY - container.offsetTop,
            scrollLeft: container.scrollLeft,
            scrollTop: container.scrollTop,
            hasDragged: false,
            clickStartX: e.pageX,
            clickStartY: e.pageY
        }
    }

    const handleMouseMove = (e) => {
        if (!isZoomedIn || !dragRef.current.isDragging) return
        e.preventDefault()
        const container = containerRef.current
        if (!container) return
        
        const x = e.pageX - container.offsetLeft
        const y = e.pageY - container.offsetTop
        
        const walkX = x - dragRef.current.startX
        const walkY = y - dragRef.current.startY
        
        container.scrollLeft = dragRef.current.scrollLeft - walkX
        container.scrollTop = dragRef.current.scrollTop - walkY
        
        const distance = Math.abs(e.pageX - dragRef.current.clickStartX) + Math.abs(e.pageY - dragRef.current.clickStartY)
        if (distance > 5) {
            dragRef.current.hasDragged = true
        }
    }

    const handleMouseUp = (e) => {
        if (!isZoomedIn) return
        setIsDragging(false)
        if (dragRef.current.isDragging) {
            dragRef.current.isDragging = false
            if (!dragRef.current.hasDragged) {
                setIsZoomedIn(false)
            }
        }
    }

    const handleMouseLeave = () => {
        setIsDragging(false)
        if (dragRef.current.isDragging) {
            dragRef.current.isDragging = false
        }
    }

    // Scroll lock for fullscreen lightbox
    useEffect(() => {
        if (zoomImg) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => {
            document.body.style.overflow = ''
        }
    }, [zoomImg])

    // Escape key handler for fullscreen lightbox
    useEffect(() => {
        if (!zoomImg) return
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setZoomImg(null)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [zoomImg])

    // Load images on demand when open
    useEffect(() => {
        if (!isOpen) return
        
        // Reset step when reopening
        setStep(0)

        Promise.all([
            import('../../../assets/Tutorial_1.png'),
            import('../../../assets/Tutorial_2.png'),
            import('../../../assets/Tutorial_3.png'),
            import('../../../assets/Tutorial_4.png'),
            import('../../../assets/Tutorial_5.png'),
            import('../../../assets/Tutorial_6.png'),
            import('../../../assets/Tutorial_7.png'),
        ])
        .then(mods => setImages(mods.map(m => m.default)))
        .catch(err => console.error("Failed to load tutorial images", err))
    }, [isOpen])

    if (!isOpen) return null

    const SLIDES = [
        {
            icon: faClipboardList,
            iconColor: 'text-emerald-500',
            iconBg: 'bg-emerald-500/15',
            title: 'Dua Cara Memulai Input Nilai',
            subtitle: 'Pilih jalur yang paling nyaman untukmu',
            body: (
                <div className="space-y-3 text-[11px] text-[var(--color-text)] leading-relaxed">
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">1</span>
                            Lewat tombol "＋ Buat Raport"
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Klik tombol di pojok kanan atas → pilih kelas → atur bulan & tahun → isi nama Musyrif → pilih template bahasa → klik <strong>"Mulai Input Nilai"</strong>.</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]">
                        <p className="font-black text-[var(--color-text)] mb-1 flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">2</span>
                            Langsung klik kartu kelas
                        </p>
                        <p className="text-[var(--color-text-muted)] pl-6">Di halaman utama, klik langsung kartu kelas yang ingin diisi. Kamu akan langsung masuk ke halaman input nilai tanpa perlu mengatur periode.</p>
                    </div>
                </div>
            ),
            tips: 'Template bahasa otomatis: kelas Boarding → Arab, kelas Reguler → Indonesia. Nama Musyrif terisi otomatis jika sudah diset di data kelas.',
            img: images[0],
        },
        {
            icon: faTableList,
            iconColor: 'text-indigo-500',
            iconBg: 'bg-indigo-500/15',
            title: 'Mengisi Nilai Santri',
            subtitle: 'Input 5 kriteria penilaian karakter',
            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Setiap santri memiliki 5 kolom nilai: Akhlak, Ibadah, Kebersihan, Al-Quran, dan Bahasa. Nilai berkisar antara 0–9. Tekan <strong>Tab</strong> atau <strong>Enter</strong> untuk berpindah ke cell berikutnya dengan cepat.</p>,
            tips: 'Ketik angka 0–9 langsung saat cell aktif. Warna cell berubah otomatis sesuai grade — hijau untuk nilai tinggi, merah untuk nilai rendah.',
            img: images[1],
        },
        {
            icon: faFloppyDisk,
            iconColor: 'text-sky-500',
            iconBg: 'bg-sky-500/15',
            title: 'Auto-Save & Status Simpan',
            subtitle: 'Data tersimpan otomatis ke server',
            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Setiap perubahan nilai tersimpan otomatis ke database dalam 1.5 detik. Indikator berwarna hijau (✓) menandakan data sudah tersimpan. Tekan <strong>Ctrl+S</strong> atau klik "Simpan Semua" untuk menyimpan sekaligus.</p>,
            tips: 'Jika koneksi terputus, nilai tetap tersimpan sementara sebagai draft di browser. Saat online kembali, muat draft untuk melanjutkan.',
            img: images[2],
        },
        {
            icon: faBoxArchive,
            iconColor: 'text-violet-500',
            iconBg: 'bg-violet-500/15',
            title: 'Data Tambahan per Santri',
            subtitle: 'Kesehatan, hafalan & catatan',
            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Selain nilai karakter, isi juga data tambahan: berat & tinggi badan, jumlah hari sakit / izin / alpa, progress Ziyadah & Murojaah hafalan, serta catatan khusus yang akan tercetak di raport untuk orang tua.</p>,
            tips: 'Data tambahan ini opsional — raport tetap bisa dicetak meski tidak diisi. Namun semakin lengkap datanya, semakin informatif raport yang diterima orang tua.',
            img: images[3],
        },
        {
            icon: faFillDrip,
            iconColor: 'text-rose-500',
            iconBg: 'bg-rose-500/15',
            title: 'Isi Massal & Copy Bulan Lalu',
            subtitle: 'Hemat waktu untuk nilai yang sama',
            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Gunakan "Isi Massal" untuk mengisi nilai yang sama ke banyak santri sekaligus — centang santri yang ingin diisi, set nilai, klik Terapkan. Gunakan "Copy Bulan Lalu" untuk menyalin nilai dari periode sebelumnya sebagai titik awal.</p>,
            tips: 'Undo/Redo tersedia dengan Ctrl+Z dan Ctrl+Y jika ingin membatalkan perubahan nilai yang sudah diisi.',
            img: images[4],
        },
        {
            icon: faFilePdf,
            iconColor: 'text-red-500',
            iconBg: 'bg-red-500/15',
            title: 'Cetak, ZIP & WA Blast',
            subtitle: 'Distribusikan raport ke orang tua',
            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Klik ikon Print untuk mencetak raport dari browser. Klik ZIP untuk mengunduh semua raport dalam satu file. Klik ikon WhatsApp di tiap baris santri untuk kirim raport ke orang tua, atau gunakan "WA Blast" untuk kirim ke semua sekaligus.</p>,
            tips: 'Hanya santri yang nilainya sudah lengkap (semua 5 kriteria terisi) yang bisa diekspor ke PDF / ZIP / WA.',
            img: images[5],
        },
        {
            icon: faBoxArchive,
            iconColor: 'text-teal-500',
            iconBg: 'bg-teal-500/15',
            title: 'Arsip & Riwayat',
            subtitle: 'Lihat dan edit raport bulan lalu',
            body: <p className="text-[12px] text-[var(--color-text)] leading-relaxed">Semua raport yang pernah disimpan tersedia di tab "Riwayat". Kamu bisa melihat raport per kelas per bulan, mengedit nilai yang sudah tersimpan, menghapus arsip, hingga mencetak atau mengirim ulang via WA.</p>,
            tips: 'Filter arsip berdasarkan tahun, bulan, atau kelas. Gunakan "Edit Arsip" untuk memperbaiki nilai yang salah input bulan lalu.',
            img: images[6],
        },
    ]

    const totalSteps = SLIDES.length
    const currentSlide = SLIDES[step]
    const isFirst = step === 0
    const isLast = step === totalSteps - 1

    const modalFooter = (
        <div className="flex items-center justify-between w-full">
            <button 
                onClick={() => setStep(v => Math.max(0, v - 1))} 
                disabled={isFirst}
                className="h-10 px-4 rounded-xl border border-[var(--color-border)] text-[11px] font-black text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
            >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" /> Sebelumnya
            </button>

            {/* Pagination badge */}
            <div className="flex items-center gap-1 bg-[var(--color-surface-alt)] px-3 py-1.5 rounded-full border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-muted)] font-black">{step + 1}</span>
                <span className="text-[9px] text-[var(--color-text-muted)]/50 font-bold">/</span>
                <span className="text-[9px] text-[var(--color-text-muted)] font-bold">{totalSteps}</span>
            </div>

            {isLast ? (
                <button 
                    onClick={onClose}
                    className="h-10 px-6 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    <FontAwesomeIcon icon={faCheck} className="text-[10px]" /> Selesai
                </button>
            ) : (
                <button 
                    onClick={() => setStep(v => Math.min(totalSteps - 1, v + 1))}
                    className="h-10 px-6 rounded-xl bg-amber-500 text-white text-[11px] font-black hover:bg-amber-600 transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    Berikutnya <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                </button>
            )}
        </div>
    )

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={currentSlide.title}
                description={currentSlide.subtitle}
                icon={currentSlide.icon}
                iconBg={currentSlide.iconBg}
                iconColor={currentSlide.iconColor}
                size="lg"
                noPadding={true}
                footer={modalFooter}
            >
                {/* Dot Navigator - Sticky at Top */}
                <div className="sticky top-0 z-10 flex items-center justify-center gap-1.5 py-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]/50 backdrop-blur-md">
                    {SLIDES.map((_, i) => (
                        <button 
                            key={i} 
                            onClick={() => setStep(i)}
                            className={`rounded-full transition-all duration-300 ${i === step ? 'w-5 h-2 bg-amber-500' : 'w-2 h-2 bg-[var(--color-border)] hover:bg-amber-500/40'}`}
                            aria-label={`Slide ${i + 1}`}
                        />
                    ))}
                </div>

                {/* Content Area */}
                <div className="px-6 md:px-8 py-6 space-y-6">
                    {currentSlide.img ? (
                        <div 
                            className="relative group cursor-zoom-in overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)]"
                            onClick={() => setZoomImg(currentSlide.img)}
                        >
                            <img 
                                src={currentSlide.img} 
                                alt={currentSlide.title}
                                className="w-full object-contain max-h-[300px] md:max-h-[380px] transition-all duration-300 group-hover:scale-[1.01] group-hover:brightness-95" 
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none bg-slate-950/10">
                                <div className="bg-slate-950/75 text-white text-[10px] font-black px-4 py-2 rounded-full flex items-center gap-1.5 backdrop-blur-sm shadow-lg">
                                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px]" /> Klik untuk zoom
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-center h-48 animate-pulse text-[var(--color-text-muted)] opacity-30">
                            <div className="text-center">
                                <FontAwesomeIcon icon={currentSlide.icon} className="text-2xl mb-2" />
                                <p className="text-[9px] font-black uppercase tracking-widest">Screenshot Slide {step + 1}</p>
                            </div>
                        </div>
                    )}
                    
                    <div className="text-[13px] leading-relaxed text-[var(--color-text)]">
                        {currentSlide.body}
                    </div>

                    {/* Tips Box */}
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-3">
                        <FontAwesomeIcon icon={faLightbulb} className="text-amber-500 text-xs mt-0.5 shrink-0" />
                        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 leading-normal">{currentSlide.tips}</p>
                    </div>
                </div>
            </Modal>

            {/* Fullscreen Lightbox for zooming tutorial images */}
            {zoomImg && createPortal(
                <div 
                    className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md animate-lightbox-fade-in select-none ${isZoomedIn ? 'p-0' : 'p-4'}`}
                    onClick={() => setZoomImg(null)}
                >
                    <style>{`
                        @keyframes lightboxFadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes lightboxZoomIn {
                            from { opacity: 0; transform: scale(0.96); }
                            to { opacity: 1; transform: scale(1); }
                        }
                        @keyframes lightboxSlideUp {
                            from { opacity: 0; transform: translateY(12px); }
                            to { opacity: 0.5; transform: translateY(0); }
                        }
                        .animate-lightbox-fade-in {
                            animation: lightboxFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
                        }
                        .animate-lightbox-zoom-in {
                            animation: lightboxZoomIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                        }
                        .animate-lightbox-slide-up {
                            animation: lightboxSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
                        }
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                            height: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: rgba(255, 255, 255, 0.03);
                            border-radius: 99px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: rgba(255, 255, 255, 0.15);
                            border-radius: 99px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: rgba(255, 255, 255, 0.3);
                        }
                    `}</style>

                    {/* Floating Premium Close Button */}
                    <button
                        onClick={() => setZoomImg(null)}
                        className="absolute top-6 right-6 w-12 h-12 bg-slate-900/50 hover:bg-slate-900/80 text-white rounded-full transition-all duration-200 flex items-center justify-center border border-white/10 shadow-2xl backdrop-blur-md group cursor-pointer z-50"
                        aria-label="Tutup Preview"
                    >
                        <FontAwesomeIcon icon={faXmark} className="text-lg group-hover:rotate-90 transition-transform duration-300" />
                    </button>

                    {/* Image Container with native swiping pan/scroll on zoom & mouse dragging on desktop */}
                    <div 
                        ref={containerRef}
                        className={`relative transition-all duration-300 select-none ${
                            isZoomedIn 
                                ? `overflow-auto max-w-[100vw] max-h-[85vh] w-full custom-scrollbar touch-pan-x touch-pan-y ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}` 
                                : 'overflow-hidden max-w-[95vw] max-h-[82vh] flex items-center justify-center p-2 cursor-zoom-in'
                        }`}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseLeave}
                        onClick={(e) => {
                            e.stopPropagation()
                            if (!isZoomedIn) {
                                setIsZoomedIn(true)
                            }
                        }}
                    >
                        <img
                            src={zoomImg}
                            alt="Detail Panduan Fullscreen"
                            className={`transition-all duration-300 rounded-2xl shadow-2xl border border-white/5 pointer-events-none select-none ${
                                isZoomedIn 
                                    ? 'max-w-none w-[220vw] md:w-[140vw] h-auto' 
                                    : 'max-w-full max-h-full object-contain animate-lightbox-zoom-in'
                            }`}
                        />
                    </div>

                    {/* Minimalist guide caption */}
                    <p className="mt-6 text-white text-[11px] font-black tracking-widest uppercase animate-lightbox-slide-up select-none pointer-events-none text-center px-4">
                        {isZoomedIn 
                            ? 'Klik & geser gambar untuk detail · Klik sekali untuk zoom-out'
                            : 'Klik gambar untuk zoom-in · Klik luar / tekan ESC untuk keluar'
                        }
                    </p>
                </div>,
                document.body
            )}
        </>
    )
})
