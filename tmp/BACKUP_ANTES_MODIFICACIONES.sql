-- ==================== BACKUP COMPLETO - ANTES DE MODIFICACIONES ====================
-- Fecha: 2025 (antes de implementar deuda por mes actual)
-- Guardar este SQL como respaldo

-- ==================== 1. BACKUP ESTRUCTURA ACTUAL ====================

-- Tabla deudas_historicas (backup)
CREATE TABLE IF NOT EXISTS deudas_historicas_backup AS
SELECT * FROM deudas_historicas;

-- Tabla estudiantes (backup completo)
CREATE TABLE IF NOT EXISTS estudiantes_backup AS
SELECT * FROM estudiantes;

-- ==================== 2. BACKUP VISTAS EXISTENTES ====================

-- Vista v_deuda_estudiantes (ORIGINAL)
-- Se guardará como: v_deuda_estudiantes_original

CREATE OR REPLACE VIEW v_deuda_estudiantes_original AS
 SELECT e.id,
    e.dni,
    (((e.nombre)::text || ' '::text) || (e.apellido)::text) AS nombre_completo,
    c.nombre AS carrera,
    i.nombre AS institucion,
    e.estado,
    count(DISTINCT cp.id) AS conceptos_totales,
    count(DISTINCT
        CASE
            WHEN ((p.id IS NOT NULL) AND ((p.estado)::text = 'PAGADO'::text)) THEN cp.id
            ELSE NULL::bigint
        END) AS conceptos_pagados,
    count(DISTINCT
        CASE
            WHEN ((p.id IS NULL) OR ((p.estado)::text <> 'PAGADO'::text)) THEN cp.id
            ELSE NULL::bigint
        END) AS conceptos_adeudados,
    COALESCE(sum(
        CASE
            WHEN ((p.estado)::text = 'PAGADO'::text) THEN (0)::numeric
            ELSE cp.monto
        END), (0)::numeric) AS total_adeudado
   FROM ((((estudiantes e
     JOIN instituciones i ON ((e.institucion_id = i.id)))
     JOIN carreras c ON ((e.carrera_id = c.id)))
     LEFT JOIN conceptos_pago cp ON ((e.institucion_id = cp.institucion_id)))
     LEFT JOIN pagos p ON (((e.id = p.estudiante_id) AND (cp.id = p.concepto_id))))
  WHERE ((e.estado)::text <> 'NO_VIENE_MAS'::text)
  GROUP BY e.id, e.dni, e.nombre, e.apellido, c.nombre, i.nombre, e.estado;

-- ==================== 3. INFORMACIÓN DE BACKUP ====================

/*
BACKUP REALIZADO:
- deudas_historicas_backup (copia de deudas_historicas)
- estudiantes_backup (copia de estudiantes)
- v_deuda_estudiantes_original (vista actual guardada como original)

PARA RESTAURAR SI ALGO FALLA:
1. DROP TABLE deudas_historicas;
2. ALTER TABLE deudas_historicas_backup RENAME TO deudas_historicas;
3. DROP TABLE estudiantes;
4. ALTER TABLE estudiantes_backup RENAME TO estudiantes;
5. DROP VIEW v_deuda_estudiantes;
6. CREATE OR REPLACE VIEW v_deuda_estudiantes AS SELECT * FROM v_deuda_estudiantes_original;

CAMPOS NUEVOS QUE SE AGREGARÁN:
- estudiantes.deuda_actual (numeric)
- estudiantes.recaudable_año (numeric)
- estudiantes.última_actualización_deuda (timestamp)

MODIFICACIONES PRINCIPALES:
1. Crear función: calcular_deuda_actual() - solo conceptos vencidos (MARZO a MES_ACTUAL)
2. Crear función: calcular_recaudable_año() - todos conceptos año (MARZO a DICIEMBRE)
3. Crear trigger: actualizar_deudas_primer_mes() - ejecuta 1° de cada mes
4. Actualizar vista: v_deuda_estudiantes (para usar nuevas funciones)
*/
