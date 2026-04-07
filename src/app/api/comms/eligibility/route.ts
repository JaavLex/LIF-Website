import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/api-auth';
import { checkCommsEligibility, hasAcceptedDisclaimer } from '@/lib/comms';

export async function GET(request: NextRequest) {
	const session = await getSession(request);
	const result = await checkCommsEligibility(session);
	if (!result.eligible) return NextResponse.json(result);

	const disclaimerAccepted = await hasAcceptedDisclaimer(session!);
	return NextResponse.json({
		eligible: true,
		character: result.character,
		disclaimerAccepted,
	});
}
