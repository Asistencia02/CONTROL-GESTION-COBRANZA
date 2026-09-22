import React, { useState, useCallback } from 'react'
import { Search, X, Filter } from 'lucide-react'

interface AdvancedSearchProps {
  onSearch: (text: string) => void
  onFilter?: (filters: Record<string, any>) => void
  placeholder?: string
  debounceMs?: number
  filterOptions?: { label: string; key: string; options: { label: string; value: any }[] }[]
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onFilter,
  placeholder = 'Buscar...',
  debounceMs = 300,
  filterOptions = [],
}) => {
  const [searchText, setSearchText] = useState('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [showFilters, setShowFilters] = useState(false)
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text)

    if (debounceTimeout) {
      clearTimeout(debounceTimeout)
    }

    const timeout = setTimeout(() => {
      onSearch(text)
    }, debounceMs)

    setDebounceTimeout(timeout)
  }, [debounceMs, onSearch, debounceTimeout])

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilter?.(newFilters)
  }

  const handleClearAll = () => {
    setSearchText('')
    setFilters({})
    onSearch('')
    onFilter?.({})
  }

  const activeFiltersCount = Object.values(filters).filter(v => v !== '' && v !== null).length

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white placeholder-slate-400 focus:border-blue-500/50 focus:outline-none transition"
        />
        {searchText && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
          >
            <X size={16} className="sm:w-5 sm:h-5" />
          </button>
        )}
      </div>

      {/* Filter Toggle & Clear */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold transition ${
            showFilters || activeFiltersCount > 0
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
              : 'bg-slate-700/50 text-slate-400 hover:text-slate-200 border border-slate-600/50 hover:border-slate-500'
          }`}
        >
          <Filter size={16} className="sm:w-5 sm:h-5" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {(searchText || activeFiltersCount > 0) && (
          <button
            onClick={handleClearAll}
            className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-bold bg-red-600/30 text-red-300 border border-red-500/50 hover:bg-red-600/50 transition"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && filterOptions.length > 0 && (
        <div className="p-3 sm:p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-3 sm:space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {filterOptions.map((filterOption) => (
              <div key={filterOption.key}>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-1.5 sm:mb-2">
                  {filterOption.label}
                </label>
                <select
                  value={filters[filterOption.key] || ''}
                  onChange={(e) => handleFilterChange(filterOption.key, e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-xs sm:text-sm text-white focus:border-blue-500/50 focus:outline-none transition"
                >
                  <option value="">Todos</option>
                  {filterOption.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
