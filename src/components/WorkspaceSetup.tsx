import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { 
  signInWithWorkspace, 
  checkWorkspaceStatus, 
  disconnectWorkspace, 
  listDriveFolders, 
  createDriveFolder, 
  listSpreadsheets, 
  createSpreadsheet, 
  listChatSpaces, 
  sendChatMessage,
  DriveFolder,
  SpreadsheetInfo,
  ChatSpace
} from '../lib/workspace';
import { CampaignConfig } from '../types';
import { 
  Folder, 
  FileSpreadsheet, 
  MessageSquare, 
  Cloud, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Loader2, 
  Send,
  LogOut
} from 'lucide-react';
import { toast } from 'sonner';

interface WorkspaceSetupProps {
  config: CampaignConfig;
  onChange: (newConfig: CampaignConfig) => void;
}

export function WorkspaceSetup({ config, onChange }: WorkspaceSetupProps) {
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Loaded lists from Google APIs
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetInfo[]>([]);
  const [chatSpaces, setChatSpaces] = useState<ChatSpace[]>([]);
  
  // Operation loadings
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [sendingTestChat, setSendingTestChat] = useState(false);

  // Initialize and check if already logged in (token cached on the server)
  useEffect(() => {
    if (config.id) {
      checkWorkspaceStatus(config.id).then(status => {
        setIsLoggedIn(status);
        if (status) {
          loadGoogleResources();
        }
      });
    }
  }, [config.id]);

  const loadGoogleResources = async () => {
    setLoading(true);
    try {
      // Parallel loading of folders, spreadsheets, and spaces
      const [foldersList, sheetsList, spacesList] = await Promise.all([
        listDriveFolders(config.id).catch(() => [] as DriveFolder[]),
        listSpreadsheets(config.id).catch(() => [] as SpreadsheetInfo[]),
        listChatSpaces(config.id).catch(() => [] as ChatSpace[])
      ]);
      
      setFolders(foldersList);
      setSpreadsheets(sheetsList);
      setChatSpaces(spacesList);
    } catch (error) {
      console.error("Erreur de chargement Google Workspace:", error);
      toast.error("Impossible de récupérer vos ressources Google Workspace.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await signInWithWorkspace(config.id);
      if (result) {
        setIsLoggedIn(true);
        toast.success("Connecté avec succès à Google Workspace !");
        loadGoogleResources();
      }
    } catch (error: any) {
      toast.error(error.message || "Échec de la connexion Google Workspace.");
    }
  };

  const handleLogout = async () => {
    try {
      const ok = await disconnectWorkspace(config.id);
      if (ok) {
        setIsLoggedIn(false);
        setFolders([]);
        setSpreadsheets([]);
        setChatSpaces([]);
        toast.success("Déconnecté de Google Workspace.");
      } else {
        toast.error("Erreur de déconnexion Google Workspace.");
      }
    } catch (error) {
      toast.error("Erreur lors de la déconnexion.");
    }
  };

  // Helper to ensure workspace node is initialized in config
  const updateWorkspaceConfig = (key: 'sheets' | 'drive' | 'chat', value: any) => {
    const currentWorkspace = config.workspace || { enabled: true };
    const newWorkspace = {
      ...currentWorkspace,
      enabled: true,
      [key]: {
        ...(currentWorkspace[key] || { enabled: false }),
        ...value
      }
    };
    onChange({
      ...config,
      workspace: newWorkspace
    });
  };

  const handleAutoCreateFolder = async () => {
    setCreatingFolder(true);
    try {
      const folderName = `expoAPP - ${config.name || 'Exposition Souvenirs'}`;
      const newFolder = await createDriveFolder(config.id, folderName);
      
      // Update local lists
      setFolders(prev => [newFolder, ...prev]);
      
      // Update config
      updateWorkspaceConfig('drive', {
        enabled: true,
        folderId: newFolder.id,
        folderName: newFolder.name
      });
      
      toast.success(`Dossier Google Drive "${folderName}" créé avec succès !`);
    } catch (error) {
      toast.error("Erreur de création de dossier dans Google Drive.");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleAutoCreateSpreadsheet = async () => {
    setCreatingSheet(true);
    try {
      const sheetName = `expoAPP - ${config.name || 'Exposition'} - Visiteurs`;
      const newSheet = await createSpreadsheet(config.id, sheetName);
      
      // Update local list
      setSpreadsheets(prev => [newSheet, ...prev]);
      
      // Update config
      updateWorkspaceConfig('sheets', {
        enabled: true,
        spreadsheetId: newSheet.id,
        spreadsheetName: newSheet.name,
        range: 'Visiteurs!A1'
      });
      
      toast.success(`Tableur Google Sheets "${sheetName}" créé avec succès !`);
    } catch (error) {
      toast.error("Erreur de création du tableur Google Sheets.");
    } finally {
      setCreatingSheet(false);
    }
  };

  const handleSendTestMessage = async () => {
    const spaceId = config.workspace?.chat?.spaceId;
    if (!spaceId) {
      toast.error("Veuillez sélectionner un espace Google Chat d'abord.");
      return;
    }

    setSendingTestChat(true);
    try {
      const text = `🔔 *expoAPP Test de connexion* 🔔\nL'intégration d'alerte en direct pour l'exposition *"${config.name || 'En cours'}"* est opérationnelle ! 🚀`;
      await sendChatMessage(config.id, spaceId, text);
      toast.success("Message de test envoyé à Google Chat !");
    } catch (error) {
      toast.error("Échec de l'envoi du message à Google Chat.");
    } finally {
      setSendingTestChat(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Header card */}
      <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                <Cloud className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-lg">Intégrations Google Workspace</h3>
                <p className="text-xs text-neutral-500">Automatisez la gestion des souvenirs, le suivi des visiteurs et l'alerte du staff.</p>
              </div>
            </div>

            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" /> Connecté
                </span>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Déconnecter Google">
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="gsi-material-button font-sans rounded-xl border border-neutral-200 shadow-sm overflow-hidden flex items-center py-2 px-4 bg-white hover:bg-neutral-50 active:bg-neutral-100 transition-all"
              >
                <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                  <div className="gsi-material-button-icon w-5 h-5">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents text-xs font-bold text-neutral-700">Se connecter avec Google</span>
                </div>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {!isLoggedIn ? (
        <Card className="border-2 border-dashed border-neutral-200">
          <CardContent className="p-8 text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold">Google Workspace non connecté</h4>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">Connectez votre compte Google pour synchroniser vos questionnaires et sauvegarder les médias de vos visiteurs.</p>
            </div>
            <Button onClick={handleLogin} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
              Activer l'intégration Google
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Google Sheets Card */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Google Sheets
                </CardTitle>
                <CardDescription>Exportez l'historique des activités et les scores de vos visiteurs en direct.</CardDescription>
              </div>
              <Switch 
                checked={config.workspace?.sheets?.enabled ?? false}
                onCheckedChange={(val) => updateWorkspaceConfig('sheets', { enabled: val })}
              />
            </CardHeader>
            {(config.workspace?.sheets?.enabled ?? false) && (
              <CardContent className="space-y-4 border-t border-neutral-50 pt-4">
                <div className="space-y-2">
                  <Label>Sélectionner un Tableur Google Sheets</Label>
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Chargement de vos tableurs...
                    </div>
                  ) : spreadsheets.length === 0 ? (
                    <div className="text-xs text-neutral-400 italic">Aucun tableur trouvé. Vous pouvez en créer un ci-dessous !</div>
                  ) : (
                    <select
                      value={config.workspace?.sheets?.spreadsheetId || ''}
                      onChange={(e) => {
                        const selected = spreadsheets.find(s => s.id === e.target.value);
                        updateWorkspaceConfig('sheets', {
                          spreadsheetId: e.target.value,
                          spreadsheetName: selected?.name || ''
                        });
                      }}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                    >
                      <option value="">-- Choisir une feuille de calcul --</option>
                      {spreadsheets.map(sheet => (
                        <option key={sheet.id} value={sheet.id}>{sheet.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleAutoCreateSpreadsheet} 
                    disabled={creatingSheet}
                    variant="outline"
                    className="text-xs font-bold rounded-xl h-10 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                  >
                    {creatingSheet ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                    Créer un nouveau tableur expoAPP
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Nom de l'onglet de destination (ex: Visiteurs)</Label>
                  <Input 
                    value={config.workspace?.sheets?.range || 'Visiteurs!A1'}
                    onChange={(e) => updateWorkspaceConfig('sheets', { range: e.target.value })}
                    placeholder="Feuille1!A1"
                  />
                  <p className="text-[10px] text-neutral-400">Précisez l'onglet et la cellule de départ. L'application ajoutera automatiquement une ligne à chaque nouveau scan ou score de quiz.</p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Google Drive Card */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-600" /> Google Drive
                </CardTitle>
                <CardDescription>Sauvegardez les selfies Photobooth et les vidéos-témoignages de vos visiteurs.</CardDescription>
              </div>
              <Switch 
                checked={config.workspace?.drive?.enabled ?? false}
                onCheckedChange={(val) => updateWorkspaceConfig('drive', { enabled: val })}
              />
            </CardHeader>
            {(config.workspace?.drive?.enabled ?? false) && (
              <CardContent className="space-y-4 border-t border-neutral-50 pt-4">
                <div className="space-y-2">
                  <Label>Dossier Google Drive de destination</Label>
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Chargement de vos dossiers...
                    </div>
                  ) : folders.length === 0 ? (
                    <div className="text-xs text-neutral-400 italic">Aucun dossier trouvé. Vous pouvez en créer un ci-dessous !</div>
                  ) : (
                    <select
                      value={config.workspace?.drive?.folderId || ''}
                      onChange={(e) => {
                        const selected = folders.find(f => f.id === e.target.value);
                        updateWorkspaceConfig('drive', {
                          folderId: e.target.value,
                          folderName: selected?.name || ''
                        });
                      }}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                    >
                      <option value="">-- Choisir un dossier --</option>
                      {folders.map(folder => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleAutoCreateFolder} 
                    disabled={creatingFolder}
                    variant="outline"
                    className="text-xs font-bold rounded-xl h-10 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                    Créer un nouveau dossier expoAPP
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Google Chat Card */}
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" /> Google Chat
                </CardTitle>
                <CardDescription>Recevez des alertes en temps réel sur vos salons de discussion d'équipe (Scans, Abonnés, Victoires).</CardDescription>
              </div>
              <Switch 
                checked={config.workspace?.chat?.enabled ?? false}
                onCheckedChange={(val) => updateWorkspaceConfig('chat', { enabled: val })}
              />
            </CardHeader>
            {(config.workspace?.chat?.enabled ?? false) && (
              <CardContent className="space-y-4 border-t border-neutral-50 pt-4">
                <div className="space-y-2">
                  <Label>Sélectionner un Espace Google Chat</Label>
                  {loading ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Chargement de vos espaces...
                    </div>
                  ) : chatSpaces.length === 0 ? (
                    <div className="text-xs text-neutral-400 italic">Aucun espace de discussion trouvé. Assurez-vous d'avoir rejoint un espace avec votre compte.</div>
                  ) : (
                    <select
                      value={config.workspace?.chat?.spaceId || ''}
                      onChange={(e) => {
                        const selected = chatSpaces.find(s => s.name === e.target.value);
                        updateWorkspaceConfig('chat', {
                          spaceId: e.target.value,
                          spaceName: selected?.displayName || ''
                        });
                      }}
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm bg-white"
                    >
                      <option value="">-- Choisir un Espace Chat --</option>
                      {chatSpaces.map(space => (
                        <option key={space.name} value={space.name}>{space.displayName}</option>
                      ))}
                    </select>
                  )}
                </div>

                {config.workspace?.chat?.spaceId && (
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSendTestMessage} 
                      disabled={sendingTestChat}
                      variant="outline"
                      className="text-xs font-bold rounded-xl h-10 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      {sendingTestChat ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                      Envoyer un message test
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
