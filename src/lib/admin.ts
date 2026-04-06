import { cookies } from 'next/headers';
import { getPayloadClient } from './payload';
import type { SessionData } from './session';
import type { Roleplay } from '@/payload-types';

export interface AdminPermissions {
	isAdmin: boolean;
	level: 'full' | 'limited' | 'none';
	roleName: string | null;
	/** True if the user is actually an admin but viewing as user (dev only) */
	viewingAsUser?: boolean;
}

export async function checkAdminPermissions(
	session: SessionData,
): Promise<AdminPermissions> {
	// Check DB admin role first
	const payload = await getPayloadClient();
	const user = await payload.find({
		collection: 'users',
		where: { discordId: { equals: session.discordId } },
		limit: 1,
	});

	let realPermissions: AdminPermissions | null = null;

	if (user.docs[0]?.role === 'admin') {
		realPermissions = { isAdmin: true, level: 'full', roleName: 'Admin DB' };
	}

	if (!realPermissions) {
		// Check Discord roles from Payload config
		try {
			const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' }) as Roleplay;
			const adminRoles = roleplayConfig?.adminRoles;
			if (adminRoles?.length) {
				for (const role of adminRoles) {
					if (session.roles?.includes(role.roleId)) {
						realPermissions = {
							isAdmin: true,
							level: role.permissionLevel || 'limited',
							roleName: role.roleName || role.roleId,
						};
						break;
					}
				}
			}
		} catch {
			// Config not available
		}
	}

	if (!realPermissions) {
		return { isAdmin: false, level: 'none', roleName: null };
	}

	// Dev-only: check if admin is viewing as user via cookie
	if (process.env.NEXT_PUBLIC_LIF_ENVIRONMENT === 'dev') {
		try {
			const cookieStore = await cookies();
			if (cookieStore.get('view-as-user')?.value === '1') {
				return { isAdmin: false, level: 'none', roleName: null, viewingAsUser: true };
			}
		} catch {
			// cookies() not available outside of request context — ignore
		}
	}

	return realPermissions;
}

/** Check admin permissions with an explicit view-as-user override (for API routes) */
export async function checkAdminPermissionsWithRequest(
	session: SessionData,
	viewAsUserCookie?: string,
): Promise<AdminPermissions> {
	const perms = await checkAdminPermissions(session);
	// If cookies() worked inside checkAdminPermissions, viewingAsUser is already set
	if (perms.viewingAsUser) return perms;
	// Otherwise check the explicitly passed cookie
	if (
		perms.isAdmin &&
		process.env.NEXT_PUBLIC_LIF_ENVIRONMENT === 'dev' &&
		viewAsUserCookie === '1'
	) {
		return { isAdmin: false, level: 'none', roleName: null, viewingAsUser: true };
	}
	return perms;
}
