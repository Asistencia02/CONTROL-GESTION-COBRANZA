-- ============================================================================
-- CONFIGURACIÓN DE STORAGE - EJECUTAR DESDE SUPABASE STORAGE UI
-- ============================================================================
-- 
-- NO ejecutar en SQL Editor (no tienes permisos)
-- VER INSTRUCCIONES ABAJO
--

-- ============================================================================
-- OPCIÓN 1: CREAR POLÍTICAS DESDE LA UI (SIN SQL)
-- ============================================================================
-- 
-- 1. Ir a: Storage > comprobantes > Policies
-- 2. Click en "New Policy" 
-- 3. Seleccionar: "For INSERT" 
-- 4. Template: "Custom" (sin plantilla)
-- 5. Copiar y pegar ABAJO
--

CREATE POLICY "Allow all INSERT"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'comprobantes');

-- 6. Click "Review" > "Save"
-- 7. Repetir para SELECT, UPDATE, DELETE

-- ============================================================================
-- OPCIÓN 2: USANDO STORAGE EDITOR POLICIES (RECOMENDADO)
-- ============================================================================
--
-- En Supabase Storage UI, para cada política:
--
-- POLÍTICA 1 - INSERT
-- - Allowed role: Leave empty (anonymous)
-- - Custom expression: NONE
-- - Click Save
--
-- POLÍTICA 2 - SELECT  
-- - Allowed role: Leave empty (anonymous)
-- - Custom expression: NONE
-- - Click Save
--
-- POLÍTICA 3 - UPDATE
-- - Allowed role: Leave empty (anonymous)
-- - Custom expression: NONE
-- - Click Save
--
-- POLÍTICA 4 - DELETE
-- - Allowed role: Leave empty (anonymous)
-- - Custom expression: NONE
-- - Click Save

-- ============================================================================
-- OPCIÓN 3: SCRIPT MÍNIMO (Sin RLS - UX directa)
-- ============================================================================
--
-- Si Storage tiene un "Simple" mode:
-- 1. Storage > comprobantes > Settings
-- 2. Toggle "Restrict access" OFF
-- 3. Confirmar
--
-- Esto permite uploads públicos sin RLS

-- ============================================================================
-- TABLA GASTOS - COLUMNAS NECESARIAS
-- ============================================================================
-- Ejecutar SOLO EN SQL EDITOR (no necesita permisos especiales):

ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500);
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS tipo_archivo VARCHAR(50);
ALTER TABLE public.gastos ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
-- En SQL Editor, verificar que existen las columnas:

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gastos' 
AND column_name IN ('archivo_url', 'tipo_archivo', 'fecha_subida');

-- Debería mostrar 3 filas
