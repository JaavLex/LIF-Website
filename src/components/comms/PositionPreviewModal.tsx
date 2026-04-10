'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatGrid } from '@/lib/constants';

const PIN_ICON = L.divIcon({
  className: 'map-pin-icon',
  html: `<svg viewBox="0 0 24 36" width="24" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="#ff4444" fill-opacity="0.9"/>
    <circle cx="12" cy="12" r="5" fill="#1a0505" stroke="#ff4444" stroke-width="1"/>
  </svg>`,
  iconSize: [24, 36],
  iconAnchor: [12, 36],
});

interface PositionPreviewModalProps {
  coords: { x: number; z: number; label?: string };
  onClose: () => void;
}

export default function PositionPreviewModal({ coords, onClose }: PositionPreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

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
        }

        // Add marker at the shared position
        const marker = L.marker([coords.z, coords.x], { icon: PIN_ICON });
        marker.addTo(map);
        marker.bindPopup(
          `<div style="font-size:0.85rem;">
            <strong>Position partagée</strong><br/>
            ${formatGrid(coords.x)} / ${formatGrid(coords.z)}
          </div>`,
        ).openPopup();

        map.setView([coords.z, coords.x], 1);
        mapRef.current = map;
        setLoading(false);

        [100, 300, 600].forEach(ms => setTimeout(() => map?.invalidateSize(), ms));
      } catch {
        setLoading(false);
      }
    })();

    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="comms-modal-backdrop" onClick={onClose}>
      <div
        className="comms-modal"
        onClick={e => e.stopPropagation()}
        style={{ width: '95vw', maxWidth: '900px', height: '80vh', maxHeight: '750px', display: 'flex', flexDirection: 'column' }}
      >
        <h2 style={{ color: 'var(--primary)', margin: 0, fontSize: '0.9rem' }}>
          Position: {coords.label || `${formatGrid(coords.x)} / ${formatGrid(coords.z)}`}
        </h2>
        <div style={{ flex: 1, position: 'relative', marginTop: '0.75rem', border: '1px solid var(--cc-line, rgba(255,255,255,0.1))' }}>
          {loading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--muted)',
              fontSize: '0.8rem',
              zIndex: 10,
            }}>
              Chargement...
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
        <div className="comms-modal-actions" style={{ marginTop: '0.75rem' }}>
          <button className="comms-modal-btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
