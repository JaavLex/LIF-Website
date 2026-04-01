import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_PATHS = ['/moderation', '/roleplay'];

function getReturnPath(request: NextRequest): string {
	const redirect = request.nextUrl.searchParams.get('redirect') || '';
	return ALLOWED_PATHS.includes(redirect) ? redirect : '/roleplay';
}

export async function POST(request: NextRequest) {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
	const returnTo = getReturnPath(request);
	const response = NextResponse.redirect(`${baseUrl}${returnTo}`);
	response.cookies.delete('roleplay-session');
	return response;
}

export async function GET(request: NextRequest) {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
	const returnTo = getReturnPath(request);
	const response = NextResponse.redirect(`${baseUrl}${returnTo}`);
	response.cookies.delete('roleplay-session');
	return response;
}
