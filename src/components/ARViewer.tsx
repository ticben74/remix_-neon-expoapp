import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Box, Smartphone, Maximize2 } from 'lucide-react';
import { Button } from './ui/button';
import '@google/model-viewer';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

interface ARViewerProps {
  modelUrl: string;
  posterUrl?: string;
  altText?: string;
  themeColor: string;
  onClose: () => void;
  placement?: 'floor' | 'wall';
}

export const ARViewer: React.FC<ARViewerProps> = ({ modelUrl, posterUrl, altText, themeColor, onClose, placement = 'wall' }) => {
  const ModelViewer = 'model-viewer' as any;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Box className="w-5 h-5" style={{ color: themeColor }} /> Expérience AR
        </h2>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-neutral-100 shadow-inner border border-neutral-200">
        <ModelViewer
          src={modelUrl}
          poster={posterUrl}
          alt={altText || "Modèle 3D interactif"}
          ar
          ar-modes="webxr scene-viewer quick-look"
          ar-placement={placement}
          camera-controls
          auto-rotate
          shadow-intensity="1"
          style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
        >
          <div slot="poster" className="absolute inset-0 flex items-center justify-center bg-neutral-100">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto animate-bounce">
                <Box className="w-8 h-8" style={{ color: themeColor }} />
              </div>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Chargement de l'œuvre 3D...</p>
            </div>
          </div>

          <Button
            slot="ar-button"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full px-8 py-6 font-bold text-white shadow-2xl gap-2"
            style={{ backgroundColor: themeColor }}
          >
            <Smartphone className="w-5 h-5" /> {placement === 'wall' ? 'Ancrer sur le mur 🧱' : 'Placer dans mon espace'}
          </Button>
        </ModelViewer>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-neutral-50 flex items-center justify-center flex-shrink-0">
            <Maximize2 className="w-6 h-6 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-black tracking-tight">Réalité Augmentée</p>
            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">{placement === 'wall' ? 'Ancrage Mural "Wall Placement"' : 'WebXR "Place in Space"'}</p>
          </div>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          {placement === 'wall' 
            ? "Visez un mur vertical bien éclairé avec votre caméra. Appuyez sur le bouton ci-dessus pour projeter et ancrer virtuellement cette œuvre d'art à taille réelle directement sur la brique ou le béton !"
            : "Utilisez votre caméra pour placer notre mascotte 3D directement dans le mall. Prenez une capture d'écran pour partager votre expérience !"}
        </p>
      </div>

      <p className="text-center text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
        Propulsé par la technologie WebXR
      </p>
    </motion.div>
  );
};
