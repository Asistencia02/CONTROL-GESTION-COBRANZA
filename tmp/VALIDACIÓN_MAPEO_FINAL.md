╔════════════════════════════════════════════════════════════════════════════╗
║  VALIDACIÓN FINAL: MAPEO EXCEL → BD (COLUMNAS REALES)                      ║
╚════════════════════════════════════════════════════════════════════════════╝

## 📊 ANÁLISIS DE COLUMNAS REALES vs SCRIPT

### TABLA 1: conceptos_pago (READ ONLY - CACHE)
```
Script busca:   SELECT id, tipo, nombre, mes, carrera_id
BD tiene:       ✅ id (bigint)
                ✅ institucion_id (bigint)
                ✅ carrera_id (integer)
                ✅ nombre (character varying)
                ✅ tipo (character varying)
                ✅ mes (integer)
                ✅ año (integer)
                ✅ monto (numeric)
                ✅ activo (boolean)
                ✅ dias_vencimiento (integer)
                ✅ created_at (timestamp)
```
✅ STATUS: **CORRECTO** - Todas las columnas existen

---

### TABLA 2: estudiantes (INSERT + UPDATE)
```
Script envía:   institucion_id, dni, nombre, apellido, telefono, 
                carrera_id, estado, fecha_ingreso

BD tiene:       ✅ id (bigint, PK)
                ✅ institucion_id (bigint)
                ✅ carrera_id (bigint)
                ✅ dni (character varying)
                ✅ nombre (character varying)
                ✅ apellido (character varying)
                ✅ email (character varying) ← NO ENVIADO
                ✅ telefono (character varying)
                ✅ estado (character varying)
                ✅ fecha_ingreso (date)
                ✅ created_at (timestamp)
                ✅ updated_at (timestamp)
                ✅ deuda_años_anteriores (numeric)
                ✅ última_deuda_año (integer)
                ✅ última_actualización_deuda (timestamp)
                ✅ deuda_actual (numeric)
                ✅ recaudable_año (numeric)
```
✅ STATUS: **CORRECTO** - Script envía datos a columnas correctas
⚠️ NOTA: Columnas extra (email, deuda_*) no se tocan - OK

---

### TABLA 3: pago_detalles (INSERT vía RPC)
```
Script envía (en p_detalles):
  concepto_id, monto_original, monto_pagado

BD tiene:       ✅ id (bigint, PK)
                ✅ institucion_id (bigint)
                ✅ estudiante_id (bigint)
                ✅ concepto_id (bigint)
                ✅ monto_pagado (numeric)
                ✅ monto_original (numeric)
                ✅ metodo_pago (character varying)
                ✅ numero_transaccion (character varying)
                ✅ fecha_pago (date)
                ✅ comprobante_numero (character varying)
                ✅ cae (character varying)
                ✅ notas (text)
                ✅ created_at (timestamp)
                ✅ updated_at (timestamp)
                ✅ numero_talonario (character varying)
                ✅ tipo_tarjeta (character varying)
                ✅ estado (character varying)
                ✅ fecha_anulacion (timestamp)
                ✅ motivo_anulacion (character varying)
                ✅ anulado_por (character varying)
                ✅ tipo_pago (character varying)
                ✅ estado_pago (character varying)
                ✅ pago_multiple_id (bigint)
                ✅ razon_anulacion (text)
                ✅ usuario_anulacion (character varying)
                ✅ carrera_id (integer)
```
✅ STATUS: **CORRECTO** - Columnas existen
⚠️ NOTA: Script envía 3 columnas, RPC las inserta en 3 columnas correctas

---

## 🔍 VALIDACIÓN DETALLADA POR COLUMNA

### INSERCIÓN DE ESTUDIANTES (POST /estudiantes)

```
Script construye:
{
  institucion_id: parseInt(config.institucionId),  // 1 o 2
  dni: e.dni.trim(),                               // "12345678"
  nombre: e.nombres.trim(),                        // "JUAN"
  apellido: e.apellido.trim(),                     // "PÉREZ"
  telefono: e.telefono ? e.telefono.trim() : null, // "+54..." o null
  carrera_id: e.carrera_id,                        // 1-6
  estado: "ACTIVO",                                // fijo
  fecha_ingreso: date.toISOString().split('T')[0]  // "2025-01-15"
}

BD espera:  ✅ institucion_id (bigint)
            ✅ dni (character varying)
            ✅ nombre (character varying)
            ✅ apellido (character varying)
            ✅ telefono (character varying, nullable)
            ✅ carrera_id (bigint)
            ✅ estado (character varying)
            ✅ fecha_ingreso (date)
```

✅ **MAPEO PERFECTO** - Sin errores de tipo o nombre

---

### RPC search_estudiantes_by_dni

```
Script envía:
{
  dni_list: ["12345678", "87654321", ...]
}

RPC debe retornar:
[
  { dni: "12345678", id: 1 },
  { dni: "87654321", id: 2 }
]

Script busca en: estudiantes.dni (character varying) ✅
Script obtiene: estudiantes.id (bigint) ✅
```

✅ **CORRECTO** - Las columnas existen

---

### RPC actualizar_estudiantes_batch

```
Script envía (per RPC):
{
  p_estudiantes: [
    {
      dni: "12345678",
      nombre: "JUAN",
      apellido: "PÉREZ",
      telefono: "+54...",
      carrera_id: 1
    }
  ]
}

RPC debe actualizar:
UPDATE estudiantes 
SET nombre=?, apellido=?, telefono=?, carrera_id=?
WHERE dni=?

BD columnas:     ✅ nombre
                 ✅ apellido
                 ✅ telefono
                 ✅ carrera_id
                 ✅ dni (para WHERE)
```

✅ **CORRECTO** - Las columnas existen

---

### RPC insertar_pago_multiple_con_detalles_upsert

```
Script envía:
{
  p_institucion_id: 2,
  p_estudiante_id: 1,
  p_numero_talonario: "AUTO_1_...",
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

LA RPC DEBE HACER:
1. INSERT INTO pagos (?) 
   - Pero aquí está el PROBLEMA...
```

⚠️ **VEO UN PROBLEMA** - No hay tabla `pagos` en tu estructura

---

## 🚨 PROBLEMA DETECTADO: FALTA TABLA `pagos`

La estructura que compartiste solo tiene:
- conceptos_pago
- estudiantes  
- pago_detalles

**PERO FALTA:** La tabla `pagos` donde se guardaría:
- id (PK)
- institucion_id
- estudiante_id (FK)
- numero_talonario
- monto_total
- cantidad_conceptos
- metodo_pago
- fecha_pago (o fecha_cobro)
- descripcion
- created_at
- updated_at

---

## ❓ PREGUNTA CRÍTICA

La estructura que viste tiene 3 bloques:
1. conceptos_pago (10 columnas)
2. estudiantes (25 columnas)
3. pago_detalles (27 columnas)

**¿Faltó un 4to bloque de `pagos`?**

O... ¿la tabla `pagos` **NO EXISTE** y estás usando directamente `pago_detalles`?

---

## 🔍 VERIFICACIÓN RÁPIDA

Ejecuta en Supabase SQL:

```sql
-- Ver TODAS las tablas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Ver si existe tabla pagos
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'pagos'
);
```

---

## 📋 SEGÚN PAGO_DETALLES TIENE...

Veo que `pago_detalles` tiene estas columnas de pago:
```
numero_talonario ← VIENE DEL PAGO
tipo_pago ← VIENE DEL PAGO
estado ← VIENE DEL PAGO
tipo_tarjeta ← VIENE DEL PAGO
metodo_pago ← VIENE DEL PAGO
numero_transaccion ← VIENE DEL PAGO
pago_multiple_id ← REFERENCIA AL PAGO
```

**Posibilidad:** ¿La estructura es **denormalizada**?
- ¿Cada detalle de pago lleva los datos del pago?
- ¿NO existe tabla `pagos` por separado?

---

## ✅ SI ES DENORMALIZADO (sin tabla pagos)

Entonces el RPC `insertar_pago_multiple_con_detalles_upsert` DEBE:

```sql
-- NO INSERT INTO pagos
-- DIRECTAMENTE INSERT INTO pago_detalles con todos los campos

INSERT INTO pago_detalles (
  institucion_id,
  estudiante_id,
  concepto_id,
  monto_pagado,
  monto_original,
  numero_talonario,
  metodo_pago,
  fecha_pago,
  tipo_pago,
  estado,
  comprobante_numero,
  notas,
  carrera_id
) VALUES (...)
```

---

## 🎯 SIGUIENTE PASO

**Comparte la salida de:**

```sql
-- VER TODAS LAS TABLAS
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Necesito saber:
1. ¿Existe tabla `pagos` o NO?
2. ¿Existe tabla `pago_multiple` o similar?
3. ¿Cómo está relacionado `pago_detalles` con el resto?

---

## 📌 RESUMEN ACTUAL

✅ **CORRECTO:**
- Columnas de `estudiantes` → Script mapea correctamente
- Columnas de `conceptos_pago` → Script busca correctamente
- Columnas de `pago_detalles` → Script envía correctamente

❌ **POR VERIFICAR:**
- ¿Existe tabla `pagos` o usa estructura denormalizada?
- ¿La RPC sabe dónde insertar?
- ¿Cómo se relacionan las tablas?
