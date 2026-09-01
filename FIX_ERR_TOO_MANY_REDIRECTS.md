# 🔥 SOLUCIÓN: ERR_TOO_MANY_REDIRECTS

## ✅ LO QUE HICE

Cambié `vercel.json` de `rewrites` a `routes` correcta:

**ANTES (causaba bucle):**
```json
"rewrites": [{"source": "/((?!.*\\.).*)", "destination": "/index.html"}]
```

**AHORA (correcto):**
```json
"routes": [
  {"src": "/assets/.*", "headers": {"cache-control": "..."}},
  {"src": "/.*", "dest": "/index.html"}
]
```

---

## 🚀 PASOS EN VERCEL

### 1. Limpiar deployments viejos
```
https://vercel.com/dashboard/[tu-proyecto]
→ Deployments
→ Click los deployments rojos (failed)
→ ⋮ (menú) → Delete
```

### 2. Hard redeploy
```
Deployments → El deployment más reciente
→ ⋮ (menú) → Redeploy
→ (O hacer un nuevo git push)
```

### 3. Clear cache
```
Vercel → Settings → Caching
→ Purge All
```

### 4. Verifica en navegador
```
https://cobranzaespecial-d9cvirebq-contable2.vercel.app
Ctrl+Shift+R (hard refresh)
F12 → Console
Busca: ¿Siguen los errores de redirect?
```

---

## 🔍 SI SIGUE

### Opción 1: Verificar que el push llegó
```
Vercel → Deployments
Verifica que el commit sea: 369726e "fix: Usar routes correcta"

Si no está, el push no llegó.
```

### Opción 2: Verificar logs
```
Vercel → Deployments → Current
→ "Build Logs" (arriba)
Busca: ¿Hay errores en la compilación?
```

### Opción 3: Test local
```
npm run build
npm run preview

¿Funciona en localhost:4173?
Si no, el problema es local, no en Vercel.
```

---

## 💡 ÚLTIMA OPCIÓN

Si nada funciona, eliminar `vercel.json` completamente:

```bash
git rm vercel.json
git commit -m "Remove vercel.json - use defaults"
git push origin main
# Redeploy en Vercel
```

Vercel tiene defaults buenos para Vite.

---

## ✨ PRÓXIMO INTENTO

1. Espera 1-2 min después del redeploy
2. Ctrl+Shift+R en el navegador (hard refresh completo)
3. Abre en incógnito
4. Limpia caché del navegador

Avísame qué ves en F12 Console.
