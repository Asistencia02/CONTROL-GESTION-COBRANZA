// ==================== GOOGLE APPS SCRIPT v2.26 FINAL - CARGA TODOS LOS ESTUDIANTES ====================
// ✅ CARGA TODOS LOS ESTUDIANTES (894) A LA BD - SIN IMPORTAR SI TIENEN PAGOS
// ✅ CREA PAGOS SOLO PARA LOS QUE TIENEN CONCEPTOS PAGADOS (724)
// ✅ NO DUPLICA si se ejecuta múltiples veces
// ✅ EJECUTABLE DESDE TRIGGERS
// ✅ MENÚ EN GOOGLE SHEETS

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

// ==================== MENÚ ====================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 SINCRONIZACIÓN COBRANZA v2.26')
      .addItem('▶️ SINCRONIZAR (SIN DUPLICAR)', 'sincronizarInteligente')
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
    Logger.log("🚀 SINCRONIZACIÓN DESDE GOOGLE SHEETS (SIN DUPLICADOS)");
    Logger.log("=".repeat(80));
    
    const resultado = sincronizarCobranzaInteligente();
    
    if (resultado.exito) {
      Logger.log("\n✅ SINCRONIZACIÓN COMPLETADA");
      Logger.log(`Estudiantes cargados: ${resultado.estudiantesCargados}`);
      Logger.log(`Estudiantes nuevos: ${resultado.estudiantesNuevos}`);
      Logger.log(`Pagos creados: ${resultado.pagosCreados}`);
      Logger.log(`Errores: ${resultado.errores}`);
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
    Logger.log("🚀 v2.26 - SINCRONIZACIÓN INTELIGENTE (SIN DUPLICADOS)");
    Logger.log("=".repeat(80));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Sincronizando... (5-10 minutos)</p>'),
      '🔄 Sincronización'
    );
    
    const resultado = sincronizarCobranzaInteligente();
    
    if (resultado.exito) {
      let resumen = "✅ SINCRONIZACIÓN COMPLETADA\n\n";
      resumen += `• Instituciones: ${Object.keys(resultado.resultados).length}\n`;
      resumen += `• Total estudiantes cargados: ${resultado.estudiantesCargados}\n`;
      resumen += `• Estudiantes nuevos: ${resultado.estudiantesNuevos}\n`;
      resumen += `• Estudiantes actualizados: ${resultado.estudiantesActualizados}\n`;
      resumen += `• Pagos creados (con conceptos): ${resultado.pagosCreados}\n`;
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

function ejecutarCobranzaAgrupada() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 v2.26 - SINCRONIZACIÓN COMPLETA");
    Logger.log("=".repeat(80));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando... espera.</p>'),
      '🔄 Cobranza'
    );
    
    const resultado = sincronizarCobranzaInteligente();
    
    if (resultado.exito) {
      let resumen = "✅ COBRANZA COMPLETADA\n\n";
      resumen += `• Instituciones: ${Object.keys(resultado.resultados).length}\n`;
      resumen += `• Total estudiantes cargados: ${resultado.estudiantesCargados}\n`;
      
      for (let instId in resultado.resultados) {
        const sync = resultado.resultados[instId];
        resumen += `\n📦 INSTITUCIÓN ${instId}:\n`;
        resumen += `   👥 Estudiantes cargados: ${sync.estudiantesCargados}\n`;
        resumen += `   ✨ Nuevos: ${sync.estudiantesNuevos}\n`;
        resumen += `   💰 Pagos múltiples: ${sync.pagosMultiplesCreados}\n`;
        resumen += `   📊 Conceptos: ${sync.conceptosAgrupados}\n`;
        resumen += `   ⚠️ Errores: ${sync.errores}\n`;
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
    
    const datosNormalizados = normalizarExcelParaCobranza();
    if (!datosNormalizados || Object.keys(datosNormalizados).length === 0) {
      return { exito: false, mensaje: "Error en normalización", resultados: {} };
    }
    
    Logger.log(`✅ Instituciones detectadas: ${Object.keys(datosNormalizados).join(", ")}`);
    
    let estudiantesCargados = 0, estudiantesNuevos = 0, estudiantesActualizados = 0, pagosCreados = 0, erroresTotal = 0;
    
    Logger.log("\n🔄 FASE 2: Procesando cobranza (SIN DUPLICAR)...");
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
      errores: erroresTotal
    };
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    return { exito: false, mensaje: error.toString(), resultados: {} };
  }
}

// ==================== PROCESAMIENTO INTELIGENTE ====================

function procesarCobranzaPorInstitucionInteligente(config, datosInst) {
  // TODOS los estudiantes (con y sin conceptos pagados)
  const todosLosEstudiantes = Object.values(datosInst.todosLosEstudiantes);
  // Solo los que tienen conceptos pagados
  const estudiantesConPagos = Object.values(datosInst.estudiantesConPagos);
  
  const resultados = {
    estudiantesCargados: 0,
    estudiantesNuevos: 0,
    estudiantesActualizados: 0,
    pagosMultiplesCreados: 0,
    conceptosAgrupados: 0,
    errores: 0
  };
  
  Logger.log(`   👥 Total estudiantes: ${todosLosEstudiantes.length}`);
  Logger.log(`   💰 Con conceptos pagados: ${estudiantesConPagos.length}`);
  
  // PASO 1: Obtener estudiantes EXISTENTES
  Logger.log(`   🔍 Obteniendo estudiantes existentes...`);
  const estudiantesExistentes = obtenerEstudiantesExistentes(config);
  Logger.log(`   ✅ ${Object.keys(estudiantesExistentes).length} existentes`);
  
  // PASO 2: Separar TODOS en NUEVOS y EXISTENTES
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
  
  // PASO 3: Insertar NUEVOS
  if (estudiantesNuevos.length > 0) {
    Logger.log(`   📝 Insertando ${estudiantesNuevos.length} nuevos...`);
    const resInsert = insertarEstudiantes(config, estudiantesNuevos);
    resultados.estudiantesNuevos = resInsert.procesados;
    resultados.errores += resInsert.errores;
    Utilities.sleep(5000);
  }
  
  // PASO 4: Actualizar EXISTENTES
  if (estudiantesExistentesAActualizar.length > 0) {
    Logger.log(`   ✏️ Actualizando ${estudiantesExistentesAActualizar.length}...`);
    const resUpdate = actualizarEstudiantes(config, estudiantesExistentesAActualizar);
    resultados.estudiantesActualizados = resUpdate.procesados;
    resultados.errores += resUpdate.errores;
  }
  
  // PASO 5: Total cargados
  resultados.estudiantesCargados = todosLosEstudiantes.length;
  
  // PASO 6: Buscar IDs en BD SOLO para los que tienen pagos
  Logger.log(`   🔍 Buscando IDs en BD para crear pagos...`);
  const dniAId = buscarEstudiantesById(config, estudiantesConPagos);
  Logger.log(`   ✅ Encontrados: ${Object.keys(dniAId).length}/${estudiantesConPagos.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    Logger.log(`   ⚠️ No hay estudiantes con pagos para crear`);
    return resultados;
  }
  
  // PASO 7: Cargar configuración y conceptos
  Logger.log(`   💰 Cargando configuración...`);
  const config_carreras = cargarConfiguracionCarreras(config);
  const conceptos = cargarConceptos(config);
  
  // PASO 8: Crear PAGOS MÚLTIPLES SOLO para los que tienen conceptos
  Logger.log(`   💳 Creando pagos múltiples...`);
  for (let estudiante of estudiantesConPagos) {
    const estId = dniAId[estudiante.dni];
    if (!estId) continue;
    
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
        carreras: [carreraId]
      };
    } else {
      if (!datosNormalizadosPorInst[instId].carreras.includes(carreraId)) {
        datosNormalizadosPorInst[instId].carreras.push(carreraId);
      }
    }
    
    Logger.log(`  📄 ${nombreHoja} (inst ${instId}, carrera ${carreraId})...`);
    
    procesarHojaCobranza(
      hoja,
      nombreHoja,
      carreraId,
      instId,
      2026,
      datosNormalizadosPorInst[instId]
    );
  }
  
  Logger.log(`✅ Normalización OK`);
  return datosNormalizadosPorInst;
}

function procesarHojaCobranza(hoja, nombreHoja, carreraId, instId, año, datosInst) {
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
  
  for (let i = idxInsc + 1; i < Math.min(idxInsc + 3, headers.length); i++) {
    const h = String(headers[i]).toUpperCase().trim();
    if (h === "METODO") idxInscMetodo = i;
    else if (h === "TALONARIO") idxInscTalonario = i;
  }
  
  for (let mes of meses) {
    if (idxCuota[mes] !== undefined) {
      for (let i = idxCuota[mes] + 1; i < Math.min(idxCuota[mes] + 3, headers.length); i++) {
        const h = String(headers[i]).toUpperCase().trim();
        if (h === "METODO") idxCuotaMetodo[mes] = i;
        else if (h === "TALONARIO") idxCuotaTalonario[mes] = i;
      }
    }
    
    if (idxSeguro[mes] !== undefined) {
      for (let i = idxSeguro[mes] + 1; i < Math.min(idxSeguro[mes] + 3, headers.length); i++) {
        const h = String(headers[i]).toUpperCase().trim();
        if (h === "METODO") idxSeguroMetodo[mes] = i;
        else if (h === "TALONARIO") idxSeguroTalonario[mes] = i;
      }
    }
  }
  
  let procesados = 0;
  let conConceptos = 0;
  
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
    
    for (let mes of meses) {
      if (idxCuota[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
        if (montoPagado > 0) {
          const metodoCuota = String(fila[idxCuotaMetodo[mes]] || "EFECTIVO").trim().toUpperCase();
          const talonarioCuota = String(fila[idxCuotaTalonario[mes]] || "").trim();
          
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          
          conceptosPagados.push({
            tipo: "CUOTA",
            mes: mesCompleto,
            montoPagado: montoPagado,
            metodo: metodoCuota,
            talonario: talonarioCuota
          });
        }
      }
      
      if (idxSeguro[mes] !== undefined) {
        const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
        if (montoPagado > 0) {
          const metodoSeguro = String(fila[idxSeguroMetodo[mes]] || "EFECTIVO").trim().toUpperCase();
          const talonarioSeguro = String(fila[idxSeguroTalonario[mes]] || "").trim();
          
          let mesCompleto = mes;
          if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
          if (mes === "NOV") mesCompleto = "NOVIEMBRE";
          if (mes === "DIC") mesCompleto = "DICIEMBRE";
          
          conceptosPagados.push({
            tipo: "SEGURO",
            mes: mesCompleto,
            montoPagado: montoPagado,
            metodo: metodoSeguro,
            talonario: talonarioSeguro
          });
        }
      }
    }
    
    // ✅ INSERTAR TODOS LOS ESTUDIANTES (con o sin conceptos)
    const estudiante = {
      dni: dniRaw,
      apellido: apellido,
      nombres: nombre,
      telefono: telefono,
      carrera_id: carreraId,
      item: fila[idxItem] || "",
      conceptos: conceptosPagados
    };
    
    if (!datosInst.todosLosEstudiantes[dniRaw]) {
      datosInst.todosLosEstudiantes[dniRaw] = estudiante;
    } else {
      datosInst.todosLosEstudiantes[dniRaw].conceptos = datosInst.todosLosEstudiantes[dniRaw].conceptos.concat(conceptosPagados);
    }
    
    // ✅ SOLO AGREGAR A PAGOS SI TIENE CONCEPTOS PAGADOS
    if (conceptosPagados.length > 0) {
      conConceptos++;
      if (!datosInst.estudiantesConPagos[dniRaw]) {
        datosInst.estudiantesConPagos[dniRaw] = estudiante;
      } else {
        datosInst.estudiantesConPagos[dniRaw].conceptos = datosInst.estudiantesConPagos[dniRaw].conceptos.concat(conceptosPagados);
      }
    }
  }
  
  Logger.log(`   📊 Total: ${procesados}, Con pagos: ${conConceptos}`);
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

// ==================== CREAR PAGO MÚLTIPLE ====================

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
        const mesNum = convertirMesANumero(concepto.mes);
        conceptoId = conceptos[carreraId]?.cuotas[mesNum];
        montoOriginal = config_carreras[carreraId]?.monto_cuota || 0;
      } else if (concepto.tipo === "SEGURO") {
        const mesNum = convertirMesANumero(concepto.mes);
        conceptoId = conceptos[carreraId]?.seguros[mesNum];
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
    
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles_upsert`,
      {
        method: "post",
        headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      return { success: true, conceptos_count: detalles.length };
    } else {
      return { success: false, error: resp.getContentText().substring(0, 50), conceptos_count: 0 };
    }
    
  } catch (e) {
    return { success: false, error: e.toString(), conceptos_count: 0 };
  }
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
    Logger.log(`   ❌ Error: ${e}`);
  }
  
  return conceptos;
}

// ==================== LOGS ====================

function guardarLogsCobranza(resultados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "INSTITUCIÓN", "TOTAL_CARGADOS", "NUEVOS", "ACTUALIZADOS", "PAGOS", "CONCEPTOS", "ERRORES"]);
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
        r.errores
      ]);
    }
    
    Logger.log("✅ Logs guardados");
  } catch (e) {
    Logger.log("⚠️ Error: " + e);
  }
}

function guardarEstadoSincronizacion(estado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(ESTADO_SYNC_SHEET);
    if (!hoja) {
      hoja = ss.insertSheet(ESTADO_SYNC_SHEET);
      hoja.appendRow(["FECHA", "TOTAL_CARGADOS", "NUEVOS", "ACTUALIZADOS", "PAGOS", "ERRORES"]);
    }
    
    hoja.appendRow([
      estado.fecha,
      estado.estudiantes_cargados,
      estado.estudiantes_nuevos,
      estado.estudiantes_actualizados,
      estado.pagos_creados,
      estado.errores
    ]);
  } catch (e) {
    Logger.log("⚠️ Error: " + e);
  }
}

function guardarSkippedDetails() {
  try {
    if (SKIPPED_DETAILS.length === 0) {
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
