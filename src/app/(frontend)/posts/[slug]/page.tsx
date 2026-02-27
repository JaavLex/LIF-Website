import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getPayload } from 'payload';
import config from '@payload-config';
import type { Metadata } from 'next';
import { RichText } from '@payloadcms/richtext-lexical/react';
export const dynamic = 'force-dynamic';
type Props = {
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const payload = await getPayload({ config });

	const posts = await payload.find({
		collection: 'posts',
		where: {
			slug: { equals: slug },
		},
		limit: 1,
	});

	const post = posts.docs[0];

	if (!post) {
		return { title: 'Post Not Found' };
	}

	return {
		title: post.meta?.title || post.title,
		description: post.meta?.description || post.excerpt,
	};
}

export default async function PostPage({ params }: Props) {
	const { slug } = await params;
	const payload = await getPayload({ config });

	const posts = await payload.find({
		collection: 'posts',
		where: {
			slug: { equals: slug },
		},
		limit: 1,
		depth: 2,
	});

	const post = posts.docs[0];

	if (!post) {
		notFound();
	}

	return (
		<main className="container">
			<Link href="/" className="back-link">
				← Retour à l'accueil
			</Link>

			<article>
				<header className="page-header">
					<h1>{post.title}</h1>
					<div className="post-meta">
						{post.publishedDate && (
							<time dateTime={post.publishedDate}>
								{new Date(post.publishedDate).toLocaleDateString('fr-FR', {
									year: 'numeric',
									month: 'long',
									day: 'numeric',
								})}
							</time>
						)}
						{post.author && typeof post.author === 'object' && post.author.name && (
							<span> • Par {post.author.name}</span>
						)}
					</div>
				</header>

				{post.featuredImage && typeof post.featuredImage === 'object' && (
					<Image
						src={post.featuredImage.url || ''}
						alt={post.featuredImage.alt || post.title}
						width={1200}
						height={600}
						className="hero-image"
					/>
				)}

				{post.excerpt && <p className="post-excerpt">{post.excerpt}</p>}

				{post.content && (
					<div className="post-content">
						<RichText data={post.content} />
					</div>
				)}

				{post.categories && post.categories.length > 0 && (
					<div className="post-categories">
						<strong>Catégories :</strong>{' '}
						{post.categories.map(
							(cat: { category?: string | null }, index: number) => (
								<span key={index}>
									{cat.category}
									{index < post.categories!.length - 1 && ', '}
								</span>
							),
						)}
					</div>
				)}
			</article>
		</main>
	);
}
