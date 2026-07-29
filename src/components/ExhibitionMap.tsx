import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { WallConfig } from '../types';
import { Button } from './ui/button';
import { MapPin, Navigation, Compass, CheckCircle2, ChevronRight, Locate, RefreshCw, AlertCircle, Layers, Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExhibitionMapProps {
  walls: WallConfig[];
  completedWalls: string[];
  themeColor?: string;
  selectedWall: WallConfig | null;
  onSelectWall: (wall: WallConfig) => void;
  onMarkCompleted?: (wallId: string) => void;
}

// Haversine formula for distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export const ExhibitionMap: React.FC<ExhibitionMapProps> = ({
  walls,
  completedWalls,
  themeColor = '#4f46e5',
  selectedWall,
  onSelectWall,
  onMarkCompleted
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const pathPolylineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [activeWallId, setActiveWallId] = useState<string | null>(selectedWall?.id || null);
  const [simulationMode, setSimulationMode] = useState(false);

  // Normalize wall positions (ensure coordinates exist, or generate staggered layout around center)
  const normalizedWallsWithCoords = useMemo(() => {
    const baseLat = 36.3946;
    const baseLng = 10.6133;

    return walls.map((wall, index) => {
      let lat = wall.latitude;
      let lng = wall.longitude;

      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
        // Staggered ring offset if lat/lng is missing
        const angle = (index / Math.max(walls.length, 1)) * 2 * Math.PI;
        const radius = 0.0025 + (index % 2) * 0.001;
        lat = baseLat + radius * Math.cos(angle);
        lng = baseLng + radius * Math.sin(angle);
      }

      return {
        ...wall,
        latitude: lat,
        longitude: lng
      };
    });
  }, [walls]);

  // Nearest wall to user calculation
  const nearestWallInfo = useMemo(() => {
    if (!userLocation || normalizedWallsWithCoords.length === 0) return null;

    let minDistance = Infinity;
    let closestWall: typeof normalizedWallsWithCoords[0] | null = null;

    for (const wall of normalizedWallsWithCoords) {
      const dist = getDistanceInMeters(userLocation.lat, userLocation.lng, wall.latitude!, wall.longitude!);
      if (dist < minDistance) {
        minDistance = dist;
        closestWall = wall;
      }
    }

    if (!closestWall) return null;

    return {
      wall: closestWall,
      distance: minDistance,
      isCompleted: completedWalls.includes(closestWall.id)
    };
  }, [userLocation, normalizedWallsWithCoords, completedWalls]);

  // Total path distance calculation
  const totalPathDistanceMeters = useMemo(() => {
    if (normalizedWallsWithCoords.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < normalizedWallsWithCoords.length - 1; i++) {
      total += getDistanceInMeters(
        normalizedWallsWithCoords[i].latitude!,
        normalizedWallsWithCoords[i].longitude!,
        normalizedWallsWithCoords[i + 1].latitude!,
        normalizedWallsWithCoords[i + 1].longitude!
      );
    }
    return total;
  }, [normalizedWallsWithCoords]);

  // Geolocate user
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        };
        setUserLocation(coords);
        setIsLocating(false);

        // Pan map smoothly to user location if valid
        if (mapRef.current) {
          mapRef.current.panTo([coords.lat, coords.lng], { animate: true });
        }
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Permission de géolocalisation refusée. Vous pouvez utiliser le bouton de simulation ci-dessous.");
        } else {
          setLocationError("Impossible de déterminer votre position GPS exacte.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  // Continuous geolocation watch
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
        setLocationError(null);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Default initial center
      const centerLat = normalizedWallsWithCoords[0]?.latitude || 36.3946;
      const centerLng = normalizedWallsWithCoords[0]?.longitude || 10.6133;

      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([centerLat, centerLng], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom zoom control in top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      markersGroupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Wall Markers & Path Polyline when walls, completedWalls, or activeWallId change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (markersGroupRef.current) {
      markersGroupRef.current.clearLayers();
    }

    if (pathPolylineRef.current) {
      pathPolylineRef.current.remove();
      pathPolylineRef.current = null;
    }

    if (normalizedWallsWithCoords.length === 0) return;

    const latLngs: L.LatLngTuple[] = [];

    normalizedWallsWithCoords.forEach((wall, idx) => {
      const lat = wall.latitude!;
      const lng = wall.longitude!;
      latLngs.push([lat, lng]);

      const isCompleted = completedWalls.includes(wall.id);
      const isSelected = activeWallId === wall.id || selectedWall?.id === wall.id;

      // Custom Marker Icon
      const iconHtml = `
        <div class="relative group cursor-pointer">
          ${isSelected ? `<div class="absolute -inset-3 rounded-full bg-indigo-500/30 animate-ping pointer-events-none"></div>` : ''}
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white shadow-lg border-2 transition-transform duration-200 hover:scale-110 ${
            isCompleted 
              ? 'bg-emerald-600 border-white' 
              : isSelected 
                ? 'bg-neutral-950 border-white scale-110 ring-4 ring-indigo-500/40' 
                : 'bg-white text-neutral-900 border-neutral-300'
          }" style="background-color: ${!isCompleted && !isSelected ? themeColor : undefined}; color: ${!isCompleted && !isSelected ? '#ffffff' : undefined}">
            ${isCompleted ? '✓' : idx + 1}
          </div>
          <div class="absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-neutral-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md backdrop-blur-xs">
            ${wall.name}
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-wall-marker-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Click handler for wall marker
      marker.on('click', () => {
        setActiveWallId(wall.id);
        onSelectWall(wall);
        map.panTo([lat, lng], { animate: true });
      });

      if (markersGroupRef.current) {
        marker.addTo(markersGroupRef.current);
      }
    });

    // Draw planned path line connecting stops
    if (latLngs.length > 1) {
      const polyline = L.polyline(latLngs, {
        color: themeColor,
        weight: 4,
        opacity: 0.85,
        dashArray: '8, 8'
      }).addTo(map);

      pathPolylineRef.current = polyline;
    }

    // Adjust map bounds to include all markers
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    }
  }, [normalizedWallsWithCoords, completedWalls, activeWallId, selectedWall, themeColor]);

  // Update User Location Marker on Map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
      return;
    }

    const { lat, lng, accuracy } = userLocation;

    // User pulsating blue dot icon
    const userIconHtml = `
      <div class="relative flex items-center justify-center">
        <span class="absolute -inset-3 rounded-full bg-sky-500/40 animate-ping"></span>
        <div class="w-5 h-5 rounded-full bg-sky-500 border-2 border-white shadow-lg ring-4 ring-sky-500/30"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: 'custom-user-location-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarkerRef.current.setLatLng([lat, lng]);
      userMarkerRef.current.setIcon(userIcon);
    }

    if (accuracy && accuracy < 500) {
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle([lat, lng], {
          radius: accuracy,
          color: '#0284c7',
          fillColor: '#38bdf8',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng([lat, lng]);
        userAccuracyCircleRef.current.setRadius(accuracy);
      }
    }
  }, [userLocation]);

  // Recenter map on all walls
  const handleFitBounds = () => {
    if (!mapRef.current || normalizedWallsWithCoords.length === 0) return;
    const latLngs = normalizedWallsWithCoords.map((w) => [w.latitude!, w.longitude!] as L.LatLngTuple);
    if (userLocation) {
      latLngs.push([userLocation.lat, userLocation.lng]);
    }
    const bounds = L.latLngBounds(latLngs);
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
  };

  // Center map on user location
  const handleCenterOnUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 17, { animate: true });
    } else {
      requestLocation();
    }
  };

  // Enable simulated location for testing/demo
  const handleSimulateLocationNearPath = () => {
    if (normalizedWallsWithCoords.length === 0) return;
    const firstWall = normalizedWallsWithCoords[0];
    // Offset slightly from first wall (~30m)
    const simLat = firstWall.latitude! - 0.0003;
    const simLng = firstWall.longitude! - 0.0002;

    setUserLocation({
      lat: simLat,
      lng: simLng,
      accuracy: 15
    });
    setSimulationMode(true);
    setLocationError(null);

    if (mapRef.current) {
      mapRef.current.panTo([simLat, simLng], { animate: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Status Bar */}
      <div className="bg-white p-4 rounded-[2rem] border border-neutral-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Compass className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-black text-neutral-900 tracking-tight">
                Carte du Parcours d'Exposition
              </h4>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium mt-0.5">
              Suivez le parcours pas-à-pas et repérez les murs et œuvres à proximité.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCenterOnUser}
              className="rounded-full text-xs font-bold gap-1.5 border-neutral-200 h-8"
              title="Centrer sur ma position GPS"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-600" />
              {isLocating ? 'Géolocalisation...' : userLocation ? 'Ma Position' : 'Activer GPS'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleFitBounds}
              className="rounded-full text-xs font-bold gap-1.5 border-neutral-200 h-8"
              title="Aafficher tout le parcours"
            >
              <Layers className="w-3.5 h-3.5 text-neutral-600" />
              Vue globale
            </Button>
          </div>
        </div>

        {/* Dynamic Distance & Nearest Stop Banner */}
        {nearestWallInfo ? (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100/80 text-xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="truncate">
                <p className="font-bold text-neutral-900 truncate">
                  Prochaine étape : <span className="text-indigo-700 font-black">{nearestWallInfo.wall.name}</span>
                </p>
                <p className="text-[10px] text-neutral-500 font-medium">
                  À environ <strong className="text-neutral-800">{nearestWallInfo.distance} mètres</strong> de votre position
                  {nearestWallInfo.isCompleted ? ' (Déjà visitée ✓)' : ''}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                onSelectWall(nearestWallInfo.wall);
                setActiveWallId(nearestWallInfo.wall.id);
              }}
              className="rounded-xl h-8 text-[11px] font-bold text-white shrink-0 ml-2 shadow-xs"
              style={{ backgroundColor: themeColor }}
            >
              Découvrir <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 border border-neutral-150 text-xs text-neutral-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Info className="w-4 h-4 text-neutral-400" />
              Activez votre GPS ou utilisez la simulation pour connaître la distance exacte des œuvres.
            </span>
            <button
              onClick={handleSimulateLocationNearPath}
              className="text-[11px] font-bold text-indigo-600 hover:underline shrink-0 ml-2"
            >
              Simuler position 📍
            </button>
          </div>
        )}
      </div>

      {/* Main Leaflet Map Container */}
      <div className="relative aspect-square sm:aspect-video w-full rounded-[2.5rem] overflow-hidden border border-neutral-200/80 shadow-inner bg-neutral-900 z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Legend Overlay */}
        <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-neutral-200/80 shadow-md text-[10px] space-y-1">
          <div className="flex items-center gap-2 font-bold text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" /> Étape visitée
          </div>
          <div className="flex items-center gap-2 font-bold text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: themeColor }} /> Étape à découvrir
          </div>
          <div className="flex items-center gap-2 font-bold text-neutral-700">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-300 inline-block" /> Vous êtes ici
          </div>
        </div>

        {/* Distance summary overlay badge */}
        {totalPathDistanceMeters > 0 && (
          <div className="absolute top-3 left-3 z-[400] bg-neutral-900/80 text-white backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1.5 border border-white/10 shadow-sm">
            <Navigation className="w-3 h-3 text-sky-400" />
            Parcours total : ~{(totalPathDistanceMeters / 1000).toFixed(1)} km ({normalizedWallsWithCoords.length} étapes)
          </div>
        )}
      </div>

      {/* Error or Notice message if GPS permission denied */}
      {locationError && (
        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/70 text-xs text-amber-800 flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{locationError}</span>
          </div>
          <button
            onClick={handleSimulateLocationNearPath}
            className="text-xs font-black text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg shrink-0"
          >
            Simuler GPS 📍
          </button>
        </div>
      )}
    </div>
  );
};
