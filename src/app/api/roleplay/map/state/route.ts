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

  return NextResponse.json({
    terrain,
    players: state.players,
    gameMarkers: state.gameMarkers,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    mapImageUrl,
    offsetX,
    offsetZ,
  });
}
