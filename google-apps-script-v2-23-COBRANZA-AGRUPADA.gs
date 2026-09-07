// ==================== GOOGLE APPS SCRIPT v2.23 - MODO COBRANZA AGRUPADO ====================
// ✅ AGRUPA TODOS LOS CONCEPTOS PAGADOS POR ESTUDIANTE EN 1 PAGO_MULTIPLE
// ✅ MANTIENE DETALLES POR CONCEPTO (monto_pagado vs monto_original)
// ✅ TRAE monto_original DE LA BD (configuracion_carreras)
// ✅ CREA: 1 pago_multiple + N detalle por estudiante

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const SKIPPED_SHEET_NAME = "SKIPPED_DETAILS";
const EXCEL_NORMALIZADO_NOMBRE = "SYNC_COBRANZA_AGRUPADO_2026";
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

let SKIPPED_DETAILS = [];

// ==================== MENÚ ====================

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🔄 SINCRONIZACIÓN COBRANZA')
      .addItem('▶️ EJECUTAR COBRANZA AGRUPADA', 'ejecutarCobranzaAgrupada')
      .addSeparator()
      .addItem('📋 Ver Logs', 'mostrarLogsManual')
      .addToUi();
  } catch (e) {
    Logger.log("onOpen warning: " + e);
  }
}

// ==================== FUNCIONES MANUALES ====================

function ejecutarCobranzaAgrupada() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 v2.23 - COBRANZA AGRUPADA (PAGOS_MULTIPLES)");
    Logger.log("=".repeat(80));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando cobranza agrupada... espera.</p>'),
      '🔄 Cobranza'
    );
    
    const resultado = ejecutarCobranzaInterna();
    
    if (resultado.exito) {
      let resumen = "✅ COBRANZA COMPLETADA\n\n";
      resumen += `• Instituciones: ${Object.keys(resultado.resultados).length}\n`;
      
      for (let instId in resultado.resultados) {
        const sync = resultado.resultados[instId];
        resumen += `\n📦 INSTITUCIÓN ${instId}:\n`;
        resumen += `   ✅ Estudiantes procesados: ${sync.estudiantesProcesados}\n`;
        resumen += `   💰 Pagos múltiples creados: ${sync.pagosMultiplesCreados}\n`;
        resumen += `   📊 Conceptos agrupados: ${sync.conceptosAgrupados}\n`;
        resumen += `   ⚠️ Errores: ${sync.errores}\n`;
      }
      
      resumen += `\nFecha: ${new Date().toLocaleString('es-AR')}`;
      ui.alert(resumen);
    } else {
      ui.alert("❌ Error: " + resultado.mensaje);
    }
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    try {
      SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
    } catch (e2) {
      Logger.log("No UI");
    }
  }
}

// ==================== EJECUCIÓN INTERNA ====================

function ejecutarCobranzaInterna() {
  try {
    Logger.log("\n📋 FASE 1: Normalizando datos del Excel...");
    SKIPPED_DETAILS = [];
    
    const datosNormalizados = normalizarExcelParaCobranza();
    if (!datosNormalizados || Object.keys(datosNormalizados).length === 0) {
      return { exito: false, mensaje: "Error en normalización", resultados: {} };
    }
    
    Logger.log(`✅ Instituciones detectadas: ${Object.keys(datosNormalizados).join(", ")}`);
    
    Logger.log("\n🔄 FASE 2: Procesando cobranza por institución...");
    const resultados = {};
    
    for (let instId in datosNormalizados) {
      const datosInst = datosNormalizados[instId];
      const config = {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_KEY,
        institucionId: instId
      };
      
      Logger.log(`\n   🔄 Institución ${instId}...`);
      resultados[instId] = procesarCobranzaPorInstitucion(config, datosInst);
    }
    
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarLogsCobranza(resultados);
    guardarSkippedDetails();
    
    Logger.log("\n✅ PROCESO COMPLETADO");
    return { exito: true, mensaje: "OK", resultados: resultados };
    
  } catch (error) {
    Logger.log("❌ ERROR INTERNO: " + error);
    return { exito: false, mensaje: error.toString(), resultados: {} };
  }
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
        estudiantes: {},
        carreraId: carreraId
      };
    }
    
    Logger.log(`  📄 ${nombreHoja} (inst ${instId}, carrera ${carreraId})...`);
    
    procesarHojaCobranza(
      hoja,
      nombreHoja,
      carreraId,
      instId,
      2026,
      datosNormalizadosPorInst[instId].estudiantes
    );
  }
  
  Logger.log(`✅ Normalización OK`);
  return datosNormalizadosPorInst;
}

function procesarHojaCobranza(hoja, nombreHoja, carreraId, instId, año, estudiantesMap) {
  const lastRow = hoja.getLastRow();
  const lastCol = hoja.getLastColumn();
  
  if (lastRow < 2) return;
  
  const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = datos[0];
  
  const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
  
  // Encontrar índices de columnas
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
  
  // Buscar METODO y TALONARIO
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
  
  for (let r = 1; r < datos.length; r++) {
    const fila = datos[r];
    const numeroFila = r + 1;
    
    let dniRaw = String(fila[idxDNI] || "").replace(/\./g, "").trim();
    const apellido = String(fila[idxApellido] || "").trim();
    const nombre = String(fila[idxNombres] || "").trim();
    const telefono = String(fila[idxTelefono] || "").trim().substring(0, 20);
    
    // Validar datos mínimos
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
    
    // DNI: generar si falta
    if (!dniRaw || dniRaw === "00000000") {
      dniRaw = generarDNISinDuplicados("", estudiantesMap, instId);
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
    
    // ✅ RECOLECTAR TODOS LOS CONCEPTOS PAGADOS
    const conceptosPagados = [];
    
    // INSCRIPCIÓN
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
    
    // CUOTAS Y SEGUROS POR MES
    for (let mes of meses) {
      // CUOTA
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
      
      // SEGURO
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
    
    // ✅ Si hay conceptos pagados, guardar en estudiantes
    if (conceptosPagados.length > 0) {
      if (!estudiantesMap[dniRaw]) {
        estudiantesMap[dniRaw] = {
          dni: dniRaw,
          apellido: apellido,
          nombres: nombre,
          telefono: telefono,
          carrera_id: carreraId,
          item: fila[idxItem] || "",
          conceptos: conceptosPagados
        };
      } else {
        // Si el DNI existe, agregar más conceptos
        estudiantesMap[dniRaw].conceptos = estudiantesMap[dniRaw].conceptos.concat(conceptosPagados);
      }
    }
  }
  
  Logger.log(`   📊 Procesados: ${procesados}, con conceptos pagados`);
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
      Logger.log(`   ❌ ERROR: Se agotaron DNIs para institución ${instId}`);
      return null;
    }
    dniGenerado = String(contador).padStart(8, '0');
  }
  
  return dniGenerado;
}

// ==================== PROCESAMIENTO DE COBRANZA ====================

function procesarCobranzaPorInstitucion(config, datosInst) {
  const estudiantes = Object.values(datosInst.estudiantes);
  
  const resultados = {
    estudiantesProcesados: 0,
    pagosMultiplesCreados: 0,
    conceptosAgrupados: 0,
    errores: 0
  };
  
  Logger.log(`   Procesando ${estudiantes.length} estudiantes...`);
  
  // Paso 1: Insertar/actualizar estudiantes
  Logger.log(`   📝 Insertando estudiantes...`);
  const resEst = procesarEstudiantes(config, estudiantes);
  resultados.estudiantesProcesados = resEst.procesados;
  resultados.errores += resEst.errores;
  
  Utilities.sleep(15000);
  
  // Paso 2: Buscar estudiantes en BD
  Logger.log(`   🔍 Buscando estudiantes en BD...`);
  const dniAId = buscarEstudiantes(config, estudiantes);
  Logger.log(`   ✅ Encontrados: ${Object.keys(dniAId).length}/${estudiantes.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    Logger.log(`   ❌ No se encontraron estudiantes`);
    return resultados;
  }
  
  // Paso 3: Traer configuración de carreras (para monto_original)
  Logger.log(`   💰 Cargando configuración de carreras...`);
  const config_carreras = cargarConfiguracionCarreras(config);
  
  // Paso 4: Traer conceptos para mapear IDs
  Logger.log(`   📊 Cargando conceptos...`);
  const conceptos = cargarConceptos(config);
  
  // Paso 5: Crear pagos_multiples agrupados POR ESTUDIANTE
  Logger.log(`   💳 Creando pagos múltiples agrupados...`);
  for (let estudiante of estudiantes) {
    const estId = dniAId[estudiante.dni];
    if (!estId) continue;
    
    // ✅ USAR LA CARRERA DEL ESTUDIANTE (no la de la institución)
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
      Logger.log(`     ❌ Error: ${resultado.error}`);
    }
  }
  
  return resultados;
}

function procesarEstudiantes(config, estudiantes) {
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

function buscarEstudiantes(config, estudiantes) {
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
      Logger.log(`   ⚠️ Error chunk: ${e}`);
    }
  }
  
  return dniAId;
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
    Logger.log(`   ❌ Error cargando config: ${e}`);
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

// ==================== CREAR PAGO MÚLTIPLE AGRUPADO ====================

function crearPagoMultipleAgrupado(config, estId, estudiante, conceptosPagados, conceptos, config_carreras, carreraId) {
  try {
    const instId = parseInt(config.institucionId);
    
    Logger.log(`     👤 DNI: ${estudiante.dni}, Carrera: ${carreraId}, Est_ID: ${estId}`);
    
    // Obtener IDs de conceptos y montos_originales
    const detalles = [];
    let montoTotal = 0;
    
    for (let concepto of conceptosPagados) {
      let conceptoId = null;
      let montoOriginal = 0;
      
      if (concepto.tipo === "INSCRIPCION") {
        conceptoId = conceptos[carreraId]?.inscripcion;
        montoOriginal = config_carreras[carreraId]?.monto_inscripcion || 0;
        Logger.log(`       ✅ INSCRIPCION (Carrera ${carreraId}): conceptoId=${conceptoId}, montoOrig=${montoOriginal}`);
      } else if (concepto.tipo === "CUOTA") {
        const mesNum = convertirMesANumero(concepto.mes);
        conceptoId = conceptos[carreraId]?.cuotas[mesNum];
        montoOriginal = config_carreras[carreraId]?.monto_cuota || 0;
        Logger.log(`       ✅ CUOTA ${concepto.mes} (Carrera ${carreraId}): conceptoId=${conceptoId}, montoOrig=${montoOriginal}`);
      } else if (concepto.tipo === "SEGURO") {
        const mesNum = convertirMesANumero(concepto.mes);
        conceptoId = conceptos[carreraId]?.seguros[mesNum];
        montoOriginal = config_carreras[carreraId]?.monto_seguro || 0;
        Logger.log(`       ✅ SEGURO ${concepto.mes} (Carrera ${carreraId}): conceptoId=${conceptoId}, montoOrig=${montoOriginal}`);
      }
      
      if (!conceptoId) {
        Logger.log(`       ⚠️ No encontrado concepto: ${concepto.tipo} ${concepto.mes} en carrera ${carreraId}`);
        continue;
      }
      
      detalles.push({
        concepto_id: conceptoId,
        monto_original: montoOriginal,
        monto_pagado: concepto.montoPagado
      });
      
      montoTotal += concepto.montoPagado;
    }
    
    if (detalles.length === 0) {
      return { success: false, error: "Sin conceptos para agrupar", conceptos_count: 0 };
    }
    
    // ✅ Crear pago_multiple con RPC
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
      const resultado = JSON.parse(resp.getContentText());
      Logger.log(`     ✅ Pago múltiple: ${talonario} (${detalles.length} conceptos, $${montoTotal})`);
      return { success: true, conceptos_count: detalles.length };
    } else {
      const error = resp.getContentText();
      Logger.log(`     ❌ RPC error: ${resp.getResponseCode()} - ${error.substring(0, 100)}`);
      return { success: false, error: error.substring(0, 100), conceptos_count: 0 };
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

// ==================== LOGS ====================

function guardarLogsCobranza(resultados) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "INSTITUCIÓN", "ESTUDIANTES", "PAGOS_MULTIPLES", "CONCEPTOS", "ERRORES"]);
    }
    
    for (let instId in resultados) {
      const r = resultados[instId];
      const row = [
        new Date().toLocaleString('es-AR'),
        instId,
        r.estudiantesProcesados,
        r.pagosMultiplesCreados,
        r.conceptosAgrupados,
        r.errores
      ];
      
      logSheet.getRange(logSheet.getLastRow() + 1, 1, 1, 6).setValues([row]);
    }
    
    Logger.log("✅ Logs guardados");
  } catch (e) {
    Logger.log("⚠️ Error: " + e);
  }
}

function guardarSkippedDetails() {
  try {
    if (SKIPPED_DETAILS.length === 0) {
      Logger.log(`   ℹ️ No hay SKIPPED`);
      return;
    }
    
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(SKIPPED_SHEET_NAME);
    if (!hoja) {
      hoja = ss.insertSheet(SKIPPED_SHEET_NAME);
    } else {
      hoja.clearContents();
    }
    
    hoja.appendRow(["HOJA", "FILA", "DNI", "APELLIDO", "NOMBRES", "MOTIVO"]);
    
    const filasSkipped = SKIPPED_DETAILS.map(d => [d.hoja, d.fila, d.dni, d.apellido, d.nombres, d.motivo]);
    if (filasSkipped.length > 0) {
      hoja.getRange(2, 1, filasSkipped.length, 6).setValues(filasSkipped);
    }
    
    Logger.log(`   ✅ SKIPPED guardados: ${SKIPPED_DETAILS.length}`);
    
  } catch (e) {
    Logger.log(`   ⚠️ Error: ${e}`);
  }
}

function mostrarLogsManual() {
  try {
    SpreadsheetApp.getUi().alert("Ver hoja: " + LOG_SHEET_NAME);
  } catch (e) {
    Logger.log("Error: " + e);
  }
}
