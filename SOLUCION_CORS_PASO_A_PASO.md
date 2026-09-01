# 📋 RESUMEN: ERROR CORS Y SOLUCIÓN

## ❌ EL PROBLEMA

```
Access to fetch at 'https://script.google.com/macros/s/[ID]/exec'
has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present
```

**Causa:** El Google Apps Script NO tiene las funciones CORS habilitadas.

---

## ✅ LA SOLUCIÓN

### **PASO 1: Verificar si el código CORS está en Google Apps Script**

En Google Apps Script, buscar (Ctrl+F):
- `function doPost` → ¿Existe?
- `function doOptions` → ¿Existe?

**Si AMBAS existen, ir al PASO 3**
**Si NO existen, continuar con PASO 2**

---

### **PASO 2: Actualizar el código en Google Apps Script**

1. Abrir: `scripts/google-apps-script-v2.7-FINAL.js` (en tu máquina)
2. Copiar TODO el contenido (Ctrl+A → Ctrl+C)
3. En Google Apps Script:
   - Seleccionar TODO (Ctrl+A)
   - Pegar (Ctrl+V)
   - Guardar (Ctrl+S)

---

### **PASO 3: Hacer "Nueva Implementación"**

1. En Google Apps Script, arriba a la derecha:
   ```
   Implementar → Nueva implementación
   ```

2. Configurar:
   - **Tipo:** Aplicación web
   - **Ejecutar como:** Tu cuenta
   - **Quién tiene acceso:** Cualquiera
   - Click: Implementar

3. **COPIAR la URL** que aparece (ejemplo):
   ```
   https://script.google.com/macros/s/AKfycbyEDPWSFI...xyz/usercontent/latest/code.gs
   ```

---

### **PASO 4: Convertir URL de `/usercontent/` a `/exec`**

La URL que copiaste probablemente sea:
```
https://script.google.com/macros/s/AKfycbyEDPWSFI.../usercontent/latest/code.gs
```

**CAMBIAR A:**
```
https://script.google.com/macros/s/AKfycbyEDPWSFI.../exec
```

---

### **PASO 5: Actualizar `.env.local` (si la URL cambió)**

Archivo: `src/renderer/.env.local`

Reemplazar línea:
```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/[NUEVA_ID]/exec
```

**IMPORTANTE:** Solo si el `[NUEVA_ID]` cambió respecto a la actual.

---

### **PASO 6: Reiniciar React**

En terminal:
```bash
Ctrl+C                    # Detener servidor
npm run dev               # Reiniciar
```

Esperar a que compile.

---

### **PASO 7: Probar**

1. En React, click: **"Sincronizar Manualmente"**
2. Abrir consola (F12)
3. Si funciona:
   ```
   ✅ 200 OK
   ✅ Sincronización completada
   ```

---

## 🔧 VERIFICACIONES ADICIONALES

### **Verificar que `doPost` y `doOptions` existen:**

En Google Apps Script, deben estar presentes:

```javascript
// ✅ Debe existir esta función
function doPost(e) {
  try {
    const accion = e.parameter.accion;
    let resultado = { ... };
    
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader('Access-Control-Allow-Origin', '*')     // ✅ CORS
      .addHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
      .addHeader('Access-Control-Allow-Headers', 'Content-Type');
  } catch (error) { ... }
}

// ✅ Debe existir esta función
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .addHeader('Access-Control-Allow-Origin', '*')       // ✅ CORS
    .addHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
    .addHeader('Access-Control-Allow-Headers', 'Content-Type')
    .addHeader('Access-Control-Max-Age', '86400');
}
```

---

### **Verificar que "Quién tiene acceso" es "Cualquiera"**

1. En Google Apps Script, arriba a la derecha
2. Click en la implementación actual
3. Verificar que dice: "Acceso: Cualquiera"

Si dice "Solo yo" → necesita redeploy

---

## 📝 CHECKLIST

- [ ] Copié el código v2.7-FINAL.js al Google Apps Script
- [ ] Guardé los cambios (Ctrl+S)
- [ ] Hice "Nueva implementación" → "Aplicación web"
- [ ] Cambié la URL de `/usercontent/` a `/exec`
- [ ] Actualicé `.env.local` (si fue necesario)
- [ ] Reinicié React
- [ ] Probé desde React → sin errores CORS

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Dónde copiar el código v2.7?**
R: `scripts/google-apps-script-v2.7-FINAL.js`

**P: ¿Qué es "Nueva implementación"?**
R: Un deploy nuevo que reemplaza el anterior. Genera una URL nueva.

**P: ¿Tiene que ser "Cualquiera" en acceso?**
R: Sí, para que React desde localhost pueda acceder sin restricciones.

**P: ¿Cambió mi URL en .env.local?**
R: Sí, si el `[ID]` en la URL es diferente después del deploy.

**P: ¿Sigue dando error CORS?**
R: Verificar:
   - Que `doPost` y `doOptions` existen en Google Apps Script
   - Que la URL termina en `/exec`
   - Que "Acceso" es "Cualquiera"
   - Que React fue reiniciado

---

**Status:** Paso a paso listo. Solo necesitas seguir los 7 pasos.
