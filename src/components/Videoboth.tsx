import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Video, Download, RotateCcw, X, Play, Square, Share2, Loader2, Camera, Box, Cloud, CheckCircle2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { toast } from 'sonner';

interface VideobothProps {
  maxDuration?: number;
  overlayUrl?: string;
  frameTheme?: 'ramadan' | 'christmas' | 'blackfriday' | 'summer' | 'none';
  arConfig?: {
    enabled: boolean;
    modelUrl: string;
    posterUrl?: string;
  };
  brandName: string;
  themeColor: string;
  onClose: () => void;
  onSaveToCloud?: (base64OrBlob: string | Blob, mimeType: string) => Promise<void>;
}

const THEME_FRAMES: Record<string, string> = {
  ramadan: 'https://images.unsplash.com/photo-1564182842519-8a3b2af3e228?auto=format&fit=crop&w=1080&q=80',
  christmas: 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1080&q=80',
  blackfriday: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1080&q=80',
  summer: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1080&q=80',
};

export const Videoboth: React.FC<VideobothProps> = ({ 
  maxDuration = 15, 
  overlayUrl, 
  frameTheme,
  arConfig,
  brandName, 
  themeColor, 
  onClose,
  onSaveToCloud
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const requestRef = useRef<number>(0);
  
  const [hasConsent, setHasConsent] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [mode, setMode] = useState<'video' | 'photo'>('video');
  const [isUploading, setIsUploading] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCloudSave = async () => {
    if (!onSaveToCloud) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      if (videoUrl && chunks.length > 0) {
        const actualMime = mediaRecorderRef.current?.mimeType || 'video/webm';
        const videoBlob = new Blob(chunks, { type: actualMime });
        
        // Safety size check
        if (videoBlob.size > 30 * 1024 * 1024) {
          throw new Error("La vidéo dépasse la limite autorisée de 30 Mo.");
        }
        await onSaveToCloud(videoBlob, actualMime);
      } else if (photoUrl) {
        await onSaveToCloud(photoUrl, 'image/jpeg');
      }
      setIsUploaded(true);
      toast.success("Enregistré dans l'album cloud de l'exposition !");
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Erreur de sauvegarde sur Google Drive. Veuillez réessayer.");
      toast.error(err.message || "Erreur de sauvegarde.");
    } finally {
      setIsUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 1280 } }, 
        audio: true 
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
      console.error("Error accessing camera/mic:", err);
    }
  };

  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isCameraReady) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw Video (Mirrored)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw Overlay/Frame
    const finalOverlay = (frameTheme && frameTheme !== 'none') ? THEME_FRAMES[frameTheme] : overlayUrl;
    if (finalOverlay) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = finalOverlay;
      img.onerror = () => {}; // graceful ignore
      if (img.complete) {
        if (frameTheme && frameTheme !== 'none') ctx.globalAlpha = 0.3;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }
    }

    // Draw Branding
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(brandName.toUpperCase(), canvas.width / 2, canvas.height - 35);

    requestRef.current = requestAnimationFrame(drawFrame);
  }, [isCameraReady, frameTheme, overlayUrl, brandName]);

  useEffect(() => {
    if (hasConsent) {
      startCamera();
    }
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [hasConsent]);

  useEffect(() => {
    if (isCameraReady) {
      requestRef.current = requestAnimationFrame(drawFrame);
    }
  }, [isCameraReady, drawFrame]);

  const takePhoto = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Compress as JPEG to save space
    setPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
  };

  const startRecording = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream) return;
    
    setChunks([]);
    const canvasStream = canvas.captureStream(30);
    
    // Add audio track from original stream
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);

    // Dynamic mime type resolution to avoid iOS crashes
    let resolvedMime = 'video/webm;codecs=vp9,opus';
    if (typeof MediaRecorder !== 'undefined') {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4'
      ];
      for (const candidate of candidates) {
        if (MediaRecorder.isTypeSupported(candidate)) {
          resolvedMime = candidate;
          break;
        }
      }
    }

    const mediaRecorder = new MediaRecorder(canvasStream, {
      mimeType: resolvedMime
    });

    const localChunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        localChunks.push(e.data);
        setChunks(prev => [...prev, e.data]);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(localChunks, { type: resolvedMime });
      setVideoUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setRecording(true);
    setTimeLeft(maxDuration);
  }, [stream, maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (recording && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && recording) {
      stopRecording();
    }
    return () => clearInterval(timer);
  }, [recording, timeLeft, stopRecording]);

  const shareContent = async () => {
    const url = videoUrl || photoUrl;
    if (!url) return;
    try {
      const actualMime = videoUrl ? (mediaRecorderRef.current?.mimeType || 'video/webm') : 'image/jpeg';
      const ext = actualMime.includes('webm') ? 'webm' : actualMime.includes('mp4') ? 'mp4' : 'jpg';
      const blob = videoUrl 
        ? new Blob(chunks, { type: actualMime })
        : await (await fetch(photoUrl!)).blob();
      
      const file = new File([blob], videoUrl ? `reel.${ext}` : 'photo.jpg', { 
        type: actualMime 
      });
      
      if (navigator.share) {
        await navigator.share({
          title: `Mon souvenir chez ${brandName}`,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = videoUrl ? `reel-${Date.now()}.${ext}` : `photo-${Date.now()}.jpg`;
        link.href = url;
        link.click();
      }
    } catch (err) {
      console.error("Error sharing:", err);
    }
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
            <Video className="w-5 h-5" style={{ color: themeColor }} /> Studio Capture
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
              En continuant, vous autorisez Festiv'App à activer votre caméra et votre microphone pour enregistrer votre message vidéo souvenir. 
            </p>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Vos captures seront temporairement traitées sur votre navigateur et, si vous choisissez de les sauvegarder, seront enregistrées de manière sécurisée dans l'album Google Drive de l'exposition géré par <strong>{brandName}</strong>. Aucun autre traitement commercial ou revente de vos données n'est effectué.
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => setHasConsent(true)}
              className="w-full rounded-2xl py-6 font-bold text-white shadow-lg transition-transform active:scale-[0.98]"
              style={{ backgroundColor: themeColor }}
            >
              J'accepte & Activer le Studio 🎥
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
          <Video className="w-5 h-5" style={{ color: themeColor }} /> Studio Capture
        </h2>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex justify-center gap-2">
        <Button 
          variant={mode === 'video' ? 'default' : 'outline'}
          onClick={() => setMode('video')}
          className="rounded-full px-6 h-10 font-bold"
          style={mode === 'video' ? { backgroundColor: themeColor } : {}}
        >
          Vidéo Reel
        </Button>
        <Button 
          variant={mode === 'photo' ? 'default' : 'outline'}
          onClick={() => setMode('photo')}
          className="rounded-full px-6 h-10 font-bold"
          style={mode === 'photo' ? { backgroundColor: themeColor } : {}}
        >
          Photo
        </Button>
      </div>

      <div className="relative aspect-[9/16] rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border-4 border-white max-h-[60vh] mx-auto">
        {!videoUrl && !photoUrl ? (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={canvasRef} className="w-full h-full object-cover" />
            
            {arConfig?.enabled && (
              <div className="absolute top-4 right-4 z-30">
                <div className="bg-white/20 backdrop-blur-md p-2 rounded-2xl border border-white/30">
                  <Box className="w-6 h-6 text-white animate-bounce" />
                </div>
              </div>
            )}

            {recording && (
              <div className="absolute top-6 left-0 right-0 flex justify-center z-20">
                <div className="bg-red-600 text-white px-4 py-1 rounded-full flex items-center gap-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-xs font-bold font-mono">REC 00:{timeLeft.toString().padStart(2, '0')}</span>
                </div>
              </div>
            )}

            <div className="absolute bottom-10 left-0 right-0 flex justify-center z-10">
              {mode === 'video' ? (
                !recording ? (
                  <Button 
                    onClick={startRecording}
                    disabled={!isCameraReady}
                    className="w-20 h-20 rounded-full p-0 shadow-xl border-4 border-white flex items-center justify-center bg-red-600 hover:bg-red-700"
                  >
                    <Play className="w-8 h-8 text-white fill-current" />
                  </Button>
                ) : (
                  <Button 
                    onClick={stopRecording}
                    className="w-20 h-20 rounded-full p-0 shadow-xl border-4 border-white flex items-center justify-center bg-white hover:bg-neutral-100"
                  >
                    <Square className="w-8 h-8 text-red-600 fill-current" />
                  </Button>
                )
              ) : (
                <Button 
                  onClick={takePhoto}
                  disabled={!isCameraReady}
                  className="w-20 h-20 rounded-full p-0 shadow-xl border-4 border-white flex items-center justify-center"
                  style={{ backgroundColor: themeColor }}
                >
                  <Camera className="w-8 h-8 text-white" />
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            {videoUrl ? (
              <video src={videoUrl} autoPlay loop playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={photoUrl!} className="w-full h-full object-cover" />
            )}
          </>
        )}
      </div>

      {(videoUrl || photoUrl) && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setVideoUrl(null);
                setPhotoUrl(null);
                setChunks([]);
                setIsUploaded(false);
                setUploadError(null);
                startCamera();
              }}
              className="rounded-2xl py-6 font-bold gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Refaire
            </Button>
            <Button 
              onClick={shareContent}
              className="rounded-2xl py-6 font-bold gap-2 text-white"
              style={{ backgroundColor: themeColor }}
            >
              <Share2 className="w-4 h-4" /> Partager
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
                    <CheckCircle2 className="w-4 h-4 text-green-600" /> Sauvegardé dans l'album de l'exposition !
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

      <p className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-relaxed">
        {mode === 'video' ? 'Enregistrez votre Reel et partagez-le !' : 'Prenez une photo souvenir !'}<br/>
        Personnalisé aux couleurs de {brandName}
      </p>
    </motion.div>
  );
};
