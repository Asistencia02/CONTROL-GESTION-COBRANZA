# Quickstart

## 1️⃣ Instalar dependencias

```bash
npm install
```

## 2️⃣ Configurar variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus credenciales de Supabase:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3️⃣ Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173)

## 4️⃣ Build para producción

```bash
npm run build
```

Genera archivos optimizados en `dist/`

## 📦 Obtener credenciales de Supabase

1. Ve a [supabase.com](https://supabase.com) → Dashboard
2. Selecciona tu proyecto
3. Settings → API
4. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon key** → `VITE_SUPABASE_ANON_KEY`

## 🚀 Deploy

Ver [DEPLOY.md](./DEPLOY.md)
