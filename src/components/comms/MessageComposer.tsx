'use client';

import { useState } from 'react';
import { AttachmentPicker } from './AttachmentPickers';

export function MessageComposer({
	onSend,
	disabled,
}: {
	onSend: (payload: { body: string; isAnonymous: boolean; attachments: any[] }) => void;
	disabled?: boolean;
}) {
	const [body, setBody] = useState('');
	const [isAnonymous, setIsAnonymous] = useState(false);
	const [attachments, setAttachments] = useState<any[]>([]);
	const [showPicker, setShowPicker] = useState(false);

	function handleSubmit(e?: React.FormEvent) {
		if (e) e.preventDefault();
		if (!body.trim() && attachments.length === 0) return;
		onSend({ body, isAnonymous, attachments });
		setBody('');
		setAttachments([]);
		setIsAnonymous(false);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		// Enter sends, Shift+Enter inserts newline
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			e.preventDefault();
			handleSubmit();
		}
	}

	return (
		<form className="comms-composer" onSubmit={handleSubmit}>
			<div className="comms-composer-disclaimer">
				ⓘ Aucun message n&apos;est anonyme — toutes les communications sont
				enregistrées pour modération.
			</div>
			<textarea
				value={body}
				onChange={(e) => setBody(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Transmettre... (Entrée = envoyer · Maj+Entrée = retour ligne · markdown: **gras** *italique* `code` &gt; quote)"
				disabled={disabled}
				maxLength={4000}
			/>
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
								style={{
									background: 'transparent',
									border: 'none',
									color: 'var(--danger)',
									cursor: 'pointer',
								}}
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}
			<div className="comms-composer-row">
				<button
					type="button"
					className="comms-icon-btn"
					onClick={() => setShowPicker(true)}
					disabled={disabled}
				>
					+ Pièce jointe
				</button>
				<label>
					<input
						type="checkbox"
						checked={isAnonymous}
						onChange={(e) => setIsAnonymous(e.target.checked)}
						disabled={disabled}
					/>
					Envoyer anonymement
				</label>
				<button
					type="submit"
					className="comms-send-btn"
					disabled={disabled || (!body.trim() && attachments.length === 0)}
				>
					TRANSMETTRE
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
