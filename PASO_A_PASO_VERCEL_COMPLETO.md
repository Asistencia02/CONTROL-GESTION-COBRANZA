# 🚀 GUÍA PASO A PASO: CONFIGURAR VERCEL CORRECTAMENTE

## 📍 SITUACIÓN ACTUAL
- ✅ Deploy completó sin errores
- ❌ Página aparece en blanco
- 🔴 Probable causa: Variables de entorno NO seteadas

---

## 🎯 OBJETIVO
Agregar todas las variables para que funcione correctamente

---

## ⏱️ TIEMPO ESTIMADO: 10 minutos

---

## 📊 PASO 1: OBTENER CREDENCIALES DE SUPABASE

### 1.1 Abre Supabase
```
https://app.supabase.com
```

### 1.2 Selecciona tu proyecto
```
Click en el proyecto: "Control Gestion Cobranza"
(o busca en la lista)
```

### 1.3 Ve a Settings → API
```
Izquierda → Project Settings
→ Tab "API"
```

### 1.4 COPIA ESTOS 2 VALORES (tal cual aparecen, sin espacios extra)

**A. Project URL:**
```
Busca: "Project URL"
Valor comienza con: https://

COPIA EXACTO: https://tcqamchiwtijniiwbpde.supabase.co
```

**B. anon (public) key:**
```
Busca: "anon" o "public"
Valor comienza con: eyJ

COPIA EXACTO: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE:** El valor es LARGO (varias líneas). Cópialo completo.

---

## 📝 PASO 2: OBTENER URL DE GOOGLE APPS SCRIPT

### 2.1 Abre tu Google Sheet SINCRONIZADOR
```
El que tiene el código google_apps_script_v2.8.gs
```

### 2.2 Ve a Deploy
```
Top derecha → Deploy (o "🔧")
→ Busca "Deployments"
```

### 2.3 Busca Web App
```
Debe haber un deployment tipo "Web app"
Si NO hay:
  - Click "New deployment"
  - Type: "Web app"
  - Execute as: Tu email
  - Who has access: "Anyone"
  - Click "Deploy"
```

### 2.4 COPIA LA URL
```
La URL se verá así:
https://script.google.com/macros/s/AKfycbxoNGsv7dkUSCRcexmgPlHfXKlyrHYfhFHAEODJRm6m00KJ3KHR1DdNnuAm1sXJzv0pig/exec

COPIA EXACTO (incluye el /exec al final)
```

---

## ✨ PASO 3: AGREGAR VARIABLES EN VERCEL

### 3.1 Abre Vercel Dashboard
```
https://vercel.com/dashboard
```

### 3.2 Selecciona tu proyecto
```
"control-gestion-cobranza"
```

### 3.3 Entra en Settings
```
Top → "Settings"
```

### 3.4 Ve a Environment Variables
```
Izquierda → "Environment Variables"
```

### 3.5 Agrega VARIABLE 1: VITE_SUPABASE_URL

```
1. Click "Add New"
2. Key: VITE_SUPABASE_URL
3. Value: https://tcqamchiwtijniiwbpde.supabase.co
4. Select Environment: Production ✓
5. Click "Save"
```

### 3.6 Agrega VARIABLE 2: VITE_SUPABASE_ANON_KEY

```
1. Click "Add New"
2. Key: VITE_SUPABASE_ANON_KEY
3. Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (la clave larga)
4. Select Environment: Production ✓
5. Click "Save"
```

### 3.7 Agrega VARIABLE 3: VITE_GOOGLE_APPS_SCRIPT_URL

```
1. Click "Add New"
2. Key: VITE_GOOGLE_APPS_SCRIPT_URL
3. Value: https://script.google.com/macros/s/AKfycbxoNGsv7dkUSCRcexmgPlHfXKlyrHYfhFHAEODJRm6m00KJ3KHR1DdNnuAm1sXJzv0pig/exec
4. Select Environment: Production ✓
5. Click "Save"
```

### 3.8 Agrega VARIABLE 4 (OPCIONAL): VITE_INSTITUCION_ID

```
1. Click "Add New"
2. Key: VITE_INSTITUCION_ID
3. Value: 1
4. Select Environment: Production ✓
5. Click "Save"
```

---

## 🔄 PASO 4: REDEPLOY

### 4.1 Ir a Deployments
```
Top → "Deployments"
```

### 4.2 Click el deployment actual
```
El primero de la lista (debe tener ✓ o ❌)
```

### 4.3 Click "Redeploy"
```
Arriba a la derecha
```

### 4.4 Espera a que termine
```
Verá: "Building"
Luego: "Ready" (con ✓ verde)

Tarda ~2-3 minutos
```

---

## ✅ PASO 5: VERIFICAR QUE FUNCIONE

### 5.1 Abre la URL en navegador
```
https://control-gestion-cobranza.vercel.app
```

### 5.2 Presiona F5 (hard refresh)
```
O Ctrl+Shift+R
```

### 5.3 Abre DevTools
```
Presiona F12
```

### 5.4 Ve a Console
```
Tab "Console" (en DevTools)
```

### 5.5 Busca estos mensajes:

**✅ SI VES ESTO - ESTÁ FUNCIONANDO:**
```
✓ Datos cargando...
✓ Usuario autenticado
✓ Dashboard visible
✓ No hay errores en rojo
```

**❌ SI VES ESTO - FALTA ALGO:**
```
⚠️ Variables de Supabase no configuradas
→ Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY

Error: Failed to fetch
→ Verificar que URLs son correctas

CORS error
→ Normal. Supabase lo maneja. Recarga.
```

---

## 🎯 PASO 6: PROBAR FUNCIONALIDADES

### 6.1 Login
```
1. Abre la app
2. Deberías ver pantalla de login
3. Ingresa tus credenciales
```

### 6.2 Dashboard
```
1. Si login OK, verás Dashboard
2. Datos deberían cargar de Supabase
3. Si ves números/gráficos → TODO OK ✓
```

### 6.3 Sincronización Google
```
1. Busca botón "Sincronizar Ahora"
2. Click
3. Debe conectar con Google Apps Script
4. Si dice "Sincronizando..." → FUNCIONA ✓
```

---

## 📋 CHECKLIST FINAL

- [ ] Copié Project URL de Supabase
- [ ] Copié anon key de Supabase
- [ ] Copié URL del Google Apps Script
- [ ] Agregué VITE_SUPABASE_URL en Vercel
- [ ] Agregué VITE_SUPABASE_ANON_KEY en Vercel
- [ ] Agregué VITE_GOOGLE_APPS_SCRIPT_URL en Vercel
- [ ] Hice Redeploy
- [ ] Esperé a que completara
- [ ] Abrí URL y presioné F5
- [ ] Verifiqué en F12 Console sin errores
- [ ] Logueé correctamente
- [ ] Dashboard muestra datos
- [ ] Botón Sincronizar aparece

---

## 🎉 ¡ÉXITO!

Si completaste todos los pasos:
✅ Tu app está funcionando en producción
✅ Conecta a Supabase correctamente
✅ Google Apps Script sincroniza

---

## 🆘 SI SIGUE SIN FUNCIONAR

### Antes de nada: Intenta esto
```
1. Hard refresh: Ctrl+Shift+R
2. Abre en navegador incógnito
3. Limpia caché del navegador
```

### Si sigue:

**Comparte conmigo:**
1. Screenshot de Vercel → Settings → Environment Variables
2. Screenshot de F12 → Console (con errores)
3. URL donde está hosteado
4. Qué ves exactamente (blanco, error, etc)

Así podemos debuggear exactamente.

---

## 📞 LINKS ÚTILES

- Supabase Dashboard: https://app.supabase.com
- Vercel Dashboard: https://vercel.com/dashboard
- Tu app: https://control-gestion-cobranza.vercel.app

---

**Sigue estos pasos al pie y debería funcionar correctamente.**
