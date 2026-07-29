import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CampaignConfig, WallConfig } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function extractGoogleDriveFileId(value: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/thumbnail\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

export function normalizeImageUrl(value: string): string {
  const trimmed = value?.trim() || '';

  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('/')) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/api/image-proxy')) {
    return trimmed;
  }

  const driveFileId = extractGoogleDriveFileId(trimmed);
  if (driveFileId) {
    return `/api/image-proxy?url=${encodeURIComponent(`https://drive.google.com/uc?export=view&id=${driveFileId}`)}`;
  }

  return `/api/image-proxy?url=${encodeURIComponent(trimmed)}`;
}

export function normalizeWalls(config: CampaignConfig): WallConfig[] {
  if (config.walls && config.walls.length > 0) {
    return config.walls;
  }

  const defaultWalls: WallConfig[] = [
    {
      id: 'wall_medina',
      name: 'Fresque de la Médina de Hammamet',
      description: 'Une fresque street art célébrant l\'histoire maritime de Hammamet sur les murs de la vieille médina.',
      latitude: 36.3946,
      longitude: 10.6133,
      artworks: [
        {
          id: 'art_medina_1',
          title: 'Le Pêcheur Éternel',
          description: 'Représentation géante d\'un pêcheur de Hammamet ramenant ses filets dorés de la Méditerranée.',
          imageUrl: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
          arModelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
        },
        {
          id: 'art_medina_2',
          title: 'Porte Bleue du Destin',
          description: 'Une porte tunisienne traditionnelle réinterprétée en style cubiste et contemporain.',
          imageUrl: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80',
          arModelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
        }
      ]
    },
    {
      id: 'wall_sebastian',
      name: 'Mur d\'Art à Dar Sebastian',
      description: 'Exposition d\'œuvres contemporaines au cœur du jardin botanique du Centre Culturel International de Hammamet.',
      latitude: 36.4058,
      longitude: 10.6087,
      artworks: [
        {
          id: 'art_sebastian_1',
          title: 'L\'Olivier Sacré',
          description: 'Sculpture moderne stylisée rendant hommage aux oliviers centenaires de Tunisie.',
          imageUrl: 'https://images.unsplash.com/photo-1600577916048-804c9191e36c?auto=format&fit=crop&w=800&q=80',
          arModelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb'
        }
      ]
    }
  ];

  if (config.ar && config.ar.enabled && config.ar.modelUrl) {
    return [
      {
        id: 'wall_v1_imported',
        name: config.story?.title || 'Oeuvre Principale',
        description: config.story?.content || 'Description de l\'oeuvre',
        latitude: 36.3946,
        longitude: 10.6133,
        artworks: [
          {
            id: 'art_v1',
            title: config.story?.title || 'Oeuvre AR',
            description: config.story?.content || 'Visualisez l\'œuvre en réalité augmentée sur le mur.',
            imageUrl: config.story?.imageUrl || 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
            arModelUrl: config.ar.modelUrl
          }
        ]
      },
      ...defaultWalls.slice(1)
    ];
  }

  return defaultWalls;
}
