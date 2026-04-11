'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createGridOverlay } from './MapGridOverlay';
import { formatGrid, escapeHtml } from '@/lib/constants';

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
  characterId: number | null;
  avatar: string | null;
  unitColor: string | null;
  unitName: string | null;
  callsign: string | null;
}

interface MapPOI {
  id: number;
  name: string;
  type: 'bar' | 'shop' | 'gas';
  description: string | null;
  x: number;
  z: number;
}

interface MapGameMarker {
  id: string;
  label: string;
  x: number;
  z: number;
  type: string;
}

interface UnitHQ {
  id: number;
  name: string;
  color: string;
  hqX: number;
  hqZ: number;
  insigniaUrl: string | null;
  commanderName: string | null;
  factionName: string | null;
}

interface IntelMarker {
  id: number;
  title: string;
  type: string;
  classification: string;
  x: number;
  z: number;
}

interface MapStateResponse {
  terrain: MapTerrain | null;
  players: MapPlayer[];
  gameMarkers: MapGameMarker[];
  lastSyncAt: string | null;
  mapImageUrl: string | null;
  offsetX: number;
  offsetZ: number;
  isAdmin?: boolean;
}

const FACTION_COLORS: Record<string, string> = {
  US: '#00ff41',
  USSR: '#ff4444',
  FIA: '#ffaa00',
};
const DEFAULT_COLOR = '#7a8a7a'; // gray for unitless players

// Soldier icon — silhouette with helmet/rifle, scales with color
const SOLDIER_SVG = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="none">
  <path d="M12 2.5c-1.6 0-2.9 1.3-2.9 2.9 0 1.6 1.3 2.9 2.9 2.9s2.9-1.3 2.9-2.9c0-1.6-1.3-2.9-2.9-2.9z"/>
  <path d="M19.5 8.2L17 8.7l-1-1.2-1.5.4-.5 1.6L12 9l-2 .5-.5-1.6L8 7.5l-1 1.2-2.5-.5-.5 1 2.5 1 .8 1.6V21h2v-6.5h.5V21h2v-7h.5v7h2v-7h.5V21h2V11.8l.8-1.6 2.5-1-.5-1z"/>
</svg>`;

function createPlayerIcon(player: MapPlayer): L.DivIcon {
  const color = player.unitColor || DEFAULT_COLOR;
  return L.divIcon({
    className: 'player-map-icon',
    html: `<div class="player-map-icon-inner" style="color: ${color}; --p-color: ${color};">
      ${SOLDIER_SVG}
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Intel: triangle outline with subtype glyph centered
const INTEL_TYPE_GLYPHS: Record<string, string> = {
  observation: '◉',
  interception: '⚡',
  reconnaissance: '⌕',
  infiltration: '⩕',
  sigint: '))',
  humint: '☥',
  other: '?',
};

function createIntelIcon(type: string, classColor: string): L.DivIcon {
  const glyph = INTEL_TYPE_GLYPHS[type] || INTEL_TYPE_GLYPHS.other;
  return L.divIcon({
    className: 'intel-map-icon',
    html: `<div class="intel-map-icon-inner" style="--c: ${classColor};">
      <svg viewBox="0 0 28 28" width="28" height="28">
        <polygon points="14,2 26,25 2,25" fill="rgba(0,0,0,0.78)" stroke="${classColor}" stroke-width="1.6" stroke-linejoin="round"/>
      </svg>
      <span class="intel-glyph">${glyph}</span>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 17],
  });
}

// HQ: circle with insignia
function createHQIcon(color: string, insigniaUrl: string | null): L.DivIcon {
  const content = insigniaUrl
    ? `<img src="${insigniaUrl}" alt="" style="width:24px;height:24px;object-fit:contain;border-radius:50%;" />`
    : `<svg viewBox="0 0 24 24" width="16" height="16" fill="${color}" stroke="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15" stroke="${color}" stroke-width="2"/></svg>`;
  return L.divIcon({
    className: 'hq-map-icon',
    html: `<div class="hq-map-icon-inner" style="border-color: ${color}; box-shadow: 0 0 12px ${color}aa, inset 0 0 8px ${color}44;">${content}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// POI: distinct shape per type — bar=diamond, shop=square, gas=hexagon
const POI_META: Record<MapPOI['type'], { color: string; label: string; glyph: string }> = {
  bar: { color: '#d97a3a', label: 'Bar / Pub', glyph: '🍺' },
  shop: { color: '#3aa3d9', label: 'Magasin', glyph: '⌂' },
  gas: { color: '#e8c14d', label: 'Station-service', glyph: '⛽' },
};

function createPOIIcon(type: MapPOI['type']): L.DivIcon {
  const meta = POI_META[type];
  let shapeSvg = '';
  if (type === 'bar') {
    // diamond
    shapeSvg = `<svg viewBox="0 0 28 28" width="28" height="28"><polygon points="14,2 26,14 14,26 2,14" fill="rgba(0,0,0,0.78)" stroke="${meta.color}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  } else if (type === 'shop') {
    // square (rotated 0°)
    shapeSvg = `<svg viewBox="0 0 28 28" width="28" height="28"><rect x="3" y="3" width="22" height="22" fill="rgba(0,0,0,0.78)" stroke="${meta.color}" stroke-width="1.8"/></svg>`;
  } else {
    // hexagon
    shapeSvg = `<svg viewBox="0 0 28 28" width="28" height="28"><polygon points="14,1 25,8 25,20 14,27 3,20 3,8" fill="rgba(0,0,0,0.78)" stroke="${meta.color}" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }
  return L.divIcon({
    className: 'poi-map-icon',
    html: `<div class="poi-map-icon-inner" style="--c: ${meta.color};">${shapeSvg}<span class="poi-glyph">${meta.glyph}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const INTEL_TYPE_LABELS: Record<string, string> = {
  observation: 'Observation',
  interception: 'Interception',
  reconnaissance: 'Reconnaissance',
  infiltration: 'Infiltration',
  sigint: 'SIGINT',
  humint: 'HUMINT',
  other: 'Autre',
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  public: '#00ff41',
  restricted: '#ffaa00',
  classified: '#ff4444',
};

export default function TacticalMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const imageLayerRef = useRef<L.ImageOverlay | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const hqLayerRef = useRef<L.LayerGroup | null>(null);
  const intelLayerRef = useRef<L.LayerGroup | null>(null);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const currentTerrainRef = useRef<string | null>(null);
  const [state, setState] = useState<MapStateResponse | null>(null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; z: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPlayers, setShowPlayers] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTerrainName, setUploadTerrainName] = useState('');
  const [uploadSizeX, setUploadSizeX] = useState('');
  const [uploadSizeZ, setUploadSizeZ] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrateClick, setCalibrateClick] = useState<{ mapX: number; mapZ: number } | null>(null);
  const [calibrateRealX, setCalibrateRealX] = useState('');
  const [calibrateRealZ, setCalibrateRealZ] = useState('');
  const offsetRef = useRef<{ x: number; z: number }>({ x: 0, z: 0 });
  // Unit HQ state
  const [unitHQs, setUnitHQs] = useState<UnitHQ[]>([]);
  const [placingHQ, setPlacingHQ] = useState(false);
  const [hqUnitList, setHqUnitList] = useState<{ id: number; name: string }[]>([]);
  const [selectedHQUnit, setSelectedHQUnit] = useState<string>('');
  // Intel markers state
  const [intelMarkers, setIntelMarkers] = useState<IntelMarker[]>([]);
  // POI state
  const [pois, setPois] = useState<MapPOI[]>([]);
  const poiLayerRef = useRef<L.LayerGroup | null>(null);
  const [placingPOI, setPlacingPOI] = useState(false);
  const [poiType, setPoiType] = useState<MapPOI['type']>('bar');
  const [poiName, setPoiName] = useState('');
  // Legend
  const [showLegend, setShowLegend] = useState(true);

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
    hqLayerRef.current = L.layerGroup().addTo(map);
    intelLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ x: Math.round(e.latlng.lng), z: Math.round(e.latlng.lat) });
    });

    map.on('mouseout', () => {
      setCursorCoords(null);
    });

    // Clear stale views from old coordinate system (lat=-Z → lat=Z migration)
    const savedView = localStorage.getItem('lif-map-view');
    if (savedView) {
      try {
        const { lat, lng, zoom, v } = JSON.parse(savedView);
        if (v === 2) map.setView([lat, lng], zoom);
        else localStorage.removeItem('lif-map-view');
      } catch { localStorage.removeItem('lif-map-view'); }
    }

    map.on('moveend', () => {
      const center = map.getCenter();
      localStorage.setItem('lif-map-view', JSON.stringify({
        lat: center.lat,
        lng: center.lng,
        zoom: map.getZoom(),
        v: 2,
      }));
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Toggle grid visibility
  useEffect(() => {
    const map = mapRef.current;
    const grid = gridLayerRef.current;
    if (!map || !grid) return;
    if (showGrid) {
      if (!map.hasLayer(grid)) grid.addTo(map);
    } else {
      if (map.hasLayer(grid)) map.removeLayer(grid);
    }
  }, [showGrid]);

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
          if (data.isAdmin) setIsAdmin(true);
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

  // Fetch unit HQs
  const fetchUnitHQs = useCallback(async () => {
    try {
      const res = await fetch('/api/roleplay/map/units');
      if (res.ok) {
        const data = await res.json();
        setUnitHQs(data.units || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchUnitHQs();
    const interval = setInterval(fetchUnitHQs, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnitHQs]);

  // Fetch intel markers
  const fetchIntelMarkers = useCallback(async () => {
    try {
      const res = await fetch('/api/roleplay/map/intel');
      if (res.ok) {
        const data = await res.json();
        setIntelMarkers(data.markers || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchIntelMarkers();
    const interval = setInterval(fetchIntelMarkers, 30_000);
    return () => clearInterval(interval);
  }, [fetchIntelMarkers]);

  // Fetch POIs
  const fetchPOIs = useCallback(async () => {
    try {
      const res = await fetch('/api/roleplay/map/poi', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPois(data.pois || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchPOIs();
    const interval = setInterval(fetchPOIs, 60_000);
    return () => clearInterval(interval);
  }, [fetchPOIs]);

  // Remove POI handler (admin)
  const removePOI = useCallback(async (id: number) => {
    try {
      const res = await fetch('/api/roleplay/map/poi', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) fetchPOIs();
    } catch { /* ignore */ }
  }, [fetchPOIs]);

  // Render POI markers
  useEffect(() => {
    const layer = poiLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const poi of pois) {
      const meta = POI_META[poi.type];
      const marker = L.marker([poi.z, poi.x], { icon: createPOIIcon(poi.type) });

      const removeBtn = isAdmin
        ? `<button class="poi-remove-btn" data-poi-id="${poi.id}">Supprimer</button>`
        : '';
      marker.bindPopup(
        `<div class="poi-popup" style="--c:${meta.color};">
          <div class="poi-popup-type">${escapeHtml(meta.label)}</div>
          <div class="poi-popup-name">${escapeHtml(poi.name)}</div>
          ${poi.description ? `<div class="poi-popup-desc">${escapeHtml(poi.description)}</div>` : ''}
          <div class="poi-popup-coords">${formatGrid(poi.x)} / ${formatGrid(poi.z)}</div>
          ${removeBtn}
        </div>`,
        { className: 'map-custom-popup' },
      );
      marker.on('popupopen', () => {
        const btn = document.querySelector(`.poi-remove-btn[data-poi-id="${poi.id}"]`);
        if (btn) btn.addEventListener('click', () => removePOI(poi.id));
      });
      layer.addLayer(marker);
    }
  }, [pois, isAdmin, removePOI]);

  // POI placement click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    async function onPOIClick(e: L.LeafletMouseEvent) {
      if (!poiName.trim()) return;
      const x = Math.round(e.latlng.lng);
      const z = Math.round(e.latlng.lat);
      try {
        const res = await fetch('/api/roleplay/map/poi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: poiName.trim(), type: poiType, x, z }),
        });
        if (res.ok) {
          setPlacingPOI(false);
          setPoiName('');
          fetchPOIs();
        }
      } catch { /* ignore */ }
    }

    if (placingPOI && poiName.trim()) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', onPOIClick);
    }

    return () => {
      map.off('click', onPOIClick);
      if (!calibrating && !placingHQ) map.getContainer().style.cursor = '';
    };
  }, [placingPOI, poiName, poiType, calibrating, placingHQ, fetchPOIs]);

  // Fetch admin unit list for HQ placement
  useEffect(() => {
    if (!isAdmin) return;
    fetch('/api/roleplay/map/units?all=1')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.allUnits) setHqUnitList(data.allUnits); })
      .catch(() => {});
  }, [isAdmin]);

  // Update map image when terrain or offsets change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !state?.terrain) return;

    const { name, sizeX, sizeZ } = state.terrain;
    const ox = state.offsetX || 0;
    const oz = state.offsetZ || 0;
    offsetRef.current = { x: ox, z: oz };

    if (imageLayerRef.current) {
      map.removeLayer(imageLayerRef.current);
      imageLayerRef.current = null;
    }

    const bounds: L.LatLngBoundsExpression = [[oz, ox], [oz + sizeZ, ox + sizeX]];

    if (state.mapImageUrl) {
      imageLayerRef.current = L.imageOverlay(state.mapImageUrl, bounds).addTo(map);
    }

    // Create or recreate the grid overlay with correct bounds
    if (gridLayerRef.current) {
      map.removeLayer(gridLayerRef.current);
    }
    const gridLayer = createGridOverlay(map, {
      minX: ox, minZ: oz, maxX: ox + sizeX, maxZ: oz + sizeZ,
    });
    gridLayer.addTo(map);
    gridLayerRef.current = gridLayer;

    if (!currentTerrainRef.current) {
      const saved = localStorage.getItem('lif-map-view');
      if (!saved) {
        map.fitBounds(bounds);
      }
    }

    currentTerrainRef.current = name;
  }, [state?.terrain, state?.mapImageUrl, state?.offsetX, state?.offsetZ]);

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

  // Calibration click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function onCalibClick(e: L.LeafletMouseEvent) {
      setCalibrateClick({ mapX: Math.round(e.latlng.lng), mapZ: Math.round(e.latlng.lat) });
    }

    if (calibrating) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', onCalibClick);
    } else {
      map.getContainer().style.cursor = '';
      map.off('click', onCalibClick);
      setCalibrateClick(null);
    }

    return () => {
      map.off('click', onCalibClick);
      map.getContainer().style.cursor = '';
    };
  }, [calibrating]);

  // HQ placement click handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    async function onHQClick(e: L.LeafletMouseEvent) {
      const unitId = Number(selectedHQUnit);
      if (!unitId) return;
      const hqX = Math.round(e.latlng.lng);
      const hqZ = Math.round(e.latlng.lat);
      try {
        const res = await fetch('/api/roleplay/map/units', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitId, hqX, hqZ }),
        });
        if (res.ok) {
          setPlacingHQ(false);
          setSelectedHQUnit('');
          fetchUnitHQs();
        }
      } catch { /* ignore */ }
    }

    if (placingHQ && selectedHQUnit) {
      map.getContainer().style.cursor = 'crosshair';
      map.on('click', onHQClick);
    }

    return () => {
      map.off('click', onHQClick);
      if (!calibrating) map.getContainer().style.cursor = '';
    };
  }, [placingHQ, selectedHQUnit, calibrating, fetchUnitHQs]);

  async function handleCalibrate() {
    if (!calibrateClick || !state?.terrain) return;
    const realX = Number(calibrateRealX);
    const realZ = Number(calibrateRealZ);
    if (isNaN(realX) || isNaN(realZ)) return;

    const newOffsetX = offsetRef.current.x + (realX - calibrateClick.mapX);
    const newOffsetZ = offsetRef.current.z + (realZ - calibrateClick.mapZ);

    try {
      const res = await fetch('/api/roleplay/map/upload', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terrainName: state.terrain.name, offsetX: newOffsetX, offsetZ: newOffsetZ }),
      });
      if (res.ok) {
        setCalibrating(false);
        setCalibrateClick(null);
        setCalibrateRealX('');
        setCalibrateRealZ('');
        currentTerrainRef.current = null;
      }
    } catch { /* ignore */ }
  }

  // Update player markers
  useEffect(() => {
    const markersLayer = markersLayerRef.current;
    if (!markersLayer || !state) return;

    markersLayer.clearLayers();

    if (!showPlayers) return;

    for (const player of state.players) {
      const marker = L.marker([player.z, player.x], {
        icon: createPlayerIcon(player),
      });

      const avatarHtml = player.avatar
        ? `<img src="${player.avatar}" alt="" />`
        : `<span class="player-avatar-fallback">${escapeHtml(
            (player.name || '?').slice(0, 1).toUpperCase(),
          )}</span>`;

      const unitLine = player.unitName
        ? `<div class="player-tip-unit" style="color:${player.unitColor || '#9aa'};">${escapeHtml(
            player.unitName,
          )}</div>`
        : `<div class="player-tip-unit player-tip-unit-none">SANS UNITÉ</div>`;

      const callsignLine = player.callsign
        ? `<div class="player-tip-callsign">« ${escapeHtml(player.callsign)} »</div>`
        : '';

      marker.bindTooltip(
        `<div class="player-tip">
          <div class="player-tip-avatar" style="border-color:${
            player.unitColor || '#7a8a7a'
          };">${avatarHtml}</div>
          <div class="player-tip-body">
            <div class="player-tip-name">${escapeHtml(player.name)}</div>
            ${callsignLine}
            ${unitLine}
          </div>
        </div>`,
        {
          permanent: false,
          direction: 'top',
          offset: [0, -12],
          className: 'player-marker-tooltip',
          opacity: 1,
        },
      );

      if (player.characterId) {
        marker.on('click', () => {
          window.location.href = `/roleplay/personnage/${player.characterId}`;
        });
      }

      markersLayer.addLayer(marker);
    }
  }, [state?.players, showPlayers]);

  // Remove HQ handler
  const removeHQ = useCallback(async (unitId: number) => {
    try {
      const res = await fetch('/api/roleplay/map/units', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      });
      if (res.ok) fetchUnitHQs();
    } catch { /* ignore */ }
  }, [fetchUnitHQs]);

  // Update HQ markers
  useEffect(() => {
    const layer = hqLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    for (const hq of unitHQs) {
      const marker = L.marker([hq.hqZ, hq.hqX], {
        icon: createHQIcon(hq.color, hq.insigniaUrl),
      });

      const insigniaHtml = hq.insigniaUrl
        ? `<img src="${hq.insigniaUrl}" alt="" style="width:40px;height:40px;object-fit:contain;margin-bottom:4px;" />`
        : '';

      const removeBtn = isAdmin
        ? `<button class="hq-remove-btn" data-unit-id="${hq.id}">Retirer QG</button>`
        : '';

      marker.bindPopup(
        `<div class="hq-popup">
          ${insigniaHtml}
          <div class="hq-popup-name">${escapeHtml(hq.name)}</div>
          ${hq.factionName ? `<div class="hq-popup-faction">${escapeHtml(hq.factionName)}</div>` : ''}
          ${hq.commanderName ? `<div class="hq-popup-commander">CMD: ${escapeHtml(hq.commanderName)}</div>` : ''}
          <div class="hq-popup-coords">${formatGrid(hq.hqX)} / ${formatGrid(hq.hqZ)}</div>
          ${removeBtn}
        </div>`,
        { className: 'map-custom-popup' },
      );

      marker.on('popupopen', () => {
        const btn = document.querySelector(`.hq-remove-btn[data-unit-id="${hq.id}"]`);
        if (btn) btn.addEventListener('click', () => removeHQ(hq.id));
      });

      layer.addLayer(marker);
    }
  }, [unitHQs, isAdmin, removeHQ]);

  // Update intel markers
  useEffect(() => {
    const layer = intelLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    for (const intel of intelMarkers) {
      const classColor = CLASSIFICATION_COLORS[intel.classification] || '#00ff41';
      const marker = L.marker([intel.z, intel.x], {
        icon: createIntelIcon(intel.type, classColor),
      });

      const typeLabel = INTEL_TYPE_LABELS[intel.type] || intel.type;

      marker.bindPopup(
        `<div class="intel-popup">
          <div class="intel-popup-type">${escapeHtml(typeLabel)}</div>
          <div class="intel-popup-title">${escapeHtml(intel.title)}</div>
          <div class="intel-popup-class" style="color:${classColor}">[${escapeHtml(intel.classification.toUpperCase())}]</div>
          <div class="intel-popup-coords">${formatGrid(intel.x)} / ${formatGrid(intel.z)}</div>
          <a href="/roleplay/renseignement#intel-${intel.id}" class="intel-popup-link">Voir le rapport</a>
        </div>`,
        { className: 'map-custom-popup' },
      );

      layer.addLayer(marker);
    }
  }, [intelMarkers]);

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
              ? isAdmin
                ? `${state?.players.length || 0} opérateur${(state?.players.length || 0) !== 1 ? 's' : ''}`
                : 'En ligne'
              : 'Hors ligne'}
          </span>
          {timeSinceSync !== null && (
            <span>
              Dernière sync: {timeSinceSync < 60 ? `${timeSinceSync}s` : `${Math.floor(timeSinceSync / 60)}m`}
            </span>
          )}
          <button
            type="button"
            className={`map-admin-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(v => !v)}
          >
            Grille
          </button>
          <button
            type="button"
            className={`map-admin-btn ${showLegend ? 'active' : ''}`}
            onClick={() => setShowLegend(v => !v)}
          >
            Légende
          </button>
          {isAdmin && (
            <>
              <button
                type="button"
                className={`map-admin-btn ${showPlayers ? 'active' : ''}`}
                onClick={() => setShowPlayers(v => !v)}
              >
                Joueurs
              </button>
              <button
                type="button"
                className="map-admin-btn"
                onClick={() => setShowUpload(v => !v)}
              >
                {showUpload ? '✕' : 'Carte'}
              </button>
              {state?.mapImageUrl && (
                <button
                  type="button"
                  className={`map-admin-btn ${calibrating ? 'active' : ''}`}
                  onClick={() => { setCalibrating(v => !v); setPlacingHQ(false); setSelectedHQUnit(''); }}
                >
                  {calibrating ? '✕ Calibrer' : 'Calibrer'}
                </button>
              )}
              <button
                type="button"
                className={`map-admin-btn ${placingHQ ? 'active' : ''}`}
                onClick={() => { setPlacingHQ(v => !v); setCalibrating(false); setPlacingPOI(false); if (placingHQ) setSelectedHQUnit(''); }}
              >
                {placingHQ ? '✕ QG' : 'Placer QG'}
              </button>
              <button
                type="button"
                className={`map-admin-btn ${placingPOI ? 'active' : ''}`}
                onClick={() => { setPlacingPOI(v => !v); setCalibrating(false); setPlacingHQ(false); if (placingPOI) setPoiName(''); }}
              >
                {placingPOI ? '✕ POI' : 'Placer POI'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="map-container">
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
        {placingHQ && (
          <div className="map-upload-panel">
            <div className="map-upload-title">Placer un QG d&apos;unité</div>
            <label className="map-upload-field">
              <span>Unité</span>
              <select
                value={selectedHQUnit}
                onChange={e => setSelectedHQUnit(e.target.value)}
                className="map-upload-field-select"
              >
                <option value="">— Sélectionner —</option>
                {hqUnitList.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>
            {selectedHQUnit && (
              <div className="map-calibrate-hint" style={{ position: 'static', animation: 'none', opacity: 0.7 }}>
                Cliquez sur la carte pour placer le QG
              </div>
            )}
          </div>
        )}
        {placingPOI && (
          <div className="map-upload-panel">
            <div className="map-upload-title">Placer un POI</div>
            <label className="map-upload-field">
              <span>Type</span>
              <select
                value={poiType}
                onChange={e => setPoiType(e.target.value as MapPOI['type'])}
                className="map-upload-field-select"
              >
                <option value="bar">Bar / Pub</option>
                <option value="shop">Magasin</option>
                <option value="gas">Station-service</option>
              </select>
            </label>
            <label className="map-upload-field">
              <span>Nom</span>
              <input
                type="text"
                value={poiName}
                onChange={e => setPoiName(e.target.value)}
                placeholder="Ex: Le Dernier Verre"
              />
            </label>
            {poiName.trim() && (
              <div className="map-calibrate-hint" style={{ position: 'static', animation: 'none', opacity: 0.7 }}>
                Cliquez sur la carte pour placer le POI
              </div>
            )}
          </div>
        )}
        {showLegend && (
          <div className="map-legend">
            <div className="map-legend-title">Légende</div>
            <div className="map-legend-section">
              <div className="map-legend-item">
                <span className="map-legend-icon player" aria-hidden="true">
                  <span className="legend-soldier" />
                </span>
                <span>Opérateur (couleur = unité)</span>
              </div>
              <div className="map-legend-item">
                <span className="map-legend-icon hq" aria-hidden="true" />
                <span>QG d&apos;unité</span>
              </div>
            </div>
            <div className="map-legend-section">
              <div className="map-legend-heading">Renseignement</div>
              {Object.entries(INTEL_TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="map-legend-item">
                  <span className="map-legend-icon intel" aria-hidden="true">
                    <svg viewBox="0 0 28 28" width="18" height="18">
                      <polygon points="14,3 25,24 3,24" fill="rgba(0,0,0,0.78)" stroke="#00ff41" strokeWidth="1.8" strokeLinejoin="round"/>
                    </svg>
                    <span className="legend-intel-glyph">{INTEL_TYPE_GLYPHS[key]}</span>
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="map-legend-section">
              <div className="map-legend-heading">Points d&apos;intérêt</div>
              {(Object.keys(POI_META) as Array<MapPOI['type']>).map(type => {
                const meta = POI_META[type];
                return (
                  <div key={type} className="map-legend-item">
                    <span className="map-legend-icon poi" aria-hidden="true" style={{ ['--c' as string]: meta.color }}>
                      {type === 'bar' && (
                        <svg viewBox="0 0 28 28" width="18" height="18"><polygon points="14,3 25,14 14,25 3,14" fill="rgba(0,0,0,0.78)" stroke={meta.color} strokeWidth="1.8" strokeLinejoin="round"/></svg>
                      )}
                      {type === 'shop' && (
                        <svg viewBox="0 0 28 28" width="18" height="18"><rect x="4" y="4" width="20" height="20" fill="rgba(0,0,0,0.78)" stroke={meta.color} strokeWidth="1.8"/></svg>
                      )}
                      {type === 'gas' && (
                        <svg viewBox="0 0 28 28" width="18" height="18"><polygon points="14,2 25,8 25,20 14,26 3,20 3,8" fill="rgba(0,0,0,0.78)" stroke={meta.color} strokeWidth="1.8" strokeLinejoin="round"/></svg>
                      )}
                      <span className="legend-poi-glyph">{meta.glyph}</span>
                    </span>
                    <span>{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {calibrating && calibrateClick && (
          <div className="map-upload-panel">
            <div className="map-upload-title">Calibration</div>
            <div className="map-calibrate-info">
              Point cliqué: {formatGrid(calibrateClick.mapX)} / {formatGrid(calibrateClick.mapZ)}
            </div>
            <div className="map-upload-row">
              <label className="map-upload-field">
                <span>Vrai X (m)</span>
                <input
                  type="number"
                  value={calibrateRealX}
                  onChange={e => setCalibrateRealX(e.target.value)}
                  placeholder="Ex: 3500"
                />
              </label>
              <label className="map-upload-field">
                <span>Vrai Z (m)</span>
                <input
                  type="number"
                  value={calibrateRealZ}
                  onChange={e => setCalibrateRealZ(e.target.value)}
                  placeholder="Ex: 4200"
                />
              </label>
            </div>
            <button
              type="button"
              className="map-upload-btn"
              onClick={handleCalibrate}
              disabled={!calibrateRealX || !calibrateRealZ}
            >
              Appliquer
            </button>
          </div>
        )}
        {calibrating && !calibrateClick && (
          <div className="map-calibrate-hint">
            Cliquez sur un point connu de la carte
          </div>
        )}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="map-footer">
        <span>
          {cursorCoords
            ? `Coordonnées: ${formatGrid(cursorCoords.x)} / ${formatGrid(cursorCoords.z)}`
            : 'Coordonnées: ----- / -----'}
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
