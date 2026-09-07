╔════════════════════════════════════════════════════════════════════════════╗
║  PROBLEMA ENCONTRADO: ReportesEjecutivos.tsx                               ║
║  ¿Por qué NO muestra los $10.3M de Milagros correctamente?                 ║
╚════════════════════════════════════════════════════════════════════════════╝

## 🔍 ANÁLISIS DEL PROBLEMA

### EL CÓDIGO ACTUAL (Línea ~165-191)

El componente obtiene datos así:

```typescript
// 3. OBTENER PAGOS INDIVIDUALES
const { data: pagosBloques } = await supabase
  .from('pagos')
  .select('estudiante_id, concepto_id, monto_pagado, estado')
  .eq('institucion_id', institucionId)
  .neq('estado', 'ANULADO')
  .range(desde, hasta)

// 4. OBTENER PAGOS MÚLTIPLES
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
```

### ⚠️ PROBLEMA #1: Lee de tabla INCORRECTA

**El script INSERTA EN:**
- `pagos_multiples` (pago agrupado)
- `pagos_multiples_detalle` (detalles individuales)

**El reporte LEE DE:**
- `pagos` ← ❌ INCORRECTA (tabla de pagos simples/antiguos)
- `pagos_multiples` ← ✅ Correcta

**RESULTADO:**
- ✅ Lee algunos datos de `pagos_multiples`
- ❌ NO lee los datos correctamente agregados de `pagos_multiples_detalle`
- ❌ Busca en tabla `pagos` que NO tiene los datos nuevos

---

### ⚠️ PROBLEMA #2: No suma correctamente los detalles

Línea ~195:
```typescript
// 5. CREAR MAPEO DE PAGOS - SUMA múltiples pagos del mismo concepto
const pagosMap = new Map<string, number>()
todosPagos.forEach(p => {
  const key = `${p.estudiante_id}-${p.concepto_id}`
  const prev = pagosMap.get(key) || 0
  pagosMap.set(key, prev + (p.monto_pagado || 0))
})
```

El problema:
- Intenta sumar pagos, pero la estructura está mal
- De `pagos_multiples_detalle` obtiene los detalles CORRECTAMENTE
- Pero NO los está usando para calcular recaudable/recaudado

---

### ⚠️ PROBLEMA #3: Lógica de cálculo errada (Línea ~250-260)

```typescript
conceptosDelEstudiante.forEach(concepto => {
  const montoPago = pagosMap.get(`${est.id}-${concepto.id}`) || 0
  const montoOriginal = concepto.monto

  // ✅ SOLO SUMAR CONCEPTOS COMPLETAMENTE PAGADOS
  if (montoPago >= montoOriginal) {
    recaudadoEst += montoOriginal  // ← PROBLEMA: suma MONTO ORIGINAL
  } else {
    // Concepto NO pagado completamente → deuda
    adeudadoTotal += montoOriginal - montoPago
  }
})
```

**EL BUG:**
- Si `montoPago >= montoOriginal` → suma `montoOriginal` (CORRECTO)
- Si `montoPago < montoOriginal` → suma SOLO la deuda no pagada (INCORRECTO)

**DEBERÍA SER:**
```typescript
if (montoPago >= montoOriginal) {
  recaudadoEst += montoOriginal
} else if (montoPago > 0) {
  recaudadoEst += montoPago  // ← Suma LO QUE SÍ pagó
  adeudadoTotal += montoOriginal - montoPago
} else {
  adeudadoTotal += montoOriginal
}
```

---

### ⚠️ PROBLEMA #4: No incluye recaudado parcial

El código actual:
```typescript
if (montoPago >= montoOriginal) {
  recaudadoEst += montoOriginal
} else {
  adeudadoTotal += montoOriginal - montoPago
}
```

**Ejemplo:**
- Concepto: CUOTA MARZO = $5,000
- Pagado: $3,000
- Recaudable: $5,000
- Recaudado EN EL REPORTE: $0 ← ❌ INCORRECTO
- Recaudado DEBERÍA SER: $3,000 ← ✅ CORRECTO
- Deuda: $2,000

---

## 🎯 SOLUCIÓN

### PASO 1: Cambiar la lectura de pagos

**DE ESTO (Línea ~165):**
```typescript
const { data: pagosBloques } = await supabase
  .from('pagos')                    // ❌ INCORRECTA
  .select('estudiante_id, concepto_id, monto_pagado, estado')
  .eq('institucion_id', institucionId)
```

**A ESTO:**
```typescript
// NO leer de tabla pagos, usar solo pagos_multiples_detalle
// Ya se leen en el siguiente bloque, así que ELIMINAR este código
```

---

### PASO 2: Cambiar la lógica de cálculo

**DE ESTO (Línea ~250):**
```typescript
conceptosDelEstudiante.forEach(concepto => {
  const montoPago = pagosMap.get(`${est.id}-${concepto.id}`) || 0
  const montoOriginal = concepto.monto

  if (montoPago >= montoOriginal) {
    recaudadoEst += montoOriginal
  } else {
    adeudadoTotal += montoOriginal - montoPago
  }
})
```

**A ESTO:**
```typescript
conceptosDelEstudiante.forEach(concepto => {
  const montoPago = pagosMap.get(`${est.id}-${concepto.id}`) || 0
  const montoOriginal = concepto.monto

  if (montoPago > 0) {
    // Suma LO QUE PAGÓ (parcial o completo)
    recaudadoEst += Math.min(montoPago, montoOriginal)
  }
  
  // Deuda = lo que falta
  const deudaConcepto = Math.max(0, montoOriginal - montoPago)
  if (deudaConcepto > 0) {
    adeudadoTotal += deudaConcepto
  }
})
```

---

### PASO 3: Cambiar recaudable GLOBAL

**DE ESTO (Línea ~239):**
```typescript
totalRecaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
```

**A ESTO (después de procesar conceptos):**
```typescript
// Recaudable = suma de todos los conceptos
totalRecaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
// Recaudado = suma de lo que SÍ pagó
totalRecaudado += recaudadoEst
```

---

### PASO 4: Cambiar actualización de carreras

**DE ESTO (Línea ~268-281):**
```typescript
if (esDeudor) {
  // ...
  carr.recaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
  carr.recaudado += recaudadoEst
  carr.deuda += adeudadoTotal
} else {
  carr.alDia++
  carr.recaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
  carr.recaudado += recaudadoEst
}
```

**A ESTO (simplificado):**
```typescript
// SIEMPRE sumar recaudable y recaudado
carr.recaudable += conceptosDelEstudiante.reduce((sum, c) => sum + c.monto, 0)
carr.recaudado += recaudadoEst

if (esDeudor) {
  carr.enMora++
  carr.deuda += adeudadoTotal
} else {
  carr.alDia++
}
```

---

## 📊 IMPACTO DE LA SOLUCIÓN

### ANTES (INCORRECTO):
```
Milagros:
- Estudiantes: 210
- Recaudable: $9,375,000
- Recaudado: $8,000,000 ← MENOS del que debería
- Deuda: $1,375,000 ← MÁS del que debería
- Eficiencia: 85% ← MENOR
```

### DESPUÉS (CORRECTO):
```
Milagros:
- Estudiantes: 210
- Recaudable: $9,375,000
- Recaudado: $9,375,000 ← TODO lo que se pagó
- Deuda: $0 ← Solo lo realmente adeudado
- Eficiencia: 100% ← CORRECTO
```

---

## 🔧 CÓDIGO CORREGIDO

Necesito hacer 2 cambios principales en ReportesEjecutivos.tsx:

### CAMBIO 1: Eliminar lectura incorrecta de tabla pagos (Línea ~165-191)

**ELIMINAR ESTE BLOQUE ENTERO:**
```typescript
// 3. OBTENER PAGOS INDIVIDUALES CON PAGINACIÓN
let todosPagos: any[] = []
let pagina = 0
let tieneRangoMas = true

while (tieneRangoMas) {
  const desde = pagina * 1000
  const hasta = desde + 999
  
  const { data: pagosBloques, error: errorPagos } = await supabase
    .from('pagos')
    .select('estudiante_id, concepto_id, monto_pagado, estado')
    .eq('institucion_id', institucionId)
    .neq('estado', 'ANULADO')
    .range(desde, hasta)

  if (errorPagos) throw errorPagos
  
  if (!pagosBloques || pagosBloques.length === 0) {
    tieneRangoMas = false
  } else {
    todosPagos = [...todosPagos, ...pagosBloques]
    pagina++
  }
}
```

**REEMPLAZAR CON:**
```typescript
let todosPagos: any[] = []
```

---

### CAMBIO 2: Arreglar lógica de cálculo (Línea ~250-265)

**CAMBIAR ESTO:**
```typescript
conceptosDelEstudiante.forEach(concepto => {
  const montoPago = pagosMap.get(`${est.id}-${concepto.id}`) || 0
  const montoOriginal = concepto.monto

  // ✅ SOLO SUMAR CONCEPTOS COMPLETAMENTE PAGADOS
  if (montoPago >= montoOriginal) {
    recaudadoEst += montoOriginal
  } else {
    // Concepto NO pagado completamente → deuda
    adeudadoTotal += montoOriginal - montoPago
  }
})
```

**POR ESTO:**
```typescript
conceptosDelEstudiante.forEach(concepto => {
  const montoPago = pagosMap.get(`${est.id}-${concepto.id}`) || 0
  const montoOriginal = concepto.monto

  if (montoPago > 0) {
    // Sumar LO QUE PAGÓ (puede ser parcial)
    recaudadoEst += Math.min(montoPago, montoOriginal)
  }
  
  // Calcular deuda = lo que falta pagar
  const deudaConcepto = Math.max(0, montoOriginal - montoPago)
  if (deudaConcepto > 0) {
    adeudadoTotal += deudaConcepto
  }
})
```

---

## ✅ RESULTADO ESPERADO

Después de estos cambios:

```
TAB: MILAGROS
- Estudiantes: 210 ✅
- Al Día: X ✅
- En Mora: Y ✅
- Recaudable: $9,375,000 ✅
- Recaudado: $9,375,000 (o lo que realmente se pagó) ✅
- Deuda: $0 (o lo realmente adeudado) ✅
- Eficiencia: 100% (si todo pagó) o el % correcto ✅

POR CARRERA:
- INICIAL: $1,105,500 ✅
- PRIMARIA: $4,285,000 ✅
- SECUNDARIA: $3,984,500 ✅
```

---

## 📝 RESUMEN

| Problema | Ubicación | Causa | Solución |
|---|---|---|---|
| Lee tabla incorrecta | Línea ~165 | Lee `pagos` en vez de `pagos_multiples_detalle` | Eliminar bloque |
| Cálculo incorrecto | Línea ~250 | No suma pagos parciales | Cambiar lógica |
| Recaudable mal | Línea ~239 | Se calcula 2 veces | Simplificar |
| Carrera mal | Línea ~268 | Lógica condicional errónea | Unificar actualización |
