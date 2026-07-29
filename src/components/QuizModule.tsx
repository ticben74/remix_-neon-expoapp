import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, X, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';

// ── Types ─────────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  explanation: string;  // Affiché après la réponse
}

export interface QuizConfig {
  enabled: boolean;
  threshold: number;
  coupon: {
    code: string;
    label: string;
  };
  questions: QuizQuestion[];
}

interface QuizModuleProps {
  quiz: QuizConfig;
  themeColor: string;
  onWin?: () => void;
  onComplete?: () => void;
  onClose: () => void;
  isPreview?: boolean;
}

// ── Defaults ──────────────────────────────────────────────────────

export const DEFAULT_QUIZ: QuizConfig = {
  enabled: true,
  threshold: 2,
  coupon: { code: 'QUIZ20', label: '-20% sur votre prochain achat' },
  questions: [
    {
      id: 'q1',
      text: 'D\'où provient notre lait ?',
      choices: ['Fermes locales certifiées', 'Import Europe', 'Coopérative nationale', 'Élevage industriel'],
      correctIndex: 0,
      explanation: 'Notre lait est collecté dans un rayon de 80 km, chez des éleveurs partenaires certifiés.',
    },
    {
      id: 'q2',
      text: 'Quelle mention figure sur notre emballage ?',
      choices: ['Sans OGM', 'Avec conservateurs', 'Enrichi en sucres', 'Importé'],
      correctIndex: 0,
      explanation: 'Tous nos produits sont sans OGM et sans additifs artificiels.',
    },
    {
      id: 'q3',
      text: 'Combien d\'heures de pâturage minimum pour nos vaches ?',
      choices: ['2h / jour', '4h / jour', '6h / jour', 'Aucun accès'],
      correctIndex: 2,
      explanation: 'Nos vaches bénéficient d\'au moins 6h de pâturage quotidien selon notre cahier des charges.',
    },
  ],
};

// ── Sub-components ────────────────────────────────────────────────

const LETTERS = ['A', 'B', 'C', 'D'];

interface ChoiceButtonProps {
  letter: string;
  text: string;
  status: 'idle' | 'correct' | 'wrong' | 'dimmed';
  onClick: () => void;
  themeColor: string;
}

const ChoiceButton: React.FC<ChoiceButtonProps> = ({ letter, text, status, onClick, themeColor }) => {
  const base = 'w-full p-4 rounded-2xl border text-left flex items-center gap-3 transition-all text-sm font-medium';
  const styles: Record<typeof status, string> = {
    idle:    'bg-white border-neutral-100 hover:border-neutral-300 hover:shadow-sm cursor-pointer',
    correct: 'bg-green-50 border-green-200 text-green-800 cursor-default',
    wrong:   'bg-red-50 border-red-200 text-red-800 cursor-default',
    dimmed:  'bg-neutral-50 border-neutral-100 opacity-40 cursor-default',
  };
  const letterStyles: Record<typeof status, React.CSSProperties> = {
    idle:    { background: '#f8fafc', color: '#64748b' },
    correct: { background: '#10b981', color: '#fff' },
    wrong:   { background: '#ef4444', color: '#fff' },
    dimmed:  { background: '#e2e8f0', color: '#94a3b8' },
  };

  return (
    <button
      className={`${base} ${styles[status]}`}
      onClick={status === 'idle' ? onClick : undefined}
      disabled={status !== 'idle'}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={letterStyles[status]}
      >
        {letter}
      </span>
      {text}
      {status === 'correct' && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto flex-shrink-0" />}
      {status === 'wrong'   && <XCircle     className="w-4 h-4 text-red-400   ml-auto flex-shrink-0" />}
    </button>
  );
};

// ── Main component ────────────────────────────────────────────────

type QuizPhase = 'question' | 'feedback' | 'result';

export const QuizModule: React.FC<QuizModuleProps> = ({
  quiz,
  themeColor,
  onWin,
  onComplete,
  onClose,
  isPreview = false,
}) => {
  const [current,   setCurrent]   = useState(0);
  const [score,     setScore]     = useState(0);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [phase,     setPhase]     = useState<QuizPhase>('question');

  const q          = quiz.questions[current];
  const totalQ     = quiz.questions.length;
  const isLast     = current === totalQ - 1;
  const progress   = ((current) / totalQ) * 100;

  const isCorrect  = selected !== null && selected === q.correctIndex;

  const handleAnswer = (idx: number) => {
    if (phase !== 'question') return;
    setSelected(idx);
    setPhase('feedback');
    if (idx === q.correctIndex) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (isLast) {
      setPhase('result');
      onComplete?.();
      if (!isPreview && score >= quiz.threshold) onWin?.();
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setPhase('question');
    }
  };

  const reset = () => {
    setCurrent(0);
    setScore(0);
    setSelected(null);
    setPhase('question');
  };

  const won = score >= quiz.threshold;
  const stars = score >= totalQ ? 3 : score >= quiz.threshold ? 2 : 1;

  // ── Result screen ──────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black tracking-tight">Résultat</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-neutral-100 border border-neutral-100 text-center space-y-5">
          {/* Stars */}
          <div className="flex justify-center gap-2 text-2xl">
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} className={i < stars ? 'opacity-100' : 'opacity-25'}>⭐</span>
            ))}
          </div>

          {/* Score */}
          <div>
            <p className="text-5xl font-black">
              {score}<span className="text-2xl text-neutral-400">/{totalQ}</span>
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              {Math.round(score / totalQ * 100)}% de bonnes réponses
            </p>
          </div>

          {/* Coupon / locked */}
          {won ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl border-2 border-dashed"
              style={{ borderColor: themeColor, background: `${themeColor}0F` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: themeColor }}>
                Votre récompense
              </p>
              <p className="text-3xl font-black tracking-wider text-neutral-900">{quiz.coupon.code}</p>
              <p className="text-xs mt-1" style={{ color: themeColor }}>{quiz.coupon.label}</p>
            </motion.div>
          ) : (
            <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100">
              <p className="text-sm text-neutral-400">
                Obtenez {quiz.threshold}/{totalQ} bonnes réponses pour débloquer le coupon
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {!won && (
              <Button variant="outline" className="w-full rounded-full" onClick={reset}>
                <RotateCcw className="w-4 h-4 mr-2" /> Réessayer le quiz
              </Button>
            )}
            {won && (
              <Button
                className="w-full rounded-xl py-6 font-bold text-white"
                style={{ backgroundColor: themeColor }}
              >
                Utiliser en caisse
              </Button>
            )}
            <Button variant="ghost" className="w-full text-xs text-neutral-400" onClick={onClose}>
              Continuer la visite
            </Button>
          </div>
        </div>
      </motion.section>
    );
  }

  // ── Question screen ───────────────────────────────────────────
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight">Quiz Produit</h2>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-neutral-400 font-bold">
          <span>Question {current + 1} / {totalQ}</span>
          <span>{score} bonne{score > 1 ? 's' : ''} réponse{score > 1 ? 's' : ''}</span>
        </div>
        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: themeColor }}
            initial={{ width: `${progress}%` }}
            animate={{ width: `${((current + 1) / totalQ) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-[2rem] p-6 shadow-xl shadow-neutral-100 border border-neutral-100 space-y-5"
        >
          <p className="text-lg font-black leading-tight">{q.text}</p>

          <div className="space-y-2.5">
            {q.choices.map((choice, idx) => {
              let status: 'idle' | 'correct' | 'wrong' | 'dimmed' = 'idle';
              if (phase === 'feedback') {
                if (idx === q.correctIndex) status = 'correct';
                else if (idx === selected)  status = 'wrong';
                else status = 'dimmed';
              }
              return (
                <ChoiceButton
                  key={idx}
                  letter={LETTERS[idx]}
                  text={choice}
                  status={status}
                  onClick={() => handleAnswer(idx)}
                  themeColor={themeColor}
                />
              );
            })}
          </div>

          {/* Feedback */}
          <AnimatePresence>
            {phase === 'feedback' && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl text-sm leading-relaxed border-l-4 ${
                  isCorrect
                    ? 'bg-green-50 text-green-800 border-green-400'
                    : 'bg-red-50 text-red-800 border-red-400'
                }`}
              >
                <span className="font-bold mr-1">{isCorrect ? '✓ Bonne réponse !' : '✗ Pas tout à fait.'}</span>
                {q.explanation}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Next button */}
      <AnimatePresence>
        {phase === 'feedback' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              className="w-full rounded-xl py-6 font-bold text-white"
              style={{ backgroundColor: themeColor }}
              onClick={handleNext}
            >
              {isLast ? 'Voir mon score' : 'Question suivante'} →
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Threshold hint */}
      <p className="text-center text-xs text-neutral-400">
        {quiz.threshold} bonne{quiz.threshold > 1 ? 's' : ''} réponse{quiz.threshold > 1 ? 's' : ''} min. pour débloquer le coupon <span style={{ color: themeColor }}>{quiz.coupon.code}</span>
      </p>
    </motion.section>
  );
};

// ── SetupView sub-component ───────────────────────────────────────

interface QuizSetupProps {
  quiz: QuizConfig;
  onChange: (quiz: QuizConfig) => void;
}

export const QuizSetup: React.FC<QuizSetupProps> = ({ quiz, onChange }) => {
  const updateQuestion = (id: string, field: keyof QuizQuestion, value: string | number | string[]) => {
    onChange({
      ...quiz,
      questions: quiz.questions.map(q => q.id === id ? { ...q, [field]: value } : q),
    });
  };

  return (
    <div className="space-y-4">
      {/* Coupon config */}
      <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Récompense</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Code coupon</label>
            <input
              className="w-full text-sm border border-neutral-200 rounded-xl p-2 bg-white"
              value={quiz.coupon.code}
              onChange={e => onChange({ ...quiz, coupon: { ...quiz.coupon, code: e.target.value } })}
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">Bonnes réponses min.</label>
            <input
              type="number"
              min="1"
              max={quiz.questions.length}
              className="w-full text-sm border border-neutral-200 rounded-xl p-2 bg-white"
              value={quiz.threshold}
              onChange={e => onChange({ ...quiz, threshold: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>
      </div>

      {/* Questions */}
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Questions ({quiz.questions.length})</p>
      {quiz.questions.map((q, qi) => (
        <div key={q.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-3">
          <p className="text-xs font-bold text-neutral-500">Question {qi + 1}</p>
          <textarea
            className="w-full text-sm border border-neutral-200 rounded-xl p-2 bg-white resize-none"
            rows={2}
            value={q.text}
            onChange={e => updateQuestion(q.id, 'text', e.target.value)}
          />
          <div className="space-y-1.5">
            {q.choices.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <button
                  className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-colors ${ci === q.correctIndex ? 'bg-green-500 border-green-500' : 'border-neutral-300'}`}
                  onClick={() => updateQuestion(q.id, 'correctIndex', ci)}
                  title="Marquer comme bonne réponse"
                />
                <input
                  className="flex-1 text-sm border border-neutral-200 rounded-xl p-1.5 bg-white"
                  value={c}
                  onChange={e => {
                    const newChoices = [...q.choices];
                    newChoices[ci] = e.target.value;
                    updateQuestion(q.id, 'choices', newChoices);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
