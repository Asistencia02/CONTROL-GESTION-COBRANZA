// ==================== DIAGNÓSTICO COMPLETO V2.23 ====================

function diagnosticoCompleto() {
  try {
    Logger.log("\n" + "=".repeat(80));
    Logger.log("🔍 DIAGNÓSTICO COMPLETO - EXCEL + BD + SCRIPT");
    Logger.log("=".repeat(80));
    
    const nombreArchivo = "CUOTAS 2025 INSM vigente para cristian.xlsx";
    const files = DriveApp.getFilesByName(nombreArchivo);
    
    if (!files.hasNext()) {
      Logger.log("❌ Archivo no encontrado: " + nombreArchivo);
      return;
    }
    
    const file = files.next();
    const ss = SpreadsheetApp.openById(file.getId());
    const hojas = ss.getSheets();
    
    Logger.log(`\n📊 HOJAS ENCONTRADAS: ${hojas.length}`);
    
    const MAPEO = {
      "ANALISTA2026": { inst: 1, carr: 1 },
      "HIGIENE2026": { inst: 1, carr: 3 },
      "INICIAL2026": { inst: 2, carr: 4 },
      "PRIMARIA2026": { inst: 2, carr: 5 },
      "SECUNDARIA2026": { inst: 2, carr: 6 }
    };
    
    for (let hoja of hojas) {
      const nombreHoja = hoja.getName();
      const mapeo = MAPEO[nombreHoja];
      
      if (!mapeo) {
        Logger.log(`\n⏭️  IGNORADA: ${nombreHoja}`);
        continue;
      }
      
      Logger.log(`\n${"=".repeat(80)}`);
      Logger.log(`📄 HOJA: ${nombreHoja} (Inst: ${mapeo.inst}, Carrera: ${mapeo.carr})`);
      Logger.log(`${"=".repeat(80)}`);
      
      const lastRow = hoja.getLastRow();
      const lastCol = hoja.getLastColumn();
      const datos = hoja.getRange(1, 1, Math.min(2, lastRow), lastCol).getValues();
      
      Logger.log(`📐 Dimensiones: ${lastRow} filas, ${lastCol} columnas`);
      
      // HEADERS
      const headers = datos[0];
      Logger.log(`\n📝 HEADERS (primeros 15):`);
      for (let i = 0; i < Math.min(15, headers.length); i++) {
        Logger.log(`  [${i}] "${headers[i]}"`);
      }
      
      // VERIFICAR ÍNDICES CRÍTICOS
      Logger.log(`\n🔎 ÍNDICES DETECTADOS:`);
      
      let idxItem = -1, idxDNI = -1, idxApellido = -1, idxNombres = -1;
      let idxInsc = -1, idxCuotaMzo = -1, idxSeguroMzo = -1;
      
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i]).toUpperCase().trim();
        
        if (h.includes("ITEM")) idxItem = i;
        if (h === "DNI") idxDNI = i;
        if (h === "APELLIDO") idxApellido = i;
        if (h === "NOMBRES") idxNombres = i;
        if (h === "INSCRIPCION") idxInsc = i;
        if (h === "CUOTA MARZO") idxCuotaMzo = i;
        if (h === "SEGURO MARZO") idxSeguroMzo = i;
      }
      
      Logger.log(`  ITEM: [${idxItem}], DNI: [${idxDNI}], APELLIDO: [${idxApellido}], NOMBRES: [${idxNombres}]`);
      Logger.log(`  INSCRIPCION: [${idxInsc}], CUOTA MARZO: [${idxCuotaMzo}], SEGURO MARZO: [${idxSeguroMzo}]`);
      
      if (idxItem === -1 || idxDNI === -1 || idxApellido === -1) {
        Logger.log(`  ⚠️  HEADERS CRÍTICOS NO ENCONTRADOS`);
      }
      
      // DATOS DE EJEMPLO
      Logger.log(`\n📋 PRIMERAS 3 FILAS DE DATOS:`);
      const datosCompletos = hoja.getRange(1, 1, Math.min(4, lastRow), lastCol).getValues();
      
      for (let r = 1; r < Math.min(4, datosCompletos.length); r++) {
        const fila = datosCompletos[r];
        const dni = fila[idxDNI] || "(vacío)";
        const apellido = fila[idxApellido] || "(vacío)";
        const nombre = fila[idxNombres] || "(vacío)";
        const insc = fila[idxInsc] || 0;
        const cuotaMzo = fila[idxCuotaMzo] || 0;
        const seguroMzo = fila[idxSeguroMzo] || 0;
        
        Logger.log(`  Fila ${r+1}: DNI=${dni}, ${apellido} ${nombre}`);
        Logger.log(`    INSC=${insc}, CUOTA_MZO=${cuotaMzo}, SEGURO_MZO=${seguroMzo}`);
      }
      
      // CONTAR ESTUDIANTES CON CONCEPTOS
      let conConceptos = 0;
      const datosAll = hoja.getRange(1, 1, lastRow, lastCol).getValues();
      
      for (let r = 1; r < datosAll.length; r++) {
        const fila = datosAll[r];
        let tieneConceptos = false;
        
        for (let c = 0; c < fila.length; c++) {
          const val = parseInt(fila[c]) || 0;
          if (val > 0) {
            tieneConceptos = true;
            break;
          }
        }
        
        if (tieneConceptos) conConceptos++;
      }
      
      Logger.log(`\n📊 ESTADÍSTICAS:`);
      Logger.log(`  Total filas: ${datosAll.length - 1}`);
      Logger.log(`  Con conceptos pagados: ${conConceptos}`);
      Logger.log(`  Sin conceptos: ${(datosAll.length - 1) - conConceptos}`);
    }
    
    // BD VERIFICATION
    Logger.log(`\n${"=".repeat(80)}`);
    Logger.log(`🗄️  VERIFICACIÓN EN SUPABASE`);
    Logger.log(`${"=".repeat(80)}`);
    
    const SUPABASE_URL = "https://tcqamchiwtijniiwbpde.supabase.co";
    const SUPABASE_KEY = "sb_publishable_p2KFfCQlF79Q5WTgMgrlNQ_sYCsxxCP";
    
    // Contar estudiantes por institución y carrera
    for (let inst = 1; inst <= 2; inst++) {
      for (let carr of ([1, 3, 4, 5, 6])) {
        if (inst === 1 && ![1, 3].includes(carr)) continue;
        if (inst === 2 && ![4, 5, 6].includes(carr)) continue;
        
        try {
          const resp = UrlFetchApp.fetch(
            `${SUPABASE_URL}/rest/v1/estudiantes?institucion_id=eq.${inst}&carrera_id=eq.${carr}&select=count()`,
            {
              method: "get",
              headers: { "apikey": SUPABASE_KEY },
              muteHttpExceptions: true
            }
          );
          
          if (resp.getResponseCode() === 200) {
            const count = resp.getHeaders()['content-range']?.split('/')[1] || "?";
            Logger.log(`  Inst ${inst}, Carrera ${carr}: ${count} estudiantes`);
          }
        } catch (e) {
          Logger.log(`  Error: ${e}`);
        }
      }
    }
    
    Logger.log(`\n✅ DIAGNÓSTICO COMPLETADO`);
    
  } catch (e) {
    Logger.log("❌ ERROR: " + e);
  }
}
