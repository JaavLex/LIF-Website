import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
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

		// Sum current money from all LIF characters that have a biId linked
		// Deduplicate by biId so characters sharing the same game account aren't counted twice
		let totalMoney = 0;
		const characterIds: number[] = [];
		const seenBiIds = new Set<string>();
		for (const c of characters.docs) {
			const biId = c.biId;
			if (!biId) continue; // skip unlinked characters
			if (seenBiIds.has(biId)) continue;
			seenBiIds.add(biId);
			characterIds.push(c.id);
			const money = c.savedMoney;
			if (typeof money === 'number' && money > 0) {
				totalMoney += money;
			}
		}

		// Get bank history for all LIF characters to build evolution over time
		// We group by day and compute the sum of latest amounts per character per day
		let history: { date: string; total: number }[] = [];

		if (characterIds.length > 0) {
			const bankHistory = await payload.find({
				collection: 'bank-history',
				where: {
					character: { in: characterIds.join(',') },
				},
				sort: 'createdAt',
				limit: 10000,
				depth: 0,
			});

			if (bankHistory.docs.length > 0) {
				// Build a timeline: for each record, update the character's known amount
				// then at each timestamp we can compute the org total
				// Map characterId -> biId for linked characters only
				const charBiId: Record<number, string | null> = {};
				for (const c of characters.docs) {
					if (c.biId) charBiId[c.id] = c.biId;
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
						// Compute org total, deduplicating by biId
						let sum = 0;
						const countedBiIds = new Set<string>();
						for (const id of characterIds) {
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
			memberCount: characterIds.length,
			history,
		});
	} catch (error) {
		console.error('Org stats error:', error);
		return NextResponse.json({ totalMoney: 0, memberCount: 0, history: [] });
	}
}
