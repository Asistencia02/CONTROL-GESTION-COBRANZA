# Guía de Deployment en Vercel

## Paso 1: Inicializar Git

```bash
git init
git add .
git commit -m "Initial commit - Gestion de Cobranzas Web"
```

## Paso 2: Crear Repositorio en GitHub

### Opción A: Desde GitHub Web

1. Ve a [github.com](https://github.com) y accede
2. Click en **"+"** (esquina superior derecha) → **"New repository"**
3. Nombre: `gestion-cobranzas`
4. Descripción: `Gestión de Cobranzas - Aplicación Web`
5. Privado/Público: (tu elección)
6. Click **"Create repository"**

### Opción B: Desde CLI

```bash
# Si tienes GitHub CLI
gh repo create gestion-cobranzas --public --source=. --remote=origin --push
```

## Paso 3: Agregar Remote y Push

Si usaste la opción A en web:

```bash
git remote add origin https://github.com/tu-usuario/gestion-cobranzas.git
git branch -M main
git push -u origin main
```

## Paso 4: Conectar a Vercel

### Opción A: Dashboard Vercel (Recomendado)

1. Ve a [vercel.com](https://vercel.com)
2. Click **"New Project"**
3. Click **"Import Git Repository"**
4. Selecciona tu repo `gestion-cobranzas`
5. Vercel detecta automáticamente:
   - Framework: **Vite** ✅
   - Build command: `npm run build` ✅
   - Output directory: `dist` ✅
6. Click **"Deploy"**

### Opción B: CLI Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
# Sigue las instrucciones interactivas
```

## Paso 5: Configurar Variables de Entorno

### En Dashboard Vercel:

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Añade:
   ```
   VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
4. Click **"Save"**
5. **Deployments** → Click el deployment más reciente → **Redeploy**

## Paso 6: Verificar

Tu app estará disponible en:
```
https://gestion-cobranzas.vercel.app
```

(O un dominio personalizado si lo configuraste)

## 🔄 Flujo Automático

Después del primer setup, cada `git push` despliega automáticamente:

```bash
git add .
git commit -m "Nueva feature"
git push origin main
# ✨ Vercel deploya automáticamente
```

## 📊 Monitoreo

En dashboard de Vercel puedes ver:
- ✅ Status de deployments
- 📊 Uso de recursos
- 🔍 Logs de build
- 🌍 Dominios

## 🚨 Troubleshooting

### Build falla
- Verifica `npm run build` funciona localmente
- Check `vite.config.ts`
- Ver logs en Vercel dashboard

### Variables no funcionan
- Asegúrate de usar prefix `VITE_` (Vite lo requiere)
- Redeploy después de añadir variables

### Sitio en blanco
- Check `dist/index.html` se generó
- Verifica console del navegador (F12)
- Ver logs de Vercel

## ✨ Dominios Personalizados

En Vercel → Settings → Domains:
1. Añade tu dominio
2. Configura DNS según instrucciones
3. SSL automático (Let's Encrypt)

## 🎉 ¡Listo!

Tu app está en producción.

Para cambios:
```bash
git push origin main
# Deploy automático en ~30 segundos
```
