import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Crop, 
  Trash2, 
  Plus, 
  Check, 
  ChevronLeft, 
  ChevronRight,
  Maximize2
} from 'lucide-react';
import { Button } from './ui/Button';
import { showToast } from './ui/Toast';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onSave: (editedFiles: File[]) => void;
}

interface EditState {
  file: File;
  previewUrl: string;
  rotation: number; // 0, 90, 180, 270
  zoom: number; // 1 to 5
  aspectRatio: string; // 'original' | '1:1' | '4:5' | '3:4' | '9:16' | '16:9'
  offsetX: number;
  offsetY: number;
  naturalWidth: number;
  naturalHeight: number;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  files,
  onSave
}) => {
  const [editStates, setEditStates] = useState<EditState[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  const getOriginalRatio = (state: EditState) => {
    return state.naturalWidth / state.naturalHeight;
  };

  // Aspect ratio display mappings (lazy evaluated when current state is available)
  const current = editStates[activeIndex];
  const aspectRatios = current ? [
    { label: 'Original', value: 'original', ratio: getOriginalRatio(current) },
    { label: '1:1 Square', value: '1:1', ratio: 1 },
    { label: '4:5 Portrait', value: '4:5', ratio: 0.8 },
    { label: '3:4 Vertical', value: '3:4', ratio: 0.75 },
    { label: '9:16 Story', value: '9:16', ratio: 0.5625 },
    { label: '16:9 Cinema', value: '16:9', ratio: 1.7778 }
  ] : [];

  const getBaseImageDimensions = (state: EditState) => {
    const imgRatio = getOriginalRatio(state);
    const V = 400; // virtual Coordinate viewport size
    if (imgRatio > 1) {
      return { imgW: V, imgH: V / imgRatio };
    } else {
      return { imgW: V * imgRatio, imgH: V };
    }
  };

  const getCropGuideDimensions = (state: EditState) => {
    let ratio = 1;
    if (state.aspectRatio === 'original') {
      ratio = getOriginalRatio(state);
    } else {
      const ar = aspectRatios.find(a => a.value === state.aspectRatio);
      if (ar) ratio = ar.ratio;
    }
    const V = 400;
    let cropW = V;
    let cropH = V;
    if (ratio > 1) {
      cropW = V * 0.9;
      cropH = cropW / ratio;
    } else {
      cropH = V * 0.9;
      cropW = cropH * ratio;
    }
    return { cropW, cropH, ratio };
  };

  const loadImageWithDimensions = (file: File, url: string): Promise<EditState> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          file,
          previewUrl: url,
          rotation: 0,
          zoom: 1,
          aspectRatio: 'original',
          offsetX: 0,
          offsetY: 0,
          naturalWidth: img.naturalWidth || 800,
          naturalHeight: img.naturalHeight || 800
        });
      };
      img.onerror = () => {
        resolve({
          file,
          previewUrl: url,
          rotation: 0,
          zoom: 1,
          aspectRatio: 'original',
          offsetX: 0,
          offsetY: 0,
          naturalWidth: 800,
          naturalHeight: 800
        });
      };
      img.src = url;
    });
  };

  // Initialize edit states when files are provided
  useEffect(() => {
    let isCancelled = false;
    if (isOpen && files.length > 0) {
      const loadAll = async () => {
        const states = await Promise.all(
          files.map(async (file) => {
            const previewUrl = URL.createObjectURL(file);
            return loadImageWithDimensions(file, previewUrl);
          })
        );
        if (!isCancelled) {
          setEditStates(states);
          setActiveIndex(0);
        }
      };
      loadAll();
    }
    
    return () => {
      isCancelled = true;
      editStates.forEach(state => URL.revokeObjectURL(state.previewUrl));
    };
  }, [isOpen, files]);

  if (!isOpen || editStates.length === 0 || !current) return null;

  const updateCurrentState = (updates: Partial<EditState>) => {
    setEditStates(prev => {
      const next = [...prev];
      next[activeIndex] = { ...next[activeIndex], ...updates };
      return next;
    });
  };

  const handleAddMoreImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const incomingFiles = Array.from(e.target.files);
    
    if (editStates.length + incomingFiles.length > 10) {
      showToast.error('You can upload a maximum of 10 images.');
      return;
    }

    const newStates = await Promise.all(
      incomingFiles.map(async (file) => {
        const previewUrl = URL.createObjectURL(file);
        return loadImageWithDimensions(file, previewUrl);
      })
    );

    setEditStates(prev => [...prev, ...newStates]);
    setActiveIndex(editStates.length); // switch to the first newly added image
  };

  const handleRemoveImage = (index: number) => {
    if (editStates.length <= 1) {
      showToast.error('At least one image is required.');
      return;
    }

    // Clean up revoked url
    URL.revokeObjectURL(editStates[index].previewUrl);

    setEditStates(prev => prev.filter((_, i) => i !== index));
    setActiveIndex(prev => Math.max(0, index - 1));
  };

  // Pointer interaction logic for responsive dragging (Supports mouse & touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStart.current = { x: e.clientX - current.offsetX, y: e.clientY - current.offsetY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.current.x;
    const deltaY = e.clientY - dragStart.current.y;
    
    // Bounds checking based on zoom scale
    const maxOffset = (current.zoom - 0.5) * 200;
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
    const offsetY = Math.max(-maxOffset, Math.min(maxOffset, deltaY));

    updateCurrentState({ offsetX, offsetY });
  };

  const handlePointerUpOrLeave = (e: React.PointerEvent) => {
    if (isDragging) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      setIsDragging(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.005;
    const nextZoom = Math.min(5, Math.max(1, current.zoom + zoomDelta));
    updateCurrentState({ zoom: nextZoom });
  };

  // Core Canvas Rendering & Image Processing function
  const processAndSave = async () => {
    setIsProcessing(true);
    try {
      const processedFiles: File[] = [];

      for (let i = 0; i < editStates.length; i++) {
        const state = editStates[i];
        
        // Skip canvas transformation if user didn't make any modifications to keep speed instant
        if (
          state.rotation === 0 && 
          state.zoom === 1 && 
          state.aspectRatio === 'original' && 
          state.offsetX === 0 && 
          state.offsetY === 0
        ) {
          processedFiles.push(state.file);
          continue;
        }

        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = () => res(true);
          img.onerror = (err) => rej(err);
          img.src = state.previewUrl;
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          processedFiles.push(state.file);
          continue;
        }

        const { cropW, cropH, ratio } = getCropGuideDimensions(state);
        const { imgW, imgH } = getBaseImageDimensions(state);

        // Standard compression max sizing (1000px max)
        const maxDimension = 1000;
        let canvasW = maxDimension;
        let canvasH = maxDimension;

        if (ratio > 1) {
          canvasW = maxDimension;
          canvasH = Math.round(maxDimension / ratio);
        } else {
          canvasH = maxDimension;
          canvasW = Math.round(maxDimension * ratio);
        }

        canvas.width = canvasW;
        canvas.height = canvasH;

        // Apply background (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Center point translations
        ctx.translate(canvasW / 2, canvasH / 2);

        // 1. Rotation
        ctx.rotate((state.rotation * Math.PI) / 180);

        // 2. Zoom & Offset Translations (scaled to final output dimension)
        const scaleToCanvas = canvasW / cropW;
        ctx.translate(state.offsetX * scaleToCanvas, state.offsetY * scaleToCanvas);

        // Draw image centered
        const finalDrawW = imgW * scaleToCanvas * state.zoom;
        const finalDrawH = imgH * scaleToCanvas * state.zoom;

        ctx.drawImage(
          img,
          -finalDrawW / 2,
          -finalDrawH / 2,
          finalDrawW,
          finalDrawH
        );

        const blob = await new Promise<Blob>((resolveBlob) => {
          canvas.toBlob((b) => resolveBlob(b || state.file), 'image/jpeg', 0.85);
        });

        const newFile = new File([blob], `edited_${state.file.name}`, { type: 'image/jpeg' });
        processedFiles.push(newFile);
      }

      onSave(processedFiles);
      showToast.success('Images optimized and cropped successfully.');
      onClose();
    } catch (err) {
      console.error('Error processing crop canvas:', err);
      showToast.error('Failed to process image edits. Using original.');
      onSave(files);
      onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedAR = aspectRatios.find(ar => ar.value === current.aspectRatio);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Crop className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Image Editor & Optimizer ({editStates.length}/10)
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main workspace */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden min-h-0">
            
            {/* Editor Interactive Viewport */}
            <div className="col-span-2 p-6 flex flex-col justify-between bg-slate-50 dark:bg-slate-950/40 relative min-h-[300px] md:min-h-0">
              
              {/* Image Container frame */}
              <div 
                ref={viewportRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrLeave}
                onPointerCancel={handlePointerUpOrLeave}
                onWheel={handleWheel}
                className="flex-1 w-full max-h-[420px] aspect-square rounded-2xl border border-gray-200/50 dark:border-slate-800/80 bg-slate-900 overflow-hidden relative flex items-center justify-center cursor-grab active:cursor-grabbing"
                style={{
                  touchAction: 'none'
                }}
              >
                {/* Crop Guide Frame Box overlay */}
                <div 
                  className="absolute border border-dashed border-white/50 bg-transparent pointer-events-none transition-all shadow-[0_0_0_9999px_rgba(15,23,42,0.65)] rounded-lg z-10"
                  style={{
                    width: `${(getCropGuideDimensions(current).cropW / 400) * 100}%`,
                    height: `${(getCropGuideDimensions(current).cropH / 400) * 100}%`,
                    maxWidth: '100%',
                    maxHeight: '100%',
                    aspectRatio: String(getCropGuideDimensions(current).ratio)
                  }}
                >
                  {/* Grid Lines inside crop area */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-b border-white/30"></div>
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-r border-b border-white/30"></div>
                    <div className="border-b border-white/30"></div>
                    <div className="border-r border-white/30"></div>
                    <div className="border-r border-white/30"></div>
                    <div></div>
                  </div>
                </div>

                {/* Main image */}
                <img
                  src={current.previewUrl}
                  alt="Editor Viewport"
                  draggable={false}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none transition-transform duration-75"
                  style={{
                    transform: `translate(${current.offsetX}px, ${current.offsetY}px) scale(${current.zoom}) rotate(${current.rotation}deg)`
                  }}
                />
              </div>

              {/* Slider & Quick Transforms */}
              <div className="mt-4 flex flex-col gap-3">
                {/* Zoom control */}
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-gray-400" />
                  <input
                     type="range"
                     min="1"
                     max="5"
                     step="0.05"
                     value={current.zoom}
                     onChange={(e) => updateCurrentState({ zoom: parseFloat(e.target.value) })}
                     className="flex-1 accent-indigo-500 h-1.5 bg-gray-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <ZoomIn className="h-4 w-4 text-indigo-500" />
                  <span className="text-[10px] font-mono font-semibold text-gray-400 min-w-[28px] text-right">
                    {current.zoom.toFixed(1)}x
                  </span>
                </div>

                {/* Rotation and manual offset reset */}
                <div className="flex items-center justify-between text-xs">
                  <button
                    onClick={() => {
                      const nextRotation = (current.rotation + 90) % 360;
                      updateCurrentState({ rotation: nextRotation });
                    }}
                    className="flex items-center gap-1 text-gray-600 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 font-semibold px-3 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>Rotate 90°</span>
                  </button>

                  <button
                    onClick={() => updateCurrentState({ zoom: 1, offsetX: 0, offsetY: 0, rotation: 0 })}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 font-medium cursor-pointer"
                  >
                    Reset Changes
                  </button>
                </div>
              </div>

            </div>

            {/* Sidebar adjustments & Thumbnail list */}
            <div className="p-6 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-800 flex flex-col justify-between overflow-y-auto max-h-[500px] md:max-h-none">
              
              <div>
                {/* Aspect Ratio section */}
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-3">
                  Crop Aspect Ratio
                </span>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {aspectRatios.map((ar) => (
                    <button
                      key={ar.value}
                      onClick={() => updateCurrentState({ aspectRatio: ar.value })}
                      className={`text-left px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        current.aspectRatio === ar.value
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          : 'border-gray-200/50 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{ar.label}</span>
                      {current.aspectRatio === ar.value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>

                {/* Thumbnails list section */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Post Carousel Images ({editStates.length})
                  </span>
                  {editStates.length < 10 && (
                    <label className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-0.5 cursor-pointer">
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleAddMoreImages}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                {/* Grid list of images */}
                <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                  {editStates.map((state, idx) => (
                    <div 
                      key={state.file.name + idx}
                      onClick={() => setActiveIndex(idx)}
                      className={`aspect-square rounded-xl relative overflow-hidden cursor-pointer group border-2 ${
                        idx === activeIndex 
                          ? 'border-indigo-500' 
                          : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img 
                        src={state.previewUrl} 
                        alt="Thumbnail" 
                        className="w-full h-full object-cover" 
                      />
                      
                      {/* Delete button hover overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(idx);
                        }}
                        className="absolute top-1 right-1 p-1 rounded-md bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action save bar */}
              <div className="mt-6 flex items-center gap-3">
                <Button 
                  onClick={onClose} 
                  variant="outline" 
                  className="flex-1 rounded-xl"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={processAndSave}
                  variant="primary"
                  className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      <span>Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save All ({editStates.length})</span>
                    </>
                  )}
                </Button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
