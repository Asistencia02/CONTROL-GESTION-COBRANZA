// ==================== GOOGLE APPS SCRIPT v3.0 - OPTIMIZADO CON LOGS COMPLETOS ====================
// ✅ v3.0: Caching, Batch RPC, Sleep configurable, Logging exhaustivo
// ✅ Mantiene funcionalidades v2.28: Deduplicación DNI, Pago múltiple, Skipped details

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const SKIPPED_SHEET_NAME = "SKIPPED_DETAILS";
const ESTADO_SYNC_SHEET = "ESTADO_SINCRONIZACION";
const ERRORES_SHEET_NAME = "ERRORES_DETALLADOS";

const MAPEO_HOJAS = {
  "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
  "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
  "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
  "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
  "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
};

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

// ==================== CONFIGURACIÓN DE SLEEP (OPTIMIZADO) ====================
const SLEEP_CONFIG = {
  afterBatchInsert: 1000,      // Después de insertar batch de 100
  afterBatchUpdate: 800,       // Después de actualizar batch
  afterSearchRPC: 500,         // Después de search_estudiantes_by_dni
  betweenRequests: 300,        // Entre requests normales
  afterBigRPC: 1200            // Después de RPC pesado (pago múltiple)
};

// ==================== VARIABLES GLOBALES ====================
let SKIPPED_DETAILS = [];
let ERRORES_DETALLES = [];
let STATS_GLOBAL = {
  totalFetches: 0,
  totalSleep: 0,
  tiempoInicio: 0
};

// ==================== FUNCIONES AUXILIARES ====================

function sleepConConfig(tipo) {
  const ms = SLEEP_CONFIG[tipo] || 500;
  Utilities.sleep(ms);
  STATS_GLOBAL.totalSleep += ms;
}

function logConTiempo(mensaje) {
  const elapsed = Date.now() - STATS_GLOBAL.tiempoInicio;
  Logger.log(`[${elapsed}ms] ${mensaje}`);
}

function registrarError(contexto, dni, apellido, nombre, error) {
  const msg = `${contexto} | DNI: ${dni} | ${apellido}, ${nombre} | Error: ${error}`;
  Logger.log(`❌ ${msg}`);
  ERRORES_DETALLES.push({
    timestamp: new Date().toISOString(),
    contexto: contexto,
    dni: dni,
    apellido: apellido,
    nombres: nombre,
    error: error.toString().substring(0, 200)
  });
}

// ==================== MENÚ ====================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 SINCRONIZACIÓN COBRANZA v3.0')
      .addItem('▶️ SINCRONIZAR (DNI ÚNICO)', 'sincronizarInteligente')
      .addItem('▶️ SINCRONIZACIÓN COMPLETA', 'ejecutarCobranzaAgrupada')
      .addSeparator()
      .addItem('📋 Ver Logs', 'mostrarLogsManual')
      .addItem('📋 Ver Errores', 'mostrarErroresManual')
      .addItem('🗑️ Limpiar Logs', 'limpiarLogs')
      .addToUi();
  } catch (e) {
    Logger.log("❌ onOpen error: " + e);
  }
}

// ==================== FUNCIÓN EJECUTABLE DESDE TRIGGER ====================

function sincronizarDesdeGoogleSheets() {
  try {
    STATS_GLOBAL.tiempoInicio = Date.now();
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 SINCRONIZACIÓN DESDE GOOGLE SHEETS v3.0 (DNI ÚNICO + OPTIMIZADO)");
    Logger.log("=".repeat(80));
    
    const resultado = sincronizarCobranzaInteligente();
    
    const elapsed = Date.now() - STATS_GLOBAL.tiempoInicio;
    if (resultado.exito) {
      Logger.log("\n✅ SINCRONIZACIÓN COMPLETADA");
      Logger.log(`Estudiantes cargados: ${resultado.estudiantesCargados}`);
      Logger.log(`Estudiantes nuevos: ${resultado.estudiantesNuevos}`);
      Logger.log(`Estudiantes actualizados: ${resultado.estudiantesActualizados}`);
      Logger.log(`Pagos creados: ${resultado.pagosCreados}`);
      Logger.log(`Conceptos agrupados: ${resultado.conceptosAgrupados}`);
      Logger.log(`DNIs duplicados rechazados: ${resultado.dnisDuplicadosRechazados}`);
      Logger.log(`Errores: ${resultado.errores}`);
      Logger.log(`\n📊 ESTADÍSTICAS TÉCNICAS:`);
      Logger.log(`   - Total fetches API: ${STATS_GLOBAL.totalFetches}`);
      Logger.log(`   - Total sleep: ${STATS_GLOBAL.totalSleep}ms`);
      Logger.log(`   - Tiempo total: ${elapsed}ms`);
    } else {
      Logger.log("\n❌ SINCRONIZACIÓN FALLIDA: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR CRÍTICO: " + error);
    registrarError("sincronizarDesdeGoogleSheets", "N/A", "N/A", "N/A", error);
  }
}

// ==================== FUNCIÓN MANUAL (desde menú) ====================

function sincronizarInteligente() {
  try {
    STATS_GLOBAL.tiempoInicio = Date.now();
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 v3.0 - SINCRONIZACIÓN INTELIGENTE (DNI ÚNICO + OPTIMIZADO)");
    Logger.log("=".repeat(80));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Sincronizando... (3-8 minutos)</p>'),
      '🔄 Sincronización v3.0'
    );
    
    const resultado = sincronizarCobranzaInteligente();
    
    const elapsed = Date.now() - STATS_GLOBAL.tiempoInicio;
    
    if (resultado.exito) {
      let resumen = "✅ SINCRONIZACIÓN COMPLETADA v3.0\n\n";
      resumen += `• Instituciones: ${Object.keys(resultado.resultados).length}\n`;
      resumen += `• Total estudiantes cargados: ${resultado.estudiantesCargados}\n`;
      resumen += `• Estudiantes nuevos: ${resultado.estudiantesNuevos}\n`;
      resumen += `• Estudiantes actualizados: ${resultado.estudiantesActualizados}\n`;
      resumen += `• Pagos creados (con conceptos): ${resultado.pagosCreados}\n`;
      resumen += `• Conceptos agrupados: ${resultado.conceptosAgrupados}\n`;
      resumen += `• DNIs duplicados rechazados: ${resultado.dnisDuplicadosRechazados}\n`;
      resumen += `• Errores: ${resultado.errores}\n`;
      resumen += `• Registros skipped: ${SKIPPED_DETAILS.length}\n`;
      resumen += `• Errores detallados: ${ERRORES_DETALLES.length}\n`;
      
      for (let instId in resultado.resultados) {
        const sync = resultado.resultados[instId];
        resumen += `\n📦 INSTITUCIÓN ${instId}:\n`;
        resumen += `   👥 Estudiantes cargados: ${sync.estudiantesCargados}\n`;
        resumen += `   ✨ Nuevos: ${sync.estudiantesNuevos}\n`;
        resumen += `   💰 Pagos: ${sync.pagosMultiplesCreados}\n`;
        resumen += `   ⚠️ Duplicados: ${sync.dnisDuplicadosRechazados}\n`;
      }
      
      resumen += `\n⏱️ RENDIMIENTO:\n`;
      resumen += `   - Tiempo total: ${(elapsed/1000).toFixed(2)}s\n`;
      resumen += `   - Llamadas API: ${STATS_GLOBAL.totalFetches}\n`;
      resumen += `   - Sleep total: ${STATS_GLOBAL.totalSleep}ms\n`;
      resumen += `\nFecha: ${new Date().toLocaleString('es-AR')}`;
      ui.alert(resumen);
    } else {
      ui.alert("❌ Error: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    registrarError("sincronizarInteligente", "N/A", "N/A", "N/A", error);
    SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
  }
}

// ==================== SINCRONIZACIÓN INTELIGENTE (NÚCLEO) ====================

function sincronizarCobranzaInteligente() {
  try {
    logConTiempo("📋 FASE 1: Normalizando datos del Excel...");
    SKIPPED_DETAILS = [];
    ERRORES_DETALLES = [];
    
    const datosNormalizados = normalizarExcelParaCobranza();
    if (!datosNormalizados || Object.keys(datosNormalizados).length === 0) {
      registrarError("sincronizarCobranzaInteligente", "N/A", "N/A", "N/A", "Error en normalización");
      return { exito: false, mensaje: "Error en normalización", resultados: {}, dnisDuplicadosRechazados: 0 };
    }
    
    logConTiempo(`✅ Instituciones detectadas: ${Object.keys(datosNormalizados).join(", ")}`);
    
    let estudiantesCargados = 0, estudiantesNuevos = 0, estudiantesActualizados = 0, pagosCreados = 0, erroresTotal = 0, dnisDuplicadosRechazados = 0, conceptosAgrupados = 0;
    
    logConTiempo("🔄 FASE 2: Procesando cobranza (DNI ÚNICO)...");
    const resultados = {};
    
    for (let instId in datosNormalizados) {
      const datosInst = datosNormalizados[instId];
      const config = {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_KEY,
        institucionId: instId
      };
      
      logConTiempo(`\n   🔄 Institución ${instId}...`);
      const res = procesarCobranzaPorInstitucionInteligente(config, datosInst);
      resultados[instId] = res;
      
      estudiantesCargados += res.estudiantesCargados || 0;
      estudiantesNuevos += res.estudiantesNuevos || 0;
      estudiantesActualizados += res.estudiantesActualizados || 0;
      pagosCreados += res.pagosMultiplesCreados || 0;
      conceptosAgrupados += res.conceptosAgrupados || 0;
      erroresTotal += res.errores || 0;
      dnisDuplicadosRechazados += res.dnisDuplicadosRechazados || 0;
    }
    
    logConTiempo("📝 FASE 3: Guardando logs...");
    guardarLogsCobranza(resultados);
    guardarSkippedDetails();
    guardarErroresDetalles();
    guardarEstadoSincronizacion({
      fecha: new Date().toISOString(),
      estudiantes_cargados: estudiantesCargados,
      estudiantes_nuevos: estudiantesNuevos,
      estudiantes_actualizados: estudiantesActualizados,
      pagos_creados: pagosCreados,
      conceptos_agrupados: conceptosAgrupados,
      dnis_duplicados_rechazados: dnisDuplicadosRechazados,
      errores: erroresTotal,
      skipped_count: SKIPPED_DETAILS.length,
      errores_count: ERRORES_DETALLES.length
    });
    
    logConTiempo("✅ SINCRONIZACIÓN COMPLETADA");
    return { 
      exito: true, 
      resultados: resultados,
      estudiantesCargados,
      estudiantesNuevos,
      estudiantesActualizados,
      pagosCreados,
      conceptosAgrupados,
      dnisDuplicadosRechazados,
      errores: erroresTotal
    };
    
  } catch (error) {
    Logger.log("❌ ERROR CRÍTICO: " + error);
    registrarError("sincronizarCobranzaInteligente", "N/A", "N/A", "N/A", error);
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
  
  logConTiempo(`   👥 Total estudiantes: ${todosLosEstudiantes.length}`);
  logConTiempo(`   💰 Con conceptos pagados: ${estudiantesConPagos.length}`);
  logConTiempo(`   ⚠️ DNIs duplicados rechazados: ${resultados.dnisDuplicadosRechazados}`);
  
  // ✅ OPTIMIZACIÓN: Obtener estudiantes existentes UNA VEZ
  logConTiempo(`   🔍 Obteniendo estudiantes existentes...`);
  const estudiantesExistentes = obtenerEstudiantesExistentes(config);
  logConTiempo(`   ✅ ${Object.keys(estudiantesExistentes).length} existentes en BD`);
  
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
  
  logConTiempo(`   📊 Nuevos: ${estudiantesNuevos.length}, Existentes: ${estudiantesExistentesAActualizar.length}`);
  
  // ✅ INSERT con batch aumentado
  if (estudiantesNuevos.length > 0) {
    logConTiempo(`   📝 Insertando ${estudiantesNuevos.length} nuevos (batch 100)...`);
    const resInsert = insertarEstudiantesBatch(config, estudiantesNuevos);
    resultados.estudiantesNuevos = resInsert.procesados;
    resultados.errores += resInsert.errores;
    logConTiempo(`   ✅ Insertados: ${resInsert.procesados}, Errores: ${resInsert.errores}`);
    sleepConConfig("afterBatchInsert");
  }
  
  // ✅ UPDATE con batch RPC
  if (estudiantesExistentesAActualizar.length > 0) {
    logConTiempo(`   ✏️ Actualizando ${estudiantesExistentesAActualizar.length} (batch RPC)...`);
    const resUpdate = actualizarEstudiantesBatch(config, estudiantesExistentesAActualizar);
    resultados.estudiantesActualizados = resUpdate.procesados;
    resultados.errores += resUpdate.errores;
    logConTiempo(`   ✅ Actualizados: ${resUpdate.procesados}, Errores: ${resUpdate.errores}`);
    sleepConConfig("afterBatchUpdate");
  }
  
  resultados.estudiantesCargados = todosLosEstudiantes.length;
  
  // ✅ BÚSQUEDA DE IDs (crítica para pagos)
  logConTiempo(`   🔍 Buscando IDs en BD para crear pagos...`);
  const dniAId = buscarEstudiantesById(config, estudiantesConPagos);
  logConTiempo(`   ✅ Encontrados: ${Object.keys(dniAId).length}/${estudiantesConPagos.length}`);
  
  // Loguear DNIs con pagos que NO se encontraron en BD
  for (let estudiante of estudiantesConPagos) {
    if (!dniAId[estudiante.dni]) {
      registrarError(
        "PAGO_SIN_ESTUDIANTE_EN_BD",
        estudiante.dni,
        estudiante.apellido,
        estudiante.nombres,
        `DNI en Excel con conceptos pagados, pero NO existe en BD (o no se encontró)`
      );
      SKIPPED_DETAILS.push({
        hoja: "(PAGOS)",
        fila: 0,
        dni: estudiante.dni,
        apellido: estudiante.apellido,
        nombres: estudiante.nombres,
        motivo: "DNI con pagos, pero NO existe en BD"
      });
    }
  }
  
  if (Object.keys(dniAId).length === 0) {
    logConTiempo(`   ⚠️ No hay estudiantes con pagos para crear`);
    return resultados;
  }
  
  // ✅ CACHING: Cargar conceptos y configuración UNA VEZ
  logConTiempo(`   💰 Cargando configuración (CACHED)...`);
  const config_carreras = cargarConfiguracionCarreras(config);
  const conceptos = cargarConceptos(config);
  
  logConTiempo(`\n   📚 CONCEPTOS CARGADOS POR CARRERA (CACHE):`);
  for (let car in conceptos) {
    const inscId = conceptos[car].inscripcion;
    const cuotasCount = Object.keys(conceptos[car].cuotas).length;
    const segurosCount = Object.keys(conceptos[car].seguros).length;
    logConTiempo(`      Carrera ${car}: INSC=${inscId}, CUOTAS=${cuotasCount}, SEGUROS=${segurosCount}`);
    if (cuotasCount > 0) {
      const cuotasMeses = Object.entries(conceptos[car].cuotas).map(([m,id]) => `${m}:${id}`).join(", ");
      logConTiempo(`         Cuotas: ${cuotasMeses}`);
    }
  }
  
  logConTiempo(`\n   💳 Creando pagos múltiples (reutilizando cache)...`);
  for (let estudiante of estudiantesConPagos) {
    const estId = dniAId[estudiante.dni];
    if (!estId) {
      logConTiempo(`   ⚠️ DNI ${estudiante.dni}: No encontrado en mapa (saltado)`);
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
      resultados.pagosMultiplesCreados += 1;
      resultados.conceptosAgrupados += resultado.conceptos_count;
    } else {
      resultados.errores += 1;
      registrarError(
        "PAGO_MULTIPLE_FALLO",
        estudiante.dni,
        estudiante.apellido,
        estudiante.nombres,
        resultado.error
      );
    }
  }
  
  return resultados;
}

// ==================== OBTENER ESTUDIANTES EXISTENTES ====================

function obtenerEstudiantesExistentes(config) {
  const existentes = {};
  const instId = parseInt(config.institucionId);
  
  try {
    logConTiempo(`      → Fetch: GET /estudiantes?institucion_id=eq.${instId}`);
    STATS_GLOBAL.totalFetches++;
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/estudiantes?institucion_id=eq.${instId}&select=dni,id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      logConTiempo(`      ✅ Parseado: ${datos.length} estudiantes`);
      for (let est of datos) {
        existentes[est.dni] = est.id;
      }
    } else {
      registrarError(
        "GET_ESTUDIANTES_EXISTENTES",
        "N/A",
        "N/A",
        "N/A",
        `HTTP ${resp.getResponseCode()}: ${resp.getContentText().substring(0, 100)}`
      );
    }
  } catch (e) {
    registrarError("GET_ESTUDIANTES_EXISTENTES", "N/A", "N/A", "N/A", e.toString());
    logConTiempo(`   ⚠️ Error: ${e}`);
  }
  
  return existentes;
}

// ==================== INSERTAR ESTUDIANTES (BATCH AUMENTADO) ====================

function insertarEstudiantesBatch(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  
  const batchSize = 100; // ✅ Aumentado de 50 a 100
  
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
      logConTiempo(`      → Fetch: POST /estudiantes (batch ${batch.length}/${estudiantes.length})`);
      STATS_GLOBAL.totalFetches++;
      
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/estudiantes`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify(paraInsertar),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
      
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.procesados += batch.length;
        logConTiempo(`      ✅ Insertados: ${batch.length}`);
      } else {
        res.errores += batch.length;
        const error = resp.getContentText().substring(0, 100);
        registrarError("INSERT_ESTUDIANTES_BATCH", "BATCH", "BATCH", "BATCH", `HTTP ${resp.getResponseCode()}: ${error}`);
        logConTiempo(`      ❌ Error batch: ${error}`);
      }
    } catch (e) {
      res.errores += batch.length;
      registrarError("INSERT_ESTUDIANTES_BATCH", "BATCH", "BATCH", "BATCH", e.toString());
      logConTiempo(`      ❌ Exception: ${e}`);
    }
    
    sleepConConfig("betweenRequests");
  }
  
  return res;
}

// ==================== ACTUALIZAR ESTUDIANTES (RPC BATCH) ====================

function actualizarEstudiantesBatch(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  
  const batchSize = 50;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    
    const paraActualizar = batch.map(e => ({
      dni: e.dni,
      nombre: e.nombres.trim(),
      apellido: e.apellido.trim(),
      telefono: e.telefono ? e.telefono.trim() : null,
      carrera_id: e.carrera_id
    }));
    
    try {
      logConTiempo(`      → Fetch: POST /rpc/actualizar_estudiantes_batch (batch ${batch.length}/${estudiantes.length})`);
      STATS_GLOBAL.totalFetches++;
      
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/actualizar_estudiantes_batch`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify({ p_estudiantes: paraActualizar }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
      
      if (resp.getResponseCode() === 200) {
        res.procesados += batch.length;
        logConTiempo(`      ✅ Actualizados: ${batch.length}`);
      } else {
        res.errores += batch.length;
        const error = resp.getContentText().substring(0, 100);
        registrarError("UPDATE_ESTUDIANTES_BATCH", "BATCH", "BATCH", "BATCH", `HTTP ${resp.getResponseCode()}: ${error}`);
        logConTiempo(`      ❌ Error batch: ${error}`);
      }
    } catch (e) {
      res.errores += batch.length;
      registrarError("UPDATE_ESTUDIANTES_BATCH", "BATCH", "BATCH", "BATCH", e.toString());
      logConTiempo(`      ❌ Exception: ${e}`);
    }
    
    sleepConConfig("betweenRequests");
  }
  
  return res;
}

// ==================== BUSCAR ESTUDIANTES POR ID ====================

function buscarEstudiantesById(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(e => e.dni);
  
  const chunkSize = 100; // ✅ Aumentado de 50 a 100
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    
    try {
      logConTiempo(`      → Fetch: POST /rpc/search_estudiantes_by_dni (chunk ${chunk.length}/${dnis.length})`);
      STATS_GLOBAL.totalFetches++;
      
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
      
      logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        logConTiempo(`      ✅ Encontrados: ${datos.length}/${chunk.length}`);
        for (let est of datos) {
          dniAId[est.dni] = est.id;
        }
        // Loguear los que NO se encontraron
        for (let dni of chunk) {
          if (!dniAId[dni]) {
            logConTiempo(`      ⚠️ DNI NO ENCONTRADO EN BD: ${dni}`);
          }
        }
      } else {
        const error = resp.getContentText().substring(0, 100);
        registrarError("SEARCH_ESTUDIANTES_BY_DNI", "CHUNK", "CHUNK", "CHUNK", `HTTP ${resp.getResponseCode()}: ${error}`);
        logConTiempo(`      ❌ Error: ${error}`);
      }
      
      sleepConConfig("afterSearchRPC");
    } catch (e) {
      registrarError("SEARCH_ESTUDIANTES_BY_DNI", "CHUNK", "CHUNK", "CHUNK", e.toString());
      logConTiempo(`      ❌ Exception: ${e}`);
    }
  }
  
  return dniAId;
}

// ==================== NORMALIZACIÓN ====================

function normalizarExcelParaCobranza() {
  logConTiempo("🚀 normalizarExcelParaCobranza() iniciado");
  
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    registrarError("NORMALIZACION", "N/A", "N/A", "N/A", `Archivo no encontrado: ${nombreArchivo}`);
    logConTiempo("❌ Archivo no encontrado");
    return null;
  }
  
  const file = files.next();
  const fileId = file.getId();
  logConTiempo(`✅ Archivo encontrado: ${fileId}`);
  
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  const datosNormalizadosPorInst = {};
  const dniPorInstitucion = {};
  
  const hojas = tempSpreadsheet.getSheets();
  logConTiempo(`Procesando ${hojas.length} hojas...`);
  
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName();
    
    const mapeo = MAPEO_HOJAS[nombreHoja];
    if (!mapeo) {
      logConTiempo(`   ⏭️ Hoja ignorada: ${nombreHoja}`);
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
      logConTiempo(`   ✅ Institución ${instId} inicializada`);
    } else {
      if (!datosNormalizadosPorInst[instId].carreras.includes(carreraId)) {
        datosNormalizadosPorInst[instId].carreras.push(carreraId);
      }
    }
    
    logConTiempo(`  📄 ${nombreHoja} (inst ${instId}, carrera ${carreraId})...`);
    
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
  
  logConTiempo(`✅ Normalización OK. Total instituciones: ${Object.keys(datosNormalizadosPorInst).length}`);
  return datosNormalizadosPorInst;
}

// ==================== PROCESAR HOJA CON VALIDACIÓN DNI ÚNICO ====================

function procesarHojaCobranzaConValidacionDNI(hoja, nombreHoja, carreraId, instId, año, datosInst, dniYaVistosEnInstitucion) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) {
    logConTiempo(`   ⚠️ Hoja vacía o sin datos`);
    return;
  }
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  logConTiempo(`   📄 Headers fila 1 (${headers.length} cols): ${headers.slice(0, 10).join(" | ")}...`);
  
  const mesesExpandidos = [
    "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", 
    "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
  ];
  
  let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1, idxTelefono = -1;
  let idxInsc = -1, idxInscMetodo = -1, idxInscTalonario = -1;
  
  const idxCuota = {}, idxCuotaMetodo = {}, idxCuotaTalonario = {};
  const idxSeguro = {}, idxSeguroMetodo = {}, idxSeguroTalonario = {};
  
  // BÚSQUEDA DE HEADERS
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    if (h.includes("ITEM")) idxItem = i;
    else if (h === "APELLIDO") idxApellido = i;
    else if (h === "NOMBRES") idxNombres = i;
    else if (h === "DNI") idxDNI = i;
    else if (h === "TELEFONO") idxTelefono = i;
    else if (h === "INSCRIPCION") {
      idxInsc = i;
      logConTiempo(`   ✅ INSCRIPCION en índice ${i}`);
    }
    
    for (let mes of mesesExpandidos) {
      if (h === `CUOTA - ${mes}` || h === `CUOTA ${mes}`) {
        idxCuota[mes] = i;
      }
      if (h === `SEGURO - ${mes}` || h === `SEGURO ${mes}`) {
        idxSeguro[mes] = i;
      }
    }
  }
  
  // Buscar METODO y TALONARIO
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
  
  logConTiempo(`   📊 CUOTAS encontradas: ${Object.keys(idxCuota).join(", ")}`);
  logConTiempo(`   📊 SEGUROS encontrados: ${Object.keys(idxSeguro).join(", ")}`);
  
  let procesados = 0;
  let conConceptos = 0;
  let duplicadosRechazados = 0;
  let saltadosPorValidacion = 0;
  
  // PROCESAR FILAS
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    const numeroFila = r + 1;
    
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    const telefono = String(fila[idxTelefono] || "").trim().substring(0, 20);
    
    // ✅ VALIDACIÓN: Apellido y nombres no vacíos
    if (!apellido || !nombre) {
      saltadosPorValidacion++;
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw || "(VACÍO)",
        apellido: apellido || "(VACÍO)",
        nombres: nombre || "(VACÍO)",
        motivo: "APELLIDO o NOMBRES VACÍO"
      });
      logConTiempo(`   ⚠️ Fila ${numeroFila}: APELLIDO/NOMBRES vacío`);
      continue;
    }
    
    // ✅ VALIDACIÓN: DNI vacío o 00000000
    if (!dniRaw || dniRaw === "00000000") {
      dniRaw = generarDNISinDuplicados("", datosInst.todosLosEstudiantes, instId);
      if (!dniRaw) {
        saltadosPorValidacion++;
        SKIPPED_DETAILS.push({
          hoja: nombreHoja,
          fila: numeroFila,
          dni: "(GENERADO FALLA)",
          apellido: apellido,
          nombres: nombre,
          motivo: "Rango DNI agotado (no se pudo generar)"
        });
        logConTiempo(`   ❌ Fila ${numeroFila}: Rango DNI agotado`);
        continue;
      }
      logConTiempo(`   ℹ️ Fila ${numeroFila}: DNI generado: ${dniRaw}`);
    }
    
    // ✅ VALIDACIÓN: DNI duplicado por institución
    if (dniYaVistosEnInstitucion[dniRaw]) {
      duplicadosRechazados++;
      datosInst.dnisDuplicadosRechazados++;
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido,
        nombres: nombre,
        motivo: `DNI DUPLICADO (ya en carrera ${dniYaVistosEnInstitucion[dniRaw].carrera} de INST ${instId})`
      });
      logConTiempo(`   ⚠️ Fila ${numeroFila}: DNI DUPLICADO: ${dniRaw} (ya registrado)`);
      continue;
    }
    
    // ✅ VALIDACIÓN: DNI muy largo
    if (String(dniRaw).length > 20) {
      saltadosPorValidacion++;
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: numeroFila,
        dni: dniRaw,
        apellido: apellido,
        nombres: nombre,
        motivo: `DNI > 20 caracteres (${dniRaw.length})`
      });
      logConTiempo(`   ⚠️ Fila ${numeroFila}: DNI muy largo (${dniRaw.length} chars)`);
      continue;
    }
    
    // ✅ MARCAR DNI COMO VISTO EN ESTA INSTITUCIÓN
    dniYaVistosEnInstitucion[dniRaw] = {
      carrera: carreraId,
      nombres: nombre,
      apellido: apellido,
      fila: numeroFila,
      hoja: nombreHoja
    };
    
    procesados++;
    
    const conceptosPagados = [];
    
    // INSCRIPCION
    const montoPagadoInsc = parseInt(fila[idxInsc]) || 0;
    if (montoPagadoInsc > 0) {
      const metodoInsc = String(fila[idxInscMetodo] || "EFECTIVO").trim().toUpperCase();
      const talonarioInsc = String(fila[idxInscTalonario] || "").trim();
      
      conceptosPagados.push({
        tipo: "INSCRIPCION",
        mes: null,
        montoPagado: montoPagadoInsc,
        metodo: metodoInsc,
        talonario: talonarioInsc
      });
    }
    
    // CUOTAS
    for (let mes in idxCuota) {
      const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
      if (montoPagado > 0) {
        const metodoCuota = String(fila[idxCuotaMetodo[mes]] || "EFECTIVO").trim().toUpperCase();
        const talonarioCuota = String(fila[idxCuotaTalonario[mes]] || "").trim();
        
        conceptosPagados.push({
          tipo: "CUOTA",
          mes: mes,
          montoPagado: montoPagado,
          metodo: metodoCuota,
          talonario: talonarioCuota
        });
      }
    }
    
    // SEGUROS
    for (let mes in idxSeguro) {
      const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
      if (montoPagado > 0) {
        const metodoSeguro = String(fila[idxSeguroMetodo[mes]] || "EFECTIVO").trim().toUpperCase();
        const talonarioSeguro = String(fila[idxSeguroTalonario[mes]] || "").trim();
        
        conceptosPagados.push({
          tipo: "SEGURO",
          mes: mes,
          montoPagado: montoPagado,
          metodo: metodoSeguro,
          talonario: talonarioSeguro
        });
      }
    }
    
    // AGREGAR ESTUDIANTE
    const estudiante = {
      dni: dniRaw,
      apellido: apellido,
      nombres: nombre,
      telefono: telefono,
      carrera_id: carreraId,
      item: fila[idxItem] || "",
      conceptos: conceptosPagados
    };
    
    datosInst.todosLosEstudiantes[dniRaw] = estudiante;
    
    if (conceptosPagados.length > 0) {
      conConceptos++;
      datosInst.estudiantesConPagos[dniRaw] = estudiante;
      logConTiempo(`   ✅ Fila ${numeroFila}: ${nombre} ${apellido} - ${conceptosPagados.length} conceptos`);
    }
  }
  
  logConTiempo(`   📊 RESUMEN ${nombreHoja}: ${procesados} procesados, ${conConceptos} con pagos, ${duplicadosRechazados} duplicados, ${saltadosPorValidacion} saltados`);
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
      registrarError("GENERAR_DNI", "N/A", "N/A", "N/A", `Rango agotado para institución ${instId}`);
      return null;
    }
    dniGenerado = String(contador).padStart(8, '0');
  }
  
  return dniGenerado;
}

// ==================== CARGAR CONFIGURACIÓN CARRERAS (CACHED) ====================

function cargarConfiguracionCarreras(config) {
  const config_carreras = {};
  
  try {
    const instId = parseInt(config.institucionId);
    logConTiempo(`      → Fetch: GET /configuracion_carreras?institucion_id=eq.${instId}`);
    STATS_GLOBAL.totalFetches++;
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/configuracion_carreras?institucion_id=eq.${instId}`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      logConTiempo(`      ✅ Cargadas ${datos.length} carreras`);
      for (let c of datos) {
        config_carreras[c.carrera_id] = {
          monto_inscripcion: c.monto_inscripcion,
          monto_cuota: c.monto_cuota,
          monto_seguro: c.monto_seguro
        };
        logConTiempo(`         Carrera ${c.carrera_id}: INSC=${c.monto_inscripcion}, CUOTA=${c.monto_cuota}, SEGURO=${c.monto_seguro}`);
      }
    } else {
      registrarError("CARGAR_CONFIG_CARRERAS", "N/A", "N/A", "N/A", `HTTP ${resp.getResponseCode()}`);
    }
  } catch (e) {
    registrarError("CARGAR_CONFIG_CARRERAS", "N/A", "N/A", "N/A", e.toString());
    logConTiempo(`   ❌ Error: ${e}`);
  }
  
  return config_carreras;
}

// ==================== CARGAR CONCEPTOS (CACHED) ====================

function cargarConceptos(config) {
  const conceptos = {};
  
  try {
    const instId = parseInt(config.institucionId);
    logConTiempo(`      → Fetch: GET /conceptos_pago?institucion_id=eq.${instId}`);
    STATS_GLOBAL.totalFetches++;
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=id,tipo,nombre,mes,carrera_id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      logConTiempo(`      ✅ Cargados ${datos.length} conceptos`);
      for (let c of datos) {
        const car = c.carrera_id;
        if (!conceptos[car]) {
          conceptos[car] = { inscripcion: null, seguros: {}, cuotas: {} };
        }
        
        if (c.tipo === "INSCRIPCION") {
          conceptos[car].inscripcion = c.id;
          logConTiempo(`         Carrera ${car} INSCRIPCION: ${c.id}`);
        } else if (c.tipo === "SEGURO" && c.mes) {
          const mesNombre = convertirNumeroAMesCapitalizado(c.mes);
          conceptos[car].seguros[mesNombre] = c.id;
        } else if (c.tipo === "CUOTA" && c.mes) {
          const mesNombre = convertirNumeroAMesCapitalizado(c.mes);
          conceptos[car].cuotas[mesNombre] = c.id;
        }
      }
    } else {
      registrarError("CARGAR_CONCEPTOS", "N/A", "N/A", "N/A", `HTTP ${resp.getResponseCode()}`);
    }
  } catch (e) {
    registrarError("CARGAR_CONCEPTOS", "N/A", "N/A", "N/A", e.toString());
    logConTiempo(`   ❌ Error cargando conceptos: ${e}`);
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

function convertirMesANumero(mesDato) {
  if (!mesDato) return null;
  const m = mesDato.toString().trim().toUpperCase();
  const meses = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4, "MAYO": 5, "JUNIO": 6,
    "JULIO": 7, "AGOSTO": 8, "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12
  };
  return meses[m] || null;
}

// ==================== CREAR PAGO MÚLTIPLE (REUTILIZA CACHE) ====================

function crearPagoMultipleAgrupado(config, estId, estudiante, conceptosPagados, conceptos, config_carreras, carreraId) {
  try {
    const instId = parseInt(config.institucionId);
    
    const detalles = [];
    let montoTotal = 0;
    let conceptosValidos = 0;
    let conceptosMissingId = 0;
    
    for (let concepto of conceptosPagados) {
      let conceptoId = null;
      let montoOriginal = 0;
      
      if (concepto.tipo === "INSCRIPCION") {
        conceptoId = conceptos[carreraId]?.inscripcion;
        montoOriginal = config_carreras[carreraId]?.monto_inscripcion || 0;
        logConTiempo(`      📝 INSC: conceptoId=${conceptoId}, monto=${montoOriginal}`);
      } else if (concepto.tipo === "CUOTA") {
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        conceptoId = conceptos[carreraId]?.cuotas[mesCapitalizado];
        montoOriginal = config_carreras[carreraId]?.monto_cuota || 0;
        logConTiempo(`      📝 CUOTA ${concepto.mes} → ${mesCapitalizado}: id=${conceptoId}`);
      } else if (concepto.tipo === "SEGURO") {
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        conceptoId = conceptos[carreraId]?.seguros[mesCapitalizado];
        montoOriginal = config_carreras[carreraId]?.monto_seguro || 0;
        logConTiempo(`      📝 SEGURO ${concepto.mes} → ${mesCapitalizado}: id=${conceptoId}`);
      }
      
      if (!conceptoId) {
        conceptosMissingId++;
        const mesCapitalizado = concepto.mes ? concepto.mes.charAt(0) + concepto.mes.slice(1).toLowerCase() : null;
        const disponibles = {
          cuotasDisponibles: Object.keys(conceptos[carreraId]?.cuotas || {}),
          segurosDisponibles: Object.keys(conceptos[carreraId]?.seguros || {})
        };
        registrarError(
          "CONCEPTO_ID_NO_ENCONTRADO",
          estudiante.dni,
          estudiante.apellido,
          estudiante.nombres,
          `${concepto.tipo} ${concepto.mes} (carrera ${carreraId}). Disponibles: ${JSON.stringify(disponibles)}`
        );
        logConTiempo(`   ⚠️ NO ENCONTRADO: ${concepto.tipo} ${concepto.mes} (busca: ${mesCapitalizado}) carrera ${carreraId}`);
        continue;
      }
      
      conceptosValidos++;
      detalles.push({
        concepto_id: conceptoId,
        monto_original: montoOriginal,
        monto_pagado: concepto.montoPagado
      });
      
      montoTotal += concepto.montoPagado;
    }
    
    logConTiempo(`      📊 Conceptos: ${conceptosValidos} válidos, ${conceptosMissingId} sin ID`);
    
    if (detalles.length === 0) {
      registrarError(
        "PAGO_SIN_CONCEPTOS_VALIDOS",
        estudiante.dni,
        estudiante.apellido,
        estudiante.nombres,
        `0 conceptos válidos de ${conceptosPagados.length}`
      );
      logConTiempo(`   ⚠️ Est ${estId}: Sin conceptos válidos`);
      return { success: false, error: "Sin conceptos válidos", conceptos_count: 0 };
    }
    
    const talonario = `AUTO_${estId}_${Date.now()}`;
    const metodo = conceptosPagados[0]?.metodo || "EFECTIVO";
    
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
    
    logConTiempo(`      → Fetch: POST /rpc/insertar_pago_multiple_con_detalles_upsert`);
    STATS_GLOBAL.totalFetches++;
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
      {
        method: "post",
        headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
    
    if (resp.getResponseCode() === 200) {
      logConTiempo(`   ✅ Pago creado: ${detalles.length} detalles, $${montoTotal}`);
      sleepConConfig("afterBigRPC");
      return { success: true, conceptos_count: detalles.length };
    } else {
      const error = resp.getContentText().substring(0, 200);
      const errorParsed = tryParseError(resp.getContentText());
      registrarError(
        "RPC_INSERTAR_PAGO",
        estudiante.dni,
        estudiante.apellido,
        estudiante.nombres,
        `HTTP ${resp.getResponseCode()}: ${errorParsed}`
      );
      logConTiempo(`   ❌ Error RPC: ${errorParsed}`);
      return { success: false, error: errorParsed, conceptos_count: 0 };
    }
    
  } catch (e) {
    registrarError(
      "CREAR_PAGO_EXCEPTION",
      estudiante.dni,
      estudiante.apellido,
      estudiante.nombres,
      e.toString()
    );
    logConTiempo(`   ❌ Exception: ${e}`);
    return { success: false, error: e.toString(), conceptos_count: 0 };
  }
}

function tryParseError(respText) {
  try {
    const respData = JSON.parse(respText);
    return respData.message || respData.error || respText.substring(0, 100);
  } catch {
    return respText.substring(0, 100);
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
    
    logConTiempo("✅ Logs guardados");
  } catch (e) {
    logConTiempo("⚠️ Error guardando logs: " + e);
  }
}

function guardarEstadoSincronizacion(estado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(ESTADO_SYNC_SHEET);
    if (!hoja) {
      hoja = ss.insertSheet(ESTADO_SYNC_SHEET);
      hoja.appendRow(["FECHA", "TOTAL_CARGADOS", "NUEVOS", "ACTUALIZADOS", "PAGOS", "CONCEPTOS", "DNI_DUPLICADOS_RECHAZADOS", "ERRORES", "SKIPPED", "ERRORES_DETALLES"]);
    }
    
    hoja.appendRow([
      estado.fecha,
      estado.estudiantes_cargados,
      estado.estudiantes_nuevos,
      estado.estudiantes_actualizados,
      estado.pagos_creados,
      estado.conceptos_agrupados,
      estado.dnis_duplicados_rechazados || 0,
      estado.errores,
      estado.skipped_count || 0,
      estado.errores_count || 0
    ]);
    
    logConTiempo("✅ Estado de sincronización guardado");
  } catch (e) {
    logConTiempo("⚠️ Error: " + e);
  }
}

function guardarSkippedDetails() {
  try {
    if (SKIPPED_DETAILS.length === 0) {
      logConTiempo("ℹ️ Sin registros skipped");
      return;
    }
    
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
    
    logConTiempo(`✅ Guardados ${SKIPPED_DETAILS.length} registros skipped`);
  } catch (e) {
    logConTiempo(`⚠️ Error: ${e}`);
  }
}

function guardarErroresDetalles() {
  try {
    if (ERRORES_DETALLES.length === 0) {
      logConTiempo("ℹ️ Sin errores detallados");
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(ERRORES_SHEET_NAME);
    if (!hoja) {
      hoja = ss.insertSheet(ERRORES_SHEET_NAME);
      hoja.appendRow(["TIMESTAMP", "CONTEXTO", "DNI", "APELLIDO", "NOMBRES", "ERROR"]);
    } else {
      hoja.clearContents();
      hoja.appendRow(["TIMESTAMP", "CONTEXTO", "DNI", "APELLIDO", "NOMBRES", "ERROR"]);
    }
    
    const filasErrores = ERRORES_DETALLES.map(e => [e.timestamp, e.contexto, e.dni, e.apellido, e.nombres, e.error]);
    if (filasErrores.length > 0) {
      hoja.getRange(2, 1, filasErrores.length, 6).setValues(filasErrores);
    }
    
    logConTiempo(`✅ Guardados ${ERRORES_DETALLES.length} errores detallados`);
  } catch (e) {
    logConTiempo(`⚠️ Error: ${e}`);
  }
}

function mostrarLogsManual() {
  try {
    SpreadsheetApp.getUi().alert("📊 Ver hoja: " + LOG_SHEET_NAME + "\n📊 Ver hoja: " + ESTADO_SYNC_SHEET + "\n📊 Ver hoja: " + SKIPPED_SHEET_NAME);
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function mostrarErroresManual() {
  try {
    SpreadsheetApp.getUi().alert("❌ Ver hoja: " + ERRORES_SHEET_NAME);
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function limpiarLogs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    [LOG_SHEET_NAME, SKIPPED_SHEET_NAME, ESTADO_SYNC_SHEET, ERRORES_SHEET_NAME].forEach(nombre => {
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
