import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Smartphone, Store, Gift, Layout, ChevronRight, 
  BarChart3, QrCode, Sparkles, Zap, Shield, Globe, MessageCircle,
  Dices, HelpCircle, BookOpen, Music, Video, Ticket, Camera, ShieldCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { normalizeImageUrl } from '../lib/utils';

interface LandingPageProps {
  onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=400&q=80';
  const [heroBackgroundImage, setHeroBackgroundImage] = useState<string>(DEFAULT_HERO_IMAGE);
  const [dragActive, setDragActive] = useState(false);
  const [imageInputValue, setImageInputValue] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem('festiv_landing_hero_image');
      if (saved) {
        setHeroBackgroundImage(saved);
        setImageInputValue(saved);
      }
    } catch (error) {
      console.warn('Unable to restore hero background image:', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('festiv_landing_hero_image', heroBackgroundImage);
    } catch (error) {
      console.warn('Unable to persist hero background image:', error);
    }
  }, [heroBackgroundImage]);

  const applyImageUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setHeroBackgroundImage(DEFAULT_HERO_IMAGE);
      setImageInputValue('');
      return;
    }

    const normalized = normalizeImageUrl(trimmed);

    setHeroBackgroundImage(normalized);
    setImageInputValue(normalized);
  };

  const handleFileSelection = (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        setHeroBackgroundImage(dataUrl);
        setImageInputValue(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-neutral-900 font-sans selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Layout className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">FESTIV<span className="text-indigo-600">.APP</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-neutral-500">
            <a href="#features" className="hover:text-sky-600 transition-colors">Solutions</a>
            <a href="#experience" className="hover:text-sky-600 transition-colors">Expérience</a>
            <a href="#analytics" className="hover:text-sky-600 transition-colors">Impact</a>
          </div>
          <Button onClick={onStart} className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100">
            Accès Plateforme
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4" /> Plateforme SaaS pour Centres Culturels & Musées
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-neutral-900">
              VOS EXPOSITIONS <br />
              <span className="text-indigo-600">INTERACTIVES</span> <br />
              EN UN CLIC.
            </h1>
            <p className="text-xl text-neutral-500 max-w-lg leading-relaxed font-medium">
              Transformez chaque exposition, galerie ou événement culturel en une expérience digitale immersive. 10+ modules interactifs pour captiver les visiteurs et dynamiser vos parcours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={onStart} size="lg" className="rounded-2xl h-16 px-8 bg-indigo-600 hover:bg-indigo-700 text-lg font-bold shadow-xl shadow-indigo-100 gap-2 group">
                Créer une exposition <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl border border-neutral-100 shadow-sm">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/100/100`} alt="User" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">+500 expositions enrichies</p>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Personnaliser l’image de fond</p>
                  <p className="text-sm text-neutral-500">Glissez une photo ici ou collez un lien Google Drive.</p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-semibold text-neutral-600"
                  onClick={() => {
                    setHeroBackgroundImage(DEFAULT_HERO_IMAGE);
                    setImageInputValue('');
                  }}
                >
                  Réinitialiser
                </button>
              </div>

              <div
                className={`mt-3 rounded-2xl border-2 border-dashed p-3 transition-all ${dragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-neutral-200 bg-neutral-50/70'}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFileSelection(e.dataTransfer.files?.[0]);
                }}
                onClick={() => document.getElementById('landing-hero-image-input')?.click()}
              >
                <input
                  id="landing-hero-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelection(e.target.files?.[0])}
                />
                <p className="text-sm font-semibold text-neutral-700">Glissez-déposez une image ici</p>
                <p className="mt-1 text-xs text-neutral-500">PNG, JPG, WebP ou un lien Drive</p>
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  value={imageInputValue}
                  onChange={(e) => setImageInputValue(e.target.value)}
                  onBlur={() => applyImageUrl(imageInputValue)}
                  placeholder="https://drive.google.com/... ou https://..."
                  className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  className="h-10 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white"
                  onClick={() => applyImageUrl(imageInputValue)}
                >
                  Appliquer
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative"
          >
            <div className="relative z-10 mx-auto w-full max-w-[320px] aspect-[9/19] bg-neutral-900 rounded-[3.5rem] p-3 shadow-2xl border-[12px] border-neutral-800 overflow-hidden ring-8 ring-sky-100 rotate-2">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-neutral-800 rounded-b-3xl z-50" />
              <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden">
                <img 
                  src={heroBackgroundImage}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6 text-white">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Exposition Live</p>
                  <h4 className="text-2xl font-black tracking-tight">Découverte Interactive</h4>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <motion.div 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-10 -right-10 bg-white p-4 rounded-2xl shadow-xl border border-neutral-100 flex items-center gap-3 z-20"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Engagement</p>
                <p className="text-lg font-black">+42%</p>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 20, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute bottom-20 -left-10 bg-white p-4 rounded-2xl shadow-xl border border-neutral-100 flex items-center gap-3 z-20"
            >
              <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase">Visites Actives</p>
                <p className="text-lg font-black">2.4k</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">10+ MODULES POUR <span className="text-indigo-600">TOUT</span> ANIMER.</h2>
            <p className="text-neutral-500 max-w-2xl mx-auto font-medium">Une suite complète d'outils interactifs pour enrichir vos galeries, musées et espaces d'expositions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <FeatureCard 
              icon={<Dices className="w-8 h-8" />}
              title="Roue des Découvertes"
              desc="Susciter la curiosité en tirant au sort des anecdotes ou des goodies culturels."
            />
            <FeatureCard 
              icon={<HelpCircle className="w-8 h-8" />}
              title="Quiz Culturel"
              desc="Testez de manière ludique les connaissances des visiteurs sur vos collections."
            />
            <FeatureCard 
              icon={<Gift className="w-8 h-8" />}
              title="Révélation d'Œuvre"
              desc="Un grattage digital interactif pour révéler des anecdotes inédites ou des pass d'accès."
            />
            <FeatureCard 
              icon={<Globe className="w-8 h-8" />}
              title="Story d'Œuvre & Artiste"
              desc="Racontez l'histoire secrète et captivante des pièces maîtresses."
            />
            <FeatureCard 
              icon={<BookOpen className="w-8 h-8" />}
              title="Ateliers & Guides"
              desc="Inspirez vos visiteurs avec des livrets d'accompagnement et tutoriels créatifs."
            />
            <FeatureCard 
              icon={<Music className="w-8 h-8" />}
              title="Audioguide Immersif"
              desc="Diffusez des commentaires d'œuvres, récits sonores ou musiques thématiques."
            />
            <FeatureCard 
              icon={<Video className="w-8 h-8" />}
              title="Coulisses & Vidéos"
              desc="Présentez la restauration d'une œuvre ou l'interview intime d'un artiste."
            />
            <FeatureCard 
              icon={<Ticket className="w-8 h-8" />}
              title="Billet & Invitation"
              desc="Générez de l'intérêt avec des pass, codes d'invitation et cadeaux de boutique."
            />
            <FeatureCard 
              icon={<Camera className="w-8 h-8" />}
              title="Livre d'Or Vidéo"
              desc="Laissez vos visiteurs s'exprimer et partager leurs impressions favorites."
            />
            <FeatureCard 
              icon={<ShieldCheck className="w-8 h-8" />}
              title="Newsletter & Club"
              desc="Fidélisez vos visiteurs et partagez en avant-première vos futurs vernissages."
            />
            <FeatureCard 
              icon={<Sparkles className="w-8 h-8" />}
              title="Œuvres en 3D AR"
              desc="Réalité augmentée pour projeter une œuvre d'art ou un dinosaure en taille réelle."
            />
          </div>
        </div>
      </section>

      {/* Shopper Experience Section */}
      <section id="experience" className="py-24 bg-neutral-900 text-white px-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-sky-600/10 blur-[120px] rounded-full" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none">
              L'EXPÉRIENCE <br />
              <span className="text-sky-500">SANS FRICTION.</span>
            </h2>
            <div className="space-y-6">
              <ExperienceStep 
                number="01" 
                title="Scan Instantané" 
                desc="Le visiteur scanne le QR code placé devant l'œuvre, à l'entrée ou sur son billet." 
              />
              <ExperienceStep 
                number="02" 
                title="Découverte Interactive" 
                desc="Il écoute l'audioguide, résout des énigmes, participe au quiz ou découvre l'histoire." 
              />
              <ExperienceStep 
                number="03" 
                title="Partage & Souvenir" 
                desc="Il laisse une impression vidéo, s'inscrit au club culturel ou télécharge son souvenir." 
              />
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="w-full max-w-md aspect-square bg-sky-600/20 rounded-full flex items-center justify-center border border-sky-500/30">
              <div className="w-3/4 h-3/4 bg-sky-600/30 rounded-full flex items-center justify-center border border-sky-500/40 animate-pulse">
                <Smartphone className="w-24 h-24 text-sky-400" />
              </div>
            </div>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-dashed border-sky-500/20 rounded-full"
            />
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-24 bg-neutral-50 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">UNE VALEUR POUR <span className="text-indigo-600">TOUS.</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                <Store className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black">Direction du Centre</h3>
              <p className="text-neutral-500">Dynamisez vos espaces d'exposition, comprenez les parcours des visiteurs et fidélisez vos publics.</p>
            </div>
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                <Zap className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black">Artistes & Prêteurs</h3>
              <p className="text-neutral-500">Mettez en valeur les œuvres, racontez l'intention créative et analysez l'intérêt suscité en temps réel.</p>
            </div>
            <div className="space-y-4 text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                <Smartphone className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black">Le Visiteur</h3>
              <p className="text-neutral-500">Vivez une visite interactive stimulante, apprenez en vous amusant et gardez un souvenir mémorable.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-indigo-600 rounded-[3rem] p-12 md:p-20 text-center text-white space-y-8 shadow-2xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter relative z-10">PRÊT À RÉVOLUTIONNER <br /> VOS EXPOSITIONS ?</h2>
          <p className="text-indigo-100 text-lg max-w-xl mx-auto font-medium relative z-10">Rejoignez les musées et centres culturels d'avant-garde qui réinventent l'expérience des visiteurs.</p>
          <div className="relative z-10">
            <Button onClick={onStart} size="lg" className="rounded-2xl h-16 px-12 bg-white text-indigo-600 hover:bg-neutral-50 text-xl font-black shadow-xl">
              Démarrer gratuitement
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-neutral-100 px-6 text-center">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Layout className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tighter">FESTIV<span className="text-indigo-600">.APP</span></span>
          </div>
          <p className="text-neutral-400 text-sm font-medium">© 2026 FESTIV.APP. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="p-8 bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group">
    <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-black tracking-tight mb-3">{title}</h3>
    <p className="text-neutral-500 text-sm leading-relaxed font-medium">{desc}</p>
  </div>
);

const ExperienceStep: React.FC<{ number: string; title: string; desc: string }> = ({ number, title, desc }) => (
  <div className="flex gap-6 items-start">
    <span className="text-4xl font-black text-sky-500/30 tracking-tighter">{number}</span>
    <div className="space-y-1">
      <h4 className="text-xl font-bold tracking-tight">{title}</h4>
      <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
    </div>
  </div>
);
