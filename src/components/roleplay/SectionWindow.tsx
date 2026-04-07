import { ReactNode } from 'react';

export type SectionTheme = 'primary' | 'accent' | 'danger' | 'gold';

interface SectionWindowProps {
	theme?: SectionTheme;
	number: string;
	eyebrow: string;
	title: string;
	meta?: ReactNode;
	tutorial?: string;
	children: ReactNode;
}

/**
 * Field-operations dossier window. Used for the four main roleplay sections
 * (personnel, organisations, intel, treasury). Each window has a jutting
 * title tab with section number, scanlines, corner brackets, and a clipped
 * bottom-right corner. Theme drives the accent color.
 */
export function SectionWindow({
	theme = 'primary',
	number,
	eyebrow,
	title,
	meta,
	tutorial,
	children,
}: SectionWindowProps) {
	return (
		<section
			className={`section-window section-window--${theme}`}
			data-tutorial={tutorial}
		>
			<div className="section-window-noise" aria-hidden />
			<div className="section-window-scan" aria-hidden />

			{/* corner ticks */}
			<span className="section-window-corner tl" aria-hidden />
			<span className="section-window-corner tr" aria-hidden />
			<span className="section-window-corner bl" aria-hidden />
			<span className="section-window-corner br" aria-hidden />

			<header className="section-window-head">
				<div className="section-window-tab">
					<span className="section-window-tab-num" aria-hidden>
						{number}
					</span>
					<span className="section-window-tab-divider" aria-hidden />
					<div className="section-window-tab-text">
						<span className="section-window-tab-eyebrow">{eyebrow}</span>
						<h2 className="section-window-tab-title">{title}</h2>
					</div>
				</div>
				{meta && (
					<div className="section-window-meta">
						<span className="section-window-meta-dot" aria-hidden />
						{meta}
					</div>
				)}
			</header>

			<div className="section-window-body">{children}</div>
		</section>
	);
}
