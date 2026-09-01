# 🎯 GUÍA FINAL: DE PÁGINA EN BLANCO A FUNCIONANDO

## 📊 ESTADO ACTUAL
```
✅ Build en Vercel: EXITOSO
✅ App deployada en: https://control-gestion-cobranza.vercel.app
❌ Página: BLANCA (sin variables de entorno)
```

---

## 🔥 SOLUCIÓN: 3 PASOS SIMPLES

### PASO 1️⃣: OBTENER CREDENCIALES (5 min)

**A. De Supabase:**
1. Abre: https://app.supabase.com
2. Proyecto → "Project Settings" → "API"
3. Copia:
   - **Project URL** → guardalo
   - **anon (public) key** → guardalo (es larga, empieza con eyJ)

**B. De Google:**
1. Abre tu Google Sheet con google_apps_script_v2.8.gs
2. Deploy → Web app
3. Copia la URL (termina en /exec)

---

### PASO 2️⃣: AGREGAR EN VERCEL (5 min)

1. Abre: https://vercel.com/dashboard
2. Proyecto: "control-gestion-cobranza"
3. Click "Settings"
4. Izquierda: "Environment Variables"
5. Agrega CADA UNA:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | (Project URL de Supabase) |
| `VITE_SUPABASE_ANON_KEY` | (anon key de Supabase) |
| `VITE_GOOGLE_APPS_SCRIPT_URL` | (Google Script URL) |
| `VITE_INSTITUCION_ID` | `1` |

**IMPORTANTE:** Asegúrate que "Production" está ✓

---

### PASO 3️⃣: REDEPLOY (3 min)

1. Vercel → "Deployments"
2. Click el deployment actual
3. Click "Redeploy"
4. Espera a que salga ✅ "Ready"

---

## ✅ VERIFICAR QUE FUNCIONE

### En navegador:
```
1. Abre: https://control-gestion-cobranza.vercel.app
2. Presiona F5 (o Ctrl+Shift+R para hard refresh)
3. Presiona F12 → Console
```

### Busca este mensaje:
```
🔍 VERIFICACIÓN DE VARIABLES DE ENTORNO

✅ 3 / 3 variables seteadas
```

Si ves eso: **¡FUNCIONA!** 🎉

---

## 🔍 TROUBLESHOOTING: SI SIGUE BLANCO

### 1. Verifica Console (F12 → Console tab)

**Si ves:**
```
❌ Faltan estas variables:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
```

**Solución:** Falta agregar en Vercel → Redeploy

**Si ves:**
```
Error: Failed to fetch...
```

**Solución:** URL o KEY incorrecta → Verifica en Supabase

### 2. Hard Refresh completo

```
Ctrl+Shift+R (o Cmd+Shift+R en Mac)
```

NO usar Ctrl+R, ese usa caché.

### 3. Incógnito

```
Abre en pestaña incógnita
Así evitas caché del navegador
```

---

## 📋 CHECKLIST ANTES DE CONTACTARME

- [ ] Obtuve Project URL de Supabase
- [ ] Obtuve anon key de Supabase
- [ ] Obtuve Google Script URL
- [ ] Agregué todas las 3 variables en Vercel
- [ ] Hice Redeploy
- [ ] Esperé a que completara (verde ✅)
- [ ] Recargué página (F5 o Ctrl+Shift+R)
- [ ] Abrí F12 → Console
- [ ] Vi el mensaje de verificación de variables

Si completaste todo y SIGUE blanco:
- Toma screenshot de F12 Console
- Toma screenshot de Vercel Environment Variables
- Comparte conmigo

---

## 🎬 SIGUIENTES PASOS (UNA VEZ FUNCIONANDO)

1. **Ejecutar migraciones SQL en Supabase** (para Caja Chica)
   - Archivo: `MIGRACIONES_SUPABASE_CAJA_CHICA.sql`

2. **Testear Google Apps Script**
   - Botón "Sincronizar Ahora" en la app
   - Debe conectar con Google y sincronizar

3. **Configurar usuarios y permisos**
   - En la app: Admin → Permisos

---

## 💡 IMPORTANTE

❌ **NO hacer:**
- Cambiar directorios de build (dist)
- Modificar package.json sin saber qué haces
- Borrar variables por error

✅ **HACER:**
- Verificar en Console que variables están OK
- Hard refresh después de cambios
- Redeploy después de agregar variables

---

## 🚀 TÚ ESTÁS A 3 PASOS DE TENERLO FUNCIONANDO

1. Copiar credenciales ← **EMPEZÁ AQUÍ**
2. Agregar en Vercel
3. Redeploy

¡Vos podes! 💪

Cualquier duda, preguntá.
