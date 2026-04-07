'use client';

import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from 'react';

/**
 * Shared positioning hook for the tactical tutorial overlay (used by both
 * RoleplayTutorial and CommsTutorial).
 *
 * Measures the actual rendered tooltip size via the returned `tooltipRef`,
 * resolves the best side around the target (preferring the requested side,
 * falling back to the side with the most space, and finally to centering),
 * and hard-clamps the final top/left so the entire card always remains
 * visible — even on tall steps with dummy forms (the tutorial body is
 * expected to scroll internally).
 */

export interface TutorialStepLike {
	target: string | null;
	position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export function useTutorialPositioning(
	active: boolean,
	currentStep: number,
	steps: TutorialStepLike[],
) {
	const tooltipRef = useRef<HTMLDivElement>(null);
	const animatingRef = useRef(false);
	const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

	const positionTooltip = useCallback(
		(step: TutorialStepLike, skipScroll = false) => {
			const el = tooltipRef.current;
			if (!el) return;

			const vw = window.innerWidth;
			const vh = window.innerHeight;
			const pad = 12;
			const mobile = vw <= 768;
			const desiredW = mobile ? vw - pad * 2 : Math.min(460, vw - pad * 2);
			const maxH = vh - pad * 2;

			// Reset positioning so we can measure the natural rendered height for
			// the new step (the previous step may have constrained height).
			el.style.position = 'fixed';
			el.style.right = 'auto';
			el.style.bottom = 'auto';
			el.style.transform = 'none';
			el.style.width = `${desiredW}px`;
			el.style.maxWidth = `${desiredW}px`;
			el.style.maxHeight = `${maxH}px`;
			el.style.top = '0px';
			el.style.left = '-9999px';
			void el.offsetHeight;
			const measured = el.getBoundingClientRect();
			const cardW = Math.min(measured.width, desiredW);
			const cardH = Math.min(measured.height, maxH);

			const clampLeft = (l: number) =>
				Math.max(pad, Math.min(l, vw - cardW - pad));
			const clampTop = (t: number) =>
				Math.max(pad, Math.min(t, vh - cardH - pad));

			const placeCenter = () => {
				el.style.left = `${clampLeft((vw - cardW) / 2)}px`;
				el.style.top = `${clampTop((vh - cardH) / 2)}px`;
			};

			if (!step.target || step.position === 'center') {
				setSpotlightRect(null);
				placeCenter();
				animatingRef.current = false;
				return;
			}

			const target = document.querySelector(step.target);
			if (!target) {
				setSpotlightRect(null);
				placeCenter();
				animatingRef.current = false;
				return;
			}

			if (!skipScroll) {
				target.scrollIntoView({ behavior: 'auto', block: 'center' });
			}
			const rect = target.getBoundingClientRect();
			setSpotlightRect(rect);

			if (rect.height > vh * 0.75 || rect.width > vw * 0.85) {
				placeCenter();
				animatingRef.current = false;
				return;
			}

			let pos = step.position;
			if (mobile && (pos === 'left' || pos === 'right')) {
				pos = rect.top > vh / 2 ? 'top' : 'bottom';
			}

			const spaceBelow = vh - rect.bottom - pad;
			const spaceAbove = rect.top - pad;
			const spaceRight = vw - rect.right - pad;
			const spaceLeft = rect.left - pad;

			const fitsBottom = spaceBelow >= cardH;
			const fitsTop = spaceAbove >= cardH;
			const fitsRight = !mobile && spaceRight >= cardW;
			const fitsLeft = !mobile && spaceLeft >= cardW;

			const candidates: Array<{
				side: typeof pos;
				fits: boolean;
				space: number;
			}> = [
				{ side: 'bottom', fits: fitsBottom, space: spaceBelow },
				{ side: 'top', fits: fitsTop, space: spaceAbove },
				{ side: 'right', fits: fitsRight, space: spaceRight },
				{ side: 'left', fits: fitsLeft, space: spaceLeft },
			];
			const requested = candidates.find((c) => c.side === pos);
			let chosen = requested && requested.fits ? requested : null;
			if (!chosen) {
				const fitting = candidates.filter((c) => c.fits);
				if (fitting.length > 0) {
					chosen =
						fitting.find((c) => c.side === pos) ||
						fitting.sort((a, b) => b.space - a.space)[0];
				} else {
					placeCenter();
					animatingRef.current = false;
					return;
				}
			}

			const targetCenterX = rect.left + rect.width / 2;
			const targetCenterY = rect.top + rect.height / 2;

			let top = 0;
			let left = 0;
			switch (chosen.side) {
				case 'bottom':
					top = rect.bottom + pad;
					left = targetCenterX - cardW / 2;
					break;
				case 'top':
					top = rect.top - pad - cardH;
					left = targetCenterX - cardW / 2;
					break;
				case 'right':
					top = targetCenterY - cardH / 2;
					left = rect.right + pad;
					break;
				case 'left':
					top = targetCenterY - cardH / 2;
					left = rect.left - pad - cardW;
					break;
			}

			el.style.left = `${clampLeft(left)}px`;
			el.style.top = `${clampTop(top)}px`;
			animatingRef.current = false;
		},
		[],
	);

	useLayoutEffect(() => {
		if (!active) return;
		animatingRef.current = true;
		positionTooltip(steps[currentStep]);
	}, [active, currentStep, positionTooltip, steps]);

	useEffect(() => {
		if (!active) return;
		const handler = () => {
			if (!animatingRef.current) positionTooltip(steps[currentStep], true);
		};
		window.addEventListener('resize', handler);
		window.addEventListener('scroll', handler, true);
		return () => {
			window.removeEventListener('resize', handler);
			window.removeEventListener('scroll', handler, true);
		};
	}, [active, currentStep, positionTooltip, steps]);

	return { tooltipRef, spotlightRect, animatingRef };
}
