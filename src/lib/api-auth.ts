import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySession, type SessionData } from './session';
import { checkAdminPermissions, type AdminPermissions } from './admin';

/**
 * Get and verify the session from request cookies.
 * Works with both NextRequest.cookies and next/headers cookies().
 */
export async function getSession(request?: NextRequest): Promise<SessionData | null> {
	let token: string | undefined;
	if (request) {
		token = request.cookies.get('roleplay-session')?.value;
	} else {
		const cookieStore = await cookies();
		token = cookieStore.get('roleplay-session')?.value;
	}
	if (!token) return null;
	return verifySession(token);
}

/** Standard 401 response */
function unauthorized(message = 'Non authentifié') {
	return NextResponse.json({ error: message }, { status: 401 });
}

/** Standard 403 response */
function forbidden(message = 'Accès refusé') {
	return NextResponse.json({ error: message }, { status: 403 });
}

export interface AuthenticatedContext {
	session: SessionData;
}

export interface AdminContext extends AuthenticatedContext {
	permissions: AdminPermissions;
}

/**
 * Require an authenticated session. Returns a NextResponse error or the session.
 */
export async function requireSession(
	request?: NextRequest,
): Promise<SessionData | NextResponse> {
	const session = await getSession(request);
	if (!session) return unauthorized();
	return session;
}

/**
 * Require admin permissions. Returns a NextResponse error or the admin context.
 */
export async function requireAdmin(
	request?: NextRequest,
): Promise<AdminContext | NextResponse> {
	const session = await getSession(request);
	if (!session) return unauthorized();

	const permissions = await checkAdminPermissions(session);
	if (!permissions.isAdmin) return forbidden();

	return { session, permissions };
}

/**
 * Require full admin permissions. Returns a NextResponse error or the admin context.
 */
export async function requireFullAdmin(
	request?: NextRequest,
): Promise<AdminContext | NextResponse> {
	const session = await getSession(request);
	if (!session) return unauthorized();

	const permissions = await checkAdminPermissions(session);
	if (!permissions.isAdmin || permissions.level !== 'full') return forbidden();

	return { session, permissions };
}

/**
 * Type guard to check if the result is a NextResponse (error) or a valid context.
 */
export function isErrorResponse(
	result: SessionData | AdminContext | NextResponse,
): result is NextResponse {
	return result instanceof NextResponse;
}
