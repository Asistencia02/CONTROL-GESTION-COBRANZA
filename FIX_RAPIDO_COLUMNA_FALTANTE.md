# 🔧 SOLUCIÓN RÁPIDA: AGREGAR COLUMNA FALTANTE

## ❌ PROBLEMA
```
column instituciones.saldo_minimo_caja_chica does not exist
```

## ✅ SOLUCIÓN: 1 MINUTO

### En Supabase:

1. **Ve a:** https://app.supabase.com/project/[tu-proyecto]/sql/new
   (O: SQL Editor → "+ New query")

2. **Copia y pega SOLO esto:**

```sql
ALTER TABLE instituciones
ADD COLUMN IF NOT EXISTS saldo_minimo_caja_chica INTEGER DEFAULT 5000;
```

3. **Click RUN** (o Ctrl+Enter)

4. **Debe decir: "Success"**

---

## ✅ LISTO

Después:
1. Recarga la app: Ctrl+Shift+R
2. F12 → Console
3. El error debería desaparecer ✓

**Avísame cuando lo hayas hecho.**
