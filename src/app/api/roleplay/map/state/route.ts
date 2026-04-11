import { NextRequest, NextResponse } from 'next/server';
import { getMapState } from '@/lib/map-state';
import { getTerrainMeta } from '@/lib/terrain-meta';
import { getSession } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';
import fs from 'fs';
import path from 'path';

const MAPS_DIR = path.join(process.cwd(), 'public', 'maps');

export async function GET(request: NextRequest) {
  const state = getMapState();

  // Only admins can see player positions
  const session = await getSession(request);
  const admin = session ? await checkAdminPermissions(session) : null;
  const isAdmin = admin?.isAdmin ?? false;

  let terrain = state.terrain;
  let mapImageUrl: string | null = null;
  let offsetX = 0;
  let offsetZ = 0;

  if (terrain) {
    const imagePath = path.join(MAPS_DIR, `${terrain.name}.png`);
    if (fs.existsSync(imagePath)) {
      mapImageUrl = `/maps/${terrain.name}.png`;
    }
    const meta = getTerrainMeta(terrain.name);
    if (meta) {
      offsetX = meta.offsetX || 0;
      offsetZ = meta.offsetZ || 0;
    }
  } else {
    if (fs.existsSync(MAPS_DIR)) {
      const pngs = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.png'));
      if (pngs.length > 0) {
        const name = pngs[0].replace('.png', '');
        const meta = getTerrainMeta(name);
        if (meta) {
          terrain = { name, sizeX: meta.sizeX, sizeZ: meta.sizeZ };
          mapImageUrl = `/maps/${name}.png`;
          offsetX = meta.offsetX || 0;
          offsetZ = meta.offsetZ || 0;
        }
      }
    }
  }

  // Resolve player names, avatars, and unit colors via biId → character
  type ResolvedPlayer = {
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
  };
  let players: ResolvedPlayer[] = [];
  if (isAdmin && state.players.length > 0) {
    const biIds = state.players.map(p => p.biId).filter(Boolean);
    const infoMap = new Map<
      string,
      {
        name: string;
        characterId: number;
        avatar: string | null;
        unitColor: string | null;
        unitName: string | null;
        callsign: string | null;
      }
    >();

    if (biIds.length > 0) {
      try {
        const payload = await getPayloadClient();
        const result = await payload.find({
          collection: 'characters',
          where: { biId: { in: biIds } },
          limit: biIds.length,
          depth: 2, // resolve avatar + unit + (unit.insignia not needed here)
        });
        for (const doc of result.docs) {
          if (!doc.biId) continue;
          const avatar =
            typeof doc.avatar === 'object' && doc.avatar && 'url' in doc.avatar
              ? ((doc.avatar as { url?: string }).url || null)
              : null;
          let unitColor: string | null = null;
          let unitName: string | null = null;
          if (doc.unit && typeof doc.unit === 'object') {
            const u = doc.unit as { color?: string; name?: string };
            unitColor = u.color || null;
            unitName = u.name || null;
          }
          infoMap.set(doc.biId, {
            name: (doc.fullName as string) || 'Unknown',
            characterId: doc.id,
            avatar,
            unitColor,
            unitName,
            callsign: (doc as { callsign?: string | null }).callsign || null,
          });
        }
      } catch { /* fallback */ }
    }

    players = state.players.map(p => {
      const info = infoMap.get(p.biId);
      return {
        name: info?.name || 'Unknown',
        biId: p.biId,
        x: p.x,
        z: p.z,
        faction: p.faction,
        characterId: info?.characterId ?? null,
        avatar: info?.avatar ?? null,
        unitColor: info?.unitColor ?? null,
        unitName: info?.unitName ?? null,
        callsign: info?.callsign ?? null,
      };
    });
  }

  return NextResponse.json({
    terrain,
    players,
    gameMarkers: state.gameMarkers,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    mapImageUrl,
    offsetX,
    offsetZ,
    isAdmin,
  });
}
