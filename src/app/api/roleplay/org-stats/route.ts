import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';

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

		// Sum current money from all LIF characters (including anonymous ones)
		// Deduplicate by biId so characters sharing the same game account aren't counted twice
		let totalMoney = 0;
		const characterIds: number[] = [];
		const seenBiIds = new Set<string>();
		for (const c of characters.docs) {
			characterIds.push(c.id as number);
			const biId = (c as any).biId as string | undefined;
			if (biId && seenBiIds.has(biId)) continue;
			if (biId) seenBiIds.add(biId);
			const money = (c as any).savedMoney;
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
				// Deduplicate by biId: map characterId -> biId, only count one char per biId
				const charBiId: Record<number, string | null> = {};
				for (const c of characters.docs) {
					charBiId[c.id as number] = (c as any).biId || null;
				}

				const charAmounts: Record<number, number> = {};
				const dataPoints: { date: Date; total: number }[] = [];

				for (const entry of bankHistory.docs) {
					const charId =
						typeof entry.character === 'number'
							? entry.character
							: (entry.character as any)?.id;
					const amount = (entry as any).amount as number;
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
			memberCount: characters.totalDocs,
			history,
		});
	} catch (error) {
		console.error('Org stats error:', error);
		return NextResponse.json({ totalMoney: 0, memberCount: 0, history: [] });
	}
}
