// ==================== GOOGLE APPS SCRIPT - FULL AUTO v2.18 FINAL ====================
// ✅ MULTI-INSTITUCIÓN EN MISMO EXCEL
// ✅ DNI autoincrementable ÚNICO POR INSTITUCIÓN (offset)
// ✅ FIX v2.10: doPost llama a ejecutarFullAutoInterno() correctamente
// ✅ FIX v2.13: LOGS DETALLADOS DE SKIPPED Y ERRORES
// ✅ FIX v2.14: SEGUROS expandidos por mes + instId parseado como INT
// ✅ FIX v2.15: BATCH QUERIES - obtenerPagosExistentes, buscarEstudiantes, procesarEstudiantes OPTIMIZADAS
// ✅ FIX v2.16: POST QUERIES - Evita URLs largas con RPC Supabase (sin romper nada)
// ✅ FIX v2.17: METODO + TALONARIO en hojas principales + PAGOS_DETALLES para "DIVIDIDO"
// ✅ FIX v2.18: DNI SOLO SE GENERA SI NO HAY DNI VÁLIDO (fix: .trim() y validación)
// ==================== CONFIGURACIÓN ====================

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const BATCH_SIZE = 10;
const DELAY_MS = 200;
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

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

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
      .addItem('▶️ FULL AUTO MULTI', 'ejecutarFullAutoManual')
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
    Logger.log("🚀 INICIANDO FULL AUTO v2.18 MULTI-INSTITUCIÓN (MANUAL) - CON METODO/TALONARIO + DNI FIX");
    Logger.log("=".repeat(70));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando múltiples instituciones... por favor espera.</p>'),
      '🔄 Sincronización'
    );
    
    const resultado = ejecutarFullAutoInterno();
    
    if (resultado.exito) {
      let resumenFinal = "✅ COMPLETADO MULTI-INSTITUCIÓN\n\n";
      
      for (let instId in resultado.resultadoSync) {
        const sync = resultado.resultadoSync[instId];
        resumenFinal += `📦 INSTITUCIÓN ${instId}:\n`;
        resumenFinal += `   • Estudiantes: ${sync.contadores.estudiantesInsertados}\n`;
        resumenFinal += `   • Inscripciones: ${sync.contadores.pagosInscInsertados} (${sync.contadores.inscripcionesActualizadas} act.)\n`;
        resumenFinal += `   • Cuotas: ${sync.contadores.pagosCuotaInsertados} (${sync.contadores.cuotasActualizadas} act.)\n`;
        resumenFinal += `   • Seguros: ${sync.contadores.pagosSeguroInsertados} (${sync.contadores.segurosActualizados} act.)\n`;
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
    Logger.log("🚀 EJECUTANDO LÓGICA INTERNA v2.18 (METODO + TALONARIO + PAGOS DIVIDIDOS + DNI FIX)");
    Logger.log("=".repeat(70));
    
    Logger.log("\n📋 FASE 1: Normalizando datos...");
    const resultNorm = normalizarExcelMulti();
    
    if (!resultNorm || Object.keys(resultNorm.datosNormalizados).length === 0) {
      return { exito: false, mensaje: "Error en normalización", resultadoSync: {} };
    }
    
    Logger.log(`✅ Instituciones detectadas: ${Object.keys(resultNorm.datosNormalizados).join(", ")}`);
    
    Logger.log("\n🔄 FASE 2: Sincronizando por institución...");
    const resultadoSync = {};
    
    for (let instId in resultNorm.datosNormalizados) {
      const datosInst = resultNorm.datosNormalizados[instId];
      const config = {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_KEY,
        institucionId: instId
      };
      
      Logger.log(`\n   🔄 Sincronizando institución ${instId}...`);
      resultadoSync[instId] = sincronizarDatos(config, datosInst);
    }
    
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarResultadoFinalMulti(resultNorm.hojaSync, resultadoSync);
    
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
    Logger.log("🚀 TRIGGER AUTOMÁTICO - FULL AUTO v2.18 (METODO + TALONARIO + DNI FIX)");
    Logger.log("=".repeat(70));
    
    const resultado = ejecutarFullAutoInterno();
    
    if (resultado.exito) {
      Logger.log("\n✅ TRIGGER COMPLETADO EXITOSAMENTE");
      for (let instId in resultado.resultadoSync) {
        const sync = resultado.resultadoSync[instId];
        Logger.log(`  Institución ${instId}: EST=${sync.contadores.estudiantesInsertados}, INSC=${sync.contadores.pagosInscInsertados}, CUOT=${sync.contadores.pagosCuotaInsertados}, SEG=${sync.contadores.pagosSeguroInsertados}`);
      }
    } else {
      Logger.log("\n❌ TRIGGER FALLÓ: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR EN TRIGGER: " + error.toString());
  }
}

// ==================== NORMALIZACIÓN MULTI-INSTITUCIÓN ====================

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
  
  const fileId = file.getId();
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  const datosNormalizadosPorInst = {};
  
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
    
    const config = obtenerConfiguracionCarrera(instId, carreraId);
    if (!config) {
      Logger.log(`  ⚠️ Sin configuración para carrera ${carreraId}`);
      continue;
    }
    
    procesarHoja(
      hoja,
      carreraId,
      config,
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

function obtenerConfiguracionCarrera(instId, carreraId) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}&carrera_id=eq.${carreraId}`;
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.length > 0) {
        const c = data[0];
        return {
          monto_inscripcion: c.monto_inscripcion,
          monto_cuota: c.monto_cuota,
          monto_seguro: c.monto_seguro
        };
      }
    }
  } catch (e) {
    Logger.log(`Error obteniendo config: ${e}`);
  }
  return null;
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
  if (hoja) {
    Logger.log(`   ℹ️ Hoja existente: ${nombre}`);
  } else {
    hoja = spreadsheet.insertSheet(nombre);
    Logger.log(`   ℹ️ Hoja creada: ${nombre}`);
  }
  return hoja;
}

// ✅ v2.18: FIX - DNI SOLO SE GENERA SI NO HAY DNI VÁLIDO (validación mejorada)
function generarDNISinDuplicados(dniBase, estudiantesMap, instId) {
  // Si hay DNI válido (no vacío, no solo espacios, no "00000000"), devolverlo SIN generar
  if (dniBase && String(dniBase).trim() !== "" && dniBase !== "00000000") {
    return dniBase;
  }
  
  // Solo generar si NO hay DNI o es "00000000"
  const offset = (parseInt(instId) - 1) * 100000;
  let contador = offset;
  let dniGenerado = String(contador).padStart(8, '0');
  
  while (estudiantesMap[dniGenerado]) {
    contador++;
    if (contador >= offset + 100000) {
      Logger.log(`   ❌ ERROR: Se agotaron DNIs para institución ${instId}`);
      return null;
    }
    dniGenerado = String(contador).padStart(8, '0');
  }
  
  Logger.log(`   ⚠️ DNI generado para INST${instId}: ${dniGenerado}`);
  return dniGenerado;
}

// ✅ v2.17: Actualizado para capturar METODO + TALONARIO
function procesarHoja(hoja, carreraId, config, año, instId, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
  
  // Índices para campos básicos
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1;
  
  // Índices para INSCRIPCION + METODO + TALONARIO
  let idxInsc = -1, idxInscMetodo = -1, idxInscTalonario = -1;
  
  // Índices para cada mes: CUOTA/SEGURO + METODO + TALONARIO
  const idxCuota = {}, idxCuotaMetodo = {}, idxCuotaTalonario = {};
  const idxSeguro = {}, idxSeguroMetodo = {}, idxSeguroTalonario = {};
  
  // Mapear headers
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    if (h.includes("ITEM")) idxItem = i;
    else if (h === "APELLIDO") idxApellido = i;
    else if (h === "NOMBRES") idxNombres = i;
    else if (h === "DNI") idxDNI = i;
    else if (h === "TELEFONO") idxTelefono = i;
    else if (h === "INSCRIPCION") idxInsc = i;
    else if (h === "INSCRIPCION" && i > 0 && String(headers[i-1]).toUpperCase().trim() === "INSCRIPCION") {
      // Este es el METODO de INSCRIPCION
      if (String(headers[i]).toUpperCase().trim() === "METODO") idxInscMetodo = i;
    }
    
    // Búsqueda para cada mes
    for (let mes of meses) {
      if (h === `CUOTA ${mes}`) idxCuota[mes] = i;
      if (h === `SEGURO ${mes}`) idxSeguro[mes] = i;
    }
  }
  
  // Búsqueda más precisa para METODO y TALONARIO después de INSCRIPCION
  for (let i = idxInsc + 1; i < idxInsc + 3; i++) {
    if (i < headers.length) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxInscMetodo = i;
      else if (h === "TALONARIO") idxInscTalonario = i;
    }
  }
  
  // Búsqueda para METODO y TALONARIO de CUOTA y SEGURO
  for (let mes of meses) {
    if (idxCuota[mes] !== undefined) {
      for (let i = idxCuota[mes] + 1; i < idxCuota[mes] + 3; i++) {
        if (i < headers.length) {
          const h = String(headers[i]).toUpperCase().trim();
          if (h === "METODO") idxCuotaMetodo[mes] = i;
          else if (h === "TALONARIO") idxCuotaTalonario[mes] = i;
        }
      }
    }
    
    if (idxSeguro[mes] !== undefined) {
      for (let i = idxSeguro[mes] + 1; i < idxSeguro[mes] + 3; i++) {
        if (i < headers.length) {
          const h = String(headers[i]).toUpperCase().trim();
          if (h === "METODO") idxSeguroMetodo[mes] = i;
          else if (h === "TALONARIO") idxSeguroTalonario[mes] = i;
        }
      }
    }
  }
  
  let contOmitidos = 0, contProcesados = 0;
  
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    let dni = generarDNISinDuplicados(dniRaw, estudiantes, instId);
    
    if (!dni) continue;
    
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    
    if (!apellido) {
      contOmitidos++;
      continue;
    }
    
    contProcesados++;
    
    if (!estudiantes[dni]) {
      estudiantes[dni] = {
        item: fila[idxItem] || "",
        dni: dni,
        apellido: apellido,
        nombres: nombre,
        telefono: String(fila[idxTelefono] || "").trim(),
        carrera_id: carreraId,
        estado: "ACTIVO"
      };
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
        fila[idxItem] || "", dni, apellido, nombre, carreraId,
        montoPagadoInsc, montoConfigInsc, montoAdeudado,
        "", metodoInsc, "", talonarioInsc, estado, ""
      ]);
    }
    
    // CUOTAS Y SEGUROS POR MES
    for (let mes of meses) {
      // CUOTA
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
            fila[idxItem] || "", dni, apellido, nombre, carreraId, mesCompleto, año,
            montoPagado, montoConfig, montoAdeudado,
            "", metodoCuota, talonarioCuota, estado, ""
          ]);
        }
      }
      
      // SEGURO
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
            fila[idxItem] || "", dni, apellido, nombre, carreraId,
            mesCompleto, año,
            montoPagado, montoConfig, montoAdeudado,
            "1 cuota", metodoSeguro, talonarioSeguro, estado, ""
          ]);
        }
      }
    }
  }
  
  Logger.log(`   📊 RESUMEN: ${contProcesados} procesados, ${contOmitidos} omitidos`);
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
    hojaEst.getRange(2, 1, estData.length, 7).setValues(estData);
  }
  
  hojaInsc.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "TIPO_TARJETA", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosInscripcion.length; i += 500) {
    const chunk = pagosInscripcion.slice(i, i + 500);
    hojaInsc.getRange(hojaInsc.getLastRow() + 1, 1, chunk.length, 14).setValues(chunk);
  }
  
  hojaCuota.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MES", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosCuota.length; i += 500) {
    const chunk = pagosCuota.slice(i, i + 500);
    hojaCuota.getRange(hojaCuota.getLastRow() + 1, 1, chunk.length, 15).setValues(chunk);
  }
  
  hojaSeguro.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "PERIODO", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "CUOTAS_PAGADAS", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosSeguro.length; i += 500) {
    const chunk = pagosSeguro.slice(i, i + 500);
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
    pagosInscInsertados: 0,
    inscripcionesActualizadas: 0,
    pagosCuotaInsertados: 0,
    cuotasActualizadas: 0,
    pagosSeguroInsertados: 0,
    segurosActualizados: 0,
    ignorados: 0,
    errores: 0,
    pagosSkipped: 0
  };
  
  Logger.log(`   Procesando ${estudiantes.length} estudiantes...`);
  const resEst = procesarEstudiantes(config, estudiantes);
  contadores.estudiantesInsertados = resEst.procesados;
  contadores.errores += resEst.errores;
  Logger.log(`   ✅ Estudiantes: ${contadores.estudiantesInsertados}`);
  if (resEst.errores > 0) Logger.log(`   ❌ Errores en estudiantes: ${resEst.errores}`);
  
  Utilities.sleep(15000);
  
  Logger.log("   Buscando estudiantes en BD...");
  const dniAId = buscarEstudiantes(config, estudiantes);
  Logger.log(`   Encontrados: ${Object.keys(dniAId).length}/${estudiantes.length}`);
  if (Object.keys(dniAId).length < estudiantes.length) {
    Logger.log(`   ⚠️ FALTANTES: ${estudiantes.length - Object.keys(dniAId).length} estudiantes no encontrados`);
  }
  
  if (Object.keys(dniAId).length === 0) {
    return { exito: false, contadores: contadores, fecha: new Date().toISOString() };
  }
  
  const conceptos = cargarConceptos(config);
  
  Logger.log("   Cargando pagos existentes...");
  const pagosExistentes = obtenerPagosExistentes(config, dniAId);
  
  // Cargar PAGOS_DETALLES para manejar "DIVIDIDO"
  const pagosDetalles = obtenerPagosDetalles();
  
  if (pagosInsc.length > 0) {
    Logger.log(`   Procesando ${pagosInsc.length} inscripciones...`);
    const res = procesarPagosConMetodo(config, pagosInsc, "INSCRIPCION", dniAId, conceptos, pagosExistentes, pagosDetalles);
    contadores.pagosInscInsertados = res.insertados;
    contadores.inscripcionesActualizadas = res.actualizados;
    contadores.ignorados += res.ignorados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`   ✅ INSCRIPCIÓN: ${res.insertados} insertados, ${res.actualizados} actualizados, ${res.skipped} skipped, ${res.errores} errores`);
  }
  
  if (pagosCuota.length > 0) {
    Logger.log(`   Procesando ${pagosCuota.length} cuotas...`);
    const res = procesarPagosConMetodo(config, pagosCuota, "CUOTA", dniAId, conceptos, pagosExistentes, pagosDetalles);
    contadores.pagosCuotaInsertados = res.insertados;
    contadores.cuotasActualizadas = res.actualizados;
    contadores.ignorados += res.ignorados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`   ✅ CUOTAS: ${res.insertados} insertados, ${res.actualizados} actualizados, ${res.skipped} skipped, ${res.errores} errores`);
  }
  
  if (pagosSeguro.length > 0) {
    Logger.log(`   Procesando ${pagosSeguro.length} seguros...`);
    const res = procesarPagosConMetodo(config, pagosSeguro, "SEGURO", dniAId, conceptos, pagosExistentes, pagosDetalles);
    contadores.pagosSeguroInsertados = res.insertados;
    contadores.segurosActualizados = res.actualizados;
    contadores.ignorados += res.ignorados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`   ✅ SEGUROS: ${res.insertados} insertados, ${res.actualizados} actualizados, ${res.skipped} skipped, ${res.errores} errores`);
  }
  
  return { exito: contadores.errores === 0, contadores: contadores, fecha: new Date().toISOString() };
}

// ✅ v2.17: Nueva función para obtener PAGOS_DETALLES
function obtenerPagosDetalles() {
  const detalles = {};
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName(PAGOS_DETALLES_SHEET);
    
    if (!hoja) {
      Logger.log(`   ℹ️ Hoja ${PAGOS_DETALLES_SHEET} no encontrada`);
      return detalles;
    }
    
    const lastRow = hoja.getLastRow();
    if (lastRow < 2) {
      Logger.log(`   ℹ️ Hoja ${PAGOS_DETALLES_SHEET} vacía`);
      return detalles;
    }
    
    const datos = hoja.getRange(1, 1, lastRow, 9).getValues();
    const headers = datos[0];
    
    // Mapear índices
    let idxDNI = -1, idxConcepto = -1, idxMes = -1, idxMonto = -1, idxMetodo = -1, idxTalonario = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "DNI") idxDNI = i;
      else if (h === "CONCEPTO") idxConcepto = i;
      else if (h === "MES") idxMes = i;
      else if (h === "MONTO") idxMonto = i;
      else if (h === "METODO_PAGO") idxMetodo = i;
      else if (h === "TALONARIO") idxTalonario = i;
    }
    
    // Cargar datos
    for (let r = 1; r < datos.length; r++) {
      const fila = datos[r];
      const dni = String(fila[idxDNI] || "").trim();
      const concepto = String(fila[idxConcepto] || "").toUpperCase().trim();
      const mes = String(fila[idxMes] || "").trim();
      const monto = parseFloat(fila[idxMonto]) || 0;
      const metodo = String(fila[idxMetodo] || "EFECTIVO").trim();
      const talonario = String(fila[idxTalonario] || "").trim();
      
      if (!dni || !concepto) continue;
      
      const key = `${dni}|${concepto}|${mes}`;
      
      if (!detalles[key]) {
        detalles[key] = [];
      }
      
      detalles[key].push({
        monto: monto,
        metodo: metodo,
        talonario: talonario
      });
    }
    
    Logger.log(`   📋 PAGOS_DETALLES cargados: ${Object.keys(detalles).length} registros`);
    
  } catch (e) {
    Logger.log(`   ⚠️ Error cargando PAGOS_DETALLES: ${e}`);
  }
  
  return detalles;
}

// ✅ v2.17: Nueva función para procesar pagos con METODO/TALONARIO y "DIVIDIDO"
function procesarPagosConMetodo(config, pagosArray, tipo, dniAId, conceptos, pagosExistentes, pagosDetalles) {
  const res = { insertados: 0, actualizados: 0, ignorados: 0, skipped: 0, errores: 0 };
  
  const pagosParaInsertar = [];
  const pagosParaActualizar = [];
  
  for (let pagoArr of pagosArray) {
    try {
      const dni = pagoArr[1];
      const estId = dniAId[dni];
      if (!estId) {
        res.skipped++;
        if (res.skipped <= 3) Logger.log(`     ⚠️ SKIP: DNI ${dni} no encontrado`);
        continue;
      }
      
      const carId = pagoArr[4];
      let conceptoId = null;
      
      // Obtener MES (diferente según tipo)
      let mes = null;
      let mesNum = null;
      
      if (tipo === "INSCRIPCION") {
        conceptoId = conceptos[carId] ? conceptos[carId].inscripcion : null;
      } else if (tipo === "SEGURO") {
        mes = pagoArr[5]; // Mes completo
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        mes = pagoArr[5]; // Mes completo
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].cuotas[mesNum] : null;
      }
      
      if (!conceptoId) {
        res.skipped++;
        continue;
      }
      
      // Obtener METODO y TALONARIO
      let metodo = "";
      let talonario = "";
      
      if (tipo === "INSCRIPCION") {
        metodo = pagoArr[9] || "EFECTIVO";
        talonario = pagoArr[11] || "";
      } else if (tipo === "CUOTA") {
        metodo = pagoArr[11] || "EFECTIVO";
        talonario = pagoArr[12] || "";
      } else if (tipo === "SEGURO") {
        metodo = pagoArr[11] || "EFECTIVO";
        talonario = pagoArr[12] || "";
      }
      
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      
      const montoPagadoNuevo = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
      const montoOriginal = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 6 : (tipo === "SEGURO" ? 8 : 8)]) || montoPagadoNuevo;
      
      if (!montoPagadoNuevo) {
        res.skipped++;
        continue;
      }
      
      // Si METODO es "DIVIDIDO", buscar en PAGOS_DETALLES
      if (metodo === "DIVIDIDO") {
        const key = `${dni}|${tipo}|${mes || ""}`;
        const detalles = pagosDetalles[key] || [];
        
        if (detalles.length === 0) {
          Logger.log(`     ⚠️ DIVIDIDO sin detalles: DNI ${dni}, ${tipo}, MES ${mes}`);
          res.skipped++;
          continue;
        }
        
        // Insertar 1 pago por cada línea en PAGOS_DETALLES
        for (let detalle of detalles) {
          const pagoKey = `${estId}|${conceptoId}`;
          
          const datos = {
            institucion_id: parseInt(config.institucionId),
            estudiante_id: estId,
            concepto_id: conceptoId,
            monto_pagado: detalle.monto,
            monto_original: montoOriginal,
            metodo_pago: detalle.metodo,
            numero_talonario: detalle.talonario,
            estado: "PAGADO",
            fecha_pago: new Date().toISOString().split('T')[0],
            carrera_id: carId
          };
          
          pagosParaInsertar.push(datos);
        }
      } else {
        // METODO directo (no dividido)
        const pagoKey = `${estId}|${conceptoId}`;
        
        if (!pagosExistentes[pagoKey]) {
          const datos = {
            institucion_id: parseInt(config.institucionId),
            estudiante_id: estId,
            concepto_id: conceptoId,
            monto_pagado: montoPagadoNuevo,
            monto_original: montoOriginal,
            metodo_pago: metodo,
            numero_talonario: talonario,
            estado: "PAGADO",
            fecha_pago: new Date().toISOString().split('T')[0],
            carrera_id: carId
          };
          
          pagosParaInsertar.push(datos);
        } else {
          const pagoExistente = pagosExistentes[pagoKey];
          const montoPagadoViejo = pagoExistente.monto_pagado;
          
          if (montoPagadoNuevo > montoPagadoViejo) {
            pagosParaActualizar.push({
              pagoId: pagoExistente.id,
              montoNuevo: montoPagadoNuevo,
              montoViejo: montoPagadoViejo
            });
            res.actualizados++;
          } else {
            res.ignorados++;
          }
        }
      }
      
    } catch (e) {
      res.errores++;
    }
  }
  
  for (let i = 0; i < pagosParaInsertar.length; i += 20) {
    const batch = pagosParaInsertar.slice(i, i + 20);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/pagos`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify(batch),
          muteHttpExceptions: true
        }
      );
      
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.insertados += batch.length;
      } else {
        Logger.log(`     ❌ Error INSERT batch ${i/20}: ${resp.getResponseCode()}`);
        res.errores += batch.length;
      }
    } catch (e) {
      Logger.log(`     ❌ Error INSERT batch ${i/20}: ${e}`);
      res.errores += batch.length;
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  for (let i = 0; i < pagosParaActualizar.length; i += 20) {
    const batch = pagosParaActualizar.slice(i, i + 20);
    
    for (let pago of batch) {
      try {
        const urlUpdate = `${config.supabaseUrl}/rest/v1/pagos?id=eq.${pago.pagoId}`;
        const respUpdate = UrlFetchApp.fetch(urlUpdate, {
          method: "patch",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify({
            monto_pagado: pago.montoNuevo,
            estado: "PAGADO"
          }),
          muteHttpExceptions: true
        });
      } catch (e) {
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return res;
}

// ✅ v2.16: FIXED - POST queries usando RPC Supabase (FUNCIÓN SIN CAMBIOS)
function procesarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  
  Logger.log(`   📝 Procesando ${estudiantes.length} estudiantes (batch POST RPC)...`);
  
  const batchSize = 50;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    
    const dnisBatch = batch.map(function(e) { return e.dni; });
    
    const existentesMap = {};
    try {
      const respBuscar = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey,
            "Content-Type": "application/json" 
          },
          payload: JSON.stringify({ dni_list: dnisBatch }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      if (respBuscar.getResponseCode() === 200) {
        const existentes = JSON.parse(respBuscar.getContentText());
        for (let est of existentes) {
          existentesMap[est.dni] = est.id;
        }
      } else {
        Logger.log(`   ⚠️ Fallback a queries individuales para batch ${Math.floor(i/batchSize)}...`);
        for (let dni of dnisBatch) {
          try {
            const respInd = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(dni)}&select=id,dni`,
              {
                method: "get",
                headers: { "apikey": config.supabaseKey },
                muteHttpExceptions: true,
                timeout: 60
              }
            );
            
            if (respInd.getResponseCode() === 200) {
              const datosInd = JSON.parse(respInd.getContentText());
              if (datosInd && datosInd.length > 0) {
                existentesMap[dni] = datosInd[0].id;
              }
            }
          } catch (e) {
          }
        }
      }
    } catch (e) {
      Logger.log(`   ⚠️ Error búsqueda batch ${Math.floor(i/batchSize)}: ${e}`);
    }
    
    const paraInsertar = [];
    const paraActualizar = [];
    
    for (let est of batch) {
      const datos = {
        institucion_id: parseInt(config.institucionId),
        dni: est.dni.trim(),
        nombre: est.nombres.trim(),
        apellido: est.apellido.trim(),
        telefono: est.telefono ? est.telefono.trim() : null,
        carrera_id: est.carrera_id,
        estado: "ACTIVO",
        fecha_ingreso: new Date().toISOString().split('T')[0]
      };
      
      if (existentesMap[est.dni]) {
        paraActualizar.push({ id: existentesMap[est.dni], datos: datos });
      } else {
        paraInsertar.push(datos);
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
    
    for (let item of paraActualizar) {
      try {
        const respUpdate = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes?id=eq.${item.id}`,
          {
            method: "patch",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(item.datos),
            muteHttpExceptions: true
          }
        );
        
        if (respUpdate.getResponseCode() === 200 || respUpdate.getResponseCode() === 204) {
          res.procesados++;
        } else {
          res.errores++;
        }
      } catch (e) {
        res.errores++;
      }
    }
    
    Utilities.sleep(1000);
  }
  
  return res;
}

// ✅ v2.16: FIXED - POST RPC para búsqueda batch (FUNCIÓN SIN CAMBIOS)
function buscarEstudiantes(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(function(e) { return e.dni; });
  
  Logger.log(`   🔄 Buscando ${dnis.length} estudiantes (batch POST RPC)...`);
  
  const chunkSize = 50;
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey,
            "Content-Type": "application/json" 
          },
          payload: JSON.stringify({ dni_list: chunk }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        
        for (let est of datos) {
          dniAId[est.dni] = est.id;
        }
      } else {
        Logger.log(`   ⚠️ Fallback a queries individuales para chunk ${Math.floor(i/chunkSize)}...`);
        for (let dni of chunk) {
          try {
            const respInd = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(dni)}&select=id,dni`,
              {
                method: "get",
                headers: { "apikey": config.supabaseKey },
                muteHttpExceptions: true,
                timeout: 60
              }
            );
            
            if (respInd.getResponseCode() === 200) {
              const datosInd = JSON.parse(respInd.getContentText());
              if (datosInd && datosInd.length > 0) {
                dniAId[dni] = datosInd[0].id;
              }
            }
          } catch (e) {
          }
        }
      }
      
      Utilities.sleep(300);
    } catch (e) {
      Logger.log(`   ⚠️ Error chunk ${Math.floor(i/chunkSize)}: ${e}`);
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
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      Logger.log(`   📊 Conceptos cargados: ${datos.length} total`);
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

// ✅ v2.16: FIXED - POST RPC para pagos batch (FUNCIÓN SIN CAMBIOS)
function obtenerPagosExistentes(config, dniAId) {
  const pagos = {};
  try {
    const dnis = Object.keys(dniAId);
    const estIds = dnis.map(function(dni) { return dniAId[dni]; });
    
    Logger.log(`   🔍 Cargando pagos para ${estIds.length} estudiantes (batch POST RPC)...`);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_pagos_by_estudiantes`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey,
            "Content-Type": "application/json" 
          },
          payload: JSON.stringify({ est_id_list: estIds }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        
        for (let p of datos) {
          const key = `${p.estudiante_id}|${p.concepto_id}`;
          pagos[key] = {
            id: p.id,
            monto_pagado: p.monto_pagado,
            concepto_id: p.concepto_id,
            estudiante_id: p.estudiante_id,
            estado: p.estado
          };
        }
        
        Logger.log(`   ✅ Encontrados ${Object.keys(pagos).length} pagos existentes (batch POST RPC)`);
      } else {
        Logger.log(`   🔄 Reintentando con query por chunks...`);
        const chunkSize = 10;
        
        for (let i = 0; i < estIds.length; i += chunkSize) {
          const chunk = estIds.slice(i, i + chunkSize);
          
          try {
            const respChunk = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/rpc/search_pagos_by_estudiantes`,
              {
                method: "post",
                headers: { 
                  "apikey": config.supabaseKey,
                  "Content-Type": "application/json" 
                },
                payload: JSON.stringify({ est_id_list: chunk }),
                muteHttpExceptions: true,
                timeout: 60
              }
            );
            
            if (respChunk.getResponseCode() === 200) {
              const datosChunk = JSON.parse(respChunk.getContentText());
              
              for (let p of datosChunk) {
                const key = `${p.estudiante_id}|${p.concepto_id}`;
                pagos[key] = {
                  id: p.id,
                  monto_pagado: p.monto_pagado,
                  concepto_id: p.concepto_id,
                  estudiante_id: p.estudiante_id,
                  estado: p.estado
                };
              }
            }
            
            Utilities.sleep(500);
          } catch (e) {
            Logger.log(`   ⚠️ Error chunk ${Math.floor(i/chunkSize)}: ${e}`);
          }
        }
        
        Logger.log(`   ✅ Encontrados ${Object.keys(pagos).length} pagos existentes (chunks POST)`);
      }
    } catch (e) {
      Logger.log(`   ❌ Error crítico cargando pagos: ${e}`);
    }
    
  } catch (e) {
    Logger.log("   ❌ Error fatal en obtenerPagosExistentes: " + e);
  }
  
  return pagos;
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

function guardarResultadoFinalMulti(hojaSync, resultadoSync) {
  try {
    let logSheet = hojaSync.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = hojaSync.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "INSTITUCIÓN", "ESTADO", "RESUMEN", "ACTUALIZACIONES", "IGNORADOS", "ERRORES", "SKIPPED"]);
    }
    
    for (let instId in resultadoSync) {
      const resultado = resultadoSync[instId];
      const row = [
        new Date().toLocaleString('es-AR'),
        instId,
        resultado.exito ? "✅ OK" : "⚠️ ERRORES",
        `EST:${resultado.contadores.estudiantesInsertados} INSC:${resultado.contadores.pagosInscInsertados} CUOT:${resultado.contadores.pagosCuotaInsertados} SEG:${resultado.contadores.pagosSeguroInsertados}`,
        `INSC:${resultado.contadores.inscripcionesActualizadas} CUOT:${resultado.contadores.cuotasActualizadas} SEG:${resultado.contadores.segurosActualizados}`,
        resultado.contadores.ignorados,
        resultado.contadores.errores,
        resultado.contadores.pagosSkipped
      ];
      
      logSheet.getRange(logSheet.getLastRow() + 1, 1, 1, 8).setValues([row]);
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
        SpreadsheetApp.getUi().alert(`ÚLTIMA: ${ult[0]}\nINST: ${ult[1]}\n${ult[2]}\n${ult[3]}`);
      } else {
        SpreadsheetApp.getUi().alert("No hay logs disponibles");
      }
    }
  } catch (e) {
    Logger.log("Error en mostrarResumenManual: " + e);
  }
}

function mostrarLogsManual() {
  try {
    SpreadsheetApp.getUi().alert("Ver hoja: " + LOG_SHEET_NAME);
  } catch (e) {
    Logger.log("Error en mostrarLogsManual: " + e);
  }
}
