// ==================== OPTIMIZACIÓN v2.15 ====================
// FIX: obtenerPagosExistentes() muy lento para 656+ estudiantes
// SOLUCIÓN: Query batch + caché local

// REEMPLAZAR FUNCIÓN obtenerPagosExistentes (línea ~700) CON ESTA:

function obtenerPagosExistentes(config, dniAId) {
  const pagos = {};
  try {
    const dnis = Object.keys(dniAId);
    const estIds = dnis.map(function(dni) { return dniAId[dni]; });
    
    Logger.log(`   🔍 Cargando pagos para ${estIds.length} estudiantes (batch query)...`);
    
    // Supabase permite filtros OR con arreglos
    // Estrategia: Query todos los pagos en 1 call con filtro in()
    const estIdString = estIds.join(",");
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/pagos?estudiante_id=in.(${estIdString})&select=id,estudiante_id,concepto_id,monto_pagado,estado`,
        {
          method: "get",
          headers: { "apikey": config.supabaseKey },
          muteHttpExceptions: true,
          timeout: 60  // 60 segundos timeout
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        
        for (let p of datos) {
          const key = `${p.estudiante_id}|${p.concepto_id}`;
          pagos[key] = {
            id: p.id,
            monto_pagado: p.monto_pagado,
            concepto_id: p.concepto_id,
            estudiante_id: p.estudiante_id,
            estado: p.estado
          };
        }
        
        Logger.log(`   ✅ Encontrados ${Object.keys(pagos).length} pagos existentes (batch)`);
      } else {
        Logger.log(`   ⚠️ Error batch query: ${resp.getResponseCode()}`);
        
        // Fallback: Query por chunks de 50 estudiantes
        Logger.log(`   🔄 Reintentando con query por chunks...`);
        const chunkSize = 50;
        
        for (let i = 0; i < estIds.length; i += chunkSize) {
          const chunk = estIds.slice(i, i + chunkSize);
          const chunkString = chunk.join(",");
          
          try {
            const respChunk = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/pagos?estudiante_id=in.(${chunkString})&select=id,estudiante_id,concepto_id,monto_pagado,estado`,
              {
                method: "get",
                headers: { "apikey": config.supabaseKey },
                muteHttpExceptions: true,
                timeout: 60
              }
            );
            
            if (respChunk.getResponseCode() === 200) {
              const datosChunk = JSON.parse(respChunk.getContentText());
              
              for (let p of datosChunk) {
                const key = `${p.estudiante_id}|${p.concepto_id}`;
                pagos[key] = {
                  id: p.id,
                  monto_pagado: p.monto_pagado,
                  concepto_id: p.concepto_id,
                  estudiante_id: p.estudiante_id,
                  estado: p.estado
                };
              }
            }
            
            Utilities.sleep(500);
          } catch (e) {
            Logger.log(`   ⚠️ Error chunk ${i/chunkSize}: ${e}`);
          }
        }
        
        Logger.log(`   ✅ Encontrados ${Object.keys(pagos).length} pagos existentes (chunks)`);
      }
    } catch (e) {
      Logger.log(`   ❌ Error crítico cargando pagos: ${e}`);
    }
    
  } catch (e) {
    Logger.log("   ❌ Error fatal en obtenerPagosExistentes: " + e);
  }
  
  return pagos;
}

// ==================== TAMBIÉN OPTIMIZAR buscarEstudiantes ====================
// REEMPLAZAR FUNCIÓN buscarEstudiantes (línea ~550) CON ESTA:

function buscarEstudiantes(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(function(e) { return e.dni; });
  
  Logger.log(`   🔄 Buscando ${dnis.length} estudiantes (batch query)...`);
  
  // Strategy: Buscar todos en 1 query con filtro OR
  const chunkSize = 100;  // Supabase permite URLs grandes
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    const dniFilter = chunk.map(function(d) { return `"${d}"`; }).join(",");
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/estudiantes?dni=in.(${dniFilter})&select=id,dni`,
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
          dniAId[est.dni] = est.id;
        }
      }
      
      Utilities.sleep(300);
    } catch (e) {
      Logger.log(`   ⚠️ Error chunk ${i/chunkSize}: ${e}`);
    }
  }
  
  return dniAId;
}

// ==================== TAMBIÉN AUMENTAR TIMEOUT EN procesarEstudiantes ====================
// Si estudiantes INSERT/UPDATE también tarda, aumentar sleep:

function procesarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  
  Logger.log(`   📝 Procesando ${estudiantes.length} estudiantes (batch)...`);
  
  // Estrategia: Batch de 50 estudiantes por query
  const batchSize = 50;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    
    // Primero, buscar cuáles ya existen
    const dnisBatch = batch.map(function(e) { return e.dni; });
    const dniFilter = dnisBatch.map(function(d) { return `"${d}"`; }).join(",");
    
    const existentesMap = {};
    try {
      const respBuscar = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/estudiantes?dni=in.(${dniFilter})&select=id,dni`,
        {
          method: "get",
          headers: { "apikey": config.supabaseKey },
          muteHttpExceptions: true
        }
      );
      
      if (respBuscar.getResponseCode() === 200) {
        const existentes = JSON.parse(respBuscar.getContentText());
        for (let est of existentes) {
          existentesMap[est.dni] = est.id;
        }
      }
    } catch (e) {
      Logger.log(`   ⚠️ Error búsqueda batch ${i/batchSize}: ${e}`);
    }
    
    // Separar INSERT vs UPDATE
    const paraInsertar = [];
    const paraActualizar = [];
    
    for (let est of batch) {
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
      
      if (existentesMap[est.dni]) {
        paraActualizar.push({ id: existentesMap[est.dni], datos: datos });
      } else {
        paraInsertar.push(datos);
      }
    }
    
    // INSERT batch
    if (paraInsertar.length > 0) {
      try {
        const respInsert = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(paraInsertar),
            muteHttpExceptions: true
          }
        );
        
        if (respInsert.getResponseCode() === 201 || respInsert.getResponseCode() === 200) {
          res.procesados += paraInsertar.length;
        } else {
          res.errores += paraInsertar.length;
        }
      } catch (e) {
        res.errores += paraInsertar.length;
      }
    }
    
    // UPDATE batch
    for (let item of paraActualizar) {
      try {
        const respUpdate = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/estudiantes?id=eq.${item.id}`,
          {
            method: "patch",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify(item.datos),
            muteHttpExceptions: true
          }
        );
        
        if (respUpdate.getResponseCode() === 200 || respUpdate.getResponseCode() === 204) {
          res.procesados++;
        } else {
          res.errores++;
        }
      } catch (e) {
        res.errores++;
      }
    }
    
    Utilities.sleep(1000);  // 1 segundo entre batches
  }
  
  return res;
}
