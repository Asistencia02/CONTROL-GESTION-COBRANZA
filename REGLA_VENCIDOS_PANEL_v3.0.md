# 📅 REGLA DE VENCIDOS - Panel Ejecutivo v3.0

## ✅ LÓGICA DE VENCIDOS APLICADA

### Regla Oficial:
```
SI día_actual <= 10:
    vencido_desde = mes_actual - 1
SINO (día_actual > 10):
    vencido_desde = mes_actual
```

### Ejemplos:

| Hoy | Día | Mes | Año | Vencidos Desde | Motivo |
|-----|-----|-----|-----|---|---|
| **1/AGO** | 1 | 8 | 2025 | **JUL/2025** | 1 ≤ 10 → mes_anterior |
| **5/AGO** | 5 | 8 | 2025 | **JUL/2025** | 5 ≤ 10 → mes_anterior |
| **10/AGO** | 10 | 8 | 2025 | **JUL/2025** | 10 ≤ 10 → mes_anterior |
| **11/AGO** | 11 | 8 | 2025 | **AGO/2025** | 11 > 10 → mes_actual |
| **15/AGO** | 15 | 8 | 2025 | **AGO/2025** | 15 > 10 → mes_actual |
| **31/AGO** | 31 | 8 | 2025 | **AGO/2025** | 31 > 10 → mes_actual |

---

## 🔍 IMPLEMENTACIÓN EN CÓDIGO

### Paso 1: Calcular Fecha de Vencidos
```typescript
const calcularFechaVencidos = () => {
  const today = new Date()
  const diaActual = today.getDate()
  const mesActual = today.getMonth() + 1
  const anioActual = today.getFullYear()

  // Aplicar regla
  let mesVencido = diaActual <= 10 ? mesActual - 1 : mesActual
  let anioVencido = anioActual

  // Ajustar si mes_vencido es 0 (enero anterior)
  if (mesVencido === 0) {
    mesVencido = 12
    anioVencido = anioActual - 1
  }

  return { mesVencido, anioVencido }
}
```

### Paso 2: Filtrar Conceptos Vencidos
```typescript
const conceptosArr = (todosConceptos || []).filter(c => {
  // INSCRIPCION sin fecha: siempre vencido
  if (c.tipo?.toUpperCase() === 'INSCRIPCION' && (!c.mes || !c.año)) {
    return true
  }
  
  // Conceptos con fecha
  if (c.mes && c.año) {
    // Vencido si: año anterior O (mismo año y mes <= mesVencido)
    if (c.año < anioVencido) return true
    if (c.año === anioVencido && c.mes <= mesVencido) return true
  }
  
  return false
})
```

### Paso 3: Mostrar en UI
```typescript
const fechaStr = `Hoy: ${diaActual}/${mesActual}/${anioActual} → Vencidos desde: ${meses[mesVencido]}/${anioVencido}`
// Aparece en header del panel
```

---

## 📊 EJEMPLOS DE CÁLCULO

### Escenario 1: Hoy es 5 de Agosto
```
Hoy: 5/8/2025
Día <= 10? Sí → vencido = mes_anterior = Julio

CONCEPTOS VENCIDOS:
✅ Julio/2024 → 2024 < 2025 ✓
✅ Julio/2025 → 2025 = 2025 y 7 ≤ 7 ✓
❌ Agosto/2025 → 2025 = 2025 pero 8 > 7 ✗
❌ Septiembre/2025 → 2025 = 2025 y 9 > 7 ✗

RESULTADO: Solo JUL/2024 y JUL/2025 se consideran vencidos
```

### Escenario 2: Hoy es 15 de Agosto
```
Hoy: 15/8/2025
Día > 10? Sí → vencido = mes_actual = Agosto

CONCEPTOS VENCIDOS:
✅ Julio/2024 → 2024 < 2025 ✓
✅ Julio/2025 → 2025 = 2025 y 7 ≤ 8 ✓
✅ Agosto/2025 → 2025 = 2025 y 8 ≤ 8 ✓
❌ Septiembre/2025 → 2025 = 2025 pero 9 > 8 ✗

RESULTADO: JUL/2024, JUL/2025 y AGO/2025 se consideran vencidos
```

### Escenario 3: Hoy es 5 de Enero (primer mes)
```
Hoy: 5/1/2025
Día <= 10? Sí → vencido = mes_anterior = Diciembre (año anterior)
Ajuste: mesVencido = 0 → 12, anioVencido = 2024

CONCEPTOS VENCIDOS:
✅ Diciembre/2024 → 2024 = 2024 y 12 ≤ 12 ✓
❌ Enero/2025 → 2025 = 2025 pero 1 > 12 ✗

RESULTADO: DICIEMBRE/2024 se considera vencido
```

---

## 🎯 CÓMO AFECTA AL PANEL EJECUTIVO

### Recaudable Total
```
RECAUDABLE = Σ de todos los CONCEPTOS VENCIDOS
             para cada estudiante de cada carrera
```

### Recaudado Total
```
RECAUDADO = Σ de todos los PAGOS realizados
            que corresponden a CONCEPTOS VENCIDOS
```

### Deuda Total
```
DEUDA = RECAUDABLE - RECAUDADO
```

### Estudiantes Al Día
```
AL DÍA = estudiantes con 100% de CONCEPTOS VENCIDOS pagados
```

### Estudiantes En Mora
```
EN MORA = estudiantes con al menos 1 CONCEPTO VENCIDO sin pagar
```

---

## 📋 VISUALIZACIÓN EN HEADER

El panel muestra en tiempo real:

```
📅 Hoy: 5/8/2025 → Vencidos desde: JUL/2025
```

O

```
📅 Hoy: 15/8/2025 → Vencidos desde: AGO/2025
```

Esto te indica exactamente qué conceptos se están considerando en el cálculo.

---

## ✅ VALIDACIÓN

La regla se valida correctamente porque:

1. ✅ Se calcula en `calcularFechaVencidos()`
2. ✅ Se pasa a `procesarInstitucion()`
3. ✅ Se usa en filtro de conceptos
4. ✅ Se muestra en UI para transparencia
5. ✅ Afecta correctamente recaudable/deuda/mora

---

## 🔄 CAMBIOS REALIZADOS EN v3.0

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| **Cálculo de vencidos** | ❌ Sin regla clara | ✅ Regla aplicada exactamente |
| **Display en UI** | ❌ No mostraba fecha | ✅ Muestra fecha de vencidos |
| **Filtro de conceptos** | ❌ Perdía conceptos | ✅ Filtra correctamente |
| **Recaudable** | ❌ Incorrecto | ✅ Solo vencidos |
| **Deuda** | ❌ Incorrecto | ✅ Solo deuda de vencidos |
| **Mora** | ❌ Incorrecto | ✅ Solo mora en vencidos |

---

**Versión:** Panel Ejecutivo v3.0 con Regla de Vencidos
**Estado:** ✅ LISTO PARA PRODUCCIÓN
**Regla:** Si día ≤ 10 → mes anterior; si día > 10 → mes actual
