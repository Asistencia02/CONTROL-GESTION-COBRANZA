// ==================== GOOGLE APPS SCRIPT - FULL AUTO SINCRONIZACIÓN ====================

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";

// ==================== MENÚ PERSONALIZADO ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 SINCRONIZACIÓN')
    .addItem('▶️ FULL AUTO - Normalizar + Sincronizar', 'ejecutarFullAuto')
    .addItem('📋 Ver Resumen', 'mostrarResumen')
    .addItem('📊 Ver Logs', 'mostrarLogs')
    .addToUi();
}

// ==================== FUNCIÓN PRINCIPAL - FULL AUTO ====================

function ejecutarFullAuto() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 INICIANDO FULL AUTO - Normalización + Sincronización");
    Logger.log("=".repeat(70));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando... esto puede tomar 5-10 minutos.</p><p>No cierres esta ventana.</p>'),
      '🔄 Sincronización en progreso'
    );
    
    // PASO 1: NORMALIZAR
    Logger.log("\n📋 FASE 1: Normalizando datos desde Excel base...");
    const resultNormalizacion = normalizarExcelConSeguroAnual();
    
    if (!resultNormalizacion || !resultNormalizacion.datosNormalizados) {
      ui.alert("❌ Error en normalización. Ver Logger.");
      return;
    }
    
    const datosNormalizados = resultNormalizacion.datosNormalizados;
    const hojaSync = resultNormalizacion.hojaSync;
    const SUPABASE_URL = resultNormalizacion.SUPABASE_URL;
    const SUPABASE_KEY = resultNormalizacion.SUPABASE_KEY;
    const INSTITUCION_ID = resultNormalizacion.INSTITUCION_ID;
    
    Logger.log(`✅ Normalización completada:`);
    Logger.log(`   - Estudiantes: ${datosNormalizados.estudiantes.length}`);
    Logger.log(`   - Inscripciones: ${datosNormalizados.pagosInscripcion.length}`);
    Logger.log(`   - Cuotas: ${datosNormalizados.pagosCuota.length}`);
    Logger.log(`   - Seguros: ${datosNormalizados.pagosSeguro.length}`);
    
    // PASO 2: SINCRONIZAR DIRECTAMENTE
    Logger.log("\n🔄 FASE 2: Sincronizando directamente con Supabase...");
    const config = {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_KEY,
      institucionId: INSTITUCION_ID
    };
    
    const resultadoSync = sincronizarDatos(config, datosNormalizados);
    
    // PASO 3: GUARDAR RESULTADO EN SHEET
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarResultadoFinal(hojaSync, resultadoSync);
    
    // PASO 4: MOSTRAR RESULTADO
    Logger.log("\n" + "=".repeat(70));
    Logger.log("✅ ¡FULL AUTO COMPLETADO!");
    Logger.log("=".repeat(70));
    
    const resumenFinal = `✅ COMPLETADO
    
📊 DATOS NORMALIZADOS:
   • Estudiantes: ${datosNormalizados.estudiantes.length}
   • Inscripciones: ${datosNormalizados.pagosInscripcion.length}
   • Cuotas: ${datosNormalizados.pagosCuota.length}
   • Seguros: ${datosNormalizados.pagosSeguro.length}

🔄 SINCRONIZACIÓN:
   • Estudiantes insertados: ${resultadoSync.contadores.estudiantesInsertados}
   • Inscripciones insertadas: ${resultadoSync.contadores.pagosInscInsertados}
   • Cuotas insertadas: ${resultadoSync.contadores.pagosCuotaInsertados}
   • Seguros insertados: ${resultadoSync.contadores.pagosSeguroInsertados}
   • Pagos omitidos: ${resultadoSync.contadores.pagosSkipped}
   • Errores: ${resultadoSync.contadores.errores}

Estado: ${resultadoSync.exito ? "✅ ÉXITO" : "⚠️ CON ERRORES"}
Fecha: ${new Date().toLocaleString('es-AR')}`;
    
    ui.alert(resumenFinal);
    
  } catch (error) {
    Logger.log("❌ ERROR FULL AUTO: " + error);
    Logger.log("Stack: " + error.stack);
    SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
  }
}

// ==================== NORMALIZACIÓN (COPIA LA FUNCIÓN QUE FUNCIONA) ====================
// [Pega aquí la función normalizarExcelConSeguroAnual() que ya funciona correctamente]

// ==================== SINCRONIZACIÓN SIMPLIFICADA ====================

function sincronizarDatos(config, datosNormalizados) {
  Logger.log(`\n📦 Iniciando sincronización...`);
  
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
  
  // FASE 1: Estudiantes
  Logger.log(`\n📦 Procesando ${estudiantes.length} estudiantes...`);
  for (let est of estudiantes) {
    try {
      const datosEst = {
        institucion_id: parseInt(config.institucionId),
        dni: est.dni.toString().trim(),
        nombre: est.nombres.toString().trim(),
        apellido: est.apellido.toString().trim(),
        telefono: est.telefono ? est.telefono.toString().trim() : null,
        carrera_id: est.carrera_id || 5,
        estado: est.estado || "ACTIVO",
        fecha_ingreso: new Date().toISOString().split('T')[0]
      };
      
      const response = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/estudiantes`,
        {
          method: "post",
          headers: {
            "apikey": config.supabaseKey,
            "Content-Type": "application/json",
            "Authorization": "Bearer " + config.supabaseKey
          },
          payload: JSON.stringify([datosEst]),
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
        contadores.estudiantesInsertados++;
      } else {
        contadores.errores++;
      }
    } catch (e) {
      contadores.errores++;
      Logger.log(`Error estudiante ${est.dni}: ${e}`);
    }
  }
  
  Logger.log(`✅ Estudiantes: ${contadores.estudiantesInsertados}`);
  
  // FASE 2: Esperar
  Logger.log("\n⏳ Esperando 10 segundos...");
  Utilities.sleep(10000);
  
  // FASE 3: Obtener IDs de estudiantes
  Logger.log("📋 Obteniendo IDs de estudiantes...");
  const dniAEstudianteId = {};
  for (let est of estudiantes) {
    try {
      const response = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(est.dni)}&select=id`,
        {
          method: "get",
          headers: {
            "apikey": config.supabaseKey,
            "Authorization": "Bearer " + config.supabaseKey
          },
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() === 200) {
        const datos = JSON.parse(response.getContentText());
        if (datos && datos.length > 0) {
          dniAEstudianteId[est.dni] = datos[0].id;
        }
      }
    } catch (e) {
      Logger.log(`Error obteniendo ID ${est.dni}: ${e}`);
    }
  }
  
  Logger.log(`✅ Encontrados ${Object.keys(dniAEstudianteId).length} estudiantes`);
  
  // FASE 4: Cargar conceptos
  Logger.log("📊 Cargando conceptos...");
  const conceptos = cargarConceptos(config);
  
  // FASE 5: Inscripciones
  if (pagosInsc.length > 0) {
    Logger.log(`\n📦 Procesando ${pagosInsc.length} inscripciones...`);
    for (let pago of pagosInsc) {
      try {
        const dni = pago[1];
        const estudianteId = dniAEstudianteId[dni];
        if (!estudianteId) {
          contadores.pagosSkipped++;
          continue;
        }
        
        const datosP = {
          institucion_id: parseInt(config.institucionId),
          estudiante_id: estudianteId,
          concepto_id: conceptos.inscripcion,
          monto_pagado: parseFloat(pago[4]),
          monto_original: parseFloat(pago[5]),
          metodo_pago: pago[8] || "EFECTIVO",
          estado: pago[11] || "PAGADO",
          fecha_pago: new Date().toISOString().split('T')[0]
        };
        
        const response = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos`,
          {
            method: "post",
            headers: {
              "apikey": config.supabaseKey,
              "Content-Type": "application/json",
              "Authorization": "Bearer " + config.supabaseKey
            },
            payload: JSON.stringify([datosP]),
            muteHttpExceptions: true
          }
        );
        
        if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
          contadores.pagosInscInsertados++;
        } else {
          contadores.errores++;
        }
      } catch (e) {
        contadores.errores++;
        Logger.log(`Error inscripción: ${e}`);
      }
    }
    Logger.log(`✅ Inscripciones: ${contadores.pagosInscInsertados}`);
  }
  
  // FASE 6: Cuotas
  if (pagosCuota.length > 0) {
    Logger.log(`\n📦 Procesando ${pagosCuota.length} cuotas...`);
    for (let pago of pagosCuota) {
      try {
        const dni = pago[1];
        const mes = convertirMesANumero(pago[4]);
        const estudianteId = dniAEstudianteId[dni];
        if (!estudianteId || !mes) {
          contadores.pagosSkipped++;
          continue;
        }
        
        const conceptoId = conceptos.cuotas[mes];
        if (!conceptoId) {
          contadores.pagosSkipped++;
          continue;
        }
        
        const datosP = {
          institucion_id: parseInt(config.institucionId),
          estudiante_id: estudianteId,
          concepto_id: conceptoId,
          monto_pagado: parseFloat(pago[6]),
          monto_original: parseFloat(pago[7]),
          metodo_pago: pago[10] || "EFECTIVO",
          estado: pago[12] || "PAGADO",
          fecha_pago: new Date().toISOString().split('T')[0]
        };
        
        const response = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos`,
          {
            method: "post",
            headers: {
              "apikey": config.supabaseKey,
              "Content-Type": "application/json",
              "Authorization": "Bearer " + config.supabaseKey
            },
            payload: JSON.stringify([datosP]),
            muteHttpExceptions: true
          }
        );
        
        if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
          contadores.pagosCuotaInsertados++;
        } else {
          contadores.errores++;
        }
      } catch (e) {
        contadores.errores++;
        Logger.log(`Error cuota: ${e}`);
      }
    }
    Logger.log(`✅ Cuotas: ${contadores.pagosCuotaInsertados}`);
  }
  
  // FASE 7: Seguros
  if (pagosSeguro.length > 0) {
    Logger.log(`\n📦 Procesando ${pagosSeguro.length} seguros...`);
    for (let pago of pagosSeguro) {
      try {
        const dni = pago[1];
        const estudianteId = dniAEstudianteId[dni];
        if (!estudianteId) {
          contadores.pagosSkipped++;
          continue;
        }
        
        const datosP = {
          institucion_id: parseInt(config.institucionId),
          estudiante_id: estudianteId,
          concepto_id: conceptos.seguro,
          monto_pagado: parseFloat(pago[6]),
          monto_original: parseFloat(pago[7]),
          metodo_pago: pago[10] || "EFECTIVO",
          estado: pago[12] || "PAGADO",
          fecha_pago: new Date().toISOString().split('T')[0]
        };
        
        const response = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/pagos`,
          {
            method: "post",
            headers: {
              "apikey": config.supabaseKey,
              "Content-Type": "application/json",
              "Authorization": "Bearer " + config.supabaseKey
            },
            payload: JSON.stringify([datosP]),
            muteHttpExceptions: true
          }
        );
        
        if (response.getResponseCode() === 201 || response.getResponseCode() === 200) {
          contadores.pagosSeguroInsertados++;
        } else {
          contadores.errores++;
        }
      } catch (e) {
        contadores.errores++;
        Logger.log(`Error seguro: ${e}`);
      }
    }
    Logger.log(`✅ Seguros: ${contadores.pagosSeguroInsertados}`);
  }
  
  return {
    exito: contadores.errores === 0,
    contadores: contadores,
    fecha: new Date().toISOString()
  };
}

function cargarConceptos(config) {
  const conceptos = {
    inscripcion: null,
    seguro: null,
    cuotas: {}
  };
  
  try {
    const response = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${config.institucionId}&select=id,tipo,nombre,mes`,
      {
        method: "get",
        headers: {
          "apikey": config.supabaseKey,
          "Authorization": "Bearer " + config.supabaseKey
        },
        muteHttpExceptions: true
      }
    );
    
    if (response.getResponseCode() === 200) {
      const datos = JSON.parse(response.getContentText());
      
      for (let concepto of datos) {
        if (concepto.tipo === "INSCRIPCION") {
          conceptos.inscripcion = concepto.id;
        } else if (concepto.tipo === "SEGURO") {
          conceptos.seguro = concepto.id;
        } else if (concepto.tipo === "CUOTA" && concepto.mes) {
          conceptos.cuotas[concepto.mes] = concepto.id;
        }
      }
    }
  } catch (e) {
    Logger.log("Error cargando conceptos: " + e);
  }
  
  return conceptos;
}

function convertirMesANumero(mesDato) {
  if (!mesDato) return null;
  
  const mesStr = mesDato.toString().trim().toUpperCase();
  const meses = {
    "ENERO": 1, "FEBRERO": 2, "MARZO": 3, "ABRIL": 4,
    "MAYO": 5, "JUNIO": 6, "JULIO": 7, "AGOSTO": 8,
    "SEPTIEMBRE": 9, "OCTUBRE": 10, "NOVIEMBRE": 11, "DICIEMBRE": 12,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6,
    "7": 7, "8": 8, "9": 9, "10": 10, "11": 11, "12": 12,
    "SEPT": 9, "SEP": 9, "NOV": 11, "DIC": 12
  };
  
  return meses[mesStr] || null;
}

function guardarResultadoFinal(hojaSync, resultado) {
  try {
    let logSheet = hojaSync.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = hojaSync.insertSheet(LOG_SHEET_NAME);
      logSheet.appendRow(["FECHA", "ESTADO", "RESUMEN", "ERRORES", "OMITIDOS"]);
    }
    
    const row = [
      new Date().toLocaleString('es-AR'),
      resultado.exito ? "✅ OK" : "⚠️ CON ERRORES",
      `EST:${resultado.contadores.estudiantesInsertados} INSC:${resultado.contadores.pagosInscInsertados} CUOT:${resultado.contadores.pagosCuotaInsertados} SEG:${resultado.contadores.pagosSeguroInsertados}`,
      resultado.contadores.errores,
      resultado.contadores.pagosSkipped
    ];
    
    logSheet.appendRow(row);
    Logger.log("✅ Log guardado");
  } catch (e) {
    Logger.log("⚠️ No se pudo guardar log: " + e);
  }
}

function mostrarResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert("No hay logs aún");
    return;
  }
  
  const data = logSheet.getDataRange().getValues();
  const ultimaFila = data[data.length - 1];
  
  const resumen = `📊 ÚLTIMA SINCRONIZACIÓN:\n\nFecha: ${ultimaFila[0]}\nEstado: ${ultimaFila[1]}\nResultados: ${ultimaFila[2]}\nErrores: ${ultimaFila[3]}`;
  SpreadsheetApp.getUi().alert(resumen);
}

function mostrarLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName(LOG_SHEET_NAME);
  
  if (!logSheet) {
    SpreadsheetApp.getUi().alert("No hay logs aún");
    return;
  }
  
  SpreadsheetApp.getUi().alert("Ver hoja: " + LOG_SHEET_NAME);
}

// ==================== PEGA LA FUNCIÓN normalizarExcelConSeguroAnual() AQUÍ ====================
// [Copia completa la función que YA FUNCIONA]
