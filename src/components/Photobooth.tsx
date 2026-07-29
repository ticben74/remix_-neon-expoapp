import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Download, RotateCcw, X, Sparkles, Timer, Cloud, Loader2, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';

interface PhotoboothProps {
  overlayUrl?: string;
  frameTheme?: 'ramadan' | 'christmas' | 'blackfriday' | 'summer' | 'none';
  brandName: string;
  themeColor: string;
  onClose: () => void;
  onSaveToCloud?: (base64DataUrl: string) => Promise<void>;
}

const THEME_FRAMES: Record<string, string> = {
  ramadan: 'https://images.unsplash.com/photo-1564182842519-8a3b2af3e228?auto=format&fit=crop&w=1080&q=80',
  christmas: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1080&q=80',
  blackfriday: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1080&q=80',
  summer: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1080&q=80',
};

const FILTERS = [
  { name: 'Normal', class: '' },
  { name: 'Vintage', class: 'sepia(0.5) contrast(1.2)' },
  { name: 'B&W', class: 'grayscale(1)' },
  { name: 'Vibrant', class: 'saturate(1.5) contrast(1.1)' },
  { name: 'Warm', class: 'sepia(0.2) saturate(1.2)' },
];

export const Photobooth: React.FC<PhotoboothProps> = ({ overlayUrl, frameTheme, brandName, themeColor, onClose, onSaveToCloud }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasConsent, setHasConsent] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCloudSave = async () => {
    if (!photo || !onSaveToCloud) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      await onSaveToCloud(photo);
      setIsUploaded(true);
    } catch (err: any) {
      console.error(err);
      setUploadError("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setIsUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } }, 
          audio: false 
      });
      setStream(mediaStream);
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
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

  const takePhoto = useCallback(() => {
    setCountdown(3);
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      capture();
      setCountdown(null);
    }
  }, [countdown]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply filter
    context.filter = activeFilter.class;
    
    // Draw video frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Reset filter for overlay
    context.filter = 'none';

    // Draw overlay if exists
    const finalOverlay = (frameTheme && frameTheme !== 'none') ? THEME_FRAMES[frameTheme] : overlayUrl;

    if (finalOverlay) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = finalOverlay;
      img.onload = () => {
        const isThemeFrame = frameTheme && frameTheme !== 'none';
        if (isThemeFrame) {
          context.globalAlpha = 0.3; // Make theme background subtle if it's not a real transparent frame
        }
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        context.globalAlpha = 1.0;
        
        // Add branding on top of theme
        context.fillStyle = 'rgba(0,0,0,0.3)';
        context.fillRect(0, canvas.height - 60, canvas.width, 60);
        context.fillStyle = 'white';
        context.font = 'bold 24px Inter, sans-serif';
        context.textAlign = 'center';
        context.fillText(brandName.toUpperCase(), canvas.width / 2, canvas.height - 25);
        
        finalizeCapture(canvas);
      };
      img.onerror = () => {
        // Fallback: if Unsplash is down, finalize capture with just the branding
        context.fillStyle = 'rgba(0,0,0,0.3)';
        context.fillRect(0, canvas.height - 60, canvas.width, 60);
        context.fillStyle = 'white';
        context.font = 'bold 24px Inter, sans-serif';
        context.textAlign = 'center';
        context.fillText(brandName.toUpperCase(), canvas.width / 2, canvas.height - 25);
        
        finalizeCapture(canvas);
      };
    } else {
      // Default branding overlay
      context.fillStyle = 'rgba(0,0,0,0.3)';
      context.fillRect(0, canvas.height - 60, canvas.width, 60);
      context.fillStyle = 'white';
      context.font = 'bold 24px Inter, sans-serif';
      context.textAlign = 'center';
      context.fillText(brandName.toUpperCase(), canvas.width / 2, canvas.height - 25);
      finalizeCapture(canvas);
    }
  };

  const finalizeCapture = (canvas: HTMLCanvasElement) => {
    // Compress as JPEG to save bandwidth & space (instead of heavy PNG)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhoto(dataUrl);
  };

  const downloadPhoto = () => {
    if (!photo) return;
    const link = document.createElement('a');
    link.download = `festiv-photobooth-${Date.now()}.jpg`;
    link.href = photo;
    link.click();
  };

  if (!hasConsent) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Camera className="w-5 h-5" style={{ color: themeColor }} /> Photobooth
          </h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-neutral-50 rounded-3xl p-6 border border-neutral-100 space-y-5 text-center sm:text-left">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm mx-auto sm:mx-0">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-lg">Protection des données & Consentement</h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              En continuant, vous autorisez Festiv'App à activer votre caméra pour prendre votre photo souvenir. 
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Votre photo sera temporairement traitée sur votre navigateur et, si vous choisissez de la sauvegarder, sera enregistrée de manière sécurisée dans l'album Google Drive de l'exposition géré par <strong>{brandName}</strong>. Aucun autre traitement commercial ou revente de vos données n'est effectué.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setHasConsent(true)}
              className="w-full rounded-2xl py-6 font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
              style={{ backgroundColor: themeColor }}
            >
              J'accepte & Activer la caméra 📸
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Camera className="w-5 h-5" style={{ color: themeColor }} /> Photobooth
        </h2>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border-4 border-white">
        {!photo ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover scale-x-[-1]"
              style={{ filter: activeFilter.class }}
            />
            
            <AnimatePresence>
              {countdown !== null && (
                <motion.div 
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center z-20"
                >
                  <span className="text-8xl font-black text-white drop-shadow-2xl">
                    {countdown === 0 ? <Sparkles className="w-24 h-24 animate-ping" /> : countdown}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
 
            {isCameraReady && !countdown && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 gap-4 z-10">
                <Button 
                  onClick={takePhoto}
                  className="w-16 h-16 rounded-full p-0 shadow-xl border-4 border-white"
                  style={{ backgroundColor: themeColor }}
                >
                  <Camera className="w-8 h-8" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <img src={photo} alt="Captured" className="w-full h-full object-cover" />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!photo ? (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.name}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter.name === f.name 
                  ? 'text-white shadow-lg' 
                  : 'bg-white text-neutral-500 hover:bg-neutral-100'
              }`}
              style={{ backgroundColor: activeFilter.name === f.name ? themeColor : undefined }}
            >
              {f.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => { setPhoto(null); setIsUploaded(false); setUploadError(null); }}
              className="rounded-2xl py-6 font-bold gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Refaire
            </Button>
            <Button 
              onClick={downloadPhoto}
              className="rounded-2xl py-6 font-bold gap-2 text-white"
              style={{ backgroundColor: themeColor }}
            >
              <Download className="w-4 h-4" /> Télécharger
            </Button>
          </div>
          {onSaveToCloud && (
            <div className="space-y-2">
              <Button
                onClick={handleCloudSave}
                disabled={isUploading || isUploaded}
                className="w-full rounded-2xl py-6 font-bold gap-2 border bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:bg-green-50 disabled:text-green-700 disabled:border-green-200 transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Sauvegarde sur Google Drive...
                  </>
                ) : isUploaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Sauvegardé sur le Drive de l'Exposition !
                  </>
                ) : (
                  <>
                    <Cloud className="w-4 h-4" /> Sauvegarder dans l'album de l'Exposition ☁️
                  </>
                )}
              </Button>
              {uploadError && (
                <div className="flex items-center gap-1.5 justify-center text-xs font-bold text-red-600 bg-red-50 p-2 rounded-xl border border-red-100">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
        Souriez ! Votre photo sera personnalisée aux couleurs de {brandName}
      </p>
    </motion.div>
  );
};
