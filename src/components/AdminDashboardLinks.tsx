'use client'

import React from 'react'

const links = [
  {
    title: 'Métriques',
    description: 'Surveillance et performances des serveurs',
    url: 'https://monitor.lif-arma.com',
    icon: '📊',
    color: '#4a7c23',
  },
  {
    title: 'Base de données',
    description: 'Interface de gestion MongoDB',
    url: 'https://mongo.lif-arma.com',
    icon: '🗄️',
    color: '#13aa52',
  },
  {
    title: 'Panel Serveurs',
    description: 'Tableau de bord des serveurs de jeu',
    url: 'https://panel.lif-arma.com',
    icon: '🖥️',
    color: '#5865F2',
  },
]

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '2rem',
    marginTop: '2rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1.5rem',
    color: 'var(--theme-text)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    borderRadius: '12px',
    textDecoration: 'none',
    color: 'white',
    transition: 'all 0.3s ease',
    minHeight: '180px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
  },
  cardDescription: {
    fontSize: '0.9rem',
    opacity: 0.9,
    textAlign: 'center' as const,
  },
}

export const AdminDashboardLinks: React.FC = () => {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Accès rapides</h2>
      <div style={styles.grid}>
        {links.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...styles.card,
              backgroundColor: link.color,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <span style={styles.icon}>{link.icon}</span>
            <span style={styles.cardTitle}>{link.title}</span>
            <span style={styles.cardDescription}>{link.description}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboardLinks
