-- ==================== AGREGAR CAMPOS A ESTUDIANTES ====================

ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS deuda_actual numeric DEFAULT 0;
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS recaudable_año numeric DEFAULT 0;

-- Verificar que se agregaron
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'estudiantes' 
AND column_name IN ('deuda_actual', 'recaudable_año');

-- Llenar los campos con valores iniciales (0)
UPDATE estudiantes 
SET 
    deuda_actual = COALESCE(deuda_actual, 0),
    recaudable_año = COALESCE(recaudable_año, 0)
WHERE estado <> 'NO_VIENE_MAS';

SELECT 'Campos agregados correctamente' as status;
