// FIX v2.16: Cambiar queries DNI de GET a POST (para evitar URL larga)
// Reemplazar función buscarEstudiantes y procesarEstudiantes

// ✅ v2.16: FIXED - POST en lugar de GET para evitar URL larga
function buscarEstudiantes(config, estudiantes) {
  const dniAId = {};
  const dnis = estudiantes.map(function(e) { return e.dni; });
  
  Logger.log(`   🔄 Buscando ${dnis.length} estudiantes (batch POST)...`);
  
  const chunkSize = 50;
  
  for (let i = 0; i < dnis.length; i += chunkSize) {
    const chunk = dnis.slice(i, i + chunkSize);
    
    try {
      // Usar RPC en lugar de query string
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey,
            "Content-Type": "application/json" 
          },
          payload: JSON.stringify({ dni_list: chunk }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      if (resp.getResponseCode() === 200) {
        const datos = JSON.parse(resp.getContentText());
        
        for (let est of datos) {
          dniAId[est.dni] = est.id;
        }
      } else {
        // Fallback: Query individual si RPC no existe
        Logger.log(`   ⚠️ Fallback a queries individuales para chunk ${Math.floor(i/chunkSize)}...`);
        for (let dni of chunk) {
          try {
            const respInd = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(dni)}&select=id,dni`,
              {
                method: "get",
                headers: { "apikey": config.supabaseKey },
                muteHttpExceptions: true,
                timeout: 60
              }
            );
            
            if (respInd.getResponseCode() === 200) {
              const datosInd = JSON.parse(respInd.getContentText());
              if (datosInd && datosInd.length > 0) {
                dniAId[dni] = datosInd[0].id;
              }
            }
          } catch (e) {
          }
        }
      }
      
      Utilities.sleep(300);
    } catch (e) {
      Logger.log(`   ⚠️ Error chunk ${Math.floor(i/chunkSize)}: ${e}`);
    }
  }
  
  return dniAId;
}

// ✅ v2.16: FIXED - POST para búsqueda batch
function procesarEstudiantes(config, estudiantes) {
  const res = { procesados: 0, errores: 0 };
  
  Logger.log(`   📝 Procesando ${estudiantes.length} estudiantes (batch POST)...`);
  
  const batchSize = 50;
  
  for (let i = 0; i < estudiantes.length; i += batchSize) {
    const batch = estudiantes.slice(i, i + batchSize);
    
    const dnisBatch = batch.map(function(e) { return e.dni; });
    
    const existentesMap = {};
    try {
      const respBuscar = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_estudiantes_by_dni`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey,
            "Content-Type": "application/json" 
          },
          payload: JSON.stringify({ dni_list: dnisBatch }),
          muteHttpExceptions: true,
          timeout: 60
        }
      );
      
      if (respBuscar.getResponseCode() === 200) {
        const existentes = JSON.parse(respBuscar.getContentText());
        for (let est of existentes) {
          existentesMap[est.dni] = est.id;
        }
      } else {
        // Fallback individual
        for (let dni of dnisBatch) {
          try {
            const respInd = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/estudiantes?dni=eq.${encodeURIComponent(dni)}&select=id,dni`,
              {
                method: "get",
                headers: { "apikey": config.supabaseKey },
                muteHttpExceptions: true
              }
            );
            
            if (respInd.getResponseCode() === 200) {
              const datosInd = JSON.parse(respInd.getContentText());
              if (datosInd && datosInd.length > 0) {
                existentesMap[dni] = datosInd[0].id;
              }
            }
          } catch (e) {
          }
        }
      }
    } catch (e) {
      Logger.log(`   ⚠️ Error búsqueda batch ${Math.floor(i/batchSize)}: ${e}`);
    }
    
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
    
    Utilities.sleep(1000);
  }
  
  return res;
}

// ✅ v2.16: FIXED - POST para pagos batch
function obtenerPagosExistentes(config, dniAId) {
  const pagos = {};
  try {
    const dnis = Object.keys(dniAId);
    const estIds = dnis.map(function(dni) { return dniAId[dni]; });
    
    Logger.log(`   🔍 Cargando pagos para ${estIds.length} estudiantes (batch POST)...`);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/search_pagos_by_estudiantes`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey,
            "Content-Type": "application/json" 
          },
          payload: JSON.stringify({ est_id_list: estIds }),
          muteHttpExceptions: true,
          timeout: 60
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
        
        Logger.log(`   ✅ Encontrados ${Object.keys(pagos).length} pagos existentes (batch POST)`);
      } else {
        // Fallback: Chunks individuales
        Logger.log(`   🔄 Reintentando con query por chunks...`);
        const chunkSize = 10;
        
        for (let i = 0; i < estIds.length; i += chunkSize) {
          const chunk = estIds.slice(i, i + chunkSize);
          
          try {
            const respChunk = UrlFetchApp.fetch(
              `${config.supabaseUrl}/rest/v1/rpc/search_pagos_by_estudiantes`,
              {
                method: "post",
                headers: { 
                  "apikey": config.supabaseKey,
                  "Content-Type": "application/json" 
                },
                payload: JSON.stringify({ est_id_list: chunk }),
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
            Logger.log(`   ⚠️ Error chunk ${Math.floor(i/chunkSize)}: ${e}`);
          }
        }
        
        Logger.log(`   ✅ Encontrados ${Object.keys(pagos).length} pagos existentes (chunks POST)`);
      }
    } catch (e) {
      Logger.log(`   ❌ Error crítico cargando pagos: ${e}`);
    }
    
  } catch (e) {
    Logger.log("   ❌ Error fatal en obtenerPagosExistentes: " + e);
  }
  
  return pagos;
}
