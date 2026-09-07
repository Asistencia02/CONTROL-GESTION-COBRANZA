╔════════════════════════════════════════════════════════════════════════════╗
║  ANÁLISIS: MAPEO DE DATOS → COLUMNAS CORRECTAS EN SUPABASE                 ║
╚════════════════════════════════════════════════════════════════════════════╝

## 📋 MAPEO DE DATOS NORMALIZADOS → COLUMNAS BD

Basado en el análisis del script, voy a validar cada tabla:

---

### 1️⃣ TABLA: `estudiantes`

**MAPEO EN EL SCRIPT (Línea ~379-382):**
```javascript
const paraInsertar = batch.map(e => ({
  institucion_id: parseInt(config.institucionId),
  dni: e.dni.trim(),
  nombre: e.nombres.trim(),
  apellido: e.apellido.trim(),
  telefono: e.telefono ? e.telefono.trim() : null,
  carrera_id: e.carrera_id,
  estado: "ACTIVO",
  fecha_ingreso: new Date().toISOString().split('T')[0]
}));
```

**COLUMNAS ESPERADAS EN BD:**
✓ institucion_id (integer)
✓ dni (varchar/text)
✓ nombre (varchar/text)
✓ apellido (varchar/text)
✓ telefono (varchar/text, nullable)
✓ carrera_id (integer)
✓ estado (varchar, default "ACTIVO")
✓ fecha_ingreso (date)

**VALIDACIÓN POSIBLE:**
- ✅ Datos trimmed (sin espacios)
- ✅ DNI sin puntos (normalizado)
- ✅ institucion_id = 1 o 2
- ✅ carrera_id = 1-6
- ✅ Datos opcionales: telefono puede ser null

---

### 2️⃣ TABLA: `pagos`

**MAPEO EN EL SCRIPT (Línea ~782-795):**
```javascript
const payload = {
  p_institucion_id: instId,
  p_estudiante_id: estId,
  p_numero_talonario: talonario,
  p_monto_total: montoTotal,
  p_cantidad_conceptos: detalles.length,
  p_metodo_pago: metodo,
  p_fecha_cobro: new Date().toISOString().split('T')[0],
  p_descripcion: `Pago agrupado: ${detalles.length} conceptos`,
  p_detalles: detalles
};
```

**COLUMNAS ESPERADAS EN BD (a través de RPC):**
✓ institucion_id (integer)
✓ estudiante_id (integer, FK → estudiantes.id)
✓ numero_talonario (varchar)
✓ monto_total (decimal/numeric)
✓ cantidad_conceptos (integer)
✓ metodo_pago (varchar, ej: "EFECTIVO")
✓ fecha_cobro (date)
✓ descripcion (text, opcional)

**NOTA CRÍTICA:**
- El script pasa `p_estudiante_id` (estudiante ID obtenido via `search_estudiantes_by_dni`)
- ⚠️ Si el estudiante NO existe en BD → pago NO se crea
- ⚠️ Si el estudiante_id es NULL → error en FK

---

### 3️⃣ TABLA: `pago_detalles`

**MAPEO EN EL SCRIPT (Línea ~768-773):**
```javascript
const detalles = [];
for (let concepto of conceptosPagados) {
  detalles.push({
    concepto_id: conceptoId,
    monto_original: montoOriginal,
    monto_pagado: concepto.montoPagado
  });
}
```

**COLUMNAS ESPERADAS EN BD (a través de RPC):**
✓ pago_id (integer, FK → pagos.id, generado por RPC)
✓ concepto_id (integer, FK → conceptos_pago.id)
✓ monto_original (decimal, ej: 5000)
✓ monto_pagado (decimal, ej: 5000)

**VALIDACIÓN:**
- monto_pagado viene del Excel (AUDIT_CONCEPTOS)
- monto_original viene de config_carreras (tabla de precios)
- concepto_id busca en cache de conceptos_pago

---

### 4️⃣ TABLA: `conceptos_pago`

**LECTURA EN EL SCRIPT (Línea ~545-577):**
```javascript
const resp = UrlFetchApp.fetch(
  `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=id,tipo,nombre,mes,carrera_id`,
  ...
);

// Parseo:
for (let c of datos) {
  const car = c.carrera_id;
  if (!conceptos[car]) {
    conceptos[car] = { inscripcion: null, seguros: {}, cuotas: {} };
  }
  
  if (c.tipo === "INSCRIPCION") {
    conceptos[car].inscripcion = c.id;  // ← concepto_id para inscripción
  } else if (c.tipo === "SEGURO" && c.mes) {
    const mesNombre = convertirNumeroAMesCapitalizado(c.mes);
    conceptos[car].seguros[mesNombre] = c.id;  // ← concepto_id por mes
  } else if (c.tipo === "CUOTA" && c.mes) {
    const mesNombre = convertirNumeroAMesCapitalizado(c.mes);
    conceptos[car].cuotas[mesNombre] = c.id;  // ← concepto_id por mes
  }
}
```

**COLUMNAS ESPERADAS EN BD:**
✓ id (integer, PK)
✓ institucion_id (integer)
✓ carrera_id (integer)
✓ tipo (varchar: "INSCRIPCION", "CUOTA", "SEGURO")
✓ nombre (varchar, ej: "Inscripción 2026")
✓ mes (integer, 1-12, nullable para INSCRIPCION)

**VALIDACIÓN:**
- Script filtra por institucion_id
- Agrupa por carrera_id
- Busca 3 tipos: INSCRIPCION, CUOTA, SEGURO
- Mensualiza por mes (1-12)

---

## 🔍 VALIDACIÓN DE MAPEO PASO A PASO

### ✅ PASO 1: EXCEL → AUDIT_CONCEPTOS (variables locales)

```
EXCEL (celda)
  ↓
extraerNumeroValido(celda) → monto (integer)
  ↓
AUDIT_CONCEPTOS.push({
  hoja: "INICIAL2026",
  dni: "12345678",
  apellido: "PÉREZ",
  nombres: "JUAN",
  concepto_tipo: "CUOTA",
  concepto_mes: "MARZO",
  monto: 5000,
  celda_valor: "5000"
})
```

✅ CORRECTO

---

### ✅ PASO 2: AUDIT_CONCEPTOS → datosInst (variables locales)

```
AUDIT_CONCEPTOS[i] (registro procesado)
  ↓
datosInst.todosLosEstudiantes["12345678"] = {
  dni: "12345678",
  apellido: "PÉREZ",
  nombres: "JUAN",
  telefono: "+54...",
  carrera_id: 4,
  conceptos: [
    { tipo: "CUOTA", mes: "MARZO", montoPagado: 5000, ... }
  ]
}
```

✅ CORRECTO

---

### ✅ PASO 3: datosInst → POST /rest/v1/estudiantes

```
datosInst.todosLosEstudiantes (Map)
  ↓
batch.map(e => ({
  institucion_id: 2,        ← DE: config.institucionId
  dni: "12345678",          ← DE: e.dni (normalizado)
  nombre: "JUAN",           ← DE: e.nombres
  apellido: "PÉREZ",        ← DE: e.apellido
  telefono: "+54...",       ← DE: e.telefono
  carrera_id: 4,            ← DE: e.carrera_id (MAPEO_HOJAS)
  estado: "ACTIVO",         ← FIJO
  fecha_ingreso: "2025-01-15"  ← HOY
}))
  ↓
INSERT INTO estudiantes (institucion_id, dni, nombre, apellido, telefono, carrera_id, estado, fecha_ingreso)
VALUES (2, '12345678', 'JUAN', 'PÉREZ', '+54...', 4, 'ACTIVO', '2025-01-15')
```

✅ CORRECTO - Columnas correctas

---

### ✅ PASO 4: datosInst → RPC search_estudiantes_by_dni

```
datosInst.estudiantesConPagos (solo con conceptos)
  ↓
dnis = ["12345678", "87654321", ...]
  ↓
POST /rpc/search_estudiantes_by_dni
{
  dni_list: ["12345678", "87654321", ...]
}
  ↓
RPC RESPONSE:
[
  { dni: "12345678", id: 1 },
  { dni: "87654321", id: 2 }
]
  ↓
dniAId = {
  "12345678": 1,
  "87654321": 2
}
```

✅ CORRECTO - El ID es el STUDENT_ID para pagos

---

### ✅ PASO 5: conceptosPagados → POST /rpc/insertar_pago_multiple_con_detalles_upsert

```
PARA ESTUDIANTE: dni="12345678", estudiante_id=1, carrera_id=4

conceptosPagados = [
  { tipo: "INSCRIPCION", mes: null, montoPagado: 5000 },
  { tipo: "CUOTA", mes: "MARZO", montoPagado: 5000 },
  { tipo: "SEGURO", mes: "MARZO", montoPagado: 1500 }
]

BÚSQUEDA DE CONCEPTO_IDs:
- INSCRIPCION → conceptos[4].inscripcion = 10 (concepto_id)
- CUOTA/MARZO → conceptos[4].cuotas["Marzo"] = 11 (concepto_id)
- SEGURO/MARZO → conceptos[4].seguros["Marzo"] = 12 (concepto_id)

CONSTRUCCIÓN DE DETALLES:
detalles = [
  { concepto_id: 10, monto_original: 5000, monto_pagado: 5000 },
  { concepto_id: 11, monto_original: 5000, monto_pagado: 5000 },
  { concepto_id: 12, monto_original: 1500, monto_pagado: 1500 }
]

PAYLOAD:
{
  p_institucion_id: 2,
  p_estudiante_id: 1,
  p_numero_talonario: "AUTO_1_1234567890",
  p_monto_total: 11500,
  p_cantidad_conceptos: 3,
  p_metodo_pago: "EFECTIVO",
  p_fecha_cobro: "2025-01-15",
  p_descripcion: "Pago agrupado: 3 conceptos",
  p_detalles: [
    { concepto_id: 10, monto_original: 5000, monto_pagado: 5000 },
    { concepto_id: 11, monto_original: 5000, monto_pagado: 5000 },
    { concepto_id: 12, monto_original: 1500, monto_pagado: 1500 }
  ]
}

LA RPC DEBE:
1. INSERT INTO pagos (institucion_id, estudiante_id, numero_talonario, monto_total, cantidad_conceptos, metodo_pago, fecha_cobro, descripcion)
2. Para cada detalle en p_detalles:
   INSERT INTO pago_detalles (pago_id, concepto_id, monto_original, monto_pagado)
```

✅ CORRECTO - Mapeo completo

---

## ⚠️ PUNTOS CRÍTICOS A VERIFICAR

### 1. NOMBRE DE COLUMNAS EN `estudiantes`
**Script envía:**
```
nombre, apellido, dni, telefono, carrera_id, institucion_id, estado, fecha_ingreso
```

**¿Tu tabla tiene EXACTAMENTE esos nombres?**
- ❓ ¿Es `nombre` o `name` o `nombres`?
- ❓ ¿Es `apellido` o `last_name` o `apellidos`?
- ❓ ¿Es `dni` o `document` o `documento`?
- ❓ ¿Es `telefono` o `phone` o `celular`?

---

### 2. CONCEPTO_ID EN `conceptos_pago`
**Script busca:**
```javascript
conceptos[car].inscripcion = c.id;
conceptos[car].cuotas[mesNombre] = c.id;
conceptos[car].seguros[mesNombre] = c.id;
```

**¿Tus conceptos tienen:**
- ❓ Columna `id` (PK)?
- ❓ Columna `tipo` con valores: "INSCRIPCION", "CUOTA", "SEGURO"?
- ❓ Columna `mes` con números 1-12?
- ❓ Columna `carrera_id`?

---

### 3. MONTOS EN `pago_detalles`
**Script envía:**
```
monto_original: 5000 (de config_carreras)
monto_pagado: 5000 (de Excel)
```

**¿Ambos pueden ser DIFERENTES?**
- ❓ ¿Qué sucede si monto_pagado < monto_original?
- ❓ ¿Qué sucede si monto_pagado > monto_original?

---

### 4. ESTUDIANTE_ID EN `pagos`
**Script obtiene:**
```javascript
const dniAId = buscarEstudiantesById(config, estudiantesConPagos);
// dniAId["12345678"] = 1 (el ID del estudiante)
const estId = dniAId[estudiante.dni];
// Luego: p_estudiante_id: estId
```

**¿La RPC valida que estudiante_id exista?**
- ❓ Si estudiante_id=999 (no existe) → ¿Qué pasa?
- ❓ ¿FK constraint en pagos.estudiante_id → estudiantes.id?

---

### 5. CONCEPTO_ID EN `pago_detalles`
**Script envía:**
```javascript
{ concepto_id: conceptos[carreraId].cuotas["Marzo"], ... }
```

**¿La RPC valida que concepto_id exista?**
- ❓ Si concepto_id=999 (no existe) → ¿Error?
- ❓ ¿FK constraint en pago_detalles.concepto_id → conceptos_pago.id?

---

## 📋 CHECKLIST PARA VERIFICAR

```
TABLA: estudiantes
☐ Columna "institucion_id" (int)
☐ Columna "dni" (varchar)
☐ Columna "nombre" (varchar)  ← CRÍTICO: ¿Es "nombre" o "name"?
☐ Columna "apellido" (varchar)  ← CRÍTICO: ¿Es "apellido" o "last_name"?
☐ Columna "telefono" (varchar, nullable)
☐ Columna "carrera_id" (int, FK)
☐ Columna "estado" (varchar)
☐ Columna "fecha_ingreso" (date)
☐ Índice en (institucion_id, dni) - para búsqueda

TABLA: conceptos_pago
☐ Columna "id" (int, PK)
☐ Columna "institucion_id" (int)
☐ Columna "carrera_id" (int)
☐ Columna "tipo" (varchar: "INSCRIPCION", "CUOTA", "SEGURO")
☐ Columna "nombre" (varchar)
☐ Columna "mes" (int, 1-12, nullable)
☐ Datos: ¿Existen conceptos para CADA carrera?

TABLA: pagos
☐ Columna "id" (int, PK)
☐ Columna "institucion_id" (int)
☐ Columna "estudiante_id" (int, FK → estudiantes.id)
☐ Columna "numero_talonario" (varchar)
☐ Columna "monto_total" (decimal)
☐ Columna "cantidad_conceptos" (int)
☐ Columna "metodo_pago" (varchar)
☐ Columna "fecha_cobro" (date)
☐ Columna "descripcion" (text)

TABLA: pago_detalles
☐ Columna "id" (int, PK)
☐ Columna "pago_id" (int, FK → pagos.id)
☐ Columna "concepto_id" (int, FK → conceptos_pago.id)
☐ Columna "monto_original" (decimal)
☐ Columna "monto_pagado" (decimal)

RPCs
☐ "actualizar_estudiantes_batch" - UPDATE estudiantes por DNI
☐ "search_estudiantes_by_dni" - SELECT id FROM estudiantes WHERE dni IN (...)
☐ "insertar_pago_multiple_con_detalles_upsert" - INSERT pago + detalles
```

---

## 🎯 SIGUIENTE PASO

**VERIFICA ESTO EN TU SUPABASE:**

1. Abre: https://supabase.com/dashboard → Tu proyecto
2. Haz clic en "SQL Editor"
3. Copia y ejecuta:

```sql
-- Ver estructura de estudiantes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'estudiantes'
ORDER BY ordinal_position;

-- Ver estructura de conceptos_pago
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conceptos_pago'
ORDER BY ordinal_position;

-- Ver estructura de pagos
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pagos'
ORDER BY ordinal_position;

-- Ver estructura de pago_detalles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pago_detalles'
ORDER BY ordinal_position;

-- Verificar que existan conceptos
SELECT carrera_id, tipo, mes, COUNT(*) FROM conceptos_pago GROUP BY carrera_id, tipo, mes;
```

4. **Comparte la salida** para validar los nombres exactos de columnas
