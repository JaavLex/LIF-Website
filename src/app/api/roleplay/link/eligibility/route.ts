import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { getPayloadClient } from '@/lib/payload';
import type { Roleplay } from '@/payload-types';

/**
 * GET /api/roleplay/link/eligibility
 * Check if the current user is eligible to link an account:
 * - Must be authenticated
 * - Must be a guild member
 * - Must have the operator role
 */
export async function GET(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ eligible: false, reason: 'not_authenticated' });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ eligible: false, reason: 'not_authenticated' });
	}

	const payload = await getPayloadClient();

	// Check guild membership
	const userResult = await payload.find({
		collection: 'users',
		where: { discordId: { equals: session.discordId } },
		limit: 1,
	});
	const userData = userResult.docs[0];
	if (!userData?.isGuildMember) {
		const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }).catch(() => null) as Roleplay | null;
		return NextResponse.json({
			eligible: false,
			reason: 'not_guild_member',
			discordInviteUrl: roleplayConfig?.discordInviteUrl || null,
		});
	}

	// Check operator role
	const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }).catch(() => null) as Roleplay | null;
	const operatorRoleId = roleplayConfig?.operatorRoleId;
	if (operatorRoleId && !session.roles?.includes(operatorRoleId)) {
		return NextResponse.json({
			eligible: false,
			reason: 'no_operator_role',
			discordInviteUrl: roleplayConfig?.discordInviteUrl || null,
		});
	}

	return NextResponse.json({ eligible: true });
}
