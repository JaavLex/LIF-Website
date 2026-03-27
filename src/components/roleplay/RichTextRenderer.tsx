import React from 'react';

interface LexicalNode {
	type: string;
	text?: string;
	format?: number;
	children?: LexicalNode[];
	tag?: string;
	listType?: string;
	url?: string;
	direction?: string;
	indent?: number;
}

interface LexicalContent {
	root: LexicalNode;
}

function renderNode(node: LexicalNode, index: number): React.ReactNode {
	if (node.type === 'text') {
		let content: React.ReactNode = node.text || '';
		if (node.format) {
			if (node.format & 1) content = <strong key={`b-${index}`}>{content}</strong>;
			if (node.format & 2) content = <em key={`i-${index}`}>{content}</em>;
			if (node.format & 4) content = <s key={`s-${index}`}>{content}</s>;
			if (node.format & 8) content = <u key={`u-${index}`}>{content}</u>;
			if (node.format & 16) content = <code key={`c-${index}`}>{content}</code>;
		}
		return content;
	}

	const children = node.children?.map((child, i) => renderNode(child, i));

	switch (node.type) {
		case 'paragraph':
			return <p key={index}>{children}</p>;
		case 'heading': {
			const tag = node.tag || 'h2';
			if (tag === 'h1') return <h1 key={index}>{children}</h1>;
			if (tag === 'h3') return <h3 key={index}>{children}</h3>;
			if (tag === 'h4') return <h4 key={index}>{children}</h4>;
			if (tag === 'h5') return <h5 key={index}>{children}</h5>;
			if (tag === 'h6') return <h6 key={index}>{children}</h6>;
			return <h2 key={index}>{children}</h2>;
		}
		case 'list':
			if (node.listType === 'number') return <ol key={index}>{children}</ol>;
			return <ul key={index}>{children}</ul>;
		case 'listitem':
			return <li key={index}>{children}</li>;
		case 'link':
			return (
				<a key={index} href={node.url} target="_blank" rel="noopener noreferrer">
					{children}
				</a>
			);
		case 'quote':
			return <blockquote key={index}>{children}</blockquote>;
		case 'linebreak':
			return <br key={index} />;
		case 'root':
			return <>{children}</>;
		default:
			return <div key={index}>{children}</div>;
	}
}

export function RichTextRenderer({
	content,
}: {
	content: LexicalContent | string | null | undefined;
}) {
	if (!content) return null;
	// Handle plain text strings (from old data or invalid saves)
	if (typeof content === 'string') {
		return (
			<>
				{content.split('\n').map((line, i) => (
					<p key={i}>{line}</p>
				))}
			</>
		);
	}
	if (!content.root) return null;
	return <>{renderNode(content.root, 0)}</>;
}
