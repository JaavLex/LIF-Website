'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapTerrain {
  name: string;
  sizeX: number;
  sizeZ: number;
}

interface MapPlayer {
  name: string;
  biId: string;
  x: number;
  z: number;
  faction: string;
}

interface MapGameMarker {
  id: string;
  label: string;
  x: number;
  z: number;
  type: string;
}

interface MapStateResponse {
  terrain: MapTerrain | null;
  players: MapPlayer[];
  gameMarkers: MapGameMarker[];
  lastSyncAt: string | null;
  mapImageUrl: string | null;
}

const FACTION_COLORS: Record<string, string> = {
  US: '#00ff41',
  USSR: '#ff4444',
  FIA: '#ffaa00',
};
const DEFAULT_COLOR = '#00ff41';

function getFactionColor(faction: string): string {
  return FACTION_COLORS[faction] || DEFAULT_COLOR;
}

function createPlayerIcon(faction: string): L.DivIcon {
  const color = getFactionColor(faction);
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 10px;
      height: 10px;
      background: ${color};
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      box-shadow: 0 0 8px ${color}, 0 0 16px ${color}44;
    "></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

export default function TacticalMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const imageLayerRef = useRef<L.ImageOverlay | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const currentTerrainRef = useRef<string | null>(null);
  const [state, setState] = useState<MapStateResponse | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; z: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTerrainName, setUploadTerrainName] = useState('');
  const [uploadSizeX, setUploadSizeX] = useState('');
  const [uploadSizeZ, setUploadSizeZ] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      crs: L.CRS.Simple,
      minZoom: -3,
      maxZoom: 3,
      zoomControl: true,
      attributionControl: false,
    });

    map.setView([0, 0], -1);
    markersLayerRef.current = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ x: Math.round(e.latlng.lng), z: Math.round(-e.latlng.lat) });
    });

    map.on('mouseout', () => {
      setCursorCoords(null);
    });

    const savedView = localStorage.getItem('lif-map-view');
    if (savedView) {
      try {
        const { lat, lng, zoom } = JSON.parse(savedView);
        map.setView([lat, lng], zoom);
      } catch { /* ignore corrupt data */ }
    }

    map.on('moveend', () => {
      const center = map.getCenter();
      localStorage.setItem('lif-map-view', JSON.stringify({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
      }));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Poll for state (visibility-aware: 5s when visible, 30s when hidden)
  useEffect(() => {
    let active = true;
    let pollingTimer: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch('/api/roleplay/map/state');
        if (res.ok && active) {
          const data: MapStateResponse = await res.json();
          setState(data);
        }
      } catch { /* network error, retry next cycle */ }
    }

    function startPolling() {
      if (pollingTimer) clearInterval(pollingTimer);
      const ms = document.hidden ? 30_000 : 5_000;
      pollingTimer = setInterval(poll, ms);
    }

    function handleVisibility() {
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibility);
    poll();
    startPolling();

    return () => {
      active = false;
      if (pollingTimer) clearInterval(pollingTimer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Update map image when terrain changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !state?.terrain) return;

    const { name, sizeX, sizeZ } = state.terrain;

    if (currentTerrainRef.current !== name || !imageLayerRef.current) {
      if (imageLayerRef.current) {
        map.removeLayer(imageLayerRef.current);
        imageLayerRef.current = null;
      }

      const bounds: L.LatLngBoundsExpression = [[0, 0], [-sizeZ, sizeX]];

      if (state.mapImageUrl) {
        imageLayerRef.current = L.imageOverlay(state.mapImageUrl, bounds).addTo(map);
      }

      if (!currentTerrainRef.current) {
        const saved = localStorage.getItem('lif-map-view');
        if (!saved) {
          map.fitBounds(bounds);
        }
      }

      currentTerrainRef.current = name;
    }
  }, [state?.terrain, state?.mapImageUrl]);

  // Check admin status
  useEffect(() => {
    fetch('/api/auth/admin-check')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  // Pre-fill terrain info from state
  useEffect(() => {
    if (state?.terrain) {
      if (!uploadTerrainName) setUploadTerrainName(state.terrain.name);
      if (!uploadSizeX) setUploadSizeX(String(state.terrain.sizeX));
      if (!uploadSizeZ) setUploadSizeZ(String(state.terrain.sizeZ));
    }
  }, [state?.terrain, uploadTerrainName, uploadSizeX, uploadSizeZ]);

  async function handleUpload() {
    if (!uploadFile || !uploadTerrainName || !uploadSizeX || !uploadSizeZ) return;
    setUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append('terrainName', uploadTerrainName);
    formData.append('sizeX', uploadSizeX);
    formData.append('sizeZ', uploadSizeZ);
    formData.append('file', uploadFile);
    try {
      const res = await fetch('/api/roleplay/map/upload', { method: 'POST', body: formData });
      if (res.ok) {
        setUploadStatus('Image envoyée');
        setUploadFile(null);
        setShowUpload(false);
        // Force re-render of image overlay by resetting terrain ref
        currentTerrainRef.current = null;
      } else {
        const data = await res.json();
        setUploadStatus(data.error || 'Erreur');
      }
    } catch {
      setUploadStatus('Erreur réseau');
    }
    setUploading(false);
  }

  // Update player markers
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer || !state) return;

    markersLayer.clearLayers();

    for (const player of state.players) {
      const marker = L.marker([-player.z, player.x], {
        icon: createPlayerIcon(player.faction),
      });

      marker.bindTooltip(player.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -8],
        className: 'player-marker-tooltip',
      });

      markersLayer.addLayer(marker);
    }
  }, [state?.players]);

  const timeSinceSync = state?.lastSyncAt
    ? Math.round((Date.now() - new Date(state.lastSyncAt).getTime()) / 1000)
    : null;
  const isStale = timeSinceSync !== null && timeSinceSync > 30;
  const isLive = timeSinceSync !== null && timeSinceSync <= 30;

  return (
    <div className="tactical-map-page">
      <div className="map-header">
        <span className="map-header-title">Terminal Cartographique</span>
        <div className="map-header-status">
          {state?.terrain && (
            <span>Terrain: {state.terrain.name}</span>
          )}
          <span>
            <span className={isStale ? 'stale-dot' : 'live-dot'} />
            {isLive
              ? `${state?.players.length || 0} opérateur${(state?.players.length || 0) !== 1 ? 's' : ''}`
              : 'Hors ligne'}
          </span>
          {timeSinceSync !== null && (
            <span>
              Dernière sync: {timeSinceSync < 60 ? `${timeSinceSync}s` : `${Math.floor(timeSinceSync / 60)}m`}
            </span>
          )}
          {isAdmin && (
            <button
              type="button"
              className="map-admin-btn"
              onClick={() => setShowUpload(v => !v)}
            >
              {showUpload ? '✕' : 'Carte'}
            </button>
          )}
        </div>
      </div>

      <div className={`map-container ${!state?.mapImageUrl ? 'map-grid-fallback' : ''}`}>
        {!state?.terrain && (
          <div className="map-no-data">
            <span>Aucune donnée reçue</span>
            <span className="blinking">En attente de synchronisation du serveur...</span>
          </div>
        )}
        {showUpload && (
          <div className="map-upload-panel">
            <div className="map-upload-title">Upload image terrain</div>
            <label className="map-upload-field">
              <span>Terrain</span>
              <input
                type="text"
                value={uploadTerrainName}
                onChange={e => setUploadTerrainName(e.target.value)}
                placeholder="Ex: Eden"
              />
            </label>
            <div className="map-upload-row">
              <label className="map-upload-field">
                <span>Taille X (m)</span>
                <input
                  type="number"
                  value={uploadSizeX}
                  onChange={e => setUploadSizeX(e.target.value)}
                  placeholder="Ex: 8192"
                />
              </label>
              <label className="map-upload-field">
                <span>Taille Z (m)</span>
                <input
                  type="number"
                  value={uploadSizeZ}
                  onChange={e => setUploadSizeZ(e.target.value)}
                  placeholder="Ex: 8192"
                />
              </label>
            </div>
            <label className="map-upload-field">
              <span>Image (PNG)</span>
              <input
                type="file"
                accept="image/png"
                onChange={e => setUploadFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              className="map-upload-btn"
              onClick={handleUpload}
              disabled={uploading || !uploadFile || !uploadTerrainName || !uploadSizeX || !uploadSizeZ}
            >
              {uploading ? 'Envoi...' : 'Envoyer'}
            </button>
            {uploadStatus && <span className="map-upload-status">{uploadStatus}</span>}
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="map-footer">
        <span>
          {cursorCoords
            ? `Coordonnées: X: ${cursorCoords.x}  Z: ${cursorCoords.z}`
            : 'Coordonnées: ---'}
        </span>
        <span>
          {state?.terrain
            ? `Zone: ${state.terrain.sizeX}m x ${state.terrain.sizeZ}m`
            : ''}
        </span>
      </div>
    </div>
  );
}
