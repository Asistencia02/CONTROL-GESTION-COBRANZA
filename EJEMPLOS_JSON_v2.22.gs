/**
 * ==================== EJEMPLOS DE JSON PARA TESTING ====================
 * Usa estos ejemplos en Google Apps Script Web Editor para probar RPC
 * 
 * Copia el código en la consola del navegador (F12 → Console)
 * o en un script de Google Apps Script
 */

// ==================== EJEMPLO 1: PAGO SIMPLE (MODO EFECTIVO) ====================

const pagoSimple = {
  institucion_id: 1,
  estudiante_id: 25,
  concepto_id: 15,
  monto_pagado: 5000,
  monto_original: 5000,
  metodo_pago: "EFECTIVO",
  tipo_tarjeta: null,
  numero_talonario: "0001",
  estado: "PAGADO",
  fecha_pago: "2026-04-27",
  carrera_id: 1
};

// URL Supabase para insertar
const urlPagoSimple = "https://tcqamchiwtijniiwbpde.supabase.co/rest/v1/pagos";

// ==================== EJEMPLO 2: PAGO CON TARJETA ====================

const pagoTarjeta = {
  institucion_id: 1,
  estudiante_id: 26,
  concepto_id: 15,
  monto_pagado: 3500,
  monto_original: 3500,
  metodo_pago: "TARJETA_CREDITO",
  tipo_tarjeta: "CREDITO",
  numero_talonario: "0002",
  estado: "PAGADO",
  fecha_pago: "2026-04-27",
  carrera_id: 1
};

// ==================== EJEMPLO 3: PAGO MÚLTIPLE (DIVIDIDO) ====================

const pagoMultiple = {
  p_institucion_id: 1,
  p_estudiante_id: 27,
  p_numero_talonario: "AUTO_27_1682601234",
  p_monto_total: 4500,
  p_cantidad_conceptos: 3,
  p_metodo_pago: "EFECTIVO",
  p_fecha_cobro: "2026-04-27",
  p_descripcion: "CUOTA - MARZO - Dividido en 3 cuotas",
  p_detalles: JSON.stringify([
    {
      concepto_id: 15,
      monto_original: 5000,
      monto_pagado: 1000
    },
    {
      concepto_id: 15,
      monto_original: 5000,
      monto_pagado: 2000
    },
    {
      concepto_id: 15,
      monto_original: 5000,
      monto_pagado: 1500
    }
  ])
};

// URL RPC
const urlPagoMultiple = "https://tcqamchiwtijniiwbpde.supabase.co/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert";

// ==================== FUNCIÓN: Insertar Pago Simple ====================

function insertarPagoSimple() {
  const url = "https://tcqamchiwtijniiwbpde.supabase.co/rest/v1/pagos";
  const apiKey = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
  
  const payload = {
    institucion_id: 1,
    estudiante_id: 25,
    concepto_id: 15,
    monto_pagado: 5000,
    monto_original: 5000,
    metodo_pago: "EFECTIVO",
    numero_talonario: "TEST_0001",
    estado: "PAGADO",
    fecha_pago: "2026-04-27",
    carrera_id: 1
  };
  
  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Status: " + response.getResponseCode());
  Logger.log("Response: " + response.getContentText());
}

// ==================== FUNCIÓN: Insertar Pago Múltiple (RPC) ====================

function insertarPagoMultiple() {
  const url = "https://tcqamchiwtijniiwbpde.supabase.co/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert";
  const apiKey = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
  
  const detalles = [
    {
      concepto_id: 15,
      monto_original: 5000,
      monto_pagado: 1000
    },
    {
      concepto_id: 15,
      monto_original: 5000,
      monto_pagado: 2000
    },
    {
      concepto_id: 15,
      monto_original: 5000,
      monto_pagado: 1500
    }
  ];
  
  const payload = {
    p_institucion_id: 1,
    p_estudiante_id: 27,
    p_numero_talonario: "TEST_AUTO_001",
    p_monto_total: 4500,
    p_cantidad_conceptos: 3,
    p_metodo_pago: "EFECTIVO",
    p_fecha_cobro: "2026-04-27",
    p_descripcion: "CUOTA - MARZO - Dividido en 3 cuotas",
    p_detalles: JSON.stringify(detalles)
  };
  
  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Status: " + response.getResponseCode());
  Logger.log("Response: " + response.getContentText());
}

// ==================== FUNCIÓN: Batch Insert Pagos Simples ====================

function insertarLotePagos() {
  const url = "https://tcqamchiwtijniiwbpde.supabase.co/rest/v1/pagos";
  const apiKey = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
  
  const pagos = [];
  
  // Generar 10 pagos para 10 estudiantes diferentes
  for (let i = 1; i <= 10; i++) {
    pagos.push({
      institucion_id: 1,
      estudiante_id: 100 + i,
      concepto_id: 15,
      monto_pagado: 5000 + (i * 500),
      monto_original: 5000 + (i * 500),
      metodo_pago: i % 2 === 0 ? "TRANSFERENCIA" : "EFECTIVO",
      numero_talonario: `BATCH_${String(i).padStart(4, '0')}`,
      estado: "PAGADO",
      fecha_pago: "2026-04-27",
      carrera_id: 1
    });
  }
  
  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(pagos),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Status: " + response.getResponseCode());
  Logger.log("Insertados: " + pagos.length);
  Logger.log("Response: " + response.getContentText().substring(0, 200));
}

// ==================== FUNCIÓN: Buscar Pagos por Estudiante ====================

function buscarPagosPorEstudiante() {
  const url = "https://tcqamchiwtijniiwbpde.supabase.co/rest/v1/rpc/search_pagos_by_estudiantes";
  const apiKey = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
  
  const payload = {
    est_id_list: [25, 26, 27]
  };
  
  const options = {
    method: "post",
    headers: {
      "apikey": apiKey,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  Logger.log("Status: " + response.getResponseCode());
  Logger.log("Response: " + response.getContentText());
}

// ==================== EJEMPLO: EXCEL PAGOS_DETALLES ====================

/*
HOJA: PAGOS_DETALLES

DNI       | CONCEPTO | MES       | MONTO | METODO_PAGO | TALONARIO
----------|----------|-----------|-------|-------------|----------
12345678  | CUOTA    | MARZO     | 1000  | EFECTIVO    | 001
12345678  | CUOTA    | MARZO     | 2000  | EFECTIVO    | 002
12345678  | CUOTA    | MARZO     | 1500  | EFECTIVO    | 003
87654321  | SEGURO   | ABRIL     | 500   | TRANSFERENCIA | TRF_001
87654321  | SEGURO   | ABRIL     | 500   | TRANSFERENCIA | TRF_002

Esto generará:
- 1 pago_multiple para DNI 12345678/CUOTA/MARZO (monto_total: 4500)
- 1 pago_multiple para DNI 87654321/SEGURO/ABRIL (monto_total: 1000)
*/

// ==================== EJEMPLO: HOJA PRINCIPAL CON DIVIDIDO ====================

/*
HOJA: ANALISTA2026

ITEM | DNI      | APELLIDO | NOMBRES | INSCRIPCION | METODO | TALONARIO | ...
-----|----------|----------|---------|-------------|--------|-----------|----
1    | 12345678 | PÉREZ    | JUAN    | 5000        | DIVIDIDO | AUTO_1_xxx | ...

El METODO = DIVIDIDO hace que busque en PAGOS_DETALLES:
Key: "12345678|INSCRIPCION|"

Si encuentra 3 detalles:
- Crea 1 pago_multiple con numero_talonario = AUTO_1_xxx
- Inserta 3 filas en pagos_multiples_detalle
- Total: 1 registro lógico, 3 montos registrados
*/

// ==================== FUNCIÓN DE TEST: Ejecutar Todo ====================

function testCompleto() {
  Logger.log("\n=== TEST COMPLETO ===\n");
  
  Logger.log("1. Insertando pago simple...");
  insertarPagoSimple();
  
  Utilities.sleep(1000);
  
  Logger.log("\n2. Insertando pago múltiple (RPC)...");
  insertarPagoMultiple();
  
  Utilities.sleep(1000);
  
  Logger.log("\n3. Insertando lote de pagos...");
  insertarLotePagos();
  
  Utilities.sleep(1000);
  
  Logger.log("\n4. Buscando pagos...");
  buscarPagosPorEstudiante();
  
  Logger.log("\n=== TEST COMPLETADO ===\n");
}

// ==================== EJECUCIÓN ====================
// 
// En Google Apps Script:
// 1. Abre el editor (Tools → Script editor)
// 2. Copia todo este código
// 3. Selecciona la función deseada
// 4. Click "Run"
// 5. Ver logs en View → Logs
//
// Recomendado:
// - Primero: testCompleto()
// - O individual: insertarPagoSimple(), insertarPagoMultiple(), etc.

