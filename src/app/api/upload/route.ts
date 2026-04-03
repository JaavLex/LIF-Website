import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { requireSession, isErrorResponse } from '@/lib/api-auth';

export async function POST(request: NextRequest) {
	const sessionResult = await requireSession(request);
	if (isErrorResponse(sessionResult)) return sessionResult;

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const alt = (formData.get('alt') as string) || 'Image uploadée';

		if (!file) {
			return NextResponse.json({ message: 'Aucun fichier fourni' }, { status: 400 });
		}

		// Validate file type — reject SVG to prevent XSS
		if (!file.type.startsWith('image/') || file.type.includes('svg')) {
			return NextResponse.json(
				{ message: 'Seules les images (hors SVG) sont acceptées' },
				{ status: 400 },
			);
		}

		// Limit file size to 5MB
		if (file.size > 5 * 1024 * 1024) {
			return NextResponse.json(
				{ message: 'Le fichier est trop volumineux (max 5 Mo)' },
				{ status: 400 },
			);
		}

		const payload = await getPayloadClient();

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		const doc = await payload.create({
			collection: 'media',
			data: { alt },
			file: {
				data: buffer,
				mimetype: file.type,
				name: file.name,
				size: file.size,
			},
		});

		return NextResponse.json({ id: doc.id, url: doc.url });
	} catch (error: unknown) {
		console.error('Upload error:', error);
		const message = error instanceof Error ? error.message : "Erreur lors de l'upload";
		return NextResponse.json({ message }, { status: 500 });
	}
}
