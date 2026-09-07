const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const SKIPPED_SHEET_NAME = "SKIPPED_DETAILS";
const BATCH_SIZE = 10;
const DELAY_MS = 200;
const MAX_REINTENTOS = 5;
const EXCEL_NORMALIZADO_NOMBRE = "SYNC_NORMALIZADO_MULTI_2026";

const MAPEO_HOJAS = {
  "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
  "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
  "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
  "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
  "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
};

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

let SKIPPED_DETAILS = [];

function doGet(e) {
  return HtmlService.createHtmlOutput('OK').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    Logger.log("📍 doPost");
    const resultado = ejecutarFullAutoInterno();
    return ContentService.createTextOutput(JSON.stringify(resultado)).setMimeType(ContentService.MimeType.JSON).addHeader("Access-Control-Allow-Origin", "*");
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ exito: false, mensaje: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput().addHeader("Access-Control-Allow-Origin", "*").addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS").addHeader("Access-Control-Allow-Headers", "Content-Type");
}

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 SINCRONIZACIÓN').addItem('▶️ FULL AUTO v3.0', 'ejecutarFullAutoManual').addSeparator().addItem('📋 Ver Resumen', 'mostrarResumenManual').addItem('📊 Ver Logs', 'mostrarLogsManual').addToUi();
  } catch (e) {}
}

function ejecutarFullAutoManual() {
  try {
    const ui = SpreadsheetApp.getUi();
    Logger.log("🚀 FULL AUTO v3.0 MANUAL");
    ui.showModelessDialog(HtmlService.createHtmlOutput('<p>⏳ Procesando...</p>'), '🔄 Sincronización');
    const resultado = ejecutarFullAutoInterno();
    if (resultado.exito) {
      let msg = "✅ COMPLETADO v3.0\n\n";
      for (let instId in resultado.resultadoSync) {
        const sync = resultado.resultadoSync[instId];
        msg += `📦 INST ${instId}: EST=${sync.contadores.estudiantesInsertados}, PM=${sync.contadores.pagosMultiplesInsertados}, DET=${sync.contadores.detallesInsertados}\n`;
      }
      ui.alert(msg);
    } else {
      ui.alert("❌ Error: " + resultado.mensaje);
    }
  } catch (error) {
    Logger.log("❌ " + error);
    SpreadsheetApp.getUi().alert("❌ " + error.toString());
  }
}

function ejecutarFullAutoInterno() {
  try {
    Logger.log("🚀 LÓGICA INTERNA v3.0");
    SKIPPED_DETAILS = [];
    
    const resultNorm = normalizarExcelMulti();
    if (!resultNorm) return { exito: false, mensaje: "Error normalización", resultadoSync: {} };
    
    const resultadoSync = {};
    for (let instId in resultNorm.datosNormalizados) {
      const config = { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_KEY, institucionId: instId };
      resultadoSync[instId] = sincronizarDatos(config, resultNorm.datosNormalizados[instId]);
    }
    
    guardarResultadoFinalMulti(resultNorm.hojaSync, resultadoSync);
    guardarSkippedDetails(resultNorm.hojaSync);
    
    Logger.log("✅ COMPLETADO");
    return { exito: true, mensaje: "OK", resultadoSync: resultadoSync };
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    return { exito: false, mensaje: error.toString(), resultadoSync: {} };
  }
}

function validarEstudiante(est, instId) {
  if (String(est.dni).length > 20) return null;
  if (est.telefono && String(est.telefono).length > 20) est.telefono = String(est.telefono).substring(0, 20);
  if (est.nombres && String(est.nombres).length > 200) est.nombres = String(est.nombres).substring(0, 200);
  if (est.apellido && String(est.apellido).length > 200) est.apellido = String(est.apellido).substring(0, 200);
  return est;
}

function normalizarExcelMulti() {
  Logger.log("📚 normalizarExcelMulti");
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  if (!files.hasNext()) return null;
  
  const file = files.next();
  const spreadsheet = buscarOCrearNormalizadoFijo();
  limpiarHojasNormalizadas(spreadsheet);
  
  const tempSpreadsheet = SpreadsheetApp.openById(file.getId());
  const datosNormalizadosPorInst = {};
  
  const hojas = tempSpreadsheet.getSheets();
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName();
    const mapeo = MAPEO_HOJAS[nombreHoja];
    if (!mapeo) continue;
    
    const instId = mapeo.institucion_id;
    const carreraId = mapeo.carrera_id;
    
    if (!datosNormalizadosPorInst[instId]) {
      datosNormalizadosPorInst[instId] = { estudiantes: {}, pagosInscripcion: [], pagosCuota: [], pagosSeguro: [], institucion_id: instId };
    }
    
    const config = obtenerConfiguracionCarrera(instId, carreraId);
    if (!config) continue;
    
    procesarHoja(hoja, nombreHoja, carreraId, config, 2026, instId, datosNormalizadosPorInst[instId].estudiantes, datosNormalizadosPorInst[instId].pagosInscripcion, datosNormalizadosPorInst[instId].pagosCuota, datosNormalizadosPorInst[instId].pagosSeguro);
  }
  
  for (let instId in datosNormalizadosPorInst) {
    const datos = datosNormalizadosPorInst[instId];
    const hojaEst = obtenerOCrearHoja(spreadsheet, `ESTUDIANTES_INST${instId}`);
    const hojaInsc = obtenerOCrearHoja(spreadsheet, `PAGOS_INSCRIPCION_INST${instId}`);
    const hojaCuota = obtenerOCrearHoja(spreadsheet, `PAGOS_CUOTA_INST${instId}`);
    const hojaSeguro = obtenerOCrearHoja(spreadsheet, `PAGOS_SEGURO_INST${instId}`);
    limpiarYLlenarHojas(hojaEst, hojaInsc, hojaCuota, hojaSeguro, datos.estudiantes, datos.pagosInscripcion, datos.pagosCuota, datos.pagosSeguro);
  }
  
  const retorno = { datosNormalizados: {}, hojaSync: spreadsheet };
  for (let instId in datosNormalizadosPorInst) {
    const datos = datosNormalizadosPorInst[instId];
    retorno.datosNormalizados[instId] = { estudiantes: Object.values(datos.estudiantes), pagosInscripcion: datos.pagosInscripcion, pagosCuota: datos.pagosCuota, pagosSeguro: datos.pagosSeguro };
  }
  return retorno;
}

function obtenerConfiguracionCarrera(instId, carreraId) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}&carrera_id=eq.${carreraId}`;
    const response = UrlFetchApp.fetch(url, { method: "get", headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" }, muteHttpExceptions: true });
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.length > 0) {
        const c = data[0];
        return { monto_inscripcion: c.monto_inscripcion, monto_cuota: c.monto_cuota, monto_seguro: c.monto_seguro };
      }
    }
  } catch (e) {}
  return null;
}

function buscarOCrearNormalizadoFijo() {
  try {
    const files = DriveApp.getFilesByName(EXCEL_NORMALIZADO_NOMBRE);
    if (files.hasNext()) return SpreadsheetApp.openById(files.next().getId());
  } catch (e) {}
  const spreadsheet = SpreadsheetApp.create(EXCEL_NORMALIZADO_NOMBRE);
  spreadsheet.getActiveSheet().setName("CONFIG");
  return spreadsheet;
}

function obtenerOCrearHoja(spreadsheet, nombre) {
  let hoja = spreadsheet.getSheetByName(nombre);
  if (!hoja) hoja = spreadsheet.insertSheet(nombre);
  return hoja;
}

function limpiarHojasNormalizadas(spreadsheet) {
  const hojas = spreadsheet.getSheets();
  for (let i = 0; i < hojas.length; i++) {
    const nombreHoja = hojas[i].getName();
    if (nombreHoja.startsWith("ESTUDIANTES_INST") || nombreHoja.startsWith("PAGOS_INSCRIPCION_INST") || nombreHoja.startsWith("PAGOS_CUOTA_INST") || nombreHoja.startsWith("PAGOS_SEGURO_INST")) {
      hojas[i].clearContents();
    }
  }
}

function generarDNISinDuplicados(dniBase, estudiantesMap, instId) {
  if (dniBase && String(dniBase).trim() !== "" && dniBase !== "00000000") return dniBase;
  const offset = (parseInt(instId) - 1) * 100000;
  let contador = offset;
  let dniGenerado = String(contador).padStart(8, '0');
  while (estudiantesMap[dniGenerado]) {
    contador++;
    if (contador >= offset + 100000) return null;
    dniGenerado = String(contador).padStart(8, '0');
  }
  return dniGenerado;
}

function procesarHoja(hoja, nombreHoja, carreraId, config, año, instId, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
  
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1, idxInsc = -1, idxInscMetodo = -1, idxInscTalonario = -1;
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
  
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    const numeroFila = r + 1;
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    let dni = generarDNISinDuplicados(dniRaw, estudiantes, instId);
    if (!dni) {
      SKIPPED_DETAILS.push({ hoja: nombreHoja, fila: numeroFila, dni: dniRaw, apellido: String(fila[idxApellido] || "").trim(), nombres: String(fila[idxNombres] || "").trim(), motivo: "DNI NULL" });
      continue;
    }
    
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    if (!apellido) {
      SKIPPED_DETAILS.push({ hoja: nombreHoja, fila: numeroFila, dni: dni, apellido: "(VACÍO)", nombres: nombre, motivo: "APELLIDO VACÍO" });
      continue;
    }
    
    const estData = { item: fila[idxItem] || "", dni: dni, apellido: apellido, nombres: nombre, telefono: String(fila[idxTelefono] || "").trim(), carrera_id: carreraId, estado: "ACTIVO" };
    const estValidado = validarEstudiante(estData, instId);
    if (!estValidado) {
      SKIPPED_DETAILS.push({ hoja: nombreHoja, fila: numeroFila, dni: estData.dni, apellido: estData.apellido, nombres: estData.nombres, motivo: "VALIDACIÓN FALLIDA" });
      continue;
    }
    
    if (!estudiantes[estValidado.dni]) estudiantes[estValidado.dni] = estValidado;
    
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      const montoConfigInsc = config.monto_inscripcion;
      const metodoInsc = String(fila[idxInscMetodo] || "EFECTIVO").trim();
      const talonarioInsc = String(fila[idxInscTalonario] || "").trim();
      pagosInscripcion.push([fila[idxItem] || "", estValidado.dni, apellido, nombre, carreraId, montoPagadoInsc, montoConfigInsc, Math.max(0, montoConfigInsc - montoPagadoInsc), "", metodoInsc, "", talonarioInsc, "PAGADO", ""]);
    }
    
    for (let mes of meses) {
      if (idxCuota[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
        if (montoPagado > 0) {
          const montoConfig = config.monto_cuota;
          const metodoCuota = String(fila[idxCuotaMetodo[mes]] || "EFECTIVO").trim();
          const talonarioCuota = String(fila[idxCuotaTalonario[mes]] || "").trim();
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          pagosCuota.push([fila[idxItem] || "", estValidado.dni, apellido, nombre, carreraId, mesCompleto, año, montoPagado, montoConfig, Math.max(0, montoConfig - montoPagado), "", metodoCuota, talonarioCuota, "PAGADO", ""]);
        }
      }
      
      if (idxSeguro[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
        if (montoPagado > 0) {
          const montoConfig = config.monto_seguro;
          const metodoSeguro = String(fila[idxSeguroMetodo[mes]] || "EFECTIVO").trim();
          const talonarioSeguro = String(fila[idxSeguroTalonario[mes]] || "").trim();
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          pagosSeguro.push([fila[idxItem] || "", estValidado.dni, apellido, nombre, carreraId, mesCompleto, año, montoPagado, montoConfig, Math.max(0, montoConfig - montoPagado), "1 cuota", metodoSeguro, talonarioSeguro, "PAGADO", ""]);
        }
      }
    }
  }
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
  if (estData.length > 0) hojaEst.getRange(2, 1, estData.length, 7).setValues(estData);
  
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

function sincronizarDatos(config, datosNormalizados) {
  const estudiantes = datosNormalizados.estudiantes;
  const pagosInsc = datosNormalizados.pagosInscripcion;
  const pagosCuota = datosNormalizados.pagosCuota;
  const pagosSeguro = datosNormalizados.pagosSeguro;
  
  let contadores = { estudiantesInsertados: 0, pagosMultiplesInsertados: 0, detallesInsertados: 0, ignorados: 0, errores: 0 };
  
  const resEst = procesarEstudiantes(config, estudiantes);
  contadores.estudiantesInsertados = resEst.procesados;
  contadores.errores += resEst.errores;
  
  Utilities.sleep(15000);
  
  const dniAId = buscarEstudiantes(config, estudiantes);
  if (Object.keys(dniAId).length === 0) return { exito: false, contadores: contadores, fecha: new Date().toISOString() };
  
  const conceptos = cargarConceptos(config);
  
  if (pagosInsc.length > 0) {
    const res = procesarPagosV3(config, pagosInsc, "INSCRIPCION", dniAId, conceptos);
    contadores.pagosMultiplesInsertados += res.pagosMultiples;
    contadores.detallesInsertados += res.detalles;
    contadores.ignorados += res.ignorados;
    contadores.errores += res.errores;
  }
  
  if (pagosCuota.length > 0) {
    const res = procesarPagosV3(config, pagosCuota, "CUOTA", dniAId, conceptos);
    contadores.pagosMultiplesInsertados += res.pagosMultiples;
    contadores.detallesInsertados += res.detalles;
    contadores.ignorados += res.ignorados;
    contadores.errores += res.errores;
  }
  
  if (pagosSeguro.length > 0) {
    const res = procesarPagosV3(config, pagosSeguro, "SEGURO", dniAId, conceptos);
    contadores.pagosMultiplesInsertados += res.pagosMultiples;
    contadores.detallesInsertados += res.detalles;
    contadores.ignorados += res.ignorados;
    contadores.errores += res.errores;
  }
  
  return { exito: contadores.errores === 0, contadores: contadores, fecha: new Date().toISOString() };
}

function procesarPagosV3(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { pagosMultiples: 0, detalles: 0, ignorados: 0, errores: 0 };
  const pagosMultiplesParaInsertar = [];
  const detallesParaInsertar = [];
  const agrupados = {};
  
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
      let mes = null;
      let mesNum = null;
      
      if (tipo === "INSCRIPCION") {
        conceptoId = conceptos[carId] ? conceptos[carId].inscripcion : null;
      } else if (tipo === "SEGURO") {
        mes = pagoArr[5];
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        mes = pagoArr[5];
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].cuotas[mesNum] : null;
      }
      
      if (!conceptoId) {
        res.ignorados++;
        continue;
      }
      
      let metodo = pagoArr[tipo === "INSCRIPCION" ? 9 : (tipo === "SEGURO" ? 11 : 11)] || "EFECTIVO";
      let talonario = pagoArr[tipo === "INSCRIPCION" ? 11 : (tipo === "SEGURO" ? 12 : 12)] || "";
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      
      const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
      if (!montoPagado) {
        res.ignorados++;
        continue;
      }
      
      const key = `${estId}|${tipo}`;
      if (!agrupados[key]) {
        agrupados[key] = { estId: estId, carId: carId, tipo: tipo, metodo: metodo, talonario: talonario, montoPagado: 0, detalles: [] };
      }
      
      agrupados[key].montoPagado += montoPagado;
      agrupados[key].detalles.push({ conceptoId: conceptoId, montoPagado: montoPagado, mes: mes || null });
      
    } catch (e) {
      res.errores++;
    }
  }
  
  for (let key in agrupados) {
    const pago = agrupados[key];
    const pagoMultiple = {
      institucion_id: parseInt(config.institucionId),
      estudiante_id: pago.estId,
      tipo: pago.tipo,
      monto_total: pago.montoPagado,
      metodo_pago: pago.metodo,
      numero_talonario: pago.talonario || "",
      estado: "PAGADO",
      fecha_pago: new Date().toISOString().split('T')[0],
      carrera_id: pago.carId
    };
    
    pagosMultiplesParaInsertar.push(pagoMultiple);
    
    for (let detalle of pago.detalles) {
      detallesParaInsertar.push({ concepto_id: detalle.conceptoId, monto: detalle.montoPagado, mes: detalle.mes });
    }
  }
  
  for (let i = 0; i < pagosMultiplesParaInsertar.length; i += 20) {
    const batch = pagosMultiplesParaInsertar.slice(i, i + 20);
    try {
      const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/pagos_multiples`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify(batch), muteHttpExceptions: true });
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.pagosMultiples += batch.length;
      } else {
        res.errores += batch.length;
      }
    } catch (e) {
      res.errores += batch.length;
    }
    Utilities.sleep(DELAY_MS);
  }
  
  for (let i = 0; i < detallesParaInsertar.length; i += 50) {
    const batch = detallesParaInsertar.slice(i, i + 50);
    try {
      const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/pagos_multiples_detalle`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify(batch), muteHttpExceptions: true });
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.detalles += batch.length;
      } else {
        res.errores += batch.length;
      }
    } catch (e) {
      res.errores += batch.length;
    }
    Utilities.sleep(DELAY_MS);
  }
  
  return res;
}

function procesarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  const batchSize = 50;
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    const dnisBatch = batch.map(function(e) { return e.dni; });
    
    const existentesMap = {};
    try {
      const respBuscar = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify({ dni_list: dnisBatch }), muteHttpExceptions: true, timeout: 60 });
      if (respBuscar.getResponseCode() === 200) {
        const existentes = JSON.parse(respBuscar.getContentText());
        for (let est of existentes) existentesMap[est.dni] = est.id;
      }
    } catch (e) {}
    
    const paraInsertar = [];
    const paraActualizar = [];
    
    for (let est of batch) {
      const datos = { institucion_id: parseInt(config.institucionId), dni: est.dni.trim(), nombre: est.nombres.trim(), apellido: est.apellido.trim(), telefono: est.telefono ? est.telefono.trim() : null, carrera_id: est.carrera_id, estado: "ACTIVO", fecha_ingreso: new Date().toISOString().split('T')[0] };
      if (existentesMap[est.dni]) {
        paraActualizar.push({ id: existentesMap[est.dni], datos: datos });
      } else {
        paraInsertar.push(datos);
      }
    }
    
    if (paraInsertar.length > 0) {
      try {
        const respInsert = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/estudiantes`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify(paraInsertar), muteHttpExceptions: true });
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
        UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/estudiantes?id=eq.${item.id}`, { method: "patch", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify(item.datos), muteHttpExceptions: true });
        res.procesados++;
      } catch (e) {
        res.errores++;
      }
    }
    
    Utilities.sleep(1000);
  }
  return res;
}

function buscarEstudiantes(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(function(e) { return e.dni; });
  const chunkSize = 50;
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    try {
      const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify({ dni_list: chunk }), muteHttpExceptions: true, timeout: 60 });
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        for (let est of datos) dniAId[est.dni] = est.id;
      }
    } catch (e) {}
    Utilities.sleep(300);
  }
  return dniAId;
}

function cargarConceptos(config) {
  const conceptos = {};
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=id,tipo,mes,carrera_id`, { method: "get", headers: { "apikey": config.supabaseKey }, muteHttpExceptions: true });
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        const car = c.carrera_id;
        if (!conceptos[car]) conceptos[car] = { inscripcion: null, seguros: {}, cuotas: {} };
        if (c.tipo === "INSCRIPCION") conceptos[car].inscripcion = c.id;
        else if (c.tipo === "SEGURO" && c.mes) conceptos[car].seguros[c.mes] = c.id;
        else if (c.tipo === "CUOTA" && c.mes) conceptos[car].cuotas[c.mes] = c.id;
      }
    }
  } catch (e) {}
  return conceptos;
}

function convertirMesANumero(mesDato) {
  if (!mesDato) return null;
  const m = mesDato.toString().trim().toUpperCase();
  const meses = { "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6, "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12, "SEPT": 9, "SEP": 9, "NOV": 11, "DIC": 12, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12 };
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
    if (filasSkipped.length > 0) hojaSkipped.getRange(2, 1, filasSkipped.length, 6).setValues(filasSkipped);
  } catch (e) {}
}

function guardarResultadoFinalMulti(hojaSync, resultadoSync) {
  try {
    let logSheet = hojaSync.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = hojaSync.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "INSTITUCIÓN", "ESTADO", "ESTUDIANTES", "PAGOS_MULTIPLES", "DETALLES", "IGNORADOS", "ERRORES"]);
    }
    for (let instId in resultadoSync) {
      const resultado = resultadoSync[instId];
      const row = [new Date().toLocaleString('es-AR'), instId, resultado.exito ? "✅ OK" : "⚠️ ERRORES", resultado.contadores.estudiantesInsertados, resultado.contadores.pagosMultiplesInsertados, resultado.contadores.detallesInsertados, resultado.contadores.ignorados, resultado.contadores.errores];
      logSheet.getRange(logSheet.getLastRow() + 1, 1, 1, 8).setValues([row]);
    }
  } catch (e) {}
}

function mostrarResumenManual() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (logSheet) {
      const data = logSheet.getDataRange().getValues();
      if (data.length > 1) {
        const ult = data[data.length - 1];
        SpreadsheetApp.getUi().alert(`ÚLTIMA: ${ult[0]}\nINST: ${ult[1]}\n${ult[2]}\nPM: ${ult[4]}`);
      }
    }
  } catch (e) {}
}

function mostrarLogsManual() {
  try {
    SpreadsheetApp.getUi().alert("Ver: " + LOG_SHEET_NAME);
  } catch (e) {}
}
