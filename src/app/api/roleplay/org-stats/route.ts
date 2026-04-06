import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireFullAdmin, isErrorResponse } from '@/lib/api-auth';
import type { Character } from '@/payload-types';

export const dynamic = 'force-dynamic';

export async function GET() {
	try {
		const payload = await getPayloadClient();

		// Get all LIF faction characters (non-archived, non-target) with their money
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
			depth: 0,
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

				// Group by day — keep last data point per day
				const dayMap = new Map<string, number>();
				for (const dp of dataPoints) {
					const dayKey = dp.date.toISOString().slice(0, 10);
					dayMap.set(dayKey, dp.total);
				}

				history = Array.from(dayMap.entries())
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([date, total]) => ({ date, total }));
			}
		}

		return NextResponse.json({
			totalMoney,
			memberCount: linkedCharacterIds.size,
			history,
		});
	} catch (error) {
		console.error('Org stats error:', error);
		return NextResponse.json({ totalMoney: 0, memberCount: 0, history: [] });
	}
}

// DELETE: Admin-only — reset the income graph by clearing all bank history
export async function DELETE(request: NextRequest) {
	const auth = await requireFullAdmin(request);
	if (isErrorResponse(auth)) return auth;

	try {
		const payload = await getPayloadClient();

		// Delete all bank-history records
		const allHistory = await payload.find({
			collection: 'bank-history',
			limit: 0,
			depth: 0,
		});

		let deleted = 0;
		for (const entry of allHistory.docs) {
			await payload.delete({ collection: 'bank-history', id: entry.id });
			deleted++;
		}

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

		return NextResponse.json({ success: true, deleted });
	} catch (error: any) {
		console.error('Reset org stats error:', error);
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
