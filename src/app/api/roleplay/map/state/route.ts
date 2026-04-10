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

  // Resolve player names from character sheets linked by biId
  let players: { name: string; biId: string; x: number; z: number; faction: string }[] = [];
  if (isAdmin && state.players.length > 0) {
    const biIds = state.players.map(p => p.biId).filter(Boolean);
    const nameMap = new Map<string, string>();

    if (biIds.length > 0) {
      try {
        const payload = await getPayloadClient();
        const result = await payload.find({
          collection: 'characters',
          where: { biId: { in: biIds } },
          limit: biIds.length,
          depth: 0,
        });
        for (const doc of result.docs) {
          if (doc.biId) {
            nameMap.set(doc.biId, (doc.fullName as string) || 'Unknown');
          }
        }
      } catch { /* fallback to Unknown */ }
    }

    players = state.players.map(p => ({
      name: nameMap.get(p.biId) || 'Unknown',
      biId: p.biId,
      x: p.x,
      z: p.z,
      faction: p.faction,
    }));
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
