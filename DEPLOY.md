# Deployment

## Vercel (Recomendado)

### 1. Push a GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/tu-usuario/gestion-cobranzas.git
git push -u origin main
```

### 2. Conectar a Vercel

- Ve a [vercel.com](https://vercel.com)
- Click "New Project"
- Selecciona tu repositorio
- Vite se detecta automáticamente
- Variables de entorno:
  - `VITE_SUPABASE_URL`: Tu URL de Supabase
  - `VITE_SUPABASE_ANON_KEY`: Tu clave anónima

### 3. Deploy

```bash
git push origin main
```

Vercel automaticamente realizará build y deployment.

## Netlify

```bash
npm run build
```

Arrastra la carpeta `dist/` a [netlify.com](https://netlify.com)

O conecta tu repo:
- Settings → Env variables
- Build command: `npm run build`
- Publish directory: `dist`

## Docker (Para producción autoalojada)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

```bash
docker build -t gestion-cobranzas .
docker run -p 3000:3000 -e VITE_SUPABASE_URL="..." -e VITE_SUPABASE_ANON_KEY="..." gestion-cobranzas
```

## Variables de entorno en producción

Todas las plataformas requieren:
- `VITE_SUPABASE_URL`: `https://tu-proyecto.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: Tu clave API anónima

Obtén estas de tu panel de Supabase → Settings → API.
