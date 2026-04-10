import { NextRequest, NextResponse } from 'next/server';
import { getMapState } from '@/lib/map-state';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const state = getMapState();

  let mapImageUrl: string | null = null;
  if (state.terrain) {
    const imagePath = path.join(process.cwd(), 'public', 'maps', `${state.terrain.name}.png`);
    if (fs.existsSync(imagePath)) {
      mapImageUrl = `/maps/${state.terrain.name}.png`;
    }
  }

  return NextResponse.json({
    terrain: state.terrain,
    players: state.players,
    gameMarkers: state.gameMarkers,
    lastSyncAt: state.lastSyncAt ? state.lastSyncAt.toISOString() : null,
    mapImageUrl,
  });
}
