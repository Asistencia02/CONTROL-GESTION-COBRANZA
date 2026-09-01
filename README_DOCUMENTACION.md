# 📚 ÍNDICE DE DOCUMENTACIÓN - VERCEL + GOOGLE APPS SCRIPT

## 🚀 PARA EMPEZAR (LEE ESTO PRIMERO)

### 1. **GUIA_FINAL_PAGINA_BLANCA.md** ⭐ COMIENZA AQUÍ
```
Si tu página está en blanco:
- 3 pasos simples
- 15 minutos para funcionar
- Solución al problema más común
```

### 2. **PASO_A_PASO_VERCEL_COMPLETO.md**
```
Guía detallada paso a paso con:
- Dónde obtener cada credencial
- Cómo agregar en Vercel
- Cómo verificar que funcione
- Checklist completo
```

---

## 🔧 CONFIGURACIÓN

### 3. **VARIABLES_ENTORNO_VERCEL_GOOGLE.md**
```
Variables de entorno necesarias:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_GOOGLE_APPS_SCRIPT_URL
- VITE_GOOGLE_SHEETS_API_KEY (opcional)
- VITE_INSTITUCION_ID (opcional)

Incluye: dónde obtener cada una
```

### 4. **DEPLOY_A_VERCEL_AHORA.md**
```
Instrucciones rápidas de deployment:
- CLI method
- Dashboard method
- Verificación
- Troubleshooting básico
```

---

## 🔍 DEBUGGING

### 5. **DIAGNOSTICO_PAGINA_BLANCA.md**
```
Si algo sale mal:
- Qué verificar
- Errores comunes
- Soluciones
- Cómo debuggear en F12
```

### 6. **VERIFICACION_LISTO_VERCEL.md**
```
Checklist de qué está listo:
- Carpetas pusheadas ✓
- Configuración build ✓
- Status actual ✓
- Próximos pasos ✓
```

---

## 📊 ARCHITECTURE & SETUP

### 7. **IMPLEMENTACION_CAJA_CHICA_v2.8.md**
```
Sistema de control de caja:
- Base de datos
- Hook useVentaKiosco
- UI VentaKioscoModerno
- Flujo de caja
```

### 8. **IMPLEMENTACION_HISTORIAL_CIERRES_v2.8.md**
```
Historial de cierres de caja:
- Nuevas tablas
- Funciones agregadas
- Tabs de la UI
- Campos de migración
```

### 9. **MIGRACIONES_SUPABASE_CAJA_CHICA.sql**
```
SQL para crear:
- Tabla caja_chica
- Tabla caja_grande
- Campos en venta_kiosco
- Campos en instituciones
```

---

## 📖 REFERENCIA RÁPIDA

### Archivos de Config
| Archivo | Propósito |
|---------|-----------|
| `vite.config.ts` | Build config (Vite) |
| `vercel.json` | Deploy config (Vercel) |
| `package.json` | Dependencias |
| `.env.example` | Variables template |
| `tsconfig.json` | TypeScript config |
| `tailwind.config.js` | Estilos |

### Carpetas Principales
| Carpeta | Contenido |
|---------|----------|
| `src/renderer/` | App React |
| `src/renderer/components/` | UI Components |
| `src/renderer/hooks/` | Custom hooks |
| `src/renderer/lib/` | Utilities |
| `src/renderer/modules/` | Páginas principales |
| `dist/` | Build output (generado) |

---

## ✅ CHECKLIST DE DEPLOYMENT

```
□ Repo en GitHub pusheado
□ Build local OK (npm run build)
□ Vercel conectado al repo
□ Variables de entorno seteadas
□ Redeploy hecho
□ App funciona (no blanco)
□ Login funciona
□ Dashboard carga datos
□ Botón sync Google funciona
□ Migraciones SQL ejecutadas
```

---

## 🎯 FLUJO DE DATOS COMPLETO

```
📱 WEB APP (Vercel)
   ├─ VITE_SUPABASE_URL
   ├─ VITE_SUPABASE_ANON_KEY
   └─ VITE_GOOGLE_APPS_SCRIPT_URL
        ↓
    🗄️ SUPABASE DATABASE
    ├─ Estudiantes
    ├─ Deudas
    ├─ Pagos
    ├─ Usuarios
    └─ ... más tablas
        ↑
    📊 GOOGLE APPS SCRIPT
    ├─ Lee Excel base
    ├─ Normaliza datos
    └─ Sincroniza a Supabase
```

---

## 🆘 PROBLEMAS COMUNES

| Problema | Solución | Doc |
|----------|----------|-----|
| Página blanca | Falta variables de entorno | GUIA_FINAL_PAGINA_BLANCA.md |
| terser not found | Build usa esbuild (ya fixed) | vite.config.ts |
| No conecta Supabase | URL o KEY incorrecta | VARIABLES_ENTORNO_VERCEL_GOOGLE.md |
| Google sync no funciona | VITE_GOOGLE_APPS_SCRIPT_URL | PASO_A_PASO_VERCEL_COMPLETO.md |
| CSS no carga | Hard refresh (Ctrl+Shift+R) | DIAGNOSTICO_PAGINA_BLANCA.md |

---

## 📞 LINKS ÚTILES

### Dashboards
- Vercel: https://vercel.com/dashboard
- Supabase: https://app.supabase.com
- GitHub: https://github.com

### Tu App
- Prod URL: https://control-gestion-cobranza.vercel.app
- GitHub Repo: https://github.com/Asistencia02/CONTROL-GESTION-COBRANZA

### Google
- Google Cloud: https://console.cloud.google.com
- Google Sheets API: https://developers.google.com/sheets/api

---

## 🚦 PRÓXIMOS PASOS

### Inmediato:
1. Lee: **GUIA_FINAL_PAGINA_BLANCA.md**
2. Sigue los 3 pasos
3. Verifica que funcione

### Después (si funciona):
1. Ejecuta migraciones SQL
2. Testea Google sync
3. Configura usuarios y permisos

### Productivo:
1. Configura dominio personalizado (opcional)
2. Monitorea analytics
3. Mantén backups

---

## 💾 VERSIONES DE ARCHIVOS IMPORTANTES

```
.env.example           → Template de variables
package.json           → v0.1.0
vite.config.ts         → Usa esbuild (no terser)
vercel.json            → Config de Vercel
src/renderer/          → React app (Vite)
google_apps_script_v2.8.gs → Script de sync
```

---

## 🎓 RESUMEN RÁPIDO

**¿Qué es esto?**
```
Una app de gestión de cobranzas en Vercel que:
- Sincroniza con Excel vía Google Apps Script
- Usa Supabase como base de datos
- Tiene control de caja
- Reportes financieros
- Sistema de permisos
```

**¿Cómo deployar?**
```
1. Variables en Vercel
2. Redeploy
3. ¡Listo!
```

**¿Dónde está?**
```
https://control-gestion-cobranza.vercel.app
```

---

**🎯 EMPEZÁ POR: GUIA_FINAL_PAGINA_BLANCA.md**
