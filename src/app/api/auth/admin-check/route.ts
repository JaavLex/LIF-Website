import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { checkAdminPermissions } from '@/lib/admin';

export async function GET(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ isAdmin: false, level: 'none', roleName: null });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ isAdmin: false, level: 'none', roleName: null });
	}

	const permissions = await checkAdminPermissions(session);

	// In dev view-as-user mode, also expose that they are a real admin
	// so the toggle button knows to stay visible
	if (permissions.viewingAsUser) {
		return NextResponse.json({ ...permissions, isRealAdmin: true });
	}

	return NextResponse.json(permissions);
}
