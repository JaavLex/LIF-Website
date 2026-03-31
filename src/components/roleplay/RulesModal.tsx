'use client';

import { useState, useEffect, useRef } from 'react';

const RULES_ACCEPTED_KEY = 'lif-rp-rules-accepted';

function renderMarkdown(md: string): string {
	let html = md
		// Escape HTML
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		// No special password markers to restore since password is injected as plain text;

	// Process line by line
	const lines = html.split('\n');
	const result: string[] = [];
	let inList = false;

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];

		// Horizontal rules
		if (/^---+\s*$/.test(line)) {
			if (inList) { result.push('</ul>'); inList = false; }
			result.push('<hr class="rules-hr" />');
			continue;
		}

		// Headers
		if (line.startsWith('### ')) {
			if (inList) { result.push('</ul>'); inList = false; }
			const text = line.slice(4).replace(/\*\*/g, '');
			result.push(`<h4 class="rules-section-subtitle">${text}</h4>`);
			continue;
		}
		if (line.startsWith('## ')) {
			if (inList) { result.push('</ul>'); inList = false; }
			const text = line.slice(3).replace(/\*\*/g, '');
			result.push(`<h3 class="rules-section-title">${text}</h3>`);
			continue;
		}
		if (line.startsWith('# ')) {
			if (inList) { result.push('</ul>'); inList = false; }
			const text = line.slice(2).replace(/\*\*/g, '');
			result.push(`<h2 class="rules-main-title">${text}</h2>`);
			continue;
		}

		// List items
		if (/^[-*]\s/.test(line)) {
			if (!inList) { result.push('<ul class="rules-list">'); inList = true; }
			const text = applyInline(line.slice(2));
			result.push(`<li>${text}</li>`);
			continue;
		}

		// Close list if we hit a non-list line
		if (inList && line.trim() !== '') {
			result.push('</ul>');
			inList = false;
		}

		// Empty lines
		if (line.trim() === '') {
			if (inList) { result.push('</ul>'); inList = false; }
			result.push('<div class="rules-spacer"></div>');
			continue;
		}

		// Regular paragraph
		result.push(`<p>${applyInline(line)}</p>`);
	}

	if (inList) result.push('</ul>');

	return result.join('\n');
}

function applyInline(text: string): string {
	return text
		// Bold
		.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
		// Italic
		.replace(/_([^_]+)_/g, '<em>$1</em>')
		// Trailing line breaks (double space)
		.replace(/ {2}$/g, '');
}

export function RulesModal() {
	const [visible, setVisible] = useState(false);
	const [requirePassword, setRequirePassword] = useState(false);
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
	const [rulesHtml, setRulesHtml] = useState('');
	const [loading, setLoading] = useState(true);
	const contentRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const accepted = localStorage.getItem(RULES_ACCEPTED_KEY);
		if (!accepted) {
			setVisible(true);
			setRequirePassword(true);
		}
	}, []);

	// Fetch rules content
	useEffect(() => {
		if (!visible) return;
		setLoading(true);
		fetch('/api/roleplay/verify-rules')
			.then(res => res.json())
			.then(data => {
				setRulesHtml(renderMarkdown(data.content || ''));
			})
			.catch(() => setRulesHtml('<p>Erreur de chargement du règlement.</p>'))
			.finally(() => setLoading(false));
	}, [visible]);

	// Listen for custom event to reopen modal (from tutorial buttons)
	useEffect(() => {
		const handler = () => {
			setRequirePassword(false);
			setPassword('');
			setError('');
			setHasScrolledToBottom(false);
			setVisible(true);
		};
		window.addEventListener('open-rules-modal', handler);
		return () => window.removeEventListener('open-rules-modal', handler);
	}, []);

	useEffect(() => {
		if (visible) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => { document.body.style.overflow = ''; };
	}, [visible]);

	const handleScroll = () => {
		if (!contentRef.current) return;
		const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
		if (scrollTop + clientHeight >= scrollHeight - 30) {
			setHasScrolledToBottom(true);
		}
	};

	const handleAccept = async () => {
		if (!requirePassword) {
			setVisible(false);
			return;
		}

		if (!password.trim()) {
			setError('Veuillez entrer le mot de passe.');
			return;
		}

		setSubmitting(true);
		setError('');

		try {
			const res = await fetch('/api/roleplay/verify-rules', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: password.trim() }),
			});

			const data = await res.json();

			if (data.valid) {
				localStorage.setItem(RULES_ACCEPTED_KEY, Date.now().toString());
				setVisible(false);
			} else {
				setError('Mot de passe incorrect. Lisez attentivement le règlement.');
			}
		} catch {
			setError('Erreur de vérification. Réessayez.');
		} finally {
			setSubmitting(false);
		}
	};

	if (!visible) return null;

	return (
		<div className="rules-modal-overlay">
			<div className="rules-modal">
				<div className="rules-modal-header">
					<div className="terminal-header-dots" style={{ marginRight: '0.75rem' }}>
						<span className="terminal-dot green" />
						<span className="terminal-dot yellow" />
						<span className="terminal-dot red" />
					</div>
					<span style={{ fontWeight: 700, letterSpacing: '0.1em' }}>
						RÈGLEMENT ROLEPLAY — LECTURE OBLIGATOIRE
					</span>
				</div>

				<div
					className="rules-modal-content"
					ref={contentRef}
					onScroll={handleScroll}
				>
					<div className="rules-intro">
						<p>Bienvenue sur le serveur RP de la <strong>Légion Internationale Francophone</strong>.</p>
						<p>Veuillez lire attentivement l&apos;intégralité du règlement ci-dessous avant de continuer.</p>
						{requirePassword && (
							<p className="rules-password-hint">
								⚠ Un mot de passe est caché dans le règlement. Vous devrez le trouver et le saisir pour confirmer votre lecture.
							</p>
						)}
					</div>

					{loading ? (
						<p style={{ textAlign: 'center', color: 'var(--muted)' }}>Chargement du règlement...</p>
					) : (
						<div
							className="rules-markdown-content"
							dangerouslySetInnerHTML={{ __html: rulesHtml }}
						/>
					)}
				</div>

				<div className="rules-modal-footer">
					{requirePassword ? (
						<>
							{error && <div className="rules-error">{error}</div>}
							<div className="rules-password-row">
								<label className="rules-password-label">
									Mot de passe trouvé dans le règlement :
								</label>
								<input
									type="text"
									value={password}
									onChange={e => { setPassword(e.target.value); setError(''); }}
									className="filter-input rules-password-input"
									placeholder="Entrez le mot de passe..."
									disabled={submitting}
									onKeyDown={e => { if (e.key === 'Enter') handleAccept(); }}
								/>
							</div>
							<button
								type="button"
								className="rules-accept-btn"
								onClick={handleAccept}
								disabled={submitting || !hasScrolledToBottom}
								title={!hasScrolledToBottom ? 'Veuillez lire tout le règlement' : ''}
							>
								{submitting ? 'Vérification...' : !hasScrolledToBottom ? 'LISEZ TOUT LE RÈGLEMENT ▼' : 'J\'ACCEPTE LE RÈGLEMENT'}
							</button>
						</>
					) : (
						<button
							type="button"
							className="rules-accept-btn"
							onClick={() => setVisible(false)}
						>
							FERMER
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
