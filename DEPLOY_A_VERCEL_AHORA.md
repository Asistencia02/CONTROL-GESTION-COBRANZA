# 🚀 DEPLOYMENT A VERCEL - PASO A PASO

## ✅ Estado Actual
- ✓ Build OK: `npm run build` genera `/dist`
- ✓ Git: Todo pusheado a `main`
- ✓ vercel.json: Configurado correctamente
- ✓ .env.example: Variables de entorno listadas

## 🔥 PARA DEPLOYER AHORA:

### 1️⃣ Si NO tienes cuenta Vercel:
```bash
# Ve a https://vercel.com
# Click "Sign Up"
# Selecciona "Continue with GitHub"
# Autoriza Vercel
```

### 2️⃣ En Dashboard de Vercel (vercel.com/dashboard):
```
1. Click "Add New..." → "Project"
2. Click "Import Git Repository"
3. Busca: "CONTROL-GESTION-COBRANZA"
4. Selecciona y Click "Import"

# Vercel detectará automáticamente:
  - Framework: Vite ✓
  - Build Command: npm run build ✓
  - Output Directory: dist ✓
  
5. (Opcional) Configura variables en "Environment Variables":
   - VITE_SUPABASE_URL=https://tcqamchiwtijniiwbpde.supabase.co
   - VITE_SUPABASE_ANON_KEY=eyJ...
   
6. Click "Deploy"
```

### 3️⃣ Espera a que termine (~2-3 min)

### 4️⃣ Tu URL será:
```
https://control-gestion-cobranza.vercel.app
```

(O personalizada si lo configurás)

---

## 📱 Desde CLI (alternativa rápida):

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy interactivo
vercel

# Sigue instrucciones:
# - Conecta tu GitHub
# - Selecciona el proyecto
# - Déjalo hacer deploy

# Link a tu proyecto:
vercel --prod
```

---

## 🔄 Después del primer deploy:

```bash
# Cada push dispara deploy automático:
git add .
git commit -m "tu cambio"
git push origin main

# ✨ Vercel despliega automáticamente en ~30-60s
```

---

## 🛠️ Troubleshooting:

### ❌ Build falla en Vercel
```bash
# Testea localmente primero:
npm run build
npm run preview
# Si funciona local, prob es variable de entorno
```

### ❌ Conecta a Supabase pero da error
- Verifica `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- En Vercel: Settings → Environment Variables
- Redeploy después de cambiar

### ❌ Página en blanco
- F12 → Console → busca errores 404
- Ver logs: Vercel Dashboard → Deployments → Logs

---

## 📊 Monitoreo:

Dashboard Vercel muestra:
- ✅ Status deploy (Success/Failed)
- 📊 Analytics y Performance
- 🔍 Logs de build
- 💾 Storage/Bandwidth usado

---

## 🎯 Dominio personalizado (opcional):

Si querés usar tu propio dominio:
```
1. Compra dominio (godaddy, namecheap, etc)
2. En Vercel: Settings → Domains
3. Añade tu dominio
4. Actualiza DNS según instrucciones
5. SSL automático en ~15 min
```

---

## ✨ RESUMEN RÁPIDO:

```
vercel.com → Import Repo → Deploy → ✓ LIVE en production
```

**Listo!** Tu app está corriendo en Vercel con deploy automático.
