import React from 'react'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm mb-4 sm:mb-6">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <ChevronRight size={14} className="text-slate-500 flex-shrink-0" />}
          
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-blue-400 hover:text-blue-300 transition truncate font-medium"
            >
              {item.label}
            </button>
          ) : (
            <span className={index === items.length - 1 ? 'text-slate-300 font-medium' : 'text-slate-400'}>
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
