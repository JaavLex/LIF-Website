import { NextRequest, NextResponse } from 'next/server';
import { updateMapState } from '@/lib/map-state';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const expectedKey = process.env.MAP_API_KEY;
  if (!expectedKey || body.apiKey !== expectedKey) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { terrain, players, gameMarkers } = body;

  if (!terrain || !terrain.name || terrain.sizeX == null || terrain.sizeZ == null) {
    return NextResponse.json({ error: 'Terrain requis' }, { status: 400 });
  }

  updateMapState({
    terrain: {
      name: terrain.name,
      sizeX: Number(terrain.sizeX),
      sizeZ: Number(terrain.sizeZ),
    },
    players: Array.isArray(players)
      ? players.map((p: Record<string, unknown>) => ({
          name: String(p.name || ''),
          biId: String(p.biId || ''),
          x: Number(p.x || 0),
          z: Number(p.z || 0),
          faction: String(p.faction || ''),
        }))
      : [],
    gameMarkers: Array.isArray(gameMarkers)
      ? gameMarkers.map((m: Record<string, unknown>) => ({
          id: String(m.id || ''),
          label: String(m.label || ''),
          x: Number(m.x || 0),
          z: Number(m.z || 0),
          type: String(m.type || ''),
        }))
      : [],
    lastSyncAt: new Date(),
  });

  return NextResponse.json({ ok: true });
}
