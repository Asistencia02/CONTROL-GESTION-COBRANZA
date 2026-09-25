-- ============================================================================
-- 🔧 SOLUCIÓN RÁPIDA - RLS POLICY PARA STORAGE COMPROBANTES
-- ============================================================================
-- EJECUTAR EN: Supabase Console > SQL Editor
-- Copiar TODO este contenido y ejecutar (Ctrl+Enter o Click RUN)

-- PASO 1: Habilitar RLS en la tabla storage.objects (si no está habilitado)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- PASO 2: ELIMINAR políticas antiguas (si existen)
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Allow inserts to bucket comprobantes" ON storage.objects;

-- PASO 3: CREAR NUEVA POLÍTICA - MÁS PERMISIVA
-- Esta política permite cualquier operación en el bucket comprobantes para usuarios autenticados
CREATE POLICY "Allow all authenticated operations on comprobantes"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'comprobantes' 
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'comprobantes'
  AND auth.role() = 'authenticated'
);

-- PASO 4: VERIFICAR
-- Ejecutar esta query para confirmar que la política está activa:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- ============================================================================
-- ALTERNATIVA: Si el anterior no funciona, usar esta política MÁS PERMISIVA:
-- ============================================================================
-- DROP POLICY IF EXISTS "Allow all authenticated operations on comprobantes" ON storage.objects;

-- CREATE POLICY "Allow any authenticated user to do anything with comprobantes"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'comprobantes')
-- WITH CHECK (bucket_id = 'comprobantes');

-- ============================================================================
-- AGREGAR COLUMNAS A TABLA GASTOS (si no existen)
-- ============================================================================
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tipo_archivo VARCHAR(50);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN FINAL - Ejecutar para confirmar todo está OK
-- ============================================================================

-- Ver si el bucket existe y está público
SELECT id, name, owner, public, created_at 
FROM storage.buckets 
WHERE name = 'comprobantes';

-- Ver las políticas activas en storage.objects para comprobantes
SELECT policyname, permissive, roles, qual, with_check
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- Ver las columnas de la tabla gastos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gastos'
AND column_name IN ('archivo_url', 'tipo_archivo', 'fecha_subida');
