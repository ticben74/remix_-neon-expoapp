import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { 
  Copy, ExternalLink, Save, Share2, Sparkles, CheckCircle2, 
  MapPin, RefreshCw, Palette, Sliders, Type, Download, Printer, Box, HelpCircle, Gift
} from 'lucide-react';
import { CampaignConfig, WallConfig } from '../types';
import { cn, normalizeWalls } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

interface DynamicQRCodeGeneratorProps {
  config: CampaignConfig;
}

const COLOR_PRESETS = [
  { name: 'Indigo Royal', value: '#4f46e5', bg: '#f5f3ff' },
  { name: 'Émeraude Sauvage', value: '#10b981', bg: '#ecfdf5' },
  { name: 'Ambre Chaud', value: '#f59e0b', bg: '#fef3c7' },
  { name: 'Rose Pop', value: '#f43f5e', bg: '#fff1f2' },
  { name: 'Violet Électrique', value: '#8b5cf6', bg: '#faf5ff' },
  { name: 'Ardoise Minimal', value: '#334155', bg: '#f8fafc' },
];

export const DynamicQRCodeGenerator: React.FC<DynamicQRCodeGeneratorProps> = ({ config }) => {
  const [destinationType, setDestinationType] = useState<'global' | 'wall' | 'scratch' | 'quiz'>('global');
  const [selectedWallId, setSelectedWallId] = useState<string>('');
  const [qrFgColor, setQrFgColor] = useState('#4f46e5');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(256);
  const [qrIncludeLogo, setQrIncludeLogo] = useState(true);
  const [logoType, setLogoType] = useState<'image' | 'text' | 'icon'>('image');
  const [customLogoText, setCustomLogoText] = useState('QR');
  const [errorCorrection, setErrorCorrection] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [isCopied, setIsCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState('');

  const qrContainerRef = useRef<HTMLDivElement>(null);

  const walls = config.walls || normalizeWalls(config) || [];

  // Update default colors when campaign theme color changes
  useEffect(() => {
    if (config.themeColor) {
      setQrFgColor(config.themeColor);
    }
  }, [config.themeColor]);

  // Handle dynamic URL generation based on configuration and selected options
  useEffect(() => {
    if (!config.id) {
      setQrUrl('');
      return;
    }

    const base = `${window.location.origin}${window.location.pathname}?id=${config.id}`;
    
    if (destinationType === 'wall' && selectedWallId) {
      setQrUrl(`${base}&wall=${selectedWallId}`);
    } else if (destinationType === 'scratch') {
      setQrUrl(`${base}&tab=activites`); // Navigates to activities section directly
    } else if (destinationType === 'quiz') {
      setQrUrl(`${base}&tab=activites`);
    } else {
      setQrUrl(base);
    }
  }, [config.id, destinationType, selectedWallId]);

  // Set default wall if empty
  useEffect(() => {
    if (walls.length > 0 && !selectedWallId) {
      setSelectedWallId(walls[0].id);
    }
  }, [walls, selectedWallId]);

  const copyToClipboard = () => {
    if (!qrUrl) {
      toast.error("Lien non disponible. Veuillez publier l'exposition d'abord.");
      return;
    }
    navigator.clipboard.writeText(qrUrl);
    setIsCopied(true);
    toast.success("Lien de partage copié !");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getActiveLogoSrc = () => {
    if (logoType === 'image') {
      return config.story?.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd5735e?auto=format&fit=crop&w=80&q=80";
    }
    return '';
  };

  const downloadQRPNG = () => {
    const svgElement = document.getElementById('dynamic-custom-qr') as any as SVGElement;
    if (!svgElement) {
      toast.error("Le QR Code n'est pas encore rendu.");
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // We render high-resolution PNG
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
          const suffix = destinationType === 'wall' ? `-${selectedWallId}` : '';
          downloadLink.download = `QR-${config.name.replace(/\s+/g, '-').toLowerCase()}${suffix}.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
          toast.success("QR Code PNG haute définition téléchargé !");
        } catch (err) {
          console.error("Failed PNG conversion", err);
          toast.error("Erreur d'exportation PNG.");
        }
      };
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    } catch (error) {
      console.error(error);
      toast.error("Échec du téléchargement.");
    }
  };

  const downloadQRSVG = () => {
    const svgElement = document.getElementById('dynamic-custom-qr') as any as SVGElement;
    if (!svgElement) {
      toast.error("Le QR Code n'est pas disponible.");
      return;
    }
    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      const suffix = destinationType === 'wall' ? `-${selectedWallId}` : '';
      downloadLink.download = `QR-${config.name.replace(/\s+/g, '-').toLowerCase()}${suffix}.svg`;
      downloadLink.href = url;
      downloadLink.click();
      URL.revokeObjectURL(url);
      toast.success("Fichier vectoriel SVG téléchargé !");
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'exportation SVG.");
    }
  };

  // Triggers print view for table tents / flyers
  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Le bloqueur de fenêtres a bloqué l'impression.");
      return;
    }

    const svgElement = document.getElementById('dynamic-custom-qr');
    if (!svgElement) return;

    const qrSvgString = new XMLSerializer().serializeToString(svgElement);
    const selectedWallName = destinationType === 'wall' 
      ? (walls.find(w => w.id === selectedWallId)?.name || 'Point d\'intérêt')
      : '';

    printWindow.document.write(`
      <html>
        <head>
          <title>Impression Chevalet - ${config.name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              background-color: white;
              color: #171717;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
              box-sizing: border-box;
            }
            .card-container {
              width: 148mm;
              height: 210mm; /* A5 paper portrait */
              border: 1px solid #e5e5e5;
              padding: 15mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              box-sizing: border-box;
              border-radius: 20px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            .header {
              width: 100%;
            }
            .brand-tag {
              display: inline-block;
              background-color: ${qrFgColor}15;
              color: ${qrFgColor};
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 2px;
              padding: 6px 16px;
              border-radius: 100px;
              margin-bottom: 12px;
            }
            .title {
              font-family: 'Space Grotesk', sans-serif;
              font-size: 26px;
              font-weight: 700;
              margin: 0 0 8px 0;
              color: #0a0a0a;
              letter-spacing: -0.5px;
            }
            .subtitle {
              font-size: 14px;
              color: #737373;
              margin: 0;
            }
            .qr-wrapper {
              background-color: ${qrBgColor};
              padding: 24px;
              border-radius: 24px;
              border: 1px solid #f5f5f5;
              box-shadow: 0 4px 20px rgba(0,0,0,0.02);
              display: inline-block;
            }
            .qr-wrapper svg {
              width: 180mm !important;
              height: auto !important;
              max-width: 200px !important;
            }
            .cta-box {
              background-color: #f8fafc;
              padding: 14px 20px;
              border-radius: 16px;
              width: 100%;
              box-sizing: border-box;
            }
            .cta-title {
              font-weight: 700;
              font-size: 13px;
              margin: 0 0 4px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: ${qrFgColor};
            }
            .cta-text {
              font-size: 11px;
              color: #525252;
              margin: 0;
            }
            .footer {
              font-size: 10px;
              color: #a3a3a3;
              font-weight: 600;
              letter-spacing: 0.5px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .card-container {
                border: none;
                box-shadow: none;
                width: 100%;
                height: 100vh;
                border-radius: 0;
                padding: 20mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            <div class="header">
              <span class="brand-tag">${config.brandName || 'FESTIV.APP'}</span>
              <h1 class="title">${config.name}</h1>
              ${selectedWallName ? `<p class="subtitle" style="font-weight: bold; color: ${qrFgColor}">📍 Étape : ${selectedWallName}</p>` : `<p class="subtitle">Expérience Interactive Libre</p>`}
            </div>

            <div class="qr-wrapper">
              ${qrSvgString}
            </div>

            <div class="cta-box">
              <h4 class="cta-title">Scannez pour commencer</h4>
              <p class="cta-text">Pointez l'appareil photo de votre smartphone vers ce QR Code pour débloquer l'exposition interactive, la carte 3D, et les quiz !</p>
            </div>

            <div class="footer">
              Créé avec FESTIV.APP • Propulsé par Google Workspace
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShare = async () => {
    if (!qrUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: config.name,
          text: `Découvrez l'exposition interactive "${config.name}" de ${config.brandName}!`,
          url: qrUrl,
        });
      } catch (err) {
        console.log("Sharing cancelled or failed", err);
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: CONTROLS */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Destination Target Type */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              1. Cible du QR Code
            </CardTitle>
            <CardDescription>
              Choisissez où le visiteur est redirigé lorsqu'il scanne ce code.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDestinationType('global')}
                className={cn(
                  "p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all relative overflow-hidden",
                  destinationType === 'global'
                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                )}
              >
                <div className="p-1.5 bg-indigo-50 rounded-xl w-fit text-indigo-600">
                  <Box className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900 leading-none">Exposition Globale</p>
                  <p className="text-[10px] text-neutral-500 mt-1">Accueil de l'exposition</p>
                </div>
                {destinationType === 'global' && (
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white p-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>

              <button
                type="button"
                disabled={walls.length === 0}
                onClick={() => setDestinationType('wall')}
                className={cn(
                  "p-3.5 rounded-2xl border text-left flex flex-col justify-between h-24 transition-all relative overflow-hidden",
                  walls.length === 0 && "opacity-50 cursor-not-allowed",
                  destinationType === 'wall'
                    ? "border-indigo-600 bg-indigo-50/50 shadow-sm"
                    : "border-neutral-200 bg-white hover:bg-neutral-50"
                )}
              >
                <div className="p-1.5 bg-emerald-50 rounded-xl w-fit text-emerald-600">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-neutral-900 leading-none">Point d'Intérêt</p>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    {walls.length > 0 ? `${walls.length} emplacements dispos` : 'Aucun point configuré'}
                  </p>
                </div>
                {destinationType === 'wall' && (
                  <div className="absolute top-3 right-3 bg-indigo-600 text-white p-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </button>
            </div>

            {destinationType === 'wall' && walls.length > 0 && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-200 space-y-1.5">
                <Label htmlFor="wall-selector" className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Sélectionnez le Mur / Point d'intérêt
                </Label>
                <select
                  id="wall-selector"
                  value={selectedWallId}
                  onChange={(e) => setSelectedWallId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {walls.map((wall) => (
                    <option key={wall.id} value={wall.id}>
                      📍 {wall.name} ({wall.artworks?.length || 0} œuvres)
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-neutral-400">
                  Le QR code généré ouvrira directement la fiche descriptive et les œuvres associées à cet emplacement physique.
                </p>
              </div>
            )}

            {!config.id && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-[11px] leading-relaxed space-y-1 mt-2">
                <p className="font-bold flex items-center gap-1.5 text-xs text-amber-900">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Exposition non encore publiée
                </p>
                <p>
                  Les fonctionnalités de redirection personnalisée nécessitent d'abord l'enregistrement de l'exposition. 
                  Cliquez sur <strong>"Publier l'exposition"</strong> en bas de page pour activer le QR code.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Styling controls */}
        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-600" />
              2. Style & Personnalisation
            </CardTitle>
            <CardDescription>
              Modifiez l'apparence visuelle du QR code pour l'accorder à votre marque.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Color Presets */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Palettes de couleur rapides</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setQrFgColor(preset.value);
                      setQrBgColor('#ffffff');
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-left transition-all",
                      qrFgColor === preset.value && qrBgColor === '#ffffff'
                        ? "border-indigo-600 bg-neutral-50 font-bold"
                        : "border-neutral-150 bg-white hover:bg-neutral-50"
                    )}
                  >
                    <span 
                      className="w-4 h-4 rounded-full border border-neutral-100 flex-shrink-0"
                      style={{ backgroundColor: preset.value }}
                    />
                    <span className="text-[10px] uppercase tracking-wider text-neutral-600 truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Color Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fg-color" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Couleur Motif</Label>
                <div className="flex gap-2">
                  <Input 
                    id="fg-color"
                    type="color" 
                    value={qrFgColor} 
                    onChange={(e) => setQrFgColor(e.target.value)}
                    className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                  />
                  <Input 
                    value={qrFgColor} 
                    onChange={(e) => setQrFgColor(e.target.value)}
                    placeholder="#000000"
                    className="font-mono text-xs rounded-xl border-neutral-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bg-color" className="text-xs font-bold uppercase tracking-wider text-neutral-400">Couleur Fond</Label>
                <div className="flex gap-2">
                  <Input 
                    id="bg-color"
                    type="color" 
                    value={qrBgColor} 
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="w-12 h-10 p-1 rounded-xl cursor-pointer"
                  />
                  <Input 
                    value={qrBgColor} 
                    onChange={(e) => setQrBgColor(e.target.value)}
                    placeholder="#ffffff"
                    className="font-mono text-xs rounded-xl border-neutral-200"
                  />
                </div>
              </div>
            </div>

            {/* Central Logo Configuration */}
            <div className="pt-4 border-t border-neutral-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Inclure un logo au centre</Label>
                  <p className="text-[10px] text-neutral-400">Améliore l'identification et l'image de marque.</p>
                </div>
                <Switch 
                  checked={qrIncludeLogo} 
                  onCheckedChange={setQrIncludeLogo}
                />
              </div>

              {qrIncludeLogo && (
                <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-150 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1">
                  {[
                    { id: 'image', label: 'Image Expo' },
                    { id: 'text', label: 'Texte court' },
                    { id: 'icon', label: 'Icône standard' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLogoType(opt.id as any)}
                      className={cn(
                        "py-2 rounded-lg border text-center text-[10px] font-bold uppercase tracking-wider transition-all",
                        logoType === opt.id 
                          ? "border-indigo-600 bg-white text-indigo-900 shadow-xs"
                          : "border-neutral-200 bg-neutral-100/50 text-neutral-500 hover:bg-neutral-100"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}

                  {logoType === 'text' && (
                    <div className="col-span-3 pt-2">
                      <Label htmlFor="logo-text" className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Monogramme court (max 4 car.)</Label>
                      <Input
                        id="logo-text"
                        type="text"
                        maxLength={4}
                        value={customLogoText}
                        onChange={(e) => setCustomLogoText(e.target.value.toUpperCase())}
                        className="rounded-lg mt-1 h-9"
                      />
                    </div>
                  )}

                  {logoType === 'icon' && (
                    <div className="col-span-3 pt-2">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Icône d'activité centrale</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'qr', label: 'QR' },
                          { id: 'map', label: 'Carte' },
                          { id: 'gift', label: 'Cadeau' },
                          { id: 'quiz', label: 'Quiz' },
                        ].map((ic) => (
                          <button
                            key={ic.id}
                            type="button"
                            onClick={() => setCustomLogoText(ic.id)}
                            className={cn(
                              "py-1.5 rounded-md border text-[9px] font-bold text-center",
                              customLogoText === ic.id ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-neutral-200 bg-white"
                            )}
                          >
                            {ic.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Advanced params: Error Correction Level */}
            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400">Niveau de correction d'erreur : {errorCorrection}</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'L', label: 'Faible (L)', desc: 'Plus aéré' },
                  { id: 'M', label: 'Moyen (M)', desc: 'Standard' },
                  { id: 'Q', label: 'Quartile (Q)', desc: 'Robuste' },
                  { id: 'H', label: 'Élevé (H)', desc: 'Ultra-sûr' },
                ].map((ec) => (
                  <button
                    key={ec.id}
                    type="button"
                    onClick={() => setErrorCorrection(ec.id as any)}
                    className={cn(
                      "p-2 rounded-xl border text-center transition-all",
                      errorCorrection === ec.id 
                        ? "border-indigo-600 bg-indigo-50/50 font-bold"
                        : "border-neutral-150 bg-white hover:bg-neutral-50"
                    )}
                  >
                    <p className="text-xs text-neutral-900 leading-none">{ec.label}</p>
                    <p className="text-[8px] text-neutral-400 mt-1">{ec.desc}</p>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-400">
                Un niveau élevé (H) permet d'insérer un logo central ou de scanner l'affiche même si elle est froissée ou partiellement masquée.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* RIGHT COLUMN: PREVIEW & EXPORT ACTIONS */}
      <div className="lg:col-span-5 lg:sticky lg:top-8 h-fit space-y-6">
        
        {/* Dynamic Interactive Card Mockup */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-neutral-150 text-center space-y-6">
          <span className="inline-flex px-3 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-full">
            Aperçu Interactif
          </span>
          
          <div className="space-y-1">
            <h3 className="text-xl font-black text-neutral-950 truncate max-w-xs mx-auto">
              {destinationType === 'wall' && selectedWallId 
                ? (walls.find(w => w.id === selectedWallId)?.name || config.name) 
                : config.name}
            </h3>
            <p className="text-neutral-400 text-xs truncate">{config.brandName || 'Exposition interactive'}</p>
          </div>

          {/* QR Container */}
          <div className="bg-neutral-50 p-6 rounded-[2rem] inline-block border-2 border-neutral-100">
            <div ref={qrContainerRef} className="inline-block relative">
              <QRCodeSVG 
                id="dynamic-custom-qr"
                value={qrUrl || `${window.location.origin}${window.location.pathname}`}
                size={qrSize}
                fgColor={qrFgColor}
                bgColor={qrBgColor}
                level={errorCorrection}
                imageSettings={qrIncludeLogo && logoType === 'image' ? {
                  src: getActiveLogoSrc(),
                  height: 42,
                  width: 42,
                  excavate: true,
                } : undefined}
              />
              
              {/* Overlay custom text logo inside SVG wrapper if chosen */}
              {qrIncludeLogo && logoType !== 'image' && (
                <div 
                  className="absolute inset-0 m-auto rounded-xl flex items-center justify-center font-bold text-[10px] border shadow-xs pointer-events-none select-none"
                  style={{
                    backgroundColor: qrBgColor,
                    borderColor: qrFgColor,
                    color: qrFgColor,
                    width: '42px',
                    height: '42px',
                  }}
                >
                  {logoType === 'text' ? (
                    customLogoText.slice(0, 4)
                  ) : (
                    <span className="scale-95">
                      {customLogoText === 'qr' && <Box className="w-5 h-5" />}
                      {customLogoText === 'map' && <MapPin className="w-5 h-5" />}
                      {customLogoText === 'gift' && <Gift className="w-5 h-5" />}
                      {customLogoText === 'quiz' && <HelpCircle className="w-5 h-5" />}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Size slider */}
          <div className="space-y-1 bg-neutral-50 px-4 py-3 rounded-2xl text-left border border-neutral-100">
            <div className="flex justify-between text-xs font-bold text-neutral-500">
              <span>Affichage à l'écran</span>
              <span>{qrSize}px</span>
            </div>
            <input 
              type="range" 
              min="160" 
              max="320" 
              step="16"
              value={qrSize} 
              onChange={(e) => setQrSize(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* URL Input Display */}
          <div className="space-y-1.5 text-left">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">URL ciblée réelle</Label>
            <div className="flex gap-1">
              <Input 
                value={qrUrl || "Non disponible (veuillez d'abord publier)"} 
                readOnly
                className="font-mono text-[10px] h-9 bg-neutral-50 border-neutral-200 text-neutral-500 rounded-lg flex-1 cursor-default select-all"
              />
              {qrUrl && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="h-9 px-3 rounded-lg"
                  title="Copier le lien"
                >
                  {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          {/* Core sharing & export actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={downloadQRPNG}
              disabled={!qrUrl}
              className="rounded-2xl py-6 font-bold gap-2 text-sm border-neutral-200 flex items-center justify-center"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              Télécharger PNG
            </Button>
            
            <Button 
              variant="outline" 
              onClick={downloadQRSVG}
              disabled={!qrUrl}
              className="rounded-2xl py-6 font-bold gap-2 text-sm border-neutral-200 flex items-center justify-center"
            >
              <Save className="w-4 h-4 text-neutral-500" />
              Télécharger SVG
            </Button>
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-100">
            <Button 
              onClick={handlePrintCard}
              disabled={!qrUrl}
              className="w-full py-6 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold gap-2 flex items-center justify-center shadow-lg shadow-amber-100 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimer Chevalet de table (A5)
            </Button>

            <Button 
              onClick={handleShare}
              disabled={!qrUrl}
              variant="ghost"
              className="w-full text-neutral-500 hover:text-indigo-600 font-bold flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Partager ou Copier le lien
            </Button>
          </div>

          {qrUrl && (
            <a 
              href={qrUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-neutral-400 text-[10px] flex items-center justify-center gap-1 hover:underline mt-2"
            >
              <ExternalLink className="w-3 h-3" /> Tester le lien de destination directement
            </a>
          )}

        </div>

      </div>

    </div>
  );
};
