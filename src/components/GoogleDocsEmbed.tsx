interface GoogleDocsEmbedProps {
	title?: string;
	googleDocsUrl: string;
	height?: number;
}

export function GoogleDocsEmbed({
	title,
	googleDocsUrl,
	height = 800,
}: GoogleDocsEmbedProps) {
	// Convert Google Docs URL to embed URL
	const getEmbedUrl = (url: string): string => {
		// Handle different Google Docs URL formats
		// https://docs.google.com/document/d/DOCUMENT_ID/edit
		// https://docs.google.com/document/d/DOCUMENT_ID/preview
		// https://docs.google.com/document/d/e/DOCUMENT_ID/pub
		
		const docIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
		const pubMatch = url.match(/\/d\/e\/([a-zA-Z0-9_-]+)\/pub/);
		
		if (pubMatch) {
			// Already a published URL, use as-is with embedded=true
			return url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`;
		}
		
		if (docIdMatch) {
			const docId = docIdMatch[1];
			// Use preview mode for better embedded experience
			return `https://docs.google.com/document/d/${docId}/preview`;
		}
		
		// Fallback: return original URL
		return url;
	};

	const embedUrl = getEmbedUrl(googleDocsUrl);

	return (
		<div className="google-docs-embed">
			{title && <h2 className="google-docs-title">{title}</h2>}
			<div className="google-docs-container">
				<iframe
					src={embedUrl}
					width="100%"
					height={height}
					frameBorder="0"
					allowFullScreen
					title={title || 'Google Docs Document'}
					style={{
						border: '1px solid rgba(255, 255, 255, 0.1)',
						borderRadius: '8px',
						backgroundColor: '#fff',
					}}
				/>
			</div>
		</div>
	);
}
