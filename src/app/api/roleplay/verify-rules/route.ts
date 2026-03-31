import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';

export async function POST(request: NextRequest) {
	try {
		const { password } = await request.json();

		if (!password || typeof password !== 'string') {
			return NextResponse.json({ valid: false }, { status: 400 });
		}

		const payload = await getPayloadClient();
		const roleplayConfig = await payload
			.findGlobal({ slug: 'roleplay' })
			.catch(() => null);

		const correctPassword = (roleplayConfig as any)?.rpRulesPassword || 'HONNEUR';

		const valid = password.trim().toUpperCase() === correctPassword.trim().toUpperCase();

		return NextResponse.json({ valid });
	} catch {
		return NextResponse.json({ valid: false }, { status: 500 });
	}
}
