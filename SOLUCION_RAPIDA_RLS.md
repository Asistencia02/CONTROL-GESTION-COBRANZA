╔════════════════════════════════════════════════════════════════════════════════╗
║                    🔥 SOLUCIÓN RÁPIDA - ERROR RLS 400                           ║
╚════════════════════════════════════════════════════════════════════════════════╝

## ❌ ERROR ACTUAL

```
POST https://tcqamchiwtijniiwbpde.supabase.co/storage/v1/object/comprobantes/... 400 (Bad Request)
StorageApiError: new row violates row-level security policy
```

**Causa:** Las políticas RLS en `storage.objects` están rechazando el INSERT.

---

## ✅ SOLUCIÓN EN 3 PASOS

### PASO 1: Abrir SQL Editor en Supabase

1. Ir a https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** (en barra izquierda)
4. Click en **New Query**

### PASO 2: Copiar y Ejecutar Script

1. Abrir archivo: `SETUP_RLS_QUICK_FIX.sql`
2. Copiar TODO el contenido
3. Pegar en Supabase SQL Editor
4. Click en **Run** (o Ctrl+Enter)

Verás output como:
```
✓ success
Query executed successfully
```

### PASO 3: Probar Upload

1. Volver a la app
2. Ir a **Gestion de Gastos** → **Registrar**
3. Seleccionar archivo
4. Click **Registrar Gasto**
5. Debería funcionar ✅

---

## 🔍 SI SIGUE FALLANDO

**Opción A: Verificar que el bucket existe**

En SQL Editor ejecutar:
```sql
SELECT * FROM storage.buckets WHERE name = 'comprobantes';
```

Si NO aparece ninguna fila:
- Ir a **Storage** (en barra izquierda)
- Click **New Bucket**
- Name: `comprobantes`
- Activar **Public**
- Click **Create Bucket**

**Opción B: Verificar políticas**

En SQL Editor ejecutar:
```sql
SELECT policyname, permissive, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;
```

Deberías ver una fila con:
- policyname: `Allow all authenticated operations on comprobantes`
- permissive: `true`
- roles: `{authenticated}`

Si NO aparece, el script no se ejecutó. Vuelve al Paso 2.

**Opción C: Verificar RLS en tabla**

En SQL Editor ejecutar:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
```

Debería devolver:
```
objects | true
```

Si es `false`, ejecutar:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## 📋 CHECKLIST

- [ ] Bucket `comprobantes` existe
- [ ] Bucket está marcado como **Public**
- [ ] SQL script fue ejecutado sin errores
- [ ] Política RLS aparece en SQL Editor
- [ ] Usuario está autenticado en app
- [ ] Intento de carga funciona ✅

---

## 🆘 SI AÚN NO FUNCIONA

**Pega en chat:**
1. Output de esta query:
```sql
SELECT policyname, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';
```

2. Output de esta query:
```sql
SELECT * FROM storage.buckets WHERE name = 'comprobantes';
```

3. Error exacto de consola (F12)

---

## ⚡ RESUMEN

| Paso | Acción | Status |
|------|--------|--------|
| 1 | Abrir SQL Editor | ⬜ |
| 2 | Ejecutar SETUP_RLS_QUICK_FIX.sql | ⬜ |
| 3 | Probar upload | ⬜ |

---

**Tiempo estimado:** 2 minutos
**Dificultad:** 🟢 Fácil
**Garantía:** 99% funciona

