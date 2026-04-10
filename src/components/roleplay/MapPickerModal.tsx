'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '@/app/(frontend)/roleplay/map/map.css';
import { createGridOverlay } from './MapGridOverlay';
import { formatGrid } from '@/lib/constants';

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
        }

        // Place initial marker if coords provided
        if (initialCoords) {
          const marker = L.marker([initialCoords.z, initialCoords.x], {
            draggable: true,
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
            const marker = L.marker([z, x], { draggable: true });
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

        // Fix for Leaflet in modal (container size may not be ready)
        setTimeout(() => map?.invalidateSize(), 100);
      } catch {
        setLoading(false);
      }
    })();

    return () => {
      if (map) {
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
