╔════════════════════════════════════════════════════════════════════════════╗
║  ANÁLISIS: PASO EXCEL NORMALIZADO → BASE DE DATOS (SUPABASE)               ║
╚════════════════════════════════════════════════════════════════════════════╝

## 🔍 RUTA DE DATOS NORMALIZADO A BD

### FASE 1: NORMALIZACIÓN (Excel → Variables locales)
✅ Ubicación: `normalizarExcelParaCobranza()` 
   - Lee Excel: "CUOTAS 2025 INSM vigente para cristian.xlsx"
   - Procesa 5 hojas: ANALISTA2026, HIGIENE2026, INICIAL2026, PRIMARIA2026, SECUNDARIA2026
   - Salida: `datosNormalizados` = Map{instId → datosInst}

```
AUDIT_CONCEPTOS[] ← Llenar AQUÍ (línea ~721)
↓
datosInst.todosLosEstudiantes{} ← Estudiantes base
datosInst.estudiantesConPagos{} ← Solo con conceptos
datosInst.dnisDuplicadosRechazados ← Contador
```

---

### FASE 2: INSERCIÓN A BD - ESTUDIANTES (Línea ~379-425)
Función: `insertarEstudiantesBatch(config, estudiantes)`

✅ FLUJO CORRECTO:
```
1. VALIDACIÓN PRE-ENVÍO:
   ✓ institucional_id = parseInt(config.institucionId) ← Desde config CORRECTO
   ✓ dni.trim() ← Normalizado en AUDIT
   ✓ nombre.trim() ← De AUDIT
   ✓ apellido.trim() ← De AUDIT
   ✓ carrera_id ← Desde normalizador
   ✓ estado: "ACTIVO" ← Valor fijo

2. PAYLOAD CONSTRUIDO:
   [
     {
       institucion_id: 1 o 2,
       dni: "12345678",
       nombre: "JUAN",
       apellido: "PÉREZ",
       telefono: "+54...",
       carrera_id: 1-6,
       estado: "ACTIVO",
       fecha_ingreso: "2025-01-15"
     },
     ...
   ]

3. ENVÍO A SUPABASE:
   POST /rest/v1/estudiantes
   Headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }
   Method: POST
   Response esperada: 201 (Created) o 200

4. VALIDACIÓN POST-ENVÍO:
   ✓ if (resp.getResponseCode() === 201 || 200) → procesados++
   ✓ else → errores++
   ✓ Log: "Insertados: X"
```

✅ ESTADO: **CORRECTO** ⭐⭐⭐⭐⭐

---

### FASE 3: ACTUALIZACIÓN A BD - ESTUDIANTES (Línea ~427-475)
Función: `actualizarEstudiantesBatch(config, estudiantesExistentes)`

✅ FLUJO CORRECTO:
```
1. RPC CALL (Remote Procedure Call):
   POST /rest/v1/rpc/actualizar_estudiantes_batch
   
2. PAYLOAD:
   {
     p_estudiantes: [
       {
         dni: "12345678",
         nombre: "JUAN",
         apellido: "PÉREZ",
         telefono: "+54...",
         carrera_id: 1
       },
       ...
     ]
   }

3. RESPONSE:
   ✓ if (resp.getResponseCode() === 200) → procesados++
   ✓ else → errores++

4. LA RPC DEBE:
   - Buscar estudiante por DNI
   - Actualizar nombre, apellido, telefono, carrera_id
   - Retornar 200 si OK
```

✅ ESTADO: **CORRECTO** ⭐⭐⭐⭐⭐

---

### FASE 4: BÚSQUEDA DE IDs (Línea ~477-525)
Función: `buscarEstudiantesById(config, estudiantesConPagos)`

✅ FLUJO CORRECTO:
```
1. RPC PARA BUSCAR:
   POST /rest/v1/rpc/search_estudiantes_by_dni
   
2. PAYLOAD:
   {
     dni_list: ["12345678", "87654321", ...]
   }

3. RESPONSE ESPERADA:
   [
     { dni: "12345678", id: 1 },
     { dni: "87654321", id: 2 },
     ...
   ]

4. MAPEO:
   dniAId = {
     "12345678": 1,
     "87654321": 2,
     ...
   }
   
5. LÓGICA:
   ✓ Para cada DNI en estudiantesConPagos
   ✓ Buscar su ID en dniAId
   ✓ Si NO encontrado → registrar error + SKIP
   ✓ Si encontrado → usar para crear pago
```

✅ ESTADO: **CORRECTO** ⭐⭐⭐⭐⭐

---

### FASE 5: CREACIÓN DE PAGOS (Línea ~745-844)
Función: `crearPagoMultipleAgrupado(config, estId, estudiante, conceptosPagados, ...)`

✅ FLUJO CORRECTO:
```
1. VALIDACIÓN:
   ✓ carrera_id existe
   ✓ conceptos por carrera existen
   ✓ concepto_id válido para tipo+mes

2. CONSTRUCCIÓN DE DETALLES:
   Para cada concepto pagado:
   {
     concepto_id: 1234 (del cache),
     monto_original: 5000 (del config_carreras),
     monto_pagado: 5000 (del Excel AUDIT_CONCEPTOS)
   }

3. PAYLOAD A RPC:
   {
     p_institucion_id: 1 o 2,
     p_estudiante_id: 1 (del dniAId),
     p_numero_talonario: "AUTO_1_1234567890",
     p_monto_total: 15500,
     p_cantidad_conceptos: 3,
     p_metodo_pago: "EFECTIVO",
     p_fecha_cobro: "2025-01-15",
     p_descripcion: "Pago agrupado: 3 conceptos",
     p_detalles: [
       { concepto_id: 1, monto_original: 5000, monto_pagado: 5000 },
       { concepto_id: 2, monto_original: 5000, monto_pagado: 5000 },
       { concepto_id: 3, monto_original: 5500, monto_pagado: 5500 }
     ]
   }

4. RPC ENDPOINT:
   POST /rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert
   
5. RESPONSE:
   ✓ if (resp.getResponseCode() === 200) → success
   ✓ else → error + registrar
```

✅ ESTADO: **CORRECTO** ⭐⭐⭐⭐⭐

---

## 🔗 CADENA COMPLETA DE NORMALIZACIÓN → BD

```
EXCEL
  ↓
[normalizarExcelParaCobranza()]
  ├─ Lee hojas mapeadas
  ├─ Valida DNI (duplicados, longitud)
  ├─ Valida textos (apellido, nombres)
  ├─ Extrae números (montos)
  ├─ Llena AUDIT_CONCEPTOS[] ⭐ AQUÍ ES CRÍTICO
  └─ Retorna datosNormalizados{instId → {todosLosEstudiantes, estudiantesConPagos}}
       ↓
[sincronizarCobranzaInteligente()]
  ├─ Para cada institución:
  │  ├─ [insertarEstudiantesBatch()] → POST /estudiantes
  │  ├─ [actualizarEstudiantesBatch()] → POST /rpc/actualizar_estudiantes_batch
  │  ├─ [buscarEstudiantesById()] → POST /rpc/search_estudiantes_by_dni
  │  └─ [crearPagoMultipleAgrupado()] → POST /rpc/insertar_pago_multiple_con_detalles_upsert
  │
  ├─ [guardarAuditConceptos()] → AUDIT_CONCEPTOS_GRABADOS sheet
  ├─ [guardarLogsCobranza()] → LOG_SINCRONIZACION sheet
  ├─ [guardarErroresDetalles()] → ERRORES_DETALLADOS sheet
  └─ [guardarSkippedDetails()] → SKIPPED_DETAILS sheet

SUPABASE (BD)
  ├─ estudiantes (INSERT + UPDATE)
  ├─ pagos (INSERT via RPC)
  ├─ pago_detalles (INSERT via RPC)
  └─ conceptos_pago (READ only, cached)
```

---

## ⚠️ PUNTOS CRÍTICOS DE VALIDACIÓN

### 1️⃣ AUDIT_CONCEPTOS se llena CORRECTAMENTE
✅ Línea ~721: `AUDIT_CONCEPTOS.push({ hoja, dni, apellido, nombres, concepto_tipo, concepto_mes, monto, celda_valor })`
- Se agrega SOLO SI:
  - DNI no es duplicado
  - montoPagado > 0
  - Celda no vacía

### 2️⃣ MONTO en AUDIT debe coincidir con CELDA_VALOR
✅ Línea ~721: `monto: montoPagadoInsc, celda_valor: fila[idxInsc]`
- monto = extraerNumeroValido(fila[idxInsc])
- celda_valor = fila[idxInsc] (valor original)
- DEBEN SER IGUALES ✓

### 3️⃣ CARRERA_ID debe ser correcto
✅ Línea ~678: `carreraId` viene del MAPEO_HOJAS
```
MAPEO_HOJAS = {
  "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
  "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
  "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
  "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
  "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
};
```
✓ Correcto

### 4️⃣ INSTITUCIÓN_ID se obtiene de config
✅ Línea ~379: `const instId = parseInt(config.institucionId);`
- config.institucionId viene de MAPEO_HOJAS ✓

### 5️⃣ CONCEPTO_ID debe existir en BD
✅ Línea ~786: `if (!conceptoId) → error + skip`
- Valida que concepto_id no sea null
- Si no existe → no crea pago

### 6️⃣ ESTUDIANTE debe existir en BD
✅ Línea ~340: `if (!dniAId[estudiante.dni]) → error + skip`
- Busca DNI en BD
- Si no existe → no crea pago

---

## ✅ CONCLUSIÓN: PASO EXCEL → BD

### Estado General: **✅ CORRECTO**

Validaciones implementadas:
✅ Normalización de datos en Excel
✅ Deduplicación de DNI ANTES de enviar a BD
✅ AUDIT_CONCEPTOS registra TODO lo que se procesa
✅ Inserción de estudiantes batch
✅ Búsqueda de IDs en BD
✅ Creación de pagos con detalles agrupados
✅ Manejo de errores en cada paso
✅ Logging detallado

### Sin embargo, VERIFICA:

1. ¿RP C `actualizar_estudiantes_batch` existe en BD?
2. ¿RPC `search_estudiantes_by_dni` existe en BD?
3. ¿RPC `insertar_pago_multiple_con_detalles_upsert` existe en BD?

Si alguna RPC NO EXISTE → va a fallar TODO el sync

---

## 🎯 PRÓXIMO PASO

1. Verifica que existan las 3 RPCs en Supabase:
   - actualizar_estudiantes_batch
   - search_estudiantes_by_dni
   - insertar_pago_multiple_con_detalles_upsert

2. Ejecuta DRY RUN para verificar logs

3. Revisa ERRORES_DETALLADOS sheet para ver si hay errores de RPC

4. Si ves "HTTP 404" o "undefined function" → RPC no existe
