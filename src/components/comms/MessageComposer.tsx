'use client';

import { useRef, useState } from 'react';
import {
	Info,
	X,
	Reply,
	HelpCircle,
	Paperclip,
	Send,
} from 'lucide-react';
import { AttachmentPicker } from './AttachmentPickers';
import type { CommsMessage } from './CommsLayout';

interface MentionMember {
	id: number;
	fullName: string;
	avatarUrl: string | null;
}

export function MessageComposer({
	onSend,
	disabled,
	replyingTo,
	onCancelReply,
	members,
	onTyping,
	viewerId,
	channelType,
}: {
	onSend: (payload: {
		body: string;
		isAnonymous: boolean;
		attachments: any[];
		replyToMessageId?: number | null;
	}) => void;
	disabled?: boolean;
	replyingTo?: CommsMessage | null;
	onCancelReply?: () => void;
	members?: MentionMember[];
	onTyping?: () => void;
	viewerId?: number;
	channelType?: string;
}) {
	const [body, setBody] = useState('');
	const [isAnonymous, setIsAnonymous] = useState(false);
	const [attachments, setAttachments] = useState<any[]>([]);
	const [showPicker, setShowPicker] = useState(false);
	const [showHints, setShowHints] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [mentionState, setMentionState] = useState<{
		open: boolean;
		anchor: number; // index of '@' in body
		query: string;
		highlight: number;
	}>({ open: false, anchor: -1, query: '', highlight: 0 });

	// Exclude self from the mention picker — pinging yourself is pointless and
	// would just create a self-notification loop.
	const allMembers = (members || []).filter((m) => m.id !== viewerId);
	const filteredMentions = mentionState.open
		? allMembers
				.filter((m) =>
					m.fullName.toLowerCase().includes(mentionState.query.toLowerCase()),
				)
				.slice(0, 8)
		: [];

	// Synthetic @everyone entry for non-DM channels. Shown while the user is
	// still typing a prefix of "everyone" (covers @, @e, @ev, …, @everyone).
	// Sits at the top of the suggestion list so it's the default Enter target.
	const showEveryone =
		mentionState.open &&
		channelType !== 'dm' &&
		'everyone'.startsWith(mentionState.query.toLowerCase());

	type MentionSuggestion =
		| { kind: 'everyone' }
		| { kind: 'member'; member: MentionMember };

	const suggestions: MentionSuggestion[] = [
		...(showEveryone ? [{ kind: 'everyone' as const }] : []),
		...filteredMentions.map(
			(member) => ({ kind: 'member' as const, member }),
		),
	];

	function detectMention(value: string, caret: number) {
		// Find '@' immediately before caret with no whitespace between
		let i = caret - 1;
		while (i >= 0) {
			const c = value[i];
			if (c === '@') {
				// Must be at start of body or preceded by whitespace
				if (i === 0 || /\s/.test(value[i - 1])) {
					const query = value.slice(i + 1, caret);
					// Stop if query already contains a space or newline
					if (/\s/.test(query)) return null;
					return { anchor: i, query };
				}
				return null;
			}
			if (/\s/.test(c)) return null;
			i--;
		}
		return null;
	}

	function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const value = e.target.value;
		setBody(value);
		// Throttle typing pings to ~once per 3s; the parent debounces further
		// at the network layer if needed.
		onTyping?.();
		const caret = e.target.selectionStart ?? value.length;
		const detected = detectMention(value, caret);
		if (detected) {
			setMentionState({
				open: true,
				anchor: detected.anchor,
				query: detected.query,
				highlight: 0,
			});
		} else if (mentionState.open) {
			setMentionState((s) => ({ ...s, open: false }));
		}
	}

	function insertMention(suggestion: MentionSuggestion) {
		if (mentionState.anchor < 0) return;
		const before = body.slice(0, mentionState.anchor);
		const afterStart = mentionState.anchor + 1 + mentionState.query.length;
		const after = body.slice(afterStart);
		const token =
			suggestion.kind === 'everyone'
				? '@everyone '
				: `@[${suggestion.member.fullName}](${suggestion.member.id}) `;
		const newBody = before + token + after;
		setBody(newBody);
		setMentionState({ open: false, anchor: -1, query: '', highlight: 0 });
		// Move caret to end of inserted token
		setTimeout(() => {
			const pos = (before + token).length;
			textareaRef.current?.focus();
			textareaRef.current?.setSelectionRange(pos, pos);
		}, 0);
	}

	function handleSubmit(e?: React.FormEvent) {
		if (e) e.preventDefault();
		if (!body.trim() && attachments.length === 0) return;
		onSend({
			body,
			isAnonymous,
			attachments,
			replyToMessageId: replyingTo?.id ?? null,
		});
		setBody('');
		setAttachments([]);
		setIsAnonymous(false);
		onCancelReply?.();
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		// Mention picker navigation takes precedence
		if (mentionState.open && suggestions.length > 0) {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setMentionState((s) => ({
					...s,
					highlight: (s.highlight + 1) % suggestions.length,
				}));
				return;
			}
			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setMentionState((s) => ({
					...s,
					highlight:
						(s.highlight - 1 + suggestions.length) % suggestions.length,
				}));
				return;
			}
			if (e.key === 'Enter' || e.key === 'Tab') {
				e.preventDefault();
				insertMention(suggestions[mentionState.highlight]);
				return;
			}
			if (e.key === 'Escape') {
				e.preventDefault();
				setMentionState((s) => ({ ...s, open: false }));
				return;
			}
		}
		// Enter sends, Shift+Enter inserts newline
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault();
			handleSubmit();
		}
	}

	return (
		<form className="comms-composer" onSubmit={handleSubmit}>
			<div className="comms-composer-disclaimer">
				<Info size={12} style={{ flexShrink: 0 }} />
				<span>
					Aucun message n&apos;est anonyme — toutes les communications sont
					enregistrées pour modération.
				</span>
			</div>
			{replyingTo && (
				<div className="comms-composer-reply">
					<div className="comms-composer-reply-text">
						<span className="comms-composer-reply-name">
							<Reply size={12} />
							<span>
								Réponse à{' '}
								{replyingTo.isAnonymous
									? '[ANONYME]'
									: replyingTo.senderCharacter?.fullName || '?'}
							</span>
						</span>
						<span className="comms-composer-reply-snippet">
							{(replyingTo.body || '').slice(0, 120)}
						</span>
					</div>
					<button
						type="button"
						className="comms-message-action"
						onClick={onCancelReply}
						title="Annuler la réponse"
						aria-label="Annuler la réponse"
					>
						<X size={12} />
					</button>
				</div>
			)}
			<div style={{ position: 'relative' }}>
				<textarea
					ref={textareaRef}
					value={body}
					onChange={handleBodyChange}
					onKeyDown={handleKeyDown}
					placeholder="Transmettre…"
					disabled={disabled}
					maxLength={4000}
				/>
				<button
					type="button"
					className="comms-composer-hint-btn"
					onClick={() => setShowHints((v) => !v)}
					title="Aide formatage"
					aria-label="Aide formatage"
					aria-expanded={showHints}
				>
					<HelpCircle size={14} />
				</button>
				{showHints && (
					<div className="comms-composer-hints" role="dialog">
						<div className="comms-composer-hints-header">
							<span>Raccourcis</span>
							<button
								type="button"
								className="comms-composer-hints-close"
								onClick={() => setShowHints(false)}
								aria-label="Fermer l'aide"
							>
								<X size={12} />
							</button>
						</div>
						<dl className="comms-composer-hints-list">
							<div className="comms-composer-hints-row">
								<dt>
									<kbd>Entrée</kbd>
								</dt>
								<dd>envoyer</dd>
							</div>
							<div className="comms-composer-hints-row">
								<dt>
									<kbd>Maj</kbd>
									<span aria-hidden>+</span>
									<kbd>Entrée</kbd>
								</dt>
								<dd>nouvelle ligne</dd>
							</div>
							<div className="comms-composer-hints-row">
								<dt>
									<kbd>@</kbd>
								</dt>
								<dd>mentionner</dd>
							</div>
						</dl>
						<div className="comms-composer-hints-divider" />
						<div className="comms-composer-hints-mdtitle">Markdown</div>
						<dl className="comms-composer-hints-list">
							<div className="comms-composer-hints-row">
								<dt>
									<code>**texte**</code>
								</dt>
								<dd>gras</dd>
							</div>
							<div className="comms-composer-hints-row">
								<dt>
									<code>*texte*</code>
								</dt>
								<dd>italique</dd>
							</div>
							<div className="comms-composer-hints-row">
								<dt>
									<code>`code`</code>
								</dt>
								<dd>code</dd>
							</div>
							<div className="comms-composer-hints-row">
								<dt>
									<code>&gt; texte</code>
								</dt>
								<dd>citation</dd>
							</div>
						</dl>
					</div>
				)}
				{mentionState.open && suggestions.length > 0 && (
					<div className="comms-mention-picker">
						{suggestions.map((s, idx) => {
							const isActive = idx === mentionState.highlight;
							if (s.kind === 'everyone') {
								return (
									<button
										key="everyone"
										type="button"
										className={`comms-mention-picker-item${isActive ? ' active' : ''}`}
										onMouseDown={(e) => {
											e.preventDefault();
											insertMention(s);
										}}
										onMouseEnter={() =>
											setMentionState((st) => ({ ...st, highlight: idx }))
										}
									>
										<span className="comms-mention-picker-avatar" aria-hidden>
											👥
										</span>
										<span>@everyone</span>
									</button>
								);
							}
							const m = s.member;
							return (
								<button
									key={m.id}
									type="button"
									className={`comms-mention-picker-item${isActive ? ' active' : ''}`}
									onMouseDown={(e) => {
										e.preventDefault();
										insertMention(s);
									}}
									onMouseEnter={() =>
										setMentionState((st) => ({ ...st, highlight: idx }))
									}
								>
									<span className="comms-mention-picker-avatar">
										{m.avatarUrl ? (
											<img src={m.avatarUrl} alt="" />
										) : (
											m.fullName.charAt(0)
										)}
									</span>
									<span>{m.fullName}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>
			{attachments.length > 0 && (
				<div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
					{attachments.map((a, idx) => (
						<div
							key={idx}
							style={{
								border: '1px solid var(--primary)',
								padding: '0.25rem 0.5rem',
								fontSize: '0.7rem',
								display: 'flex',
								alignItems: 'center',
								gap: '0.4rem',
							}}
						>
							<span>
								{a.kind.toUpperCase()}: {a.meta?.fullName || a.meta?.title || a.meta?.filename}
							</span>
							<button
								type="button"
								onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
								aria-label="Retirer la pièce jointe"
								style={{
									background: 'transparent',
									border: 'none',
									color: 'var(--danger)',
									cursor: 'pointer',
									display: 'flex',
									alignItems: 'center',
								}}
							>
								<X size={12} />
							</button>
						</div>
					))}
				</div>
			)}
			<div className="comms-composer-row">
				<button
					type="button"
					className="comms-icon-btn comms-icon-btn-with-icon comms-composer-attach-btn"
					onClick={() => setShowPicker(true)}
					disabled={disabled}
					title="Ajouter une pièce jointe"
				>
					<Paperclip size={14} />
					<span>Pièce jointe</span>
				</button>
				<label className="comms-composer-anon-label">
					<input
						type="checkbox"
						checked={isAnonymous}
						onChange={(e) => setIsAnonymous(e.target.checked)}
						disabled={disabled}
					/>
					<span className="comms-composer-anon-full">Envoyer anonymement</span>
					<span className="comms-composer-anon-short">Anon</span>
				</label>
				<button
					type="submit"
					className="comms-send-btn comms-icon-btn-with-icon"
					disabled={disabled || (!body.trim() && attachments.length === 0)}
					title="Transmettre le message"
				>
					<Send size={14} />
					<span>TRANSMETTRE</span>
				</button>
			</div>
			{showPicker && (
				<AttachmentPicker
					onClose={() => setShowPicker(false)}
					onPick={(a) => {
						setAttachments([...attachments, a]);
						setShowPicker(false);
					}}
				/>
			)}
		</form>
	);
}
