import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
	try {
		const payload = await getPayloadClient();
		const roleplayConfig = await payload
			.findGlobal({ slug: 'roleplay' })
			.catch(() => null);

		const password = (roleplayConfig as any)?.rpRulesPassword || 'HONNEUR';
		let content = (roleplayConfig as any)?.rpRulesContent;

		// Fallback to rprules.md if no content in database
		if (!content) {
			try {
				content = readFileSync(join(process.cwd(), 'rprules.md'), 'utf-8');
			} catch {
				content = '';
			}
		}

		// Replace password placeholder
		const processed = content.replace(/>?\|PASSWORDHERE\|<?/g, password);

		return NextResponse.json({ content: processed });
	} catch {
		return NextResponse.json({ content: '' }, { status: 500 });
	}
}

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
