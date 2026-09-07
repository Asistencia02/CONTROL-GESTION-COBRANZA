# 🎯 ANÁLISIS DEL RECAUDADO REAL

## 📊 Totales Según CSV

### SECUNDARIA 2026 (Última fila con TOTALES)
```
INSCRIPCION: 961.000
Seguro Marzo: 145.500
Cuota Marzo: 621.000
Seguro Abril: 15.000
Cuota Abril: 530.000
Seguro Mayo: 16.500
Cuota Mayo: 445.500
Seguro Junio: 24.000
Cuota Junio: 370.000
Seguro Julio: 40.500
Cuota Julio: 299.000
Seguro Agosto: 36.000
Cuota Agosto: 266.000
Seguro Sept: 36.000
Cuota Sept: 130.000
Seguro Octubre: 13.500
Cuota Octubre: 100.000
Seguro Nov: 9.000
Cuota Nov: 90.000
Seguro Dic: 9.000
Cuota Dic: 90.000
```

**TOTAL SECUNDARIA (RECAUDADO):**
```
961.000 + 145.500 + 621.000 + 15.000 + 530.000 + 16.500 + 445.500 
+ 24.000 + 370.000 + 40.500 + 299.000 + 36.000 + 266.000 + 36.000 
+ 130.000 + 13.500 + 100.000 + 9.000 + 90.000 + 9.000 + 90.000

= 4.247.500
```

---

### PRIMARIA 2026 (Última fila con TOTALES)
```
INSCRIPCION: 901.500
Seguro Marzo: 133.500
Cuota Marzo: 665.000
Seguro Abril: 27.000
Cuota Abril: 619.917
Seguro Mayo: 27.000
Cuota Mayo: 545.000
Seguro Junio: 25.500
Cuota Junio: 453.400
Seguro Julio: 54.500
Cuota Julio: 425.000
Seguro Agosto: 49.500
Cuota Agosto: 377.000
Seguro Sept: 48.000
Cuota Sept: 175.000
Seguro Octubre: 16.500
Cuota Octubre: 140.000
Seguro Nov: 15.000
Cuota Nov: 140.000
Seguro Dic: 15.000
Cuota Dic: 140.000
```

**TOTAL PRIMARIA (RECAUDADO):**
```
901.500 + 133.500 + 665.000 + 27.000 + 619.917 + 27.000 + 545.000 
+ 25.500 + 453.400 + 54.500 + 425.000 + 49.500 + 377.000 + 48.000 
+ 175.000 + 16.500 + 140.000 + 15.000 + 140.000 + 15.000 + 140.000

= 4.993.317
```

---

## 🔴 COMPARACIÓN: TU REPORTE vs EXCEL

| Nivel | Tu Reporte | Excel Real | Diferencia | Factor |
|-------|-----------|-----------|-----------|--------|
| **SECUNDARIA** | $7.982.000 | $4.247.500 | +$3.734.500 | **1.88x** |
| **PRIMARIA** | $13.831.500 | $4.993.317 | +$8.838.183 | **2.77x** |

---

## 🚨 PROBLEMA: DUPLICACIÓN O MULTIPLICACIÓN DE MONTOS

Tu sistema está reportando montos **2-3 veces más altos** de lo que realmente se recaudó.

### Causas Probables:

1. **❌ Conteo de estudiantes mal**: Si hay 246 estudiantes en SECUNDARIA pero se reporta como si fueran 246 × 3 = 738 (contando 3 veces cada uno)

2. **❌ Suma de múltiples institutos incorrecta**: Si el script suma ISIPP + Milagros + ambas juntas

3. **❌ Bug en cálculo de concepto_id**: Si los conceptos se están sumando múltiples veces por cada estudiante

4. **❌ Duplicación en el UPSERT**: Si `insertar_pago_multiple_con_detalles_upsert` está creando registros duplicados

5. **❌ Los BECADOS/LIBRE DE DEUDA no se excluyen**: Si se cuentan como pagado completo

---

## 🔍 VERIFICAR EN BASE DE DATOS

Ejecuta esta query para ver cuántos registros hay realmente:

```sql
-- Ver total de pagos por institución
SELECT 
  institucion_id,
  COUNT(*) as total_pagos,
  SUM(monto_total) as monto_total_recaudado
FROM pagos
WHERE institucion_id IN (1, 2)
GROUP BY institucion_id;

-- Ver si hay duplicados
SELECT 
  estudiante_id, 
  numero_talonario,
  COUNT(*) as repeticiones
FROM pagos
WHERE institucion_id IN (1, 2)
GROUP BY estudiante_id, numero_talonario
HAVING COUNT(*) > 1
LIMIT 20;

-- Ver monto por carrera
SELECT 
  c.nombre_carrera,
  COUNT(p.id) as total_pagos,
  SUM(pd.monto_pagado) as total_recaudado
FROM pagos p
JOIN pago_detalles pd ON p.id = pd.pago_id
JOIN conceptos con ON pd.concepto_id = con.id
JOIN carreras c ON con.carrera_id = c.id
WHERE p.institucion_id IN (1, 2)
GROUP BY c.nombre_carrera
ORDER BY c.nombre_carrera;
```

---

## ✅ ACCIONES A TOMAR

1. **Ejecutar las queries arriba para ver qué hay en base**
2. **Si hay duplicados**: Ejecutar VACUUM de pagos duplicados
3. **Revisar el RPC `insertar_pago_multiple_con_detalles_upsert`** - probablemente está duplicando
4. **Borrar y re-procesar desde cero** con el script correcto

