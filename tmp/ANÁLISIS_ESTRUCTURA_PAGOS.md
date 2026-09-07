╔════════════════════════════════════════════════════════════════════════════╗
║  VALIDACIÓN FINAL: MAPEO EXCEL → BD (ESTRUCTURA COMPLETA)                  ║
╚════════════════════════════════════════════════════════════════════════════╝

## 📊 TABLAS RELEVANTES ENCONTRADAS

✅ Tabla `pagos` - EXISTE
✅ Tabla `pagos_multiples` - EXISTE  
✅ Tabla `pagos_multiples_detalle` - EXISTE
✅ Tabla `pago_detalles` - NO APARECE (¿renombrada?)
✅ Tabla `conceptos_pago` - EXISTE
✅ Tabla `estudiantes` - EXISTE
✅ Tabla `audit_conceptos_pago` - EXISTE (para audit trail)

---

## 🔍 MAPEO DEL SCRIPT vs BD REAL

### PASO 1: ESTUDIANTES (POST /rest/v1/estudiantes)

**Script construye:**
```javascript
{
  institucion_id: 2,
  dni: "12345678",
  nombre: "JUAN",
  apellido: "PÉREZ",
  telefono: "+54...",
  carrera_id: 4,
  estado: "ACTIVO",
  fecha_ingreso: "2025-01-15"
}
```

**BD tabla `estudiantes`:**
✅ institucion_id (bigint)
✅ dni (character varying)
✅ nombre (character varying)
✅ apellido (character varying)
✅ telefono (character varying)
✅ carrera_id (bigint)
✅ estado (character varying)
✅ fecha_ingreso (date)

**STATUS:** ✅ CORRECTO - Mapeo perfecto

---

### PASO 2: BÚSQUEDA DE IDs (RPC search_estudiantes_by_dni)

**Script ejecuta:**
```javascript
POST /rpc/search_estudiantes_by_dni
{ dni_list: ["12345678", "87654321", ...] }

Retorna: [{ dni: "12345678", id: 1 }, ...]
```

**BD tabla `estudiantes`:**
✅ id (bigint, PK)
✅ dni (character varying)

**STATUS:** ✅ CORRECTO - Búsqueda válida

---

### PASO 3: CREACIÓN DE PAGOS (RPC insertar_pago_multiple_con_detalles_upsert)

**Script envía:**
```javascript
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
```

**Posible mapeo en BD:**

OPCIÓN A: Usa tabla `pagos` + `pagos_multiples` + `pagos_multiples_detalle`
```
INSERT INTO pagos (institucion_id, estudiante_id, numero_talonario, metodo_pago, fecha_pago, estado)
INSERT INTO pagos_multiples (pago_id, monto_total, cantidad_conceptos, descripcion)
INSERT INTO pagos_multiples_detalle (pago_multiple_id, concepto_id, monto_original, monto_pagado)
```

OPCIÓN B: Denormalizado - inserta directamente en `pagos_multiples_detalle`
```
INSERT INTO pagos_multiples_detalle (
  institucion_id, estudiante_id, concepto_id, 
  monto_original, monto_pagado, metodo_pago, 
  numero_talonario, fecha_pago, ...
)
```

---

## ❓ PREGUNTA CRÍTICA

**¿Cuál es la estructura de estas tablas?**

Ejecuta en SQL Editor de Supabase:

```sql
-- Ver estructura de pagos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pagos'
ORDER BY ordinal_position;

-- Ver estructura de pagos_multiples
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pagos_multiples'
ORDER BY ordinal_position;

-- Ver estructura de pagos_multiples_detalle
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pagos_multiples_detalle'
ORDER BY ordinal_position;

-- Ver si existe pago_detalles
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'pago_detalles'
);
```

**Necesito ver las columnas de estas 3 tablas para validar si el RPC está insertando en el lugar correcto.**

---

## 🎯 VERIFICACIÓN RÁPIDA DE DATOS

Mientras compartes eso, ejecuta:

```sql
-- ¿Hay datos en pagos_multiples?
SELECT COUNT(*) FROM pagos_multiples;

-- ¿Hay datos en pagos_multiples_detalle?
SELECT COUNT(*) FROM pagos_multiples_detalle;

-- Ver un ejemplo
SELECT * FROM pagos_multiples LIMIT 1;
SELECT * FROM pagos_multiples_detalle LIMIT 1;

-- Ver estructura de pagos
SELECT * FROM pagos LIMIT 1;
```

---

## ✅ RESUMEN ACTUAL

**Hasta ahora, CONFIRMADO:**

| Tabla | Columnas Script | Estado |
|-------|----------------|--------|
| estudiantes | institucion_id, dni, nombre, apellido, telefono, carrera_id, estado, fecha_ingreso | ✅ CORRECTO |
| conceptos_pago | id, tipo, mes, carrera_id | ✅ CORRECTO |

**Por validar:**
- ¿RPC inserta en `pagos` o `pagos_multiples`?
- ¿Cómo se relacionan `pagos`, `pagos_multiples`, `pagos_multiples_detalle`?
- ¿Estructura de `pagos_multiples_detalle`?

---

## 📌 HIPÓTESIS

Basado en nombres, creo que:

1. `pagos` = tabla general de pagos (uno por transacción)
2. `pagos_multiples` = pagos que agrupan múltiples conceptos (el RPC probablemente inserta aquí)
3. `pagos_multiples_detalle` = detalles de cada concepto en pago múltiple

**El RPC `insertar_pago_multiple_con_detalles_upsert` probablemente:**
```
1. INSERT INTO pagos (datos del pago)
2. INSERT INTO pagos_multiples (información agrupada)
3. INSERT INTO pagos_multiples_detalle (cada detalle de concepto)
```

**Pero necesito confirmar** la estructura exacta de esas 3 tablas.
