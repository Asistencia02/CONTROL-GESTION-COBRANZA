// ==================== GOOGLE APPS SCRIPT v3.2 - AUTO-ASIGNAR MÉTODO Y TALONARIO ====================
// ✅ Lee talonario y método del Excel
// ✅ Si son NULL → asigna automáticamente (talonario único, método EFECTIVO)
// ✅ DNI ÚNICO por institución - rechaza duplicados entre carreras
// ✅ RPC OPTIMIZADO: usa insertar_pago_multiple_con_detalles_upsert (rápido, sin duplicar)

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const SKIPPED_SHEET_NAME = "SKIPPED_DETAILS";
const ESTADO_SYNC_SHEET = "ESTADO_SINCRONIZACION";

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
let PAGOS_CREADOS = {};
let TALONARIO_COUNTER = {}; // ✅ COUNTER para talonarios auto-generados

// ==================== MENÚ ====================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 SINCRONIZACIÓN COBRANZA v3.2')
      .addItem('▶️ SINCRONIZAR (DNI ÚNICO)', 'sincronizarInteligente')
      .addItem('▶️ SINCRONIZACIÓN COMPLETA', 'ejecutarCobranzaAgrupada')
      .addSeparator()
      .addItem('📋 Ver Logs', 'mostrarLogsManual')
      .addItem('🗑️ Limpiar Logs', 'limpiarLogs')
      .addToUi();
  } catch (e) {
    Logger.log("onOpen warning: " + e);
  }
}

// ==================== FUNCIÓN EJECUTABLE DESDE TRIGGER ====================

function sincronizarDesdeGoogleSheets() {
  try {
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 SINCRONIZACIÓN DESDE GOOGLE SHEETS v3.2 (AUTO-MÉTODO/TALONARIO)");
    Logger.log("=".repeat(80));
    
    const resultado = sincronizarCobranzaInteligente();
    
    if (resultado.exito) {
      Logger.log("\n✅ SINCRONIZACIÓN COMPLETADA");
      Logger.log(`Estudiantes cargados: ${resultado.estudiantesCargados}`);
      Logger.log(`Estudiantes nuevos: ${resultado.estudiantesNuevos}`);
      Logger.log(`Pagos creados: ${resultado.pagosCreados}`);
      Logger.log(`Errores: ${resultado.errores}`);
      Logger.log(`DNIs duplicados rechazados: ${resultado.dnisDuplicadosRechazados}`);
    } else {
      Logger.log("\n❌ SINCRONIZACIÓN FALLIDA: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR CRÍTICO: " + error);
  }
}

// ==================== FUNCIÓN MANUAL (desde menú) ====================

function sincronizarInteligente() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 v3.2 - SINCRONIZACIÓN INTELIGENTE (AUTO-MÉTODO/TALONARIO)");
    Logger.log("=".repeat(80));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Sincronizando... (5-10 minutos)</p>'),
      '🔄 Sincronización'
    );
    
    const resultado = sincronizarCobranzaInteligente();
    
    if (resultado.exito) {
      let resumen = "✅ SINCRONIZACIÓN COMPLETADA v3.2\n\n";
      resumen += `• Instituciones: ${Object.keys(resultado.resultados).length}\n`;
      resumen += `• Total estudiantes cargados: ${resultado.estudiantesCargados}\n`;
      resumen += `• Estudiantes nuevos: ${resultado.estudiantesNuevos}\n`;
      resumen += `• Estudiantes actualizados: ${resultado.estudiantesActualizados}\n`;
      resumen += `• Pagos creados (con conceptos): ${resultado.pagosCreados}\n`;
      resumen += `• DNIs duplicados rechazados: ${resultado.dnisDuplicadosRechazados}\n`;
      resumen += `• Errores: ${resultado.errores}\n`;
      
      for (let instId in resultado.resultados) {
        const sync = resultado.resultados[instId];
        resumen += `\n📦 INSTITUCIÓN ${instId}:\n`;
        resumen += `   👥 Estudiantes cargados: ${sync.estudiantesCargados}\n`;
        resumen += `   ✨ Nuevos: ${sync.estudiantesNuevos}\n`;
        resumen += `   💰 Pagos: ${sync.pagosMultiplesCreados}\n`;
      }
      
      resumen += `\nFecha: ${new Date().toLocaleString('es-AR')}`;
      ui.alert(resumen);
    } else {
      ui.alert("❌ Error: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
  }
}

// ==================== SINCRONIZACIÓN INTELIGENTE (NÚCLEO) ====================

function sincronizarCobranzaInteligente() {
  try {
    Logger.log("\n📋 FASE 1: Normalizando datos del Excel...");
    SKIPPED_DETAILS = [];
    PAGOS_CREADOS = {};
    TALONARIO_COUNTER = {}; // ✅ RESET counter
    
    const datosNormalizados = normalizarExcelParaCobranza();
    if (!datosNormalizados || Object.keys(datosNormalizados).length === 0) {
      return { exito: false, mensaje: "Error en normalización", resultados: {}, dnisDuplicadosRechazados: 0 };
    }
    
    Logger.log(`✅ Instituciones detectadas: ${Object.keys(datosNormalizados).join(", ")}`);
    
    let estudiantesCargados = 0, estudiantesNuevos = 0, estudiantesActualizados = 0, pagosCreados = 0, erroresTotal = 0, dnisDuplicadosRechazados = 0;
    
    Logger.log("\n🔄 FASE 2: Procesando cobranza (DNI ÚNICO)...");
    const resultados = {};
    
    for (let instId in datosNormalizados) {
      const datosInst = datosNormalizados[instId];
      const config = {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_KEY,
        institucionId: instId
      };
      
      Logger.log(`\n   🔄 Institución ${instId}...`);
      const res = procesarCobranzaPorInstitucionInteligente(config, datosInst);
      resultados[instId] = res;
      
      estudiantesCargados += res.estudiantesCargados || 0;
      estudiantesNuevos += res.estudiantesNuevos || 0;
      estudiantesActualizados += res.estudiantesActualizados || 0;
      pagosCreados += res.pagosMultiplesCreados || 0;
      erroresTotal += res.errores || 0;
      dnisDuplicadosRechazados += res.dnisDuplicadosRechazados || 0;
    }
    
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarLogsCobranza(resultados);
    guardarSkippedDetails();
    guardarEstadoSincronizacion({
      fecha: new Date().toISOString(),
      estudiantes_cargados: estudiantesCargados,
      estudiantes_nuevos: estudiantesNuevos,
      estudiantes_actualizados: estudiantesActualizados,
      pagos_creados: pagosCreados,
      dnis_duplicados_rechazados: dnisDuplicadosRechazados,
      errores: erroresTotal
    });
    
    Logger.log("\n✅ SINCRONIZACIÓN COMPLETADA");
    return { 
      exito: true, 
      resultados: resultados,
      estudiantesCargados,
      estudiantesNuevos,
      estudiantesActualizados,
      pagosCreados,
      dnisDuplicadosRechazados,
      errores: erroresTotal
    };
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    return { exito: false, mensaje: error.toString(), resultados: {}, dnisDuplicadosRechazados: 0 };
  }
}

// ==================== PROCESAMIENTO INTELIGENTE ====================

function procesarCobranzaPorInstitucionInteligente(config, datosInst) {
  const todosLosEstudiantes = Object.values(datosInst.todosLosEstudiantes);
  const estudiantesConPagos = Object.values(datosInst.estudiantesConPagos);
  
  const resultados = {
    estudiantesCargados: 0,
    estudiantesNuevos: 0,
    estudiantesActualizados: 0,
    pagosMultiplesCreados: 0,
    conceptosAgrupados: 0,
    dnisDuplicadosRechazados: datosInst.dnisDuplicadosRechazados || 0,
    errores: 0
  };
  
  Logger.log(`   👥 Total estudiantes: ${todosLosEstudiantes.length}`);
  Logger.log(`   💰 Con conceptos pagados: ${estudiantesConPagos.length}`);
  Logger.log(`   ⚠️ DNIs duplicados rechazados: ${resultados.dnisDuplicadosRechazados}`);
  
  Logger.log(`   🔍 Obteniendo estudiantes existentes...`);
  const estudiantesExistentes = obtenerEstudiantesExistentes(config);
  Logger.log(`   ✅ ${Object.keys(estudiantesExistentes).length} existentes`);
  
  const estudiantesNuevos = [];
  const estudiantesExistentesAActualizar = [];
  
  for (let estudiante of todosLosEstudiantes) {
    if (estudiantesExistentes[estudiante.dni]) {
      estudiantesExistentesAActualizar.push({
        ...estudiante,
        id_bd: estudiantesExistentes[estudiante.dni]
      });
    } else {
      estudiantesNuevos.push(estudiante);
    }
  }
  
  Logger.log(`   📊 Nuevos: ${estudiantesNuevos.length}, Existentes: ${estudiantesExistentesAActualizar.length}`);
  
  if (estudiantesNuevos.length > 0) {
    Logger.log(`   📝 Insertando ${estudiantesNuevos.length} nuevos...`);
    const resInsert = insertarEstudiantes(config, estudiantesNuevos);
    resultados.estudiantesNuevos = resInsert.procesados;
    resultados.errores += resInsert.errores;
    Utilities.sleep(5000);
  }
  
  if (estudiantesExistentesAActualizar.length > 0) {
    Logger.log(`   ✏️ Actualizando ${estudiantesExistentesAActualizar.length}...`);
    const resUpdate = actualizarEstudiantes(config, estudiantesExistentesAActualizar);
    resultados.estudiantesActualizados = resUpdate.procesados;
    resultados.errores += resUpdate.errores;
  }
  
  resultados.estudiantesCargados = todosLosEstudiantes.length;
  
  Logger.log(`   🔍 Buscando IDs en BD para crear pagos...`);
  const dniAId = buscarEstudiantesById(config, estudiantesConPagos);
  Logger.log(`   ✅ Encontrados: ${Object.keys(dniAId).length}/${estudiantesConPagos.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    Logger.log(`   ⚠️ No hay estudiantes con pagos para crear`);
    return resultados;
  }
  
  Logger.log(`   💰 Cargando configuración...`);
  const config_carreras = cargarConfiguracionCarreras(config);
  const conceptos = cargarConceptos(config);
  
  Logger.log(`\n   📚 CONCEPTOS CARGADOS POR CARRERA:`);
  for (let car in conceptos) {
    const inscId = conceptos[car].inscripcion;
    const cuotasCount = Object.keys(conceptos[car].cuotas).length;
    const segurosCount = Object.keys(conceptos[car].seguros).length;
    Logger.log(`      Carrera ${car}: INSC=${inscId}, CUOTAS=${cuotasCount}, SEGUROS=${segurosCount}`);
  }
  
  Logger.log(`\n   💳 Creando pagos múltiples (sin duplicación)...`);
  for (let estudiante of estudiantesConPagos) {
    const estId = dniAId[estudiante.dni];
    if (!estId) continue;
    
    // ✅ VALIDACIÓN: No procesar si ya creamos pago para este estudiante
    const clavePago = `${config.institucionId}_${estId}`;
    if (PAGOS_CREADOS[clavePago]) {
      Logger.log(`   ⚠️ DNI ${estudiante.dni} (Est ${estId}): Ya procesado, SALTANDO`);
      continue;
    }
    
    const resultado = crearPagoMultipleAgrupado(
      config,
      estId,
      estudiante,
      estudiante.conceptos,
      conceptos,
      config_carreras,
      estudiante.carrera_id
    );
    
    if (resultado.success) {
      PAGOS_CREADOS[clavePago] = true;
      resultados.pagosMultiplesCreados += 1;
      resultados.conceptosAgrupados += resultado.conceptos_count;
    } else {
      resultados.errores += 1;
    }
  }
  
  return resultados;
}

// ==================== OBTENER ESTUDIANTES EXISTENTES ====================

function obtenerEstudiantesExistentes(config) {
  const existentes = {};
  const instId = parseInt(config.institucionId);
  
  try {
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/estudiantes?institucion_id=eq.${instId}&select=dni,id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let est of datos) {
        existentes[est.dni] = est.id;
      }
    }
  } catch (e) {
    Logger.log(`   ⚠️ Error: ${e}`);
  }
  
  return existentes;
}

// ==================== INSERTAR ESTUDIANTES ====================

function insertarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  const batchSize = 50;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    
    const paraInsertar = batch.map(e => ({
      institucion_id: parseInt(config.institucionId),
      dni: e.dni.trim(),
      nombre: e.nombres.trim(),
      apellido: e.apellido.trim(),
      telefono: e.telefono ? e.telefono.trim() : null,
      carrera_id: e.carrera_id,
      estado: "ACTIVO",
      fecha_ingreso: new Date().toISOString().split('T')[0]
    }));
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/estudiantes`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify(paraInsertar),
          muteHttpExceptions: true
        }
      );
      
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.procesados += batch.length;
      } else {
        res.errores += batch.length;
      }
    } catch (e) {
      res.errores += batch.length;
    }
    
    Utilities.sleep(200);
  }
  
  return res;
}

// ==================== ACTUALIZAR ESTUDIANTES ====================

function actualizarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  const instId = parseInt(config.institucionId);
  const batchSize = 50;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    
    for (let est of batch) {
      try {
        const payload = {
          nombre: est.nombres.trim(),
          apellido: est.apellido.trim(),
          telefono: est.telefono ? est.telefono.trim() : null,
          carrera_id: est.carrera_id,
          estado: "ACTIVO"
        };
        
        const resp = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${est.dni}&institucion_id=eq.${instId}`,
          {
            method: "patch",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          }
        );
        
        if (resp.getResponseCode() === 200) {
          res.procesados++;
        } else {
          res.errores++;
        }
      } catch (e) {
        res.errores++;
      }
    }
    
    Utilities.sleep(200);
  }
  
  return res;
}

// ==================== BUSCAR ESTUDIANTES POR ID ====================

function buscarEstudiantesById(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(e => e.dni);
  const chunkSize = 50;
  
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
          timeout: 60
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        for (let est of datos) {
          dniAId[est.dni] = est.id;
        }
      }
      
      Utilities.sleep(300);
    } catch (e) {
      Logger.log(`   ⚠️ Error: ${e}`);
    }
  }
  
  return dniAId;
}

// ==================== NORMALIZACIÓN ====================

function normalizarExcelParaCobranza() {
  Logger.log("🚀 normalizarExcelParaCobranza() iniciado");
  
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado");
    return null;
  }
  
  const file = files.next();
  const fileId = file.getId();
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  const datosNormalizadosPorInst = {};
  const dniPorInstitucion = {};
  
  const hojas = tempSpreadsheet.getSheets();
  Logger.log(`Procesando ${hojas.length} hojas...`);
  
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName();
    
    const mapeo = MAPEO_HOJAS[nombreHoja];
    if (!mapeo) {
      Logger.log(`   ⏭️ Hoja ignorada: ${nombreHoja}`);
      continue;
    }
    
    const instId = mapeo.institucion_id;
    const carreraId = mapeo.carrera_id;
    
    if (!datosNormalizadosPorInst[instId]) {
      datosNormalizadosPorInst[instId] = {
        todosLosEstudiantes: {},
        estudiantesConPagos: {},
        carreras: [carreraId],
        dnisDuplicadosRechazados: 0
      };
      dniPorInstitucion[instId] = {};
    } else {
      if (!datosNormalizadosPorInst[instId].carreras.includes(carreraId)) {
        datosNormalizadosPorInst[instId].carreras.push(carreraId);
      }
    }
    
    Logger.log(`  📄 ${nombreHoja} (inst ${instId}, carrera ${carreraId})...`);
    
    procesarHojaCobranzaConValidacionDNI(
      hoja,
      nombreHoja,
      carreraId,
      instId,
      2026,
      datosNormalizadosPorInst[instId],
      dniPorInstitucion[instId]
    );
  }
  
  Logger.log(`✅ Normalización OK`);
  return datosNormalizadosPorInst;
}

// ==================== PROCESAR HOJA CON VALIDACIÓN DNI ÚNICO ====================

function procesarHojaCobranzaConValidacionDNI(hoja, nombreHoja, carreraId, instId, año, datosInst, dniYaVistosEnInstitucion) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  const mesesExpandidos = [
    "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", 
    "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];
  
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
    
    for (let mes of mesesExpandidos) {
      if (h === `CUOTA - ${mes}` || h === `CUOTA ${mes}`) idxCuota[mes] = i;
      if (h === `SEGURO - ${mes}` || h === `SEGURO ${mes}`) idxSeguro[mes] = i;
    }
  }
  
  if (idxInsc >= 0) {
    for (let i = idxInsc + 1; i < Math.min(idxInsc + 5, headers.length); i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxInscMetodo = i;
      else if (h === "TALONARIO") idxInscTalonario = i;
    }
  }
  
  for (let mes in idxCuota) {
    const idx = idxCuota[mes];
    for (let i = idx + 1; i < Math.min(idx + 5, headers.length); i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxCuotaMetodo[mes] = i;
      else if (h === "TALONARIO") idxCuotaTalonario[mes] = i;
    }
  }
  
  for (let mes in idxSeguro) {
    const idx = idxSeguro[mes];
    for (let i = idx + 1; i < Math.min(idx + 5, headers.length); i++) {
      const h = String(headers[i]).toUpperCase().trim();
      if (h === "METODO") idxSeguroMetodo[mes] = i;
      else if (h === "TALONARIO") idxSeguroTalonario[mes] = i;
    }
  }
  
  let procesados = 0, conConceptos = 0, duplicadosRechazados = 0;
  
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    const numeroFila = r + 1;
    
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    const telefono = String(fila[idxTelefono] || "").trim().substring(0, 20);
    
    if (!apellido || !nombre) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido || "(VACÍO)",
        nombres: nombre || "(VACÍO)",
        motivo: "APELLIDO o NOMBRES VACÍO"
      });
      continue;
    }
    
    if (!dniRaw || dniRaw === "00000000") {
      dniRaw = generarDNISinDuplicados("", datosInst.todosLosEstudiantes, instId);
      if (!dniRaw) {
        SKIPPED_DETAILS.push({
          hoja: nombreHoja,
          fila: numeroFila,
          dni: "(GENERADO FALLA)",
          apellido: apellido,
          nombres: nombre,
          motivo: "Rango DNI agotado"
        });
        continue;
      }
    }
    
    if (dniYaVistosEnInstitucion[dniRaw]) {
      duplicadosRechazados++;
      datosInst.dnisDuplicadosRechazados++;
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido,
        nombres: nombre,
        motivo: `DNI DUPLICADO (ya en otra carrera de INST ${instId})`
      });
      continue;
    }
    
    dniYaVistosEnInstitucion[dniRaw] = {
      carrera: carreraId,
      nombres: nombre,
      apellido: apellido,
      fila: numeroFila,
      hoja: nombreHoja
    };
    
    if (String(dniRaw).length > 20) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido,
        nombres: nombre,
        motivo: "DNI > 20 caracteres"
      });
      continue;
    }
    
    procesados++;
    const conceptosPagados = [];
    
    // ✅ LEER TALONARIO GENERAL (si existe)
    let talonarioGeneral = "";
    if (idxInscTalonario >= 0) {
      talonarioGeneral = String(fila[idxInscTalonario] || "").trim();
    }
    
    // ✅ LEER MÉTODO GENERAL (si existe)
    let metodoGeneral = "";
    if (idxInscMetodo >= 0) {
      metodoGeneral = String(fila[idxInscMetodo] || "").trim().toUpperCase();
    }
    
    // INSCRIPCION
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      conceptosPagados.push({
        tipo: "INSCRIPCION",
        mes: null,
        montoPagado: montoPagadoInsc,
        metodo: metodoGeneral || "EFECTIVO",
        talonario: talonarioGeneral || ""
      });
    }
    
    // CUOTAS
    for (let mes in idxCuota) {
      const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
      if (montoPagado > 0) {
        const metodo = String(fila[idxCuotaMetodo[mes]] || metodoGeneral || "EFECTIVO").trim().toUpperCase();
        const talonario = String(fila[idxCuotaTalonario[mes]] || talonarioGeneral || "").trim();
        
        conceptosPagados.push({
          tipo: "CUOTA",
          mes: mes,
          montoPagado: montoPagado,
          metodo: metodo,
          talonario: talonario
        });
      }
    }
    
    // SEGUROS
    for (let mes in idxSeguro) {
      const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
      if (montoPagado > 0) {
        const metodo = String(fila[idxSeguroMetodo[mes]] || metodoGeneral || "EFECTIVO").trim().toUpperCase();
        const talonario = String(fila[idxSeguroTalonario[mes]] || talonarioGeneral || "").trim();
        
        conceptosPagados.push({
          tipo: "SEGURO",
          mes: mes,
          montoPagado: montoPagado,
          metodo: metodo,
          talonario: talonario
        });
      }
    }
    
    const estudiante = {
      dni: dniRaw,
      apellido: apellido,
      nombres: nombre,
      telefono: telefono,
      carrera_id: carreraId,
      item: fila[idxItem] || "",
      talonario: talonarioGeneral,
      metodo: metodoGeneral,
      conceptos: conceptosPagados
    };
    
    datosInst.todosLosEstudiantes[dniRaw] = estudiante;
    
    if (conceptosPagados.length > 0) {
      conConceptos++;
      datosInst.estudiantesConPagos[dniRaw] = estudiante;
    }
  }
  
  Logger.log(`   📊 Total: ${procesados}, Con pagos: ${conConceptos}, Duplicados rechazados: ${duplicadosRechazados}`);
}

function generarDNISinDuplicados(dniBase, estudiantesMap, instId) {
  if (dniBase && String(dniBase).trim() !== "" && dniBase !== "00000000") {
    return dniBase;
  }
  
  const offset = (parseInt(instId) - 1) * 100000;
  let contador = offset;
  let dniGenerado = String(contador).padStart(8, '0');
  
  while (estudiantesMap[dniGenerado]) {
    contador++;
    if (contador >= offset + 100000) {
      return null;
    }
    dniGenerado = String(contador).padStart(8, '0');
  }
  
  return dniGenerado;
}

// ==================== CARGAR CONFIGURACIÓN CARRERAS ====================

function cargarConfiguracionCarreras(config) {
  const config_carreras = {};
  
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        config_carreras[c.carrera_id] = {
          monto_inscripcion: c.monto_inscripcion,
          monto_cuota: c.monto_cuota,
          monto_seguro: c.monto_seguro
        };
      }
    }
  } catch (e) {
    Logger.log(`   ❌ Error: ${e}`);
  }
  
  return config_carreras;
}

// ==================== CARGAR CONCEPTOS ====================

function cargarConceptos(config) {
  const conceptos = {};
  
  try {
    const instId = parseInt(config.institucionId);
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=id,tipo,nombre,mes,carrera_id`,
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
        if (!conceptos[car]) {
          conceptos[car] = { inscripcion: null, seguros: {}, cuotas: {} };
        }
        
        if (c.tipo === "INSCRIPCION") {
          conceptos[car].inscripcion = c.id;
        } else if (c.tipo === "SEGURO" && c.mes) {
          const mesNombre = convertirNumeroAMesCapitalizado(c.mes);
          conceptos[car].seguros[mesNombre] = c.id;
        } else if (c.tipo === "CUOTA" && c.mes) {
          const mesNombre = convertirNumeroAMesCapitalizado(c.mes);
          conceptos[car].cuotas[mesNombre] = c.id;
        }
      }
    }
  } catch (e) {
    Logger.log(`   ❌ Error cargando conceptos: ${e}`);
  }
  
  return conceptos;
}

// ==================== CONVERTIR MES ====================

function convertirNumeroAMesCapitalizado(num) {
  const meses = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril", 5: "Mayo", 6: "Junio",
    7: "Julio", 8: "Agosto", 9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
  };
  return meses[parseInt(num)] || null;
}

// ==================== GENERAR TALONARIO ÚNICO ====================

function generarTalonarioUnico(instId, estId) {
  const clave = `${instId}_${estId}`;
  if (!TALONARIO_COUNTER[clave]) {
    TALONARIO_COUNTER[clave] = 1;
  } else {
    TALONARIO_COUNTER[clave]++;
  }
  return `TAL_${instId}_${estId}_${String(TALONARIO_COUNTER[clave]).padStart(3, '0')}`;
}

// ==================== CREAR PAGO MÚLTIPLE (CON AUTO-ASIGNACIÓN) ====================

function crearPagoMultipleAgrupado(config, estId, estudiante, conceptosPagados, conceptos, config_carreras, carreraId) {
  try {
    const instId = parseInt(config.institucionId);
    
    const detalles = [];
    let montoTotal = 0;
    
    for (let concepto of conceptosPagados) {
      let conceptoId = null;
      let montoOriginal = 0;
      
      if (concepto.tipo === "INSCRIPCION") {
        conceptoId = conceptos[carreraId]?.inscripcion;
        montoOriginal = config_carreras[carreraId]?.monto_inscripcion || 0;
      } else if (concepto.tipo === "CUOTA") {
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        conceptoId = conceptos[carreraId]?.cuotas[mesCapitalizado];
        montoOriginal = config_carreras[carreraId]?.monto_cuota || 0;
      } else if (concepto.tipo === "SEGURO") {
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        conceptoId = conceptos[carreraId]?.seguros[mesCapitalizado];
        montoOriginal = config_carreras[carreraId]?.monto_seguro || 0;
      }
      
      if (!conceptoId) continue;
      
      detalles.push({
        concepto_id: conceptoId,
        monto_original: montoOriginal,
        monto_pagado: concepto.montoPagado
      });
      
      montoTotal += concepto.montoPagado;
    }
    
    if (detalles.length === 0) {
      return { success: false, error: "Sin conceptos", conceptos_count: 0 };
    }
    
    // ✅ LÓGICA DE TALONARIO: Excel > Auto-generado
    let talonario = estudiante.talonario?.trim();
    if (!talonario || talonario === "") {
      talonario = generarTalonarioUnico(instId, estId);
    }
    
    // ✅ LÓGICA DE MÉTODO: Excel > EFECTIVO
    let metodo = estudiante.metodo?.trim();
    if (!metodo || metodo === "") {
      metodo = "EFECTIVO";
    }
    
    const payload = {
      p_institucion_id: instId,
      p_estudiante_id: estId,
      p_numero_talonario: talonario,
      p_monto_total: montoTotal,
      p_cantidad_conceptos: detalles.length,
      p_metodo_pago: metodo,
      p_fecha_cobro: new Date().toISOString().split('T')[0],
      p_descripcion: `Pago agrupado: ${detalles.length} conceptos`,
      p_detalles: detalles
    };
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
      {
        method: "post",
        headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: 30
      }
    );
    
    if (resp.getResponseCode() === 200) {
      return { success: true, conceptos_count: detalles.length };
    } else {
      return { success: false, error: resp.getContentText().substring(0, 100), conceptos_count: 0 };
    }
    
  } catch (e) {
    return { success: false, error: e.toString(), conceptos_count: 0 };
  }
}

// ==================== LOGS ====================

function guardarLogsCobranza(resultados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "INSTITUCIÓN", "TOTAL_CARGADOS", "NUEVOS", "ACTUALIZADOS", "PAGOS", "CONCEPTOS", "DNI_DUPLICADOS_RECHAZADOS", "ERRORES"]);
    }
    
    for (let instId in resultados) {
      const r = resultados[instId];
      logSheet.appendRow([
        new Date().toLocaleString('es-AR'),
        instId,
        r.estudiantesCargados,
        r.estudiantesNuevos || 0,
        r.estudiantesActualizados || 0,
        r.pagosMultiplesCreados,
        r.conceptosAgrupados,
        r.dnisDuplicadosRechazados || 0,
        r.errores
      ]);
    }
  } catch (e) {
    Logger.log("⚠️ Error guardando logs: " + e);
  }
}

function guardarEstadoSincronizacion(estado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(ESTADO_SYNC_SHEET);
    if (!hoja) {
      hoja = ss.insertSheet(ESTADO_SYNC_SHEET);
      hoja.appendRow(["FECHA", "TOTAL_CARGADOS", "NUEVOS", "ACTUALIZADOS", "PAGOS", "DNI_DUPLICADOS_RECHAZADOS", "ERRORES"]);
    }
    
    hoja.appendRow([
      estado.fecha,
      estado.estudiantes_cargados,
      estado.estudiantes_nuevos,
      estado.estudiantes_actualizados,
      estado.pagos_creados,
      estado.dnis_duplicados_rechazados || 0,
      estado.errores
    ]);
  } catch (e) {
    Logger.log("⚠️ Error: " + e);
  }
}

function guardarSkippedDetails() {
  try {
    if (SKIPPED_DETAILS.length === 0) return;
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(SKIPPED_SHEET_NAME);
    if (!hoja) {
      hoja = ss.insertSheet(SKIPPED_SHEET_NAME);
      hoja.appendRow(["HOJA", "FILA", "DNI", "APELLIDO", "NOMBRES", "MOTIVO"]);
    } else {
      hoja.clearContents();
      hoja.appendRow(["HOJA", "FILA", "DNI", "APELLIDO", "NOMBRES", "MOTIVO"]);
    }
    
    const filasSkipped = SKIPPED_DETAILS.map(d => [d.hoja, d.fila, d.dni, d.apellido, d.nombres, d.motivo]);
    if (filasSkipped.length > 0) {
      hoja.getRange(2, 1, filasSkipped.length, 6).setValues(filasSkipped);
    }
  } catch (e) {
    Logger.log(`⚠️ Error: ${e}`);
  }
}

function mostrarLogsManual() {
  try {
    SpreadsheetApp.getUi().alert("Ver hoja: " + LOG_SHEET_NAME);
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function limpiarLogs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    [LOG_SHEET_NAME, SKIPPED_SHEET_NAME, ESTADO_SYNC_SHEET].forEach(nombre => {
      const hoja = ss.getSheetByName(nombre);
      if (hoja) {
        ss.deleteSheet(hoja);
      }
    });
    SpreadsheetApp.getUi().alert("✅ Logs limpiados");
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function ejecutarCobranzaAgrupada() {
  sincronizarInteligente();
}
