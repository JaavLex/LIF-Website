import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getMapState, updateMapState } from '@/lib/map-state';

beforeAll(() => {
  process.env.MAP_API_KEY = 'test-api-key';
  process.env.PAYLOAD_SECRET = 'test-secret-for-sessions';
});

beforeEach(() => {
  updateMapState({
    terrain: null,
    players: [],
    gameMarkers: [],
    lastSyncAt: null,
  });
});

describe('POST /api/roleplay/map/sync', () => {
  it('rejects request without API key', async () => {
    const { POST } = await import('@/app/api/roleplay/map/sync/route');
    const req = new Request('http://localhost/api/roleplay/map/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ terrain: { name: 'Merak', sizeX: 8192, sizeZ: 8192 }, players: [] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('rejects request with wrong API key', async () => {
    const { POST } = await import('@/app/api/roleplay/map/sync/route');
    const req = new Request('http://localhost/api/roleplay/map/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'wrong-key',
        terrain: { name: 'Merak', sizeX: 8192, sizeZ: 8192 },
        players: [],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('accepts valid sync and updates state', async () => {
    const { POST } = await import('@/app/api/roleplay/map/sync/route');
    const req = new Request('http://localhost/api/roleplay/map/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: 'test-api-key',
        terrain: { name: 'Merak', sizeX: 8192, sizeZ: 8192 },
        players: [
          { name: 'Player1', biId: 'abc-123', x: 1234.5, z: 5678.9, faction: 'US' },
        ],
        gameMarkers: [],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    const state = getMapState();
    expect(state.terrain!.name).toBe('Merak');
    expect(state.players).toHaveLength(1);
    expect(state.lastSyncAt).toBeTruthy();
  });
});

describe('GET /api/roleplay/map/state', () => {
  it('returns empty state when no sync has occurred', async () => {
    const { GET } = await import('@/app/api/roleplay/map/state/route');
    const req = new NextRequest('http://localhost/api/roleplay/map/state');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    // terrain may be non-null if a map image was uploaded (fallback from _terrains.json)
    expect(body.players).toEqual([]);
    expect(body.gameMarkers).toEqual([]);
    expect(body.lastSyncAt).toBeNull();
  });

  it('returns terrain but hides players from non-admin', async () => {
    updateMapState({
      terrain: { name: 'Merak', sizeX: 8192, sizeZ: 8192 },
      players: [
        { name: 'Player1', biId: 'abc', x: 100, z: 200, faction: 'US' },
      ],
      gameMarkers: [],
      lastSyncAt: new Date('2026-04-10T15:00:00Z'),
    });
    const { GET } = await import('@/app/api/roleplay/map/state/route');
    const req = new NextRequest('http://localhost/api/roleplay/map/state');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.terrain.name).toBe('Merak');
    // Non-admin (no session) should not see players
    expect(body.players).toHaveLength(0);
    expect(body.isAdmin).toBe(false);
  });
});
