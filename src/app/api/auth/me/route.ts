import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export async function GET(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;

	if (!token) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}

	return NextResponse.json({
		authenticated: true,
		user: session,
	});
}
