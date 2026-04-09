import { NextRequest, NextResponse } from 'next/server';
import { requireGmAdmin, isErrorResponse } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/admin-log';

// GM mode is purely client-state (see src/components/comms/useGmMode.tsx).
// This endpoint exists solely so the client can notify the server on toggle,
// producing a gm.enter / gm.exit entry in the admin audit log. It performs
// no mutation — a failed call must not block the local toggle.
export async function POST(request: NextRequest) {
	const auth = await requireGmAdmin(request);
	if (isErrorResponse(auth)) return auth;

	const body = await request.json().catch(() => ({}));
	const enabled = body?.enabled === true;

	void logAdminAction({
		session: auth.session,
		permissions: auth.permissions,
		action: enabled ? 'gm.enter' : 'gm.exit',
		summary: enabled
			? 'A activé le mode GameMaster en /comms'
			: 'A désactivé le mode GameMaster en /comms',
		metadata: { enabled },
		request,
	});

	return NextResponse.json({ ok: true });
}
