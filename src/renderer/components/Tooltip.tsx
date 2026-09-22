import React from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  text: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = React.useState(false)

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  }

  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]} whitespace-nowrap`}>
          <div className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg shadow-lg">
            <p className="text-xs sm:text-sm text-slate-200">{text}</p>
            
            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 bg-slate-900 border border-slate-700 transform rotate-45 ${
                position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' :
                position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' :
                'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface HelpIconProps {
  text: string
}

export const HelpIcon: React.FC<HelpIconProps> = ({ text }) => {
  return (
    <Tooltip text={text}>
      <HelpCircle size={16} className="text-slate-400 hover:text-slate-200 transition" />
    </Tooltip>
  )
}
