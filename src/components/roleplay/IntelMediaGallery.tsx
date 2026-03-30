'use client';

import { useState } from 'react';
import Image from 'next/image';

interface MediaItem {
	file: { url: string; mimeType?: string };
	caption?: string;
}

export function IntelMediaGallery({ media }: { media: MediaItem[] }) {
	const [modalImage, setModalImage] = useState<string | null>(null);

	return (
		<>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
					gap: '1rem',
				}}
			>
				{media.map((m, i) => (
					<div
						key={i}
						style={{
							border: '1px solid var(--border)',
							background: 'var(--bg)',
							overflow: 'hidden',
						}}
					>
						{m.file.mimeType?.startsWith('image/') ? (
							<Image
								src={m.file.url}
								alt={m.caption || ''}
								width={600}
								height={400}
								style={{
									width: '100%',
									height: 'auto',
									objectFit: 'cover',
									cursor: 'pointer',
									maxHeight: '400px',
								}}
								unoptimized
								onClick={() => setModalImage(m.file.url)}
							/>
						) : m.file.mimeType?.startsWith('audio/') ? (
							<div style={{ padding: '1rem' }}>
								<audio controls style={{ width: '100%' }} preload="metadata">
									<source src={m.file.url} type={m.file.mimeType} />
								</audio>
							</div>
						) : (
							<div style={{ padding: '1rem', textAlign: 'center' }}>
								<a
									href={m.file.url}
									target="_blank"
									rel="noopener noreferrer"
									style={{ color: 'var(--primary)', fontSize: '0.9rem' }}
								>
									📎 {m.caption || 'Télécharger le fichier'}
								</a>
							</div>
						)}
						{m.caption && (
							<div
								style={{
									padding: '0.5rem 0.75rem',
									fontSize: '0.85rem',
									color: 'var(--muted)',
									borderTop: '1px solid var(--border)',
								}}
							>
								{m.caption}
							</div>
						)}
					</div>
				))}
			</div>

			{modalImage && (
				<div
					style={{
						position: 'fixed',
						top: 0,
						left: 0,
						right: 0,
						bottom: 0,
						background: 'rgba(0, 0, 0, 0.85)',
						zIndex: 9999,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						cursor: 'pointer',
					}}
					onClick={() => setModalImage(null)}
				>
					<div
						style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
						onClick={e => e.stopPropagation()}
					>
						<button
							onClick={() => setModalImage(null)}
							style={{
								position: 'absolute',
								top: '-2rem',
								right: '-0.5rem',
								background: 'none',
								border: 'none',
								color: '#fff',
								fontSize: '1.5rem',
								cursor: 'pointer',
								lineHeight: 1,
							}}
						>
							✕
						</button>
						<Image
							src={modalImage}
							alt=""
							width={1200}
							height={900}
							style={{
								objectFit: 'contain',
								maxWidth: '90vw',
								maxHeight: '90vh',
								width: 'auto',
								height: 'auto',
							}}
							unoptimized
						/>
					</div>
				</div>
			)}
		</>
	);
}
