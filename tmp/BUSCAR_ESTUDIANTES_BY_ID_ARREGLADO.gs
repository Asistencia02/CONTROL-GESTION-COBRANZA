// ==================== FUNCIÓN ARREGLADA: buscarEstudiantesById ====================
// REEMPLAZA LA FUNCIÓN COMPLETA buscarEstudiantesById() CON ESTA VERSIÓN

function buscarEstudiantesById(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(e => e.dni);
  const chunkSize = 100;
  const instId = parseInt(config.institucionId);
  
  logConTiempo(`      DEBUG: Buscando ${dnis.length} DNIs...`);
  logConTiempo(`      DEBUG: Primeros 5 DNIs a buscar: ${dnis.slice(0, 5).join(", ")}`);
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    
    try {
      logConTiempo(`      → Fetch: POST /rpc/search_estudiantes_by_dni (chunk ${chunk.length}/${dnis.length})`);
      STATS_GLOBAL.totalFetches++;
      
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify({ 
            p_institucion_id: instId,
            dni_list: chunk 
          }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      logConTiempo(`      ← Response: ${resp.getResponseCode()}`);
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        logConTiempo(`      ✅ Encontrados: ${datos.length}/${chunk.length}`);
        
        if (datos.length > 0) {
          logConTiempo(`      DEBUG: Primeros 3 registros RPC: ${JSON.stringify(datos.slice(0, 3))}`);
        }
        
        for (let est of datos) {
          // NORMALIZAR DNI: remover puntos y espacios
          const dniNormalizado = String(est.dni).replace(/\./g, "").trim();
          dniAId[dniNormalizado] = est.id;
          logConTiempo(`      DEBUG MAP: dni='${dniNormalizado}' -> id=${est.id}`);
        }
        
        for (let dni of chunk) {
          if (!dniAId[dni]) {
            const dniNorm = String(dni).replace(/\./g, "").trim();
            if (dniAId[dniNorm]) {
              logConTiempo(`      ✅ Corrección: DNI ${dni} -> ${dniNorm} encontrado`);
              dniAId[dni] = dniAId[dniNorm];
            } else {
              logConTiempo(`      ⚠️ DNI NO ENCONTRADO EN BD: ${dni}`);
            }
          }
        }
      } else {
        const error = resp.getContentText().substring(0, 100);
        registrarError("SEARCH_ESTUDIANTES_BY_DNI", "CHUNK", "CHUNK", "CHUNK", `HTTP ${resp.getResponseCode()}: ${error}`);
        logConTiempo(`      ❌ Error: ${error}`);
      }
      
      sleepConConfig("afterSearchRPC");
    } catch (e) {
      registrarError("SEARCH_ESTUDIANTES_BY_DNI", "CHUNK", "CHUNK", "CHUNK", e.toString());
      logConTiempo(`      ❌ Exception: ${e}`);
    }
  }
  
  logConTiempo(`      DEBUG: Final dniAId map size: ${Object.keys(dniAId).length}`);
  logConTiempo(`      DEBUG: Primeras 5 entries: ${Object.entries(dniAId).slice(0, 5).map(e => e[0] + "=" + e[1]).join(", ")}`);
  
  return dniAId;
}
