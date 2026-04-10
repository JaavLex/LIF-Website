import { NextRequest, NextResponse } from 'next/server';
import { getMapState } from '@/lib/map-state';
import { getTerrainMeta } from '@/lib/terrain-meta';
import fs from 'fs';
import path from 'path';

const MAPS_DIR = path.join(process.cwd(), 'public', 'maps');

export async function GET(request: NextRequest) {
  const state = getMapState();

  let terrain = state.terrain;
  let mapImageUrl: string | null = null;

  if (terrain) {
    // Mod is syncing — check if we have a map image for this terrain
    const imagePath = path.join(MAPS_DIR, `${terrain.name}.png`);
    if (fs.existsSync(imagePath)) {
      mapImageUrl = `/maps/${terrain.name}.png`;
    }
  } else {
    // No mod data — check if any uploaded terrain exists as fallback
    if (fs.existsSync(MAPS_DIR)) {
      const pngs = fs.readdirSync(MAPS_DIR).filter(f => f.endsWith('.png'));
      if (pngs.length > 0) {
        const name = pngs[0].replace('.png', '');
        const meta = getTerrainMeta(name);
        if (meta) {
          terrain = { name, sizeX: meta.sizeX, sizeZ: meta.sizeZ };
          mapImageUrl = `/maps/${name}.png`;
        }
      }
    }
  }

  return NextResponse.json({
    terrain,
    players: state.players,
    gameMarkers: state.gameMarkers,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    mapImageUrl,
  });
}
