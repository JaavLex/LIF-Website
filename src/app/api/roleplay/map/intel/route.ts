import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkAdminPermissions } from '@/lib/admin';
import { getPayloadClient } from '@/lib/payload';

/** Parse coordinates in "XXXXX / ZZZZZ" format */
const COORD_RE = /^(\d{3,5})\s*\/\s*(\d{3,5})$/;

export async function GET(request: NextRequest) {
  // Require session to view intel markers
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ markers: [] });
  }

  const admin = await checkAdminPermissions(session);

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'intelligence',
    where: {
      coordinates: { exists: true },
    },
    limit: 200,
    sort: '-date',
  });

  const markers = result.docs
    .map((doc: any) => {
      const match = doc.coordinates?.match(COORD_RE);
      if (!match) return null;
      // Hide classified intel from non-admins
      if (doc.classification === 'classified' && !admin.isAdmin) return null;
      return {
        id: doc.id,
        title: doc.title,
        type: doc.type,
        classification: doc.classification || 'restricted',
        x: parseInt(match[1], 10),
        z: parseInt(match[2], 10),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ markers });
}
