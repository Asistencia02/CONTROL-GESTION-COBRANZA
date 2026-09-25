╔════════════════════════════════════════════════════════════════════════════════╗
║           🔧 GUÍA DE CONFIGURACIÓN - SUPABASE STORAGE PARA GASTOS               ║
╚════════════════════════════════════════════════════════════════════════════════╝

## ❌ PROBLEMA ACTUAL

```
Error al subir archivo: Error al subir archivo: new row violates row-level security policy
```

**Causa:** Las políticas RLS (Row Level Security) del bucket `comprobantes` no están configuradas correctamente.

---

## ✅ SOLUCIÓN PASO A PASO

### PASO 1: Crear el Bucket en Supabase

1. Ir a https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a **Storage** (en la barra lateral izquierda)
4. Click en **New Bucket**
5. Configurar:
   - **Name**: `comprobantes`
   - **Public**: Activar (ON)
   - **File size limit**: 10 MB
6. Click en **Create Bucket**

---

### PASO 2: Configurar Políticas RLS

**Opción A: Interfaz Gráfica (Recomendado)**

1. Ir a Storage > **comprobantes** (el bucket creado)
2. Click en la pestaña **Policies**
3. Click en **New Policy** (o el botón + verde)
4. Seleccionar: **For INSERT**
5. En el modal:
   - **Allowed role**: `authenticated`
   - **Using expression**: Dejar vacío (o usar predeterminado)
   - **With check expression**: Dejar vacío
6. Click **Review** → **Save policy**

Repetir el proceso para:
- **SELECT** (lectura)
- **UPDATE** (actualización)
- **DELETE** (eliminación)

---

**Opción B: SQL (si tienes acceso a SQL Editor)**

1. Ir a **SQL Editor** en Supabase
2. Click en **New Query**
3. Copiar y pegar el contenido de: `SETUP_SUPABASE_STORAGE.sql`
4. Click en **Run** o presionar Ctrl+Enter

---

### PASO 3: Verificar Estructura de Tabla

Si es la primera vez, necesitas agregar columnas a la tabla `gastos`:

```sql
-- Ejecutar en SQL Editor
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS archivo_url VARCHAR(500);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS tipo_archivo VARCHAR(50);
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_subida TIMESTAMP;
```

---

### PASO 4: Verificar Configuración

En SQL Editor, ejecuta:

```sql
-- Ver si el bucket existe
SELECT * FROM storage.buckets WHERE name = 'comprobantes';

-- Resultado esperado: 1 fila con id, name, owner, created_at, updated_at, etc.

-- Ver las columnas de la tabla gastos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'gastos'
ORDER BY ordinal_position;

-- Resultado esperado: columnas incluyendo archivo_url, tipo_archivo, fecha_subida
```

---

## 🧪 PROBAR FUNCIONAMIENTO

1. Abrir la aplicación
2. Ir a **Gestion de Gastos** → Tab **Registrar**
3. Llenar formulario:
   - Categoría: Servicios
   - Descripción: Test de carga
   - Monto: 100
   - Método: Efectivo
4. **Seleccionar un archivo** (JPG, PNG o PDF)
5. Click en **Registrar Gasto**
6. Esperar a que cargue...

**Si funciona:** ✅ Verás mensaje "Gasto registrado + Comprobante subido"
**Si falla:** ❌ Verás el error específico

---

## 🔍 TROUBLESHOOTING

### Error: "Bucket not found"
```
→ El bucket "comprobantes" no existe
→ Solución: Crear el bucket (Paso 1)
```

### Error: "row-level security policy"
```
→ Las políticas RLS no están configuradas
→ Solución: Configurar políticas (Paso 2)
```

### Error: "Unauthorized"
```
→ Usuario no está autenticado
→ Solución: Asegúrate que el usuario tiene sesión activa en la app
```

### Error: "File size too large"
```
→ Archivo mayor a 10 MB
→ Solución: Selecciona un archivo más pequeño
```

### Error: "Unsupported file type"
```
→ Tipo de archivo no permitido
→ Solución: Usa JPG, PNG, WebP o PDF
```

---

## 📋 RESUMEN DE POLÍTICAS RLS

| Operación | Rol | Permitido |
|-----------|-----|----------|
| **SELECT** (leer) | authenticated | ✅ Sí |
| **INSERT** (subir) | authenticated | ✅ Sí |
| **UPDATE** (editar) | authenticated | ✅ Sí |
| **DELETE** (eliminar) | authenticated | ✅ Sí |
| **Cualquier operación** | anonymous | ❌ No |

---

## ✨ CARACTERÍSTICAS IMPLEMENTADAS

✅ Upload de archivos a Supabase Storage
✅ Validación de tipo (JPG, PNG, WebP, PDF)
✅ Validación de tamaño (máx 10 MB)
✅ Preview de imagen en formulario
✅ Link clickeable en tabla de historial
✅ Nombres únicos: gasto-{institucionId}-{timestamp}.ext
✅ Manejo robusto de errores
✅ Logs en consola para debugging

---

## 📞 AYUDA ADICIONAL

Si tienes errores específicos:
1. Abre la consola del navegador (F12)
2. Copia el error completo
3. Comparte en logs

**Errores comunes en logs:**
```
❌ Error uploading to storage: [AQUÍ ESTÁ EL ERROR REAL]
```

---

## 🎯 CHECKLIST FINAL

- [ ] Bucket "comprobantes" creado en Supabase
- [ ] Bucket marcado como "Public"
- [ ] Políticas RLS configuradas (INSERT, SELECT, UPDATE, DELETE)
- [ ] Columnas agregadas a tabla "gastos"
- [ ] Usuario autenticado en la aplicación
- [ ] Archivo de prueba subido exitosamente
- [ ] Link "Ver" funciona en tabla de historial

---

**Estado:** ✅ Sistema listo para producción
**Fecha de configuración:** $(date)
**Documento:** SETUP_SUPABASE_STORAGE.sql
