// ==================== GOOGLE APPS SCRIPT - FULL AUTO v2.3 ====================
// FIX: Separar normalización en funciones más pequeñas para debug
// ==================== CONFIGURACIÓN ====================

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const BATCH_SIZE = 5;
const DELAY_MS = 800;
const MAX_REINTENTOS = 5;

// ==================== MENÚ PERSONALIZADO ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 SINCRONIZACIÓN')
    .addItem('▶️ FULL AUTO', 'ejecutarFullAuto')
    .addSeparator()
    .addItem('📋 Ver Resumen', 'mostrarResumen')
    .addItem('📊 Ver Logs', 'mostrarLogs')
    .addToUi();
}

// ==================== FUNCIÓN PRINCIPAL ====================

function ejecutarFullAuto() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 INICIANDO FULL AUTO v2.3");
    Logger.log("=".repeat(70));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando... por favor espera.</p>'),
      '🔄 Sincronización'
    );
    
    // PASO 1: NORMALIZAR
    Logger.log("\n📋 FASE 1: Normalizando datos...");
    
    let datosNormalizados = null;
    let hojaSync = null;
    let SUPABASE_URL = null;
    let SUPABASE_KEY = null;
    let INSTITUCION_ID = null;
    
    try {
      const resultNorm = normalizarExcel();
      
      if (!resultNorm) {
        Logger.log("❌ normalizarExcel() retornó null");
        ui.alert("❌ Error en normalización");
        return;
      }
      
      datosNormalizados = resultNorm.datosNormalizados;
      hojaSync = resultNorm.hojaSync;
      SUPABASE_URL = resultNorm.SUPABASE_URL;
      SUPABASE_KEY = resultNorm.SUPABASE_KEY;
      INSTITUCION_ID = resultNorm.INSTITUCION_ID;
      
      Logger.log(`✅ Normalización OK: ${datosNormalizados.estudiantes.length} estudiantes`);
      
    } catch (eNorm) {
      Logger.log("❌ Error en normalización: " + eNorm.toString());
      ui.alert("❌ Error en normalización: " + eNorm.toString());
      return;
    }
    
    // PASO 2: SINCRONIZAR
    Logger.log("\n🔄 FASE 2: Sincronizando...");
    
    const config = {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY,
      institucionId: INSTITUCION_ID
    };
    
    const resultadoSync = sincronizarDatos(config, datosNormalizados);
    
    // PASO 3: GUARDAR LOG
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarResultadoFinal(hojaSync, resultadoSync);
    
    // PASO 4: RESUMEN
    const resumenFinal = `✅ COMPLETADO
    
📊 DATOS NORMALIZADOS:
   • Estudiantes: ${datosNormalizados.estudiantes.length}
   • Inscripciones: ${datosNormalizados.pagosInscripcion.length}
   • Cuotas: ${datosNormalizados.pagosCuota.length}
   • Seguros: ${datosNormalizados.pagosSeguro.length}

🔄 SINCRONIZACIÓN:
   • Estudiantes: ${resultadoSync.contadores.estudiantesInsertados}
   • Inscripciones: ${resultadoSync.contadores.pagosInscInsertados}
   • Cuotas: ${resultadoSync.contadores.pagosCuotaInsertados}
   • Seguros: ${resultadoSync.contadores.pagosSeguroInsertados}
   • Errores: ${resultadoSync.contadores.errores}

Fecha: ${new Date().toLocaleString('es-AR')}`;
    
    ui.alert(resumenFinal);
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
  }
}

// ==================== NORMALIZACIÓN ====================

function normalizarExcel() {
  Logger.log("🚀 normalizarExcel() iniciado");
  
  const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
  const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
  const INSTITUCION_ID = 2;
  const AÑO = 2026;
  
  const mapeoCarreras = {
    "INICIAL2026": 4,
    "PRIMARIA2026": 5,
    "SECUNDARIA2026": 6
  };
  
  // Obtener configuración
  Logger.log("Obteniendo configuración de carreras...");
  const configuracionCarreras = obtenerConfiguracionCarreras(SUPABASE_URL, SUPABASE_KEY, INSTITUCION_ID);
  
  if (!configuracionCarreras) {
    Logger.log("❌ No se pudo obtener configuración");
    return null;
  }
  
  Logger.log(`✅ Configuración OK: ${Object.keys(configuracionCarreras).length} carreras`);
  
  // Obtener archivo Excel
  Logger.log("Obteniendo archivo Excel...");
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado: " + nombreArchivo);
    return null;
  }
  
  const file = files.next();
  Logger.log("✅ Archivo encontrado");
  
  // Crear nuevo spreadsheet
  const spreadsheet = SpreadsheetApp.create("Sync_" + Date.now());
  const ss = spreadsheet.getActiveSheet();
  ss.setName("CONFIG");
  
  // Crear hojas
  const hojaEstudiantes = spreadsheet.insertSheet("ESTUDIANTES");
  const hojaInscripcion = spreadsheet.insertSheet("PAGOS_INSCRIPCION");
  const hojaCuota = spreadsheet.insertSheet("PAGOS_CUOTA");
  const hojaSeguro = spreadsheet.insertSheet("PAGOS_SEGURO_ANUAL");
  
  Logger.log("✅ Spreadsheet creado");
  
  // Procesar Excel
  const fileId = file.getId();
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  const estudiantes = {};
  const pagosInscripcion = [];
  const pagosCuota = [];
  const pagosSeguro = [];
  
  const hojas = tempSpreadsheet.getSheets();
  Logger.log(`Procesando ${hojas.length} hojas...`);
  
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName();
    
    const carreraId = mapeoCarreras[nombreHoja];
    if (!carreraId) continue;
    
    const config = configuracionCarreras[carreraId];
    if (!config) continue;
    
    Logger.log(`  Procesando ${nombreHoja} (carrera ${carreraId})...`);
    
    procesarHoja(hoja, carreraId, config, AÑO, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro);
  }
  
  Logger.log(`✅ Procesamiento OK: ${Object.keys(estudiantes).length} estudiantes`);
  
  // Llenar hojas
  Logger.log("Llenando hojas...");
  llenarHojas(hojaEstudiantes, hojaInscripcion, hojaCuota, hojaSeguro, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro);
  
  Logger.log("✅ Normalización completada");
  Logger.log(`   - Estudiantes: ${Object.keys(estudiantes).length}`);
  Logger.log(`   - Inscripción: ${pagosInscripcion.length}`);
  Logger.log(`   - Cuota: ${pagosCuota.length}`);
  Logger.log(`   - Seguro: ${pagosSeguro.length}`);
  
  // RETORNO EXPLÍCITO
  const retorno = {
    datosNormalizados: {
      estudiantes: Object.values(estudiantes),
      pagosInscripcion: pagosInscripcion,
      pagosCuota: pagosCuota,
      pagosSeguro: pagosSeguro
    },
    hojaSync: spreadsheet,
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_KEY: SUPABASE_KEY,
    INSTITUCION_ID: INSTITUCION_ID
  };
  
  return retorno;
}

function obtenerConfiguracionCarreras(url, key, instId) {
  try {
    const response = UrlFetchApp.fetch(`${url}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}`, {
      method: "get",
      headers: { "apikey": key, "Content-Type": "application/json" },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const config = {};
      for (let c of data) {
        config[c.carrera_id] = {
          monto_inscripcion: c.monto_inscripcion,
          monto_cuota: c.monto_cuota,
          monto_seguro: c.monto_seguro
        };
      }
      return config;
    }
  } catch (e) {
    Logger.log("Error: " + e);
  }
  return null;
}

function procesarHoja(hoja, carreraId, config, año, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
  
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1, idxInsc = -1;
  const idxCuota = {}, idxSeguro = {};
  
  // Encontrar índices
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    if (h.includes("ITEM")) idxItem = i;
    else if (h === "APELLIDO") idxApellido = i;
    else if (h === "NOMBRES") idxNombres = i;
    else if (h === "DNI") idxDNI = i;
    else if (h === "TELEFONO") idxTelefono = i;
    else if (h === "INSCRIPCION") idxInsc = i;
  }
  
  // Detectar meses
  for (let i = 0; i < headers.length - 1; i++) {
    const hActual = String(headers[i]).toUpperCase().trim();
    const hProx = String(headers[i + 1]).toUpperCase().trim();
    
    for (let mes of meses) {
      if (hActual.includes("SEGURO") && hActual.includes(mes)) idxSeguro[mes] = i;
      if (hProx === mes && hActual === "SEGURO") idxCuota[mes] = i + 1;
      if (hActual === mes && !idxCuota[mes]) idxCuota[mes] = i;
    }
  }
  
  // Procesar filas
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    
    let dni = String(fila[idxDNI] || "").split(".")[0].trim();
    if (!dni) continue;
    
    const apellido = String(fila[idxApellido] || "").trim();
    if (!apellido) continue;
    
    // Estudiante
    if (!estudiantes[dni]) {
      estudiantes[dni] = {
        item: fila[idxItem] || "",
        dni: dni,
        apellido: apellido,
        nombres: String(fila[idxNombres] || "").trim(),
        telefono: String(fila[idxTelefono] || "").trim(),
        carrera_id: carreraId,
        estado: "ACTIVO"
      };
    }
    
    // Inscripción
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      const montoConfigInsc = config.monto_inscripcion;
      const montoAdeudado = Math.max(0, montoConfigInsc - montoPagadoInsc);
      const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
      
      pagosInscripcion.push([
        fila[idxItem] || "", dni, apellido, estudiantes[dni].nombres, carreraId,
        montoPagadoInsc, montoConfigInsc, montoAdeudado,
        "", "EFECTIVO", "", "", estado, ""
      ]);
    }
    
    // Cuotas
    for (let mes of meses) {
      if (idxCuota[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
        if (montoPagado > 0) {
          const montoConfig = config.monto_cuota;
          const montoAdeudado = Math.max(0, montoConfig - montoPagado);
          const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
          
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          
          pagosCuota.push([
            fila[idxItem] || "", dni, apellido, estudiantes[dni].nombres, carreraId, mesCompleto, año,
            montoPagado, montoConfig, montoAdeudado,
            "", "EFECTIVO", "", estado, ""
          ]);
        }
      }
    }
    
    // Seguro anual
    let totalSeguro = 0, mesesConPago = [];
    for (let mes of meses) {
      if (idxSeguro[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
        if (montoPagado > 0) {
          totalSeguro += montoPagado;
          mesesConPago.push(mes);
        }
      }
    }
    
    if (totalSeguro > 0) {
      const montoConfig = config.monto_seguro;
      const montoAdeudado = Math.max(0, montoConfig - totalSeguro);
      const estado = montoAdeudado === 0 ? "PAGADO" : "PARCIAL";
      
      pagosSeguro.push([
        fila[idxItem] || "", dni, apellido, estudiantes[dni].nombres, carreraId,
        "ANUAL", año,
        totalSeguro, montoConfig, montoAdeudado,
        mesesConPago.length + " cuotas", "EFECTIVO", "", estado,
        "Cuotas: " + mesesConPago.join(", ")
      ]);
    }
  }
}

function llenarHojas(hojaEst, hojaInsc, hojaCuota, hojaSeguro, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  // ESTUDIANTES
  hojaEst.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "TELEFONO", "CARRERA_ID", "ESTADO"]);
  const estData = [];
  for (let dni in estudiantes) {
    const e = estudiantes[dni];
    estData.push([e.item, e.dni, e.apellido, e.nombres, e.telefono, e.carrera_id, e.estado]);
  }
  if (estData.length > 0) {
    hojaEst.getRange(2, 1, estData.length, 7).setValues(estData);
  }
  
  // INSCRIPCIÓN
  hojaInsc.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "TIPO_TARJETA", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosInscripcion.length; i += 500) {
    const chunk = pagosInscripcion.slice(i, i + 500);
    hojaInsc.getRange(hojaInsc.getLastRow() + 1, 1, chunk.length, 14).setValues(chunk);
  }
  
  // CUOTA
  hojaCuota.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MES", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
  for (let i = 0; i < pagosCuota.length; i += 500) {
    const chunk = pagosCuota.slice(i, i + 500);
    hojaCuota.getRange(hojaCuota.getLastRow() + 1, 1, chunk.length, 15).setValues(chunk);
  }
  
  // SEGURO
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
    pagosCuotaInsertados: 0,
    pagosSeguroInsertados: 0,
    errores: 0,
    pagosSkipped: 0
  };
  
  Logger.log(`Procesando ${estudiantes.length} estudiantes...`);
  const resEst = procesarEstudiantes(config, estudiantes);
  contadores.estudiantesInsertados = resEst.procesados;
  contadores.errores += resEst.errores;
  
  Utilities.sleep(15000);
  
  Logger.log("Buscando estudiantes en BD...");
  const dniAId = buscarEstudiantes(config, estudiantes);
  Logger.log(`Encontrados: ${Object.keys(dniAId).length}/${estudiantes.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    return { exito: false, contadores: contadores, fecha: new Date().toISOString() };
  }
  
  const conceptos = cargarConceptos(config);
  
  if (pagosInsc.length > 0) {
    Logger.log(`Procesando ${pagosInsc.length} inscripciones...`);
    const res = procesarPagos(config, pagosInsc, "INSCRIPCION", dniAId, conceptos);
    contadores.pagosInscInsertados = res.insertados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
  }
  
  if (pagosCuota.length > 0) {
    Logger.log(`Procesando ${pagosCuota.length} cuotas...`);
    const res = procesarPagos(config, pagosCuota, "CUOTA", dniAId, conceptos);
    contadores.pagosCuotaInsertados = res.insertados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
  }
  
  if (pagosSeguro.length > 0) {
    Logger.log(`Procesando ${pagosSeguro.length} seguros...`);
    const res = procesarPagos(config, pagosSeguro, "SEGURO", dniAId, conceptos);
    contadores.pagosSeguroInsertados = res.insertados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
  }
  
  return { exito: contadores.errores === 0, contadores: contadores, fecha: new Date().toISOString() };
}

function procesarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  
  for (let est of estudiantes) {
    try {
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
      
      const urlBuscar = `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(datos.dni)}&select=id`;
      const respBuscar = UrlFetchApp.fetch(urlBuscar, {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      });
      
      if (respBuscar.getResponseCode() === 200) {
        const existentes = JSON.parse(respBuscar.getContentText());
        
        if (existentes && existentes.length > 0) {
          const id = existentes[0].id;
          const urlUpdate = `${config.supabaseUrl}/rest/v1/estudiantes?id=eq.${id}`;
          const respUpdate = UrlFetchApp.fetch(urlUpdate, {
            method: "patch",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(datos),
            muteHttpExceptions: true
          });
          if (respUpdate.getResponseCode() === 200 || respUpdate.getResponseCode() === 204) {
            res.procesados++;
          } else {
            res.errores++;
          }
        } else {
          const urlInsert = `${config.supabaseUrl}/rest/v1/estudiantes`;
          const respInsert = UrlFetchApp.fetch(urlInsert, {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify([datos]),
            muteHttpExceptions: true
          });
          if (respInsert.getResponseCode() === 201 || respInsert.getResponseCode() === 200) {
            res.procesados++;
          } else {
            res.errores++;
          }
        }
      }
    } catch (e) {
      res.errores++;
    }
  }
  
  return res;
}

function buscarEstudiantes(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(e => e.dni);
  
  for (let intento = 0; intento < 5; intento++) {
    const faltantes = dnis.filter(d => !dniAId[d]);
    if (faltantes.length === 0) break;
    
    for (let dni of faltantes) {
      try {
        const resp = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(dni)}&select=id`,
          {
            method: "get",
            headers: { "apikey": config.supabaseKey },
            muteHttpExceptions: true
          }
        );
        if (resp.getResponseCode() === 200) {
          const datos = JSON.parse(resp.getContentText());
          if (datos && datos.length > 0) {
            dniAId[dni] = datos[0].id;
          }
        }
      } catch (e) {
      }
    }
    
    Utilities.sleep(5000);
  }
  
  return dniAId;
}

function cargarConceptos(config) {
  const conceptos = {
    4: { inscripcion: null, seguro: null, cuotas: {} },
    5: { inscripcion: null, seguro: null, cuotas: {} },
    6: { inscripcion: null, seguro: null, cuotas: {} }
  };
  
  try {
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${config.institucionId}&select=id,tipo,mes,carrera_id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        const car = c.carrera_id;
        if (conceptos[car]) {
          if (c.tipo === "INSCRIPCION") conceptos[car].inscripcion = c.id;
          else if (c.tipo === "SEGURO") conceptos[car].seguro = c.id;
          else if (c.tipo === "CUOTA") conceptos[car].cuotas[c.mes] = c.id;
        }
      }
    }
  } catch (e) {
  }
  
  return conceptos;
}

function procesarPagos(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { insertados: 0, skipped: 0, errores: 0 };
  
  for (let i = 0; i < pagosArray.length; i += BATCH_SIZE) {
    const lote = pagosArray.slice(i, i + BATCH_SIZE);
    const requests = [];
    
    for (let pagoArr of lote) {
      try {
        const estId = dniAId[pagoArr[1]];
        if (!estId) {
          res.skipped++;
          continue;
        }
        
        const carId = pagoArr[4];
        let conceptoId = null;
        
        if (tipo === "INSCRIPCION") {
          conceptoId = conceptos[carId].inscripcion;
        } else if (tipo === "SEGURO") {
          conceptoId = conceptos[carId].seguro;
        } else if (tipo === "CUOTA") {
          const mesNum = convertirMesANumero(pagoArr[5]);
          conceptoId = conceptos[carId].cuotas[mesNum];
        }
        
        if (!conceptoId) {
          res.skipped++;
          continue;
        }
        
        const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
        const montoOriginal = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 6 : (tipo === "SEGURO" ? 8 : 8)]) || montoPagado;
        
        if (!montoPagado) {
          res.skipped++;
          continue;
        }
        
        const datos = {
          institucion_id: parseInt(config.institucionId),
          estudiante_id: estId,
          concepto_id: conceptoId,
          monto_pagado: montoPagado,
          monto_original: montoOriginal,
          metodo_pago: "EFECTIVO",
          numero_talonario: null,
          estado: "PAGADO",
          fecha_pago: new Date().toISOString().split('T')[0],
          carrera_id: carId
        };
        
        requests.push({
          url: `${config.supabaseUrl}/rest/v1/pagos`,
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify([datos]),
          muteHttpExceptions: true
        });
      } catch (e) {
        res.errores++;
      }
    }
    
    if (requests.length > 0) {
      try {
        const responses = UrlFetchApp.fetchAll(requests);
        for (let r of responses) {
          if (r.getResponseCode() === 201 || r.getResponseCode() === 200) {
            res.insertados++;
          } else {
            res.errores++;
          }
        }
      } catch (e) {
        res.errores += requests.length;
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return res;
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

function gardarResultadoFinal(hojaSync, resultado) {
  try {
    let logSheet = hojaSync.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = hojaSync.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "ESTADO", "RESUMEN", "ERRORES", "OMITIDOS"]);
    }
    
    logSheet.appendRow([
      new Date().toLocaleString('es-AR'),
      resultado.exito ? "✅ OK" : "⚠️ ERRORES",
      `EST:${resultado.contadores.estudiantesInsertados} INSC:${resultado.contadores.pagosInscInsertados} CUOT:${resultado.contadores.pagosCuotaInsertados} SEG:${resultado.contadores.pagosSeguroInsertados}`,
      resultado.contadores.errores,
      resultado.contadores.pagosSkipped
    ]);
  } catch (e) {
  }
}

function guardarResultadoFinal(hojaSync, resultado) {
  gardarResultadoFinal(hojaSync, resultado);
}

function mostrarResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (logSheet) {
    const data = logSheet.getDataRange().getValues();
    const ult = data[data.length - 1];
    SpreadsheetApp.getUi().alert(`ÚLTIMA: ${ult[0]}\n${ult[1]}\n${ult[2]}`);
  }
}

function mostrarLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  if (logSheet) {
    SpreadsheetApp.getUi().alert("Ver hoja: " + LOG_SHEET_NAME);
  }
}
