/**
 * Sistema de Diseño Moderno para Gestión de Cobranzas
 * Paleta de colores, componentes reutilizables y estilos consistentes
 */

// ============================================
// PALETA DE COLORES
// ============================================

export const colors = {
  // Primarios
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c3d66',
  },
  
  // Secundarios (Cyan)
  secondary: {
    50: '#ecf0ff',
    100: '#e0f2fe',
    200: '#cffafe',
    300: '#a5f3fc',
    400: '#67e8f9',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },

  // Semantic Colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    300: '#86efac',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    900: '#14532d',
  },

  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    300: '#fcd34d',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    900: '#78350f',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    300: '#fca5a5',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    900: '#7f1d1d',
  },

  info: {
    50: '#f8fafc',
    100: '#f1f5f9',
    300: '#cbd5e1',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    900: '#0f172a',
  },

  // Neutros
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
}

// ============================================
// GRADIENTES
// ============================================

export const gradients = {
  primary: 'from-blue-600 via-blue-500 to-cyan-500',
  primaryLight: 'from-blue-50 to-cyan-50',
  primaryHover: 'from-blue-700 via-blue-600 to-cyan-600',

  success: 'from-green-500 to-emerald-600',
  successLight: 'from-green-50 to-emerald-50',

  warning: 'from-orange-500 to-amber-600',
  warningLight: 'from-orange-50 to-amber-50',

  error: 'from-red-500 to-rose-600',
  errorLight: 'from-red-50 to-rose-50',

  info: 'from-slate-500 to-slate-600',
  infoLight: 'from-slate-50 to-slate-100',

  purple: 'from-purple-500 to-pink-600',
  purpleLight: 'from-purple-50 to-pink-50',
}

// ============================================
// COMPONENTES REUTILIZABLES
// ============================================

export const componentClasses = {
  // Headers
  headerPremium: 'relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-r ' + gradients.primary + ' opacity-90',
  headerContent: 'relative p-8 text-white',
  headerTitle: 'text-4xl font-black',
  headerSubtitle: 'text-blue-100 text-sm mt-1',

  // Cards
  cardPrimary: 'bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-md hover:shadow-lg transition',
  cardGradient: 'rounded-2xl border-2 p-6 shadow-lg hover:shadow-xl transition',

  // Buttons
  buttonPrimary: 'px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-cyan-700 transition shadow-lg',
  buttonSecondary: 'px-6 py-3 border-2 border-gray-300 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition',
  buttonSuccess: 'px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition shadow-lg',
  buttonDanger: 'px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-bold hover:from-red-700 hover:to-rose-700 transition shadow-lg',

  // Inputs
  input: 'w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition',
  inputLarge: 'w-full px-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base font-semibold transition',

  // Select
  select: 'w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium transition',

  // Badges
  badgePrimary: 'inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-bold',
  badgeSuccess: 'inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-xs font-bold',
  badgeWarning: 'inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold',
  badgeError: 'inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full text-xs font-bold',

  // Tables
  tableHeader: 'px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b-2 border-gray-200 text-left text-xs font-bold text-gray-800 uppercase tracking-wide',
  tableRow: 'px-6 py-4 border-b border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition',
  tableRowHover: 'px-6 py-4 border-b border-gray-200 text-sm text-gray-700 hover:bg-blue-50 transition',

  // Alerts
  alertSuccess: 'p-4 rounded-xl border-2 border-green-300 bg-green-50 text-green-700 flex items-start gap-3',
  alertError: 'p-4 rounded-xl border-2 border-red-300 bg-red-50 text-red-700 flex items-start gap-3',
  alertWarning: 'p-4 rounded-xl border-2 border-yellow-300 bg-yellow-50 text-yellow-700 flex items-start gap-3',
  alertInfo: 'p-4 rounded-xl border-2 border-blue-300 bg-blue-50 text-blue-700 flex items-start gap-3',

  // Modals
  modalOverlay: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4',
  modalContent: 'bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4',

  // Loading
  spinner: 'animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full',

  // Stats Card
  statsCard: 'rounded-2xl border-2 p-6 text-center hover:shadow-lg transition',
  statsCardValue: 'text-3xl font-black mt-3',
  statsCardLabel: 'text-xs font-bold uppercase tracking-wider mt-2',
}

// ============================================
// LAYOUTS
// ============================================

export const layouts = {
  containerMain: 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8',
  containerLight: 'min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8',
  
  gridContent: 'grid grid-cols-1 lg:grid-cols-3 gap-6',
  gridStats: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8',
  gridFull: 'grid grid-cols-1 gap-6',
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

export const classNames = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'info'): { bg: string; border: string; text: string } => {
  const statusColors = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'text-green-700',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-700',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-700',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-700',
    },
  }
  return statusColors[status]
}

export const getGradientByStatus = (status: 'success' | 'warning' | 'error' | 'info' | 'primary'): { light: string; dark: string } => {
  const gradientMap = {
    success: { light: 'from-green-50 to-emerald-50', dark: gradients.success },
    warning: { light: 'from-orange-50 to-amber-50', dark: gradients.warning },
    error: { light: 'from-red-50 to-rose-50', dark: gradients.error },
    info: { light: 'from-slate-50 to-slate-100', dark: gradients.info },
    primary: { light: 'from-blue-50 to-cyan-50', dark: gradients.primary },
  }
  return gradientMap[status]
}

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  h1: 'text-4xl font-black text-gray-900',
  h2: 'text-2xl font-bold text-gray-800',
  h3: 'text-xl font-bold text-gray-800',
  h4: 'text-lg font-semibold text-gray-800',
  
  subtitle: 'text-sm text-gray-600',
  caption: 'text-xs text-gray-500',
  
  body: 'text-base text-gray-700',
  bodySmall: 'text-sm text-gray-600',
}

// ============================================
// SPACING
// ============================================

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
}

// ============================================
// SHADOW
// ============================================

export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  '2xl': 'shadow-2xl',
}

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  mobile: '640px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
}
