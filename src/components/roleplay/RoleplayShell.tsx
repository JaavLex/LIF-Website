'use client';

import { useState, useEffect, useCallback } from 'react';
import { TerminalLoading } from './TerminalLoading';

interface RoleplayShellProps {
	children: React.ReactNode;
	loadingEnabled: boolean;
	loadingMessages?: string[];
}

const SESSION_KEY = 'lif-roleplay-loaded';

export function RoleplayShell({ children, loadingEnabled, loadingMessages }: RoleplayShellProps) {
	const [showLoading, setShowLoading] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		// Only show loading on first entry to roleplay section per session
		if (loadingEnabled && !sessionStorage.getItem(SESSION_KEY)) {
			setShowLoading(true);
		} else {
			setReady(true);
		}
	}, [loadingEnabled]);

	const handleLoadingComplete = useCallback(() => {
		sessionStorage.setItem(SESSION_KEY, '1');
		setShowLoading(false);
		setReady(true);
	}, []);

	if (showLoading) {
		return <TerminalLoading messages={loadingMessages} onComplete={handleLoadingComplete} />;
	}

	if (!ready) return null;

	return <>{children}</>;
}
