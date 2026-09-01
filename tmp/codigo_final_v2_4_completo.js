// ==================== GOOGLE APPS SCRIPT - FULL AUTO v2.4 ====================
// ✅ Excel fijo normalizado + Batch insert + Debug seguros
// ==================== CONFIGURACIÓN ====================

const CONFIG_SHEET_NAME = "CONFIG";
const LOG_SHEET_NAME = "LOG_SINCRONIZACION";
const BATCH_SIZE = 10; // Aumentado para batch insert
const DELAY_MS = 200; // Reducido
const MAX_REINTENTOS = 5;
const EXCEL_NORMALIZADO_NOMBRE = "SYNC_NORMALIZADO_INSM_2026";

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
    Logger.log("🚀 INICIANDO FULL AUTO v2.4");
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
  
  // Buscar o crear spreadsheet NORMALIZADO FIJO
  Logger.log("Buscando/creando Excel normalizado fijo...");
  const spreadsheet = buscarOCrearNormalizadoFijo();
  Logger.log("✅ Excel normalizado fijo OK");
  
  // Obtener o crear hojas
  const hojaEstudiantes = obtenerOCrearHoja(spreadsheet, "ESTUDIANTES");
  const hojaInscripcion = obtenerOCrearHoja(spreadsheet, "PAGOS_INSCRIPCION");
  const hojaCuota = obtenerOCrearHoja(spreadsheet, "PAGOS_CUOTA");
  const hojaSeguro = obtenerOCrearHoja(spreadsheet, "PAGOS_SEGURO_ANUAL");
  
  Logger.log("✅ Hojas preparadas");
  
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
  Logger.log(`   - Inscripción: ${pagosInscripcion.length}`);
  Logger.log(`   - Cuota: ${pagosCuota.length}`);
  Logger.log(`   - Seguro: ${pagosSeguro.length}`);
  
  // Llenar hojas (LIMPIANDO PRIMERO)
  Logger.log("Actualizando hojas...");
  limpiarYLlenarHojas(hojaEstudiantes, hojaInscripcion, hojaCuota, hojaSeguro, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro);
  
  Logger.log("✅ Normalización completada");
  
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

function buscarOCrearNormalizadoFijo() {
  try {
    const files = DriveApp.getFilesByName(EXCEL_NORMALIZADO_NOMBRE);
    if (files.hasNext()) {
      const fileId = files.next().getId();
      Logger.log(`   ℹ️ Excel normalizado existente: ${EXCEL_NORMALIZADO_NOMBRE}`);
      return SpreadsheetApp.openById(fileId);
    }
  } catch (e) {
    Logger.log("Nota: " + e.toString());
  }
  
  // Crear uno nuevo
  Logger.log(`   ℹ️ Creando Excel normalizado: ${EXCEL_NORMALIZADO_NOMBRE}`);
  const spreadsheet = SpreadsheetApp.create(EXCEL_NORMALIZADO_NOMBRE);
  const ss = spreadsheet.getActiveSheet();
  ss.setName("CONFIG");
  
  return spreadsheet;
}

function obtenerOCrearHoja(spreadsheet, nombre) {
  let hoja = spreadsheet.getSheetByName(nombre);
  if (hoja) {
    Logger.log(`   ℹ️ Hoja existente: ${nombre}`);
  } else {
    hoja = spreadsheet.insertSheet(nombre);
    Logger.log(`   ℹ️ Hoja creada: ${nombre}`);
  }
  return hoja;
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
  
  // ✅ DEBUG: Detectar meses con más detalle
  Logger.log(`   📊 Headers: ${headers.slice(0, 15).join(" | ")}`);
  
  // Detectar meses Y SEGUROS
  for (let i = 0; i < headers.length; i++) {
    const hActual = String(headers[i]).toUpperCase().trim();
    
    for (let mes of meses) {
      // Buscar columnas SEGURO + MES
      if (hActual.includes("SEGURO") && hActual.includes(mes)) {
        idxSeguro[mes] = i;
        Logger.log(`   ✅ Seguro ${mes} en columna ${i}: "${headers[i]}"`);
      }
      
      // Buscar columnas solo MES (cuota)
      if (hActual === mes && !idxCuota[mes]) {
        idxCuota[mes] = i;
      }
    }
  }
  
  Logger.log(`   📋 Meses cuota encontrados: ${Object.keys(idxCuota).join(", ")}`);
  Logger.log(`   📋 Meses seguro encontrados: ${Object.keys(idxSeguro).join(", ")}`);
  
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
    
    // ✅ SEGURO ANUAL (DEBUGGEADO)
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

function limpiarYLlenarHojas(hojaEst, hojaInsc, hojaCuota, hojaSeguro, estudiantes, pagosInscripcion, pagosCuota, pagosSeguro) {
  // Limpiar contenido (excepto primera fila si está vacía)
  hojaEst.clearContents();
  hojaInsc.clearContents();
  hojaCuota.clearContents();
  hojaSeguro.clearContents();
  
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
  Logger.log(`✅ Estudiantes: ${contadores.estudiantesInsertados}`);
  
  Utilities.sleep(15000);
  
  Logger.log("Buscando estudiantes en BD...");
  const dniAId = buscarEstudiantes(config, estudiantes);
  Logger.log(`Encontrados: ${Object.keys(dniAId).length}/${estudiantes.length}`);
  
  if (Object.keys(dniAId).length === 0) {
    return { exito: false, contadores: contadores, fecha: new Date().toISOString() };
  }
  
  const conceptos = cargarConceptos(config);
  
  if (pagosInsc.length > 0) {
    Logger.log(`Procesando ${pagosInsc.length} inscripciones (batch insert)...`);
    const res = procesarPagosBatch(config, pagosInsc, "INSCRIPCION", dniAId, conceptos);
    contadores.pagosInscInsertados = res.insertados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`✅ Inscripciones: ${contadores.pagosInscInsertados}`);
  }
  
  if (pagosCuota.length > 0) {
    Logger.log(`Procesando ${pagosCuota.length} cuotas (batch insert)...`);
    const res = procesarPagosBatch(config, pagosCuota, "CUOTA", dniAId, conceptos);
    contadores.pagosCuotaInsertados = res.insertados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`✅ Cuotas: ${contadores.pagosCuotaInsertados}`);
  }
  
  if (pagosSeguro.length > 0) {
    Logger.log(`Procesando ${pagosSeguro.length} seguros (batch insert)...`);
    const res = procesarPagosBatch(config, pagosSeguro, "SEGURO", dniAId, conceptos);
    contadores.pagosSeguroInsertados = res.insertados;
    contadores.pagosSkipped += res.skipped;
    contadores.errores += res.errores;
    Logger.log(`✅ Seguros: ${contadores.pagosSeguroInsertados}`);
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

// ✅ NUEVO: Batch insert (envía múltiples pagos en 1 request)
function procesarPagosBatch(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { insertados: 0, skipped: 0, errores: 0 };
  
  // Preparar todos los datos
  const pagosPreparados = [];
  
  for (let pagoArr of pagosArray) {
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
      
      pagosPreparados.push(datos);
    } catch (e) {
      res.errores++;
    }
  }
  
  // Insertar en batches (20 por request)
  for (let i = 0; i < pagosPreparados.length; i += 20) {
    const batch = pagosPreparados.slice(i, i + 20);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/pagos`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify(batch),
          muteHttpExceptions: true
        }
      );
      
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.insertados += batch.length;
      } else {
        res.errores += batch.length;
        Logger.log(`Error batch: ${resp.getResponseCode()}`);
      }
    } catch (e) {
      res.errores += batch.length;
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

function guardarResultadoFinal(hojaSync, resultado) {
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
