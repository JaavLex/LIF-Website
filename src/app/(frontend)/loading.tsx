// Silent fallback — the real intro is the first-visit `<SplashScreen />` mounted
// in the root layout. We deliberately render nothing here so navigation between
// pages doesn't flash a giant boot screen.
export default function Loading() {
	return null;
}
