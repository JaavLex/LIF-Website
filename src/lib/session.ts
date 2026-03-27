import crypto from 'crypto';

export interface SessionData {
	userId: number;
	discordId: string;
	discordUsername: string;
	discordAvatar: string;
	roles: string[];
}

function getSecret(): string {
	const secret = process.env.PAYLOAD_SECRET;
	if (!secret) throw new Error('PAYLOAD_SECRET is required for session signing');
	return secret;
}

export function signSession(data: SessionData): string {
	const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
	const signature = crypto
		.createHmac('sha256', getSecret())
		.update(payload)
		.digest('base64url');
	return `${payload}.${signature}`;
}

export function verifySession(token: string): SessionData | null {
	try {
		const [payload, signature] = token.split('.');
		if (!payload || !signature) return null;

		const expectedSig = crypto
			.createHmac('sha256', getSecret())
			.update(payload)
			.digest('base64url');

		if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
			return null;
		}

		return JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
	} catch {
		return null;
	}
}
