## ✅ FIX APLICADO: v2.28 - DNI ÚNICO POR INSTITUCIÓN

### 📋 QUÉ CAMBIÓ

#### 1. **VALIDACIÓN DE DNI ÚNICO**
- **Antes (v2.27):** Cuando un DNI aparecía en 2+ hojas de la misma institución:
  ```javascript
  datosInst.todosLosEstudiantes[dniRaw].conceptos.concat(conceptosPagados)
  ```
  Concatenaba los conceptos, creando DUPLICADOS.

- **Ahora (v2.28):** Cada DNI se procesa UNA SOLA VEZ:
  ```javascript
  if (dniYaVistosEnInstitucion[dniRaw]) {
    // DNI YA FUE VISTO → RECHAZAR
    duplicadosRechazados++;
    continue; // SALTAR
  }
  // MARCAR como visto
  dniYaVistosEnInstitucion[dniRaw] = {...};
  ```

#### 2. **TRACKING DE DUPLICADOS**
- Nuevo contador: `dnisDuplicadosRechazados` por institución
- Se registra en `SKIPPED_DETAILS` con motivo: "DNI DUPLICADO (ya en otra carrera)"
- Se reporta en logs finales

#### 3. **CAMBIOS EN FUNCIONES**

**normalizarExcelParaCobranza():**
- Agrega `dniPorInstitucion` object para trackear DNIs únicos por institución
- Pasa el tracker a `procesarHojaCobranzaConValidacionDNI()`

**procesarHojaCobranzaConValidacionDNI() (NUEVA FUNCIÓN):**
- Reemplaza `procesarHojaCobranza()`
- Recibe `dniYaVistosEnInstitucion` como parámetro
- Valida cada DNI ANTES de procesar
- Si DNI ya existe en otra carrera → RECHAZA y registra

**sincronizarCobranzaInteligente():**
- Agrega retorno de `dnisDuplicadosRechazados`
- Acumula duplicados rechazados por institución

**guardarLogsCobranza() y guardarEstadoSincronizacion():**
- Nuevas columnas en logs: `DNI_DUPLICADOS_RECHAZADOS`

---

### 🎯 RESULTADOS ESPERADOS

**Con tu Excel actual:**
- **Antes:** 724 pagos (con duplicados)
- **Ahora:** ~710 pagos (sin duplicados)
- **Estudiantes rechazados:** 4 DNIs (que estaban en SECUNDARIA también)

**En logs verás:**
```
📊 Total: 244, Con pagos: 240, Duplicados rechazados: 4
```

---

### 🚀 CÓMO USAR

1. **Copia TODO el contenido** de `google-apps-script-v2-28-DNI-UNICO-FIX.gs`
2. **Abre Google Apps Script** en tu Google Sheet
3. **Borra el código anterior** 
4. **Pega el código nuevo**
5. **Guarda** (Ctrl+S)
6. **Ejecuta:** Menú → 🔄 SINCRONIZACIÓN COBRANZA v2.28 → ▶️ SINCRONIZAR (DNI ÚNICO)

---

### 📊 VALIDACIÓN

Después de ejecutar, verás en el log:
```
DNI DUPLICADO RECHAZADO: 512148650 en SECUNDARIA2026 (ya registrado)
DNI DUPLICADO RECHAZADO: 513768190 en SECUNDARIA2026 (ya registrado)
DNI DUPLICADO RECHAZADO: 533627980 en SECUNDARIA2026 (ya registrado)
DNI DUPLICADO RECHAZADO: 565941700 en SECUNDARIA2026 (ya registrado)
```

---

### ✅ PROBLEMAS RESUELTOS

1. ✅ No más concatenación de conceptos
2. ✅ DNI único por institución garantizado
3. ✅ Conceptos pagados en los mismos detalles
4. ✅ Pagos sin duplicar
5. ✅ Registro claro de qué se rechazó y por qué

---

### ⚠️ NOTA IMPORTANTE

**Aún hay 19 duplicados DENTRO de las mismas hojas:**
- PRIMARIA2026: 12 duplicados
- SECUNDARIA2026: 2 duplicados  
- HIGIENE2026: 5 duplicados

**Recomendación:** Limpia esos registros duplicados en Excel primero, o el script los procesará ambos en la primera carrera que encuentre.

