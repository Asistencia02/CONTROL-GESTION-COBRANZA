===============================================================================
GOOGLE APPS SCRIPT v2.22 - MODO COBRANZA CON PAGOS_MULTIPLES
===============================================================================

📋 RESUMEN DE CAMBIOS vs v2.21
════════════════════════════════════════════════════════════════════════════════

✅ NUEVA FUNCIONALIDAD: TABLA PAGOS_MULTIPLES (DIVIDIDO)
   - Si metodo_pago = "DIVIDIDO", agrupa múltiples detalles en 1 registro
   - Usa RPC: insertar_pago_multiple_con_detalles_upsert
   - Almacena: numero_talonario ÚNICO, metodo_pago, tipo_tarjeta
   - Relaciona con: pagos_multiples_detalle (monto_pagado x concepto)

✅ SOPORTE PARA TIPO_TARJETA
   - Detecta: TARJETA_CREDITO / TARJETA_DEBITO
   - Extrae tipo (CREDITO/DEBITO) y normaliza metodo_pago
   - Almacena en campo: tipo_tarjeta

✅ CONTADORES MEJORADOS
   - Agregó: contadores.pagosMultiplesInsertados
   - Separa pagos simples vs pagos múltiples
   - Resumen LOG: PAGOS_SIMPLES | PAGOS_MULTIPLES | ERRORES

════════════════════════════════════════════════════════════════════════════════
CÓMO FUNCIONA EL MODO DIVIDIDO (COBRANZA)
════════════════════════════════════════════════════════════════════════════════

1️⃣  EXCEL CON HOJA PAGOS_DETALLES
    
    DNI         | CONCEPTO   | MES         | MONTO | METODO_PAGO | TALONARIO
    ────────────────────────────────────────────────────────────────────────
    12345678    | CUOTA      | MARZO       | 1000  | EFECTIVO    | 001
    12345678    | CUOTA      | MARZO       | 2000  | EFECTIVO    | 002
    12345678    | CUOTA      | MARZO       | 1500  | EFECTIVO    | 003

2️⃣  EN PAGOS_CUOTA SE MARCA COMO DIVIDIDO

    ITEM | DNI      | APELLIDO | NOMBRES | MES     | METODO_PAGO | TALONARIO
    ────────────────────────────────────────────────────────────────────────
    1    | 12345678 | PÉREZ    | JUAN    | MARZO   | DIVIDIDO    | AUTO_15_12345

3️⃣  SCRIPT DETECTA DIVIDIDO → BUSCA EN PAGOS_DETALLES

    Key: "12345678|CUOTA|MARZO" → Encuentra 3 detalles

4️⃣  CREA PAGO_MULTIPLE CON DETALLES

    INSERT pagos_multiples:
    {
      numero_talonario: "AUTO_15_12345",
      monto_total: 4500,
      cantidad_conceptos: 3,
      metodo_pago: "EFECTIVO",
      fecha_cobro: HOY
    }

    INSERT pagos_multiples_detalle (3 filas):
    {
      concepto_id: 15,
      monto_pagado: 1000,
      pago_multiple_id: (generado)
    }
    {
      concepto_id: 15,
      monto_pagado: 2000,
      pago_multiple_id: (generado)
    }
    {
      concepto_id: 15,
      monto_pagado: 1500,
      pago_multiple_id: (generado)
    }

════════════════════════════════════════════════════════════════════════════════
DIFERENCIAS: MODO SIMPLE vs MODO DIVIDIDO
════════════════════════════════════════════════════════════════════════════════

┌─ MODO SIMPLE (METODO_PAGO = EFECTIVO/TRANSFERENCIA/TARJETA_*) ────────────┐
│                                                                             │
│  1 pago = 1 concepto = 1 monto                                             │
│  Tabla: pagos                                                              │
│  Estructura simple, rápida                                                 │
│  Ejemplo: Juan pagó $5000 de CUOTA MARZO                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ MODO DIVIDIDO (METODO_PAGO = DIVIDIDO) ────────────────────────────────────┐
│                                                                             │
│  1 pago = N conceptos = N montos                                           │
│  Tabla: pagos_multiples + pagos_multiples_detalle                          │
│  Agrupa múltiples cuotas/pagos en 1 transacción                            │
│  Ejemplo: Juan pagó 3 parcialidades de CUOTA MARZO en mismo día            │
│           - $1000 (talón 001)                                              │
│           - $2000 (talón 002)                                              │
│           - $1500 (talón 003)                                              │
│           Total: $4500 (1 pago_multiple)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════════
ESTRUCTURA DE LA RPC: insertar_pago_multiple_con_detalles_upsert
════════════════════════════════════════════════════════════════════════════════

Parameters (ALL REQUIRED):
  p_institucion_id        → integer
  p_estudiante_id         → bigint
  p_numero_talonario      → varchar (UNIQUE key)
  p_monto_total           → numeric (suma de detalles)
  p_cantidad_conceptos    → integer (cant. detalles)
  p_metodo_pago           → varchar (EFECTIVO, TRANSFERENCIA, etc.)
  p_fecha_cobro           → date
  p_descripcion           → text
  p_detalles              → jsonb (array de objetos)

Return:
  pago_multiple_id        → bigint (id del pagomultiple creado/actualizado)
  detalles_insertados     → integer
  accion                  → varchar ('insertado' o 'actualizado')

Ejemplo de p_detalles JSON:
[
  { "concepto_id": 15, "monto_original": 5000, "monto_pagado": 1000 },
  { "concepto_id": 15, "monto_original": 5000, "monto_pagado": 2000 },
  { "concepto_id": 15, "monto_original": 5000, "monto_pagado": 1500 }
]

════════════════════════════════════════════════════════════════════════════════
CAMBIOS EN EL CÓDIGO v2.22
════════════════════════════════════════════════════════════════════════════════

📍 procesarPagosConMetodo()
   ├─ Agregó array: pagosMultiplesParaInsertar = []
   ├─ Detecta metodo === "DIVIDIDO"
   ├─ Busca detalles en pagosDetalles[key]
   ├─ Crea estructura para RPC
   ├─ Inserta via RPC (método POST)
   └─ Contador separado: res.pagosMultiples

📍 sincronizarDatos()
   ├─ Agregó contador: pagosMultiplesInsertados
   ├─ Suma pagosMultiples de cada tipo (INSC, CUOTA, SEGURO)
   └─ Lo reporta en logs

📍 Tipo de Tarjeta (NUEVO)
   ├─ Detecta si metodo contiene "CREDITO" o "DEBITO"
   ├─ Extrae: tipoTarjeta = "CREDITO" o "DEBITO"
   └─ Normaliza: metodo = "TARJETA_CREDITO" o "TARJETA_DEBITO"

════════════════════════════════════════════════════════════════════════════════
FLUJO COMPLETO DE EJECUCIÓN
════════════════════════════════════════════════════════════════════════════════

ejecutarFullAutoInterno()
  ├─ normalizarExcelMulti()
  │   ├─ Lee CUOTAS 2025 INSM vigente para cristian.xlsx
  │   ├─ Procesa hojas por institución (MAPEO_HOJAS)
  │   └─ Llama procesarHoja() para cada una
  │
  ├─ sincronizarDatos() por INSTITUCIÓN
  │   ├─ procesarEstudiantes() → INSERT/UPDATE estudiantes
  │   ├─ Espera 15s (Supabase)
  │   ├─ buscarEstudiantes() → obtiene DNI→ID map
  │   ├─ cargarConceptos()
  │   ├─ obtenerPagosExistentes()
  │   ├─ obtenerPagosDetalles() ← Lee PAGOS_DETALLES sheet
  │   │
  │   ├─ procesarPagosConMetodo() para INSCRIPCIÓN
  │   │   ├─ Para cada pago:
  │   │   │   ├─ Si metodo = DIVIDIDO:
  │   │   │   │   ├─ Busca detalles en PAGOS_DETALLES
  │   │   │   │   └─ Crea pago_multiple (RPC)
  │   │   │   └─ Si otro metodo:
  │   │   │       └─ Crea pago simple
  │   │   └─ Resultado: { insertados, pagosMultiples, errores, ... }
  │   │
  │   ├─ procesarPagosConMetodo() para CUOTA
  │   └─ procesarPagosConMetodo() para SEGURO
  │
  ├─ guardarResultadoFinalMulti() → LOG_SINCRONIZACION
  └─ guardarSkippedDetails() → SKIPPED_DETAILS

════════════════════════════════════════════════════════════════════════════════
CÓMO USAR EL SCRIPT
════════════════════════════════════════════════════════════════════════════════

1️⃣  COPIAR google-apps-script-codigo-v2-22-COBRANZA.gs
   └─ A Google Apps Script en tu Google Sheet

2️⃣  PREPARAR EXCEL ORIGEN
   └─ Hojas: ANALISTA2026, HIGIENE2026, INICIAL2026, PRIMARIA2026, SECUNDARIA2026
   └─ Columnas: ITEM, DNI, APELLIDO, NOMBRES, TELEFONO, INSCRIPCION, METODO, TALONARIO, 
               CUOTA MARZO, METODO, TALONARIO, ... (repetir para cada mes)

3️⃣  CREAR HOJA PAGOS_DETALLES (opcional)
   └─ Para pagos DIVIDIDO
   └─ Columnas: DNI, CONCEPTO (INSCRIPCION/CUOTA/SEGURO), MES, MONTO, METODO_PAGO, TALONARIO

4️⃣  EJECUTAR "🔄 SINCRONIZACIÓN" → "▶️ FULL AUTO MULTI"
   └─ Lee archivo, normaliza, procesa y sincroniza con Supabase

5️⃣  REVISAR LOGS
   └─ Ver hoja: LOG_SINCRONIZACION (resumen por institución)
   └─ Ver hoja: SKIPPED_DETAILS (errores y validaciones)
   └─ Ver hojas: ESTUDIANTES_INST*, PAGOS_*_INST* (datos normalizados)

════════════════════════════════════════════════════════════════════════════════
VENTAJAS SOBRE v2.21
════════════════════════════════════════════════════════════════════════════════

✅ Soporta pagos agrupados (DIVIDIDO) → Mejor para cobranzas con múltiples cuotas
✅ RPC UPSERT automático → Evita duplicados en numero_talonario
✅ Tipo de tarjeta separado → Mejor auditoría de pagos con tarjeta
✅ Más flexibilidad → Mismo estudiante, múltiples montos, 1 transacción
✅ Compatible con frontend React → Mismo sistema de las UI (RegistroPagos.tsx, etc.)

════════════════════════════════════════════════════════════════════════════════
LOGS QUE VAS A VER
════════════════════════════════════════════════════════════════════════════════

🚀 INICIANDO FULL AUTO v2.22 MULTI-INSTITUCIÓN (MANUAL) - CON PAGOS_MULTIPLES

📋 FASE 1: Normalizando datos...
🚀 normalizarExcelMulti() iniciado
✅ Instituciones detectadas: 1, 2
⚠️ Total de filas SKIPPED: 0

🔄 FASE 2: Sincronizando por institución...
   🔄 Sincronizando institución 1...
   📝 Procesando 45 estudiantes (batch POST RPC)...
   ✅ Estudiantes: 45
   Buscando estudiantes en BD...
   ✅ Encontrados: 45/45
   Procesando 120 inscripciones...
   ✅ INSCRIPCIÓN: 85 insertados, 12 múltiples
   Procesando 280 cuotas...
   ✅ CUOTAS: 250 insertados, 8 múltiples
   Procesando 140 seguros...
   ✅ SEGUROS: 135 insertados, 2 múltiples

📝 FASE 3: Guardando logs...
✅ Logs guardados

✅ PROCESO COMPLETADO

════════════════════════════════════════════════════════════════════════════════
TROUBLESHOOTING
════════════════════════════════════════════════════════════════════════════════

❌ "DIVIDIDO sin detalles: DNI ..."
   → La hoja PAGOS_DETALLES no tiene ese registro
   → Solución: Agregar fila en PAGOS_DETALLES con DNI|CONCEPTO|MES

❌ "Error INSERT pagos múltiples batch: 400/422"
   → Problema con RPC (parámetros inválidos)
   → Verificar: p_detalles debe ser JSON válido
   → Verificar: numero_talonario no está duplicado

❌ "No encontrados: N estudiantes"
   → Los estudiantes no se insertaron bien
   → Revisa: hoja SKIPPED_DETAILS
   → Causa común: DNI vacío, APELLIDO vacío, DNI > 20 chars

✅ Contactar: Script reconoce 2 instituciones, procesa 5 hojas, agrega 500+ estudiantes

════════════════════════════════════════════════════════════════════════════════
