function cargarConceptos(config) {
  const conceptos = {
    4: { inscripcion: null, seguros: {}, cuotas: {} },
    5: { inscripcion: null, seguros: {}, cuotas: {} },
    6: { inscripcion: null, seguros: {}, cuotas: {} }
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
          else if (c.tipo === "SEGURO" && c.mes) {
            conceptos[car].seguros[c.mes] = c.id;
          }
          else if (c.tipo === "CUOTA") conceptos[car].cuotas[c.mes] = c.id;
        }
      }
    }
  } catch (e) {
  }
  
  return conceptos;
}

function procesarPagosBatch(config, pagosArray, tipo, dniAId, conceptos, pagosExistentes) {
  const res = { insertados: 0, actualizados: 0, ignorados: 0, skipped: 0, errores: 0 };
  
  const pagosParaInsertar = [];
  const pagosParaActualizar = [];
  
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
        const mesNum = convertirMesANumero(pagoArr[5]);
        conceptoId = conceptos[carId].seguros ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        const mesNum = convertirMesANumero(pagoArr[5]);
        conceptoId = conceptos[carId].cuotas[mesNum];
      }
      
      if (!conceptoId) {
        res.skipped++;
        continue;
      }
      
      const montoPagadoNuevo = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
      const montoOriginal = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 6 : (tipo === "SEGURO" ? 8 : 8)]) || montoPagadoNuevo;
      
      if (!montoPagadoNuevo) {
        res.skipped++;
        continue;
      }
      
      // ✅ v2.7: VALIDAR Y ACTUALIZAR MONTOS
      const pagoKey = `${estId}|${conceptoId}`;
      
      if (!pagosExistentes[pagoKey]) {
        // ✅ NO EXISTE: INSERTAR
        const datos = {
          institucion_id: parseInt(config.institucionId),
          estudiante_id: estId,
          concepto_id: conceptoId,
          monto_pagado: montoPagadoNuevo,
          monto_original: montoOriginal,
          metodo_pago: "EFECTIVO",
          numero_talonario: null,
          estado: "PAGADO",
          fecha_pago: new Date().toISOString().split('T')[0],
          carrera_id: carId
        };
        
        pagosParaInsertar.push(datos);
      } else {
        // ⚠️ YA EXISTE
        const pagoExistente = pagosExistentes[pagoKey];
        const montoPagadoViejo = pagoExistente.monto_pagado;
        
        if (montoPagadoNuevo > montoPagadoViejo) {
          // ✅ MONTO SUBE: ACTUALIZAR
          pagosParaActualizar.push({
            pagoId: pagoExistente.id,
            montoNuevo: montoPagadoNuevo,
            montoViejo: montoPagadoViejo
          });
          res.actualizados++;
        } else {
          // ❌ MONTO BAJA O IGUAL: IGNORAR
          res.ignorados++;
        }
      }
    } catch (e) {
      res.errores++;
    }
  }
  
  // ✅ INSERT batch
  for (let i = 0; i < pagosParaInsertar.length; i += 20) {
    const batch = pagosParaInsertar.slice(i, i + 20);
    
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
        Logger.log(`Error batch insert: ${resp.getResponseCode()}`);
      }
    } catch (e) {
      res.errores += batch.length;
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  // ✅ UPDATE batch
  for (let i = 0; i < pagosParaActualizar.length; i += 20) {
    const batch = pagosParaActualizar.slice(i, i + 20);
    
    for (let pago of batch) {
      try {
        const urlUpdate = `${config.supabaseUrl}/rest/v1/pagos?id=eq.${pago.pagoId}`;
        const respUpdate = UrlFetchApp.fetch(urlUpdate, {
          method: "patch",
          headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
          payload: JSON.stringify({
            monto_pagado: pago.montoNuevo,
            estado: "PAGADO"
          }),
          muteHttpExceptions: true
        });
        
        if (respUpdate.getResponseCode() === 200 || respUpdate.getResponseCode() === 204) {
          Logger.log(`✅ Pago actualizado: ${pago.pagoId} (${pago.montoViejo} → ${pago.montoNuevo})`);
        } else {
          Logger.log(`❌ Error actualizando pago ${pago.pagoId}: ${respUpdate.getResponseCode()}`);
        }
      } catch (e) {
        Logger.log(`❌ Error en actualización: ${e}`);
      }
    }
    
    Utilities.sleep(DELAY_MS);
  }
  
  return res;
}
