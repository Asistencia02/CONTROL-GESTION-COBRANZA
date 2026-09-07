function procesarPagosV3(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { pagosMultiples: 0, detalles: 0, ignorados: 0, errores: 0 };
  const pagosParaProcesar = [];
  const agrupados = {};
  
  const timestamp = Math.floor(Date.now() / 1000);
  let talonarioCounter = 0;
  
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
      let mes = null;
      let mesNum = null;
      
      if (tipo === "INSCRIPCION") {
        conceptoId = conceptos[carId] ? conceptos[carId].inscripcion : null;
      } else if (tipo === "SEGURO") {
        mes = pagoArr[5];
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].seguros[mesNum] : null;
      } else if (tipo === "CUOTA") {
        mes = pagoArr[5];
        mesNum = convertirMesANumero(mes);
        conceptoId = conceptos[carId] ? conceptos[carId].cuotas[mesNum] : null;
      }
      
      if (!conceptoId) {
        res.ignorados++;
        continue;
      }
      
      let metodo = pagoArr[tipo === "INSCRIPCION" ? 9 : (tipo === "SEGURO" ? 11 : 11)] || "EFECTIVO";
      let talonario = pagoArr[tipo === "INSCRIPCION" ? 11 : (tipo === "SEGURO" ? 12 : 12)] || "";
      metodo = String(metodo).trim().toUpperCase();
      talonario = String(talonario).trim();
      if (!talonario || talonario === "") {
        talonarioCounter++;
        talonario = `AUTO_${timestamp}_${String(talonarioCounter).padStart(6, '0')}`;
      }
      
      const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
      if (!montoPagado) {
        res.ignorados++;
        continue;
      }
      
      const key = `${estId}|${tipo}`;
      if (!agrupados[key]) {
        agrupados[key] = { 
          estId: estId, 
          carId: carId, 
          tipo: tipo, 
          metodo: metodo, 
          talonario: talonario, 
          montoPagado: 0, 
          detalles: [],
          montoOriginal: 0
        };
      }
      
      agrupados[key].montoPagado += montoPagado;
      agrupados[key].montoOriginal += montoPagado;
      agrupados[key].detalles.push({ 
        conceptoId: conceptoId, 
        montoPagado: montoPagado,
        montoOriginal: montoPagado,
        mes: mes || null 
      });
      
    } catch (e) {
      res.errores++;
    }
  }
  
  Logger.log(`   DEBUG v3.0 ${tipo}: ${Object.keys(agrupados).length} pagos agrupados`);
  
  const hoy = new Date().toISOString().split('T')[0];
  
  for (let key in agrupados) {
    const pago = agrupados[key];
    const cantidadConceptos = pago.detalles.length;
    
    const detallesJSON = pago.detalles.map(d => ({
      concepto_id: d.conceptoId,
      monto_original: d.montoOriginal,
      monto_pagado: d.montoPagado
    }));
    
    pagosParaProcesar.push({
      institucion_id: parseInt(config.institucionId),
      estudiante_id: pago.estId,
      numero_talonario: pago.talonario,
      monto_total: pago.montoPagado,
      cantidad_conceptos: cantidadConceptos,
      metodo_pago: pago.metodo,
      fecha_cobro: hoy,
      descripcion: `${tipo} - ${cantidadConceptos} concepto(s)`,
      detalles: detallesJSON
    });
  }
  
  if (pagosParaProcesar.length > 0) {
    Logger.log(`   ENVIANDO: ${pagosParaProcesar.length} RPC calls (pagos + detalles juntos)`);
    Logger.log(`   MUESTRA RPC: ${JSON.stringify(pagosParaProcesar[0]).substring(0, 300)}`);
  }
  
  for (let i = 0; i < pagosParaProcesar.length; i += 5) {
    const batch = pagosParaProcesar.slice(i, i + 5);
    
    for (let pago of batch) {
      try {
        const resp = UrlFetchApp.fetch(
          `${config.supabaseUrl}/rest/v1/rpc/insertar_pago_multiple_con_detalles`,
          {
            method: "post",
            headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" },
            payload: JSON.stringify({
              p_institucion_id: pago.institucion_id,
              p_estudiante_id: pago.estudiante_id,
              p_numero_talonario: pago.numero_talonario,
              p_monto_total: pago.monto_total,
              p_cantidad_conceptos: pago.cantidad_conceptos,
              p_metodo_pago: pago.metodo_pago,
              p_fecha_cobro: pago.fecha_cobro,
              p_descripcion: pago.descripcion,
              p_detalles: JSON.stringify(pago.detalles)
            }),
            muteHttpExceptions: true
          }
        );
        
        if (resp.getResponseCode() === 200) {
          const result = JSON.parse(resp.getContentText());
          if (result && result.length > 0) {
            const row = result[0];
            res.pagosMultiples += 1;
            res.detalles += row.detalles_insertados || 0;
            if (i === 0 && pago === batch[0]) {
              Logger.log(`     ✅ RPC 0: pago_multiple_id=${row.pago_multiple_id}, detalles=${row.detalles_insertados}`);
            }
          }
        } else {
          const errorText = resp.getContentText();
          Logger.log(`     ❌ RPC error HTTP ${resp.getResponseCode()}: ${errorText.substring(0, 300)}`);
          res.errores += 1;
        }
      } catch (e) {
        Logger.log(`     ❌ RPC exception: ${e}`);
        res.errores += 1;
      }
      
      Utilities.sleep(50);
    }
  }
  
  Logger.log(`   ✅ ${tipo}: ${res.pagosMultiples} pagos múltiples, ${res.detalles} detalles insertados`);
  
  return res;
}
