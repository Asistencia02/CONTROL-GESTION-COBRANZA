# Estructura del Proyecto - Versión Web Limpia

```
gestion-cobranzas/
├── src/
│   └── renderer/
│       ├── components/              # Componentes React reutilizables
│       │   ├── Sidebar.tsx
│       │   ├── Modales (*Modal*)
│       │   ├── Filtros (*Filtros*)
│       │   ├── Pestañas (*Pestania*)
│       │   ├── Tablas (*Tabla*)
│       │   └── ui/                  # Componentes UI base
│       │
│       ├── modules/                 # Módulos de la aplicación
│       │   ├── DashboardModerno.tsx
│       │   ├── Cobranzas.tsx
│       │   ├── DeudasModerno.tsx
│       │   ├── VentasModerno.tsx
│       │   ├── GastosModerno.tsx
│       │   ├── ReportesModerno.tsx
│       │   ├── CierreModerno.tsx
│       │   ├── ConfiguracionModerno.tsx
│       │   └── Sincronizacion.tsx
│       │
│       ├── lib/                     # Utilidades y configuración
│       │   ├── supabase.ts          # Cliente Supabase
│       │   ├── env.ts               # Variables de entorno
│       │   ├── database.types.ts    # Tipos de BD
│       │   ├── helpers.ts           # Funciones utilitarias
│       │   ├── excelGenerator.ts
│       │   ├── moraCalculator.ts
│       │   └── ...
│       │
│       ├── hooks/                   # React hooks personalizados
│       │   └── ...
│       │
│       ├── App.tsx                  # Componente principal
│       ├── main.tsx                 # Entry point React
│       ├── index.html               # HTML raíz
│       ├── index.css                # Estilos globales
│       └── dist/                    # Build anterior (opcional limpiar)
│
├── .env.example                     # Plantilla de variables
├── .env.local                       # Variables locales (no subir a Git)
├── .gitignore                       # Archivos ignorados por Git
│
├── package.json                     # Dependencias del proyecto
├── package-lock.json                # Lock de dependencias
├── tsconfig.json                    # Configuración TypeScript
├── vite.config.ts                   # Configuración Vite
├── tailwind.config.js               # Configuración Tailwind CSS
├── postcss.config.js                # Configuración PostCSS
│
├── README.md                        # Documentación principal
├── QUICKSTART.md                    # Guía rápida
├── DEPLOY.md                        # Guía de deployment
│
├── GOOGLE_APPS_SCRIPT.gs            # Script de sincronización Google Sheets
│
└── node_modules/                    # Dependencias (no subir a Git)
```

## Archivos Importantes

- **.env.local** → Credenciales Supabase (crear a partir de .env.example)
- **src/renderer/App.tsx** → Componente principal, router de módulos
- **src/renderer/lib/supabase.ts** → Cliente de BD
- **package.json** → Solo 7 dependencias de producción
- **vite.config.ts** → Configuración para build optimizado

## Eliminado

❌ Toda configuración de Electron (main/, preload/)
❌ Archivos de build antiguos (*.ps1, *.bat, *.sh)
❌ Documentación obsoleta (COMIENZA_*, GUIA_*, FIX_*, etc.)
❌ Google Apps Scripts antiguos (excepto GOOGLE_APPS_SCRIPT.gs)
❌ Archivos de desarrollo (dev-server.js, extraer_y_normalizar.py, etc.)
❌ Directorios de datos (sql_scripts/, scripts/, tmp/)
❌ Configuración Vercel y Electron Builder

## Resultado

✅ Proyecto 100% web con React + Vite
✅ Estructura clara y mantenible
✅ Cero dependencias de Electron
✅ Listo para deployment en Vercel, Netlify o Docker
