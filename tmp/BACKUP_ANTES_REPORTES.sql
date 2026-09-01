-- ==================== BACKUP COMPLETO ANTES DE IMPLEMENTAR REPORTE ====================
-- Fecha: 2025
-- Propósito: Resguardo antes de crear vistas y queries nuevas para reportes

-- ==================== 1. BACKUP DE TABLAS CRÍTICAS ====================

-- Backup tabla conceptos_pago
CREATE TABLE IF NOT EXISTS conceptos_pago_backup AS
SELECT * FROM conceptos_pago;

-- Backup tabla pagos
CREATE TABLE IF NOT EXISTS pagos_backup AS
SELECT * FROM pagos;

-- Backup tabla estudiantes
CREATE TABLE IF NOT EXISTS estudiantes_backup_v2 AS
SELECT * FROM estudiantes;

-- Backup tabla carreras
CREATE TABLE IF NOT EXISTS carreras_backup AS
SELECT * FROM carreras;

-- ==================== 2. BACKUP VISTAS EXISTENTES ====================

-- Vista v_deuda_estudiantes original
CREATE OR REPLACE VIEW v_deuda_estudiantes_backup AS
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

-- ==================== 3. INFORMACIÓN DE RESPALDO ====================

/*
BACKUP REALIZADO - ANTES DE IMPLEMENTAR REPORTES

Tablas respaldadas:
✅ conceptos_pago_backup
✅ pagos_backup
✅ estudiantes_backup_v2
✅ carreras_backup

Vistas respaldadas:
✅ v_deuda_estudiantes_backup

PARA RESTAURAR SI ALGO FALLA:

-- Restaurar tabla completa
DELETE FROM conceptos_pago;
INSERT INTO conceptos_pago SELECT * FROM conceptos_pago_backup;

DELETE FROM pagos;
INSERT INTO pagos SELECT * FROM pagos_backup;

DELETE FROM estudiantes;
INSERT INTO estudiantes SELECT * FROM estudiantes_backup_v2;

DELETE FROM carreras;
INSERT INTO carreras SELECT * FROM carreras_backup;

-- Restaurar vista
DROP VIEW v_deuda_estudiantes;
CREATE OR REPLACE VIEW v_deuda_estudiantes AS SELECT * FROM v_deuda_estudiantes_backup;

*/
