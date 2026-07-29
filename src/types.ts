export interface MenuItem {
  id: string;
  name: string;
  price: string;
  description?: string;
  image?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  steps: string[];
  image?: string;
}

export interface TimelineItem {
  id: string;
  year?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  originalName?: string;
  sizeBytes?: number;
}

export interface ProductStory {
  title: string;
  content: string;
  imageUrl?: string;
}

export interface CampaignConfig {
  id?: string;
  name: string;
  brandName: string;
  whatsapp: string;
  themeColor: string;
  ownerUid?: string;
  logoUrl?: string;
  language?: 'fr' | 'en';
  createdAt?: any;
  updatedAt?: any;
  expiresAt?: string; // ISO date string

  // Analytics
  stats?: {
    scans: number;
    gamesCompleted: number;
    spinWins?: number;
    quizWins?: number;
    couponViews: number;
    leads?: number;
    shares?: {
      whatsapp: number;
      instagram: number;
      tiktok: number;
    };
  };
  
  // Modules
  countdown?: {
    enabled: boolean;
    targetDate: string; // ISO date string
    label: string;
  };
  scratchCard?: {
    enabled: boolean;
    offer: string;
  };
  story?: {
    enabled: boolean;
    title: string;
    content: string;
    imageUrl?: string;
  };
  timeline?: {
    enabled: boolean;
    title?: string;
    items: TimelineItem[];
  };
  recipes?: {
    enabled: boolean;
    items: Recipe[];
  };
  audio?: {
    enabled: boolean;
    url: string;
    title: string;
  };
  video?: {
    enabled: boolean;
    url: string;
    title: string;
  };
  coupon?: {
    enabled: boolean;
    code: string;
    description: string;
  };
  spinWheel?: {
    enabled: boolean;
    segments: import('./components/SpinWheel').SpinSegment[];
  };
  quiz?: {
    enabled: boolean;
    threshold: number;
    coupon: { code: string; label: string };
    questions: import('./components/QuizModule').QuizQuestion[];
  };
  photobooth?: {
    enabled: boolean;
    overlayUrl?: string;
    filter?: string;
    frameTheme?: 'ramadan' | 'christmas' | 'blackfriday' | 'summer' | 'none';
  };
  videoboth?: {
    enabled: boolean;
    maxDuration?: number; // in seconds
    overlayUrl?: string;
  };
  socialEntry?: {
    enabled: boolean;
    providers: ('facebook' | 'instagram' | 'tiktok' | 'whatsapp')[];
    required: boolean;
  };
  ar?: {
    enabled: boolean;
    modelUrl: string;
    posterUrl?: string;
    altText?: string;
  };
  graffiti?: {
    enabled?: boolean;
    requireModeration?: boolean;
  };
  walls?: WallConfig[];
  mediaWallLayout?: {
    enabled?: boolean;
    imageUrl: string;
    pois: {
      id: string;
      name: string;
      description: string;
      x: number; // percentage coordinate 0-100
      y: number; // percentage coordinate 0-100
      associatedWallId?: string; // links to an existing WallConfig
    }[];
  };
  workspace?: {
    enabled?: boolean;
    sheets?: {
      enabled: boolean;
      spreadsheetId: string;
      spreadsheetName?: string;
      range: string;
    };
    drive?: {
      enabled: boolean;
      folderId: string;
      folderName?: string;
    };
    chat?: {
      enabled: boolean;
      spaceId: string;
      spaceName?: string;
    };
  };
}

export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  arModelUrl?: string;
}

export interface WallConfig {
  id: string;
  name: string;
  description: string;
  latitude?: number;
  longitude?: number;
  artworks: Artwork[];
  audioUrl?: string; // Couche média: Audioguide MP3 pour ce POI
  videoUrl?: string; // Couche média: Vidéo de présentation pour ce POI
}

// Keep VendorConfig for backward compatibility if needed, but we'll pivot App to CampaignConfig
export type VendorConfig = CampaignConfig;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}
