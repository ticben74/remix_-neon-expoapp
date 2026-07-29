// Required Google API scopes for the integration (Least Privilege Scopes)
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Only files created/opened by this app
  'https://www.googleapis.com/auth/drive.readonly', // Required to download selected image binaries (alt=media)
  'https://www.googleapis.com/auth/drive.metadata.readonly', // Read file metadata for Google Picker
  'https://www.googleapis.com/auth/spreadsheets', // To create and append lead/visit trackers
  'https://www.googleapis.com/auth/chat.messages.create' // To send real-time event notifications
];

let isSigningIn = false;

export interface DriveFolder {
  id: string;
  name: string;
}

export interface DriveImageFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  sizeBytes?: number;
  thumbnailLink?: string;
  webContentLink?: string;
  webViewLink?: string;
}

export interface ImportedMediaFile {
  id: number;
  url: string;
  thumbnailUrl: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  driveFileId?: string;
}

export interface SpreadsheetInfo {
  id: string;
  name: string;
}

export interface ChatSpace {
  name: string; // Resource name like spaces/XXXX
  displayName: string;
  type: string;
}

const DEFAULT_GOOGLE_OAUTH_CLIENT_ID = '61419853689-s96vdnpfisvckeniem3eldsc96jg918b.apps.googleusercontent.com';
const GOOGLE_OAUTH_CLIENT_ID =
  ((import.meta as any)?.env?.VITE_GOOGLE_OAUTH_CLIENT_ID as string | undefined)?.trim() ||
  DEFAULT_GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_OAUTH_CALLBACK_URL =
  ((import.meta as any)?.env?.VITE_GOOGLE_OAUTH_CALLBACK_URL as string | undefined)?.trim();
const OAUTH_PENDING_CAMPAIGN_KEY = 'workspace_oauth_pending_campaign_id';

const readApiErrorMessage = async (response: Response): Promise<string> => {
  const raw = await response.text();
  if (!raw) {
    return `Erreur HTTP ${response.status}`;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.error === 'string' && parsed.error.trim()) return parsed.error.trim();
    if (typeof parsed?.message === 'string' && parsed.message.trim()) return parsed.message.trim();
  } catch {
    // Keep raw fallback if response is not JSON.
  }

  return raw;
};

/**
 * Sign in with Google using secure popup and authorization code response
 * that saves the token server-side in the database.
 */
export const signInWithWorkspace = async (campaignId: string): Promise<{ accessToken: string } | null> => {
  if (!campaignId) {
    throw new Error("ID de campagne requis pour l'authentification.");
  }

  if (isSigningIn) return null;
  isSigningIn = true;

  try {
    const redirectUri = GOOGLE_OAUTH_CALLBACK_URL || `${window.location.origin}/api/auth/callback`;
    localStorage.setItem(OAUTH_PENDING_CAMPAIGN_KEY, campaignId);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(GOOGLE_OAUTH_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=token` +
      `&scope=${encodeURIComponent(WORKSPACE_SCOPES.join(' '))}` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(campaignId)}`;

    const width = 500;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const popupName = `GoogleWorkspaceAuth_${encodeURIComponent(campaignId)}`;

    const popup = window.open(
      authUrl,
      popupName,
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!popup) {
      throw new Error("Le bloqueur de fenêtres a empêché la popup d'authentification de s'ouvrir.");
    }

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.campaignId === campaignId) {
          localStorage.removeItem(OAUTH_PENDING_CAMPAIGN_KEY);
          window.removeEventListener('message', handleMessage);
          resolve({ accessToken: event.data.token });
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup is closed by user
      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          localStorage.removeItem(OAUTH_PENDING_CAMPAIGN_KEY);
          window.removeEventListener('message', handleMessage);
          reject(new Error("La fenêtre d'authentification a été fermée."));
        }
      }, 1000);
    });
  } finally {
    isSigningIn = false;
  }
};

/**
 * Check if the workspace is connected on the server
 */
export const checkWorkspaceStatus = async (campaignId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/workspace/token-status`);
    if (!response.ok) return false;
    const data = await response.json();
    return !!data.hasToken;
  } catch {
    return false;
  }
};

/**
 * Disconnect workspace for a campaign on the server
 */
export const disconnectWorkspace = async (campaignId: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/campaigns/${campaignId}/workspace/disconnect`, {
      method: 'POST'
    });
    return response.ok;
  } catch {
    return false;
  }
};

/**
 * List folders in the user's Google Drive via server proxy
 */
export const listDriveFolders = async (campaignId: string): Promise<DriveFolder[]> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/folders`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

/**
 * List image files in the user's Google Drive via server proxy
 */
export const listDriveImages = async (campaignId: string, folderId?: string): Promise<DriveImageFile[]> => {
  const queryParam = folderId && folderId !== 'all' ? `?folderId=${encodeURIComponent(folderId)}` : '';
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/drive-images${queryParam}`);
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }
  return response.json();
};

/**
 * Import files from Google Drive server-side: download binary, validate, SHA256 hash, create WebP thumbnail, store in /media and DB
 */
export const importDriveMedia = async (campaignId: string, fileIds: string[]): Promise<{ importedCount: number; files: ImportedMediaFile[] }> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/import-drive-media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds })
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  return response.json();
};

/**
 * Direct device upload pipeline storing in /media and DB
 */
export const uploadLocalMedia = async (campaignId: string, files: { name: string; mimeType: string; base64: string }[]): Promise<{ files: ImportedMediaFile[] }> => {
  const response = await fetch(`/api/campaigns/${campaignId}/upload-media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

/**
 * Create a new folder in Google Drive via server proxy
 */
export const createDriveFolder = async (campaignId: string, name: string): Promise<DriveFolder> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/folders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

/**
 * List spreadsheets from Google Drive via server proxy
 */
export const listSpreadsheets = async (campaignId: string): Promise<SpreadsheetInfo[]> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/spreadsheets`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

/**
 * Create a new spreadsheet in Google Sheets via server proxy
 */
export const createSpreadsheet = async (campaignId: string, title: string): Promise<SpreadsheetInfo> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/spreadsheets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

/**
 * Append a row of data to a spreadsheet via server proxy
 */
export const appendRowToSpreadsheet = async (
  campaignId: string,
  spreadsheetId: string,
  range: string,
  rowValues: any[]
): Promise<any> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/sheets-append`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spreadsheetId,
      range,
      row: rowValues
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

/**
 * List the user's joined Google Chat Spaces via server proxy
 */
export const listChatSpaces = async (campaignId: string): Promise<ChatSpace[]> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/spaces`);
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

/**
 * Send a notification/message to a specific Google Chat space via server proxy
 */
export const sendChatMessage = async (
  campaignId: string,
  spaceName: string,
  text: string
): Promise<any> => {
  const response = await fetch(`/api/campaigns/${campaignId}/workspace/chat-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spaceId: spaceName,
      text
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};

/**
 * Upload a captured photo or recorded video as raw binary stream data to the server proxy.
 * Avoids any base64 conversion on the client, which fixes the call stack size limit crash.
 */
export const uploadFileToFolder = async (
  campaignId: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBlob: Blob
): Promise<any> => {
  const url = `/api/campaigns/${campaignId}/workspace/drive-upload?fileName=${encodeURIComponent(fileName)}&mimeType=${encodeURIComponent(mimeType)}&folderId=${encodeURIComponent(folderId)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream'
    },
    body: fileBlob
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
};
