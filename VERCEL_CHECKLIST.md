# ✅ Checklist de Deployment a Vercel

## 🔧 Pre-requisitos

- [ ] Cuenta GitHub (crear en github.com si no tienes)
- [ ] Cuenta Vercel (crear en vercel.com - puedes usar GitHub)
- [ ] Proyecto Supabase (y credenciales API listas)
- [ ] Node.js 18+ instalado localmente

## 📝 Paso 1: GitHub Repository

- [ ] `git init`
- [ ] `git add .`
- [ ] `git commit -m "Initial commit"`
- [ ] Crear repo en github.com
- [ ] `git remote add origin <URL>`
- [ ] `git push -u origin main`

**Verificar:** Repo visible en github.com/tu-usuario/gestion-cobranzas

## 🔗 Paso 2: Conectar a Vercel

- [ ] Ve a vercel.com
- [ ] Click "New Project"
- [ ] Selecciona "Import Git Repository"
- [ ] Busca y selecciona `gestion-cobranzas`
- [ ] Vercel auto-detecta:
  - [ ] Framework Preset: Vite
  - [ ] Build Command: `npm run build`
  - [ ] Output Directory: `dist`
- [ ] Click "Deploy"

**Nota:** Primera build tarda ~2-3 minutos

## 🌐 Paso 3: Variables de Entorno

En Vercel Dashboard (tu proyecto):

- [ ] Settings → Environment Variables
- [ ] Add:
  - [ ] `VITE_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
  - [ ] `VITE_SUPABASE_ANON_KEY` = (tu clave anónima)
- [ ] Click "Save"
- [ ] Deployments → Redeploy latest

**Ubicación en Supabase:**
Supabase Dashboard → Tu Proyecto → Settings → API

## ✨ Paso 4: Verificar

- [ ] Visita `https://gestion-cobranzas.vercel.app`
- [ ] Página carga correctamente
- [ ] Verifica console (F12) sin errores 404
- [ ] Comprueba que conecta a Supabase

**Error? Troubleshooting:**
- [ ] Ver logs en Vercel: Deployments → Build logs
- [ ] Verificar variables en: Settings → Environment Variables
- [ ] Test local: `npm run build` && `npm run preview`

## 🔄 Paso 5: Deployment Automático

Ahora cada push triggea deploy automático:

```bash
git add .
git commit -m "Cambios"
git push origin main
# ✨ Vercel despliega automáticamente
```

- [ ] Hacer pequeño cambio para probar
- [ ] `git push`
- [ ] Verificar en Vercel que inicia deploy
- [ ] Esperar a que complete (~30s)
- [ ] Verificar cambio en vercel.app

## 🚀 Paso 6: Dominio Personalizado (Opcional)

- [ ] En Vercel: Settings → Domains
- [ ] Añade tu dominio
- [ ] Sigue instrucciones de DNS
- [ ] SSL automático (Let's Encrypt)

## 📊 Monitoreo Continuo

- [ ] Revisar Vercel dashboard regularmente
- [ ] Monitorear: Deployments, Analytics, Performance
- [ ] Alertas si build falla
- [ ] Logs disponibles para debug

## 🆘 Troubleshooting Común

### Build falla
```bash
# Test local primero
npm run build
npm run preview
```

### Variables no funcionan
- Redeploy después de cambiar variables
- Asegurar prefix `VITE_` (requerido por Vite)

### Sitio en blanco
- Abrir DevTools (F12)
- Ver console.log para errores
- Check Vercel build logs

### Conexión Supabase falla
- Verificar URL y KEY en .env.local local
- Verificar mismo URL y KEY en Vercel env vars
- Probar API key en Supabase dashboard

## 📞 Links Útiles

- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Settings](https://github.com/settings)
- [Supabase API Keys](https://app.supabase.com/project/_/settings/api)
- [Vercel Docs](https://vercel.com/docs)

## ✅ Final Checklist

- [ ] App deploys automáticamente
- [ ] Conecta a Supabase correctamente
- [ ] No hay errores en console
- [ ] Datos se cargan desde BD
- [ ] Interfaz responde
- [ ] Toda funcionalidad opera

---

**🎉 ¡LISTO!** Tu app está en producción y actualiza automáticamente con cada push.
