'use client'

import { icons, LucideProps, HelpCircle } from 'lucide-react'

interface DynamicIconProps extends LucideProps {
  name: string
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  // Get the icon component from lucide-react icons object
  const IconComponent = icons[name as keyof typeof icons]
  
  if (!IconComponent) {
    // Fallback to a default icon if the name doesn't exist
    return <HelpCircle {...props} />
  }
  
  return <IconComponent {...props} />
}
