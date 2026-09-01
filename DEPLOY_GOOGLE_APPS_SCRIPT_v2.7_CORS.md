# 🚀 DEPLOY GOOGLE APPS SCRIPT v2.7 CON CORS

## ✅ PASO 1: ACTUALIZAR GOOGLE APPS SCRIPT

1. **Abrir el Google Apps Script:**
   - Ir a tu Google Apps Script actual
   - Limpiar TODO el código

2. **Copiar el código COMPLETO de:**
   ```
   scripts/google-apps-script-v2.7-FINAL.js
   ```

3. **Pegar en el editor del Google Apps Script**

---

## ✅ PASO 2: DEPLOY COMO "APLICACIÓN WEB"

1. **Ir a: Implementar → Nueva implementación**
   ```
   Click en ⚙️ (Configuración) en la parte superior derecha
   → Selecciona "Nueva implementación"
   → Tipo: "Aplicación web"
   ```

2. **Configurar:**
   - **Ejecutar como:** Tu cuenta de Google
   - **Quién tiene acceso:** Cualquiera (para permitir CORS)
   - Click en **"Implementar"**

3. **Copiar la URL:**
   ```
   https://script.google.com/macros/s/[SCRIPT_ID]/usercontent/newest/code.gs
   ```
   
   **IMPORTANTE:** Cambiar `/usercontent/` por `/exec`:
   ```
   https://script.google.com/macros/s/[SCRIPT_ID]/exec
   ```

---

## ✅ PASO 3: VERIFICAR EN `.env.local`

El archivo `src/renderer/.env.local` YA tiene:
```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbyEDPWSFIaxZB7TN0Dd2bE-G0NLuq8NxWMV5ja7KqF1Fk8qNP09NzSdpeLU9MNW3cWc6Q/exec
```

**Si cambió la URL, actualizar en `.env.local`**

---

## ✅ PASO 4: VERIFICAR CORS HABILITADO

En el código Google Apps Script, confirmar que existen:

### **Función `doPost`:**
```javascript
function doPost(e) {
  // ... lógica ...
  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader('Access-Control-Allow-Origin', '*')  // ✅ CORS
    .addHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type');
}
```

### **Función `doOptions`:**
```javascript
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .addHeader('Access-Control-Allow-Origin', '*')  // ✅ CORS
    .addHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type')
    .addHeader('Access-Control-Max-Age', '86400');
}
```

---

## ✅ PASO 5: TESTING

### **En la consola (F12):**

```javascript
fetch('https://script.google.com/macros/s/AKfycbyEDPWSFIaxZB7TN0Dd2bE-G0NLuq8NxWMV5ja7KqF1Fk8qNP09NzSdpeLU9MNW3cWc6Q/exec?accion=sincronizar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(e => console.error('❌', e.message))
```

**Respuesta esperada:**
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

## ✅ PASO 6: PROBAR DESDE REACT

1. **Abrir la aplicación:**
   ```bash
   npm run dev
   ```

2. **Navegar a: SINCRONIZACIÓN → Sincronizar Manualmente**

3. **Verificar logs (F12 → Console):**
   ```
   ✅ 200 OK - Sin errores CORS
   ```

---

## 🔍 TROUBLESHOOTING

### **Error: "No 'Access-Control-Allow-Origin' header"**

**Solución:**
1. Verificar que `doOptions()` existe en Google Apps Script
2. Redeploy como "Nueva implementación"
3. Cambiar URL de `/usercontent/` a `/exec`

### **Error: "404 Not Found"**

**Solución:**
1. Verificar URL en `.env.local`
2. Confirmar que el Google Apps Script está en estado "Implementado"

### **Timeout o "Failed to fetch"**

**Solución:**
1. Aumentar timeout en `useImportadorGoogleSheets.ts`
2. Verificar que el archivo Excel existe
3. Revisar logs en Google Apps Script (Ejecuciones)

---

## 📝 CHECKLIST FINAL

- [ ] Código v2.7 copiado en Google Apps Script
- [ ] Deploy como "Aplicación web" (última versión)
- [ ] URL del deploy terminada en `/exec`
- [ ] `.env.local` tiene la URL actualizada
- [ ] `doPost()` y `doOptions()` tienen headers CORS
- [ ] Probado en consola (F12)
- [ ] Probado desde React (click en Sincronizar)

---

**Status:** ✅ CORS habilitado y listo para producción
