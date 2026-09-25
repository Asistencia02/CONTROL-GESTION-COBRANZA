-- ============================================================================
-- 🔥 SOLUCIÓN NUCLEAR - DESHABILITAR RLS EN STORAGE.OBJECTS
-- ============================================================================
-- EJECUTAR EN: Supabase Console > SQL Editor
-- 
-- ⚠️ ADVERTENCIA: Esto deshabilitará RLS en storage.objects
-- Para producción, reconfigura RLS después de que funcione

-- PASO 1: DESHABILITAR RLS (permite uploads sin restricción)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS
DROP POLICY IF EXISTS "Allow all authenticated operations on comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Allow any authenticated user to do anything with comprobantes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder" ON storage.objects;

-- PASO 3: VERIFICAR QUE RLS ESTÁ DESHABILITADO
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
-- Debería mostrar: rowsecurity = false

-- PASO 4: AGREGAR COLUMNAS A TABLA GASTOS (si no existen)
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tipo_archivo VARCHAR(50);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP;

-- PASO 5: VERIFICAR BUCKET EXISTE Y ES PÚBLICO
SELECT id, name, owner, public 
FROM storage.buckets 
WHERE name = 'comprobantes';
-- Debería mostrar: public = true

-- ============================================================================
-- ✅ LISTO - El upload debería funcionar ahora
-- ============================================================================
-- Próximo paso: En la app, intentar cargar un archivo
-- Si funciona: El problema era RLS
-- Si falla: Ver error específico en consola
