function procesarPagosV3(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { pagosMultiples: 0, detalles: 0, ignorados: 0, errores: 0 };
  const pagosMultiplesParaInsertar = [];
  const detallesParaInsertar = [];
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
    
    const pagoMultiple = {
      institucion_id: parseInt(config.institucionId),
      estudiante_id: pago.estId,
      numero_talonario: pago.talonario,
      monto_total: pago.montoPagado,
      cantidad_conceptos: cantidadConceptos,
      metodo_pago: pago.metodo,
      fecha_cobro: hoy,
      tipo_tarjeta: null,
      descripcion: `${tipo} - ${cantidadConceptos} concepto(s)`,
      estado: "PAGADO"
    };
    
    pagosMultiplesParaInsertar.push(pagoMultiple);
    
    for (let detalle of pago.detalles) {
      detallesParaInsertar.push({ 
        concepto_id: detalle.conceptoId, 
        monto_original: detalle.montoOriginal,
        monto_pagado: detalle.montoPagado
      });
    }
  }
  
  if (pagosMultiplesParaInsertar.length > 0) {
    Logger.log(`   ENVIANDO: ${pagosMultiplesParaInsertar.length} pagos_multiples`);
    Logger.log(`   MUESTRA: ${JSON.stringify(pagosMultiplesParaInsertar[0])}`);
  }
  
  for (let i = 0; i < pagosMultiplesParaInsertar.length; i += 20) {
    const batch = pagosMultiplesParaInsertar.slice(i, i + 20);
    try {
      const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/pagos_multiples`, { 
        method: "post", 
        headers: { "apikey": config.supabaseKey, "Content-Type": "application/json", "Prefer": "return=representation" }, 
        payload: JSON.stringify(batch), 
        muteHttpExceptions: true 
      });
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.pagosMultiples += batch.length;
        Logger.log(`     ✅ Batch ${Math.floor(i/20)}: ${batch.length} insertados`);
      } else {
        const errorText = resp.getContentText();
        Logger.log(`     ❌ Batch ${Math.floor(i/20)}: HTTP ${resp.getResponseCode()}`);
        Logger.log(`     ERROR: ${errorText.substring(0, 500)}`);
        res.errores += batch.length;
      }
    } catch (e) {
      Logger.log(`     ❌ Exception batch ${Math.floor(i/20)}: ${e}`);
      res.errores += batch.length;
    }
    Utilities.sleep(DELAY_MS);
  }
  
  if (detallesParaInsertar.length > 0) {
    Logger.log(`   PROBLEMA: No puedo insertar detalles sin pago_multiple_id`);
    Logger.log(`   NECESITO: RPC en Supabase que inserte ambas tablas juntas`);
    Logger.log(`   MUESTRA DETALLE: ${JSON.stringify(detallesParaInsertar[0])}`);
  }
  
  return res;
}
