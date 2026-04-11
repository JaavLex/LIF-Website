'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createGridOverlay } from './MapGridOverlay';
import { formatGrid } from '@/lib/constants';

const PIN_ICON = L.divIcon({
  className: 'map-pin-icon',
  html: `<svg viewBox="0 0 24 36" width="24" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#00ff41" fill-opacity="0.9"/>
    <circle cx="12" cy="12" r="5" fill="#060a04" stroke="#00ff41" stroke-width="1"/>
  </svg>`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
});

const POI_COLORS: Record<string, string> = {
  bar: '#e08b46',
  shop: '#4ab3e3',
  gas: '#ecc958',
  city: '#d8f3c4',
};

const INTEL_CLASS_COLORS: Record<string, string> = {
  public: '#00ff41',
  confidential: '#ffdd55',
  secret: '#ff7a45',
  topsecret: '#ff3838',
};

interface MapPickerModalProps {
  open: boolean;
  onClose: () => void;
  onPick: (coords: { x: number; z: number; formatted: string }) => void;
  initialCoords?: { x: number; z: number } | null;
}

export default function MapPickerModal({ open, onClose, onPick, initialCoords }: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [coords, setCoords] = useState<{ x: number; z: number } | null>(initialCoords || null);
  const [cursorCoords, setCursorCoords] = useState<{ x: number; z: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch terrain and init map
  useEffect(() => {
    if (!open || !containerRef.current) return;

    let map: L.Map | null = null;

    (async () => {
      try {
        const res = await fetch('/api/roleplay/map/state');
        if (!res.ok) return;
        const data = await res.json();

        if (!containerRef.current) return;

        map = L.map(containerRef.current, {
          crs: L.CRS.Simple,
          minZoom: -3,
          maxZoom: 3,
          zoomControl: true,
          attributionControl: false,
        });

        const terrain = data.terrain;
        const ox = data.offsetX || 0;
        const oz = data.offsetZ || 0;

        if (terrain && data.mapImageUrl) {
          const bounds: L.LatLngBoundsExpression = [
            [oz, ox],
            [oz + terrain.sizeZ, ox + terrain.sizeX],
          ];
          L.imageOverlay(data.mapImageUrl, bounds).addTo(map);

          if (initialCoords) {
            map.setView([initialCoords.z, initialCoords.x], 1);
          } else {
            map.fitBounds(bounds);
          }
        } else {
          map.setView([0, 0], -1);
        }

        // Add grid overlay
        if (terrain) {
          createGridOverlay(map, {
            minX: ox, minZ: oz,
            maxX: ox + terrain.sizeX, maxZ: oz + terrain.sizeZ,
          }).addTo(map);

          // Restrict pan & zoom so the view can't drift outside the map
          const latLngBounds = L.latLngBounds([
            [oz, ox],
            [oz + terrain.sizeZ, ox + terrain.sizeX],
          ]);
          map.setMaxBounds(latLngBounds.pad(0.05));
          const fitZoom = map.getBoundsZoom(latLngBounds, false);
          map.setMinZoom(Math.max(-3, fitZoom - 1));
        }

        // Fetch & render read-only reference overlays (POIs, HQs, intel)
        const overlayLayer = L.layerGroup().addTo(map);
        Promise.allSettled([
          fetch('/api/roleplay/map/poi').then(r => r.ok ? r.json() : null),
          fetch('/api/roleplay/map/units').then(r => r.ok ? r.json() : null),
          fetch('/api/roleplay/map/intel').then(r => r.ok ? r.json() : null),
        ]).then(results => {
          const [poiRes, hqRes, intelRes] = results;
          // POIs
          if (poiRes.status === 'fulfilled' && poiRes.value?.pois) {
            for (const poi of poiRes.value.pois as Array<{ name: string; type: string; x: number; z: number }>) {
              const color = POI_COLORS[poi.type] || '#9fe870';
              const cm = L.circleMarker([poi.z, poi.x], {
                radius: poi.type === 'city' ? 7 : 5,
                color,
                weight: 2,
                fillColor: '#0a0e0a',
                fillOpacity: 0.85,
                interactive: true,
              });
              if (poi.type === 'city') {
                cm.bindTooltip(poi.name, {
                  permanent: true,
                  direction: 'right',
                  offset: [8, 0],
                  className: 'city-label-tooltip',
                });
              } else {
                cm.bindTooltip(poi.name, { direction: 'top' });
              }
              overlayLayer.addLayer(cm);
            }
          }
          // HQs
          if (hqRes.status === 'fulfilled' && hqRes.value?.units) {
            for (const hq of hqRes.value.units as Array<{ name: string; color: string; hqX: number; hqZ: number }>) {
              const cm = L.circleMarker([hq.hqZ, hq.hqX], {
                radius: 9,
                color: hq.color || '#00ff41',
                weight: 2.5,
                fillColor: '#0a0e0a',
                fillOpacity: 0.8,
              });
              cm.bindTooltip(`QG — ${hq.name}`, { direction: 'top' });
              overlayLayer.addLayer(cm);
            }
          }
          // Intel
          if (intelRes.status === 'fulfilled' && intelRes.value?.markers) {
            for (const intel of intelRes.value.markers as Array<{ title?: string; type: string; classification: string; x: number; z: number }>) {
              const color = INTEL_CLASS_COLORS[intel.classification] || '#00ff41';
              const cm = L.circleMarker([intel.z, intel.x], {
                radius: 4,
                color,
                weight: 1.6,
                fillColor: color,
                fillOpacity: 0.55,
              });
              cm.bindTooltip(intel.title || intel.type, { direction: 'top' });
              overlayLayer.addLayer(cm);
            }
          }
        }).catch(() => { /* overlays optional */ });

        // Place initial marker if coords provided
        if (initialCoords) {
          const marker = L.marker([initialCoords.z, initialCoords.x], {
            draggable: true,
            icon: PIN_ICON,
          });
          marker.addTo(map);
          marker.on('dragend', () => {
            const pos = marker.getLatLng();
            setCoords({ x: Math.round(pos.lng), z: Math.round(pos.lat) });
          });
          markerRef.current = marker;
        }

        map.on('mousemove', (e: L.LeafletMouseEvent) => {
          setCursorCoords({ x: Math.round(e.latlng.lng), z: Math.round(e.latlng.lat) });
        });

        map.on('mouseout', () => {
          setCursorCoords(null);
        });

        map.on('click', (e: L.LeafletMouseEvent) => {
          const x = Math.round(e.latlng.lng);
          const z = Math.round(e.latlng.lat);
          setCoords({ x, z });

          if (markerRef.current) {
            markerRef.current.setLatLng([z, x]);
          } else {
            const marker = L.marker([z, x], { draggable: true, icon: PIN_ICON });
            marker.addTo(map!);
            marker.on('dragend', () => {
              const pos = marker.getLatLng();
              setCoords({ x: Math.round(pos.lng), z: Math.round(pos.lat) });
            });
            markerRef.current = marker;
          }
        });

        mapRef.current = map;
        setLoading(false);

        // Leaflet in modals needs repeated invalidateSize — container may not
        // have layout dimensions immediately after dynamic import + render
        const timers = [100, 300, 600].map(ms =>
          setTimeout(() => map?.invalidateSize(), ms),
        );

        // Also watch for the container actually getting a size
        const ro = new ResizeObserver(() => map?.invalidateSize());
        if (containerRef.current) ro.observe(containerRef.current);

        const cleanup = () => {
          timers.forEach(clearTimeout);
          ro.disconnect();
        };
        // Store cleanup on the map for the teardown
        (map as any)._pickerCleanup = cleanup;
      } catch {
        setLoading(false);
      }
    })();

    return () => {
      if (map) {
        (map as any)._pickerCleanup?.();
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirm() {
    if (!coords) return;
    onPick({
      x: coords.x,
      z: coords.z,
      formatted: `${formatGrid(coords.x)} / ${formatGrid(coords.z)}`,
    });
  }

  if (!open) return null;

  return (
    <div className="map-picker-backdrop" onClick={onClose}>
      <div className="map-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="map-picker-header">
          <span>Sélectionner une position</span>
          <button type="button" className="map-picker-close" onClick={onClose}>✕</button>
        </div>
        <div className="map-picker-map-container">
          {loading && (
            <div className="map-no-data">
              <span className="blinking">Chargement de la carte...</span>
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="map-picker-footer">
          <span className="map-picker-coords">
            {cursorCoords
              ? `Curseur: ${formatGrid(cursorCoords.x)} / ${formatGrid(cursorCoords.z)}`
              : coords
                ? `Sélection: ${formatGrid(coords.x)} / ${formatGrid(coords.z)}`
                : 'Cliquez sur la carte pour placer un marqueur'}
          </span>
          <div className="map-picker-actions">
            <button type="button" className="map-picker-btn" onClick={onClose}>Annuler</button>
            <button
              type="button"
              className="map-picker-btn map-picker-btn-primary"
              onClick={handleConfirm}
              disabled={!coords}
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
