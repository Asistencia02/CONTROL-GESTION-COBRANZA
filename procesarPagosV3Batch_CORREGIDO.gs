// ✅ BATCH RPC: 50 PAGOS EN UNA SOLA LLAMADA (CORREGIDO)
function procesarPagosV3Batch(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { pagosInsertados: 0, pagosActualizados: 0, detalles: 0, ignorados: 0, errores: 0 };
  const pagosParaProcesar = [];
  const agrupados = {};
  
  const timestamp = Math.floor(Date.now() / 1000);
  let talonarioCounter = 0;
  const cacheKey = `inst_${config.institucionId}`;
  const configCarreras = CACHE_CONFIG_CARRERAS[cacheKey] || {};
  
  for (let pagoArr of pagosArray) {
    try {
      const dni = pagoArr[1];
      const estId = dniAId[dni];
      if (!estId) {
        res.ignorados++;
        continue;
      }
      
      const carId = pagoArr[4];
      let conceptoId = null;
      let mesNum = null;
      
      if (tipo === "INSCRIPCION") {
        conceptoId = conceptos[carId] ? conceptos[carId].inscripcion : null;
      } else if (tipo === "SEGURO") {
        mesNum = convertirMesANumero(pagoArr[5]);
        conceptoId = conceptos[carId] ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        mesNum = convertirMesANumero(pagoArr[5]);
        conceptoId = conceptos[carId] ? conceptos[carId].cuotas[mesNum] : null;
      }
      
      if (!conceptoId) {
        res.ignorados++;
        continue;
      }
      
      let metodo = pagoArr[tipo === "INSCRIPCION" ? 9 : 11] || "EFECTIVO";
      let talonario = pagoArr[tipo === "INSCRIPCION" ? 11 : 12] || "";
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      if (!talonario) {
        talonarioCounter++;
        talonario = `AUTO_${timestamp}_${String(talonarioCounter).padStart(6, '0')}`;
      }
      
      const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : 7]) || 0;
      if (!montoPagado) {
        res.ignorados++;
        continue;
      }
      
      const montoOriginal = obtenerMontoOriginal(configCarreras, parseInt(carId), tipo);
      if (!montoOriginal) {
        res.ignorados++;
        continue;
      }
      
      const key = `${estId}|${conceptoId}`;
      if (!agrupados[key]) {
        agrupados[key] = { 
          estId: estId, 
          carId: carId, 
          conceptoId: conceptoId,
          tipo: tipo, 
          metodo: metodo, 
          talonario: talonario, 
          montoPagado: 0,
          montoOriginal: montoOriginal,
          detalles: []
        };
      }
      
      agrupados[key].montoPagado += montoPagado;
      agrupados[key].detalles.push({ 
        concepto_id: conceptoId, 
        monto_original: montoOriginal,
        monto_pagado: montoPagado
      });
      
    } catch (e) {
      res.errores++;
    }
  }
  
  const hoy = new Date().toISOString().split('T')[0];
  
  for (let key in agrupados) {
    const pago = agrupados[key];
    
    pagosParaProcesar.push({
      p_institucion_id: parseInt(config.institucionId),
      p_estudiante_id: pago.estId,
      p_numero_talonario: pago.talonario,
      p_monto_total: pago.montoPagado,
      p_cantidad_conceptos: pago.detalles.length,
      p_metodo_pago: pago.metodo,
      p_fecha_cobro: hoy,
      p_descripcion: `${tipo} - ${pago.detalles.length} concepto(s)`,
      p_detalles: pago.detalles
    });
  }
  
  if (pagosParaProcesar.length === 0) return res;
  
  Logger.log(`   📤 Enviando ${pagosParaProcesar.length} pagos (batches de ${BATCH_SIZE})`);
  
  // ENVIAR BATCHES DE 50 PAGOS EN UNA SOLA RPC CALL
  for (let i = 0; i < pagosParaProcesar.length; i += BATCH_SIZE) {
    const batch = pagosParaProcesar.slice(i, i + BATCH_SIZE);
    
    try {
      const resp = UrlFetchApp.fetch(
        `${config.supabaseUrl}/rest/v1/rpc/insertar_pagos_multiples_batch_upsert`,
        {
          method: "post",
          headers: { 
            "apikey": config.supabaseKey, 
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          payload: JSON.stringify(batch),
          muteHttpExceptions: true,
          timeout: 120
        }
      );
      
      if (resp.getResponseCode() === 200) {
        try {
          const result = JSON.parse(resp.getContentText());
          
          // La RPC devuelve un objeto, no un array
          if (result) {
            if (Array.isArray(result)) {
              // Si es array, tomar el primer elemento
              const row = result[0] || result;
              res.pagosInsertados += row.total_insertados || 0;
              res.pagosActualizados += row.total_actualizados || 0;
              res.detalles += row.total_detalles || 0;
            } else {
              // Si es objeto directo
              res.pagosInsertados += result.total_insertados || 0;
              res.pagosActualizados += result.total_actualizados || 0;
              res.detalles += result.total_detalles || 0;
            }
            
            Logger.log(`   ✅ Batch: +${result.total_insertados || 0} INS, +${result.total_actualizados || 0} UPD`);
          }
        } catch (parseError) {
          Logger.log(`   ⚠️ Error parsing response: ${parseError}`);
          res.errores += 1;
        }
      } else if (resp.getResponseCode() === 404) {
        Logger.log(`   ❌ HTTP 404 - RPC NO EXISTE. Verificar que 'insertar_pagos_multiples_batch_upsert' fue creada en Supabase`);
        res.errores += batch.length;
      } else {
        const errorText = resp.getContentText();
        Logger.log(`   ❌ HTTP ${resp.getResponseCode()}: ${errorText.substring(0, 150)}`);
        res.errores += batch.length;
      }
    } catch (e) {
      Logger.log(`   ❌ Exception: ${e}`);
      res.errores += batch.length;
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return res;
}
