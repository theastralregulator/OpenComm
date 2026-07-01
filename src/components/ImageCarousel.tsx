import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Maximize2, ZoomIn, ZoomOut, X } from 'lucide-react';

interface ImageCarouselProps {
  imageUrls: string[];
  aspectRatio?: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ imageUrls, aspectRatio }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
  const [retryCount, setRetryCount] = useState<Record<number, number>>({});

  // Keyboard navigation for Lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev! + 1) % imageUrls.length);
        setZoomScale(1);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev! - 1 + imageUrls.length) % imageUrls.length);
        setZoomScale(1);
      } else if (e.key === 'Escape') {
        setLightboxIndex(null);
        setZoomScale(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, imageUrls.length]);

  if (!imageUrls || imageUrls.length === 0) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setZoomScale(1);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    setZoomScale(1);
  };

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => ({ ...prev, [index]: true }));
  };

  // Convert string ratio (e.g. '16:9') to Tailwind style or inline CSS aspect ratio
  const getAspectStyle = () => {
    if (!aspectRatio || aspectRatio === 'original') return {};
    const parts = aspectRatio.split(':');
    if (parts.length === 2) {
      const w = Number(parts[0]);
      const h = Number(parts[1]);
      if (!isNaN(w) && !isNaN(h)) {
        return { aspectRatio: `${w} / ${h}` };
      }
    }
    return {};
  };

  const hasSpecificRatio = aspectRatio && aspectRatio !== 'original';

  return (
    <div className="relative w-full group select-none">
      {/* Carousel container */}
      <div 
        style={getAspectStyle()}
        className={`relative overflow-hidden rounded-2xl border border-gray-100/50 dark:border-slate-800/60 bg-slate-950/5 dark:bg-slate-950/25 flex items-center justify-center transition-all ${
          hasSpecificRatio ? 'w-full' : 'w-full h-auto'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="w-full h-full flex items-center justify-center relative cursor-zoom-in"
            onClick={() => openLightbox(currentIndex)}
          >
            {/* Shimmering skeleton loading state background */}
            {!loadedImages[currentIndex] && !failedImages[currentIndex] && (
              <div className="absolute inset-0 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              </div>
            )}

            {failedImages[currentIndex] ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 p-4 text-center">
                <p className="text-xs text-red-500 font-semibold mb-2">Failed to load image</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const index = currentIndex;
                    setFailedImages(prev => ({ ...prev, [index]: false }));
                    setLoadedImages(prev => ({ ...prev, [index]: false }));
                    setRetryCount(prev => ({ ...prev, [index]: (prev[index] || 0) + 1 }));
                  }}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            ) : (
              <img
                src={imageUrls[currentIndex] + (retryCount[currentIndex] ? `?retry=${retryCount[currentIndex]}` : '')}
                alt={`Slide ${currentIndex + 1}`}
                referrerPolicy="no-referrer"
                className={`max-w-full object-contain rounded-2xl hover:scale-[1.005] transition-transform duration-300 ${
                  hasSpecificRatio 
                    ? 'w-full h-full object-cover' 
                    : 'w-full h-auto max-h-[520px] sm:max-h-[580px] md:max-h-[640px]'
                }`}
                loading="lazy"
                onLoad={() => handleImageLoad(currentIndex)}
                onError={() => {
                  const index = currentIndex;
                  setFailedImages(prev => ({ ...prev, [index]: true }));
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Carousel overlay indices badge */}
        {imageUrls.length > 1 && (
          <div className="absolute top-3 right-3 bg-slate-950/60 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md z-10 font-bold">
            {currentIndex + 1}/{imageUrls.length}
          </div>
        )}

        {/* Navigation arrows */}
        {imageUrls.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/60 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-950 duration-200 z-10 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-950/60 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-950 duration-200 z-10 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Carousel indicators dot row */}
        {imageUrls.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-y-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {imageUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentIndex 
                    ? 'w-4 bg-indigo-500' 
                    : 'w-1.5 bg-white/50 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* LIGHTBOX FULLSCREEN VIEW OVERLAY */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-xs p-4">
            
            {/* Header controls bar */}
            <div className="absolute top-4 left-0 right-0 px-6 flex items-center justify-between text-white z-20">
              <span className="text-xs font-mono font-bold bg-slate-900/60 px-3 py-1 rounded-xl">
                Slide {lightboxIndex + 1} of {imageUrls.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setZoomScale(1)}
                  className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Fit to Screen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomScale(z => Math.max(1, z - 0.5))}
                  className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setZoomScale(z => Math.min(4, z + 0.5))}
                  className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={closeLightbox}
                  className="p-1.5 rounded-lg bg-slate-900/60 hover:bg-red-600 transition-colors cursor-pointer"
                  title="Close Fullscreen"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Lightbox content main slide */}
            <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
              {failedImages[lightboxIndex] ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-white">
                  <p className="text-sm text-red-400 font-semibold mb-3">Failed to load image in fullscreen</p>
                  <button
                    onClick={() => {
                      const idx = lightboxIndex;
                      setFailedImages(prev => ({ ...prev, [idx]: false }));
                      setRetryCount(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-md"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <motion.img
                  key={lightboxIndex}
                  src={imageUrls[lightboxIndex] + (retryCount[lightboxIndex] ? `?retry=${retryCount[lightboxIndex]}` : '')}
                  alt="Fullscreen Attachment"
                  referrerPolicy="no-referrer"
                  drag={zoomScale === 1 ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={(e, info) => {
                    if (zoomScale > 1) return;
                    const swipeThreshold = 60;
                    if (info.offset.x < -swipeThreshold) {
                      // Swipe Left -> Next
                      const nextLBIdx = (lightboxIndex + 1) % imageUrls.length;
                      setLightboxIndex(nextLBIdx);
                      setZoomScale(1);
                    } else if (info.offset.x > swipeThreshold) {
                      // Swipe Right -> Prev
                      const prevLBIdx = (lightboxIndex - 1 + imageUrls.length) % imageUrls.length;
                      setLightboxIndex(prevLBIdx);
                      setZoomScale(1);
                    }
                  }}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: zoomScale, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-full max-h-[85vh] object-contain select-none transition-transform duration-200 cursor-grab active:cursor-grabbing"
                  onError={() => {
                    const idx = lightboxIndex;
                    setFailedImages(prev => ({ ...prev, [idx]: true }));
                  }}
                />
              )}

              {/* Lightbox nav navigation */}
              {imageUrls.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextLBIdx = (lightboxIndex - 1 + imageUrls.length) % imageUrls.length;
                      setLightboxIndex(nextLBIdx);
                      setZoomScale(1);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextLBIdx = (lightboxIndex + 1) % imageUrls.length;
                      setLightboxIndex(nextLBIdx);
                      setZoomScale(1);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
