# 👋 BIENVENIDO - COMIENZA AQUI

## 🎯 Tu Proyecto está Listo

Tenemos **Gestión de Cobranzas** - una aplicación web profesional, limpia y lista para producción.

## ⚡ Quick Start (3 pasos)

```bash
# 1. Instalar
npm install

# 2. Configurar (copia credenciales Supabase)
cp .env.example .env.local
# Edita .env.local con tus credenciales

# 3. Ejecutar
npm run dev
# Abre: http://localhost:5173
```

## 📚 ¿Por dónde empiezo?

### 👨‍💻 Si quieres DESARROLLAR

1. Lee: `QUICKSTART.md` (guía rápida)
2. Ejecuta: `npm run dev`
3. Modifica el código en `src/renderer/`
4. Los cambios se actualizan automáticamente

### 🚀 Si quieres DEPLOYAR

1. Lee: `VERCEL_DEPLOY.md` (5 minutos)
2. Ejecuta: `vercel-setup.bat` (Windows) o `vercel-setup.sh` (macOS/Linux)
3. Sigue los pasos:
   - GitHub repo
   - Conecta en Vercel
   - Añade variables Supabase
4. ¡Listo! App en internet

### 📖 Si quieres ENTENDER TODO

1. `PROJECT_FINAL.md` - Estructura completa
2. `STRUCTURE.md` - Explicación de carpetas
3. `CLEANUP_SUMMARY.md` - Qué se limpió

## 🔧 Configuración Necesaria

### Supabase (Obligatorio)

1. Ve a [supabase.com](https://supabase.com)
2. Crea o selecciona tu proyecto
3. Settings → API
4. Copia en `.env.local`:
   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### GitHub (Para Vercel)

1. Ve a [github.com](https://github.com)
2. Crea nuevo repo: `gestion-cobranzas`
3. Push del código
4. Copia la URL HTTPS

### Vercel (Para Deploy)

1. Ve a [vercel.com](https://vercel.com)
2. Conecta tu GitHub
3. Selecciona el repo
4. Añade variables Supabase
5. Deploy 🚀

## 📋 Documentos Importantes

| Archivo | Para |
|---------|------|
| `QUICKSTART.md` | Empezar en 3 pasos |
| `VERCEL_DEPLOY.md` | Deploy en Vercel |
| `VERCEL_CHECKLIST.md` | Checklist completo |
| `PROJECT_FINAL.md` | Estructura del proyecto |
| `STRUCTURE.md` | Detalle de carpetas |

## 🎨 Módulos Disponibles

```
Dashboard    → KPIs y gráficos
Cobranzas    → Registro de pagos
Deudas       → Seguimiento
Ventas       → Análisis
Gastos       → Control
Reportes     → Dashboards
Cierre       → Operaciones finales
Sincronización → Google Sheets
```

## 🔐 Variables de Entorno

### Locales (.env.local)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

### En Producción (Vercel)
Mismo valores en: **Settings → Environment Variables**

## 📦 Tecnologías

- **React 18** - UI
- **Vite 5** - Build tool
- **TypeScript** - Tipado
- **Tailwind** - Estilos
- **Supabase** - Backend
- **Chart.js** - Gráficos

## 🚀 Comandos Principales

```bash
npm run dev          # Desarrollo local
npm run build        # Build para producción
npm run preview      # Previsualizar build
npm run type-check   # Verificar tipos TypeScript
```

## 🌐 URLs

- **Local**: http://localhost:5173
- **Producción**: https://gestion-cobranzas.vercel.app
- **GitHub**: github.com/tu-usuario/gestion-cobranzas
- **Vercel**: vercel.com/dashboard

## ❓ ¿Problemas?

### "npm install falla"
```bash
# Limpia cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ".env.local no funciona"
- Verifica que está en raíz del proyecto
- Reinicia `npm run dev`
- Variable debe tener prefix `VITE_`

### "Vercel build falla"
- Prueba `npm run build` localmente
- Ver logs en Vercel Dashboard
- Verifica variables de entorno están configuradas

### "Supabase no conecta"
- Verifica URL y KEY en .env.local
- Prueba en [supabase.com](https://supabase.com)
- Check que proyecto está activo

## 📞 Suporte

- [Vite Docs](https://vitejs.dev)
- [React Docs](https://react.dev)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)

## ✨ Características Principales

✅ 8 módulos funcionales
✅ Conectado a Supabase
✅ Interfaz moderna con Tailwind
✅ Gráficos en tiempo real
✅ Sincronización automática
✅ Responsive design
✅ Deploy automático en Vercel
✅ Zero downtime updates

## 🎯 Próximos Pasos

1. **Hoy**: Ejecuta `npm run dev` y explora la app
2. **Mañana**: Configura tu dominio personalizado en Vercel
3. **Esta semana**: Customiza para tu institución
4. **Producción**: Deploy y monitorea en Vercel

## 🎉 ¡Listo!

Tu app profesional está lista. 

**Comienza con:**
```bash
npm install
cp .env.example .env.local
npm run dev
```

¿Dudas? Lee los archivos `.md` o consulta la documentación oficial de las tecnologías.

**¡Buena suerte! 🚀**
