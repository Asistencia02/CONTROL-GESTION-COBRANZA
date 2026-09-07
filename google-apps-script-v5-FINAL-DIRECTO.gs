// ==================== GOOGLE APPS SCRIPT v2.28 + v5.0 FINAL ====================
// ✅ SOLUCIÓN DEFINITIVA: Inserta DIRECTO sin RPC duplicador
// ✅ Extrae correctamente del Excel
// ✅ DNI único por institución
// ✅ Inserta en pagos_multiples + pagos_multiples_detalle

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
    ui.createMenu('🔄 SINCRONIZACIÓN COBRANZA v2.28')
      .addItem('▶️ SINCRONIZAR (v5.0 FINAL)', 'sincronizarV5Final')
      .addItem('▶️ SINCRONIZACIÓN COMPLETA', 'ejecutarCobranzaAgrupada')
      .addSeparator()
      .addItem('📋 Ver Logs', 'mostrarLogsManual')
      .addItem('🗑️ Limpiar Logs', 'limpiarLogs')
      .addToUi();
  } catch (e) {
    Logger.log("onOpen warning: " + e);
  }
}

// ==================== FUNCIÓN PRINCIPAL v5.0 ====================

function sincronizarV5Final() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🚀 v5.0 FINAL - INSERCIÓN DIRECTA SIN DUPLICACIÓN");
    Logger.log("=".repeat(80));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando... (5-10 minutos)</p>'),
      '🔄 Sincronización v5.0'
    );
    
    const resultado = sincronizarCobranzaV5Final();
    
    if (resultado.exito) {
      let resumen = "✅ SINCRONIZACIÓN v5.0 COMPLETADA\n\n";
      resumen += `📊 ESTUDIANTES:\n`;
      resumen += `• Total: ${resultado.estudiantesCargados}\n`;
      resumen += `• Con pagos: ${resultado.estudiantesConPagos}\n`;
      resumen += `• BECADOS: ${resultado.estudiantesBecados}\n`;
      resumen += `• LIBRE DE DEUDA: ${resultado.estudiantesLibreDeuda}\n\n`;
      resumen += `💳 PAGOS:\n`;
      resumen += `• Pagos múltiples: ${resultado.pagosMultiplesCreados}\n`;
      resumen += `• Detalles: ${resultado.detallesCreados}\n`;
      resumen += `• Total recaudado: $${resultado.totalRecaudado.toLocaleString()}\n`;
      resumen += `• Errores: ${resultado.errores}\n`;
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

// ==================== SINCRONIZACIÓN v5.0 ====================

function sincronizarCobranzaV5Final() {
  try {
    Logger.log("\n📋 FASE 1: Extrayendo datos del Excel...");
    SKIPPED_DETAILS = [];
    
    const datosExcel = extraerDatosExcelCompleto();
    
    Logger.log(`✅ Extracción completada:`);
    Logger.log(`   • Estudiantes: ${datosExcel.estudiantesCargados}`);
    Logger.log(`   • Con pagos: ${datosExcel.estudiantesConPagos}`);
    Logger.log(`   • Total recaudado: $${datosExcel.totalRecaudado.toLocaleString()}`);
    
    Logger.log("\n🔍 FASE 2: Procesando estudiantes...");
    const config = {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY
    };
    
    const resEstudiantes = procesarEstudiantesV5(config, datosExcel);
    Logger.log(`✅ Estudiantes: ${resEstudiantes.insertados} nuevos, ${resEstudiantes.actualizados} actualizados`);
    
    Logger.log("\n💳 FASE 3: Insertando pagos múltiples...");
    const resPagos = insertarPagosMultiplesDirecto(config, datosExcel);
    Logger.log(`✅ Pagos: ${resPagos.pagosCreados}, Detalles: ${resPagos.detallesCreados}, Errores: ${resPagos.errores}`);
    
    Logger.log("\n📝 FASE 4: Guardando logs...");
    guardarLogsCobranzaV5({
      fecha: new Date().toISOString(),
      estudiantes_cargados: datosExcel.estudiantesCargados,
      estudiantes_con_pagos: datosExcel.estudiantesConPagos,
      pagos_creados: resPagos.pagosCreados,
      detalles_creados: resPagos.detallesCreados,
      total_recaudado: datosExcel.totalRecaudado,
      errores: resPagos.errores
    });
    guardarSkippedDetails();
    
    Logger.log("\n" + "=".repeat(80));
    Logger.log("✅ SINCRONIZACIÓN v5.0 COMPLETADA CON ÉXITO");
    Logger.log("=".repeat(80));
    
    return {
      exito: true,
      estudiantesCargados: datosExcel.estudiantesCargados,
      estudiantesConPagos: datosExcel.estudiantesConPagos,
      estudiantesBecados: datosExcel.estudiantesBecados,
      estudiantesLibreDeuda: datosExcel.estudiantesLibreDeuda,
      totalRecaudado: datosExcel.totalRecaudado,
      pagosMultiplesCreados: resPagos.pagosCreados,
      detallesCreados: resPagos.detallesCreados,
      errores: resPagos.errores
    };
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
    return { exito: false, mensaje: error.toString() };
  }
}

// ==================== EXTRAER DATOS COMPLETO ====================

function extraerDatosExcelCompleto() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const datos = {
    estudiantesCargados: 0,
    estudiantesConPagos: 0,
    estudiantesBecados: 0,
    estudiantesLibreDeuda: 0,
    totalRecaudado: 0,
    pagos: [],
    estudiantes: {}
  };
  
  for (let nombreHoja in MAPEO_HOJAS) {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) {
      Logger.log(`  ⏭️  ${nombreHoja} no encontrada`);
      continue;
    }
    
    const mapeo = MAPEO_HOJAS[nombreHoja];
    Logger.log(`  📄 ${nombreHoja}...`);
    
    extraerHojaCompleta(hoja, nombreHoja, mapeo, datos);
  }
  
  return datos;
}

function extraerHojaCompleta(hoja, nombreHoja, mapeo, datosGlobales) {
  const rango = hoja.getDataRange();
  const valores = rango.getValues();
  const headers = valores[0];
  
  const indices = encontrarIndices(headers);
  if (!indices.dniCol) {
    Logger.log(`   ❌ DNI no encontrado`);
    return;
  }
  
  const dniYaVistos = {};
  let procesados = 0, conPagos = 0;
  
  for (let r = 1; r < valores.length; r++) {
    const fila = valores[r];
    
    const dni = String(fila[indices.dniCol] || "").replace(/\./g, "").trim();
    const apellido = String(fila[indices.apellidoCol] || "").trim();
    const nombre = String(fila[indices.nombreCol] || "").trim();
    const observaciones = String(fila[indices.observacionesCol] || "").toUpperCase();
    
    if (!apellido || !nombre || !dni) continue;
    
    if (dniYaVistos[dni]) {
      SKIPPED_DETAILS.push({
        hoja: nombreHoja,
        fila: r + 1,
        dni: dni,
        apellido: apellido,
        nombres: nombre,
        motivo: "DNI DUPLICADO"
      });
      continue;
    }
    dniYaVistos[dni] = true;
    
    const esBecado = observaciones.includes("BECAD");
    const esLibreDeuda = observaciones.includes("LIBRE DE DEUDA");
    
    if (esBecado) datosGlobales.estudiantesBecados++;
    if (esLibreDeuda) datosGlobales.estudiantesLibreDeuda++;
    
    datosGlobales.estudiantesCargados++;
    
    const pagosEstudiante = extraerPagosEstudiante(fila, indices, dni, nombre, apellido, mapeo.carrera_id, mapeo.institucion_id);
    
    if (pagosEstudiante.length > 0) {
      conPagos++;
      datosGlobales.estudiantesConPagos++;
      
      for (let pago of pagosEstudiante) {
        datosGlobales.totalRecaudado += pago.monto_pagado;
        datosGlobales.pagos.push(pago);
      }
    }
    
    if (!datosGlobales.estudiantes[dni]) {
      datosGlobales.estudiantes[dni] = {
        dni: dni,
        nombre: nombre,
        apellido: apellido,
        carrera_id: mapeo.carrera_id,
        institucion_id: mapeo.institucion_id,
        telefono: String(fila[indices.telefonoCol] || "").trim()
      };
    }
    
    procesados++;
  }
  
  Logger.log(`     ✅ ${procesados} estudiantes, ${conPagos} con pagos`);
}

function encontrarIndices(headers) {
  const indices = {
    dniCol: null,
    apellidoCol: null,
    nombreCol: null,
    telefonoCol: null,
    inscripcionCol: null,
    observacionesCol: null,
    meses: {}
  };
  
  const mesesList = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    if (h === "DNI") indices.dniCol = i;
    else if (h === "APELLIDO") indices.apellidoCol = i;
    else if (h === "NOMBRES" || h === "NOMBRE") indices.nombreCol = i;
    else if (h === "TELEFONO") indices.telefonoCol = i;
    else if (h === "INSCRIPCION") indices.inscripcionCol = i;
    else if (h === "OBSERVACIONES") indices.observacionesCol = i;
    
    for (let mes of mesesList) {
      const mesKey = mes.substring(0, 3).toUpperCase();
      
      if (h.includes("CUOTA") && h.includes(mes)) {
        if (!indices.meses[mesKey]) indices.meses[mesKey] = {};
        indices.meses[mesKey].cuota = i;
      }
      if (h.includes("SEGURO") && h.includes(mes)) {
        if (!indices.meses[mesKey]) indices.meses[mesKey] = {};
        indices.meses[mesKey].seguro = i;
      }
    }
  }
  
  return indices;
}

function extraerPagosEstudiante(fila, indices, dni, nombre, apellido, carreraId, institId) {
  const pagos = [];
  
  // INSCRIPCIÓN
  const inscripcion = parseInt(fila[indices.inscripcionCol]) || 0;
  if (inscripcion > 0) {
    pagos.push({
      dni: dni,
      nombre: nombre,
      apellido: apellido,
      carrera_id: carreraId,
      institucion_id: institId,
      concepto: "INSCRIPCION",
      mes: null,
      monto_pagado: inscripcion
    });
  }
  
  // CUOTAS Y SEGUROS
  for (let mesKey in indices.meses) {
    const mesIndices = indices.meses[mesKey];
    
    if (mesIndices.seguro !== undefined) {
      const seguro = parseInt(fila[mesIndices.seguro]) || 0;
      if (seguro > 0) {
        pagos.push({
          dni: dni,
          nombre: nombre,
          apellido: apellido,
          carrera_id: carreraId,
          institucion_id: institId,
          concepto: "SEGURO",
          mes: mesKey,
          monto_pagado: seguro
        });
      }
    }
    
    if (mesIndices.cuota !== undefined) {
      const cuota = parseInt(fila[mesIndices.cuota]) || 0;
      if (cuota > 0) {
        pagos.push({
          dni: dni,
          nombre: nombre,
          apellido: apellido,
          carrera_id: carreraId,
          institucion_id: institId,
          concepto: "CUOTA",
          mes: mesKey,
          monto_pagado: cuota
        });
      }
    }
  }
  
  return pagos;
}

// ==================== PROCESAR ESTUDIANTES ====================

function procesarEstudiantesV5(config, datosExcel) {
  const resultado = { insertados: 0, actualizados: 0 };
  
  const estudiantesExistentes = obtenerEstudiantesExistentes(config);
  
  const paraInsertar = [];
  for (let dni in datosExcel.estudiantes) {
    const est = datosExcel.estudiantes[dni];
    if (!estudiantesExistentes[`${est.institucion_id}_${dni}`]) {
      paraInsertar.push({
        institucion_id: est.institucion_id,
        dni: dni.trim(),
        nombre: est.nombre.trim(),
        apellido: est.apellido.trim(),
        telefono: est.telefono || null,
        carrera_id: est.carrera_id,
        estado: "ACTIVO",
        fecha_ingreso: new Date().toISOString().split('T')[0]
      });
    }
  }
  
  if (paraInsertar.length > 0) {
    for (let i = 0; i < paraInsertar.length; i += 50) {
      const batch = paraInsertar.slice(i, i + 50);
      
      try {
        const resp = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(batch),
            muteHttpExceptions: true,
            timeout: 60
          }
        );
        
        if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
          resultado.insertados += batch.length;
        }
      } catch (e) {
        Logger.log(`   ⚠️ Error: ${e}`);
      }
      
      Utilities.sleep(500);
    }
  }
  
  return resultado;
}

function obtenerEstudiantesExistentes(config) {
  const existentes = {};
  
  try {
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/estudiantes?select=dni,id,institucion_id`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let est of datos) {
        existentes[`${est.institucion_id}_${est.dni}`] = est.id;
      }
    }
  } catch (e) {
    Logger.log(`   ⚠️ Error: ${e}`);
  }
  
  return existentes;
}

// ==================== INSERTAR PAGOS MÚLTIPLES DIRECTO ====================

function insertarPagosMultiplesDirecto(config, datosExcel) {
  const resultado = { pagosCreados: 0, detallesCreados: 0, errores: 0 };
  
  // Agrupar pagos por estudiante + concepto
  const pagosAgrupados = {};
  
  for (let pago of datosExcel.pagos) {
    const key = `${pago.dni}_${pago.concepto}_${pago.mes || 'null'}`;
    if (!pagosAgrupados[key]) {
      pagosAgrupados[key] = pago;
    } else {
      pagosAgrupados[key].monto_pagado += pago.monto_pagado;
    }
  }
  
  const pagosArray = Object.values(pagosAgrupados);
  Logger.log(`   Total pagos a insertar: ${pagosArray.length}`);
  
  // Obtener estudiantes por DNI
  const dniAId = obtenerEstudiantesPorDNI(config, Object.keys(datosExcel.estudiantes));
  
  // Obtener conceptos
  const conceptosPorCarrera = obtenerConceptosPorCarrera(config);
  
  // Procesar pagos
  const timestamp = Math.floor(Date.now() / 1000);
  let counter = 0;
  
  for (let pago of pagosArray) {
    try {
      const estId = dniAId[pago.dni];
      if (!estId) {
        resultado.errores++;
        continue;
      }
      
      // Obtener concepto_id
      const conceptos = conceptosPorCarrera[pago.carrera_id] || {};
      let conceptoId = null;
      
      if (pago.concepto === "INSCRIPCION") {
        conceptoId = conceptos.inscripcion;
      } else if (pago.concepto === "CUOTA") {
        conceptoId = conceptos.cuotas ? conceptos.cuotas[pago.mes] : null;
      } else if (pago.concepto === "SEGURO") {
        conceptoId = conceptos.seguros ? conceptos.seguros[pago.mes] : null;
      }
      
      if (!conceptoId) {
        resultado.errores++;
        continue;
      }
      
      counter++;
      const talonario = `AUTO_${timestamp}_${String(counter).padStart(8, '0')}`;
      
      // Insertar pago múltiple
      const pagoPayload = {
        institucion_id: pago.institucion_id,
        estudiante_id: estId,
        numero_talonario: talonario,
        monto_total: pago.monto_pagado,
        cantidad_conceptos: 1,
        metodo_pago: "EFECTIVO",
        fecha_cobro: new Date().toISOString().split('T')[0],
        descripcion: `${pago.concepto} ${pago.mes ? '(' + pago.mes + ')' : ''}`
      };
      
      const respPago = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/pagos_multiples`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json", "Prefer": "return=representation" },
          payload: JSON.stringify(pagoPayload),
          muteHttpExceptions: true,
          timeout: 30
        }
      );
      
      if (respPago.getResponseCode() === 201 || respPago.getResponseCode() === 200) {
        const pagoData = JSON.parse(respPago.getContentText());
        const pagoId = Array.isArray(pagoData) ? pagoData[0].id : pagoData.id;
        
        resultado.pagosCreados++;
        
        // Insertar detalle
        const detallePayload = {
          pago_multiple_id: pagoId,
          concepto_id: conceptoId,
          monto_original: pago.monto_pagado,
          monto_pagado: pago.monto_pagado
        };
        
        const respDetalle = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos_multiples_detalle`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(detallePayload),
            muteHttpExceptions: true,
            timeout: 30
          }
        );
        
        if (respDetalle.getResponseCode() === 201 || respDetalle.getResponseCode() === 200) {
          resultado.detallesCreados++;
        } else {
          resultado.errores++;
        }
      } else {
        resultado.errores++;
      }
      
      Utilities.sleep(50);
      
    } catch (e) {
      resultado.errores++;
      Logger.log(`   ⚠️ Error: ${e}`);
    }
  }
  
  return resultado;
}

function obtenerEstudiantesPorDNI(config, dnis) {
  const resultado = {};
  
  try {
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/estudiantes?select=dni,id&dni=in.(${dnis.join(',')})`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let est of datos) {
        resultado[est.dni] = est.id;
      }
    }
  } catch (e) {
    Logger.log(`   ⚠️ Error: ${e}`);
  }
  
  return resultado;
}

function obtenerConceptosPorCarrera(config) {
  const resultado = {};
  
  try {
    const resp = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?select=id,carrera_id,tipo,mes`,
      {
        method: "get",
        headers: { "apikey": config.supabaseKey },
        muteHttpExceptions: true,
        timeout: 60
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let c of datos) {
        const car = c.carrera_id;
        if (!resultado[car]) {
          resultado[car] = { inscripcion: null, cuotas: {}, seguros: {} };
        }
        
        if (c.tipo === "INSCRIPCION") {
          resultado[car].inscripcion = c.id;
        } else if (c.tipo === "CUOTA" && c.mes) {
          const mesKey = convertirNumeroAMes(c.mes);
          resultado[car].cuotas[mesKey] = c.id;
        } else if (c.tipo === "SEGURO" && c.mes) {
          const mesKey = convertirNumeroAMes(c.mes);
          resultado[car].seguros[mesKey] = c.id;
        }
      }
    }
  } catch (e) {
    Logger.log(`   ⚠️ Error: ${e}`);
  }
  
  return resultado;
}

function convertirNumeroAMes(num) {
  const meses = {
    1: "ENE", 2: "FEB", 3: "MAR", 4: "ABR", 5: "MAY", 6: "JUN",
    7: "JUL", 8: "AGO", 9: "SEP", 10: "OCT", 11: "NOV", 12: "DIC"
  };
  return meses[parseInt(num)] || null;
}

// ==================== LOGS ====================

function guardarLogsCobranzaV5(estado) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(ESTADO_SYNC_SHEET);
    if (!hoja) {
      hoja = ss.insertSheet(ESTADO_SYNC_SHEET);
      hoja.appendRow(["FECHA", "ESTUDIANTES", "CON_PAGOS", "PAGOS_MULTIPLES", "DETALLES", "TOTAL_RECAUDADO", "ERRORES"]);
    }
    
    hoja.appendRow([
      estado.fecha,
      estado.estudiantes_cargados,
      estado.estudiantes_con_pagos,
      estado.pagos_creados,
      estado.detalles_creados,
      estado.total_recaudado,
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
  SpreadsheetApp.getUi().alert("Ver hoja: " + ESTADO_SYNC_SHEET);
}

function limpiarLogs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    [LOG_SHEET_NAME, SKIPPED_SHEET_NAME, ESTADO_SYNC_SHEET].forEach(nombre => {
      const hoja = ss.getSheetByName(nombre);
      if (hoja) ss.deleteSheet(hoja);
    });
    SpreadsheetApp.getUi().alert("✅ Logs limpiados");
  } catch (e) {
    Logger.log("Error: " + e);
  }
}

function ejecutarCobranzaAgrupada() {
  sincronizarV5Final();
}
