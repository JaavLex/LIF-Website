import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isErrorResponse } from '@/lib/api-auth';
import { readTerrainMeta, writeTerrainMeta } from '@/lib/terrain-meta';
import fs from 'fs';
import path from 'path';

const MAPS_DIR = path.join(process.cwd(), 'public', 'maps');
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const formData = await request.formData();
  const terrainName = formData.get('terrainName');
  const file = formData.get('file');
  const sizeXStr = formData.get('sizeX');
  const sizeZStr = formData.get('sizeZ');

  if (!terrainName || typeof terrainName !== 'string') {
    return NextResponse.json({ error: 'Nom du terrain requis' }, { status: 400 });
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Fichier requis' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Le fichier doit être une image' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 });
  }

  const sizeX = Number(sizeXStr);
  const sizeZ = Number(sizeZStr);
  if (!sizeX || !sizeZ || sizeX <= 0 || sizeZ <= 0) {
    return NextResponse.json({ error: 'Dimensions du terrain requises (sizeX, sizeZ en mètres)' }, { status: 400 });
  }

  // Sanitize terrain name: only allow alphanumeric, dash, underscore
  const safeName = terrainName.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeName) {
    return NextResponse.json({ error: 'Nom du terrain invalide' }, { status: 400 });
  }

  if (!fs.existsSync(MAPS_DIR)) {
    fs.mkdirSync(MAPS_DIR, { recursive: true });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filePath = path.join(MAPS_DIR, `${safeName}.png`);
  fs.writeFileSync(filePath, buffer);

  // Save terrain dimensions
  const meta = readTerrainMeta();
  meta[safeName] = { sizeX, sizeZ };
  writeTerrainMeta(meta);

  return NextResponse.json({ ok: true, url: `/maps/${safeName}.png` });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  if (!fs.existsSync(MAPS_DIR)) {
    return NextResponse.json({ maps: [] });
  }

  const files = fs.readdirSync(MAPS_DIR)
    .filter(f => f.endsWith('.png'))
    .map(f => f.replace('.png', ''));

  return NextResponse.json({ maps: files });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isErrorResponse(auth)) return auth;

  const { terrainName } = await request.json();
  if (!terrainName || typeof terrainName !== 'string') {
    return NextResponse.json({ error: 'Nom du terrain requis' }, { status: 400 });
  }

  const safeName = terrainName.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(MAPS_DIR, `${safeName}.png`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return NextResponse.json({ ok: true });
}
