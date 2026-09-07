// GOOGLE APPS SCRIPT - FULL AUTO v3.0 FINAL OPTIMIZADO
// CONFIGURACIÓN

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const SKIPPED_SHEET_NAME = "SKIPPED_DETAILS";
const BATCH_SIZE = 30;
const DELAY_MS = 15;
const MAX_REINTENTOS = 5;
const EXCEL_NORMALIZADO_NOMBRE = "SYNC_NORMALIZADO_MULTI_2026";
const PAGOS_DETALLES_SHEET = "PAGOS_DETALLES";

const MAPEO_HOJAS = {
  "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
  "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
  "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
  "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
  "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
};

let SKIPPED_DETAILS = [];
let GLOBAL_CONFIG = null;  // CACHE DE CONFIG
let CACHE_CONFIG_CARRERAS = {};  // CACHE DE CONFIGURACION_CARRERAS

// ==================== CARGAR CONFIG DESDE SHEET (CON CACHE) ====================

function cargarConfiguracion() {
  if (GLOBAL_CONFIG) {
    return GLOBAL_CONFIG;  // RETORNAR DEL CACHE
  }
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
    
    if (!configSheet) {
      Logger.log("❌ No existe hoja CONFIG");
      return null;
    }
    
    const datos = configSheet.getDataRange().getValues();
    const config = {};
    
    for (let i = 1; i < datos.length; i++) {
      const clave = String(datos[i][0] || "").trim();
      const valor = String(datos[i][1] || "").trim();
      
      if (clave && valor) {
        config[clave] = valor;
      }
    }
    
    // Validar campos requeridos
    if (!config.SUPABASE_URL || config.SUPABASE_URL === "" || config.SUPABASE_URL.includes("xyzabc")) {
      Logger.log("❌ SUPABASE_URL no válida en CONFIG");
      return null;
    }
    
    if (!config.SUPABASE_KEY || config.SUPABASE_KEY === "") {
      Logger.log("❌ SUPABASE_KEY no válida en CONFIG");
      return null;
    }
    
    GLOBAL_CONFIG = config;  // GUARDAR EN CACHE
    Logger.log("✅ Configuración cargada desde sheet CONFIG (en cache)");
    Logger.log(`   URL: ${config.SUPABASE_URL}`);
    
    return config;
    
  } catch (e) {
    Logger.log("❌ Error cargando CONFIG: " + e);
    return null;
  }
}

// ==================== FUNCIÓN HTTP-WRAPPER ====================

function doGet(e) {
  return HtmlService.createHtmlOutput('OK').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    Logger.log("📍 doPost LLAMADO");
    const resultado = ejecutarFullAutoInterno();
    Logger.log("📤 Devolviendo resultado: " + JSON.stringify(resultado).substring(0, 200));
    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*")
      .addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      .addHeader("Access-Control-Allow-Headers", "Content-Type");
  } catch (error) {
    Logger.log("❌ ERROR en doPost: " + error);
    return ContentService
      .createTextOutput(JSON.stringify({ exito: false, mensaje: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .addHeader("Access-Control-Allow-Origin", "*")
      .addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
      .addHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

function doOptions(e) {
  return ContentService.createTextOutput()
    .addHeader("Access-Control-Allow-Origin", "*")
    .addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    .addHeader("Access-Control-Allow-Headers", "Content-Type");
}

// ==================== MENÚ PERSONALIZADO ====================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 SINCRONIZACIÓN')
      .addItem('▶️ FULL AUTO v3.0', 'ejecutarFullAutoManual')
      .addSeparator()
      .addItem('📋 Ver Resumen', 'mostrarResumenManual')
      .addItem('📊 Ver Logs', 'mostrarLogsManual')
      .addToUi();
  } catch (e) {
    Logger.log("onOpen warning (trigger context): " + e);
  }
}

// ==================== FUNCIONES MANUALES (CON UI) ====================

function ejecutarFullAutoManual() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 INICIANDO FULL AUTO v3.0 OPTIMIZADO (MANUAL)");
    Logger.log("=".repeat(70));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando múltiples instituciones... por favor espera.</p>'),
      '🔄 Sincronización'
    );
    
    const resultado = ejecutarFullAutoInterno();
    
    if (resultado.exito) {
      let resumenFinal = "✅ COMPLETADO MULTI-INSTITUCIÓN v3.0 OPTIMIZADO\n\n";
      
      for (let instId in resultado.resultadoSync) {
        const sync = resultado.resultadoSync[instId];
        resumenFinal += `📦 INSTITUCIÓN ${instId}:\n`;
        resumenFinal += `   • Estudiantes: ${sync.contadores.estudiantesInsertados}\n`;
        resumenFinal += `   • Pagos INSERT: ${sync.contadores.pagosInsertados}\n`;
        resumenFinal += `   • Pagos UPDATE: ${sync.contadores.pagosActualizados}\n`;
        resumenFinal += `   • Detalles: ${sync.contadores.detallesInsertados}\n`;
        resumenFinal += `   • Ignorados: ${sync.contadores.ignorados} | Errores: ${sync.contadores.errores}\n\n`;
      }
      
      resumenFinal += `Fecha: ${new Date().toLocaleString('es-AR')}`;
      ui.alert(resumenFinal);
    } else {
      ui.alert("❌ Error: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    try {
      SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
    } catch (e2) {
      Logger.log("No se pudo mostrar alerta");
    }
  }
}

// ==================== FUNCIÓN INTERNA (SIN UI) ====================

function ejecutarFullAutoInterno() {
  try {
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 EJECUTANDO LÓGICA INTERNA v3.0 OPTIMIZADO");
    Logger.log("=".repeat(70));
    
    // LIMPIAR CACHES AL INICIO
    GLOBAL_CONFIG = null;
    CACHE_CONFIG_CARRERAS = {};
    
    // CARGAR CONFIG UNA SOLA VEZ
    const globalConfig = cargarConfiguracion();
    if (!globalConfig) {
      return { exito: false, mensaje: "Error cargando configuración", resultadoSync: {} };
    }
    
    SKIPPED_DETAILS = [];
    
    Logger.log("\n📋 FASE 1: Normalizando datos...");
    const resultNorm = normalizarExcelMulti();
    
    if (!resultNorm || Object.keys(resultNorm.datosNormalizados).length === 0) {
      return { exito: false, mensaje: "Error en normalización", resultadoSync: {} };
    }
    
    Logger.log(`✅ Instituciones detectadas: ${Object.keys(resultNorm.datosNormalizados).join(", ")}`);
    Logger.log(`⚠️ Total de filas SKIPPED: ${SKIPPED_DETAILS.length}`);
    
    Logger.log("\n🔄 FASE 2: Sincronizando por institución...");
    const resultadoSync = {};
    
    for (let instId in resultNorm.datosNormalizados) {
      const datosInst = resultNorm.datosNormalizados[instId];
      const config = {
        supabaseUrl: globalConfig.SUPABASE_URL,
        supabaseKey: globalConfig.SUPABASE_KEY,
        institucionId: instId
      };
      
      Logger.log(`\n   🔄 Sincronizando institución ${instId}...`);
      resultadoSync[instId] = sincronizarDatos(config, datosInst);
    }
    
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarResultadoFinalMulti(resultNorm.hojaSync, resultadoSync);
    
    Logger.log("\n📝 FASE 3b: Guardando detalles de SKIPPED...");
    guardarSkippedDetails(resultNorm.hojaSync);
    
    Logger.log("\n✅ PROCESO COMPLETADO");
    return { exito: true, mensaje: "OK", resultadoSync: resultadoSync };
    
  } catch (error) {
    Logger.log("❌ ERROR INTERNO: " + error);
    return { exito: false, mensaje: error.toString(), resultadoSync: {} };
  }
}

// ==================== FUNCIÓN PARA TRIGGERS AUTOMÁTICOS ====================

function ejecutarFullAutoTrigger() {
  try {
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 TRIGGER AUTOMÁTICO - FULL AUTO v3.0");
    Logger.log("=".repeat(70));
    
    const resultado = ejecutarFullAutoInterno();
    
    if (resultado.exito) {
      Logger.log("\n✅ TRIGGER COMPLETADO EXITOSAMENTE");
      for (let instId in resultado.resultadoSync) {
        const sync = resultado.resultadoSync[instId];
        Logger.log(`  Institución ${instId}: EST=${sync.contadores.estudiantesInsertados}, PM=${sync.contadores.pagosInsertados + sync.contadores.pagosActualizados}, DET=${sync.contadores.detallesInsertados}`);
      }
    } else {
      Logger.log("\n❌ TRIGGER FALLÓ: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR EN TRIGGER: " + error.toString());
  }
}

// ==================== VALIDACIÓN DE DATOS ====================

function validarEstudiante(est, instId) {
  const advertencias = [];
  const datos = { ...est };
  
  if (String(datos.dni).length > 20) {
    advertencias.push(`DNI muy largo (${String(datos.dni).length} chars): "${datos.dni}"`);
    return null;
  }
  
  if (datos.telefono && String(datos.telefono).length > 20) {
    advertencias.push(`TELÉFONO truncado de ${String(datos.telefono).length} a 20 chars`);
    datos.telefono = String(datos.telefono).substring(0, 20);
  }
  
  if (datos.nombres && String(datos.nombres).length > 200) {
    advertencias.push(`NOMBRES truncado`);
    datos.nombres = String(datos.nombres).substring(0, 200);
  }
  
  if (datos.apellido && String(datos.apellido).length > 200) {
    advertencias.push(`APELLIDO truncado`);
    datos.apellido = String(datos.apellido).substring(0, 200);
  }
  
  if (advertencias.length > 0) {
    Logger.log(`   ⚠️ INST${instId} - DNI ${datos.dni}: ${advertencias.join(" | ")}`);
  }
  
  return datos;
}

// ==================== NORMALIZACIÓN MULTI-INSTITUCIÓN (OPTIMIZADA) ====================

function normalizarExcelMulti() {
  Logger.log("🚀 normalizarExcelMulti() iniciado");
  
  Logger.log("Obteniendo archivo Excel...");
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado: " + nombreArchivo);
    return null;
  }
  
  const file = files.next();
  Logger.log("✅ Archivo encontrado");
  
  Logger.log("Buscando/creando Excel normalizado...");
  const spreadsheet = buscarOCrearNormalizadoFijo();
  Logger.log("✅ Excel normalizado OK");
  
  Logger.log("Limpiando hojas normalizadas previas...");
  limpiarHojasNormalizadas(spreadsheet);
  Logger.log("✅ Hojas limpias OK");
  
  const fileId = file.getId();
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  const datosNormalizadosPorInst = {};
  const config = cargarConfiguracion();
  
  // CARGAR CONFIGURACION_CARRERAS PARA TODAS LAS INSTITUCIONES (UNA SOLA VEZ)
  Logger.log("Cargando configuracion_carreras para ambas instituciones...");
  const configCarrerasInst1 = cargarConfiguracionCarrerasUnaVez(config, 1);
  const configCarrerasInst2 = cargarConfiguracionCarrerasUnaVez(config, 2);
  Logger.log("✅ Configuración de carreras cargada");
  
  const hojas = tempSpreadsheet.getSheets();
  Logger.log(`Procesando ${hojas.length} hojas...`);
  
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName();
    
    const mapeo = MAPEO_HOJAS[nombreHoja];
    if (!mapeo) {
      Logger.log(`   ⏭️ Hoja ignorada (no en mapeo): ${nombreHoja}`);
      continue;
    }
    
    const instId = mapeo.institucion_id;
    const carreraId = mapeo.carrera_id;
    
    if (!datosNormalizadosPorInst[instId]) {
      datosNormalizadosPorInst[instId] = {
        estudiantes: {},
        pagosInscripcion: [],
        pagosCuota: [],
        pagosSeguro: [],
        institucion_id: instId
      };
    }
    
    Logger.log(`  Procesando ${nombreHoja} (inst ${instId}, carrera ${carreraId})...`);
    
    const configCarreras = instId === 1 ? configCarrerasInst1 : configCarrerasInst2;
    const configCarrera = configCarreras[carreraId];
    
    if (!configCarrera) {
      Logger.log(`  ⚠️ Sin configuración para carrera ${carreraId}`);
      continue;
    }
    
    procesarHoja(
      hoja,
      nombreHoja,
      carreraId,
      configCarrera,
      2026,
      instId,
      datosNormalizadosPorInst[instId].estudiantes,
      datosNormalizadosPorInst[instId].pagosInscripcion,
      datosNormalizadosPorInst[instId].pagosCuota,
      datosNormalizadosPorInst[instId].pagosSeguro
    );
  }
  
  Logger.log(`✅ Procesamiento OK`);
  
  Logger.log("Actualizando hojas normalizadas...");
  for (let instId in datosNormalizadosPorInst) {
    const datos = datosNormalizadosPorInst[instId];
    
    const hojaEst = obtenerOCrearHoja(spreadsheet, `ESTUDIANTES_INST${instId}`);
    const hojaInsc = obtenerOCrearHoja(spreadsheet, `PAGOS_INSCRIPCION_INST${instId}`);
    const hojaCuota = obtenerOCrearHoja(spreadsheet, `PAGOS_CUOTA_INST${instId}`);
    const hojaSeguro = obtenerOCrearHoja(spreadsheet, `PAGOS_SEGURO_INST${instId}`);
    
    limpiarYLlenarHojas(
      hojaEst, hojaInsc, hojaCuota, hojaSeguro,
      datos.estudiantes,
      datos.pagosInscripcion,
      datos.pagosCuota,
      datos.pagosSeguro
    );
    
    Logger.log(`✅ Hojas de institución ${instId} actualizadas`);
  }
  
  Logger.log("✅ Normalización completada");
  
  const retorno = {
    datosNormalizados: {},
    hojaSync: spreadsheet
  };
  
  for (let instId in datosNormalizadosPorInst) {
    const datos = datosNormalizadosPorInst[instId];
    retorno.datosNormalizados[instId] = {
      estudiantes: Object.values(datos.estudiantes),
      pagosInscripcion: datos.pagosInscripcion,
      pagosCuota: datos.pagosCuota,
      pagosSeguro: datos.pagosSeguro
    };
  }
  
  return retorno;
}

// NUEVO: Cargar config de carreras UNA SOLA VEZ por institución
function cargarConfiguracionCarrerasUnaVez(globalConfig, instId) {
  const cacheKey = `inst_${instId}`;
  
  if (CACHE_CONFIG_CARRERAS[cacheKey]) {
    return CACHE_CONFIG_CARRERAS[cacheKey];
  }
  
  const configuracion = {};
  
  try {
    const resp = UrlFetchApp.fetch(
      `${globalConfig.SUPABASE_URL}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}&select=carrera_id,monto_inscripcion,monto_cuota,monto_seguro`,
      {
        method: "get",
        headers: { "apikey": globalConfig.SUPABASE_KEY },
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        configuracion[c.carrera_id] = {
          monto_inscripcion: c.monto_inscripcion,
          monto_cuota: c.monto_cuota,
          monto_seguro: c.monto_seguro
        };
      }
      Logger.log(`   📊 Config carreras INST${instId}: ${datos.length} registros cargados`);
    }
  } catch (e) {
    Logger.log(`   ❌ Error cargando config INST${instId}: ${e}`);
  }
  
  CACHE_CONFIG_CARRERAS[cacheKey] = configuracion;
  return configuracion;
}

function buscarOCrearNormalizadoFijo() {
  try {
    const files = DriveApp.getFilesByName(EXCEL_NORMALIZADO_NOMBRE);
    if (files.hasNext()) {
      const fileId = files.next().getId();
      Logger.log(`   ℹ️ Excel normalizado existente: ${EXCEL_NORMALIZADO_NOMBRE}`);
      return SpreadsheetApp.openById(fileId);
    }
  } catch (e) {
    Logger.log("Nota: " + e.toString());
  }
  
  Logger.log(`   ℹ️ Creando Excel normalizado: ${EXCEL_NORMALIZADO_NOMBRE}`);
  const spreadsheet = SpreadsheetApp.create(EXCEL_NORMALIZADO_NOMBRE);
  const ss = spreadsheet.getActiveSheet();
  ss.setName("CONFIG");
  
  return spreadsheet;
}

function obtenerOCrearHoja(spreadsheet, nombre) {
  let hoja = spreadsheet.getSheetByName(nombre);
  if (!hoja) {
    hoja = spreadsheet.insertSheet(nombre);
  }
  return hoja;
}

function limpiarHojasNormalizadas(spreadsheet) {
  try {
    const hojas = spreadsheet.getSheets();
    const hojasALimpiar = [];
    
    for (let i = 0; i < hojas.length; i++) {
      const nombreHoja = hojas[i].getName();
      
      if (nombreHoja.startsWith("ESTUDIANTES_INST") || 
          nombreHoja.startsWith("PAGOS_INSCRIPCION_INST") ||
          nombreHoja.startsWith("PAGOS_CUOTA_INST") ||
          nombreHoja.startsWith("PAGOS_SEGURO_INST")) {
        hojasALimpiar.push(hojas[i]);
      }
    }
    
    Logger.log(`   Limpiando ${hojasALimpiar.length} hojas de datos...`);
    
    for (let hoja of hojasALimpiar) {
      hoja.clearContents();
    }
    
  } catch (e) {
    Logger.log(`   ⚠️ Error limpiando hojas: ${e}`);
  }
}

function generarDNISinDuplicados(dniBase, estudiantesMap, instId) {
  if (!dniBase || String(dniBase).trim() === "" || String(dniBase) === "00000000") {
    Logger.log(`   ⚠️ DNI RECHAZADO para INST${instId}: VACÍO`);
    return null;
  }
  
  if (String(dniBase).trim() !== "" && dniBase !== "00000000") {
    return dniBase;
  }
  
  return null;
}

function procesarHoja(hoja, nombreHoja, carreraId, config, año, instId, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
  
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1;
  let idxInsc = -1, idxInscMetodo = -1, idxInscTalonario = -1;
  
  const idxCuota = {}, idxCuotaMetodo = {}, idxCuotaTalonario = {};
  const idxSeguro = {}, idxSeguroMetodo = {}, idxSeguroTalonario = {};
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    if (h.includes("ITEM")) idxItem = i;
    else if (h === "APELLIDO") idxApellido = i;
    else if (h === "NOMBRES") idxNombres = i;
    else if (h === "DNI") idxDNI = i;
    else if (h === "TELEFONO") idxTelefono = i;
    else if (h === "INSCRIPCION") idxInsc = i;
    
    for (let mes of meses) {
      if (h === `CUOTA ${mes}`) idxCuota[mes] = i;
      if (h === `SEGURO ${mes}`) idxSeguro[mes] = i;
    }
  }
  
  for (let i = idxInsc + 1; i < idxInsc + 3 && i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    if (h === "METODO") idxInscMetodo = i;
    else if (h === "TALONARIO") idxInscTalonario = i;
  }
  
  for (let mes of meses) {
    if (idxCuota[mes] !== undefined) {
      for (let i = idxCuota[mes] + 1; i < idxCuota[mes] + 3 && i < headers.length; i++) {
        const h = String(headers[i]).toUpperCase().trim();
        if (h === "METODO") idxCuotaMetodo[mes] = i;
        else if (h === "TALONARIO") idxCuotaTalonario[mes] = i;
      }
    }
    
    if (idxSeguro[mes] !== undefined) {
      for (let i = idxSeguro[mes] + 1; i < idxSeguro[mes] + 3 && i < headers.length; i++) {
        const h = String(headers[i]).toUpperCase().trim();
        if (h === "METODO") idxSeguroMetodo[mes] = i;
        else if (h === "TALONARIO") idxSeguroTalonario[mes] = i;
      }
    }
  }
  
  let contOmitidos = 0, contProcesados = 0;
  
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    const numeroFila = r + 1;
    
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    let dni = generarDNISinDuplicados(dniRaw, estudiantes, instId);
    
    if (!dni) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: String(fila[idxApellido] || "").trim(),
        nombres: String(fila[idxNombres] || "").trim(),
        motivo: "DNI VACÍO"
      });
      contOmitidos++;
      continue;
    }
    
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    
    if (!apellido) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dni,
        apellido: "(VACÍO)",
        nombres: nombre,
        motivo: "APELLIDO VACÍO"
      });
      contOmitidos++;
      continue;
    }
    
    const estData = {
      item: fila[idxItem] || "",
      dni: dni,
      apellido: apellido,
      nombres: nombre,
      telefono: String(fila[idxTelefono] || "").trim(),
      carrera_id: carreraId,
      estado: "ACTIVO"
    };
    
    const estValidado = validarEstudiante(estData, instId);
    if (!estValidado) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: estData.dni,
        apellido: estData.apellido,
        nombres: estData.nombres,
        motivo: "VALIDACIÓN FALLIDA"
      });
      contOmitidos++;
      continue;
    }
    
    contProcesados++;
    
    if (!estudiantes[estValidado.dni]) {
      estudiantes[estValidado.dni] = estValidado;
    }
    
    // INSCRIPCION
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      const montoConfigInsc = config.monto_inscripcion;
      const montoAdeudado = Math.max(0, montoConfigInsc - montoPagadoInsc);
      const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
      const metodoInsc = String(fila[idxInscMetodo] || "EFECTIVO").trim();
      const talonarioInsc = String(fila[idxInscTalonario] || "").trim();
      
      pagosInscripcion.push([
        fila[idxItem] || "", estValidado.dni, apellido, nombre, carreraId,
        montoPagadoInsc, montoConfigInsc, montoAdeudado,
        "", metodoInsc, "", talonarioInsc, estado, ""
      ]);
    }
    
    // CUOTAS Y SEGUROS
    for (let mes of meses) {
      if (idxCuota[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
        if (montoPagado > 0) {
          const montoConfig = config.monto_cuota;
          const montoAdeudado = Math.max(0, montoConfig - montoPagado);
          const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
          const metodoCuota = String(fila[idxCuotaMetodo[mes]] || "EFECTIVO").trim();
          const talonarioCuota = String(fila[idxCuotaTalonario[mes]] || "").trim();
          
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          
          pagosCuota.push([
            fila[idxItem] || "", estValidado.dni, apellido, nombre, carreraId, mesCompleto, año,
            montoPagado, montoConfig, montoAdeudado,
            "", metodoCuota, talonarioCuota, estado, ""
          ]);
        }
      }
      
      if (idxSeguro[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
        if (montoPagado > 0) {
          const montoConfig = config.monto_seguro;
          const montoAdeudado = Math.max(0, montoConfig - montoPagado);
          const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
          const metodoSeguro = String(fila[idxSeguroMetodo[mes]] || "EFECTIVO").trim();
          const talonarioSeguro = String(fila[idxSeguroTalonario[mes]] || "").trim();
          
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          
          pagosSeguro.push([
            fila[idxItem] || "", estValidado.dni, apellido, nombre, carreraId,
            mesCompleto, año,
            montoPagado, montoConfig, montoAdeudado,
            "1 cuota", metodoSeguro, talonarioSeguro, estado, ""
          ]);
        }
      }
    }
  }
  
  Logger.log(`   📊 ${contProcesados} procesados, ${contOmitidos} omitidos`);
}

function limpiarYLlenarHojas(hojaEst, hojaInsc, hojaCuota, hojaSeguro, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  hojaEst.clearContents();
  hojaInsc.clearContents();
  hojaCuota.clearContents();
  hojaSeguro.clearContents();
  
  hojaEst.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "TELEFONO", "CARRERA_ID", "ESTADO"]);
  const estData = [];
  for (let dni in estudiantes) {
    const e = estudiantes[dni];
    estData.push([e.item, e.dni, e.apellido, e.nombres, e.telefono, e.carrera_id, e.estado]);
  }
  if (estData.length > 0) {
    for (let i = 0; i < estData.length; i += 1000) {
      const chunk = estData.slice(i, i + 1000);
      hojaEst.getRange(hojaEst.getLastRow() + 1, 1, chunk.length, 7).setValues(chunk);
    }
  }
  
  hojaInsc.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "TIPO_TARJETA", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosInscripcion.length; i += 1000) {
    const chunk = pagosInscripcion.slice(i, i + 1000);
    hojaInsc.getRange(hojaInsc.getLastRow() + 1, 1, chunk.length, 14).setValues(chunk);
  }
  
  hojaCuota.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MES", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosCuota.length; i += 1000) {
    const chunk = pagosCuota.slice(i, i + 1000);
    hojaCuota.getRange(hojaCuota.getLastRow() + 1, 1, chunk.length, 15).setValues(chunk);
  }
  
  hojaSeguro.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "PERIODO", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "CUOTAS_PAGADAS", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosSeguro.length; i += 1000) {
    const chunk = pagosSeguro.slice(i, i + 1000);
    hojaSeguro.getRange(hojaSeguro.getLastRow() + 1, 1, chunk.length, 15).setValues(chunk);
  }
}

// ==================== SINCRONIZACIÓN ====================

function sincronizarDatos(config, datosNormalizados) {
  const estudiantes = datosNormalizados.estudiantes;
  const pagosInsc = datosNormalizados.pagosInscripcion;
  const pagosCuota = datosNormalizados.pagosCuota;
  const pagosSeguro = datosNormalizados.pagosSeguro;
  
  let contadores = {
    estudiantesInsertados: 0,
    pagosInsertados: 0,
    pagosActualizados: 0,
    detallesInsertados: 0,
    ignorados: 0,
    errores: 0
  };
  
  Logger.log(`   Procesando ${estudiantes.length} estudiantes...`);
  const resEst = procesarEstudiantes(config, estudiantes);
  contadores.estudiantesInsertados = resEst.procesados;
  contadores.errores += resEst.errores;
  Logger.log(`   ✅ Estudiantes: ${contadores.estudiantesInsertados}`);
  
  Utilities.sleep(10000);
  
  Logger.log("   Buscando estudiantes en BD...");
  const dniAId = buscarEstudiantes(config, estudiantes);
  Logger.log(`   Encontrados: ${Object.keys(dniAId).length}/${estudiantes.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    return { exito: false, contadores: contadores, fecha: new Date().toISOString() };
  }
  
  const conceptos = cargarConceptos(config);
  
  if (pagosInsc.length > 0) {
    Logger.log(`   Procesando ${pagosInsc.length} inscripciones...`);
    const res = procesarPagosV3Optimizado(config, pagosInsc, "INSCRIPCION", dniAId, conceptos);
    contadores.pagosInsertados += res.pagosInsertados;
    contadores.pagosActualizados += res.pagosActualizados;
    contadores.detallesInsertados += res.detalles;
    contadores.ignorados += res.ignorados;
    contadores.errores += res.errores;
    Logger.log(`   ✅ INSCRIPCIÓN: ${res.pagosInsertados} INSERT, ${res.pagosActualizados} UPDATE`);
  }
  
  if (pagosCuota.length > 0) {
    Logger.log(`   Procesando ${pagosCuota.length} cuotas...`);
    const res = procesarPagosV3Optimizado(config, pagosCuota, "CUOTA", dniAId, conceptos);
    contadores.pagosInsertados += res.pagosInsertados;
    contadores.pagosActualizados += res.pagosActualizados;
    contadores.detallesInsertados += res.detalles;
    contadores.ignorados += res.ignorados;
    contadores.errores += res.errores;
    Logger.log(`   ✅ CUOTAS: ${res.pagosInsertados} INSERT, ${res.pagosActualizados} UPDATE`);
  }
  
  if (pagosSeguro.length > 0) {
    Logger.log(`   Procesando ${pagosSeguro.length} seguros...`);
    const res = procesarPagosV3Optimizado(config, pagosSeguro, "SEGURO", dniAId, conceptos);
    contadores.pagosInsertados += res.pagosInsertados;
    contadores.pagosActualizados += res.pagosActualizados;
    contadores.detallesInsertados += res.detalles;
    contadores.ignorados += res.ignorados;
    contadores.errores += res.errores;
    Logger.log(`   ✅ SEGUROS: ${res.pagosInsertados} INSERT, ${res.pagosActualizados} UPDATE`);
  }
  
  return { exito: contadores.errores === 0, contadores: contadores, fecha: new Date().toISOString() };
}

// ✅ v3.0 OPTIMIZADO: UPSERT + Batches de 30 + RCP única
function procesarPagosV3Optimizado(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { pagosInsertados: 0, pagosActualizados: 0, detalles: 0, ignorados: 0, errores: 0 };
  const pagosParaProcesar = [];
  const agrupados = {};
  
  const timestamp = Math.floor(Date.now() / 1000);
  let talonarioCounter = 0;
  
  // CARGAR CONFIG CARRERAS DESDE CACHE
  const cacheKey = `inst_${config.institucionId}`;
  const configCarreras = CACHE_CONFIG_CARRERAS[cacheKey] || {};
  
  for (let pagoArr of pagosArray) {
    try {
      const dni = pagoArr[1];
      const estId = dniAId[dni];
      if (!estId) {
        res.ignorados++;
        continue;
      }
      
      const carId = pagoArr[4];
      let conceptoId = null;
      let mesNum = null;
      
      if (tipo === "INSCRIPCION") {
        conceptoId = conceptos[carId] ? conceptos[carId].inscripcion : null;
      } else if (tipo === "SEGURO") {
        mesNum = convertirMesANumero(pagoArr[5]);
        conceptoId = conceptos[carId] ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        mesNum = convertirMesANumero(pagoArr[5]);
        conceptoId = conceptos[carId] ? conceptos[carId].cuotas[mesNum] : null;
      }
      
      if (!conceptoId) {
        res.ignorados++;
        continue;
      }
      
      let metodo = pagoArr[tipo === "INSCRIPCION" ? 9 : 11] || "EFECTIVO";
      let talonario = pagoArr[tipo === "INSCRIPCION" ? 11 : 12] || "";
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      if (!talonario) {
        talonarioCounter++;
        talonario = `AUTO_${timestamp}_${String(talonarioCounter).padStart(6, '0')}`;
      }
      
      const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : 7]) || 0;
      if (!montoPagado) {
        res.ignorados++;
        continue;
      }
      
      const montoOriginal = obtenerMontoOriginal(configCarreras, parseInt(carId), tipo);
      if (!montoOriginal) {
        res.ignorados++;
        continue;
      }
      
      const key = `${estId}|${conceptoId}`;
      if (!agrupados[key]) {
        agrupados[key] = { 
          estId: estId, 
          carId: carId, 
          conceptoId: conceptoId,
          tipo: tipo, 
          metodo: metodo, 
          talonario: talonario, 
          montoPagado: 0,
          montoOriginal: montoOriginal,
          detalles: []
        };
      }
      
      agrupados[key].montoPagado += montoPagado;
      agrupados[key].detalles.push({ 
        concepto_id: conceptoId, 
        monto_original: montoOriginal,
        monto_pagado: montoPagado
      });
      
    } catch (e) {
      res.errores++;
    }
  }
  
  const hoy = new Date().toISOString().split('T')[0];
  
  for (let key in agrupados) {
    const pago = agrupados[key];
    
    pagosParaProcesar.push({
      p_institucion_id: parseInt(config.institucionId),
      p_estudiante_id: pago.estId,
      p_numero_talonario: pago.talonario,
      p_monto_total: pago.montoPagado,
      p_cantidad_conceptos: pago.detalles.length,
      p_metodo_pago: pago.metodo,
      p_fecha_cobro: hoy,
      p_descripcion: `${tipo} - ${pago.detalles.length} concepto(s)`,
      p_detalles: pago.detalles
    });
  }
  
  if (pagosParaProcesar.length === 0) return res;
  
  Logger.log(`   📤 Enviando ${pagosParaProcesar.length} RPC (batches de ${BATCH_SIZE})`);
  
  // BATCHES DE 30
  for (let i = 0; i < pagosParaProcesar.length; i += BATCH_SIZE) {
    const batch = pagosParaProcesar.slice(i, i + BATCH_SIZE);
    
    for (let pago of batch) {
      try {
        const resp = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(pago),
            muteHttpExceptions: true,
            timeout: 45
          }
        );
        
        if (resp.getResponseCode() === 200) {
          const result = JSON.parse(resp.getContentText());
          if (result && result.length > 0) {
            const row = result[0];
            if (row.accion === "insertado") res.pagosInsertados++;
            else if (row.accion === "actualizado") res.pagosActualizados++;
            res.detalles += (row.detalles_insertados || 0);
          }
        } else {
          res.errores++;
        }
      } catch (e) {
        res.errores++;
      }
      
      Utilities.sleep(DELAY_MS);
    }
  }
  
  Logger.log(`   ✅ ${tipo}: ${res.pagosInsertados} INSERT + ${res.pagosActualizados} UPDATE + ${res.detalles} det`);
  
  return res;
}

function obtenerMontoOriginal(configCarreras, carreraId, tipo) {
  if (!configCarreras[carreraId]) return null;
  
  const config = configCarreras[carreraId];
  
  if (tipo === "INSCRIPCION") return config.monto_inscripcion;
  if (tipo === "CUOTA") return config.monto_cuota;
  if (tipo === "SEGURO") return config.monto_seguro;
  
  return null;
}

function procesarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  const batchSize = 100;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    const dnisBatch = batch.map(function(e) { return e.dni; });
    
    const existentesMap = {};
    try {
      const respBuscar = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify({ dni_list: dnisBatch }),
          muteHttpExceptions: true,
          timeout: 45
        }
      );
      
      if (respBuscar.getResponseCode() === 200) {
        const existentes = JSON.parse(respBuscar.getContentText());
        for (let est of existentes) {
          existentesMap[est.dni] = est.id;
        }
      }
    } catch (e) {
      Logger.log(`   ⚠️ Error batch: ${e}`);
    }
    
    const paraInsertar = [];
    
    for (let est of batch) {
      if (!existentesMap[est.dni]) {
        paraInsertar.push({
          institucion_id: parseInt(config.institucionId),
          dni: est.dni.trim(),
          nombre: est.nombres.trim(),
          apellido: est.apellido.trim(),
          telefono: est.telefono ? est.telefono.trim() : null,
          carrera_id: est.carrera_id,
          estado: "ACTIVO",
          fecha_ingreso: new Date().toISOString().split('T')[0]
        });
      } else {
        res.procesados++;
      }
    }
    
    if (paraInsertar.length > 0) {
      try {
        const respInsert = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(paraInsertar),
            muteHttpExceptions: true
          }
        );
        
        if (respInsert.getResponseCode() === 201 || respInsert.getResponseCode() === 200) {
          res.procesados += paraInsertar.length;
        } else {
          res.errores += paraInsertar.length;
        }
      } catch (e) {
        res.errores += paraInsertar.length;
      }
    }
    
    Utilities.sleep(500);
  }
  
  return res;
}

function buscarEstudiantes(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(function(e) { return e.dni; });
  const chunkSize = 100;
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify({ dni_list: chunk }),
          muteHttpExceptions: true,
          timeout: 45
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        for (let est of datos) {
          dniAId[est.dni] = est.id;
        }
      }
      
      Utilities.sleep(200);
    } catch (e) {
      Logger.log(`   ⚠️ Error chunk: ${e}`);
    }
  }
  
  return dniAId;
}

function cargarConceptos(config) {
  const conceptos = {};
  
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=id,tipo,mes,carrera_id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        const car = c.carrera_id;
        if (!conceptos[car]) {
          conceptos[car] = { inscripcion: null, seguros: {}, cuotas: {} };
        }
        if (c.tipo === "INSCRIPCION") conceptos[car].inscripcion = c.id;
        else if (c.tipo === "SEGURO" && c.mes) conceptos[car].seguros[c.mes] = c.id;
        else if (c.tipo === "CUOTA" && c.mes) conceptos[car].cuotas[c.mes] = c.id;
      }
    }
  } catch (e) {
    Logger.log(`   ❌ Error cargando conceptos: ${e}`);
  }
  
  return conceptos;
}

function convertirMesANumero(mesDato) {
  if (!mesDato) return null;
  const m = mesDato.toString().trim().toUpperCase();
  const meses = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
    "SEPT": 9, "SEP": 9, "NOV": 11, "DIC": 12,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12
  };
  return meses[m] || null;
}

function guardarSkippedDetails(spreadsheet) {
  try {
    if (SKIPPED_DETAILS.length === 0) return;
    
    let hojaSkipped = spreadsheet.getSheetByName(SKIPPED_SHEET_NAME);
    if (!hojaSkipped) {
      hojaSkipped = spreadsheet.insertSheet(SKIPPED_SHEET_NAME);
    } else {
      hojaSkipped.clearContents();
    }
    
    hojaSkipped.appendRow(["HOJA_ORIGEN", "NUMERO_FILA", "DNI", "APELLIDO", "NOMBRES", "MOTIVO"]);
    
    const filasSkipped = [];
    for (let detail of SKIPPED_DETAILS) {
      filasSkipped.push([detail.hoja, detail.fila, detail.dni, detail.apellido, detail.nombres, detail.motivo]);
    }
    
    if (filasSkipped.length > 0) {
      for (let i = 0; i < filasSkipped.length; i += 1000) {
        const chunk = filasSkipped.slice(i, i + 1000);
        hojaSkipped.getRange(hojaSkipped.getLastRow() + 1, 1, chunk.length, 6).setValues(chunk);
      }
    }
    
    Logger.log(`   ✅ SKIPPED: ${SKIPPED_DETAILS.length}`);
  } catch (e) {
    Logger.log(`   ⚠️ Error guardando SKIPPED: ${e}`);
  }
}

function guardarResultadoFinalMulti(hojaSync, resultadoSync) {
  try {
    let logSheet = hojaSync.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = hojaSync.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "INSTITUCIÓN", "ESTADO", "EST", "INS", "UPD", "DET", "IGN", "ERR"]);
    }
    
    for (let instId in resultadoSync) {
      const resultado = resultadoSync[instId];
      const row = [
        new Date().toLocaleString('es-AR'),
        instId,
        resultado.exito ? "✅ OK" : "⚠️",
        resultado.contadores.estudiantesInsertados,
        resultado.contadores.pagosInsertados,
        resultado.contadores.pagosActualizados,
        resultado.contadores.detallesInsertados,
        resultado.contadores.ignorados,
        resultado.contadores.errores
      ];
      
      logSheet.getRange(logSheet.getLastRow() + 1, 1, 1, 9).setValues([row]);
    }
    
    Logger.log("✅ Logs guardados");
  } catch (e) {
    Logger.log("⚠️ Error guardando logs: " + e);
  }
}

function mostrarResumenManual() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (logSheet) {
      const data = logSheet.getDataRange().getValues();
      if (data.length > 1) {
        const ult = data[data.length - 1];
        SpreadsheetApp.getUi().alert(`ÚLTIMA: ${ult[0]}\nINST: ${ult[1]} ${ult[2]}\nPAGOS: ${ult[4]}+${ult[5]}\nDETALLES: ${ult[6]}`);
      }
    }
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function mostrarLogsManual() {
  try {
    SpreadsheetApp.getUi().alert("Ver hoja: " + LOG_SHEET_NAME);
  } catch (e) {}
}
