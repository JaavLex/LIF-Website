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

export function getMapState(): MapState {
  return mapState;
}

export function updateMapState(state: MapState): void {
  mapState = state;
}
