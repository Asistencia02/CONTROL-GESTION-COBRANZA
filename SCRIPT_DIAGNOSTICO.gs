// ==================== SCRIPT DE DIAGNÓSTICO - ENCONTRAR EL CUELLO DE BOTELLA ====================

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

function diagnosticoCompleto() {
  try {
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🔧 DIAGNÓSTICO COMPLETO - ENCONTRANDO EL PROBLEMA");
    Logger.log("=".repeat(80));
    
    // 1. Verificar Excel
    Logger.log("\n1️⃣ Verificando archivo Excel...");
    const archivoOK = verificarArchivo();
    
    // 2. Verificar datos normalizados
    Logger.log("\n2️⃣ Verificando normalización de datos...");
    const datosNormalizados = normalizarYDiagnosticar();
    
    // 3. Verificar conexión Supabase
    Logger.log("\n3️⃣ Verificando conexión a Supabase...");
    const conexionOK = verificarConexionSupabase();
    
    // 4. Intentar insertar UN pago de prueba
    Logger.log("\n4️⃣ Intentando insertar UN pago de prueba...");
    const pruebaPago = insertarPagoPrueba();
    
    // 5. Resumen
    Logger.log("\n" + "=".repeat(80));
    Logger.log("📋 RESUMEN DIAGNÓSTICO");
    Logger.log("=".repeat(80));
    Logger.log(`✅ Archivo Excel encontrado: ${archivoOK}`);
    Logger.log(`✅ Datos normalizados: ${datosNormalizados.estudiantes} estudiantes`);
    Logger.log(`✅ Conexión Supabase OK: ${conexionOK}`);
    Logger.log(`✅ Pago prueba insertado: ${pruebaPago.success}`);
    
    if (!pruebaPago.success) {
      Logger.log(`   ❌ Error: ${pruebaPago.error}`);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR CRÍTICO: " + error);
  }
}

// ==================== 1. VERIFICAR ARCHIVO ====================

function verificarArchivo() {
  try {
    const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
    const files = DriveApp.getFilesByName(nombreArchivo);
    
    if (!files.hasNext()) {
      Logger.log(`   ❌ Archivo NO ENCONTRADO: ${nombreArchivo}`);
      return false;
    }
    
    const file = files.next();
    Logger.log(`   ✅ Archivo encontrado: ${file.getName()}`);
    Logger.log(`   📁 File ID: ${file.getId()}`);
    
    const ss = SpreadsheetApp.openById(file.getId());
    const hojas = ss.getSheets();
    Logger.log(`   📄 Hojas totales: ${hojas.length}`);
    
    for (let hoja of hojas) {
      const lastRow = hoja.getLastRow();
      Logger.log(`      - ${hoja.getName()}: ${lastRow} filas`);
    }
    
    return true;
  } catch (e) {
    Logger.log(`   ❌ Error: ${e}`);
    return false;
  }
}

// ==================== 2. NORMALIZAR Y DIAGNOSTICAR ====================

function normalizarYDiagnosticar() {
  const resultado = {
    estudiantes: 0,
    conPagos: 0,
    conErrores: 0
  };
  
  try {
    const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
    const files = DriveApp.getFilesByName(nombreArchivo);
    
    if (!files.hasNext()) {
      Logger.log(`   ❌ Archivo no encontrado`);
      return resultado;
    }
    
    const file = files.next();
    const ss = SpreadsheetApp.openById(file.getId());
    const hojas = ss.getSheets();
    
    const MAPEO_HOJAS = {
      "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
      "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
      "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
      "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
      "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
    };
    
    for (let hoja of hojas) {
      const nombreHoja = hoja.getName();
      if (!MAPEO_HOJAS[nombreHoja]) {
        Logger.log(`   ⏭️ Hoja ignorada: ${nombreHoja}`);
        continue;
      }
      
      const lastRow = hoja.getLastRow();
      if (lastRow < 2) continue;
      
      const datos = hoja.getRange(1, 1, lastRow, 50).getValues();
      
      let countValid = 0;
      let countPagos = 0;
      
      for (let r = 1; r < datos.length; r++) {
        const fila = datos[r];
        const apellido = String(fila[3] || "").trim();
        const nombre = String(fila[4] || "").trim();
        
        if (apellido && nombre) {
          countValid++;
          
          // Contar si tiene pagos
          const insc = parseInt(fila[8]) || 0;
          if (insc > 0) {
            countPagos++;
          }
        }
      }
      
      Logger.log(`   📄 ${nombreHoja}:`);
      Logger.log(`      - ${countValid} estudiantes válidos`);
      Logger.log(`      - ${countPagos} con pagos de inscripción`);
      
      resultado.estudiantes += countValid;
      resultado.conPagos += countPagos;
    }
    
  } catch (e) {
    Logger.log(`   ❌ Error: ${e}`);
    resultado.conErrores = 1;
  }
  
  return resultado;
}

// ==================== 3. VERIFICAR CONEXIÓN SUPABASE ====================

function verificarConexionSupabase() {
  try {
    // Test 1: GET simple
    Logger.log(`   🔗 Test 1: GET a estudiantes...`);
    const resp1 = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/estudiantes?limit=1`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (resp1.getResponseCode() === 200) {
      Logger.log(`      ✅ GET OK (código 200)`);
    } else {
      Logger.log(`      ❌ GET FALLA (código ${resp1.getResponseCode()})`);
      Logger.log(`      Response: ${resp1.getContentText().substring(0, 100)}`);
      return false;
    }
    
    // Test 2: POST simple
    Logger.log(`   🔗 Test 2: Contando pagos_multiples...`);
    const resp2 = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/pagos_multiples?limit=1`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (resp2.getResponseCode() === 200) {
      Logger.log(`      ✅ Tabla pagos_multiples accesible`);
    } else {
      Logger.log(`      ❌ Error accediendo a pagos_multiples`);
      return false;
    }
    
    // Test 3: RPC disponible
    Logger.log(`   🔗 Test 3: Verificando RPC insertar_pago_multiple_con_detalles_upsert...`);
    try {
      const resp3 = UrlFetchApp.fetch(
        `${SUPABASE_URL}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
        {
          method: "post",
          headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
          payload: JSON.stringify({
            p_institucion_id: 1,
            p_estudiante_id: 999999,
            p_numero_talonario: "TEST",
            p_monto_total: 0,
            p_cantidad_conceptos: 0,
            p_metodo_pago: "TEST",
            p_fecha_cobro: "2025-01-01",
            p_descripcion: "TEST",
            p_detalles: []
          }),
          muteHttpExceptions: true,
          timeout: 10
        }
      );
      
      Logger.log(`      ✅ RPC disponible (código ${resp3.getResponseCode()})`);
    } catch (e) {
      Logger.log(`      ⚠️ RPC error: ${e}`);
    }
    
    return true;
    
  } catch (e) {
    Logger.log(`   ❌ Error de conexión: ${e}`);
    return false;
  }
}

// ==================== 4. INSERTAR PAGO PRUEBA ====================

function insertarPagoPrueba() {
  const resultado = {
    success: false,
    error: ""
  };
  
  try {
    Logger.log(`   📝 Creando pago de prueba...`);
    
    // Primero: Verificar si existe estudiante ID 1
    const respEst = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/estudiantes?id=eq.1&select=id`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    let estId = 1;
    if (respEst.getResponseCode() === 200) {
      const datos = JSON.parse(respEst.getContentText());
      if (datos.length > 0) {
        estId = datos[0].id;
        Logger.log(`      ✅ Estudiante encontrado: ID ${estId}`);
      } else {
        Logger.log(`      ⚠️ No hay estudiantes en BD, usando ID 1 para prueba`);
      }
    }
    
    // Crear pago de prueba
    const payload = {
      p_institucion_id: 1,
      p_estudiante_id: estId,
      p_numero_talonario: `PRUEBA_${Date.now()}`,
      p_monto_total: 1000,
      p_cantidad_conceptos: 1,
      p_metodo_pago: "EFECTIVO",
      p_fecha_cobro: new Date().toISOString().split('T')[0],
      p_descripcion: "Pago de prueba desde auditoría",
      p_detalles: [
        {
          concepto_id: 1,
          monto_original: 1000,
          monto_pagado: 1000
        }
      ]
    };
    
    Logger.log(`   📤 Enviando RPC...`);
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
      {
        method: "post",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    Logger.log(`      Código respuesta: ${resp.getResponseCode()}`);
    Logger.log(`      Response: ${resp.getContentText().substring(0, 200)}`);
    
    if (resp.getResponseCode() === 200) {
      Logger.log(`      ✅ Pago insertado correctamente`);
      resultado.success = true;
    } else {
      resultado.error = resp.getContentText();
      Logger.log(`      ❌ Error: ${resultado.error}`);
    }
    
  } catch (e) {
    Logger.log(`   ❌ Exception: ${e}`);
    resultado.error = e.toString();
  }
  
  return resultado;
}

// ==================== CREAR MENÚ ====================

function onOpenDiagnostico() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('🔧 DIAGNÓSTICO');
    menu.addItem('🔍 Diagnóstico Completo', 'diagnosticoCompleto');
    menu.addItem('📊 Verificar Archivo', 'verificarArchivo');
    menu.addItem('🔗 Verificar Conexión', 'verificarConexionSupabase');
    menu.addItem('📝 Test Pago Prueba', 'insertarPagoPrueba');
    menu.addToUi();
  } catch (e) {
    Logger.log("Menu error: " + e);
  }
}
