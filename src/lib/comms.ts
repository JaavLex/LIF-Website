import type { SessionData } from './session';
import { getPayloadClient } from './payload';
import { checkAdminPermissions } from './admin';
import { generateUniqueCallsign } from './callsign';
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
	factionLogoUrl?: string | null;
	unitId?: number | null;
	unitName?: string | null;
	unitInsigniaUrl?: string | null;
	rankName?: string | null;
	rankIconUrl?: string | null;
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

	// Safety net: backfill a callsign for legacy rows that somehow still lack one
	if (!charDoc.callsign) {
		const generated = await generateUniqueCallsign(payload);
		await payload.update({
			collection: 'characters',
			id: charDoc.id,
			data: { callsign: generated } as any,
		});
		charDoc.callsign = generated;
	}

	// Resolve faction logo (faction is a free-text field on character)
	let factionLogoUrl: string | null = null;
	if (charDoc.faction) {
		const factionResult = await payload.find({
			collection: 'factions',
			where: { name: { equals: charDoc.faction } },
			limit: 1,
			depth: 1,
		});
		const f = factionResult.docs[0] as any;
		if (f && typeof f.logo === 'object') factionLogoUrl = f.logo?.url || null;
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
		factionLogoUrl,
		unitId:
			typeof charDoc.unit === 'object' ? charDoc.unit?.id : charDoc.unit || null,
		unitName: typeof charDoc.unit === 'object' ? charDoc.unit?.name : null,
		unitInsigniaUrl:
			typeof charDoc.unit === 'object' && typeof charDoc.unit?.insignia === 'object'
				? charDoc.unit.insignia?.url || null
				: null,
		rankName: typeof charDoc.rank === 'object' ? charDoc.rank?.name : null,
		rankIconUrl:
			typeof charDoc.rank === 'object' && typeof charDoc.rank?.icon === 'object'
				? charDoc.rank.icon?.url || null
				: null,
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
 * Full sync of all faction & unit auto-channels.
 *
 * - For every Faction in DB, ensures a 'faction' channel exists with name
 *   matching the faction.name and members = all in-service characters whose
 *   `faction` text matches that name.
 * - For every Unit in DB, ensures a 'unit' channel exists and members = all
 *   in-service characters whose `unit` relation points at it.
 *
 * Idempotent. Safe to call on every channels GET. Cached for 30s in memory
 * to avoid hammering the DB on rapid polling.
 */
let lastFullSyncAt = 0;
const FULL_SYNC_TTL_MS = 30_000;

export async function syncAllAutoChannels(force = false): Promise<void> {
	const now = Date.now();
	if (!force && now - lastFullSyncAt < FULL_SYNC_TTL_MS) return;
	lastFullSyncAt = now;

	const payload = await getPayloadClient();

	const [factions, units, characters] = await Promise.all([
		payload.find({ collection: 'factions', limit: 500 }),
		payload.find({ collection: 'units', limit: 500, depth: 1 }),
		payload.find({
			collection: 'characters',
			where: { status: { equals: 'in-service' } },
			limit: 1000,
			depth: 0,
		}),
	]);

	const charsByFaction = new Map<string, number[]>();
	const charsByUnit = new Map<number, number[]>();
	for (const c of characters.docs as any[]) {
		if (c.faction) {
			const arr = charsByFaction.get(c.faction) || [];
			arr.push(c.id);
			charsByFaction.set(c.faction, arr);
		}
		if (c.unit) {
			const unitId = typeof c.unit === 'object' ? c.unit.id : c.unit;
			if (unitId) {
				const arr = charsByUnit.get(unitId) || [];
				arr.push(c.id);
				charsByUnit.set(unitId, arr);
			}
		}
	}

	// Existing channels keyed by ref
	const existingFactionCh = await payload.find({
		collection: 'comms-channels',
		where: { type: { equals: 'faction' } },
		limit: 500,
	});
	const factionChByRef = new Map<string, any>();
	for (const ch of existingFactionCh.docs as any[]) {
		if (ch.factionRef) factionChByRef.set(ch.factionRef, ch);
	}

	const existingUnitCh = await payload.find({
		collection: 'comms-channels',
		where: { type: { equals: 'unit' } },
		limit: 500,
	});
	const unitChByRef = new Map<number, any>();
	for (const ch of existingUnitCh.docs as any[]) {
		if (ch.unitRefId) unitChByRef.set(Number(ch.unitRefId), ch);
	}

	// Faction channels: ensure exists & members up to date
	for (const f of factions.docs as any[]) {
		const desiredMembers = (charsByFaction.get(f.name) || []).sort((a, b) => a - b);
		const existing = factionChByRef.get(f.name);
		if (!existing) {
			await payload.create({
				collection: 'comms-channels',
				data: {
					name: `Faction — ${f.name}`,
					type: 'faction',
					factionRef: f.name,
					members: desiredMembers,
				} as any,
			});
		} else {
			const current: number[] = (Array.isArray(existing.members) ? existing.members : [])
				.map(Number)
				.sort((a: number, b: number) => a - b);
			if (JSON.stringify(current) !== JSON.stringify(desiredMembers)) {
				await payload.update({
					collection: 'comms-channels',
					id: existing.id,
					data: { members: desiredMembers } as any,
				});
			}
		}
	}

	// Unit channels: ensure exists & members up to date
	for (const u of units.docs as any[]) {
		const desiredMembers = (charsByUnit.get(u.id) || []).sort((a, b) => a - b);
		const existing = unitChByRef.get(u.id);
		if (!existing) {
			await payload.create({
				collection: 'comms-channels',
				data: {
					name: `Unité — ${u.name}`,
					type: 'unit',
					unitRefId: u.id,
					members: desiredMembers,
				} as any,
			});
		} else {
			const current: number[] = (Array.isArray(existing.members) ? existing.members : [])
				.map(Number)
				.sort((a: number, b: number) => a - b);
			if (JSON.stringify(current) !== JSON.stringify(desiredMembers)) {
				await payload.update({
					collection: 'comms-channels',
					id: existing.id,
					data: { members: desiredMembers } as any,
				});
			}
		}
	}
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

/**
 * Display-enriched view of a channel.
 *
 * Includes everything the client needs to render a channel row + header
 * without making per-channel lookups: an icon URL, the (sorted) display
 * member avatars for groups, the "other party" for DMs, and the anonymous
 * flag indicating whether the viewer is the anon side or the recipient
 * side.
 */
export interface EnrichedChannel {
	id: number;
	name: string;
	type: 'faction' | 'unit' | 'dm' | 'group';
	factionRef?: string | null;
	unitRefId?: number | null;
	memberCount: number;
	members: number[];
	createdByCharacterId?: number | null;
	lastMessageAt?: string | null;
	lastMessagePreview?: string | null;
	lastMessageMentionsViewer?: boolean;
	iconUrl?: string | null;
	subtitle?: string | null;
	displayMembers?: Array<{
		id: number;
		fullName: string;
		avatarUrl: string | null;
	}>;
	dmOther?: { id: number; fullName: string; avatarUrl: string | null } | null;
	anonForCharacterId?: number | null;
	isAnonForViewer: boolean;
	isAnonInitiatedByViewer: boolean;
}

/**
 * Enrich a list of channels with display data: icons, DM other party,
 * group avatar previews. Batched lookups so this is O(1) DB queries
 * regardless of channel count.
 */
export async function enrichChannelsForDisplay(
	channels: any[],
	viewerCharacterId: number,
	viewerLastMessageMap?: Map<number, any>,
): Promise<EnrichedChannel[]> {
	const payload = await getPayloadClient();

	// Collect all referenced IDs
	const factionRefs = new Set<string>();
	const unitRefs = new Set<number>();
	const characterIds = new Set<number>();
	for (const ch of channels) {
		if (ch.type === 'faction' && ch.factionRef) factionRefs.add(ch.factionRef);
		if (ch.type === 'unit' && ch.unitRefId) unitRefs.add(Number(ch.unitRefId));
		if (Array.isArray(ch.members)) {
			for (const m of ch.members) characterIds.add(Number(m));
		}
	}

	const [factionsResult, unitsResult, charactersResult] = await Promise.all([
		factionRefs.size > 0
			? payload.find({
					collection: 'factions',
					where: { name: { in: Array.from(factionRefs) } },
					limit: factionRefs.size,
					depth: 1,
				})
			: Promise.resolve({ docs: [] }),
		unitRefs.size > 0
			? payload.find({
					collection: 'units',
					where: { id: { in: Array.from(unitRefs) } },
					limit: unitRefs.size,
					depth: 1,
				})
			: Promise.resolve({ docs: [] }),
		characterIds.size > 0
			? payload.find({
					collection: 'characters',
					where: { id: { in: Array.from(characterIds) } },
					limit: characterIds.size,
					depth: 1,
				})
			: Promise.resolve({ docs: [] }),
	]);

	const factionByName = new Map<string, any>();
	for (const f of factionsResult.docs as any[]) factionByName.set(f.name, f);
	const unitById = new Map<number, any>();
	for (const u of unitsResult.docs as any[]) unitById.set(u.id, u);
	const charById = new Map<number, any>();
	for (const c of charactersResult.docs as any[]) charById.set(c.id, c);

	function avatarOf(c: any): string | null {
		if (!c) return null;
		return typeof c.avatar === 'object' ? c.avatar?.url || null : null;
	}
	function nameOf(c: any): string {
		if (!c) return '?';
		return c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || `#${c.id}`;
	}

	return channels.map((ch: any): EnrichedChannel => {
		const members: number[] = Array.isArray(ch.members) ? ch.members.map(Number) : [];
		const last = viewerLastMessageMap?.get(ch.id) || null;

		let iconUrl: string | null = null;
		let subtitle: string | null = null;
		let displayMembers: EnrichedChannel['displayMembers'] = undefined;
		let dmOther: EnrichedChannel['dmOther'] = null;

		const anonForCharacterId =
			typeof ch.anonForCharacterId === 'number' ? ch.anonForCharacterId : null;
		const isAnonInitiatedByViewer = anonForCharacterId === viewerCharacterId;
		const isAnonForViewer =
			anonForCharacterId !== null && anonForCharacterId !== viewerCharacterId;

		if (ch.type === 'faction' && ch.factionRef) {
			const f = factionByName.get(ch.factionRef);
			iconUrl = typeof f?.logo === 'object' ? f?.logo?.url || null : null;
			subtitle = f?.type || null;
		} else if (ch.type === 'unit' && ch.unitRefId) {
			const u = unitById.get(Number(ch.unitRefId));
			iconUrl = typeof u?.insignia === 'object' ? u?.insignia?.url || null : null;
			const parentFac =
				typeof u?.parentFaction === 'object' ? u?.parentFaction?.name : null;
			subtitle = parentFac || null;
		} else if (ch.type === 'dm') {
			// DM: find the OTHER member
			const otherId = members.find((m) => m !== viewerCharacterId) ?? null;
			if (otherId !== null) {
				const other = charById.get(otherId);
				if (isAnonForViewer) {
					// Other side is anonymous to me; mask
					dmOther = { id: otherId, fullName: '[ANONYME]', avatarUrl: null };
					iconUrl = null;
				} else {
					dmOther = {
						id: otherId,
						fullName: nameOf(other),
						avatarUrl: avatarOf(other),
					};
					iconUrl = avatarOf(other);
				}
			}
		} else if (ch.type === 'group') {
			// Group: top members (excluding viewer first, then viewer)
			const previewIds = members.filter((m) => m !== viewerCharacterId).slice(0, 4);
			displayMembers = previewIds.map((id) => {
				const c = charById.get(id);
				return { id, fullName: nameOf(c), avatarUrl: avatarOf(c) };
			});
		}

		// Build display name: DM uses other person's name (or [ANONYME])
		let displayName = ch.name as string;
		if (ch.type === 'dm' && dmOther) {
			displayName = dmOther.fullName;
		}

		return {
			id: ch.id,
			name: displayName,
			type: ch.type,
			factionRef: ch.factionRef,
			unitRefId: ch.unitRefId,
			memberCount: members.length,
			members,
			createdByCharacterId: ch.createdByCharacterId,
			lastMessageAt: ch.lastMessageAt,
			lastMessagePreview: last?.body ? String(last.body).slice(0, 100) : null,
			lastMessageMentionsViewer:
				Array.isArray(last?.mentions) &&
				last.mentions.map(Number).includes(viewerCharacterId),
			iconUrl,
			subtitle,
			displayMembers,
			dmOther,
			anonForCharacterId,
			isAnonForViewer,
			isAnonInitiatedByViewer,
		};
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
