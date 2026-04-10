import { describe, it, expect, beforeEach } from 'vitest';
import { getMapState, updateMapState, type MapState } from '@/lib/map-state';

describe('map-state', () => {
  beforeEach(() => {
    updateMapState({
      terrain: null,
      players: [],
      gameMarkers: [],
      lastSyncAt: null,
    });
  });

  it('returns empty state initially', () => {
    const state = getMapState();
    expect(state.terrain).toBeNull();
    expect(state.players).toEqual([]);
    expect(state.gameMarkers).toEqual([]);
    expect(state.lastSyncAt).toBeNull();
  });

  it('stores terrain and players after update', () => {
    updateMapState({
      terrain: { name: 'Merak', sizeX: 8192, sizeZ: 8192 },
      players: [
        { name: 'Player1', biId: 'abc-123', x: 1234.5, z: 5678.9, faction: 'US' },
      ],
      gameMarkers: [],
      lastSyncAt: new Date('2026-04-10T15:00:00Z'),
    });

    const state = getMapState();
    expect(state.terrain).toEqual({ name: 'Merak', sizeX: 8192, sizeZ: 8192 });
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Player1');
    expect(state.lastSyncAt).toEqual(new Date('2026-04-10T15:00:00Z'));
  });

  it('overwrites previous state completely', () => {
    updateMapState({
      terrain: { name: 'Merak', sizeX: 8192, sizeZ: 8192 },
      players: [
        { name: 'Player1', biId: 'abc', x: 100, z: 200, faction: 'US' },
        { name: 'Player2', biId: 'def', x: 300, z: 400, faction: 'RU' },
      ],
      gameMarkers: [],
      lastSyncAt: new Date('2026-04-10T15:00:00Z'),
    });

    updateMapState({
      terrain: { name: 'Everon', sizeX: 4096, sizeZ: 4096 },
      players: [
        { name: 'Player3', biId: 'ghi', x: 500, z: 600, faction: 'FIA' },
      ],
      gameMarkers: [],
      lastSyncAt: new Date('2026-04-10T15:01:00Z'),
    });

    const state = getMapState();
    expect(state.terrain!.name).toBe('Everon');
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Player3');
  });
});
