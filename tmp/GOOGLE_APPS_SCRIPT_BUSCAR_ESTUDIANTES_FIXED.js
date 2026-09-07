// ==================== BUSCAR ESTUDIANTES POR ID (CORREGIDO - FILTRA POR INSTITUCIÓN) ====================

function buscarEstudiantesById(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(e => e.dni);
  const chunkSize = 100;
  const instId = parseInt(config.institucionId);
  
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
            p_institucion_id: instId,  // ✅ AGREGAR INSTITUCIÓN
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
        for (let est of datos) {
          dniAId[est.dni] = est.id;
        }
        for (let dni of chunk) {
          if (!dniAId[dni]) {
            logConTiempo(`      ⚠️ DNI NO ENCONTRADO EN BD: ${dni}`);
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
  
  return dniAId;
}
