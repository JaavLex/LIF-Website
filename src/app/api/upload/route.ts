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

		// Validate file type — accept images, video, audio and PDF.
		// SVG is rejected to prevent XSS via inline <script>.
		const isImage = file.type.startsWith('image/');
		const isVideo = file.type.startsWith('video/');
		const isAudio = file.type.startsWith('audio/');
		const isPdf = file.type === 'application/pdf';
		if (file.type.includes('svg') || (!isImage && !isVideo && !isAudio && !isPdf)) {
			return NextResponse.json(
				{ message: 'Type de fichier non autorisé (images, vidéos, audio ou PDF uniquement, hors SVG)' },
				{ status: 400 },
			);
		}

		// Per-type size caps. Nginx itself caps the request body at 50 MB.
		const MB = 1024 * 1024;
		const maxBytes = isImage ? 10 * MB : 50 * MB;
		if (file.size > maxBytes) {
			const maxMb = Math.round(maxBytes / MB);
			return NextResponse.json(
				{ message: `Le fichier est trop volumineux (max ${maxMb} Mo)` },
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
