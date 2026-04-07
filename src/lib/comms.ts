import type { SessionData } from './session';
import { getPayloadClient } from './payload';
import { checkAdminPermissions } from './admin';
import type { Roleplay } from '@/payload-types';

export type CommsEligibility =
	| { eligible: true; character: ActiveCharacter }
	| {
			eligible: false;
			reason:
				| 'not_authenticated'
				| 'not_guild_member'
				| 'no_operator_role'
				| 'no_active_character'
				| 'comms_banned'
				| 'disclaimer_required';
			discordInviteUrl?: string | null;
	  };

export interface ActiveCharacter {
	id: number;
	fullName: string;
	firstName: string;
	lastName: string;
	callsign?: string | null;
	discordId: string;
	discordUsername: string;
	faction?: string | null;
	unitId?: number | null;
	unitName?: string | null;
	rankName?: string | null;
	avatarUrl?: string | null;
}

/**
 * Checks whether a session is allowed to use /comms.
 * Rules: authenticated + guild member + operator role + has an active
 * (in-service) character + not comms-banned. Admins always pass except
 * the active-character requirement.
 *
 * Returns the eligibility result and the user's active character (when
 * eligible). The disclaimer check is intentionally separate so the
 * client can show the modal once.
 */
export async function checkCommsEligibility(
	session: SessionData | null,
): Promise<CommsEligibility> {
	if (!session) return { eligible: false, reason: 'not_authenticated' };

	const payload = await getPayloadClient();

	// Load user record (may not exist for new Discord accounts)
	const userResult = await payload.find({
		collection: 'users',
		where: { discordId: { equals: session.discordId } },
		limit: 1,
	});
	const userData = userResult.docs[0];
	const isAdmin = (await checkAdminPermissions(session)).isAdmin;

	if ((userData as any)?.commsBanned) {
		return { eligible: false, reason: 'comms_banned' };
	}

	const roleplayConfig = (await payload
		.findGlobal({ slug: 'roleplay' })
		.catch(() => null)) as Roleplay | null;

	if (!isAdmin) {
		if (!userData?.isGuildMember) {
			return {
				eligible: false,
				reason: 'not_guild_member',
				discordInviteUrl: roleplayConfig?.discordInviteUrl || null,
			};
		}

		const operatorRoleId = roleplayConfig?.operatorRoleId;
		if (operatorRoleId && !session.roles?.includes(operatorRoleId)) {
			return {
				eligible: false,
				reason: 'no_operator_role',
				discordInviteUrl: roleplayConfig?.discordInviteUrl || null,
			};
		}
		if (!operatorRoleId) {
			return {
				eligible: false,
				reason: 'no_operator_role',
				discordInviteUrl: roleplayConfig?.discordInviteUrl || null,
			};
		}
	}

	// Find user's active in-service character
	const characters = await payload.find({
		collection: 'characters',
		where: {
			and: [
				{ discordId: { equals: session.discordId } },
				{ status: { equals: 'in-service' } },
			],
		},
		limit: 1,
		depth: 2,
	});
	const charDoc = characters.docs[0] as any;
	if (!charDoc) {
		return { eligible: false, reason: 'no_active_character' };
	}

	const character: ActiveCharacter = {
		id: charDoc.id,
		fullName: charDoc.fullName || `${charDoc.firstName} ${charDoc.lastName}`,
		firstName: charDoc.firstName,
		lastName: charDoc.lastName,
		callsign: charDoc.callsign || null,
		discordId: charDoc.discordId,
		discordUsername: charDoc.discordUsername,
		faction: charDoc.faction || null,
		unitId:
			typeof charDoc.unit === 'object' ? charDoc.unit?.id : charDoc.unit || null,
		unitName: typeof charDoc.unit === 'object' ? charDoc.unit?.name : null,
		rankName: typeof charDoc.rank === 'object' ? charDoc.rank?.name : null,
		avatarUrl:
			typeof charDoc.avatar === 'object' ? charDoc.avatar?.url || null : null,
	};

	return { eligible: true, character };
}

/**
 * Returns true if the user has accepted the comms disclaimer.
 * Used by API routes to gate POST /messages.
 */
export async function hasAcceptedDisclaimer(
	session: SessionData,
): Promise<boolean> {
	const payload = await getPayloadClient();
	const result = await payload.find({
		collection: 'users',
		where: { discordId: { equals: session.discordId } },
		limit: 1,
	});
	return !!(result.docs[0] as any)?.commsDisclaimerAcceptedAt;
}

/**
 * Ensures the auto-channels (faction + unit) exist for a character and
 * that the character is in their members list. Idempotent. Also handles
 * the "moved faction/unit" case by removing the character from stale
 * auto-channels.
 */
export async function syncAutoChannelsForCharacter(
	character: ActiveCharacter,
): Promise<{ factionChannelId: number | null; unitChannelId: number | null }> {
	const payload = await getPayloadClient();

	let factionChannelId: number | null = null;
	let unitChannelId: number | null = null;

	// Faction channel
	if (character.faction) {
		const existing = await payload.find({
			collection: 'comms-channels',
			where: {
				and: [
					{ type: { equals: 'faction' } },
					{ factionRef: { equals: character.faction } },
				],
			},
			limit: 1,
		});
		let channel = existing.docs[0] as any;
		if (!channel) {
			channel = await payload.create({
				collection: 'comms-channels',
				data: {
					name: `Faction — ${character.faction}`,
					type: 'faction',
					factionRef: character.faction,
					members: [character.id],
				} as any,
			});
		} else {
			const members: number[] = Array.isArray(channel.members)
				? channel.members
				: [];
			if (!members.includes(character.id)) {
				await payload.update({
					collection: 'comms-channels',
					id: channel.id,
					data: { members: [...members, character.id] } as any,
				});
			}
		}
		factionChannelId = channel.id;
	}

	// Unit channel
	if (character.unitId) {
		const existing = await payload.find({
			collection: 'comms-channels',
			where: {
				and: [
					{ type: { equals: 'unit' } },
					{ unitRefId: { equals: character.unitId } },
				],
			},
			limit: 1,
		});
		let channel = existing.docs[0] as any;
		if (!channel) {
			channel = await payload.create({
				collection: 'comms-channels',
				data: {
					name: `Unité — ${character.unitName || character.unitId}`,
					type: 'unit',
					unitRefId: character.unitId,
					members: [character.id],
				} as any,
			});
		} else {
			const members: number[] = Array.isArray(channel.members)
				? channel.members
				: [];
			if (!members.includes(character.id)) {
				await payload.update({
					collection: 'comms-channels',
					id: channel.id,
					data: { members: [...members, character.id] } as any,
				});
			}
		}
		unitChannelId = channel.id;
	}

	// Remove from stale faction/unit channels
	const allAuto = await payload.find({
		collection: 'comms-channels',
		where: {
			or: [{ type: { equals: 'faction' } }, { type: { equals: 'unit' } }],
		},
		limit: 500,
	});
	for (const ch of allAuto.docs as any[]) {
		const members: number[] = Array.isArray(ch.members) ? ch.members : [];
		if (!members.includes(character.id)) continue;
		const isCurrentFaction =
			ch.type === 'faction' && ch.factionRef === character.faction;
		const isCurrentUnit =
			ch.type === 'unit' && Number(ch.unitRefId) === character.unitId;
		if (!isCurrentFaction && !isCurrentUnit) {
			await payload.update({
				collection: 'comms-channels',
				id: ch.id,
				data: {
					members: members.filter((m) => m !== character.id),
				} as any,
			});
		}
	}

	return { factionChannelId, unitChannelId };
}

/**
 * Lists all channels visible to a character.
 */
export async function listChannelsForCharacter(characterId: number) {
	const payload = await getPayloadClient();
	// Payload's where doesn't support `contains` on jsonb arrays cleanly,
	// so we fetch and filter in JS. Counts will be small per user.
	const all = await payload.find({
		collection: 'comms-channels',
		limit: 500,
		sort: '-lastMessageAt',
	});
	return (all.docs as any[]).filter((ch) => {
		const members: number[] = Array.isArray(ch.members) ? ch.members : [];
		return members.map(Number).includes(Number(characterId));
	});
}

const RATE_LIMIT_PER_MIN = 30;
const userMessageTimestamps = new Map<string, number[]>();

/**
 * Simple in-memory rate limiter: max N messages per minute per discord user.
 */
export function checkRateLimit(discordId: string): boolean {
	const now = Date.now();
	const cutoff = now - 60_000;
	const arr = (userMessageTimestamps.get(discordId) || []).filter((t) => t > cutoff);
	if (arr.length >= RATE_LIMIT_PER_MIN) {
		userMessageTimestamps.set(discordId, arr);
		return false;
	}
	arr.push(now);
	userMessageTimestamps.set(discordId, arr);
	return true;
}

/**
 * Hard limits per spec.
 */
export const COMMS_LIMITS = {
	maxBodyLength: 4000,
	maxAttachments: 4,
	maxGroupMembers: 15,
	editWindowMs: 5 * 60 * 1000,
};
