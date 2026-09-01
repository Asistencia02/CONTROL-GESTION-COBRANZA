# 🔐 VARIABLES DE ENTORNO PARA VERCEL + GOOGLE APPS SCRIPT

## 📋 VARIABLES PARA VERCEL (La App Web)

### ✅ Variables REQUERIDAS para que funcione TODO

Estas van en: **Vercel Dashboard → Tu Proyecto → Settings → Environment Variables**

---

## 🔑 VARIABLE 1: VITE_SUPABASE_URL

**¿Para qué?** URL de tu base de datos Supabase

**¿Dónde obtener?**
```
1. Ve a https://app.supabase.com
2. Selecciona tu proyecto: "Control Gestion Cobranza"
3. Izquierda → "Project Settings" → "API"
4. Copia el valor de "Project URL"
```

**Valor esperado:**
```
VITE_SUPABASE_URL=https://tcqamchiwtijniiwbpde.supabase.co
```

---

## 🔑 VARIABLE 2: VITE_SUPABASE_ANON_KEY

**¿Para qué?** Clave pública para que la app acceda a Supabase desde el navegador

**¿Dónde obtener?**
```
1. Mismo lugar: https://app.supabase.com
2. Tu Proyecto → "Project Settings" → "API"
3. Busca la sección "Keys"
4. Copia el valor de "anon (public)" (empieza con eyJ...)
```

**Valor esperado:**
```
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcWFtY2hpd3Rpamppd2JwZGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcxODcyMjgwMCwiZXhwIjoxODc2NDg5MjAwfQ...
```

⚠️ **IMPORTANTE:** Esta es la clave PÚBLICA (anon), está diseñada para estar en el navegador. NO es secreto.

---

## 🔑 VARIABLE 3: VITE_GOOGLE_APPS_SCRIPT_URL ⭐ CRÍTICA

**¿Para qué?** URL del webhook de Google Apps Script que sincroniza Excel con Supabase

**¿Dónde obtener?**

### Opción A: Si ya tienes Google Sheet con el script

```
1. Abre tu Google Sheet SINCRONIZADOR
   (el que contiene google_apps_script_v2.8.gs)

2. Top → "Projects" o ⚙️ (Proyecto) → "Deploy"

3. Busca un "Deployment" existente con tipo "Web app"
   (Si no hay, va a "New deployment" → Type: "Web app" → Deploy)

4. Click en el deployment → Copia la URL
   (Termina en .../exec?...)

5. COPIA la URL completa, ejemplo:
   https://script.google.com/macros/s/AKfycbxoNGsv7dkUSCRcexmgPlHfXKlyrHYfhFHAEODJRm6m00KJ3KHR1DdNnuAm1sXJzv0pig/exec
```

### Opción B: Si necesitas crear el deployment

```
1. Google Sheet (el que tiene el código)
2. Editor → Tools → Script Editor
3. Top → "Deploy" → "New deployment"
4. Type: "Web app"
5. Execute as: Tu email
6. Who has access: "Anyone"
7. Click "Deploy"
8. Copia la URL del modal
9. Esa URL va en VITE_GOOGLE_APPS_SCRIPT_URL
```

**Valor esperado:**
```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbxoNGsv7dkUSCRcexmgPlHfXKlyrHYfhFHAEODJRm6m00KJ3KHR1DdNnuAm1sXJzv0pig/exec
```

---

## 🔑 VARIABLE 4: VITE_GOOGLE_SHEETS_API_KEY (Opcional)

**¿Para qué?** API Key de Google para acceso directo a Google Sheets (si lo usas)

**¿Dónde obtener?**
```
1. Ve a https://console.cloud.google.com
2. Crea un proyecto (o selecciona existente)
3. APIs & Services → Credentials
4. Create Credentials → API Key
5. Copia la clave
```

**Valor esperado:**
```
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyC1234567890abcdefghijklmnopqrstu
```

⚠️ **Nota:** Esta variable es OPCIONAL. Solo necesaria si usas Google Sheets API directo.

---

## 🔑 VARIABLE 5: VITE_INSTITUCION_ID (Opcional)

**¿Para qué?** ID de institución por defecto al cargar la app

**Valor esperado:**
```
VITE_INSTITUCION_ID=1
```

**Nota:** Si no la seteas, la app te pide que selecciones institución al iniciar.

---

## 📊 TABLA RESUMEN: TODAS LAS VARIABLES

| Variable | Requerida | Dónde obtener | Valor ejemplo |
|----------|-----------|---------------|---------------|
| `VITE_SUPABASE_URL` | ✅ SÍ | Supabase → Settings → API → Project URL | `https://tcqamchiwtijniiwbpde.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | ✅ SÍ | Supabase → Settings → API → anon key | `eyJhbGciOi...` |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | ✅ SÍ (para sync) | Google Sheet → Deploy → Web app URL | `https://script.google.com/macros/s/.../exec` |
| `VITE_GOOGLE_SHEETS_API_KEY` | ❌ No (opcional) | Google Cloud Console → Credentials | `AIzaSyC...` |
| `VITE_INSTITUCION_ID` | ❌ No (opcional) | Tu BD | `1` |

---

## 🚀 PASO A PASO: AGREGAR A VERCEL

### 1. Obtener todas las credenciales

**Supabase:**
```
https://app.supabase.com/project/[tu-proyecto]/settings/api

Copia:
- Project URL → VITE_SUPABASE_URL
- anon (public) key → VITE_SUPABASE_ANON_KEY
```

**Google Apps Script:**
```
Tu Google Sheet SINCRONIZADOR → Deploy → Web app URL
Copia → VITE_GOOGLE_APPS_SCRIPT_URL
```

### 2. Ir a Vercel Dashboard

```
https://vercel.com/dashboard
→ Selecciona tu proyecto: "control-gestion-cobranza"
→ Click "Settings"
```

### 3. Agregar Variables de Entorno

```
Settings → Environment Variables

Para cada variable:
1. Click "Add New"
2. Key: (nombre de variable, ej: VITE_SUPABASE_URL)
3. Value: (valor obtenido arriba)
4. Select Environment: Production (checked ✓)
5. Click "Save"

Variables a agregar:
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_ANON_KEY
✓ VITE_GOOGLE_APPS_SCRIPT_URL
⚠️ VITE_GOOGLE_SHEETS_API_KEY (si la usas)
⚠️ VITE_INSTITUCION_ID (si quieres default)
```

### 4. Redeploy

```
Vercel → Deployments
→ Click el deployment más reciente
→ Click "Redeploy"

Espera ~2-3 minutos a que complete
```

### 5. Verificar funcionamiento

```
Abre: https://control-gestion-cobranza.vercel.app

Comprueba:
✅ Página carga sin errores 404
✅ Puedes hacer login
✅ Datos se cargan de Supabase
✅ Botón "Sincronizar Ahora" aparece
✅ Si clickeas sync, conecta con Google Apps Script
```

---

## 🔄 FLUJO COMPLETO DE DATOS

```
📱 VERCEL (Tu App Web)
   │
   ├─→ VITE_SUPABASE_URL
   ├─→ VITE_SUPABASE_ANON_KEY
   └─→ VITE_GOOGLE_APPS_SCRIPT_URL
        │
        ├─→ 🗄️ SUPABASE (Database)
        │   (Lee/escribe datos)
        │
        └─→ 📊 GOOGLE APPS SCRIPT
            (Sincroniza Excel → Supabase)
```

---

## ✨ CHECKLIST FINAL

- [ ] Tienes URL y ANON_KEY de Supabase
- [ ] Tienes URL del Google Apps Script
- [ ] Agregaste TODAS las variables en Vercel
- [ ] Hiciste "Redeploy"
- [ ] Web app carga sin errores
- [ ] Puedes hacer login
- [ ] Botón "Sincronizar Ahora" funciona
- [ ] Google Apps Script recibe la llamada y sincroniza

---

## 🆘 TROUBLESHOOTING

### ❌ "Error: VITE_SUPABASE_URL not found"

**Causa:** Variable no seteada en Vercel

**Solución:**
```
1. Vercel Dashboard → Settings → Environment Variables
2. Verifica que VITE_SUPABASE_URL está
3. Si no está, agrégala
4. Redeploy
```

### ❌ "Botón Sincronizar no funciona"

**Causa:** VITE_GOOGLE_APPS_SCRIPT_URL incorrecta o vacía

**Solución:**
```
1. Vercel → Settings → Environment Variables
2. Busca VITE_GOOGLE_APPS_SCRIPT_URL
3. Si no está, agrégala con URL correcta del Google Sheet
4. Si está pero da error:
   - Verifica que la URL termina en /exec
   - Verifica que el deployment está activo en Google
5. Redeploy y testea
```

### ❌ "Conexión a Supabase falla"

**Causa:** ANON_KEY incorrecta

**Solución:**
```
1. Supabase Dashboard → Settings → API
2. Copia nuevamente el anon key
3. Verela → actualiza VITE_SUPABASE_ANON_KEY
4. Redeploy
```

### ❌ "Google Apps Script da error de CORS"

**Causa:** Google no autoriza la llamada desde Vercel

**Solución:**
```
Es NORMAL que Google bloquee. El script usa mode: 'no-cors'
para evitar esto. Si sigue dando error:

1. Google Sheet → Deploy → Editar deployment
2. "Who has access": Asegúrate que es "Anyone"
3. Redeploy el script
4. Vercel: Redeploy también
```

---

## 📌 VARIABLES HARDCODEADAS EN GOOGLE APPS SCRIPT

El archivo `google_apps_script_v2.8.gs` ya tiene:

```javascript
const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
```

Estas NO van en Vercel porque:
- Google Apps Script corre en Google (no en Vercel)
- El script sincroniza directamente a Supabase
- La URL ya está en el script

---

**¡LISTO!** Todo configurado. Solo agrégalas en Vercel y redeploy.

Ver también: `DEPLOY_A_VERCEL_AHORA.md` para instrucciones completas de deployment.
