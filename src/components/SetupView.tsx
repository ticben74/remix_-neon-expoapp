import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast, Toaster } from 'sonner';
import { 
  Plus, Trash2, Copy, ExternalLink, Smartphone, Store, Gift, 
  MessageCircle, Loader2, Eye, Image as ImageIcon, Share2, 
  BookOpen, Music, Video, Ticket, Settings, Save, Layout, LogIn, LogOut, CheckCircle2, ChevronRight, Play, Pause,
  Dices, HelpCircle, BarChart3, List, Calendar, Sparkles, Zap, ShieldCheck, Box, Camera, MapPin, Compass, Map,
  Printer, Download, Palette, Layers, QrCode, Sliders, Globe, Cloud, HardDrive, Clock, Upload, Folder, AlertCircle, Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { CampaignConfig, Recipe, TimelineItem, Artwork, WallConfig } from '../types';
import { auth } from '../lib/localAuth';
import { CustomerView } from './CustomerView';
import { SpinWheelSetup, DEFAULT_SEGMENTS } from './SpinWheel';
import { QuizSetup, DEFAULT_QUIZ } from './QuizModule';
import { Photobooth } from './Photobooth';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: string;
}
import { cn, normalizeImageUrl, normalizeWalls } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { WorkspaceSetup } from './WorkspaceSetup';
import { 
  listDriveImages, listDriveFolders, signInWithWorkspace, checkWorkspaceStatus, 
  importDriveMedia, uploadLocalMedia, DriveImageFile, DriveFolder 
} from '../lib/workspace';
import { DynamicQRCodeGenerator } from './DynamicQRCodeGenerator';

// shadcn components
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1564182842519-8a3b2af3e228?auto=format&fit=crop&w=400&q=80', // Ramadan
  'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=400&q=80', // Christmas
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80', // Black Friday
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=400&q=80', // Summer
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function buildChartData(campaigns: CampaignConfig[]): { name: string; scans: number; jeux: number; coupons: number }[] {
  const today = new Date();
  const days: { name: string; date: Date; scans: number; jeux: number; coupons: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({ name: DAYS_FR[d.getDay()], date: d, scans: 0, jeux: 0, coupons: 0 });
  }

  campaigns.forEach(c => {
    const totalScans = c.stats?.scans || 0;
    const totalGames = c.stats?.gamesCompleted || 0;
    const totalCoupons = c.stats?.couponViews || 0;
    if (totalScans === 0 && totalGames === 0 && totalCoupons === 0) return;

    const createdTs = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(today.getTime() - 6 * 86400000);
    const updatedTs = c.updatedAt?.toDate ? c.updatedAt.toDate() : today;
    const spanMs = Math.max(updatedTs.getTime() - createdTs.getTime(), 1);

    days.forEach(day => {
      const dayStart = day.date.getTime();
      const dayEnd = dayStart + 86400000;
      const overlapStart = Math.max(createdTs.getTime(), dayStart);
      const overlapEnd = Math.min(updatedTs.getTime(), dayEnd);
      if (overlapEnd <= overlapStart) return;
      const fraction = (overlapEnd - overlapStart) / spanMs;
      day.scans   += Math.round(totalScans   * fraction);
      day.jeux    += Math.round(totalGames   * fraction);
      day.coupons += Math.round(totalCoupons * fraction);
    });
  });

  return days.map(({ name, scans, jeux, coupons }) => ({ name, scans, jeux, coupons }));
}

const TEMPLATES: Record<string, Partial<CampaignConfig>> = {
  expo_12_capsules: {
    name: "Expo 12 Capsules — Centre Culturel de Hammamet",
    brandName: "Centre Culturel International de Hammamet",
    themeColor: "#D9A441",
    language: "fr",
    video: {
      enabled: false,
      url: "",
      title: ""
    },
    graffiti: {
      enabled: false,
      requireModeration: true
    },
    mediaWallLayout: {
      enabled: true,
      imageUrl: "https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=80",
      pois: []
    },
    story: {
      enabled: true,
      title: "Le Parcours — 12 Capsules | المسار — ١٢ كبسولة",
      content: "Un parcours scénographié d'exception en 12 capsules audiovisuelles bilingues (Français / العربية) au Centre Culturel International de Hammamet (Dar Sebastian).",
      imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80"
    },
    walls: [
      {
        id: "capsule_01",
        name: "Capsule 01 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 1 — Français.]\n\n[النص التقديمي للكبسولة 1 — بالعربية.]",
        latitude: 36.3946,
        longitude: 10.6133,
        videoUrl: "[COLLER_URL_VIDEO_01]",
        audioUrl: "",
        artworks: [
          {
            id: "art_01",
            title: "Capsule 01",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_01]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_02",
        name: "Capsule 02 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 2 — Français.]\n\n[النص التقديمي للكبسولة 2 — بالعربية.]",
        latitude: 36.3948,
        longitude: 10.6135,
        videoUrl: "[COLLER_URL_VIDEO_02]",
        audioUrl: "",
        artworks: [
          {
            id: "art_02",
            title: "Capsule 02",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_02]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_03",
        name: "Capsule 03 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 3 — Français.]\n\n[النص التقديمي للكبسولة 3 — بالعربية.]",
        latitude: 36.3950,
        longitude: 10.6137,
        videoUrl: "[COLLER_URL_VIDEO_03]",
        audioUrl: "",
        artworks: [
          {
            id: "art_03",
            title: "Capsule 03",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_03]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_04",
        name: "Capsule 04 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 4 — Français.]\n\n[النص التقديمي للكبسولة 4 — بالعربية.]",
        latitude: 36.3952,
        longitude: 10.6139,
        videoUrl: "[COLLER_URL_VIDEO_04]",
        audioUrl: "",
        artworks: [
          {
            id: "art_04",
            title: "Capsule 04",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_04]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_05",
        name: "Capsule 05 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 5 — Français.]\n\n[النص التقديمي للكبسولة 5 — بالعربية.]",
        latitude: 36.3954,
        longitude: 10.6141,
        videoUrl: "[COLLER_URL_VIDEO_05]",
        audioUrl: "",
        artworks: [
          {
            id: "art_05",
            title: "Capsule 05",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_05]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_06",
        name: "Capsule 06 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 6 — Français.]\n\n[النص التقديمي للكبسولة 6 — بالعربية.]",
        latitude: 36.3956,
        longitude: 10.6143,
        videoUrl: "[COLLER_URL_VIDEO_06]",
        audioUrl: "",
        artworks: [
          {
            id: "art_06",
            title: "Capsule 06",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_06]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_07",
        name: "Capsule 07 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 7 — Français.]\n\n[النص التقديمي للكبسولة 7 — بالعربية.]",
        latitude: 36.3958,
        longitude: 10.6145,
        videoUrl: "[COLLER_URL_VIDEO_07]",
        audioUrl: "",
        artworks: [
          {
            id: "art_07",
            title: "Capsule 07",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_07]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_08",
        name: "Capsule 08 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 8 — Français.]\n\n[النص التقديمي للكبسولة 8 — بالعربية.]",
        latitude: 36.3960,
        longitude: 10.6147,
        videoUrl: "[COLLER_URL_VIDEO_08]",
        audioUrl: "",
        artworks: [
          {
            id: "art_08",
            title: "Capsule 08",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_08]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_09",
        name: "Capsule 09 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 9 — Français.]\n\n[النص التقديمي للكبسولة 9 — بالعربية.]",
        latitude: 36.3962,
        longitude: 10.6149,
        videoUrl: "[COLLER_URL_VIDEO_09]",
        audioUrl: "",
        artworks: [
          {
            id: "art_09",
            title: "Capsule 09",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_09]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_10",
        name: "Capsule 10 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 10 — Français.]\n\n[النص التقديمي للكبسولة 10 — بالعربية.]",
        latitude: 36.3964,
        longitude: 10.6151,
        videoUrl: "[COLLER_URL_VIDEO_10]",
        audioUrl: "",
        artworks: [
          {
            id: "art_10",
            title: "Capsule 10",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_10]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_11",
        name: "Capsule 11 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 11 — Français.]\n\n[النص التقديمي للكبسولة 11 — بالعربية.]",
        latitude: 36.3966,
        longitude: 10.6153,
        videoUrl: "[COLLER_URL_VIDEO_11]",
        audioUrl: "",
        artworks: [
          {
            id: "art_11",
            title: "Capsule 11",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_11]",
            arModelUrl: ""
          }
        ]
      },
      {
        id: "capsule_12",
        name: "Capsule 12 — [Titre FR / العنوان]",
        description: "[Texte de présentation bilingue de la capsule 12 — Français.]\n\n[النص التقديمي للكبسولة 12 — بالعربية.]",
        latitude: 36.3968,
        longitude: 10.6155,
        videoUrl: "[COLLER_URL_VIDEO_12]",
        audioUrl: "",
        artworks: [
          {
            id: "art_12",
            title: "Capsule 12",
            description: "[Cartel de l’œuvre / بطاقة العمل]",
            imageUrl: "[URL_IMAGE_MINIATURE_12]",
            arModelUrl: ""
          }
        ]
      }
    ]
  },
  art_moderne: {
    name: 'Exposition Picasso & l\'Art Moderne',
    brandName: 'Centre d\'Art Contemporain',
    themeColor: '#4f46e5',
    story: {
      enabled: true,
      title: 'Rétrospective Picasso',
      content: 'Explorez le parcours créatif de l\'un des artistes les plus révolutionnaires du XXème siècle à travers ses tableaux, sculptures et croquis inédits.',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80'
    },
    coupon: { enabled: true, code: 'CONTEMPORAIN', description: 'Entrée gratuite pour les étudiants et -15% sur tous les catalogues d\'exposition à la librairie du centre.' }
  },
  histoire_antique: {
    name: 'Trésors de l\'Égypte Antique',
    brandName: 'Musée Royal d\'Histoire',
    themeColor: '#d97706',
    story: {
      enabled: true,
      title: 'La Dynastie des Pharaons',
      content: 'Admirez des reliques millénaires, sarcophages royaux et objets du quotidien dorés révélés par les plus passionnantes expéditions archéologiques.',
      imageUrl: 'https://images.unsplash.com/photo-1600577916048-804c9191e36c?auto=format&fit=crop&w=800&q=80'
    },
    coupon: { enabled: true, code: 'PHARAON', description: 'Accès exclusif à l\'audioguide premium enrichi d\'anecdotes secrètes.' }
  },
  sciences_espace: {
    name: 'Odyssée de l\'Espace 3D',
    brandName: 'Cité des Sciences',
    themeColor: '#0f172a',
    story: {
      enabled: true,
      title: 'Vers l\'Infini et au-delà',
      content: 'Vivez une immersion totale à bord de la station spatiale internationale grâce à nos maquettes interactives 3D et expériences en réalité augmentée.',
      imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80'
    },
    coupon: { enabled: true, code: 'ESPACE3D', description: 'Accès coupe-file pour le planétarium et -10% au café des sciences.' }
  }
};

interface SetupViewProps {
  userRole?: 'admin' | 'user' | null;
}

export const SetupView: React.FC<SetupViewProps> = ({ userRole }) => {
  const initialConfig: CampaignConfig = {
    name: 'Exposition Picasso & l\'Art Moderne',
    brandName: 'Centre d\'Art Contemporain',
    whatsapp: '33100000000',
    themeColor: '#4f46e5',
    stats: { scans: 0, gamesCompleted: 0, spinWins: 0, quizWins: 0, couponViews: 0, shares: { whatsapp: 0, instagram: 0, tiktok: 0 } },
    countdown: { enabled: false, targetDate: '', label: 'Fin de l\'exposition' },
    scratchCard: { enabled: true, offer: 'Entrée gratuite pour le prochain vernissage' },
    spinWheel: {
      enabled: true,
      segments: DEFAULT_SEGMENTS,
    },
    quiz: {
      ...DEFAULT_QUIZ,
      enabled: true,
    },
    story: { 
      enabled: true, 
      title: 'Rétrospective Picasso', 
      content: 'Explorez le parcours créatif de l\'un des artistes les plus révolutionnaires du XXème siècle à travers ses tableaux, sculptures et croquis inédits.',
      imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80'
    },
    recipes: {
      enabled: true,
      items: [
        { id: '1', title: 'Atelier Aquarelle Cubiste', description: 'Créez votre propre chef-d\'œuvre en vous inspirant des lignes géométriques et des couleurs de l\'art moderne.', steps: ['Matériel requis : Pinceaux, Aquarelle, Papier épais grainé', 'Étape 1 : Esquissez des formes cubistes simples au crayon léger', 'Étape 2 : Appliquez des aplats colorés harmonieux', 'Étape 3 : Soulignez les contours d\'un trait d\'encre noire'], image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=200&q=80' }
      ]
    },
    audio: { enabled: false, url: '', title: 'Audioguide Immersif' },
    video: { enabled: false, url: '', title: 'Conférence Restauration' },
    photobooth: { enabled: true, filter: '' },
    videoboth: { enabled: false, maxDuration: 15 },
    socialEntry: { enabled: false, providers: ['facebook', 'instagram', 'tiktok', 'whatsapp'], required: false },
    ar: { 
      enabled: true, 
      modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
      altText: 'Œuvre interactive en 3D'
    },
    mediaWallLayout: {
      enabled: true,
      imageUrl: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=80',
      pois: [
        { id: 'poi_1', name: 'Fresque de la Médina', description: 'Le mur géant d\'expression contemporaine.', x: 30, y: 45, associatedWallId: 'wall_medina' },
        { id: 'poi_2', name: 'Dar Sebastian', description: 'Le pavillon d\'art au cœur des jardins.', x: 70, y: 55, associatedWallId: 'wall_sebastian' }
      ]
    },
    coupon: { enabled: true, code: 'CONTEMPORAIN', description: 'Entrée gratuite pour les étudiants et -15% sur tous les catalogues d\'exposition à la librairie du centre.' }
  };

  const [config, setConfig] = useState<CampaignConfig>(initialConfig);
  const [user, setUser] = useState<User | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [authStep, setAuthStep] = useState<'email' | 'password'>('email');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [userCampaigns, setUserCampaigns] = useState<CampaignConfig[]>([]);
  const [recentActivity, setRecentActivity] = useState<CampaignConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');

  // Auto-save states and refs for PostgreSQL debounce persistence
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const lastSavedConfigRef = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [arMode, setArMode] = useState<'link' | 'upload'>('link');
  const [qrFgColor, setQrFgColor] = useState('#4f46e5');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(256);
  const [qrIncludeLogo, setQrIncludeLogo] = useState(true);
  const [customQrUrl, setCustomQrUrl] = useState('');
  const [selectedMediaWallId, setSelectedMediaWallId] = useState<string | null>(null);
  const [selectedLayoutPoiId, setSelectedLayoutPoiId] = useState<string | null>(null);
  const [isMapSatelliteMode, setIsMapSatelliteMode] = useState<boolean>(true);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);

  // States for JSON Config Modal
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');

  const handleApplyJson = () => {
    try {
      if (!jsonInput.trim()) {
        toast.error("Veuillez coller un code JSON valide.");
        return;
      }
      const parsed = JSON.parse(jsonInput);
      const mergedConfig = { ...initialConfig, ...parsed };
      setConfig(mergedConfig);
      lastSavedConfigRef.current = JSON.stringify(mergedConfig);
      setAutoSaveStatus('idle');
      setShowJsonModal(false);
      setJsonInput('');
      toast.success("Configuration JSON appliquée avec succès !");
    } catch (e: any) {
      toast.error("Erreur de syntaxe JSON : " + (e.message || String(e)));
    }
  };

  const loadTemplateAsNew = (template: Partial<CampaignConfig>) => {
    const isDirty = Boolean(lastSavedConfigRef.current) && JSON.stringify(config) !== lastSavedConfigRef.current;
    if (isDirty) {
      const confirmed = window.confirm(
        "Vous avez un travail en cours non enregistré. Charger ce modèle va le remplacer à l'écran (vos expositions publiées ne sont pas touchées). Continuer ?"
      );
      if (!confirmed) return;
    }

    const { id, stats, createdAt, updatedAt, ...cleanTemplate } = template as any;
    const newConfig: CampaignConfig = {
      ...initialConfig,
      ...cleanTemplate,
      id: undefined,
      stats: { scans: 0, gamesCompleted: 0, spinWins: 0, quizWins: 0, couponViews: 0, shares: { whatsapp: 0, instagram: 0, tiktok: 0 } },
      createdAt: undefined,
      updatedAt: undefined,
    };

    setConfig(newConfig);
    lastSavedConfigRef.current = JSON.stringify(newConfig);
    setAutoSaveStatus('idle');
    setGeneratedUrl('');
    setActiveTab('general');
    toast.success(`Template ${template.name || ''} chargé !`);
  };

  // States for Drive Image Picker
  const [showDriveImagePicker, setShowDriveImagePicker] = useState(false);
  const [driveImages, setDriveImages] = useState<DriveImageFile[]>([]);
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [selectedDriveFolderId, setSelectedDriveFolderId] = useState<string>('');
  const [selectedDriveFileIds, setSelectedDriveFileIds] = useState<string[]>([]);
  const [drivePickerMode, setDrivePickerMode] = useState<'single' | 'multiple'>('single');
  const [loadingDriveImages, setLoadingDriveImages] = useState(false);
  const [importingDriveMedia, setImportingDriveMedia] = useState(false);
  const [needsDriveAuth, setNeedsDriveAuth] = useState(false);
  const [driveImageTarget, setDriveImageTarget] = useState<'hero' | 'logo' | 'wall' | 'layout' | 'timeline' | 'artwork' | 'wall_artworks'>('hero');
  const [driveImageTargetWallId, setDriveImageTargetWallId] = useState<string | null>(null);
  const [driveImageTargetArtworkId, setDriveImageTargetArtworkId] = useState<string | null>(null);

  const ensureWorkspaceCampaignId = async (): Promise<string> => {
    let campaignId = config.id;

    if (!campaignId && user) {
      const draftCampaignId = Math.random().toString(36).substring(2, 15);
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draftCampaignId,
          ...config,
          ownerUid: user.uid,
          workspaceToken: sessionStorage.getItem('workspace_token')
        })
      });

      if (!response.ok) {
        throw new Error(`Impossible de préparer la campagne pour Google Drive (${response.status})`);
      }

      const savedData = await response.json();
      campaignId = savedData.id || draftCampaignId;
      setConfig((prev) => ({ ...prev, id: campaignId }));
      lastSavedConfigRef.current = JSON.stringify({ ...config, id: campaignId });
    }

    if (!campaignId) {
      throw new Error("ID de campagne requis pour l'authentification.");
    }

    return campaignId;
  };

  const handleOpenDrivePicker = async (
    target: 'hero' | 'logo' | 'wall' | 'layout' | 'timeline' | 'artwork' | 'wall_artworks', 
    wallId?: string, 
    isMultiple = false,
    artworkId?: string
  ) => {
    setDriveImageTarget(target);
    setDrivePickerMode(isMultiple ? 'multiple' : 'single');
    if (wallId) setDriveImageTargetWallId(wallId);
    if (artworkId) setDriveImageTargetArtworkId(artworkId);
    setSelectedDriveFileIds([]);
    setSelectedDriveFolderId('');
    setDriveImages([]);
    setNeedsDriveAuth(false);
    setShowDriveImagePicker(true);
    setLoadingDriveImages(true);
    try {
      const campaignId = await ensureWorkspaceCampaignId();

      const isConnected = await checkWorkspaceStatus(campaignId);
      if (!isConnected) {
        setNeedsDriveAuth(true);
        toast.info("Cliquez sur 'Se connecter à Google Drive' pour autoriser l'accès (Chrome peut bloquer les popups automatiques).");
        return;
      }
      setNeedsDriveAuth(false);
      const [foldersRes, filesRes] = await Promise.all([
        listDriveFolders(campaignId).catch(() => []),
        Promise.resolve([])
      ]);
      setDriveFolders(foldersRes);
      setDriveImages(filesRes);
    } catch (err: any) {
      console.error("Erreur chargement images Drive:", err);
      toast.error("Impossible de charger les images de Google Drive: " + (err.message || String(err)));
    } finally {
      setLoadingDriveImages(false);
    }
  };

  const handleManualDriveAuth = async () => {
    setLoadingDriveImages(true);
    try {
      const campaignId = await ensureWorkspaceCampaignId();
      const result = await signInWithWorkspace(campaignId);
      if (!result) {
        toast.error("Connexion à Google Drive annulée.");
        return;
      }

      const folders = await listDriveFolders(campaignId).catch(() => []);
      setDriveFolders(folders);
      setNeedsDriveAuth(false);
      toast.success("Connexion Google Drive réussie. Sélectionnez un dossier pour charger les images.");
    } catch (err: any) {
      toast.error("Échec de l'authentification Google Drive: " + (err?.message || String(err)));
    } finally {
      setLoadingDriveImages(false);
    }
  };

  const handleSelectDriveFolder = async (folderId: string) => {
    setSelectedDriveFolderId(folderId);
    if (!folderId) {
      setDriveImages([]);
      return;
    }
    setLoadingDriveImages(true);
    try {
      const campaignId = await ensureWorkspaceCampaignId();
      const isConnected = await checkWorkspaceStatus(campaignId);
      if (!isConnected) {
        setNeedsDriveAuth(true);
        toast.error("Session Google expirée. Cliquez sur 'Se connecter à Google Drive' puis réessayez.");
        return;
      }

      setNeedsDriveAuth(false);

      const files = await listDriveImages(campaignId, folderId);
      setDriveImages(files);
    } catch (err: any) {
      toast.error("Erreur de filtrage des images Drive: " + (err?.message || String(err)));
    } finally {
      setLoadingDriveImages(false);
    }
  };

  const handleConfirmDriveImport = async (fileIdsToImport: string[]) => {
    if (fileIdsToImport.length === 0) return;
    setImportingDriveMedia(true);
    try {
      toast.info(`Téléchargement serveur & conversion WebP de ${fileIdsToImport.length} fichier(s)...`);
      const res = await importDriveMedia(config.id, fileIdsToImport);
      if (!res.files || res.files.length === 0) {
        toast.error("Aucun fichier n'a pu être importé.");
        return;
      }

      const imported = res.files;

      if (driveImageTarget === 'hero') {
        const mainFile = imported[0];
        setConfig({
          ...config,
          story: {
            ...config.story!,
            enabled: true,
            title: config.story?.title || "Œuvre Majeure de l'Exposition",
            content: config.story?.content || "Une création unique à découvrir.",
            imageUrl: mainFile.url
          }
        });
        toast.success("Image Hero importée avec succès sous URL locale stable (/media/...) !");
      } else if (driveImageTarget === 'logo') {
        setConfig({ ...config, logoUrl: imported[0].url });
        toast.success("Logo importé avec succès sous URL locale !");
      } else if (driveImageTarget === 'layout') {
        setConfig({
          ...config,
          mediaWallLayout: {
            ...config.mediaWallLayout!,
            imageUrl: imported[0].url
          }
        });
        toast.success("Plan du parcours importé avec succès sous URL locale !");
      } else if (driveImageTarget === 'timeline') {
        const newItems: TimelineItem[] = imported.map((f, idx) => ({
          id: `tl_${Date.now()}_${idx}`,
          year: '1970',
          title: f.originalName ? f.originalName.replace(/\.[^/.]+$/, '') : `Archive #${idx + 1}`,
          description: 'Ajoutez une légende ou un contexte historique...',
          imageUrl: f.url,
          thumbnailUrl: f.thumbnailUrl,
          originalName: f.originalName,
          sizeBytes: f.sizeBytes
        }));

        const existingTimeline = config.timeline || { enabled: true, title: 'Ligne du Temps & Archives', items: [] };
        setConfig({
          ...config,
          timeline: {
            ...existingTimeline,
            enabled: true,
            items: [...(existingTimeline.items || []), ...newItems]
          }
        });
        toast.success(`${imported.length} archive(s) importée(s) dans la Ligne du Temps avec succès !`);
      } else if (driveImageTarget === 'artwork') {
        const currentWalls = config.walls || normalizeWalls(config);
        const wallIdx = currentWalls.findIndex(w => w.id === driveImageTargetWallId);
        if (wallIdx !== -1) {
          const wall = currentWalls[wallIdx];
          const artIdx = (wall.artworks || []).findIndex(a => a.id === driveImageTargetArtworkId);
          if (artIdx !== -1) {
            const newWalls = [...currentWalls];
            const newArtworks = [...(newWalls[wallIdx].artworks || [])];
            newArtworks[artIdx] = { ...newArtworks[artIdx], imageUrl: imported[0].url };
            newWalls[wallIdx] = { ...newWalls[wallIdx], artworks: newArtworks };
            setConfig({ ...config, walls: newWalls });
            toast.success("Image de l'œuvre d'art importée depuis Drive avec succès !");
          }
        }
      } else if (driveImageTarget === 'wall_artworks') {
        const newArtworks: Artwork[] = imported.map((f, idx) => ({
          id: `art_${Date.now()}_${idx}`,
          title: f.originalName ? f.originalName.replace(/\.[^/.]+$/, '') : `Œuvre #${idx + 1}`,
          description: 'Œuvre d\'exposition importée depuis Google Drive.',
          imageUrl: f.url
        }));

        const currentWalls = config.walls || normalizeWalls(config);
        const wallIdx = currentWalls.findIndex(w => w.id === driveImageTargetWallId);
        if (wallIdx !== -1) {
          const newWalls = [...currentWalls];
          newWalls[wallIdx] = {
            ...newWalls[wallIdx],
            artworks: [...(newWalls[wallIdx].artworks || []), ...newArtworks]
          };
          setConfig({ ...config, walls: newWalls });
          toast.success(`${imported.length} œuvre(s) d'art importée(s) depuis Google Drive !`);
        }
      }

      setShowDriveImagePicker(false);
      setSelectedDriveFileIds([]);
    } catch (err: any) {
      console.error("Erreur d'importation Drive:", err);
      toast.error("Erreur lors de l'importation serveur: " + (err.message || String(err)));
    } finally {
      setImportingDriveMedia(false);
    }
  };

  const handleLocalWallArtworksUpload = async (wallId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    const maxFiles = Array.from(filesList).slice(0, 20);
    toast.info(`Téléversement & conversion WebP de ${maxFiles.length} fichier(s)...`);
    try {
      const filePromises = maxFiles.map((file) => {
        return new Promise<{ name: string; mimeType: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              name: file.name,
              mimeType: file.type || 'image/jpeg',
              base64: event.target?.result as string
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Files = await Promise.all(filePromises);
      const res = await uploadLocalMedia(config.id, base64Files);
      if (!res.files || res.files.length === 0) {
        toast.error("Échec du téléversement local.");
        return;
      }
      const newArtworks: Artwork[] = res.files.map((f, idx) => ({
        id: `art_${Date.now()}_${idx}`,
        title: f.originalName ? f.originalName.replace(/\.[^/.]+$/, '') : `Œuvre #${idx + 1}`,
        description: 'Œuvre d\'exposition ajoutée depuis l\'appareil.',
        imageUrl: f.url
      }));
      const currentWalls = config.walls || normalizeWalls(config);
      const wallIndex = currentWalls.findIndex(w => w.id === wallId);
      if (wallIndex !== -1) {
        const updatedWalls = [...currentWalls];
        updatedWalls[wallIndex] = {
          ...updatedWalls[wallIndex],
          artworks: [...(updatedWalls[wallIndex].artworks || []), ...newArtworks]
        };
        setConfig({ ...config, walls: updatedWalls });
        toast.success(`${res.files.length} œuvre(s) d'art ajoutée(s) au mur !`);
      }
    } catch (err: any) {
      toast.error("Erreur de téléversement local: " + (err.message || String(err)));
    }
  };

  const handleLocalTimelineUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const maxFiles = Array.from(filesList).slice(0, 20);
    try {
      toast.info("Traitement et envoi vers le serveur...");
      const filePromises = maxFiles.map((file) => {
        return new Promise<{ name: string; mimeType: string; base64: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve({
              name: file.name,
              mimeType: file.type || 'image/jpeg',
              base64: event.target?.result as string
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      const base64Files = await Promise.all(filePromises);
      const res = await uploadLocalMedia(config.id, base64Files);
      if (res.files && res.files.length > 0) {
        const newItems: TimelineItem[] = res.files.map((f, idx) => ({
          id: `tl_${Date.now()}_${idx}`,
          year: '1970',
          title: f.originalName ? f.originalName.replace(/\.[^/.]+$/, '') : `Archive #${idx + 1}`,
          description: 'Ajoutez une légende ou un contexte historique...',
          imageUrl: f.url,
          thumbnailUrl: f.thumbnailUrl,
          originalName: f.originalName,
          sizeBytes: f.sizeBytes
        }));

        const existingTimeline = config.timeline || { enabled: true, title: 'Ligne du Temps & Archives', items: [] };
        setConfig({
          ...config,
          timeline: {
            ...existingTimeline,
            enabled: true,
            items: [...(existingTimeline.items || []), ...newItems]
          }
        });
        toast.success(`${res.files.length} archive(s) importée(s) depuis votre appareil !`);
      }
    } catch (err: any) {
      toast.error("Erreur d'import local: " + (err.message || String(err)));
    }
  };

  // States for advanced public QR poster creator
  const [posterTemplate, setPosterTemplate] = useState<'minimalist' | 'street' | 'chic' | 'festival'>('chic');
  const [posterTitle, setPosterTitle] = useState('');
  const [posterSubtitle, setPosterSubtitle] = useState('');
  const [posterCta, setPosterCta] = useState('');
  const [posterNote, setPosterNote] = useState('');
  const [posterShowFeatures, setPosterShowFeatures] = useState(true);
  const [posterShowWalls, setPosterShowWalls] = useState(true);
  const [posterShowInstructions, setPosterShowInstructions] = useState(true);

  useEffect(() => {
    if (config.themeColor) {
      setQrFgColor(config.themeColor);
    }
  }, [config.themeColor]);

  useEffect(() => {
    if (config.id) {
      setCustomQrUrl(`${window.location.origin}${window.location.pathname}?id=${config.id}`);
    } else {
      setCustomQrUrl('');
    }
  }, [config.id]);

  useEffect(() => {
    if (config) {
      setPosterTitle(config.name || "Exposition d'Art Urbain");
      setPosterSubtitle(config.brandName || "Une expérience immersive unique");
      setPosterCta("Scannez le QR Code ci-dessous pour lancer l'expérience interactive !");
      setPosterNote("Parcours libre et gratuit accessible 24h/24 dans la ville.");
    }
  }, [config.name, config.brandName]);

  useEffect(() => {
    if (config.ar?.modelUrl?.startsWith('data:')) {
      setArMode('upload');
    } else {
      setArMode('link');
    }
  }, [config.id]);

  const convertDriveLink = (url: string) => normalizeImageUrl(url);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const fetchUserCampaigns = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/campaigns?ownerUid=${user.uid}`);
      if (response.status === 401 || response.status === 403) {
        console.warn('Session expirée ou invalide. Déconnexion...');
        auth.signOut();
        return;
      }
      if (!response.ok) {
        throw new Error('PostgreSQL campaign list fetch failed');
      }
      const campaigns = await response.json();
      setUserCampaigns(campaigns);
      
      const activity = [...campaigns]
        .sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        })
        .slice(0, 5);
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching campaigns from PostgreSQL:', error);
      toast.error('Erreur lors du chargement des campagnes.');
    }
  };

  useEffect(() => {
    if (!user) {
      setUserCampaigns([]);
      return;
    }
    fetchUserCampaigns();
  }, [user]);

  const handleAuthStepOne = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput) {
      toast.error('Veuillez entrer une adresse email valide.');
      return;
    }
    setAuthLoading(true);
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput })
      });
      if (!response.ok) throw new Error('Échec de la vérification de l\'email');
      const data = await response.json();
      setIsRegisterMode(!data.exists);
      setAuthStep('password');
    } catch (err: any) {
      console.error(err);
      toast.error('Erreur de connexion au serveur d\'authentification.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthStepTwo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput) {
      toast.error('Veuillez entrer votre mot de passe.');
      return;
    }
    if (isRegisterMode && passwordInput !== confirmPasswordInput) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }
    if (isRegisterMode && passwordInput.length < 6) {
      toast.error('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setAuthLoading(true);
    try {
      await auth.signInWithEmail(emailInput, passwordInput, isRegisterMode, nameInput);
      toast.success(isRegisterMode ? 'Compte créé avec succès !' : 'Connexion réussie !');
    } catch (error: any) {
      console.error('Auth step two error:', error);
      toast.error(error.message || 'Erreur lors de la validation.');
    } finally {
      setAuthLoading(false);
    }
  };

  const loginWithEmail = async (email: string, displayName?: string) => {
    setAuthLoading(true);
    try {
      // By default use a fixed secure password for quick demo access
      const isDemo = email === 'crealab.imed@gmail.com';
      const passwordToUse = isDemo ? 'crealab_demo_123' : 'legacy_bypass_pwd_123';
      
      // Attempt login, on backend it'll auto-migrate/register if missing
      await auth.signInWithEmail(email, passwordToUse, false, displayName);
      toast.success('Connexion réussie !');
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(error.message || 'Erreur lors de la connexion.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Debounced auto-save effect to persist form changes to PostgreSQL
  useEffect(() => {
    if (!user) return;
    const currentConfigStr = JSON.stringify(config);

    // Initial setup of lastSavedConfigRef if blank
    if (!lastSavedConfigRef.current) {
      lastSavedConfigRef.current = currentConfigStr;
      return;
    }

    // Skip auto-save if no change has occurred
    if (currentConfigStr === lastSavedConfigRef.current) {
      return;
    }

    // Clear existing pending timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setAutoSaveStatus('saving');

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const campaignId = config.id || Math.random().toString(36).substring(2, 15);

        const response = await fetch('/api/campaigns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: campaignId,
            ...config,
            ownerUid: user.uid,
            workspaceToken: sessionStorage.getItem('workspace_token')
          })
        });

        if (!response.ok) {
          throw new Error(`PostgreSQL auto-save failed with status ${response.status}`);
        }

        const savedData = await response.json();

        // If this was a new campaign without an ID, set the ID in config
        if (!config.id && savedData.id) {
          setConfig((prev) => ({ ...prev, id: savedData.id }));
          lastSavedConfigRef.current = JSON.stringify({ ...config, id: savedData.id });
        } else {
          lastSavedConfigRef.current = currentConfigStr;
        }

        setAutoSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
        fetchUserCampaigns();
      } catch (err) {
        console.error('Erreur de sauvegarde automatique PostgreSQL:', err);
        setAutoSaveStatus('error');
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config, user]);

  const saveCampaign = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour publier.');
      return;
    }

    setIsSaving(true);
    try {
      const isNew = !config.id;
      const campaignId = config.id || Math.random().toString(36).substring(2, 15);
      
      // Save to PostgreSQL
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: campaignId,
          ...config,
          ownerUid: user.uid,
          workspaceToken: sessionStorage.getItem('workspace_token')
        })
      });

      if (!response.ok) {
        throw new Error(`PostgreSQL save failed with status ${response.status}`);
      }
      
      const savedConfig = await response.json();
      setConfig(savedConfig);
      lastSavedConfigRef.current = JSON.stringify(savedConfig);
      setAutoSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));

      const url = `${window.location.origin}${window.location.pathname}?id=${campaignId}`;
      setGeneratedUrl(url);
      toast.success(isNew ? 'Nouvelle campagne publiée !' : 'Campagne mise à jour avec succès !');
      
      // Refresh user campaigns
      fetchUserCampaigns();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Erreur lors de l\'enregistrement de la campagne.');
      setAutoSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCampaign = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) return;
    
    try {
      // Delete from PostgreSQL
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('PostgreSQL deletion failed');
      }

      toast.success('Campagne supprimée.');
      if (config.id === id) {
        setConfig(initialConfig);
        setGeneratedUrl('');
      }
      
      // Refresh list
      fetchUserCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Erreur lors de la suppression.');
    }
  };

  const downloadQRPNGFromSVG = (svgElement: SVGElement, fileName: string) => {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const exportSize = 1024;
    canvas.width = exportSize;
    canvas.height = exportSize;
    
    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = qrBgColor;
        ctx.fillRect(0, 0, exportSize, exportSize);
        ctx.drawImage(img, 0, 0, exportSize, exportSize);
      }
      try {
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = fileName;
        downloadLink.href = pngFile;
        downloadLink.click();
        toast.success("QR Code PNG de haute qualité téléchargé !");
      } catch (err) {
        console.error("Failed to export PNG from SVG", err);
        toast.error("Erreur d'exportation PNG.");
      }
    };
    
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
  };

  const downloadQR = () => {
    const svg = document.getElementById('campaign-qr-code') as any as SVGElement;
    if (!svg) {
      const fallbackSvg = document.querySelector('svg') as SVGElement;
      if (!fallbackSvg) return;
      downloadQRPNGFromSVG(fallbackSvg, `QR-${config.name || 'campagne'}.png`);
      return;
    }
    downloadQRPNGFromSVG(svg, `QR-${config.name || 'campagne'}.png`);
  };

  const downloadCustomQRSVG = (elementId: string) => {
    const svg = document.getElementById(elementId) as any as SVGElement;
    if (!svg) {
      toast.error("QR Code non trouvé.");
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.download = `QR-${config.name || 'campagne'}.svg`;
    downloadLink.href = url;
    downloadLink.click();
    URL.revokeObjectURL(url);
    toast.success("QR Code SVG téléchargé !");
  };

  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `FESTIV.APP - ${config.brandName}`,
          text: `Découvrez la campagne "${config.name}" de ${config.brandName}`,
          url: generatedUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const renderPosterContent = (isPrint: boolean) => {
    const wallsList = config.walls || normalizeWalls(config) || [];
    const activeFeatures = [
      config.ar?.enabled && { label: "Réalité Augmentée 🧱" },
      config.scratchCard?.enabled && { label: "Jeu Grattez & Gagnez 🎁" },
      config.quiz?.enabled && { label: "Quiz & Énigmes ❓" },
      config.spinWheel?.enabled && { label: "Roue de la Fortune 🎡" },
      config.photobooth?.enabled && { label: "Photobooth Souvenirs 📸" },
    ].filter(Boolean) as { label: string }[];

    const titleText = posterTitle || config.name || "Exposition d'Art";
    const subtitleText = posterSubtitle || config.brandName || "Médina d'Art";
    const ctaText = posterCta || "Scannez pour commencer !";
    const noteText = posterNote || "Gratuit et ouvert à tous.";

    switch (posterTemplate) {
      case 'chic':
        return (
          <div className={cn(
            "h-full w-full flex flex-col justify-between text-neutral-900 text-center relative",
            isPrint ? "p-12 bg-[#FAF9F6] border-[8px] border-double border-neutral-800" : "p-6 bg-[#FAF9F6] border-4 border-double border-neutral-800 rounded-2xl"
          )} style={{ fontFamily: 'Georgia, serif' }}>
            
            <div className="space-y-4">
              {subtitleText && (
                <p className={cn(
                  "uppercase tracking-[0.25em] text-neutral-500 font-sans",
                  isPrint ? "text-sm" : "text-[8px]"
                )}>
                  {subtitleText}
                </p>
              )}
              
              <h1 className={cn(
                "font-serif font-normal italic tracking-tight text-neutral-900 border-b border-neutral-200 pb-4",
                isPrint ? "text-4xl" : "text-xl"
              )}>
                {titleText}
              </h1>
            </div>

            <div className="my-auto flex flex-col items-center justify-center space-y-4 py-4">
              <p className={cn(
                "max-w-md mx-auto text-neutral-700 italic font-sans",
                isPrint ? "text-lg leading-relaxed" : "text-[10px] leading-normal"
              )}>
                {ctaText}
              </p>

              <div className={cn(
                "bg-white p-4 rounded-xl shadow-md border border-neutral-100 inline-block",
                isPrint ? "p-6" : "p-2.5"
              )}>
                <QRCodeSVG 
                  value={customQrUrl || `${window.location.origin}${window.location.pathname}`}
                  size={isPrint ? 260 : 130}
                  fgColor={config.themeColor || "#4f46e5"}
                  bgColor="#ffffff"
                  level="H"
                />
              </div>

              <p className={cn(
                "text-neutral-400 font-sans tracking-wide uppercase",
                isPrint ? "text-[11px]" : "text-[7px]"
              )}>
                📷 OUVREZ L'APPAREIL PHOTO ET SCANNEZ
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-neutral-150 font-sans">
              {posterShowWalls && wallsList.length > 0 && (
                <div className="space-y-1.5">
                  <p className={cn("text-neutral-400 uppercase tracking-widest font-bold", isPrint ? "text-xs" : "text-[7px]")}>
                    Le Parcours de l'Exposition
                  </p>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-neutral-700 font-medium">
                    {wallsList.slice(0, 4).map((w, idx) => (
                      <span key={w.id} className={cn(isPrint ? "text-xs" : "text-[8px]")}>
                        📍 {w.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {noteText && (
                <p className={cn("text-neutral-400 italic", isPrint ? "text-xs" : "text-[8px]")}>
                  {noteText}
                </p>
              )}
            </div>
          </div>
        );

      case 'street':
        return (
          <div className={cn(
            "h-full w-full flex flex-col justify-between text-neutral-900 text-left relative bg-white",
            isPrint ? "p-12 border-[12px] border-black" : "p-6 border-4 border-black rounded-2xl"
          )} style={{ fontFamily: 'system-ui, sans-serif' }}>
            
            <div className="space-y-3">
              {subtitleText && (
                <span className={cn(
                  "inline-block bg-black text-white font-black uppercase tracking-wider",
                  isPrint ? "px-4 py-1.5 text-xs" : "px-2 py-0.5 text-[7px]"
                )}>
                  {subtitleText}
                </span>
              )}
              <h1 className={cn(
                "font-black tracking-tighter uppercase leading-none text-black",
                isPrint ? "text-5xl" : "text-2xl"
              )}>
                {titleText}
              </h1>
            </div>

            <div className="my-auto flex flex-col items-start gap-4 py-6">
              {posterShowInstructions && (
                <div className="space-y-4 w-full">
                  <div className="flex items-start gap-2">
                    <div className={cn("bg-black text-white font-black flex items-center justify-center rounded-full flex-shrink-0", isPrint ? "w-8 h-8 text-sm" : "w-5 h-5 text-[9px]")}>1</div>
                    <div>
                      <p className={cn("font-bold text-black uppercase", isPrint ? "text-sm" : "text-[8px]")}>Ouvrez l'appareil photo</p>
                      <p className={cn("text-neutral-500", isPrint ? "text-xs" : "text-[7px]")}>De votre smartphone iOS ou Android.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className={cn("bg-black text-white font-black flex items-center justify-center rounded-full flex-shrink-0", isPrint ? "w-8 h-8 text-sm" : "w-5 h-5 text-[9px]")}>2</div>
                    <div>
                      <p className={cn("font-bold text-black uppercase", isPrint ? "text-sm" : "text-[8px]")}>Scannez le QR Code</p>
                      <p className={cn("text-neutral-500", isPrint ? "text-xs" : "text-[7px]")}>Visez le code au centre de cette affiche.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className={cn("bg-black text-white font-black flex items-center justify-center rounded-full flex-shrink-0", isPrint ? "w-8 h-8 text-sm" : "w-5 h-5 text-[9px]")}>3</div>
                    <div>
                      <p className={cn("font-bold text-black uppercase", isPrint ? "text-sm" : "text-[8px]")}>Lancez l'expérience</p>
                      <p className={cn("text-neutral-500", isPrint ? "text-xs" : "text-[7px]")}>Admirez la réalité augmentée et jouez !</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full flex justify-center pt-2">
                <div className={cn(
                  "border-4 border-black p-3 bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] inline-block",
                  isPrint ? "p-6" : "p-2"
                )}>
                  <QRCodeSVG 
                    value={customQrUrl || `${window.location.origin}${window.location.pathname}`}
                    size={isPrint ? 240 : 120}
                    fgColor="#000000"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t-2 border-black flex items-center justify-between">
              <p className={cn("font-mono text-neutral-500", isPrint ? "text-xs" : "text-[7px]")}>
                {ctaText}
              </p>
              {noteText && (
                <p className={cn("font-bold text-black uppercase tracking-wider", isPrint ? "text-xs" : "text-[7px]")}>
                  {noteText}
                </p>
              )}
            </div>
          </div>
        );

      case 'minimalist':
        return (
          <div className={cn(
            "h-full w-full flex flex-col justify-between text-black text-left bg-white",
            isPrint ? "p-14" : "p-6"
          )} style={{ fontFamily: 'sans-serif' }}>
            
            <div className="space-y-2 border-l-4 border-black pl-4">
              <h1 className={cn(
                "font-sans font-black tracking-tighter uppercase leading-none",
                isPrint ? "text-6xl" : "text-2xl"
              )}>
                {titleText}
              </h1>
              {subtitleText && (
                <p className={cn(
                  "text-neutral-500 font-semibold uppercase tracking-wider",
                  isPrint ? "text-sm" : "text-[8px]"
                )}>
                  {subtitleText}
                </p>
              )}
            </div>

            <div className="my-auto flex flex-col items-center justify-center space-y-6">
              <div className={cn(
                "p-2 bg-neutral-50 rounded-xl border border-neutral-200 inline-block",
                isPrint ? "p-6" : "p-2.5"
              )}>
                <QRCodeSVG 
                  value={customQrUrl || `${window.location.origin}${window.location.pathname}`}
                  size={isPrint ? 280 : 140}
                  fgColor="#000000"
                  bgColor="#ffffff"
                  level="H"
                />
              </div>

              <p className={cn(
                "text-center max-w-sm font-semibold tracking-tight text-neutral-800",
                isPrint ? "text-lg" : "text-[9px]"
              )}>
                {ctaText}
              </p>
            </div>

            <div className="flex justify-between items-end border-t border-neutral-200 pt-4 text-neutral-500 font-mono">
              <div className="space-y-1">
                {wallsList.length > 0 && (
                  <p className={cn(isPrint ? "text-[10px]" : "text-[6px]")}>
                    📍 {wallsList.length} LOCATIONS CONFIGURÉES
                  </p>
                )}
                <p className={cn(isPrint ? "text-[10px]" : "text-[6px]")}>
                  {noteText}
                </p>
              </div>
              <p className={cn(isPrint ? "text-[10px]" : "text-[6px]")}>
                POWERED BY FESTIV.APP
              </p>
            </div>
          </div>
        );

      case 'festival':
      default:
        return (
          <div className={cn(
            "h-full w-full flex flex-col justify-between text-white text-center relative overflow-hidden",
            isPrint ? "p-12" : "p-6 rounded-2xl"
          )} style={{ 
            background: `linear-gradient(135deg, ${config.themeColor || '#4f46e5'} 0%, #1e1b4b 100%)`,
            fontFamily: 'system-ui, sans-serif'
          }}>
            {/* Abstract background shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            
            <div className="space-y-2 z-10 relative">
              {subtitleText && (
                <span className={cn(
                  "inline-block bg-white/20 backdrop-blur-md rounded-full font-black uppercase tracking-widest text-white border border-white/20",
                  isPrint ? "px-4 py-1.5 text-xs" : "px-2 py-0.5 text-[6px]"
                )}>
                  🎉 {subtitleText}
                </span>
              )}
              <h1 className={cn(
                "font-black tracking-tight leading-none text-white drop-shadow-md",
                isPrint ? "text-4xl" : "text-xl"
              )}>
                {titleText}
              </h1>
            </div>

            <div className="my-auto space-y-4 z-10 relative">
              {posterShowFeatures && activeFeatures.length > 0 && (
                <div className="flex flex-wrap justify-center gap-1.5 max-w-xs mx-auto">
                  {activeFeatures.map((f, idx) => (
                    <span 
                      key={idx} 
                      className={cn(
                        "bg-white/10 backdrop-blur-sm rounded-full font-bold text-white border border-white/10",
                        isPrint ? "px-3 py-1.5 text-xs" : "px-2 py-0.5 text-[7px]"
                      )}
                    >
                      {f.label}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-center">
                <div className={cn(
                  "bg-white p-3 rounded-2xl shadow-xl border border-white/20 inline-block transform hover:scale-105 transition-transform",
                  isPrint ? "p-6" : "p-2.5"
                )}>
                  <QRCodeSVG 
                    value={customQrUrl || `${window.location.origin}${window.location.pathname}`}
                    size={isPrint ? 240 : 120}
                    fgColor={config.themeColor || "#4f46e5"}
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>
              </div>

              <p className={cn(
                "max-w-xs mx-auto font-medium text-white/90 leading-snug drop-shadow-sm",
                isPrint ? "text-base" : "text-[9px]"
              )}>
                {ctaText}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-between items-center text-white/60 z-10 relative">
              <span className={cn("font-bold uppercase tracking-wider", isPrint ? "text-[10px]" : "text-[6px]")}>
                {noteText}
              </span>
              <span className={cn("font-mono", isPrint ? "text-[10px]" : "text-[6px]")}>
                SCAN & PLAY
              </span>
            </div>
          </div>
        );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 font-sans text-neutral-900 antialiased">
        <Toaster position="top-right" richColors />
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl shadow-neutral-100 border border-neutral-150 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-2xl mx-auto mb-2">
              <Layout className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-neutral-950">
              FESTIV<span className="text-indigo-600">.APP</span>
            </h1>
            <p className="text-sm text-neutral-500 max-w-xs mx-auto">
              Concevez, publiez et analysez vos expositions interactives en quelques secondes.
            </p>
          </div>

          {authStep === 'email' ? (
            <form onSubmit={handleAuthStepOne} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Adresse Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  required
                  className="rounded-xl border-neutral-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Nom Complet (Optionnel)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Votre Nom"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="rounded-xl border-neutral-200"
                />
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Vérification...
                  </>
                ) : (
                  <>
                    Continuer <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAuthStepTwo} className="space-y-4">
              <button
                type="button"
                onClick={() => setAuthStep('email')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 mb-2"
              >
                ← Utiliser un autre email ({emailInput})
              </button>

              <div className="text-xs p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-600">
                {isRegisterMode ? (
                  <span>✨ <strong>Nouvel utilisateur :</strong> définissez un mot de passe pour créer votre compte.</span>
                ) : (
                  <span>🔒 <strong>Utilisateur existant :</strong> entrez votre mot de passe pour vous connecter.</span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  className="rounded-xl border-neutral-200"
                />
              </div>

              {isRegisterMode && (
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    required
                    className="rounded-xl border-neutral-200"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Traitement en cours...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" /> {isRegisterMode ? "Créer mon compte" : "Se connecter"}
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-neutral-150"></div>
            <span className="flex-shrink mx-4 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ou</span>
            <div className="flex-grow border-t border-neutral-150"></div>
          </div>

          {/* Quick Demo Credentials */}
          <Button
            type="button"
            variant="outline"
            disabled={authLoading}
            onClick={() => {
              setEmailInput('crealab.imed@gmail.com');
              setNameInput('Créalab Admin');
              loginWithEmail('crealab.imed@gmail.com', 'Créalab Admin');
            }}
            className="w-full py-3 rounded-xl border-neutral-200 text-neutral-600 font-bold hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Accès Rapide Admin Démo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 md:p-8 font-sans text-neutral-900 print:bg-white print:p-0">
      <Toaster position="top-right" richColors />
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor Side */}
        <div className="lg:col-span-7 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
                <Layout className="w-8 h-8 text-indigo-600" />
                FESTIV<span className="text-indigo-600">.APP</span>
              </h1>
              <p className="text-neutral-500 text-sm">Créez des expériences interactives mémorables pour vos visiteurs.</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-save Status Badge */}
              <div className="flex items-center">
                {autoSaveStatus === 'saving' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200/60 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                    <span className="hidden md:inline">Sauvegarde auto...</span>
                  </div>
                )}
                {autoSaveStatus === 'saved' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="hidden md:inline">Auto-sauvegardé {lastSavedTime ? `à ${lastSavedTime}` : ''}</span>
                  </div>
                )}
                {autoSaveStatus === 'error' && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-semibold border border-red-200/60">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    <span className="hidden md:inline">Échec sauvegarde auto</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full border border-neutral-200 shadow-sm">
                {userRole === 'admin' && (
                  <div className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                    <ShieldCheck className="w-2.5 h-2.5" /> Admin
                  </div>
                )}
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-neutral-100" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-xs">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                )}
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold leading-none">{user.displayName || 'Utilisateur'}</span>
                  <span className="text-[10px] text-neutral-400 leading-none mt-0.5">{user.email}</span>
                </div>
                <button 
                  onClick={() => auth.signOut()} 
                  className="ml-2 p-1 hover:bg-neutral-100 rounded-full transition-colors text-neutral-400 hover:text-red-500"
                  title="Déconnexion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 w-full bg-neutral-100 p-1 rounded-xl h-auto gap-1 lg:gap-0">
              <TabsTrigger value="dashboard" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Dashboard</TabsTrigger>
              <TabsTrigger value="general" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Général</TabsTrigger>
              <TabsTrigger value="game" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Jeu</TabsTrigger>
              <TabsTrigger value="content" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Contenu</TabsTrigger>
              <TabsTrigger value="media" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Média</TabsTrigger>
              <TabsTrigger value="workspace" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Workspace</TabsTrigger>
              <TabsTrigger value="qrcode" className="rounded-lg py-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50/50">Partage & QR</TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-lg py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">Avancé</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-250px)] mt-6 pr-4">
              <TabsContent value="dashboard" className="space-y-6 mt-0">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card className="border-none shadow-sm bg-indigo-50">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Scans</p>
                      <p className="text-2xl font-black text-indigo-900">{userCampaigns.reduce((acc, c) => acc + (c.stats?.scans || 0), 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-green-50">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Jeux Joués</p>
                      <p className="text-2xl font-black text-green-900">{userCampaigns.reduce((acc, c) => acc + (c.stats?.gamesCompleted || 0), 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-purple-50">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Coupons</p>
                      <p className="text-2xl font-black text-purple-900">{userCampaigns.reduce((acc, c) => acc + (c.stats?.couponViews || 0), 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-orange-50">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Victoires</p>
                      <p className="text-2xl font-black text-orange-900">{userCampaigns.reduce((acc, c) => acc + (c.stats?.spinWins || 0) + (c.stats?.quizWins || 0), 0)}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-sky-50">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Partages</p>
                      <p className="text-2xl font-black text-sky-900">
                        {userCampaigns.reduce((acc, c) => acc + (c.stats?.shares?.whatsapp || 0) + (c.stats?.shares?.instagram || 0) + (c.stats?.shares?.tiktok || 0), 0)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-none shadow-sm bg-pink-50">
                    <CardContent className="p-4">
                      <p className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">Leads (Social)</p>
                      <p className="text-2xl font-black text-pink-900">{userCampaigns.reduce((acc, c) => acc + (c.stats?.leads || 0), 0)}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-neutral-400">Activité des 7 derniers jours</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={buildChartData(userCampaigns)}>
                            <defs>
                              <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.12}/>
                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorJeux" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.12}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorCoupons" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.12}/>
                                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 10, fontWeight: 600, fill: '#a3a3a3' }}
                              dy={10}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a3a3a3' }} width={28} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="scans"   name="Scans"   stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorScans)" />
                            <Area type="monotone" dataKey="jeux"    name="Jeux"    stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorJeux)" />
                            <Area type="monotone" dataKey="coupons" name="Coupons" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorCoupons)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    {config.id && (
                      <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <CardHeader className="pb-3 border-b border-neutral-100">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-black uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                              <QrCode className="w-4 h-4 text-indigo-600" /> QR Code de l'Événement Physique
                            </CardTitle>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Génération Automatique
                            </span>
                          </div>
                          <CardDescription className="text-xs text-neutral-500 mt-1">
                            Affichez ce QR code unique dans vos espaces publics physiques (musées, commerces, salons) pour permettre à vos visiteurs d'accéder instantanément à votre exposition interactive en un scan.
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* QR Code Container */}
                            <div className="bg-neutral-50 p-4 rounded-3xl border border-neutral-100 flex items-center justify-center shrink-0 shadow-inner">
                              <QRCodeSVG 
                                id="dashboard-physical-campaign-qr" 
                                value={`${window.location.origin}${window.location.pathname}?id=${config.id}`} 
                                size={150} 
                                fgColor={config.themeColor || '#4f46e5'}
                                bgColor="#ffffff"
                                includeMargin={true}
                              />
                            </div>

                            {/* Info & Action Buttons */}
                            <div className="flex-1 space-y-4 text-center md:text-left w-full">
                              <div>
                                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Lien ciblé</h4>
                                <p className="text-xs font-mono text-neutral-600 mt-1 bg-neutral-50 p-2 rounded-lg border border-neutral-150 truncate max-w-xs md:max-w-md">
                                  {`${window.location.origin}${window.location.pathname}?id=${config.id}`}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <Button 
                                  onClick={() => {
                                    const svg = document.getElementById('dashboard-physical-campaign-qr') as any as SVGElement;
                                    if (svg) {
                                      downloadQRPNGFromSVG(svg, `QR-${config.name.replace(/\s+/g, '-').toLowerCase()}-evenement.png`);
                                    } else {
                                      toast.error("QR Code non disponible.");
                                    }
                                  }}
                                  className="rounded-xl font-bold py-5 px-4 text-xs flex items-center gap-2"
                                  style={{ backgroundColor: config.themeColor || '#4f46e5' }}
                                >
                                  <Download className="w-4 h-4" /> Télécharger PNG (HD)
                                </Button>
                                
                                <Button 
                                  variant="outline"
                                  onClick={() => {
                                    const svg = document.getElementById('dashboard-physical-campaign-qr') as any as SVGElement;
                                    if (svg) {
                                      const svgData = new XMLSerializer().serializeToString(svg);
                                      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                                      const url = URL.createObjectURL(blob);
                                      const downloadLink = document.createElement('a');
                                      downloadLink.download = `QR-${config.name.replace(/\s+/g, '-').toLowerCase()}-evenement.svg`;
                                      downloadLink.href = url;
                                      downloadLink.click();
                                      URL.revokeObjectURL(url);
                                      toast.success("Fichier vectoriel SVG téléchargé !");
                                    } else {
                                      toast.error("QR Code non disponible.");
                                    }
                                  }}
                                  className="rounded-xl font-bold py-5 px-4 text-xs flex items-center gap-2 border-neutral-200 hover:bg-neutral-50"
                                >
                                  <Box className="w-4 h-4" /> Télécharger SVG
                                </Button>

                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setActiveTab('qrcode');
                                  }}
                                  className="rounded-xl font-bold py-5 px-4 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 flex items-center gap-2"
                                >
                                  <Sliders className="w-4 h-4" /> Personnaliser & Affiches →
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Dernières Activités
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {recentActivity.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic">Aucune activité récente.</p>
                      ) : (
                        recentActivity.map((camp) => (
                          <div 
                            key={camp.id} 
                            className="flex flex-col gap-2 p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer group"
                            onClick={() => {
                              setConfig(camp);
                              lastSavedConfigRef.current = JSON.stringify(camp);
                              setAutoSaveStatus('idle');
                              setGeneratedUrl(`${window.location.origin}${window.location.pathname}?id=${camp.id}`);
                              setActiveTab('general');
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate group-hover:text-indigo-600 transition-colors">{camp.name}</p>
                                <p className="text-[10px] text-neutral-400">
                                  {camp.updatedAt ? 'Mis à jour' : 'Créé'} {
                                    camp.updatedAt?.toDate 
                                      ? camp.updatedAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) 
                                      : camp.createdAt?.toDate 
                                        ? camp.createdAt.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) 
                                        : ''
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pl-5">
                              <div className="flex items-center gap-1 text-[9px] font-bold text-sky-600">
                                <Eye className="w-3 h-3" /> {camp.stats?.scans || 0}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-green-600">
                                <Gift className="w-3 h-3" /> {camp.stats?.gamesCompleted || 0}
                              </div>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-purple-600">
                                <Ticket className="w-3 h-3" /> {camp.stats?.couponViews || 0}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" /> Templates Rapides
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJsonModal(true)}
                      className="rounded-xl font-bold text-xs gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
                    >
                      <Code className="w-4 h-4" /> Importer / Exporter JSON
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(TEMPLATES).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => loadTemplateAsNew(template)}
                        className="group relative h-32 rounded-2xl overflow-hidden border-2 border-transparent hover:border-indigo-600 transition-all text-left"
                      >
                        <img 
                          src={template.story?.imageUrl} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                        <div className="absolute inset-x-3 bottom-3 text-left">
                          <p className="text-white font-black text-xs uppercase tracking-tight leading-tight line-clamp-2">{template.name}</p>
                          <p className="text-white/70 text-[9px] font-bold uppercase tracking-wider line-clamp-1">{template.brandName}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black tracking-tight">Mes Expositions</h2>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-full gap-2"
                    onClick={() => {
                      setConfig(initialConfig);
                      lastSavedConfigRef.current = JSON.stringify(initialConfig);
                      setAutoSaveStatus('idle');
                      setGeneratedUrl('');
                      setActiveTab('general');
                    }}
                  >
                    <Plus className="w-4 h-4" /> Nouvelle
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {userCampaigns.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-neutral-200">
                      <p className="text-neutral-400 font-medium">Aucune exposition active.</p>
                    </div>
                  ) : (
                    userCampaigns.map((camp) => (
                      <Card key={camp.id} className="border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden group" onClick={() => {
                        setConfig(camp);
                        lastSavedConfigRef.current = JSON.stringify(camp);
                        setAutoSaveStatus('idle');
                        setGeneratedUrl(`${window.location.origin}${window.location.pathname}?id=${camp.id}`);
                        setActiveTab('general');
                      }}>
                        <div className="flex items-center p-4 gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {camp.story?.imageUrl ? (
                              <img src={camp.story.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <Store className="w-8 h-8 text-neutral-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate">{camp.name}</h4>
                            <p className="text-xs text-neutral-400 font-medium">{camp.brandName}</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-600 uppercase tracking-wider bg-sky-50 px-2 py-1 rounded-md">
                                <Eye className="w-3 h-3" /> {camp.stats?.scans || 0} scans
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider bg-green-50 px-2 py-1 rounded-md">
                                <Gift className="w-3 h-3" /> {camp.stats?.gamesCompleted || 0} visites
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600 uppercase tracking-wider bg-purple-50 px-2 py-1 rounded-md">
                                <Ticket className="w-3 h-3" /> {camp.stats?.couponViews || 0} accès/invites
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-wider bg-orange-50 px-2 py-1 rounded-md">
                                <Dices className="w-3 h-3" /> {camp.stats?.spinWins || 0} spins
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-pink-600 uppercase tracking-wider bg-pink-50 px-2 py-1 rounded-md">
                                <HelpCircle className="w-3 h-3" /> {camp.stats?.quizWins || 0} quiz
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                              onClick={(e) => deleteCampaign(camp.id!, e)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:text-sky-600 transition-colors" />
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="general" className="space-y-6 mt-0">
                <Card className="border-none shadow-sm">
                  <CardHeader>
                     <CardTitle className="text-lg">Informations de l'Exposition</CardTitle>
                     <CardDescription>Configurez les bases et le lieu de votre exposition interactive.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nom de l'exposition</Label>
                      <Input 
                        value={config.name} 
                        onChange={(e) => setConfig({...config, name: e.target.value})}
                        placeholder="Ex: Exposition Picasso & l'Art Moderne"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Centre Culturel / Lieu de l'exposition</Label>
                      <Input 
                        value={config.brandName} 
                        onChange={(e) => setConfig({...config, brandName: e.target.value})}
                        placeholder="Ex: Centre d'Art Contemporain"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>WhatsApp (Accueil / Renseignements)</Label>
                      <Input 
                        value={config.whatsapp} 
                        onChange={(e) => setConfig({...config, whatsapp: e.target.value})}
                        placeholder="Ex: 33100000000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin d'exposition</Label>
                      <Input 
                        type="date" 
                        value={config.expiresAt || ''} 
                        onChange={(e) => setConfig({...config, expiresAt: e.target.value})}
                      />
                      <p className="text-[10px] text-neutral-400">L'exposition interactive sera automatiquement archivée après cette date.</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-neutral-700">
                        <Globe className="w-4 h-4 text-indigo-600" /> Langue de l'expérience client (Language)
                      </Label>
                      <select
                        value={config.language || 'fr'}
                        onChange={(e) => setConfig({...config, language: e.target.value as 'fr' | 'en'})}
                        className="w-full h-11 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium transition-all"
                      >
                        <option value="fr">🇫🇷 Français (FR)</option>
                        <option value="en">🇬🇧 English (EN)</option>
                      </select>
                      <p className="text-[10px] text-neutral-400">Configure la langue par défaut de l'interface visiteur (boutons, formulaires et jeux interactifs).</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="w-5 h-5 text-indigo-600" /> Branding, Logo & Couleur Client
                    </CardTitle>
                    <CardDescription>
                      Choisissez la couleur thématique principale et téléchargez le logo de votre entreprise pour personnaliser l'interface mobile de vos visiteurs.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo Section */}
                    <div className="space-y-4 border-b border-neutral-100 pb-6 mb-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Logo de l'Entreprise / de la Marque</Label>
                        {config.logoUrl && (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Logo configuré
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Drag and Drop Upload Area */}
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingLogo(true);
                          }}
                          onDragLeave={() => setIsDraggingLogo(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingLogo(false);
                            const files = e.dataTransfer.files;
                            if (files && files.length > 0) {
                              const file = files[0];
                              if (!file.type.startsWith('image/')) {
                                toast.error("Le fichier doit être une image.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                if (event.target?.result) {
                                  setConfig({ ...config, logoUrl: event.target.result as string });
                                  toast.success("Logo de marque mis à jour avec succès ! 🎉");
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className={cn(
                            "border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center min-h-[140px] cursor-pointer relative",
                            isDraggingLogo
                              ? "border-indigo-500 bg-indigo-50/40"
                              : config.logoUrl
                                ? "border-neutral-200 bg-neutral-50/30 hover:border-neutral-300"
                                : "border-neutral-200 bg-white hover:border-indigo-400 hover:bg-neutral-50/30"
                          )}
                          onClick={() => {
                            document.getElementById('brand-logo-file-input')?.click();
                          }}
                        >
                          <input
                            id="brand-logo-file-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                const file = files[0];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setConfig({ ...config, logoUrl: event.target.result as string });
                                    toast.success("Logo de marque mis à jour avec succès ! 🎉");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />

                          {config.logoUrl ? (
                            <div className="flex flex-col items-center gap-2">
                              <img
                                src={normalizeImageUrl(config.logoUrl)}
                                alt="Aperçu logo"
                                className="h-16 w-auto max-w-[150px] object-contain rounded-lg p-1 bg-white border border-neutral-150 shadow-xs"
                                referrerPolicy="no-referrer"
                              />
                              <p className="text-[10px] text-neutral-400">Cliquez ou glissez une autre image pour remplacer</p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <div className="p-3 bg-neutral-50 rounded-full border border-neutral-100 text-neutral-400">
                                <ImageIcon className="w-5 h-5" />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-bold text-neutral-700">Glissez-déposez votre logo ici</p>
                                <p className="text-[10px] text-neutral-400">Ou cliquez pour sélectionner (PNG, JPG, SVG, max 2Mo)</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* URL input and actions */}
                        <div className="flex flex-col justify-between gap-3 bg-neutral-50/50 p-4 rounded-2xl border border-neutral-150">
                          <div className="space-y-2">
                            <Label htmlFor="logo-url-input" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Ou utilisez un lien d'image direct</Label>
                            <div className="flex gap-2 items-center">
                              <Input
                                id="logo-url-input"
                                value={config.logoUrl || ''}
                                onChange={(e) => {
                                  const converted = convertDriveLink(e.target.value);
                                  setConfig({ ...config, logoUrl: converted });
                                }}
                                placeholder="Ex: https://votre-site.com/logo.png ou lien Drive"
                                className="text-xs rounded-xl border-neutral-200 bg-white flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                className="text-xs font-bold gap-1 border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 shrink-0 rounded-xl"
                                onClick={() => handleOpenDrivePicker('logo')}
                              >
                                <Cloud className="w-3.5 h-3.5 text-sky-600" /> Choisir depuis Google Drive
                              </Button>
                            </div>
                            <p className="text-[9px] text-neutral-400 leading-normal">
                              Pratique si votre logo est déjà hébergé en ligne. Les formats PNG transparents sur fond clair ou sombre sont recommandés.
                            </p>
                          </div>

                          {config.logoUrl && (
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfig({ ...config, logoUrl: '' });
                                toast.success("Logo supprimé.");
                              }}
                              className="w-full text-rose-600 border-rose-100 bg-rose-50/30 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-bold py-2 rounded-xl flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Supprimer le logo actuel
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Color Presets Grid */}
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Palettes thématiques suggérées</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { name: 'Indigo Royal', value: '#4f46e5' },
                          { name: 'Émeraude Sauvage', value: '#10b981' },
                          { name: 'Ambre Chaud', value: '#f59e0b' },
                          { name: 'Rose Pop', value: '#f43f5e' },
                          { name: 'Violet Électrique', value: '#8b5cf6' },
                          { name: 'Ardoise Minimal', value: '#334155' },
                          { name: 'Turquoise Océan', value: '#06b6d4' },
                          { name: 'Rubis Passion', value: '#dc2626' }
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setConfig({...config, themeColor: preset.value})}
                            className={cn(
                              "flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all",
                              (config.themeColor || '#4f46e5').toLowerCase() === preset.value.toLowerCase()
                                ? "border-indigo-600 bg-indigo-50/35 font-bold shadow-xs"
                                : "border-neutral-150 bg-white hover:bg-neutral-50"
                            )}
                          >
                            <span 
                              className="w-4.5 h-4.5 rounded-full border border-neutral-200 flex-shrink-0"
                              style={{ backgroundColor: preset.value }}
                            />
                            <span className="text-[10px] uppercase tracking-wider text-neutral-700 truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fine-Tuning Inputs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 items-center">
                      <div className="space-y-2">
                        <Label htmlFor="custom-hex-picker" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Sélecteur personnalisé</Label>
                        <div className="flex gap-2">
                          <Input 
                            id="custom-color-swatch"
                            type="color" 
                            value={config.themeColor || '#4f46e5'} 
                            onChange={(e) => setConfig({...config, themeColor: e.target.value})}
                            className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                          />
                          <Input 
                            id="custom-hex-picker"
                            value={config.themeColor || '#4f46e5'} 
                            onChange={(e) => setConfig({...config, themeColor: e.target.value})}
                            placeholder="#4f46e5"
                            className="flex-1 font-mono text-xs rounded-xl border-neutral-200"
                          />
                        </div>
                      </div>

                      {/* Live UI Components Mockup */}
                      <div className="p-4 rounded-2xl border border-neutral-150 bg-neutral-50/50 space-y-3.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 leading-none">Aperçu en direct (Interface Client)</p>
                        <div className="grid grid-cols-2 gap-3 items-center">
                          {/* Button preview */}
                          <div className="space-y-1">
                            <span className="text-[8px] text-neutral-400 font-bold uppercase leading-none">Bouton d'action</span>
                            <div 
                              className="w-full text-white text-[11px] font-bold py-1.5 px-3 rounded-lg text-center shadow-sm select-none pointer-events-none"
                              style={{ backgroundColor: config.themeColor || '#4f46e5' }}
                            >
                              🎁 Ouvrir le Quiz
                            </div>
                          </div>

                          {/* Navigation / Tab preview */}
                          <div className="space-y-1">
                            <span className="text-[8px] text-neutral-400 font-bold uppercase leading-none">Badge & Navigation</span>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-center select-none pointer-events-none">
                                <Compass className="w-4 h-4" style={{ color: config.themeColor || '#4f46e5' }} />
                                <span className="text-[8px] font-bold" style={{ color: config.themeColor || '#4f46e5' }}>Le Parcours</span>
                              </div>
                              <span 
                                className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md"
                                style={{ backgroundColor: `${config.themeColor || '#4f46e5'}15`, color: config.themeColor || '#4f46e5' }}
                              >
                                Gagnant
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-600" /> Countdown Événement
                      </CardTitle>
                      <CardDescription>Affichez un compte à rebours pour un événement précis.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.countdown?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, countdown: {...(config.countdown || { enabled: false, targetDate: '', label: 'Fin de l\'offre' }), enabled: val}})}
                    />
                  </CardHeader>
                  {config.countdown?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Label du Countdown</Label>
                        <Input 
                          value={config.countdown.label} 
                          onChange={(e) => setConfig({...config, countdown: {...config.countdown!, label: e.target.value}})}
                          placeholder="Ex: Fin de la promo dans..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date & Heure Cible</Label>
                        <Input 
                          type="datetime-local" 
                          value={config.countdown.targetDate} 
                          onChange={(e) => setConfig({...config, countdown: {...config.countdown!, targetDate: e.target.value}})}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="game" className="space-y-6 mt-0">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">Jeu à Gratter</CardTitle>
                      <CardDescription>Engagez les clients avec une récompense.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.scratchCard?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, scratchCard: {...config.scratchCard!, enabled: val}})}
                    />
                  </CardHeader>
                  {config.scratchCard?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Offre à gagner</Label>
                        <Input 
                          value={config.scratchCard.offer} 
                          onChange={(e) => setConfig({...config, scratchCard: {...config.scratchCard!, offer: e.target.value}})}
                          placeholder="Ex: -0.5 DT sur votre pack"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Dices className="w-5 h-5 text-sky-600" /> Roue de la Fortune
                        </CardTitle>
                        <CardDescription>Gamification par tirage aléatoire pondéré</CardDescription>
                      </div>
                      <Switch
                        checked={config.spinWheel?.enabled ?? false}
                        onCheckedChange={(v) => setConfig({ ...config, spinWheel: { ...config.spinWheel!, enabled: v } })}
                      />
                    </div>
                  </CardHeader>
                  {config.spinWheel?.enabled && (
                    <CardContent>
                      <SpinWheelSetup
                        segments={config.spinWheel.segments}
                        onChange={(segs) => setConfig({ ...config, spinWheel: { ...config.spinWheel!, segments: segs } })}
                      />
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <HelpCircle className="w-5 h-5 text-sky-600" /> Quiz Produit
                        </CardTitle>
                        <CardDescription>Engagez et éduquez le shopper — coupon conditionnel</CardDescription>
                      </div>
                      <Switch
                        checked={config.quiz?.enabled ?? false}
                        onCheckedChange={(v) => setConfig({ ...config, quiz: { ...config.quiz!, enabled: v } })}
                      />
                    </div>
                  </CardHeader>
                  {config.quiz?.enabled && (
                    <CardContent>
                      <QuizSetup
                        quiz={config.quiz!}
                        onChange={(q) => setConfig({ ...config, quiz: q })}
                      />
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">Coupon Digital</CardTitle>
                      <CardDescription>Code promo à présenter en caisse.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.coupon?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, coupon: {...config.coupon!, enabled: val}})}
                    />
                  </CardHeader>
                  {config.coupon?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Code Promo</Label>
                        <Input 
                          value={config.coupon.code} 
                          onChange={(e) => setConfig({...config, coupon: {...config.coupon!, code: e.target.value}})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea 
                          value={config.coupon.description} 
                          onChange={(e) => setConfig({...config, coupon: {...config.coupon!, description: e.target.value}})}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-6 mt-0">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">Story Produit</CardTitle>
                      <CardDescription>Racontez l'origine et la qualité.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.story?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, story: {...config.story!, enabled: val}})}
                    />
                  </CardHeader>
                  {config.story?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Titre de la Story</Label>
                        <Input 
                          value={config.story.title} 
                          onChange={(e) => setConfig({...config, story: {...config.story!, title: e.target.value}})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Contenu</Label>
                        <Textarea 
                          value={config.story.content} 
                          onChange={(e) => setConfig({...config, story: {...config.story!, content: e.target.value}})}
                          className="h-32"
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Image de fond (Hero)</Label>
                          <Button
                            type="button"
                            size="sm"
                            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs gap-1.5 shadow-sm rounded-lg h-8"
                            onClick={() => handleOpenDrivePicker('hero')}
                          >
                            <Cloud className="w-3.5 h-3.5 text-white" /> Importer depuis Drive
                          </Button>
                        </div>

                        {/* Drive Import Banner */}
                        <div className="p-3 bg-sky-50/70 border border-sky-150 rounded-2xl flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-black shrink-0 shadow-sm">
                              <Cloud className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-sky-950">Importer depuis votre Google Drive</p>
                              <p className="text-[10px] text-sky-700 leading-tight">
                                Choisissez une photo HD dans votre Google Drive. Le lien sera automatiquement converti pour un affichage direct.
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-sky-300 text-sky-800 bg-white hover:bg-sky-100 font-bold text-xs gap-1.5 shrink-0 rounded-xl"
                            onClick={() => handleOpenDrivePicker('hero')}
                          >
                            <HardDrive className="w-3.5 h-3.5 text-sky-600" /> Parcourir Drive
                          </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {PLACEHOLDER_IMAGES.map((img, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setConfig({...config, story: {...config.story!, imageUrl: img}})}
                              className={cn(
                                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                config.story?.imageUrl === img ? "border-sky-600 ring-2 ring-sky-100" : "border-transparent hover:border-neutral-200"
                              )}
                            >
                              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              {config.story?.imageUrl === img && (
                                <div className="absolute inset-0 bg-sky-600/10 flex items-center justify-center">
                                  <CheckCircle2 className="w-5 h-5 text-sky-600 bg-white rounded-full" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 items-center">
                          <Input 
                            value={config.story?.imageUrl || ''} 
                            onChange={(e) => {
                              const converted = convertDriveLink(e.target.value);
                              setConfig({...config, story: {...config.story!, imageUrl: converted}});
                            }}
                            placeholder="Ou collez l'URL d'une image / lien Google Drive..."
                            className="text-xs flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="text-xs font-bold gap-1.5 border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 shrink-0"
                            onClick={() => handleOpenDrivePicker('hero')}
                          >
                            <Cloud className="w-3.5 h-3.5 text-sky-600" /> Drive
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Ligne du Temps / Archives Historiques */}
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" /> Ligne du Temps & Archives Historiques
                      </CardTitle>
                      <CardDescription>
                        Présentez la chronologie de l'exposition, importez vos archives photos en masse et renseignez leurs années et légendes.
                      </CardDescription>
                    </div>
                    <Switch 
                      checked={config.timeline?.enabled} 
                      onCheckedChange={(val) => setConfig({
                        ...config, 
                        timeline: {
                          enabled: val,
                          title: config.timeline?.title || 'Ligne du Temps & Archives',
                          items: config.timeline?.items || []
                        }
                      })}
                    />
                  </CardHeader>
                  {config.timeline?.enabled && (
                    <CardContent className="space-y-6">
                      {/* Title input */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Titre du module Ligne du Temps</Label>
                        <Input 
                          value={config.timeline.title || ''}
                          onChange={(e) => setConfig({...config, timeline: {...config.timeline!, title: e.target.value}})}
                          placeholder="Ex: Ligne du Temps - Archives FIH 1970s"
                          className="font-bold text-sm rounded-xl"
                        />
                      </div>

                      {/* Import actions bar */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-indigo-950">Importation rapide de médias d'archives (pipeline local /media/)</p>
                          <p className="text-[11px] text-indigo-700">
                            Sélectionnez jusqu'à 20 photos depuis Google Drive ou votre appareil. Elles seront téléchargées et converties sur le serveur sous URLs locales stables.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Import from device button */}
                          <label className="cursor-pointer">
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleLocalTimelineUpload}
                            />
                            <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-neutral-800 text-xs font-bold rounded-xl border border-neutral-200 hover:bg-neutral-50 shadow-sm transition-all">
                              <Upload className="w-3.5 h-3.5 text-indigo-600" /> Depuis l'appareil
                            </span>
                          </label>

                          {/* Import from Drive button */}
                          <Button
                            type="button"
                            className="text-xs font-bold gap-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm"
                            onClick={() => handleOpenDrivePicker('timeline', undefined, true)}
                          >
                            <Cloud className="w-3.5 h-3.5" /> Importer depuis Drive
                          </Button>
                        </div>
                      </div>

                      {/* Timeline items list */}
                      <div className="space-y-4">
                        {(config.timeline?.items || []).map((item, idx) => (
                          <div key={item.id} className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-3 relative group shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                                Archive #{idx + 1}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-neutral-400 hover:text-red-500 rounded-full h-8 w-8"
                                onClick={() => {
                                  const newItems = (config.timeline?.items || []).filter((_, i) => i !== idx);
                                  setConfig({...config, timeline: {...config.timeline!, items: newItems}});
                                  toast.error("Archive retirée de la Ligne du Temps.");
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 items-start">
                              {/* Image preview */}
                              <div className="w-24 h-24 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex-shrink-0 relative">
                                {item.imageUrl ? (
                                  <img src={item.thumbnailUrl || item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                                    <ImageIcon className="w-6 h-6" />
                                  </div>
                                )}
                              </div>

                              {/* Fields */}
                              <div className="flex-1 space-y-3 w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-neutral-500">Année / Date</Label>
                                    <Input 
                                      value={item.year || ''}
                                      onChange={(e) => {
                                        const newItems = [...(config.timeline?.items || [])];
                                        newItems[idx] = { ...newItems[idx], year: e.target.value };
                                        setConfig({...config, timeline: {...config.timeline!, items: newItems}});
                                      }}
                                      placeholder="Ex: 1974"
                                      className="text-xs rounded-xl"
                                    />
                                  </div>
                                  <div className="sm:col-span-2 space-y-1">
                                    <Label className="text-[11px] font-bold text-neutral-500">Titre de l'Archive</Label>
                                    <Input 
                                      value={item.title}
                                      onChange={(e) => {
                                        const newItems = [...(config.timeline?.items || [])];
                                        newItems[idx] = { ...newItems[idx], title: e.target.value };
                                        setConfig({...config, timeline: {...config.timeline!, items: newItems}});
                                      }}
                                      placeholder="Ex: Inauguration de la Première Exposition"
                                      className="text-xs rounded-xl"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <Label className="text-[11px] font-bold text-neutral-500">Légende / Description</Label>
                                  <Textarea 
                                    value={item.description || ''}
                                    onChange={(e) => {
                                      const newItems = [...(config.timeline?.items || [])];
                                      newItems[idx] = { ...newItems[idx], description: e.target.value };
                                      setConfig({...config, timeline: {...config.timeline!, items: newItems}});
                                    }}
                                    placeholder="Détails, contexte historique, artistes présents..."
                                    className="h-16 text-xs rounded-xl"
                                  />
                                </div>

                                {item.originalName && (
                                  <p className="text-[10px] text-neutral-400 font-mono">
                                    Fichier: {item.originalName} {item.sizeBytes ? `(${(item.sizeBytes / (1024 * 1024)).toFixed(2)} MB)` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                        {(config.timeline?.items || []).length === 0 && (
                          <div className="p-8 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-center space-y-2">
                            <Clock className="w-8 h-8 text-neutral-300 mx-auto" />
                            <p className="text-xs font-bold text-neutral-600">Aucune archive dans la Ligne du Temps</p>
                            <p className="text-[11px] text-neutral-400">
                              Cliquez sur « Importer depuis Drive » pour vider un dossier d'archives d'un coup (jusqu'à 20 photos).
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">Ateliers & Guides de Visite</CardTitle>
                      <CardDescription>Proposez des ateliers créatifs, des guides d'exploration ou des fiches d'activités.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.recipes?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, recipes: {...config.recipes!, enabled: val}})}
                    />
                  </CardHeader>
                  {config.recipes?.enabled && (
                    <CardContent className="space-y-4">
                      {config.recipes.items.map((recipe, idx) => (
                        <div key={recipe.id} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-3">
                          <div className="flex justify-between items-center">
                            <Label className="font-bold">Atelier/Guide #{idx + 1}</Label>
                            <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <Input 
                            value={recipe.title} 
                            onChange={(e) => {
                              const newItems = [...config.recipes!.items];
                              newItems[idx].title = e.target.value;
                              setConfig({...config, recipes: {...config.recipes!, items: newItems}});
                            }}
                            placeholder="Titre de l'atelier ou guide"
                          />
                          <Textarea 
                            value={recipe.description} 
                            onChange={(e) => {
                              const newItems = [...config.recipes!.items];
                              newItems[idx].description = e.target.value;
                              setConfig({...config, recipes: {...config.recipes!, items: newItems}});
                            }}
                            placeholder="Courte description"
                          />
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                              <List className="w-3 h-3" /> Étapes de l'atelier
                            </Label>
                            <div className="space-y-2">
                              {(recipe.steps || []).map((step, sIdx) => (
                                <div key={sIdx} className="flex gap-2">
                                  <Input 
                                    value={step}
                                    onChange={(e) => {
                                      const newItems = [...config.recipes!.items];
                                      newItems[idx].steps[sIdx] = e.target.value;
                                      setConfig({...config, recipes: {...config.recipes!, items: newItems}});
                                    }}
                                    placeholder={`Étape ${sIdx + 1}`}
                                    className="text-sm"
                                  />
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-10 w-10 text-neutral-300 hover:text-red-500"
                                    onClick={() => {
                                      const newItems = [...config.recipes!.items];
                                      newItems[idx].steps.splice(sIdx, 1);
                                      setConfig({...config, recipes: {...config.recipes!, items: newItems}});
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-xs gap-2 border-dashed"
                                onClick={() => {
                                  const newItems = [...config.recipes!.items];
                                  newItems[idx].steps = [...(newItems[idx].steps || []), ''];
                                  setConfig({...config, recipes: {...config.recipes!, items: newItems}});
                                }}
                              >
                                <Plus className="w-3 h-3" /> Ajouter une étape
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" className="w-full gap-2" onClick={() => {
                        const newItem: Recipe = { id: Math.random().toString(), title: '', description: '', steps: [] };
                        setConfig({...config, recipes: {...config.recipes!, items: [...config.recipes!.items, newItem]}});
                      }}>
                        <Plus className="w-4 h-4" /> Ajouter un atelier/guide
                      </Button>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-indigo-600" /> Parcours d'Exposition (Murs & Œuvres)
                      </CardTitle>
                      <CardDescription>
                        Configurez les murs physiques de l'exposition urbaine à travers la ville, leurs œuvres associées et générez des QR codes géolocalisés uniques.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(() => {
                      const currentWalls = config.walls || normalizeWalls(config);
                      
                      const handleAddWall = () => {
                        const newWall = {
                          id: `wall_${Date.now()}`,
                          name: 'Nouveau Mur d\'Art',
                          description: 'Description du nouveau mur d\'exposition...',
                          latitude: 36.3946,
                          longitude: 10.6133,
                          artworks: []
                        };
                        setConfig({ ...config, walls: [...currentWalls, newWall] });
                        toast.success("Nouveau mur ajouté ! Remplissez ses détails.");
                      };

                      const handleUpdateWall = (idx: number, updated: any) => {
                        const newWalls = [...currentWalls];
                        newWalls[idx] = { ...newWalls[idx], ...updated };
                        setConfig({ ...config, walls: newWalls });
                      };

                      const handleDeleteWall = (idx: number) => {
                        const newWalls = currentWalls.filter((_, i) => i !== idx);
                        setConfig({ ...config, walls: newWalls });
                        toast.error("Mur supprimé.");
                      };

                      const handleAddArtwork = (wallIdx: number) => {
                        const newArt = {
                          id: `art_${Date.now()}`,
                          title: 'Nouvelle Œuvre d\'Art',
                          description: 'Description de l\'œuvre d\'art...',
                          imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
                          arModelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
                        };
                        const newWalls = [...currentWalls];
                        newWalls[wallIdx] = {
                          ...newWalls[wallIdx],
                          artworks: [...(newWalls[wallIdx].artworks || []), newArt]
                        };
                        setConfig({ ...config, walls: newWalls });
                        toast.success("Œuvre ajoutée au mur !");
                      };

                      const handleUpdateArtwork = (wallIdx: number, artIdx: number, updatedArt: any) => {
                        const newWalls = [...currentWalls];
                        const newArtworks = [...(newWalls[wallIdx].artworks || [])];
                        newArtworks[artIdx] = { ...newArtworks[artIdx], ...updatedArt };
                        newWalls[wallIdx] = { ...newWalls[wallIdx], artworks: newArtworks };
                        setConfig({ ...config, walls: newWalls });
                      };

                      const handleDeleteArtwork = (wallIdx: number, artIdx: number) => {
                        const newWalls = [...currentWalls];
                        const newArtworks = (newWalls[wallIdx].artworks || []).filter((_, i) => i !== artIdx);
                        newWalls[wallIdx] = { ...newWalls[wallIdx], artworks: newArtworks };
                        setConfig({ ...config, walls: newWalls });
                        toast.error("Œuvre d'art retirée.");
                      };

                      return (
                        <div className="space-y-6">
                          {currentWalls.map((wall, wIdx) => {
                            const deepLink = config.id 
                              ? `${window.location.origin}${window.location.pathname}?id=${config.id}&wall=${wall.id}` 
                              : '';
                            return (
                              <div key={wall.id} className="p-6 bg-neutral-50 rounded-[2.2rem] border border-neutral-200 space-y-6 relative">
                                <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1 flex-1">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                      Mur #{wIdx + 1}
                                    </span>
                                    <div className="flex items-center gap-2 mt-2">
                                      <Label className="w-24 text-xs font-bold uppercase tracking-wider text-neutral-400">Nom du Mur</Label>
                                      <Input 
                                        value={wall.name}
                                        onChange={(e) => handleUpdateWall(wIdx, { name: e.target.value })}
                                        placeholder="Ex: Fresque de la Médina de Hammamet"
                                        className="flex-1 font-semibold"
                                      />
                                    </div>
                                  </div>

                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-red-500 hover:bg-red-50 rounded-full h-10 w-10 flex-shrink-0"
                                    onClick={() => handleDeleteWall(wIdx)}
                                    title="Supprimer ce mur"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Description</Label>
                                  <Textarea 
                                    value={wall.description}
                                    onChange={(e) => handleUpdateWall(wIdx, { description: e.target.value })}
                                    placeholder="Décrivez l'emplacement physique ou le contexte historique du mur..."
                                    className="h-20"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Latitude (GPS)</Label>
                                    <Input 
                                      type="number" 
                                      step="0.000001"
                                      value={wall.latitude || ''}
                                      onChange={(e) => handleUpdateWall(wIdx, { latitude: parseFloat(e.target.value) || undefined })}
                                      placeholder="Ex: 36.3946"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Longitude (GPS)</Label>
                                    <Input 
                                      type="number" 
                                      step="0.000001"
                                      value={wall.longitude || ''}
                                      onChange={(e) => handleUpdateWall(wIdx, { longitude: parseFloat(e.target.value) || undefined })}
                                      placeholder="Ex: 10.6133"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                      <Music className="w-3 h-3 text-neutral-400" /> Couche Audio (Audioguide .mp3)
                                    </Label>
                                    <Input 
                                      value={wall.audioUrl || ''}
                                      onChange={(e) => handleUpdateWall(wIdx, { audioUrl: e.target.value })}
                                      placeholder="Ex: https://monsite.com/audio/wall.mp3"
                                      className="text-xs rounded-xl"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                      <Video className="w-3 h-3 text-neutral-400" /> Couche Vidéo (YouTube / MP4)
                                    </Label>
                                    <Input 
                                      value={wall.videoUrl || ''}
                                      onChange={(e) => handleUpdateWall(wIdx, { videoUrl: e.target.value })}
                                      placeholder="Ex: https://youtube.com/watch?v=..."
                                      className="text-xs rounded-xl"
                                    />
                                  </div>
                                </div>

                                {/* Link and QR section */}
                                <div className="p-4 bg-white rounded-2xl border border-neutral-150 space-y-4">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="space-y-1 flex-1">
                                      <p className="text-xs font-bold text-neutral-600">Lien Direct (Deep-link & QR Code)</p>
                                      {deepLink ? (
                                        <p className="text-[10px] text-indigo-600 font-mono select-all truncate">{deepLink}</p>
                                      ) : (
                                        <p className="text-[11px] text-amber-600 italic">Publiez l'exposition pour générer le QR Code de ce mur.</p>
                                      )}
                                    </div>
                                    {deepLink && (
                                      <Button 
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          navigator.clipboard.writeText(deepLink);
                                          toast.success("Lien copié dans le presse-papiers !");
                                        }}
                                        className="h-9 gap-1.5 font-bold text-xs"
                                      >
                                        <Copy className="w-3.5 h-3.5" /> Copier le lien
                                      </Button>
                                    )}
                                  </div>

                                  {deepLink && (
                                    <div className="flex items-center gap-4 pt-2 border-t border-neutral-50">
                                      <div className="p-2 bg-neutral-50 rounded-xl border border-neutral-100 flex-shrink-0">
                                        <QRCodeSVG value={deepLink} size={90} fgColor={config.themeColor || '#4f46e5'} />
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-xs font-bold">QR Code de ce mur 🧱</p>
                                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                                          Imprimez ce QR code et collez-le sur le mur physique pour que les passants l'ouvrent directement en un scan !
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Artworks Subsection */}
                                <div className="space-y-3 pt-2">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-100/70 p-3 rounded-2xl border border-neutral-200/80">
                                    <Label className="text-xs font-black uppercase tracking-widest text-neutral-600 flex items-center gap-1.5">
                                      <ImageIcon className="w-3.5 h-3.5 text-indigo-600" /> Œuvres d'Art de ce Mur
                                    </Label>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-xs font-bold gap-1 rounded-full border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 shadow-sm"
                                        onClick={() => handleOpenDrivePicker('wall_artworks', wall.id, true)}
                                        title="Importer des images d'œuvres en masse depuis Google Drive"
                                      >
                                        <Cloud className="w-3.5 h-3.5 text-sky-600" /> Importer depuis Drive
                                      </Button>
                                      <label className="cursor-pointer">
                                        <input 
                                          type="file" 
                                          multiple 
                                          accept="image/*" 
                                          className="hidden" 
                                          onChange={(e) => handleLocalWallArtworksUpload(wall.id, e)} 
                                        />
                                        <div className="h-8 px-3 text-xs font-bold gap-1 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 shadow-sm flex items-center transition-colors">
                                          <Upload className="w-3.5 h-3.5 text-neutral-500" /> Appareil
                                        </div>
                                      </label>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 text-xs font-bold gap-1 rounded-full border-dashed bg-white"
                                        onClick={() => handleAddArtwork(wIdx)}
                                      >
                                        <Plus className="w-3 h-3" /> Manuel
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    {(wall.artworks || []).map((art, aIdx) => (
                                      <div key={art.id} className="p-4 bg-white rounded-2xl border border-neutral-200 space-y-4 shadow-sm">
                                        <div className="flex justify-between items-center gap-4">
                                          <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Œuvre #{aIdx + 1}</p>
                                            {art.imageUrl && (
                                              <img 
                                                src={art.imageUrl} 
                                                alt={art.title} 
                                                className="w-8 h-8 rounded-lg object-cover border border-neutral-200" 
                                                onError={(e) => (e.currentTarget.style.display = 'none')}
                                              />
                                            )}
                                          </div>
                                          <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="text-neutral-400 hover:text-red-500 rounded-full h-8 w-8"
                                            onClick={() => handleDeleteArtwork(wIdx, aIdx)}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </Button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-1">
                                            <Label className="text-[11px] font-bold text-neutral-500">Titre de l'Œuvre</Label>
                                            <Input 
                                              value={art.title}
                                              onChange={(e) => handleUpdateArtwork(wIdx, aIdx, { title: e.target.value })}
                                              placeholder="Ex: Le Pêcheur Éternel"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between">
                                              <Label className="text-[11px] font-bold text-neutral-500">Image (URL)</Label>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg gap-1"
                                                onClick={() => handleOpenDrivePicker('artwork', wall.id, false, art.id)}
                                              >
                                                <Cloud className="w-3 h-3 text-sky-600" /> Drive
                                              </Button>
                                            </div>
                                            <Input 
                                              value={art.imageUrl || ''}
                                              onChange={(e) => handleUpdateArtwork(wIdx, aIdx, { imageUrl: e.target.value })}
                                              placeholder="Ex: https://unsplash.com/... ou /media/..."
                                            />
                                          </div>
                                        </div>

                                        <div className="space-y-1">
                                          <Label className="text-[11px] font-bold text-neutral-500">Modèle 3D pour AR (.glb ou .gltf)</Label>
                                          <Input 
                                            value={art.arModelUrl || ''}
                                            onChange={(e) => handleUpdateArtwork(wIdx, aIdx, { arModelUrl: e.target.value })}
                                            placeholder="Ex: https://modelviewer.dev/shared-assets/models/Astronaut.glb"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <Label className="text-[11px] font-bold text-neutral-500">Description de l'Œuvre</Label>
                                          <Textarea 
                                            value={art.description}
                                            onChange={(e) => handleUpdateArtwork(wIdx, aIdx, { description: e.target.value })}
                                            placeholder="Décrivez le concept, l'artiste, l'année ou l'anecdote de cette œuvre..."
                                            className="h-16"
                                          />
                                        </div>
                                      </div>
                                    ))}
                                    
                                    {(wall.artworks || []).length === 0 && (
                                      <p className="text-center py-4 text-xs text-neutral-400 font-medium italic">
                                        Aucune œuvre configurée sur ce mur. Cliquez sur "Ajouter une œuvre" pour commencer.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <Button 
                            onClick={handleAddWall}
                            variant="outline" 
                            className="w-full h-14 rounded-2xl gap-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold"
                          >
                            <Plus className="w-5 h-5" /> Ajouter un nouveau Mur d'exposition physique
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="space-y-6 mt-0">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">Audioguide & Ambiance</CardTitle>
                      <CardDescription>Ajoutez une dimension sonore à l'expérience.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.audio?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, audio: {...config.audio!, enabled: val}})}
                    />
                  </CardHeader>
                  {config.audio?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>URL de l'audio (MP3)</Label>
                        <Input 
                          value={config.audio.url} 
                          onChange={(e) => setConfig({...config, audio: {...config.audio!, url: e.target.value}})}
                          placeholder="https://example.com/audio.mp3"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg">Vidéo Courte</CardTitle>
                      <CardDescription>Présentez les coulisses de l'exposition ou le mot du conservateur.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.video?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, video: {...config.video!, enabled: val}})}
                    />
                  </CardHeader>
                  {config.video?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>URL de la vidéo (YouTube/MP4)</Label>
                        <Input 
                          value={config.video.url} 
                          onChange={(e) => setConfig({...config, video: {...config.video!, url: e.target.value}})}
                          placeholder="https://youtube.com/..."
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Box className="w-5 h-5 text-indigo-600" /> Expérience AR / 3D
                      </CardTitle>
                      <CardDescription>Affichez une œuvre ou un monument interactif en 3D.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Optionnel</span>
                      <Switch 
                        checked={config.ar?.enabled} 
                        onCheckedChange={(val) => setConfig({...config, ar: {...config.ar!, enabled: val}})}
                      />
                    </div>
                  </CardHeader>
                  {config.ar?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="flex bg-neutral-100 p-1 rounded-lg w-fit mb-4">
                        <button 
                          onClick={() => setArMode('link')}
                          className={cn(
                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                            arMode === 'link' ? "bg-white shadow-sm text-indigo-600" : "text-neutral-400"
                          )}
                        >
                          Lien URL
                        </button>
                        <button 
                          onClick={() => setArMode('upload')}
                          className={cn(
                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all",
                            arMode === 'upload' ? "bg-white shadow-sm text-indigo-600" : "text-neutral-400"
                          )}
                        >
                          Upload (.glb)
                        </button>
                      </div>

                      {arMode === 'link' ? (
                        <div className="space-y-2">
                          <Label>URL du modèle 3D (.glb)</Label>
                          <Input 
                            value={config.ar.modelUrl} 
                            onChange={(e) => setConfig({...config, ar: {...config.ar!, modelUrl: e.target.value}})}
                            placeholder="https://example.com/mascot.glb"
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label>Fichier Modèle 3D (.glb)</Label>
                          <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center space-y-3 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer relative">
                            <input 
                              type="file" 
                              accept=".glb"
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  if (file.size > 1024 * 1024) {
                                    toast.error("Le fichier est trop volumineux (>1MB). Veuillez utiliser un lien URL pour les modèles lourds.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const result = event.target?.result as string;
                                    setConfig({...config, ar: {...config.ar!, modelUrl: result}});
                                    toast.success("Modèle chargé avec succès !");
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto">
                              <Plus className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold">Cliquez pour uploader</p>
                              <p className="text-[10px] text-neutral-400 mt-1">Format .GLB uniquement (Max 1MB)</p>
                            </div>
                          </div>
                          {config.ar.modelUrl.startsWith('data:') && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Fichier prêt</span>
                              <button 
                                onClick={() => setConfig({...config, ar: {...config.ar!, modelUrl: ''}})}
                                className="ml-auto text-neutral-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Texte alternatif</Label>
                        <Input 
                          value={config.ar.altText || ''} 
                          onChange={(e) => setConfig({...config, ar: {...config.ar!, altText: e.target.value}})}
                          placeholder="Ex: Mascotte du Mall"
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Camera className="w-5 h-5 text-indigo-600" /> Photobooth Caméra
                      </CardTitle>
                      <CardDescription>Permettez aux clients de se prendre en photo.</CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Optionnel</span>
                      <Switch 
                        checked={config.photobooth?.enabled} 
                        onCheckedChange={(val) => setConfig({...config, photobooth: {...config.photobooth!, enabled: val}})}
                      />
                    </div>
                  </CardHeader>
                  {config.photobooth?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Cadre thématique</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {([
                            { id: 'none', label: 'Aucun' },
                            { id: 'ramadan', label: 'Ramadan' },
                            { id: 'christmas', label: 'Noël' },
                            { id: 'blackfriday', label: 'Black Friday' },
                            { id: 'summer', label: 'Été' }
                          ] as const).map((t) => (
                            <button
                              key={t.id}
                              onClick={() => setConfig({...config, photobooth: {...config.photobooth!, frameTheme: t.id}})}
                              className={cn(
                                "px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                                config.photobooth?.frameTheme === t.id 
                                  ? "bg-indigo-600 text-white shadow-md" 
                                  : "bg-white text-neutral-500 border border-neutral-200 hover:bg-neutral-50"
                              )}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>URL de l'overlay (PNG transparent)</Label>
                        <Input 
                          value={config.photobooth.overlayUrl || ''} 
                          onChange={(e) => setConfig({...config, photobooth: {...config.photobooth!, overlayUrl: e.target.value}})}
                          placeholder="https://..."
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Video className="w-5 h-5 text-red-600" /> Videoboth Reel
                      </CardTitle>
                      <CardDescription>Capturez des vidéos courtes (Reels) pour les réseaux sociaux.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.videoboth?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, videoboth: {...(config.videoboth || { enabled: false, maxDuration: 15 }), enabled: val}})}
                    />
                  </CardHeader>
                  {config.videoboth?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Durée max (secondes)</Label>
                        <Input 
                          type="number"
                          value={config.videoboth.maxDuration || 15} 
                          onChange={(e) => setConfig({...config, videoboth: {...config.videoboth!, maxDuration: parseInt(e.target.value) || 15}})}
                        />
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Studio Plan de Mur Média Visuel / Visual Media Wall Layout Studio */}
                <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-indigo-50/50 border-b border-neutral-100 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2 font-black tracking-tight text-neutral-800">
                          <Layout className="w-5 h-5 text-emerald-600 animate-pulse" /> Studio Plan Média Mural / Salle
                        </CardTitle>
                        <CardDescription className="text-xs text-neutral-500 font-medium max-w-2xl">
                          Définissez le plan visuel de votre mur ou de votre salle d'exposition. Placez des marqueurs de points d'intérêt (POI) interactifs directement sur l'image en cliquant dessus, puis associez-les à vos parcours physiques.
                        </CardDescription>
                      </div>
                      <Switch 
                        checked={config.mediaWallLayout?.enabled} 
                        onCheckedChange={(val) => {
                          const layout = config.mediaWallLayout || { enabled: false, imageUrl: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=80', pois: [] };
                          setConfig({ ...config, mediaWallLayout: { ...layout, enabled: val } });
                        }}
                      />
                    </div>
                  </CardHeader>

                  {config.mediaWallLayout?.enabled && (
                    <CardContent className="p-0">
                      {(() => {
                        const layout = config.mediaWallLayout || { imageUrl: '', pois: [] };
                        const pois = layout.pois || [];
                        const currentWalls = config.walls || normalizeWalls(config);

                        const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const clickY = e.clientY - rect.top;
                          
                          const pctX = Math.round((clickX / rect.width) * 100);
                          const pctY = Math.round((clickY / rect.height) * 100);

                          if (selectedLayoutPoiId) {
                            // Move existing
                            const updatedPois = pois.map(p => 
                              p.id === selectedLayoutPoiId 
                                ? { ...p, x: pctX, y: pctY } 
                                : p
                            );
                            setConfig({
                              ...config,
                              mediaWallLayout: { ...layout, pois: updatedPois }
                            });
                            toast.success(`Position du marqueur mise à jour : ${pctX}%, ${pctY}%`);
                          } else {
                            // Create new
                            const newPoiId = `poi_${Date.now()}`;
                            const newPoi = {
                              id: newPoiId,
                              name: `Nouveau Marqueur #${pois.length + 1}`,
                              description: 'Description du point d\'intérêt sur le plan mural...',
                              x: pctX,
                              y: pctY,
                              associatedWallId: currentWalls[0]?.id || ''
                            };
                            setConfig({
                              ...config,
                              mediaWallLayout: { ...layout, pois: [...pois, newPoi] }
                            });
                            setSelectedLayoutPoiId(newPoiId);
                            toast.success(`Nouveau marqueur créé à ${pctX}%, ${pctY}%`);
                          }
                        };

                        const selectedPoi = pois.find(p => p.id === selectedLayoutPoiId);

                        const handleUpdatePoi = (poiId: string, updatedFields: any) => {
                          const updatedPois = pois.map(p => 
                            p.id === poiId ? { ...p, ...updatedFields } : p
                          );
                          setConfig({
                            ...config,
                            mediaWallLayout: { ...layout, pois: updatedPois }
                          });
                        };

                        const handleDeletePoi = (poiId: string) => {
                          const updatedPois = pois.filter(p => p.id !== poiId);
                          setConfig({
                            ...config,
                            mediaWallLayout: { ...layout, pois: updatedPois }
                          });
                          setSelectedLayoutPoiId(null);
                          toast.error("Marqueur supprimé.");
                        };

                        const handleAddNewPoiBtn = () => {
                          const newPoiId = `poi_${Date.now()}`;
                          const newPoi = {
                            id: newPoiId,
                            name: `Nouveau Marqueur #${pois.length + 1}`,
                            description: 'Description du point d\'intérêt...',
                            x: 50,
                            y: 50,
                            associatedWallId: currentWalls[0]?.id || ''
                          };
                          setConfig({
                            ...config,
                            mediaWallLayout: { ...layout, pois: [...pois, newPoi] }
                          });
                          setSelectedLayoutPoiId(newPoiId);
                          toast.success("Nouveau marqueur créé au centre !");
                        };

                        const presetImages = [
                          { label: 'Mur d\'Expo Blanc', url: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?auto=format&fit=crop&w=1200&q=80' },
                          { label: 'Espace Loft Moderne', url: 'https://images.unsplash.com/photo-1554816155-12df9643f363?auto=format&fit=crop&w=1200&q=80' },
                          { label: 'Plan de Galerie', url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=1200&q=80' },
                          { label: 'Briques Rustiques', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80' }
                        ];

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-12">
                            {/* Layout Preview Column */}
                            <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-neutral-100 flex flex-col gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-neutral-600">Sélectionner ou coller une image de plan/mur</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                  {presetImages.map((preset, pIdx) => (
                                    <button
                                      key={pIdx}
                                      onClick={() => setConfig({
                                        ...config,
                                        mediaWallLayout: { ...layout, imageUrl: preset.url }
                                      })}
                                      className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all truncate text-left",
                                        layout.imageUrl === preset.url
                                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                                          : "bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                                      )}
                                    >
                                      {preset.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Input
                                    value={layout.imageUrl}
                                    onChange={(e) => setConfig({
                                      ...config,
                                      mediaWallLayout: { ...layout, imageUrl: e.target.value }
                                    })}
                                    placeholder="Collez l'URL d'une image personnalisée..."
                                    className="text-xs h-8 rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-emerald-500" /> Plan Média Interactif
                                </span>
                                <span className="text-[10px] text-neutral-400 font-medium italic">
                                  {selectedLayoutPoiId ? "Cliquez sur l'image pour repositionner le marqueur actif" : "Cliquez sur l'image pour créer un nouveau marqueur"}
                                </span>
                              </div>

                              {/* Interactive Canvas */}
                              <div
                                onClick={handleImageClick}
                                className="relative h-96 w-full rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-900 group shadow-inner cursor-crosshair"
                              >
                                {layout.imageUrl ? (
                                  <img 
                                    src={layout.imageUrl} 
                                    alt="Visual Media Wall Layout" 
                                    className="w-full h-full object-cover select-none pointer-events-none"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400 p-4">
                                    <ImageIcon className="w-12 h-12 mb-2 animate-bounce" />
                                    <p className="text-sm font-bold">Aucune image configurée</p>
                                    <p className="text-xs text-neutral-500">Veuillez sélectionner un modèle ci-dessus.</p>
                                  </div>
                                )}

                                {/* Floating grid markers overlay for pro feel */}
                                <div className="absolute inset-0 pointer-events-none border border-emerald-500/10 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:20px_20px]" />

                                {/* Render POIs */}
                                {pois.map((poi, idx) => {
                                  const isSelected = poi.id === selectedLayoutPoiId;
                                  return (
                                    <div
                                      key={poi.id || idx}
                                      style={{ left: `${poi.x}%`, top: `${poi.y}%` }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedLayoutPoiId(poi.id);
                                      }}
                                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                                    >
                                      {isSelected && (
                                        <span className="absolute -inset-4 rounded-full bg-emerald-500/30 animate-ping pointer-events-none" />
                                      )}

                                      <div className={cn(
                                        "w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-md transition-all duration-300 transform group-hover:scale-125",
                                        isSelected
                                          ? "bg-emerald-600 border-white text-white scale-110"
                                          : poi.associatedWallId
                                            ? "bg-indigo-500 border-indigo-200 text-white"
                                            : "bg-amber-500 border-amber-200 text-white"
                                      )}>
                                        <span className="text-[10px] font-black">{idx + 1}</span>
                                      </div>

                                      {/* Marker tooltip preview */}
                                      <div className="absolute bottom-9 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30">
                                        <p className="font-bold">{poi.name}</p>
                                        {poi.associatedWallId && (
                                          <p className="text-[8px] text-indigo-300">Lié : {currentWalls.find(w => w.id === poi.associatedWallId)?.name || 'Mur introuvable'}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-150 flex flex-wrap gap-4 text-[10px] font-bold text-neutral-500 justify-center">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block shadow-xs" /> Point Actif Sélectionné
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block shadow-xs" /> Associé à un parcours physique
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block shadow-xs" /> Non associé
                                </div>
                              </div>
                            </div>

                            {/* Marker details configuration column */}
                            <div className="lg:col-span-5 p-6 flex flex-col gap-6 justify-between bg-neutral-50/30">
                              {selectedPoi ? (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                      Configuration Marqueur #{pois.findIndex(p => p.id === selectedPoi.id) + 1}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeletePoi(selectedPoi.id)}
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 rounded-full"
                                      title="Supprimer ce marqueur"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-600">Nom du Point d'Intérêt</Label>
                                    <Input
                                      value={selectedPoi.name}
                                      onChange={(e) => handleUpdatePoi(selectedPoi.id, { name: e.target.value })}
                                      className="text-xs font-bold"
                                      placeholder="Ex: Oeuvre d'art centrale"
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-600">Description / Détails</Label>
                                    <Textarea
                                      value={selectedPoi.description}
                                      onChange={(e) => handleUpdatePoi(selectedPoi.id, { description: e.target.value })}
                                      className="text-xs h-16 resize-none"
                                      placeholder="Ex: Une explication brève ou anecdote concernant ce point précis..."
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                                      <Layers className="w-3.5 h-3.5 text-indigo-500" /> Associer à un Mur Physique
                                    </Label>
                                    <select
                                      value={selectedPoi.associatedWallId || ''}
                                      onChange={(e) => handleUpdatePoi(selectedPoi.id, { associatedWallId: e.target.value })}
                                      className="w-full bg-white border border-neutral-200 text-xs rounded-lg p-2 font-semibold text-neutral-700 shadow-xs focus:ring-1 focus:ring-emerald-500"
                                    >
                                      <option value="">-- Aucun lien (Information libre) --</option>
                                      {currentWalls.map((wall, wIdx) => (
                                        <option key={wall.id || wIdx} value={wall.id}>
                                          Mur {wIdx + 1} : {wall.name}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-[9px] text-neutral-400">
                                      Lier ce point interactif à un mur du parcours permet de lancer son audioguide, voir ses oeuvres ou scanner directement son QR code depuis le plan interactif !
                                    </p>
                                  </div>

                                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[10px] text-emerald-800 font-medium space-y-1">
                                    <p className="font-bold flex items-center gap-1">
                                      <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Positionnement Actif
                                    </p>
                                    <p>Coordonnées relatives : X: <strong>{selectedPoi.x}%</strong>, Y: <strong>{selectedPoi.y}%</strong></p>
                                    <p className="text-neutral-500 italic">Cliquez sur le plan d'exposition à gauche pour repositionner ce point à la volée.</p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-12 px-4 space-y-3 my-auto">
                                  <Layout className="w-10 h-10 text-neutral-300 mx-auto" />
                                  <p className="text-sm font-semibold text-neutral-500">Aucun Marqueur Sélectionné</p>
                                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                                    Cliquez n'importe où sur l'image à gauche pour déposer un point interactif, ou cliquez sur un marqueur existant pour l'éditer.
                                  </p>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddNewPoiBtn}
                                    className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50 text-xs font-bold animate-pulse"
                                  >
                                    <Plus className="w-4 h-4" /> Ajouter un point au centre
                                  </Button>
                                </div>
                              )}

                              {pois.length > 0 && (
                                <div className="pt-4 border-t border-neutral-100 mt-auto">
                                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                                    Liste des Marqueurs ({pois.length}) :
                                  </span>
                                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                                    {pois.map((poi, pIdx) => (
                                      <button
                                        key={poi.id || pIdx}
                                        onClick={() => setSelectedLayoutPoiId(poi.id)}
                                        className={cn(
                                          "px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-xs border",
                                          poi.id === selectedLayoutPoiId
                                            ? "bg-emerald-600 border-emerald-600 text-white"
                                            : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                        )}
                                      >
                                        <span className="w-4 h-4 rounded-full bg-black/10 flex items-center justify-center text-[9px] font-black">
                                          {pIdx + 1}
                                        </span>
                                        {poi.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  )}
                </Card>

                {/* Studio de Couches Cartographiques / Map Layer Studio */}
                <Card className="border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border-b border-neutral-100 pb-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <CardTitle className="text-xl flex items-center gap-2 font-black tracking-tight text-neutral-800">
                          <Layers className="w-5 h-5 text-indigo-600 animate-pulse" /> Studio de Couches Cartographiques
                        </CardTitle>
                        <CardDescription className="text-xs text-neutral-500 font-medium max-w-2xl">
                          Visualisez vos points d'intérêt (POIs) d'exposition sur la carte de votre parcours. Associez des couches multimédias immersives (Audioguides MP3, vidéos) et géolocalisez-les par simple clic.
                        </CardDescription>
                      </div>
                      <div className="flex bg-neutral-100/80 p-1 rounded-xl w-fit self-start sm:self-center border border-neutral-200/50">
                        <button 
                          onClick={() => setIsMapSatelliteMode(true)}
                          className={cn(
                            "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            isMapSatelliteMode ? "bg-white shadow-xs text-indigo-600" : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          Tactique / Satellite
                        </button>
                        <button 
                          onClick={() => setIsMapSatelliteMode(false)}
                          className={cn(
                            "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            !isMapSatelliteMode ? "bg-white shadow-xs text-indigo-600" : "text-neutral-500 hover:text-neutral-700"
                          )}
                        >
                          Schématique Grid
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {(() => {
                      const currentWalls = config.walls || normalizeWalls(config);
                      if (currentWalls.length === 0) {
                        return (
                          <div className="text-center py-12 px-4 bg-neutral-50 rounded-b-2xl border-t border-neutral-100">
                            <MapPin className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
                            <p className="text-sm font-semibold text-neutral-600">Aucun point d'intérêt d'exposition configuré</p>
                            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-1">
                              Veuillez d'abord configurer des Murs d'Exposition dans l'onglet <strong>Contenu</strong> afin de pouvoir cartographier leurs couches médias.
                            </p>
                          </div>
                        );
                      }

                      // Dynamic bounding box calculations to auto-center the map grid around actual POIs
                      const latitudes = currentWalls.map(w => w.latitude).filter(Boolean) as number[];
                      const longitudes = currentWalls.map(w => w.longitude).filter(Boolean) as number[];
                      
                      const minLat = latitudes.length > 0 ? Math.min(...latitudes) : 36.385;
                      const maxLat = latitudes.length > 0 ? Math.max(...latitudes) : 36.405;
                      const minLon = longitudes.length > 0 ? Math.min(...longitudes) : 10.60;
                      const maxLon = longitudes.length > 0 ? Math.max(...longitudes) : 10.63;
                      
                      const latRange = (maxLat - minLat) || 0.01;
                      const lonRange = (maxLon - minLon) || 0.01;
                      
                      const mapMinLat = minLat - latRange * 0.25;
                      const mapMaxLat = maxLat + latRange * 0.25;
                      const mapMinLon = minLon - lonRange * 0.25;
                      const mapMaxLon = maxLon + lonRange * 0.25;

                      const getXY = (lat: number | undefined, lon: number | undefined) => {
                        if (!lat || !lon) return { x: 50, y: 50 };
                        const x = ((lon - mapMinLon) / (mapMaxLon - mapMinLon)) * 100;
                        const y = 100 - ((lat - mapMinLat) / (mapMaxLat - mapMinLat)) * 100;
                        return {
                          x: Math.min(Math.max(x, 5), 95),
                          y: Math.min(Math.max(y, 5), 95)
                        };
                      };

                      const activeWall = currentWalls.find(w => w.id === selectedMediaWallId) || currentWalls[0];
                      const activeWallIdx = currentWalls.findIndex(w => w.id === (selectedMediaWallId || activeWall?.id));

                      const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const clickY = e.clientY - rect.top;
                        
                        const pctX = clickX / rect.width;
                        const pctY = 1 - (clickY / rect.height);
                        
                        const newLon = mapMinLon + pctX * (mapMaxLon - mapMinLon);
                        const newLat = mapMinLat + pctY * (mapMaxLat - mapMinLat);
                        
                        const targetWallId = selectedMediaWallId || activeWall?.id;
                        if (targetWallId) {
                          const wIdx = currentWalls.findIndex(w => w.id === targetWallId);
                          if (wIdx !== -1) {
                            const newWalls = [...currentWalls];
                            newWalls[wIdx] = { 
                              ...newWalls[wIdx], 
                              latitude: parseFloat(newLat.toFixed(6)), 
                              longitude: parseFloat(newLon.toFixed(6)) 
                            };
                            setConfig({ ...config, walls: newWalls });
                            toast.success(`Position mise à jour : ${newLat.toFixed(4)}, ${newLon.toFixed(4)}`);
                          }
                        }
                      };

                      const getYoutubeEmbedUrl = (url: string) => {
                        if (!url) return null;
                        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                        const match = url.match(regExp);
                        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
                      };

                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-12">
                          {/* Left Panel: The Interactive Map Layer Grid */}
                          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-neutral-100 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                                <Compass className="w-4 h-4 text-neutral-400 animate-spin-slow" /> Studio Cartographique Interactif
                              </span>
                              <span className="text-[10px] text-neutral-400 font-medium italic">
                                Cliquez sur la carte pour repositionner le point actif
                              </span>
                            </div>

                            {/* Cartography Layer Canvas container */}
                            <div 
                              onClick={handleMapClick}
                              className={cn(
                                "relative h-96 w-full rounded-2xl overflow-hidden border border-neutral-200/60 shadow-inner cursor-crosshair transition-all",
                                isMapSatelliteMode 
                                  ? "bg-neutral-900 bg-[radial-gradient(#1e1b4b_1px,transparent_1px)] [background-size:16px_16px]" 
                                  : "bg-neutral-50 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]"
                              )}
                            >
                              {/* Aesthetic UI Elements to make it feel like a pro map editor */}
                              <div className="absolute top-3 left-3 z-10 bg-neutral-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-neutral-700/30 text-[9px] font-mono text-neutral-300 space-y-0.5 pointer-events-none">
                                <p className="font-bold uppercase tracking-wider text-indigo-400">Media Map Layer Engine v2.0</p>
                                <p className="text-neutral-400">CENTER: {((mapMinLat + mapMaxLat)/2).toFixed(4)}N, {((mapMinLon + mapMaxLon)/2).toFixed(4)}E</p>
                              </div>

                              <div className="absolute bottom-3 left-3 z-10 bg-neutral-950/90 px-2 py-1 rounded-md text-[9px] font-mono text-indigo-300 pointer-events-none border border-neutral-800">
                                SCALE: ~1:1000m | GPS UTM
                              </div>

                              {/* Stylized visual map outlines for tactical/satellite mode */}
                              {isMapSatelliteMode && (
                                <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M 0 100 Q 150 150 250 80 T 500 200" fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 6" />
                                  <path d="M 100 0 Q 80 180 200 280 T 400 400" fill="none" stroke="#4f46e5" strokeWidth="1" />
                                  <circle cx="250" cy="80" r="40" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="2 4" />
                                  <rect x="50" y="220" width="120" height="80" rx="10" fill="none" stroke="#6366f1" strokeWidth="1" />
                                  {/* Sea outline / Coastal simulation */}
                                  <path d="M 50 380 Q 200 350 350 390 T 700 340 L 700 400 L 0 400 Z" fill="rgba(79, 70, 229, 0.08)" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="2" />
                                </svg>
                              )}

                              {/* Pins of POIs */}
                              {currentWalls.map((wall, wIdx) => {
                                const { x, y } = getXY(wall.latitude, wall.longitude);
                                const isActive = activeWall?.id === wall.id;
                                const hasAudio = !!wall.audioUrl;
                                const hasVideo = !!wall.videoUrl;

                                return (
                                  <div 
                                    key={wall.id || wIdx}
                                    style={{ left: `${x}%`, top: `${y}%` }}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Avoid triggering map click repositioning when selecting existing pin
                                      setSelectedMediaWallId(wall.id || null);
                                    }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                                  >
                                    {/* Ping animation for active pin */}
                                    {isActive && (
                                      <span className="absolute -inset-4 rounded-full bg-indigo-500/30 animate-ping pointer-events-none" />
                                    )}

                                    {/* Map Pin UI */}
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 transform group-hover:scale-125",
                                      isActive 
                                        ? "bg-indigo-600 border-white text-white scale-110"
                                        : hasAudio && hasVideo
                                          ? "bg-purple-500 border-purple-200 text-white"
                                          : hasAudio
                                            ? "bg-blue-500 border-blue-200 text-white"
                                            : hasVideo
                                              ? "bg-rose-500 border-rose-200 text-white"
                                              : "bg-neutral-400 border-neutral-200 text-neutral-100"
                                    )}>
                                      <span className="text-[10px] font-black">{wIdx + 1}</span>
                                    </div>

                                    {/* Floating Tooltip */}
                                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] py-1.5 px-2.5 rounded-xl whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-30 flex items-center gap-2 border border-neutral-800">
                                      <div className="space-y-0.5">
                                        <p className="font-bold leading-none">{wall.name}</p>
                                        <p className="text-[8px] text-neutral-400 leading-none">
                                          {hasAudio ? '🔊 Audio' : '🔇 No Audio'} | {hasVideo ? '🎥 Vidéo' : '🔇 No Vidéo'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Map Color Legend */}
                            <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-150 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-bold text-neutral-500">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 block shadow-xs" /> Point Actif Sélectionné
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 block shadow-xs" /> Audio + Vidéo Actifs
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block shadow-xs" /> Audio Seul
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block shadow-xs" /> Vidéo Seule
                              </div>
                            </div>
                          </div>

                          {/* Right Panel: Selected POI Media Configuration & Testing Area */}
                          <div className="lg:col-span-5 p-6 flex flex-col gap-6 justify-between bg-neutral-50/30">
                            {activeWall ? (
                              <div className="space-y-6">
                                {/* Title and Header of selected POI */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                                      Édition Média POI #{activeWallIdx + 1}
                                    </span>
                                    <span className="text-[9px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                                      ID: {activeWall.id}
                                    </span>
                                  </div>
                                  <h3 className="text-base font-black text-neutral-800 leading-tight mt-1">{activeWall.name}</h3>
                                  <p className="text-[11px] text-neutral-500 leading-relaxed font-medium line-clamp-2">{activeWall.description}</p>
                                </div>

                                {/* Geographic Location Info */}
                                <div className="space-y-2 bg-white p-4 rounded-2xl border border-neutral-150 shadow-xs">
                                  <Label className="text-xs font-bold text-neutral-600 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-500" /> Position Géo-Spatiale
                                  </Label>
                                  <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Latitude</span>
                                      <Input 
                                        type="number"
                                        step="0.0001"
                                        value={activeWall.latitude || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          const newWalls = [...currentWalls];
                                          newWalls[activeWallIdx] = { ...newWalls[activeWallIdx], latitude: val };
                                          setConfig({ ...config, walls: newWalls });
                                        }}
                                        className="text-xs h-8 rounded-lg"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <span className="text-[8px] font-black uppercase tracking-wider text-neutral-400">Longitude</span>
                                      <Input 
                                        type="number"
                                        step="0.0001"
                                        value={activeWall.longitude || ''}
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value) || 0;
                                          const newWalls = [...currentWalls];
                                          newWalls[activeWallIdx] = { ...newWalls[activeWallIdx], longitude: val };
                                          setConfig({ ...config, walls: newWalls });
                                        }}
                                        className="text-xs h-8 rounded-lg"
                                      />
                                    </div>
                                  </div>

                                  {/* OpenStreetMap Real Live Map Verification Viewport */}
                                  {activeWall.latitude && activeWall.longitude && (
                                    <div className="mt-3 space-y-1">
                                      <span className="text-[9px] font-bold text-neutral-400 flex items-center gap-1">
                                        <Map className="w-3 h-3 text-emerald-500" /> Validation Carte Réelle (Live OSM)
                                      </span>
                                      <iframe
                                        width="100%"
                                        height="110"
                                        title="Live Map Preview"
                                        className="rounded-xl border border-neutral-150 shadow-inner overflow-hidden pointer-events-none"
                                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeWall.longitude - 0.003}%2C${activeWall.latitude - 0.002}%2C${activeWall.longitude + 0.003}%2C${activeWall.latitude + 0.002}&layer=mapnik&marker=${activeWall.latitude}%2C${activeWall.longitude}`}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Audioguide media integration */}
                                <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-neutral-150 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-neutral-600 flex items-center gap-1.5">
                                      <Music className="w-4 h-4 text-blue-500" /> Couche Audio: Audioguide (.mp3)
                                    </Label>
                                    {activeWall.audioUrl && (
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <Input
                                    value={activeWall.audioUrl || ''}
                                    onChange={(e) => {
                                      const newWalls = [...currentWalls];
                                      newWalls[activeWallIdx] = { ...newWalls[activeWallIdx], audioUrl: e.target.value };
                                      setConfig({ ...config, walls: newWalls });
                                    }}
                                    placeholder="Ex: https://monsite.com/audio/wall1.mp3"
                                    className="text-xs h-9 rounded-xl"
                                  />
                                  <p className="text-[9px] text-neutral-400 leading-relaxed">
                                    Url directe du guide audio d'explication.
                                  </p>

                                  {/* Audio Sound Tester directly inside setup editor! */}
                                  {activeWall.audioUrl && (
                                    <div className="pt-1.5 border-t border-dashed border-neutral-100 mt-2">
                                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Lecteur d'Aperçu Sonore</span>
                                      <audio 
                                        src={activeWall.audioUrl} 
                                        controls 
                                        className="w-full h-8 max-w-full rounded-md"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Video media integration */}
                                <div className="space-y-2.5 bg-white p-4 rounded-2xl border border-neutral-150 shadow-xs">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-neutral-600 flex items-center gap-1.5">
                                      <Video className="w-4 h-4 text-rose-500" /> Couche Vidéo: YouTube / MP4
                                    </Label>
                                    {activeWall.videoUrl && (
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <Input
                                    value={activeWall.videoUrl || ''}
                                    onChange={(e) => {
                                      const newWalls = [...currentWalls];
                                      newWalls[activeWallIdx] = { ...newWalls[activeWallIdx], videoUrl: e.target.value };
                                      setConfig({ ...config, walls: newWalls });
                                    }}
                                    placeholder="Ex: https://www.youtube.com/watch?v=..."
                                    className="text-xs h-9 rounded-xl"
                                  />
                                  <p className="text-[9px] text-neutral-400 leading-relaxed">
                                    Intégrez un clip vidéo de présentation de l'œuvre.
                                  </p>

                                  {/* Responsive YouTube Embed / Video tag Previewer */}
                                  {activeWall.videoUrl && (() => {
                                    const embedUrl = getYoutubeEmbedUrl(activeWall.videoUrl);
                                    return (
                                      <div className="pt-2 border-t border-dashed border-neutral-100 mt-2">
                                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">Aperçu Vidéo de l'Étape</span>
                                        {embedUrl ? (
                                          <iframe
                                            src={embedUrl}
                                            title="YouTube presentation video"
                                            className="w-full h-28 rounded-lg border border-neutral-150 overflow-hidden"
                                            allowFullScreen
                                          />
                                        ) : (
                                          <video 
                                            src={activeWall.videoUrl} 
                                            controls 
                                            className="w-full h-28 rounded-lg bg-black object-contain"
                                          />
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-12 px-4 space-y-3">
                                <Layers className="w-8 h-8 text-neutral-300 mx-auto" />
                                <p className="text-sm font-semibold text-neutral-500">Aucun point sélectionné</p>
                                <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                                  Sélectionnez l'un des points numérotés sur la carte pour éditer et tester ses couches médias.
                                </p>
                              </div>
                            )}

                            {/* Dropdown selectors to change POI quickly */}
                            <div className="pt-4 border-t border-neutral-100 mt-auto">
                              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                                Sélectionner une autre Étape / POI :
                              </span>
                              <div className="flex items-center gap-2">
                                <select 
                                  value={selectedMediaWallId || activeWall?.id || ''}
                                  onChange={(e) => setSelectedMediaWallId(e.target.value)}
                                  className="w-full bg-white border border-neutral-200 text-xs rounded-xl p-2.5 font-semibold text-neutral-700 shadow-xs focus:ring-1 focus:ring-indigo-500"
                                >
                                  {currentWalls.map((wall, wIdx) => (
                                    <option key={wall.id || wIdx} value={wall.id}>
                                      Étape {wIdx + 1} : {wall.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-0">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" /> Accès Social (Gate)
                      </CardTitle>
                      <CardDescription>Demandez aux visiteurs de s'identifier via un réseau social.</CardDescription>
                    </div>
                    <Switch 
                      checked={config.socialEntry?.enabled} 
                      onCheckedChange={(val) => setConfig({...config, socialEntry: {...(config.socialEntry || { enabled: false, providers: ['facebook', 'instagram', 'tiktok', 'whatsapp'], required: false }), enabled: val}})}
                    />
                  </CardHeader>
                  {config.socialEntry?.enabled && (
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Obligatoire pour accéder</Label>
                        <Switch 
                          checked={config.socialEntry.required}
                          onCheckedChange={(val) => setConfig({...config, socialEntry: {...config.socialEntry!, required: val}})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Plateformes autorisées</Label>
                        <div className="flex flex-wrap gap-2">
                          {['facebook', 'instagram', 'tiktok', 'whatsapp'].map(p => (
                            <Button
                              key={p}
                              variant={config.socialEntry?.providers.includes(p as any) ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                const providers = config.socialEntry?.providers || [];
                                const newProviders = providers.includes(p as any) 
                                  ? providers.filter(x => x !== p)
                                  : [...providers, p as any];
                                setConfig({...config, socialEntry: {...config.socialEntry!, providers: newProviders}});
                              }}
                              className="capitalize"
                            >
                              {p}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              </TabsContent>
              <TabsContent value="qrcode" className="space-y-6 mt-0">
                <DynamicQRCodeGenerator config={config} />

                {/* Advanced Public Poster / Flyer Generator */}
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layout className="w-5 h-5 text-indigo-600" /> Générateur d'Affiches Publicitaires (A4 / Imprimable)
                    </CardTitle>
                    <CardDescription>
                      Créez des affiches et flyers de haute qualité pour vos espaces publics physiques afin de guider vos visiteurs vers l'expérience en un scan.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Configuration Controls */}
                      <div className="lg:col-span-7 space-y-4">
                        
                        {/* Template Selection */}
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Modèle de design de l'affiche</Label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'chic', label: 'Chic & Art', icon: '✨' },
                              { id: 'street', label: 'Urbain', icon: '🎨' },
                              { id: 'minimalist', label: 'Suisse', icon: '⚡' },
                              { id: 'festival', label: 'Pop', icon: '🍭' },
                            ].map((tpl) => (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => setPosterTemplate(tpl.id as any)}
                                className={cn(
                                  "p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all",
                                  posterTemplate === tpl.id 
                                    ? "border-indigo-600 bg-indigo-50/55 text-indigo-900 shadow-sm font-bold"
                                    : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"
                                )}
                              >
                                <span className="text-lg">{tpl.icon}</span>
                                <span className="text-[10px] uppercase tracking-wider">{tpl.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text Configuration */}
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Titre principal</Label>
                            <Input 
                              value={posterTitle}
                              onChange={(e) => setPosterTitle(e.target.value)}
                              placeholder="Titre de votre affiche"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Sous-titre / Marque</Label>
                            <Input 
                              value={posterSubtitle}
                              onChange={(e) => setPosterSubtitle(e.target.value)}
                              placeholder="Nom de l'organisateur ou marque"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Appel au scan (CTA)</Label>
                            <Input 
                              value={posterCta}
                              onChange={(e) => setPosterCta(e.target.value)}
                              placeholder="Ex: Scannez pour lancer l'expérience interactive !"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Note de bas de page</Label>
                            <Input 
                              value={posterNote}
                              onChange={(e) => setPosterNote(e.target.value)}
                              placeholder="Ex: Parcours libre et gratuit dans la ville."
                            />
                          </div>
                        </div>

                        {/* Display options */}
                        <div className="space-y-3 pt-3 border-t border-neutral-100">
                          <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Options d'affichage de l'affiche</Label>
                          
                          <div className="flex items-center justify-between py-1 border-b border-neutral-50">
                            <div>
                              <p className="text-xs font-bold text-neutral-700">Afficher le parcours (Points d'Intérêt / Murs)</p>
                              <p className="text-[10px] text-neutral-400">Affiche la liste des lieux géolocalisés de l'exposition.</p>
                            </div>
                            <Switch 
                              checked={posterShowWalls}
                              onCheckedChange={setPosterShowWalls}
                            />
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-neutral-50">
                            <div>
                              <p className="text-xs font-bold text-neutral-700">Afficher les badges de fonctionnalités actives</p>
                              <p className="text-[10px] text-neutral-400">Affiche les modules actifs (AR, Jeu de Grattage, Quiz, etc.).</p>
                            </div>
                            <Switch 
                              checked={posterShowFeatures}
                              onCheckedChange={setPosterShowFeatures}
                            />
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <div>
                              <p className="text-xs font-bold text-neutral-700">Afficher les instructions de scan guidées</p>
                              <p className="text-[10px] text-neutral-400">Ajoute les étapes détaillées (Étape 1, 2, 3) pour guider le public.</p>
                            </div>
                            <Switch 
                              checked={posterShowInstructions}
                              onCheckedChange={setPosterShowInstructions}
                            />
                          </div>
                        </div>

                        {/* Print Action Buttons */}
                        <div className="pt-4 flex flex-col sm:flex-row gap-3">
                          <Button 
                            onClick={() => window.print()}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-xl gap-2 shadow-lg shadow-indigo-100"
                          >
                            <Printer className="w-5 h-5" /> Imprimer l'Affiche (A4 / PDF)
                          </Button>
                        </div>

                      </div>

                      {/* Poster Mock-up / Live Preview */}
                      <div className="lg:col-span-5 flex flex-col items-center justify-start bg-neutral-50 rounded-2xl border border-neutral-100 p-4 space-y-4">
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Aperçu de l'Affiche A4
                          </span>
                          <span className="text-[9px] font-bold text-neutral-400 border border-neutral-200 px-2 py-0.5 rounded-full">Proportions Réelles</span>
                        </div>
                        
                        {/* Miniature display */}
                        <div className="w-full max-w-[280px] aspect-[1/1.414] shadow-xl rounded-2xl overflow-hidden bg-white border border-neutral-200 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 select-none">
                          <div className="w-full h-full scale-[0.6] origin-top w-[166.6%] h-[166.6%] pointer-events-none">
                            {renderPosterContent(false)}
                          </div>
                        </div>

                        <p className="text-[11px] text-neutral-400 text-center max-w-xs">
                          Astuce : lors de l'impression, sélectionnez <strong>"Enregistrer au format PDF"</strong> ou votre imprimante, et assurez-vous d'activer l'option <strong>"Graphiques d'arrière-plan"</strong> pour un rendu parfait.
                        </p>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="workspace" className="space-y-6 mt-0">
                <WorkspaceSetup config={config} onChange={setConfig} />
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Auto-save Status Indicator Bar */}
          <div className="flex items-center justify-between px-2 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5 font-medium text-neutral-600">
              <Cloud className="w-3.5 h-3.5 text-sky-600" /> Sauvegarde automatique activée (PostgreSQL)
            </span>
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600 font-bold animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Enregistrement...
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3 h-3" /> Auto-sauvegardé {lastSavedTime ? `à ${lastSavedTime}` : ''}
              </span>
            )}
            {autoSaveStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-600 font-bold">
                <AlertCircle className="w-3 h-3" /> Échec de la sauvegarde auto
              </span>
            )}
          </div>

          <Button 
            onClick={saveCampaign} 
            disabled={isSaving}
            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-100 gap-2 text-lg"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {isSaving ? 'Enregistrement...' : !user ? 'Se connecter pour publier' : config.id ? 'Mettre à jour l\'Exposition' : 'Publier l\'Exposition'}
          </Button>
        </div>

        {/* Preview Side */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 h-fit space-y-6">
          <AnimatePresence mode="wait">
            {generatedUrl ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-2xl border-4 border-sky-600 text-center space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Exposition Prête !</h3>
                  <p className="text-neutral-500 text-sm">Imprimez ce QR code pour vos visiteurs.</p>
                </div>
                
                <div className="bg-neutral-50 p-6 rounded-3xl inline-block border-2 border-neutral-100">
                  <QRCodeSVG id="campaign-qr-code" value={generatedUrl} size={220} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={copyToClipboard} className="rounded-xl py-6 font-bold gap-2">
                    {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {isCopied ? 'Copié !' : 'Copier'}
                  </Button>
                  <Button variant="outline" onClick={downloadQR} className="rounded-xl py-6 font-bold gap-2">
                    <Save className="w-4 h-4" /> PNG
                  </Button>
                </div>
                
                <a 
                  href={generatedUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className={cn(
                    "w-full py-6 bg-sky-600 hover:bg-sky-700 rounded-xl font-bold gap-2 flex items-center justify-center text-white shadow-lg shadow-sky-100 text-lg transition-colors"
                  )}
                >
                  <ExternalLink className="w-4 h-4" /> Tester l'expérience
                </a>

                <button onClick={() => setGeneratedUrl('')} className="text-neutral-400 text-xs hover:underline">
                  Retour à l'édition
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-2">
                    <Eye className="w-4 h-4" /> Aperçu Mobile
                  </h3>
                  <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full uppercase">Live Preview</span>
                </div>
                
                <div className="relative mx-auto w-full max-w-[300px] aspect-[9/19] bg-neutral-900 rounded-[3.5rem] p-3 shadow-2xl border-[12px] border-neutral-800 overflow-hidden ring-8 ring-neutral-100">
                  {/* Phone Hardware Details */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-neutral-800 rounded-b-3xl z-50 flex items-center justify-center gap-2">
                    <div className="w-12 h-1 bg-neutral-700 rounded-full" />
                    <div className="w-2 h-2 bg-neutral-700 rounded-full" />
                  </div>
                  <div className="absolute top-24 -left-3 w-1 h-12 bg-neutral-800 rounded-r-md" />
                  <div className="absolute top-40 -left-3 w-1 h-12 bg-neutral-800 rounded-r-md" />
                  <div className="absolute top-32 -right-3 w-1 h-16 bg-neutral-800 rounded-l-md" />
                  
                  <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden overflow-y-auto scrollbar-hide relative">
                    <div className="scale-[0.85] origin-top w-[117.6%] h-[117.6%]">
                      <CustomerView config={config} isPreview={true} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Printable Poster hidden on screen, displayed fully on print */}
      <div id="printable-poster-a4" className="hidden print:flex print:flex-col print:justify-between print:w-[210mm] print:h-[297mm] print:bg-white print:text-black print:fixed print:inset-0 print:z-[99999] print:overflow-hidden print:p-[20mm]">
        {renderPosterContent(true)}
      </div>

      {/* Google Drive Image Picker Modal */}
      <AnimatePresence>
        {showDriveImagePicker && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-2xl border border-neutral-100 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-neutral-900">
                      Google Drive - {drivePickerMode === 'multiple' ? 'Importation Multiple d\'Archives' : 'Sélectionner un fichier'}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {drivePickerMode === 'multiple' 
                        ? 'Cochez jusqu\'à 20 fichiers pour les convertir en WebP et les héberger sur le serveur (/media/...)'
                        : 'Sélectionnez une photo HD de votre Google Drive pour l\'associer sous URL locale stable'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowDriveImagePicker(false)} className="rounded-full">
                  ✕
                </Button>
              </div>

              {/* Folder Filter Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-150">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-700">
                  <Folder className="w-4 h-4 text-sky-600" />
                  <span>Dossier Drive :</span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {needsDriveAuth && (
                    <Button
                      type="button"
                      variant="default"
                      className="text-xs font-bold gap-1 bg-sky-600 hover:bg-sky-700 rounded-xl"
                      onClick={handleManualDriveAuth}
                    >
                      <Cloud className="w-3.5 h-3.5" /> Se connecter à Google Drive
                    </Button>
                  )}
                  {driveFolders.length > 0 ? (
                    <select
                      value={selectedDriveFolderId}
                      onChange={(e) => handleSelectDriveFolder(e.target.value)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-sky-500 flex-1 sm:w-64"
                    >
                      <option value="">📁 Choisir un dossier Drive</option>
                      <option value="all">📁 Tous les fichiers Google Drive</option>
                      {driveFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          📁 {folder.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-medium text-neutral-500">
                      {needsDriveAuth ? 'Connectez-vous d\'abord à Google Drive.' : 'Aucun dossier disponible pour le moment.'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[300px] p-1">
                {loadingDriveImages ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
                    <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Chargement des fichiers Drive...</p>
                  </div>
                ) : driveImages.length === 0 ? (
                  <div className="bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl p-10 text-center space-y-3">
                    <div className="p-3 bg-white w-12 h-12 rounded-full mx-auto shadow-sm flex items-center justify-center text-neutral-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-neutral-800">Aucune image trouvée dans ce dossier Drive</p>
                    <p className="text-xs text-neutral-500 max-w-md mx-auto">
                      Déposez vos photos (JPG, PNG, WebP) dans Google Drive ou choisissez un autre dossier.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {driveImages.map((imgFile) => {
                      const isSelected = selectedDriveFileIds.includes(imgFile.id);
                      return (
                        <div
                          key={imgFile.id}
                          onClick={() => {
                            if (drivePickerMode === 'single') {
                              handleConfirmDriveImport([imgFile.id]);
                            } else {
                              if (isSelected) {
                                setSelectedDriveFileIds(selectedDriveFileIds.filter(id => id !== imgFile.id));
                              } else {
                                if (selectedDriveFileIds.length >= 20) {
                                  toast.error("Vous ne pouvez pas sélectionner plus de 20 fichiers à la fois.");
                                  return;
                                }
                                setSelectedDriveFileIds([...selectedDriveFileIds, imgFile.id]);
                              }
                            }
                          }}
                          className={cn(
                            "group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all bg-neutral-900 flex flex-col justify-end select-none",
                            isSelected ? "border-sky-500 ring-4 ring-sky-100" : "border-neutral-200 hover:border-sky-400"
                          )}
                        >
                          <img 
                            src={imgFile.thumbnailLink || `https://lh3.googleusercontent.com/d/${imgFile.id}`} 
                            alt={imgFile.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-80 group-hover:opacity-100"
                            referrerPolicy="no-referrer"
                          />

                          {/* Checkbox badge */}
                          {drivePickerMode === 'multiple' && (
                            <div className="absolute top-2 right-2">
                              <div className={cn(
                                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-md",
                                isSelected ? "bg-sky-600 text-white" : "bg-black/40 text-white border border-white/50"
                              )}>
                                {isSelected ? '✓' : ''}
                              </div>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-2.5 flex flex-col justify-end">
                            <p className="text-[11px] font-bold text-white truncate drop-shadow-sm">{imgFile.name}</p>
                            {imgFile.sizeBytes && (
                              <p className="text-[9px] text-neutral-300 font-mono">
                                {(imgFile.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between border-t border-neutral-100 pt-4 gap-3">
                <span className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Token Workspace actif · Importation serveur /media/
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={() => setShowDriveImagePicker(false)} className="rounded-xl font-bold flex-1 sm:flex-none">
                    Annuler
                  </Button>

                  {drivePickerMode === 'multiple' && (
                    <Button 
                      disabled={selectedDriveFileIds.length === 0 || importingDriveMedia}
                      onClick={() => handleConfirmDriveImport(selectedDriveFileIds)}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs gap-2 flex-1 sm:flex-none"
                    >
                      {importingDriveMedia ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Importation en cours...
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" /> Importer {selectedDriveFileIds.length} fichier(s)
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* JSON Import/Export Modal */}
      <AnimatePresence>
        {showJsonModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-neutral-100 space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-neutral-900 tracking-tight">Importer / Exporter la Configuration JSON</h3>
                    <p className="text-xs text-neutral-500 font-medium">Collez votre code JSON de campagne ou copiez la configuration actuelle</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowJsonModal(false)} className="rounded-full">
                  ✕
                </Button>
              </div>

              <div className="flex-1 flex flex-col space-y-2 min-h-[300px]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-neutral-500">Code JSON de l'exposition</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setJsonInput(JSON.stringify(config, null, 2));
                        toast.info("Configuration actuelle chargée dans l'éditeur JSON");
                      }}
                      className="text-[11px] h-7 px-2.5 rounded-lg font-bold"
                    >
                      <Copy className="w-3 h-3 mr-1" /> Exporter Actuel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
                        toast.success("JSON copié dans le presse-papier !");
                      }}
                      className="text-[11px] h-7 px-2.5 rounded-lg font-bold text-indigo-600 border-indigo-200 bg-indigo-50/50"
                    >
                      Copier JSON
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  placeholder='Collez ici votre structure JSON, par exemple:
{
  "name": "Expo 12 Capsules — Centre Culturel de Hammamet",
  "brandName": "Centre Culturel International de Hammamet",
  "themeColor": "#D9A441",
  "walls": [...]
}'
                  className="flex-1 font-mono text-xs bg-neutral-90/50 border-neutral-200 rounded-xl p-3 resize-none h-[320px] focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <Button variant="outline" size="sm" onClick={() => setShowJsonModal(false)} className="rounded-xl font-bold">
                  Annuler
                </Button>
                <Button
                  onClick={handleApplyJson}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs gap-2 shadow-lg shadow-indigo-100"
                >
                  <Sparkles className="w-4 h-4" /> Appliquer la Configuration JSON
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden print styles that overrides page layout during printing */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          /* Hide EVERYTHING in the document */
          body * {
            visibility: hidden !important;
          }
          /* Show only our special print container and its descendants */
          #printable-poster-a4, #printable-poster-a4 * {
            visibility: visible !important;
          }
          #printable-poster-a4 {
            display: flex !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 20mm !important;
            box-shadow: none !important;
            background: white !important;
            z-index: 9999999 !important;
          }
          /* Adjust printed page setup */
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}} />
    </div>
  );
};
