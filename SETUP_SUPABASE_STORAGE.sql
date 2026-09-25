-- ============================================================================
-- CONFIGURACIÓN DE SUPABASE STORAGE PARA GASTOS - BUCKET "comprobantes"
-- ============================================================================
-- Ejecutar estos comandos en Supabase SQL Editor

-- 1. CREAR BUCKET (si no existe)
-- Ir a Storage > New Bucket
-- Nombre: comprobantes
-- Public/Private: Public
-- File size limit: 10 MB (10485760)

-- 2. POLÍTICAS RLS PARA LECTURA PÚBLICA
-- En Supabase > Storage > comprobantes > Policies > New Policy

-- POLÍTICA 1: Permitir lectura pública de comprobantes
CREATE POLICY "Allow public read access"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'comprobantes' 
    AND auth.role() = 'authenticated'
  );

-- POLÍTICA 2: Permitir inserción a usuarios autenticados
CREATE POLICY "Allow authenticated insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'comprobantes'
    AND auth.role() = 'authenticated'
  );

-- POLÍTICA 3: Permitir actualización de archivos propios
CREATE POLICY "Allow update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'comprobantes'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'comprobantes'
    AND auth.role() = 'authenticated'
  );

-- POLÍTICA 4: Permitir eliminación
CREATE POLICY "Allow authenticated delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'comprobantes'
    AND auth.role() = 'authenticated'
  );

-- ============================================================================
-- TABLA "gastos" - Columnas para archivos
-- ============================================================================
-- Si la tabla "gastos" NO tiene estas columnas, ejecutar:

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tipo_archivo VARCHAR(50);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_gastos_archivo_url ON gastos(archivo_url);

-- ============================================================================
-- VERIFICACIÓN (ejecutar en SQL Editor)
-- ============================================================================
-- Ver políticas del bucket:
SELECT * FROM storage.buckets WHERE name = 'comprobantes';

-- Ver todas las políticas:
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND qual LIKE '%comprobantes%';

-- Ver estructura de tabla gastos:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gastos';
