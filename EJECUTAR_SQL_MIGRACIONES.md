# 🎯 EJECUTAR MIGRACIONES SQL EN SUPABASE

## ✅ SITUACIÓN ACTUAL
- ✓ App funciona en Vercel
- ✓ Login OK
- ✓ Dashboard carga datos
- ❌ Falta: Tablas de Caja Chica (caja_chica, caja_grande)

---

## 🔧 PASO A PASO: 5 MINUTOS

### PASO 1: Abre Supabase
```
https://app.supabase.com
→ Tu proyecto: "Control Gestion Cobranza"
```

### PASO 2: Ve a SQL Editor
```
Izquierda → "SQL Editor"
```

### PASO 3: Click "New Query"
```
Arriba derecha → "+ New query"
```

### PASO 4: Copia y pega TODO el SQL

**Copia TODO esto (sin modificar):**

```sql
-- ==================== MIGRACIONES SUPABASE v2.8 - CAJA CHICA ====================

-- 1. ACTUALIZAR tabla venta_kiosco - Agregar campos de efectivo
ALTER TABLE venta_kiosco 
ADD COLUMN IF NOT EXISTS monto_entregado INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cambio INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS caja_chica_id BIGINT REFERENCES caja_chica(id) ON DELETE SET NULL;

-- 2. CREAR tabla caja_chica
CREATE TABLE IF NOT EXISTS caja_chica (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INTEGER NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  fecha_apertura DATE NOT NULL,
  fecha_cierre DATE DEFAULT NULL,
  saldo_inicial INTEGER NOT NULL DEFAULT 0,
  saldo_final INTEGER DEFAULT NULL,
  saldo_residual INTEGER NOT NULL DEFAULT 0,
  monto_transferido INTEGER DEFAULT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK(estado IN ('ABIERTA', 'CERRADA')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(institucion_id, fecha_apertura, estado)
);

-- 3. CREAR tabla caja_grande
CREATE TABLE IF NOT EXISTS caja_grande (
  id BIGSERIAL PRIMARY KEY,
  institucion_id INTEGER NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  fecha_transferencia DATE NOT NULL,
  monto INTEGER NOT NULL,
  origen_caja_chica_id BIGINT REFERENCES caja_chica(id) ON DELETE SET NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'COMPLETADA' CHECK(estado IN ('COMPLETADA', 'ANULADA')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. AGREGAR campos a configuracion
ALTER TABLE configuracion_carreras
ADD COLUMN IF NOT EXISTS saldo_minimo_caja_chica INTEGER DEFAULT 5000;

-- 5. CREAR índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_caja_chica_institucion ON caja_chica(institucion_id);
CREATE INDEX IF NOT EXISTS idx_caja_chica_estado ON caja_chica(estado);
CREATE INDEX IF NOT EXISTS idx_caja_chica_fecha ON caja_chica(fecha_apertura);
CREATE INDEX IF NOT EXISTS idx_caja_grande_institucion ON caja_grande(institucion_id);
CREATE INDEX IF NOT EXISTS idx_caja_grande_fecha ON caja_grande(fecha_transferencia);
CREATE INDEX IF NOT EXISTS idx_venta_kiosco_caja ON venta_kiosco(caja_chica_id);

-- ==================== FIN MIGRACIONES ====================
```

### PASO 5: Pega en el editor de SQL
```
Click en el área de texto
Ctrl+V (pega todo)
```

### PASO 6: Ejecuta
```
Arriba a la derecha → "RUN" (botón azul)
O presiona: Ctrl+Enter
```

### PASO 7: Verifica que no hay errores
```
Debe decir: "No rows returned" o "Success"

Si dice "Error" en rojo:
- Lee el mensaje de error
- Probablemente es porque algo ya existe (es OK)
```

---

## ✅ SI COMPLETÓ EXITOSAMENTE

Verás mensajes como:
```
✓ CREATE TABLE "caja_chica" successfully created
✓ CREATE TABLE "caja_grande" successfully created
✓ ALTER TABLE "venta_kiosco" successfully modified
✓ CREATE INDEX "idx_caja_chica_institucion" successfully created
```

---

## 🔍 VERIFICAR QUE FUNCIONÓ

### En Supabase Dashboard:
```
1. Izquierda → "Table Editor"
2. Scroll down
3. Deberías ver:
   ✓ caja_chica (tabla nueva)
   ✓ caja_grande (tabla nueva)
4. Click venta_kiosco
5. Scroll right
6. Deberías ver:
   ✓ monto_entregado (columna nueva)
   ✓ cambio (columna nueva)
   ✓ caja_chica_id (columna nueva)
```

---

## 🔄 DESPUÉS EN LA APP

1. Abre Vercel: https://cobranzaespecial-d9cvirebq-contable2.vercel.app
2. Ctrl+Shift+R (hard refresh)
3. F12 → Console
4. Deberían DESAPARECER los errores de:
   ```
   column instituciones.saldo_minimo_caja_chica does not exist
   caja_chica table not found
   ```

---

## 🎯 PRÓXIMAS FUNCIONALIDADES

Una vez que las tablas existan:

1. **Kiosco:**
   - Ir a: "Venta Kiosco" en el sidebar
   - Click "Abrir Caja"
   - Registrar ventas
   - Click "Cerrar Caja" (transfiere a caja grande)

2. **Google Sync:**
   - Botón "Sincronizar Ahora"
   - Debe conectar con Google Apps Script
   - Sincroniza Excel a Supabase

3. **Reportes:**
   - Ver historial de cierres
   - Ver acumulado en caja grande

---

## ✨ CHECKLIST

- [ ] Abrí Supabase
- [ ] Fui a SQL Editor
- [ ] Copié TODO el SQL
- [ ] Lo pegué en editor
- [ ] Ejecuté (RUN o Ctrl+Enter)
- [ ] Verifiqué que no hay errores
- [ ] Verifiqué en Table Editor que existen las tablas
- [ ] Recargué la app en Vercel (Ctrl+Shift+R)
- [ ] Los errores desaparecieron

---

## 🚀 ¡LISTO!

Después de ejecutar esto, tu app estará 100% funcional con:
- ✅ Sistema de Caja Chica
- ✅ Transferencias a Caja Grande
- ✅ Control de efectivo
- ✅ Historial de cierres

**Avísame cuando lo hayas hecho.**
