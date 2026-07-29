import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Camera, RotateCcw, X, Sparkles, Loader2, CheckCircle2, 
  Trash2, Undo2, Paintbrush, Eraser, SprayCan, Check, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface ARGraffitiProps {
  campaignId: string;
  wallId: string;
  wallName: string;
  themeColor: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const NEON_COLORS = [
  '#FF0055', // Neon Pink
  '#00FF66', // Neon Green
  '#00F0FF', // Neon Blue
  '#FFCC00', // Neon Yellow
  '#FF4400', // Neon Orange
  '#B800FF', // Neon Purple
  '#FFFFFF', // White
];

export const ARGraffiti: React.FC<ARGraffitiProps> = ({ 
  campaignId, 
  wallId, 
  wallName, 
  themeColor, 
  onClose,
  onSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasConsent, setHasConsent] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushType, setBrushType] = useState<'spray' | 'neon' | 'eraser'>('spray');
  const [brushColor, setBrushColor] = useState(NEON_COLORS[0]);
  const [brushSize, setBrushSize] = useState(25);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [author, setAuthor] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Keep track of last drawn position for line-drawing brushes
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const startCamera = async () => {
    try {
      // Prioritize the back camera (environment) for painting on physical walls
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1080 }, height: { ideal: 1920 } }, 
        audio: false 
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
          setupCanvasSize();
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error("Impossible d'accéder à l'appareil photo. Veuillez vérifier les permissions.");
    }
  };

  const setupCanvasSize = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Use actual video source resolution to avoid blurry drawing
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;

    // Clear canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    if (hasConsent) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [hasConsent]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      setupCanvasSize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveCanvasState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Save state to undo stack (max 15 states)
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev.slice(-14), state]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = undoStack[undoStack.length - 1];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(previousState, 0, 0);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale from screen bounds to internal resolution
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleStartDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    if (!coords) return;

    saveCanvasState();
    setIsDrawing(true);
    lastPosRef.current = coords;

    // Draw initial point/spray
    handleDrawing(e);
  };

  const handleDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const coords = getCanvasCoords(e);

    if (!canvas || !ctx || !coords || !lastPosRef.current) return;

    const { x, y } = coords;
    const lastPos = lastPosRef.current;

    ctx.save();

    if (brushType === 'spray') {
      // Spray Paint: randomized distribution of paint spots with realistic drippage
      const density = 35;
      const radius = brushSize;
      
      ctx.fillStyle = brushColor;
      for (let i = 0; i < density; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Exponential distribution for realistic paint concentration in the center
        const dist = Math.pow(Math.random(), 1.5) * radius;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;

        // Soft edges of the spray
        ctx.globalAlpha = Math.max(0.02, (1 - dist / radius) * 0.25);
        ctx.beginPath();
        ctx.arc(px, py, Math.random() * 2.5 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional random drips (coulures) for extreme realism!
      if (Math.random() < 0.04) {
        const dripLength = Math.random() * 50 + 15;
        const dripWidth = Math.random() * 1.5 + 0.8;
        
        ctx.beginPath();
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = dripWidth;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.4;
        
        // Slightly wavy organic drip path down
        ctx.moveTo(x, y);
        let currentX = x;
        let currentY = y;
        const steps = 6;
        for (let j = 1; j <= steps; j++) {
          const nextY = y + (dripLength / steps) * j;
          const nextX = currentX + (Math.random() - 0.5) * 2;
          ctx.lineTo(nextX, nextY);
          currentX = nextX;
          currentY = nextY;
        }
        ctx.stroke();

        // Droplet at the bottom
        ctx.beginPath();
        ctx.arc(currentX, currentY, dripWidth + 1, 0, Math.PI * 2);
        ctx.fillStyle = brushColor;
        ctx.globalAlpha = 0.6;
        ctx.fill();
      }
    } else if (brushType === 'neon') {
      // Glow Neon Marker effect
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize * 0.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = brushColor;
      ctx.shadowBlur = brushSize * 0.8;

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (brushType === 'eraser') {
      // Eraser removes elements dynamically
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.restore();
    lastPosRef.current = coords;
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
    lastPosRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    saveCanvasState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    const video = videoRef.current;
    const drawingCanvas = canvasRef.current;
    if (!video || !drawingCanvas) return;

    setIsSubmitting(true);
    setApiError(null);

    try {
      // Create a final composite canvas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = drawingCanvas.width;
      compositeCanvas.height = drawingCanvas.height;
      const ctx = compositeCanvas.getContext('2d');

      if (!ctx) throw new Error("Could not create drawing context");

      // 1. Draw video background
      ctx.drawImage(video, 0, 0, compositeCanvas.width, compositeCanvas.height);

      // 2. Draw user's graffiti artwork
      ctx.drawImage(drawingCanvas, 0, 0, compositeCanvas.width, compositeCanvas.height);

      // Convert to Base64
      const finalImageData = compositeCanvas.toDataURL('image/jpeg', 0.85);

      // Send to server API
      const response = await fetch(`/api/campaigns/${campaignId}/graffiti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallId,
          imageData: finalImageData,
          author: author.trim() || undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Une erreur est survenue lors de la publication.");
      }

      setIsSubmitted(true);
      toast.success("Votre graffiti a bien été soumis !");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Error submitting graffiti:", err);
      setApiError(err.message || "Une erreur est survenue.");
      toast.error(err.message || "Erreur de publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950 z-50 flex flex-col font-sans select-none overflow-hidden">
      {!hasConsent ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white space-y-6">
          <div className="w-20 h-20 rounded-[2rem] bg-neutral-900 border border-neutral-800 flex items-center justify-center text-3xl">
            🧱
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-2xl font-black tracking-tight">Atelier AR Graffiti</h2>
            <p className="text-sm text-neutral-400">
              Laissez votre empreinte d'artiste ! Ouvrez l'appareil photo pour graffer virtuellement sur le mur <strong style={{ color: themeColor }}>"{wallName}"</strong>.
            </p>
          </div>
          <div className="space-y-4 w-full max-w-xs pt-4">
            <Button 
              className="w-full rounded-full py-6 font-bold text-white shadow-xl"
              style={{ backgroundColor: themeColor }}
              onClick={() => setHasConsent(true)}
            >
              <Camera className="w-5 h-5 mr-2" /> Ouvrir l'Atelier
            </Button>
            <button 
              onClick={onClose} 
              className="text-sm font-bold text-neutral-500 hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
          {/* Header Controls */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-neutral-950/80 to-transparent z-10 flex items-center justify-between pointer-events-auto">
            <button 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-neutral-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-neutral-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 rounded-full bg-neutral-900/80 backdrop-blur-md border border-white/10 text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {wallName}
            </div>
            <button 
              onClick={handleUndo} 
              disabled={undoStack.length === 0}
              className="w-10 h-10 rounded-full bg-neutral-900/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white disabled:opacity-40 hover:bg-neutral-900 transition-colors"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Video & Canvas Viewport */}
          <div className="absolute inset-0 z-0 bg-neutral-900 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover pointer-events-none"
            />
            
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover touch-none cursor-crosshair z-10"
              onMouseDown={handleStartDraw}
              onMouseMove={handleDrawing}
              onMouseUp={handleEndDraw}
              onMouseLeave={handleEndDraw}
              onTouchStart={handleStartDraw}
              onTouchMove={handleDrawing}
              onTouchEnd={handleEndDraw}
            />

            {/* Simulated spray particle effect centered on brush coordinates can be shown */}
            {isDrawing && brushType === 'spray' && (
              <div className="absolute pointer-events-none z-20 w-8 h-8 rounded-full border border-dashed border-white/30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            )}
          </div>

          {/* Bottom Customizer Dashboard */}
          <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent z-20 flex flex-col gap-6">
            
            {/* Color Swatches */}
            <div className="flex justify-center gap-3">
              {NEON_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setBrushColor(color)}
                  className="relative w-9 h-9 rounded-full border-2 border-white/10 transition-transform active:scale-95 shadow-md flex items-center justify-center"
                  style={{ 
                    backgroundColor: color, 
                    boxShadow: brushColor === color ? `0 0 15px ${color}` : 'none',
                    borderColor: brushColor === color ? '#ffffff' : 'rgba(255,255,255,0.1)'
                  }}
                >
                  {brushColor === color && (
                    <Check className="w-4 h-4 text-neutral-950 stroke-[3]" />
                  )}
                </button>
              ))}
            </div>

            {/* Brush Controls Row */}
            <div className="flex items-center justify-between gap-4">
              
              {/* Brush Type Toggles */}
              <div className="flex gap-1.5 bg-neutral-900/80 p-1 rounded-full border border-white/10">
                <button
                  onClick={() => setBrushType('spray')}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    brushType === 'spray' ? 'bg-white text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <SprayCan className="w-4 h-4" /> Spray
                </button>
                <button
                  onClick={() => setBrushType('neon')}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    brushType === 'neon' ? 'bg-white text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Paintbrush className="w-4 h-4" /> Néon
                </button>
                <button
                  onClick={() => setBrushType('eraser')}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    brushType === 'eraser' ? 'bg-white text-neutral-950 font-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Eraser className="w-4 h-4" /> Gomme
                </button>
              </div>

              {/* Slider for brush size */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Taille</span>
                <input
                  type="range"
                  min="8"
                  max="70"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
                  className="flex-1 accent-white h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Reset Clear Trash */}
              <button
                onClick={clearCanvas}
                className="w-11 h-11 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center active:scale-95"
                title="Effacer tout"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Form & Action Section */}
            <div id="graffiti-form" className="space-y-3 bg-neutral-900/60 backdrop-blur-md p-4 rounded-3xl border border-white/10 shadow-2xl">
              {/* Author Input Field */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold tracking-wider text-neutral-300 uppercase px-1">
                  Auteur de l'œuvre
                </label>
                <div className="relative flex items-center group">
                  <User className="w-4 h-4 text-neutral-400 group-focus-within:text-white absolute left-3.5 pointer-events-none transition-colors" />
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Votre nom ou pseudo (optionnel)"
                    maxLength={40}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-950/80 border border-white/15 text-xs font-medium text-white placeholder-neutral-500 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <Button 
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 rounded-2xl py-5 font-bold border-white/10 text-white bg-neutral-900/80 hover:bg-neutral-800 transition-all"
                >
                  Retour
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 rounded-2xl py-5 font-bold text-white shadow-lg gap-2 active:scale-[0.98] transition-all"
                  style={{ backgroundColor: themeColor }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Figer & Publier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Success Overlay Modal */}
          <AnimatePresence>
            {isSubmitted && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-neutral-950/95 z-50 flex flex-col items-center justify-center p-6 text-center"
              >
                <div className="space-y-6 max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto text-emerald-400">
                    <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-white tracking-tight">Œuvre Envoyée !</h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      Votre graffiti a été transmis avec succès. Une fois validé par l'administrateur de l'exposition, il rejoindra la fresque collective visible dans l'onglet <strong style={{ color: themeColor }}>Fresque</strong> !
                    </p>
                  </div>
                  <Button 
                    className="w-full rounded-full py-6 font-bold text-white shadow-xl mt-4"
                    style={{ backgroundColor: themeColor }}
                    onClick={onClose}
                  >
                    Retourner au Parcours
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
