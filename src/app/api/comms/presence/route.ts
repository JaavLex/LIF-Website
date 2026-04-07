import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkCommsEligibility } from '@/lib/comms';
import { pingPresence, onlineSet } from '@/lib/comms-presence';

export async function POST(request: NextRequest) {
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}
	pingPresence(eligibility.character.id);
	return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
	const session = await getSession(request);
	const eligibility = await checkCommsEligibility(session);
	if (!eligibility.eligible) {
		return NextResponse.json({ error: eligibility.reason }, { status: 403 });
	}
	const url = new URL(request.url);
	const idsParam = url.searchParams.get('ids') || '';
	const ids = idsParam
		.split(',')
		.map((s) => Number(s.trim()))
		.filter((n) => !isNaN(n));
	if (ids.length === 0) return NextResponse.json({ online: [] });
	const online = onlineSet(ids);
	return NextResponse.json({ online: Array.from(online) });
}
