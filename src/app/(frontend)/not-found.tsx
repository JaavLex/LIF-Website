import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1>404 - Page Not Found</h1>
      <p style={{ marginTop: '1rem', marginBottom: '2rem' }}>
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="admin-link">
        Return Home
      </Link>
    </main>
  )
}
