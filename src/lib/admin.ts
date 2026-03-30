import { getPayloadClient } from './payload';
import type { SessionData } from './session';

export interface AdminPermissions {
	isAdmin: boolean;
	level: 'full' | 'limited' | 'none';
	roleName: string | null;
}

export async function checkAdminPermissions(session: SessionData): Promise<AdminPermissions> {
	// Check DB admin role first
	const payload = await getPayloadClient();
	const user = await payload.find({
		collection: 'users',
		where: { discordId: { equals: session.discordId } },
		limit: 1,
	});

	if (user.docs[0]?.role === 'admin') {
		return { isAdmin: true, level: 'full', roleName: 'Admin DB' };
	}

	// Check Discord roles from Payload config
	try {
		const roleplayConfig = await payload.findGlobal({ slug: 'roleplay' });
		const adminRoles = (roleplayConfig as any)?.adminRoles;
		if (adminRoles?.length) {
			for (const role of adminRoles) {
				if (session.roles?.includes(role.roleId)) {
					return {
						isAdmin: true,
						level: role.permissionLevel || 'full',
						roleName: role.roleName || role.roleId,
					};
				}
			}
		}
	} catch {
		// Config not available
	}

	return { isAdmin: false, level: 'none', roleName: null };
}
