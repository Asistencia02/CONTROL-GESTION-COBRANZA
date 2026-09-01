# 🔧 DEBUGGING CORS - CONSOLE COMMANDS

## Test 1: Verificar CORS headers desde consola (F12)

Copiar y pegar en consola del navegador (F12):

```javascript
fetch('https://script.google.com/macros/s/AKfycbyEDPWSFIaxZB7TN0Dd2bE-G0NLuq8NxWMV5ja7KqF1Fk8qNP09NzSdpeLU9MNW3cWc6Q/exec?accion=test', {
  method: 'OPTIONS'
})
.then(r => {
  console.log('Status:', r.status);
  console.log('Headers CORS:');
  console.log('  Access-Control-Allow-Origin:', r.headers.get('Access-Control-Allow-Origin'));
  console.log('  Access-Control-Allow-Methods:', r.headers.get('Access-Control-Allow-Methods'));
  console.log('  Access-Control-Allow-Headers:', r.headers.get('Access-Control-Allow-Headers'));
  return r;
})
.catch(e => console.error('❌ Error:', e.message));
```

**Resultado esperado:**
```
Status: 200
Headers CORS:
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: POST, GET, OPTIONS
  Access-Control-Allow-Headers: Content-Type
```

---

## Test 2: Hacer POST a Google Apps Script

```javascript
fetch('https://script.google.com/macros/s/AKfycbyEDPWSFIaxZB7TN0Dd2bE-G0NLuq8NxWMV5ja7KqF1Fk8qNP09NzSdpeLU9MNW3cWc6Q/exec?accion=sincronizar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => {
  console.log('✅ Response OK:', r.status);
  return r.json();
})
.then(data => {
  console.log('📦 Datos:', data);
})
.catch(e => console.error('❌ Error:', e.message));
```

**Resultado esperado:**
```json
{
  "exito": true,
  "mensaje": "Sincronización completada",
  "data": {
    "datosNormalizados": { ... },
    "sincronizacion": { ... },
    "fecha": "..."
  }
}
```

---

## Test 3: Verificar logs en Google Apps Script

1. Ir a: https://script.google.com/
2. Seleccionar tu proyecto
3. Arriba a la derecha: **"Ejecuciones"**
4. Ver el log más reciente
5. Buscar:
   - `✅ INICIANDO FULL AUTO v2.7` → Script ejecutó
   - `❌ Error` → Hay error
   - Timestamps → Verificar que se ejecutó hace poco

---

## Test 4: Verificar Headers en Network tab

1. Abrir consola (F12)
2. Pestaña **"Network"**
3. Hacer click en "Sincronizar Manualmente" en React
4. En la lista de requests, buscar:
   ```
   https://script.google.com/macros/s/.../exec?accion=sincronizar
   ```
5. Click en ese request
6. Pestaña **"Response Headers"** (o "Headers")
7. Verificar que exista:
   ```
   Access-Control-Allow-Origin: *
   ```

**Si NO aparece:**
- El Google Apps Script NO tiene `doOptions` implementado
- Necesita redeploy

---

## Test 5: Verificar URL en .env.local

En terminal:
```bash
cat src/renderer/.env.local | grep GOOGLE_APPS_SCRIPT
```

Resultado esperado:
```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyEDPWSFI.../exec
```

**Verificar que termina en `/exec` (NO `/usercontent/`)**

---

## Test 6: Verificar que React lee la URL

En consola (F12), pegar:
```javascript
import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL
```

Resultado esperado:
```
"https://script.google.com/macros/s/AKfycbyEDPWSFI.../exec"
```

---

## 🚨 SI TODOS LOS TESTS FALLAN

### Paso 1: Verificar código en Google Apps Script

```javascript
// Buscar Ctrl+F en Google Apps Script
function doOptions
function doPost
function ejecutarFullAutoHTTP
```

**Si NO existen:** Copiar `scripts/google-apps-script-v2.7-FINAL.js`

### Paso 2: Verificar deploy

1. Google Apps Script → Arriba derecha
2. Click en la versión actual
3. Verificar:
   - Tipo: "Aplicación web"
   - Acceso: "Cualquiera"
   - Última actualización: Hace poco

### Paso 3: Hacer nuevo deploy

1. **Implementar** → **Nueva implementación**
2. Configurar correctamente
3. Copiar URL (cambiar `/usercontent/` por `/exec`)
4. Actualizar `.env.local`
5. Reiniciar React

### Paso 4: Esperar 1-2 minutos

A veces Google Apps Script tarda en actualizar. Esperar y probar de nuevo.

---

## 📊 RESUMEN DE VERIFICACIONES

| Test | Comando | Resultado esperado |
|------|---------|------------------|
| CORS Headers | OPTIONS request | `Access-Control-Allow-Origin: *` |
| POST request | POST a /exec | Status 200, JSON response |
| Google Logs | Ejecuciones | "✅ INICIANDO FULL AUTO v2.7" |
| Network Headers | F12 → Network | CORS headers presentes |
| .env.local | cat src/renderer/.env.local | URL terminada en `/exec` |
| React env | import.meta.env | URL correcta |

---

**Usa estos tests para diagnosticar dónde está el problema.**
