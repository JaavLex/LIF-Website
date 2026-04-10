import { NextRequest, NextResponse } from 'next/server';
import { getSession, requireAdmin } from '@/lib/api-auth';
import payload from 'payload';

export async function GET(request: NextRequest) {
  const all = request.nextUrl.searchParams.get('all');

  // If ?all=1 (admin unit list for placement dropdown), return all units
  if (all === '1') {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ allUnits: [] });
    const { checkAdminPermissions } = await import('@/lib/admin');
    const admin = await checkAdminPermissions(session);
    if (!admin.isAdmin) return NextResponse.json({ allUnits: [] });

    const result = await payload.find({
      collection: 'units',
      limit: 100,
      sort: 'name',
    });

    return NextResponse.json({
      allUnits: result.docs.map((u: any) => ({ id: u.id, name: u.name })),
    });
  }

  // Default: return units with HQ positions set
  const result = await payload.find({
    collection: 'units',
    where: {
      and: [
        { hqX: { exists: true } },
        { hqZ: { exists: true } },
      ],
    },
    depth: 2,
    limit: 50,
  });

  const units = result.docs.map((u: any) => ({
    id: u.id,
    name: u.name,
    color: u.color || '#4a7c23',
    hqX: u.hqX,
    hqZ: u.hqZ,
    insigniaUrl: u.insignia?.url || null,
    commanderName: u.commander?.fullName || null,
    factionName: u.parentFaction?.name || null,
  }));

  return NextResponse.json({ units });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (guard instanceof NextResponse) return guard;

  const body = await request.json();
  const { unitId, hqX, hqZ } = body;

  if (!unitId || typeof hqX !== 'number' || typeof hqZ !== 'number') {
    return NextResponse.json({ error: 'unitId, hqX, hqZ requis' }, { status: 400 });
  }

  await payload.update({
    collection: 'units',
    id: unitId,
    data: { hqX, hqZ } as any,
  });

  return NextResponse.json({ success: true });
}
