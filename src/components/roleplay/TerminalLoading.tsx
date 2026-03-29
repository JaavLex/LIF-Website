'use client';

import { useState, useEffect, useCallback } from 'react';

interface TerminalLoadingProps {
	messages?: string[];
	onComplete: () => void;
}

const DEFAULT_MESSAGES = [
	'Chargement de la base de données...',
	'Authentification Discord...',
	'Vérification des habilitations...',
	'Synchronisation des dossiers...',
	'Accès autorisé.',
];

export function TerminalLoading({ messages = DEFAULT_MESSAGES, onComplete }: TerminalLoadingProps) {
	const effectiveMessages = messages.length > 0 ? messages : DEFAULT_MESSAGES;
	const [visibleLines, setVisibleLines] = useState<string[]>([]);
	const [currentIndex, setCurrentIndex] = useState(0);
	const [typing, setTyping] = useState('');
	const [charIndex, setCharIndex] = useState(0);
	const [complete, setComplete] = useState(false);

	const currentMessage = effectiveMessages[currentIndex];

	// Safety timeout — force complete after 15 seconds max
	useEffect(() => {
		const timer = setTimeout(() => {
			if (!complete) {
				setComplete(true);
			}
		}, 15000);
		return () => clearTimeout(timer);
	}, [complete]);

	// Typing effect
	useEffect(() => {
		if (complete || !currentMessage) return;

		if (charIndex < currentMessage.length) {
			const speed = 20 + Math.random() * 40;
			const timer = setTimeout(() => {
				setTyping(currentMessage.slice(0, charIndex + 1));
				setCharIndex(charIndex + 1);
			}, speed);
			return () => clearTimeout(timer);
		} else {
			// Line complete, wait then move to next
			const delay = 200 + Math.random() * 600;
			const timer = setTimeout(() => {
				setVisibleLines(prev => [...prev, currentMessage]);
				setTyping('');
				setCharIndex(0);

				if (currentIndex + 1 < effectiveMessages.length) {
					setCurrentIndex(currentIndex + 1);
				} else {
					setComplete(true);
				}
			}, delay);
			return () => clearTimeout(timer);
		}
	}, [charIndex, currentIndex, currentMessage, effectiveMessages, complete]);

	// Fade out after completion
	useEffect(() => {
		if (complete) {
			const timer = setTimeout(() => {
				onComplete();
			}, 800);
			return () => clearTimeout(timer);
		}
	}, [complete, onComplete]);

	return (
		<div className={`terminal-loading-overlay ${complete ? 'fade-out' : ''}`}>
			<div className="terminal-loading-screen">
				<div className="terminal-loading-header">
					<span className="terminal-loading-logo">LIF</span>
					<span className="terminal-loading-version">SYSTÈME v2.0</span>
				</div>
				<div className="terminal-loading-content">
					{visibleLines.map((line, i) => (
						<div key={i} className="terminal-loading-line completed">
							<span className="terminal-loading-prefix">&gt;</span>
							<span>{line}</span>
							<span className="terminal-loading-check">✓</span>
						</div>
					))}
					{typing && (
						<div className="terminal-loading-line active">
							<span className="terminal-loading-prefix">&gt;</span>
							<span>{typing}</span>
							<span className="terminal-cursor">█</span>
						</div>
					)}
				</div>
				{complete && (
					<div className="terminal-loading-access">
						ACCÈS AUTORISÉ — BIENVENUE
					</div>
				)}
			</div>
			<div className="terminal-loading-scanlines" />
		</div>
	);
}
