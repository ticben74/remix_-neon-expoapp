import React, { useEffect, useRef, useState } from 'react';

interface ScratchCardProps {
  offer: string;
  onComplete?: () => void;
  color?: string;
  finishPercent?: number;
  brushSize?: number;
}

export const ScratchCard: React.FC<ScratchCardProps> = ({
  offer,
  onComplete,
  color = '#C0C0C0',
  finishPercent = 50,
  brushSize = 45,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill with silver pattern
    ctx.fillStyle = '#E5E7EB'; // Light gray base
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    
    // Add some texture/noise
    ctx.fillStyle = '#D1D5DB';
    for (let i = 0; i < 300; i++) {
      ctx.fillRect(Math.random() * dimensions.width, Math.random() * dimensions.height, 2, 2);
    }

    // Add "Scratch here" text
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#9CA3AF';
    ctx.textAlign = 'center';
    ctx.fillText('GRATTEZ ICI', dimensions.width / 2, dimensions.height / 2 + 6);

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize * 2;
    ctx.globalCompositeOperation = 'destination-out';
  }, [dimensions, brushSize]);

  const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const scratch = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || isComplete) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    
    if (lastPos.current) {
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
    } else {
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    }
    
    ctx.stroke();
    ctx.fill();
    
    lastPos.current = { x, y };

    checkCompletion();
  };

  const checkCompletion = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, dimensions.width, dimensions.height);
    const pixels = imageData.data;
    let transparentPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) {
        transparentPixels++;
      }
    }

    const percent = (transparentPixels / (dimensions.width * dimensions.height)) * 100;
    if (percent >= finishPercent && !isComplete) {
      setIsComplete(true);
      if (onComplete) onComplete();
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const { x, y } = getMousePos(e);
    lastPos.current = { x, y };
    scratch(x, y);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const { x, y } = getMousePos(e);
    scratch(x, y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  return (
    <div ref={containerRef} className="relative w-full aspect-[2/1] overflow-hidden rounded-2xl bg-neutral-50 border border-neutral-100 group">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Vous avez gagné</p>
        <p className="text-2xl font-black tracking-tight" style={{ color }}>{offer}</p>
      </div>
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`absolute inset-0 cursor-crosshair transition-opacity duration-700 ${isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      />
      {isDrawing && !isComplete && lastPos.current && (
        <>
          <div 
            className="pointer-events-none absolute w-16 h-16 rounded-full bg-white/50 blur-2xl animate-pulse z-10"
            style={{ 
              left: lastPos.current.x, 
              top: lastPos.current.y,
              transform: 'translate(-50%, -50%)'
            }}
          />
          <div 
            className="pointer-events-none absolute w-8 h-8 rounded-full bg-white/80 blur-md z-10"
            style={{ 
              left: lastPos.current.x, 
              top: lastPos.current.y,
              transform: 'translate(-50%, -50%)'
            }}
          />
        </>
      )}
    </div>
  );
};
