╔════════════════════════════════════════════════════════════════════════════╗
║  DIAGNÓSTICO: ¿Por qué muestra recaudado BAJO?                             ║
║  735 pagos múltiples + 4484 detalles = $14.5M recaudado (DEBERÍA SER +)    ║
╚════════════════════════════════════════════════════════════════════════════╝

## 🔍 ANÁLISIS DEL PROBLEMA

### DATOS QUE TIENES:
- 735 pagos múltiples (ESTADO = 'PAGADO')
- 4484 detalles de pago
- Ejemplo pago #1: monto_total = $143,000 con 6 detalles
- Ejemplo pago #3: monto_total = $221,000 con 11 detalles

### LO QUE MUESTRA EL REPORTE:
- ISIPP: $9,009,100 recaudado (de $27.6M recaudable) → 32% eficiencia
- Milagros: $5,529,400 recaudado (de $53.5M recaudable) → 10% eficiencia
- **TOTAL: $14,538,500 recaudado**

### PROBLEMA IDENTIFICADO:

La query del reporte hace esto:

```typescript
const { data: pagosMultiplesData } = await supabase
  .from('pagos_multiples')
  .select(`
    id,
    estudiante_id,
    estado,
    pagos_multiples_detalle(
      concepto_id,
      monto_pagado
    )
  `)
  .eq('institucion_id', institucionId)
  .neq('estado', 'ANULADO')

// Luego expande los detalles:
if (pagosMultiplesData) {
  pagosMultiplesData.forEach((pm: any) => {
    if (pm.pagos_multiples_detalle && Array.isArray(pm.pagos_multiples_detalle)) {
      pm.pagos_multiples_detalle.forEach((detalle: any) => {
        todosPagos.push({
          estudiante_id: pm.estudiante_id,
          concepto_id: detalle.concepto_id,
          monto_pagado: detalle.monto_pagado,
          estado: 'COMPLETADO'
        })
      })
    }
  })
}
```

**✅ ESTO ESTÁ CORRECTO** - expande 4484 detalles

---

## ⚠️ PROBLEMA REAL: No incluye tabla `pagos` antigua

Mira el resumen de datos:

```
ISIPP (institución_id = 1):
- 217 estudiantes
- Higiene: 109 estudiantes, $27,686,000 recaudable
- Analista: 108 estudiantes, $18,511,200 recaudable
- TOTAL recaudable ISIPP: $46,197,200

Milagros (institución_id = 2):
- 677 estudiantes
- Primaria: 398, $31,442,000
- Secundaria: 246, $19,434,000
- Inicial: 33, $2,607,000
- TOTAL recaudable Milagros: $53,483,000

TOTAL GLOBAL RECAUDABLE: $99,680,200
```

**PERO DEBERÍA SER:**

```
Milagros:
- Primaria: $4,285,000
- Secundaria: $3,984,500
- Inicial: $1,105,500
- TOTAL: $9,375,000

Analista (ISIPP):
- TOTAL: ???

Higiene (ISIPP):
- TOTAL: ???
```

---

## 🚨 DESCUBRIMIENTO CRÍTICO:

**Los montos RECAUDABLES están INFLADOS 3-5x lo que deberían ser**

Ejemplo:
- Primaria debería tener: $4,285,000
- Pero muestra: $31,442,000 ← 7x más alto

---

## ❓ PREGUNTA FUNDAMENTAL:

**¿Los CONCEPTOS tienen los montos correctos en la BD?**

Ejecuta:

```sql
-- Ver conceptos por carrera
SELECT 
  c.carrera_id,
  cr.nombre as carrera_nombre,
  c.tipo,
  c.mes,
  COUNT(*) as cantidad,
  SUM(c.monto) as monto_total
FROM conceptos_pago c
LEFT JOIN carreras cr ON c.carrera_id = cr.id
WHERE c.institucion_id IN (1, 2)
AND c.activo = true
AND c.monto > 0
GROUP BY c.carrera_id, cr.nombre, c.tipo, c.mes
ORDER BY c.carrera_id, c.tipo;

-- Ver cantidad de conceptos por carrera
SELECT carrera_id, COUNT(*) as conceptos FROM conceptos_pago 
WHERE institucion_id IN (1,2) AND activo = true 
GROUP BY carrera_id;
```

**Sospecho que:**
1. Hay MUCHOS conceptos duplicados en `conceptos_pago`
2. O los montos están duplicados por mes
3. Por eso la suma de "recaudable" está inflada

---

## 🎯 SOLUCIÓN POTENCIAL

Si hay conceptos duplicados, el reporte suma TODO como recaudable:

```typescript
totalRecaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
```

Si conceptos_pago tiene 12 meses de PRIMARIA para cada estudiante = $4,285,000 x 12 = $51,420,000

Pero solo pagaron $5,529,400 real = 10.8% de eficiencia ✓ (coincide con lo que muestra)

---

## 📋 VERIFICACIÓN NECESARIA

Comparte salida de:

```sql
-- ¿Cuántos conceptos hay por carrera?
SELECT carrera_id, tipo, COUNT(*) as cantidad, SUM(monto) as total_monto
FROM conceptos_pago
WHERE institucion_id IN (1,2)
AND activo = true
GROUP BY carrera_id, tipo
ORDER BY carrera_id;

-- Ver ejemplo de conceptos para Primaria (carrera_id 5)
SELECT id, nombre, tipo, mes, monto, año
FROM conceptos_pago
WHERE carrera_id = 5
AND institucion_id = 2
ORDER BY tipo, mes;
```

Esto revelará si hay duplicación en conceptos_pago.
