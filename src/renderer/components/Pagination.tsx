import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  total: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export const Pagination: React.FC<PaginationProps> = ({
  total,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(total / pageSize)
  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, total)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
      {/* Info */}
      <div className="text-xs sm:text-sm text-slate-400">
        Mostrando <span className="font-bold text-white">{start}-{end}</span> de <span className="font-bold text-white">{total}</span> registros
      </div>

      {/* Page size selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        <label className="text-xs sm:text-sm text-slate-400 font-bold">Por página:</label>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
          className="px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white focus:border-blue-500/50 focus:outline-none"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="p-1.5 sm:p-2 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-400 hover:text-blue-400 transition"
          title="Primera página"
        >
          <ChevronsLeft size={16} className="sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 sm:p-2 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-400 hover:text-blue-400 transition"
          title="Página anterior"
        >
          <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
        </button>

        <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={currentPage}
            onChange={(e) => handlePageChange(parseInt(e.target.value) || 1)}
            className="w-10 sm:w-12 px-2 py-1 text-center bg-slate-700/50 border border-slate-600/50 rounded text-xs sm:text-sm text-white focus:border-blue-500/50 focus:outline-none"
          />
          <span className="text-xs sm:text-sm text-slate-400">/ {totalPages}</span>
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 sm:p-2 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-400 hover:text-blue-400 transition"
          title="Página siguiente"
        >
          <ChevronRight size={16} className="sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-1.5 sm:p-2 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-slate-400 hover:text-blue-400 transition"
          title="Última página"
        >
          <ChevronsRight size={16} className="sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  )
}
