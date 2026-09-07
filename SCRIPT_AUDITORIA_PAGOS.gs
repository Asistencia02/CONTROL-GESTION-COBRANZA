// ==================== SCRIPT DE AUDITORÍA - ENCONTRAR DUPLICACIONES ====================

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

function auditarPagos() {
  try {
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🔍 AUDITORÍA DE PAGOS - BUSCANDO DUPLICACIONES");
    Logger.log("=".repeat(80));
    
    // Paso 1: Contar pagos totales
    Logger.log("\n📊 PASO 1: Contando pagos totales en BD...");
    const totalPagos = contarPagosTotales();
    Logger.log(`Total pagos en BD: ${totalPagos}`);
    
    // Paso 2: Analizar duplicados por estudiante
    Logger.log("\n📊 PASO 2: Analizando pagos por estudiante...");
    const duplicadosPorEstudiante = analizarPagosPorEstudiante();
    
    // Paso 3: Contar recaudado por carrera
    Logger.log("\n📊 PASO 3: Recaudado por carrera...");
    const recaudoPorCarrera = obtenerRecaudoPorCarrera();
    
    // Paso 4: Detectar talonarios duplicados
    Logger.log("\n📊 PASO 4: Buscando talonarios duplicados...");
    const talonariosDuplicados = detectarTalonariosDuplicados();
    
    // Paso 5: Resumir hallazgos
    Logger.log("\n" + "=".repeat(80));
    Logger.log("📋 RESUMEN DE HALLAZGOS");
    Logger.log("=".repeat(80));
    Logger.log(`\n✅ Total de pagos: ${totalPagos}`);
    Logger.log(`⚠️ Estudiantes con múltiples pagos: ${duplicadosPorEstudiante.conDuplicados.length}`);
    Logger.log(`⚠️ Talonarios duplicados: ${talonariosDuplicados.length}`);
    
    if (duplicadosPorEstudiante.conDuplicados.length > 0) {
      Logger.log(`\n🔴 ESTUDIANTES CON MÚLTIPLES PAGOS:`);
      for (let item of duplicadosPorEstudiante.conDuplicados.slice(0, 20)) {
        Logger.log(`   DNI ${item.dni}: ${item.cantidadPagos} pagos (EST_ID ${item.estudiante_id})`);
      }
    }
    
    if (talonariosDuplicados.length > 0) {
      Logger.log(`\n🔴 TALONARIOS DUPLICADOS:`);
      for (let tal of talonariosDuplicados.slice(0, 10)) {
        Logger.log(`   ${tal.talonario}: ${tal.cantidad} veces`);
      }
    }
    
    Logger.log(`\n💰 RECAUDADO POR CARRERA:`);
    for (let carrera in recaudoPorCarrera) {
      const data = recaudoPorCarrera[carrera];
      Logger.log(`   ${carrera}: $${data.total}`);
    }
    
    return {
      totalPagos,
      duplicadosPorEstudiante,
      recaudoPorCarrera,
      talonariosDuplicados
    };
    
  } catch (error) {
    Logger.log("❌ ERROR: " + error);
  }
}

// ==================== CONTAR PAGOS TOTALES ====================

function contarPagosTotales() {
  try {
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/pagos_multiples?select=count()`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const contentRange = resp.getHeaders()["content-range"];
      if (contentRange) {
        const match = contentRange.match(/\/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      }
    }
    return 0;
  } catch (e) {
    Logger.log(`Error: ${e}`);
    return 0;
  }
}

// ==================== ANALIZAR PAGOS POR ESTUDIANTE ====================

function analizarPagosPorEstudiante() {
  const resultado = {
    conDuplicados: [],
    totalDuplicados: 0
  };
  
  try {
    // Obtener todos los pagos con sus estudiantes
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/pagos_multiples?select=id,estudiante_id,numero_talonario,monto_total,fecha_cobro,estado&limit=5000`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() !== 200) return resultado;
    
    const pagos = JSON.parse(resp.getContentText());
    
    // Agrupar por estudiante
    const pagoPorEstudiante = {};
    for (let pago of pagos) {
      if (!pagoPorEstudiante[pago.estudiante_id]) {
        pagoPorEstudiante[pago.estudiante_id] = [];
      }
      pagoPorEstudiante[pago.estudiante_id].push(pago);
    }
    
    // Buscar estudiantes con múltiples pagos
    for (let estId in pagoPorEstudiante) {
      const pagosList = pagoPorEstudiante[estId];
      if (pagosList.length > 1) {
        // Obtener datos del estudiante
        const respEst = UrlFetchApp.fetch(
          `${SUPABASE_URL}/rest/v1/estudiantes?id=eq.${estId}&select=dni,nombre,apellido`,
          {
            method: "get",
            headers: { "apikey": SUPABASE_KEY },
            muteHttpExceptions: true
          }
        );
        
        let dni = "?";
        if (respEst.getResponseCode() === 200) {
          const datos = JSON.parse(respEst.getContentText());
          if (datos.length > 0) {
            dni = datos[0].dni;
          }
        }
        
        resultado.conDuplicados.push({
          estudiante_id: estId,
          dni: dni,
          cantidadPagos: pagosList.length,
          pagos: pagosList
        });
        
        resultado.totalDuplicados += pagosList.length;
      }
    }
    
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
  
  return resultado;
}

// ==================== OBTENER RECAUDADO POR CARRERA ====================

function obtenerRecaudoPorCarrera() {
  const resultado = {};
  
  try {
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/rpc/obtener_recaudado_por_carrera`,
      {
        method: "post",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        payload: JSON.stringify({}),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      const datos = JSON.parse(resp.getContentText());
      for (let row of datos) {
        resultado[row.carrera_nombre] = {
          total: row.total_recaudado,
          pagos: row.total_pagos
        };
      }
    }
  } catch (e) {
    Logger.log(`Error: ${e}`);
    
    // Fallback: Query manual
    try {
      const resp2 = UrlFetchApp.fetch(
        `${SUPABASE_URL}/rest/v1/pagos_multiples_detalle?select=pago_multiple_id,monto_pagado&limit=10000`,
        {
          method: "get",
          headers: { "apikey": SUPABASE_KEY },
          muteHttpExceptions: true
        }
      );
      
      if (resp2.getResponseCode() === 200) {
        const detalles = JSON.parse(resp2.getContentText());
        let totalGeneral = 0;
        for (let det of detalles) {
          totalGeneral += det.monto_pagado || 0;
        }
        resultado["TOTAL_GENERAL"] = {
          total: totalGeneral,
          pagos: detalles.length
        };
      }
    } catch (e2) {
      Logger.log(`Fallback error: ${e2}`);
    }
  }
  
  return resultado;
}

// ==================== DETECTAR TALONARIOS DUPLICADOS ====================

function detectarTalonariosDuplicados() {
  const resultado = [];
  
  try {
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/pagos_multiples?select=numero_talonario&limit=10000`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() !== 200) return resultado;
    
    const pagos = JSON.parse(resp.getContentText());
    
    // Contar talonarios
    const talonarioCount = {};
    for (let pago of pagos) {
      const tal = pago.numero_talonario;
      talonarioCount[tal] = (talonarioCount[tal] || 0) + 1;
    }
    
    // Encontrar duplicados
    for (let tal in talonarioCount) {
      if (talonarioCount[tal] > 1) {
        resultado.push({
          talonario: tal,
          cantidad: talonarioCount[tal]
        });
      }
    }
    
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
  
  return resultado;
}

// ==================== ANÁLISIS DETALLADO DE UN ESTUDIANTE ====================

function analizarEstudianteDetallado(dni) {
  try {
    Logger.log(`\n${"=".repeat(80)}`);
    Logger.log(`🔍 ANÁLISIS DETALLADO DE DNI: ${dni}`);
    Logger.log(`${"=".repeat(80)}`);
    
    // Obtener estudiante
    const respEst = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/estudiantes?dni=eq.${dni}&select=*`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (respEst.getResponseCode() !== 200 || JSON.parse(respEst.getContentText()).length === 0) {
      Logger.log(`❌ Estudiante no encontrado`);
      return;
    }
    
    const estudiante = JSON.parse(respEst.getContentText())[0];
    Logger.log(`\n👤 ${estudiante.nombre} ${estudiante.apellido}`);
    Logger.log(`📋 Carrera ID: ${estudiante.carrera_id}`);
    Logger.log(`🏢 Institución: ${estudiante.institucion_id}`);
    
    // Obtener pagos del estudiante
    const respPagos = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/pagos_multiples?estudiante_id=eq.${estudiante.id}&select=*`,
      {
        method: "get",
        headers: { "apikey": SUPABASE_KEY },
        muteHttpExceptions: true
      }
    );
    
    if (respPagos.getResponseCode() === 200) {
      const pagos = JSON.parse(respPagos.getContentText());
      Logger.log(`\n💰 Total de pagos: ${pagos.length}`);
      
      let totalMonto = 0;
      for (let pago of pagos) {
        Logger.log(`\n   📄 Pago ID: ${pago.id}`);
        Logger.log(`      Talonario: ${pago.numero_talonario}`);
        Logger.log(`      Monto: $${pago.monto_total}`);
        Logger.log(`      Fecha: ${pago.fecha_cobro}`);
        Logger.log(`      Estado: ${pago.estado}`);
        totalMonto += pago.monto_total;
      }
      
      Logger.log(`\n   ✅ TOTAL RECAUDADO: $${totalMonto}`);
    }
    
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
}

// ==================== VERIFICAR INTEGRIDAD DE DATOS ====================

function verificarIntegridad() {
  try {
    Logger.log(`\n${"=".repeat(80)}`);
    Logger.log(`✅ VERIFICACIÓN DE INTEGRIDAD`);
    Logger.log(`${"=".repeat(80)}`);
    
    // 1. Pagos sin detalles
    Logger.log(`\n1️⃣ Buscando pagos sin detalles...`);
    const pagosSinDetalles = buscarPagosSinDetalles();
    Logger.log(`   ⚠️ Encontrados: ${pagosSinDetalles.length}`);
    
    // 2. Detalles sin pago padre
    Logger.log(`\n2️⃣ Buscando detalles huérfanos...`);
    const detallesHuerfanos = buscarDetallesHuerfanos();
    Logger.log(`   ⚠️ Encontrados: ${detallesHuerfanos.length}`);
    
    // 3. Inconsistencias de monto
    Logger.log(`\n3️⃣ Buscando inconsistencias de monto...`);
    const inconsistencias = buscarInconsistenciasMonto();
    Logger.log(`   ⚠️ Encontradas: ${inconsistencias.length}`);
    
    if (inconsistencias.length > 0) {
      Logger.log(`\n   Ejemplos:`);
      for (let inc of inconsistencias.slice(0, 5)) {
        Logger.log(`   Pago ${inc.pago_id}: Suma detalles=$${inc.suma_detalles}, Monto pago=$${inc.monto_total}`);
      }
    }
    
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
}

function buscarPagosSinDetalles() {
  const resultado = [];
  try {
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/rpc/buscar_pagos_sin_detalles`,
      {
        method: "post",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        payload: JSON.stringify({}),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      return JSON.parse(resp.getContentText());
    }
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
  return resultado;
}

function buscarDetallesHuerfanos() {
  const resultado = [];
  try {
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/rpc/buscar_detalles_huerfanos`,
      {
        method: "post",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        payload: JSON.stringify({}),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      return JSON.parse(resp.getContentText());
    }
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
  return resultado;
}

function buscarInconsistenciasMonto() {
  const resultado = [];
  try {
    const resp = UrlFetchApp.fetch(
      `${SUPABASE_URL}/rest/v1/rpc/buscar_inconsistencias_monto`,
      {
        method: "post",
        headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
        payload: JSON.stringify({}),
        muteHttpExceptions: true
      }
    );
    
    if (resp.getResponseCode() === 200) {
      return JSON.parse(resp.getContentText());
    }
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
  return resultado;
}

// ==================== LIMPIAR DUPLICADOS (PELIGROSO) ====================

function limpiarDuplicados() {
  try {
    const respuesta = SpreadsheetApp.getUi().alert(
      "⚠️ ADVERTENCIA: Esto eliminará TODOS los duplicados.\n\n" +
      "Se mantendrá UN pago por estudiante (el más reciente).\n\n" +
      "¿Está seguro?",
      SpreadsheetApp.getUi().ButtonSet.YES_NO
    );
    
    if (respuesta === SpreadsheetApp.getUi().Button.YES) {
      Logger.log("\n" + "=".repeat(80));
      Logger.log("🗑️ LIMPIANDO DUPLICADOS");
      Logger.log("=".repeat(80));
      
      // Obtener duplicados
      const dup = analizarPagosPorEstudiante();
      
      if (dup.conDuplicados.length === 0) {
        Logger.log("✅ No hay duplicados para limpiar");
        return;
      }
      
      let eliminados = 0;
      for (let estudiante of dup.conDuplicados) {
        // Ordenar pagos por fecha descendente
        const pagos = estudiante.pagos.sort((a, b) => 
          new Date(b.fecha_cobro) - new Date(a.fecha_cobro)
        );
        
        // Mantener el primero (más reciente), eliminar el resto
        for (let i = 1; i < pagos.length; i++) {
          try {
            UrlFetchApp.fetch(
              `${SUPABASE_URL}/rest/v1/pagos_multiples?id=eq.${pagos[i].id}`,
              {
                method: "delete",
                headers: { "apikey": SUPABASE_KEY },
                muteHttpExceptions: true
              }
            );
            eliminados++;
          } catch (e) {
            Logger.log(`Error eliminando pago ${pagos[i].id}: ${e}`);
          }
        }
      }
      
      Logger.log(`\n✅ Pagos eliminados: ${eliminados}`);
      SpreadsheetApp.getUi().alert(`✅ Se eliminaron ${eliminados} pagos duplicados`);
    }
    
  } catch (e) {
    Logger.log(`Error: ${e}`);
  }
}

// ==================== FUNCIÓN PARA EJECUTAR DESDE MENÚ ====================

function menuAuditoria() {
  const ui = SpreadsheetApp.getUi();
  const resultado = ui.alert(
    "🔍 AUDITORÍA DE PAGOS\n\n" +
    "Elige una opción:",
    SpreadsheetApp.getUi().ButtonSet.OK_CANCEL
  );
  
  auditarPagos();
  verificarIntegridad();
}

// Agregar al menú
function onOpenAuditoria() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('🔍 AUDITORÍA');
    menu.addItem('📊 Auditar Pagos Completa', 'auditarPagos');
    menu.addItem('✅ Verificar Integridad', 'verificarIntegridad');
    menu.addItem('📋 Analizar DNI específico', 'menuAnalizarDNI');
    menu.addSeparator();
    menu.addItem('🗑️ LIMPIAR DUPLICADOS', 'limpiarDuplicados');
    menu.addToUi();
  } catch (e) {
    Logger.log("Menu warning: " + e);
  }
}

function menuAnalizarDNI() {
  const ui = SpreadsheetApp.getUi();
  const respuesta = ui.prompt("Ingresa el DNI a analizar:");
  
  if (respuesta.getSelectedButton() === ui.Button.OK) {
    analizarEstudianteDetallado(respuesta.getResponseText());
  }
}
