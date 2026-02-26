'use client'

import { DynamicIcon } from './DynamicIcon'

interface Feature {
  icon: string
  title: string
  description: string
}

interface FeaturesSectionProps {
  title: string
  titleIcon: string
  features: Feature[]
}

export function FeaturesSection({ title, titleIcon, features }: FeaturesSectionProps) {
  return (
    <section className="features-section">
      <div className="section-container">
        <h2 className="section-title">
          <span className="title-icon">
            <DynamicIcon name={titleIcon} size={32} />
          </span>
          {title}
        </h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                <DynamicIcon name={feature.icon} size={48} />
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
