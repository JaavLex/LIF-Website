import { NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';

// Lightweight endpoint for the ambient background animation
// Returns random characters (with target info) and intel snippets
export async function GET() {
	try {
		const payload = await getPayloadClient();

		// Fetch characters (targets + some regulars)
		const [targets, regulars, intelDocs] = await Promise.all([
			payload.find({
				collection: 'characters',
				where: {
					isTarget: { equals: true },
					isArchived: { not_equals: true },
				},
				limit: 10,
				depth: 1,
			}),
			payload.find({
				collection: 'characters',
				where: {
					isTarget: { not_equals: true },
					isArchived: { not_equals: true },
					classification: { not_equals: 'classified' },
				},
				limit: 15,
				depth: 1,
				sort: '-createdAt',
			}),
			payload.find({
				collection: 'intelligence',
				limit: 10,
				depth: 1,
				sort: '-date',
			}),
		]);

		const characters = [...targets.docs, ...regulars.docs].map((c: any) => ({
			id: c.id,
			firstName: c.firstName,
			lastName: c.lastName,
			militaryId: c.militaryId,
			status: c.status,
			faction: c.faction,
			isTarget: c.isTarget || false,
			targetFaction: c.targetFaction || null,
			threatLevel: c.threatLevel || null,
			rank: typeof c.rank === 'object' ? c.rank?.abbreviation || c.rank?.name : null,
			avatar: typeof c.avatar === 'object' ? c.avatar?.url : null,
		}));

		const intel = intelDocs.docs.map((i: any) => ({
			id: i.id,
			title: i.title,
			type: i.type,
			date: i.date,
			coordinates: i.coordinates || null,
			status: i.status,
			classification: i.classification,
			linkedTarget: i.linkedTarget
				? {
						firstName:
							typeof i.linkedTarget === 'object' ? i.linkedTarget.firstName : null,
						lastName:
							typeof i.linkedTarget === 'object' ? i.linkedTarget.lastName : null,
						avatar:
							typeof i.linkedTarget === 'object' &&
							typeof i.linkedTarget.avatar === 'object'
								? i.linkedTarget.avatar?.url
								: null,
					}
				: null,
			media:
				i.media?.slice(0, 1).map((m: any) => ({
					url: typeof m.file === 'object' ? m.file?.url : null,
					caption: m.caption,
				})) || [],
		}));

		return NextResponse.json({ characters, intel });
	} catch (error: any) {
		console.error('Ambient data error:', error);
		return NextResponse.json({ characters: [], intel: [] });
	}
}
