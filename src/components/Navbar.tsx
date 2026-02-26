'use client'

import Link from 'next/link'
import Image from 'next/image'

interface NavbarProps {
  logoUrl?: string
  discordUrl: string
}

export function Navbar({ logoUrl, discordUrl }: NavbarProps) {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link href="/" className="nav-logo">
          {logoUrl && (
            <Image
              src={logoUrl}
              alt="LIF Logo"
              width={48}
              height={48}
              className="nav-logo-image"
            />
          )}
          <div className="nav-logo-text">
            <span className="logo-text">LIF</span>
            <span className="logo-subtitle">Légion Internationale Francophone</span>
          </div>
        </Link>
        <div className="nav-links">
          <Link href="/">Accueil</Link>
          <a href="/#serveurs">Serveurs</a>
          <Link href="/reglement">Règlement</Link>
          <Link href="/posts">Actualités</Link>
          <a href={discordUrl} target="_blank" rel="noopener noreferrer" className="discord-btn">
            Discord
          </a>
        </div>
      </div>
    </nav>
  )
}
