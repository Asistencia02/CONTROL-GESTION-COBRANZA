# 📁 ESTRUCTURA DE ARCHIVOS - CORS v2.7

## 🗂️ ARCHIVOS CREADOS/MODIFICADOS

```
📦 proyecto-cobranzas/
│
├─ 📄 scripts/
│  └─ google-apps-script-v2.7-FINAL.js (31.6 KB) ✅ NUEVO
│     ├─ doPost(e) - Maneja requests POST desde React + CORS headers
│     ├─ doOptions(e) - Maneja preflight requests (CORS)
│     ├─ ejecutarFullAutoHTTP() - Wrapper HTTP para sincronización
│     ├─ normalizarExcel() - Normaliza datos del Excel
│     ├─ sincronizarDatos() - Sincroniza con Supabase
│     ├─ procesarPagosBatch() - ✅ v2.7: INSERT/UPDATE/IGNORE con montos
│     ├─ obtenerPagosExistentes() - ✅ v2.7: Carga pagos con id + monto_pagado
│     └─ generarDNISinDuplicados() - ✅ v2.7: DNI autoincrementable
│
├─ 📄 src/renderer/
│  ├─ .env.local (modificado en valor, NO en estructura)
│  │  └─ VITE_GOOGLE_APPS_SCRIPT_URL=...exec ✅
│  │
│  └─ hooks/
│     └─ useImportadorGoogleSheets.ts (SIN cambios)
│        └─ Usa fetch() con CORS headers automáticos
│
├─ 📄 DOCUMENTACIÓN NUEVA:
│  ├─ DEPLOY_GOOGLE_APPS_SCRIPT_v2.7_CORS.md
│  │  └─ Guía paso a paso de deploy
│  ├─ VERIFICAR_DEPLOY_GOOGLE_APPS_SCRIPT.md
│  │  └─ Checklist de verificación
│  ├─ SOLUCION_CORS_PASO_A_PASO.md
│  │  └─ 7 pasos para solucionar el error CORS
│  ├─ DEBUG_CORS_CONSOLE.md
│  │  └─ Commands para debugging en consola (F12)
│  ├─ RESUMEN_FINAL_CORS_v2.7.md
│  │  └─ Resumen completo de la implementación
│  └─ ESTRUCTURA_ARCHIVOS_CORS_v2.7.md (este archivo)
│
└─ 📊 CAMBIOS EN GOOGLE APPS SCRIPT:
   │
   ├─ ✅ NUEVO: function doPost(e)
   │  │  ├─ Lee parameter ?accion=sincronizar
   │  │  ├─ Llama ejecutarFullAutoHTTP()
   │  │  └─ Retorna JSON con CORS headers
   │  │
   ├─ ✅ NUEVO: function doOptions(e)
   │  │  └─ Maneja preflight requests con CORS headers
   │  │
   ├─ ✅ NUEVO: function ejecutarFullAutoHTTP()
   │  │  └─ Wrapper HTTP de ejecutarFullAuto()
   │  │
   ├─ ✅ MODIFICADO: procesarPagosBatch()
   │  │  ├─ Parámetro nuevo: pagosExistentes
   │  │  ├─ Lógica: INSERT vs UPDATE vs IGNORE
   │  │  ├─ Contador: res.actualizados ✅ NEW
   │  │  └─ Actualiza monto_pagado si NUEVO > VIEJO
   │  │
   ├─ ✅ MODIFICADO: sincronizarDatos()
   │  │  ├─ Llama obtenerPagosExistentes() ANTES de procesarPagosBatch()
   │  │  └─ Pasa pagosExistentes como parámetro
   │  │
   ├─ ✅ NUEVO: function obtenerPagosExistentes()
   │  │  ├─ Retorna: { [key]: { id, monto_pagado, estado } }
   │  │  └─ Key: `${estId}|${conceptoId}`
   │  │
   └─ ✅ NUEVO: function generarDNISinDuplicados()
     ├─ DNI vacío → 00000000, 00000001...
     └─ Sin duplicados en mapa local
```

---

## 🔄 FLUJO DE DATOS CON CORS

```
┌─────────────────────────────────────────────────────────┐
│ REACT (localhost:5173)                                  │
│ ImportadorGoogleSheets.tsx → click "Sincronizar"       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ fetch() POST
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ GOOGLE APPS SCRIPT                                      │
│ ✅ doOptions() → Responde CORS headers                  │
│ (preflight request)                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 200 OK + CORS headers
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ GOOGLE APPS SCRIPT                                      │
│ ✅ doPost() → ejecutarFullAutoHTTP()                    │
│   ├─ normalizarExcel()                                  │
│   ├─ sincronizarDatos()                                 │
│   │  ├─ procesarEstudiantes()                           │
│   │  ├─ buscarEstudiantes()                             │
│   │  ├─ obtenerPagosExistentes() ✅ v2.7 NEW            │
│   │  └─ procesarPagosBatch() ✅ v2.7 UPDATED            │
│   │     ├─ Compara montoPagado: NUEVO vs VIEJO         │
│   │     ├─ Si NUEVO > VIEJO → PATCH (actualizar)       │
│   │     ├─ Si NUEVO == VIEJO → IGNORAR                 │
│   │     ├─ Si NUEVO < VIEJO → IGNORAR                  │
│   │     └─ Si NO existe → INSERT                        │
│   └─ Retorna JSON                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ 200 OK + CORS headers + JSON
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ REACT (localhost:5173)                                  │
│ response.json()                                         │
│ {                                                       │
│   "exito": true,                                        │
│   "mensaje": "Sincronización completada",               │
│   "data": {                                             │
│     "datosNormalizados": { ... },                       │
│     "sincronizacion": {                                 │
│       "estudiantesInsertados": XX,                      │
│       "inscripcionesActualizadas": XX ✅ NEW,           │
│       "cuotasActualizadas": XX ✅ NEW,                  │
│       "segurosActualizados": XX ✅ NEW,                 │
│       "ignorados": XX,                                  │
│       "errores": XX                                     │
│     }                                                   │
│   }                                                     │
│ }                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 HEADERS CORS AGREGADOS

### **Response Headers (en TODAS las respuestas):**

```http
HTTP/1.1 200 OK

Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Content-Type: application/json

{
  "exito": true,
  "data": { ... }
}
```

---

## ⚙️ CAMBIOS EN FUNCIONALIDAD

### **ANTES (v2.6):**
```
Monto 5000 → 10000:  DUPLICA PAGO (error ❌)
Monto 10000 → 10000: DUPLICA PAGO (error ❌)
Monto 10000 → 5000:  DUPLICA PAGO (error ❌)
DNI vacío:           GENERA ERROR (error ❌)
```

### **DESPUÉS (v2.7):**
```
Monto 5000 → 10000:  ACTUALIZA ✅ (estado = PAGADO)
Monto 10000 → 10000: IGNORA ✅ (contador ignorados++)
Monto 10000 → 5000:  IGNORA ✅ (no actualizar hacia abajo)
DNI vacío:           GENERA 00000000, 00000001... ✅
```

---

## 📈 CONTADORES MEJORADOS

### **Resumen de respuesta:**

**v2.6:**
```json
{
  "contadores": {
    "estudiantesInsertados": XX,
    "pagosInscInsertados": XX,
    "pagosCuotaInsertados": XX,
    "pagosSeguroInsertados": XX,
    "ignorados": XX,
    "errores": XX
  }
}
```

**v2.7:**
```json
{
  "contadores": {
    "estudiantesInsertados": XX,
    "pagosInscInsertados": XX,
    "inscripcionesActualizadas": XX,    ✅ NUEVO
    "pagosCuotaInsertados": XX,
    "cuotasActualizadas": XX,          ✅ NUEVO
    "pagosSeguroInsertados": XX,
    "segurosActualizados": XX,         ✅ NUEVO
    "ignorados": XX,
    "errores": XX,
    "pagosSkipped": XX
  }
}
```

---

## 🎯 ARCHIVOS QUE NO CAMBIARON

✅ `src/renderer/hooks/useImportadorGoogleSheets.ts`
- Sigue usando el mismo fetch()
- Sigue llamando a la misma URL
- No necesita cambios

✅ `src/renderer/modules/ImportadorGoogleSheets.tsx`
- Sigue siendo igual
- No necesita cambios

---

## 📋 VERIFICACIÓN DE IMPLEMENTACIÓN

```bash
# Verificar que archivo existe:
ls -lh scripts/google-apps-script-v2.7-FINAL.js

# Copiar contenido (para pegar en Google Apps Script):
cat scripts/google-apps-script-v2.7-FINAL.js

# Verificar líneas de CORS en archivo:
grep -n "Access-Control-Allow-Origin" scripts/google-apps-script-v2.7-FINAL.js
# Esperado: 2 resultados (en doPost y doOptions)

# Verificar función doOptions:
grep -A 10 "function doOptions" scripts/google-apps-script-v2.7-FINAL.js

# Verificar función doPost:
grep -A 10 "function doPost" scripts/google-apps-script-v2.7-FINAL.js
```

---

## 🚀 ORDEN DE PASOS RECOMENDADO

1. **Leer:** `RESUMEN_FINAL_CORS_v2.7.md` (este documento)
2. **Copiar:** `scripts/google-apps-script-v2.7-FINAL.js` → Google Apps Script
3. **Verificar:** `function doPost` y `function doOptions` existen
4. **Deploy:** Nueva implementación → Aplicación web
5. **Configurar:** URL `/usercontent/` → `/exec`
6. **Actualizar:** `.env.local` (si cambió URL)
7. **Reiniciar:** React (Ctrl+C → npm run dev)
8. **Probar:** Click en "Sincronizar Manualmente"
9. **Debug:** Si falla, usar `DEBUG_CORS_CONSOLE.md`

---

**Status:** ✅ Toda la documentación lista. Solo falta deploy manual en Google Apps Script.
