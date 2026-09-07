# 🔍 ANÁLISIS DE DISCREPANCIA - v2.28 DNI ÚNICO

## 📊 DATOS DEL REPORTE vs EXCEL

### Nivel SECUNDARIA 2026
```
Tu Sistema Reporta:
  - Estudiantes: 240
  - Al Día: 3
  - En Mora: 237
  - Recaudable: $18.960.000
  - Recaudado: $7.982.000
  - Deuda: $10.578.900

Excel Real (CSV):
  - Total de estudiantes: 246 (incluyendo duplicados/BECADOS)
  - Total Recaudable (INSCRIPCION): 961.000
  - Total Recaudable (Meses Mar-Dic): 4.247.500
  - TOTAL ESPERADO: ~5.208.500
```

### Nivel PRIMARIA 2026
```
Tu Sistema Reporta:
  - Estudiantes: 385
  - Al Día: 21
  - En Mora: 364
  - Recaudable: $30.415.000
  - Recaudado: $13.831.500
  - Deuda: $16.150.100

Excel Real (CSV):
  - Total de estudiantes: 398 (incluyendo duplicados/BECADOS)
  - Total Recaudable (INSCRIPCION): 901.500
  - Total Recaudable (Meses Mar-Dic): 4.993.317
  - TOTAL ESPERADO: ~5.894.817
```

---

## 🚨 PROBLEMAS IDENTIFICADOS EN v2.28

### 1. **Diferencia de x5-6 veces en montos**

Tu script reporta:
- SECUNDARIA: $18.960.000 (esperado: ~$5.2M)
- PRIMARIA: $30.415.000 (esperado: ~$5.9M)

**Factor de error: 3.6x - 5.1x**

### 2. **Causa Probable: Montos de Configuración Incorrecto**

En `CODIGO_COMPLETO_v3_FINAL.gs`, la función `cargarConfiguracionCarreras()` trae de Supabase:
```javascript
monto_inscripcion
monto_cuota
monto_seguro
```

Y la función `obtenerMontoOriginal()` usa estos valores configurados, **NO** los del Excel.

### 3. **El Fix v2.28 solo corrige DNI DUPLICADOS**

✅ Lo que SÍ hace:
- Elimina duplicados por DNI dentro de la misma institución
- Rechaza la 2da ocurrencia de un DNI

❌ Lo que NO hace:
- Valida que los montos de Supabase coincidan con el Excel
- Verifica que los montos originales sean correctos
- Detecta estudiantes BECADOS o LIBRE DE DEUDA

### 4. **Estudiantes Ignorados que DEBERÍAN contar**

En los CSV ves:
```
LIBRE DE DEUDA      → No debería contar como DEUDA
BECADA/BECADO       → Puede tener contribución parcial
BECADO (sin cuota)  → No tiene obligación
```

El script **actual NO filtra por OBSERVACIONES**, así que:
- BECADOS se cuentan igual que estudiantes normales
- LIBRE DE DEUDA aparece con deuda en el reporte

---

## 📋 CHECKLIST DE QUÉS ESTÁ MAL

```
[ ] Montos en configuracion_carreras de Supabase ≠ Excel real
[ ] No hay validación de estudiantes BECADOS (aplica descuento)
[ ] No hay validación de estudiantes LIBRE DE DEUDA (aplica 0 deuda)
[ ] El cálculo de "Recaudable" usa monto_original de Supabase, no del Excel
[ ] El fix DNI v2.28 solo dedupliciza, pero mantiene los otros problemas

```

---

## ✅ SOLUCIONES REQUERIDAS

### SOLUCIÓN 1: Verificar Configuración en Supabase
```sql
SELECT carrera_id, institucion_id, 
       monto_inscripcion, monto_cuota, monto_seguro
FROM configuracion_carreras
WHERE institucion_id IN (1, 2);
```

**Esperado vs Real:**
- Carrera PRIMARIA (id 5): monto_inscripcion = 10.000 ✓ (coincide)
- Carrera SECUNDARIA (id 6): monto_inscripcion = 10.000 ✓ (coincide)
- Carrera INICIAL (id 4): monto_inscripcion = 6.500 ✓ (coincide)

**PERO:** Si los montos configurados son 5-6x más altos → eso explica la discrepancia.

### SOLUCIÓN 2: Crear nuevo Fix que valide TODO
```javascript
// Agregar esta validación AL INICIO de normalizarExcelMulti()

function validarDatosExcelVsSupabase() {
  const Excel = {
    PRIMARIA: { inscripcion: 10000, recaudoTotal: 4993317 },
    SECUNDARIA: { inscripcion: 10000, recaudoTotal: 4247500 }
  };
  
  const Supabase = cargarConfiguracionCarreras(CONFIG);
  
  // Comparar y reportar discrepancias
  for (let carId in Supabase) {
    const excel = Excel[carId];
    const sb = Supabase[carId];
    
    if (excel.inscripcion !== sb.monto_inscripcion) {
      Logger.log(`❌ ALERTA: Carrera ${carId} - Inscripción ${excel.inscripcion} vs ${sb.monto_inscripcion}`);
    }
  }
}
```

### SOLUCIÓN 3: Filtrar BECADOS y LIBRE DE DEUDA
```javascript
// En procesarHojaCobranzaConValidacionDNI(), agregar:

const observaciones = String(fila[idxObservaciones] || "").toUpperCase();

if (observaciones.includes("BECAD")) {
  // Aplicar 50% descuento, o monto diferente
  montoPagadoInsc = montoPagadoInsc * 0.5;
  Logger.log(`   📌 BECADO: ${nombre} - aplica descuento 50%`);
}

if (observaciones.includes("LIBRE DE DEUDA")) {
  // No contar como deuda
  Logger.log(`   ✅ LIBRE DE DEUDA: ${nombre} - excluir de deuda`);
}
```

---

## 🔧 ACCIÓN INMEDIATA

**Paso 1:** Ejecutar esta SQL en Supabase:
```sql
SELECT carrera_id, institucion_id, 
       monto_inscripcion, monto_cuota, monto_seguro
FROM configuracion_carreras
WHERE institucion_id = 2
ORDER BY carrera_id;
```

**Comparar resultados con valores del Excel:**
- INICIAL (id 4): inscripción 6.500
- PRIMARIA (id 5): inscripción 10.000
- SECUNDARIA (id 6): inscripción 10.000

Si ves **100.000 o 150.000** → esa es la causa del error.

**Paso 2:** Compartir resultados de SQL para crear el fix correcto.

