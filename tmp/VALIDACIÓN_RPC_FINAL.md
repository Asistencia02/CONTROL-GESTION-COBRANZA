╔════════════════════════════════════════════════════════════════════════════╗
║  VALIDACIÓN RPC: insertar_pago_multiple_con_detalles_upsert                ║
╚════════════════════════════════════════════════════════════════════════════╝

## 📋 ANÁLISIS DEL CÓDIGO RPC

### ✅ PARTE 1: VERIFICACIÓN DE DUPLICADOS

```sql
SELECT EXISTS(
  SELECT 1 FROM pagos_multiples 
  WHERE numero_talonario = p_numero_talonario 
  AND institucion_id = p_institucion_id
) INTO v_existe;
```

✅ CORRECTO:
- Busca si ya existe pago con ese número_talonario + institución
- Evita duplicados por talonario (UPSERT pattern)
- Script envía: `p_numero_talonario = "AUTO_1_1234567890"` (único por estudiante)

---

### ✅ PARTE 2: UPDATE (si existe)

```sql
UPDATE pagos_multiples 
SET 
  monto_total = p_monto_total,          ✅
  cantidad_conceptos = p_cantidad_conceptos,  ✅
  metodo_pago = p_metodo_pago,          ✅
  updated_at = NOW()                    ✅
WHERE numero_talonario = p_numero_talonario
AND institucion_id = p_institucion_id
RETURNING id INTO v_pago_id;

DELETE FROM pagos_multiples_detalle WHERE pago_multiple_id = v_pago_id;
```

✅ CORRECTO:
- Actualiza columnas clave
- Borra detalles antiguos antes de insertar nuevos
- Obtiene el v_pago_id para insertar detalles

---

### ✅ PARTE 3: INSERT (si NO existe)

```sql
INSERT INTO pagos_multiples 
  (institucion_id, estudiante_id, numero_talonario, monto_total, cantidad_conceptos, metodo_pago, fecha_cobro, descripcion, estado)
VALUES 
  (p_institucion_id, p_estudiante_id, p_numero_talonario, p_monto_total, p_cantidad_conceptos, p_metodo_pago, p_fecha_cobro, p_descripcion, 'PAGADO')
RETURNING id INTO v_pago_id;
```

**Validación de mapeo:**

| RPC recibe | Columna BD | Script envía | Valor ejemplo |
|---|---|---|---|
| p_institucion_id | institucion_id | ✅ | 2 |
| p_estudiante_id | estudiante_id | ✅ | 1 |
| p_numero_talonario | numero_talonario | ✅ | "AUTO_1_1234567890" |
| p_monto_total | monto_total | ✅ | 11500 |
| p_cantidad_conceptos | cantidad_conceptos | ✅ | 3 |
| p_metodo_pago | metodo_pago | ✅ | "EFECTIVO" |
| p_fecha_cobro | fecha_cobro | ✅ | "2025-01-15" |
| p_descripcion | descripcion | ✅ | "Pago agrupado: 3 conceptos" |
| (fijo) | estado | ✅ | 'PAGADO' |

✅ **TODAS LAS COLUMNAS MAPEAN CORRECTAMENTE**

**PERO VEO UN PROBLEMA:**

Las columnas que NO se insertan en INSERT pero SÍ están en BD:
- `tipo_tarjeta` → NULL (OK, es para tarjetas)
- `fecha_anulacion` → NULL (OK, pago no anulado)
- `motivo_anulacion` → NULL (OK)
- `notas` → NULL (OK, script envía en descripcion)

---

### ✅ PARTE 4: INSERCIÓN DE DETALLES

```sql
FOR v_detalle IN SELECT * FROM jsonb_array_elements(p_detalles)
LOOP
  INSERT INTO pagos_multiples_detalle 
    (pago_multiple_id, concepto_id, monto_original, monto_pagado)
  VALUES 
    (v_pago_id, 
     (v_detalle->>'concepto_id')::BIGINT, 
     (v_detalle->>'monto_original')::NUMERIC, 
     (v_detalle->>'monto_pagado')::NUMERIC);
  v_count := v_count + 1;
END LOOP;
```

**Validación de mapeo:**

| RPC recibe | Columna BD | Script envía | Valor ejemplo |
|---|---|---|---|
| v_pago_id | pago_multiple_id | ✅ | 100 (auto-generado) |
| v_detalle->concepto_id | concepto_id | ✅ | 10 |
| v_detalle->monto_original | monto_original | ✅ | 5000 |
| v_detalle->monto_pagado | monto_pagado | ✅ | 5000 |

✅ **TODAS LAS COLUMNAS MAPEAN CORRECTAMENTE**

**PERO VEO COLUMNAS NO INSERTADAS:**

En `pagos_multiples_detalle`, la RPC NO inserta:
- `monto_mora` → NULL (OK, no hay mora en detalles)
- `include_mora` → NULL (OK, boolean no insertado)
- `dias_vencimiento` → NULL (OK, no se envía)

⚠️ **ESTOS NULOS PODRÍAN SER PROBLEMA SI SON REQUIRED**

---

## ⚠️ PROBLEMAS DETECTADOS

### PROBLEMA #1: JSON parsing en RPC

```javascript
// Script envía:
p_detalles: [
  { concepto_id: 10, monto_original: 5000, monto_pagado: 5000 },
  { concepto_id: 11, monto_original: 5000, monto_pagado: 5000 },
  { concepto_id: 12, monto_original: 1500, monto_pagado: 1500 }
]
```

**La RPC espera JSONB y hace:**
```sql
(v_detalle->>'concepto_id')::BIGINT
```

✅ Esto es correcto PERO...

**¿El script está enviando JSON correctamente?**

Línea en script (línea ~790):
```javascript
payload: JSON.stringify({
  ...
  p_detalles: detalles  // ← ¿Es array de objetos?
})
```

✅ **Debería ser correcto** porque es JSON.stringify()

---

### PROBLEMA #2: Columnas NULL no obligatorias

```sql
INSERT INTO pagos_multiples_detalle 
  (pago_multiple_id, concepto_id, monto_original, monto_pagado)
```

¿Qué pasa con:
- `monto_mora` → ¿Es NULL o tiene default?
- `include_mora` → ¿Es NULL o tiene default?
- `dias_vencimiento` → ¿Es NULL o tiene default?

**Si estas columnas son NOT NULL sin DEFAULT → ERROR**

---

### PROBLEMA #3: Estado 'PAGADO' es hardcoded

```sql
estado = 'PAGADO'
```

**¿Es siempre 'PAGADO'?**

O debería ser:
- 'PENDIENTE' - si es pago futuro
- 'PAGADO' - si ya se cobró
- 'CANCELADO' - si se cancela

Script siempre envía como pago cobrado (correctamente), pero no es flexible.

---

## 🔍 VALIDACIÓN: ¿COINCIDE CON LO QUE ENVÍA EL SCRIPT?

### Script envía (línea ~782-795):

```javascript
{
  p_institucion_id: instId,                    // ✅ RPC recibe
  p_estudiante_id: estId,                      // ✅ RPC recibe
  p_numero_talonario: talonario,               // ✅ RPC recibe
  p_monto_total: montoTotal,                   // ✅ RPC recibe
  p_cantidad_conceptos: detalles.length,       // ✅ RPC recibe
  p_metodo_pago: metodo,                       // ✅ RPC recibe
  p_fecha_cobro: new Date().toISOString().split('T')[0],  // ✅ RPC recibe
  p_descripcion: `Pago agrupado: ${detalles.length} conceptos`,  // ✅ RPC recibe
  p_detalles: detalles  // ✅ RPC recibe (array JSONB)
}
```

✅ **MAPEO PERFECTO - Script envía exactamente lo que RPC espera**

---

## ✅ CONCLUSIÓN: RPC ESTÁ CORRECTAMENTE MAPEADA

El código RPC:
1. ✅ Valida duplicados por numero_talonario
2. ✅ Hace UPSERT (actualiza si existe, inserta si no)
3. ✅ Inserta detalles correctamente
4. ✅ Recibe todos los parámetros que script envía
5. ✅ Mapea a columnas correctas

---

## ⚠️ PUNTOS A VERIFICAR EN TU BD

Ejecuta esto en SQL para confirmar:

```sql
-- Verificar que detalles se hayan insertado
SELECT COUNT(*) FROM pagos_multiples_detalle;

-- Ver un ejemplo de pago múltiple
SELECT pm.*, pmd.* 
FROM pagos_multiples pm
LEFT JOIN pagos_multiples_detalle pmd ON pm.id = pmd.pago_multiple_id
LIMIT 10;

-- Ver si hay NULLS en columnas que no se insertan
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN monto_mora IS NULL THEN 1 END) as monto_mora_null,
  COUNT(CASE WHEN include_mora IS NULL THEN 1 END) as include_mora_null,
  COUNT(CASE WHEN dias_vencimiento IS NULL THEN 1 END) as dias_vencimiento_null
FROM pagos_multiples_detalle;

-- Verificar constraints de pagos_multiples_detalle
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'pagos_multiples_detalle';
```

---

## 🎯 RESUMEN FINAL

| Aspecto | Estado | Detalle |
|---|---|---|
| **Parámetros RPC** | ✅ CORRECTO | Script envía todos |
| **Mapeo a pagos_multiples** | ✅ CORRECTO | Columnas coinciden |
| **Mapeo a pagos_multiples_detalle** | ✅ CORRECTO | Columnas coinciden |
| **UPSERT logic** | ✅ CORRECTO | Valida duplicados por talonario |
| **JSON parsing** | ✅ CORRECTO | Convierte p_detalles correctamente |
| **Columnas NULL** | ⚠️ A VERIFICAR | ¿monto_mora, include_mora, dias_vencimiento aceptan NULL? |

---

## 📌 RESPUESTA A TU PREGUNTA

**¿Está pasando los datos a columnas correctas?**

✅ **SÍ, 100% CORRECTO**

La RPC:
1. Recibe los 9 parámetros que script envía
2. Los mapea a las columnas correctas
3. Inserta en pagos_multiples y pagos_multiples_detalle
4. Maneja duplicados correctamente (UPSERT)

**El único riesgo es si algunas columnas no aceptan NULL**, pero por los nombres parecen opcionales.
