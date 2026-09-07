// ==================== DEBUG SCRIPT v2.27 - PAYMENT DUPLICATION AUDIT ====================
// Purpose: Identify exactly where payments are being duplicated or miscounted
// Usage: Run from Google Sheets menu or terminal for detailed logs

const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";

// ==================== DEBUG MENU ====================

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🐛 DEBUG v2.27')
    .addItem('🔍 Audit Header Detection', 'auditarDeteccionHeaders')
    .addItem('🔍 Audit Month Normalization', 'auditarNormalizacionMeses')
    .addItem('🔍 Audit Concept Duplication', 'auditarDuplicacionConceptos')
    .addItem('🔍 Audit DB Concepts vs Script', 'compararConceptosDBvsScript')
    .addItem('🔍 Full Integrity Audit', 'auditIntegrityComplete')
    .addToUi();
}

// ==================== AUDIT 1: HEADER DETECTION ====================

function auditarDeteccionHeaders() {
  Logger.log("\n" + "=".repeat(80));
  Logger.log("🔍 AUDIT 1: HEADER DETECTION");
  Logger.log("=".repeat(80));
  
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado");
    return;
  }
  
  const file = files.next();
  const fileId = file.getId();
  const ss = SpreadsheetApp.openById(fileId);
  
  const MAPEO_HOJAS = {
    "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
    "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
    "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
    "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
    "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
  };
  
  const hojas = ss.getSheets();
  
  for (let hoja of hojas) {
    const nombreHoja = hoja.getName();
    if (!MAPEO_HOJAS[nombreHoja]) continue;
    
    const lastRow = hoja.getLastRow();
    const lastCol = hoja.getLastColumn();
    const datos = hoja.getRange(1, 1, 1, lastCol).getValues()[0];
    
    Logger.log(`\n📄 SHEET: ${nombreHoja}`);
    Logger.log(`   Total columns: ${lastCol}, Data rows: ${lastRow - 1}`);
    
    // Log all headers
    Logger.log(`   HEADERS:`);
    for (let i = 0; i < datos.length; i++) {
      const h = String(datos[i] || "").toUpperCase().trim();
      if (h) {
        Logger.log(`      [${i}] ${h}`);
      }
    }
    
    // Búsqueda de patrones CUOTA/SEGURO
    const cuotasEncontradas = [];
    const segurosEncontrados = [];
    
    for (let i = 0; i < datos.length; i++) {
      const h = String(datos[i] || "").toUpperCase().trim();
      
      if (h.includes("CUOTA")) {
        cuotasEncontradas.push({ idx: i, header: h });
        Logger.log(`      ✅ CUOTA detectada [${i}]: ${h}`);
      }
      if (h.includes("SEGURO")) {
        segurosEncontrados.push({ idx: i, header: h });
        Logger.log(`      ✅ SEGURO detectada [${i}]: ${h}`);
      }
    }
    
    // CHECK: ¿Hay CUOTA - MARZO format?
    const tieneGuion = datos.some(h => String(h || "").includes(" - "));
    Logger.log(`   📌 Headers con guión: ${tieneGuion ? "SÍ ✅" : "NO ❌"}`);
    
    // CHECK: Count actual months
    const mesesEnHeadersDirectos = new Set();
    const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    
    for (let mes of meses) {
      for (let h of datos) {
        const headerStr = String(h || "").toUpperCase();
        if (headerStr.includes(mes)) {
          mesesEnHeadersDirectos.add(mes);
        }
      }
    }
    
    Logger.log(`   📊 Meses detectados en headers: ${Array.from(mesesEnHeadersDirectos).join(", ")}`);
    
    // Verificar SEPTIEMBRE específicamente
    const tieneSeptiembre = datos.some(h => {
      const s = String(h || "").toUpperCase();
      return s.includes("SEPTIEMBRE") || s.includes("SEPT");
    });
    Logger.log(`   🗓️ SEPTIEMBRE presente: ${tieneSeptiembre ? "SÍ ✅" : "NO ❌"}`);
  }
}

// ==================== AUDIT 2: MONTH NORMALIZATION ====================

function auditarNormalizacionMeses() {
  Logger.log("\n" + "=".repeat(80));
  Logger.log("🔍 AUDIT 2: MONTH NORMALIZATION");
  Logger.log("=".repeat(80));
  
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado");
    return;
  }
  
  const file = files.next();
  const fileId = file.getId();
  const ss = SpreadsheetApp.openById(fileId);
  
  const MAPEO_HOJAS = {
    "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
    "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
    "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
    "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
    "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
  };
  
  const hojas = ss.getSheets();
  
  Logger.log("\n📋 TESTING MONTH CONVERSION LOGIC:");
  
  // Test case examples
  const testCases = [
    "CUOTA - MARZO",
    "CUOTA - SEPT",  // Problema potencial
    "SEGURO - SEPTIEMBRE",
    "CUOTA MARZO",
    "SEGURO SEPT",
    "ENERO",
    "DICIEMBRE"
  ];
  
  for (let test of testCases) {
    const upperTest = test.toUpperCase().trim();
    const meses = ["MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    
    let mesEncontrado = null;
    for (let mes of meses) {
      if (upperTest.includes(mes)) {
        mesEncontrado = mes;
        break;
      }
    }
    
    const mesCapitalizado = mesEncontrado ? mesEncontrado.charAt(0) + mesEncontrado.slice(1).toLowerCase() : "❌ NO ENCONTRADO";
    
    Logger.log(`   Input: "${test}" → Mes detectado: "${mesEncontrado}" → Capitalizado: "${mesCapitalizado}"`);
  }
  
  // ACTUAL: Verificar en hojas reales qué está pasando
  Logger.log("\n📄 SCANNING ACTUAL HEADERS FOR MONTH ISSUES:");
  
  for (let hoja of hojas) {
    const nombreHoja = hoja.getName();
    if (!MAPEO_HOJAS[nombreHoja]) continue;
    
    const lastCol = hoja.getLastColumn();
    const datos = hoja.getRange(1, 1, 1, lastCol).getValues()[0];
    
    Logger.log(`\n   Sheet: ${nombreHoja}`);
    
    const problematicos = [];
    for (let i = 0; i < datos.length; i++) {
      const h = String(datos[i] || "").toUpperCase().trim();
      
      // Look for abbreviated months
      if (h.includes("SEPT") && !h.includes("SEPTIEMBRE")) {
        problematicos.push(`[${i}] ABBREVIATED SEPT: ${h}`);
      }
      if (h.includes("NOV") && !h.includes("NOVIEMBRE")) {
        problematicos.push(`[${i}] ABBREVIATED NOV: ${h}`);
      }
      if (h.includes("DIC") && !h.includes("DICIEMBRE")) {
        problematicos.push(`[${i}] ABBREVIATED DIC: ${h}`);
      }
    }
    
    if (problematicos.length > 0) {
      Logger.log(`   ⚠️ PROBLEMATIC HEADERS:`);
      for (let p of problematicos) {
        Logger.log(`      ${p}`);
      }
    } else {
      Logger.log(`   ✅ No abbreviated months detected`);
    }
  }
}

// ==================== AUDIT 3: CONCEPT DUPLICATION ====================

function auditarDuplicacionConceptos() {
  Logger.log("\n" + "=".repeat(80));
  Logger.log("🔍 AUDIT 3: CONCEPT DUPLICATION");
  Logger.log("=".repeat(80));
  
  const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
  const files = DriveApp.getFilesByName(nombreArchivo);
  
  if (!files.hasNext()) {
    Logger.log("❌ Archivo no encontrado");
    return;
  }
  
  const file = files.next();
  const fileId = file.getId();
  const ss = SpreadsheetApp.openById(fileId);
  
  const MAPEO_HOJAS = {
    "ANALISTA2026": { institucion_id: 1, carrera_id: 1 },
    "HIGIENE2026": { institucion_id: 1, carrera_id: 3 },
    "INICIAL2026": { institucion_id: 2, carrera_id: 4 },
    "PRIMARIA2026": { institucion_id: 2, carrera_id: 5 },
    "SECUNDARIA2026": { institucion_id: 2, carrera_id: 6 }
  };
  
  const hojas = ss.getSheets();
  const dniCount = {}; // Track DNIs across all sheets
  
  Logger.log("\n🔎 SCANNING FOR DUPLICATE DNIs:");
  
  for (let hoja of hojas) {
    const nombreHoja = hoja.getName();
    if (!MAPEO_HOJAS[nombreHoja]) continue;
    
    const lastRow = hoja.getLastRow();
    const lastCol = hoja.getLastColumn();
    const datos = hoja.getRange(1, 1, lastRow, lastCol).getValues();
    
    const headers = datos[0];
    let idxDNI = -1, idxApellido = -1, idxNombres = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] || "").toUpperCase().trim();
      if (h === "DNI") idxDNI = i;
      if (h === "APELLIDO") idxApellido = i;
      if (h === "NOMBRES") idxNombres = i;
    }
    
    if (idxDNI < 0) continue;
    
    Logger.log(`\n   Sheet: ${nombreHoja}`);
    
    let filaCount = 0;
    for (let r = 1; r < datos.length; r++) {
      let dniRaw = String(datos[r][idxDNI] || "").replace(/\./g, "").trim();
      const apellido = String(datos[r][idxApellido] || "").trim();
      const nombre = String(datos[r][idxNombres] || "").trim();
      
      if (!apellido || !nombre) continue;
      if (!dniRaw || dniRaw === "00000000") continue;
      
      filaCount++;
      
      if (!dniCount[dniRaw]) {
        dniCount[dniRaw] = [];
      }
      
      dniCount[dniRaw].push({
        hoja: nombreHoja,
        apellido: apellido,
        nombre: nombre
      });
    }
    
    Logger.log(`   👥 Estudiantes cargados: ${filaCount}`);
  }
  
  // Check for duplicates
  Logger.log(`\n🚨 DUPLICATE DNIs ACROSS SHEETS:`);
  let duplicados = 0;
  
  for (let dni in dniCount) {
    if (dniCount[dni].length > 1) {
      duplicados++;
      Logger.log(`   DNI ${dni}:`);
      for (let entry of dniCount[dni]) {
        Logger.log(`      - ${entry.hoja}: ${entry.apellido}, ${entry.nombre}`);
      }
    }
  }
  
  if (duplicados === 0) {
    Logger.log(`   ✅ No duplicates found`);
  } else {
    Logger.log(`   ❌ ${duplicados} DNIs appear in multiple sheets!`);
  }
}

// ==================== AUDIT 4: DB CONCEPTS vs SCRIPT ====================

function compararConceptosDBvsScript() {
  Logger.log("\n" + "=".repeat(80));
  Logger.log("🔍 AUDIT 4: DB CONCEPTS vs SCRIPT EXPECTATIONS");
  Logger.log("=".repeat(80));
  
  const institucionesPrueba = [1, 2];
  
  for (let instId of institucionesPrueba) {
    Logger.log(`\n📍 INSTITUCIÓN ${instId}:`);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${SUPABASE_URL}/rest/v1/conceptos_pago?institucion_id=eq.${instId}&select=*`,
        {
          method: "get",
          headers: { "apikey": SUPABASE_KEY },
          muteHttpExceptions: true
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const conceptos = JSON.parse(resp.getContentText());
        
        Logger.log(`   Total conceptos: ${conceptos.length}`);
        
        // Agrupar por carrera
        const porCarrera = {};
        for (let c of conceptos) {
          if (!porCarrera[c.carrera_id]) {
            porCarrera[c.carrera_id] = { inscripciones: 0, cuotas: [], seguros: [] };
          }
          
          if (c.tipo === "INSCRIPCION") {
            porCarrera[c.carrera_id].inscripciones++;
          } else if (c.tipo === "CUOTA") {
            porCarrera[c.carrera_id].cuotas.push(`${c.mes}:${c.id}`);
          } else if (c.tipo === "SEGURO") {
            porCarrera[c.carrera_id].seguros.push(`${c.mes}:${c.id}`);
          }
        }
        
        for (let car in porCarrera) {
          const datos = porCarrera[car];
          Logger.log(`   Carrera ${car}:`);
          Logger.log(`      Inscripciones: ${datos.inscripciones}`);
          Logger.log(`      Cuotas (${datos.cuotas.length}): ${datos.cuotas.slice(0, 5).join(", ")}${datos.cuotas.length > 5 ? "..." : ""}`);
          Logger.log(`      Seguros (${datos.seguros.length}): ${datos.seguros.slice(0, 5).join(", ")}${datos.seguros.length > 5 ? "..." : ""}`);
          
          // Check for SEPTIEMBRE specifically
          const tieneSeptiembre = datos.cuotas.some(c => c.includes("9")) || datos.seguros.some(c => c.includes("9"));
          Logger.log(`      🗓️ SEPTIEMBRE (mes 9): ${tieneSeptiembre ? "SÍ ✅" : "NO ❌"}`);
        }
      } else {
        Logger.log(`   ❌ Error fetching: ${resp.getResponseCode()}`);
      }
      
      Utilities.sleep(500);
    } catch (e) {
      Logger.log(`   ❌ Exception: ${e}`);
    }
  }
}

// ==================== AUDIT 5: FULL INTEGRITY CHECK ====================

function auditIntegrityComplete() {
  Logger.log("\n" + "=".repeat(80));
  Logger.log("🔍 FULL INTEGRITY AUDIT");
  Logger.log("=".repeat(80));
  
  Logger.log("\n1️⃣ Running: auditarDeteccionHeaders()...");
  auditarDeteccionHeaders();
  
  Logger.log("\n2️⃣ Running: auditarNormalizacionMeses()...");
  auditarNormalizacionMeses();
  
  Logger.log("\n3️⃣ Running: auditarDuplicacionConceptos()...");
  auditarDuplicacionConceptos();
  
  Logger.log("\n4️⃣ Running: compararConceptosDBvsScript()...");
  compararConceptosDBvsScript();
  
  Logger.log("\n" + "=".repeat(80));
  Logger.log("✅ FULL AUDIT COMPLETE");
  Logger.log("=".repeat(80));
}
