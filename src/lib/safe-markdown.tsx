import React from 'react';

/**
 * Tiny safe markdown renderer.
 *
 * Supports: **bold**, *italic*, `code`, [links](url), > quotes,
 * - lists, # headings, paragraphs, line breaks. HTML is never rendered —
 * React text nodes auto-escape. Links are restricted to http(s) and forced
 * to open in a new tab with rel=noopener,noreferrer.
 *
 * No external deps so the package can ship without adding to the bundle.
 */

function renderInline(text: string): React.ReactNode[] {
	const out: React.ReactNode[] = [];
	let i = 0;
	let key = 0;
	// React already escapes text content placed in JSX children, so we operate
	// on the raw source. Pre-escaping (&quot;, &amp;, …) would result in
	// literal entity strings being shown to the user.
	const safe = text;

	while (i < safe.length) {
		const slice = safe.slice(i);
		const code = slice.match(/^`([^`\n]+)`/);
		if (code) {
			out.push(
				<code key={key++} className="comms-md-code">
					{code[1]}
				</code>,
			);
			i += code[0].length;
			continue;
		}
		const bold = slice.match(/^\*\*([^*]+)\*\*/);
		if (bold) {
			out.push(<strong key={key++}>{renderInline(bold[1])}</strong>);
			i += bold[0].length;
			continue;
		}
		const italic = slice.match(/^\*([^*]+)\*/);
		if (italic) {
			out.push(<em key={key++}>{renderInline(italic[1])}</em>);
			i += italic[0].length;
			continue;
		}
		// @mention: @[Name](id) — id must be a positive integer
		const mention = slice.match(/^@\[([^\]]+)\]\((\d+)\)/);
		if (mention) {
			out.push(
				<span key={key++} className="comms-mention" data-character-id={mention[2]}>
					@{mention[1]}
				</span>,
			);
			i += mention[0].length;
			continue;
		}
		const link = slice.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
		if (link) {
			out.push(
				<a
					key={key++}
					href={link[2]}
					target="_blank"
					rel="noopener noreferrer"
					className="comms-md-link"
				>
					{link[1]}
				</a>,
			);
			i += link[0].length;
			continue;
		}
		out.push(safe[i]);
		i++;
	}
	const merged: React.ReactNode[] = [];
	for (const node of out) {
		if (typeof node === 'string' && typeof merged[merged.length - 1] === 'string') {
			merged[merged.length - 1] = (merged[merged.length - 1] as string) + node;
		} else {
			merged.push(node);
		}
	}
	return merged;
}

export function SafeMarkdown({ source }: { source: string }) {
	if (!source) return null;
	const lines = source.split('\n');
	const blocks: React.ReactNode[] = [];
	let i = 0;
	let key = 0;

	while (i < lines.length) {
		const line = lines[i];

		const heading = line.match(/^(#{1,3})\s+(.*)$/);
		if (heading) {
			const level = heading[1].length;
			const Tag = (`h${Math.min(level + 2, 6)}` as unknown) as keyof React.JSX.IntrinsicElements;
			blocks.push(
				<Tag key={key++} className="comms-md-h">
					{renderInline(heading[2])}
				</Tag>,
			);
			i++;
			continue;
		}

		if (line.startsWith('> ')) {
			const quoteLines: string[] = [];
			while (i < lines.length && lines[i].startsWith('> ')) {
				quoteLines.push(lines[i].slice(2));
				i++;
			}
			blocks.push(
				<blockquote key={key++} className="comms-md-quote">
					{renderInline(quoteLines.join('\n'))}
				</blockquote>,
			);
			continue;
		}

		if (/^[-*]\s+/.test(line)) {
			const items: string[] = [];
			while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
				items.push(lines[i].replace(/^[-*]\s+/, ''));
				i++;
			}
			blocks.push(
				<ul key={key++} className="comms-md-ul">
					{items.map((it, idx) => (
						<li key={idx}>{renderInline(it)}</li>
					))}
				</ul>,
			);
			continue;
		}

		if (line.trim() === '') {
			i++;
			continue;
		}

		const paraLines: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() !== '' &&
			!/^(#{1,3})\s+/.test(lines[i]) &&
			!lines[i].startsWith('> ') &&
			!/^[-*]\s+/.test(lines[i])
		) {
			paraLines.push(lines[i]);
			i++;
		}
		blocks.push(
			<p key={key++} className="comms-md-p">
				{renderInline(paraLines.join('\n'))}
			</p>,
		);
	}

	return <div className="comms-md">{blocks}</div>;
}
