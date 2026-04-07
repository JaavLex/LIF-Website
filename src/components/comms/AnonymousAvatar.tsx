/**
 * Mysterious avatar shown for anonymous senders. A hooded silhouette with a
 * red-glowing eye, rendered as inline SVG so it scales cleanly to any size.
 */
export function AnonymousAvatar({ size = 36 }: { size?: number }) {
	return (
		<div
			aria-label="Expéditeur anonyme"
			title="Expéditeur anonyme"
			style={{
				width: size,
				height: size,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background:
					'radial-gradient(circle at 50% 35%, #2a0202 0%, #0a0000 70%, #000 100%)',
				border: '1px solid #5a0000',
				boxShadow: 'inset 0 0 8px rgba(255, 0, 0, 0.35), 0 0 6px rgba(255, 0, 0, 0.25)',
				flexShrink: 0,
				overflow: 'hidden',
			}}
		>
			<svg
				viewBox="0 0 36 36"
				width={size * 0.78}
				height={size * 0.78}
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				{/* Hood silhouette */}
				<path
					d="M18 4 C 9 4, 4 12, 5 22 L 6 30 C 6 32, 8 33, 10 33 L 26 33 C 28 33, 30 32, 30 30 L 31 22 C 32 12, 27 4, 18 4 Z"
					fill="#0a0a0a"
					stroke="#3a0000"
					strokeWidth="0.8"
				/>
				{/* Inner shadow face cavity */}
				<ellipse cx="18" cy="20" rx="8" ry="9" fill="#000" />
				{/* Two glowing red eyes under the hood */}
				<circle cx="14.5" cy="19" r="1.5" fill="#ff2a2a" />
				<circle cx="14.5" cy="19" r="2.8" fill="#ff2a2a" opacity="0.25" />
				<circle cx="21.5" cy="19" r="1.5" fill="#ff2a2a" />
				<circle cx="21.5" cy="19" r="2.8" fill="#ff2a2a" opacity="0.25" />
			</svg>
		</div>
	);
}
