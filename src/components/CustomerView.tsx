import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { 
  Gift, MessageCircle, ChevronRight, BookOpen, Music, 
  Video, Ticket, Play, Pause, ChevronDown, CheckCircle2,
  ArrowRight, Info, Heart, Star, Share2, X, Calendar,
  ExternalLink, QrCode, Dices, HelpCircle, Moon, Sparkles, Store,
  Camera, Box, Smartphone, ShieldCheck, Facebook, Instagram,
  Compass, MapPin, Volume2, Layers, Layout, List,
  Copy, Twitter, Mail, Globe, Send, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { Photobooth } from './Photobooth';
import { Videoboth } from './Videoboth';
import { ARGraffiti } from './ARGraffiti';
const ARViewer = lazy(() => import('./ARViewer').then(m => ({ default: m.ARViewer })));
import { motion, AnimatePresence } from 'motion/react';
import { CampaignConfig, Recipe, Artwork, WallConfig } from '../types';
import { ScratchCard } from './ScratchCard';
import { SpinWheel } from './SpinWheel';
import { QuizModule } from './QuizModule';
import { cn, normalizeImageUrl, normalizeWalls } from '../lib/utils';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { QRCodeSVG } from 'qrcode.react';
import { ExhibitionMap } from './ExhibitionMap';


const translations = {
  fr: {
    welcome: "Bienvenue chez",
    identifyToAccess: "Veuillez vous identifier pour accéder à l'expérience exclusive.",
    skipStep: "Passer l'étape pour le moment",
    continueWith: "Continuer avec",
    days: "Jours",
    hours: "Heures",
    mins: "Mins",
    secs: "Secs",
    parcours: "Le Parcours",
    activites: "Activités & Jeux",
    fresque: "La Fresque",
    sharingTitle: "Partager l'expérience",
    smartDeepLink: "Lien profond intelligent",
    smartDeepLinkDesc: "Générez un lien de partage intelligent. Vos amis atterriront directement sur le contenu exact que vous avez sélectionné !",
    entireExpo: "Exposition entière",
    currentStep: "L'étape actuelle",
    gamesActivities: "Jeux & Activités",
    linkCopied: "Lien de partage copié dans le presse-papiers ! 🎉",
    shareSystem: "Partager via les applications système",
    startAudio: "Démarrer l'audioguide",
    pauseAudio: "Pause",
    viewAR: "Voir l'œuvre en AR",
    validateStep: "Valider cette étape",
    completedStep: "Étape validée",
    noDescription: "Aucune description fournie.",
    backToParcours: "← Retour au parcours",
    scanToAccess: "Scannez pour accéder",
    scanDescription: "Partagez ce QR Code pour faire découvrir l'exposition à un ami.",
    countdownCampaignEnd: "L'exposition se termine dans",
    ended: "Exposition terminée",
    audioGuide: "Audioguide",
    videoGuide: "Vidéo de présentation",
    wheelTitle: "Roue de la Fortune",
    wheelButton: "Tourner la roue",
    wheelInstructions: "Tournez la roue pour tenter de gagner l'un des prix exclusifs !",
    wheelSpinning: "Lancement...",
    quizTitle: "Quiz Culturel",
    quizInstructions: "Testez vos connaissances sur l'exposition et tentez d'obtenir un coupon de réduction !",
    startQuiz: "Démarrer le Quiz",
    questionLabel: "Question",
    nextQuestion: "Question suivante",
    quizSuccess: "Félicitations ! Vous avez réussi le quiz !",
    quizFailure: "Dommage ! Vous n'avez pas obtenu assez de bonnes réponses.",
    couponCode: "Code Coupon",
    couponDesc: "Présentez ce code en caisse pour bénéficier de votre offre.",
    scratchTitle: "Carte à Gratter",
    scratchInstructions: "Grattez la zone grise ci-dessous pour révéler votre surprise !",
    photoboothTitle: "Photobooth Souvenir",
    photoboothInstructions: "Prenez une photo personnalisée avec les couleurs de l'exposition !",
    startPhoto: "Ouvrir le Photobooth",
    storiesTitle: "Notre Histoire",
    recipesTitle: "Livret de Recettes",
    congratsStepValidated: "Félicitations ! Étape du parcours validée avec succès ! 🎉",
    copiedToClipboard: "Copié dans le presse-papiers !",
    shareCampaign: "Découvrez l'exposition",
    shareWith: "de",
    shareCampaignDescription: "une expérience interactive et immersive incroyable !",
    shareStep: "Découvrez l'étape",
    ofExposition: "de l'exposition",
    shareFun: "Je m'amuse sur l'expérience interactive",
    discoverGames: "Découvrez les jeux et activités",
  },
  en: {
    welcome: "Welcome to",
    identifyToAccess: "Please identify yourself to access the exclusive experience.",
    skipStep: "Skip this step for now",
    continueWith: "Continue with",
    days: "Days",
    hours: "Hours",
    mins: "Mins",
    secs: "Secs",
    parcours: "The Exhibition Path",
    activites: "Games & Activities",
    fresque: "The Mural",
    sharingTitle: "Share the Experience",
    smartDeepLink: "Smart Deep Link",
    smartDeepLinkDesc: "Generate a smart sharing link. Your friends will land directly on the exact content you selected!",
    entireExpo: "Entire Exhibition",
    currentStep: "Current Step",
    gamesActivities: "Games & Activities",
    linkCopied: "Sharing link copied to clipboard! 🎉",
    shareSystem: "Share via system apps",
    startAudio: "Start Audio Guide",
    pauseAudio: "Pause",
    viewAR: "View Artwork in AR",
    validateStep: "Validate this step",
    completedStep: "Step validated",
    noDescription: "No description provided.",
    backToParcours: "← Back to Exhibition Path",
    scanToAccess: "Scan to Access",
    scanDescription: "Share this QR Code to introduce a friend to the exhibition.",
    countdownCampaignEnd: "The exhibition ends in",
    ended: "Exhibition ended",
    audioGuide: "Audio Guide",
    videoGuide: "Video Presentation",
    wheelTitle: "Lucky Spin Wheel",
    wheelButton: "Spin the Wheel",
    wheelInstructions: "Spin the wheel to try and win exclusive prizes!",
    wheelSpinning: "Spinning...",
    quizTitle: "Cultural Quiz",
    quizInstructions: "Test your knowledge about the exhibition and try to unlock a discount coupon!",
    startQuiz: "Start the Quiz",
    questionLabel: "Question",
    nextQuestion: "Next Question",
    quizSuccess: "Congratulations! You successfully passed the quiz!",
    quizFailure: "Too bad! You didn't get enough correct answers.",
    couponCode: "Coupon Code",
    couponDesc: "Show this code at the checkout to redeem your offer.",
    scratchTitle: "Scratch Card",
    scratchInstructions: "Scratch the gray zone below to reveal your surprise!",
    photoboothTitle: "Souvenir Photobooth",
    photoboothInstructions: "Take a personalized photo customized with the exhibition theme colors!",
    startPhoto: "Open the Photobooth",
    storiesTitle: "Our Story",
    recipesTitle: "Recipe Booklet",
    congratsStepValidated: "Exhibition step validated successfully! 🎉",
    copiedToClipboard: "Copied to clipboard!",
    shareCampaign: "Discover the exhibition",
    shareWith: "by",
    shareCampaignDescription: "an amazing interactive and immersive experience!",
    shareStep: "Discover step",
    ofExposition: "of the exhibition",
    shareFun: "I'm having fun on the interactive experience",
    discoverGames: "Discover the games and activities",
  }
};

interface CustomerViewProps {
  config: CampaignConfig;
  isPreview?: boolean;
}

export const CustomerView: React.FC<CustomerViewProps> = ({ config, isPreview }) => {
  const [lang, setLang] = useState<'fr' | 'en'>(config.language || 'fr');
  const [heroImage, setHeroImage] = useState<string>(() => {
    const configImage = config.story?.imageUrl;

    if (typeof window === 'undefined') {
      return normalizeImageUrl(configImage || 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80');
    }

    try {
      const saved = window.localStorage.getItem('festiv_landing_hero_image');
      // Always prioritize campaign-configured hero image over local browser cache.
      return normalizeImageUrl(configImage || saved || 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80');
    } catch (error) {
      console.warn('Unable to restore customer hero image:', error);
      return normalizeImageUrl(configImage || 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80');
    }
  });

  useEffect(() => {
    if (config.language) {
      setLang(config.language);
    }
  }, [config.language]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem('festiv_landing_hero_image');
      if (config.story?.imageUrl) {
        setHeroImage(normalizeImageUrl(config.story.imageUrl));
      } else if (saved) {
        setHeroImage(normalizeImageUrl(saved));
      }
    } catch (error) {
      console.warn('Unable to restore customer hero image:', error);
    }
  }, [config.story?.imageUrl]);

  const t = (key: keyof typeof translations.fr) => {
    return translations[lang]?.[key] || translations.fr[key];
  };

  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scratched, setScratched] = useState(false);
  const [scratchUnlocked, setScratchUnlocked] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [socialAuthenticated, setSocialAuthenticated] = useState(false);
  const audioInstance = useRef<HTMLAudioElement | null>(null);

  // Urban Route State
  const [selectedWall, setSelectedWall] = useState<WallConfig | null>(() => {
    const wallId = new URLSearchParams(window.location.search).get('wall');
    if (wallId) {
      const found = normalizeWalls(config).find(w => w.id === wallId);
      if (found) return found;
    }
    return null;
  });

  const [wallAudioPlaying, setWallAudioPlaying] = useState<string | null>(null);
  const wallAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (wallAudioRef.current) {
      wallAudioRef.current.pause();
      wallAudioRef.current = null;
    }

    if (wallAudioPlaying && selectedWall && selectedWall.audioUrl) {
      // Pause global background music if playing
      setIsPlaying(false);
      
      const audio = new Audio(selectedWall.audioUrl);
      wallAudioRef.current = audio;
      audio.play().catch((err) => {
        console.error("Erreur de lecture de l'audioguide du mur:", err);
        setWallAudioPlaying(null);
      });
      audio.onended = () => {
        setWallAudioPlaying(null);
      };
    }

    return () => {
      if (wallAudioRef.current) {
        wallAudioRef.current.pause();
        wallAudioRef.current = null;
      }
    };
  }, [wallAudioPlaying, selectedWall]);

  const [completedWalls, setCompletedWalls] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`completed_walls_${config.id || 'default'}`) || '[]');
    } catch (err) {
      return [];
    }
  });

  const [activeTab, setActiveTab] = useState<'parcours' | 'activites' | 'fresque'>('parcours');
  const [showARGraffiti, setShowARGraffiti] = useState(false);
  const [graffitiList, setGraffitiList] = useState<any[]>([]);
  const [loadingGraffiti, setLoadingGraffiti] = useState(false);

  const fetchApprovedGraffiti = async () => {
    setLoadingGraffiti(true);
    try {
      const response = await fetch(`/api/campaigns/${config.id}/graffiti`);
      if (response.ok) {
        const data = await response.json();
        setGraffitiList(data);
      }
    } catch (err) {
      console.error('Error fetching approved graffiti:', err);
    } finally {
      setLoadingGraffiti(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'fresque') {
      fetchApprovedGraffiti();
    }
  }, [activeTab]);

  const [parcoursViewMode, setParcoursViewMode] = useState<'gps_map' | 'plan' | 'list'>('gps_map');
  const [selectedPoiMarker, setSelectedPoiMarker] = useState<any | null>(null);
  const [arArtwork, setArArtwork] = useState<Artwork | null>(null);

  // Social Sharing & Custom Deep-Linking State
  const [shareTarget, setShareTarget] = useState<'global' | 'wall' | 'tab'>('global');

  useEffect(() => {
    if (selectedWall) {
      setShareTarget('wall');
    } else if (activeTab === 'activites') {
      setShareTarget('tab');
    } else {
      setShareTarget('global');
    }
  }, [selectedWall, activeTab]);

  const getShareUrl = (target: 'global' | 'wall' | 'tab') => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://festiv.app';
    const basePath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const url = new URL(basePath, origin);
    url.searchParams.set('id', config.id);

    if (target === 'wall' && selectedWall) {
      url.searchParams.set('wall', selectedWall.id);
    } else if (target === 'tab') {
      url.searchParams.set('tab', activeTab);
    }
    return url.toString();
  };

  const getShareText = (target: 'global' | 'wall' | 'tab') => {
    if (target === 'wall' && selectedWall) {
      return lang === 'fr'
        ? `Découvrez l'étape "${selectedWall.name}" de l'exposition "${config.name}" chez ${config.brandName} ! 🎨📍`
        : `Discover step "${selectedWall.name}" of the exhibition "${config.name}" at ${config.brandName}! 🎨📍`;
    }
    if (target === 'tab') {
      return lang === 'fr'
        ? `Je m'amuse sur l'expérience interactive "${config.name}" de ${config.brandName} ! Découvrez les jeux et activités 🎮✨`
        : `I'm having fun on the "${config.name}" interactive experience by ${config.brandName}! Discover the games and activities 🎮✨`;
    }
    return lang === 'fr'
      ? `Découvrez l'exposition "${config.name}" de ${config.brandName}, une expérience interactive et immersive incroyable ! 🌐🎨`
      : `Discover the exhibition "${config.name}" by ${config.brandName}, an amazing interactive and immersive experience! 🌐🎨`;
  };

  const markWallCompleted = (wallId: string) => {
    if (completedWalls.includes(wallId)) return;
    const newCompleted = [...completedWalls, wallId];
    setCompletedWalls(newCompleted);
    localStorage.setItem(`completed_walls_${config.id || 'default'}`, JSON.stringify(newCompleted));
    toast.success("Félicitations ! Étape du parcours validée avec succès ! 🎉");
    pushToGoogleSheets("Étape Validée", `Mur visité: "${wallId}"`);
    pushToGoogleChat(`🗺️ *Parcours*: Un visiteur a validé le mur *"${wallId}"* de l'exposition !`);
  };

  const handleShareCapsule = async (wall: WallConfig, artworkTitle?: string) => {
    trackShare('whatsapp');
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://festiv.app';
    const basePath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const shareUrl = new URL(basePath, origin);
    shareUrl.searchParams.set('id', config.id);
    shareUrl.searchParams.set('wall', wall.id);

    const title = artworkTitle ? `${artworkTitle} — ${wall.name}` : wall.name;
    const text = lang === 'fr'
      ? `Découvrez "${title}" dans l'exposition "${config.name}" (${config.brandName}) ! 📍✨`
      : `Discover "${title}" in the exhibition "${config.name}" (${config.brandName})! 📍✨`;

    const fullUrl = shareUrl.toString();

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: fullUrl,
        });
        toast.success(lang === 'fr' ? "Lien de la capsule partagé !" : "Capsule link shared!");
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Lien de la capsule copié dans le presse-papier ! 🔗");
    } catch {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text + " " + fullUrl)}`;
      window.open(waUrl, '_blank');
    }
  };

  const themeColor = config.themeColor || '#4f46e5';
  const isExpired = config.expiresAt ? new Date(config.expiresAt + 'T23:59:59') < new Date() : false;
  const isRamadan = config.name.toLowerCase().includes('ramadan');
  const isNoel = config.name.toLowerCase().includes('noël') || config.name.toLowerCase().includes('christmas');

  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, mins: number } | null>(null);
  const [eventCountdown, setEventCountdown] = useState<{ days: number, hours: number, mins: number, secs: number } | null>(null);

  useEffect(() => {
    if (!config.countdown?.enabled || !config.countdown.targetDate) {
      setEventCountdown(null);
      return;
    }
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(config.countdown!.targetDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        setEventCountdown(null);
        clearInterval(timer);
      } else {
        setEventCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          secs: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [config.countdown?.targetDate, config.countdown?.enabled]);

  useEffect(() => {
    if (!config.expiresAt) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(config.expiresAt + 'T23:59:59').getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft(null);
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          mins: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [config.expiresAt]);

  useEffect(() => {
    if (config.audio?.enabled && config.audio.url) {
      audioInstance.current = new Audio(config.audio.url);
      audioInstance.current.loop = true;
      audioInstance.current.onended = () => setIsPlaying(false);
    }
    return () => {
      if (audioInstance.current) {
        audioInstance.current.pause();
        audioInstance.current = null;
      }
    };
  }, [config.audio?.url, config.audio?.enabled]);

  useEffect(() => {
    if (isPlaying) {
      audioInstance.current?.play().catch(console.error);
    } else {
      audioInstance.current?.pause();
    }
  }, [isPlaying]);

  const trackEvent = (field: string) => {
    if (!config.id || isPreview) return;
    
    fetch(`/api/campaigns/${config.id}/increment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ field })
    }).catch(err => {
      console.error('PostgreSQL increment failed:', err);
    });
  };

  const trackShare = (platform: 'whatsapp' | 'instagram' | 'tiktok') => {
    if (!config.id || isPreview) return;

    fetch(`/api/campaigns/${config.id}/increment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ field: `shares.${platform}` })
    }).catch(err => {
      console.error('PostgreSQL share increment failed:', err);
    });
  };

  // ==========================================
  // Google Workspace Synchronization Helpers
  // ==========================================

  const pushToGoogleSheets = async (actionType: string, details: string) => {
    const sheetsConf = config.workspace?.sheets;
    if (!sheetsConf?.enabled || !sheetsConf.spreadsheetId) return;

    try {
      const timestamp = new Date().toLocaleString('fr-FR');
      // Visitor info from social authentication or default to generic visitor
      const visitorName = sessionStorage.getItem('visitor_name') || 'Visiteur Anonyme';
      const row = [
        timestamp,
        actionType,
        visitorName,
        config.name,
        config.brandName,
        details
      ];

      const response = await fetch(`/api/campaigns/${config.id}/workspace/sheets-append`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: sheetsConf.spreadsheetId,
          range: sheetsConf.range || 'Visiteurs!A1',
          row
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      console.log('Synchronisé avec Google Sheets !');
    } catch (err) {
      console.error('Erreur de synchronisation Google Sheets:', err);
    }
  };

  const pushToGoogleChat = async (message: string) => {
    const chatConf = config.workspace?.chat;
    if (!chatConf?.enabled || !chatConf.spaceId) return;

    try {
      const response = await fetch(`/api/campaigns/${config.id}/workspace/chat-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: chatConf.spaceId,
          text: message
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      console.log('Notification envoyée à Google Chat !');
    } catch (err) {
      console.error('Erreur d\'envoi Google Chat:', err);
    }
  };

  const handleSaveMediaToDrive = async (base64OrBlob: string | Blob, mimeType: string) => {
    const driveConf = config.workspace?.drive;
    if (!driveConf?.enabled || !driveConf.folderId) {
      toast.error("L'intégration Google Drive n'est pas activée par l'administrateur.");
      throw new Error("Google Drive not configured");
    }

    try {
      const isVideo = mimeType.startsWith('video');
      let ext = 'jpg';
      if (isVideo) {
        ext = mimeType.includes('webm') ? 'webm' : 'mp4';
      } else {
        ext = mimeType.includes('png') ? 'png' : 'jpg';
      }
      const fileName = `Souvenir_${Date.now()}.${ext}`;

      // Ensure we have a Blob to upload as raw binary
      let fileBlob: Blob;
      if (base64OrBlob instanceof Blob) {
        fileBlob = base64OrBlob;
      } else {
        // If it's a data URL, fetch it and convert to a Blob
        const responseBlob = await fetch(base64OrBlob);
        fileBlob = await responseBlob.blob();
      }

      // Check size limit: 30MB
      if (fileBlob.size > 30 * 1024 * 1024) {
        throw new Error("Le fichier dépasse la limite autorisée de 30 Mo.");
      }

      const url = `/api/campaigns/${config.id}/workspace/drive-upload?fileName=${encodeURIComponent(fileName)}&mimeType=${encodeURIComponent(mimeType)}&folderId=${encodeURIComponent(driveConf.folderId)}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: fileBlob
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur lors du transfert : ${errText}`);
      }

      // Also write log to sheets
      await pushToGoogleSheets(
        isVideo ? "Vidéo Souvenir Capturée" : "Photo Souvenir Capturée", 
        `Fichier: ${fileName}`
      );

      // And send notification to Google Chat
      await pushToGoogleChat(
        `📸 *Souvenir*: Un nouveau souvenir de visite (*${fileName}*) a été enregistré dans le dossier Google Drive de l'Exposition ! ☁️`
      );
    } catch (err: any) {
      console.error("Échec de la sauvegarde sur Google Drive:", err);
      toast.error(err.message || "Impossible de sauvegarder sur Google Drive. Les accès de l'administrateur ont expiré ou sont invalides.");
      throw err;
    }
  };

  const handleSocialLogin = async (provider: string) => {
    if (!config.id || isPreview) {
      setSocialAuthenticated(true);
      return;
    }

    try {
      // Save lead to PostgreSQL
      await fetch(`/api/campaigns/${config.id}/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ field: 'leads' })
      });

      await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaignId: config.id,
          campaignName: config.name,
          provider
        })
      });

      sessionStorage.setItem('visitor_name', `Utilisateur ${provider}`);
      setSocialAuthenticated(true);
      toast.success(`Connecté avec ${provider}`);
      pushToGoogleSheets("Identification Réussie", `Authentification via ${provider}`);
      pushToGoogleChat(`🔐 *Identification*: Un visiteur s'est identifié via *${provider}* sur l'Exposition *"${config.name}"* !`);
    } catch (err) {
      console.error("Error saving lead to PostgreSQL:", err);
      sessionStorage.setItem('visitor_name', `Utilisateur ${provider}`);
      setSocialAuthenticated(true); // Still let them in if DB fails
    }
  };

  useEffect(() => {
    trackEvent('scans');
    pushToGoogleSheets("Scan de l'Exposition", "Entrée sur la page de médiation");
    pushToGoogleChat(`👥 *Visite*: Un visiteur a scanné le QR code de l'Exposition *"${config.name}"* chez *${config.brandName}* !`);
  }, []);

  const handleScratchComplete = () => {
    setScratched(true);
    setScratchUnlocked(true);
    trackEvent('gamesCompleted');
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(`Bonjour ${config.brandName}, je scanne votre produit ${config.name} !`);
    window.open(`https://wa.me/${config.whatsapp}?text=${message}`, '_blank');
  };

  if (isExpired && !isPreview) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center">
          <Calendar className="w-10 h-10 text-neutral-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">{t('ended')}</h1>
          <p className="text-neutral-500">
            {lang === 'fr' 
              ? "Cette offre n'est plus disponible. Merci de votre intérêt !" 
              : "This campaign is no longer available. Thank you for your interest!"}
          </p>
        </div>
        <Button 
          variant="outline" 
          className="rounded-full px-8"
          onClick={() => window.location.reload()}
        >
          {lang === 'fr' ? "Actualiser" : "Refresh"}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-neutral-900 selection:bg-indigo-100 relative overflow-x-hidden">
      
      {/* Atmospheric Background (Recipe 7) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] opacity-20"
          style={{ backgroundColor: themeColor }}
        />
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] opacity-10"
          style={{ backgroundColor: themeColor }}
        />
        
        {/* Festive Overlays */}
        {isRamadan && (
          <div className="absolute top-10 right-10 opacity-10 animate-pulse">
            <Moon className="w-32 h-32 text-indigo-900" />
          </div>
        )}
        {isNoel && (
          <div className="absolute top-10 right-10 opacity-10 animate-pulse">
            <Sparkles className="w-32 h-32 text-red-900" />
          </div>
        )}
      </div>

      <div className="relative z-10">
        {/* Social Entry Gate */}
        {config.socialEntry?.enabled && !socialAuthenticated && !isPreview && (
          <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-md space-y-8 text-center"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mx-auto">
                <ShieldCheck className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black tracking-tighter">{t('welcome')} {config.brandName}</h2>
                <p className="text-neutral-500 font-medium">{t('identifyToAccess')}</p>
              </div>
              
              <div className="grid gap-3">
                {config.socialEntry.providers.includes('facebook') && (
                  <Button 
                    onClick={() => handleSocialLogin('Facebook')}
                    className="h-14 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold gap-3"
                  >
                    <Facebook className="w-5 h-5 fill-current" /> {t('continueWith')} Facebook
                  </Button>
                )}
                {config.socialEntry.providers.includes('instagram') && (
                  <Button 
                    onClick={() => handleSocialLogin('Instagram')}
                    className="h-14 rounded-2xl bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] hover:opacity-90 text-white font-bold gap-3"
                  >
                    <Instagram className="w-5 h-5" /> {t('continueWith')} Instagram
                  </Button>
                )}
                {config.socialEntry.providers.includes('tiktok') && (
                  <Button 
                    onClick={() => handleSocialLogin('TikTok')}
                    className="h-14 rounded-2xl bg-black hover:bg-neutral-900 text-white font-bold gap-3"
                  >
                    <Smartphone className="w-5 h-5" /> {t('continueWith')} TikTok
                  </Button>
                )}
                {config.socialEntry.providers.includes('whatsapp') && (
                  <Button 
                    onClick={() => handleSocialLogin('WhatsApp')}
                    className="h-14 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3"
                  >
                    <MessageCircle className="w-5 h-5 fill-current" /> {t('continueWith')} WhatsApp
                  </Button>
                )}
              </div>

              {!config.socialEntry.required && (
                <button 
                  onClick={() => setSocialAuthenticated(true)}
                  className="text-xs font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-600"
                >
                  {t('skipStep')}
                </button>
              )}
            </motion.div>
          </div>
        )}

        {/* Hero Section */}
        <header className="relative h-[45vh] overflow-hidden">
          <div className="absolute inset-0">
            <img 
              src={heroImage}
              alt={config.brandName}
              className="w-full h-full object-cover scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#FDFCFB] via-transparent to-black/30" />
          </div>
          
          <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
            <button 
              onClick={() => {
                const nextLang = lang === 'fr' ? 'en' : 'fr';
                setLang(nextLang);
                toast.success(nextLang === 'fr' ? "Langue changée en Français ! 🇫🇷" : "Language switched to English! 🇬🇧");
              }}
              className="px-3 py-2 bg-white/45 backdrop-blur-xl rounded-full shadow-lg text-neutral-800 hover:bg-white/60 transition-all border border-white/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>{lang === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}</span>
            </button>
            <button 
              onClick={() => setShowQR(true)}
              className="p-3 bg-white/40 backdrop-blur-xl rounded-full shadow-lg text-white hover:bg-white/60 transition-all border border-white/20"
            >
              <QrCode className="w-5 h-5" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 space-y-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 bg-white/35 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-white border border-white/20 shadow-sm"
            >
              {config.logoUrl ? (
                <img src={normalizeImageUrl(config.logoUrl)} alt="Logo" className="w-4 h-4 rounded-full object-cover bg-white/20" referrerPolicy="no-referrer" />
              ) : (
                <Info className="w-3 h-3" />
              )}
              {config.brandName}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', damping: 15 }}
              className="text-5xl font-black tracking-tighter leading-[0.85] text-neutral-900"
            >
              {config.name}
            </motion.h1>
          </div>
        </header>

        <main className="px-6 py-8 space-y-10">
          {/* Event Countdown */}
          {eventCountdown && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-neutral-900 rounded-[2.5rem] p-6 text-white overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 blur-3xl rounded-full -mr-16 -mt-16" />
              <div className="relative z-10 space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">{config.countdown?.label}</p>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <p className="text-3xl font-black tracking-tighter">{eventCountdown.days.toString().padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">{t('days')}</p>
                  </div>
                  <div className="text-neutral-700 font-black text-2xl">:</div>
                  <div className="text-center">
                    <p className="text-3xl font-black tracking-tighter">{eventCountdown.hours.toString().padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">{t('hours')}</p>
                  </div>
                  <div className="text-neutral-700 font-black text-2xl">:</div>
                  <div className="text-center">
                    <p className="text-3xl font-black tracking-tighter">{eventCountdown.mins.toString().padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">{t('mins')}</p>
                  </div>
                  <div className="text-neutral-700 font-black text-2xl">:</div>
                  <div className="text-center">
                    <p className="text-3xl font-black tracking-tighter text-indigo-400">{eventCountdown.secs.toString().padStart(2, '0')}</p>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-neutral-500">{t('secs')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab Switcher Header */}
          <div className="flex bg-neutral-100 p-1.5 rounded-[1.8rem] gap-1">
            <button 
              className={cn(
                "flex-1 py-3.5 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                activeTab === 'parcours' 
                  ? "bg-white text-neutral-950 shadow-sm" 
                  : "text-neutral-500 hover:text-neutral-900"
              )}
              onClick={() => setActiveTab('parcours')}
            >
              <Compass className="w-4 h-4" style={{ color: activeTab === 'parcours' ? themeColor : undefined }} /> {t('parcours')}
            </button>
            <button 
              className={cn(
                "flex-1 py-3.5 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                activeTab === 'activites' 
                  ? "bg-white text-neutral-950 shadow-sm" 
                  : "text-neutral-500 hover:text-neutral-900"
              )}
              onClick={() => setActiveTab('activites')}
            >
              <Gift className="w-4 h-4" style={{ color: activeTab === 'activites' ? themeColor : undefined }} /> {t('activites')}
            </button>
            <button 
              className={cn(
                "flex-1 py-3.5 rounded-[1.5rem] text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                activeTab === 'fresque' 
                  ? "bg-white text-neutral-950 shadow-sm" 
                  : "text-neutral-500 hover:text-neutral-900"
              )}
              onClick={() => setActiveTab('fresque')}
            >
              <Layers className="w-4 h-4" style={{ color: activeTab === 'fresque' ? themeColor : undefined }} /> {t('fresque')}
            </button>
          </div>

          {/* Conditional Content by Tab */}
          {activeTab === 'parcours' && (
            <div className="space-y-6">
              {!selectedWall ? (
                <>
                  {/* Progress header */}
                  <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Votre Progression</p>
                        <h3 className="text-base font-black tracking-tight">Parcours de l'Exposition</h3>
                      </div>
                      <span className="text-xs font-bold px-3.5 py-1.5 bg-neutral-50 text-neutral-600 rounded-full border border-neutral-100">
                        {completedWalls.filter(id => normalizeWalls(config).some(w => w.id === id)).length} / {normalizeWalls(config).length} Murs
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.round((completedWalls.filter(id => normalizeWalls(config).some(w => w.id === id)).length / normalizeWalls(config).length) * 100) || 0}%`,
                          backgroundColor: themeColor 
                        }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                      Scannez chaque jédir/wall dans la ville, admirez les œuvres d'art exclusives et profitez d'anecdotes uniques en Réalité Augmentée verticale !
                    </p>
                  </div>

                  {/* View Mode Switcher (Carte GPS, Plan d'Intérieur, Liste) */}
                  <div className="flex bg-neutral-100 p-1.5 rounded-2xl border border-neutral-200/50">
                    <button
                      onClick={() => setParcoursViewMode('gps_map')}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                        parcoursViewMode === 'gps_map'
                          ? "bg-white text-neutral-900 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-850"
                      )}
                    >
                      <MapPin className="w-4 h-4 text-sky-600" /> Carte GPS 📍
                    </button>

                    {config.mediaWallLayout?.enabled && config.mediaWallLayout?.imageUrl && (
                      <button
                        onClick={() => setParcoursViewMode('plan')}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                          parcoursViewMode === 'plan'
                            ? "bg-white text-neutral-900 shadow-xs"
                            : "text-neutral-500 hover:text-neutral-850"
                        )}
                      >
                        <Layout className="w-4 h-4" style={{ color: parcoursViewMode === 'plan' ? themeColor : undefined }} /> Plan Intérieur 🗺️
                      </button>
                    )}

                    <button
                      onClick={() => setParcoursViewMode('list')}
                      className={cn(
                        "flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                        parcoursViewMode === 'list'
                          ? "bg-white text-neutral-900 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-850"
                      )}
                    >
                      <List className="w-4 h-4" style={{ color: parcoursViewMode === 'list' ? themeColor : undefined }} /> Liste 📋
                    </button>
                  </div>

                  {parcoursViewMode === 'gps_map' ? (
                    <ExhibitionMap
                      walls={normalizeWalls(config)}
                      completedWalls={completedWalls}
                      themeColor={themeColor}
                      selectedWall={selectedWall}
                      onSelectWall={(wall) => setSelectedWall(wall)}
                      onMarkCompleted={(wallId) => markWallCompleted(wallId)}
                    />
                  ) : parcoursViewMode === 'plan' && config.mediaWallLayout?.enabled && config.mediaWallLayout?.imageUrl ? (
                    <div className="space-y-6">
                      {/* Interactive Visual Floor Plan / Layout Container */}
                      <div className="bg-white p-4 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-neutral-800 uppercase tracking-wider">Plan de l'Exposition</h4>
                          <p className="text-[11px] text-neutral-500 font-medium">Touchez un marqueur numéroté pour dévoiler les œuvres, écouter l'audioguide et explorer les détails.</p>
                        </div>

                        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-neutral-150 shadow-inner bg-neutral-950">
                          <img 
                            src={config.mediaWallLayout.imageUrl} 
                            alt="Exposition Plan" 
                            className="w-full h-full object-cover select-none pointer-events-none"
                            referrerPolicy="no-referrer"
                          />
                          {/* Ambient pulse on plan background */}
                          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:16px_16px]" />

                          {/* Render POIs */}
                          {(config.mediaWallLayout.pois || []).map((poi: any, pIdx: number) => {
                            const isSelected = selectedPoiMarker?.id === poi.id;
                            const linkedWall = normalizeWalls(config).find(w => w.id === poi.associatedWallId);
                            const isCompleted = linkedWall ? completedWalls.includes(linkedWall.id) : false;

                            return (
                              <button
                                key={poi.id || pIdx}
                                style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                                onClick={() => setSelectedPoiMarker(poi)}
                                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 hover:scale-110 transition-transform focus:outline-none"
                              >
                                {isSelected ? (
                                  <span className="absolute -inset-3.5 rounded-full bg-white/40 animate-ping pointer-events-none" />
                                ) : !isCompleted && (
                                  <span className="absolute -inset-3 rounded-full opacity-60 animate-pulse pointer-events-none" style={{ backgroundColor: themeColor + '30' }} />
                                )}

                                <div 
                                  className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center border-2 text-xs font-black shadow-md transition-all",
                                    isSelected
                                      ? "bg-neutral-950 border-white text-white scale-110"
                                      : isCompleted
                                        ? "bg-green-600 border-green-100 text-white"
                                        : "bg-white border-neutral-200"
                                  )}
                                  style={{ 
                                    borderColor: !isSelected && !isCompleted ? themeColor : undefined,
                                    color: !isSelected && !isCompleted ? themeColor : undefined
                                  }}
                                >
                                  {isCompleted ? "✓" : pIdx + 1}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Display Selected POI details card */}
                      {selectedPoiMarker ? (() => {
                        const linkedWall = normalizeWalls(config).find(w => w.id === selectedPoiMarker.associatedWallId);
                        const isCompleted = linkedWall ? completedWalls.includes(linkedWall.id) : false;

                        return (
                          <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-200">
                            <div className="flex justify-between items-start gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md text-neutral-500 bg-neutral-50 border border-neutral-150">
                                  Point d'Intérêt {config.mediaWallLayout.pois.findIndex((p: any) => p.id === selectedPoiMarker.id) + 1}
                                </span>
                                <h4 className="text-lg font-black text-neutral-900 tracking-tight">{selectedPoiMarker.name}</h4>
                                <p className="text-xs text-neutral-500 font-medium leading-relaxed">{selectedPoiMarker.description}</p>
                              </div>
                              <button 
                                onClick={() => setSelectedPoiMarker(null)}
                                className="text-xs font-bold text-neutral-400 hover:text-neutral-700 bg-neutral-50 hover:bg-neutral-100 px-3 py-1.5 rounded-full border border-neutral-100"
                              >
                                Fermer ×
                              </button>
                            </div>

                            {linkedWall ? (
                              <div className="pt-4 border-t border-neutral-100 space-y-4">
                                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-150 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                                      <Layers className="w-3.5 h-3.5 text-indigo-500" /> Étape associée au parcours
                                    </span>
                                    {isCompleted && (
                                      <span className="text-[9px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                        Déjà visité ✓
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-sm font-bold text-neutral-800 leading-tight">{linkedWall.name}</h5>
                                  <p className="text-xs text-neutral-500 font-medium line-clamp-2">{linkedWall.description}</p>

                                  {/* Artworks thumbnails inside the active POI card */}
                                  {linkedWall.artworks && linkedWall.artworks.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Œuvres à découvrir ({linkedWall.artworks.length}) :</p>
                                      <div className="flex gap-2 overflow-x-auto pb-1">
                                        {linkedWall.artworks.map((art: any) => (
                                          <div key={art.id} className="relative w-12 h-12 rounded-lg overflow-hidden border border-neutral-200 flex-shrink-0">
                                            <img src={art.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Directly play audio or video from the map layout! */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {linkedWall.audioUrl && (
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 space-y-1.5">
                                      <p className="text-[9px] font-black uppercase tracking-wider text-blue-600 flex items-center gap-1">
                                        <Music className="w-3.5 h-3.5" /> Écouter l'Audioguide
                                      </p>
                                      <audio src={linkedWall.audioUrl} controls className="w-full h-7" />
                                    </div>
                                  )}

                                  {linkedWall.videoUrl && (
                                    <button
                                      onClick={() => {
                                        window.open(linkedWall.videoUrl, '_blank');
                                      }}
                                      className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-center justify-between hover:bg-rose-50 transition-all text-left"
                                    >
                                      <div className="space-y-0.5">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-rose-600 flex items-center gap-1">
                                          <Video className="w-3.5 h-3.5" /> Vidéo de l'Étape
                                        </p>
                                        <p className="text-[10px] text-neutral-500 font-bold">Lancer le lecteur vidéo</p>
                                      </div>
                                      <ExternalLink className="w-4 h-4 text-rose-400" />
                                    </button>
                                  )}
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    className="flex-1 rounded-xl h-11 font-bold text-xs text-white"
                                    style={{ backgroundColor: themeColor }}
                                    onClick={() => setSelectedWall(linkedWall)}
                                  >
                                    Découvrir l'Étape Complète <ChevronRight className="w-4 h-4 ml-1" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="rounded-xl h-11 px-3.5 font-bold text-xs gap-1.5 border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                                    onClick={() => handleShareCapsule(linkedWall)}
                                    title="Partager cette capsule"
                                  >
                                    <Share2 className="w-4 h-4 text-indigo-600" />
                                    <span className="hidden sm:inline">Partager</span>
                                  </Button>
                                  {linkedWall.latitude && linkedWall.longitude && (
                                    <Button 
                                      variant="outline"
                                      className="rounded-xl h-11 font-bold text-xs gap-1 border-neutral-200"
                                      onClick={() => {
                                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${linkedWall.latitude},${linkedWall.longitude}&travelmode=walking`, '_blank');
                                      }}
                                    >
                                      <MapPin className="w-4 h-4 text-neutral-500" /> Itinéraire
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="pt-3 border-t border-dashed border-neutral-150">
                                <p className="text-xs text-neutral-400 font-medium italic flex items-center gap-1">
                                  💡 Point d'information libre non rattaché à un mur physique.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="bg-neutral-50 p-6 rounded-[2.5rem] border border-neutral-100 text-center text-neutral-400 text-xs font-semibold">
                          👋 Touchez l'un des points numérotés sur le plan ci-dessus pour lancer la visite interactive.
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Walls List */
                    <div className="space-y-4">
                      {normalizeWalls(config).map((wall) => {
                        const isCompleted = completedWalls.includes(wall.id);
                        return (
                          <div 
                            key={wall.id}
                            className="bg-white rounded-[2.2rem] border border-neutral-100 p-6 flex flex-col justify-between hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                          >
                            {isCompleted && (
                              <div className="absolute top-4 right-4 bg-green-50 text-green-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border border-green-200">
                                <CheckCircle2 className="w-3 h-3" /> Visité
                              </div>
                            )}
                            
                            <div className="space-y-2">
                              <h4 className="text-lg font-black tracking-tight pr-16">{wall.name}</h4>
                              <p className="text-xs text-neutral-500 leading-relaxed font-medium line-clamp-2">{wall.description}</p>
                            </div>

                            <div className="flex items-center gap-2 text-xs font-bold text-neutral-400">
                              <Box className="w-4 h-4 text-neutral-300" />
                              <span>{wall.artworks?.length || 0} œuvres d'art à découvrir</span>
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button 
                                className="flex-1 rounded-xl h-11 font-bold text-xs text-white"
                                style={{ backgroundColor: themeColor }}
                                onClick={() => setSelectedWall(wall)}
                              >
                                Découvrir ce mur <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>

                              <Button
                                variant="outline"
                                className="rounded-xl h-11 px-3.5 font-bold text-xs gap-1.5 border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareCapsule(wall);
                                }}
                                title="Partager cette capsule"
                              >
                                <Share2 className="w-4 h-4 text-indigo-600" />
                                <span className="hidden sm:inline">Partager</span>
                              </Button>

                              {wall.latitude && wall.longitude && (
                                <Button 
                                  variant="outline"
                                  className="rounded-xl h-11 font-bold text-xs gap-1 border-neutral-200"
                                  onClick={() => {
                                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${wall.latitude},${wall.longitude}&travelmode=walking`, '_blank');
                                  }}
                                >
                                  <MapPin className="w-4 h-4 text-neutral-500" /> Itinéraire
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : (
                /* Wall Detail Screen */
                <div className="space-y-6">
                  <button 
                    onClick={() => setSelectedWall(null)}
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-neutral-400 hover:text-neutral-700 transition-colors"
                  >
                    ← Retour au Parcours
                  </button>

                  <div className="bg-white rounded-[2.5rem] border border-neutral-100 p-6 space-y-4 shadow-sm relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500">MÉDINA D'ART</span>
                        <h3 className="text-2xl font-black tracking-tighter leading-none">{selectedWall.name}</h3>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-2xl w-11 h-11 border-indigo-100 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-600 shrink-0 shadow-xs active:scale-95 transition-all"
                        onClick={() => handleShareCapsule(selectedWall)}
                        title="Partager cette capsule"
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                    </div>
                    <p className="text-xs text-neutral-500 leading-relaxed font-medium">{selectedWall.description}</p>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-50">
                      {completedWalls.includes(selectedWall.id) ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-black uppercase tracking-wider border border-green-100">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mur Validé & Visité
                        </span>
                      ) : (
                        <Button 
                          variant="outline"
                          className="rounded-full px-5 h-9 font-bold text-xs gap-1.5 border-neutral-200 hover:bg-neutral-50"
                          onClick={() => markWallCompleted(selectedWall.id)}
                        >
                          Valider ma visite 🚩
                        </Button>
                      )}

                      <Button 
                        className="rounded-full px-5 h-9 font-bold text-xs gap-1.5 text-white shadow-md"
                        style={{ backgroundColor: themeColor }}
                        onClick={() => setShowARGraffiti(true)}
                      >
                        <Camera className="w-3.5 h-3.5" /> AR Graffiti sur ce mur 🎨
                      </Button>

                      <Button
                        variant="outline"
                        className="rounded-full px-5 h-9 font-bold text-xs gap-1.5 border-neutral-200 hover:bg-neutral-50 text-neutral-800"
                        onClick={() => handleShareCapsule(selectedWall)}
                        title="Partager cette capsule"
                      >
                        <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Partager la Capsule 📲
                      </Button>

                      {selectedWall.latitude && selectedWall.longitude && (
                        <Button 
                          variant="outline"
                          className="rounded-full px-5 h-9 font-bold text-xs gap-1.5 border-neutral-200"
                          onClick={() => {
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedWall.latitude},${selectedWall.longitude}&travelmode=walking`, '_blank');
                          }}
                        >
                          <MapPin className="w-3.5 h-3.5" /> Itinéraire à pied
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Couches Médias Immersives du Point d'Intérêt */}
                  {(selectedWall.audioUrl || selectedWall.videoUrl) && (
                    <div className="bg-neutral-50/70 border border-neutral-100 rounded-[2.2rem] p-5 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-neutral-500">Médias Immersifs de l'Étape</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedWall.audioUrl && (
                          <div className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center justify-between gap-4 shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <Volume2 className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs font-black uppercase tracking-wider text-neutral-400 leading-none">Audioguide</p>
                                <p className="text-sm font-bold text-neutral-800 leading-tight">Écouter l'Étape</p>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                if (wallAudioPlaying === selectedWall.id) {
                                  setWallAudioPlaying(null);
                                } else {
                                  setWallAudioPlaying(selectedWall.id);
                                  markWallCompleted(selectedWall.id);
                                }
                              }}
                              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all shadow-sm cursor-pointer"
                            >
                              {wallAudioPlaying === selectedWall.id ? (
                                <Pause className="w-4 h-4 fill-white" />
                              ) : (
                                <Play className="w-4 h-4 fill-white ml-0.5" />
                              )}
                            </button>
                          </div>
                        )}

                        {selectedWall.videoUrl && (
                          <div className="bg-white rounded-2xl border border-neutral-100 p-4 flex items-center justify-between gap-4 shadow-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                                <Video className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-xs font-black uppercase tracking-wider text-neutral-400 leading-none">Vidéo</p>
                                <p className="text-sm font-bold text-neutral-800 leading-tight">Voir la présentation</p>
                              </div>
                            </div>

                            <a
                              href={selectedWall.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => markWallCompleted(selectedWall.id)}
                              className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center hover:bg-rose-700 transition-all shadow-sm cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Artworks List */}
                  <div className="space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest text-neutral-400">Œuvres d'Art sur ce Mur</h4>
                    
                    {(selectedWall.artworks || []).map((artwork) => (
                      <div 
                        key={artwork.id}
                        className="bg-white rounded-[2.2rem] border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-all"
                      >
                        {artwork.imageUrl && (
                          <div className="aspect-[16/10] overflow-hidden bg-neutral-100 relative">
                            <img 
                              src={artwork.imageUrl} 
                              alt={artwork.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <div className="p-6 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-lg font-black tracking-tight leading-tight">{artwork.title}</h5>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl h-8 px-2.5 text-xs font-bold gap-1 text-neutral-600 hover:bg-neutral-50 shrink-0 border-neutral-200"
                              onClick={() => handleShareCapsule(selectedWall, artwork.title)}
                              title="Partager cette œuvre"
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-600" /> Partager
                            </Button>
                          </div>
                          <p className="text-xs text-neutral-500 leading-relaxed font-medium">{artwork.description}</p>
                          
                          {artwork.arModelUrl && (
                            <Button 
                              className="w-full rounded-xl py-6 font-bold text-xs gap-2 mt-2 shadow-sm text-white"
                              style={{ backgroundColor: themeColor }}
                              onClick={() => {
                                setArArtwork(artwork);
                                markWallCompleted(selectedWall.id);
                              }}
                            >
                              <Box className="w-4 h-4" /> Voir en Réalité Augmentée 🧱
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activites' && (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in-50 duration-300">
              {config.scratchCard?.enabled && (
                <ModuleCard 
                  icon={<Gift className="w-5 h-5" />} 
                  label="Jeu" 
                  sub="Grattez & Gagnez"
                  onClick={() => setActiveModule('game')}
                  color={themeColor}
                />
              )}
              {config.story?.enabled && (
                <ModuleCard 
                  icon={<BookOpen className="w-5 h-5" />} 
                  label="Histoire" 
                  sub="Notre Engagement"
                  onClick={() => setActiveModule('story')}
                  color={themeColor}
                />
              )}
              {config.recipes?.enabled && (
                <ModuleCard 
                  icon={<BookOpen className="w-5 h-5" />} 
                  label="Ateliers & Guides" 
                  sub="Activités créatives"
                  onClick={() => setActiveModule('recipes')}
                  color={themeColor}
                />
              )}
              {config.spinWheel?.enabled && (
                <ModuleCard
                  icon={<Dices className="w-5 h-5" />}
                  label="Roue"
                  sub="Tentez votre chance"
                  onClick={() => setActiveModule('spin')}
                  color={themeColor}
                />
              )}
              {config.quiz?.enabled && (
                <ModuleCard
                  icon={<HelpCircle className="w-5 h-5" />}
                  label="Quiz"
                  sub="Testez vos connaissances"
                  onClick={() => setActiveModule('quiz')}
                  color={themeColor}
                />
              )}
              {config.coupon?.enabled && (
                scratchUnlocked || !config.scratchCard?.enabled ? (
                  <ModuleCard 
                    icon={<Ticket className="w-5 h-5" />} 
                    label="Coupon" 
                    sub="Offre Exclusive"
                    onClick={() => { trackEvent('couponViews'); setActiveModule('coupon'); }}
                    color={themeColor}
                  />
                ) : (
                  <div className="p-5 bg-white/40 backdrop-blur-md rounded-[2rem] border border-white/20 text-left space-y-3 opacity-50 cursor-not-allowed">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-neutral-200">
                      <Ticket className="w-5 h-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-neutral-400">Coupon</p>
                      <p className="text-[10px] text-neutral-300 font-bold uppercase tracking-wider">Grattez d'abord</p>
                    </div>
                  </div>
                )
              )}
              {config.photobooth?.enabled && (
                <ModuleCard 
                  icon={<Camera className="w-5 h-5" />} 
                  label="Photobooth" 
                  sub="Souvenirs"
                  onClick={() => setActiveModule('photobooth')}
                  color={themeColor}
                />
              )}
              {config.videoboth?.enabled && (
                <ModuleCard 
                  icon={<Video className="w-5 h-5" />} 
                  label="Videoboth" 
                  sub="Capturez un Reel"
                  onClick={() => setActiveModule('videoboth')}
                  color={themeColor}
                />
              )}
              {config.ar?.enabled && (
                <ModuleCard 
                  icon={<Box className="w-5 h-5" />} 
                  label="Mascotte AR" 
                  sub="Réalité Augmentée"
                  onClick={() => setActiveModule('ar')}
                  color={themeColor}
                />
              )}
            </div>
          )}

          {activeTab === 'fresque' && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div className="bg-white p-6 rounded-[2.5rem] border border-neutral-100 space-y-3 shadow-sm">
                <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Street Art Participatif</p>
                <h3 className="text-xl font-black tracking-tighter leading-none">La Fresque Collective</h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Découvrez l'ensemble des graffitis virtuels et œuvres de rue réalisés par les visiteurs de l'exposition. Chaque création est ancrée virtuellement sur l'une des étapes de notre parcours !
                </p>
              </div>

              {loadingGraffiti ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Chargement de la fresque...</p>
                </div>
              ) : graffitiList.length === 0 ? (
                <div className="bg-neutral-50 border border-dashed border-neutral-200 rounded-[2.5rem] p-8 text-center space-y-4">
                  <div className="text-4xl">🎨</div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-neutral-800">Aucun graffiti validé pour le moment</p>
                    <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                      Soyez le premier à laisser votre marque ! Allez sur le détail d'un mur dans le parcours et cliquez sur "AR Graffiti".
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {graffitiList.map((graffiti) => {
                    const wall = normalizeWalls(config).find(w => w.id === graffiti.wall_id);
                    const wallName = wall ? wall.name : `Mur ${graffiti.wall_id}`;
                    return (
                      <div 
                        key={graffiti.id} 
                        className="bg-white rounded-[2.5rem] border border-neutral-150 overflow-hidden shadow-sm hover:shadow-md transition-all group"
                      >
                        {/* Artwork Preview */}
                        <div className="relative aspect-[3/4] bg-neutral-950 flex items-center justify-center overflow-hidden">
                          <img 
                            src={graffiti.image_data} 
                            alt={`Graffiti on ${wallName}`}
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 text-[9px] font-black text-white uppercase tracking-wider">
                            🧱 {wallName}
                          </div>
                        </div>
                        
                        {/* Footer Info */}
                        <div className="p-4 flex items-center justify-between bg-neutral-50/50">
                          <div className="space-y-0.5">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                              {graffiti.author ? `Par ${graffiti.author}` : 'Artiste Visiteur'}
                            </p>
                            <p className="text-xs font-bold text-neutral-700">
                              Créé le {new Date(graffiti.created_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Social Sharing & Deep-Linking Engine */}
          <section className="bg-white rounded-[2.5rem] p-6 border border-neutral-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4" style={{ color: themeColor }} />
                <h3 className="text-sm font-black uppercase tracking-widest text-neutral-800">{t('sharingTitle')}</h3>
              </div>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 animate-pulse">
                <Sparkles className="w-3 h-3" /> {t('smartDeepLink')}
              </span>
            </div>

            <p className="text-xs text-neutral-500 font-medium leading-relaxed">
              {t('smartDeepLinkDesc')}
            </p>

            {/* Target Selection Pills */}
            <div className="flex flex-wrap gap-2 p-1 bg-neutral-50 rounded-2xl border border-neutral-150">
              <button
                onClick={() => setShareTarget('global')}
                className={cn(
                  "flex-1 min-w-[120px] py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                  shareTarget === 'global'
                    ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                    : "text-neutral-500 hover:text-neutral-800"
                )}
              >
                <Globe className="w-3.5 h-3.5" /> {t('entireExpo')}
              </button>

              {selectedWall && (
                <button
                  onClick={() => setShareTarget('wall')}
                  className={cn(
                    "flex-1 min-w-[120px] py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                    shareTarget === 'wall'
                      ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                      : "text-neutral-500 hover:text-neutral-800"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" /> {t('currentStep')}
                </button>
              )}

              {activeTab === 'activites' && (
                <button
                  onClick={() => setShareTarget('tab')}
                  className={cn(
                    "flex-1 min-w-[120px] py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5",
                    shareTarget === 'tab'
                      ? "bg-white text-neutral-900 shadow-sm border border-neutral-200"
                      : "text-neutral-500 hover:text-neutral-800"
                  )}
                >
                  <Gift className="w-3.5 h-3.5" /> {t('gamesActivities')}
                </button>
              )}
            </div>

            {/* Generated Link Display */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-neutral-50 p-2 pl-4 rounded-xl border border-neutral-150">
                <span className="text-[10px] font-bold text-neutral-400 select-none truncate max-w-[200px] sm:max-w-none">
                  {getShareUrl(shareTarget)}
                </span>
                <button
                  onClick={() => {
                    const link = getShareUrl(shareTarget);
                    navigator.clipboard.writeText(link);
                    toast.success(t('linkCopied'));
                  }}
                  className="ml-auto p-2.5 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 active:scale-95 transition-all text-neutral-600 shadow-xs"
                  title="Copier le lien"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-5 gap-2">
              {/* WhatsApp */}
              <button
                onClick={() => {
                  trackShare('whatsapp');
                  const url = `https://wa.me/?text=${encodeURIComponent(getShareText(shareTarget) + " " + getShareUrl(shareTarget))}`;
                  window.open(url, '_blank');
                }}
                className="h-12 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 transition-all flex items-center justify-center"
                title="Partager sur WhatsApp"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
              </button>

              {/* Facebook */}
              <button
                onClick={() => {
                  trackShare('instagram'); // Track in general stats
                  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl(shareTarget))}`;
                  window.open(url, '_blank');
                }}
                className="h-12 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95 transition-all flex items-center justify-center"
                title="Partager sur Facebook"
              >
                <Facebook className="w-5 h-5 fill-current" />
              </button>

              {/* Twitter / X */}
              <button
                onClick={() => {
                  trackShare('tiktok'); // Track in general stats
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getShareText(shareTarget))}&url=${encodeURIComponent(getShareUrl(shareTarget))}`;
                  window.open(url, '_blank');
                }}
                className="h-12 rounded-xl bg-neutral-900 text-white hover:bg-black active:scale-95 transition-all flex items-center justify-center"
                title="Partager sur X (Twitter)"
              >
                <Twitter className="w-4 h-4 fill-current" />
              </button>

              {/* Telegram */}
              <button
                onClick={() => {
                  trackShare('whatsapp');
                  const url = `https://t.me/share/url?url=${encodeURIComponent(getShareUrl(shareTarget))}&text=${encodeURIComponent(getShareText(shareTarget))}`;
                  window.open(url, '_blank');
                }}
                className="h-12 rounded-xl bg-sky-50 text-sky-600 hover:bg-sky-100 active:scale-95 transition-all flex items-center justify-center"
                title="Partager sur Telegram"
              >
                <Send className="w-4 h-4 fill-current ml-0.5" />
              </button>

              {/* Email */}
              <button
                onClick={() => {
                  const mailto = `mailto:?subject=${encodeURIComponent(config.name)}&body=${encodeURIComponent(getShareText(shareTarget) + "\n\n" + getShareUrl(shareTarget))}`;
                  window.location.href = mailto;
                }}
                className="h-12 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center"
                title="Partager par Email"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
            
            {/* Native share sheet fallback if supported */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <Button
                variant="outline"
                className="w-full rounded-xl py-5 text-xs font-bold gap-2 border-neutral-200"
                onClick={() => {
                  navigator.share({
                    title: config.name,
                    text: getShareText(shareTarget),
                    url: getShareUrl(shareTarget)
                  }).catch((err) => console.log('Native share canceled:', err));
                }}
              >
                <Share2 className="w-4 h-4" /> Partager via les applications système
              </Button>
            )}
          </section>

          {/* Dynamic Content Area */}
        <AnimatePresence mode="wait">
          {activeModule === 'game' && config.scratchCard?.enabled && (
            <motion.section
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight">Tentez votre chance</h2>
                <button onClick={() => setActiveModule(null)} className="text-xs font-bold text-neutral-400">Fermer</button>
              </div>
              <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-neutral-100 border border-neutral-100">
                <ScratchCard 
                  offer={config.scratchCard.offer} 
                  onComplete={handleScratchComplete}
                  color={themeColor}
                />
                {scratched && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 text-center space-y-4"
                  >
                    <div className="inline-flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Félicitations !
                    </div>
                    <p className="text-neutral-500 text-sm">Utilisez votre coupon ci-dessous en caisse.</p>
                    <Button 
                      className="w-full rounded-xl py-6 font-bold text-white"
                      style={{ backgroundColor: themeColor }}
                      onClick={() => { trackEvent('couponViews'); setActiveModule('coupon'); }}
                    >
                      Voir mon coupon
                    </Button>
                  </motion.div>
                )}
              </div>
            </motion.section>
          )}

          {activeModule === 'story' && config.story?.enabled && (
            <motion.section
              key="story"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight">Notre Histoire</h2>
                <button onClick={() => setActiveModule(null)} className="text-xs font-bold text-neutral-400">Fermer</button>
              </div>
              <Card className="border-none shadow-xl shadow-neutral-100 rounded-[2rem] overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <h3 className="text-2xl font-black leading-tight">{config.story.title}</h3>
                  <p className="text-neutral-600 leading-relaxed italic">
                    "{config.story.content}"
                  </p>
                  <div className="flex items-center gap-4 pt-4 border-t border-neutral-100">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Engagement</p>
                      <p className="text-sm font-bold">100% Naturel & Local</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.section>
          )}

          {activeModule === 'recipes' && config.recipes?.enabled && (
            <motion.section
              key="recipes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tight">Ateliers & Guides de Visite</h2>
                <button onClick={() => setActiveModule(null)} className="text-xs font-bold text-neutral-400">Fermer</button>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {config.recipes.items.map((recipe) => (
                  <button 
                    key={recipe.id} 
                    onClick={() => setSelectedRecipe(recipe)}
                    className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden group text-left"
                  >
                    <img 
                      src={recipe.image || 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=800&q=80'} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-6 bottom-6 space-y-2">
                      <h4 className="text-xl font-black text-white leading-tight">{recipe.title}</h4>
                      <p className="text-white/70 text-xs line-clamp-2">{recipe.description}</p>
                      <div className="pt-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white">
                        Découvrir <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.section>
          )}

          {activeModule === 'spin' && config.spinWheel?.enabled && (
            <SpinWheel
              segments={config.spinWheel.segments}
              themeColor={themeColor}
              onWin={(segment) => {
                trackEvent('spinWins');
                pushToGoogleSheets("Gain au Spin Wheel", `Segment gagné: "${segment.label}" (${segment.type}) - Coupon: ${segment.couponCode || 'aucun'}`);
                pushToGoogleChat(`🎉 *Jeu*: Un visiteur a gagné le prix *"${segment.label}"* au Spin Wheel de l'Exposition *"${config.name}"* chez *${config.brandName}* !`);
              }}
              onComplete={() => trackEvent('gamesCompleted')}
              onClose={() => setActiveModule(null)}
              isPreview={isPreview}
            />
          )}

          {activeModule === 'quiz' && config.quiz?.enabled && (
            <QuizModule
              quiz={config.quiz}
              themeColor={themeColor}
              onWin={() => {
                trackEvent('quizWins');
                pushToGoogleSheets("Victoire au Quiz", `Coupon débloqué: ${config.quiz?.coupon?.code || 'QUIZ20'}`);
                pushToGoogleChat(`🧠 *Quiz*: Un visiteur a réussi le Quiz de l'Exposition *"${config.name}"* chez *${config.brandName}* et a débloqué le coupon !`);
              }}
              onComplete={() => {
                trackEvent('gamesCompleted');
                pushToGoogleSheets("Quiz Terminé", "Quiz complété jusqu'au bout");
              }}
              onClose={() => setActiveModule(null)}
              isPreview={isPreview}
            />
          )}

          {activeModule === 'photobooth' && config.photobooth?.enabled && (
            <Photobooth
              overlayUrl={config.photobooth.overlayUrl}
              frameTheme={config.photobooth.frameTheme}
              brandName={config.brandName}
              themeColor={themeColor}
              onClose={() => setActiveModule(null)}
              onSaveToCloud={async (base64) => {
                await handleSaveMediaToDrive(base64, 'image/png');
              }}
            />
          )}

          {activeModule === 'videoboth' && config.videoboth?.enabled && (
            <Videoboth
              brandName={config.brandName}
              themeColor={themeColor}
              maxDuration={config.videoboth.maxDuration}
              overlayUrl={config.photobooth?.overlayUrl}
              frameTheme={config.photobooth?.frameTheme}
              arConfig={config.ar}
              onClose={() => setActiveModule(null)}
              onSaveToCloud={async (base64OrBlob, mimeType) => {
                await handleSaveMediaToDrive(base64OrBlob, mimeType);
              }}
            />
          )}

          {activeModule === 'ar' && config.ar?.enabled && (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-neutral-500 font-medium">Chargement du module 3D...</p>
              </div>
            }>
              <ARViewer
                modelUrl={config.ar.modelUrl}
                posterUrl={config.ar.posterUrl}
                altText={config.ar.altText}
                themeColor={themeColor}
                onClose={() => setActiveModule(null)}
              />
            </Suspense>
          )}

          {arArtwork && arArtwork.arModelUrl && (
            <div className="fixed inset-0 z-50 bg-[#FDFCFB] p-6 overflow-y-auto">
              <Suspense fallback={
                <div className="min-h-screen flex flex-col items-center justify-center p-12 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-neutral-500 font-medium">Chargement de l'œuvre 3D...</p>
                </div>
              }>
                <ARViewer
                  modelUrl={arArtwork.arModelUrl}
                  posterUrl={arArtwork.imageUrl}
                  altText={arArtwork.title}
                  themeColor={themeColor}
                  placement="wall"
                  onClose={() => setArArtwork(null)}
                />
              </Suspense>
            </div>
          )}

          {activeModule === 'coupon' && config.coupon?.enabled && (
            <motion.section
              key="coupon"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black tracking-tight">Votre Avantage</h2>
                <button onClick={() => setActiveModule(null)} className="text-xs font-bold text-neutral-400">Fermer</button>
              </div>
              <div 
                className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-dashed text-center space-y-6 relative overflow-hidden"
                style={{ borderColor: `${themeColor}40`, boxShadow: `0 20px 50px -12px ${themeColor}20` }}
              >
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-50" style={{ backgroundColor: themeColor }} />
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.3em]" style={{ color: themeColor }}>Code Promo</p>
                  <h3 className="text-4xl font-black tracking-tighter text-neutral-900">{config.coupon.code}</h3>
                </div>
                <div className="p-4 bg-neutral-50 rounded-2xl">
                  <p className="text-sm text-neutral-600 font-medium">{config.coupon.description}</p>
                </div>
                {config.expiresAt ? (
                  <div className="space-y-3">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">
                      Valable jusqu'au {new Date(config.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {timeLeft && (
                      <div className="flex justify-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-black" style={{ color: themeColor }}>{timeLeft.days}</p>
                          <p className="text-[8px] uppercase font-bold text-neutral-400">Jours</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black" style={{ color: themeColor }}>{timeLeft.hours}</p>
                          <p className="text-[8px] uppercase font-bold text-neutral-400">Heures</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-black" style={{ color: themeColor }}>{timeLeft.mins}</p>
                          <p className="text-[8px] uppercase font-bold text-neutral-400">Min</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-widest">Offre à durée limitée</p>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Media Section */}
        {(config.audio?.enabled || config.video?.enabled) && (
          <section className="space-y-4">
            <h2 className="text-xl font-black tracking-tight">Expérience Immersive</h2>
            <div className="grid grid-cols-1 gap-4">
              {config.audio?.enabled && (
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-full p-6 bg-neutral-900 text-white rounded-[2rem] flex items-center justify-between group hover:bg-black transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Audioguide & Ambiance</p>
                      <p className="font-bold">{config.audio.title}</p>
                    </div>
                  </div>
                  <Music className="w-6 h-6 text-white/20" />
                </button>
              )}

              {config.video?.enabled && (
                <div className="w-full aspect-video bg-neutral-900 rounded-[2rem] overflow-hidden relative group">
                  {config.video.url.includes('youtube.com') || config.video.url.includes('youtu.be') ? (
                    <iframe 
                      src={config.video.url.replace('watch?v=', 'embed/')}
                      className="w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video 
                      src={config.video.url} 
                      controls 
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                    {config.video.title}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Footer / Contact */}
        <footer className="pt-8 pb-12 text-center space-y-8 border-t border-neutral-100">
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-widest">Partager l'expérience</p>
            <div className="flex gap-4">
              <Button 
                onClick={() => setShowQR(true)}
                variant="outline"
                className="w-12 h-12 rounded-full p-0 border-2 border-neutral-100"
              >
                <QrCode className="w-5 h-5 text-neutral-400" />
              </Button>
              <Button 
                onClick={handleWhatsApp}
                variant="outline"
                className="rounded-full px-8 py-6 border-2 border-neutral-100 hover:bg-neutral-50 gap-2 font-bold"
                style={{ borderColor: `${themeColor}40` }}
              >
                <MessageCircle className="w-5 h-5" style={{ color: themeColor }} /> WhatsApp
              </Button>
              <Button 
                onClick={() => {
                  navigator.share?.({
                    title: config.name,
                    text: `Découvrez ${config.name} de ${config.brandName}`,
                    url: window.location.href
                  });
                }}
                variant="outline"
                className="w-12 h-12 rounded-full p-0 border-2 border-neutral-100"
              >
                <Share2 className="w-5 h-5 text-neutral-400" />
              </Button>
            </div>
          </div>
          <p className="text-[10px] font-bold text-neutral-300 uppercase tracking-[0.2em]">
            Propulsé par FESTIV.APP
          </p>
        </footer>
      </main>

      {/* Recipe Modal Overlay */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="relative h-48 flex-shrink-0">
                <img 
                  src={selectedRecipe.image || 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80'} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight leading-tight">{selectedRecipe.title}</h3>
                  <p className="text-neutral-500 text-sm">{selectedRecipe.description}</p>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold uppercase tracking-widest text-xs text-neutral-400">Étapes de l'atelier</h4>
                  <div className="space-y-3">
                    {selectedRecipe.steps.map((step, i) => (
                      <details key={i} className="group bg-neutral-50 rounded-2xl overflow-hidden border border-neutral-100 transition-all open:ring-2 open:ring-sky-100">
                        <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: themeColor }}
                            >
                              {i + 1}
                            </div>
                            <span className="text-sm font-bold text-neutral-700 truncate max-w-[200px]">{step.substring(0, 30)}...</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-neutral-400 group-open:rotate-180 transition-transform" />
                        </summary>
                        <div className="px-4 pb-4 text-sm text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                          {step}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
                <Button 
                  className="w-full rounded-2xl py-6 font-bold text-white"
                  style={{ backgroundColor: themeColor }}
                  onClick={() => setSelectedRecipe(null)}
                >
                  J'ai compris !
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Share Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black tracking-tight">Partager</h3>
                <button onClick={() => setShowQR(false)} className="p-2 hover:bg-neutral-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-neutral-50 p-6 rounded-3xl inline-block border-2 border-neutral-100">
                <QRCodeSVG value={window.location.href} size={200} />
              </div>
              <p className="text-sm text-neutral-500">Scannez ce code pour ouvrir la campagne sur un autre appareil.</p>
              <Button 
                className="w-full rounded-2xl py-6 font-bold text-white"
                style={{ backgroundColor: themeColor }}
                onClick={() => {
                  navigator.share?.({
                    title: config.name,
                    text: `Découvrez ${config.name} de ${config.brandName}`,
                    url: window.location.href
                  }).catch(() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Lien copié !');
                  });
                }}
              >
                <Share2 className="w-4 h-4 mr-2" /> Partager le lien
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showARGraffiti && selectedWall && (
          <ARGraffiti
            campaignId={config.id}
            wallId={selectedWall.id}
            wallName={selectedWall.name}
            themeColor={themeColor}
            onClose={() => setShowARGraffiti(false)}
            onSuccess={() => {
              markWallCompleted(selectedWall.id);
            }}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

interface ModuleCardProps {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  color: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ icon, label, sub, onClick, color }) => (
  <button 
    onClick={onClick}
    className="p-6 bg-white/40 backdrop-blur-xl rounded-[2.5rem] shadow-sm border border-white/20 text-left space-y-4 hover:shadow-xl hover:-translate-y-1 transition-all group"
  >
    <div 
      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform"
      style={{ backgroundColor: color }}
    >
      {icon}
    </div>
    <div>
      <p className="text-base font-black tracking-tight leading-tight">{label}</p>
      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">{sub}</p>
    </div>
  </button>
);
