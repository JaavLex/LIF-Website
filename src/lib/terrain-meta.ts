import fs from 'fs';
import path from 'path';

const MAPS_DIR = path.join(process.cwd(), 'public', 'maps');
const META_PATH = path.join(MAPS_DIR, '_terrains.json');

export interface TerrainMetaEntry {
  sizeX: number;
  sizeZ: number;
  offsetX?: number;
  offsetZ?: number;
}

export interface TerrainMetaMap {
  [name: string]: TerrainMetaEntry;
}

export function readTerrainMeta(): TerrainMetaMap {
  if (!fs.existsSync(META_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(META_PATH, 'utf-8')); } catch { return {}; }
}

export function writeTerrainMeta(meta: TerrainMetaMap) {
  if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
}

export function getTerrainMeta(name: string): TerrainMetaEntry | null {
  const meta = readTerrainMeta();
  return meta[name] || null;
}
