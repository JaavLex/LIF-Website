import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Metadata } from 'next'
import { RichText } from '@payloadcms/richtext-lexical/react'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })
  
  const pages = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
  })

  const page = pages.docs[0]

  if (!page) {
    return { title: 'Page Not Found' }
  }

  return {
    title: page.meta?.title || page.title,
    description: page.meta?.description,
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params
  const payload = await getPayload({ config })
  
  const pages = await payload.find({
    collection: 'pages',
    where: {
      slug: { equals: slug },
    },
    limit: 1,
  })

  const page = pages.docs[0]

  if (!page) {
    notFound()
  }

  return (
    <main className="container">
      <Link href="/" className="back-link">← Retour à l'accueil</Link>
      
      <article>
        <header className="page-header">
          <h1>{page.title}</h1>
        </header>

        {page.heroImage && typeof page.heroImage === 'object' && (
          <Image
            src={page.heroImage.url || ''}
            alt={page.heroImage.alt || page.title}
            width={1200}
            height={400}
            className="hero-image"
          />
        )}

        {page.layout?.map((block: any, index: number) => (
          <div key={index} className="block">
            {block.blockType === 'hero' && (
              <div className="hero-block">
                <h1>{block.heading}</h1>
                {block.subheading && <p>{block.subheading}</p>}
                {block.ctaText && block.ctaLink && (
                  <Link href={block.ctaLink} className="cta-button">
                    {block.ctaText}
                  </Link>
                )}
              </div>
            )}

            {block.blockType === 'content' && block.content && (
              <div className="content-block">
                <RichText data={block.content} />
              </div>
            )}

            {block.blockType === 'callToAction' && (
              <div className="cta-block">
                {block.heading && <h2>{block.heading}</h2>}
                {block.text && <p>{block.text}</p>}
                {block.buttonText && block.buttonLink && (
                  <Link href={block.buttonLink} className="cta-button">
                    {block.buttonText}
                  </Link>
                )}
              </div>
            )}

            {block.blockType === 'imageGallery' && block.images && (
              <div className="gallery-block">
                {block.images.map((item: any, imgIndex: number) => (
                  item.image && typeof item.image === 'object' && (
                    <Image
                      key={imgIndex}
                      src={item.image.url || ''}
                      alt={item.image.alt || ''}
                      width={400}
                      height={300}
                    />
                  )
                ))}
              </div>
            )}
          </div>
        ))}
      </article>
    </main>
  )
}
