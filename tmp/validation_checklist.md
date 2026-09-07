# VALIDACIÓN DE NORMALIZACIÓN - cobranza_v3_1_1_final.gs

## Fix #1: DNI Duplicado (Línea 678)
**Problema:** DNI duplicado se procesaba igual
**Validar:**
- ¿Se ejecuta `continue;` para saltar fila completamente?
- ¿Se registra en AUDIT que fue saltada?
- ¿El contador de registros se ajusta correctamente?

## Fix #2: AUDIT Deduplicación (Línea 695)
**Problema:** AUDIT se llenaba para duplicados
**Validar:**
- ¿Se deduplica ANTES de agregar a AUDIT?
- ¿Qué estructura de datos se usa? (Set, Map, Array filtrado)
- ¿Detecta duplicados por DNI + CONCEPTO_TIPO?

## Fix #3: Validación de Sumas (Línea 1036-1049)
**Problema:** Sin validación de sumas
**Validar:**
- ¿Calcula suma total correctamente?
- ¿Agrupa por CONCEPTO_TIPO?
- ¿Genera log detallado con:
  - Total de registros procesados
  - Suma total en pesos
  - Desglose por tipo (INSCRIPCION, CUOTA, SEGURO)

## NORMALIZACIÓN ESPERADA

### Datos de entrada (AUDIT_CONCEPTOS_GRABADOS.csv)
```
HOJA | DNI | CONCEPTO_TIPO | CONCEPTO_MES | MONTO
```

### Salida esperada para INICIAL + PRIMARIA + SECUNDARIA
- Total registros: ~210 estudiantes
- Total monto: $9,375,000
- Sin duplicados
- Validación de sumas

---

## PREGUNTAS CRÍTICAS

1. ¿Cómo deduplica? ¿Por DNI o por DNI+CONCEPTO?
2. ¿Hay validación de MONTO (que MONTO = CELDA_VALOR)?
3. ¿Normaliza texto (trim, mayúsculas)?
4. ¿Valida fechas/meses?
5. ¿Registra errores o solo éxitos?
