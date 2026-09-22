import React from 'react'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 6 }) => {
  return (
    <div className="space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-3">
          {[...Array(cols)].map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  )
}

export const SkeletonCard: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-4 bg-slate-800/50 rounded-lg space-y-3">
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      ))}
    </div>
  )
}

export const SkeletonChart: React.FC = () => {
  return (
    <div className="p-4 bg-slate-800/50 rounded-lg space-y-4">
      <Skeleton className="h-6 w-40 rounded" />
      <Skeleton className="h-64 w-full rounded" />
    </div>
  )
}

export const SkeletonText: React.FC = () => {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-4 w-4/5 rounded" />
    </div>
  )
}
