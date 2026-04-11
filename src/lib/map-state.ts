export interface MapTerrain {
  name: string;
  sizeX: number;
  sizeZ: number;
}

export interface MapPlayer {
  biId: string;
  x: number;
  z: number;
  faction: string;
}

export interface MapGameMarker {
  id: string;
  label: string;
  x: number;
  z: number;
  type: string;
}

export interface TrailPoint {
  x: number;
  z: number;
  t: number;
}

export interface SOSAlert {
  id: string;
  biId: string | null;
  name: string;
  faction: string | null;
  x: number;
  z: number;
  triggeredAt: number;
  expiresAt: number;
}

export interface MapState {
  terrain: MapTerrain | null;
  players: MapPlayer[];
  gameMarkers: MapGameMarker[];
  lastSyncAt: Date | null;
}

let mapState: MapState = {
  terrain: null,
  players: [],
  gameMarkers: [],
  lastSyncAt: null,
};

// Per-biId history ring buffers (kept separate from mapState so that
// callers who replace state don't accidentally blow the trails away).
const MAX_TRAIL_LENGTH = 30;
const TRAIL_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes
const trails = new Map<string, TrailPoint[]>();

export function getMapState(): MapState {
  return mapState;
}

export function updateMapState(state: MapState): void {
  mapState = state;

  // Append current positions into their respective trails.
  const now = Date.now();
  const seen = new Set<string>();
  for (const p of state.players) {
    if (!p.biId) continue;
    seen.add(p.biId);
    const buf = trails.get(p.biId) || [];
    const last = buf[buf.length - 1];
    // Deduplicate: only append if the player actually moved
    if (!last || last.x !== p.x || last.z !== p.z) {
      buf.push({ x: p.x, z: p.z, t: now });
    }
    // Trim by length and age
    const trimmed = buf
      .filter(pt => now - pt.t <= TRAIL_MAX_AGE_MS)
      .slice(-MAX_TRAIL_LENGTH);
    trails.set(p.biId, trimmed);
  }
  // Drop trails for players no longer present
  for (const key of Array.from(trails.keys())) {
    if (!seen.has(key)) trails.delete(key);
  }
}

export function getTrail(biId: string): TrailPoint[] {
  return trails.get(biId) || [];
}

export function getAllTrails(): Record<string, TrailPoint[]> {
  const out: Record<string, TrailPoint[]> = {};
  for (const [k, v] of trails.entries()) out[k] = v;
  return out;
}

export function clearTrails(): void {
  trails.clear();
}

// ─── SOS alerts ───
const SOS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const sosAlerts = new Map<string, SOSAlert>();

export function addSOSAlert(
  alert: Omit<SOSAlert, 'id' | 'triggeredAt' | 'expiresAt'>,
): SOSAlert {
  const now = Date.now();
  const id = `sos-${now}-${Math.random().toString(36).slice(2, 8)}`;
  const full: SOSAlert = {
    id,
    triggeredAt: now,
    expiresAt: now + SOS_TTL_MS,
    ...alert,
  };
  sosAlerts.set(id, full);
  return full;
}

export function getActiveSOSAlerts(): SOSAlert[] {
  const now = Date.now();
  const active: SOSAlert[] = [];
  for (const [id, a] of sosAlerts.entries()) {
    if (a.expiresAt <= now) sosAlerts.delete(id);
    else active.push(a);
  }
  return active.sort((a, b) => a.triggeredAt - b.triggeredAt);
}

export function clearSOSAlerts(): void {
  sosAlerts.clear();
}
