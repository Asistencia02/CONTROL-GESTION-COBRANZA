# 📊 CÁLCULO EXACTO DEL EXCEL

## SECUNDARIA 2026 - Totales (última fila)
```
Inscripción: 961.000
Mar Seg: 145.500 + Mar Cuota: 621.000 = 766.500
Abr Seg: 15.000 + Abr Cuota: 530.000 = 545.000
May Seg: 16.500 + May Cuota: 445.500 = 462.000
Jun Seg: 24.000 + Jun Cuota: 370.000 = 394.000
Jul Seg: 40.500 + Jul Cuota: 299.000 = 339.500
Ago Seg: 36.000 + Ago Cuota: 266.000 = 302.000
Sep Seg: 36.000 + Sep Cuota: 130.000 = 166.000
Oct Seg: 13.500 + Oct Cuota: 100.000 = 113.500
Nov Seg: 9.000 + Nov Cuota: 90.000 = 99.000
Dic Seg: 9.000 + Dic Cuota: 90.000 = 99.000

TOTAL SECUNDARIA = 961.000 + 766.500 + 545.000 + 462.000 + 394.000 + 339.500 + 302.000 + 166.000 + 113.500 + 99.000 + 99.000
                 = 4.247.500
```

## PRIMARIA 2026 - Totales (última fila)
```
Inscripción: 901.500
Mar Seg: 133.500 + Mar Cuota: 665.000 = 798.500
Abr Seg: 27.000 + Abr Cuota: 619.917 = 646.917
May Seg: 27.000 + May Cuota: 545.000 = 572.000
Jun Seg: 25.500 + Jun Cuota: 453.400 = 478.900
Jul Seg: 54.500 + Jul Cuota: 425.000 = 479.500
Ago Seg: 49.500 + Ago Cuota: 377.000 = 426.500
Sep Seg: 48.000 + Sep Cuota: 175.000 = 223.000
Oct Seg: 16.500 + Oct Cuota: 140.000 = 156.500
Nov Seg: 15.000 + Nov Cuota: 140.000 = 155.000
Dic Seg: 15.000 + Dic Cuota: 140.000 = 155.000

TOTAL PRIMARIA = 901.500 + 798.500 + 646.917 + 572.000 + 478.900 + 479.500 + 426.500 + 223.000 + 156.500 + 155.000 + 155.000
               = 4.993.317
```

## RESUMEN CORRECTO

| Nivel | Total Recaudado | Estudiantes |
|-------|-----------------|-------------|
| **PRIMARIA** | **$4.993.317** | 385 |
| **SECUNDARIA** | **$4.247.500** | 240 |
| **INICIAL** | **$?** | 33 |
| **ANALISTA** | **$?** | 108 |
| **HIGIENE** | **$?** | 104 |

---

## ⚠️ PROBLEMA

Tu reporte muestra:
- PRIMARIA: $13.831.500 (debería ser $4.993.317) → **TRIPLICADO**
- SECUNDARIA: $7.982.000 (debería ser $4.247.500) → **1.88x**

**Esto significa que en tu BD hay registros DUPLICADOS o TRIPLICADOS.**

---

## ✅ ACCIÓN INMEDIATA

Ejecuta esto en Supabase para ver cuántos pagos hay realmente:

```sql
-- Ver cuántos pagos por carrera
SELECT 
  c.nombre_carrera,
  COUNT(p.id) as total_pagos,
  SUM(pd.monto_pagado) as total_recaudado
FROM pagos p
JOIN pago_detalles pd ON p.id = pd.pago_id
JOIN conceptos con ON pd.concepto_id = con.id
JOIN carreras c ON con.carrera_id = c.id
GROUP BY c.nombre_carrera
ORDER BY c.nombre_carrera;

-- Ver si hay duplicados
SELECT 
  estudiante_id,
  numero_talonario,
  COUNT(*) as repeticiones
FROM pagos
GROUP BY estudiante_id, numero_talonario
HAVING COUNT(*) > 1
LIMIT 20;
```

¿Cuáles son los resultados?

