# 🔍 VERIFICACIÓN - GOOGLE APPS SCRIPT SIN CORS

El error CORS persiste porque:
1. **El código CORS NO está en el Google Apps Script actual**
2. **No se hizo "Nueva implementación" después de agregar doPost/doOptions**

---

## ACCIONES REQUERIDAS:

### A. ABRIR GOOGLE APPS SCRIPT
- Ir a: https://script.google.com/
- Seleccionar tu proyecto actual
- Click en el archivo principal (probablemente "Code.gs")

### B. VERIFICAR SI EXISTEN ESTAS FUNCIONES:

Buscar Ctrl+F: `function doPost`
Buscar Ctrl+F: `function doOptions`

**Si NO existen ambas funciones → necesitas actualizar el código**

---

### C. COPIAR CÓDIGO NUEVO (si no existen)

1. Abrir: `scripts/google-apps-script-v2.7-FINAL.js`
2. Seleccionar TODO (Ctrl+A)
3. Copiar (Ctrl+C)
4. En Google Apps Script: Seleccionar TODO (Ctrl+A)
5. Pegar (Ctrl+V)
6. Guardar (Ctrl+S)

---

### D. HACER NUEVA IMPLEMENTACIÓN

**Paso a paso:**

1. En Google Apps Script, arriba a la derecha:
   - Click en: **"Implementar"**
   - Seleccionar: **"Nueva implementación"**

2. En el diálogo que aparece:
   - **Tipo:** "Aplicación web"
   - **Ejecutar como:** Tu cuenta de Google
   - **Quién tiene acceso:** "Cualquiera"

3. Click: **"Implementar"**

4. Copiar la URL que aparece en el diálogo (ej: https://script.google.com/macros/s/XXXXXX/usercontent/latest/...)

---

### E. VERIFICAR Y CORREGIR URL

**Cambiar `/usercontent/` por `/exec`:**

| Tipo | URL | Correcto |
|------|-----|----------|
| ❌ INCORRECTA | `https://script.google.com/macros/s/[ID]/usercontent/latest/code.gs` | NO |
| ✅ CORRECTA | `https://script.google.com/macros/s/[ID]/exec` | SÍ |

**Tu URL actual (del .env.local):**
```
https://script.google.com/macros/s/AKfycbyEDPWSFIaxZB7TN0Dd2bE-G0NLuq8NxWMV5ja7KqF1Fk8qNP09NzSdpeLU9MNW3cWc6Q/exec
```

**Si cambió a una URL nueva, actualizar:**
```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/[NUEVA_ID]/exec
```

---

### F. ACTUALIZAR `.env.local` (si la URL cambió)

Archivo: `src/renderer/.env.local`

```
VITE_SUPABASE_URL=https://tcqamchiwtijniiwbpde.supabase.co
VITE_SUPABASE_ANON_KEY=[REDACTED]
VITE_INSTITUCION_ID=1
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/[NUEVA_ID]/exec
VITE_GOOGLE_SHEETS_API_KEY=[REDACTED]
```

---

### G. REINICIAR REACT

En terminal donde corre `npm run dev`:
1. Presionar: **Ctrl+C**
2. Esperar a que se detenga
3. Ejecutar: **npm run dev**
4. Esperar a que compile

---

### H. PROBAR NUEVAMENTE

1. En React, click en: **"Sincronizar Manualmente"**
2. Abrir consola (F12)
3. Verificar que NO aparezca el error CORS

---

## ✅ CHECKLIST FINAL

- [ ] Abri Google Apps Script
- [ ] Verificé que existen `function doPost` y `function doOptions`
- [ ] Si no existen, copié el código v2.7-FINAL.js
- [ ] Hice "Nueva implementación" → "Aplicación web"
- [ ] Verifiqué que la URL termina en `/exec`
- [ ] Actualicé `.env.local` si la URL cambió
- [ ] Reinicié React (Ctrl+C → npm run dev)
- [ ] Probé nuevamente el sincronizar

---

**Si aún falla:**
- Verificar logs en Google Apps Script (Ejecuciones)
- Confirmar que "Quién tiene acceso" es "Cualquiera"
- Probar URL directamente en navegador
