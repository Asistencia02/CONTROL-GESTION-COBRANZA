function procesarPagosV3(config, pagosArray, tipo, dniAId, conceptos) {
  const res = { pagosMultiples: 0, detalles: 0, ignorados: 0, errores: 0 };
  const pagosMultiplesParaInsertar = [];
  const detallesParaInsertar = [];
  const agrupados = {};
  
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
      
      const montoPagado = parseFloat(pagoArr[tipo === "INSCRIPCION" ? 5 : (tipo === "SEGURO" ? 7 : 7)]) || 0;
      if (!montoPagado) {
        res.ignorados++;
        continue;
      }
      
      const key = `${estId}|${tipo}`;
      if (!agrupados[key]) {
        agrupados[key] = { estId: estId, carId: carId, tipo: tipo, metodo: metodo, talonario: talonario, montoPagado: 0, detalles: [] };
      }
      
      agrupados[key].montoPagado += montoPagado;
      agrupados[key].detalles.push({ conceptoId: conceptoId, montoPagado: montoPagado, mes: mes || null });
      
    } catch (e) {
      res.errores++;
    }
  }
  
  Logger.log(`   DEBUG v3.0 ${tipo}: ${Object.keys(agrupados).length} pagos agrupados`);
  
  for (let key in agrupados) {
    const pago = agrupados[key];
    const pagoMultiple = {
      institucion_id: parseInt(config.institucionId),
      estudiante_id: pago.estId,
      tipo: pago.tipo,
      monto_total: pago.montoPagado,
      metodo_pago: pago.metodo,
      numero_talonario: pago.talonario || "",
      estado: "PAGADO",
      fecha_pago: new Date().toISOString().split('T')[0],
      carrera_id: pago.carId
    };
    
    pagosMultiplesParaInsertar.push(pagoMultiple);
    
    for (let detalle of pago.detalles) {
      detallesParaInsertar.push({ concepto_id: detalle.conceptoId, monto: detalle.montoPagado, mes: detalle.mes });
    }
  }
  
  if (pagosMultiplesParaInsertar.length > 0) {
    Logger.log(`   ENVIANDO: ${pagosMultiplesParaInsertar.length} pagos_multiples`);
    Logger.log(`   MUESTRA BATCH 0: ${JSON.stringify(pagosMultiplesParaInsertar[0])}`);
  }
  
  for (let i = 0; i < pagosMultiplesParaInsertar.length; i += 20) {
    const batch = pagosMultiplesParaInsertar.slice(i, i + 20);
    try {
      const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/pagos_multiples`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify(batch), muteHttpExceptions: true });
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.pagosMultiples += batch.length;
      } else {
        const errorText = resp.getContentText();
        Logger.log(`     BATCH ${Math.floor(i/20)}: HTTP ${resp.getResponseCode()}`);
        Logger.log(`     RESPONSE: ${errorText.substring(0, 300)}`);
        res.errores += batch.length;
      }
    } catch (e) {
      Logger.log(`     EXCEPTION batch ${Math.floor(i/20)}: ${e}`);
      res.errores += batch.length;
    }
    Utilities.sleep(DELAY_MS);
  }
  
  for (let i = 0; i < detallesParaInsertar.length; i += 50) {
    const batch = detallesParaInsertar.slice(i, i + 50);
    try {
      const resp = UrlFetchApp.fetch(`${config.supabaseUrl}/rest/v1/pagos_multiples_detalle`, { method: "post", headers: { "apikey": config.supabaseKey, "Content-Type": "application/json" }, payload: JSON.stringify(batch), muteHttpExceptions: true });
      if (resp.getResponseCode() === 201 || resp.getResponseCode() === 200) {
        res.detalles += batch.length;
      } else {
        res.errores += batch.length;
      }
    } catch (e) {
      res.errores += batch.length;
    }
    Utilities.sleep(DELAY_MS);
  }
  
  return res;
}
