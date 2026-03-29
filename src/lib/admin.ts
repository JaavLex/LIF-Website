import { getPayloadClient } from './payload';
import type { SessionData } from './session';

// Discord role IDs for admin access
const ADMIN_ROLE_IDS = [
	'1483514085718098153', // full permissions
	'1425007335574601738', // full permissions
	'1424802303428268052', // limited permissions
];

const FULL_PERMISSION_ROLES = [
	'1483514085718098153',
	'1425007335574601738',
];

const LIMITED_PERMISSION_ROLES = [
	'1424802303428268052',
];

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

	// Check Discord roles from config
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
		// Fallback to hardcoded roles
	}

	// Check hardcoded Discord roles
	if (!session.roles) {
		return { isAdmin: false, level: 'none', roleName: null };
	}

	for (const roleId of FULL_PERMISSION_ROLES) {
		if (session.roles.includes(roleId)) {
			return { isAdmin: true, level: 'full', roleName: 'Officier Supérieur' };
		}
	}

	for (const roleId of LIMITED_PERMISSION_ROLES) {
		if (session.roles.includes(roleId)) {
			return { isAdmin: true, level: 'limited', roleName: 'Sous-Officier' };
		}
	}

	return { isAdmin: false, level: 'none', roleName: null };
}

export function hasAdminRole(roles: string[] | undefined): boolean {
	if (!roles) return false;
	return ADMIN_ROLE_IDS.some(id => roles.includes(id));
}
