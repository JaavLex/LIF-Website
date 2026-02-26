import Link from 'next/link';
import { getPayload } from 'payload';
import config from '@payload-config';

export default async function PostsPage() {
	const payload = await getPayload({ config });

	const posts = await payload.find({
		collection: 'posts',
		where: {
			status: {
				equals: 'published',
			},
		},
		sort: '-publishedDate',
	});

	return (
		<main className="container">
			<Link href="/" className="back-link">
				← Retour à l'accueil
			</Link>

			<header className="page-header">
				<h1>Actualités</h1>
			</header>

			{posts.docs.length > 0 ? (
				<ul className="list">
					{posts.docs.map(post => (
						<li key={post.id}>
							<Link href={`/posts/${post.slug}`}>
								<h3>{post.title}</h3>
								{post.publishedDate && (
									<p className="post-meta">
										{new Date(post.publishedDate).toLocaleDateString('fr-FR', {
											year: 'numeric',
											month: 'long',
											day: 'numeric',
										})}
									</p>
								)}
								{post.excerpt && <p>{post.excerpt}</p>}
							</Link>
						</li>
					))}
				</ul>
			) : (
				<p>
					Aucun article pour le moment.{' '}
					<Link href="/admin">Créez-en un dans le panneau d'administration</Link>.
				</p>
			)}
		</main>
	);
}
