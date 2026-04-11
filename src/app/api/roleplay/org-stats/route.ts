import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import { logAdminAction } from '@/lib/admin-log';
import type { Character } from '@/payload-types';

export const dynamic = 'force-dynamic';

export async function GET() {
	try {
		const payload = await getPayloadClient();

		// Get all LIF faction characters (non-archived, non-target) with their money.
		// depth: 2 resolves avatar (media), unit (unit doc), and unit.insignia (media).
		const characters = await payload.find({
			collection: 'characters',
			where: {
				and: [
					{ faction: { equals: 'LIF' } },
					{ isTarget: { not_equals: true } },
					{ isArchived: { not_equals: true } },
				],
			},
			limit: 500,
			depth: 2,
		});

		// All character IDs for bank history query
		const allCharacterIds: number[] = characters.docs.map(c => c.id);

		// Only linked characters count towards the current total
		let totalMoney = 0;
		const linkedCharacterIds = new Set<number>();
		const seenBiIds = new Set<string>();
		for (const c of characters.docs) {
			const biId = c.biId;
			if (!biId) continue;
			if (seenBiIds.has(biId)) continue;
			seenBiIds.add(biId);
			linkedCharacterIds.add(c.id);
			const money = c.savedMoney;
			if (typeof money === 'number' && money > 0) {
				totalMoney += money;
			}
		}

		// Get bank history for ALL LIF characters to build evolution over time
		// This way, unlinked characters show as dropping to 0 in the graph
		let history: { date: string; total: number }[] = [];

		if (allCharacterIds.length > 0) {
			const bankHistory = await payload.find({
				collection: 'bank-history',
				where: {
					character: { in: allCharacterIds.join(',') },
				},
				sort: 'createdAt',
				limit: 10000,
				depth: 0,
			});

			if (bankHistory.docs.length > 0) {
				// Map characterId -> biId (null for unlinked)
				const charBiId: Record<number, string | null> = {};
				for (const c of characters.docs) {
					charBiId[c.id] = c.biId || null;
				}

				const charAmounts: Record<number, number> = {};
				const dataPoints: { date: Date; total: number }[] = [];

				for (const entry of bankHistory.docs) {
					const charId =
						typeof entry.character === 'number'
							? entry.character
							: entry.character?.id;
					const amount = entry.amount;
					if (charId && typeof amount === 'number') {
						charAmounts[charId] = amount;
						// Compute org total: only count linked characters, deduplicating by biId
						let sum = 0;
						const countedBiIds = new Set<string>();
						for (const id of allCharacterIds) {
							if (!linkedCharacterIds.has(id)) continue; // unlinked = 0
							const bi = charBiId[id];
							if (bi && countedBiIds.has(bi)) continue;
							if (bi) countedBiIds.add(bi);
							sum += charAmounts[id] || 0;
						}
						dataPoints.push({
							date: new Date(entry.createdAt as string),
							total: sum,
						});
					}
				}

				// Group by sync cycle (minute granularity) — keep last data point per minute
				const minuteMap = new Map<string, number>();
				for (const dp of dataPoints) {
					const minuteKey = dp.date.toISOString().slice(0, 16);
					minuteMap.set(minuteKey, dp.total);
				}

				history = Array.from(minuteMap.entries())
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([date, total]) => ({ date, total }));
			}
		}

		// Build leaderboard: non-anonymous linked characters with their latest
		// bank-history delta (amount - previousAmount).
		type LeaderboardEntry = {
			id: number;
			firstName: string;
			lastName: string;
			callsign: string | null;
			unitName: string | null;
			unitInsignia: string | null;
			avatar: string | null;
			amount: number;
			delta: number;
		};

		const leaderboard: LeaderboardEntry[] = [];
		// Fetch latest bank-history entry per linked, non-anonymous character.
		// Easiest path: pull recent entries sorted desc, keep the first seen per char.
		const nonAnonLinkedIds = characters.docs
			.filter(
				c =>
					c.biId &&
					!(c as Character & { bankAnonymous?: boolean }).bankAnonymous,
			)
			.map(c => c.id);

		const latestByChar = new Map<
			number,
			{ amount: number; previousAmount: number | null }
		>();
		if (nonAnonLinkedIds.length > 0) {
			const recent = await payload.find({
				collection: 'bank-history',
				where: { character: { in: nonAnonLinkedIds.join(',') } },
				sort: '-createdAt',
				limit: 5000,
				depth: 0,
			});
			for (const e of recent.docs) {
				const charId =
					typeof e.character === 'number' ? e.character : e.character?.id;
				if (!charId || latestByChar.has(charId)) continue;
				latestByChar.set(charId, {
					amount: typeof e.amount === 'number' ? e.amount : 0,
					previousAmount:
						typeof e.previousAmount === 'number' ? e.previousAmount : null,
				});
			}
		}

		for (const c of characters.docs) {
			if (!c.biId) continue;
			if ((c as Character & { bankAnonymous?: boolean }).bankAnonymous) continue;

			const latest = latestByChar.get(c.id);
			const amount = latest
				? latest.amount
				: typeof c.savedMoney === 'number'
					? c.savedMoney
					: 0;
			const delta =
				latest && latest.previousAmount !== null
					? latest.amount - latest.previousAmount
					: 0;

			const avatar =
				typeof c.avatar === 'object' && c.avatar && 'url' in c.avatar
					? (c.avatar as { url?: string }).url || null
					: null;

			let unitName: string | null = null;
			let unitInsignia: string | null = null;
			if (c.unit && typeof c.unit === 'object') {
				const u = c.unit as {
					name?: string;
					insignia?: { url?: string } | number | null;
				};
				unitName = u.name || null;
				if (u.insignia && typeof u.insignia === 'object' && 'url' in u.insignia) {
					unitInsignia = u.insignia.url || null;
				}
			}

			leaderboard.push({
				id: c.id,
				firstName: c.firstName || '',
				lastName: c.lastName || '',
				callsign: c.callsign || null,
				unitName,
				unitInsignia,
				avatar,
				amount,
				delta,
			});
		}

		leaderboard.sort((a, b) => b.amount - a.amount);

		return NextResponse.json(
			{
				totalMoney,
				memberCount: linkedCharacterIds.size,
				history,
				leaderboard,
			},
			{
				headers: {
					'Cache-Control': 'no-store, no-cache, must-revalidate',
				},
			},
		);
	} catch (error) {
		console.error('Org stats error:', error);
		return NextResponse.json(
			{ totalMoney: 0, memberCount: 0, history: [], leaderboard: [] },
			{ headers: { 'Cache-Control': 'no-store' } },
		);
	}
}

// DELETE: Admin-only — reset the income graph by clearing all bank history
export async function DELETE(request: NextRequest) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	try {
		const payload = await getPayloadClient();

		// Delete all bank-history records (bulk delete)
		const deleteResult = await payload.delete({
			collection: 'bank-history',
			where: { id: { exists: true } },
		});
		const deleted = Array.isArray(deleteResult.docs) ? deleteResult.docs.length : 0;

		// Reset savedMoney on all characters
		const allChars = await payload.find({
			collection: 'characters',
			where: { savedMoney: { exists: true } },
			limit: 1000,
			depth: 0,
		});
		for (const c of allChars.docs) {
			if (c.savedMoney != null) {
				await payload.update({
					collection: 'characters',
					id: c.id,
					data: { savedMoney: null, lastMoneySyncAt: null },
				});
			}
		}

		void logAdminAction({
			session: auth.session,
			permissions: auth.permissions,
			action: 'org_stats.reset',
			summary: `A réinitialisé les statistiques de trésorerie (${deleted} entrées supprimées)`,
			entityType: 'org_stats',
			metadata: { deletedHistoryEntries: deleted },
			request,
		});

		return NextResponse.json({ success: true, deleted });
	} catch (error: any) {
		console.error('Reset org stats error:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
