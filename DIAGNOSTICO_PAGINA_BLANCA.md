# 🔍 DIAGNÓSTICO: PÁGINA EN BLANCO EN VERCEL

## ✅ Lo que verificué:
- ✓ `src/renderer/index.html` existe
- ✓ `dist/index.html` se generó correctamente
- ✓ `vercel.json` tiene SPA redirects
- ✓ Build en Vercel completó sin errores

## 🔴 Probable causa: VARIABLES DE ENTORNO NO SETEADAS

Vercel desplegó pero la app no funciona porque falta comunicar con Supabase.

---

## 🔧 SOLUCIÓN: VERIFICAR EN VERCEL

### 1. Ve a Vercel Dashboard
```
https://vercel.com/dashboard/[tu-proyecto]
→ Settings
→ Environment Variables
```

### 2. Verifica que están TODAS estas variables:
```
☐ VITE_SUPABASE_URL
☐ VITE_SUPABASE_ANON_KEY
☐ VITE_GOOGLE_APPS_SCRIPT_URL
```

Si alguna FALTA o está vacía:

**Para VITE_SUPABASE_URL:**
1. https://app.supabase.com → Tu proyecto
2. Settings → API → Project URL
3. Copia y pega en Vercel

**Para VITE_SUPABASE_ANON_KEY:**
1. Mismo lugar → API → "anon" (public key)
2. Copia el valor que empieza con `eyJ...`
3. Pega en Vercel

**Para VITE_GOOGLE_APPS_SCRIPT_URL:**
1. Tu Google Sheet SINCRONIZADOR
2. Deploy → Web app URL
3. Copia URL que termina en `/exec`
4. Pega en Vercel

### 3. IMPORTANTE: Después de agregar/cambiar variables

```
Vercel → Deployments
→ Click el deployment actual
→ Click "Redeploy"
```

Espera a que redeploye (~2-3 min)

---

## 🔍 VERIFICAR EN NAVEGADOR (F12)

1. Abre: `https://control-gestion-cobranza.vercel.app`
2. Presiona **F12** → Console
3. Busca errores:

### ❌ Error típico 1: Variables vacías
```
⚠️ Variables de Supabase no configuradas. Define VITE_SUPABASE_URL...
```

**Solución:** Agregar variables en Vercel

### ❌ Error típico 2: No conecta a Supabase
```
Error: Failed to fetch...
```

**Solución:** Verificar que URL y KEY son correctas

### ❌ Error típico 3: CORS error
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solución:** Esto es normal. Supabase maneja CORS. Si persiste, verificar RLS.

---

## 📋 CHECKLIST

- [ ] Abriste Vercel → Settings → Environment Variables
- [ ] Verificaste que VITE_SUPABASE_URL existe
- [ ] Verificaste que VITE_SUPABASE_ANON_KEY existe
- [ ] Verificaste que VITE_GOOGLE_APPS_SCRIPT_URL existe
- [ ] Si faltaba algo, lo agregaste
- [ ] Hiciste "Redeploy"
- [ ] Esperaste a que complete
- [ ] Recargaste la página (F5 o Ctrl+Shift+R)
- [ ] Presionaste F12 y miraste console
- [ ] No hay errores de variables

---

## 🆘 SI SIGUE EN BLANCO

### Opción 1: Ver logs de Vercel
```
Vercel → Deployments → Current
→ Build Logs (arriba)
→ Busca errores en la compilación
```

### Opción 2: Verificar que el JS se cargó
```
F12 → Network tab
→ Recarga (F5)
→ Busca "index-*.js"
→ Debe tener status 200 (no 404)
```

### Opción 3: Verificar que React cargó
```
F12 → Console
→ Escribe: document.getElementById('root')
→ Debe mostrar: <div id="root">...</div>
```

Si show `null`, significa el HTML no se cargó correctamente.

---

## 💡 TIPS

1. **No usar Ctrl+R**, usar **Ctrl+Shift+R** (hard refresh)
2. **Limpiar caché de Vercel**: Deployments → Redeploy
3. **Esperar 3-5 min** después de hacer cambios
4. **Verificar en incógnito** para evitar caché del navegador

---

## ✨ PRÓXIMOS PASOS

1. Sigue el checklist arriba
2. Si sigue en blanco, compartí:
   - Screenshots de Vercel Environment Variables
   - Screenshot de F12 Console con errores
   - URL donde está hosteado

Así podemos debugguear exactamente qué falta.
