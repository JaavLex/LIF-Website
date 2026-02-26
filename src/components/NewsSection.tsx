'use client';

import Link from 'next/link';
import { DynamicIcon } from './DynamicIcon';

interface Post {
	id: string;
	title: string;
	slug: string;
	excerpt?: string | null;
	publishedDate?: string | null;
}

interface NewsSectionProps {
	title: string;
	titleIcon: string;
	posts: Post[];
}

export function NewsSection({ title, titleIcon, posts }: NewsSectionProps) {
	return (
		<section className="news-section">
			<div className="section-container">
				<h2 className="section-title">
					<span className="title-icon">
						<DynamicIcon name={titleIcon} size={32} />
					</span>
					{title}
				</h2>
				{posts.length > 0 ? (
					<div className="news-grid">
						{posts.map(post => (
							<article key={post.id} className="news-card">
								<div className="news-date">
									{post.publishedDate
										? new Date(post.publishedDate).toLocaleDateString('fr-FR', {
												day: 'numeric',
												month: 'short',
												year: 'numeric',
											})
										: 'Bientôt'}
								</div>
								<h3>{post.title}</h3>
								{post.excerpt && <p>{post.excerpt}</p>}
								<Link href={`/posts/${post.slug}`} className="news-link">
									Lire la suite →
								</Link>
							</article>
						))}
					</div>
				) : (
					<div className="no-news">
						<p>Pas encore d&apos;actualités. Revenez bientôt !</p>
					</div>
				)}
			</div>
		</section>
	);
}
