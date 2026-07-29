import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, RotateCcw, Ticket } from 'lucide-react';
import { Button } from './ui/button';

// ── Types ─────────────────────────────────────────────────────────

export interface SpinSegment {
  id: string;
  label: string;       // Texte court affiché sur la roue — ex: "-0.5 DT"
  emoji: string;       // Emoji affiché — ex: "🏷️"
  color: string;       // Hex couleur du segment — ex: "#0ea5e9"
  probability: number; // Poids relatif (pas forcément %) — ex: 30
  type: 'discount' | 'gift' | 'draw' | 'special' | 'none';
  couponCode?: string; // Si type !== 'none', code optionnel à afficher
}

interface SpinWheelProps {
  segments: SpinSegment[];
  themeColor: string;
  onWin?: (segment: SpinSegment) => void;
  onComplete?: () => void;
  onClose: () => void;
  isPreview?: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────

export const DEFAULT_SEGMENTS: SpinSegment[] = [
  { id: '1', label: '-0.5 DT',        emoji: '🏷️', color: '#0ea5e9', probability: 30, type: 'discount', couponCode: 'RAYON05' },
  { id: '2', label: 'Pas de chance',  emoji: '😔', color: '#94a3b8', probability: 25, type: 'none' },
  { id: '3', label: 'Cadeau offert',  emoji: '🎁', color: '#10b981', probability: 10, type: 'gift',     couponCode: 'CADEAU' },
  { id: '4', label: '-10% caisse',    emoji: '💸', color: '#f59e0b', probability: 20, type: 'discount', couponCode: 'PROMO10' },
  { id: '5', label: 'Participez',     emoji: '🎉', color: '#7c3aed', probability: 10, type: 'draw' },
  { id: '6', label: '2 pour 1',       emoji: '🛒', color: '#ef4444', probability:  5, type: 'special',  couponCode: '2POUR1' },
];

// ── Canvas drawing ────────────────────────────────────────────────

function drawWheel(
  ctx: CanvasRenderingContext2D,
  segments: SpinSegment[],
  rotation: number,
  size: number,
) {
  const cx = size / 2;
  const cy = size / 2;
  const r  = size / 2 - 4;
  const arc = (Math.PI * 2) / segments.length;

  ctx.clearRect(0, 0, size, size);

  segments.forEach((seg, i) => {
    const start = rotation + i * arc;
    const end   = start + arc;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, end);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Label text
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(start + arc / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 ${size < 280 ? 11 : 13}px system-ui`;
    ctx.fillText(seg.label, r - 12, 5);
    ctx.font = `${size < 280 ? 14 : 16}px system-ui`;
    ctx.fillText(seg.emoji, r - 14 - ctx.measureText(seg.label).width - 4, 6);
    ctx.restore();
  });

  // Center disc
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ── Ease function ─────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Weighted random ───────────────────────────────────────────────

function weightedRandom(segments: SpinSegment[]): number {
  const total = segments.reduce((s, seg) => s + seg.probability, 0);
  let r = Math.random() * total;
  for (let i = 0; i < segments.length; i++) {
    r -= segments[i].probability;
    if (r <= 0) return i;
  }
  return segments.length - 1;
}

// ── Component ─────────────────────────────────────────────────────

export const SpinWheel: React.FC<SpinWheelProps> = ({
  segments,
  themeColor,
  onWin,
  onComplete,
  onClose,
  isPreview = false,
}) => {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const angleRef    = useRef(0);
  const animRef     = useRef<number | null>(null);
  const SIZE        = 300;

  const [spinning,  setSpinning]  = useState(false);
  const [winner,    setWinner]    = useState<SpinSegment | null>(null);
  const [hasSpun,   setHasSpun]   = useState(false);

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawWheel(ctx, segments, angleRef.current, SIZE);
  }, [segments]);

  const spin = useCallback(() => {
    if (spinning || hasSpun || segments.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setSpinning(true);

    const winnerIdx  = weightedRandom(segments);
    const arc        = (Math.PI * 2) / segments.length;
    const winAngle   = -(winnerIdx * arc + arc / 2);
    const spins      = 5 + Math.random() * 3;
    const target     = angleRef.current + spins * Math.PI * 2 + winAngle - (angleRef.current % (Math.PI * 2));
    const startAngle = angleRef.current;
    const duration   = 4000;
    const startTime  = performance.now();

    function frame(now: number) {
      const elapsed = now - startTime;
      const t       = Math.min(elapsed / duration, 1);
      angleRef.current = startAngle + (target - startAngle) * easeInOutCubic(t);
      drawWheel(ctx!, segments, angleRef.current, SIZE);

      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        setSpinning(false);
        setHasSpun(true);
        setWinner(segments[winnerIdx]);
        onComplete?.();
        if (!isPreview && segments[winnerIdx].type !== 'none') {
          onWin?.(segments[winnerIdx]);
        }
      }
    }

    animRef.current = requestAnimationFrame(frame);
  }, [spinning, hasSpun, segments, onWin, isPreview]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  const reset = () => {
    setWinner(null);
    setHasSpun(false);
  };

  const isWin = winner && winner.type !== 'none';

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">Roue de la Fortune</h2>
        <button onClick={onClose} className="text-xs font-bold text-neutral-400 hover:text-neutral-700 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Wheel */}
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          {/* Pointer */}
          <div
            className="absolute top-[-14px] left-1/2 -translate-x-1/2 z-10"
            style={{
              width: 0, height: 0,
              borderLeft: '12px solid transparent',
              borderRight: '12px solid transparent',
              borderTop: `24px solid ${themeColor}`,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }}
          />

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={SIZE}
            height={SIZE}
            className="rounded-full"
            style={{
              boxShadow: `0 8px 32px rgba(0,0,0,0.16), 0 0 0 4px #fff, 0 0 0 6px #e2e8f0`,
            }}
          />

          {/* Center button */}
          <button
            onClick={spin}
            disabled={spinning || hasSpun}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60px] h-[60px] rounded-full bg-white border-[3px] text-xs font-bold z-20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: themeColor,
              color: themeColor,
              boxShadow: `0 2px 8px ${themeColor}40`,
            }}
          >
            {spinning ? '...' : hasSpun ? '✓' : 'Jouer'}
          </button>
        </div>

        {/* Instruction */}
        {!hasSpun && !spinning && (
          <p className="text-sm text-neutral-400 text-center">
            Appuyez sur le centre pour tourner la roue
          </p>
        )}
      </div>

      {/* Result */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-6 shadow-xl shadow-neutral-100 border border-neutral-100 text-center space-y-4"
          >
            <span className="text-4xl">{winner.emoji}</span>
            <div>
              <p className="text-lg font-black tracking-tight">
                {isWin ? 'Félicitations !' : 'Pas de chance...'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                {isWin ? 'Votre gain du jour' : 'Tentez à nouveau lors de votre prochaine visite'}
              </p>
            </div>

            {isWin && (
              <div
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-base font-bold"
                style={{ background: `${winner.color}18`, color: winner.color, border: `1.5px solid ${winner.color}50` }}
              >
                {winner.label}
              </div>
            )}

            {isWin && winner.couponCode && (
              <div className="bg-neutral-50 rounded-xl p-4 border border-dashed border-neutral-300">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Code caisse</p>
                <p className="text-2xl font-black tracking-wider" style={{ color: themeColor }}>{winner.couponCode}</p>
              </div>
            )}

            {!isWin && (
              <Button variant="outline" className="w-full rounded-full" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" /> Réessayer
              </Button>
            )}

            {isWin && (
              <Button
                className="w-full rounded-xl py-6 font-bold text-white"
                style={{ backgroundColor: themeColor }}
              >
                <Ticket className="w-4 h-4 mr-2" /> Utiliser en caisse
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

// ── SetupView sub-component ───────────────────────────────────────

interface SpinWheelSetupProps {
  segments: SpinSegment[];
  onChange: (segments: SpinSegment[]) => void;
}

export const SpinWheelSetup: React.FC<SpinWheelSetupProps> = ({ segments, onChange }) => {
  const updateSegment = (id: string, field: keyof SpinSegment, value: string | number) => {
    onChange(segments.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const totalProb = segments.reduce((a, s) => a + s.probability, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
        Segments — Total poids : {totalProb}
      </p>
      {segments.map(seg => (
        <div key={seg.id} className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
          <span className="text-2xl">{seg.emoji}</span>
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: seg.color }}
          />
          <input
            className="flex-1 text-sm font-bold bg-transparent border-none outline-none"
            value={seg.label}
            onChange={e => updateSegment(seg.id, 'label', e.target.value)}
          />
          <div className="flex items-center gap-1 text-xs text-neutral-400">
            <span>Poids</span>
            <input
              type="number"
              min="0"
              max="100"
              className="w-12 text-center text-xs border border-neutral-200 rounded-lg p-1 bg-white"
              value={seg.probability}
              onChange={e => updateSegment(seg.id, 'probability', parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="text-xs text-neutral-400">
            {totalProb > 0 ? Math.round(seg.probability / totalProb * 100) : 0}%
          </div>
        </div>
      ))}
    </div>
  );
};
