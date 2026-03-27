import { NextResponse } from 'next/server';

export async function POST() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
	const response = NextResponse.redirect(`${baseUrl}/`);
	response.cookies.delete('roleplay-session');
	return response;
}

export async function GET() {
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
	const response = NextResponse.redirect(`${baseUrl}/`);
	response.cookies.delete('roleplay-session');
	return response;
}
