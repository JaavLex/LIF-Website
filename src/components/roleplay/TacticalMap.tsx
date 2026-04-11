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
  trail?: Array<{ x: number; z: number; t: number }>;
}

interface SOSAlert {
  id: string;
  biId: string | null;
  name: string;
  faction: string | null;
  x: number;
  z: number;
  triggeredAt: number;
  expiresAt: number;
}

interface MapPOI {
  id: number;
  name: string;
  type: 'bar' | 'shop' | 'gas' | 'city';
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
  publicPlayerPositions?: boolean;
  sosAlerts?: SOSAlert[];
}

const FACTION_COLORS: Record<string, string> = {
  US: '#00ff41',
  USSR: '#ff4444',
  FIA: '#ffaa00',
};
const DEFAULT_COLOR = '#8a9a8a'; // gray for unitless players

// ─── Shared inline-SVG icon paths ───
// All inner glyph SVGs are 20×20, rendered inside their shape wrappers.

// Soldier silhouette (no circle background — just silhouette + stroke halo)
function playerMarkerHTML(color: string): string {
  return `<div class="player-map-icon-inner" style="--p-color:${color};">
    <svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">
      <defs>
        <filter id="soldier-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.9" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#soldier-glow)" fill="${color}" stroke="rgba(0,0,0,0.85)" stroke-width="0.8" stroke-linejoin="round">
        <!-- helmet dome + rim -->
        <path d="M14 4c-3.3 0-5.8 2.1-5.8 5.1v1.4h11.6V9.1C19.8 6.1 17.3 4 14 4z"/>
        <rect x="7.4" y="10.4" width="13.2" height="1.6" rx="0.4"/>
        <!-- face/neck -->
        <path d="M10.5 12v2.3c0 1.4 1.1 2.2 2 2.5l1.5.4 1.5-.4c0.9-.3 2-1.1 2-2.5V12z"/>
        <!-- shoulders/torso -->
        <path d="M6 24v-3.4c0-2 1.4-3.6 3.4-4.1l2.1-.5 2.5 1 2.5-1 2.1.5c2 .5 3.4 2.1 3.4 4.1V24z"/>
        <!-- chest strap -->
        <path d="M10.2 18.8l7.6 0" stroke="rgba(0,0,0,0.5)" stroke-width="0.9" fill="none"/>
      </g>
    </svg>
  </div>`;
}

function createPlayerIcon(player: MapPlayer): L.DivIcon {
  const color = player.unitColor || DEFAULT_COLOR;
  return L.divIcon({
    className: 'player-map-icon',
    html: playerMarkerHTML(color),
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// ─── Intel subtype inner SVGs (drawn INSIDE the triangle) ───
// Each is a 14×14 glyph centered at (14, 16) of the 28×28 triangle.
const INTEL_INNER_SVG: Record<string, string> = {
  // observation — eye
  observation: `<g transform="translate(7,10)"><ellipse cx="7" cy="5" rx="6" ry="3.2" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="5" r="1.6" fill="currentColor"/></g>`,
  // interception — lightning bolt
  interception: `<path d="M15 10 L10 17 L13.5 17 L12 22 L17 14 L13.8 14 L15.2 10 Z" fill="currentColor" stroke="currentColor" stroke-width="0.4" stroke-linejoin="round"/>`,
  // reconnaissance — crosshair/scope
  reconnaissance: `<g stroke="currentColor" stroke-width="1.3" fill="none"><circle cx="14" cy="16" r="4"/><line x1="14" y1="10.5" x2="14" y2="13.2"/><line x1="14" y1="18.8" x2="14" y2="21.5"/><line x1="8.5" y1="16" x2="11.2" y2="16"/><line x1="16.8" y1="16" x2="19.5" y2="16"/></g><circle cx="14" cy="16" r="0.9" fill="currentColor"/>`,
  // infiltration — balaclava / mask
  infiltration: `<g fill="currentColor"><path d="M9 12.5 C9 10.6 11.2 9.8 14 9.8 C16.8 9.8 19 10.6 19 12.5 L19 18 C19 20 17 21.2 14 21.2 C11 21.2 9 20 9 18 Z"/></g><g fill="#0a0e0a"><rect x="10.5" y="14.5" width="2.5" height="1.4" rx="0.3"/><rect x="15" y="14.5" width="2.5" height="1.4" rx="0.3"/><rect x="12.5" y="17.8" width="3" height="0.9" rx="0.3"/></g>`,
  // sigint — antenna with signal waves
  sigint: `<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><line x1="14" y1="11" x2="14" y2="21"/><line x1="14" y1="11" x2="10.2" y2="13.5"/><line x1="14" y1="11" x2="17.8" y2="13.5"/><path d="M11.2 11.2 Q9.5 13 9.5 15"/><path d="M16.8 11.2 Q18.5 13 18.5 15"/></g><circle cx="14" cy="10.8" r="0.9" fill="currentColor"/>`,
  // humint — person head + shoulders
  humint: `<g fill="currentColor"><circle cx="14" cy="13" r="2.1"/><path d="M9.5 22 C9.5 18.6 11.5 16.8 14 16.8 C16.5 16.8 18.5 18.6 18.5 22 Z"/></g>`,
  // other — question mark
  other: `<text x="14" y="20" text-anchor="middle" font-family="Georgia, serif" font-size="10" font-weight="700" fill="currentColor">?</text>`,
};

function intelMarkerHTML(type: string, classColor: string): string {
  const inner = INTEL_INNER_SVG[type] || INTEL_INNER_SVG.other;
  return `<div class="intel-map-icon-inner" style="--c:${classColor};">
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <polygon points="14,2 26,25 2,25" fill="rgba(8,12,8,0.88)" stroke="${classColor}" stroke-width="1.8" stroke-linejoin="round"/>
      <g color="${classColor}">${inner}</g>
    </svg>
  </div>`;
}

function createIntelIcon(type: string, classColor: string): L.DivIcon {
  return L.divIcon({
    className: 'intel-map-icon',
    html: intelMarkerHTML(type, classColor),
    iconSize: [28, 28],
    iconAnchor: [14, 17],
  });
}

// HQ: circle with insignia
function hqMarkerHTML(color: string, insigniaUrl: string | null): string {
  const content = insigniaUrl
    ? `<img src="${insigniaUrl}" alt="" style="width:24px;height:24px;object-fit:contain;border-radius:50%;" />`
    : `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="${color}"/><line x1="4" y1="22" x2="4" y2="15" stroke="${color}" stroke-width="2"/></svg>`;
  return `<div class="hq-map-icon-inner" style="border-color:${color};box-shadow:0 0 12px ${color}aa,inset 0 0 8px ${color}44;">${content}</div>`;
}

function createHQIcon(color: string, insigniaUrl: string | null): L.DivIcon {
  return L.divIcon({
    className: 'hq-map-icon',
    html: hqMarkerHTML(color, insigniaUrl),
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// ─── POI shapes + inner SVG icons ───
const POI_META: Record<MapPOI['type'], { color: string; label: string }> = {
  bar: { color: '#e08b46', label: 'Bar / Pub' },
  shop: { color: '#4ab3e3', label: 'Magasin' },
  gas: { color: '#ecc958', label: 'Station-service' },
  city: { color: '#d8f3c4', label: 'Ville' },
};

// Inner glyphs centered around (14,14) inside 28×28
const POI_INNER_SVG: Record<MapPOI['type'], string> = {
  // beer mug
  bar: `<g fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round">
    <path d="M10 11 H17 V20 Q17 21.2 15.8 21.2 H11.2 Q10 21.2 10 20 Z"/>
    <path d="M17 13 H19 Q20.2 13 20.2 14.2 V17 Q20.2 18.2 19 18.2 H17" fill="none" stroke-width="1.2"/>
    <path d="M10.6 12.5 H16.4" stroke="rgba(0,0,0,0.45)" stroke-width="0.9"/>
  </g>`,
  // shopping bag
  shop: `<g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round">
    <path d="M9.5 13 H18.5 L17.8 21.5 H10.2 Z" fill="currentColor"/>
    <path d="M11.5 13 V11.5 Q11.5 9.6 14 9.6 Q16.5 9.6 16.5 11.5 V13" stroke-linecap="round"/>
  </g>`,
  // fuel pump
  gas: `<g fill="currentColor" stroke="currentColor" stroke-width="0.4">
    <rect x="9.5" y="10" width="6" height="11.5" rx="0.6"/>
    <rect x="10.5" y="11.2" width="4" height="3" fill="#0a0e0a" stroke="none"/>
    <path d="M15.5 12 L17.2 13.7 V18.2 Q17.2 19.2 18.2 19.2 Q19.2 19.2 19.2 18.2 V14.5 L18.2 13" fill="none" stroke-width="1.1"/>
    <circle cx="18.2" cy="12.6" r="0.55"/>
  </g>`,
  // city skyline (building cluster)
  city: `<g fill="currentColor" stroke="currentColor" stroke-width="0.3" stroke-linejoin="round">
    <rect x="7.5" y="14" width="4" height="7"/>
    <rect x="12" y="10" width="4.5" height="11"/>
    <rect x="17" y="12.5" width="3.5" height="8.5"/>
    <rect x="13" y="11.5" width="1" height="1" fill="#0a0e0a" stroke="none"/>
    <rect x="14.5" y="11.5" width="1" height="1" fill="#0a0e0a" stroke="none"/>
    <rect x="13" y="14" width="1" height="1" fill="#0a0e0a" stroke="none"/>
    <rect x="14.5" y="14" width="1" height="1" fill="#0a0e0a" stroke="none"/>
    <rect x="8.5" y="15.5" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
    <rect x="9.8" y="15.5" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
    <rect x="17.8" y="14" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
    <rect x="19" y="14" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
  </g>`,
};

function poiMarkerHTML(type: MapPOI['type']): string {
  const meta = POI_META[type];
  const inner = POI_INNER_SVG[type];
  let shape = '';
  if (type === 'bar') {
    shape = `<polygon points="14,2 26,14 14,26 2,14" fill="rgba(8,12,8,0.88)" stroke="${meta.color}" stroke-width="1.8" stroke-linejoin="round"/>`;
  } else if (type === 'shop') {
    shape = `<rect x="3" y="3" width="22" height="22" fill="rgba(8,12,8,0.88)" stroke="${meta.color}" stroke-width="1.8"/>`;
  } else if (type === 'city') {
    shape = `<circle cx="14" cy="14" r="12" fill="rgba(8,12,8,0.88)" stroke="${meta.color}" stroke-width="1.8"/>`;
  } else {
    shape = `<polygon points="14,1 25,8 25,20 14,27 3,20 3,8" fill="rgba(8,12,8,0.88)" stroke="${meta.color}" stroke-width="1.8" stroke-linejoin="round"/>`;
  }
  return `<div class="poi-map-icon-inner" style="--c:${meta.color};">
    <svg viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      ${shape}
      <g color="${meta.color}">${inner}</g>
    </svg>
  </div>`;
}

function createPOIIcon(type: MapPOI['type']): L.DivIcon {
  return L.divIcon({
    className: 'poi-map-icon',
    html: poiMarkerHTML(type),
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

// ─── Legend JSX components — mirror the Leaflet divIcon HTML above ───
// Rendered inline as React elements (no innerHTML), but pixel-identical to
// what createXIcon() produces by using the same SVG path data.

function LegendPlayer() {
  const color = DEFAULT_COLOR;
  return (
    <span className="map-legend-icon" aria-hidden="true">
      <div className="player-map-icon-inner" style={{ ['--p-color' as string]: color }}>
        <svg viewBox="0 0 28 28" width="22" height="22">
          <g fill={color} stroke="rgba(0,0,0,0.85)" strokeWidth="0.8" strokeLinejoin="round">
            <path d="M14 4c-3.3 0-5.8 2.1-5.8 5.1v1.4h11.6V9.1C19.8 6.1 17.3 4 14 4z"/>
            <rect x="7.4" y="10.4" width="13.2" height="1.6" rx="0.4"/>
            <path d="M10.5 12v2.3c0 1.4 1.1 2.2 2 2.5l1.5.4 1.5-.4c0.9-.3 2-1.1 2-2.5V12z"/>
            <path d="M6 24v-3.4c0-2 1.4-3.6 3.4-4.1l2.1-.5 2.5 1 2.5-1 2.1.5c2 .5 3.4 2.1 3.4 4.1V24z"/>
          </g>
        </svg>
      </div>
    </span>
  );
}

function LegendHQ() {
  const color = '#4a7c23';
  return (
    <span className="map-legend-icon" aria-hidden="true">
      <div
        className="hq-map-icon-inner"
        style={{
          borderColor: color,
          boxShadow: `0 0 12px ${color}aa, inset 0 0 8px ${color}44`,
          width: 28,
          height: 28,
        }}
      >
        <svg viewBox="0 0 24 24" width="16" height="16">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill={color}/>
          <line x1="4" y1="22" x2="4" y2="15" stroke={color} strokeWidth="2"/>
        </svg>
      </div>
    </span>
  );
}

function LegendIntel({ type }: { type: string }) {
  const color = '#00ff41';
  return (
    <span className="map-legend-icon" aria-hidden="true">
      <div className="intel-map-icon-inner" style={{ ['--c' as string]: color }}>
        <svg viewBox="0 0 28 28" width="24" height="24">
          <polygon points="14,2 26,25 2,25" fill="rgba(8,12,8,0.88)" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
          <g color={color}><IntelInner type={type} /></g>
        </svg>
      </div>
    </span>
  );
}

function IntelInner({ type }: { type: string }) {
  switch (type) {
    case 'observation':
      return (
        <g transform="translate(7,10)">
          <ellipse cx="7" cy="5" rx="6" ry="3.2" fill="none" stroke="currentColor" strokeWidth="1.3"/>
          <circle cx="7" cy="5" r="1.6" fill="currentColor"/>
        </g>
      );
    case 'interception':
      return (
        <path
          d="M15 10 L10 17 L13.5 17 L12 22 L17 14 L13.8 14 L15.2 10 Z"
          fill="currentColor" stroke="currentColor" strokeWidth="0.4" strokeLinejoin="round"
        />
      );
    case 'reconnaissance':
      return (
        <>
          <g stroke="currentColor" strokeWidth="1.3" fill="none">
            <circle cx="14" cy="16" r="4"/>
            <line x1="14" y1="10.5" x2="14" y2="13.2"/>
            <line x1="14" y1="18.8" x2="14" y2="21.5"/>
            <line x1="8.5" y1="16" x2="11.2" y2="16"/>
            <line x1="16.8" y1="16" x2="19.5" y2="16"/>
          </g>
          <circle cx="14" cy="16" r="0.9" fill="currentColor"/>
        </>
      );
    case 'infiltration':
      return (
        <>
          <g fill="currentColor">
            <path d="M9 12.5 C9 10.6 11.2 9.8 14 9.8 C16.8 9.8 19 10.6 19 12.5 L19 18 C19 20 17 21.2 14 21.2 C11 21.2 9 20 9 18 Z"/>
          </g>
          <g fill="#0a0e0a">
            <rect x="10.5" y="14.5" width="2.5" height="1.4" rx="0.3"/>
            <rect x="15" y="14.5" width="2.5" height="1.4" rx="0.3"/>
            <rect x="12.5" y="17.8" width="3" height="0.9" rx="0.3"/>
          </g>
        </>
      );
    case 'sigint':
      return (
        <>
          <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <line x1="14" y1="11" x2="14" y2="21"/>
            <line x1="14" y1="11" x2="10.2" y2="13.5"/>
            <line x1="14" y1="11" x2="17.8" y2="13.5"/>
            <path d="M11.2 11.2 Q9.5 13 9.5 15"/>
            <path d="M16.8 11.2 Q18.5 13 18.5 15"/>
          </g>
          <circle cx="14" cy="10.8" r="0.9" fill="currentColor"/>
        </>
      );
    case 'humint':
      return (
        <g fill="currentColor">
          <circle cx="14" cy="13" r="2.1"/>
          <path d="M9.5 22 C9.5 18.6 11.5 16.8 14 16.8 C16.5 16.8 18.5 18.6 18.5 22 Z"/>
        </g>
      );
    default:
      return (
        <text x="14" y="20" textAnchor="middle" fontFamily="Georgia, serif" fontSize="10" fontWeight="700" fill="currentColor">?</text>
      );
  }
}

function LegendPOI({ type }: { type: MapPOI['type'] }) {
  const meta = POI_META[type];
  return (
    <span className="map-legend-icon" aria-hidden="true">
      <div className="poi-map-icon-inner" style={{ ['--c' as string]: meta.color }}>
        <svg viewBox="0 0 28 28" width="24" height="24">
          {type === 'bar' && (
            <polygon points="14,2 26,14 14,26 2,14" fill="rgba(8,12,8,0.88)" stroke={meta.color} strokeWidth="1.8" strokeLinejoin="round"/>
          )}
          {type === 'shop' && (
            <rect x="3" y="3" width="22" height="22" fill="rgba(8,12,8,0.88)" stroke={meta.color} strokeWidth="1.8"/>
          )}
          {type === 'gas' && (
            <polygon points="14,1 25,8 25,20 14,27 3,20 3,8" fill="rgba(8,12,8,0.88)" stroke={meta.color} strokeWidth="1.8" strokeLinejoin="round"/>
          )}
          {type === 'city' && (
            <circle cx="14" cy="14" r="12" fill="rgba(8,12,8,0.88)" stroke={meta.color} strokeWidth="1.8"/>
          )}
          <g color={meta.color}><POIInner type={type} /></g>
        </svg>
      </div>
    </span>
  );
}

function POIInner({ type }: { type: MapPOI['type'] }) {
  if (type === 'bar') {
    return (
      <g fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round">
        <path d="M10 11 H17 V20 Q17 21.2 15.8 21.2 H11.2 Q10 21.2 10 20 Z"/>
        <path d="M17 13 H19 Q20.2 13 20.2 14.2 V17 Q20.2 18.2 19 18.2 H17" fill="none" strokeWidth="1.2"/>
        <path d="M10.6 12.5 H16.4" stroke="rgba(0,0,0,0.45)" strokeWidth="0.9"/>
      </g>
    );
  }
  if (type === 'shop') {
    return (
      <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
        <path d="M9.5 13 H18.5 L17.8 21.5 H10.2 Z" fill="currentColor"/>
        <path d="M11.5 13 V11.5 Q11.5 9.6 14 9.6 Q16.5 9.6 16.5 11.5 V13" strokeLinecap="round"/>
      </g>
    );
  }
  if (type === 'gas') {
    return (
      <g fill="currentColor" stroke="currentColor" strokeWidth="0.4">
        <rect x="9.5" y="10" width="6" height="11.5" rx="0.6"/>
        <rect x="10.5" y="11.2" width="4" height="3" fill="#0a0e0a" stroke="none"/>
        <path d="M15.5 12 L17.2 13.7 V18.2 Q17.2 19.2 18.2 19.2 Q19.2 19.2 19.2 18.2 V14.5 L18.2 13" fill="none" strokeWidth="1.1"/>
        <circle cx="18.2" cy="12.6" r="0.55"/>
      </g>
    );
  }
  // city
  return (
    <g fill="currentColor" stroke="currentColor" strokeWidth="0.3" strokeLinejoin="round">
      <rect x="7.5" y="14" width="4" height="7"/>
      <rect x="12" y="10" width="4.5" height="11"/>
      <rect x="17" y="12.5" width="3.5" height="8.5"/>
      <rect x="13" y="11.5" width="1" height="1" fill="#0a0e0a" stroke="none"/>
      <rect x="14.5" y="11.5" width="1" height="1" fill="#0a0e0a" stroke="none"/>
      <rect x="13" y="14" width="1" height="1" fill="#0a0e0a" stroke="none"/>
      <rect x="14.5" y="14" width="1" height="1" fill="#0a0e0a" stroke="none"/>
      <rect x="8.5" y="15.5" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
      <rect x="9.8" y="15.5" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
      <rect x="17.8" y="14" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
      <rect x="19" y="14" width="0.9" height="0.9" fill="#0a0e0a" stroke="none"/>
    </g>
  );
}

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
  // Heat trails + SOS layers
  const trailsLayerRef = useRef<L.LayerGroup | null>(null);
  const sosLayerRef = useRef<L.LayerGroup | null>(null);
  const [showTrails, setShowTrails] = useState(true);
  // Admin: live toggle for the publicPlayerPositions global
  const [publicPositions, setPublicPositions] = useState(false);
  const [togglingPublic, setTogglingPublic] = useState(false);

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

    // Order matters for stacking: trails under markers, sos on top
    trailsLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    hqLayerRef.current = L.layerGroup().addTo(map);
    intelLayerRef.current = L.layerGroup().addTo(map);
    poiLayerRef.current = L.layerGroup().addTo(map);
    sosLayerRef.current = L.layerGroup().addTo(map);

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
          if (typeof data.publicPlayerPositions === 'boolean') {
            setPublicPositions(data.publicPlayerPositions);
          }
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

  // Admin: toggle publicPlayerPositions on the Roleplay global
  const togglePublicPositions = useCallback(async () => {
    setTogglingPublic(true);
    const next = !publicPositions;
    // Optimistic update
    setPublicPositions(next);
    try {
      const res = await fetch('/api/roleplay/map/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicPlayerPositions: next }),
      });
      if (!res.ok) setPublicPositions(!next); // revert on failure
    } catch {
      setPublicPositions(!next);
    }
    setTogglingPublic(false);
  }, [publicPositions]);

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

      if (poi.type === 'city') {
        marker.bindTooltip(poi.name, {
          permanent: true,
          direction: 'right',
          offset: [14, 0],
          className: 'city-label-tooltip',
        });
      }

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

    // Restrict pan & zoom so users can't drift outside the map
    const latLngBounds = L.latLngBounds([oz, ox], [oz + sizeZ, ox + sizeX]);
    map.setMaxBounds(latLngBounds.pad(0.05));
    const fitZoom = map.getBoundsZoom(latLngBounds, false);
    map.setMinZoom(Math.max(-3, fitZoom - 1));

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

  // Render fading heat trails
  useEffect(() => {
    const layer = trailsLayerRef.current;
    if (!layer || !state) return;
    layer.clearLayers();
    if (!showTrails || !showPlayers) return;

    for (const player of state.players) {
      const trail = player.trail;
      if (!trail || trail.length < 2) continue;
      const color = player.unitColor || '#7aff7a';
      // Build segments with fading opacity from oldest to newest
      for (let i = 1; i < trail.length; i++) {
        const a = trail[i - 1];
        const b = trail[i];
        // Newer segments are more opaque
        const alpha = 0.12 + 0.58 * (i / (trail.length - 1));
        const segment = L.polyline(
          [[a.z, a.x], [b.z, b.x]],
          {
            color,
            weight: 2.5,
            opacity: alpha,
            interactive: false,
            lineCap: 'round',
          },
        );
        layer.addLayer(segment);
      }
      // Connect last trail point to current live position
      const last = trail[trail.length - 1];
      if (last.x !== player.x || last.z !== player.z) {
        layer.addLayer(
          L.polyline(
            [[last.z, last.x], [player.z, player.x]],
            { color, weight: 2.5, opacity: 0.75, interactive: false, lineCap: 'round' },
          ),
        );
      }
    }
  }, [state?.players, showTrails, showPlayers]);

  // Render SOS pulsing alert markers
  useEffect(() => {
    const layer = sosLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const alerts = state?.sosAlerts;
    if (!alerts || alerts.length === 0) return;

    for (const alert of alerts) {
      const icon = L.divIcon({
        className: 'sos-marker-icon',
        html: `<div class="sos-pulse"><span class="sos-pulse-ring"></span><span class="sos-pulse-ring sos-pulse-ring-2"></span><span class="sos-pulse-core">!</span></div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const m = L.marker([alert.z, alert.x], { icon, zIndexOffset: 1000 });
      m.bindTooltip(
        `<div class="sos-tip"><div class="sos-tip-label">SOS</div><div class="sos-tip-name">${escapeHtml(
          alert.name,
        )}</div></div>`,
        {
          permanent: true,
          direction: 'top',
          offset: [0, -18],
          className: 'sos-marker-tooltip',
        },
      );
      layer.addLayer(m);
    }
  }, [state?.sosAlerts]);

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
                className={`map-admin-btn ${publicPositions ? 'active' : ''}`}
                onClick={togglePublicPositions}
                disabled={togglingPublic}
                title="Rendre les positions des joueurs visibles pour tous les utilisateurs"
              >
                {publicPositions ? '● Public' : '○ Public'}
              </button>
              <button
                type="button"
                className={`map-admin-btn ${showTrails ? 'active' : ''}`}
                onClick={() => setShowTrails(v => !v)}
              >
                Traces
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
                <option value="city">Ville</option>
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
                <LegendPlayer />
                <span>Opérateur (couleur = unité)</span>
              </div>
              <div className="map-legend-item">
                <LegendHQ />
                <span>QG d&apos;unité</span>
              </div>
            </div>
            <div className="map-legend-section">
              <div className="map-legend-heading">Renseignement</div>
              {Object.entries(INTEL_TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="map-legend-item">
                  <LegendIntel type={key} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="map-legend-section">
              <div className="map-legend-heading">Points d&apos;intérêt</div>
              {(Object.keys(POI_META) as Array<MapPOI['type']>).map(type => (
                <div key={type} className="map-legend-item">
                  <LegendPOI type={type} />
                  <span>{POI_META[type].label}</span>
                </div>
              ))}
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
