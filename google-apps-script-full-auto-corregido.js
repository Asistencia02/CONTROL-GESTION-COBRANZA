// ==================== GOOGLE APPS SCRIPT - FULL AUTO ====================
// Normalización + Sincronización automática en 1 click
// Adaptado para estructura: ITEM|APELLIDO|NOMBRES|DNI|...|INSCRIPCION|SEGURO|MES1|SEGURO|MES2|SEGURO|...
// ==================== CONFIGURACIÓN ====================

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const ESTUDIANTES_SHEET_NAME = "ESTUDIANTES";
const PAGOS_INSC_SHEET_NAME = "PAGOS_INSCRIPCION";
const PAGOS_CUOTA_SHEET_NAME = "PAGOS_CUOTA";
const PAGOS_SEGURO_SHEET_NAME = "PAGOS_SEGURO_ANUAL";

const BATCH_SIZE = 10;
const DELAY_MS = 500;

const MESES_ESPERADOS = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];

// ==================== MENÚ PERSONALIZADO ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🔄 SINCRONIZACIÓN')
    .addItem('▶️ FULL AUTO - Normalizar + Sincronizar', 'ejecutarFullAuto')
    .addSeparator()
    .addItem('📋 Ver Resumen', 'mostrarResumen')
    .addItem('📊 Ver Logs', 'mostrarLogs')
    .addToUi();
}

// ==================== FUNCIÓN PRINCIPAL - FULL AUTO ====================

function ejecutarFullAuto() {
  try {
    const ui = SpreadsheetApp.getUi();
    
    // PASO 0: Validar configuración
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const config = obtenerConfig(ss);
    
    if (!config.supabaseUrl || !config.supabaseKey || !config.institucionId) {
      ui.alert("❌ CONFIG incompleta. Verifica la hoja CONFIG:\n- SUPABASE_URL\n- SUPABASE_KEY\n- INSTITUCION_ID");
      return;
    }
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando... esto puede tomar 2-5 minutos.</p><p>No cierres esta ventana.</p>'),
      '🔄 Sincronización en progreso'
    );
    
    // PASO 1: NORMALIZAR
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 INICIANDO FULL AUTO - Normalización + Sincronización");
    Logger.log("=".repeat(70));
    
    Logger.log("\n📋 FASE 1: Normalizando datos desde Excel base...");
    const datosNormalizados = normalizarExcelCompleto(config);
    
    if (!datosNormalizados || !datosNormalizados.estudiantes) {
      ui.alert("❌ Error en normalización. Ver Logger.");
      return;
    }
    
    Logger.log(`✅ Normalización completada:`);
    Logger.log(`   - Estudiantes: ${datosNormalizados.estudiantes.length}`);
    Logger.log(`   - Inscripciones: ${datosNormalizados.pagosInscripcion.length}`);
    Logger.log(`   - Cuotas: ${datosNormalizados.pagosCuota.length}`);
    Logger.log(`   - Seguros: ${datosNormalizados.pagosSeguro.length}`);
    
    // PASO 2: SINCRONIZAR DIRECTAMENTE
    Logger.log("\n🔄 FASE 2: Sincronizando directamente con Supabase...");
    const resultadoSync = sincronizarDatos(config, datosNormalizados);
    
    // PASO 3: GUARDAR RESULTADO EN SHEET
    Logger.log("\n📝 FASE 3: Guardando logs...");
    guardarResultadoFinal(ss, resultadoSync, datosNormalizados);
    
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
    SpreadsheetApp.getUi().alert("❌ Error: " + error.toString());
  }
}

// ==================== NORMALIZACIÓN MEJORADA ====================

function normalizarExcelCompleto(config) {
  const INSTITUCION_ID = parseInt(config.institucionId);
  const AÑO = new Date().getFullYear();
  
  const mapeoCarreras = {
    "INICIAL": 4,
    "PRIMARIA": 5,
    "SECUNDARIA": 6
  };
  
  // Obtener configuración de carreras desde Supabase
  const configuracionCarreras = cargarConfiguracionCarreras(config);
  
  if (Object.keys(configuracionCarreras).length === 0) {
    throw new Error("No se cargó configuración de carreras desde Supabase");
  }
  
  Logger.log("✅ Configuración de carreras cargada");
  
  // Obtener archivo Excel
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    throw new Error(`Archivo no encontrado: ${nombreArchivo}`);
  }
  
  const file = files.next();
  const fileId = file.getId();
  const tempSpreadsheet = SpreadsheetApp.openById(fileId);
  
  Logger.log("✅ Excel base cargado");
  
  // Almacenamiento de datos
  const estudiantes = [];
  const pagosInscripcion = [];
  const pagosCuota = [];
  const pagosSeguro = [];
  
  const estudiantesMap = {};
  
  // Procesar hojas
  const hojas = tempSpreadsheet.getSheets();
  
  for (let h = 0; h < hojas.length; h++) {
    const hoja = hojas[h];
    const nombreHoja = hoja.getName().toUpperCase().trim();
    
    // Detectar carrera (INICIAL, PRIMARIA, SECUNDARIA)
    let carreraId = null;
    for (const [nombreCarrera, id] of Object.entries(mapeoCarreras)) {
      if (nombreHoja.includes(nombreCarrera)) {
        carreraId = id;
        break;
      }
    }
    
    if (!carreraId) {
      Logger.log(`⚠️ Hoja no reconocida: ${nombreHoja}`);
      continue;
    }
    
    const configuracion = configuracionCarreras[carreraId];
    if (!configuracion) {
      Logger.log(`⚠️ No hay configuración para carrera_id=${carreraId}`);
      continue;
    }
    
    Logger.log(`📄 Procesando: ${nombreHoja} (carrera_id=${carreraId})`);
    
    // Obtener datos
    const lastRow = hoja.getLastRow();
    const lastCol = hoja.getLastColumn();
    
    if (lastRow < 2) {
      Logger.log(`   ⚠️ Hoja vacía`);
      continue;
    }
    
    const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = datos[0];
    
    Logger.log(`   📊 ${lastRow} filas, ${lastCol} columnas`);
    
    // Encontrar índices de columnas
    const indices = encontrarIndices(headers);
    
    Logger.log(`   ✅ Índices encontrados: INSCRIPCION=${indices.inscripcion}, SEGURO_COL=${indices.seguroCol}`);
    Logger.log(`   ✅ Meses encontrados: ${Object.keys(indices.meses).length}`);
    
    // Procesar filas
    let filasProcesadas = 0;
    for (let r = 1; r < datos.length; r++) {
      const fila = datos[r];
      
      const item = fila[indices.item] || "";
      const apellido = String(fila[indices.apellido] || "").trim();
      const nombres = String(fila[indices.nombres] || "").trim();
      const dniRaw = fila[indices.dni];
      const telefono = String(fila[indices.telefono] || "");
      const montoPagadoInscripcion = parseFloat(fila[indices.inscripcion]) || 0;
      
      let dni = "";
      if (dniRaw) {
        dni = String(dniRaw).split(".")[0].trim();
      }
      
      if (!dni || !apellido) continue;
      
      filasProcesadas++;
      
      // Guardar estudiante (solo 1 vez)
      if (!estudiantesMap[dni]) {
        estudiantesMap[dni] = true;
        estudiantes.push({
          item: item,
          dni: dni,
          apellido: apellido,
          nombres: nombres,
          telefono: telefono,
          carrera_id: carreraId,
          estado: "ACTIVO"
        });
      }
      
      // INSCRIPCIÓN
      if (montoPagadoInscripcion > 0) {
        const montoConfigInscripcion = configuracion.monto_inscripcion;
        let estadoInscripcion = "PAGADO";
        let montoAdeudado = 0;
        
        if (montoPagadoInscripcion < montoConfigInscripcion) {
          estadoInscripcion = "PARCIAL";
          montoAdeudado = montoConfigInscripcion - montoPagadoInscripcion;
        }
        
        pagosInscripcion.push({
          dni: dni,
          apellido: apellido,
          nombres: nombres,
          monto_pagado: montoPagadoInscripcion,
          monto_configurado: montoConfigInscripcion,
          monto_adeudado: montoAdeudado,
          fecha_pago: "",
          metodo_pago: "EFECTIVO",
          tipo_tarjeta: "",
          numero_talonario: "",
          estado: estadoInscripcion,
          notas: ""
        });
      }
      
      // CUOTAS Y SEGUROS
      // Estructura: MES | SEGURO | MES | SEGURO | ...
      for (const [mes, indices_mes] of Object.entries(indices.meses)) {
        const montoPagadoCuota = parseFloat(fila[indices_mes.cuota]) || 0;
        const montoPagadoSeguro = parseFloat(fila[indices_mes.seguro]) || 0;
        
        // CUOTA
        if (montoPagadoCuota > 0) {
          const montoConfig = configuracion.monto_cuota;
          let estado = "PAGADO";
          let montoAdeudado = 0;
          
          if (montoPagadoCuota < montoConfig) {
            estado = "PARCIAL";
            montoAdeudado = montoConfig - montoPagadoCuota;
          }
          
          pagosCuota.push({
            dni: dni,
            apellido: apellido,
            nombres: nombres,
            mes: mes,
            año: AÑO,
            monto_pagado: montoPagadoCuota,
            monto_configurado: montoConfig,
            monto_adeudado: montoAdeudado,
            fecha_pago: "",
            metodo_pago: "EFECTIVO",
            numero_talonario: "",
            estado: estado,
            notas: ""
          });
        }
        
        // SEGURO (acumular por estudiante)
        if (montoPagadoSeguro > 0) {
          // Se acumula luego
        }
      }
      
      // SEGUROS - Sumar todas las cuotas de seguro
      let totalSeguroPagado = 0;
      let mesesConPago = [];
      
      for (const [mes, indices_mes] of Object.entries(indices.meses)) {
        const montoPagadoSeguro = parseFloat(fila[indices_mes.seguro]) || 0;
        if (montoPagadoSeguro > 0) {
          totalSeguroPagado += montoPagadoSeguro;
          mesesConPago.push(mes);
        }
      }
      
      if (totalSeguroPagado > 0) {
        const montoConfigSeguro = configuracion.monto_seguro;
        let estadoSeguro = "PAGADO";
        let montoAdeudado = 0;
        
        if (totalSeguroPagado < montoConfigSeguro) {
          estadoSeguro = "PARCIAL";
          montoAdeudado = montoConfigSeguro - totalSeguroPagado;
        }
        
        pagosSeguro.push({
          dni: dni,
          apellido: apellido,
          nombres: nombres,
          periodo: "ANUAL",
          año: AÑO,
          monto_pagado: totalSeguroPagado,
          monto_configurado: montoConfigSeguro,
          monto_adeudado: montoAdeudado,
          cuotas_pagadas: `${mesesConPago.length} cuotas`,
          metodo_pago: "EFECTIVO",
          numero_talonario: "",
          estado: estadoSeguro,
          notas: `Cuotas: ${mesesConPago.join(", ")}`
        });
      }
    }
    
    Logger.log(`   ✅ Procesadas: ${filasProcesadas} filas`);
  }
  
  return {
    estudiantes: estudiantes,
    pagosInscripcion: pagosInscripcion,
    pagosCuota: pagosCuota,
    pagosSeguro: pagosSeguro
  };
}

function encontrarIndices(headers) {
  const indices = {
    item: -1,
    apellido: -1,
    nombres: -1,
    dni: -1,
    telefono: -1,
    inscripcion: -1,
    seguroCol: -1,
    meses: {}
  };
  
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    if (h.includes("ITEM")) indices.item = i;
    else if (h === "APELLIDO") indices.apellido = i;
    else if (h === "NOMBRES") indices.nombres = i;
    else if (h === "DNI") indices.dni = i;
    else if (h === "TELEFONO" && indices.telefono === -1) indices.telefono = i;
    else if (h === "INSCRIPCION") indices.inscripcion = i;
  }
  
  // Buscar patrón: MES | SEGURO | MES | SEGURO | ...
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).toUpperCase().trim();
    
    for (const mes of MESES_ESPERADOS) {
      if (h === mes) {
        // Verificar si la siguiente columna es SEGURO
        if (i + 1 < headers.length) {
          const hNext = String(headers[i + 1]).toUpperCase().trim();
          if (hNext === "SEGURO") {
            indices.meses[mes] = {
              cuota: i,
              seguro: i + 1
            };
            break;
          }
        }
      }
    }
  }
  
  return indices;
}

function cargarConfiguracionCarreras(config) {
  const url = `${config.supabaseUrl}/rest/v1/configuracion_carreras?institucion_id=eq.${config.institucionId}`;
  
  const response = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "apikey": config.supabaseKey,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  });
  
  const configuracionCarreras = {};
  
  if (response.getResponseCode() === 200) {
    const dataConfig = JSON.parse(response.getContentText());
    
    for (let conf of dataConfig) {
      configuracionCarreras[conf.carrera_id] = {
        nombre: conf.nombre || `Carrera ${conf.carrera_id}`,
        monto_inscripcion: conf.monto_inscripcion,
        monto_cuota: conf.monto_cuota,
        monto_seguro: conf.monto_seguro
      };
      Logger.log(`   ✅ Carrera ${conf.carrera_id}: INSC=${conf.monto_inscripcion}, CUOTA=${conf.monto_cuota}, SEGURO=${conf.monto_seguro}`);
    }
  } else {
    Logger.log(`Error cargando configuración: ${response.getResponseCode()}`);
  }
  
  return configuracionCarreras;
}

// ==================== SINCRONIZACIÓN INTEGRADA ====================

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
  
  // FASE 1: Estudiantes
  Logger.log(`\n📦 FASE 1: Procesando ${estudiantes.length} estudiantes...`);
  const resultadosEstudiantes = procesarEstudiantes(config, estudiantes);
  contadores.estudiantesInsertados = resultadosEstudiantes.insertados;
  contadores.errores += resultadosEstudiantes.errores;
  Logger.log(`✅ Estudiantes: ${contadores.estudiantesInsertados}`);
  
  // FASE 2: Esperar y recargar
  Logger.log("\n⏳ Esperando 10 segundos...");
  Utilities.sleep(10000);
  
  Logger.log("📋 Recargando estudiantes desde Supabase...");
  const dniAEstudianteId = {};
  let intentos = 0;
  
  while (Object.keys(dniAEstudianteId).length < estudiantes.length && intentos < 3) {
    intentos++;
    
    for (let est of estudiantes) {
      const dni = est.dni;
      if (dni && !dniAEstudianteId[dni]) {
        const estudianteId = buscarEstudianteIdPorDni(config, dni);
        if (estudianteId) {
          dniAEstudianteId[dni] = estudianteId;
        }
      }
    }
    
    if (Object.keys(dniAEstudianteId).length < estudiantes.length) {
      Utilities.sleep(5000);
    }
  }
  
  Logger.log(`📊 Encontrados: ${Object.keys(dniAEstudianteId).length}/${estudiantes.length}`);
  
  // FASE 3: Conceptos
  const conceptosPorTipo = cargarConceptos(config);
  
  if (!conceptosPorTipo.inscripcion || !conceptosPorTipo.seguro) {
    Logger.log("⚠️ Faltan conceptos en Supabase");
  }
  
  // FASE 4-6: Pagos
  if (pagosInsc.length > 0) {
    Logger.log(`\n📦 FASE 4: Procesando ${pagosInsc.length} inscripciones...`);
    const resultadosInsc = procesarPagos(config, pagosInsc, "INSCRIPCION", dniAEstudianteId, conceptosPorTipo);
    contadores.pagosInscInsertados = resultadosInsc.insertados;
    contadores.pagosSkipped += resultadosInsc.skipped;
    contadores.errores += resultadosInsc.errores;
    Logger.log(`✅ Inscripciones: ${contadores.pagosInscInsertados}`);
  }
  
  if (pagosCuota.length > 0) {
    Logger.log(`\n📦 FASE 5: Procesando ${pagosCuota.length} cuotas...`);
    const resultadosCuota = procesarPagos(config, pagosCuota, "CUOTA", dniAEstudianteId, conceptosPorTipo);
    contadores.pagosCuotaInsertados = resultadosCuota.insertados;
    contadores.pagosSkipped += resultadosCuota.skipped;
    contadores.errores += resultadosCuota.errores;
    Logger.log(`✅ Cuotas: ${contadores.pagosCuotaInsertados}`);
  }
  
  if (pagosSeguro.length > 0) {
    Logger.log(`\n📦 FASE 6: Procesando ${pagosSeguro.length} seguros...`);
    const resultadosSeguro = procesarPagos(config, pagosSeguro, "SEGURO", dniAEstudianteId, conceptosPorTipo);
    contadores.pagosSeguroInsertados = resultadosSeguro.insertados;
    contadores.pagosSkipped += resultadosSeguro.skipped;
    contadores.errores += resultadosSeguro.errores;
    Logger.log(`✅ Seguros: ${contadores.pagosSeguroInsertados}`);
  }
  
  return {
    exito: contadores.errores === 0,
    contadores: contadores,
    fecha: new Date().toISOString()
  };
}

function guardarResultadoFinal(ss, resultado, datosNormalizados) {
  try {
    let logSheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!logSheet) {
      logSheet = ss.insertSheet(LOG_SHEET_NAME);
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

function obtenerConfig(ss) {
  const configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) throw new Error("Hoja CONFIG no encontrada");
  
  const data = configSheet.getDataRange().getValues();
  const config = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0] && row[1]) {
      const clave = row[0].toString().toUpperCase().trim();
      const valor = row[1];
      
      if (clave === "SUPABASE_URL") config.supabaseUrl = valor;
      if (clave === "SUPABASE_KEY") config.supabaseKey = valor;
      if (clave === "INSTITUCION_ID") config.institucionId = valor;
    }
  }
  
  return config;
}

function procesarEstudiantes(config, estudiantes) {
  const resultados = { insertados: 0, errores: 0 };
  
  for (let i = 0; i < estudiantes.length; i += BATCH_SIZE) {
    const lote = estudiantes.slice(i, i + BATCH_SIZE);
    const requests = [];
    const datosLote = [];
    
    for (let est of lote) {
      try {
        const datosCorregidos = prepararEstudiante(config, est);
        const url = `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(datosCorregidos.dni)}`;
        
        requests.push({
          url: url,
          method: "patch",
          headers: {
            "apikey": config.supabaseKey,
            "Content-Type": "application/json",
            "Authorization": "Bearer " + config.supabaseKey
          },
          payload: JSON.stringify(datosCorregidos),
          muteHttpExceptions: true
        });
        
        datosLote.push(datosCorregidos);
      } catch (e) {
        resultados.errores++;
      }
    }
    
    if (requests.length > 0) {
      try {
        const responses = UrlFetchApp.fetchAll(requests);
        
        for (let j = 0; j < responses.length; j++) {
          const resp = responses[j];
          const status = resp.getResponseCode();
          
          if (status === 200 || status === 204) {
            resultados.insertados++;
          } else if (status === 404) {
            try {
              const urlInsert = `${config.supabaseUrl}/rest/v1/estudiantes`;
              const optsInsert = {
                method: "post",
                headers: {
                  "apikey": config.supabaseKey,
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + config.supabaseKey
                },
                payload: JSON.stringify([datosLote[j]]),
                muteHttpExceptions: true
              };
              
              const respInsert = UrlFetchApp.fetch(urlInsert, optsInsert);
              if (respInsert.getResponseCode() === 201 || respInsert.getResponseCode() === 200) {
                resultados.insertados++;
              } else {
                resultados.errores++;
              }
            } catch (e) {
              resultados.errores++;
            }
          } else {
            resultados.errores++;
          }
        }
      } catch (e) {
        resultados.errores += requests.length;
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return resultados;
}

function procesarPagos(config, pagos, tipo, dniAEstudianteId, conceptosPorTipo) {
  const resultados = { insertados: 0, skipped: 0, errores: 0 };
  
  for (let i = 0; i < pagos.length; i += BATCH_SIZE) {
    const lote = pagos.slice(i, i + BATCH_SIZE);
    const requests = [];
    
    for (let pago of lote) {
      try {
        const datos = prepararPago(config, pago, tipo, dniAEstudianteId, conceptosPorTipo);
        
        requests.push({
          url: `${config.supabaseUrl}/rest/v1/pagos`,
          method: "post",
          headers: {
            "apikey": config.supabaseKey,
            "Content-Type": "application/json",
            "Authorization": "Bearer " + config.supabaseKey
          },
          payload: JSON.stringify([datos]),
          muteHttpExceptions: true
        });
      } catch (e) {
        if (e.toString().includes("no encontrado")) {
          resultados.skipped++;
        } else {
          resultados.errores++;
        }
      }
    }
    
    if (requests.length > 0) {
      try {
        const responses = UrlFetchApp.fetchAll(requests);
        
        for (let resp of responses) {
          if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
            resultados.insertados++;
          } else {
            resultados.errores++;
          }
        }
      } catch (e) {
        resultados.errores += requests.length;
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return resultados;
}

function prepararEstudiante(config, datos) {
  if (!datos.dni) throw new Error("DNI requerido");
  if (!datos.nombres && !datos.nombre) throw new Error("Nombre requerido");
  if (!datos.apellido) throw new Error("Apellido requerido");
  
  const datosCorregidos = {
    institucion_id: parseInt(config.institucionId),
    dni: datos.dni.toString().trim(),
    nombre: (datos.nombres || datos.nombre || "").toString().trim(),
    apellido: datos.apellido.toString().trim(),
    telefono: datos.telefono ? datos.telefono.toString().trim() : null,
    carrera_id: datos.carrera_id || 5,
    estado: datos.estado ? datos.estado.toString().trim() : "ACTIVO",
    fecha_ingreso: new Date().toISOString().split('T')[0]
  };
  
  for (let key in datosCorregidos) {
    if (datosCorregidos[key] === null || datosCorregidos[key] === "" || datosCorregidos[key] === undefined) {
      delete datosCorregidos[key];
    }
  }
  
  return datosCorregidos;
}

function prepararPago(config, pago, tipo, dniAEstudianteId, conceptosPorTipo) {
  const dni = pago.dni ? pago.dni.toString().trim() : null;
  if (!dni) throw new Error("DNI requerido");
  
  const estudianteId = dniAEstudianteId[dni];
  if (!estudianteId) throw new Error(`Estudiante DNI ${dni} no encontrado`);
  
  let conceptoId = null;
  
  if (tipo === "INSCRIPCION") {
    conceptoId = conceptosPorTipo.inscripcion;
  } else if (tipo === "SEGURO") {
    conceptoId = conceptosPorTipo.seguro;
  } else if (tipo === "CUOTA") {
    const mesNumero = convertirMesANumero(pago.mes);
    if (mesNumero) {
      conceptoId = conceptosPorTipo.cuotas[mesNumero];
    }
    if (!conceptoId) {
      throw new Error(`Concepto CUOTA mes=${pago.mes} no encontrado`);
    }
  }
  
  if (!conceptoId) {
    throw new Error(`Concepto_id no encontrado para tipo=${tipo}`);
  }
  
  const montoPagado = pago.monto_pagado ? parseFloat(pago.monto_pagado) : null;
  const montoOriginal = pago.monto_configurado ? parseFloat(pago.monto_configurado) : montoPagado;
  
  if (!montoPagado || montoPagado <= 0) {
    throw new Error(`Monto pagado inválido: ${pago.monto_pagado}`);
  }
  
  const anioDefault = pago.año || new Date().getFullYear();
  let fechaPago = convertirFecha(pago.fecha_pago, pago.mes, anioDefault);
  if (!fechaPago) {
    throw new Error(`Fecha inválida`);
  }
  
  const metodoPago = pago.metodo_pago ? pago.metodo_pago.toString().trim().toUpperCase() : "EFECTIVO";
  
  const datosCorregidos = {
    institucion_id: parseInt(config.institucionId),
    estudiante_id: estudianteId,
    concepto_id: conceptoId,
    monto_pagado: montoPagado,
    monto_original: montoOriginal,
    metodo_pago: metodoPago,
    numero_talonario: pago.numero_talonario ? pago.numero_talonario.toString().trim() : null,
    estado: pago.estado ? pago.estado.toString().trim() : "PAGADO",
    fecha_pago: fechaPago
  };
  
  for (let key in datosCorregidos) {
    if (datosCorregidos[key] === null || datosCorregidos[key] === "" || datosCorregidos[key] === undefined) {
      delete datosCorregidos[key];
    }
  }
  
  return datosCorregidos;
}

function cargarConceptos(config) {
  const url = `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${config.institucionId}&select=id,tipo,nombre,mes`;
  
  const conceptos = {
    inscripcion: null,
    seguro: null,
    cuotas: {}
  };
  
  try {
    const response = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "apikey": config.supabaseKey,
        "Authorization": "Bearer " + config.supabaseKey
      },
      muteHttpExceptions: true
    });
    
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

function buscarEstudianteIdPorDni(config, dni) {
  try {
    const response = UrlFetchApp.fetch(
      `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(dni)}&select=id`,
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
        return datos[0].id;
      }
    }
  } catch (e) {
    Logger.log(`Error buscando estudiante ${dni}: ` + e);
  }
  
  return null;
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

function convertirFecha(fechaDato, mes, anio) {
  if (fechaDato && fechaDato !== "") {
    let fecha = null;
    
    if (typeof fechaDato === "string") {
      if (fechaDato.length === 10 && fechaDato.match(/^\d{4}-\d{2}-\d{2}$/)) {
        fecha = new Date(fechaDato + "T00:00:00Z");
      } else if (fechaDato.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const partes = fechaDato.split("/");
        fecha = new Date(parseInt(partes[2]), parseInt(partes[1]) - 1, parseInt(partes[0]));
      }
    } else if (typeof fechaDato === "number") {
      fecha = new Date((fechaDato - 25569) * 86400 * 1000);
    }
    
    if (fecha && !isNaN(fecha.getTime())) {
      return fecha.toISOString().split('T')[0];
    }
  }
  
  if (mes && anio) {
    const mesNum = convertirMesANumero(mes);
    if (mesNum && anio > 2000 && anio < 2100) {
      const fecha = new Date(anio, mesNum - 1, 1);
      return fecha.toISOString().split('T')[0];
    }
  }
  
  if (anio && anio > 2000 && anio < 2100) {
    const fecha = new Date(anio, 0, 1);
    return fecha.toISOString().split('T')[0];
  }
  
  return null;
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
