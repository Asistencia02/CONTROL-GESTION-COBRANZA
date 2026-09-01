// ==================== GOOGLE APPS SCRIPT - FULL AUTO CORREGIDO v2 ====================
// Normalización + Sincronización automática en 1 click
// ✅ CORREGIDO: Conceptos POR CARRERA + UPSERT estudiantes + reintentos
// ==================== CONFIGURACIÓN ====================

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const BATCH_SIZE = 5;
const DELAY_MS = 800;
const MAX_REINTENTOS = 5;
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
    
    Logger.log("\n" + "=".repeat(70));
    Logger.log("🚀 INICIANDO FULL AUTO - Normalización + Sincronización v2 CORREGIDA");
    Logger.log("=".repeat(70));
    
    ui.showModelessDialog(
      HtmlService.createHtmlOutput('<p>⏳ Procesando... esto puede tomar 5-10 minutos.</p><p>No cierres esta ventana.</p>'),
      '🔄 Sincronización en progreso'
    );
    
    // PASO 1: NORMALIZAR
    Logger.log("\n📋 FASE 1: Normalizando datos desde Excel base...");
    const { datosNormalizados, hojaSync, SUPABASE_URL, SUPABASE_KEY, INSTITUCION_ID } = normalizarExcelConSeguroAnual();
    
    if (!datosNormalizados) {
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
   • Estudiantes procesados: ${resultadoSync.contadores.estudiantesInsertados}
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

// ==================== NORMALIZACIÓN ====================

function normalizarExcelConSeguroAnual() {
  try {
    Logger.log("🚀 Iniciando normalización - SEGURO como pago ANUAL...");
    
    // CREDENCIALES SUPABASE
    const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
    const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
    const INSTITUCION_ID = 2;
    const AÑO = 2026;
    
    const mapeoCarreras = {
      "INICIAL2026": 4,
      "PRIMARIA2026": 5,
      "SECUNDARIA2026": 6
    };
    
    Logger.log("✅ Credenciales Supabase cargadas");
    
    // PASO 1: OBTENER CONFIGURACIÓN DE CARRERAS DESDE SUPABASE
    Logger.log("\n📡 Conectando a Supabase para obtener configuración...");
    
    const configuracionCarreras = {};
    
    try {
      const urlConfiguracion = `${SUPABASE_URL}/rest/v1/configuracion_carreras?institucion_id=eq.${INSTITUCION_ID}`;
      
      const responseConfig = UrlFetchApp.fetch(urlConfiguracion, {
        method: "get",
        headers: {
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        muteHttpExceptions: true
      });
      
      Logger.log(`   Status: ${responseConfig.getResponseCode()}`);
      
      if (responseConfig.getResponseCode() === 200) {
        const dataConfig = JSON.parse(responseConfig.getContentText());
        
        Logger.log(`✅ Configuración cargada desde Supabase: ${dataConfig.length} registros`);
        
        for (let config of dataConfig) {
          configuracionCarreras[config.carrera_id] = {
            nombre: config.nombre || `Carrera ${config.carrera_id}`,
            monto_inscripcion: config.monto_inscripcion,
            monto_cuota: config.monto_cuota,
            monto_seguro: config.monto_seguro
          };
          Logger.log(`   ✅ Carrera ${config.carrera_id}: INSC=${config.monto_inscripcion}, CUOTA=${config.monto_cuota}, SEGURO=${config.monto_seguro}`);
        }
      } else {
        Logger.log(`❌ Error ${responseConfig.getResponseCode()}: ${responseConfig.getContentText()}`);
        return null;
      }
    } catch (e) {
      Logger.log("❌ Error conectando a Supabase: " + e.toString());
      return null;
    }
    
    // PASO 2: OBTENER ARCHIVO EXCEL
    const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
    const files = DriveApp.getFilesByName(nombreArchivo);
    
    if (!files.hasNext()) {
      Logger.log("❌ No se encontró: " + nombreArchivo);
      return null;
    }
    
    const file = files.next();
    Logger.log("\n✅ Archivo Excel encontrado");
    
    // PASO 3: CREAR NUEVO SHEET
    const spreadsheet = SpreadsheetApp.create("Sync_Normalizado_" + Date.now());
    const ss = spreadsheet.getActiveSheet();
    ss.setName("CONFIG");
    
    Logger.log("✅ Nuevo Spreadsheet creado");
    
    // PASO 4: CREAR HOJAS
    const hojaConfig = ss;
    const hojaEstudiantes = spreadsheet.insertSheet("ESTUDIANTES");
    const hojaInscripcion = spreadsheet.insertSheet("PAGOS_INSCRIPCION");
    const hojaCuota = spreadsheet.insertSheet("PAGOS_CUOTA");
    const hojaSeguro = spreadsheet.insertSheet("PAGOS_SEGURO_ANUAL");
    
    // PASO 5: LLENAR CONFIG
    hojaConfig.clear();
    hojaConfig.appendRow(["PARÁMETRO", "VALOR"]);
    hojaConfig.appendRow(["INSTITUCION_ID", INSTITUCION_ID]);
    hojaConfig.appendRow(["INSTITUCION_NOMBRE", "INSM"]);
    hojaConfig.appendRow(["AÑO", AÑO]);
    hojaConfig.appendRow(["SUPABASE_URL", SUPABASE_URL]);
    hojaConfig.appendRow(["SUPABASE_KEY", SUPABASE_KEY]);
    hojaConfig.appendRow(["NOTA", "SEGURO es pago ANUAL (suma de 10 cuotas mensuales)"]);
    
    Logger.log("✅ CONFIG completada");
    
    // PASO 6: OBTENER SHEETS
    const fileId = file.getId();
    const tempSpreadsheet = SpreadsheetApp.openById(fileId);
    
    Logger.log("✅ Leyendo hojas del Excel...");
    
    // ALMACENAMIENTO DE DATOS
    const estudiantes = {};
    const pagosInscripcion = [];
    const pagosCuota = [];
    const pagosSeguro = [];
    
    const mesesAbreviados = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPT", "OCTUBRE", "NOV", "DIC"];
    
    // PASO 7: PROCESAR CADA HOJA
    const hojas = tempSpreadsheet.getSheets();
    
    for (let h = 0; h < hojas.length; h++) {
      const hoja = hojas[h];
      const nombreHoja = hoja.getName();
      Logger.log(`\n📄 Hoja ${h+1}/${hojas.length}: ${nombreHoja}`);
      
      const carreraId = mapeoCarreras[nombreHoja];
      if (!carreraId) {
        Logger.log(`   ⚠️ Hoja no reconocida, saltando...`);
        continue;
      }
      
      const config = configuracionCarreras[carreraId];
      if (!config) {
        Logger.log(`   ⚠️ No hay configuración para carrera_id=${carreraId}, saltando...`);
        continue;
      }
      
      Logger.log(`   ✅ carrera_id=${carreraId}`);
      Logger.log(`   📋 SEGURO ANUAL CONFIGURADO: ${config.monto_seguro}`);
      
      // OBTENER DATOS
      const lastRow = hoja.getLastRow();
      const lastCol = hoja.getLastColumn();
      
      if (lastRow < 2) {
        Logger.log(`   ⚠️ Hoja vacía`);
        continue;
      }
      
      const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
      const headers = datos[0];
      
      Logger.log(`   Datos: ${lastRow} filas, ${lastCol} columnas`);
      
      // ENCONTRAR ÍNDICES
      let idxItem = -1, idxApellido = -1, idxNombres = -1, idxDNI = -1;
      let idxTelefono = -1, idxInscripcion = -1;
      const idxCuota = {};
      const idxSeguro = {};
      
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i]).toUpperCase().trim();
        
        if (h.includes("ITEM")) idxItem = i;
        else if (h === "APELLIDO") idxApellido = i;
        else if (h === "NOMBRES") idxNombres = i;
        else if (h === "DNI") idxDNI = i;
        else if (h === "TELEFONO") idxTelefono = i;
        else if (h === "INSCRIPCION") idxInscripcion = i;
      }
      
      // DETECTAR MESES Y SEGUROS
      for (let i = 0; i < headers.length - 1; i++) {
        const hActual = String(headers[i]).toUpperCase().trim();
        const hProxima = String(headers[i + 1]).toUpperCase().trim();
        
        if (hActual === "SEGURO") {
          for (let mes of mesesAbreviados) {
            if (hProxima === mes || hProxima.includes(mes)) {
              idxCuota[mes] = i + 1;
              idxSeguro[mes] = i;
              break;
            }
          }
        }
        
        for (let mes of mesesAbreviados) {
          if (hActual.includes("SEGURO") && hActual.includes(mes) && !idxSeguro[mes]) {
            idxSeguro[mes] = i;
          }
          if (hActual === mes && !idxCuota[mes]) {
            idxCuota[mes] = i;
          }
        }
      }
      
      // PROCESAR FILAS
      let contador = 0;
      for (let r = 1; r < datos.length; r++) {
        const fila = datos[r];
        
        const item = fila[idxItem] || "";
        const apellido = String(fila[idxApellido] || "").trim();
        const nombres = String(fila[idxNombres] || "").trim();
        const dniRaw = fila[idxDNI];
        const telefono = String(fila[idxTelefono] || "");
        const montoPagadoInscripcion = parseInt(fila[idxInscripcion]) || 0;
        
        let dni = "";
        if (dniRaw) {
          dni = String(dniRaw).split(".")[0].trim();
        }
        
        if (!dni || !apellido) continue;
        
        // GUARDAR ESTUDIANTE CON CARRERA_ID
        if (!estudiantes[dni]) {
          estudiantes[dni] = {
            item: item,
            dni: dni,
            apellido: apellido,
            nombres: nombres,
            telefono: telefono,
            carrera_id: carreraId,
            estado: "ACTIVO"
          };
          contador++;
        }
        
        // GUARDAR INSCRIPCION CON VALIDACIÓN
        if (montoPagadoInscripcion > 0) {
          const montoConfigInscripcion = config.monto_inscripcion;
          let estadoInscripcion = "PAGADO";
          let montoAdeudado = 0;
          
          if (montoPagadoInscripcion < montoConfigInscripcion) {
            estadoInscripcion = "PARCIAL";
            montoAdeudado = montoConfigInscripcion - montoPagadoInscripcion;
          }
          
          pagosInscripcion.push([
            item, dni, apellido, nombres, carreraId,
            montoPagadoInscripcion, montoConfigInscripcion, montoAdeudado,
            "", "EFECTIVO", "", "", estadoInscripcion, ""
          ]);
        }
        
        // GUARDAR CUOTA CON VALIDACIÓN
        for (let mes of mesesAbreviados) {
          if (idxCuota[mes] !== undefined) {
            const montoPagado = parseInt(fila[idxCuota[mes]]) || 0;
            if (montoPagado > 0) {
              const montoConfig = config.monto_cuota;
              let estado = "PAGADO";
              let montoAdeudado = 0;
              
              if (montoPagado < montoConfig) {
                estado = "PARCIAL";
                montoAdeudado = montoConfig - montoPagado;
              }
              
              let mesCompleto = mes;
              if (mes === "SEPT") mesCompleto = "SEPTIEMBRE";
              if (mes === "NOV") mesCompleto = "NOVIEMBRE";
              if (mes === "DIC") mesCompleto = "DICIEMBRE";
              
              pagosCuota.push([
                item, dni, apellido, nombres, carreraId, mesCompleto, AÑO, 
                montoPagado, montoConfig, montoAdeudado, 
                "", "EFECTIVO", "", estado, ""
              ]);
            }
          }
        }
        
        // SEGURO ANUAL - SUMAR TODAS LAS CUOTAS DE SEGURO
        let totalSeguroPagado = 0;
        let mesesConPago = [];
        
        for (let mes of mesesAbreviados) {
          if (idxSeguro[mes] !== undefined) {
            const montoPagado = parseInt(fila[idxSeguro[mes]]) || 0;
            if (montoPagado > 0) {
              totalSeguroPagado += montoPagado;
              mesesConPago.push(mes);
            }
          }
        }
        
        if (totalSeguroPagado > 0) {
          const montoConfigSeguro = config.monto_seguro;
          let estadoSeguro = "PAGADO";
          let montoAdeudado = 0;
          
          if (totalSeguroPagado < montoConfigSeguro) {
            estadoSeguro = "PARCIAL";
            montoAdeudado = montoConfigSeguro - totalSeguroPagado;
          }
          
          pagosSeguro.push([
            item, dni, apellido, nombres, carreraId,
            "ANUAL", AÑO,
            totalSeguroPagado, montoConfigSeguro, montoAdeudado,
            `${mesesConPago.length} cuotas`, "EFECTIVO", "", estadoSeguro, 
            `Cuotas: ${mesesConPago.join(", ")}`
          ]);
        }
      }
      
      Logger.log(`   ✅ Procesados: ${contador} estudiantes`);
    }
    
    // PASO 8: LLENAR HOJAS
    Logger.log(`\n📝 Creando hojas con datos validados...`);
    
    // ESTUDIANTES
    hojaEstudiantes.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "TELEFONO", "CARRERA_ID", "ESTADO"]);
    let estData = [];
    for (let dni in estudiantes) {
      const e = estudiantes[dni];
      estData.push([e.item, e.dni, e.apellido, e.nombres, e.telefono, e.carrera_id, e.estado]);
      if (estData.length === 100) {
        hojaEstudiantes.getRange(hojaEstudiantes.getLastRow() + 1, 1, estData.length, 7).setValues(estData);
        estData = [];
      }
    }
    if (estData.length > 0) {
      hojaEstudiantes.getRange(hojaEstudiantes.getLastRow() + 1, 1, estData.length, 7).setValues(estData);
    }
    Logger.log(`   ✅ Estudiantes: ${Object.keys(estudiantes).length}`);
    
    // INSCRIPCION (14 columnas ahora - con CARRERA_ID)
    hojaInscripcion.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "TIPO_TARJETA", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
    for (let i = 0; i < pagosInscripcion.length; i += 100) {
      const chunk = pagosInscripcion.slice(i, i + 100);
      hojaInscripcion.getRange(hojaInscripcion.getLastRow() + 1, 1, chunk.length, 14).setValues(chunk);
    }
    Logger.log(`   ✅ Inscripción: ${pagosInscripcion.length}`);
    
    // CUOTA (15 columnas ahora - con CARRERA_ID)
    hojaCuota.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "MES", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "FECHA_PAGO", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
    for (let i = 0; i < pagosCuota.length; i += 100) {
      const chunk = pagosCuota.slice(i, i + 100);
      hojaCuota.getRange(hojaCuota.getLastRow() + 1, 1, chunk.length, 15).setValues(chunk);
    }
    Logger.log(`   ✅ Cuota: ${pagosCuota.length}`);
    
    // SEGURO ANUAL (15 columnas ahora - con CARRERA_ID)
    hojaSeguro.appendRow(["ITEM", "DNI", "APELLIDO", "NOMBRES", "CARRERA_ID", "PERIODO", "AÑO", "MONTO_PAGADO", "MONTO_CONFIGURADO", "MONTO_ADEUDADO", "CUOTAS_PAGADAS", "METODO_PAGO", "NUMERO_TALONARIO", "ESTADO", "NOTAS"]);
    for (let i = 0; i < pagosSeguro.length; i += 100) {
      const chunk = pagosSeguro.slice(i, i + 100);
      hojaSeguro.getRange(hojaSeguro.getLastRow() + 1, 1, chunk.length, 15).setValues(chunk);
    }
    Logger.log(`   ✅ Seguro Anual: ${pagosSeguro.length}`);
    
    Logger.log("\n" + "=".repeat(70));
    Logger.log("✅ ¡NORMALIZACIÓN COMPLETADA EXITOSAMENTE!");
    Logger.log("=".repeat(70));
    Logger.log(`📊 RESUMEN:`);
    Logger.log(`   ✅ Estudiantes: ${Object.keys(estudiantes).length}`);
    Logger.log(`   ✅ Pagos Inscripción: ${pagosInscripcion.length}`);
    Logger.log(`   ✅ Pagos Cuota: ${pagosCuota.length}`);
    Logger.log(`   ✅ Pagos Seguro (ANUAL): ${pagosSeguro.length}`);
    Logger.log(`   ✅ TOTAL REGISTROS: ${pagosInscripcion.length + pagosCuota.length + pagosSeguro.length}`);
    Logger.log(`\n🔗 Spreadsheet: https://docs.google.com/spreadsheets/d/${spreadsheet.getId()}`);
    Logger.log("=".repeat(70));
    
    return {
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
    
  } catch (error) {
    Logger.log("❌ ERROR EN NORMALIZACIÓN: " + error);
    return null;
  }
}

// ==================== SINCRONIZACIÓN CORREGIDA v2 ====================

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
  
  // FASE 1: Estudiantes con UPSERT
  Logger.log(`\n📦 FASE 1: Procesando ${estudiantes.length} estudiantes (UPSERT)...`);
  const resultadosEstudiantes = procesarEstudiantesUpsert(config, estudiantes);
  contadores.estudiantesInsertados = resultadosEstudiantes.procesados;
  contadores.errores += resultadosEstudiantes.errores;
  Logger.log(`✅ Estudiantes: ${contadores.estudiantesInsertados} procesados, ${resultadosEstudiantes.errores} errores`);
  
  // FASE 2: Esperar y recargar
  Logger.log("\n⏳ Esperando 15 segundos (mayor latencia para Supabase)...");
  Utilities.sleep(15000);
  
  Logger.log("📋 Recargando estudiantes desde Supabase con reintentos...");
  const dniAEstudianteId = buscarEstudiantesConReintentos(config, estudiantes);
  Logger.log(`📊 Encontrados: ${Object.keys(dniAEstudianteId).length}/${estudiantes.length}`);
  
  if (Object.keys(dniAEstudianteId).length === 0) {
    Logger.log("❌ ERROR: No se encontraron estudiantes en la BD. Abortando sincronización de pagos.");
    contadores.errores += pagosInsc.length + pagosCuota.length + pagosSeguro.length;
    return {
      exito: false,
      contadores: contadores,
      fecha: new Date().toISOString()
    };
  }
  
  // FASE 3: Conceptos POR CARRERA
  const conceptosPorCarrera = cargarConceptosPorCarrera(config);
  Logger.log(`✅ Conceptos cargados por carrera`);
  
  // FASE 4-6: Pagos
  if (pagosInsc.length > 0) {
    Logger.log(`\n📦 FASE 4: Procesando ${pagosInsc.length} inscripciones...`);
    const resultadosInsc = procesarPagosArrayCorregido(config, pagosInsc, "INSCRIPCION", dniAEstudianteId, conceptosPorCarrera);
    contadores.pagosInscInsertados = resultadosInsc.insertados;
    contadores.pagosSkipped += resultadosInsc.skipped;
    contadores.errores += resultadosInsc.errores;
    Logger.log(`✅ Inscripciones: ${contadores.pagosInscInsertados} insertadas, ${resultadosInsc.skipped} omitidas, ${resultadosInsc.errores} errores`);
  }
  
  if (pagosCuota.length > 0) {
    Logger.log(`\n📦 FASE 5: Procesando ${pagosCuota.length} cuotas...`);
    const resultadosCuota = procesarPagosArrayCorregido(config, pagosCuota, "CUOTA", dniAEstudianteId, conceptosPorCarrera);
    contadores.pagosCuotaInsertados = resultadosCuota.insertados;
    contadores.pagosSkipped += resultadosCuota.skipped;
    contadores.errores += resultadosCuota.errores;
    Logger.log(`✅ Cuotas: ${contadores.pagosCuotaInsertados} insertadas, ${resultadosCuota.skipped} omitidas, ${resultadosCuota.errores} errores`);
  }
  
  if (pagosSeguro.length > 0) {
    Logger.log(`\n📦 FASE 6: Procesando ${pagosSeguro.length} seguros...`);
    const resultadosSeguro = procesarPagosArrayCorregido(config, pagosSeguro, "SEGURO", dniAEstudianteId, conceptosPorCarrera);
    contadores.pagosSeguroInsertados = resultadosSeguro.insertados;
    contadores.pagosSkipped += resultadosSeguro.skipped;
    contadores.errores += resultadosSeguro.errores;
    Logger.log(`✅ Seguros: ${contadores.pagosSeguroInsertados} insertados, ${resultadosSeguro.skipped} omitidos, ${resultadosSeguro.errores} errores`);
  }
  
  return {
    exito: contadores.errores === 0,
    contadores: contadores,
    fecha: new Date().toISOString()
  };
}

// ==================== FUNCIONES CORREGIDAS ====================

function procesarEstudiantesUpsert(config, estudiantes) {
  const resultados = { procesados: 0, errores: 0 };
  
  for (let i = 0; i < estudiantes.length; i += BATCH_SIZE) {
    const lote = estudiantes.slice(i, i + BATCH_SIZE);
    const datosLote = [];
    
    for (let est of lote) {
      try {
        const datosCorregidos = {
          institucion_id: parseInt(config.institucionId),
          dni: est.dni.toString().trim(),
          nombre: est.nombres.toString().trim(),
          apellido: est.apellido.toString().trim(),
          telefono: est.telefono ? est.telefono.toString().trim() : null,
          carrera_id: est.carrera_id || 5,
          estado: est.estado || "ACTIVO",
          fecha_ingreso: new Date().toISOString().split('T')[0]
        };
        
        datosLote.push(datosCorregidos);
      } catch (e) {
        resultados.errores++;
      }
    }
    
    // UPSERT: Primero buscar por DNI, si existe UPDATE, si no INSERT
    for (let datos of datosLote) {
      try {
        const urlBuscar = `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(datos.dni)}&select=id`;
        const respBuscar = UrlFetchApp.fetch(urlBuscar, {
          method: "get",
          headers: {
            "apikey": config.supabaseKey,
            "Content-Type": "application/json"
          },
          muteHttpExceptions: true
        });
        
        if (respBuscar.getResponseCode() === 200) {
          const existentes = JSON.parse(respBuscar.getContentText());
          
          if (existentes && existentes.length > 0) {
            // UPDATE
            const id = existentes[0].id;
            const urlUpdate = `${config.supabaseUrl}/rest/v1/estudiantes?id=eq.${id}`;
            const respUpdate = UrlFetchApp.fetch(urlUpdate, {
              method: "patch",
              headers: {
                "apikey": config.supabaseKey,
                "Content-Type": "application/json",
                "Authorization": "Bearer " + config.supabaseKey
              },
              payload: JSON.stringify(datos),
              muteHttpExceptions: true
            });
            
            if (respUpdate.getResponseCode() === 200 || respUpdate.getResponseCode() === 204) {
              resultados.procesados++;
            } else {
              resultados.errores++;
              Logger.log(`❌ Error UPDATE estudiante ${datos.dni}: ${respUpdate.getResponseCode()}`);
            }
          } else {
            // INSERT
            const urlInsert = `${config.supabaseUrl}/rest/v1/estudiantes`;
            const respInsert = UrlFetchApp.fetch(urlInsert, {
              method: "post",
              headers: {
                "apikey": config.supabaseKey,
                "Content-Type": "application/json",
                "Authorization": "Bearer " + config.supabaseKey
              },
              payload: JSON.stringify([datos]),
              muteHttpExceptions: true
            });
            
            if (respInsert.getResponseCode() === 201 || respInsert.getResponseCode() === 200) {
              resultados.procesados++;
            } else {
              resultados.errores++;
              Logger.log(`❌ Error INSERT estudiante ${datos.dni}: ${respInsert.getResponseCode()}`);
            }
          }
        }
      } catch (e) {
        resultados.errores++;
        Logger.log(`❌ Error procesando estudiante: ${e}`);
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return resultados;
}

function buscarEstudiantesConReintentos(config, estudiantes) {
  const dniAEstudianteId = {};
  const dnis = estudiantes.map(e => e.dni);
  
  for (let intento = 0; intento < MAX_REINTENTOS; intento++) {
    const dnisFaltantes = dnis.filter(dni => !dniAEstudianteId[dni]);
    
    if (dnisFaltantes.length === 0) {
      Logger.log(`✅ Todos los DNIs encontrados en intento ${intento + 1}`);
      break;
    }
    
    Logger.log(`Intento ${intento + 1}/${MAX_REINTENTOS}: Buscando ${dnisFaltantes.length} DNIs restantes...`);
    
    for (let dni of dnisFaltantes) {
      const estudianteId = buscarEstudianteIdPorDni(config, dni);
      if (estudianteId) {
        dniAEstudianteId[dni] = estudianteId;
      }
    }
    
    if (dnisFaltantes.length > Object.keys(dniAEstudianteId).length) {
      Utilities.sleep(5000); // Esperar más si todavía faltan
    }
  }
  
  return dniAEstudianteId;
}

// ✅ NUEVA FUNCIÓN: Cargar conceptos POR CARRERA
function cargarConceptosPorCarrera(config) {
  const conceptosPorCarrera = {
    4: { inscripcion: null, seguro: null, cuotas: {} },
    5: { inscripcion: null, seguro: null, cuotas: {} },
    6: { inscripcion: null, seguro: null, cuotas: {} }
  };
  
  try {
    const url = `${config.supabaseUrl}/rest/v1/conceptos_pago?institucion_id=eq.${config.institucionId}&select=id,tipo,mes,carrera_id`;
    
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
      Logger.log(`✅ Conceptos encontrados: ${datos.length}`);
      
      for (let concepto of datos) {
        const carrera = concepto.carrera_id;
        
        if (conceptosPorCarrera[carrera]) {
          if (concepto.tipo === "INSCRIPCION") {
            conceptosPorCarrera[carrera].inscripcion = concepto.id;
            Logger.log(`   Carrera ${carrera} - INSCRIPCION: concepto_id=${concepto.id}`);
          } else if (concepto.tipo === "SEGURO") {
            conceptosPorCarrera[carrera].seguro = concepto.id;
            Logger.log(`   Carrera ${carrera} - SEGURO: concepto_id=${concepto.id}`);
          } else if (concepto.tipo === "CUOTA" && concepto.mes) {
            const mesNum = concepto.mes;
            conceptosPorCarrera[carrera].cuotas[mesNum] = concepto.id;
            Logger.log(`   Carrera ${carrera} - CUOTA MES ${mesNum}: concepto_id=${concepto.id}`);
          }
        }
      }
    } else {
      Logger.log(`❌ Error cargando conceptos: ${response.getResponseCode()}`);
    }
  } catch (e) {
    Logger.log("❌ Error cargando conceptos: " + e);
  }
  
  return conceptosPorCarrera;
}

function procesarPagosArrayCorregido(config, pagosArray, tipo, dniAEstudianteId, conceptosPorCarrera) {
  const resultados = { insertados: 0, skipped: 0, errores: 0 };
  
  for (let i = 0; i < pagosArray.length; i += BATCH_SIZE) {
    const lote = pagosArray.slice(i, i + BATCH_SIZE);
    const requests = [];
    
    for (let pagoArray of lote) {
      try {
        const pago = arrayAPago(pagoArray);
        const datos = prepararPagoCorregido(config, pago, tipo, dniAEstudianteId, conceptosPorCarrera);
        
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
            Logger.log(`❌ Error al insertar pago: ${resp.getResponseCode()} - ${resp.getContentText()}`);
          }
        }
      } catch (e) {
        resultados.errores += requests.length;
        Logger.log(`❌ Error en fetchAll: ${e}`);
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return resultados;
}

function prepararPagoCorregido(config, pago, tipo, dniAEstudianteId, conceptosPorCarrera) {
  const dni = pago.dni ? pago.dni.toString().trim() : null;
  if (!dni) throw new Error("DNI requerido");
  
  const estudianteId = dniAEstudianteId[dni];
  if (!estudianteId) throw new Error(`Estudiante DNI ${dni} no encontrado`);
  
  const carreraId = pago.carrera_id || 5;
  if (!conceptosPorCarrera[carreraId]) {
    throw new Error(`Carrera ${carreraId} no tiene conceptos configurados`);
  }
  
  let conceptoId = null;
  
  if (tipo === "INSCRIPCION") {
    conceptoId = conceptosPorCarrera[carreraId].inscripcion;
  } else if (tipo === "SEGURO") {
    conceptoId = conceptosPorCarrera[carreraId].seguro;
  } else if (tipo === "CUOTA") {
    const mesNumero = convertirMesANumero(pago.mes);
    if (mesNumero) {
      conceptoId = conceptosPorCarrera[carreraId].cuotas[mesNumero];
    }
    if (!conceptoId) {
      throw new Error(`Concepto CUOTA mes=${pago.mes} (${mesNumero}) no encontrado para carrera ${carreraId}`);
    }
  }
  
  if (!conceptoId) {
    throw new Error(`Concepto_id no encontrado para tipo=${tipo}, carrera=${carreraId}`);
  }
  
  const montoPagado = parseFloat(pago.monto_pagado) || 0;
  if (!montoPagado || montoPagado <= 0) {
    throw new Error(`Monto pagado inválido: ${pago.monto_pagado}`);
  }
  
  const montoOriginal = parseFloat(pago.monto_configurado) || montoPagado;
  
  const anioDefault = pago.año || new Date().getFullYear();
  let fechaPago = convertirFechaCorregida(pago.fecha_pago, pago.mes, anioDefault, tipo);
  if (!fechaPago) {
    throw new Error(`Fecha inválida`);
  }
  
  const metodoPago = pago.metodo_pago ? pago.metodo_pago.toString().trim().toUpperCase() : "EFECTIVO";
  
  return {
    institucion_id: parseInt(config.institucionId),
    estudiante_id: estudianteId,
    concepto_id: conceptoId,
    monto_pagado: montoPagado,
    monto_original: montoOriginal,
    metodo_pago: metodoPago,
    numero_talonario: pago.numero_talonario ? pago.numero_talonario.toString().trim() : null,
    estado: pago.estado ? pago.estado.toString().trim() : "PAGADO",
    fecha_pago: fechaPago,
    carrera_id: carreraId
  };
}

function convertirFechaCorregida(fechaDato, mes, anio, tipo) {
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
  
  if (mes && anio > 2000 && anio < 2100) {
    const mesNum = convertirMesANumero(mes);
    if (mesNum) {
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

function arrayAPago(arr) {
  if (arr.length === 14) {
    // INSCRIPCION: [ITEM, DNI, APELLIDO, NOMBRES, CARRERA_ID, MONTO_PAGADO, MONTO_CONFIGURADO, MONTO_ADEUDADO, FECHA_PAGO, METODO_PAGO, TIPO_TARJETA, NUMERO_TALONARIO, ESTADO, NOTAS]
    return {
      dni: arr[1],
      apellido: arr[2],
      nombres: arr[3],
      carrera_id: arr[4],
      monto_pagado: arr[5],
      monto_configurado: arr[6],
      monto_adeudado: arr[7],
      fecha_pago: arr[8],
      metodo_pago: arr[9],
      tipo_tarjeta: arr[10],
      numero_talonario: arr[11],
      estado: arr[12],
      notas: arr[13],
      mes: null
    };
  } else if (arr.length === 15) {
    if (arr[5] === "ANUAL") {
      // SEGURO: [ITEM, DNI, APELLIDO, NOMBRES, CARRERA_ID, PERIODO, AÑO, MONTO_PAGADO, MONTO_CONFIGURADO, MONTO_ADEUDADO, CUOTAS_PAGADAS, METODO_PAGO, NUMERO_TALONARIO, ESTADO, NOTAS]
      return {
        dni: arr[1],
        apellido: arr[2],
        nombres: arr[3],
        carrera_id: arr[4],
        periodo: arr[5],
        año: arr[6],
        monto_pagado: arr[7],
        monto_configurado: arr[8],
        monto_adeudado: arr[9],
        cuotas_pagadas: arr[10],
        metodo_pago: arr[11],
        numero_talonario: arr[12],
        estado: arr[13],
        notas: arr[14],
        mes: null
      };
    } else {
      // CUOTA: [ITEM, DNI, APELLIDO, NOMBRES, CARRERA_ID, MES, AÑO, MONTO_PAGADO, MONTO_CONFIGURADO, MONTO_ADEUDADO, FECHA_PAGO, METODO_PAGO, NUMERO_TALONARIO, ESTADO, NOTAS]
      return {
        dni: arr[1],
        apellido: arr[2],
        nombres: arr[3],
        carrera_id: arr[4],
        mes: arr[5],
        año: arr[6],
        monto_pagado: arr[7],
        monto_configurado: arr[8],
        monto_adeudado: arr[9],
        fecha_pago: arr[10],
        metodo_pago: arr[11],
        numero_talonario: arr[12],
        estado: arr[13],
        notas: arr[14]
      };
    }
  }
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
