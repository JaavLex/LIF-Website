import { NextRequest, NextResponse } from 'next/server';
import { getPayloadClient } from '@/lib/payload';
import { verifySession } from '@/lib/session';

export async function POST(request: NextRequest) {
	const token = request.cookies.get('roleplay-session')?.value;
	if (!token) {
		return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
	}

	const session = verifySession(token);
	if (!session) {
		return NextResponse.json({ message: 'Session invalide' }, { status: 401 });
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const alt = (formData.get('alt') as string) || 'Image uploadée';

		if (!file) {
			return NextResponse.json({ message: 'Aucun fichier fourni' }, { status: 400 });
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			return NextResponse.json(
				{ message: 'Seules les images sont acceptées' },
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
	} catch (error: any) {
		console.error('Upload error:', error);
		return NextResponse.json(
			{ message: error.message || "Erreur lors de l'upload" },
			{ status: 500 },
		);
	}
}
