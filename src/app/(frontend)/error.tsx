'use client';

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	return (
		<main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
			<h1>Something went wrong!</h1>
			<p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
				{error.message || 'An unexpected error occurred.'}
			</p>
			<button
				onClick={reset}
				className="admin-link"
				style={{ cursor: 'pointer', border: 'none' }}
			>
				Try again
			</button>
		</main>
	);
}
