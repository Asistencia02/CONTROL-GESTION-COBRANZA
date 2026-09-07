# 🗑️ LIMPIEZA DE BASE DE DATOS - PASO A PASO

## ⚠️ IMPORTANTE

Esta limpieza **eliminará TODOS los pagos registrados**. No se puede deshacer.

---

## OPCIÓN 1: Limpieza SQL (Recomendada - Más rápida)

### Paso 1: Ir a Supabase SQL Editor

1. Abre tu proyecto en Supabase
2. Ve a **SQL Editor** (lado izquierdo)
3. Haz clic en **New Query**

### Paso 2: Copiar y ejecutar SQL

Copia esto en el editor:

```sql
-- Truncar tablas con CASCADE para eliminar relaciones
TRUNCATE TABLE pago_detalles CASCADE;
TRUNCATE TABLE pagos CASCADE;

-- Resetear auto-increment a 1
ALTER SEQUENCE pago_detalles_id_seq RESTART WITH 1;
ALTER SEQUENCE pagos_id_seq RESTART WITH 1;

-- Verificar que está vacío
SELECT COUNT(*) as pagos_count FROM pagos;
SELECT COUNT(*) as detalles_count FROM pago_detalles;
```

### Paso 3: Ejecutar

- Haz clic en el botón **▶ RUN** (o Ctrl+Enter)
- Espera 5-10 segundos
- Verás en los resultados:
  ```
  pagos_count: 0
  detalles_count: 0
  ```

✅ **Listo - Base de datos limpia**

---

## OPCIÓN 2: Limpieza desde Google Apps Script

Si prefieres hacerlo desde el script:

### Paso 1: Copiar el script

Copia el contenido de `LIMPIAR_BASE_DATOS.gs` a un archivo nuevo en Google Apps Script:

1. Abre tu Google Apps Script
2. **Archivo → Nuevo → Script**
3. Pega el código de `LIMPIAR_BASE_DATOS.gs`

### Paso 2: Actualizar credenciales

En la parte superior, actualiza:

```javascript
const CONFIG_LIMPIEZA = {
  supabaseUrl: "tu_url_aqui", 
  supabaseKey: "tu_key_aqui",
};
```

### Paso 3: Ejecutar

- Ve a **Run** → selecciona función `limpiarBaseDatos`
- Haz clic en ▶ **Run**
- Lee los logs en **Execution log**

Verás algo como:
```
✅ pago_detalles eliminados
✅ pagos eliminados
Pagos en BD: 0
Detalles en BD: 0
```

---

## VERIFICACIÓN FINAL

Ejecuta esta query en Supabase SQL Editor para confirmar:

```sql
SELECT 
  (SELECT COUNT(*) FROM pagos) as pagos,
  (SELECT COUNT(*) FROM pago_detalles) as detalles;
```

Debe devolver:
```
pagos | detalles
------|----------
  0   |    0
```

---

## PRÓXIMO PASO

Una vez limpio, ejecuta:

```javascript
procesarPagosMultiplesV3Final()
```

Esto reprocesará desde cero TODO el Excel correctamente.

---

## 🚨 Si algo sale mal

Si ves un error como:
```
ERROR: permission denied
```

Esto significa que el usuario de Supabase no tiene permiso para DELETE.

**Solución:**
- Ve a Supabase → Authentication → Users
- Verifica que tu API key sea **Service Role** (no Anon Key)
- Los roles de políticas (RLS) deben permitir DELETE

O usa la **OPCIÓN 1 (SQL Editor)** que usa permisos de Admin.

